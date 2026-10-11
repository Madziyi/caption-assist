import { separationBand, sensitivityDb, type SeparationBand } from "./calibration";
import type { HeadsetPresence } from "./messages";
import type { CheckMatrix } from "./room-check";
import { ARBITER, emptyCaptionCounts, type ArbitrationStats } from "./arbiter";
import { LOOKAHEAD_MS } from "./gated-audio";
import { INTERIM_THROTTLE_MS } from "./relay-constants";
import { PhoneLatencyStats, type RelayLatency } from "./latency";
export const HEADSET_CONSTANTS = { gapMs: 1500, slotMs: 6000, bleedPercentile: 90, openAboveBleedDb: 6, openBelowOwnDb: 6, closeHysteresisDb: 4, holdMs: 600, bands: { clear: 15, usable: 8 }, ARBITER, lookaheadMs: LOOKAHEAD_MS, interimThrottleMs: INTERIM_THROTTLE_MS } as const;
type ExportParticipant = { id: string; role: "host" | "participant"; presence: HeadsetPresence | null };
export type HeadsetExportInput = { participants: ExportParticipant[]; check: { order: string[]; matrix: CheckMatrix | null } | null; arbitration?: ArbitrationStats; relayLatency?: Record<string, RelayLatency>; preview: { durationMs: number; participants: Record<string, { opens: number; openMs: number }>; pairs: Array<{ a: string; b: string; coOnsets: number; overlapMs: number }> } };
export function headsetResultsExport(input: HeadsetExportInput): string {
  const ref = new Map(input.participants.map((p, i) => [p.id, `P${i + 1}`]));
  const p = input.participants.map((participant, i) => { const v = participant.presence; return { ref: `P${i + 1}`, role: participant.role, input: v?.input ?? null, label: v?.label?.replace(/^[^'’]{1,30}['’]s\s+/u, "") ?? null, processing: v?.processing ?? null, setup: v?.setup ?? "not_started", visible: v?.visible ?? false, floorDb: v?.floorDb ?? null, ownDb: v?.ownDb ?? null, sensitivityDb: v?.sensitivityDb ?? sensitivityDb(v?.sensitivity ?? 0), tuned: v?.tuned ?? false, openDb: v?.openDb ?? null, stt: v?.stt ?? "off", micDrops: v?.micDrops ?? 0, latency: { ...(v?.latency ?? new PhoneLatencyStats().snapshot()), ...(input.relayLatency?.[participant.id] ?? { relayExtraP50: null, relayExtraP90: null, relaySamples: 0 }) }, captions: input.arbitration?.participants[participant.id] ?? emptyCaptionCounts() }; });
  const levels: Record<string, Record<string, number | null>> = {}; const separationDb: Record<string, number | null> = {}; const band: Record<string, SeparationBand | null> = {}; const applied: Record<string, boolean> = {};
  if (input.check?.matrix) for (const id of input.check.matrix.order) { const r = ref.get(id); if (!r) continue; levels[r] = {}; for (const speaker of input.check.matrix.order) levels[r][ref.get(speaker) ?? ""] = input.check.matrix.levels[id]?.[speaker] ?? null; separationDb[r] = input.check.matrix.separationDb[id] ?? null; band[r] = input.check.matrix.band[id] ?? separationBand(separationDb[r]); applied[r] = input.participants.find((p) => p.id === id)?.presence?.tuned ?? false; }
  const pairMap = new Map<string, { a: string; b: string; coOnsets: number; overlapMs: number; duplicatesHidden: number }>();
  const getPair = (a: string, b: string) => {
    const [first, second] = [ref.get(a), ref.get(b)].sort(); if (!first || !second) return null;
    const key = first + ":" + second; const pair = pairMap.get(key) ?? { a: first, b: second, coOnsets: 0, overlapMs: 0, duplicatesHidden: 0 }; pairMap.set(key, pair); return pair;
  };
  for (const pair of input.preview.pairs) { const out = getPair(pair.a, pair.b); if (out) { out.coOnsets = pair.coOnsets; out.overlapMs = pair.overlapMs; } }
  for (const pair of input.arbitration?.pairs ?? []) { const out = getPair(pair.a, pair.b); if (out) out.duplicatesHidden = pair.duplicatesHidden; }
  const pairs = [...pairMap.values()];
  return JSON.stringify({ kind: "caption-assist-headset-check", version: 3, capturedOn: new Date().toISOString().slice(0, 10), constants: HEADSET_CONSTANTS, participants: p, check: input.check ? { order: input.check.order.map((id) => ref.get(id) ?? ""), levels, separationDb, band, applied } : null, preview: { durationMs: input.preview.durationMs, participants: Object.fromEntries(Object.entries(input.preview.participants).filter(([id]) => ref.has(id)).map(([id, stats]) => [ref.get(id) ?? "", stats])), pairs } }, null, 2);
}
