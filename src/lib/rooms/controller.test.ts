import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectedRoom, type RoomView } from "./controller";
import type { Participant, RoomSnapshot } from "./types";
import type { CaptionAction } from "../captions/reducer";
import { captionReducer, initialCaptionState } from "../captions/reducer";
import { exactIdentity } from "./types";
const mocks = vi.hoisted(() => ({ request: vi.fn(), callbacks: null as unknown, transports: [] as unknown[], mics: [] as unknown[] }));
vi.mock("./browser", () => ({ roomRequest: mocks.request, roomClient: () => ({ realtime: { setAuth: async () => undefined } }), technicalSession: async () => ({ access_token: "test" }) }));
vi.mock("./transport", () => ({ SupabaseRoomTransport: class {
  connect = vi.fn().mockResolvedValue(undefined); disconnect = vi.fn().mockResolvedValue(undefined);
  updateParticipants = vi.fn().mockResolvedValue(undefined); sendControl = vi.fn().mockResolvedValue(undefined);
  setMicrophone = vi.fn().mockResolvedValue(undefined); sendCaption = vi.fn().mockResolvedValue(undefined);
  constructor(_client: unknown, _roomId: unknown, _self: unknown, callbacks: unknown) { mocks.callbacks = callbacks; mocks.transports.push(this); }
} }));
vi.mock("./personal-microphone", () => ({ PersonalMicrophone: class {
  unmute = vi.fn(async () => this.onState("Microphone active")); mute = vi.fn(async () => this.onState("Muted"));
  constructor(_room: unknown, _send: unknown, private onState: (state: string) => void) { mocks.mics.push(this); }
} }));
const host: Participant = { id: "host", role: "host", displayName: "You", accentIndex: null, removed: false };
const guest: Participant = { id: "guest", role: "participant", displayName: "Alex", accentIndex: 0, removed: false };
const snapshot = (self = host): RoomSnapshot => ({ roomId: "room", status: "open", expiresAt: new Date(Date.now() + 10000).toISOString(), self, participants: [host, guest], joinUrl: "https://caption.test/join/test" });
type Callbacks = { caption: (id: string, event: import("../captions/types").TranscriptionEvent) => void; disconnected: () => void; control: (event: unknown) => void };
const callbacks = () => mocks.callbacks as Callbacks;
const caption = (id: string) => ({ type: "final_turn" as const, sourceTurnId: id, captions: [{ id, sourceTurnId: id, sourceId: "participant:guest", speakerId: "guest", text: "Test caption", startedAt: 1, isFinal: true }] });
describe("Connected room lifecycle", () => {
  beforeEach(() => { mocks.request.mockReset(); mocks.mics = []; mocks.transports = []; vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());
  function fixture() {
    let view!: RoomView; let state = initialCaptionState;
    const dispatch = vi.fn((action: CaptionAction) => { state = captionReducer(state, action); });
    const room = new ConnectedRoom((value) => { view = value; }, dispatch);
    return { room, dispatch, get view() { return view; }, get state() { return state; } };
  }
  it.each(["host", "guest"])("%s enters and rejoins muted without acquiring a microphone", async (role) => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot(role === "host" ? host : guest));
    if (role === "host") await f.room.create(); else await f.room.join("token", "Alex");
    expect(f.view.phase).toBe("joined"); expect(f.view.microphone).toBe("Muted");
    expect((mocks.mics[0] as { unmute: ReturnType<typeof vi.fn> }).unmute).not.toHaveBeenCalled();
    await f.room.toggleMicrophone(); expect(f.view.microphone).toBe("Microphone active");
    await f.room.rejoin(); expect(f.view.microphone).toBe("Muted");
    expect((mocks.mics[1] as { unmute: ReturnType<typeof vi.fn> }).unmute).not.toHaveBeenCalled();
    await f.room.dispose();
  });
  it("retains history after disconnect and rename resolves through the registry", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot()); await f.room.create();
    callbacks().caption("guest", caption("turn1"));
    mocks.request.mockResolvedValue({ ...snapshot(), participants: [host, { ...guest, displayName: "New name" }] });
    await vi.advanceTimersByTimeAsync(3000);
    expect(f.state.speakers.find((p) => p.id === "guest")?.displayName).toBe("New name");
    expect(f.state.finalized).toHaveLength(1);
    callbacks().disconnected(); await vi.advanceTimersByTimeAsync(0);
    expect(f.view.phase).toBe("disconnected"); expect(f.view.microphone).toBe("Muted");
    expect(f.state.finalized).toHaveLength(1);
    await f.room.dispose();
  });
  it("filters stale captions after removal and end without deleting history", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot()); await f.room.create();
    callbacks().caption("guest", caption("turn1"));
    mocks.request.mockResolvedValue({ ...snapshot(), participants: [host, { ...guest, removed: true }] });
    await f.room.remove("guest"); callbacks().caption("guest", caption("turn2"));
    expect(f.state.finalized).toHaveLength(1);
    await f.room.end(); callbacks().caption("host", caption("turn3"));
    expect(f.state.finalized).toHaveLength(1); expect(f.view.phase).toBe("ended");
  });
  it.each(["room-ended", "participant-removed"])("%s stops personal capture", async (type) => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot(guest)); await f.room.join("token", "Alex"); await f.room.toggleMicrophone();
    callbacks().control({ type, participantId: "guest" }); await vi.advanceTimersByTimeAsync(0);
    expect(f.view.microphone).toBe("Muted"); expect(f.view.phase).toBe(type === "room-ended" ? "ended" : "removed");
    expect((mocks.mics[0] as { mute: ReturnType<typeof vi.fn> }).mute).toHaveBeenCalled();
  });
  it("leave releases capture and transport", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot(guest)); await f.room.join("token", "Alex"); await f.room.toggleMicrophone(); await f.room.leave();
    expect(f.view.phase).toBe("idle"); expect(f.view.microphone).toBe("Muted");
    expect((mocks.transports[0] as { disconnect: ReturnType<typeof vi.fn> }).disconnect).toHaveBeenCalled();
  });
  it("reconciles authorized guest and You captions before the reducer and resets on re-entry", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot()); await f.room.create();
    const turn = { ...caption("shared"), captions: [{ ...caption("shared").captions[0], text: "We should leave around seven." }] };
    callbacks().caption("guest", exactIdentity(turn, "guest"));
    callbacks().caption("host", exactIdentity(turn, "host"));
    expect(f.state.finalized).toHaveLength(1); expect(f.state.finalized[0].speakerId).toBe("guest");
    const oldCallbacks = callbacks();
    await f.room.rejoin();
    oldCallbacks.caption("guest", exactIdentity({ ...turn, sourceTurnId: "stale", captions: [{ ...turn.captions[0], sourceTurnId: "stale", id: "stale" }] }, "guest"));
    expect(f.state.finalized).toHaveLength(1);
    callbacks().caption("host", exactIdentity({ ...turn, sourceTurnId: "new", captions: [{ ...turn.captions[0], sourceTurnId: "new", id: "new" }] }, "host"));
    expect(f.state.finalized).toHaveLength(2);
    await f.room.dispose();
  });
});
