"use client";
import { useState } from "react";
import type { ConnectedRoom, RoomView } from "@/lib/rooms/controller";
import { sensitivityDb, sensitivityLabel } from "@/lib/headset/calibration";
import { LOOKAHEAD_MS } from "@/lib/headset/gated-audio";
import { HeadsetActivity } from "./headset-activity";

export function HeadsetDelay({ view, id }: { view: RoomView; id: string }) {
  const stt = view.headsetHost?.people[id]?.presence?.latency?.interimP50;
  const relay = view.headsetHost?.relayLatency?.[id]?.relayExtraP50;
  return <small>{stt === null || stt === undefined || relay === null || relay === undefined ? "Estimated delay: measuring…" : `Estimated delay: ~${Math.round(LOOKAHEAD_MS + stt + relay)} ms`}</small>;
}
export function HeadsetHiddenDuplicates({ view }: { view: RoomView }) {
  const [show, setShow] = useState(false);
  if (view.mode !== "headset" || view.snapshot?.self.role !== "host") return null;
  return <section><label><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />Show hidden duplicates (for testing)</label>{show && <div className="headset-hidden-list">{(view.headsetHost?.hiddenCaptions ?? []).map((caption) => <p className="headset-hidden-caption" key={caption.sourceTurnId}>Hidden duplicate: {caption.text}</p>)}</div>}</section>;
}

export function HeadsetSensitivity({ view, room }: { view: RoomView; room: ConnectedRoom }) {
  const host = view.headsetHost;
  return <div className="headset-sensitivity-list"><h3>Caption sensitivity</h3>{Object.entries(host?.people ?? {}).map(([id, person]) => {
    const name = view.snapshot?.participants.find((p) => p.id === id)?.displayName ?? "Participant";
    const value = sensitivityDb(host?.sensitivities?.[id] ?? person.presence?.sensitivityDb ?? person.presence?.sensitivity ?? 0);
    const ownRef = person.presence?.ownRefDb ?? Math.max(person.presence?.ownDb ?? -100, person.presence?.tuned ? host?.check?.matrix?.levels[id]?.[id] ?? -100 : -100);
    const open = person.presence?.openDb;
    const commit = (e: React.SyntheticEvent<HTMLInputElement>) => room.setHeadsetSensitivity(id, Number(e.currentTarget.value), true);
    return <fieldset key={id}><legend>{name}</legend><label>Sensitivity for {name}<input type="range" min={-15} max={6} step={1} value={value} aria-valuetext={sensitivityLabel(value)} onChange={(e) => room.setHeadsetSensitivity(id, Number(e.target.value), false)} onPointerUp={commit} onPointerCancel={commit} onKeyUp={commit} onBlur={commit} /></label><div className="headset-range-labels"><span>Less</span><span>More</span></div><p>{sensitivityLabel(value)}</p>{open !== null && open !== undefined && <><small>Opens at {open} dB</small>{open > ownRef - 3 && <p>Quiet speech may be missed</p>}</>}<HeadsetDelay view={view} id={id} /></fieldset>;
  })}</div>;
}

export function HeadsetSpeakingBoard({ view }: { view: RoomView }) {
  const host = view.headsetHost;
  const readyCount = Object.values(host?.people ?? {}).filter((p) => p.presence?.setup === "ready" && p.presence?.mic === "on").length;
  return <section className="headset-board" aria-labelledby="headset-board-heading"><h2 id="headset-board-heading">Speaking board</h2>{host ? Object.entries(host.people).map(([id, person]) => <div className="headset-row" key={id}><strong>{view.snapshot?.participants.find((p) => p.id === id)?.displayName ?? "Participant"}</strong><div className="headset-row-status"><HeadsetActivity compact state={person.presence ? { ...person.presence, speaking: person.speaking, checking: host.check?.status === "running" } : null} />{readyCount >= 2 && person.presence?.setup === "ready" && person.presence.tuned === false && <small>Room check needed</small>}</div></div>) : <p>No participants yet.</p>}</section>;
}

export function HeadsetHostPanel({ view, room }: { view: RoomView; room: ConnectedRoom }) {
  const host = view.headsetHost;
  const matrix = host?.check?.matrix;
  const [copyStatus, setCopyStatus] = useState("");
  if (!host) return null;
  const copyResults = async () => {
    const clipboard = navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== "function") {
      setCopyStatus("Copy is unavailable on this browser.");
      return;
    }
    try {
      await clipboard.writeText.call(clipboard, room.headsetHost?.exportResults() ?? "");
      setCopyStatus("Results copied.");
    } catch {
      setCopyStatus("Copy was blocked. Select and copy the results manually.");
    }
  };
  return <section className="headset-controls" aria-labelledby="headset-check-heading"><h2 id="headset-check-heading">Headset room check</h2><p>{host.canStartCheck ? "Each ready headset will read in turn while every phone measures." : "Needs at least two people with a ready headset."}</p><button className="button button-primary" disabled={!host.canStartCheck || host.check?.status === "running"} onClick={() => void room.headsetHost?.startCheck()}>Start room check</button>{host.check?.status === "running" && <button className="button button-quiet" onClick={() => void room.headsetHost?.cancelCheck()}>Cancel</button>}<button className="button button-secondary" onClick={() => void copyResults()}>Copy results</button>{copyStatus && <p role="status">{copyStatus}</p>}<button className="button button-quiet" onClick={() => room.headsetHost?.resetPreview()}>Reset speaking stats</button><HeadsetSensitivity view={view} room={room} /><HeadsetHiddenDuplicates view={view} />{matrix && <><ul className="headset-check-summary">{matrix.order.map((id) => <li key={id}>{view.snapshot?.participants.find((p) => p.id === id)?.displayName ?? "Participant"}: {host.people[id]?.presence?.tuned ? `${matrix.separationDb[id] ?? "—"} dB — applied` : "Not heard — run the room check again"}</li>)}</ul><table className="headset-matrix"><caption>Room check results in dB</caption><thead><tr><th scope="col">Listener</th>{matrix.order.map((id) => <th scope="col" key={id}>{view.snapshot?.participants.find((p) => p.id === id)?.displayName ?? "Participant"}</th>)}</tr></thead><tbody>{matrix.order.map((id) => <tr key={id}><th scope="row">{view.snapshot?.participants.find((p) => p.id === id)?.displayName ?? "Participant"}</th>{matrix.order.map((speaker) => <td key={speaker}>{matrix.levels[id]?.[speaker] ?? "—"}</td>)}</tr>)}</tbody></table></>}</section>;
}
