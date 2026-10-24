import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeadsetRoom, type RoomView } from "./controller";
import type { Participant, RoomSnapshot } from "./types";
import type { CaptionAction } from "../captions/reducer";
import { captionReducer, initialCaptionState } from "../captions/reducer";
import type { TranscriptionEvent } from "../captions/types";
import type { CaptionEnvelope } from "./types";

const mocks = vi.hoisted(() => ({ request: vi.fn(), callbacks: null as unknown, transports: [] as unknown[], providers: [] as Array<{ connectionId: string; options: unknown }> }));
vi.mock("./browser", () => ({ roomRequest: mocks.request, roomClient: () => ({ realtime: { setAuth: async () => undefined } }), technicalSession: async () => ({ access_token: "test" }) }));
vi.mock("./transport", () => ({ SupabaseRoomTransport: class {
  connect = vi.fn().mockResolvedValue(undefined); disconnect = vi.fn().mockResolvedValue(undefined);
  updateParticipants = vi.fn().mockResolvedValue(undefined); sendControl = vi.fn().mockResolvedValue(undefined);
  constructor(_client: unknown, _roomId: unknown, _self: unknown, callbacks: unknown) { mocks.callbacks = callbacks; mocks.transports.push(this); }
} }));
vi.mock("../captions/provider", async (original) => ({
  ...(await original<typeof import("../captions/provider")>()),
  AssemblyAIStreamingProvider: class { constructor(_token: string, public connectionId: string, public options: unknown) { mocks.providers.push(this); } },
}));

type Transport = { sendControl: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
type Callbacks = {
  state(id: string, status: string): void; disconnected(): void; control(event: unknown): void;
  caption(id: string, event: TranscriptionEvent, envelope?: CaptionEnvelope): void;
};
const host: Participant = { id: "host", role: "host", displayName: "You", accentIndex: null, removed: false };
const guest: Participant = { id: "guest", role: "participant", displayName: "Alex", accentIndex: 0, removed: false };
const snapshot = (self = host): RoomSnapshot => ({ roomId: "room", mode: "headset", status: "open", expiresAt: new Date(Date.now() + 10000).toISOString(), self, participants: [host, guest], joinUrl: "https://caption.test/join/test" });
const callbacks = () => mocks.callbacks as Callbacks;
const transport = () => mocks.transports.at(-1) as Transport;

describe("Headset room lifecycle", () => {
  beforeEach(() => { mocks.request.mockReset(); mocks.transports = []; mocks.providers = []; vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());
  function fixture() {
    let view!: RoomView; let state = initialCaptionState;
    const dispatch = vi.fn((action: CaptionAction) => { state = captionReducer(state, action); });
    const room = new HeadsetRoom((value) => { view = value; }, dispatch);
    return { room, get view() { return view; }, get state() { return state; } };
  }
  it("creates only Headset rooms and never starts host capture implicitly", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot());
    await f.room.create();
    expect(mocks.request).toHaveBeenCalledWith("create_headset");
    expect(f.view.phase).toBe("joined");
    expect(f.room.headsetParticipant).toBeNull();
    expect(f.view).not.toHaveProperty("identification");
    expect(f.view).not.toHaveProperty("roomMicrophone");
    await f.room.dispose();
  });
  it("ignores legacy restore and rejects a legacy join before subscribing", async () => {
    const f = fixture(); mocks.request.mockResolvedValue({ ...snapshot(), mode: "connected" });
    expect(await f.room.restore()).toBeNull();
    await expect(f.room.join("legacy", "Alex")).rejects.toThrow("no longer available");
    expect(mocks.transports).toHaveLength(0);
    await f.room.dispose();
  });
  it("restores Headset without capture and preserves invite, rename, remove and end", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot());
    expect(await f.room.restore()).toBe("headset");
    expect(f.room.headsetParticipant).toBeNull();
    expect(await f.room.invite()).toBe(snapshot().joinUrl);
    await f.room.rename("Alex"); expect(mocks.request).toHaveBeenCalledWith("rename", { roomId: "room", name: "Alex" });
    mocks.request.mockResolvedValue({ ...snapshot(), participants: [host, { ...guest, removed: true }] });
    await f.room.remove("guest"); expect(transport().sendControl).toHaveBeenCalledWith({ type: "participant-removed", participantId: "guest" });
    await f.room.end(); expect(f.view.phase).toBe("ended");
    await f.room.dispose();
  });
  it("arbitrates only authorized headset captions, removes held turns on end", async () => {
    const f = fixture(); mocks.request.mockResolvedValue({ ...snapshot(), mode: "headset" });
    await f.room.create(); await vi.advanceTimersByTimeAsync(0);
    const cb = callbacks();
    const event: TranscriptionEvent = { type: "final_turn", sourceTurnId: "raw", captions: [{ id: "raw", text: "synthetic caption", speakerId: "claimed", startedAt: 1, endedAt: 1000, isFinal: true }] };
    cb.caption("guest", event, { event, readyAt: Date.now(), sequence: 1, streamId: crypto.randomUUID(), evidence: { relDb: 0, openRatio: 1, startAt: 1, endAt: 1000 } });
    expect(f.state.finalized[0].speakerId).toBe("guest");
    cb.caption("unknown", event); expect(f.state.finalized).toHaveLength(1);
    await f.room.dispose();
  });
  it("reuses the guest headset participant across rejoin while keeping the microphone stopped", async () => {
    const f = fixture(); mocks.request.mockResolvedValue({ ...snapshot(guest), mode: "headset" });
    await f.room.join("token", "Alex"); const participant = f.room.headsetParticipant;
    expect(f.view.headsetSelf?.mic).toBe("off");
    await f.room.rejoin(); expect(f.room.headsetParticipant).toBe(participant); expect(f.view.headsetSelf?.mic).toBe("stopped");
    await f.room.dispose();
  });
});
