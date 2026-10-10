import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/transcription/session", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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
});
