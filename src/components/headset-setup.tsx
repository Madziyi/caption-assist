"use client";
import type { HeadsetParticipantView } from "@/lib/headset/headset-participant";
export function HeadsetSetup({ view, start, useAnyway, retry, choose }: { view: HeadsetParticipantView | null; start(): void; useAnyway(): void; retry(): void; choose(deviceId: string): void }) {
  if (!view) return <button type="button" className="button button-secondary" onClick={start}>Start headset check</button>;
  const info = view.input;
  return <section className="headset-setup" aria-live="polite">
    <p><strong>Using:</strong> {info?.label ?? "No microphone selected"}</p>
    {info && <p>{info.inputClass === "headset" ? "✓ Headset microphone" : info.inputClass === "built-in" ? "⚠ This looks like your phone's own microphone. Connect your AirPods or headset, then tap Check again." : "Make sure this is your headset microphone."}</p>}
    {view.inputs.length > 1 && <label>Choose input <select value={view.inputs.find((input) => input.label === info?.label)?.deviceId ?? ""} onChange={(e) => choose(e.target.value)}>{view.inputs.map((input) => <option key={input.deviceId} value={input.deviceId}>{input.label}</option>)}</select></label>}
    {view.setup === "input" && <div className="notice notice-warning"><p>Connect your headset before continuing.</p><div className="notice-actions"><button type="button" className="button button-secondary" onClick={retry}>Check again</button><button type="button" className="button button-quiet" onClick={useAnyway}>Use this microphone anyway</button></div></div>}
    {view.setup === "quiet" && <p>Stay quiet for 3 seconds…</p>}
    {view.setup === "voice" && <p>Now read this out loud at your normal volume: “I&apos;m checking my headset so the captions know when I&apos;m talking.”</p>}
    {view.setup === "ready" && <p>✓ Headset ready. Keep this page open with the screen on. <strong>{view.speaking ? "Speaking" : "Quiet"}</strong></p>}
    {view.setup === "failed" && <div className="notice notice-error"><p>{view.notice ?? "We couldn't hear you clearly. Check your headset is on and connected, then try again."}</p><button type="button" className="button button-secondary" onClick={retry}>Try again</button></div>}
    {view.setup !== "ready" && view.setup !== "input" && <p className="headset-level">Current level: {view.levelDb.toFixed(1)} dB</p>}
  </section>;
}
