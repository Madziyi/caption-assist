"use client";
import { useEffect, useRef, useState } from "react";
import { ConnectedRoom, idleRoomView } from "@/lib/rooms/controller";
import { roomRequest } from "@/lib/rooms/browser";
import { MicrophoneCheck } from "@/lib/audio/microphone-check";

export default function ParticipantPage({ token }: { token: string }) {
  const [view, setView] = useState(idleRoomView);
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "microphone" | "checked">("name");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [label, setLabel] = useState("Default microphone");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const room = useRef<ConnectedRoom | null>(null);
  const check = useRef<MicrophoneCheck | null>(null);

  useEffect(() => {
    const controller = new ConnectedRoom(setView); room.current = controller;
    const test = new MicrophoneCheck(); check.current = test;
    let current = true;
    void roomRequest("check", { token }).then(() => { if (current) setChecked(true); }).catch((error: unknown) => { if (current) setError(error instanceof Error ? error.message : "This invitation is unavailable."); });
    return () => { current = false; void test.stop(); void controller.dispose(); };
  }, [token]);

  // Visibility only reacquires a supplemental Wake Lock. It never mutes or disconnects.
  useEffect(() => {
    if (view.phase !== "joined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    let acquiring = false;
    const acquire = async () => {
      if (acquiring || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      acquiring = true;
      try { const acquired = await navigator.wakeLock.request("screen"); if (disposed) await acquired.release(); else lock = acquired; } catch { /* Wake Lock is best-effort. */ }
      finally { acquiring = false; }
    };
    void acquire(); document.addEventListener("visibilitychange", acquire);
    return () => { disposed = true; document.removeEventListener("visibilitychange", acquire); void lock?.release(); };
  }, [view.phase]);

  const execute = async (action: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  };
  const disconnected = view.phase === "disconnected" && view.snapshot;
  return <main className="participant-shell">
    <p className="eyebrow">Accessible Conversation Captions</p>
    {view.phase === "ended" ? <><h1>Conversation ended</h1><p>The host ended this conversation.</p></>
      : view.phase === "removed" ? <><h1>Conversation unavailable</h1><p>You were removed from this conversation.</p></>
      : view.phase === "joined" ? <>
        <p className="participant-status" role="status">● Connected</p>
        <h1>{view.snapshot?.self.displayName}</h1>
        <p role="status">{view.microphone === "Muted" ? "Microphone muted" : view.microphone}</p>
        <button className="button button-primary" disabled={busy} onClick={() => void execute(() => room.current!.toggleMicrophone())}>{view.microphone === "Muted" ? "Unmute" : "Mute"}</button>
        <button className="button button-quiet" onClick={() => { setName(view.snapshot?.self.displayName ?? ""); setEditing(!editing); }}>Edit name</button>
        {editing && <form className="participant-form" onSubmit={(event) => { event.preventDefault(); void execute(async () => { await room.current?.rename(name); setEditing(false); }); }}>
          <label htmlFor="rename">Your display name</label><input id="rename" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} autoComplete="off" /><button className="button button-primary" disabled={busy || !name.trim()}>Save name</button>
        </form>}
        <button className="button button-quiet" onClick={() => void execute(async () => { await room.current?.leave(); setStep("name"); })}>Leave</button>
        <p>Only your microphone sends audio. You will not hear room audio on this phone.</p>
      </> : disconnected ? <>
        <h1>Room disconnected</h1><p>Your microphone is stopped. Rejoin muted, then tap Unmute to speak.</p>
        <button className="button button-primary" disabled={busy} onClick={() => void execute(() => room.current!.rejoin())}>Rejoin Conversation</button>
      </> : <>
        <h1>Join Conversation</h1>
        {step === "name" ? <form className="participant-form" onSubmit={(event) => { event.preventDefault(); setStep("microphone"); }}>
          <label htmlFor="display-name">Your display name</label><input id="display-name" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          <button className="button button-primary" disabled={!checked || !name.trim() || busy}>Continue</button>
        </form> : <>
          <h2>Set up your microphone</h2>
          <p>Your microphone sends live audio for captioning when you unmute. Audio is not stored by default.</p>
          <p>This check shows your microphone level without transcribing. You will join muted.</p>
          <button className="button button-secondary" disabled={busy} onClick={() => void execute(async () => {
            await check.current?.stop();
            await check.current?.start((value, micLabel) => { setLevel(value); setLabel(micLabel); }); setStep("checked");
          })}>Enable microphone permission</button>
          {step === "checked" && <><p>{label}</p><label htmlFor="microphone-level">Microphone input level — try speaking</label><meter id="microphone-level" min={0} max={1} value={level} />
            <button className="button button-primary" disabled={busy} onClick={() => void execute(async () => { await check.current?.stop(); setLevel(0); await room.current?.join(token, name); })}>Join Conversation</button></>}
        </>}
      </>}
    {(error || view.error) && <p className="notice notice-error" role="alert">{error ?? view.error}</p>}
    {view.phase === "connecting" && <p role="status">Connecting…</p>}
  </main>;
}
