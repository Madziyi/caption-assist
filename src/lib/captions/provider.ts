import type { CaptionEvent } from "./types";

export type ProviderStatus =
  | { type: "connected" }
  | { type: "terminated" }
  | { type: "closed" }
  | { type: "error"; message: string };

export interface StreamingTranscriptionProvider {
  connect(): Promise<void>;
  sendAudio(chunk: ArrayBuffer): void;
  terminate(): Promise<void>;
  onEvent(listener: (event: CaptionEvent) => void): () => void;
  onStatus(listener: (status: ProviderStatus) => void): () => void;
}

type AssemblyAIMessage = {
  type?: string;
  id?: string;
  turn_order?: number;
  end_of_turn?: boolean;
  transcript?: string;
  utterance?: string;
  end_of_turn_confidence?: number;
  words?: Array<{ start?: number; end?: number; confidence?: number }>;
  error?: string;
};

const ASSEMBLYAI_WS_URL = "wss://streaming.assemblyai.com/v3/ws";
const ASSEMBLYAI_MODEL = "universal-streaming-english";

export class AssemblyAIStreamingProvider implements StreamingTranscriptionProvider {
  private socket: WebSocket | null = null;
  private readonly captionListeners = new Set<(event: CaptionEvent) => void>();
  private readonly statusListeners = new Set<(status: ProviderStatus) => void>();
  private intentionallyTerminated = false;
  private sessionStartedAt = Date.now();

  constructor(private readonly token: string) {}

  connect(): Promise<void> {
    this.intentionallyTerminated = false;
    this.sessionStartedAt = Date.now();
    const params = new URLSearchParams({
      token: this.token,
      sample_rate: "16000",
      speech_model: ASSEMBLYAI_MODEL,
      format_turns: "true",
    });

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`${ASSEMBLYAI_WS_URL}?${params.toString()}`);
      this.socket = socket;
      let settled = false;
      socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        settled = true;
        this.emitStatus({ type: "connected" });
        resolve();
      };
      socket.onmessage = (message) => this.handleMessage(message.data);
      socket.onerror = () => {
        const error = new Error("The speech service connection failed.");
        this.emitStatus({ type: "error", message: error.message });
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      socket.onclose = () => {
        this.socket = null;
        if (!this.intentionallyTerminated) this.emitStatus({ type: "closed" });
      };
    });
  }

  sendAudio(chunk: ArrayBuffer): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(chunk);
  }

  async terminate(): Promise<void> {
    this.intentionallyTerminated = true;
    const socket = this.socket;
    if (!socket) return;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "Terminate" }));
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 1_500);
        const previousOnClose = socket.onclose;
        socket.onclose = (event) => {
          window.clearTimeout(timeout);
          previousOnClose?.call(socket, event);
          resolve();
        };
      });
    }
    if (socket.readyState !== WebSocket.CLOSED) socket.close();
    this.socket = null;
  }

  onEvent(listener: (event: CaptionEvent) => void): () => void {
    this.captionListeners.add(listener);
    return () => this.captionListeners.delete(listener);
  }

  onStatus(listener: (status: ProviderStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private handleMessage(rawMessage: unknown): void {
    if (typeof rawMessage !== "string") return;
    let message: AssemblyAIMessage;
    try {
      message = JSON.parse(rawMessage) as AssemblyAIMessage;
    } catch {
      this.emitStatus({ type: "error", message: "The speech service returned an unreadable message." });
      return;
    }

    if (message.type === "Error") {
      this.emitStatus({ type: "error", message: "The speech service reported an error." });
      return;
    }
    if (message.type === "Termination") {
      this.emitStatus({ type: "terminated" });
      return;
    }
    if (message.type !== "Turn" || typeof message.transcript !== "string") return;

    const firstWord = message.words?.[0];
    const lastWord = message.words?.at(-1);
    const startedAt = this.sessionStartedAt + (firstWord?.start ?? 0);
    const event: CaptionEvent = {
      id: `assemblyai:${message.turn_order ?? startedAt}`,
      text: message.utterance?.trim() || message.transcript.trim(),
      speakerId: null,
      startedAt,
      endedAt: message.end_of_turn ? this.sessionStartedAt + (lastWord?.end ?? 0) : undefined,
      isFinal: message.end_of_turn === true,
      confidence: message.end_of_turn_confidence,
      sourceId: "assemblyai",
    };
    this.captionListeners.forEach((listener) => listener(event));
  }

  private emitStatus(status: ProviderStatus): void {
    this.statusListeners.forEach((listener) => listener(status));
  }
}

export function createAssemblyAIProvider(token: string): StreamingTranscriptionProvider {
  return new AssemblyAIStreamingProvider(token);
}
