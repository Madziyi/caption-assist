import type { HeadsetPresence } from "@/lib/headset/messages";

type Activity = Pick<HeadsetPresence, "mic" | "setup" | "stt"> & { speaking: boolean; visible?: boolean; checking?: boolean };
export function headsetActivity(state: Activity | null): { label: string; tone: "quiet" | "speaking" | "pending" | "error" } {
  if (!state) return { label: "Not set up", tone: "quiet" };
  if (state.mic === "disconnected") return { label: "Headset disconnected", tone: "error" };
  if (state.mic === "denied") return { label: "Microphone blocked", tone: "error" };
  if (state.mic === "off" || state.mic === "stopped") return { label: "Microphone off", tone: "quiet" };
  if (state.mic === "starting") return { label: "Starting microphone…", tone: "pending" };
  if (state.setup === "failed") return { label: "Check microphone", tone: "error" };
  if (state.visible === false) return { label: "Screen off", tone: "pending" };
  if (state.setup !== "ready") return { label: state.setup === "quiet" || state.setup === "voice" ? "Setting up" : "Not set up", tone: "pending" };
  if (state.stt === "failed") return { label: "Captions stopped", tone: "error" };
  if (state.stt === "reconnecting") return { label: "Captions reconnecting…", tone: "pending" };
  if (state.stt === "connecting") return { label: "Connecting captions…", tone: "pending" };
  if (state.stt === "off") return { label: "Captions off", tone: "pending" };
  if (state.checking) return { label: "Checking room", tone: "pending" };
  return { label: state.speaking ? "Speaking" : "Quiet", tone: state.speaking ? "speaking" : "quiet" };
}

export function HeadsetActivity({ state, compact = false }: { state: Activity | null; compact?: boolean }) {
  const activity = headsetActivity(state);
  return <span role="status" className={`headset-activity headset-activity-${activity.tone}${compact ? " headset-activity-compact" : ""}`}>
    <span className="headset-activity-dot" aria-hidden="true" />
    <span>{activity.label}{!compact && (activity.tone === "quiet" || activity.tone === "speaking") && state?.mic === "on" && state.setup === "ready" && <small>Microphone on</small>}</span>
  </span>;
}
