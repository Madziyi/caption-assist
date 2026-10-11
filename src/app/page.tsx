"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ConversationSession } from "@/lib/captions/session";
import { groupNewestFirst, newestFirst } from "@/lib/captions/history";
import { captionReducer, initialCaptionState } from "@/lib/captions/reducer";
import type { CaptionEvent, SessionStatus, SpeakerProfile } from "@/lib/captions/types";
import { ConnectedRoom, idleRoomView, type RoomMicrophoneState } from "@/lib/rooms/controller";
import { IdentificationBanner, InvitePanel, ParticipantsPanel } from "@/components/room-panels";
import { HeadsetHostPanel, HeadsetSpeakingBoard } from "@/components/headset-panels";
import { HeadsetSetup } from "@/components/headset-setup";

const roomMicrophoneCopy: Record<RoomMicrophoneState, string> = {
  Off: "Room mic off",
  Starting: "Starting room mic…",
  Listening: "🎤 Room mic on",
  Reconnecting: "Room mic reconnecting…",
};

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [mode, setMode] = useState<"table" | "connected" | "headset">("table");
  const [roomView, setRoomView] = useState(idleRoomView);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomBusy, setRoomBusy] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL));
  const roomRef = useRef<ConnectedRoom | null>(null);
  const sessionRef = useRef<ConversationSession | null>(null);
  const liveCaptionRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const historyCloseRef = useRef<HTMLButtonElement>(null);

  // Identified diarized speakers resolve to their Connected participant profile.
  const speakerMap = useMemo(() => {
    const map = new Map(state.speakers.map((speaker) => [speaker.id, speaker]));
    for (const [speakerId, participantId] of Object.entries(state.speakerAliases)) {
      const participant = map.get(participantId);
      if (participant) map.set(speakerId, participant);
    }
    return map;
  }, [state.speakers, state.speakerAliases]);
  const historyGroups = useMemo(() => groupNewestFirst(newestFirst(state.finalized.map((caption) => {
    const participantId = caption.speakerId ? state.speakerAliases[caption.speakerId] : undefined;
    return participantId ? { ...caption, speakerId: participantId } : caption;
  }))), [state.finalized, state.speakerAliases]);
  const nameableSpeakers = useMemo(() => mode === "connected"
    ? state.speakers.filter((speaker) => speaker.identityOrigin === "diarized" && !state.speakerAliases[speaker.id])
    : state.speakers, [mode, state.speakers, state.speakerAliases]);

  useEffect(() => () => void sessionRef.current?.stop(), []);

  useEffect(() => {
    const room = new ConnectedRoom(setRoomView, dispatch);
    roomRef.current = room;
    let current = true;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) void room.restore().then((restored) => {
      if (current && restored) setMode(restored);
    }).catch(() => undefined).finally(() => { if (current) setRestoring(false); });
    return () => { current = false; void room.dispose(); };
  }, []);

  useEffect(() => {
    const liveCaption = liveCaptionRef.current;
    if (liveCaption) liveCaption.scrollTop = liveCaption.scrollHeight;
  }, [state.finalized, state.interim, state.activeInterims]);

  useEffect(() => {
    if (!speakerPanelOpen && !historyOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (editingSpeakerId) cancelEditing();
      else if (historyOpen) closeHistoryPanel();
      else setSpeakerPanelOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingSpeakerId, historyOpen, speakerPanelOpen]);

  useEffect(() => {
    if (historyOpen) historyCloseRef.current?.focus();
  }, [historyOpen]);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(document.fullscreenElement === document.documentElement);
    }
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (editingSpeakerId) nameInputRef.current?.focus();
  }, [editingSpeakerId]);

  async function startConversation() {
    setRoomError(null);
    if (mode === "connected" || mode === "headset") {
      setRoomBusy(true);
      try { await roomRef.current?.create(mode); setInviteOpen(true); }
      catch (error) { setRoomError(error instanceof Error ? error.message : "The conversation could not start."); dispatch({ type: "ENDED" }); }
      finally { setRoomBusy(false); }
      return;
    }
    const session = new ConversationSession(dispatch);
    sessionRef.current = session;
    await session.start().catch(() => undefined);
  }

  async function endConversation() {
    if (mode === "connected" || mode === "headset") {
      setRoomBusy(true); setRoomError(null);
      try { await roomRef.current?.end(); dispatch({ type: "ENDED" }); setInviteOpen(false); setParticipantsOpen(false); }
      catch (error) { setRoomError(error instanceof Error ? error.message : "Room end could not be confirmed. Try again."); }
      finally { setRoomBusy(false); }
      return;
    }
    await sessionRef.current?.stop();
    sessionRef.current = null;
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setIsFullscreen(false);
    }
  }

  function openSpeakerPanel(speakerId?: string) {
    if (mode === "connected" && !nameableSpeakers.some((speaker) => speaker.id === speakerId)) { setParticipantsOpen(true); return; }
    setSpeakerPanelOpen(true);
    if (speakerId) beginEditing(speakerId);
  }

  function closeHistoryPanel() {
    setHistoryOpen(false);
    historyButtonRef.current?.focus();
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
  const connectedActive = (mode === "connected" || mode === "headset") && ["connecting", "joined", "disconnected"].includes(roomView.phase) && Boolean(roomView.snapshot);
  const participantCount = roomView.snapshot?.participants.filter((p) => !p.removed).length ?? 0;
  const waitingCopy = mode === "headset" ? "Headset Mode shows speaking lights; it does not caption yet."
    : roomView.roomMicrophone !== "Listening" ? "The room microphone is off. Start it to caption the conversation."
    : participantCount <= 1 ? "Listening. Invite participants, then ask each person to identify their voice." : "Listening for conversation…";

  async function openInvite() {
    try { await roomRef.current?.invite(); setParticipantsOpen(false); setInviteOpen(true); }
    catch (error) { setRoomError(error instanceof Error ? error.message : "Invitation is unavailable."); }
  }

  return (
    <main className="conversation-shell">
      <header className="conversation-header">
        <div>
          <p className="eyebrow">Accessible Conversation Captions</p>
        </div>
        <div className="header-actions">
          <label className="mode-label">Mode <select aria-label="Conversation mode" value={mode} disabled={isActive || connectedActive || roomBusy || restoring} onChange={(event) => { setMode(event.target.value as "table" | "connected" | "headset"); setRoomError(null); }}>
            <option value="table">Table Mode</option><option value="connected">Connected Mode</option><option value="headset">Headset Mode (test)</option>
          </select></label>
          {canStart ? (
            <button type="button" className="button button-primary header-button" onClick={startConversation} disabled={roomBusy || restoring}>
              {state.status === "ended" ? "Start New Conversation" : "Start Conversation"}
            </button>
          ) : isActive ? (
            <button type="button" className="button button-end header-button" onClick={endConversation} disabled={state.status === "stopping" || roomBusy}>
              {state.status === "stopping" ? "Ending Conversation…" : "End Conversation"}
            </button>
          ) : null}
          {mode === "table" && state.speakers.length > 0 && (
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
          {connectedActive && mode === "connected" && <>
            {roomView.roomMicrophone === "Off"
              ? <button type="button" className="button button-primary header-button" disabled={roomBusy} onClick={() => void roomRef.current?.startRoomMicrophone()}>Start room microphone</button>
              : <span className={`room-mic-state room-mic-${roomView.roomMicrophone.toLowerCase()}`} role="status">{roomMicrophoneCopy[roomView.roomMicrophone]}</span>}
            <button className="speaker-control" aria-expanded={participantsOpen} onClick={() => setParticipantsOpen(true)}>Participants {participantCount}</button>
          </>}
          {connectedActive && mode === "headset" && <button className="speaker-control" aria-expanded={participantsOpen} onClick={() => setParticipantsOpen(true)}>Participants {participantCount}</button>}
          <button
            ref={historyButtonRef}
            type="button"
            className="history-control"
            aria-expanded={historyOpen}
            aria-controls="caption-history-panel"
            onClick={() => {
              setHistoryOpen((open) => !open);
              setSpeakerPanelOpen(false);
            }}
          >
            <span aria-hidden="true">☰</span> Caption history
          </button>
          <button
            type="button"
            className="button button-secondary header-button"
            aria-pressed={isFullscreen}
            onClick={toggleFullscreen}
          >
            <span aria-hidden="true">⛶</span> {isFullscreen ? "Exit Full Screen" : "Full Screen"}
          </button>
          <div className={`status status-${state.status}`} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            <span>{mode === "connected" && connectedActive ? roomView.phase === "joined" ? "Connected" : roomView.phase === "disconnected" ? "Room disconnected" : "Connecting" : statusCopy[state.status]}</span>
            {mode === "table" && state.status === "reconnecting" && <span className="status-detail">Attempt {state.reconnectAttempt} of 5</span>}
          </div>
        </div>
      </header>

      {inviteOpen && connectedActive && <InvitePanel view={roomView} close={() => setInviteOpen(false)} />}
      {participantsOpen && connectedActive && roomRef.current && <ParticipantsPanel view={roomView} room={roomRef.current} close={() => setParticipantsOpen(false)} invite={() => void openInvite()} />}
      {(roomError || (mode === "connected" && roomView.error)) && <p className="notice notice-error" role="alert">{roomError ?? roomView.error}</p>}
      {mode === "connected" && roomView.phase === "disconnected" && roomView.snapshot && <button className="button button-secondary" disabled={roomBusy} onClick={async () => {
        setRoomBusy(true); try { await roomRef.current?.rejoin(); setRoomError(null); } catch (error) { setRoomError(error instanceof Error ? error.message : "Rejoin failed."); } finally { setRoomBusy(false); }
      }}>Rejoin Conversation</button>}
      {connectedActive && mode === "connected" && roomRef.current && <IdentificationBanner view={roomView} room={roomRef.current} />}
      {connectedActive && mode === "headset" && roomRef.current && <>
        <HeadsetSpeakingBoard view={roomView} />
        <HeadsetHostPanel view={roomView} room={roomRef.current} />
        <section className="headset-host-setup"><h2>Optional host headset</h2><p>The host microphone stays off unless you choose to set up your own headset.</p><HeadsetSetup view={roomView.headsetSelf} start={() => void roomRef.current?.startHeadsetSetup()} useAnyway={() => roomRef.current?.useCurrentHeadsetInput()} retry={() => void roomRef.current?.restartHeadsetMicrophone()} choose={(id) => void roomRef.current?.chooseHeadsetInput(id)} /></section>
      </>}

      {speakerPanelOpen && nameableSpeakers.length > 0 && (
        <section className="speaker-panel" role="dialog" aria-labelledby="speakers-heading">
          <div className="speaker-panel-header">
            <h2 id="speakers-heading">{mode === "connected" ? "Unidentified voices" : "Speakers"}</h2>
            <button type="button" className="button button-quiet panel-close" onClick={() => setSpeakerPanelOpen(false)} aria-label="Close speakers panel">Close</button>
          </div>
          {mode === "connected" && <p className="speaker-panel-hint">Name a voice for someone without a phone, or use Participants to identify a joined person.</p>}
          <div className="speaker-list">
            {nameableSpeakers.map((speaker) => (
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

      <div className={`conversation-workspace ${historyOpen ? "conversation-workspace-history-open" : ""}`}>
        {historyOpen && (
          <aside id="caption-history-panel" className="history-panel" role="dialog" aria-labelledby="caption-history-heading">
            <div className="history-panel-header">
              <h2 id="caption-history-heading">Caption history</h2>
              <button ref={historyCloseRef} type="button" className="button button-quiet panel-close" onClick={closeHistoryPanel}>Close</button>
            </div>
            {historyGroups.length === 0 ? (
              <p className="caption-placeholder">No captions yet.</p>
            ) : (
              <section className="history history-panel-list" aria-label="Caption history" aria-live="polite">
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
            )}
          </aside>
        )}

        <div className="conversation-content">
          <section className="caption-stage" aria-label="Live caption transcript">
        {state.finalized.length > 0 || state.interim || Object.keys(state.activeInterims).length > 0 ? (
          <div className="live-caption-scroll" ref={liveCaptionRef}>
            {state.finalized.map((caption) => (
              <LiveCaptionLine key={caption.id} caption={caption} speakerMap={speakerMap} onActivate={openSpeakerPanel} />
            ))}
            {state.interim && (
              <LiveCaptionLine caption={state.interim} speakerMap={speakerMap} onActivate={openSpeakerPanel} isInterim />
            )}
            {Object.values(state.activeInterims).map((caption) => <LiveCaptionLine key={caption.sourceId} caption={caption} speakerMap={speakerMap} onActivate={openSpeakerPanel} isInterim />)}
          </div>
        ) : (
          <p className="caption-placeholder">
            {connectedActive ? waitingCopy : state.status === "listening" ? "Listening for conversation…" : "Start a conversation to see captions here."}
          </p>
        )}
          </section>

          {mode === "table" && state.status === "reconnecting" && (
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

        </div>
      </div>
    </main>
  );
}

function SpeakerIdentity({ speakerId, speakerMap, onActivate, live = false }: { speakerId: string | null; speakerMap: Map<string, SpeakerProfile>; onActivate: (speakerId?: string) => void; live?: boolean }) {
  const speaker = speakerId ? speakerMap.get(speakerId) : undefined;
  const label = speaker ? speakerLabel(speaker) : "Someone";
  if (!speaker) return <span className={`speaker-identity speaker-identity-someone ${live ? "speaker-identity-live" : ""}`}>{label}</span>;
  if (speaker.identityOrigin && speaker.identityOrigin !== "diarized") return <span className={`speaker-identity speaker-accent-${speaker.accentIndex} ${live ? "speaker-identity-live" : ""}`}><span className="speaker-dot" aria-hidden="true" />{label}</span>;
  return (
    <button type="button" className={`speaker-identity speaker-identity-${speaker.side} speaker-accent-${speaker.accentIndex} ${live ? "speaker-identity-live" : ""}`} onClick={() => onActivate(speaker.id)} aria-label={`Name ${label}`}>
      <span className="speaker-dot" aria-hidden="true" />
      {label}
    </button>
  );
}

function LiveCaptionLine({ caption, speakerMap, onActivate, isInterim = false }: { caption: CaptionEvent; speakerMap: Map<string, SpeakerProfile>; onActivate: (speakerId?: string) => void; isInterim?: boolean }) {
  return (
    <div className="live-caption-line">
      <SpeakerIdentity speakerId={caption.speakerId} speakerMap={speakerMap} onActivate={onActivate} live />
      <p className={`current-caption ${isInterim ? "interim-caption" : "final-caption"}`} aria-live="polite" aria-atomic="true">
        {caption.text}
      </p>
    </div>
  );
}

function speakerLabel(speaker: SpeakerProfile): string {
  return speaker.displayName || `Speaker ${speaker.ordinal}`;
}
