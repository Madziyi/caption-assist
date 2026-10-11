type ParticipantStats = { opens: number; openMs: number; open: boolean; openedAt: number | null; lastOpenAt: number | null };
export class GatePreviewStats {
  private people = new Map<string, ParticipantStats>();
  private pairs = new Map<string, { coOnsets: number; overlapMs: number }>();
  private lastNow: number;
  private startedAt: number;
  constructor(now: () => number = Date.now) { this.lastNow = now(); this.startedAt = this.lastNow; this.now = now; }
  private readonly now: () => number;
  gate(id: string, open: boolean) {
    const now = this.now(); const person = this.people.get(id) ?? { opens: 0, openMs: 0, open: false, openedAt: null, lastOpenAt: null };
    this.tick(now);
    if (open && !person.open) { person.open = true; person.openedAt = now; person.lastOpenAt = now; person.opens++; for (const [otherId, other] of this.people) if (otherId !== id && other.lastOpenAt !== null && Math.abs(now - other.lastOpenAt) <= 500) this.pair(id, otherId).coOnsets++; }
    if (!open && person.open) { person.open = false; person.openedAt = null; }
    this.people.set(id, person);
  }
  private pair(a: string, b: string) { const key = [a, b].sort().join("|"); const pair = this.pairs.get(key) ?? { coOnsets: 0, overlapMs: 0 }; this.pairs.set(key, pair); return pair; }
  tick(at = this.now()) { const delta = Math.max(0, at - this.lastNow); if (!delta) return; for (const [id, person] of this.people) if (person.open) { person.openMs += delta; for (const [otherId, other] of this.people) if (otherId !== id && other.open && id < otherId) this.pair(id, otherId).overlapMs += delta; } this.lastNow = at; }
  reset() { this.people.clear(); this.pairs.clear(); this.lastNow = this.now(); this.startedAt = this.lastNow; }
  snapshot() { this.tick(); return { durationMs: Math.max(0, this.lastNow - this.startedAt), participants: Object.fromEntries([...this.people].map(([id, p]) => [id, { opens: p.opens, openMs: Math.round(p.openMs) }])), pairs: [...this.pairs].map(([key, p]) => { const [a, b] = key.split("|"); return { a, b, coOnsets: p.coOnsets, overlapMs: Math.round(p.overlapMs) }; }) }; }
}
