import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HeadsetActivity, headsetActivity } from "./headset-activity";
afterEach(cleanup);
const ready = { mic: "on" as const, setup: "ready" as const, stt: "on" as const, speaking: true };
it("shows a prominent speaking/quiet rectangle with text, and a compact host version", () => {
  const result = render(<HeadsetActivity state={ready} />);
  expect(screen.getByRole("status")).toHaveClass("headset-activity-speaking");
  expect(screen.getByText("Microphone on")).toBeInTheDocument();
  result.rerender(<HeadsetActivity compact state={{ ...ready, speaking: false }} />);
  expect(screen.getByRole("status")).toHaveClass("headset-activity-compact", "headset-activity-quiet");
  expect(screen.getByText("Quiet")).toBeInTheDocument();
  expect(screen.queryByText("Microphone on")).not.toBeInTheDocument();
});
it.each([
  [{ mic: "disconnected" }, "Headset disconnected"], [{ mic: "denied" }, "Microphone blocked"],
  [{ mic: "stopped" }, "Microphone off"], [{ mic: "off" }, "Microphone off"],
  [{ mic: "starting" }, "Starting microphone…"], [{ setup: "failed" }, "Check microphone"],
  [{ stt: "failed" }, "Captions stopped"], [{ stt: "reconnecting" }, "Captions reconnecting…"],
  [{ stt: "connecting" }, "Connecting captions…"], [{ stt: "off" }, "Captions off"],
  [{ visible: false }, "Screen off"], [{ checking: true }, "Checking room"],
] as const)("prioritizes %j over speaking or quiet", (override, label) => {
  expect(headsetActivity({ ...ready, ...override }).label).toBe(label);
});
