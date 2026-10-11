import type { CaptionEvent, TranscriptionEvent } from "./types";

export type ProviderStatus =
  | { type: "connected" }
  | { type: "terminated" }
  | { type: "closed" }
  | { type: "error"; message: string };

export interface StreamingTranscriptionProvider {
  connect(): Promise<void>;
  sendAudio(chunk: ArrayBuffer): void;
  terminate(): Promise<void>;
  onEvent(listener: (event: TranscriptionEvent) => void): () => void;
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
  speaker_label?: string;
  words?: Array<{ start?: number; end?: number; confidence?: number; speaker?: string; text?: string }>;
  error?: string;
};

const ASSEMBLYAI_WS_URL = "wss://streaming.assemblyai.com/v3/ws";
const ASSEMBLYAI_MODEL = "universal-streaming-english";

export class AssemblyAIStreamingProvider implements StreamingTranscriptionProvider {
  private socket: WebSocket | null = null;
  private readonly captionListeners = new Set<(event: TranscriptionEvent) => void>();
  private readonly statusListeners = new Set<(status: ProviderStatus) => void>();
  private intentionallyTerminated = false;
  private sessionStartedAt = Date.now();
  private readonly connectionId: string;
  private fallbackTurnCounter = 0;

  constructor(private readonly token: string, connectionId = createProviderConnectionId(), private readonly diarization = true) {
    this.connectionId = connectionId;
  }

  connect(): Promise<void> {
    this.intentionallyTerminated = false;
    this.sessionStartedAt = Date.now();
    const params = new URLSearchParams({
      token: this.token,
      sample_rate: "16000",
      speech_model: ASSEMBLYAI_MODEL,
      format_turns: "true",
      speaker_labels: String(this.diarization),
    });

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`${ASSEMBLYAI_WS_URL}?${params.toString()}`);
      this.socket = socket;
      let settled = false;
      const connectionTimeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("The speech service connection timed out."));
        socket.close();
      }, 12000);
      socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        window.clearTimeout(connectionTimeout);
        settled = true;
        this.emitStatus({ type: "connected" });
        resolve();
      };
      socket.onmessage = (message) => this.handleMessage(message.data);
      socket.onerror = () => {
        window.clearTimeout(connectionTimeout);
        const error = new Error("The speech service connection failed.");
        this.emitStatus({ type: "error", message: error.message });
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      socket.onclose = () => {
        window.clearTimeout(connectionTimeout);
        this.socket = null;
        if (!settled) { settled = true; reject(new Error("The speech connection closed before it was ready.")); }
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
        const timeout = window.setTimeout(resolve, 5_000);
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

  onEvent(listener: (event: TranscriptionEvent) => void): () => void {
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
    if (message.type !== "Turn" && message.type !== "SpeakerRevision") return;
    if (typeof message.transcript !== "string" && !message.words?.length) return;

    const sourceTurnId = this.sourceTurnId(message.turn_order);
    const captions = normalizeTurn(message, sourceTurnId, this.connectionId, this.sessionStartedAt, message.type === "SpeakerRevision" || message.end_of_turn === true);
    if (message.type === "SpeakerRevision") {
      this.emitEvent({ type: "speaker_revision", sourceTurnId, captions });
    } else if (message.end_of_turn === true) {
      this.emitEvent({ type: "final_turn", sourceTurnId, captions });
    } else if (captions[0]) {
      this.emitEvent({ type: "interim", caption: captions[0] });
    }
  }

  private sourceTurnId(turnOrder: number | undefined): string {
    return `${this.connectionId}/turn/${turnOrder ?? `auto-${++this.fallbackTurnCounter}`}`;
  }

  private emitEvent(event: TranscriptionEvent): void {
    this.captionListeners.forEach((listener) => listener(event));
  }

  private emitStatus(status: ProviderStatus): void {
    this.statusListeners.forEach((listener) => listener(status));
  }
}

const UNRESOLVED_SPEAKER_LABELS = new Set(["", "UNKNOWN", "PENDING"]);

export function normalizeSpeakerId(connectionId: string, label: string | undefined): string | null {
  const normalized = label?.trim().toUpperCase() ?? "";
  if (UNRESOLVED_SPEAKER_LABELS.has(normalized)) return null;
  return `${connectionId}/speaker/s${stableSpeakerHash(normalized)}`;
}

function stableSpeakerHash(label: string): string {
  let hash = 2166136261;
  for (const character of label) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeTurn(message: AssemblyAIMessage, sourceTurnId: string, connectionId: string, sessionStartedAt: number, finalized: boolean): CaptionEvent[] {
  const words = message.words?.filter((word) => word.text?.trim()) ?? [];
  const turnSpeakerId = normalizeSpeakerId(connectionId, message.speaker_label);
  const firstWord = words[0];
  const lastWord = words.at(-1);
  const startedAt = sessionStartedAt + (firstWord?.start ?? 0);
  const fullText = message.utterance?.trim() || message.transcript?.trim() || words.map((word) => word.text?.trim()).join(" ") || "";
  const hasSpeakerChange = words.length > 1 && new Set(words.map((word) => normalizeSpeakerId(connectionId, word.speaker))).size > 1;

  if (!hasSpeakerChange) {
    const speakerId = turnSpeakerId ?? normalizeSpeakerId(connectionId, firstWord?.speaker);
    return fullText
      ? [{
          id: `${sourceTurnId}/segment/0`,
          sourceTurnId,
          text: fullText,
          speakerId,
          startedAt,
          endedAt: finalized ? sessionStartedAt + (lastWord?.end ?? 0) : undefined,
          isFinal: finalized,
          confidence: message.end_of_turn_confidence,
          sourceId: "assemblyai",
        }]
      : [];
  }

  const segments: CaptionEvent[] = [];
  let current: { speakerId: string | null; words: NonNullable<AssemblyAIMessage["words"]> } | null = null;
  for (const word of words) {
    const speakerId = normalizeSpeakerId(connectionId, word.speaker);
    if (!current || current.speakerId !== speakerId) {
      current = { speakerId, words: [] };
      segments.push({
        id: `${sourceTurnId}/segment/${segments.length}`,
        sourceTurnId,
        text: "",
        speakerId,
        startedAt: sessionStartedAt + (word.start ?? 0),
        isFinal: finalized,
        confidence: message.end_of_turn_confidence,
        sourceId: "assemblyai",
      });
    }
    current.words.push(word);
    const segment = segments.at(-1);
    if (segment) {
      segment.text = joinWords(current.words.map((item) => item.text?.trim() ?? ""));
      segment.endedAt = finalized ? sessionStartedAt + (word.end ?? word.start ?? 0) : undefined;
    }
  }
  return segments.filter((segment) => segment.text);
}

function joinWords(words: string[]): string {
  return words.reduce((text, word) => {
    if (!text) return word;
    if (/^[,.;!?%:)]/.test(word)) return `${text}${word}`;
    if (/^[’']/.test(word)) return `${text}${word}`;
    return `${text} ${word}`;
  }, "");
}

function createProviderConnectionId(): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `assemblyai/${random}`;
}

export function createAssemblyAIProvider(token: string): StreamingTranscriptionProvider {
  return new AssemblyAIStreamingProvider(token);
}
