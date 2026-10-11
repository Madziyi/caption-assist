import type { CaptionAction } from "../captions/reducer";
import type { TranscriptionEvent } from "../captions/types";
import { roomClient, roomRequest, technicalSession } from "./browser";
import { PersonalMicrophone, type PersonalMicrophoneState } from "./personal-microphone";
import { SupabaseRoomTransport, type RoomTransport } from "./transport";
import { participantProfiles, type ParticipantStatus, type RelayObservation, type RoomSnapshot } from "./types";

export type RoomView = {
  phase: "idle" | "connecting" | "joined" | "disconnected" | "ended" | "removed";
  snapshot: RoomSnapshot | null;
  statuses: Record<string, ParticipantStatus>;
  microphone: PersonalMicrophoneState;
  error: string | null;
  relay: RelayObservation | null;
};
export const idleRoomView: RoomView = { phase: "idle", snapshot: null, statuses: {}, microphone: "Muted", error: null, relay: null };

export class ConnectedRoom {
  private view: RoomView = idleRoomView;
  private transport: RoomTransport | null = null;
  private mic: PersonalMicrophone | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private ingest = 0;
  private accepting = false;
  private refreshing = false;
  private refreshPending = false;
  private disposed = false;

  constructor(private readonly onView: (view: RoomView) => void, private readonly dispatch?: (action: CaptionAction) => void) {}
  private update(values: Partial<RoomView>) { this.view = { ...this.view, ...values }; this.onView(this.view); }

  async create() {
    this.dispatch?.({ type: "CONNECTED_START" });
    this.update({ phase: "connecting", error: null });
    try { await this.enter(await roomRequest("create")); }
    catch (error) { this.update({ phase: "disconnected", error: message(error) }); throw error; }
  }
  async restore(): Promise<boolean> {
    const snapshot = await roomRequest<RoomSnapshot | null>("restore");
    if (!snapshot || this.disposed) return false;
    this.dispatch?.({ type: "CONNECTED_START" });
    try { snapshot.joinUrl = sessionStorage.getItem(`caption-invite:${snapshot.roomId}`) ?? undefined; } catch { /* Room restoration does not require storage. */ }
    await this.enter(snapshot);
    return true;
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
    if (this.disposed) return;
    if (snapshot.status !== "open" || snapshot.self.removed) {
      this.update({ snapshot, phase: snapshot.self.removed ? "removed" : "ended", microphone: "Muted" });
      return;
    }
    const generation = this.generation;
    const joinUrl = snapshot.joinUrl ?? (this.view.snapshot?.roomId === snapshot.roomId ? this.view.snapshot.joinUrl : undefined);
    snapshot = { ...snapshot, joinUrl };
    if (joinUrl && snapshot.self.role === "host") { try { sessionStorage.setItem(`caption-invite:${snapshot.roomId}`, joinUrl); } catch { /* Optional invite metadata only. */ } }
    this.update({ snapshot, phase: "connecting", microphone: "Muted", statuses: Object.fromEntries(snapshot.participants.map((p) => [p.id, p.removed ? "Removed" : "Disconnected"])), error: null });
    this.dispatch?.({ type: "CONNECTED_SPEAKERS", speakers: participantProfiles(snapshot.participants) });
    const supabase = roomClient();
    const session = await technicalSession();
    if (generation !== this.generation) return;
    await supabase.realtime.setAuth(session.access_token);
    const transport = new SupabaseRoomTransport(supabase, snapshot.roomId, snapshot.self, {
      caption: (id, event) => this.caption(id, event),
      state: (id, status) => {
        if (generation !== this.generation) return;
        this.update({ statuses: { ...this.view.statuses, [id]: status } });
        if (status !== "Microphone active") this.dispatch?.({ type: "CLEAR_INTERIM", sourceId: `participant:${id}` });
      },
      control: (event) => {
        if (generation !== this.generation) return;
        if (event.type === "room-ended") void this.finish("ended");
        else if (event.type === "participant-removed" && event.participantId === snapshot.self.id) void this.finish("removed");
        else void this.refresh();
      },
      disconnected: () => { if (generation === this.generation) void this.lostConnection(); },
      relay: (relay) => { if (generation === this.generation) this.update({ relay }); },
      registryChanged: () => { if (generation === this.generation) void this.refresh(); },
    });
    this.transport = transport;
    this.mic = new PersonalMicrophone(snapshot.roomId, (event) => transport.sendCaption(event), (microphone) => {
      if (generation !== this.generation) return;
      this.update({ microphone });
      void transport.setMicrophone(microphone === "Microphone active" || microphone === "Reconnecting").catch(() => this.lostConnection());
    }, (error) => this.update({ error }));
    try {
      await transport.connect(snapshot.participants);
      if (generation !== this.generation) { await transport.disconnect(); return; }
      this.accepting = true;
      this.update({ phase: "joined" });
      this.dispatch?.({ type: "LISTENING" });
      this.timer = setInterval(() => void this.refresh(), 3000);
      if (snapshot.self.role === "host") void this.refresh();
    } catch (error) {
      if (generation === this.generation) await this.lostConnection(message(error));
      throw error;
    }
  }
  private caption(id: string, event: TranscriptionEvent) {
    if (!this.accepting || this.view.phase !== "joined" || !this.view.snapshot?.participants.some((p) => p.id === id && !p.removed)) return;
    // Final order is monotonic host ingest; device wall clocks never reorder visible text.
    const ingestOrder = ++this.ingest;
    const actionEvent = event.type === "interim" ? event : { ...event, captions: event.captions.map((caption) => ({ ...caption, ingestOrder })) };
    this.dispatch?.({ type: "TRANSCRIPTION_EVENT", event: actionEvent });
  }
  async toggleMicrophone() {
    if (this.view.phase !== "joined") return;
    this.update({ error: null });
    if (this.view.microphone === "Muted") await this.mic?.unmute();
    else await this.mic?.mute();
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
  async remove(participantId: string) {
    if (!this.view.snapshot) return;
    const snapshot = await roomRequest("remove", { roomId: this.view.snapshot.roomId, participantId });
    // Mark removed before any further transport message can be accepted.
    this.update({ snapshot: { ...snapshot, joinUrl: this.view.snapshot.joinUrl }, statuses: { ...this.view.statuses, [participantId]: "Removed" } });
    this.dispatch?.({ type: "CLEAR_INTERIM", sourceId: `participant:${participantId}` });
    await this.transport?.sendControl({ type: "participant-removed", participantId });
    await this.transport?.updateParticipants(snapshot.participants);
  }
  async end() {
    if (!this.view.snapshot) return;
    this.accepting = false;
    await this.mic?.mute();
    await roomRequest("end", { roomId: this.view.snapshot.roomId });
    await this.transport?.sendControl({ type: "room-ended" }).catch(() => undefined);
    await this.finish("ended");
  }
  async leave() { await this.release(); this.update({ phase: "idle", microphone: "Muted" }); }
  async dispose() { this.disposed = true; await this.release(); }

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
      this.dispatch?.({ type: "CONNECTED_SPEAKERS", speakers: participantProfiles(snapshot.participants) });
      await this.transport?.updateParticipants(snapshot.participants);
    } catch { if (generation === this.generation) await this.lostConnection(); }
    finally {
      this.refreshing = false;
      if (this.refreshPending) { this.refreshPending = false; void this.refresh(); }
    }
  }
  private async lostConnection(error = "Room connection interrupted. Rejoin to continue; your microphone will be muted.") {
    this.accepting = false;
    this.update({ phase: "disconnected", error, microphone: "Muted" });
    for (const participant of this.view.snapshot?.participants ?? []) this.dispatch?.({ type: "CLEAR_INTERIM", sourceId: `participant:${participant.id}` });
    await this.release();
    this.dispatch?.({ type: "RECONNECTING", attempt: 0 });
  }
  private async finish(phase: "ended" | "removed") {
    this.accepting = false;
    this.update({ phase, microphone: "Muted", error: null });
    await this.release();
    this.dispatch?.({ type: "ENDED" });
  }
  private async release() {
    ++this.generation; this.accepting = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const mic = this.mic; const transport = this.transport;
    this.mic = null; this.transport = null;
    await Promise.all([mic?.mute(), transport?.disconnect()]);
  }
}
function message(error: unknown) { return error instanceof Error ? error.message : "The conversation could not be reached."; }
