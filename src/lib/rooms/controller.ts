import type { CaptionAction } from "../captions/reducer";
import type { TranscriptionEvent } from "../captions/types";
import { roomClient, roomRequest, technicalSession } from "./browser";
import { SupabaseRoomTransport, type RoomTransport } from "./transport";
import { participantProfiles, type ParticipantStatus, type RoomSnapshot } from "./types";
import { HeadsetHost, type HeadsetHostView } from "../headset/headset-host";
import { HeadsetParticipant, type HeadsetParticipantView } from "../headset/headset-participant";
import type { HeadsetPresence, HeadsetSignal } from "../headset/messages";
import type { Sensitivity } from "../headset/calibration";
import { HeadsetTranscriber } from "../headset/headset-transcriber";
import { isHeadsetBenchmarkEnabled } from "../headset/benchmark";
import { exactIdentity } from "./types";
import type { CaptionEnvelope } from "./types";
import { HeadsetArbiter } from "../headset/arbiter";
import { ClockAlignment } from "../headset/latency";
import type { CaptionEvidence } from "../headset/evidence";

export type RoomView = {
  phase: "idle" | "connecting" | "joined" | "disconnected" | "ended" | "removed";
  snapshot: RoomSnapshot | null;
  statuses: Record<string, ParticipantStatus>;
  error: string | null;
  mode: "headset";
  headsetHost: HeadsetHostView | null;
  headsetSelf: HeadsetParticipantView | null;
};
export const idleRoomView: RoomView = { phase: "idle", snapshot: null, statuses: {}, error: null, mode: "headset", headsetHost: null, headsetSelf: null };

export class HeadsetRoom {
  private view: RoomView = idleRoomView;
  private transport: RoomTransport | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private roomId: string | null = null;
  private refreshing = false;
  private refreshPending = false;
  private disposed = false;
  private headsetHostInstance: HeadsetHost | null = null;
  private headsetParticipantInstance: HeadsetParticipant | null = null;
  private headsetArbiter: HeadsetArbiter | null = null;
  private readonly headsetClock = new ClockAlignment();
  private readonly visibilityHandler = () => this.headsetParticipantInstance?.setVisible(document.visibilityState === "visible");

  constructor(private readonly onView: (view: RoomView) => void, private readonly dispatch?: (action: CaptionAction) => void,
    private readonly now: () => number = Date.now) {}
  private update(values: Partial<RoomView>) { this.view = { ...this.view, ...values }; this.onView(this.view); }
  private get isHost() { return this.view.snapshot?.self.role === "host"; }

  get headsetHost() { return this.headsetHostInstance; }
  get headsetParticipant() { return this.headsetParticipantInstance; }
  private receiveHeadsetSignal(id: string, signal: HeadsetSignal, local = false) {
    if (signal.kind === "gate" && signal.at !== undefined) this.headsetClock.observe(id, this.now(), signal.at, false, local);
    this.headsetHostInstance?.signal(id, signal);
  }
  private receiveHeadsetCaption(id: string, event: TranscriptionEvent, envelope?: CaptionEnvelope, local = false) {
    if (!this.isHost || this.view.mode !== "headset" || !this.view.snapshot?.participants.some((p) => p.id === id && !p.removed)) return;
    const offset = envelope ? this.headsetClock.observe(id, this.now(), envelope.readyAt, true, local) : local ? 0 : this.headsetClock.offset(id);
    this.headsetArbiter?.receive(id, exactIdentity(event, id), envelope?.evidence, offset);
    this.syncHeadsetStats();
  }
  private syncHeadsetStats() {
    if (!this.headsetArbiter || !this.headsetHostInstance) return;
    this.headsetHostInstance.captionStats(this.headsetArbiter.snapshot(), Object.fromEntries((this.view.snapshot?.participants ?? []).filter((p) => !p.removed).map((p) => [p.id, this.headsetClock.summary(p.id)])), this.headsetArbiter.hiddenCaptions());
  }
  async create() {
    this.dispatch?.({ type: "HEADSET_START" });
    this.update({ phase: "connecting", error: null });
    try { await this.enter(await roomRequest("create_headset")); }
    catch (error) { this.update({ phase: "disconnected", error: message(error) }); throw error; }
  }
  // Restoring never starts capture; headset setup still needs a user gesture.
  async restore(): Promise<"headset" | null> {
    const snapshot = await roomRequest<RoomSnapshot | null>("restore");
    if (!snapshot || this.disposed || snapshot.mode !== "headset") return null;
    this.dispatch?.({ type: "HEADSET_START" });
    try { snapshot.joinUrl = sessionStorage.getItem(`caption-invite:${snapshot.roomId}`) ?? undefined; } catch { /* Room restoration does not require storage. */ }
    await this.enter(snapshot);
    return "headset";
  }
  async join(token: string, name: string) {
    this.update({ phase: "connecting", error: null });
    try { await this.enter(await roomRequest("join", { token, name })); }
    catch (error) { this.update({ phase: "disconnected", error: message(error) }); throw error; }
  }
  async rejoin() {
    const snapshot = this.view.snapshot;
    if (!snapshot) throw new Error("Start or join a conversation first.");
    this.update({ phase: "connecting", error: null });
    try { await this.enter(await roomRequest("snapshot", { roomId: snapshot.roomId })); }
    catch (error) { this.update({ phase: "disconnected", error: message(error) }); throw error; }
  }
  private async enter(snapshot: RoomSnapshot) {
    if (this.disposed) return;
    await this.release();
    if (snapshot.mode !== "headset") throw new Error("This conversation is no longer available.");
    if (this.disposed) return;
    if (snapshot.roomId !== this.roomId) await this.resetRoom(snapshot.roomId);
    if (snapshot.status !== "open" || snapshot.self.removed) {
      this.update({ snapshot, phase: snapshot.self.removed ? "removed" : "ended" });
      return;
    }
    const generation = this.generation;
    const joinUrl = snapshot.joinUrl ?? (this.view.snapshot?.roomId === snapshot.roomId ? this.view.snapshot.joinUrl : undefined);
    snapshot = { ...snapshot, joinUrl };
    if (joinUrl && snapshot.self.role === "host") { try { sessionStorage.setItem(`caption-invite:${snapshot.roomId}`, joinUrl); } catch { /* Optional invite metadata only. */ } }
    this.update({ snapshot, mode: "headset", headsetHost: null, headsetSelf: null, phase: "connecting", statuses: Object.fromEntries(snapshot.participants.map((p) => [p.id, p.removed ? "Removed" : "Disconnected"])), error: null });
    if (snapshot.mode === "headset" && snapshot.self.role === "host" && !this.headsetArbiter) {
      // Dev-only harness hook. No production setting or user-facing bypass exists.
      const bypass = process.env.NODE_ENV === "development" && (globalThis as typeof globalThis & { __captionHeadsetTest?: { bypass?: boolean } }).__captionHeadsetTest?.bypass === true;
      this.headsetArbiter = new HeadsetArbiter((action) => this.dispatch?.(action), () => this.syncHeadsetStats(), { now: this.now, bypass });
    }
    this.dispatch?.({ type: "HEADSET_SPEAKERS", speakers: participantProfiles(snapshot.participants) });
    const supabase = roomClient();
    const session = await technicalSession();
    if (generation !== this.generation) return;
    await supabase.realtime.setAuth(session.access_token);
    const transport = new SupabaseRoomTransport(supabase, snapshot.roomId, snapshot.self, {
      state: (id, status) => {
        if (generation !== this.generation) return;
        this.update({ statuses: { ...this.view.statuses, [id]: status } });
        if (status === "Connected" && this.isHost && id !== this.view.snapshot?.self.id) { this.headsetHostInstance?.syncSensitivity(); }
      },
      control: (event) => {
        if (generation !== this.generation) return;
        if (event.type === "room-ended") void this.finish("ended");
        else if (event.type === "participant-removed" && event.participantId === snapshot.self.id) void this.finish("removed");
        else void this.refresh();
      },
      disconnected: () => { if (generation === this.generation) void this.lostConnection(); },
      deliveryError: (error) => { if (generation === this.generation) this.update({ error }); },
      registryChanged: () => { if (generation === this.generation) void this.refresh(); },
      headsetPresence: (id, presence) => { if (generation === this.generation) this.headsetHostInstance?.presence(id, presence); },
      headsetSignal: (id, signal) => { if (generation === this.generation) this.receiveHeadsetSignal(id, signal); },
      headsetControl: (control) => { if (generation === this.generation) this.headsetParticipantInstance?.receiveControl(control); },
      caption: (participantId, event, envelope) => { if (generation === this.generation && snapshot.mode === "headset") this.receiveHeadsetCaption(participantId, event, envelope); },
    });
    this.transport = transport;
    try {
      await transport.connect(snapshot.participants);
      if (generation !== this.generation) { await transport.disconnect(); return; }
      this.update({ phase: "joined" });
      this.dispatch?.({ type: "LISTENING" });
      this.timer = setInterval(() => void this.refresh(), 3000);
      if (snapshot.self.role === "host") {
        void this.refresh();
        if (snapshot.mode === "headset") {
          if (!this.headsetHostInstance) this.headsetHostInstance = new HeadsetHost({ sendControl: (control) => this.transport?.sendControl(control) ?? Promise.resolve() }, (view) => this.update({ headsetHost: view }));
          this.headsetHostInstance.setRoster(snapshot.participants);
          if (this.headsetParticipantInstance) { this.headsetHostInstance.attachLocal(snapshot.self.id, this.headsetParticipantInstance); this.update({ headsetSelf: this.headsetParticipantInstance.currentView }); }
          this.headsetHostInstance.syncSensitivity();
          this.syncHeadsetStats();
        }
      } else if (snapshot.mode === "headset") {
        if (!this.headsetParticipantInstance) this.headsetParticipantInstance = new HeadsetParticipant(snapshot.self.id, { setPresence: (presence) => this.transport?.setHeadsetPresence?.(presence) ?? Promise.resolve(), sendSignal: (signal) => this.transport?.sendHeadsetSignal?.(signal) ?? Promise.resolve(), sendCaption: (event, streamId, evidence) => this.transport?.sendCaption?.(event, streamId, evidence) ?? Promise.resolve() }, (view) => this.update({ headsetSelf: view }), { transcriberFactory: (publish, onState) => new HeadsetTranscriber(snapshot.roomId, publish, onState), ...(headsetBenchmarkRequested(snapshot.self.role) ? { benchmark: { roomId: snapshot.roomId, hints: () => (this.view.snapshot?.participants ?? []).map((participant) => participant.displayName) } } : {}) });
        this.headsetParticipantInstance.setVisible(document.visibilityState === "visible");
        this.update({ headsetSelf: this.headsetParticipantInstance.currentView });
        document.addEventListener("visibilitychange", this.visibilityHandler);
      }
    } catch (error) {
      if (generation === this.generation) await this.lostConnection(message(error));
      throw error;
    }
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
        ? { setPresence: async (presence: HeadsetPresence) => this.headsetHostInstance?.presence(selfId, presence), sendSignal: async (signal: HeadsetSignal) => this.receiveHeadsetSignal(selfId, signal, true), sendCaption: async (event: TranscriptionEvent, streamId: string, evidence?: CaptionEvidence) => this.receiveHeadsetCaption(selfId, event, { event, streamId, readyAt: this.now(), sequence: 1, evidence }, true) }
        : { setPresence: async (presence: HeadsetPresence) => this.transport?.setHeadsetPresence?.(presence), sendSignal: async (signal: HeadsetSignal) => this.transport?.sendHeadsetSignal?.(signal), sendCaption: async (event: TranscriptionEvent, streamId: string, evidence?: CaptionEvidence) => this.transport?.sendCaption?.(event, streamId, evidence) };
      const roomId = this.view.snapshot.roomId;
      this.headsetParticipantInstance = new HeadsetParticipant(selfId, { setPresence: async (presence) => { await io.setPresence(presence); }, sendSignal: async (signal) => { await io.sendSignal(signal); }, sendCaption: async (event, streamId, evidence) => { await io.sendCaption(event, streamId, evidence); } }, (view) => this.update({ headsetSelf: view }), { transcriberFactory: (publish, onState) => new HeadsetTranscriber(roomId, publish, onState), ...(headsetBenchmarkRequested(this.view.snapshot.self.role) ? { benchmark: { roomId, hints: () => (this.view.snapshot?.participants ?? []).map((participant) => participant.displayName) } } : {}) });
      if (this.isHost) this.headsetHostInstance?.attachLocal(selfId, this.headsetParticipantInstance);
    }
    await this.headsetParticipantInstance.startSetup(deviceId);
  }
  useCurrentHeadsetInput() { this.headsetParticipantInstance?.useCurrentInput(); }
  async chooseHeadsetInput(deviceId: string) { await this.headsetParticipantInstance?.chooseInput(deviceId); }
  async restartHeadsetMicrophone() { await this.headsetParticipantInstance?.restartMicrophone(); }
  async retryHeadsetCaptions() { await this.headsetParticipantInstance?.retryCaptions(); }
  setHeadsetBenchmarkPhrase(index: number | null) { this.headsetParticipantInstance?.selectBenchmarkPhrase(index); }
  setHeadsetBenchmarkContextHints(enabled: boolean) { const names = (this.view.snapshot?.participants ?? []).map((participant) => participant.displayName); this.headsetParticipantInstance?.setBenchmarkContextHints(enabled, names); }
  setHeadsetSensitivity(participantId: string, sensitivity: Sensitivity, final = true) { this.headsetHostInstance?.setSensitivity(participantId, sensitivity, final); }

  async remove(participantId: string) {
    if (!this.view.snapshot) return;
    const snapshot = await roomRequest("remove", { roomId: this.view.snapshot.roomId, participantId });
    // Mark removed before any further transport message can be accepted.
    this.update({ snapshot: { ...snapshot, joinUrl: this.view.snapshot.joinUrl }, statuses: { ...this.view.statuses, [participantId]: "Removed" } });
    this.headsetArbiter?.remove(participantId); this.headsetClock.remove(participantId);
    await this.transport?.sendControl({ type: "participant-removed", participantId });
    await this.transport?.updateParticipants(snapshot.participants);
  }
  async end() {
    if (!this.view.snapshot) return;
    await roomRequest("end", { roomId: this.view.snapshot.roomId });
    await this.transport?.sendControl({ type: "room-ended" }).catch(() => undefined);
    await this.finish("ended");
  }
  async leave() { await this.release(); this.update({ phase: "idle" }); }
  async dispose() { this.disposed = true; await this.release(); }

  private async refresh() {
    if (this.view.phase !== "joined" || !this.view.snapshot) return;
    if (this.refreshing) { this.refreshPending = true; return; }
    this.refreshing = true;
    const generation = this.generation;
    try {
      const snapshot = await roomRequest("snapshot", { roomId: this.view.snapshot.roomId });
      if (generation !== this.generation) return;
      if (snapshot.mode !== "headset" || snapshot.status !== "open") { await this.finish("ended"); return; }
      if (snapshot.self.removed) { await this.finish("removed"); return; }
      this.update({ snapshot: { ...snapshot, joinUrl: this.view.snapshot?.joinUrl } });
      for (const participant of snapshot.participants) if (participant.removed) { this.headsetArbiter?.remove(participant.id); this.headsetClock.remove(participant.id); }
      this.dispatch?.({ type: "HEADSET_SPEAKERS", speakers: participantProfiles(snapshot.participants) });
      if (this.view.mode === "headset" && this.headsetHostInstance) this.headsetHostInstance.setRoster(snapshot.participants);
      await this.transport?.updateParticipants(snapshot.participants);
    } catch { if (generation === this.generation) await this.lostConnection(); }
    finally {
      this.refreshing = false;
      if (this.refreshPending) { this.refreshPending = false; void this.refresh(); }
    }
  }
  private async lostConnection(error = "Room connection interrupted. Rejoin to continue.") {
    this.update({ phase: "disconnected", error });
    await this.release();
    this.dispatch?.({ type: "RECONNECTING", attempt: 0 });
  }
  private async finish(phase: "ended" | "removed") {
    this.update({ phase, error: null });
    await this.release();
    this.dispatch?.({ type: "ENDED" });
  }
  private async resetRoom(roomId: string) {
    this.roomId = roomId;
    this.headsetArbiter?.reset(); this.headsetArbiter = null; this.headsetClock.reset();
    this.headsetParticipantInstance = null;
    this.headsetHostInstance?.dispose();
    this.headsetHostInstance = null;
  }
  private async release() {
    ++this.generation;
    this.headsetArbiter?.cancelPending(); this.headsetHostInstance?.dispose();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    await this.headsetParticipantInstance?.stopMicrophone().catch(() => undefined);
    const transport = this.transport;
    this.transport = null;
    await transport?.disconnect();
  }
}

function message(error: unknown) { return error instanceof Error ? error.message : "The conversation could not be reached."; }
function headsetBenchmarkRequested(role?: string) { return typeof window !== "undefined" && isHeadsetBenchmarkEnabled(window.location.search, role ?? "guest"); }
