"use client";
import type { HeadsetParticipantView } from "@/lib/headset/headset-participant";
import { sensitivityLabel } from "@/lib/headset/calibration";
import { HeadsetActivity } from "./headset-activity";
import { BENCHMARK_PHRASES, percentile } from "@/lib/headset/benchmark";
export function HeadsetSetup({ view, start, useAnyway, retry, retryCaptions, choose, selectBenchmarkPhrase, setContextHints }: { view: HeadsetParticipantView | null; start(): void; useAnyway(): void; retry(): void; retryCaptions?: () => void; choose(deviceId: string): void; selectBenchmarkPhrase?: (index: number | null) => void; setContextHints?: (enabled: boolean) => void }) {
  // Joining now publishes an initialized view before the user grants mic access.
  if (!view || (view.setup === "not_started" && view.mic === "off")) return <button type="button" className="button button-secondary" onClick={start}>Start headset check</button>;
  if (view.mic === "starting") return <p role="status">Starting microphone… Allow microphone access if your browser asks.</p>;
  if (view.mic === "stopped" && view.setup !== "failed") return <section className="headset-setup" aria-live="polite"><p>Microphone off. Turn it back on to continue.</p><button type="button" className="button button-secondary" onClick={retry}>Turn microphone back on</button></section>;
  const info = view.input;
  return <section className="headset-setup">
    <div className="headset-input-card">
    <div className="headset-input-heading"><span className="headset-input-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6" /></svg></span><div><h3>Microphone</h3><p className="headset-input-name">{info?.label ?? "No microphone selected"}</p></div></div>
    {info && <p className="headset-input-hint">{info.inputClass === "headset" ? "Headset microphone selected" : info.inputClass === "built-in" ? "This looks like your phone's microphone. Connect your headset, then tap Check again." : "Make sure this is your headset microphone."}</p>}
    {view.inputs.length > 1 && <>
      <label className="headset-input-label">Choose input <select className="headset-input-select" aria-describedby="headset-input-help" value={info?.deviceId && view.inputs.some((input) => input.deviceId === info.deviceId) ? info.deviceId : ""} onChange={(e) => choose(e.target.value)}>
        <option value="" disabled>Current input (selected by browser)</option>
        {view.inputs.map((input) => <option key={input.deviceId} value={input.deviceId}>{input.label}</option>)}
      </select></label>
      <details className="headset-input-help"><summary>About microphone choices</summary><p id="headset-input-help">Input names come from your browser. A headset route may appear even when no headset is connected; check that your headset is connected to this phone. Changing input runs setup again.</p></details>
    </>}
    </div>
    <HeadsetActivity state={{ ...view, checking: view.check !== null }} />
    {view.benchmark && <BenchmarkPanel benchmark={view.benchmark} selectPhrase={selectBenchmarkPhrase} setContextHints={setContextHints} />}
    {view.setup === "input" && <div className="notice notice-warning"><p>Connect your headset before continuing.</p><div className="notice-actions"><button type="button" className="button button-secondary" onClick={retry}>Check again</button><button type="button" className="button button-quiet" onClick={useAnyway}>Use this microphone anyway</button></div></div>}
    {view.setup === "quiet" && <p role="status">Stay quiet for 3 seconds…</p>}
    {view.setup === "voice" && <p role="status">Now read this out loud at your normal volume: “I&apos;m checking my headset so the captions know when I&apos;m talking.”</p>}
    {view.setup === "ready" && view.mic === "on" && <p>✓ Headset ready. Keep this page open with the screen on.</p>}
    {(view.sensitivityDb !== undefined || view.sensitivity !== undefined) && <p>Sensitivity: {sensitivityLabel(view.sensitivityDb ?? view.sensitivity ?? 0)}, set by the host</p>}
    {view.stt && view.stt !== "off" && <p role="status">{view.stt === "on" ? "Captioning your voice" : view.stt === "connecting" ? "Connecting captions…" : view.stt === "reconnecting" ? "Captions reconnecting…" : "Captions stopped."}{view.stt === "failed" && retryCaptions && <button type="button" className="button button-secondary" onClick={retryCaptions}>Retry captions</button>}</p>}
    {view.mic === "disconnected" && <div className="notice notice-warning"><p>Your headset disconnected.</p><div className="notice-actions"><button type="button" className="button button-primary" onClick={retry}>Turn microphone back on</button><button type="button" className="button button-secondary" onClick={retry}>Check again</button></div></div>}
    {view.notice && view.setup !== "failed" && view.mic !== "disconnected" && <div className="notice notice-warning"><p role="alert">{view.notice}</p><button type="button" className="button button-secondary" onClick={retry}>Check again</button></div>}
    {view.setup === "failed" && <div className="notice notice-error"><p>{view.notice ?? "We couldn't hear you clearly. Check your headset is on and connected, then try again."}</p><button type="button" className="button button-secondary" onClick={retry}>Try again</button></div>}
    {view.setup !== "ready" && view.setup !== "input" && <p className="headset-level">Current level: {view.levelDb.toFixed(1)} dB</p>}
  </section>;
}

function BenchmarkPanel({ benchmark, selectPhrase, setContextHints }: { benchmark: NonNullable<HeadsetParticipantView["benchmark"]>; selectPhrase?: (index: number | null) => void; setContextHints?: (enabled: boolean) => void }) {
  const latest = benchmark.rows.at(-1);
  const summary = (key: "assemblyFirstTextMs" | "assemblyFinalMs" | "openaiFirstTextMs" | "openaiFinalMs") => {
    const values = benchmark.rows.map((row) => row.timings[key]).filter((value): value is number => value !== null);
    const p50 = percentile(values, .5), p90 = percentile(values, .9);
    return values.length ? `${Math.round(p50!)} / ${Math.round(p90!)} ms` : "—";
  };
  return <section className="headset-benchmark" aria-label="STT benchmark">
    <h3>STT Benchmark</h3>
    <p>Primary: AssemblyAI Universal-3.6 Pro · interruption 0 · silence 100 / 1000 ms</p>
    <p>Shadow: OpenAI gpt-live-transcribe · delay low</p>
    <p role="status">{benchmark.state === "on" ? "Shadow benchmark connected" : benchmark.state === "connecting" ? "Connecting shadow benchmark…" : "Shadow benchmark unavailable. AssemblyAI captions continue."}</p>
    <label>Script phrase before speaking <select value={benchmark.selectedPhrase ?? ""} onChange={(event) => selectPhrase?.(event.target.value === "" ? null : Number(event.target.value))}>
      <option value="">No reference phrase</option>{BENCHMARK_PHRASES.map((phrase, index) => <option key={index} value={index}>{index + 1}. {phrase.text}</option>)}
    </select></label>
    <label className="benchmark-hints"><input type="checkbox" checked={benchmark.contextHints} onChange={(event) => setContextHints?.(event.target.checked)} /> Context hints: {benchmark.contextHints ? "ON" : "OFF"}</label>
    <div className="benchmark-summary"><strong>Rolling P50 / P90</strong><span>Assembly first text: {summary("assemblyFirstTextMs")}</span><span>Assembly final: {summary("assemblyFinalMs")}</span><span>OpenAI first text: {summary("openaiFirstTextMs")}</span><span>OpenAI final: {summary("openaiFinalMs")}</span></div>
    {latest && <div className="benchmark-latest"><strong>Latest utterance</strong><p>Assembly first text {formatMs(latest.timings.assemblyFirstTextMs)} · final {formatMs(latest.timings.assemblyFinalMs)} · gate-close to final {formatMs(latest.timings.gateCloseToAssemblyFinalMs)}</p><p>OpenAI first text {formatMs(latest.timings.openaiFirstTextMs)} · final {formatMs(latest.timings.openaiFinalMs)} · gate-close to final {formatMs(latest.timings.gateCloseToOpenaiFinalMs)}</p><p><b>AssemblyAI</b><br />{latest.assemblyText || "(waiting)"}</p><p><b>OpenAI shadow</b><br />{latest.openaiText || "(waiting)"}</p>{latest.scores && <p>WER: Assembly {Math.round(latest.scores.assemblyWer * 100)}% · OpenAI {Math.round(latest.scores.openaiWer * 100)}% · exact entities {Math.round(latest.scores.assemblyEntities * 100)}% / {Math.round(latest.scores.openaiEntities * 100)}%</p>}</div>}
  </section>;
}
function formatMs(value: number | null) { return value === null ? "—" : `${Math.round(value)} ms`; }
