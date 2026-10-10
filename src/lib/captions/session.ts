import { MicrophoneCapture, MicrophoneCaptureError } from "../audio/microphone";
import { AssemblyAIStreamingProvider, type ProviderStatus, type StreamingTranscriptionProvider } from "./provider";
import type { CaptionAction } from "./reducer";
import type { SessionErrorCode } from "./types";

const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 4_000, 5_000];

export type ProviderFactory = (token: string) => StreamingTranscriptionProvider;

export class ConversationSession {
  private provider: StreamingTranscriptionProvider | null = null;
  private microphone: MicrophoneCapture | null = null;
  private active = false;
  private stopping = false;
  private reconnecting = false;
  private reconnectGeneration = 0;
  private readonly providerFactory: ProviderFactory;

  constructor(private readonly dispatch: (action: CaptionAction) => void, providerFactory: ProviderFactory = (token) => new AssemblyAIStreamingProvider(token)) {
    this.providerFactory = providerFactory;
  }

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.stopping = false;
    this.reconnecting = false;
    this.reconnectGeneration += 1;
    this.dispatch({ type: "START" });

    try {
      this.microphone = new MicrophoneCapture((chunk) => this.provider?.sendAudio(chunk));
      await this.microphone.start();
      await this.connectProvider();
    } catch (error) {
      await this.fail(mapSessionError(error));
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.active && !this.microphone && !this.provider) return;
    this.active = false;
    this.stopping = true;
    this.reconnectGeneration += 1;
    this.dispatch({ type: "STOPPING" });
    const provider = this.provider;
    this.provider = null;
    try {
      await provider?.terminate();
    } catch {
      // Cleanup continues even if the provider socket is already unavailable.
    } finally {
      await this.microphone?.stop();
    }
    this.microphone = null;
    this.reconnecting = false;
    this.dispatch({ type: "ENDED" });
  }

  async retry(): Promise<void> {
    await this.stop();
    await this.start();
  }

  private async connectProvider(): Promise<void> {
    this.dispatch({ type: "CONNECTING" });
    const tokenResponse = await fetch("/api/transcription/session", { method: "POST" });
    const payload = (await tokenResponse.json()) as { token?: string; code?: SessionErrorCode; message?: string };
    if (!tokenResponse.ok || !payload.token) {
      const code = payload.code === "configuration_missing" ? "configuration_missing" : "temporary_token_failure";
      throw new SessionFailure(code, payload.message ?? "The speech service could not be prepared. Try again.");
    }

    const provider = this.providerFactory(payload.token);
    this.provider = provider;
    provider.onEvent((event) => this.dispatch({ type: "CAPTION", event }));
    provider.onStatus((status) => this.handleProviderStatus(status));
    try {
      await provider.connect();
    } catch (error) {
      this.provider = null;
      await provider.terminate().catch(() => undefined);
      throw new SessionFailure("provider_connection_failure", error instanceof Error ? error.message : "The speech service could not be reached.");
    }
    if (this.active && !this.stopping) this.dispatch({ type: "LISTENING" });
  }

  private handleProviderStatus(status: ProviderStatus): void {
    if (status.type === "connected") {
      if (this.active && !this.stopping) this.dispatch({ type: "LISTENING" });
      return;
    }
    if (status.type === "terminated") return;
    if (status.type === "error") {
      if (this.active && !this.stopping) void this.reconnect(new SessionFailure("provider_failure", status.message));
      return;
    }
    if (status.type === "closed" && this.active && !this.stopping) void this.reconnect(new SessionFailure("provider_connection_failure", "The speech connection was interrupted."));
  }

  private async reconnect(cause: SessionFailure): Promise<void> {
    if (this.reconnecting || !this.active || this.stopping) return;
    this.reconnecting = true;
    const generation = this.reconnectGeneration;
    this.provider = null;
    for (let attempt = 1; attempt <= RECONNECT_DELAYS_MS.length; attempt += 1) {
      if (!this.active || this.stopping || generation !== this.reconnectGeneration) return;
      this.dispatch({ type: "RECONNECTING", attempt });
      await delay(RECONNECT_DELAYS_MS[attempt - 1] ?? 5_000);
      try {
        await this.connectProvider();
        this.reconnecting = false;
        return;
      } catch {
        // The bounded loop below exposes a recoverable error after the final attempt.
      }
    }
    this.reconnecting = false;
    await this.fail(new SessionFailure("reconnect_exhausted", `${cause.message} Retry the conversation or end it.`));
  }

  private async fail(error: SessionFailure): Promise<void> {
    this.active = false;
    this.reconnecting = false;
    const provider = this.provider;
    this.provider = null;
    await provider?.terminate().catch(() => undefined);
    await this.microphone?.stop();
    this.microphone = null;
    this.dispatch({ type: "ERROR", error: { code: error.code, message: error.message, recoverable: true } });
  }
}

class SessionFailure extends Error {
  constructor(public readonly code: SessionErrorCode, message: string) {
    super(message);
    this.name = "SessionFailure";
  }
}

function mapSessionError(error: unknown): SessionFailure {
  if (error instanceof SessionFailure) return error;
  if (error instanceof MicrophoneCaptureError) return new SessionFailure(error.code, error.message);
  return new SessionFailure("unknown", "The conversation could not be started. Try again.");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
