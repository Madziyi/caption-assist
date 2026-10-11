"use client";
import type { ConnectedRoom, RoomView } from "@/lib/rooms/controller";

export function HeadsetSpeakingBoard({ view }: { view: RoomView }) {
  const host = view.headsetHost;
  return <section className="headset-board" aria-labelledby="headset-board-heading"><h2 id="headset-board-heading">Speaking board</h2>{host ? Object.entries(host.people).map(([id, person]) => <div className="headset-row" key={id}><strong>{view.snapshot?.participants.find((p) => p.id === id)?.displayName ?? "Participant"}</strong><span role="status">{person.presence?.setup === "ready" && person.presence.mic === "on" ? person.speaking ? "Speaking" : "Quiet" : person.presence?.mic === "off" ? "Microphone off" : person.presence?.setup === "not_started" ? "Not set up" : person.presence?.setup === "quiet" || person.presence?.setup === "voice" ? "Setting up" : person.presence?.visible === false ? "Screen off" : "Not set up"}</span></div>) : <p>No participants yet.</p>}</section>;
}

export function HeadsetHostPanel({ view, room }: { view: RoomView; room: ConnectedRoom }) {
  const host = view.headsetHost;
  const matrix = host?.check?.matrix;
  if (!host) return null;
  return <section className="headset-controls" aria-labelledby="headset-check-heading"><h2 id="headset-check-heading">Headset room check</h2><p>{host.canStartCheck ? "Each ready headset will read in turn while every phone measures." : "Needs at least two people with a ready headset."}</p><button className="button button-primary" disabled={!host.canStartCheck || host.check?.status === "running"} onClick={() => void room.headsetHost?.startCheck()}>Start room check</button>{host.check?.status === "running" && <button className="button button-quiet" onClick={() => void room.headsetHost?.cancelCheck()}>Cancel</button>}<button className="button button-secondary" onClick={() => void navigator.clipboard?.writeText(room.headsetHost?.exportResults() ?? "")}>Copy results</button><button className="button button-quiet" onClick={() => room.headsetHost?.resetPreview()}>Reset speaking stats</button>{matrix && <table className="headset-matrix"><caption>Room check results in dB</caption><thead><tr><th scope="col">Listener</th>{matrix.order.map((id) => <th scope="col" key={id}>{view.snapshot?.participants.find((p) => p.id === id)?.displayName ?? "Participant"}</th>)}</tr></thead><tbody>{matrix.order.map((id) => <tr key={id}><th scope="row">{view.snapshot?.participants.find((p) => p.id === id)?.displayName ?? "Participant"}</th>{matrix.order.map((speaker) => <td key={speaker}>{matrix.levels[id]?.[speaker] ?? "—"}</td>)}</tr>)}</tbody></table>}</section>;
}
