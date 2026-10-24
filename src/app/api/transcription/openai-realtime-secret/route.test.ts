import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
const auth = vi.hoisted(() => ({ authenticate: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/rooms/server", async (original) => ({ ...await original<typeof import("@/lib/rooms/server")>(), authenticatedRoomUser: auth.authenticate }));
const room = () => {
  auth.authenticate.mockResolvedValue({ userId: "guest-user", supabase: { rpc: auth.rpc } });
  auth.rpc.mockResolvedValue({ data: { status: "open", mode: "headset", self: { removed: false } }, error: null });
  return new Request("https://caption.test/api/transcription/openai-realtime-secret?roomId=11111111-1111-4111-8111-111111111111", { method: "POST", headers: { Authorization: "Bearer room-token" } });
};
describe("POST /api/transcription/openai-realtime-secret", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); auth.authenticate.mockReset(); auth.rpc.mockReset(); });
  it("reports an optional missing key without affecting any AssemblyAI route", async () => {
    vi.stubEnv("OPENAI_API_KEY", ""); const providerFetch = vi.fn(); vi.stubGlobal("fetch", providerFetch);
    const response = await POST(room());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "configuration_missing" });
    expect(providerFetch).not.toHaveBeenCalled();
  });
  it("mints a transcription-only ephemeral credential and returns no permanent key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "server-only-secret");
    const providerFetch = vi.fn(async () => new Response(JSON.stringify({ client_secret: { value: "ek_ephemeral", expires_at: 123 }, id: "sess", object: "realtime.session" }), { status: 200 })); vi.stubGlobal("fetch", providerFetch);
    const response = await POST(room());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ephemeralKey: "ek_ephemeral", expiresAt: 123 });
    const [url, options] = providerFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(options.headers).toMatchObject({ Authorization: "Bearer server-only-secret" });
    expect(JSON.parse(String(options.body))).toMatchObject({ session: { type: "transcription", audio: { input: { format: { type: "audio/pcm", rate: 24000 }, noise_reduction: null, transcription: { model: "gpt-live-transcribe", delay: "low", languages: ["en"], keywords: [] }, turn_detection: null } } } });
    expect(JSON.stringify(await (await POST(room())).clone().json())).not.toContain("server-only-secret");
  });
  it("refuses non-headset rooms before contacting OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "server-only-secret"); auth.authenticate.mockResolvedValue({ userId: "guest-user", supabase: { rpc: auth.rpc } }); auth.rpc.mockResolvedValue({ data: { status: "open", mode: "connected", self: { removed: false } }, error: null });
    const providerFetch = vi.fn(); vi.stubGlobal("fetch", providerFetch);
    const request = new Request("https://caption.test/api/transcription/openai-realtime-secret?roomId=11111111-1111-4111-8111-111111111111", { method: "POST", headers: { Authorization: "Bearer room-token" } });
    expect((await POST(request)).status).toBe(403);
    expect(providerFetch).not.toHaveBeenCalled();
  });
});
