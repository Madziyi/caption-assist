export const DIAGNOSTIC_LIMIT = 30;
export type ReconciliationDiagnostic = {
  at: number; sourceA: string; sourceB: string;
  eventA: "interim" | "final"; eventB: "interim" | "final";
  wordCountA: number; wordCountB: number; receiveDeltaMs: number;
  similarity: number; containmentScore?: number; matched: boolean;
  shortSideCoverage?: number;
  decision: "suppressed" | "clustered" | "kept";
  reason: "matched" | "outside_time_window" | "similarity_below_threshold" | "short_utterance" | "same_source" | "numeral_conflict" | "negation_conflict" | "cluster_expired" | "oversized" | "other";
  windowMs?: number; similarityThreshold?: number; exactMatch?: boolean;
  windowApplied?: boolean; similarityEvaluated: boolean;
  timeBasis?: "last_receive" | "committed_final";
  skippedGate?: "both_finals_committed" | "source_overlap";
  episodeAgeMs?: number;
  episodeEvent?: "episode_created" | "source_joined_episode" | "source_continued_episode" | "episode_expired" | "strong_match" | "partial_containment_match" | "negation_override_strong_match" | "suppressed_duplicate" | "preserved_independent";
};
export type ComparisonObservation = Omit<ReconciliationDiagnostic, "similarity" | "similarityEvaluated" | "containmentScore" | "shortSideCoverage" | "exactMatch"> & {
  tokensA?: string[]; tokensB?: string[]; usedSimilarity?: number; usedCoverage?: number;
};

// Optional working token references exist only until the controller has dispatched
// caption actions. Flush then discards them; retained/copyable records are metrics only.
export class ReconciliationDiagnostics {
  private enabled = false;
  private history: ReconciliationDiagnostic[] = [];
  private pending: ComparisonObservation[] = [];
  private expired: Array<{ at: number; source: string; received: number; words: number }> = [];
  setEnabled(enabled: boolean) { this.enabled = enabled; if (!enabled) this.clear(); }
  get isEnabled() { return this.enabled; }
  clear() { this.history = []; this.pending = []; this.expired = []; }
  clearWorking() { this.pending = []; this.expired = []; }
  get records(): ReconciliationDiagnostic[] { return this.history.map(record => ({ ...record })); }
  observe(record: ComparisonObservation) {
    if (!this.enabled) return;
    this.pending.push(record); if (this.pending.length > DIAGNOSTIC_LIMIT) this.pending.shift();
  }
  rememberExpired(at: number, source: string, received: number, words: number) {
    if (!this.enabled) return;
    this.expired.push({ at, source, received, words });
    if (this.expired.length > DIAGNOSTIC_LIMIT) this.expired.shift();
  }
  expiredHints(at: number, source: string, event: "interim" | "final", words: number) {
    if (!this.enabled) return;
    this.expired = this.expired.filter(item => at - item.at <= 4000);
    for (const prior of this.expired) if (prior.source !== source && words >= 3 && Math.abs(words - prior.words) <= 3) {
      // Metadata-only hint: no old text/tokens retained, so not a duplicate verdict.
      this.observe({ at, sourceA: source, sourceB: prior.source, eventA: event, eventB: "final", wordCountA: words,
        wordCountB: prior.words, receiveDeltaMs: Math.abs(at - prior.received), matched: false, decision: "kept", reason: "cluster_expired" });
    }
  }
  flush(similarity: (a: string[], b: string[]) => number) {
    for (const item of this.pending) {
      const { tokensA, tokensB, usedSimilarity, usedCoverage, ...metrics } = item;
      const evaluated = Boolean(tokensA && tokensB);
      const minimum = Math.min(item.wordCountA, item.wordCountB);
      const record: ReconciliationDiagnostic = {
        ...metrics, similarity: usedSimilarity ?? (evaluated ? similarity(tokensA!, tokensB!) : 0), similarityEvaluated: evaluated,
        ...(evaluated ? { containmentScore: 2 * Math.min(tokensA!.length, tokensB!.length) / (tokensA!.length + tokensB!.length),
          ...(usedCoverage === undefined ? {} : { shortSideCoverage: usedCoverage }),
          ...(minimum === 3 ? { exactMatch: tokensA!.join(" ") === tokensB!.join(" ") } : {}) } : {}),
      };
      this.history.push(record); if (this.history.length > DIAGNOSTIC_LIMIT) this.history.shift();
    }
    this.pending = [];
  }
}
