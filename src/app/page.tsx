"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ConversationSession } from "@/lib/captions/session";
import { groupNewestFirst, newestFirst } from "@/lib/captions/history";
import { captionReducer, initialCaptionState } from "@/lib/captions/reducer";
import type { SessionStatus, SpeakerProfile } from "@/lib/captions/types";

const FINAL_CAPTION_DWELL_MS = 2_000;

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
  const [speakerPanelOpen, setSpeakerPanelOpen] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const sessionRef = useRef<ConversationSession | null>(null);
  const liveCaptionRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dwellStartRef = useRef<{ id: string; startedAt: number } | null>(null);
  const dwellRefreshTimeoutRef = useRef<number | null>(null);
  const dwellExpiryTimeoutRef = useRef<number | null>(null);

  const speakerMap = useMemo(() => new Map(state.speakers.map((speaker) => [speaker.id, speaker])), [state.speakers]);
  const historyGroups = useMemo(() => groupNewestFirst(newestFirst(state.finalized)), [state.finalized]);
  const interimText = state.interim?.text;
  const newestFinalCaption = state.finalized.at(-1);
  const recentFinalCaption = dwellStartRef.current?.id === newestFinalCaption?.id && clock - (dwellStartRef.current?.startedAt ?? 0) < FINAL_CAPTION_DWELL_MS
    ? newestFinalCaption
    : null;

  useEffect(() => () => void sessionRef.current?.stop(), []);

  useEffect(() => {
    if (interimText) {
      const liveCaption = liveCaptionRef.current;
      if (liveCaption) liveCaption.scrollTop = liveCaption.scrollHeight;
    }
  }, [interimText]);

  useEffect(() => {
    const newestFinalCaption = state.finalized.at(-1);
    if (!newestFinalCaption) {
      dwellStartRef.current = null;
      if (dwellRefreshTimeoutRef.current !== null) window.clearTimeout(dwellRefreshTimeoutRef.current);
      if (dwellExpiryTimeoutRef.current !== null) window.clearTimeout(dwellExpiryTimeoutRef.current);
      return;
    }
    if (newestFinalCaption.id === dwellStartRef.current?.id) return;

    dwellStartRef.current = { id: newestFinalCaption.id, startedAt: Date.now() };
    if (dwellRefreshTimeoutRef.current !== null) window.clearTimeout(dwellRefreshTimeoutRef.current);
    if (dwellExpiryTimeoutRef.current !== null) window.clearTimeout(dwellExpiryTimeoutRef.current);
    dwellRefreshTimeoutRef.current = window.setTimeout(() => setClock(Date.now()), 0);
    dwellExpiryTimeoutRef.current = window.setTimeout(() => setClock(Date.now()), FINAL_CAPTION_DWELL_MS);
  }, [state.finalized]);

  useEffect(() => () => {
    if (dwellRefreshTimeoutRef.current !== null) window.clearTimeout(dwellRefreshTimeoutRef.current);
    if (dwellExpiryTimeoutRef.current !== null) window.clearTimeout(dwellExpiryTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!speakerPanelOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (editingSpeakerId) cancelEditing();
      else setSpeakerPanelOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingSpeakerId, speakerPanelOpen]);

  useEffect(() => {
    if (editingSpeakerId) nameInputRef.current?.focus();
  }, [editingSpeakerId]);

  async function startConversation() {
    const session = new ConversationSession(dispatch);
    sessionRef.current = session;
    await session.start().catch(() => undefined);
  }

  async function endConversation() {
    await sessionRef.current?.stop();
    sessionRef.current = null;
  }

  function openSpeakerPanel(speakerId?: string) {
    setSpeakerPanelOpen(true);
    if (speakerId) beginEditing(speakerId);
  }

  function beginEditing(speakerId: string) {
    const speaker = speakerMap.get(speakerId);
    if (!speaker) return;
    setDraftName(speaker.displayName ?? "");
    setEditingSpeakerId(speakerId);
  }

  function cancelEditing() {
    setEditingSpeakerId(null);
    setDraftName("");
  }

  function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSpeakerId || !draftName.trim()) return;
    dispatch({ type: "RENAME_SPEAKER", speakerId: editingSpeakerId, name: draftName });
    cancelEditing();
  }

  function removeName() {
    if (!editingSpeakerId) return;
    dispatch({ type: "REMOVE_SPEAKER_NAME", speakerId: editingSpeakerId });
    cancelEditing();
  }

  const isActive = ["requesting_permission", "connecting", "listening", "reconnecting", "stopping"].includes(state.status);
  const canStart = state.status === "idle" || state.status === "ended";
  const editingSpeaker = editingSpeakerId ? speakerMap.get(editingSpeakerId) : undefined;

  return (
    <main className="conversation-shell">
      <header className="conversation-header">
        <div>
          <p className="eyebrow">Accessible Conversation Captions</p>
        </div>
        <div className="header-actions">
          {state.speakers.length > 0 && (
            <button
              type="button"
              className="speaker-control"
              aria-label={`${state.speakers.length} speakers`}
              aria-expanded={speakerPanelOpen}
              onClick={() => setSpeakerPanelOpen((open) => !open)}
            >
              <span aria-hidden="true">👥</span> {state.speakers.length}
            </button>
          )}
          <div className={`status status-${state.status}`} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            <span>{statusCopy[state.status]}</span>
            {state.status === "reconnecting" && <span className="status-detail">Attempt {state.reconnectAttempt} of 5</span>}
          </div>
        </div>
      </header>

      {speakerPanelOpen && state.speakers.length > 0 && (
        <section className="speaker-panel" role="dialog" aria-labelledby="speakers-heading">
          <div className="speaker-panel-header">
            <h2 id="speakers-heading">Speakers</h2>
            <button type="button" className="button button-quiet panel-close" onClick={() => setSpeakerPanelOpen(false)} aria-label="Close speakers panel">Close</button>
          </div>
          <div className="speaker-list">
            {state.speakers.map((speaker) => (
              <div className="speaker-row" key={speaker.id}>
                <span className={`speaker-dot speaker-accent-${speaker.accentIndex}`} aria-hidden="true" />
                <button type="button" className="speaker-name-button" onClick={() => beginEditing(speaker.id)}>
                  {speakerLabel(speaker)}
                </button>
                <span className="speaker-side">{speaker.side}</span>
                <button type="button" className="button button-secondary speaker-edit" onClick={() => beginEditing(speaker.id)}>
                  {speaker.displayName ? "Edit" : "Name"}
                </button>
              </div>
            ))}
          </div>
          {editingSpeaker && (
            <form className="speaker-editor" onSubmit={saveName}>
              <label htmlFor="speaker-name">Name {speakerLabel(editingSpeaker)}</label>
              <input
                ref={nameInputRef}
                id="speaker-name"
                value={draftName}
                maxLength={40}
                onChange={(event) => setDraftName(event.target.value)}
                autoComplete="off"
              />
              <div className="speaker-editor-actions">
                <button type="button" className="button button-quiet" onClick={cancelEditing}>Cancel</button>
                {editingSpeaker.displayName && <button type="button" className="button button-quiet" onClick={removeName}>Remove name</button>}
                <button type="submit" className="button button-primary" disabled={!draftName.trim()}>Save</button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="caption-stage" aria-label="Current caption">
        {state.interim || recentFinalCaption ? (
          <>
            <SpeakerIdentity speakerId={(state.interim ?? recentFinalCaption)?.speakerId ?? null} speakerMap={speakerMap} onActivate={openSpeakerPanel} live />
            <div className="live-caption-scroll" ref={liveCaptionRef}>
              <p className={`current-caption ${state.interim ? "interim-caption" : "final-caption"}`} aria-live="polite" aria-atomic="true">
                {(state.interim ?? recentFinalCaption)?.text}
              </p>
            </div>
          </>
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
              <button type="button" className="button button-secondary" onClick={startConversation}>Retry</button>
              <button type="button" className="button button-quiet" onClick={endConversation}>End Conversation</button>
            </div>
          )}
        </div>
      )}

      <section className="history" aria-label="Recent conversation history" aria-live="polite">
        {historyGroups.map((group) => {
          const firstCaption = group.captions[0];
          if (!firstCaption) return null;
          return (
            <div className={`history-group ${group.speakerId ? `history-group-${speakerMap.get(group.speakerId)?.side ?? "left"}` : "history-group-left history-group-someone"}`} key={firstCaption.id}>
              <SpeakerIdentity speakerId={group.speakerId} speakerMap={speakerMap} onActivate={openSpeakerPanel} />
              <div className="history-bubbles">
                {group.captions.map((caption) => <p className={`history-caption speaker-accent-border-${speakerMap.get(caption.speakerId ?? "")?.accentIndex ?? "neutral"}`} key={caption.id}>{caption.text}</p>)}
              </div>
            </div>
          );
        })}
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

function SpeakerIdentity({ speakerId, speakerMap, onActivate, live = false }: { speakerId: string | null; speakerMap: Map<string, SpeakerProfile>; onActivate: (speakerId?: string) => void; live?: boolean }) {
  const speaker = speakerId ? speakerMap.get(speakerId) : undefined;
  const label = speaker ? speakerLabel(speaker) : "Someone";
  if (!speaker) return <span className={`speaker-identity speaker-identity-someone ${live ? "speaker-identity-live" : ""}`}>{label}</span>;
  return (
    <button type="button" className={`speaker-identity speaker-identity-${speaker.side} speaker-accent-${speaker.accentIndex} ${live ? "speaker-identity-live" : ""}`} onClick={() => onActivate(speaker.id)} aria-label={`Name ${label}`}>
      <span className="speaker-dot" aria-hidden="true" />
      {label}
    </button>
  );
}

function speakerLabel(speaker: SpeakerProfile): string {
  return speaker.displayName || `Speaker ${speaker.ordinal}`;
}
