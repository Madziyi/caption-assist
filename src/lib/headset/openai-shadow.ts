export type OpenAIShadowCallbacks = {
  onState(state: "connecting" | "on" | "unavailable"): void;
  onDelta(delta: string, at: number, itemId?: string): void;
  onCommitted(itemId: string): void;
  onCompleted(text: string, itemId: string, at: number): void;
};
type Deps = { fetch?: typeof fetch; session?: () => Promise<{ access_token: string }>; WebSocket?: typeof WebSocket; now?: () => number };
const URL = "wss://api.openai.com/v1/realtime?intent=transcription";

/** Optional, isolated Realtime transcription path. It never publishes captions. */
export class OpenAIShadowTranscriber {
  private socket: WebSocket | null = null;
  private closed = false;
  private readonly now: () => number;
  constructor(private readonly roomId: string, private readonly callbacks: OpenAIShadowCallbacks, private readonly deps: Deps = {}) { this.now = deps.now ?? (() => performance.now()); }

  async start(): Promise<void> {
    if (this.socket) return;
    this.closed = false;
    this.callbacks.onState("connecting");
    try {
      const session = await (this.deps.session ?? defaultSession)();
      const fetcher = this.deps.fetch ?? globalThis.fetch;
      const response = await fetcher(`/api/transcription/openai-realtime-secret?roomId=${encodeURIComponent(this.roomId)}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(12000) });
      const data = await response.json() as { ephemeralKey?: string };
      if (!response.ok || !data.ephemeralKey) throw new Error("Shadow credential unavailable");
      if (this.closed) return;
      const Socket = this.deps.WebSocket ?? globalThis.WebSocket;
      const socket = new Socket(URL, ["realtime", `openai-insecure-api-key.${data.ephemeralKey}`]);
      this.socket = socket;
      socket.onopen = () => { if (!this.closed && this.socket === socket) this.callbacks.onState("on"); };
      socket.onmessage = (message) => this.onMessage(message.data);
      socket.onerror = () => this.fail();
      socket.onclose = () => { if (!this.closed) this.fail(); };
    } catch { this.fail(); }
  }

  appendAudio(pcm24k: ArrayBuffer): boolean {
    const socket = this.socket;
    if (!socket || socket.readyState !== (this.deps.WebSocket ?? globalThis.WebSocket).OPEN || !pcm24k.byteLength) return false;
    try { socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: toBase64(pcm24k) })); return true; } catch { this.fail(); return false; }
  }

  commit(): boolean {
    const socket = this.socket;
    if (!socket || socket.readyState !== (this.deps.WebSocket ?? globalThis.WebSocket).OPEN) return false;
    try { socket.send(JSON.stringify({ type: "input_audio_buffer.commit" })); return true; } catch { this.fail(); return false; }
  }

  setKeywords(keywords: string[]): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== (this.deps.WebSocket ?? globalThis.WebSocket).OPEN) return;
    try { socket.send(JSON.stringify({ type: "session.update", session: { type: "transcription", audio: { input: { format: { type: "audio/pcm", rate: 24000 }, noise_reduction: null, transcription: { model: "gpt-live-transcribe", delay: "low", languages: ["en"], prompt: "Live accessibility captions for an in-person conversation.", keywords: keywords.slice(0, 20) }, turn_detection: null } } } })); } catch { this.fail(); }
  }

  async stop(): Promise<void> { this.closed = true; const socket = this.socket; this.socket = null; if (socket && socket.readyState < 2) socket.close(); }

  private onMessage(raw: unknown) {
    if (typeof raw !== "string") return;
    try {
      const event = JSON.parse(raw) as { type?: string; delta?: string; transcript?: string; item_id?: string };
      if (event.type === "input_audio_buffer.committed" && event.item_id) this.callbacks.onCommitted(event.item_id);
      else if (event.type === "conversation.item.input_audio_transcription.delta" && event.delta) this.callbacks.onDelta(event.delta, this.now(), event.item_id);
      else if (event.type === "conversation.item.input_audio_transcription.completed") this.callbacks.onCompleted(event.transcript ?? "", event.item_id ?? "", this.now());
      else if (event.type === "conversation.item.input_audio_transcription.failed" || event.type === "error") this.fail();
    } catch { /* Ignore non-JSON provider frames; no provider payloads are logged. */ }
  }

  private fail() { if (this.closed) return; this.closed = true; const socket = this.socket; this.socket = null; if (socket && socket.readyState < 2) socket.close(); this.callbacks.onState("unavailable"); }
}

async function defaultSession() {
  const { technicalSession } = await import("../rooms/browser");
  return technicalSession();
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start, Math.min(bytes.length, start + 0x8000)));
  return btoa(binary);
}
