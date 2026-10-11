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
  it("offers an explicit start tap for the initialized idle view published when a phone joins", () => {
    const start = vi.fn();
    render(<HeadsetSetup view={{ ...view, setup: "not_started", mic: "off", input: null, inputs: [] }} start={start} useAnyway={vi.fn()} retry={vi.fn()} choose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start headset check" }));
    expect(start).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Current level/)).not.toBeInTheDocument();
  });

  it("offers a restart tap after a room rejoin stops a calibrated microphone", () => {
    const retry = vi.fn();
    render(<HeadsetSetup view={{ ...view, setup: "ready", mic: "stopped", calibration: { floorDb: -80, ownDb: -25 } }} start={vi.fn()} useAnyway={vi.fn()} retry={retry} choose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Turn microphone back on" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Headset ready/)).not.toBeInTheDocument();
  });

  it("shows permission acquisition without a duplicate start action or idle level meter", () => {
    render(<HeadsetSetup view={{ ...view, setup: "not_started", mic: "starting", input: null, inputs: [] }} start={vi.fn()} useAnyway={vi.fn()} retry={vi.fn()} choose={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Starting microphone");
    expect(screen.queryByRole("button", { name: "Start headset check" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Current level/)).not.toBeInTheDocument();
  });
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
