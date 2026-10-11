import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseRoomTransport } from "./transport";
import type { HeadsetPresence } from "../headset/messages";
const host = { id: "host", role: "host" as const, displayName: "You", accentIndex: null, removed: false };
const guest = { id: "guest", role: "participant" as const, displayName: "Alex", accentIndex: 0, removed: false };
class Channel {
  listeners = new Map<string, (payload: { payload?: unknown }) => void>();
  presence: Record<string, unknown[]> = {};
  statusListener: ((status: string) => void) | null = null;
  send = vi.fn().mockResolvedValue("ok"); track = vi.fn().mockResolvedValue("ok");
  on(type: string, options: { event: string }, listener: (payload: { payload?: unknown }) => void) { this.listeners.set(`${type}:${options.event}`, listener); return this; }
  subscribe(listener: (status: string) => void) { this.statusListener = listener; queueMicrotask(() => listener("SUBSCRIBED")); return this; }
  presenceState() { return this.presence; }
}
function setup(self: typeof host | typeof guest) {
  const channels = new Map<string, Channel>();
  const client = { channel: vi.fn((topic: string) => { const channel = new Channel(); channels.set(topic, channel); return channel; }), removeChannel: vi.fn().mockResolvedValue("ok") };
  const callbacks = { identify: vi.fn(), identification: vi.fn(), registryChanged: vi.fn(), state: vi.fn(), control: vi.fn(), disconnected: vi.fn(), headsetPresence: vi.fn(), headsetSignal: vi.fn(), headsetControl: vi.fn() };
  const transport = new SupabaseRoomTransport(client as unknown as SupabaseClient, "room", self, callbacks);
  return { channels, client, callbacks, transport };
}
describe("private RoomTransport", () => {
  it("reads identify requests from the participant's own presence state and ignores removed participants", async () => {
    const { channels, client, callbacks, transport } = setup(host);
    await transport.connect([host, guest]);
    for (const call of client.channel.mock.calls) expect((call as unknown as [string, { config: { private: boolean } }])[1].config.private).toBe(true);
    expect(channels.get("caption-room:room:participant:host")!.track).toHaveBeenCalledWith({ online: true });
    const guestChannel = channels.get("caption-room:room:participant:guest")!;
    const sync = guestChannel.listeners.get("presence:sync")!;
    expect(guestChannel.listeners.has("broadcast:identify")).toBe(false);
    guestChannel.presence = { guest: [{ online: true }] };
    sync({});
    expect(callbacks.state).toHaveBeenLastCalledWith("guest", "Connected");
    expect(callbacks.identify).toHaveBeenLastCalledWith("guest", null);
    guestChannel.presence = { guest: [{ online: true, identify: "0b8f2c1e-request" }] };
    sync({});
    expect(callbacks.identify).toHaveBeenLastCalledWith("guest", "0b8f2c1e-request");
    guestChannel.presence = { guest: [{ online: true, identify: "<script>" }] };
    sync({});
    expect(callbacks.identify).toHaveBeenLastCalledWith("guest", null);
    guestChannel.presence = {};
    sync({});
    expect(callbacks.state).toHaveBeenLastCalledWith("guest", "Disconnected");
    const hostChannel = channels.get("caption-room:room:participant:host")!;
    hostChannel.presence = { host: [{ online: true, identify: "0b8f2c1e-request" }] };
    hostChannel.listeners.get("presence:sync")!({});
    expect(callbacks.identify).not.toHaveBeenCalledWith("host", expect.anything());
    channels.get("caption-room:room:presence")!.listeners.get("presence:sync")!({}); expect(callbacks.registryChanged).toHaveBeenCalled();
    const calls = callbacks.identify.mock.calls.length;
    await transport.updateParticipants([host, { ...guest, removed: true }]);
    guestChannel.presence = { guest: [{ online: true, identify: "0b8f2c1e-again" }] };
    sync({});
    expect(callbacks.identify).toHaveBeenCalledTimes(calls);
    await transport.setIdentifyRequest("0b8f2c1e-request");
    expect(hostChannel.track).toHaveBeenCalledTimes(1);
    await transport.disconnect(); sync({}); expect(callbacks.identify).toHaveBeenCalledTimes(calls);
  });

  it("guests publish identify requests as presence on their own channel and accept only valid host phase broadcasts", async () => {
    const { channels, callbacks, transport } = setup(guest);
    await transport.connect([host, guest]);
    expect(channels.has("caption-room:room:participant:host")).toBe(false);
    const own = channels.get("caption-room:room:participant:guest")!;
    await transport.setIdentifyRequest("0b8f2c1e-request");
    expect(own.track).toHaveBeenLastCalledWith({ online: true, identify: "0b8f2c1e-request" });
    await transport.setIdentifyRequest(null);
    expect(own.track).toHaveBeenLastCalledWith({ online: true, identify: null });
    own.presence = { guest: [{ online: true, identify: "0b8f2c1e-request" }] };
    own.listeners.get("presence:sync")!({});
    expect(callbacks.identify).not.toHaveBeenCalled();
    own.track.mockResolvedValueOnce("error");
    await expect(transport.setIdentifyRequest("0b8f2c1e-other")).rejects.toThrow("could not reach the host");
    const control = channels.get("caption-room:room:control")!.listeners.get("broadcast:control")!;
    control({ payload: { type: "voice-identification", phases: { guest: "listening" }, requests: { guest: "0b8f2c1e-request" } } });
    control({ payload: { type: "voice-identification", phases: { guest: "hacked" }, requests: {} } });
    control({ payload: { type: "voice-identification", phases: ["listening"], requests: {} } });
    control({ payload: { type: "voice-identification", phases: { guest: "listening" }, requests: { guest: "<script>" } } });
    control({ payload: { type: "voice-identification", phases: { guest: "listening" } } });
    expect(callbacks.identification.mock.calls).toEqual([[{ guest: "listening" }, { guest: "0b8f2c1e-request" }]]);
    await transport.sendControl({ type: "room-ended" });
    expect(channels.get("caption-room:room:control")!.send).not.toHaveBeenCalled();
  });
});

const headsetState: HeadsetPresence = { mic: "on", input: "headset", label: "AirPods Pro", processing: { autoGainControl: false, noiseSuppression: false, echoCancellation: false }, setup: "quiet", floorDb: null, ownDb: null, visible: true };

describe("headset state transport under Presence limits", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] }); });
  afterEach(() => { vi.useRealTimers(); });

  it("keeps fast setup changes below five Presence writes per 30 seconds while broadcasting them immediately", async () => {
    const { channels, callbacks, transport } = setup(guest);
    await transport.connect([host, guest]);
    const own = channels.get("caption-room:room:participant:guest")!;
    const discovery = channels.get("caption-room:room:presence")!;
    const writes = [Date.now(), Date.now()]; // Both initial tracks count against the connection quota.
    const track = async () => {
      writes.push(Date.now());
      if (writes.filter((at) => Date.now() - at < 30000).length > 5) {
        own.statusListener!("CLOSED");
        return "error";
      }
      return "ok";
    };
    own.track.mockImplementation(track); discovery.track.mockImplementation(track);
    for (let i = 0; i < 31; i += 1) {
      await transport.setHeadsetPresence({ ...headsetState, floorDb: -60 + i / 10 });
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(callbacks.disconnected).not.toHaveBeenCalled();
    expect(own.send).toHaveBeenCalledTimes(31);
    expect(own.track).toHaveBeenCalledTimes(3); // Initial own track plus 12 s and 24 s snapshots.
    expect(writes).toHaveLength(4);
    for (const at of writes) expect(writes.filter((write) => write <= at && at - write < 30000).length).toBeLessThanOrEqual(5);
    await transport.disconnect();
  });

  it("deduplicates state and coalesces a burst into the newest snapshot without dropping identify metadata", async () => {
    const { channels, transport } = setup(guest);
    await transport.connect([host, guest]);
    const own = channels.get("caption-room:room:participant:guest")!;
    await transport.setIdentifyRequest("0b8f2c1e-request");
    await transport.setHeadsetPresence(headsetState);
    await transport.setHeadsetPresence({ ...headsetState });
    await transport.setHeadsetPresence({ ...headsetState, setup: "voice", floorDb: -65 });
    const ready = { ...headsetState, setup: "ready" as const, floorDb: -65, ownDb: -25 };
    await transport.setHeadsetPresence(ready);
    expect(own.send).toHaveBeenCalledTimes(3);
    expect(own.track).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(12000);
    expect(own.track).toHaveBeenLastCalledWith({ online: true, identify: "0b8f2c1e-request", headset: ready, headsetSession: expect.any(String), headsetSeq: 3 });
    await transport.disconnect();
  });

  it("postpones a queued snapshot if another Presence write occurs and cancels it on disconnect", async () => {
    const { channels, transport } = setup(guest);
    await transport.connect([host, guest]);
    const own = channels.get("caption-room:room:participant:guest")!;
    await transport.setHeadsetPresence(headsetState);
    await vi.advanceTimersByTimeAsync(11000);
    await transport.setIdentifyRequest("0b8f2c1e-request");
    await vi.advanceTimersByTimeAsync(1000);
    expect(own.track).toHaveBeenCalledTimes(2);
    await transport.disconnect();
    await vi.advanceTimersByTimeAsync(30000);
    expect(own.track).toHaveBeenCalledTimes(2);
  });

  it("a host receives immediate state, ignores stale snapshots, accepts a new phone session and rejects retired sessions", async () => {
    const { channels, callbacks, transport } = setup(host);
    await transport.connect([host, guest]);
    const own = channels.get("caption-room:room:participant:guest")!;
    const broadcast = own.listeners.get("broadcast:headset-presence")!;
    const sync = own.listeners.get("presence:sync")!;
    const ready = { ...headsetState, setup: "ready" };
    broadcast({ payload: { sessionId: "session-1", seq: 3, presence: ready } });
    expect(callbacks.headsetPresence).toHaveBeenLastCalledWith("guest", ready);
    own.presence = { guest: [{ headset: headsetState, headsetSession: "session-1", headsetSeq: 1 }] };
    sync({});
    expect(callbacks.headsetPresence).toHaveBeenCalledTimes(1);
    broadcast({ payload: { sessionId: "session-2", seq: 1, presence: headsetState } });
    broadcast({ payload: { sessionId: "session-1", seq: 4, presence: ready } });
    expect(callbacks.headsetPresence).toHaveBeenCalledTimes(2);
    expect(callbacks.headsetPresence).toHaveBeenLastCalledWith("guest", headsetState);
    broadcast({ payload: { sessionId: "session-2", seq: 2, presence: { ...headsetState, setup: "invalid" } } });
    expect(callbacks.headsetPresence).toHaveBeenCalledTimes(2);
    await transport.updateParticipants([host, { ...guest, removed: true }]);
    broadcast({ payload: { sessionId: "session-2", seq: 3, presence: ready } });
    expect(callbacks.headsetPresence).toHaveBeenCalledTimes(2);
    await transport.disconnect();
  });

  it("a late host can recover headset state from the snapshot and clears it when the participant leaves", async () => {
    const { channels, callbacks, transport } = setup(host);
    await transport.connect([host, guest]);
    const own = channels.get("caption-room:room:participant:guest")!;
    own.presence = { guest: [{ headset: headsetState, headsetSession: "session-1", headsetSeq: 1 }] };
    own.listeners.get("presence:sync")!({});
    expect(callbacks.headsetPresence).toHaveBeenLastCalledWith("guest", headsetState);
    own.presence = {};
    own.listeners.get("presence:sync")!({});
    expect(callbacks.headsetPresence).toHaveBeenLastCalledWith("guest", null);
    await transport.disconnect();
  });
});
