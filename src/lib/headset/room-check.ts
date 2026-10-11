import { percentile, roundDb } from "./levels";
import { separationBand, type SeparationBand } from "./calibration";

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
    if (speaker === this.selfId) {
      if (levelDb >= this.floorDb + 6) values.push(levelDb);
    } else values.push(levelDb);
    this.frames.set(speaker, values);
  }
  result(): Record<string, number | null> {
    return Object.fromEntries(this.plan.order.map((speaker) => {
      const values = this.frames.get(speaker) ?? [];
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
};
export function checkMatrix(order: string[], results: Record<string, Record<string, number | null>>): CheckMatrix {
  const levels = Object.fromEntries(order.map((listener) => [listener, Object.fromEntries(order.map((speaker) => [speaker, results[listener]?.[speaker] ?? null]))]));
  const separationDb: Record<string, number | null> = {};
  const band: Record<string, SeparationBand | null> = {};
  for (const listener of order) {
    const own = levels[listener]?.[listener] ?? null;
    const others = order.filter((speaker) => speaker !== listener).map((speaker) => levels[listener]?.[speaker]).filter((v): v is number => v !== null && Number.isFinite(v));
    const separation = own === null || !others.length ? null : Math.round((own - Math.max(...others)) * 10) / 10;
    separationDb[listener] = separation;
    band[listener] = separationBand(separation);
  }
  return { order: [...order], levels, separationDb, band };
}
export function bleedFromRow(selfId: string, row: Record<string, number | null>): number | null {
  const values = Object.entries(row).filter(([id, value]) => id !== selfId && value !== null).map(([, value]) => value as number);
  return values.length ? Math.max(...values) : null;
}
