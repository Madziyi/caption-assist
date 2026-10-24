import { describe, expect, it } from "vitest";
import { comparisonTokens, tokenSimilarity } from "./comparison";
const phrase = "We should leave around seven.";
describe("comparison-only normalization and similarity", () => {
  it.each(["WE SHOULD LEAVE AROUND SEVEN", "We, should leave around seven!", "  We\tshould\nleave   around seven. ", "Ｗｅ should leave around seven", "We should leave around 7."])("normalizes %s without changing displayed text", (text) => {
    expect(comparisonTokens(text)).toEqual(comparisonTokens(phrase));
  });
  it.each([
    ["We should probably leave around seven.", phrase],
    ["I'll see you tomorrow morning.", "I will see you tomorrow morning."],
  ])("matches an obvious near-duplicate", (a, b) => {
    expect(tokenSimilarity(comparisonTokens(a), comparisonTokens(b))).toBeGreaterThanOrEqual(0.85);
  });
  it("rejects unrelated speech and insufficient partial containment", () => {
    expect(tokenSimilarity(comparisonTokens(phrase), comparisonTokens("Did anybody call Michael?"))).toBeLessThan(0.85);
    expect(tokenSimilarity(comparisonTokens("We should leave around"), comparisonTokens("We should leave around seven after dinner"))).toBeLessThan(0.85);
  });
  it("is sensitive to word order and preserves repeated tokens", () => {
    expect(tokenSimilarity(comparisonTokens("you said I should go"), comparisonTokens("I said you should go"))).toBeLessThan(0.85);
    expect(comparisonTokens("yes yes")).toEqual(["yes", "yes"]);
  });
});

