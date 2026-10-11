import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { IDENTIFY_REQUEST_ID, validIdentificationPhases, validIdentifyRequests, type Participant, type ParticipantStatus, type RoomControl } from "./types";
import type { VoicePhase } from "./voice-identity";
import { validHeadsetControl, validHeadsetPresence, validHeadsetSignal, type HeadsetControl, type HeadsetPresence, type HeadsetSignal } from "../headset/messages";

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
};
export interface RoomTransport {
  connect(participants: Participant[]): Promise<void>;
  updateParticipants(participants: Participant[]): Promise<void>;
  setIdentifyRequest(requestId: string | null): Promise<void>;
  setHeadsetPresence?(presence: HeadsetPresence): Promise<void>;
  sendHeadsetSignal?(signal: HeadsetSignal): Promise<void>;
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
      // Requests ride on presence state so a host that subscribes after the tap still receives them.
      // The private topic authorizes the publisher, so a request names that participant only.
      channel.on("presence", { event: "sync" }, () => {
        if (this.stopped || !this.allowed.has(participant.id)) return;
        const entries = Object.values(channel.presenceState()).flat() as Array<{ identify?: unknown; headset?: unknown }>;
        this.callbacks.state(participant.id, entries.length ? "Connected" : "Disconnected");
        if (this.self.role === "host" && participant.id !== this.self.id) { this.callbacks.identify(participant.id, identifyRequest(entries)); this.callbacks.headsetPresence?.(participant.id, headsetPresence(entries)); }
      });
      channel.on("broadcast", { event: "headset" }, ({ payload }) => {
        if (!this.stopped && this.self.role === "host" && this.allowed.has(participant.id) && validHeadsetSignal(payload)) this.callbacks.headsetSignal?.(participant.id, payload);
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
    if (!channel || await channel.track({ online: true, identify: requestId, ...(this.headsetState ? { headset: this.headsetState } : {}) }) !== "ok") throw new Error("Your request could not reach the host. Try again.");
  }
  async setHeadsetPresence(presence: HeadsetPresence): Promise<void> {
    if (this.stopped || this.self.role === "host") return;
    this.headsetState = presence;
    const channel = this.channels.get(this.self.id);
    if (!channel || await channel.track({ online: true, identify: this.identifyState, headset: presence }) !== "ok") throw new Error("Your headset state could not reach the host.");
  }
  async sendHeadsetSignal(signal: HeadsetSignal): Promise<void> {
    if (this.stopped || this.self.role === "host") return;
    if (await this.channels.get(this.self.id)?.send({ type: "broadcast", event: "headset", payload: signal }) !== "ok") throw new Error("Your headset signal could not reach the host.");
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

function identifyRequest(entries: Array<{ identify?: unknown }>): string | null {
  for (const entry of [...entries].reverse()) if (typeof entry.identify === "string" && IDENTIFY_REQUEST_ID.test(entry.identify)) return entry.identify;
  return null;
}
function headsetPresence(entries: Array<{ headset?: unknown }>): HeadsetPresence | null {
  for (const entry of [...entries].reverse()) if (validHeadsetPresence(entry.headset)) return entry.headset;
  return null;
}
