import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { hashInvitation, invitation, RoomFailure } from "@/lib/rooms/server";
const auth = vi.hoisted(() => ({ authenticate: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/rooms/server", async (original) => ({ ...await original<typeof import("@/lib/rooms/server")>(), authenticatedRoomUser: auth.authenticate }));
describe("server room authorization", () => {
  afterEach(() => vi.resetAllMocks());
  const request = (body: unknown) => new Request("https://caption.test/api/rooms", { method: "POST", body: JSON.stringify(body) });
  it("requires a verified user before creating a room", async () => {
    auth.authenticate.mockRejectedValue(new RoomFailure(401, "Reconnect"));
    expect((await POST(request({ action: "create_headset" }))).status).toBe(401);
    expect(auth.rpc).not.toHaveBeenCalled();
  });
  it("creates a 256-bit invitation and passes only its hash to storage", async () => {
    auth.authenticate.mockResolvedValue({ userId: "verified-user", supabase: { rpc: auth.rpc } });
    auth.rpc.mockResolvedValue({ data: { roomId: "room", mode: "headset" }, error: null });
    const response = await POST(request({ action: "create_headset", actor: "forged-user" }));
    const body = await response.json(); const token = body.joinUrl.split("/").at(-1);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(auth.rpc.mock.calls[0][1]).toMatchObject({ actor: "verified-user", token_hash: hashInvitation(token) });
    expect(JSON.stringify(auth.rpc.mock.calls)).not.toContain(token);
    expect(invitation().token).not.toBe(token);
  });
  it.each(["ended", "removed", "forbidden"])("maps %s without exposing database errors", async (failure) => {
    auth.authenticate.mockResolvedValue({ userId: "verified-user", supabase: { rpc: auth.rpc } });
    auth.rpc.mockResolvedValue({ data: null, error: { message: failure } });
    const response = await POST(request({ action: "join", token: "a".repeat(43), name: "Alex" }));
    expect(response.status).toBe(failure === "ended" ? 410 : 403);
  });
  it("rejects the retired create operation before RPC", async () => {
    auth.authenticate.mockResolvedValue({ userId: "verified", supabase: { rpc: auth.rpc } });
    expect((await POST(request({ action: "create" }))).status).toBe(400);
    expect(auth.rpc).not.toHaveBeenCalled();
  });
  it.each(["check", "join", "invite", "rename", "snapshot", "remove", "end"])("rejects legacy %s before mutation", async (action) => {
    auth.authenticate.mockResolvedValue({ userId: "verified", supabase: { rpc: auth.rpc } });
    auth.rpc.mockResolvedValue({ data: { mode: "connected" }, error: null });
    const response = await POST(request({ action, roomId: "11111111-1111-1111-1111-111111111111", participantId: "22222222-2222-2222-2222-222222222222", token: "a".repeat(43), name: "Alex" }));
    expect(response.status).toBe(410);
    expect((await response.json()).message).toBe("This conversation is no longer available.");
    expect(auth.rpc).toHaveBeenCalledTimes(1);
    expect(["check", "snapshot"]).toContain(auth.rpc.mock.calls[0][1].operation);
  });
  it("ignores legacy restore", async () => {
    auth.authenticate.mockResolvedValue({ userId: "verified", supabase: { rpc: auth.rpc } });
    auth.rpc.mockResolvedValue({ data: { mode: "connected" }, error: null });
    const response = await POST(request({ action: "restore" }));
    expect(response.status).toBe(200); expect(await response.json()).toBeNull();
    expect(auth.rpc).toHaveBeenCalledTimes(1);
  });

});
