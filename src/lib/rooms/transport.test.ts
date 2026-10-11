import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseRoomTransport } from "./transport";
const host = { id: "host", role: "host" as const, displayName: "You", accentIndex: null, removed: false };
const guest = { id: "guest", role: "participant" as const, displayName: "Alex", accentIndex: 0, removed: false };
class Channel {
  listeners = new Map<string, (payload: { payload?: unknown }) => void>();
  send = vi.fn().mockResolvedValue("ok"); track = vi.fn().mockResolvedValue("ok");
  on(type: string, options: { event: string }, listener: (payload: { payload?: unknown }) => void) { this.listeners.set(`${type}:${options.event}`, listener); return this; }
  subscribe(listener: (status: string) => void) { queueMicrotask(() => listener("SUBSCRIBED")); return this; }
  presenceState() { return {}; }
}
describe("private RoomTransport", () => {
  it("binds forged speaker claims to the channel owner, deduplicates, supports re-entry streams and blocks locally removed senders", async () => {
    const channels = new Map<string, Channel>();
    const client = { channel: vi.fn((topic: string) => { const channel = new Channel(); channels.set(topic, channel); return channel; }), removeChannel: vi.fn().mockResolvedValue("ok") };
    const caption = vi.fn(); const registryChanged = vi.fn();
    const transport = new SupabaseRoomTransport(client as unknown as SupabaseClient, "room", host, { caption, registryChanged, state: vi.fn(), control: vi.fn(), disconnected: vi.fn(), relay: vi.fn() });
    await transport.connect([host, guest]);
    for (const call of client.channel.mock.calls) expect((call as unknown as [string, { config: { private: boolean } }])[1].config.private).toBe(true);
    const receiver = channels.get("caption-room:room:participant:guest")!.listeners.get("broadcast:caption")!;
    const payload = { sequence: 1, streamId: crypto.randomUUID(), readyAt: 5, event: { type: "interim", caption: { id: "turn", sourceTurnId: "turn", text: "Synthetic", startedAt: 1, isFinal: false, speakerId: "host" } } };
    receiver({ payload }); receiver({ payload });
    expect(caption).toHaveBeenCalledTimes(1); expect(caption.mock.calls[0][1].caption.speakerId).toBe("guest");
    receiver({ payload: { ...payload, streamId: crypto.randomUUID() } }); expect(caption).toHaveBeenCalledTimes(2);
    channels.get("caption-room:room:presence")!.listeners.get("presence:sync")!({}); expect(registryChanged).toHaveBeenCalled();
    await transport.updateParticipants([host, { ...guest, removed: true }]); receiver({ payload: { ...payload, sequence: 2 } });
    expect(caption).toHaveBeenCalledTimes(2);
    await transport.disconnect(); receiver({ payload: { ...payload, sequence: 3 } }); expect(caption).toHaveBeenCalledTimes(2);
  });
});
