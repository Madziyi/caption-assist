import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { exactIdentity, validEnvelope, type CaptionEnvelope, type Participant, type ParticipantStatus, type RelayObservation, type RoomControl } from "./types";
import type { TranscriptionEvent } from "../captions/types";

type TransportCallbacks = {
  caption(participantId: string, event: TranscriptionEvent): void;
  state(participantId: string, status: ParticipantStatus): void;
  control(event: RoomControl): void;
  disconnected(): void;
  relay(observation: RelayObservation): void;
  registryChanged(): void;
};
export interface RoomTransport {
  connect(participants: Participant[]): Promise<void>;
  updateParticipants(participants: Participant[]): Promise<void>;
  sendCaption(event: TranscriptionEvent): Promise<void>;
  setMicrophone(active: boolean): Promise<void>;
  sendControl(event: RoomControl): Promise<void>;
  disconnect(): Promise<void>;
}

export class SupabaseRoomTransport implements RoomTransport {
  private channels = new Map<string, RealtimeChannel>();
  private controlChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private stopped = false;
  private sequence = 0;
  private readonly streamId = crypto.randomUUID();
  private received = new Map<string, number>();
  private sent = new Map<number, number>();
  private allowed = new Set<string>();

  constructor(private readonly client: SupabaseClient, private readonly roomId: string, private readonly self: Participant, private readonly callbacks: TransportCallbacks) {}

  async connect(participants: Participant[]): Promise<void> {
    this.controlChannel = this.client.channel(`caption-room:${this.roomId}:control`, { config: { private: true, broadcast: { ack: true, self: false } } });
    this.controlChannel.on("broadcast", { event: "control" }, ({ payload }) => {
      if (payload?.type === "relay-ack" && payload.participantId === this.self.id) {
        const start = this.sent.get(payload.sequence);
        if (start !== undefined) {
          this.callbacks.relay({ participantId: this.self.id, sequence: payload.sequence, roundTripMs: performance.now() - start });
          this.sent.delete(payload.sequence);
        }
      } else if (payload?.type === "room-ended" || payload?.type === "registry-changed"
        || (payload?.type === "participant-removed" && typeof payload.participantId === "string")) this.callbacks.control(payload);
    });
    await this.subscribe(this.controlChannel, true);
    await this.updateParticipants(participants);
    await this.setMicrophone(false);
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
      channel.on("broadcast", { event: "caption" }, ({ payload }) => {
        if (this.stopped || this.self.role !== "host" || !this.allowed.has(participant.id) || !validEnvelope(payload)) return;
        const streamKey = `${participant.id}:${payload.streamId}`;
        if (payload.sequence <= (this.received.get(streamKey) ?? 0)) return;
        this.received.set(streamKey, payload.sequence);
        if (this.received.size > 512) this.received.delete(this.received.keys().next().value!);
        this.callbacks.caption(participant.id, exactIdentity(payload.event, participant.id));
        // Same-clock sender→host→sender round trip; no assumption of synchronized phone clocks.
        void this.controlChannel?.send({ type: "broadcast", event: "control", payload: { type: "relay-ack", participantId: participant.id, sequence: payload.sequence } });
      });
      channel.on("presence", { event: "sync" }, () => {
        if (this.stopped || !this.allowed.has(participant.id)) return;
        const entries = Object.values(channel.presenceState<{ microphoneActive?: boolean }>()).flat();
        this.callbacks.state(participant.id, entries.length ? (entries.some((entry) => entry.microphoneActive === true) ? "Microphone active" : "Muted") : "Disconnected");
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

  async sendCaption(event: TranscriptionEvent): Promise<void> {
    if (this.stopped) return;
    const sequence = ++this.sequence;
    const readyAt = performance.now();
    this.sent.set(sequence, readyAt);
    if (this.sent.size > 128) this.sent.delete(this.sent.keys().next().value!);
    const payload: CaptionEnvelope = { event, sequence, readyAt, streamId: this.streamId };
    if (this.self.role === "host") this.callbacks.caption(this.self.id, exactIdentity(event, this.self.id));
    const channel = this.channels.get(this.self.id);
    if (!channel || await channel.send({ type: "broadcast", event: "caption", payload }) !== "ok") throw new Error("Caption delivery was interrupted.");
  }
  async setMicrophone(active: boolean): Promise<void> {
    if (this.stopped) return;
    this.callbacks.state(this.self.id, active ? "Microphone active" : "Muted");
    const result = await this.channels.get(this.self.id)?.track({ microphoneActive: active });
    if (result !== "ok") throw new Error("Microphone state could not reach the room.");
  }
  async sendControl(event: RoomControl): Promise<void> {
    if (this.self.role !== "host" || this.stopped) return;
    if (await this.controlChannel?.send({ type: "broadcast", event: "control", payload: event }) !== "ok") throw new Error("Room notification could not be delivered.");
  }
  async disconnect(): Promise<void> {
    this.stopped = true;
    const channels = [...this.channels.values(), ...(this.controlChannel ? [this.controlChannel] : []), ...(this.presenceChannel ? [this.presenceChannel] : [])];
    this.channels.clear(); this.controlChannel = null;
    this.presenceChannel = null;
    await Promise.race([
      Promise.all(channels.map((channel) => this.client.removeChannel(channel).catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  }
}
