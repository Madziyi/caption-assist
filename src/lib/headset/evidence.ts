import type { CaptionEvent, TranscriptionEvent } from "../captions/types";
import { LOOKAHEAD_MS } from "./gated-audio";
import type { LevelHistory } from "./level-history";
export type CaptionEvidence = { relDb: number | null; openRatio: number; startAt: number; endAt: number; frames?: number };
export function eventCaptions(event: TranscriptionEvent): CaptionEvent[] { return event.type === "interim" ? [event.caption] : event.captions; }
export function captionEvidence(event: TranscriptionEvent, history: LevelHistory, ownRefDb: number, now: number): CaptionEvidence {
  const captions = eventCaptions(event);
  const startAt = Math.min(...captions.map((c) => c.startedAt)) - LOOKAHEAD_MS;
  const endAt = Math.max(startAt, Math.max(...captions.map((c) => c.endedAt ?? c.audioEndAt ?? now)) - LOOKAHEAD_MS);
  return { ...history.stats(startAt, endAt, ownRefDb), startAt, endAt };
}
export function validEvidence(value: unknown): value is CaptionEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const e = value as CaptionEvidence;
  return (e.relDb === null || typeof e.relDb === "number" && Number.isFinite(e.relDb) && e.relDb >= -100 && e.relDb <= 40)
    && typeof e.openRatio === "number" && Number.isFinite(e.openRatio) && e.openRatio >= 0 && e.openRatio <= 1
    && Number.isFinite(e.startAt) && Number.isFinite(e.endAt) && e.endAt >= e.startAt && e.endAt - e.startAt <= 120000
    && (e.frames === undefined || Number.isInteger(e.frames) && e.frames >= 0 && e.frames <= 600);
}
