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
    expect((await POST(request({ action: "create" }))).status).toBe(401);
    expect(auth.rpc).not.toHaveBeenCalled();
  });
  it("creates a 256-bit invitation and passes only its hash to storage", async () => {
    auth.authenticate.mockResolvedValue({ userId: "verified-user", supabase: { rpc: auth.rpc } });
    auth.rpc.mockResolvedValue({ data: { roomId: "room" }, error: null });
    const response = await POST(request({ action: "create", actor: "forged-user" }));
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
});
