import { roundDb } from "./levels";
export type HeadsetPresence = {
  mic: "off" | "starting" | "on" | "stopped" | "denied";
  input: "headset" | "built-in" | "unknown" | null;
  label: string | null;
  processing: { autoGainControl: boolean | null; noiseSuppression: boolean | null; echoCancellation: boolean | null } | null;
  setup: "not_started" | "input" | "quiet" | "voice" | "ready" | "failed";
  floorDb: number | null; ownDb: number | null; visible: boolean;
};
export type HeadsetPresenceUpdate = { sessionId: string; seq: number; presence: HeadsetPresence };
export type HeadsetSignal = { kind: "gate"; seq: number; open: boolean; levelDb: number; openDb: number } | { kind: "check-result"; checkId: string; levels: Record<string, number | null> };
export type HeadsetControl = { type: "headset-check"; checkId: string; order: string[]; slotMs: number; gapMs: number } | { type: "headset-check-cancel"; checkId: string };
export const CHECK_ID = /^[A-Za-z0-9-]{8,64}$/;
const presenceEnums = { mic: ["off", "starting", "on", "stopped", "denied"], input: ["headset", "built-in", "unknown", null], setup: ["not_started", "input", "quiet", "voice", "ready", "failed"] } as const;
const validDb = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= -100 && v <= 0 && roundDb(v) === v);
export function validHeadsetPresence(value: unknown): value is HeadsetPresence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as HeadsetPresence;
  return presenceEnums.mic.includes(p.mic) && presenceEnums.input.includes(p.input) && presenceEnums.setup.includes(p.setup) && (p.label === null || typeof p.label === "string" && p.label.length <= 60) && validDb(p.floorDb) && validDb(p.ownDb) && typeof p.visible === "boolean" && (p.processing === null || (typeof p.processing === "object" && [p.processing.autoGainControl, p.processing.noiseSuppression, p.processing.echoCancellation].every((v) => v === null || typeof v === "boolean")));
}
export function validHeadsetPresenceUpdate(value: unknown): value is HeadsetPresenceUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const update = value as HeadsetPresenceUpdate;
  return typeof update.sessionId === "string" && CHECK_ID.test(update.sessionId)
    && Number.isSafeInteger(update.seq) && update.seq >= 1 && validHeadsetPresence(update.presence);
}
export function validHeadsetSignal(value: unknown): value is HeadsetSignal {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as HeadsetSignal;
  if (s.kind === "gate") return Number.isSafeInteger(s.seq) && s.seq >= 1 && typeof s.open === "boolean" && validDb(s.levelDb) && validDb(s.openDb);
  if (s.kind === "check-result") return CHECK_ID.test(s.checkId) && typeof s.levels === "object" && s.levels !== null && !Array.isArray(s.levels) && Object.keys(s.levels).length <= 12 && Object.entries(s.levels).every(([id, level]) => id.length < 100 && validDb(level));
  return false;
}
export function validHeadsetControl(value: unknown): value is HeadsetControl {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as HeadsetControl;
  if (c.type === "headset-check-cancel") return CHECK_ID.test(c.checkId);
  return c.type === "headset-check" && CHECK_ID.test(c.checkId) && Array.isArray(c.order) && c.order.length >= 2 && c.order.length <= 12 && c.order.every((id) => typeof id === "string" && id.length > 0 && id.length < 100) && Number.isFinite(c.slotMs) && c.slotMs >= 3000 && c.slotMs <= 10000 && Number.isFinite(c.gapMs) && c.gapMs >= 500 && c.gapMs <= 3000;
}
