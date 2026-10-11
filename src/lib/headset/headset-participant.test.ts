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
});
