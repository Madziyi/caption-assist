import { describe, expect, it } from "vitest";
import { CROSS_MIC, CrossMicReconciler, comparisonTokens, shortSideCoverage, tokenSimilarity } from "./cross-mic-reconciler";
import { captionReducer, initialCaptionState } from "./reducer";
import type { TranscriptionEvent } from "./types";

const phrase = "We should leave around seven.";
function event(source: string, turn: string, text = phrase, final = false, recognitionConfidence?: number): TranscriptionEvent {
  const caption = { id: `${source}/${turn}`, sourceTurnId: `${source}/${turn}`, sourceId: source, speakerId: source,
    text, startedAt: source === "participant:a" ? 999999999 : -5000, isFinal: final, recognitionConfidence };
  return final ? { type: "final_turn", sourceTurnId: caption.sourceTurnId, captions: [caption] } : { type: "interim", caption };
}
function fixture() {
  let now = 0; let state = { ...initialCaptionState };
  const reconciler = new CrossMicReconciler(() => now);
  return { reconciler, get state() { return state; }, advance(ms: number) { now += ms; },
    send(source: string, turn: string, text = phrase, final = false, confidence?: number) {
      const actions = reconciler.process(`participant:${source}`, event(`participant:${source}`, turn, text, final, confidence));
      for (const action of actions) state = captionReducer(state, action);
      return actions;
    } };
}

describe("comparison-only normalization and similarity", () => {
  it.each(["WE SHOULD LEAVE AROUND SEVEN", "We, should leave around seven!", "  We\tshould\nleave   around seven. ", "Ｗｅ should leave around seven", "We should leave around 7."])("normalizes %s without changing displayed text", (text) => {
    expect(comparisonTokens(text)).toEqual(comparisonTokens(phrase));
  });
  it.each([
    ["We should probably leave around seven.", phrase],
    ["I'll see you tomorrow morning.", "I will see you tomorrow morning."],
  ])("matches an obvious near-duplicate", (a, b) => {
    expect(tokenSimilarity(comparisonTokens(a), comparisonTokens(b))).toBeGreaterThanOrEqual(CROSS_MIC.similarity);
  });
  it("rejects unrelated speech and insufficient partial containment", () => {
    expect(tokenSimilarity(comparisonTokens(phrase), comparisonTokens("Did anybody call Michael?"))).toBeLessThan(CROSS_MIC.similarity);
    expect(tokenSimilarity(comparisonTokens("We should leave around"), comparisonTokens("We should leave around seven after dinner"))).toBeLessThan(CROSS_MIC.similarity);
  });
  it("is sensitive to word order and preserves repeated tokens", () => {
    expect(tokenSimilarity(comparisonTokens("you said I should go"), comparisonTokens("I said you should go"))).toBeLessThan(CROSS_MIC.similarity);
    expect(comparisonTokens("yes yes")).toEqual(["yes", "yes"]);
  });
});

describe("immediate cross-microphone reconciliation", () => {
  it("establishes a strong speech episode despite one isolated negation disagreement", () => {
    const f = fixture();
    const long = `we should not leave ${"soon ".repeat(48)}`;
    const revised = `we should leave ${"soon ".repeat(50)}`;
    expect(comparisonTokens(long).length).toBeGreaterThanOrEqual(CROSS_MIC.strongMinWords);
    expect(tokenSimilarity(comparisonTokens(long), comparisonTokens(revised))).toBeGreaterThanOrEqual(CROSS_MIC.strongSimilarity);
    expect(shortSideCoverage(comparisonTokens(long), comparisonTokens(revised))).toBeGreaterThanOrEqual(CROSS_MIC.strongCoverage);
    f.send("a", "1", long, true); f.advance(13); f.send("b", "1", revised, true);
    expect(f.state.finalized).toHaveLength(1);
  });
  it("keeps a committed episode through a later provider segmentation revision", () => {
    const f = fixture();
    const long = `we should not leave ${"soon ".repeat(48)}`;
    const revised = `we should leave ${"soon ".repeat(50)}`;
    f.send("a", "1", long, true); f.send("b", "1", revised, true);
    f.advance(1200); f.send("b", "2", "we should leave around soon soon soon soon soon soon soon soon soon soon", true);
    expect(f.state.finalized).toHaveLength(1);
  });
  it("suppresses several shorter provider turns within one established episode", () => {
    const f = fixture();
    const long = `we should not leave ${"soon ".repeat(48)}`;
    const revised = `we should leave ${"soon ".repeat(50)}`;
    f.send("a", "1", long, true); f.send("b", "1", revised, true);
    f.advance(500); f.send("b", "2", "we should leave around soon soon soon soon soon", true);
    f.advance(500); f.send("b", "3", "soon soon soon soon soon soon soon", true);
    expect(f.state.finalized).toHaveLength(1);
  });
  it("expires an episode before later independent speech", () => {
    const f = fixture();
    const long = `we should not leave ${"soon ".repeat(48)}`;
    const revised = `we should leave ${"soon ".repeat(50)}`;
    f.send("a", "1", long, true); f.send("b", "1", revised, true);
    f.advance(CROSS_MIC.inactiveMs + 1);
    f.send("a", "2", "Did anybody call Michael?", true); f.send("b", "2", "Did Michael send report?", true);
    expect(f.state.finalized).toHaveLength(3);
  });
  it("displays the first final immediately and suppresses the second final using host time", () => {
    const f = fixture(); f.send("a", "1", phrase, true);
    expect(f.state.finalized).toHaveLength(1); expect(f.state.finalized[0].text).toBe(phrase);
    f.advance(200); f.send("b", "1", "we should leave around 7", true);
    expect(f.state.finalized).toHaveLength(1); expect(f.state.finalized[0].speakerId).toBe("participant:a");
  });
  it("suppresses near-identical longer final wording", () => {
    const f = fixture(); f.send("a", "1", "We should probably leave around seven.", true);
    f.send("b", "1", phrase, true); expect(f.state.finalized).toHaveLength(1);
  });
  it("keeps one duplicate interim and two unrelated interims", () => {
    const f = fixture(); f.send("a", "1", "We should leave around");
    f.send("b", "1", "we should leave around");
    expect(Object.keys(f.state.activeInterims)).toEqual(["participant:a"]);
    f.send("c", "1", "Did anybody call Michael?");
    expect(Object.keys(f.state.activeInterims)).toEqual(["participant:a", "participant:c"]);
  });
  it("merges initially independent partials once they grow to sufficient evidence", () => {
    const f = fixture(); f.send("a", "1", "We should"); f.send("b", "1", "We should leave");
    expect(Object.keys(f.state.activeInterims)).toHaveLength(2);
    f.send("a", "1", phrase); f.send("b", "1", phrase);
    expect(Object.keys(f.state.activeInterims)).toEqual(["participant:a"]);
  });
  it.each(["Yes", "No", "Okay", "Thank you", "I'm sorry", "Don't know"])("preserves independent short acknowledgements: %s", (text) => {
    const f = fixture(); f.send("a", "1", text, true); f.send("b", "1", text, true);
    expect(f.state.finalized).toHaveLength(2);
  });
  it("requires exact three-word text and a tighter receive window", () => {
    const f = fixture(); f.send("a", "1", "That sounds good", true); f.advance(400);
    f.send("b", "1", "That sounds good!", true); expect(f.state.finalized).toHaveLength(1);
    f.send("c", "1", "That looks good", true); expect(f.state.finalized).toHaveLength(2);
    f.advance(601); f.send("d", "1", "That sounds good", true); expect(f.state.finalized).toHaveLength(3);
  });
  it("never suppresses a new turn from the same source, including an existing multi-source cluster", () => {
    const f = fixture(); f.send("a", "1", phrase, true); f.send("b", "1", phrase, true);
    f.send("a", "2", phrase, true); expect(f.state.finalized).toHaveLength(2);
    f.send("a", "3", "yes, yes", true); expect(f.state.finalized).toHaveLength(3);
  });
  it("clusters three microphones, including You, into one interim and final", () => {
    const f = fixture(); f.send("a", "1"); f.send("you", "1"); f.send("c", "1");
    expect(Object.keys(f.state.activeInterims)).toEqual(["participant:a"]);
    f.send("a", "1", phrase, true); f.send("you", "1", phrase, true); f.send("c", "1", phrase, true);
    expect(f.state.finalized).toHaveLength(1); expect(f.state.activeInterims).toEqual({});
  });
  it("clears follower finals but leaves unrelated interims alone", () => {
    const f = fixture(); f.send("a", "1"); f.send("b", "1"); f.send("c", "1", "Did anybody call Michael?");
    f.send("a", "1", phrase, true); f.send("b", "1", phrase, true);
    expect(f.state.finalized).toHaveLength(1); expect(Object.keys(f.state.activeInterims)).toEqual(["participant:c"]);
  });
  it("does not clear a source's new unrelated interim when its older duplicate final arrives", () => {
    const f = fixture(); f.send("a", "1", phrase, true); f.send("b", "1");
    f.send("b", "2", "Did anybody call Michael?"); f.send("b", "1", phrase, true);
    expect(f.state.activeInterims["participant:b"].text).toBe("Did anybody call Michael?");
  });
  it("keeps small confidence differences stable and can choose a clearly stronger interim", () => {
    const f = fixture(); f.send("a", "1", phrase, false, .84); f.send("b", "1", phrase, false, .85);
    expect(Object.keys(f.state.activeInterims)).toEqual(["participant:a"]);
    f.send("b", "1", phrase, false, 1);
    expect(Object.keys(f.state.activeInterims)).toEqual(["participant:b"]);
  });
  it("confidence alone never merges unrelated speech, and missing confidence is safe", () => {
    const f = fixture(); f.send("a", "1"); f.send("b", "1", "Did anybody call Michael?", false, .99);
    expect(Object.keys(f.state.activeInterims)).toHaveLength(2);
    f.send("c", "1", phrase, false, .99); expect(Object.keys(f.state.activeInterims)).toEqual(["participant:a", "participant:b"]);
  });
  it("commits a follower's first final immediately with the selected leader, preserving mic provenance", () => {
    const f = fixture(); f.send("a", "1", phrase, false, .91); f.send("b", "1", phrase, false, .71);
    f.send("b", "1", phrase, true, .71);
    expect(f.state.finalized[0]).toMatchObject({ text: phrase, speakerId: "participant:a", sourceId: "participant:b" });
    f.send("a", "1", phrase, true, .99); expect(f.state.finalized).toHaveLength(1);
  });
  it("freezes final speaker selection despite later higher confidence and revisions", () => {
    const f = fixture(); f.send("a", "1", phrase, true, .71); f.send("b", "1", phrase, true, .99);
    const revision = event("participant:b", "1", phrase, true, 1);
    if (revision.type === "interim") throw new Error("Expected final");
    const actions = f.reconciler.process("participant:b", { ...revision, type: "speaker_revision" });
    expect(actions.filter(a => a.type === "TRANSCRIPTION_EVENT")).toHaveLength(0);
    expect(f.state.finalized[0].speakerId).toBe("participant:a");
  });
  it("splits a formerly matching prefix when the streams later diverge", () => {
    const f = fixture(); f.send("a", "1", "We should leave around"); f.send("b", "1", "We should leave around");
    f.send("a", "1", "We should leave around seven before the movie", true);
    f.send("b", "1", "We should leave around noon after lunch", true);
    expect(f.state.finalized).toHaveLength(2);
  });
  it("does not deduplicate outside the receive window or after reset", () => {
    const f = fixture(); f.send("a", "1", phrase, true); f.advance(CROSS_MIC.windowMs + 1);
    f.send("b", "1", phrase, true); expect(f.state.finalized).toHaveLength(2);
    f.reconciler.reset(); f.send("c", "1", phrase, true); expect(f.state.finalized).toHaveLength(3);
  });
  it("expires inactive clusters and bounds turn storage", () => {
    const f = fixture(); f.send("a", "1"); f.advance(CROSS_MIC.inactiveMs + 1); f.reconciler.prune();
    expect(f.reconciler.diagnostics).toEqual({ clusters: 0, turns: 0 });
    f.send("b", "1");
    expect(Object.keys(f.state.activeInterims)).toHaveLength(2);
    for (let i = 0; i < CROSS_MIC.maxTurns + 2; i++) f.send("single", `${i}`, "Yes", true);
    expect(f.reconciler.diagnostics.turns).toBeLessThanOrEqual(CROSS_MIC.maxTurns);
    expect(f.reconciler.process("participant:a", event("participant:a", "new", phrase, true)).some(a => a.type === "TRANSCRIPTION_EVENT")).toBe(true);
  });
  it("preserves unrelated overlapping finals", () => {
    const f = fixture(); f.send("a", "1", phrase, true); f.send("b", "1", "Did anybody call Michael?", true);
    expect(f.state.finalized).toHaveLength(2);
  });
  it("does not resurrect an interim from a removed source", () => {
    const f = fixture(); f.send("a", "1"); f.send("b", "1");
    f.reconciler.discardSource("participant:a");
    const actions = f.send("b", "1");
    expect(actions.filter(a => a.type === "TRANSCRIPTION_EVENT")).toEqual([{ type: "TRANSCRIPTION_EVENT", event: event("participant:b", "1") }]);
  });
  it("keeps finalized attribution on accepted-source revisions after cache expiry", () => {
    const f = fixture(); f.send("a", "1", phrase, false, .91); f.send("b", "1", phrase, true, .71);
    expect(f.state.finalized[0].speakerId).toBe("participant:a");
    f.advance(CROSS_MIC.inactiveMs + 1); f.send("b", "1", phrase, true, .99);
    expect(f.state.finalized).toHaveLength(1); expect(f.state.finalized[0].speakerId).toBe("participant:a");
  });
  it("retains a known follower through a delayed final without extending the admission window", () => {
    const f = fixture(); f.send("a", "1"); f.send("b", "1"); f.send("a", "1", phrase, true);
    f.advance(2000); f.send("b", "1", phrase, true);
    expect(f.state.finalized).toHaveLength(1);
    f.send("c", "1", phrase, true); expect(f.state.finalized).toHaveLength(2);
  });
  it("does not merge later speech into an old committed cluster on an accepted-source revision", () => {
    const f = fixture(); f.send("a", "1", phrase, true); f.advance(2000); f.send("b", "1");
    f.send("a", "1", phrase, true); f.send("b", "1", phrase, true);
    expect(f.state.finalized).toHaveLength(2);
  });
  it.each(["We should not leave around seven.", "We should leave around eight."])("preserves conflicting negation or numeric meaning: %s", (text) => {
    const f = fixture(); f.send("a", "1", phrase, true); f.send("b", "1", text, true);
    expect(f.state.finalized).toHaveLength(2);
  });
  it("does not use an oversized common prefix to suppress unrelated endings", () => {
    const f = fixture(); const text = "word ".repeat(CROSS_MIC.maxTokens + 1);
    f.send("a", "1", text, true); f.send("b", "1", text, true);
    expect(f.state.finalized).toHaveLength(2);
  });
});
