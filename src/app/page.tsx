"use client";

import { useEffect, useReducer, useRef } from "react";
import { ConversationSession } from "@/lib/captions/session";
import { newestFirst } from "@/lib/captions/history";
import { captionReducer, initialCaptionState } from "@/lib/captions/reducer";
import type { SessionStatus } from "@/lib/captions/types";

const statusCopy: Record<SessionStatus, string> = {
  idle: "Ready to caption",
  requesting_permission: "Microphone permission needed",
  connecting: "Connecting",
  listening: "Listening",
  reconnecting: "Reconnecting",
  stopping: "Ending conversation",
  ended: "Conversation ended",
  error: "Needs attention",
};

export default function HomePage() {
  const [state, dispatch] = useReducer(captionReducer, initialCaptionState);
  const sessionRef = useRef<ConversationSession | null>(null);

  useEffect(() => () => void sessionRef.current?.stop(), []);

  async function startConversation() {
    const session = new ConversationSession(dispatch);
    sessionRef.current = session;
    await session.start().catch(() => undefined);
  }

  async function retryConversation() {
    const session = new ConversationSession(dispatch);
    sessionRef.current = session;
    await session.start().catch(() => undefined);
  }

  async function endConversation() {
    await sessionRef.current?.stop();
    sessionRef.current = null;
  }

  const isActive = ["requesting_permission", "connecting", "listening", "reconnecting", "stopping"].includes(state.status);
  const canStart = state.status === "idle" || state.status === "ended";

  return (
    <main className="conversation-shell">
      <header className="conversation-header">
        <div>
          <p className="eyebrow">Accessible Conversation Captions</p>
          <h1>Conversation</h1>
        </div>
        <div className={`status status-${state.status}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <span>{statusCopy[state.status]}</span>
          {state.status === "reconnecting" && <span className="status-detail">Attempt {state.reconnectAttempt} of 5</span>}
        </div>
      </header>

      <section className="caption-stage" aria-label="Current caption">
        {state.interim ? (
          <p className="current-caption interim-caption" aria-live="polite" aria-atomic="true">
            {state.interim.text}
          </p>
        ) : state.finalized.length === 0 ? (
          <p className="caption-placeholder">
            {state.status === "listening" ? "Listening for conversation…" : "Start a conversation to see captions here."}
          </p>
        ) : (
          <p className="caption-placeholder">Waiting for the next turn…</p>
        )}
      </section>

      {state.status === "reconnecting" && (
        <p className="notice notice-warning" role="alert">
          Captions are temporarily interrupted. Finalized captions remain visible while the connection is restored.
        </p>
      )}

      {state.error && (
        <div className="notice notice-error" role="alert">
          <strong>{state.error.message}</strong>
          {state.error.code === "microphone_denied" && <p>Check your browser microphone permission, then try again.</p>}
          {state.error.recoverable && (
            <div className="notice-actions">
              <button type="button" className="button button-secondary" onClick={retryConversation}>Retry</button>
              <button type="button" className="button button-quiet" onClick={endConversation}>End Conversation</button>
            </div>
          )}
        </div>
      )}

      <section className="history" aria-label="Recent conversation history" aria-live="polite">
        {newestFirst(state.finalized).map((caption) => (
          <p className="history-caption" key={caption.id}>{caption.text}</p>
        ))}
      </section>

      <footer className="conversation-controls">
        {canStart && (
          <button type="button" className="button button-primary" onClick={startConversation}>
            {state.status === "ended" ? "Start New Conversation" : "Start Conversation"}
          </button>
        )}
        {isActive && (
          <button type="button" className="button button-end" onClick={endConversation} disabled={state.status === "stopping"}>
            {state.status === "stopping" ? "Ending Conversation…" : "End Conversation"}
          </button>
        )}
      </footer>
    </main>
  );
}
