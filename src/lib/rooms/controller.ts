import type { CaptionAction } from "../captions/reducer";
import type { TranscriptionEvent } from "../captions/types";
import { AssemblyAIStreamingProvider, CONNECTED_ROOM_ASSEMBLYAI_OPTIONS, type StreamingTranscriptionProvider } from "../captions/provider";
import { ConversationSession } from "../captions/session";
import { roomClient, roomRequest, technicalSession } from "./browser";
import { SupabaseRoomTransport, type RoomTransport } from "./transport";
import { participantProfiles, type IdentifyAction, type Participant, type ParticipantStatus, type RoomMode, type RoomSnapshot } from "./types";
import { VoiceIdentityRegistry, type VoicePhase } from "./voice-identity";
import { HeadsetHost, type HeadsetHostView } from "../headset/headset-host";
import { HeadsetParticipant, type HeadsetParticipantView } from "../headset/headset-participant";
import type { HeadsetPresence, HeadsetSignal } from "../headset/messages";
import type { Sensitivity } from "../headset/calibration";
import { HeadsetTranscriber } from "../headset/headset-transcriber";
import { exactIdentity } from "./types";

export type RoomMicrophoneState = "Off" | "Starting" | "Listening" | "Reconnecting";
export type RoomView = {
  phase: "idle" | "connecting" | "joined" | "disconnected" | "ended" | "removed";
  snapshot: RoomSnapshot | null;
  statuses: Record<string, ParticipantStatus>;
  /** Host only: the single room microphone that captions the conversation. */
  roomMicrophone: RoomMicrophoneState;
  /** Host: every participant. Guest: phases most recently published by the host. */
  identification: Record<string, VoicePhase>;
  identificationNotice: string | null;
  error: string | null;
  mode: RoomMode;
  headsetHost: HeadsetHostView | null;
  headsetSelf: HeadsetParticipantView | null;
};
export const idleRoomView: RoomView = { phase: "idle", snapshot: null, statuses: {}, roomMicrophone: "Off", identification: {}, identificationNotice: null, error: null, mode: "connected", headsetHost: null, headsetSelf: null };

export type RoomMicrophoneSession = { start(): Promise<void>; stop(): Promise<void> };
export type RoomMicrophoneFactory = (dispatch: (action: CaptionAction) => void, providerFactory: (token: string) => StreamingTranscriptionProvider) => RoomMicrophoneSession;
const defaultRoomMicrophone: RoomMicrophoneFactory = (dispatch, providerFactory) => new ConversationSession(dispatch, providerFactory);
const IDENTIFY_ACK_TIMEOUT_MS = 10_000;
type OwnIdentifyRequest = { id: string; acknowledged: boolean };

export class ConnectedRoom {
  private view: RoomView = idleRoomView;
  private transport: RoomTransport | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private identityTimer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private roomId: string | null = null;
  private roomMic: RoomMicrophoneSession | null = null;
  private micGeneration = 0;
  private aliasKey = "{}";
  private refreshing = false;
  private refreshPending = false;
  private disposed = false;
  private readonly identity: VoiceIdentityRegistry;
  /** Host: last presence request ID applied per participant, so repeated syncs apply it once. */
  private readonly appliedRequests = new Map<string, string | null>();
  private ownRequest: OwnIdentifyRequest | null = null;
  private ownRequestTimer: ReturnType<typeof setTimeout> | null = null;
  /** Guest: the host's last reported phase for this phone outside an identification attempt. */
  private settledPhase: VoicePhase = "unidentified";
  private headsetHostInstance: HeadsetHost | null = null;
  private headsetParticipantInstance: HeadsetParticipant | null = null;
  private readonly visibilityHandler = () => this.headsetParticipantInstance?.setVisible(document.visibilityState === "visible");

  constructor(private readonly onView: (view: RoomView) => void, private readonly dispatch?: (action: CaptionAction) => void,
    private readonly roomMicrophoneFactory: RoomMicrophoneFactory = defaultRoomMicrophone, now: () => number = Date.now) {
    this.identity = new VoiceIdentityRegistry(now);
  }
  private update(values: Partial<RoomView>) { this.view = { ...this.view, ...values }; this.onView(this.view); }
  private get isHost() { return this.view.snapshot?.self.role === "host"; }

  get headsetHost() { return this.headsetHostInstance; }
  get headsetParticipant() { return this.headsetParticipantInstance; }
  async create(mode: RoomMode = "connected") {
    this.dispatch?.({ type: "CONNECTED_START" });
    this.update({ phase: "connecting", error: null });
    try { await this.enter(await roomRequest(mode === "headset" ? "create_headset" : "create"), true); }
    catch (error) { this.update({ phase: "disconnected", error: message(error) }); throw error; }
  }
  // Restoring after a refresh needs a user gesture before the room microphone starts.
  async restore(): Promise<RoomMode | null> {
    const snapshot = await roomRequest<RoomSnapshot | null>("restore");
    if (!snapshot || this.disposed) return null;
    this.dispatch?.({ type: "CONNECTED_START" });
    try { snapshot.joinUrl = sessionStorage.getItem(`caption-invite:${snapshot.roomId}`) ?? undefined; } catch { /* Room restoration does not require storage. */ }
    await this.enter(snapshot, false);
    return normalizeRoomMode(snapshot.mode);
  }
  async join(token: string, name: string) {
    this.update({ phase: "connecting", error: null });
    try { await this.enter(await roomRequest("join", { token, name }), false); }
    catch (error) { this.update({ phase: "disconnected", error: message(error) }); throw error; }
  }
  async rejoin() {
    const snapshot = this.view.snapshot;
    if (!snapshot) throw new Error("Start or join a conversation first.");
    this.update({ phase: "connecting", error: null });
    try { await this.enter(await roomRequest("snapshot", { roomId: snapshot.roomId }), true); }
    catch (error) { this.update({ phase: "disconnected", error: message(error) }); throw error; }
  }
  private async enter(snapshot: RoomSnapshot, startMicrophone: boolean) {
    if (this.disposed) return;
    await this.release();
    snapshot = { ...snapshot, mode: normalizeRoomMode(snapshot.mode) };
    if (this.disposed) return;
    if (snapshot.roomId !== this.roomId) await this.resetRoom(snapshot.roomId);
    if (snapshot.status !== "open" || snapshot.self.removed) {
      await this.stopRoomMicrophone();
      this.update({ snapshot, phase: snapshot.self.removed ? "removed" : "ended" });
      return;
    }
    const generation = this.generation;
    const joinUrl = snapshot.joinUrl ?? (this.view.snapshot?.roomId === snapshot.roomId ? this.view.snapshot.joinUrl : undefined);
    snapshot = { ...snapshot, joinUrl };
    if (joinUrl && snapshot.self.role === "host") { try { sessionStorage.setItem(`caption-invite:${snapshot.roomId}`, joinUrl); } catch { /* Optional invite metadata only. */ } }
    this.update({ snapshot, mode: snapshot.mode, headsetHost: null, headsetSelf: null, phase: "connecting", statuses: Object.fromEntries(snapshot.participants.map((p) => [p.id, p.removed ? "Removed" : "Disconnected"])), error: null });
    this.dispatch?.({ type: "CONNECTED_SPEAKERS", speakers: participantProfiles(snapshot.participants) });
    const supabase = roomClient();
    const session = await technicalSession();
    if (generation !== this.generation) return;
    await supabase.realtime.setAuth(session.access_token);
    const transport = new SupabaseRoomTransport(supabase, snapshot.roomId, snapshot.self, {
      identify: (id, requestId) => { if (generation === this.generation && this.isHost) this.receiveIdentifyRequest(id, requestId); },
      identification: (phases, requests) => { if (generation === this.generation && !this.isHost) this.receiveIdentification(phases, requests); },
      state: (id, status) => {
        if (generation !== this.generation) return;
        this.update({ statuses: { ...this.view.statuses, [id]: status } });
        if (status === "Connected" && this.isHost && id !== this.view.snapshot?.self.id) { this.syncIdentity(true); this.headsetHostInstance?.syncSensitivity(); }
      },
      control: (event) => {
        if (generation !== this.generation) return;
        if (event.type === "room-ended") void this.finish("ended");
        else if (event.type === "participant-removed" && event.participantId === snapshot.self.id) void this.finish("removed");
        else void this.refresh();
      },
      disconnected: () => { if (generation === this.generation) void this.lostConnection(); },
      registryChanged: () => { if (generation === this.generation) void this.refresh(); },
      headsetPresence: (id, presence) => { if (generation === this.generation) this.headsetHostInstance?.presence(id, presence); },
      headsetSignal: (id, signal) => { if (generation === this.generation) this.headsetHostInstance?.signal(id, signal); },
      headsetControl: (control) => { if (generation === this.generation) this.headsetParticipantInstance?.receiveControl(control); },
      caption: (participantId, event) => { if (generation === this.generation && snapshot.mode === "headset") this.dispatch?.({ type: "TRANSCRIPTION_EVENT", event: exactIdentity(event, participantId) }); },
    });
    this.transport = transport;
    try {
      await transport.connect(snapshot.participants);
      if (generation !== this.generation) { await transport.disconnect(); return; }
      this.update({ phase: "joined" });
      this.dispatch?.({ type: "LISTENING" });
      this.timer = setInterval(() => void this.refresh(), 3000);
      if (snapshot.self.role === "host") {
        this.identityTimer = setInterval(() => this.syncIdentity(), 1000);
        this.syncIdentity(true);
        void this.refresh();
        if (snapshot.mode === "headset") {
          this.headsetHostInstance = new HeadsetHost({ sendControl: (control) => transport.sendControl(control) }, (view) => this.update({ headsetHost: view }));
          this.headsetHostInstance.setRoster(snapshot.participants);
          if (this.headsetParticipantInstance) { this.headsetHostInstance.attachLocal(snapshot.self.id, this.headsetParticipantInstance); this.update({ headsetSelf: this.headsetParticipantInstance.currentView }); }
          this.headsetHostInstance.syncSensitivity();
        } else if (startMicrophone) void this.startRoomMicrophone();
      } else if (snapshot.mode === "headset") {
        this.headsetParticipantInstance = new HeadsetParticipant(snapshot.self.id, { setPresence: (presence) => transport.setHeadsetPresence?.(presence) ?? Promise.resolve(), sendSignal: (signal) => transport.sendHeadsetSignal?.(signal) ?? Promise.resolve(), sendCaption: (event, streamId) => transport.sendCaption?.(event, streamId) ?? Promise.resolve() }, (view) => this.update({ headsetSelf: view }), { transcriberFactory: (publish, onState) => new HeadsetTranscriber(snapshot.roomId, publish, onState) });
        this.headsetParticipantInstance.setVisible(document.visibilityState === "visible");
          this.update({ headsetSelf: this.headsetParticipantInstance.currentView });
        document.addEventListener("visibilitychange", this.visibilityHandler);
      }
    } catch (error) {
      if (generation === this.generation) await this.lostConnection(message(error));
      throw error;
    }
  }

  async startRoomMicrophone() {
    if (!this.isHost || this.view.mode === "headset" || this.roomMic || this.disposed || !["joined", "disconnected"].includes(this.view.phase)) return;
    const micGeneration = ++this.micGeneration;
    const session = this.roomMicrophoneFactory((action) => this.roomMicrophoneAction(micGeneration, action), (token) => this.createRoomProvider(micGeneration, token));
    this.roomMic = session;
    this.update({ roomMicrophone: "Starting", error: null });
    try { await session.start(); }
    catch { if (this.roomMic === session) this.roomMic = null; }
  }
  private createRoomProvider(micGeneration: number, token: string): StreamingTranscriptionProvider {
    const connectionId = `assemblyai/${crypto.randomUUID()}`;
    if (micGeneration === this.micGeneration) {
      const hadIdentified = Object.values(this.view.identification).includes("identified");
      this.identity.setConnection(connectionId);
      if (hadIdentified) this.update({ identificationNotice: "The captioning connection restarted, so voices need to be identified again." });
      this.syncIdentity();
    }
    return new AssemblyAIStreamingProvider(token, connectionId, CONNECTED_ROOM_ASSEMBLYAI_OPTIONS);
  }
  private roomMicrophoneAction(micGeneration: number, action: CaptionAction) {
    if (micGeneration !== this.micGeneration) return;
    switch (action.type) {
      case "TRANSCRIPTION_EVENT": this.roomTranscription(action.event); return;
      case "START": this.update({ roomMicrophone: "Starting" }); return;
      case "CONNECTING": if (this.view.roomMicrophone !== "Reconnecting") this.update({ roomMicrophone: "Starting" }); return;
      case "LISTENING": this.update({ roomMicrophone: "Listening", error: null }); return;
      case "RECONNECTING": this.update({ roomMicrophone: "Reconnecting" }); return;
      case "ERROR": this.roomMic = null; this.update({ roomMicrophone: "Off", error: action.error.message }); return;
      case "STOPPING": case "ENDED": this.update({ roomMicrophone: "Off" }); return;
    }
  }
  private roomTranscription(event: TranscriptionEvent) {
    if (!this.isHost || !["joined", "connecting", "disconnected"].includes(this.view.phase)) return;
    this.identity.observe(event);
    this.dispatch?.({ type: "TRANSCRIPTION_EVENT", event });
    this.syncIdentity();
  }
  private headsetCaption(participantId: string, event: TranscriptionEvent, streamId: string) {
    void streamId;
    if (!this.isHost || this.view.mode !== "headset") return;
    this.dispatch?.({ type: "TRANSCRIPTION_EVENT", event: exactIdentity(event, participantId) });
  }
  private async stopRoomMicrophone() {
    const session = this.roomMic;
    this.roomMic = null;
    await session?.stop().catch(() => undefined);
    ++this.micGeneration;
    if (this.view.roomMicrophone !== "Off") this.update({ roomMicrophone: "Off" });
  }

  /** Host: identify any participant, including You. Guest: ask the host to identify this phone's owner. */
  async identify(participantId = this.view.snapshot?.self.id, action: IdentifyAction = "request") {
    const snapshot = this.view.snapshot;
    if (this.view.mode === "headset" || this.view.phase !== "joined" || !snapshot || !participantId) return;
    if (snapshot.self.role === "host") { this.applyIdentify(participantId, action); return; }
    const selfId = snapshot.self.id;
    this.clearOwnRequest();
    if (action === "cancel") {
      this.update({ identification: { ...this.view.identification, [selfId]: this.settledPhase } });
      await this.transport?.setIdentifyRequest(null);
      return;
    }
    const request: OwnIdentifyRequest = { id: crypto.randomUUID(), acknowledged: false };
    this.ownRequest = request;
    this.ownRequestTimer = setTimeout(() => this.requestUnanswered(request), IDENTIFY_ACK_TIMEOUT_MS);
    this.update({ identification: { ...this.view.identification, [selfId]: "waiting" }, identificationNotice: null });
    try { await this.transport?.setIdentifyRequest(request.id); }
    catch (error) {
      if (this.ownRequest === request) { this.clearOwnRequest(); this.update({ identification: { ...this.view.identification, [selfId]: this.settledPhase } }); }
      throw error;
    }
  }
  private receiveIdentifyRequest(participantId: string, requestId: string | null) {
    if ((this.appliedRequests.get(participantId) ?? null) === requestId) return;
    this.appliedRequests.set(participantId, requestId);
    this.applyIdentify(participantId, requestId ? "request" : "cancel");
  }
  // The phone keeps its request open until a host phase that names this request reports an outcome.
  private receiveIdentification(phases: Record<string, VoicePhase>, requests: Record<string, string>) {
    const selfId = this.view.snapshot?.self.id;
    if (!selfId) return;
    const own = phases[selfId] ?? "unidentified";
    const active = own === "waiting" || own === "listening";
    if (!active) this.settledPhase = own;
    const request = this.ownRequest;
    if (request && requests[selfId] !== request.id) {
      const shown = request.acknowledged ? this.view.identification[selfId] ?? "waiting" : "waiting";
      this.update({ identification: { ...phases, [selfId]: shown } });
      return;
    }
    if (request) {
      request.acknowledged = true;
      if (this.ownRequestTimer) clearTimeout(this.ownRequestTimer);
      this.ownRequestTimer = null;
      if (!active) { this.clearOwnRequest(); void this.transport?.setIdentifyRequest(null).catch(() => undefined); }
    }
    this.update({ identification: phases });
  }
  private requestUnanswered(request: OwnIdentifyRequest) {
    const selfId = this.view.snapshot?.self.id;
    if (this.ownRequest !== request || request.acknowledged || !selfId) return;
    this.clearOwnRequest();
    void this.transport?.setIdentifyRequest(null).catch(() => undefined);
    this.update({
      identification: { ...this.view.identification, [selfId]: this.settledPhase },
      identificationNotice: "The host's device didn't respond. Make sure the host's conversation is open, then try again.",
    });
  }
  private clearOwnRequest() {
    if (this.ownRequestTimer) clearTimeout(this.ownRequestTimer);
    this.ownRequestTimer = null;
    this.ownRequest = null;
  }
  private applyIdentify(participantId: string, action: IdentifyAction) {
    if (!this.view.snapshot?.participants.some((p) => p.id === participantId && !p.removed)) return;
    if (action === "request") { this.identity.request(participantId); this.update({ identificationNotice: null }); }
    else this.identity.cancel(participantId);
    this.syncIdentity(true);
  }
  private syncIdentity(broadcast = false) {
    const snapshot = this.view.snapshot;
    if (!snapshot || snapshot.self.role !== "host" || this.view.mode === "headset") return;
    this.identity.tick();
    const aliases = this.identity.aliases();
    const aliasKey = JSON.stringify(aliases);
    if (aliasKey !== this.aliasKey) { this.aliasKey = aliasKey; this.dispatch?.({ type: "SPEAKER_ALIASES", aliases }); }
    const active = snapshot.participants.filter((p) => !p.removed).map((p) => p.id);
    const phases = this.identity.phases(active);
    const requests = Object.fromEntries(active.flatMap((id) => { const request = this.appliedRequests.get(id); return request ? [[id, request]] : []; }));
    const changed = JSON.stringify(phases) !== JSON.stringify(this.view.identification);
    if (changed) this.update({ identification: phases, identificationNotice: identificationNotice(this.view.identification, phases, snapshot.participants) ?? this.view.identificationNotice });
    if ((changed || broadcast) && this.view.phase === "joined") void this.transport?.sendControl({ type: "voice-identification", phases, requests }).catch(() => undefined);
  }

  async rename(name: string) {
    if (!this.view.snapshot) return;
    const snapshot = await roomRequest("rename", { roomId: this.view.snapshot.roomId, name });
    this.update({ snapshot: { ...snapshot, joinUrl: this.view.snapshot.joinUrl } });
  }
  async invite(): Promise<string> {
    if (!this.view.snapshot) throw new Error("No active room.");
    if (this.view.snapshot.joinUrl) return this.view.snapshot.joinUrl;
    const snapshot = await roomRequest("invite", { roomId: this.view.snapshot.roomId });
    this.update({ snapshot });
    try { sessionStorage.setItem(`caption-invite:${snapshot.roomId}`, snapshot.joinUrl!); } catch { /* Optional metadata. */ }
    return snapshot.joinUrl!;
  }
  async startHeadsetSetup(deviceId?: string) {
    if (this.view.mode !== "headset" || !this.view.snapshot) return;
    if (!this.headsetParticipantInstance) {
      const selfId = this.view.snapshot.self.id;
      const io = this.isHost
        ? { setPresence: async (presence: HeadsetPresence) => this.headsetHostInstance?.presence(selfId, presence), sendSignal: async (signal: HeadsetSignal) => this.headsetHostInstance?.signal(selfId, signal), sendCaption: async (event: TranscriptionEvent, streamId: string) => this.headsetCaption(selfId, event, streamId) }
        : { setPresence: async (presence: HeadsetPresence) => this.transport?.setHeadsetPresence?.(presence), sendSignal: async (signal: HeadsetSignal) => this.transport?.sendHeadsetSignal?.(signal), sendCaption: async (event: TranscriptionEvent, streamId: string) => this.transport?.sendCaption?.(event, streamId) };
      this.headsetParticipantInstance = new HeadsetParticipant(selfId, { setPresence: async (presence) => { await io.setPresence(presence); }, sendSignal: async (signal) => { await io.sendSignal(signal); }, sendCaption: async (event, streamId) => { await io.sendCaption(event, streamId); } }, (view) => this.update({ headsetSelf: view }), { transcriberFactory: (publish, onState) => new HeadsetTranscriber(this.view.snapshot!.roomId, publish, onState) });
      if (this.isHost) this.headsetHostInstance?.attachLocal(selfId, this.headsetParticipantInstance);
    }
    await this.headsetParticipantInstance.startSetup(deviceId);
  }
  useCurrentHeadsetInput() { this.headsetParticipantInstance?.useCurrentInput(); }
  async chooseHeadsetInput(deviceId: string) { await this.headsetParticipantInstance?.chooseInput(deviceId); }
  async restartHeadsetMicrophone() { await this.headsetParticipantInstance?.restartMicrophone(); }
  async retryHeadsetCaptions() { await this.headsetParticipantInstance?.retryCaptions(); }
  setHeadsetSensitivity(participantId: string, sensitivity: Sensitivity) { this.headsetHostInstance?.setSensitivity(participantId, sensitivity); }

  async remove(participantId: string) {
    if (!this.view.snapshot) return;
    const snapshot = await roomRequest("remove", { roomId: this.view.snapshot.roomId, participantId });
    // Mark removed before any further transport message can be accepted.
    this.update({ snapshot: { ...snapshot, joinUrl: this.view.snapshot.joinUrl }, statuses: { ...this.view.statuses, [participantId]: "Removed" } });
    this.identity.cancel(participantId);
    this.syncIdentity();
    await this.transport?.sendControl({ type: "participant-removed", participantId });
    await this.transport?.updateParticipants(snapshot.participants);
  }
  async end() {
    if (!this.view.snapshot) return;
    await this.stopRoomMicrophone();
    await roomRequest("end", { roomId: this.view.snapshot.roomId });
    await this.transport?.sendControl({ type: "room-ended" }).catch(() => undefined);
    await this.finish("ended");
  }
  async leave() { await this.release(); this.update({ phase: "idle" }); }
  async dispose() { this.disposed = true; await Promise.all([this.release(), this.stopRoomMicrophone()]); }

  private async refresh() {
    if (this.view.phase !== "joined" || !this.view.snapshot) return;
    if (this.refreshing) { this.refreshPending = true; return; }
    this.refreshing = true;
    const generation = this.generation;
    try {
      const snapshot = await roomRequest("snapshot", { roomId: this.view.snapshot.roomId });
      if (generation !== this.generation) return;
      if (snapshot.status !== "open") { await this.finish("ended"); return; }
      if (snapshot.self.removed) { await this.finish("removed"); return; }
      this.update({ snapshot: { ...snapshot, joinUrl: this.view.snapshot?.joinUrl } });
      for (const participant of snapshot.participants) if (participant.removed) this.identity.cancel(participant.id);
      this.dispatch?.({ type: "CONNECTED_SPEAKERS", speakers: participantProfiles(snapshot.participants) });
      if (this.view.mode === "headset" && this.headsetHostInstance) this.headsetHostInstance.setRoster(snapshot.participants);
      this.syncIdentity();
      await this.transport?.updateParticipants(snapshot.participants);
    } catch { if (generation === this.generation) await this.lostConnection(); }
    finally {
      this.refreshing = false;
      if (this.refreshPending) { this.refreshPending = false; void this.refresh(); }
    }
  }
  // The host room microphone keeps captioning locally while the room network reconnects.
  private async lostConnection(error = "Room connection interrupted. Rejoin to continue.") {
    this.update({ phase: "disconnected", error });
    await this.release();
    if (!this.isHost || !this.roomMic) this.dispatch?.({ type: "RECONNECTING", attempt: 0 });
  }
  private async finish(phase: "ended" | "removed") {
    this.update({ phase, error: null });
    await Promise.all([this.release(), this.stopRoomMicrophone()]);
    this.dispatch?.({ type: "ENDED" });
  }
  private async resetRoom(roomId: string) {
    await this.stopRoomMicrophone();
    this.roomId = roomId;
    this.identity.reset();
    this.appliedRequests.clear();
    this.settledPhase = "unidentified";
    this.aliasKey = "{}";
    this.dispatch?.({ type: "SPEAKER_ALIASES", aliases: {} });
    this.update({ identification: {}, identificationNotice: null });
    this.headsetParticipantInstance = null;
    this.headsetHostInstance = null;
  }
  private async release() {
    ++this.generation;
    if (this.timer) clearInterval(this.timer);
    if (this.identityTimer) clearInterval(this.identityTimer);
    this.timer = null; this.identityTimer = null;
    this.clearOwnRequest();
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    await this.headsetParticipantInstance?.stopMicrophone().catch(() => undefined);
    const transport = this.transport;
    this.transport = null;
    await transport?.disconnect();
  }
}

function identificationNotice(previous: Record<string, VoicePhase>, next: Record<string, VoicePhase>, participants: Participant[]): string | null | undefined {
  for (const participant of participants) {
    if (previous[participant.id] !== "listening") continue;
    const self = participant.role === "host";
    if (next[participant.id] === "identified") return self ? "Your voice is identified." : `${participant.displayName}'s voice is identified.`;
    if (next[participant.id] === "not_found") return self ? "Couldn't pick out your voice. Try again and speak for a few seconds." : `Couldn't pick out ${participant.displayName}'s voice. They can try again.`;
  }
  return undefined;
}
function message(error: unknown) { return error instanceof Error ? error.message : "The conversation could not be reached."; }
function normalizeRoomMode(value: unknown): RoomMode { return value === "headset" ? "headset" : "connected"; }
