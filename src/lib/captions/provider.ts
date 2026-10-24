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

type AssemblyAIWord = { start?: number; end?: number; confidence?: number; speaker?: string; text?: string };
type AssemblyAIMessage = {
  type?: string;
  id?: string;
  turn_order?: number;
  end_of_turn?: boolean;
  transcript?: string;
  utterance?: string;
  end_of_turn_confidence?: number;
  speaker_label?: string | null;
  words?: AssemblyAIWord[];
  revisions?: Array<{ turn_order?: number; speaker_label?: string | null; words?: AssemblyAIWord[] }>;
  error?: string;
};

const ASSEMBLYAI_WS_URL = "wss://streaming.assemblyai.com/v3/ws";
const MAX_REMEMBERED_TURN_TEXTS = 512;
export const TABLE_ASSEMBLYAI_OPTIONS = {
  speechModel: "universal-streaming-english",
  diarization: true,
} as const;
// Connected Mode uses one host room microphone with the Table model and
// diarization. Mid-session revisions (minimum 120 s of audio) let session-local
// voice identities follow AssemblyAI's speaker reclustering.
export const CONNECTED_ROOM_ASSEMBLYAI_OPTIONS = {
  ...TABLE_ASSEMBLYAI_OPTIONS,
  revisionIntervalMs: 120_000,
} as const;
export type VoiceFocusProfile = "near-field" | "far-field";
export type AssemblyAIStreamingOptions = {
  diarization?: boolean;
  speechModel?: string;
  voiceFocus?: VoiceFocusProfile;
  mode?: "min_latency" | "balanced" | "max_accuracy";
  revisionIntervalMs?: number;
  interruptionDelayMs?: number;
  minTurnSilenceMs?: number;
  maxTurnSilenceMs?: number;
};

export function connectedVoiceFocusProfile(value = typeof process === "undefined" ? undefined : process.env.NEXT_PUBLIC_CONNECTED_VOICE_FOCUS_PROFILE): VoiceFocusProfile {
  return value === "near-field" ? "near-field" : "far-field";
}

export function connectedAssemblyAIOptions(profile = connectedVoiceFocusProfile()): Required<Pick<AssemblyAIStreamingOptions, "speechModel" | "diarization" | "voiceFocus" | "mode">> {
  return { speechModel: "universal-3-6-pro", diarization: false, voiceFocus: profile, mode: "balanced" };
}
export const HEADSET_ASSEMBLYAI_OPTIONS = {
  ...connectedAssemblyAIOptions("near-field"),
  interruptionDelayMs: 0,
  minTurnSilenceMs: 100,
  maxTurnSilenceMs: 1000,
} as const;

export class AssemblyAIStreamingProvider implements StreamingTranscriptionProvider {
  private socket: WebSocket | null = null;
  private readonly captionListeners = new Set<(event: TranscriptionEvent) => void>();
  private readonly statusListeners = new Set<(status: ProviderStatus) => void>();
  private intentionallyTerminated = false;
  private sessionStartedAt = Date.now();
  private readonly connectionId: string;
  private fallbackTurnCounter = 0;
  private readonly finalTurnTexts = new Map<number, string>();

  private readonly options: Required<Pick<AssemblyAIStreamingOptions, "speechModel" | "diarization">> & Pick<AssemblyAIStreamingOptions, "voiceFocus" | "mode" | "revisionIntervalMs" | "interruptionDelayMs" | "minTurnSilenceMs" | "maxTurnSilenceMs">;

  constructor(private readonly token: string, connectionId = createProviderConnectionId(), options: AssemblyAIStreamingOptions | boolean = TABLE_ASSEMBLYAI_OPTIONS) {
    this.connectionId = connectionId;
    this.options = typeof options === "boolean"
      ? { speechModel: TABLE_ASSEMBLYAI_OPTIONS.speechModel, diarization: options }
      : { speechModel: options.speechModel ?? TABLE_ASSEMBLYAI_OPTIONS.speechModel, diarization: options.diarization ?? TABLE_ASSEMBLYAI_OPTIONS.diarization,
          voiceFocus: options.voiceFocus, mode: options.mode, revisionIntervalMs: options.revisionIntervalMs, interruptionDelayMs: options.interruptionDelayMs, minTurnSilenceMs: options.minTurnSilenceMs, maxTurnSilenceMs: options.maxTurnSilenceMs };
  }

  connect(): Promise<void> {
    this.intentionallyTerminated = false;
    this.sessionStartedAt = Date.now();
    const params = new URLSearchParams({
      token: this.token,
      sample_rate: "16000",
      speech_model: this.options.speechModel,
      format_turns: "true",
      speaker_labels: String(this.options.diarization),
    });
    if (this.options.voiceFocus) params.set("voice_focus", this.options.voiceFocus);
    if (this.options.mode) params.set("mode", this.options.mode);
    if (this.options.diarization && this.options.revisionIntervalMs) params.set("speaker_labels_revision_interval_ms", String(this.options.revisionIntervalMs));
    if (this.options.interruptionDelayMs !== undefined) params.set("interruption_delay", String(this.options.interruptionDelayMs));
    if (this.options.minTurnSilenceMs !== undefined) params.set("min_turn_silence", String(this.options.minTurnSilenceMs));
    if (this.options.maxTurnSilenceMs !== undefined) params.set("max_turn_silence", String(this.options.maxTurnSilenceMs));

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
        // Provider word offsets count from the first audio received after open.
        this.sessionStartedAt = Date.now();
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
      const category = this.options.voiceFocus ? "connected_voice_focus_configuration_rejected" : "provider_configuration_rejected";
      this.emitStatus({ type: "error", message: `AssemblyAI rejected the streaming configuration (${category}).` });
      return;
    }
    if (message.type === "Termination") {
      this.emitStatus({ type: "terminated" });
      return;
    }
    if (message.type === "SpeakerRevision" && Array.isArray(message.revisions)) {
      for (const revision of message.revisions) this.emitRevision(revision);
      return;
    }
    if (message.type !== "Turn" && message.type !== "SpeakerRevision") return;
    if (typeof message.transcript !== "string" && !message.words?.length) return;
    if (message.type === "SpeakerRevision") {
      this.emitRevision(message);
      return;
    }

    const sourceTurnId = this.sourceTurnId(message.turn_order);
    const captions = normalizeTurn(message, sourceTurnId, this.connectionId, this.sessionStartedAt, message.end_of_turn === true);
    if (message.end_of_turn === true) {
      this.rememberFinalText(message);
      this.emitEvent({ type: "final_turn", sourceTurnId, captions });
    } else if (captions[0]) {
      this.emitEvent({ type: "interim", caption: captions[0] });
    }
  }

  // Revisions change speaker assignments only; text and timestamps are unchanged,
  // so the formatted final transcript is reused when the turn has one speaker.
  private emitRevision(revision: Pick<AssemblyAIMessage, "turn_order" | "speaker_label" | "words" | "transcript">): void {
    if (typeof revision.turn_order !== "number" || (!revision.words?.length && typeof revision.transcript !== "string")) return;
    const sourceTurnId = this.sourceTurnId(revision.turn_order);
    const transcript = this.finalTurnTexts.get(revision.turn_order) ?? revision.transcript;
    const captions = normalizeTurn({ ...revision, transcript }, sourceTurnId, this.connectionId, this.sessionStartedAt, true);
    if (captions.length) this.emitEvent({ type: "speaker_revision", sourceTurnId, captions });
  }

  private rememberFinalText(message: AssemblyAIMessage): void {
    const text = message.utterance?.trim() || message.transcript?.trim();
    if (typeof message.turn_order !== "number" || !text) return;
    this.finalTurnTexts.delete(message.turn_order);
    this.finalTurnTexts.set(message.turn_order, text);
    if (this.finalTurnTexts.size > MAX_REMEMBERED_TURN_TEXTS) this.finalTurnTexts.delete(this.finalTurnTexts.keys().next().value!);
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

export function normalizeSpeakerId(connectionId: string, label: string | null | undefined): string | null {
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
  // A word without a `speaker` field is unattributed and inherits the turn label.
  const wordSpeakerId = (word: AssemblyAIWord) => normalizeSpeakerId(connectionId, word.speaker ?? message.speaker_label);
  const hasSpeakerChange = words.length > 1 && new Set(words.map(wordSpeakerId)).size > 1;

  if (!hasSpeakerChange) {
    const speakerId = turnSpeakerId ?? (firstWord ? wordSpeakerId(firstWord) : null);
    return fullText
      ? [{
          id: `${sourceTurnId}/segment/0`,
          sourceTurnId,
          text: fullText,
          speakerId,
          startedAt,
          endedAt: finalized ? sessionStartedAt + (lastWord?.end ?? 0) : undefined,
          audioEndAt: lastWord?.end === undefined ? undefined : sessionStartedAt + lastWord.end,
          isFinal: finalized,
          confidence: message.end_of_turn_confidence,
          recognitionConfidence: meanWordConfidence(words),
          sourceId: "assemblyai",
        }]
      : [];
  }

  const segments: CaptionEvent[] = [];
  let current: { speakerId: string | null; words: AssemblyAIWord[] } | null = null;
  for (const word of words) {
    const speakerId = wordSpeakerId(word);
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
      segment.recognitionConfidence = meanWordConfidence(current.words);
      segment.endedAt = finalized ? sessionStartedAt + (word.end ?? word.start ?? 0) : undefined;
      segment.audioEndAt = word.end === undefined ? undefined : sessionStartedAt + word.end;
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

function meanWordConfidence(words: NonNullable<AssemblyAIMessage["words"]>): number | undefined {
  const values = words.map((word) => word.confidence).filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

function createProviderConnectionId(): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `assemblyai/${random}`;
}

export function createAssemblyAIProvider(token: string): StreamingTranscriptionProvider {
  return new AssemblyAIStreamingProvider(token);
}
