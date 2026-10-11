import { HEADSET_ASSEMBLYAI_OPTIONS, AssemblyAIStreamingProvider, type StreamingTranscriptionProvider } from "../captions/provider";
import type { CaptionEvent, TranscriptionEvent } from "../captions/types";
import { technicalSession } from "../rooms/browser";

export type SttState = "off" | "connecting" | "on" | "reconnecting" | "failed";
export type HeadsetTranscriberLike = { start(): Promise<void>; sendFrame(frame: ArrayBuffer): void; stop(): Promise<void>; retry?(): Promise<void> };
type Deps = {
  providerFactory?: (token: string, streamId: string) => StreamingTranscriptionProvider;
  fetch?: typeof fetch;
  session?: () => Promise<{ access_token: string }>;
  setTimeout?: typeof globalThis.setTimeout;
};

export class HeadsetTranscriber implements HeadsetTranscriberLike {
  private provider: StreamingTranscriptionProvider | null = null;
  private generation = 0;
  private active = false;
  private reconnecting = false;
  private readonly setTimer: typeof setTimeout;
  constructor(private readonly roomId: string, private readonly publish: (event: TranscriptionEvent) => void, private readonly onState: (state: SttState) => void, private readonly deps: Deps = {}) {
    this.setTimer = (deps.setTimeout ?? globalThis.setTimeout).bind(globalThis);
  }
  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    const generation = ++this.generation;
    try { await this.connectProvider(generation, false); }
    catch { if (this.current(generation)) this.onState("failed"); }
  }
  async retry(): Promise<void> { await this.stop(); await this.start(); }
  sendFrame(frame: ArrayBuffer): void { if (this.active) this.provider?.sendAudio(frame); }
  async stop(): Promise<void> {
    this.active = false;
    ++this.generation;
    const provider = this.provider;
    this.provider = null;
    await provider?.terminate().catch(() => undefined);
    this.onState("off");
  }
  private current(generation: number) { return this.active && this.generation === generation; }
  private async connectProvider(generation: number, retrying: boolean): Promise<void> {
    if (!this.current(generation)) return;
    this.onState(retrying ? "reconnecting" : "connecting");
    const session = await (this.deps.session ?? technicalSession)();
    const fetcher = this.deps.fetch ?? globalThis.fetch;
    const response = await fetcher(`/api/transcription/session?roomId=${encodeURIComponent(this.roomId)}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(12000) });
    const data = await response.json() as { token?: string };
    if (!response.ok || !data.token) throw new Error("Speech authorization failed.");
    if (!this.current(generation)) return;
    const streamId = crypto.randomUUID();
    const provider = this.deps.providerFactory?.(data.token, streamId) ?? new AssemblyAIStreamingProvider(data.token, streamId, HEADSET_ASSEMBLYAI_OPTIONS);
    this.provider = provider;
    let connected = false;
    const turns = new Map<string, string>();
    const turnId = (raw: string) => { if (!turns.has(raw)) turns.set(raw, `${streamId}/turn/${turns.size + 1}`); return turns.get(raw)!; };
    const mapCaption = (caption: CaptionEvent, index: number, sourceTurnId: string): CaptionEvent => ({ ...caption, id: `${sourceTurnId}/segment/${index}`, sourceTurnId, sourceId: "personal", speakerId: null });
    const onEvent = (event: TranscriptionEvent) => {
      if (!this.current(generation) || this.provider !== provider) return;
      const rawTurn = event.type === "interim" ? event.caption.sourceTurnId ?? event.caption.id : event.sourceTurnId;
      const sourceTurnId = turnId(rawTurn);
      const normalized: TranscriptionEvent = event.type === "interim"
        ? { type: "interim", caption: mapCaption(event.caption, 0, sourceTurnId) }
        : { ...event, sourceTurnId, captions: event.captions.map((caption, index) => mapCaption(caption, index, sourceTurnId)) };
      this.publish(normalized);
    };
    provider.onEvent(onEvent);
    provider.onStatus((status) => {
      if (!this.current(generation) || this.provider !== provider) return;
      if (!connected) { if (status.type === "error") { this.provider = null; this.onState("failed"); } return; }
      if (["closed", "error", "terminated"].includes(status.type)) void this.reconnect(generation);
    });
    try { await provider.connect(); connected = true; if (this.current(generation)) this.onState("on"); }
    catch (error) { if (this.provider === provider) this.provider = null; await provider.terminate().catch(() => undefined); throw error; }
    if (!this.current(generation)) await provider.terminate();
  }
  private async reconnect(generation: number) {
    if (this.reconnecting || !this.current(generation)) return;
    this.reconnecting = true;
    const old = this.provider; this.provider = null;
    await old?.terminate().catch(() => undefined);
    try {
      for (const delay of [500, 1000, 2000]) {
        if (!this.current(generation)) return;
        this.onState("reconnecting");
        await new Promise<void>((resolve) => this.setTimer(resolve, delay));
        if (!this.current(generation)) return;
        try { await this.connectProvider(generation, true); return; } catch { /* bounded retry */ }
      }
      if (this.current(generation)) this.onState("failed");
    } finally { this.reconnecting = false; }
  }
}
