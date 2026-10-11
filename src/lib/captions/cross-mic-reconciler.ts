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
  strongMinWords: 8,
  strongWindowMs: 300,
  strongSimilarity: 0.85,
  strongCoverage: 0.9,
  continuationWindowMs: 3000,
  continuationMinWords: 5,
  continuationSimilarity: 0.25,
  continuationCoverage: 0.7,
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

type Turn = {
  key: string; source: string; first: number; received: number; order: number;
  tokens: string[]; wordCount: number; event: TranscriptionEvent; confidence?: number;
};
type Cluster = {
  turns: Map<string, Turn>; leader: string; created: number; touched: number;
  committed?: { key: string; at: number; speakerId: string | null };
  episode?: Episode;
};
type EpisodeSource = { tokens: string[]; lastReceived: number; lastKey: string; wordCount: number };
type Episode = { id: string; sources: Map<string, EpisodeSource>; startedAt: number; lastEvidenceAt: number };

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
    let episodeContinuation = false;
    let episodeHadSource = false;
    const previous = cluster?.turns.get(key);
    const confidences = captions.map((caption) => caption.recognitionConfidence).filter(validConfidence);
    const turn: Turn = { key, source, received, first: previous?.first ?? received, order: previous?.order ?? ++this.order,
      tokens, wordCount, event, confidence: confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : undefined };
    this.debug.expiredHints(received, source, event.type === "interim" ? "interim" : "final", wordCount);
    if (event.type === "interim") this.active.set(source, key);

    if (!cluster) {
      cluster = this.findEpisode(turn);
      episodeContinuation = Boolean(cluster);
      episodeHadSource = Boolean(cluster?.episode?.sources.has(source));
    }

    // A matching prefix can later diverge. Preserve that speech instead of irrevocably
    // suppressing a turn merely because its earlier interim matched another mic.
    if (cluster && !episodeContinuation && cluster.turns.size > 1 && cluster.committed?.key !== key
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
    if (cluster.episode) this.updateEpisode(cluster, turn);

    if (episodeContinuation) this.recordEpisodeEvent(turn, cluster, episodeHadSource ? "source_continued_episode" : "source_joined_episode");

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
      this.mergeEpisode(cluster, other);
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

  private findEpisode(turn: Turn): Cluster | undefined {
    const candidates = this.clusters.filter((cluster) => cluster.episode
      && turn.received - cluster.episode.lastEvidenceAt <= CROSS_MIC.continuationWindowMs);
    for (const cluster of candidates) {
      const episode = cluster.episode!;
      for (const [source, state] of episode.sources) {
        if (source === turn.source) continue;
        const delta = Math.abs(turn.received - state.lastReceived);
        if (delta > CROSS_MIC.continuationWindowMs || turn.wordCount < CROSS_MIC.continuationMinWords) continue;
        const similarity = tokenSimilarity(turn.tokens, state.tokens);
        const coverage = shortSideCoverage(turn.tokens, state.tokens);
        const knownSource = episode.sources.has(turn.source);
        const compatible = knownSource
          ? coverage >= CROSS_MIC.continuationCoverage || similarity >= CROSS_MIC.continuationSimilarity
          : turn.wordCount >= CROSS_MIC.strongMinWords && delta <= CROSS_MIC.strongWindowMs
            && similarity >= CROSS_MIC.strongSimilarity && coverage >= CROSS_MIC.strongCoverage;
        if (!compatible) continue;
        this.observeEpisodeComparison(turn, state, source, cluster, similarity, coverage,
          coverage >= CROSS_MIC.continuationCoverage ? "partial_containment_match" : "strong_match");
        return cluster;
      }
    }
    return undefined;
  }

  private updateEpisode(cluster: Cluster, turn: Turn) {
    const episode = cluster.episode;
    if (!episode) return;
    const existing = episode.sources.get(turn.source);
    const tokens = [...(existing?.tokens ?? []), ...turn.tokens].slice(-100);
    episode.sources.set(turn.source, { tokens, lastReceived: turn.received, lastKey: turn.key, wordCount: turn.wordCount });
    episode.lastEvidenceAt = turn.received;
  }

  private establishEpisode(cluster: Cluster, a: Turn, b: Turn) {
    if (!cluster.episode) {
      cluster.episode = { id: `episode-${this.order}`, sources: new Map(), startedAt: Math.min(a.received, b.received), lastEvidenceAt: Math.max(a.received, b.received) };
      this.updateEpisode(cluster, a); this.updateEpisode(cluster, b);
      return true;
    }
    this.updateEpisode(cluster, a); this.updateEpisode(cluster, b);
    return false;
  }

  private mergeEpisode(target: Cluster, other: Cluster) {
    if (!other.episode) return;
    if (!target.episode) target.episode = { id: other.episode.id, sources: new Map(), startedAt: other.episode.startedAt, lastEvidenceAt: other.episode.lastEvidenceAt };
    for (const [source, state] of other.episode.sources) {
      const current = target.episode.sources.get(source);
      if (!current || current.lastReceived < state.lastReceived) target.episode.sources.set(source, { ...state, tokens: [...state.tokens] });
    }
    target.episode.startedAt = Math.min(target.episode.startedAt, other.episode.startedAt);
    target.episode.lastEvidenceAt = Math.max(target.episode.lastEvidenceAt, other.episode.lastEvidenceAt);
  }

  private observeEpisodeComparison(turn: Turn, state: EpisodeSource, source: string, cluster: Cluster, similarity: number, coverage: number, episodeEvent: ReconciliationDiagnostic["episodeEvent"]) {
    if (!this.debug.isEnabled) return;
    this.debug.observe({ at: this.diagnosticAt, sourceA: turn.source, sourceB: source,
      eventA: turn.event.type === "interim" ? "interim" : "final", eventB: "final", wordCountA: turn.wordCount, wordCountB: state.wordCount,
      receiveDeltaMs: Math.abs(turn.received - state.lastReceived), tokensA: turn.tokens, tokensB: state.tokens,
      usedSimilarity: similarity, usedCoverage: coverage, matched: true, decision: cluster.committed ? "suppressed" : "clustered", reason: "matched",
      windowMs: CROSS_MIC.continuationWindowMs, similarityThreshold: CROSS_MIC.continuationSimilarity, windowApplied: true,
      timeBasis: cluster.committed ? "committed_final" : "last_receive", episodeAgeMs: turn.received - (cluster.episode?.startedAt ?? turn.received), episodeEvent });
  }

  private recordEpisodeEvent(turn: Turn, cluster: Cluster, episodeEvent: ReconciliationDiagnostic["episodeEvent"]) {
    const episode = cluster.episode;
    if (!episode || !this.debug.isEnabled) return;
    const other = [...episode.sources.entries()].find(([source]) => source !== turn.source);
    if (!other) return;
    this.debug.observe({ at: this.diagnosticAt, sourceA: turn.source, sourceB: other[0], eventA: turn.event.type === "interim" ? "interim" : "final", eventB: "final",
      wordCountA: turn.wordCount, wordCountB: other[1].wordCount, receiveDeltaMs: Math.abs(turn.received - other[1].lastReceived),
      tokensA: turn.tokens, tokensB: other[1].tokens, matched: true, decision: cluster.committed ? "suppressed" : "clustered", reason: "other",
      windowMs: CROSS_MIC.continuationWindowMs, similarityThreshold: CROSS_MIC.continuationSimilarity, windowApplied: true,
      timeBasis: cluster.committed ? "committed_final" : "last_receive", episodeAgeMs: turn.received - episode.startedAt,
      episodeEvent: cluster.committed ? "suppressed_duplicate" : episodeEvent });
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
    const observe = (matched: boolean, reason: ReconciliationDiagnostic["reason"], usedSimilarity?: number, usedCoverage?: number, episodeEvent?: ReconciliationDiagnostic["episodeEvent"]) => {
      if (this.debug.isEnabled) this.debug.observe({ at: this.diagnosticAt, sourceA: a.source, sourceB: b.source,
        eventA: a.event.type === "interim" ? "interim" : "final", eventB: b.event.type === "interim" ? "interim" : "final",
        wordCountA: a.wordCount, wordCountB: b.wordCount, receiveDeltaMs: Math.abs(a.received - (cluster.committed?.at ?? b.received)),
        tokensA: a.tokens, tokensB: b.tokens, usedSimilarity, usedCoverage, matched, decision: matched ? cluster.committed ? "suppressed" : "clustered" : "kept", reason,
        windowMs: Math.min(a.wordCount, b.wordCount) === 3 ? CROSS_MIC.threeWordWindowMs : CROSS_MIC.windowMs,
        similarityThreshold: Math.min(a.wordCount, b.wordCount) === 3 ? 1 : CROSS_MIC.similarity,
        windowApplied: checkWindow, timeBasis: cluster.committed ? "committed_final" : "last_receive",
        ...(cluster.episode ? { episodeAgeMs: this.diagnosticAt - cluster.episode.startedAt } : {}), episodeEvent });
      return matched;
    };
    if (a.source === b.source) return observe(false, "same_source");
    const delta = Math.abs(a.received - (cluster.committed?.at ?? b.received));
    const minimum = Math.min(a.wordCount, b.wordCount);
    const similarity = tokenSimilarity(a.tokens, b.tokens);
    const coverage = shortSideCoverage(a.tokens, b.tokens);
    const strong = checkWindow && minimum >= CROSS_MIC.strongMinWords && delta <= CROSS_MIC.strongWindowMs
      && similarity >= CROSS_MIC.strongSimilarity && coverage >= CROSS_MIC.strongCoverage;
    const negationTokens = (tokens: string[]) => tokens.filter((token) => ["not", "no", "never", "cannot"].includes(token)).sort().join(" ");
    const negationConflict = negationTokens(a.tokens) !== negationTokens(b.tokens);
    const numerals = (tokens: string[]) => tokens.filter((token) => /^\d+$/.test(token)).join(" ");
    if (numerals(a.tokens) && numerals(b.tokens) && numerals(a.tokens) !== numerals(b.tokens)) return observe(false, "numeral_conflict", similarity, coverage);
    // A very strong, near-synchronous long match can tolerate one isolated ASR
    // negation disagreement; ordinary matches retain the semantic guard.
    if (strong) {
      const episodeEvent = negationConflict ? "negation_override_strong_match" : cluster.episode ? "strong_match" : "episode_created";
      this.establishEpisode(cluster, a, b);
      return observe(true, "matched", similarity, coverage, episodeEvent);
    }
    // High overlap alone can hide opposite intent or different times/quantities.
    if (negationConflict) return observe(false, "negation_conflict", similarity, coverage);
    if (minimum <= 2) return observe(false, "short_utterance");
    if (minimum === 3) {
      const inWindow = !checkWindow || delta <= CROSS_MIC.threeWordWindowMs;
      const matched = inWindow && a.tokens.join(" ") === b.tokens.join(" ");
      return observe(matched, matched ? "matched" : !inWindow ? "outside_time_window" : "similarity_below_threshold");
    }
    if (checkWindow && delta > CROSS_MIC.windowMs) return observe(false, "outside_time_window");
    if (2 * Math.min(a.tokens.length, b.tokens.length) / (a.tokens.length + b.tokens.length) < CROSS_MIC.similarity) return observe(false, "similarity_below_threshold");
    return observe(similarity >= CROSS_MIC.similarity, similarity >= CROSS_MIC.similarity ? "matched" : "similarity_below_threshold", similarity, coverage);
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
    if (this.debug.isEnabled) for (const cluster of this.clusters) if (cluster.episode
      && (now - cluster.episode.lastEvidenceAt > CROSS_MIC.inactiveMs || now - cluster.created > CROSS_MIC.maxLifetimeMs)) {
      const sources = [...cluster.episode.sources.entries()];
      if (sources.length >= 2) this.debug.observe({ at: now, sourceA: sources[0][0], sourceB: sources[1][0], eventA: "final", eventB: "final",
        wordCountA: sources[0][1].wordCount, wordCountB: sources[1][1].wordCount, receiveDeltaMs: Math.abs(sources[0][1].lastReceived - sources[1][1].lastReceived),
        matched: false, decision: "kept", reason: "cluster_expired", episodeAgeMs: now - cluster.episode.startedAt, episodeEvent: "episode_expired" });
    }
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
