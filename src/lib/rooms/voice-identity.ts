import type { TranscriptionEvent } from "../captions/types";

export type VoicePhase = "unidentified" | "waiting" | "listening" | "identified" | "not_found" | "needs_again";
export const VOICE_PHASES: readonly VoicePhase[] = ["unidentified", "waiting", "listening", "identified", "not_found", "needs_again"];

export const VOICE_IDENTIFICATION = {
  windowMs: 20_000,
  minWords: 5,
  // Caption start times come from provider audio offsets, which can trail the
  // wall clock by connection latency. Speech that began well before the request
  // still cannot become identification evidence.
  startToleranceMs: 1_500,
  maxEvidenceTurns: 6,
  maxWindowTurns: 32,
  maxBindings: 64,
} as const;

type Segment = { speakerId: string | null; words: number; startedAt: number };
type Binding = { participantId: string; connectionId: string; evidence: string[]; since: number; order: number };
type Request = {
  participantId: string;
  startedAt: number | null;
  deadline: number | null;
  turnSegments: Map<string, Segment[]>;
};

/**
 * Session-local mapping from diarized room-microphone speakers to Connected
 * participants. A binding is anchored to the turns heard while that participant
 * identified, not to a provider label, so speaker revisions of those turns move
 * the participant to the corrected speaker. Memory only; no voiceprints.
 */
export class VoiceIdentityRegistry {
  private connectionId: string | null = null;
  private bindings: Binding[] = [];
  private queue: Request[] = [];
  private readonly turns = new Map<string, Segment[]>();
  private readonly notFound = new Set<string>();
  private order = 0;

  constructor(private readonly now: () => number = Date.now) {}

  get currentConnection(): string | null { return this.connectionId; }
  get listeningParticipant(): string | null {
    const head = this.queue[0];
    return head && head.startedAt !== null ? head.participantId : null;
  }

  /** A new provider connection has fresh speaker labels; earlier bindings stay for history only. */
  setConnection(connectionId: string): void {
    if (connectionId === this.connectionId) return;
    this.connectionId = connectionId;
    this.startHead();
  }

  request(participantId: string): void {
    if (this.queue.some((request) => request.participantId === participantId)) return;
    this.notFound.delete(participantId);
    this.queue.push({ participantId, startedAt: null, deadline: null, turnSegments: new Map() });
    if (this.queue.length === 1) this.startHead();
  }

  cancel(participantId: string): void {
    const index = this.queue.findIndex((request) => request.participantId === participantId);
    if (index < 0) return;
    this.queue.splice(index, 1);
    if (index === 0) this.startHead();
  }

  tick(): void {
    const head = this.queue[0];
    if (!head || head.deadline === null || this.now() <= head.deadline) return;
    this.notFound.add(head.participantId);
    this.queue.shift();
    this.startHead();
  }

  observe(event: TranscriptionEvent): void {
    if (event.type === "interim") return;
    const segments = event.captions.map((caption) => ({ speakerId: caption.speakerId, words: countWords(caption.text), startedAt: caption.startedAt }));
    if (this.turns.has(event.sourceTurnId)) this.turns.set(event.sourceTurnId, segments);
    if (event.type !== "final_turn") return;
    this.tick();
    const head = this.queue[0];
    if (!head || head.startedAt === null) return;
    const since = head.startedAt - VOICE_IDENTIFICATION.startToleranceMs;
    const eligible = (segment: Segment): segment is Segment & { speakerId: string } =>
      segment.speakerId !== null && this.inCurrentConnection(segment.speakerId) && segment.startedAt >= since;
    if (!segments.some(eligible)) return;
    if (!head.turnSegments.has(event.sourceTurnId) && head.turnSegments.size >= VOICE_IDENTIFICATION.maxWindowTurns) return;
    // Formatted turns repeat the same final; replacing by turn keeps counts idempotent.
    head.turnSegments.set(event.sourceTurnId, segments);

    const speakers = new Map<string, { words: number; turns: Set<string> }>();
    for (const [turnId, turnSegments] of head.turnSegments) {
      for (const segment of turnSegments.filter(eligible)) {
        const entry = speakers.get(segment.speakerId) ?? { words: 0, turns: new Set<string>() };
        entry.words += segment.words;
        entry.turns.add(turnId);
        speakers.set(segment.speakerId, entry);
      }
    }
    const aliases = this.aliases();
    const [candidate] = [...speakers]
      .filter(([speakerId, entry]) => entry.words >= VOICE_IDENTIFICATION.minWords && (!aliases[speakerId] || aliases[speakerId] === head.participantId))
      .sort((a, b) => b[1].words - a[1].words);
    if (candidate) this.bind(head, candidate[1].turns, since);
  }

  /** Diarized speaker ID → participant ID. A later identification wins a contested speaker. */
  aliases(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const binding of this.bindings) {
      const speakerId = this.boundSpeaker(binding);
      if (speakerId) result[speakerId] = binding.participantId;
    }
    return result;
  }

  phases(participantIds: string[]): Record<string, VoicePhase> {
    const aliases = this.aliases();
    return Object.fromEntries(participantIds.map((id) => [id, this.phaseWith(id, aliases)]));
  }

  phase(participantId: string): VoicePhase {
    return this.phaseWith(participantId, this.aliases());
  }

  reset(): void {
    this.connectionId = null;
    this.bindings = [];
    this.queue = [];
    this.turns.clear();
    this.notFound.clear();
  }

  private phaseWith(participantId: string, aliases: Record<string, string>): VoicePhase {
    const queued = this.queue.findIndex((request) => request.participantId === participantId);
    if (queued === 0 && this.queue[0].startedAt !== null) return "listening";
    if (queued >= 0) return "waiting";
    if (Object.entries(aliases).some(([speakerId, id]) => id === participantId && this.inCurrentConnection(speakerId))) return "identified";
    if (this.notFound.has(participantId)) return "not_found";
    if (this.bindings.some((binding) => binding.participantId === participantId)) return "needs_again";
    return "unidentified";
  }

  private startHead(): void {
    const head = this.queue[0];
    if (!head) return;
    if (!this.connectionId) { head.startedAt = null; head.deadline = null; return; }
    const now = this.now();
    head.startedAt = now;
    head.deadline = now + VOICE_IDENTIFICATION.windowMs;
    head.turnSegments.clear();
  }

  private bind(head: Request, turnIds: Set<string>, since: number): void {
    const connectionId = this.connectionId!;
    this.bindings = this.bindings.filter((binding) => !(binding.participantId === head.participantId && binding.connectionId === connectionId));
    const evidence = [...turnIds].slice(-VOICE_IDENTIFICATION.maxEvidenceTurns);
    for (const turnId of evidence) this.turns.set(turnId, head.turnSegments.get(turnId) ?? []);
    this.bindings.push({ participantId: head.participantId, connectionId, evidence, since, order: ++this.order });
    if (this.bindings.length > VOICE_IDENTIFICATION.maxBindings) this.bindings.shift();
    const referenced = new Set(this.bindings.flatMap((binding) => binding.evidence));
    for (const turnId of this.turns.keys()) if (!referenced.has(turnId)) this.turns.delete(turnId);
    this.notFound.delete(head.participantId);
    this.queue.shift();
    this.startHead();
  }

  private boundSpeaker(binding: Binding): string | null {
    const totals = new Map<string, number>();
    for (const turnId of binding.evidence) {
      for (const segment of this.turns.get(turnId) ?? []) {
        if (segment.speakerId && segment.startedAt >= binding.since) totals.set(segment.speakerId, (totals.get(segment.speakerId) ?? 0) + segment.words);
      }
    }
    let best: string | null = null;
    for (const [speakerId, words] of totals) if (best === null || words > totals.get(best)!) best = speakerId;
    return best;
  }

  private inCurrentConnection(speakerId: string): boolean {
    return this.connectionId !== null && speakerId.startsWith(`${this.connectionId}/speaker/`);
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
