// Comparison-only helpers shared by Headset arbitration. Display text is never normalized.
const numbers: Record<string, string> = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };
const contractions: Record<string, string> = { "i'll": "i will", "i'm": "i am", "i've": "i have", "don't": "do not", "doesn't": "does not", "didn't": "did not", "can't": "cannot", "won't": "will not", "we'll": "we will", "we're": "we are", "you're": "you are", "you'll": "you will" };

export function comparisonTokens(text: string): string[] {
  return (text.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'")
    .replace(/\p{L}+'\p{L}+/gu, (word) => contractions[word] ?? word)
    .match(/[\p{L}\p{N}]+/gu) ?? []).map((word) => numbers[word] ?? word);
}

// Ordered token Dice (longest common subsequence), so reordered words are not identical.
export function tokenSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const row = new Array<number>(b.length + 1).fill(0);
  for (const token of a) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = token === b[j - 1] ? diagonal + 1 : Math.max(row[j], row[j - 1]);
      diagonal = previous;
    }
  }
  return 2 * row[b.length] / (a.length + b.length);
}

export function shortSideCoverage(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const row = new Array<number>(b.length + 1).fill(0);
  for (const token of a) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = token === b[j - 1] ? diagonal + 1 : Math.max(row[j], row[j - 1]);
      diagonal = previous;
    }
  }
  return row[b.length] / Math.min(a.length, b.length);
}

