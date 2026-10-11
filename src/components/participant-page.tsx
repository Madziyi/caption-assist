"use client";
import { useEffect, useRef, useState } from "react";
import { ConnectedRoom, idleRoomView } from "@/lib/rooms/controller";
import { roomRequest } from "@/lib/rooms/browser";
import type { VoicePhase } from "@/lib/rooms/voice-identity";

const phaseMessage: Record<VoicePhase, string> = {
  unidentified: "Tap Identify my voice so captions show your name when you speak.",
  waiting: "Waiting — the host's device will listen for your voice next.",
  listening: "Speak normally for a few seconds now.",
  identified: "✓ Your voice is identified. You can put your phone down.",
  not_found: "We couldn't pick out your voice. Make sure the host's device can hear you, then try again.",
  needs_again: "The captioner needs to hear your voice again. Tap Identify my voice.",
};

export default function ParticipantPage({ token }: { token: string }) {
  const [view, setView] = useState(idleRoomView);
  const [name, setName] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const room = useRef<ConnectedRoom | null>(null);

  useEffect(() => {
    const controller = new ConnectedRoom(setView); room.current = controller;
    let current = true;
    void roomRequest("check", { token }).then(() => { if (current) setChecked(true); }).catch((error: unknown) => { if (current) setError(error instanceof Error ? error.message : "This invitation is unavailable."); });
    return () => { current = false; void controller.dispose(); };
  }, [token]);

  const execute = async (action: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  };
  const disconnected = view.phase === "disconnected" && view.snapshot;
  const selfId = view.snapshot?.self.id;
  const phase: VoicePhase = (selfId && view.identification[selfId]) || "unidentified";
  const identifying = phase === "waiting" || phase === "listening";
  return <main className="participant-shell">
    <p className="eyebrow">Accessible Conversation Captions</p>
    {view.phase === "ended" ? <><h1>Conversation ended</h1><p>The host ended this conversation.</p></>
      : view.phase === "removed" ? <><h1>Conversation unavailable</h1><p>You were removed from this conversation.</p></>
      : view.phase === "joined" ? <>
        <p className="participant-status" role="status">● Connected</p>
        <h1>{view.snapshot?.self.displayName}</h1>
        <p>Your phone is not recording audio. The host&apos;s device listens to the room.</p>
        <p className={`voice-phase voice-phase-${phase}`} role="status" aria-live="polite">{phaseMessage[phase]}</p>
        {view.identificationNotice && <p className="notice notice-warning" role="alert">{view.identificationNotice}</p>}
        {phase === "listening" && <p className="participant-example">For example: “Hi, this is {view.snapshot?.self.displayName}. I&apos;m ready for the conversation.”</p>}
        <button className="button button-primary" disabled={busy} onClick={() => void execute(() => room.current!.identify(undefined, identifying ? "cancel" : "request"))}>
          {identifying ? "Cancel" : phase === "identified" ? "Identify my voice again" : "Identify my voice"}
        </button>
        <button className="button button-quiet" onClick={() => { setName(view.snapshot?.self.displayName ?? ""); setEditing(!editing); }}>Edit name</button>
        {editing && <form className="participant-form" onSubmit={(event) => { event.preventDefault(); void execute(async () => { await room.current?.rename(name); setEditing(false); }); }}>
          <label htmlFor="rename">Your display name</label><input id="rename" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} autoComplete="off" /><button className="button button-primary" disabled={busy || !name.trim()}>Save name</button>
        </form>}
        <button className="button button-quiet" onClick={() => void execute(async () => { await room.current?.leave(); })}>Leave</button>
      </> : disconnected ? <>
        <h1>Room disconnected</h1><p>Your name stays with your voice on the host&apos;s device. Rejoin to identify again or change your name.</p>
        <button className="button button-primary" disabled={busy} onClick={() => void execute(() => room.current!.rejoin())}>Rejoin Conversation</button>
      </> : <>
        <h1>Join Conversation</h1>
        <p>The host&apos;s device captions the room. Your phone only adds your name; it does not record audio.</p>
        <form className="participant-form" onSubmit={(event) => { event.preventDefault(); void execute(() => room.current!.join(token, name)); }}>
          <label htmlFor="display-name">Your display name</label><input id="display-name" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          <button className="button button-primary" disabled={!checked || !name.trim() || busy}>Join Conversation</button>
        </form>
      </>}
    {(error || view.error) && <p className="notice notice-error" role="alert">{error ?? view.error}</p>}
    {view.phase === "connecting" && <p role="status">Connecting…</p>}
  </main>;
}
