import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseRoomTransport } from "./transport";
const host = { id: "host", role: "host" as const, displayName: "You", accentIndex: null, removed: false };
const guest = { id: "guest", role: "participant" as const, displayName: "Alex", accentIndex: 0, removed: false };
class Channel {
  listeners = new Map<string, (payload: { payload?: unknown }) => void>();
  presence: Record<string, unknown[]> = {};
  send = vi.fn().mockResolvedValue("ok"); track = vi.fn().mockResolvedValue("ok");
  on(type: string, options: { event: string }, listener: (payload: { payload?: unknown }) => void) { this.listeners.set(`${type}:${options.event}`, listener); return this; }
  subscribe(listener: (status: string) => void) { queueMicrotask(() => listener("SUBSCRIBED")); return this; }
  presenceState() { return this.presence; }
}
function setup(self: typeof host | typeof guest) {
  const channels = new Map<string, Channel>();
  const client = { channel: vi.fn((topic: string) => { const channel = new Channel(); channels.set(topic, channel); return channel; }), removeChannel: vi.fn().mockResolvedValue("ok") };
  const callbacks = { identify: vi.fn(), identification: vi.fn(), registryChanged: vi.fn(), state: vi.fn(), control: vi.fn(), disconnected: vi.fn() };
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
