"use client";

import { useEffect, useState } from "react";
import { CROSS_MIC } from "@/lib/captions/cross-mic-reconciler";
import type { ReconciliationDiagnostic } from "@/lib/captions/reconciliation-diagnostics";
import type { Participant } from "@/lib/rooms/types";

type DiagnosticReader = { readonly diagnosticRecords: ReconciliationDiagnostic[]; clearDiagnostics(): void };
export function ReconciliationDebugPanel({ room, participants }: { room: DiagnosticReader; participants: Participant[] }) {
  const [records, setRecords] = useState(() => room.diagnosticRecords);
  const [copyStatus, setCopyStatus] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setRecords(room.diagnosticRecords), 500);
    return () => clearInterval(timer);
  }, [room]);
  const name = (source: string) => participants.find(participant => `participant:${participant.id}` === source)?.displayName ?? source;
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ constants: CROSS_MIC, comparisons: room.diagnosticRecords }, null, 2));
      setCopyStatus("Metrics copied.");
    } catch { setCopyStatus("Clipboard unavailable. Try copying again in a secure browser context."); }
  }
  return <section className="reconciliation-debug" aria-labelledby="cross-mic-debug-title">
    <h2 id="cross-mic-debug-title">Cross-mic diagnostics</h2>
    <p>Temporary host-local metrics only. No caption text or tokens retained in this ledger or copied.</p>
    <dl className="reconciliation-debug-constants">
      <div><dt>4+ words</dt><dd>Window: {CROSS_MIC.windowMs} ms · Similarity: {CROSS_MIC.similarity}</dd></div>
      <div><dt>3 words</dt><dd>Window: {CROSS_MIC.threeWordWindowMs} ms · Exact only</dd></div>
      <div><dt>1–2 words</dt><dd>Preserved</dd></div>
      <div><dt>Strong episode</dt><dd>{CROSS_MIC.strongMinWords}+ words · ≤ {CROSS_MIC.strongWindowMs} ms · similarity {CROSS_MIC.strongSimilarity} · coverage {CROSS_MIC.strongCoverage}</dd></div>
      <div><dt>Continuation</dt><dd>≤ {CROSS_MIC.continuationWindowMs} ms · coverage {CROSS_MIC.continuationCoverage} or similarity {CROSS_MIC.continuationSimilarity}</dd></div>
    </dl>
    <div className="reconciliation-debug-actions">
      <button type="button" className="button button-quiet" onClick={() => { room.clearDiagnostics(); setRecords([]); setCopyStatus(""); }}>Clear</button>
      <button type="button" className="button button-quiet" onClick={() => void copy()}>Copy diagnostics</button>
      <span role="status">{copyStatus}</span>
    </div>
    {records.length === 0 ? <p>No comparisons yet. Use Connected Mode with multiple active microphones.</p> : <ol className="reconciliation-debug-records" reversed>
      {[...records].reverse().map((record, index) => <li key={`${record.at}:${record.sourceA}:${record.sourceB}:${index}`}>
        <strong>{name(record.sourceA)} ↔ {name(record.sourceB)}</strong>
        <div>{record.eventA === "final" ? "Final" : "Interim"} ↔ {record.eventB === "final" ? "Final" : "Interim"} · Words {record.wordCountA} / {record.wordCountB}</div>
        <div>Δ {record.receiveDeltaMs.toFixed(0)} ms · Similarity {record.similarityEvaluated ? record.similarity.toFixed(2) : "not evaluated"}
          {record.containmentScore !== undefined && ` · Length/containment ${record.containmentScore.toFixed(2)}`}
          {record.shortSideCoverage !== undefined && ` · Short-side coverage ${record.shortSideCoverage.toFixed(2)}`}</div>
        <div>{record.windowMs !== undefined && `Limit ${record.windowMs} ms · Threshold ${record.similarityThreshold}`}
          {record.exactMatch !== undefined && ` · Exact ${record.exactMatch ? "yes" : "no"}`}
          {record.windowApplied === false && " · Timing gate not applied"}
          {record.timeBasis === "committed_final" && " · Final commitment time"}</div>
        <strong>{record.decision.toUpperCase()}</strong> · {record.reason}
        {record.episodeEvent && <div>Episode: {record.episodeEvent.replaceAll("_", " ")}{record.episodeAgeMs !== undefined && ` · Age ${record.episodeAgeMs.toFixed(0)} ms`}</div>}
        {record.skippedGate && <div>Matching skipped: {record.skippedGate}</div>}
        {record.reason === "cluster_expired" && <div>Prior final with similar word count expired. Metadata hint only; old text was not compared.</div>}
      </li>)}
    </ol>}
  </section>;
}
