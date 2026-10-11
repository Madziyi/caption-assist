import { describe, expect, it, vi } from "vitest";
import type { ProviderStatus, StreamingTranscriptionProvider } from "../captions/provider";
import type { TranscriptionEvent } from "../captions/types";
import { HeadsetTranscriber } from "./headset-transcriber";

class FakeProvider implements StreamingTranscriptionProvider {
  events = new Set<(event: TranscriptionEvent) => void>();
  statuses = new Set<(status: ProviderStatus) => void>();
  sent: ArrayBuffer[] = [];
  connected = false;
  terminated = false;
  async connect() { this.connected = true; }
  sendAudio(frame: ArrayBuffer) { this.sent.push(frame); }
  async terminate() { this.terminated = true; }
  onEvent(listener: (event: TranscriptionEvent) => void) { this.events.add(listener); return () => this.events.delete(listener); }
  onStatus(listener: (status: ProviderStatus) => void) { this.statuses.add(listener); return () => this.statuses.delete(listener); }
  emit(event: TranscriptionEvent) { this.events.forEach((listener) => listener(event)); }
  emitStatus(status: ProviderStatus) { this.statuses.forEach((listener) => listener(status)); }
}

describe("headset transcriber", () => {
  it("requests a room token, uses a fresh UUID stream and normalizes turns", async () => {
    const provider = new FakeProvider();
    const states: string[] = []; const events: TranscriptionEvent[] = [];
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ token: "temporary" }), { status: 200 }));
    const transcriber = new HeadsetTranscriber("room", (event) => events.push(event), (state) => states.push(state), { fetch: fetcher, session: async () => ({ access_token: "bearer" }), providerFactory: (_token, streamId) => { expect(streamId).toMatch(/^[\da-f-]{36}$/i); return provider; } });
    await transcriber.start();
    expect(fetcher).toHaveBeenCalledWith("/api/transcription/session?roomId=room", expect.objectContaining({ headers: { Authorization: "Bearer bearer" } }));
    transcriber.sendFrame(new ArrayBuffer(4));
    expect(provider.sent).toHaveLength(1);
    provider.emit({ type: "interim", caption: { id: "raw/turn/3/segment/0", sourceTurnId: "raw/turn/3", text: "Hello", speakerId: null, startedAt: 1, isFinal: false } });
    expect(events[0]).toMatchObject({ type: "interim", caption: { sourceId: "personal", speakerId: null } });
    expect(states).toEqual(["connecting", "on"]);
    await transcriber.stop();
    expect(provider.terminated).toBe(true);
    expect(states.at(-1)).toBe("off");
  });
});
