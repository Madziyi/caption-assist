import { describe, expect, it, vi } from "vitest";
import { isHeadsetBenchmarkEnabled, normalizedWer, percentile } from "./benchmark";
import { HeadsetBenchmarkSession } from "./benchmark-session";

describe("headset benchmark metrics", () => {
  it("is fully opt-in for guest headset pages", () => {
    expect(isHeadsetBenchmarkEnabled("", "guest")).toBe(false);
    expect(isHeadsetBenchmarkEnabled("?sttBenchmark=0", "guest")).toBe(false);
    expect(isHeadsetBenchmarkEnabled("?sttBenchmark=1", "guest")).toBe(true);
    expect(isHeadsetBenchmarkEnabled("?sttBenchmark=1", "host")).toBe(false);
  });
  it("scores normalized WER and exact entities only for selected references", () => {
    expect(normalizedWer("Meet Jordan at seven", "meet Jordan at 7")).toBeGreaterThan(0);
    expect(normalizedWer("Hello there", "hello there")).toBe(0);
    expect(percentile([1, 2, 3, 4, 5], .5)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5], .9)).toBe(5);
    const changes = vi.fn(); const benchmark = new HeadsetBenchmarkSession(changes, () => 100);
    benchmark.gateOutput(true, 100); benchmark.gateOutput(false, 200);
    expect(benchmark.view.rows[0].reference).toBeNull();
    expect(benchmark.view.rows[0].scores).toBeUndefined();
    benchmark.assemblyEvent({ type: "final_turn", sourceTurnId: "first-turn", captions: [] }, 250);
    benchmark.selectPhrase(3); benchmark.gateOutput(true, 300); benchmark.gateOutput(false, 500);
    benchmark.assemblyEvent({ type: "final_turn", sourceTurnId: "assembly-turn", captions: [{ id: "segment", sourceTurnId: "assembly-turn", text: "My name is Jordan Lee.", speakerId: null, startedAt: 300, isFinal: true, sourceId: "personal" }] }, 600);
    benchmark.openaiDelta("My name is Jordan Lee.", 600);
    expect(benchmark.view.rows[1].reference).toBe("My name is Jordan Lee.");
    expect(benchmark.view.rows[1].scores).toMatchObject({ assemblyWer: 0, openaiWer: 0, assemblyEntities: 1, openaiEntities: 1 });
  });
  it("keeps quick reopen inside one delayed activity episode and bounds memory to 25 utterances", () => {
    const benchmark = new HeadsetBenchmarkSession(() => undefined);
    benchmark.gateOutput(true); benchmark.gateOutput(true); benchmark.gateOutput(false);
    expect(benchmark.view.rows).toHaveLength(1);
    for (let i = 0; i < 30; i++) { benchmark.gateOutput(true); benchmark.gateOutput(false); }
    expect(benchmark.view.rows).toHaveLength(25);
  });
  it("records monotonic provider receipt timings and gate-close-to-final separately", () => {
    const benchmark = new HeadsetBenchmarkSession(() => undefined);
    benchmark.gateOutput(true, 1000);
    benchmark.assemblyEvent({ type: "interim", caption: { id: "i", sourceTurnId: "turn-a", text: "Hello", speakerId: null, startedAt: 0, isFinal: false } }, 1420);
    benchmark.gateOutput(false, 1600);
    benchmark.assemblyEvent({ type: "final_turn", sourceTurnId: "turn-a", captions: [{ id: "f", sourceTurnId: "turn-a", text: "Hello there.", speakerId: null, startedAt: 0, isFinal: true }] }, 1910);
    expect(benchmark.view.rows[0].timings).toMatchObject({ assemblyFirstTextMs: 420, assemblyFinalMs: 910, gateCloseMs: 600, gateCloseToAssemblyFinalMs: 310 });
  });
});
