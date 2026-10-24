import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { RoomFailure } from "@/lib/rooms/server";
const roomAuth = vi.hoisted(() => ({ authenticate: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/rooms/server", async (original) => ({ ...await original<typeof import("@/lib/rooms/server")>(), authenticatedRoomUser: roomAuth.authenticate }));

describe("POST /api/transcription/session", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    roomAuth.authenticate.mockReset(); roomAuth.rpc.mockReset();
  });

  it("returns a controlled configuration failure when the key is missing", async () => {
    vi.stubEnv("ASSEMBLYAI_API_KEY", "");
    const response = await POST();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "configuration_missing",
      message: "Speech service configuration is unavailable.",
    });
  });

  it("reduces the provider response to a temporary token", async () => {
    vi.stubEnv("ASSEMBLYAI_API_KEY", "test-only-secret");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "temporary-token" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ token: "temporary-token" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://streaming.assemblyai.com/v3/token?expires_in_seconds=60",
      expect.objectContaining({ headers: { authorization: "test-only-secret" }, cache: "no-store" }),
    );
  });
  it("requires verified room membership before minting a Headset speech token", async () => {
    const providerFetch = vi.fn(); vi.stubGlobal("fetch", providerFetch);
    roomAuth.authenticate.mockRejectedValue(new RoomFailure(401, "Reconnect"));
    const response = await POST(new Request("https://caption.test/api/transcription/session?roomId=11111111-1111-4111-8111-111111111111", { method: "POST" }));
    expect(response.status).toBe(401); expect(providerFetch).not.toHaveBeenCalled();
  });
  it.each([{ mode: "connected", status: "open", self: { removed: false } }, { mode: "headset", status: "ended", self: { removed: false } }, { mode: "headset", status: "open", self: { removed: true } }])("rejects ended/removed Headset access before contacting AssemblyAI", async (snapshot) => {
    const providerFetch = vi.fn(); vi.stubGlobal("fetch", providerFetch);
    roomAuth.authenticate.mockResolvedValue({ userId: "verified-user", supabase: { rpc: roomAuth.rpc } });
    roomAuth.rpc.mockResolvedValue({ data: snapshot, error: null });
    const response = await POST(new Request("https://caption.test/api/transcription/session?roomId=11111111-1111-4111-8111-111111111111", { method: "POST" }));
    expect(response.status).toBe(403); expect(providerFetch).not.toHaveBeenCalled();
  });
});
