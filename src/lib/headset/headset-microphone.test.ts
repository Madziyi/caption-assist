import { beforeEach, describe, expect, it } from "vitest";
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
});
