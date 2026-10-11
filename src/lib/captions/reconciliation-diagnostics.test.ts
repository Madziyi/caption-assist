import { describe, expect, it, vi } from "vitest";
import { CROSS_MIC, CrossMicReconciler } from "./cross-mic-reconciler";
import { DIAGNOSTIC_LIMIT } from "./reconciliation-diagnostics";
import type { TranscriptionEvent } from "./types";

const text = "We should leave around seven.";
function event(source: string, turn = "1", words = text, final = true): TranscriptionEvent {
  const caption = { id: `${source}/${turn}`, sourceId: source, sourceTurnId: `${source}/${turn}`, speakerId: source, text: words, startedAt: 999999, isFinal: final };
  return final ? { type: "final_turn", sourceTurnId: caption.sourceTurnId, captions: [caption] } : { type: "interim", caption };
}
function fixture(enabled = true) {
  let now = 0; const clock = vi.fn(() => now); const r = new CrossMicReconciler(clock); r.setDiagnosticsEnabled(enabled);
  return { r, clock, at(value: number) { now = value; }, send(source: string, words = text, final = true, turn = "1") {
    const actions = r.process(source, event(source, turn, words, final)); r.flushDiagnostics(); return actions;
  }, get last() { return r.diagnosticRecords.at(-1)!; } };
}
describe("opt-in observation-only reconciliation diagnostics", () => {
  it("is disabled by default", () => {
    const r = new CrossMicReconciler(() => 0);
    r.process("a", event("a")); r.process("b", event("b")); r.flushDiagnostics();
    expect(r.diagnosticRecords).toEqual([]);
  });
  it("records successful duplicate suppression with actual metrics and constants", () => {
    const f = fixture(); f.send("a"); f.at(274); f.send("b");
    expect(f.last).toMatchObject({ at: 274, sourceA: "b", sourceB: "a", eventA: "final", eventB: "final", wordCountA: 5, wordCountB: 5,
      receiveDeltaMs: 274, similarity: 1, containmentScore: 1, matched: true, decision: "suppressed", reason: "matched", windowMs: 1800, similarityThreshold: .85 });
    expect(f.clock).toHaveBeenCalledTimes(2);
  });
  it("records a strong episode and negation override with directional coverage", () => {
    const f = fixture(); const a = `we should not leave ${"soon ".repeat(48)}`; const b = `we should leave ${"soon ".repeat(50)}`;
    f.send("a", a); f.at(13); f.send("b", b);
    expect(f.last).toMatchObject({ matched: true, episodeEvent: "negation_override_strong_match", episodeAgeMs: 13 });
    expect(f.last.shortSideCoverage).toBeGreaterThanOrEqual(.9);
  });
  it("records episode continuation after a provider turn changes", () => {
    const f = fixture(); const a = `we should not leave ${"soon ".repeat(48)}`; const b = `we should leave ${"soon ".repeat(50)}`;
    f.send("a", a); f.send("b", b); f.at(1200); f.send("b", "we should leave around soon soon soon soon soon soon soon soon soon soon", true, "2");
    expect(f.r.diagnosticRecords.some(row => row.episodeEvent === "suppressed_duplicate")).toBe(true);
  });
  it("records clustered partials", () => {
    const f = fixture(); f.send("a", text, false); f.send("b", text, false);
    expect(f.last).toMatchObject({ eventA: "interim", eventB: "interim", decision: "clustered", reason: "matched" });
  });
  it("exposes the existing two-committed-finals skip without merging history", () => {
    const f = fixture(); f.send("a"); f.send("b", "Did anybody call Michael?");
    const actions = f.send("b");
    expect(f.last).toMatchObject({ reason: "other", skippedGate: "both_finals_committed", decision: "kept", matched: false, similarity: 1 });
    expect(actions.some(action => action.type === "TRANSCRIPTION_EVENT")).toBe(true);
    expect(f.r.diagnostics.clusters).toBe(2);
  });
  it("records outside-time-window with independently observed similarity", () => {
    const f = fixture(); f.send("a"); f.at(2740); f.send("b");
    expect(f.last).toMatchObject({ receiveDeltaMs: 2740, similarity: 1, matched: false, decision: "kept", reason: "outside_time_window" });
  });
  it("records ordered similarity and length gate failures", () => {
    const f = fixture(); f.send("a"); f.send("b", "Did anybody call Michael?");
    expect(f.last.reason).toBe("similarity_below_threshold"); expect(f.last.similarity).toBe(0);
    f.send("c", "We should leave around seven after the next movie tonight");
    expect(f.r.diagnosticRecords.some(row => row.reason === "similarity_below_threshold" && row.containmentScore! < .85)).toBe(true);
  });
  it("records intentionally preserved short captions and exact three-word comparison", () => {
    const f = fixture(); f.send("a", "Yes"); f.send("b", "Yes");
    expect(f.last).toMatchObject({ reason: "short_utterance", decision: "kept", wordCountA: 1, matched: false });
    f.r.reset(); f.send("a", "That sounds good"); f.at(300); f.send("b", "That sounds good");
    expect(f.last).toMatchObject({ exactMatch: true, windowMs: 600, matched: true });
  });
  it.each([["We should not leave around seven", "negation_conflict"], ["We should leave around eight", "numeral_conflict"]])("records the guard for %s", (words, reason) => {
    const f = fixture(); f.send("a"); f.send("b", words); expect(f.last.reason).toBe(reason);
  });
  it("records oversized comparisons without computing oversized token similarity", () => {
    const f = fixture(); f.send("a"); f.send("b", "word ".repeat(CROSS_MIC.maxTokens + 1));
    expect(f.last).toMatchObject({ reason: "oversized", similarityEvaluated: false, matched: false });
  });
  it("exposes a metadata-only expired committed-cluster hint", () => {
    const f = fixture(); f.send("a"); f.at(CROSS_MIC.inactiveMs + 1); f.send("b");
    expect(f.last).toMatchObject({ sourceA: "b", sourceB: "a", reason: "cluster_expired", similarityEvaluated: false, matched: false });
  });
  it("keeps history bounded, detached and free of text/tokens/turn IDs", () => {
    const f = fixture(); f.send("a");
    for (let i = 0; i < 50; i++) f.send(`source-${i}`);
    expect(f.r.diagnosticRecords).toHaveLength(DIAGNOSTIC_LIMIT);
    const serialized = JSON.stringify(f.r.diagnosticRecords);
    expect(serialized).not.toContain(text); expect(serialized).not.toMatch(/tokens|caption|sourceTurnId|\/1|secret|joinUrl/i);
    const rows = f.r.diagnosticRecords; rows[0].sourceA = "changed";
    expect(f.r.diagnosticRecords[0].sourceA).not.toBe("changed");
    f.r.clearDiagnostics(); expect(f.r.diagnosticRecords).toEqual([]);
  });
  it("does not change actions, receive-clock calls, state or constants when enabled or cleared", () => {
    const plain = fixture(false); const debug = fixture(true);
    const sequence: [string, string, boolean, string][] = [["a", text, false, "1"], ["b", text, false, "1"], ["a", text, true, "1"],
      ["b", text, true, "1"], ["c", "Did anybody call Michael?", true, "1"], ["a", text, true, "2"]];
    for (const [source, words, final, turn] of sequence) {
      expect(debug.send(source, words, final, turn)).toEqual(plain.send(source, words, final, turn));
      expect(debug.r.diagnostics).toEqual(plain.r.diagnostics); debug.r.clearDiagnostics();
    }
    expect(debug.clock.mock.calls).toEqual(plain.clock.mock.calls);
    expect(CROSS_MIC).toMatchObject({ windowMs: 1800, threeWordWindowMs: 600, similarity: .85, confidenceMargin: .15, inactiveMs: 4000, maxLifetimeMs: 15000, maxTurns: 128, maxTokens: 256,
      strongMinWords: 8, strongWindowMs: 300, strongSimilarity: .85, strongCoverage: .9, continuationWindowMs: 3000, continuationMinWords: 5,
      continuationSimilarity: .25, continuationCoverage: .7 });
  });
});
