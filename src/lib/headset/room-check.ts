import { percentile, roundDb } from "./levels";
import { plausibleRoomCheckRow, separationBand, speechLevels, type HeadsetCalibration, type SeparationBand } from "./calibration";

export type RoomCheckPlan = { order: string[]; slotMs: number; gapMs: number };
export type RoomCheckSlot = { index: number; phase: "gap" | "reading"; measuring: boolean } | null;
export function checkDurationMs(plan: RoomCheckPlan) { return plan.order.length * (plan.slotMs + plan.gapMs); }
export function slotAt(plan: RoomCheckPlan, elapsedMs: number): RoomCheckSlot {
  if (elapsedMs < 0 || elapsedMs >= checkDurationMs(plan)) return null;
  const cycle = plan.slotMs + plan.gapMs;
  const index = Math.floor(elapsedMs / cycle);
  const within = elapsedMs - index * cycle;
  if (within < plan.gapMs) return { index, phase: "gap", measuring: false };
  return { index, phase: "reading", measuring: within >= plan.gapMs + 750 && within < cycle - 250 };
}

export class RoomCheckRecorder {
  private readonly frames = new Map<string, number[]>();
  constructor(private readonly plan: RoomCheckPlan, private readonly selfId: string, private readonly floorDb: number) {}
  push(levelDb: number, elapsedMs: number) {
    const slot = slotAt(this.plan, elapsedMs);
    if (!slot?.measuring) return;
    const speaker = this.plan.order[slot.index];
    if (!speaker) return;
    const values = this.frames.get(speaker) ?? [];
    values.push(levelDb);
    this.frames.set(speaker, values);
  }
  result(): Record<string, number | null> {
    return Object.fromEntries(this.plan.order.map((speaker) => {
      const all = this.frames.get(speaker) ?? [];
      const values = speaker === this.selfId ? speechLevels(all, this.floorDb) : all;
      const value = speaker === this.selfId ? (values.length < 5 ? null : percentile(values, 50)) : percentile(values, 90);
      return [speaker, value === null ? null : roundDb(value)];
    }));
  }
}

export type CheckMatrix = {
  order: string[];
  levels: Record<string, Record<string, number | null>>;
  separationDb: Record<string, number | null>;
  band: Record<string, SeparationBand | null>;
  applied: Record<string, boolean>;
};
export function checkMatrix(order: string[], results: Record<string, Record<string, number | null>>, calibrations: Record<string, HeadsetCalibration | null> = {}): CheckMatrix {
  const levels = Object.fromEntries(order.map((listener) => [listener, Object.fromEntries(order.map((speaker) => [speaker, results[listener]?.[speaker] ?? null]))]));
  const separationDb: Record<string, number | null> = {};
  const band: Record<string, SeparationBand | null> = {};
  const applied: Record<string, boolean> = {};
  for (const listener of order) {
    const own = levels[listener]?.[listener] ?? null;
    const others = order.filter((speaker) => speaker !== listener).map((speaker) => levels[listener]?.[speaker]).filter((v): v is number => v !== null && Number.isFinite(v));
    const separation = own === null || !others.length ? null : Math.round((own - Math.max(...others)) * 10) / 10;
    separationDb[listener] = separation;
    band[listener] = separationBand(separation);
    applied[listener] = plausibleRoomCheckRow(calibrations[listener] ?? { floorDb: -100, ownDb: -100 }, own, others.length ? Math.max(...others) : null);
  }
  return { order: [...order], levels, separationDb, band, applied };
}
export function bleedFromRow(selfId: string, row: Record<string, number | null>): number | null {
  const values = Object.entries(row).filter(([id, value]) => id !== selfId && value !== null).map(([, value]) => value as number);
  return values.length ? Math.max(...values) : null;
}
