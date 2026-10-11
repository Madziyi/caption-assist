export const SILENCE_DB = -100;

export function frameLevelDb(frame: Int16Array): number {
  if (frame.length === 0) return SILENCE_DB;
  let sum = 0;
  for (const sample of frame) sum += sample * sample;
  const rms = Math.sqrt(sum / frame.length);
  if (!Number.isFinite(rms) || rms <= 0) return SILENCE_DB;
  return Math.max(SILENCE_DB, roundDb(20 * Math.log10(rms / 32768)));
}

export function percentile(values: readonly number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((Math.min(100, Math.max(0, p)) / 100) * sorted.length)));
  return sorted[rank - 1] ?? null;
}

export function roundDb(value: number): number {
  return Math.max(-100, Math.min(0, Math.round(value * 10) / 10));
}
