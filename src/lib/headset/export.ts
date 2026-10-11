import { separationBand, type SeparationBand } from "./calibration";
import type { HeadsetPresence } from "./messages";
import type { CheckMatrix } from "./room-check";
export const HEADSET_CONSTANTS = { gapMs: 1500, slotMs: 6000, bleedPercentile: 90, openAboveBleedDb: 6, openBelowOwnDb: 6, closeHysteresisDb: 4, holdMs: 600, bands: { clear: 15, usable: 8 } } as const;
type ExportParticipant = { id: string; role: "host" | "participant"; presence: HeadsetPresence | null };
export type HeadsetExportInput = { participants: ExportParticipant[]; check: { order: string[]; matrix: CheckMatrix | null } | null; preview: { durationMs: number; participants: Record<string, { opens: number; openMs: number }>; pairs: Array<{ a: string; b: string; coOnsets: number; overlapMs: number }> } };
export function headsetResultsExport(input: HeadsetExportInput): string {
  const ref = new Map(input.participants.map((p, i) => [p.id, `P${i + 1}`]));
  const p = input.participants.map((participant, i) => { const v = participant.presence; return { ref: `P${i + 1}`, role: participant.role, input: v?.input ?? null, label: v?.label?.replace(/^[^'’]{1,30}['’]s\s+/u, "") ?? null, processing: v?.processing ?? null, setup: v?.setup ?? "not_started", visible: v?.visible ?? false, floorDb: v?.floorDb ?? null, ownDb: v?.ownDb ?? null, sensitivity: v?.sensitivity ?? "normal", openDb: v?.openDb ?? null, stt: v?.stt ?? "off", micDrops: v?.micDrops ?? 0 }; });
  const levels: Record<string, Record<string, number | null>> = {}; const separationDb: Record<string, number | null> = {}; const band: Record<string, SeparationBand | null> = {}; const applied: Record<string, boolean> = {};
  if (input.check?.matrix) for (const id of input.check.matrix.order) { const r = ref.get(id); if (!r) continue; levels[r] = {}; for (const speaker of input.check.matrix.order) levels[r][ref.get(speaker) ?? ""] = input.check.matrix.levels[id]?.[speaker] ?? null; separationDb[r] = input.check.matrix.separationDb[id] ?? null; band[r] = input.check.matrix.band[id] ?? separationBand(separationDb[r]); applied[r] = input.check.matrix.applied[id] ?? false; }
  const pairs = input.preview.pairs.map((pair) => ({ a: ref.get(pair.a) ?? "", b: ref.get(pair.b) ?? "", coOnsets: pair.coOnsets, overlapMs: pair.overlapMs }));
  return JSON.stringify({ kind: "caption-assist-headset-check", version: 2, capturedOn: new Date().toISOString().slice(0, 10), constants: HEADSET_CONSTANTS, participants: p, check: input.check ? { order: input.check.order.map((id) => ref.get(id) ?? ""), levels, separationDb, band, applied } : null, preview: { durationMs: input.preview.durationMs, participants: Object.fromEntries(Object.entries(input.preview.participants).map(([id, stats]) => [ref.get(id) ?? "", stats])), pairs } }, null, 2);
}
