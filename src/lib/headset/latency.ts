import { percentile } from "./levels";
export type PhoneLatency = { interimP50: number | null; interimP90: number | null; finalP50: number | null; finalP90: number | null; samples: { interim: number; final: number } };
export type RelayLatency = { relayExtraP50: number | null; relayExtraP90: number | null; relaySamples: number };
export class PhoneLatencyStats {
  private interim: number[] = []; private final: number[] = [];
  push(final: boolean, delayMs: number) {
    // Preserve the specified signed subtraction: provider word endpoints can
    // slightly lead receipt time. Dropping those samples biases the measurement.
    if (!Number.isFinite(delayMs) || Math.abs(delayMs) > 120000) return;
    const values = final ? this.final : this.interim; values.push(delayMs); if (values.length > 200) values.shift();
  }
  snapshot(): PhoneLatency { return { interimP50: percentile(this.interim, 50), interimP90: percentile(this.interim, 90), finalP50: percentile(this.final, 50), finalP90: percentile(this.final, 90), samples: { interim: this.interim.length, final: this.final.length } }; }
}
export class ClockAlignment {
  private samples = new Map<string, number[]>(); private delays = new Map<string, number[]>();
  observe(id: string, receivedAt: number, sentAt: number, caption = false, local = false): number {
    const values = this.samples.get(id) ?? [];
    if (Number.isFinite(receivedAt) && Number.isFinite(sentAt)) { values.push(receivedAt - sentAt); if (values.length > 50) values.shift(); this.samples.set(id, values); }
    const offset = local ? 0 : values.length ? Math.min(...values) : 0;
    if (caption) { const delays = this.delays.get(id) ?? []; delays.push(Math.max(0, receivedAt - sentAt - offset)); if (delays.length > 200) delays.shift(); this.delays.set(id, delays); }
    return offset;
  }
  offset(id: string) { const values = this.samples.get(id) ?? []; return values.length ? Math.min(...values) : 0; }
  summary(id: string): RelayLatency { const values = this.delays.get(id) ?? []; return { relayExtraP50: percentile(values, 50), relayExtraP90: percentile(values, 90), relaySamples: values.length }; }
  remove(id: string) { this.samples.delete(id); this.delays.delete(id); }
  reset() { this.samples.clear(); this.delays.clear(); }
}
export function validPhoneLatency(value: unknown): value is PhoneLatency {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const latency = value as PhoneLatency;
  return [latency.interimP50, latency.interimP90, latency.finalP50, latency.finalP90].every((v) => v === null || typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 120000)
    && !!latency.samples && [latency.samples.interim, latency.samples.final].every((v) => Number.isInteger(v) && v >= 0 && v <= 200);
}
