import type { CaptionEvent, CaptionState, SessionError } from "./types";

export const initialCaptionState: CaptionState = {
  status: "idle",
  finalized: [],
  interim: null,
  error: null,
  reconnectAttempt: 0,
};

export type CaptionAction =
  | { type: "START" }
  | { type: "CONNECTING" }
  | { type: "LISTENING" }
  | { type: "CAPTION"; event: CaptionEvent }
  | { type: "RECONNECTING"; attempt: number }
  | { type: "STOPPING" }
  | { type: "ENDED" }
  | { type: "ERROR"; error: SessionError }
  | { type: "RESET" };

export function captionReducer(state: CaptionState, action: CaptionAction): CaptionState {
  switch (action.type) {
    case "START":
      return { ...initialCaptionState, status: "requesting_permission" };
    case "CONNECTING":
      return { ...state, status: "connecting", error: null };
    case "LISTENING":
      return { ...state, status: "listening", error: null, reconnectAttempt: 0 };
    case "CAPTION":
      return applyCaptionEvent(state, action.event);
    case "RECONNECTING":
      return { ...state, status: "reconnecting", interim: null, error: null, reconnectAttempt: action.attempt };
    case "STOPPING":
      return { ...state, status: "stopping", interim: null };
    case "ENDED":
      return { ...state, status: "ended", interim: null, error: null, reconnectAttempt: 0 };
    case "ERROR":
      return { ...state, status: "error", interim: null, error: action.error };
    case "RESET":
      return initialCaptionState;
  }
}

function applyCaptionEvent(state: CaptionState, event: CaptionEvent): CaptionState {
  const text = event.text.trim();
  if (!text) return state;

  const normalizedEvent = { ...event, text };
  if (!event.isFinal) {
    return { ...state, interim: normalizedEvent };
  }

  if (state.finalized.some((caption) => caption.id === event.id)) {
    return { ...state, interim: state.interim?.id === event.id ? null : state.interim };
  }

  return {
    ...state,
    finalized: [...state.finalized, normalizedEvent],
    interim: state.interim?.id === event.id ? null : state.interim,
  };
}
