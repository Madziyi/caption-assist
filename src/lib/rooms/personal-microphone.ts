import { MicrophoneCapture } from "../audio/microphone";
import { AssemblyAIStreamingProvider, type StreamingTranscriptionProvider } from "../captions/provider";
import type { TranscriptionEvent } from "../captions/types";
import { technicalSession } from "./browser";

export type PersonalMicrophoneState = "Muted" | "Connecting microphone" | "Microphone active" | "Reconnecting";
export class PersonalMicrophone {
  private capture: MicrophoneCapture | null = null;
  private provider: StreamingTranscriptionProvider | null = null;
  private generation = 0;
  private active = false;
  private reconnecting = false;

  constructor(private readonly roomId: string, private readonly publish: (event: TranscriptionEvent) => Promise<void>,
    private readonly onState: (state: PersonalMicrophoneState) => void, private readonly onError: (message: string) => void,
    private readonly providerFactory = (token: string): StreamingTranscriptionProvider => new AssemblyAIStreamingProvider(token, undefined, false),
    private readonly captureFactory = (onAudio: (chunk: ArrayBuffer) => void, onFailure: () => void) => new MicrophoneCapture(onAudio, onFailure)) {}

  async unmute(): Promise<void> {
    if (this.active) return;
    this.active = true;
    const generation = ++this.generation;
    this.onState("Connecting microphone");
    try {
      const capture = this.captureFactory((chunk) => { if (this.active) this.provider?.sendAudio(chunk); }, () => { void this.mute(); this.onError("Microphone capture was interrupted. Unmute to try again."); });
      this.capture = capture;
      await capture.start();
      if (!this.current(generation)) { await capture.stop(); return; }
      await this.connectProvider(generation);
      if (this.current(generation)) this.onState("Microphone active");
    } catch {
      if (this.current(generation)) {
        await this.mute(); this.onError("The microphone or speech service could not start. Check permission and try Unmute again.");
      }
    }
  }
  async mute(): Promise<void> {
    this.active = false;
    ++this.generation;
    const capture = this.capture; const provider = this.provider;
    this.capture = null; this.provider = null;
    // Stop capture immediately, before waiting for a provider termination response.
    await capture?.stop();
    this.onState("Muted");
    await provider?.terminate().catch(() => undefined);
  }
  private current(generation: number) { return this.active && this.generation === generation; }
  private async connectProvider(generation: number) {
    const session = await technicalSession();
    const response = await fetch(`/api/transcription/session?roomId=${encodeURIComponent(this.roomId)}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(12000) });
    const data = await response.json();
    if (!response.ok || !data.token) throw new Error("Speech authorization failed.");
    if (!this.current(generation)) return;
    const provider = this.providerFactory(data.token);
    this.provider = provider;
    let connected = false;
    const streamId = crypto.randomUUID();
    const turns = new Map<string, string>();
    const turnId = (raw: string) => {
      if (!turns.has(raw)) turns.set(raw, `${streamId}/turn/${turns.size + 1}`);
      return turns.get(raw)!;
    };
    provider.onEvent((event) => {
      if (!this.current(generation) || this.provider !== provider) return;
      const rawTurn = event.type === "interim" ? event.caption.sourceTurnId ?? event.caption.id : event.sourceTurnId;
      const sourceTurnId = turnId(rawTurn);
      const mapCaption = (caption: import("../captions/types").CaptionEvent, index: number) => ({ ...caption, id: `${sourceTurnId}/segment/${index}`, sourceTurnId, sourceId: "personal", speakerId: null });
      const normalized: TranscriptionEvent = event.type === "interim" ? { type: "interim", caption: mapCaption(event.caption, 0) }
        : { ...event, sourceTurnId, captions: event.captions.map(mapCaption) };
      void this.publish(normalized).catch(() => { void this.mute(); this.onError("Caption delivery was interrupted. Reconnect to the room."); });
    });
    provider.onStatus((status) => {
      if (connected && (status.type === "closed" || status.type === "error" || status.type === "terminated") && this.current(generation) && this.provider === provider) void this.reconnect(generation);
    });
    try { await provider.connect(); connected = true; }
    catch (error) { if (this.provider === provider) this.provider = null; await provider.terminate(); throw error; }
    if (!this.current(generation)) { await provider.terminate(); return; }
  }
  private async reconnect(generation: number) {
    if (this.reconnecting) return;
    this.reconnecting = true;
    const old = this.provider; this.provider = null;
    await old?.terminate().catch(() => undefined);
    try {
      for (const delay of [500, 1000, 2000]) {
        if (!this.current(generation)) return;
        this.onState("Reconnecting");
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (!this.current(generation)) return;
        try { await this.connectProvider(generation); if (this.current(generation)) this.onState("Microphone active"); return; } catch { /* Bounded STT retry; room membership remains intact. */ }
      }
      if (this.current(generation)) { await this.mute(); this.onError("Speech connection failed. Unmute to try again."); }
    } finally { this.reconnecting = false; }
  }
}
