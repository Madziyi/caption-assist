"use client";
import type { HeadsetParticipantView } from "@/lib/headset/headset-participant";
import { sensitivityLabel } from "@/lib/headset/calibration";
export function HeadsetSetup({ view, start, useAnyway, retry, retryCaptions, choose }: { view: HeadsetParticipantView | null; start(): void; useAnyway(): void; retry(): void; retryCaptions?: () => void; choose(deviceId: string): void }) {
  // Joining now publishes an initialized view before the user grants mic access.
  if (!view || (view.setup === "not_started" && view.mic === "off")) return <button type="button" className="button button-secondary" onClick={start}>Start headset check</button>;
  if (view.mic === "starting") return <p role="status">Starting microphone… Allow microphone access if your browser asks.</p>;
  if (view.mic === "stopped" && view.setup !== "failed") return <section className="headset-setup" aria-live="polite"><p>Microphone off. Turn it back on to continue.</p><button type="button" className="button button-secondary" onClick={retry}>Turn microphone back on</button></section>;
  const info = view.input;
  return <section className="headset-setup" aria-live="polite">
    <p><strong>Using:</strong> {info?.label ?? "No microphone selected"}</p>
    {info && <p>{info.inputClass === "headset" ? "✓ Headset microphone" : info.inputClass === "built-in" ? "⚠ This looks like your phone's own microphone. Connect your AirPods or headset, then tap Check again." : "Make sure this is your headset microphone."}</p>}
    {view.inputs.length > 1 && <>
      <label>Choose input <select value={info?.deviceId && view.inputs.some((input) => input.deviceId === info.deviceId) ? info.deviceId : ""} onChange={(e) => choose(e.target.value)}>
        <option value="" disabled>Current input (selected by browser)</option>
        {view.inputs.map((input) => <option key={input.deviceId} value={input.deviceId}>{input.label}</option>)}
      </select></label>
      <p>Input names come from your browser. A headset route may appear even when no headset is connected; check that your headset is connected to this phone.</p>
    </>}
    {view.setup === "input" && <div className="notice notice-warning"><p>Connect your headset before continuing.</p><div className="notice-actions"><button type="button" className="button button-secondary" onClick={retry}>Check again</button><button type="button" className="button button-quiet" onClick={useAnyway}>Use this microphone anyway</button></div></div>}
    {view.setup === "quiet" && <p>Stay quiet for 3 seconds…</p>}
    {view.setup === "voice" && <p>Now read this out loud at your normal volume: “I&apos;m checking my headset so the captions know when I&apos;m talking.”</p>}
    {view.setup === "ready" && view.mic === "on" && <p>✓ Headset ready. Keep this page open with the screen on. <strong>{view.speaking ? "Speaking" : "Quiet"}</strong></p>}
    {(view.sensitivityDb !== undefined || view.sensitivity !== undefined) && <p>Sensitivity: {sensitivityLabel(view.sensitivityDb ?? view.sensitivity ?? 0)}, set by the host</p>}
    {view.stt && view.stt !== "off" && <p role="status">{view.stt === "on" ? "Captioning your voice" : view.stt === "connecting" ? "Connecting captions…" : view.stt === "reconnecting" ? "Captions reconnecting…" : "Captions stopped."}{view.stt === "failed" && retryCaptions && <button type="button" className="button button-secondary" onClick={retryCaptions}>Retry captions</button>}</p>}
    {view.mic === "disconnected" && <div className="notice notice-warning"><p>Your headset disconnected.</p><div className="notice-actions"><button type="button" className="button button-primary" onClick={retry}>Turn microphone back on</button><button type="button" className="button button-secondary" onClick={retry}>Check again</button></div></div>}
    {view.notice && view.setup !== "failed" && view.mic !== "disconnected" && <div className="notice notice-warning"><p role="alert">{view.notice}</p><button type="button" className="button button-secondary" onClick={retry}>Check again</button></div>}
    {view.setup === "failed" && <div className="notice notice-error"><p>{view.notice ?? "We couldn't hear you clearly. Check your headset is on and connected, then try again."}</p><button type="button" className="button button-secondary" onClick={retry}>Try again</button></div>}
    {view.setup !== "ready" && view.setup !== "input" && <p className="headset-level">Current level: {view.levelDb.toFixed(1)} dB</p>}
  </section>;
}
