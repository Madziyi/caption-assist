import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectedRoom, type RoomMicrophoneFactory, type RoomView } from "./controller";
import type { Participant, RoomSnapshot } from "./types";
import type { CaptionAction } from "../captions/reducer";
import { captionReducer, initialCaptionState } from "../captions/reducer";
import type { VoicePhase } from "./voice-identity";
import { CONNECTED_ROOM_ASSEMBLYAI_OPTIONS } from "../captions/provider";
import type { TranscriptionEvent } from "../captions/types";
import type { CaptionEnvelope } from "./types";

const mocks = vi.hoisted(() => ({ request: vi.fn(), callbacks: null as unknown, transports: [] as unknown[], providers: [] as Array<{ connectionId: string; options: unknown }> }));
vi.mock("./browser", () => ({ roomRequest: mocks.request, roomClient: () => ({ realtime: { setAuth: async () => undefined } }), technicalSession: async () => ({ access_token: "test" }) }));
vi.mock("./transport", () => ({ SupabaseRoomTransport: class {
  connect = vi.fn().mockResolvedValue(undefined); disconnect = vi.fn().mockResolvedValue(undefined);
  updateParticipants = vi.fn().mockResolvedValue(undefined); sendControl = vi.fn().mockResolvedValue(undefined); setIdentifyRequest = vi.fn().mockResolvedValue(undefined);
  constructor(_client: unknown, _roomId: unknown, _self: unknown, callbacks: unknown) { mocks.callbacks = callbacks; mocks.transports.push(this); }
} }));
vi.mock("../captions/provider", async (original) => ({
  ...(await original<typeof import("../captions/provider")>()),
  AssemblyAIStreamingProvider: class { constructor(_token: string, public connectionId: string, public options: unknown) { mocks.providers.push(this); } },
}));

type Transport = { sendControl: ReturnType<typeof vi.fn>; setIdentifyRequest: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
type Callbacks = {
  identify(id: string, requestId: string | null): void; identification(phases: Record<string, VoicePhase>, requests: Record<string, string>): void;
  state(id: string, status: string): void; disconnected(): void; control(event: unknown): void;
  caption(id: string, event: TranscriptionEvent, envelope?: CaptionEnvelope): void;
};
class FakeMicrophone {
  start = vi.fn(async () => { this.dispatch({ type: "START" }); this.providerFactory("token"); this.dispatch({ type: "LISTENING" }); });
  stop = vi.fn(async () => { this.dispatch({ type: "STOPPING" }); this.dispatch({ type: "ENDED" }); });
  constructor(public dispatch: (action: CaptionAction) => void, public providerFactory: (token: string) => unknown) {}
  reconnect() { this.dispatch({ type: "RECONNECTING", attempt: 1 }); this.providerFactory("token-2"); this.dispatch({ type: "CONNECTING" }); this.dispatch({ type: "LISTENING" }); }
}

const host: Participant = { id: "host", role: "host", displayName: "You", accentIndex: null, removed: false };
const guest: Participant = { id: "guest", role: "participant", displayName: "Alex", accentIndex: 0, removed: false };
const snapshot = (self = host): RoomSnapshot => ({ roomId: "room", mode: "connected", status: "open", expiresAt: new Date(Date.now() + 10000).toISOString(), self, participants: [host, guest], joinUrl: "https://caption.test/join/test" });
const callbacks = () => mocks.callbacks as Callbacks;
const transport = () => mocks.transports.at(-1) as Transport;
const connection = () => mocks.providers.at(-1)!.connectionId;
let turnCounter = 0;
const spoken = (label: string, text = "Hi, this is Alex. I'm ready for the conversation."): CaptionAction => {
  const sourceTurnId = `${connection()}/turn/${++turnCounter}`;
  return { type: "TRANSCRIPTION_EVENT", event: { type: "final_turn", sourceTurnId,
    captions: [{ id: `${sourceTurnId}/segment/0`, sourceTurnId, text, speakerId: `${connection()}/speaker/${label}`, startedAt: Date.now(), isFinal: true, sourceId: "assemblyai" }] } };
};
const lastIdentification = () => transport().sendControl.mock.calls.map(([event]) => event).filter((event) => event.type === "voice-identification").at(-1) as { phases: Record<string, VoicePhase>; requests: Record<string, string> };
const lastPhases = () => lastIdentification().phases;

describe("Connected room with one host room microphone", () => {
  beforeEach(() => { mocks.request.mockReset(); mocks.transports = []; mocks.providers = []; vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());
  function fixture() {
    let view!: RoomView; let state = initialCaptionState;
    const mics: FakeMicrophone[] = [];
    const factory: RoomMicrophoneFactory = (dispatch, providerFactory) => { const mic = new FakeMicrophone(dispatch, providerFactory as (token: string) => unknown); mics.push(mic); return mic; };
    const dispatch = vi.fn((action: CaptionAction) => { state = captionReducer(state, action); });
    const room = new ConnectedRoom((value) => { view = value; }, dispatch, factory);
    return { room, mics, get view() { return view; }, get state() { return state; } };
  }
  async function hostRoom() {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot());
    await f.room.create(); await vi.advanceTimersByTimeAsync(0);
    return f;
  }
  async function identifyGuest(f: Awaited<ReturnType<typeof hostRoom>>) {
    callbacks().identify("guest", "request-1");
    f.mics[0].dispatch(spoken("B"));
  }

  it("host starts exactly one diarized room microphone; guests join without any microphone", async () => {
    const f = await hostRoom();
    expect(f.view.phase).toBe("joined"); expect(f.view.roomMicrophone).toBe("Listening");
    expect(f.mics).toHaveLength(1); expect(f.mics[0].start).toHaveBeenCalledOnce();
    expect(mocks.providers[0].options).toEqual(CONNECTED_ROOM_ASSEMBLYAI_OPTIONS);
    const g = fixture(); mocks.request.mockResolvedValue(snapshot(guest));
    await g.room.join("token", "Alex"); await vi.advanceTimersByTimeAsync(0);
    expect(g.view.phase).toBe("joined"); expect(g.mics).toHaveLength(0); expect(g.view.roomMicrophone).toBe("Off");
    await g.room.startRoomMicrophone(); expect(g.mics).toHaveLength(0);
    await f.room.dispose(); expect(f.mics[0].stop).toHaveBeenCalled();
  });
  it("arbitrates only authorized headset captions, removes held turns on end and leaves Connected untouched", async () => {
    const f = fixture(); mocks.request.mockResolvedValue({ ...snapshot(), mode: "headset" });
    await f.room.create("headset"); await vi.advanceTimersByTimeAsync(0);
    const cb = callbacks();
    const event: TranscriptionEvent = { type: "final_turn", sourceTurnId: "raw", captions: [{ id: "raw", text: "synthetic caption", speakerId: "claimed", startedAt: 1, endedAt: 1000, isFinal: true }] };
    cb.caption("guest", event, { event, readyAt: Date.now(), sequence: 1, streamId: crypto.randomUUID(), evidence: { relDb: 0, openRatio: 1, startAt: 1, endAt: 1000 } });
    expect(f.state.finalized[0].speakerId).toBe("guest"); expect(f.mics).toHaveLength(0);
    cb.caption("unknown", event); expect(f.state.finalized).toHaveLength(1);
    await f.room.dispose();
    const c = await hostRoom(); callbacks().caption("guest", event); expect(c.state.finalized).toHaveLength(0); await c.room.dispose();
  });
  it("reuses the guest headset participant across rejoin while keeping the microphone stopped", async () => {
    const f = fixture(); mocks.request.mockResolvedValue({ ...snapshot(guest), mode: "headset" });
    await f.room.join("token", "Alex"); const participant = f.room.headsetParticipant;
    expect(f.view.headsetSelf?.mic).toBe("off");
    await f.room.rejoin(); expect(f.room.headsetParticipant).toBe(participant); expect(f.view.headsetSelf?.mic).toBe("stopped");
    await f.room.dispose();
  });

  it("a restored host room waits for an explicit room microphone start", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot());
    expect(await f.room.restore()).toBe("connected"); await vi.advanceTimersByTimeAsync(0);
    expect(f.view.roomMicrophone).toBe("Off"); expect(f.mics).toHaveLength(0);
    await f.room.startRoomMicrophone();
    expect(f.view.roomMicrophone).toBe("Listening"); expect(f.mics).toHaveLength(1);
    await f.room.dispose();
  });

  it("identifies a guest from the room microphone, names their captions and publishes phases to phones", async () => {
    const f = await hostRoom();
    f.mics[0].dispatch(spoken("A", "Before anyone identified, this is unnamed speech."));
    callbacks().identify("guest", "request-1");
    expect(f.view.identification.guest).toBe("listening"); expect(lastIdentification()).toMatchObject({ phases: { guest: "listening" }, requests: { guest: "request-1" } });
    f.mics[0].dispatch(spoken("B"));
    expect(f.state.speakerAliases).toEqual({ [`${connection()}/speaker/B`]: "guest" });
    expect(f.view.identification).toMatchObject({ guest: "identified", host: "unidentified" });
    expect(f.view.identificationNotice).toBe("Alex's voice is identified.");
    expect(lastPhases().guest).toBe("identified");
    expect(f.state.finalized.map((caption) => caption.speakerId)).toEqual([`${connection()}/speaker/A`, `${connection()}/speaker/B`]);
    expect(f.state.speakers.find((speaker) => speaker.id === `${connection()}/speaker/A`)).toMatchObject({ ordinal: 1, identityOrigin: "diarized" });
    await f.room.identify("host"); expect(f.view.identification.host).toBe("listening");
    f.mics[0].dispatch(spoken("B", "This is still Alex talking for a while."));
    expect(f.view.identification.host).toBe("listening");
    await vi.advanceTimersByTimeAsync(21_000);
    expect(f.view.identification.host).toBe("not_found");
    await f.room.dispose();
  });

  it("applies each presence request once and cancels when the phone withdraws it", async () => {
    const f = await hostRoom();
    await identifyGuest(f);
    expect(f.view.identification.guest).toBe("identified");
    callbacks().identify("guest", "request-1");
    expect(f.view.identification.guest).toBe("identified");
    callbacks().identify("guest", "request-2");
    expect(f.view.identification.guest).toBe("listening");
    callbacks().identify("guest", null);
    expect(f.view.identification.guest).toBe("identified");
    expect(lastIdentification().requests).toEqual({});
    await f.room.dispose();
  });

  it("asks everyone to identify again after a provider reconnect while keeping earlier names", async () => {
    const f = await hostRoom();
    await identifyGuest(f);
    const firstSpeaker = `${connection()}/speaker/B`;
    f.mics[0].reconnect();
    expect(f.view.roomMicrophone).toBe("Listening");
    expect(f.view.identification.guest).toBe("needs_again");
    expect(f.view.identificationNotice).toMatch(/identified again/);
    expect(f.state.speakerAliases).toEqual({ [firstSpeaker]: "guest" });
    await f.room.dispose();
  });

  it("keeps captioning and identities through a room network loss and rejoin", async () => {
    const f = await hostRoom();
    await identifyGuest(f);
    callbacks().disconnected(); await vi.advanceTimersByTimeAsync(0);
    expect(f.view.phase).toBe("disconnected"); expect(f.view.roomMicrophone).toBe("Listening");
    expect(f.mics[0].stop).not.toHaveBeenCalled();
    f.mics[0].dispatch(spoken("B", "Still captioning while the room reconnects."));
    expect(f.state.finalized).toHaveLength(2); expect(f.state.status).toBe("listening");
    await f.room.rejoin(); await vi.advanceTimersByTimeAsync(0);
    expect(f.view.phase).toBe("joined"); expect(f.mics).toHaveLength(1);
    expect(f.view.identification.guest).toBe("identified"); expect(lastPhases().guest).toBe("identified");
    await f.room.dispose();
  });

  it("end stops the room microphone first and ignores later provider events", async () => {
    const f = await hostRoom();
    await f.room.end();
    expect(f.mics[0].stop).toHaveBeenCalled(); expect(f.view.phase).toBe("ended"); expect(f.view.roomMicrophone).toBe("Off");
    expect(f.mics[0].stop.mock.invocationCallOrder[0]).toBeLessThan(mocks.request.mock.invocationCallOrder.at(-1)!);
    f.mics[0].dispatch(spoken("B"));
    expect(f.state.finalized).toHaveLength(0);
  });

  it("removal cancels a pending identification", async () => {
    const f = await hostRoom();
    callbacks().identify("guest", "request-1");
    mocks.request.mockResolvedValue({ ...snapshot(), participants: [host, { ...guest, removed: true }] });
    await f.room.remove("guest");
    expect(f.view.identification.guest).toBeUndefined();
    callbacks().identify("guest", "request-2");
    expect(f.view.identification.guest).toBeUndefined();
    await f.room.dispose();
  });

  it("a guest keeps its presence request open until the host acknowledges it and reports an outcome", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot(guest));
    await f.room.join("token", "Alex");
    await f.room.identify();
    const [requestId] = transport().setIdentifyRequest.mock.calls[0];
    expect(requestId).toEqual(expect.any(String));
    expect(f.view.identification.guest).toBe("waiting");
    callbacks().identification({ host: "unidentified", guest: "unidentified" }, {});
    expect(f.view.identification.guest).toBe("waiting");
    callbacks().identification({ host: "unidentified", guest: "listening" }, { guest: requestId });
    expect(f.view.identification.guest).toBe("listening");
    // A stale phase delivered late cannot end the acknowledged request.
    callbacks().identification({ host: "unidentified", guest: "unidentified" }, {});
    expect(f.view.identification.guest).toBe("listening");
    expect(transport().setIdentifyRequest).toHaveBeenCalledTimes(1);
    callbacks().identification({ host: "unidentified", guest: "identified" }, { guest: requestId });
    expect(f.view.identification.guest).toBe("identified");
    expect(transport().setIdentifyRequest).toHaveBeenLastCalledWith(null);
    await f.room.identify();
    expect(transport().setIdentifyRequest).toHaveBeenLastCalledWith(expect.not.stringMatching(requestId));
    await f.room.identify(undefined, "cancel");
    expect(transport().setIdentifyRequest).toHaveBeenLastCalledWith(null);
    expect(f.view.identification.guest).toBe("identified");
    await f.room.dispose();
  });

  it("tells the guest when the host never acknowledges the request", async () => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot(guest));
    await f.room.join("token", "Alex");
    await f.room.identify();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.view.identification.guest).toBe("unidentified");
    expect(f.view.identificationNotice).toMatch(/didn't respond/);
    expect(transport().setIdentifyRequest).toHaveBeenLastCalledWith(null);
    await f.room.dispose();
  });

  it.each(["room-ended", "participant-removed"])("%s ends a guest's participation", async (type) => {
    const f = fixture(); mocks.request.mockResolvedValue(snapshot(guest)); await f.room.join("token", "Alex");
    callbacks().control({ type, participantId: "guest" }); await vi.advanceTimersByTimeAsync(0);
    expect(f.view.phase).toBe(type === "room-ended" ? "ended" : "removed");
    expect(transport().disconnect).toHaveBeenCalled();
  });

  it("leave releases the transport and rename resolves through the registry", async () => {
    const f = await hostRoom();
    mocks.request.mockResolvedValue({ ...snapshot(), participants: [host, { ...guest, displayName: "New name" }] });
    await vi.advanceTimersByTimeAsync(3000);
    expect(f.state.speakers.find((p) => p.id === "guest")?.displayName).toBe("New name");
    const g = fixture(); mocks.request.mockResolvedValue(snapshot(guest)); await g.room.join("token", "Alex"); await g.room.leave();
    expect(g.view.phase).toBe("idle"); expect(transport().disconnect).toHaveBeenCalled();
    await f.room.dispose();
  });
});
