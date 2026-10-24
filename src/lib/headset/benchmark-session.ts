import { BENCHMARK_PHRASES, normalizedWer, scoreEntities, type BenchmarkRow, eventText } from "./benchmark";
import type { TranscriptionEvent } from "../captions/types";

type Episode = BenchmarkRow & { gateOpenedAt: number; firstAudioSentAt: number; assemblyFirstPartialAt: number | null; assemblyFirstFinalAt: number | null; openaiFirstDeltaAt: number | null; openaiCompletedAt: number | null; gateClosedAt: number | null; assemblyFinalSeen: boolean; assemblyFinals: Map<string, string>; assemblyInterimText: string; openaiItemId: string | null };
export type BenchmarkView = { state: "connecting" | "on" | "unavailable"; contextHints: boolean; selectedPhrase: number | null; rows: BenchmarkRow[] };
export class HeadsetBenchmarkSession {
  private active: Episode | null = null;
  private latestEpisode: Episode | null = null;
  private episodes: Episode[] = [];
  private readonly openaiItems = new Map<string, Episode>();
  private readonly assemblyTurns = new Map<string, Episode>();
  private selectedPhrase: number | null = null;
  private contextHints = false;
  private state: BenchmarkView["state"] = "connecting";
  constructor(private readonly onChange: (view: BenchmarkView) => void, private readonly now: () => number = () => performance.now()) {}
  get view(): BenchmarkView { return { state: this.state, contextHints: this.contextHints, selectedPhrase: this.selectedPhrase, rows: this.episodes.map((episode) => ({ id: episode.id, assemblyText: episode.assemblyText, openaiText: episode.openaiText, reference: episode.reference, entities: [...episode.entities], contextHints: episode.contextHints, timings: { ...episode.timings }, ...(episode.scores ? { scores: { ...episode.scores } } : {}) })) }; }
  selectPhrase(index: number | null) { this.selectedPhrase = index !== null && BENCHMARK_PHRASES[index] ? index : null; this.publish(); }
  setContextHints(enabled: boolean) { this.contextHints = enabled; this.publish(); }
  setState(state: BenchmarkView["state"]) { this.state = state; this.publish(); }
  discardActive() { if (this.active && !this.episodes.includes(this.active)) this.episodes.push(this.active); this.active = null; this.publish(); }
  /** Returns true when delayed active audio ended and an OpenAI turn should commit. */
  gateOutput(active: boolean, at = this.now(), gateOpenedAt: number | null = null, gateClosedAt: number | null = null): boolean {
    if (active && !this.active) {
      const phrase = this.selectedPhrase === null ? null : BENCHMARK_PHRASES[this.selectedPhrase];
      const speechStart = gateOpenedAt ?? at;
      this.active = { id: `bench/${crypto.randomUUID()}`, assemblyText: "", openaiText: "", reference: phrase?.text ?? null, entities: phrase ? [...phrase.entities] : [], contextHints: this.contextHints, timings: { assemblyFirstTextMs: null, assemblyFinalMs: null, gateCloseToAssemblyFinalMs: null, openaiFirstTextMs: null, openaiFinalMs: null, gateCloseToOpenaiFinalMs: null, gateCloseMs: null }, gateOpenedAt: speechStart, firstAudioSentAt: at, assemblyFirstPartialAt: null, assemblyFirstFinalAt: null, openaiFirstDeltaAt: null, openaiCompletedAt: null, gateClosedAt: null, assemblyFinalSeen: false, assemblyFinals: new Map(), assemblyInterimText: "", openaiItemId: null };
      this.latestEpisode = this.active;
    } else if (!active && this.active) {
      this.active.gateClosedAt = gateClosedAt ?? at;
      this.active.timings.gateCloseMs = this.active.gateClosedAt - this.active.gateOpenedAt;
      if (!this.episodes.includes(this.active)) this.episodes.push(this.active);
      this.active = null;
      this.publish();
      return true;
    }
    return false;
  }
  assemblyEvent(event: TranscriptionEvent, at = this.now()) {
    const sourceTurnId = event.type === "interim" ? event.caption.sourceTurnId ?? event.caption.id : event.sourceTurnId;
    const episode = this.assemblyTurns.get(sourceTurnId) ?? this.active ?? this.latestEpisode;
    if (!episode) return;
    if (!this.assemblyTurns.has(sourceTurnId)) { this.assemblyTurns.set(sourceTurnId, episode); while (this.assemblyTurns.size > 128) this.assemblyTurns.delete(this.assemblyTurns.keys().next().value!); }
    const text = eventText(event);
    if (episode.timings.assemblyFirstTextMs === null && text) episode.timings.assemblyFirstTextMs = at - episode.gateOpenedAt;
    if (event.type === "interim") { episode.assemblyFirstPartialAt ??= at; episode.assemblyInterimText = text; episode.assemblyText = [...episode.assemblyFinals.values(), text].filter(Boolean).join(" "); }
    else if (event.type === "final_turn") { episode.assemblyFirstFinalAt ??= at; episode.assemblyFinals.set(event.sourceTurnId, text); episode.assemblyText = [...episode.assemblyFinals.values()].filter(Boolean).join(" "); episode.assemblyInterimText = ""; episode.assemblyFinalSeen = true; episode.timings.assemblyFinalMs = at - episode.gateOpenedAt; episode.timings.gateCloseToAssemblyFinalMs = episode.gateClosedAt === null ? null : at - episode.gateClosedAt; }
    this.score(episode); this.publish();
  }
  openaiDelta(delta: string, at = this.now(), itemId?: string) {
    const episode = (itemId ? this.openaiItems.get(itemId) : null) ?? this.active ?? this.latestEpisode;
    if (!episode) return;
    if (itemId && !this.openaiItems.has(itemId)) this.openaiItems.set(itemId, episode);
    if (episode.timings.openaiFirstTextMs === null) { episode.openaiFirstDeltaAt = at; episode.timings.openaiFirstTextMs = at - episode.gateOpenedAt; }
    episode.openaiText += delta; this.score(episode); this.publish();
  }
  openaiCommitted(itemId: string) {
    const episode = this.episodes.find((item) => item.gateClosedAt !== null && !item.openaiItemId) ?? this.latestEpisode;
    if (episode) { episode.openaiItemId = itemId; this.openaiItems.set(itemId, episode); while (this.openaiItems.size > 25) this.openaiItems.delete(this.openaiItems.keys().next().value!); }
  }
  openaiCompleted(text: string, itemId: string, at = this.now()) {
    const episode = this.openaiItems.get(itemId) ?? this.latestEpisode;
    if (!episode) return;
    if (itemId) this.openaiItems.delete(itemId);
    episode.openaiCompletedAt = at; episode.openaiText = text; episode.openaiItemId = itemId || null; episode.timings.openaiFinalMs = at - episode.gateOpenedAt; episode.timings.gateCloseToOpenaiFinalMs = episode.gateClosedAt === null ? null : at - episode.gateClosedAt; this.score(episode); this.publish();
  }
  private score(episode: Episode) {
    if (!episode.reference) { delete episode.scores; return; }
    episode.scores = { assemblyWer: normalizedWer(episode.reference, episode.assemblyText), openaiWer: normalizedWer(episode.reference, episode.openaiText), assemblyEntities: scoreEntities(episode.assemblyText, episode.entities), openaiEntities: scoreEntities(episode.openaiText, episode.entities) };
  }
  private publish() {
    if (this.active && !this.episodes.includes(this.active)) this.episodes.push(this.active);
    if (this.episodes.length > 25) this.episodes.splice(0, this.episodes.length - 25);
    this.onChange(this.view);
  }
}
