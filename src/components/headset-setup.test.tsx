import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HeadsetSetup } from "./headset-setup";
import type { HeadsetParticipantView } from "@/lib/headset/headset-participant";

const view: HeadsetParticipantView = {
  setup: "quiet", mic: "on",
  input: { deviceId: "actual-headset", label: "AirPods Pro", inputClass: "headset", processing: { autoGainControl: false, noiseSuppression: false, echoCancellation: false } },
  inputs: [{ deviceId: "default-route", label: "AirPods Pro" }, { deviceId: "actual-headset", label: "AirPods Pro" }, { deviceId: "speakerphone", label: "Speakerphone" }],
  calibration: null, thresholds: null, levelDb: -100, speaking: false, check: null, result: null, notice: null,
};

describe("headset input picker", () => {
  afterEach(cleanup);
  it("uses the active track device ID when multiple inputs have the same sanitized label", () => {
    const choose = vi.fn();
    render(<HeadsetSetup view={view} start={vi.fn()} useAnyway={vi.fn()} retry={vi.fn()} choose={choose} />);
    expect(screen.getByLabelText("Choose input")).toHaveValue("actual-headset");
    fireEvent.change(screen.getByLabelText("Choose input"), { target: { value: "default-route" } });
    expect(choose).toHaveBeenCalledWith("default-route");
    expect(screen.getByText(/headset route may appear even when no headset is connected/)).toBeInTheDocument();
  });

  it("does not claim the first label match is active when the browser omits the track device ID", () => {
    render(<HeadsetSetup view={{ ...view, input: { ...view.input!, deviceId: null } }} start={vi.fn()} useAnyway={vi.fn()} retry={vi.fn()} choose={vi.fn()} />);
    expect(screen.getByLabelText("Choose input")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Current input (selected by browser)" })).toBeDisabled();
  });
});
