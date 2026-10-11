export type CaptionEvent = {
  id: string;
  text: string;
  speakerId: string | null;
  startedAt: number;
  endedAt?: number;
  isFinal: boolean;
  confidence?: number;
  sourceId?: string;
  sourceTurnId?: string;
  ingestOrder?: number;
};

export type IdentityOrigin = "diarized" | "connected-participant" | "connected-host";

export type SpeakerProfile = {
  id: string;
  ordinal: number;
  displayName: string | null;
  side: "left" | "right";
  accentIndex: number;
  identityOrigin?: IdentityOrigin;
};

export type TranscriptionEvent =
  | { type: "interim"; caption: CaptionEvent }
  | { type: "final_turn"; sourceTurnId: string; captions: CaptionEvent[] }
  | { type: "speaker_revision"; sourceTurnId: string; captions: CaptionEvent[] };

export type SessionStatus =
  | "idle"
  | "requesting_permission"
  | "connecting"
  | "listening"
  | "reconnecting"
  | "stopping"
  | "ended"
  | "error";

export type SessionErrorCode =
  | "microphone_denied"
  | "microphone_unavailable"
  | "configuration_missing"
  | "temporary_token_failure"
  | "provider_connection_failure"
  | "provider_failure"
  | "reconnect_exhausted"
  | "unknown";

export type SessionError = {
  code: SessionErrorCode;
  message: string;
  recoverable: boolean;
};

export type CaptionState = {
  status: SessionStatus;
  finalized: CaptionEvent[];
  interim: CaptionEvent | null;
  activeInterims: Record<string, CaptionEvent>;
  speakers: SpeakerProfile[];
  error: SessionError | null;
  reconnectAttempt: number;
};
