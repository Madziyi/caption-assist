import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { IDENTIFY_REQUEST_ID, validIdentificationPhases, validIdentifyRequests, type Participant, type ParticipantStatus, type RoomControl } from "./types";
import type { VoicePhase } from "./voice-identity";
import type { TranscriptionEvent } from "../captions/types";
import { validEnvelope, type CaptionEnvelope } from "./types";
import { validHeadsetControl, validHeadsetPresence, validHeadsetPresenceUpdate, validHeadsetSignal, type HeadsetControl, type HeadsetPresence, type HeadsetPresenceUpdate, type HeadsetSignal } from "../headset/messages";

// A connection allows five Presence writes in 30 s. The two initial room
// tracks leave room for at most three headset snapshots in that window.
const HEADSET_PRESENCE_INTERVAL_MS = 12000;

type TransportCallbacks = {
  /** Host: the participant's current identification request, or null when none is open. */
  identify(participantId: string, requestId: string | null): void;
  identification(phases: Record<string, VoicePhase>, requests: Record<string, string>): void;
  state(participantId: string, status: ParticipantStatus): void;
  control(event: RoomControl): void;
  disconnected(): void;
  registryChanged(): void;
  headsetPresence?(participantId: string, presence: HeadsetPresence | null): void;
  headsetSignal?(participantId: string, signal: HeadsetSignal): void;
  headsetControl?(control: HeadsetControl): void;
  caption?(participantId: string, event: TranscriptionEvent): void;
};
export interface RoomTransport {
  connect(participants: Participant[]): Promise<void>;
  updateParticipants(participants: Participant[]): Promise<void>;
  setIdentifyRequest(requestId: string | null): Promise<void>;
  setHeadsetPresence?(presence: HeadsetPresence): Promise<void>;
  sendHeadsetSignal?(signal: HeadsetSignal): Promise<void>;
  sendCaption?(event: TranscriptionEvent, streamId: string): Promise<void>;
  sendControl(event: RoomControl): Promise<void>;
  disconnect(): Promise<void>;
}

export class SupabaseRoomTransport implements RoomTransport {
  private channels = new Map<string, RealtimeChannel>();
  private controlChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private stopped = false;
  private allowed = new Set<string>();
  private identifyState: string | null = null;
  private headsetState: HeadsetPresence | null = null;
  private readonly headsetSession = crypto.randomUUID();
  private headsetSeq = 0;
  private lastPresenceAt = 0;
  private headsetPresenceTimer: ReturnType<typeof setTimeout> | null = null;
  private headsetVersions = new Map<string, { sessionId: string; seq: number; retired: Set<string> }>();
  private captionSequences = new Map<string, number>();
  private captionTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingCaptions = new Map<string, CaptionEnvelope>();
  private readonly receivedCaptions = new Map<string, number>();

  constructor(private readonly client: SupabaseClient, private readonly roomId: string, private readonly self: Participant, private readonly callbacks: TransportCallbacks) {}

  async connect(participants: Participant[]): Promise<void> {
    this.controlChannel = this.client.channel(`caption-room:${this.roomId}:control`, { config: { private: true, broadcast: { ack: true, self: false } } });
    this.controlChannel.on("broadcast", { event: "control" }, ({ payload }) => {
      if (this.stopped) return;
      if (payload?.type === "voice-identification") {
        if (this.self.role !== "host" && validIdentificationPhases(payload.phases) && validIdentifyRequests(payload.requests)) this.callbacks.identification(payload.phases, payload.requests);
      } else if (validHeadsetControl(payload)) {
        if (this.self.role !== "host") this.callbacks.headsetControl?.(payload);
      } else if (payload?.type === "room-ended" || payload?.type === "registry-changed"
        || (payload?.type === "participant-removed" && typeof payload.participantId === "string")) this.callbacks.control(payload);
    });
    await this.subscribe(this.controlChannel, true);
    await this.updateParticipants(participants);
    this.callbacks.state(this.self.id, "Connected");
    if (await this.channels.get(this.self.id)?.track({ online: true }) !== "ok") throw new Error("Room presence could not be established.");
    this.lastPresenceAt = Date.now();
    const presence = this.client.channel(`caption-room:${this.roomId}:presence`, { config: { private: true } });
    this.presenceChannel = presence;
    // Payloads are ignored: Presence cannot supply names, identity, roles or removal state.
    presence.on("presence", { event: "sync" }, () => {
      if (!this.stopped && this.self.role === "host") this.callbacks.registryChanged();
    });
    await this.subscribe(presence, true);
    if (await presence.track({ online: true }) !== "ok") throw new Error("Room presence could not be established.");
  }

  async updateParticipants(participants: Participant[]): Promise<void> {
    this.allowed = new Set(participants.filter((p) => !p.removed).map((p) => p.id));
    for (const [id, channel] of this.channels) {
      if (!this.allowed.has(id)) {
        this.channels.delete(id);
        this.headsetVersions.delete(id);
        await this.client.removeChannel(channel);
      }
    }
    for (const participant of participants) {
      if (participant.removed || this.channels.has(participant.id) || this.stopped) continue;
      if (this.self.role !== "host" && participant.id !== this.self.id) continue;
      const channel = this.client.channel(`caption-room:${this.roomId}:participant:${participant.id}`, {
        config: { private: true, broadcast: { ack: true, self: false }, presence: { key: participant.id } },
      });
      this.channels.set(participant.id, channel);
      // Requests ride on presence state so a host that subscribes after the tap still receives them.
      // The private topic authorizes the publisher, so a request names that participant only.
      channel.on("presence", { event: "sync" }, () => {
        if (this.stopped || !this.allowed.has(participant.id)) return;
        const entries = Object.values(channel.presenceState()).flat() as Array<{ identify?: unknown; headset?: unknown }>;
        this.callbacks.state(participant.id, entries.length ? "Connected" : "Disconnected");
        if (this.self.role === "host" && participant.id !== this.self.id) {
          this.callbacks.identify(participant.id, identifyRequest(entries));
          if (!entries.length) {
            this.headsetVersions.delete(participant.id);
            this.callbacks.headsetPresence?.(participant.id, null);
          } else {
            const update = headsetPresenceUpdate(entries);
            if (update) this.receiveHeadsetPresence(participant.id, update);
            else if (!this.headsetVersions.has(participant.id)) this.callbacks.headsetPresence?.(participant.id, headsetPresence(entries));
          }
        }
      });
      channel.on("broadcast", { event: "headset-presence" }, ({ payload }) => {
        if (!this.stopped && this.self.role === "host" && this.allowed.has(participant.id) && validHeadsetPresenceUpdate(payload)) this.receiveHeadsetPresence(participant.id, payload);
      });
      channel.on("broadcast", { event: "headset" }, ({ payload }) => {
        if (!this.stopped && this.self.role === "host" && this.allowed.has(participant.id) && validHeadsetSignal(payload)) this.callbacks.headsetSignal?.(participant.id, payload);
      });
      channel.on("broadcast", { event: "caption" }, ({ payload }) => {
        if (!this.stopped && this.self.role === "host" && this.allowed.has(participant.id) && validEnvelope(payload)) this.receiveCaption(participant.id, payload);
      });
      await this.subscribe(channel, participant.id === this.self.id, participant.id);
    }
  }

  private subscribe(channel: RealtimeChannel, critical: boolean, participantId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let joined = false;
      const timeout = setTimeout(() => reject(new Error("The room connection timed out.")), 12000);
      channel.subscribe((status) => {
        if (this.stopped) { clearTimeout(timeout); reject(new Error("Room connection was closed.")); return; }
        if (status === "SUBSCRIBED") { joined = true; clearTimeout(timeout); resolve(); }
        else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          clearTimeout(timeout);
          if (!joined) reject(new Error("The room connection was interrupted."));
          if (participantId) this.callbacks.state(participantId, status === "CLOSED" ? "Disconnected" : "Reconnecting");
          if (critical) this.callbacks.disconnected();
        }
      });
    });
  }

  async setIdentifyRequest(requestId: string | null): Promise<void> {
    if (this.stopped || this.self.role === "host") return;
    this.identifyState = requestId;
    const channel = this.channels.get(this.self.id);
    this.lastPresenceAt = Date.now();
    if (!channel || await channel.track(this.presencePayload()) !== "ok") throw new Error("Your request could not reach the host. Try again.");
  }
  async setHeadsetPresence(presence: HeadsetPresence): Promise<void> {
    if (this.stopped || this.self.role === "host") return;
    if (JSON.stringify(this.headsetState) === JSON.stringify(presence)) return;
    this.headsetState = presence;
    const update: HeadsetPresenceUpdate = { sessionId: this.headsetSession, seq: ++this.headsetSeq, presence };
    const channel = this.channels.get(this.self.id);
    // Calibration transitions are immediate Broadcast messages. Presence is a
    // coalesced snapshot for a host that subscribes after those transitions.
    this.scheduleHeadsetPresence();
    if (!channel || await channel.send({ type: "broadcast", event: "headset-presence", payload: update }) !== "ok") throw new Error("Your headset state could not reach the host.");
  }
  private presencePayload() {
    return { online: true, identify: this.identifyState, ...(this.headsetState ? { headset: this.headsetState, headsetSession: this.headsetSession, headsetSeq: this.headsetSeq } : {}) };
  }
  private scheduleHeadsetPresence() {
    if (this.stopped || this.headsetPresenceTimer || !this.headsetState) return;
    const delay = Math.max(0, HEADSET_PRESENCE_INTERVAL_MS - (Date.now() - this.lastPresenceAt));
    this.headsetPresenceTimer = setTimeout(() => {
      this.headsetPresenceTimer = null;
      if (this.stopped) return;
      if (Date.now() - this.lastPresenceAt < HEADSET_PRESENCE_INTERVAL_MS) { this.scheduleHeadsetPresence(); return; }
      const channel = this.channels.get(this.self.id);
      this.lastPresenceAt = Date.now();
      void channel?.track(this.presencePayload()).then((status) => {
        if (status !== "ok" && !this.stopped) this.callbacks.disconnected();
      }).catch(() => { if (!this.stopped) this.callbacks.disconnected(); });
    }, delay);
  }
  private receiveHeadsetPresence(participantId: string, update: HeadsetPresenceUpdate) {
    const previous = this.headsetVersions.get(participantId);
    if (previous?.retired.has(update.sessionId)) return;
    if (previous?.sessionId === update.sessionId && update.seq <= previous.seq) return;
    const retired = previous?.retired ?? new Set<string>();
    if (previous && previous.sessionId !== update.sessionId) retired.add(previous.sessionId);
    if (retired.size > 16) retired.delete(retired.values().next().value!);
    this.headsetVersions.set(participantId, { sessionId: update.sessionId, seq: update.seq, retired });
    this.callbacks.headsetPresence?.(participantId, update.presence);
  }
  private receiveCaption(participantId: string, envelope: CaptionEnvelope) {
    const key = `${participantId}/${envelope.streamId}`;
    const previous = this.receivedCaptions.get(key) ?? 0;
    if (envelope.sequence <= previous) return;
    this.receivedCaptions.delete(key); this.receivedCaptions.set(key, envelope.sequence);
    if (this.receivedCaptions.size > 512) this.receivedCaptions.delete(this.receivedCaptions.keys().next().value!);
    this.callbacks.caption?.(participantId, envelope.event);
  }
  async sendHeadsetSignal(signal: HeadsetSignal): Promise<void> {
    if (this.stopped || this.self.role === "host") return;
    if (await this.channels.get(this.self.id)?.send({ type: "broadcast", event: "headset", payload: signal }) !== "ok") throw new Error("Your headset signal could not reach the host.");
  }
  async sendCaption(event: TranscriptionEvent, streamId: string): Promise<void> {
    if (this.stopped || this.self.role === "host") return;
    const channel = this.channels.get(this.self.id);
    if (!channel || !/^[\da-f-]{36}$/i.test(streamId)) throw new Error("Caption delivery is unavailable.");
    const key = streamId;
    const envelope: CaptionEnvelope = { event, sequence: (this.captionSequences.get(key) ?? 0) + 1, readyAt: Date.now(), streamId };
    this.captionSequences.set(key, envelope.sequence);
    if (event.type === "interim") {
      this.pendingCaptions.set(key, envelope);
      if (!this.captionTimers.has(key)) this.captionTimers.set(key, setTimeout(() => { this.captionTimers.delete(key); const pending = this.pendingCaptions.get(key); this.pendingCaptions.delete(key); if (pending) void this.sendCaptionEnvelope(channel, pending); }, 200));
      return;
    }
    const timer = this.captionTimers.get(key);
    if (timer) clearTimeout(timer);
    this.captionTimers.delete(key); this.pendingCaptions.delete(key);
    await this.sendCaptionEnvelope(channel, envelope);
  }
  private async sendCaptionEnvelope(channel: RealtimeChannel, envelope: CaptionEnvelope) {
    if (await channel.send({ type: "broadcast", event: "caption", payload: envelope }) !== "ok") throw new Error("Caption delivery was interrupted.");
  }
  async sendControl(event: RoomControl): Promise<void> {
    if (this.self.role !== "host" || this.stopped) return;
    if (await this.controlChannel?.send({ type: "broadcast", event: "control", payload: event }) !== "ok") throw new Error("Room notification could not be delivered.");
  }
  async disconnect(): Promise<void> {
    this.stopped = true;
    if (this.headsetPresenceTimer) clearTimeout(this.headsetPresenceTimer);
    this.headsetPresenceTimer = null;
    this.headsetVersions.clear();
    for (const timer of this.captionTimers.values()) clearTimeout(timer);
    this.captionTimers.clear(); this.pendingCaptions.clear(); this.captionSequences.clear(); this.receivedCaptions.clear();
    const channels = [...this.channels.values(), ...(this.controlChannel ? [this.controlChannel] : []), ...(this.presenceChannel ? [this.presenceChannel] : [])];
    this.channels.clear(); this.controlChannel = null;
    this.presenceChannel = null;
    await Promise.race([
      Promise.all(channels.map((channel) => this.client.removeChannel(channel).catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  }
}

function identifyRequest(entries: Array<{ identify?: unknown }>): string | null {
  for (const entry of [...entries].reverse()) if (typeof entry.identify === "string" && IDENTIFY_REQUEST_ID.test(entry.identify)) return entry.identify;
  return null;
}
function headsetPresence(entries: Array<{ headset?: unknown }>): HeadsetPresence | null {
  for (const entry of [...entries].reverse()) if (validHeadsetPresence(entry.headset)) return entry.headset;
  return null;
}
function headsetPresenceUpdate(entries: Array<{ headset?: unknown }>): HeadsetPresenceUpdate | null {
  for (const entry of [...entries].reverse()) {
    const fields = entry as { headset?: unknown; headsetSession?: unknown; headsetSeq?: unknown };
    const update = { presence: fields.headset, sessionId: fields.headsetSession, seq: fields.headsetSeq };
    if (validHeadsetPresenceUpdate(update)) return update;
  }
  return null;
}
