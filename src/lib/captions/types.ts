export type CaptionEvent = {
  id: string;
  text: string;
  speakerId: string | null;
  speakerName?: string;
  startedAt: number;
  endedAt?: number;
  isFinal: boolean;
  confidence?: number;
  sourceId?: string;
};

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
  error: SessionError | null;
  reconnectAttempt: number;
};
