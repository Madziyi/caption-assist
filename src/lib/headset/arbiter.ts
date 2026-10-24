import type { CaptionAction } from "../captions/reducer";
import type { TranscriptionEvent } from "../captions/types";
import { comparisonTokens, shortSideCoverage } from "../captions/comparison";
import { eventCaptions, type CaptionEvidence } from "./evidence";

export const ARBITER = { retentionMs: 15000, maxTurns: 256, overlapToleranceMs: 300, textCoverage: 0.6, tieDb: 1, interimMarginDb: 3, finalMarginDb: 4, overlapFraction: 0.5, finalHoldMs: 800, maxHidden: 200, maxTokens: 256 } as const;
export type CaptionCounts = { shown: number; suppressedText: number; suppressedLevel: number; replaced: number; restored: number };
export const emptyCaptionCounts = (): CaptionCounts => ({ shown: 0, suppressedText: 0, suppressedLevel: 0, replaced: 0, restored: 0 });
export type HiddenCaption = { participantId: string; sourceTurnId: string; text: string; startAt: number; reason: "text" | "level" };
type Turn = { key: string; participantId: string; sourceTurnId: string; event: TranscriptionEvent; startAt: number; endAt: number; relDb: number | null; openRatio: number; tokens: string[]; final: boolean; status: "shown" | "hidden" | "held"; wasHidden: boolean; counted: boolean; suppressed: boolean; receivedAt: number; timer: ReturnType<typeof setTimeout> | null };
export type ArbitrationStats = { participants: Record<string, CaptionCounts>; pairs: Array<{ a: string; b: string; duplicatesHidden: number }> };
type Deps = { now?: () => number; setTimeout?: typeof setTimeout; clearTimeout?: typeof clearTimeout; bypass?: boolean };

export class HeadsetArbiter {
  private turns = new Map<string, Turn>();
  private activeInterims = new Map<string, string>();
  private counts = new Map<string, CaptionCounts>();
  private pairs = new Map<string, { a: string; b: string; duplicatesHidden: number }>();
  private hidden: HiddenCaption[] = [];
  private readonly now: () => number;
  private readonly setTimer: typeof setTimeout; private readonly clearTimer: typeof clearTimeout;
  constructor(private readonly emit: (action: CaptionAction) => void, private readonly changed: () => void = () => undefined, private readonly deps: Deps = {}) {
    this.now = deps.now ?? Date.now;
    this.setTimer = (deps.setTimeout ?? globalThis.setTimeout).bind(globalThis); this.clearTimer = (deps.clearTimeout ?? globalThis.clearTimeout).bind(globalThis);
  }
  receive(participantId: string, event: TranscriptionEvent, evidence?: CaptionEvidence, offset = 0) {
    this.prune();
    const captions = eventCaptions(event);
    const sourceTurnId = event.type === "interim" ? event.caption.sourceTurnId ?? event.caption.id : event.sourceTurnId;
    const key = `${participantId}:${sourceTurnId}`;
    const existing = this.turns.get(key);
    if (event.type === "speaker_revision") {
      if (existing?.final && existing.status === "shown") this.emit({ type: "TRANSCRIPTION_EVENT", event });
      return;
    }
    if (existing?.final && event.type === "interim") return;
    const turn: Turn = existing ?? { key, participantId, sourceTurnId, event, startAt: 0, endAt: 0, relDb: null, openRatio: 0, tokens: [], final: false, status: "hidden", wasHidden: false, counted: false, suppressed: false, receivedAt: this.now(), timer: null };
    turn.event = event; turn.receivedAt = this.now();
    turn.startAt = (evidence?.startAt ?? Math.min(...captions.map((c) => c.startedAt))) + offset;
    turn.endAt = Math.max(turn.startAt, (evidence?.endAt ?? Math.max(...captions.map((c) => c.endedAt ?? c.audioEndAt ?? this.now() - offset))) + offset);
    turn.relDb = evidence?.relDb ?? null; turn.openRatio = evidence?.openRatio ?? 0;
    turn.tokens = comparisonTokens(captions.map((c) => c.text).join(" "));
    turn.final = event.type === "final_turn";
    this.turns.set(key, turn);
    if (this.deps.bypass) { this.show(turn); this.changed(); return; }
    if (!turn.final) {
      this.activeInterims.set(participantId, key);
      const others = this.overlapping(turn);
      if (others.some((other) => this.margin(other, turn) >= ARBITER.interimMarginDb)) this.hideInterim(turn);
      else {
        for (const other of others) if (!other.final && this.margin(turn, other) >= ARBITER.interimMarginDb) this.hideInterim(other);
        this.show(turn);
      }
    } else {
      if (turn.suppressed) return;
      const unfinished = this.overlapping(turn).some((other) => !other.final);
      if (unfinished && !turn.counted) {
        turn.status = "held";
        if (!turn.timer) turn.timer = this.setTimer(() => { turn.timer = null; this.resolve(turn); this.changed(); }, ARBITER.finalHoldMs);
      } else this.resolve(turn);
      // The partner's final arrived: resolve held finals immediately when all partners are final.
      for (const other of this.overlapping(turn)) if (other.final && other.status === "held" && !this.overlapping(other).some((partner) => !partner.final)) this.resolve(other);
    }
    this.prune(); this.changed();
  }
  private overlapping(turn: Turn) {
    return [...this.turns.values()].filter((other) => other.key !== turn.key && other.participantId !== turn.participantId && other.startAt <= turn.endAt + ARBITER.overlapToleranceMs && turn.startAt <= other.endAt + ARBITER.overlapToleranceMs);
  }
  private margin(stronger: Turn, weaker: Turn): number { return stronger.relDb === null || weaker.relDb === null ? -Infinity : stronger.relDb - weaker.relDb; }
  private fraction(turn: Turn, other: Turn) { return Math.max(0, Math.min(turn.endAt, other.endAt) - Math.max(turn.startAt, other.startAt)) / Math.max(1, turn.endAt - turn.startAt); }
  private duplicate(a: Turn, b: Turn) {
    if (a.tokens.length === 1 && b.tokens.length === 1) return a.tokens[0] === b.tokens[0];
    return a.tokens.length >= 2 && b.tokens.length >= 2 && a.tokens.length <= ARBITER.maxTokens && b.tokens.length <= ARBITER.maxTokens && shortSideCoverage(a.tokens, b.tokens) >= ARBITER.textCoverage;
  }
  private winner(a: Turn, b: Turn) {
    if (a.relDb === null && b.relDb !== null) return b;
    if (b.relDb === null && a.relDb !== null) return a;
    if (a.relDb !== null && b.relDb !== null && Math.abs(a.relDb - b.relDb) > ARBITER.tieDb) return a.relDb > b.relDb ? a : b;
    if (a.openRatio !== b.openRatio) return a.openRatio > b.openRatio ? a : b;
    return a.startAt <= b.startAt ? a : b;
  }
  private resolve(turn: Turn) {
    if (turn.timer) this.clearTimer(turn.timer); turn.timer = null;
    if (turn.suppressed || !this.turns.has(turn.key)) return;
    const others = this.overlapping(turn);
    // Decide whether this turn loses before suppressing anyone else (important for 3+ phones).
    const textWinner = others.find((other) => this.duplicate(turn, other) && this.winner(turn, other) === other);
    if (textWinner) { this.suppress(turn, textWinner, "text"); return; }
    const levelWinner = others.find((other) => this.margin(other, turn) >= ARBITER.finalMarginDb && this.fraction(turn, other) >= ARBITER.overlapFraction);
    if (levelWinner) { this.suppress(turn, levelWinner, "level"); return; }
    for (const other of others) {
      if (this.duplicate(turn, other) && this.winner(turn, other) === turn) {
        if (other.final) this.suppress(other, turn, "text"); else this.hideInterim(other);
      } else if (other.final && this.margin(turn, other) >= ARBITER.finalMarginDb && this.fraction(other, turn) >= ARBITER.overlapFraction) this.suppress(other, turn, "level");
    }
    this.show(turn);
  }
  private counters(id: string) { let counts = this.counts.get(id); if (!counts) { counts = emptyCaptionCounts(); this.counts.set(id, counts); } return counts; }
  private clearInterim(turn: Turn) {
    if (this.activeInterims.get(turn.participantId) !== turn.key) return;
    this.activeInterims.delete(turn.participantId);
    const sourceId = eventCaptions(turn.event)[0]?.sourceId ?? `participant:${turn.participantId}`;
    this.emit({ type: "CLEAR_INTERIM", sourceId });
  }
  private hideInterim(turn: Turn) { this.clearInterim(turn); turn.wasHidden = true; turn.status = "hidden"; }
  private show(turn: Turn) {
    if (turn.final && !turn.counted) { const counts = this.counters(turn.participantId); counts.shown++; if (turn.wasHidden) counts.restored++; turn.counted = true; }
    turn.status = "shown";
    if (!turn.final) this.activeInterims.set(turn.participantId, turn.key);
    else this.clearInterim(turn);
    this.emit({ type: "TRANSCRIPTION_EVENT", event: turn.event });
  }
  private suppress(turn: Turn, winner: Turn, reason: "text" | "level") {
    if (turn.suppressed) return;
    if (turn.timer) this.clearTimer(turn.timer); turn.timer = null;
    const counts = this.counters(turn.participantId);
    if (turn.final && turn.counted && turn.status === "shown") { this.emit({ type: "REMOVE_TURN", sourceTurnId: turn.sourceTurnId }); counts.replaced++; counts.shown = Math.max(0, counts.shown - 1); }
    counts[reason === "text" ? "suppressedText" : "suppressedLevel"]++;
    this.clearInterim(turn); turn.status = "hidden"; turn.suppressed = true;
    this.hidden.push({ participantId: turn.participantId, sourceTurnId: turn.sourceTurnId, text: eventCaptions(turn.event).map((c) => c.text).join(" "), startAt: turn.startAt, reason });
    this.hidden.sort((a, b) => a.startAt - b.startAt); if (this.hidden.length > ARBITER.maxHidden) this.hidden.shift();
    const [a, b] = [turn.participantId, winner.participantId].sort(); const key = `${a}:${b}`;
    const pair = this.pairs.get(key) ?? { a, b, duplicatesHidden: 0 }; pair.duplicatesHidden++; this.pairs.set(key, pair);
  }
  snapshot(): ArbitrationStats { return { participants: Object.fromEntries([...this.counts].map(([id, value]) => [id, { ...value }])), pairs: [...this.pairs.values()].map((value) => ({ ...value })) }; }
  hiddenCaptions() { return this.hidden.map((caption) => ({ ...caption })); }
  private prune() {
    for (const [key, turn] of this.turns) if (this.now() - turn.receivedAt > ARBITER.retentionMs) { if (turn.timer) this.clearTimer(turn.timer); this.turns.delete(key); }
    while (this.turns.size > ARBITER.maxTurns) { const oldest = this.turns.values().next().value!; if (oldest.status === "held") this.resolve(oldest); if (oldest.timer) this.clearTimer(oldest.timer); this.turns.delete(oldest.key); }
  }
  remove(id: string) { for (const [key, turn] of this.turns) if (turn.participantId === id) { if (turn.timer) this.clearTimer(turn.timer); this.turns.delete(key); } this.activeInterims.delete(id); this.hidden = this.hidden.filter((c) => c.participantId !== id); this.changed(); }
  cancelPending() { for (const turn of this.turns.values()) if (turn.timer) { this.clearTimer(turn.timer); turn.timer = null; this.turns.delete(turn.key); } }
  reset() { this.cancelPending(); this.turns.clear(); this.counts.clear(); this.pairs.clear(); this.hidden = []; this.activeInterims.clear(); }
}
