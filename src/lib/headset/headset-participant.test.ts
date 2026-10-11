import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeadsetParticipant, type HeadsetParticipantView } from "./headset-participant";
import { classifyInput } from "./input-label";

describe("headset calibration browser timers", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function setup(label: string) {
    let view: HeadsetParticipantView | undefined;
    const inputClass = classifyInput(label);
    const stop = vi.fn(async () => undefined);
    const microphone = {
      start: vi.fn(async () => undefined), stop,
      inputs: async () => [{ deviceId: "chosen-input", label }],
      info: () => ({ deviceId: "chosen-input", label, sanitizedLabel: label, inputClass, processing: { autoGainControl: false, noiseSuppression: false, echoCancellation: false } }),
    };
    const schedule = globalThis.setTimeout;
    const cancel = globalThis.clearTimeout;
    // Enforce the receiver check missing from jsdom's permissive timers.
    const setTimer = vi.fn(function (this: unknown, ...args: Parameters<typeof setTimeout>) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Reflect.apply(schedule, globalThis, args);
    });
    const clearTimer = vi.fn(function (this: unknown, ...args: Parameters<typeof clearTimeout>) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Reflect.apply(cancel, globalThis, args);
    });
    const participant = new HeadsetParticipant("test-person", { setPresence: async () => undefined, sendSignal: async () => undefined }, (next) => { view = next; }, { microphone, setTimeout: setTimer as unknown as typeof setTimeout, clearTimeout: clearTimer as typeof clearTimeout });
    return { participant, getView: () => view!, microphone, setTimer, clearTimer };
  }

  it.each(["Default", "Headset microphone", "Bluetooth headset"])("starts and completes calibration timers for %s", async (label) => {
    const { participant, getView, setTimer } = setup(label);
    await expect(participant.startSetup()).resolves.toBeUndefined();
    expect(getView()).toMatchObject({ mic: "on", setup: "quiet", input: { deviceId: "chosen-input" } });
    await vi.advanceTimersByTimeAsync(3000);
    expect(getView().setup).toBe("voice");
    await vi.advanceTimersByTimeAsync(6000);
    // No synthetic voice was supplied, so normal quiet-audio feedback is expected.
    expect(getView()).toMatchObject({ setup: "failed", notice: expect.stringContaining("couldn't hear you clearly") });
    expect(setTimer).toHaveBeenCalledTimes(2);
    await participant.stopMicrophone();
  });

  it("calibrates Speakerphone after Use this microphone anyway and cancels the active timer on stop", async () => {
    const { participant, getView, clearTimer, microphone } = setup("Speakerphone");
    await participant.startSetup();
    expect(getView().setup).toBe("input");
    expect(() => participant.useCurrentInput()).not.toThrow();
    expect(getView().setup).toBe("quiet");
    await participant.stopMicrophone();
    expect(clearTimer).toHaveBeenCalledOnce();
    expect(microphone.stop).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(9000);
    expect(getView()).toMatchObject({ mic: "stopped", setup: "quiet" });
  });

  it("reports a rejected state update without an unhandled promise or misclassifying a working microphone", async () => {
    const state = setup("AirPods Pro");
    let view: HeadsetParticipantView | undefined;
    const participant = new HeadsetParticipant("test-person", {
      setPresence: async () => { throw new Error("Broadcast failed"); }, sendSignal: async () => undefined,
    }, (next) => { view = next; }, { microphone: state.microphone });
    await participant.startSetup();
    await vi.advanceTimersByTimeAsync(0);
    expect(view).toMatchObject({ setup: "quiet", mic: "on", notice: expect.stringContaining("could not reach the host") });
    await participant.stopMicrophone();
  });

  it("reports tuned only after a plausible check, preserves it on restart, and clears it on recalibration", async () => {
    const { participant, getView } = setup("AirPods Pro");
    const feed = (db: number) => (participant as unknown as { level(db: number): void }).level(db);
    await participant.startSetup();
    for (let i = 0; i < 30; i++) { feed(-70); await vi.advanceTimersByTimeAsync(100); }
    for (let i = 0; i < 60; i++) { feed(-25); await vi.advanceTimersByTimeAsync(100); }
    expect(getView()).toMatchObject({ setup: "ready", tuned: false });
    participant.receiveControl({ type: "headset-check", checkId: "test-check", order: ["test-person", "other"], gapMs: 500, slotMs: 3000 });
    for (let i = 0; i < 71; i++) { feed(i < 35 ? -27 : -34); await vi.advanceTimersByTimeAsync(100); }
    expect(getView().tuned).toBe(true);
    await participant.stopMicrophone(); await participant.restartMicrophone();
    expect(getView()).toMatchObject({ setup: "ready", tuned: true });
    await participant.chooseInput("chosen-input"); expect(getView().tuned).toBe(false);
    await participant.stopMicrophone();
  });
  it("relays effective-gate history and coalesces latency snapshots to at most one per 10 seconds", async () => {
    let publish!: (event: import("../captions/types").TranscriptionEvent) => void;
    const setPresence = vi.fn<(presence: import("./messages").HeadsetPresence) => Promise<void>>().mockResolvedValue(undefined);
    const sendCaption = vi.fn<(event: import("../captions/types").TranscriptionEvent, streamId: string, evidence?: import("./evidence").CaptionEvidence) => Promise<void>>().mockResolvedValue(undefined);
    const base = setup("AirPods Pro");
    const participant = new HeadsetParticipant("test-person", { setPresence, sendSignal: async () => undefined, sendCaption }, () => undefined, { microphone: base.microphone, transcriberFactory: (send) => { publish = send; return { start: async () => undefined, stop: async () => undefined, sendFrame: () => undefined }; } });
    const frame = (participant as unknown as { frame(level: number, data: ArrayBuffer): void }).frame.bind(participant);
    const at = Date.now(); frame(-25, new Int16Array([100]).buffer);
    const event = { type: "interim" as const, caption: { id: "id", sourceTurnId: "11111111-1111-4111-8111-111111111111/turn/1", text: "synthetic", speakerId: null, startedAt: at + 300, audioEndAt: at + 300, isFinal: false } };
    publish(event); publish(event);
    expect(sendCaption.mock.calls[0][2]).toMatchObject({ openRatio: 0, frames: 1, startAt: at, endAt: at });
    expect(setPresence.mock.calls.filter(([p]) => p.latency)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(10000); publish(event);
    expect(setPresence.mock.calls.filter(([p]) => p.latency)).toHaveLength(2);
    await participant.stopMicrophone();
  });
});
