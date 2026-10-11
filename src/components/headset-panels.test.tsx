import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HeadsetSensitivity, HeadsetSpeakingBoard, HeadsetDelay, HeadsetHiddenDuplicates } from "./headset-panels";
import { idleRoomView, type ConnectedRoom, type RoomView } from "@/lib/rooms/controller";
const presence = { mic: "on" as const, setup: "ready" as const, input: "headset" as const, label: "AirPods", processing: null, floorDb: -70, ownDb: -25, visible: true, sensitivityDb: -6, tuned: false, openDb: -22 };
const view: RoomView = { ...idleRoomView, headsetHost: { people: { a: { presence, speaking: false }, b: { presence, speaking: false } }, canStartCheck: true, check: null, preview: { durationMs: 0, participants: {}, pairs: [] } } };
afterEach(cleanup);
it("renders a labelled native slider, live threshold and quiet-speech warning; commits the final value", () => {
  const setHeadsetSensitivity = vi.fn();
  render(<HeadsetSensitivity view={view} room={{ setHeadsetSensitivity } as unknown as ConnectedRoom} />);
  const slider = screen.getAllByRole("slider", { name: "Sensitivity for Participant" })[0];
  expect(slider).toHaveAttribute("min", "-15"); expect(slider).toHaveAttribute("max", "6");
  expect(slider).toHaveAttribute("aria-valuetext", "Less sensitive (−6 dB)");
  expect(screen.getAllByText("Opens at -22 dB")).toHaveLength(2);
  expect(screen.getAllByText("Quiet speech may be missed")).toHaveLength(2);
  fireEvent.change(slider, { target: { value: "-8" } });
  expect(setHeadsetSensitivity).toHaveBeenLastCalledWith("a", -8, false);
  fireEvent.keyUp(slider, { key: "ArrowLeft" });
  expect(setHeadsetSensitivity).toHaveBeenLastCalledWith("a", -6, true);
});
it("shows current tuning state when at least two people are ready", () => {
  render(<HeadsetSpeakingBoard view={view} />);
  expect(screen.getAllByText(/Room check needed/)).toHaveLength(2);
});
it("uses compact pills in existing host rows and never labels caption failure as Quiet", () => {
  const result = render(<HeadsetSpeakingBoard view={{ ...view, headsetHost: { ...view.headsetHost!, people: { a: { presence: { ...presence, stt: "failed" }, speaking: true } } } }} />);
  expect(screen.getByRole("status")).toHaveTextContent("Captions stopped");
  expect(screen.getByRole("status")).toHaveClass("headset-activity-compact");
  expect(result.container.querySelectorAll(".headset-row")).toHaveLength(1);
  expect(screen.queryByText("Quiet")).not.toBeInTheDocument();
});
it("estimates stage latency and keeps hidden captions opt-in and host-only", () => {
  const hostView = { ...view, mode: "headset", snapshot: { roomId: "test", mode: "headset", status: "open", expiresAt: "2026-10-12", participants: [], self: { id: "a", displayName: "A", role: "host", accentIndex: null, removed: false } }, headsetHost: { ...view.headsetHost!, relayLatency: { a: { relayExtraP50: 40, relayExtraP90: 60, relaySamples: 2 } }, hiddenCaptions: [{ participantId: "b", sourceTurnId: "turn", text: "Synthetic hidden line", startAt: 1, reason: "text" }], people: { a: { speaking: false, presence: { ...presence, latency: { interimP50: 900, interimP90: 1100, finalP50: 1300, finalP90: 1500, samples: { interim: 2, final: 2 } } } } } } } as RoomView;
  const r = render(<><HeadsetDelay view={hostView} id="a" /><HeadsetHiddenDuplicates view={hostView} /></>);
  expect(screen.getByText("Estimated delay: ~1240 ms")).toBeInTheDocument();
  expect(screen.queryByText(/Hidden duplicate:/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "Show hidden duplicates (for testing)" }));
  expect(screen.getByText("Hidden duplicate: Synthetic hidden line")).toBeInTheDocument();
  r.rerender(<HeadsetHiddenDuplicates view={{ ...hostView, snapshot: { ...hostView.snapshot!, self: { ...hostView.snapshot!.self, role: "participant" } } }} />);
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
});
