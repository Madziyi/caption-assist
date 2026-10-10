import type { CaptionEvent, CaptionState, SessionError, SpeakerProfile, TranscriptionEvent } from "./types";

export const initialCaptionState: CaptionState = {
  status: "idle",
  finalized: [],
  interim: null,
  speakers: [],
  error: null,
  reconnectAttempt: 0,
};

export type CaptionAction =
  | { type: "START" }
  | { type: "CONNECTING" }
  | { type: "LISTENING" }
  | { type: "TRANSCRIPTION_EVENT"; event: TranscriptionEvent }
  | { type: "CAPTION"; event: CaptionEvent }
  | { type: "RENAME_SPEAKER"; speakerId: string; name: string }
  | { type: "REMOVE_SPEAKER_NAME"; speakerId: string }
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
    case "TRANSCRIPTION_EVENT":
      return applyTranscriptionEvent(state, action.event);
    case "CAPTION":
      return applyTranscriptionEvent(state, action.event.isFinal
        ? { type: "final_turn", sourceTurnId: action.event.sourceTurnId ?? action.event.id, captions: [action.event] }
        : { type: "interim", caption: action.event });
    case "RENAME_SPEAKER":
      return {
        ...state,
        speakers: state.speakers.map((speaker) => speaker.id === action.speakerId
          ? { ...speaker, displayName: action.name.trim().slice(0, 40) || null }
          : speaker),
      };
    case "REMOVE_SPEAKER_NAME":
      return { ...state, speakers: state.speakers.map((speaker) => speaker.id === action.speakerId ? { ...speaker, displayName: null } : speaker) };
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

function applyTranscriptionEvent(state: CaptionState, event: TranscriptionEvent): CaptionState {
  if (event.type === "interim") {
    const caption = normalizeCaption(event.caption);
    if (!caption) return state;
    return { ...state, interim: caption, speakers: registerSpeakers(state.speakers, [caption]) };
  }

  const captions = event.captions.map(normalizeCaption).filter((caption): caption is CaptionEvent => caption !== null);
  if (captions.length === 0) return state;
  const sourceTurnId = event.sourceTurnId;
  const existingIndex = state.finalized.findIndex((caption) => caption.sourceTurnId === sourceTurnId || caption.id === sourceTurnId);
  const finalized = [...state.finalized];
  if (existingIndex >= 0) {
    let removeCount = 0;
    while (finalized[existingIndex + removeCount]?.sourceTurnId === sourceTurnId || finalized[existingIndex + removeCount]?.id === sourceTurnId) removeCount += 1;
    finalized.splice(existingIndex, removeCount, ...captions);
  } else {
    finalized.push(...captions);
  }
  return {
    ...state,
    finalized,
    interim: state.interim?.sourceTurnId === sourceTurnId || state.interim?.id === sourceTurnId ? null : state.interim,
    speakers: registerSpeakers(state.speakers, captions),
  };
}

function normalizeCaption(event: CaptionEvent): CaptionEvent | null {
  const text = event.text.trim();
  return text ? { ...event, text } : null;
}

function registerSpeakers(existing: SpeakerProfile[], captions: CaptionEvent[]): SpeakerProfile[] {
  const next = [...existing];
  for (const caption of captions) {
    if (!caption.speakerId || next.some((speaker) => speaker.id === caption.speakerId)) continue;
    const ordinal = next.length + 1;
    next.push({
      id: caption.speakerId,
      ordinal,
      displayName: null,
      side: ordinal % 2 === 0 ? "right" : "left",
      accentIndex: (ordinal - 1) % 6,
    });
  }
  return next;
}
