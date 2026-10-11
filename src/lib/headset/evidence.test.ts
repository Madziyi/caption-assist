import { expect, it } from "vitest";
import { captionEvidence, validEvidence } from "./evidence";
import { LevelHistory } from "./level-history";
import { ClockAlignment, PhoneLatencyStats, validPhoneLatency } from "./latency";
it("stores bounded levels and uses open-only median, all-frame fallback and empty windows", () => {
  const h = new LevelHistory(3); h.push(0, -60, false); h.push(100, -45, false); h.push(200, -25, true); h.push(300, -30, true);
  expect(h.stats(0, 400, -25)).toEqual({ relDb: -5, openRatio: 2 / 3, frames: 3 });
  expect(h.stats(0, 100, -25)).toEqual({ relDb: -20, openRatio: 0, frames: 1 });
  expect(h.stats(500, 600, -25)).toEqual({ relDb: null, openRatio: 0, frames: 0 });
});
it("subtracts the 300 ms look-ahead for both interim and final evidence windows", () => {
  const h = new LevelHistory(); h.push(700, -25, true); h.push(1000, -30, true); h.push(1200, -70, false);
  const caption = { id: "turn", text: "synthetic", speakerId: null, startedAt: 1000, audioEndAt: 1500, isFinal: false };
  expect(captionEvidence({ type: "interim", caption }, h, -25, 2000)).toMatchObject({ startAt: 700, endAt: 1200, relDb: -5, openRatio: 2 / 3 });
  expect(captionEvidence({ type: "final_turn", sourceTurnId: "turn", captions: [{ ...caption, isFinal: true, endedAt: 1400 }] }, h, -25, 2000)).toMatchObject({ startAt: 700, endAt: 1100, frames: 2 });
});
it("validates evidence spans, ranges and optional sample counts", () => {
  const e = { relDb: null, openRatio: 0, startAt: 0, endAt: 120000 };
  expect(validEvidence(e)).toBe(true);
  for (const changes of [{ endAt: 120001 }, { endAt: -1 }, { startAt: NaN }, { relDb: 41 }, { relDb: -101 }, { openRatio: 1.1 }, { frames: 601 }]) expect(validEvidence({ ...e, ...changes })).toBe(false);
});
it("aligns a phone 2 s fast and retains a sliding minimum of the last 50 observations", () => {
  const clock = new ClockAlignment();
  expect(clock.observe("a", 10025, 12000, true)).toBe(-1975);
  expect(clock.observe("a", 10180, 12100, true)).toBe(-1975);
  expect(clock.summary("a")).toMatchObject({ relayExtraP50: 0, relayExtraP90: 55, relaySamples: 2 });
  for (let i = 0; i < 50; i++) clock.observe("a", 11050 + i, 13000 + i);
  expect(clock.offset("a")).toBe(-1950); expect(clock.observe("local", 1000, 1000, true, true)).toBe(0);
});
it("bounds 200 per-stage latency samples and validates summaries", () => {
  const stats = new PhoneLatencyStats(); for (let i = 0; i < 250; i++) stats.push(false, i); stats.push(true, 600);
  const latency = stats.snapshot(); expect(latency.samples).toEqual({ interim: 200, final: 1 }); expect(latency.interimP50).toBe(149);
  expect(validPhoneLatency(latency)).toBe(true); expect(validPhoneLatency({ ...latency, samples: { interim: 201, final: 1 } })).toBe(false);
  const signed = new PhoneLatencyStats(); signed.push(true, -100);
  expect(signed.snapshot().finalP50).toBe(-100); expect(validPhoneLatency(signed.snapshot())).toBe(true);
});
