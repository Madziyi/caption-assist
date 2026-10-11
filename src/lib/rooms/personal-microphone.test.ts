import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonalMicrophone } from "./personal-microphone";
import type { StreamingTranscriptionProvider } from "../captions/provider";
import type { MicrophoneCapture } from "../audio/microphone";
vi.mock("./browser", () => ({ technicalSession: async () => ({ access_token: "test-token" }) }));
describe("personal microphone lifecycle", () => {
  afterEach(() => vi.unstubAllGlobals());
  function fixture() {
    const start = vi.fn().mockResolvedValue(undefined); const stop = vi.fn().mockResolvedValue(undefined);
    const provider = { connect: vi.fn().mockResolvedValue(undefined), terminate: vi.fn().mockResolvedValue(undefined), sendAudio: vi.fn(), onEvent: vi.fn(), onStatus: vi.fn() };
    const state = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "temporary" }))));
    const mic = new PersonalMicrophone("room", vi.fn(), state, vi.fn(), () => provider as unknown as StreamingTranscriptionProvider,
      () => ({ start, stop }) as unknown as MicrophoneCapture);
    return { mic, provider, start, stop, state };
  }
  it("join creates no capture; explicit unmute captures; mute stops before provider termination", async () => {
    const { mic, provider, start, stop, state } = fixture();
    expect(start).not.toHaveBeenCalled();
    await mic.unmute();
    expect(start).toHaveBeenCalledOnce(); expect(state).toHaveBeenLastCalledWith("Microphone active");
    document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("blur"));
    expect(stop).not.toHaveBeenCalled(); expect(provider.terminate).not.toHaveBeenCalled();
    await mic.mute();
    expect(stop).toHaveBeenCalledOnce(); expect(state).toHaveBeenLastCalledWith("Muted");
    expect(stop.mock.invocationCallOrder[0]).toBeLessThan(provider.terminate.mock.invocationCallOrder[0]);
    await mic.unmute(); expect(start).toHaveBeenCalledTimes(2);
  });
  it("stops a pending permission acquisition and never starts STT after mute", async () => {
    const { mic, start, stop, provider } = fixture();
    let resolve!: () => void;
    start.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
    const pending = mic.unmute(); await mic.mute(); resolve(); await pending;
    expect(stop).toHaveBeenCalled(); expect(provider.connect).not.toHaveBeenCalled();
  });
});
