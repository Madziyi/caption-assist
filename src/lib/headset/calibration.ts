import { percentile, roundDb } from "./levels";

export type HeadsetCalibration = { floorDb: number; ownDb: number };
export type GateThresholds = { openDb: number; closeDb: number };
export type Sensitivity = "lower" | "normal" | "higher";
export type SeparationBand = "clear" | "usable" | "weak";

export function quietFloor(levels: readonly number[]): number {
  return percentile(levels, 50) ?? -100;
}

export function ownVoiceLevel(levels: readonly number[], floorDb: number): { ok: true; ownDb: number } | { ok: false; reason: "too_quiet" | "too_short" } {
  const speech = levels.filter((level) => level >= floorDb + 6);
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

export function applySensitivity(base: GateThresholds, sensitivity: Sensitivity, calibration: HeadsetCalibration): GateThresholds {
  const offset = sensitivity === "lower" ? 4 : sensitivity === "higher" ? -3 : 0;
  const openDb = Math.min(calibration.ownDb - 3, Math.max(calibration.floorDb + 6, base.openDb + offset));
  return { openDb: roundDb(openDb), closeDb: roundDb(openDb - 4) };
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
