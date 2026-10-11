import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeadsetMicrophone, type HeadsetCaptureFactory } from "./headset-microphone";

function track() {
  return { label: "AirPods Pro", getSettings: () => ({ autoGainControl: false, noiseSuppression: false, echoCancellation: false }), onended: null } as unknown as MediaStreamTrack;
}

describe("HeadsetMicrophone", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => new MediaStream() } });
  });

  it("does not await prior capture cleanup before starting a new permission request", async () => {
    const events: string[] = [];
    let releasePrevious: (() => void) | undefined;
    let count = 0;
    const factory: HeadsetCaptureFactory = () => {
      count += 1;
      const current = count;
      return {
        async start() { events.push(`start-${current}`); },
        stop() {
          events.push(`stop-${current}`);
          if (current === 1) return new Promise<void>((resolve) => { releasePrevious = resolve; });
          return Promise.resolve();
        },
        getTrack: () => track(),
      };
    };
    const microphone = new HeadsetMicrophone(() => undefined, () => undefined, factory);

    await microphone.start();
    const secondStart = microphone.start();
    await Promise.resolve();

    expect(events).toEqual(["start-1", "stop-1", "start-2"]);
    releasePrevious?.();
    await secondStart;
  });

  it("requests the chosen ID and reports the actual track ID independently of its label", async () => {
    const start = vi.fn(async () => undefined);
    const selectedTrack = {
      label: "Default - AirPods Pro", onended: null,
      getSettings: () => ({ deviceId: "actual-device", autoGainControl: false, noiseSuppression: false, echoCancellation: false }),
    } as unknown as MediaStreamTrack;
    const microphone = new HeadsetMicrophone(() => undefined, () => undefined, () => ({ start, stop: async () => undefined, getTrack: () => selectedTrack }));
    await microphone.start("default-route");
    expect(start).toHaveBeenCalledWith({ constraints: { audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false, deviceId: { exact: "default-route" } } } });
    expect(microphone.info()).toMatchObject({ deviceId: "actual-device", sanitizedLabel: "AirPods Pro" });
    await microphone.stop();
  });
});
