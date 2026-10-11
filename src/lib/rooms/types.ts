import type { SpeakerProfile, TranscriptionEvent } from "../captions/types";
import { VOICE_PHASES, type VoicePhase } from "./voice-identity";
import type { HeadsetControl } from "../headset/messages";

export const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const HOST_ACCENT_INDEX = 6;
export type Participant = {
  id: string;
  role: "host" | "participant";
  displayName: string;
  accentIndex: number | null;
  removed: boolean;
};
export type RoomSnapshot = {
  roomId: string;
  expiresAt: string;
  status: "open" | "ended";
  self: Participant;
  participants: Participant[];
  mode: RoomMode;
  joinUrl?: string;
};
export type RoomMode = "connected" | "headset";
export type ParticipantStatus = "Connected" | "Reconnecting" | "Disconnected" | "Removed";
export type IdentifyAction = "request" | "cancel";
export type RoomControl = { type: "room-ended" } | { type: "participant-removed"; participantId: string } | { type: "registry-changed" }
  /** `requests` names the phone request each participant's phase answers, so stale phases cannot end a newer request. */
  | { type: "voice-identification"; phases: Record<string, VoicePhase>; requests: Record<string, string> }
  | HeadsetControl;
export const IDENTIFY_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;
// Personal-microphone caption relay envelope, retained for a future Hybrid Mode.
export type CaptionEnvelope = { event: TranscriptionEvent; sequence: number; readyAt: number; streamId: string };

export function validIdentificationPhases(value: unknown): value is Record<string, VoicePhase> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 64 && entries.every(([id, phase]) => id.length < 100 && VOICE_PHASES.includes(phase as VoicePhase));
}
export function validIdentifyRequests(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 64 && entries.every(([id, request]) => id.length < 100 && typeof request === "string" && IDENTIFY_REQUEST_ID.test(request));
}

export function validateName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || [...value.trim()].length > 40) throw new Error("Enter a name of 1–40 characters.");
  return value.trim();
}

export function participantProfiles(participants: Participant[]): SpeakerProfile[] {
  return participants.map((participant, index) => ({
    id: participant.id,
    ordinal: index + 1,
    displayName: participant.displayName,
    side: index % 2 ? "right" : "left",
    accentIndex: participant.role === "host" ? HOST_ACCENT_INDEX : participant.accentIndex ?? 0,
    identityOrigin: participant.role === "host" ? "connected-host" : "connected-participant",
  }));
}

// Identity is assigned from the authorized channel, never from the sender's payload.
export function exactIdentity(event: TranscriptionEvent, participantId: string): TranscriptionEvent {
  const sourceId = `participant:${participantId}`;
  const prefix = (id: string) => `${sourceId}/${id}`;
  const caption = (item: import("../captions/types").CaptionEvent) => ({
    ...item, id: prefix(item.id), sourceTurnId: prefix(item.sourceTurnId ?? item.id), sourceId, speakerId: participantId,
  });
  if (event.type === "interim") return { type: "interim", caption: caption(event.caption) };
  return { ...event, sourceTurnId: prefix(event.sourceTurnId), captions: event.captions.map(caption) };
}

export function validEnvelope(value: unknown): value is CaptionEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as CaptionEnvelope;
  if (!Number.isSafeInteger(envelope.sequence) || envelope.sequence < 1 || !Number.isFinite(envelope.readyAt)
    || typeof envelope.streamId !== "string" || !/^[\da-f-]{36}$/i.test(envelope.streamId)) return false;
  const event = envelope.event;
  if (!event || !["interim", "final_turn", "speaker_revision"].includes(event.type)) return false;
  const captions = event.type === "interim" ? [event.caption] : event.captions;
  return Array.isArray(captions) && captions.length > 0 && captions.length <= 32
    && (event.type === "interim" || (typeof event.sourceTurnId === "string" && event.sourceTurnId.length < 300))
    && captions.every((caption) => caption && typeof caption.text === "string" && caption.text.length <= 8000
      && typeof caption.id === "string" && caption.id.length < 300 && Number.isFinite(caption.startedAt)
      && (caption.sourceTurnId === undefined || (typeof caption.sourceTurnId === "string" && caption.sourceTurnId.length < 300)));
}
