import { percentile, roundDb } from "./levels";

export type HeadsetCalibration = { floorDb: number; ownDb: number };
export type GateThresholds = { openDb: number; closeDb: number };
export type Sensitivity = number | "lower" | "normal" | "higher";
export const sensitivityDb = (value: Sensitivity): number => typeof value === "number" ? value : value === "lower" ? -4 : value === "higher" ? 3 : 0;
export const validSensitivity = (value: unknown): value is Sensitivity => typeof value === "number" ? Number.isInteger(value) && value >= -15 && value <= 6 : ["lower", "normal", "higher"].includes(value as string);
export function sensitivityLabel(value: Sensitivity): string {
  const db = sensitivityDb(value);
  return db === 0 ? "Normal" : db < 0 ? `Less sensitive (−${Math.abs(db)} dB)` : `More sensitive (+${db} dB)`;
}
export function speechLevels(levels: readonly number[], floorDb: number): number[] {
  const threshold = Math.max(floorDb + 6, (percentile(levels, 95) ?? -100) - 15);
  return levels.filter((level) => level >= threshold);
}
export type SeparationBand = "clear" | "usable" | "weak";

export function quietFloor(levels: readonly number[]): number {
  return percentile(levels, 50) ?? -100;
}

export function ownVoiceLevel(levels: readonly number[], floorDb: number): { ok: true; ownDb: number } | { ok: false; reason: "too_quiet" | "too_short" } {
  const speech = speechLevels(levels, floorDb);
  if (speech.length < 10) return { ok: false, reason: "too_short" };
  const ownDb = percentile(speech, 50) ?? -100;
  return ownDb - floorDb < 10 ? { ok: false, reason: "too_quiet" } : { ok: true, ownDb: roundDb(ownDb) };
}

export function gateThresholds(calibration: HeadsetCalibration, bleedDb: number | null): GateThresholds {
  const floor = calibration.floorDb + 6;
  const own = bleedDb === null ? calibration.ownDb : calibration.ownDb;
  const openDb = bleedDb === null
    ? Math.max(floor, own - 10)
    : Math.max(floor, bleedDb + 6 <= own - 6 ? bleedDb + 6 : (bleedDb + own) / 2);
  return { openDb: roundDb(openDb), closeDb: roundDb(openDb - 4) };
}

export function applySensitivity(base: GateThresholds, sensitivity: Sensitivity, calibration: HeadsetCalibration, ownRefDb = calibration.ownDb): GateThresholds {
  const openDb = Math.min(ownRefDb + 6, Math.max(calibration.floorDb + 6, base.openDb - sensitivityDb(sensitivity)));
  // Thresholds (unlike PCM levels) may be above 0 dB under the approved ceiling.
  return { openDb: Math.round(openDb * 10) / 10, closeDb: Math.round((openDb - 4) * 10) / 10 };
}

export function plausibleRoomCheckRow(calibration: HeadsetCalibration, own: number | null, bleedDb: number | null): boolean {
  return own !== null && own >= calibration.ownDb - 12 && (bleedDb === null || own - bleedDb > 0);
}

export function separationBand(db: number | null): SeparationBand | null {
  if (db === null || !Number.isFinite(db)) return null;
  if (db >= 15) return "clear";
  if (db >= 8) return "usable";
  return "weak";
}
