"use client";
import { useEffect, useRef, useState } from "react";
import { ConnectedRoom, idleRoomView } from "@/lib/rooms/controller";
import { roomRequest } from "@/lib/rooms/browser";
import type { VoicePhase } from "@/lib/rooms/voice-identity";
import { HeadsetSetup } from "./headset-setup";
import { useHeadsetWakeLock } from "@/lib/headset/wake-lock";

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
  const [roomMode, setRoomMode] = useState<"connected" | "headset">("connected");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const room = useRef<ConnectedRoom | null>(null);

  useEffect(() => {
    const controller = new ConnectedRoom(setView); room.current = controller;
    let current = true;
    void roomRequest<{ mode?: "connected" | "headset" }>("check", { token }).then((result) => { if (current) { setRoomMode(result.mode === "headset" ? "headset" : "connected"); setChecked(true); } }).catch((error: unknown) => { if (current) setError(error instanceof Error ? error.message : "This invitation is unavailable."); });
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
  useHeadsetWakeLock(roomMode === "headset" && view.phase === "joined");
  return <main className="participant-shell">
    <p className="eyebrow">Accessible Conversation Captions</p>
    {view.phase === "ended" ? <><h1>Conversation ended</h1><p>The host ended this conversation.</p></>
      : view.phase === "removed" ? <><h1>Conversation unavailable</h1><p>You were removed from this conversation.</p></>
      : view.phase === "joined" ? <>
        <p className="participant-status" role="status">● Connected</p>
        <h1>{view.snapshot?.self.displayName}</h1>
        {roomMode === "headset" ? <>
          <p>Your headset microphone captions your voice. Audio is sent for transcription only while you&apos;re speaking, and nothing is recorded or stored.</p>
          <HeadsetSetup view={view.headsetSelf} start={() => void execute(() => room.current!.startHeadsetSetup())} useAnyway={() => room.current?.useCurrentHeadsetInput()} retry={() => void execute(() => room.current!.restartHeadsetMicrophone())} retryCaptions={() => void execute(() => room.current!.retryHeadsetCaptions())} choose={(id) => void execute(() => room.current!.chooseHeadsetInput(id))} />
          {view.headsetSelf?.check && <p role="status" aria-live="polite">{view.headsetSelf.check.mine ? view.headsetSelf.check.phase === "reading" ? "Your turn — read out loud: “I'm checking my headset so the captions know when I'm talking.”" : "Get ready…" : `Stay quiet — someone else is reading (${view.headsetSelf.check.index + 1} of ${view.headsetSelf.check.total}).`}</p>}
          {view.headsetSelf?.speaking && <p className="participant-status" role="status">Speaking</p>}
        </> : <>
          <p>Your phone is not recording audio. The host&apos;s device listens to the room.</p>
          <p className={`voice-phase voice-phase-${phase}`} role="status" aria-live="polite">{phaseMessage[phase]}</p>
          {view.identificationNotice && <p className="notice notice-warning" role="alert">{view.identificationNotice}</p>}
          {phase === "listening" && <p className="participant-example">For example: “Hi, this is {view.snapshot?.self.displayName}. I&apos;m ready for the conversation.”</p>}
          <button className="button button-primary" disabled={busy} onClick={() => void execute(() => room.current!.identify(undefined, identifying ? "cancel" : "request"))}>
            {identifying ? "Cancel" : phase === "identified" ? "Identify my voice again" : "Identify my voice"}
          </button>
        </>}
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
        <p>{roomMode === "headset" ? "This conversation uses Headset Mode. Put on your AirPods or headset and connect them to this phone before you continue." : "The host&apos;s device captions the room. Your phone only adds your name; it does not record audio."}</p>
        <form className="participant-form" onSubmit={(event) => { event.preventDefault(); void execute(() => room.current!.join(token, name)); }}>
          <label htmlFor="display-name">Your display name</label><input id="display-name" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          <button className="button button-primary" disabled={!checked || !name.trim() || busy}>Join Conversation</button>
        </form>
      </>}
    {(error || view.error) && <p className="notice notice-error" role="alert">{error ?? view.error}</p>}
    {view.phase === "connecting" && <p role="status">Connecting…</p>}
  </main>;
}
