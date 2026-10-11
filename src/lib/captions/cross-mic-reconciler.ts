import type { CaptionAction } from "./reducer";
import type { CaptionEvent, TranscriptionEvent } from "./types";
import { ReconciliationDiagnostics, type ReconciliationDiagnostic } from "./reconciliation-diagnostics";

// Host receive times only. Comparison never schedules work or waits for other mics.
export const CROSS_MIC = {
  windowMs: 1800,
  threeWordWindowMs: 600,
  similarity: 0.85,
  confidenceMargin: 0.15,
  inactiveMs: 4000,
  maxLifetimeMs: 15000,
  maxTurns: 128,
  maxTokens: 256,
} as const;

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

type Turn = {
  key: string; source: string; first: number; received: number; order: number;
  tokens: string[]; wordCount: number; event: TranscriptionEvent; confidence?: number;
};
type Cluster = {
  turns: Map<string, Turn>; leader: string; created: number; touched: number;
  committed?: { key: string; at: number; speakerId: string | null };
};

export class CrossMicReconciler {
  private clusters: Cluster[] = [];
  private active = new Map<string, string>();
  private order = 0;
  private readonly debug = new ReconciliationDiagnostics();
  private diagnosticAt = 0;
  constructor(private readonly now = () => performance.now()) {}

  reset() { this.clusters = []; this.active.clear(); this.order = 0; this.debug.clearWorking(); }
  discardSource(source: string) {
    this.active.delete(source);
    for (const cluster of this.clusters) {
      for (const [key, turn] of cluster.turns) if (turn.source === source) cluster.turns.delete(key);
      if (cluster.turns.size && !cluster.turns.has(cluster.leader)) cluster.leader = this.firstTurn(cluster).key;
    }
    this.clusters = this.clusters.filter((cluster) => cluster.turns.size);
  }
  prune() { this.expire(this.now()); }
  get diagnostics() { return { clusters: this.clusters.length, turns: this.clusters.reduce((sum, cluster) => sum + cluster.turns.size, 0) }; }
  setDiagnosticsEnabled(enabled: boolean) { this.debug.setEnabled(enabled); }
  get diagnosticRecords() { return this.debug.records; }
  clearDiagnostics() { this.debug.clear(); }
  flushDiagnostics() { this.debug.flush(tokenSimilarity); }

  process(source: string, event: TranscriptionEvent): CaptionAction[] {
    const received = this.now();
    this.diagnosticAt = received;
    this.expire(received);
    const captions = event.type === "interim" ? [event.caption] : event.captions;
    const turnId = event.type === "interim" ? event.caption.sourceTurnId ?? event.caption.id : event.sourceTurnId;
    const key = JSON.stringify([source, turnId]);
    const text = captions.map((caption) => caption.text).join(" ");
    const tokens = comparisonTokens(text);
    // Expanding "I'm sorry" must not turn a two-word acknowledgement into a
    // deduplication candidate. Use the more conservative pre-expansion count.
    const wordCount = Math.min(tokens.length, (text.normalize("NFKC").match(/[\p{L}\p{N}]+(?:['’‘][\p{L}]+)*/gu) ?? []).length);
    // Oversize comparison is deliberately skipped, rather than comparing truncated prefixes.
    if (!tokens.length || tokens.length > CROSS_MIC.maxTokens) {
      if (this.debug.isEnabled) for (const cluster of this.clusters) {
        const other = this.firstTurn(cluster);
        this.debug.observe({ at: received, sourceA: source, sourceB: other.source, eventA: event.type === "interim" ? "interim" : "final",
          eventB: other.event.type === "interim" ? "interim" : "final", wordCountA: wordCount, wordCountB: other.wordCount,
          receiveDeltaMs: Math.abs(received - other.received), matched: false, decision: "kept", reason: tokens.length ? "oversized" : "other" });
      }
      this.active.delete(source);
      for (const item of this.clusters) {
        item.turns.delete(key);
        if (item.turns.size && item.leader === key) item.leader = this.firstTurn(item).key;
      }
      this.clusters = this.clusters.filter((item) => item.turns.size);
      return [{ type: "TRANSCRIPTION_EVENT", event }];
    }
    let cluster = this.clusters.find((item) => item.turns.has(key));
    const previous = cluster?.turns.get(key);
    const confidences = captions.map((caption) => caption.recognitionConfidence).filter(validConfidence);
    const turn: Turn = { key, source, received, first: previous?.first ?? received, order: previous?.order ?? ++this.order,
      tokens, wordCount, event, confidence: confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : undefined };
    this.debug.expiredHints(received, source, event.type === "interim" ? "interim" : "final", wordCount);
    if (event.type === "interim") this.active.set(source, key);

    // A matching prefix can later diverge. Preserve that speech instead of irrevocably
    // suppressing a turn merely because its earlier interim matched another mic.
    if (cluster && cluster.turns.size > 1 && cluster.committed?.key !== key
      && ![...cluster.turns.values()].some((other) => other.key !== key && this.matches(turn, other, cluster!, false))) {
      cluster.turns.delete(key);
      if (cluster.leader === key) cluster.leader = this.firstTurn(cluster).key;
      cluster = undefined;
    }
    if (!cluster) {
      cluster = { turns: new Map(), leader: key, created: received, touched: received };
      this.clusters.push(cluster);
    }
    cluster.turns.set(key, turn);
    cluster.touched = received;

    // Merge all compatible groups, not just a pair. A source may contribute only
    // one turn to a cluster, preserving its own repetitions even inside the window.
    for (const other of [...this.clusters]) {
      if (other === cluster) continue;
      if (cluster.committed && other.committed) {
        this.observeSkipped(turn, other, "both_finals_committed"); continue;
      }
      const sources = new Set([...cluster.turns.values()].map((item) => item.source));
      if ([...other.turns.values()].some((item) => sources.has(item.source))) {
        this.observeSkipped(turn, other, "source_overlap"); continue;
      }
      if (![...other.turns.values()].some((item) => this.matches(turn, item, other)
        && (!cluster!.committed || this.matches(item, turn, cluster!)))) continue;
      if (other.committed) { cluster.committed = other.committed; cluster.leader = other.leader; }
      else if (!cluster.committed && this.firstTurn(other).order < this.firstTurn(cluster).order) cluster.leader = other.leader;
      for (const [memberKey, member] of other.turns) cluster.turns.set(memberKey, member);
      cluster.created = Math.min(cluster.created, other.created);
      this.clusters = this.clusters.filter((item) => item !== other);
    }

    const actions: CaptionAction[] = [];
    if (cluster.committed) {
      this.clearMembers(cluster, actions);
      // Revisions of the already accepted final keep its selected speaker; other
      // microphones cannot replace history, regardless of their confidence.
      if (event.type !== "interim" && cluster.committed.key === key) actions.push({ type: "TRANSCRIPTION_EVENT", event: withSpeaker(event, cluster.committed.speakerId) });
      return actions;
    }
    let leader = cluster.turns.get(cluster.leader)!;
    const strongest = [...cluster.turns.values()].filter((member) => validConfidence(member.confidence))
      .sort((a, b) => b.confidence! - a.confidence! || a.order - b.order)[0];
    if (strongest && validConfidence(leader.confidence)
      && strongest.confidence! - leader.confidence >= CROSS_MIC.confidenceMargin) {
      cluster.leader = strongest.key; leader = strongest;
    }
    if (event.type === "interim") {
      this.clearMembers(cluster, actions, leader.key);
      if (leader.event.type === "interim") actions.push({ type: "TRANSCRIPTION_EVENT", event: leader.event });
    } else {
      const speakerId = firstCaption(leader.event)?.speakerId ?? null;
      cluster.committed = { key, at: received, speakerId };
      this.clearMembers(cluster, actions);
      // First final is immediate, even if it came from an interim follower. Its
      // microphone/source provenance stays intact; only the visible speaker uses
      // the chosen cluster leader. We never manufacture a final from partial text.
      actions.push({ type: "TRANSCRIPTION_EVENT", event: withSpeaker(event, speakerId) });
    }
    return actions;
  }

  private observeSkipped(a: Turn, cluster: Cluster, skippedGate: NonNullable<ReconciliationDiagnostic["skippedGate"]>) {
    if (!this.debug.isEnabled) return;
    for (const b of cluster.turns.values()) if (a.source !== b.source) {
      const minimum = Math.min(a.wordCount, b.wordCount);
      this.debug.observe({ at: this.diagnosticAt, sourceA: a.source, sourceB: b.source,
        eventA: a.event.type === "interim" ? "interim" : "final", eventB: b.event.type === "interim" ? "interim" : "final",
        wordCountA: a.wordCount, wordCountB: b.wordCount, receiveDeltaMs: Math.abs(a.received - (cluster.committed?.at ?? b.received)),
        tokensA: a.tokens, tokensB: b.tokens, matched: false, decision: "kept", reason: "other", skippedGate,
        windowMs: minimum === 3 ? CROSS_MIC.threeWordWindowMs : CROSS_MIC.windowMs,
        similarityThreshold: minimum === 3 ? 1 : CROSS_MIC.similarity, windowApplied: false,
        timeBasis: cluster.committed ? "committed_final" : "last_receive" });
    }
  }
  private matches(a: Turn, b: Turn, cluster: Cluster, checkWindow = true): boolean {
    const observe = (matched: boolean, reason: ReconciliationDiagnostic["reason"], usedSimilarity?: number) => {
      if (this.debug.isEnabled) this.debug.observe({ at: this.diagnosticAt, sourceA: a.source, sourceB: b.source,
        eventA: a.event.type === "interim" ? "interim" : "final", eventB: b.event.type === "interim" ? "interim" : "final",
        wordCountA: a.wordCount, wordCountB: b.wordCount, receiveDeltaMs: Math.abs(a.received - (cluster.committed?.at ?? b.received)),
        tokensA: a.tokens, tokensB: b.tokens, usedSimilarity, matched, decision: matched ? cluster.committed ? "suppressed" : "clustered" : "kept", reason,
        windowMs: Math.min(a.wordCount, b.wordCount) === 3 ? CROSS_MIC.threeWordWindowMs : CROSS_MIC.windowMs,
        similarityThreshold: Math.min(a.wordCount, b.wordCount) === 3 ? 1 : CROSS_MIC.similarity,
        windowApplied: checkWindow, timeBasis: cluster.committed ? "committed_final" : "last_receive" });
      return matched;
    };
    if (a.source === b.source) return observe(false, "same_source");
    // High overlap alone can hide opposite intent or different times/quantities.
    const negations = (tokens: string[]) => tokens.filter((token) => ["not", "no", "never", "cannot"].includes(token)).sort().join(" ");
    if (negations(a.tokens) !== negations(b.tokens)) return observe(false, "negation_conflict");
    const numerals = (tokens: string[]) => tokens.filter((token) => /^\d+$/.test(token)).join(" ");
    if (numerals(a.tokens) && numerals(b.tokens) && numerals(a.tokens) !== numerals(b.tokens)) return observe(false, "numeral_conflict");
    const delta = Math.abs(a.received - (cluster.committed?.at ?? b.received));
    const minimum = Math.min(a.wordCount, b.wordCount);
    if (minimum <= 2) return observe(false, "short_utterance");
    if (minimum === 3) {
      const inWindow = !checkWindow || delta <= CROSS_MIC.threeWordWindowMs;
      const matched = inWindow && a.tokens.join(" ") === b.tokens.join(" ");
      return observe(matched, matched ? "matched" : !inWindow ? "outside_time_window" : "similarity_below_threshold");
    }
    if (checkWindow && delta > CROSS_MIC.windowMs) return observe(false, "outside_time_window");
    if (2 * Math.min(a.tokens.length, b.tokens.length) / (a.tokens.length + b.tokens.length) < CROSS_MIC.similarity) return observe(false, "similarity_below_threshold");
    const similarity = tokenSimilarity(a.tokens, b.tokens);
    return observe(similarity >= CROSS_MIC.similarity, similarity >= CROSS_MIC.similarity ? "matched" : "similarity_below_threshold", similarity);
  }
  private firstTurn(cluster: Cluster) { return [...cluster.turns.values()].reduce((a, b) => a.order < b.order ? a : b); }
  private clearMembers(cluster: Cluster, actions: CaptionAction[], keep?: string) {
    for (const turn of cluster.turns.values()) {
      if (turn.key !== keep && this.active.get(turn.source) === turn.key) {
        actions.push({ type: "CLEAR_INTERIM", sourceId: turn.source }); this.active.delete(turn.source);
      }
    }
  }
  private expire(now: number) {
    if (this.debug.isEnabled) for (const cluster of this.clusters) if (cluster.committed
      && (now - cluster.touched > CROSS_MIC.inactiveMs || now - cluster.created > CROSS_MIC.maxLifetimeMs)) {
      for (const turn of cluster.turns.values()) this.debug.rememberExpired(now, turn.source, cluster.committed.at, turn.wordCount);
    }
    this.clusters = this.clusters.filter((cluster) => now - cluster.touched <= CROSS_MIC.inactiveMs && now - cluster.created <= CROSS_MIC.maxLifetimeMs);
    while (this.clusters.reduce((count, cluster) => count + cluster.turns.size, 0) >= CROSS_MIC.maxTurns) this.clusters.shift();
    const keys = new Set(this.clusters.flatMap((cluster) => [...cluster.turns.keys()]));
    for (const [source, key] of this.active) if (!keys.has(key)) this.active.delete(source);
  }
}

function validConfidence(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1; }
function firstCaption(event: TranscriptionEvent): CaptionEvent | undefined { return event.type === "interim" ? event.caption : event.captions[0]; }
function withSpeaker(event: Exclude<TranscriptionEvent, { type: "interim" }>, speakerId: string | null): TranscriptionEvent {
  return { ...event, captions: event.captions.map((caption) => ({ ...caption, speakerId })) };
}
