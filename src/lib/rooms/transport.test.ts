import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseRoomTransport } from "./transport";
import type { HeadsetPresence } from "../headset/messages";
import type { TranscriptionEvent } from "../captions/types";
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
  const callbacks = { identify: vi.fn(), identification: vi.fn(), registryChanged: vi.fn(), state: vi.fn(), control: vi.fn(), disconnected: vi.fn(), deliveryError: vi.fn(), headsetPresence: vi.fn(), headsetSignal: vi.fn(), headsetControl: vi.fn(), caption: vi.fn() };
  const transport = new SupabaseRoomTransport(client as unknown as SupabaseClient, "room", self, callbacks);
  return { channels, client, callbacks, transport };
}
describe("private RoomTransport", () => {
  it("uses only private topics, ignores legacy identification and removed senders", async () => {
    const { channels, client, callbacks, transport } = setup(host);
    await transport.connect([host, guest]);
    for (const call of client.channel.mock.calls) expect((call as unknown as [string, { config: { private: boolean } }])[1].config.private).toBe(true);
    const channel = channels.get("caption-room:room:participant:guest")!;
    channel.presence = { guest: [{ online: true, identify: "legacy-request" }] };
    channel.listeners.get("presence:sync")!({});
    expect(callbacks.state).toHaveBeenLastCalledWith("guest", "Connected");
    expect(callbacks.identify).not.toHaveBeenCalled();
    channels.get("caption-room:room:control")!.listeners.get("broadcast:control")!({ payload: { type: "voice-identification", phases: {}, requests: {} } });
    expect(callbacks.identification).not.toHaveBeenCalled();
    await transport.updateParticipants([host, { ...guest, removed: true }]);
    const calls = callbacks.state.mock.calls.length;
    channel.listeners.get("presence:sync")!({});
    expect(callbacks.state).toHaveBeenCalledTimes(calls);
    await transport.disconnect();
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

  it("deduplicates state and coalesces a burst into the newest snapshot with only current headset metadata", async () => {
    const { channels, transport } = setup(guest);
    await transport.connect([host, guest]);
    const own = channels.get("caption-room:room:participant:guest")!;
    await transport.setHeadsetPresence(headsetState);
    await transport.setHeadsetPresence({ ...headsetState });
    await transport.setHeadsetPresence({ ...headsetState, setup: "voice", floorDb: -65 });
    const ready = { ...headsetState, setup: "ready" as const, floorDb: -65, ownDb: -25 };
    await transport.setHeadsetPresence(ready);
    expect(own.send).toHaveBeenCalledTimes(3);
    expect(own.track).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(12000);
    expect(own.track).toHaveBeenLastCalledWith({ online: true, headset: ready, headsetSession: expect.any(String), headsetSeq: 3 });
    await transport.disconnect();
  });

  it("cancels queued snapshots on disconnect", async () => {
    const { channels, transport } = setup(guest);
    await transport.connect([host, guest]);
    const own = channels.get("caption-room:room:participant:guest")!;
    await transport.setHeadsetPresence(headsetState);
    await vi.advanceTimersByTimeAsync(11000);
    expect(own.track).toHaveBeenCalledTimes(1);
    await transport.disconnect();
    await vi.advanceTimersByTimeAsync(30000);
    expect(own.track).toHaveBeenCalledTimes(1);
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

describe("headset caption relay", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const interim = (text: string): TranscriptionEvent => ({ type: "interim", caption: { id: "raw", sourceTurnId: "raw", text, speakerId: null, startedAt: 1, isFinal: false } });
  const final = (text: string): TranscriptionEvent => ({ type: "final_turn", sourceTurnId: "raw", captions: [{ id: "raw", sourceTurnId: "raw", text, speakerId: null, startedAt: 1, isFinal: true }] });
  it("reports a queued caption send failure without disconnecting a healthy room", async () => {
    const f = setup(guest); await f.transport.connect([host, guest]);
    const channel = f.channels.get("caption-room:room:participant:guest")!;
    const stream = "11111111-1111-4111-8111-111111111111";
    await f.transport.sendCaption!(interim("first"), stream);
    channel.send.mockResolvedValueOnce("error");
    await f.transport.sendCaption!(interim("queued"), stream);
    await vi.advanceTimersByTimeAsync(200);
    expect(f.callbacks.deliveryError).toHaveBeenCalledWith("Caption delivery was interrupted. Retry captions.");
    expect(f.callbacks.disconnected).not.toHaveBeenCalled();
    await f.transport.disconnect();
  });
  it("replaces a queued interim with a final and cancels all queued delivery on disconnect", async () => {
    const f = setup(guest); await f.transport.connect([host, guest]);
    const channel = f.channels.get("caption-room:room:participant:guest")!;
    const stream = "11111111-1111-4111-8111-111111111111";
    const evidence = { relDb: -5, openRatio: 1, startAt: 0, endAt: 1000 };
    await f.transport.sendCaption!(interim("first"), stream, evidence);
    await f.transport.sendCaption!(interim("pending"), stream, evidence);
    await f.transport.sendCaption!(final("final"), stream, evidence);
    await vi.advanceTimersByTimeAsync(200);
    expect(channel.send).toHaveBeenCalledTimes(2);
    expect(channel.send.mock.calls[1][0].payload).toMatchObject({ event: { type: "final_turn" }, evidence });
    await f.transport.sendCaption!(interim("next"), stream); await f.transport.sendCaption!(interim("queued"), stream);
    const before = channel.send.mock.calls.length;
    await f.transport.disconnect(); await vi.advanceTimersByTimeAsync(200);
    expect(channel.send).toHaveBeenCalledTimes(before);
  });
  it("coalesces interims, flushes finals and deduplicates host envelopes", async () => {
    const guestSetup = setup(guest); const hostSetup = setup(host);
    await guestSetup.transport.connect([host, guest]); await hostSetup.transport.connect([host, guest]);
    const guestChannel = guestSetup.channels.get("caption-room:room:participant:guest")!;
    const hostChannel = hostSetup.channels.get("caption-room:room:participant:guest")!;
    await guestSetup.transport.sendCaption!(interim("one"), "11111111-1111-4111-8111-111111111111");
    await guestSetup.transport.sendCaption!(interim("two"), "11111111-1111-4111-8111-111111111111");
    expect(guestChannel.send).toHaveBeenCalledTimes(1); // Leading edge is immediate.
    await vi.advanceTimersByTimeAsync(200);
    expect(guestChannel.send).toHaveBeenCalledTimes(2);
    const first = guestChannel.send.mock.calls[0][0] as { payload: { sequence: number } };
    hostChannel.listeners.get("broadcast:caption")!({ payload: first.payload });
    hostChannel.listeners.get("broadcast:caption")!({ payload: first.payload });
    expect(hostSetup.callbacks.caption).toHaveBeenCalledTimes(1);
    await guestSetup.transport.sendCaption!(final("done"), "11111111-1111-4111-8111-111111111111");
    expect(guestChannel.send).toHaveBeenCalledTimes(3);
    await guestSetup.transport.disconnect(); await hostSetup.transport.disconnect();
  });
});
