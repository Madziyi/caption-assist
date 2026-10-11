"use client";
import { HeadsetDelay } from "./headset-panels";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ConnectedRoom, RoomView } from "@/lib/rooms/controller";
import { HOST_ACCENT_INDEX, type Participant } from "@/lib/rooms/types";
import type { VoicePhase } from "@/lib/rooms/voice-identity";

const phaseCopy: Record<VoicePhase, string> = {
  unidentified: "○ Voice not identified",
  waiting: "Waiting to identify…",
  listening: "Listening for voice…",
  identified: "✓ Voice identified",
  not_found: "Not identified — try again",
  needs_again: "Needs to identify again",
};

function RoomDialog({ title, close, children }: { title: string; close(): void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = title === "Invite participants" ? "invite-title" : "participants-title";
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className="room-dialog" aria-labelledby={id} onCancel={(event) => { event.preventDefault(); close(); }}>
    <div className="speaker-panel-header"><h2 id={id}>{title}</h2><button className="button button-quiet" onClick={close}>Close</button></div>
    {children}
  </dialog>;
}
export function InvitePanel({ view, close }: { view: RoomView; close(): void }) {
  const [copyStatus, setCopyStatus] = useState("");
  const url = view.snapshot?.joinUrl;
  return <RoomDialog title="Invite participants" close={close}>
    {url ? <><div className="room-qr"><QRCodeSVG value={url} size={220} marginSize={4} title="Scan to join this conversation" /></div>
      <p>{view.mode === "headset" ? "Everyone who will speak wears AirPods or a headset connected to their phone, scans this code and sets up their headset. Each person's captions show their name. People without a set-up headset are not captioned." : "Scan to join, then tap Identify my voice. Phones do not record audio; this device&apos;s room microphone captions everyone."}</p><a className="room-link" href={url}>{url}</a>
      {view.mode === "connected" && <p>Room microphone — {view.roomMicrophone === "Listening" ? "on" : view.roomMicrophone === "Off" ? "off" : view.roomMicrophone.toLowerCase()}</p>}
      <p>{view.snapshot?.participants.filter((p) => !p.removed).length} participant(s)</p>
      <button className="button button-primary" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopyStatus("Link copied."); } catch { setCopyStatus("Select the link to copy it."); } }}>Copy link</button>
      <p role="status">{copyStatus}</p></> : <p role="status">Preparing invitation…</p>}
  </RoomDialog>;
}
export function ParticipantsPanel({ view, room, close, invite }: { view: RoomView; room: ConnectedRoom; close(): void; invite(): void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  return <RoomDialog title="Participants" close={close}>
    <div className="speaker-list">{view.snapshot?.participants.map((p) => {
      const phase = view.identification[p.id] ?? "unidentified";
      const active = phase === "waiting" || phase === "listening";
      return <div className="speaker-row" key={p.id}>
        <span className={`speaker-dot speaker-accent-${p.role === "host" ? HOST_ACCENT_INDEX : p.accentIndex}`} aria-hidden="true" />
        <strong>{p.displayName}</strong><span>{p.removed ? "Removed" : p.role === "host" ? "This device" : view.statuses[p.id] ?? "Disconnected"}</span>
        {view.mode === "connected" && !p.removed && <span className={`voice-phase voice-phase-${phase}`}>{phaseCopy[phase]}</span>}
        {view.mode === "connected" && !p.removed && <button className="button button-secondary speaker-edit" onClick={() => void room.identify(p.id, active ? "cancel" : "request")}>
          {active ? "Cancel" : identifyLabel(p, phase)}
        </button>}
        {view.mode === "headset" && !p.removed && <span className="voice-phase">{view.headsetHost?.people[p.id]?.presence?.setup === "ready" ? "Headset ready" : "Headset not set up"}</span>}
        {view.mode === "headset" && !p.removed && <HeadsetDelay view={view} id={p.id} />}
        {p.role !== "host" && !p.removed && <button className="button button-quiet speaker-edit" disabled={busy !== null} onClick={async () => {
          setBusy(p.id); setError(null); try { await room.remove(p.id); } catch { setError("Removal could not be confirmed. Try again."); } finally { setBusy(null); }
        }}>{busy === p.id ? "Removing…" : `Remove ${p.displayName}`}</button>}
      </div>;
    })}</div>
    {error && <p role="alert">{error}</p>}
    <button className="button button-primary" onClick={invite}>Invite participant</button>
  </RoomDialog>;
}
export function IdentificationBanner({ view, room }: { view: RoomView; room: ConnectedRoom }) {
  const participants = view.snapshot?.participants.filter((p) => !p.removed) ?? [];
  const listening = participants.find((p) => view.identification[p.id] === "listening");
  const waiting = participants.some((p) => view.identification[p.id] === "waiting");
  if (listening) {
    const self = listening.role === "host";
    return <div className="identification-banner" role="status">
      <p><strong>{self ? "Listening for your voice." : `Listening for ${listening.displayName}'s voice.`}</strong>{" "}
        {self ? "Speak normally for a few seconds." : `${listening.displayName}, please speak normally for a few seconds.`} Others, please pause.</p>
      <button type="button" className="button button-quiet" onClick={() => void room.identify(listening.id, "cancel")}>Cancel</button>
    </div>;
  }
  if (waiting && view.roomMicrophone === "Off") return <p className="identification-banner" role="status">Start the room microphone to identify voices.</p>;
  if (view.identificationNotice) return <p className="identification-banner" role="status">{view.identificationNotice}</p>;
  return null;
}
function identifyLabel(participant: Participant, phase: VoicePhase) {
  if (participant.role === "host") return phase === "identified" ? "Identify my voice again" : "Identify my voice";
  return phase === "identified" ? `Identify ${participant.displayName} again` : `Identify ${participant.displayName}`;
}
