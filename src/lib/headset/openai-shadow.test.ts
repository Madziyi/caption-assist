import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIShadowTranscriber } from "./openai-shadow";

class FakeSocket {
  static OPEN = 1;
  static last: FakeSocket | null = null;
  static url = "";
  static protocols: string[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  constructor(url: string, protocols: string[]) { FakeSocket.url = url; FakeSocket.protocols = protocols; FakeSocket.last = this; }
  send(value: string) { this.sent.push(value); }
  close() { this.readyState = 3; this.onclose?.(); }
  open() { this.readyState = 1; this.onopen?.(); }
}

describe("OpenAI shadow transcriber", () => {
  afterEach(() => { FakeSocket.last = null; vi.unstubAllGlobals(); });
  it("uses only a server-minted ephemeral key and never acquires another microphone", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ephemeralKey: "ek_test" }), { status: 200 }));
    const callbacks = { onState: vi.fn(), onDelta: vi.fn(), onCommitted: vi.fn(), onCompleted: vi.fn() };
    const shadow = new OpenAIShadowTranscriber("room", callbacks, { fetch: fetcher, session: async () => ({ access_token: "room-token" }), WebSocket: FakeSocket as unknown as typeof WebSocket, now: () => 42 });
    await shadow.start();
    expect(fetcher).toHaveBeenCalledWith("/api/transcription/openai-realtime-secret?roomId=room", expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer room-token" } }));
    expect(FakeSocket.url).toBe("wss://api.openai.com/v1/realtime?intent=transcription");
    expect(FakeSocket.protocols).toEqual(["realtime", "openai-insecure-api-key.ek_test"]);
    expect(FakeSocket.protocols.join(" ")).not.toContain("OPENAI_API_KEY");
    FakeSocket.last!.open();
    expect(shadow.appendAudio(new ArrayBuffer(4))).toBe(true);
    expect(JSON.parse(FakeSocket.last!.sent[0])).toMatchObject({ type: "input_audio_buffer.append" });
    expect(shadow.commit()).toBe(true);
    expect(JSON.parse(FakeSocket.last!.sent[1])).toEqual({ type: "input_audio_buffer.commit" });
    FakeSocket.last!.onmessage?.({ data: JSON.stringify({ type: "input_audio_buffer.committed", item_id: "item-1" }) });
    FakeSocket.last!.onmessage?.({ data: JSON.stringify({ type: "conversation.item.input_audio_transcription.delta", item_id: "item-1", delta: "Hello" }) });
    FakeSocket.last!.onmessage?.({ data: JSON.stringify({ type: "conversation.item.input_audio_transcription.completed", item_id: "item-1", transcript: "Hello there" }) });
    expect(callbacks.onCommitted).toHaveBeenCalledWith("item-1");
    expect(callbacks.onDelta).toHaveBeenCalledWith("Hello", 42, "item-1");
    expect(callbacks.onCompleted).toHaveBeenCalledWith("Hello there", "item-1", 42);
    await shadow.stop();
  });
  it("isolates credential and provider failures as unavailable", async () => {
    const callbacks = { onState: vi.fn(), onDelta: vi.fn(), onCommitted: vi.fn(), onCompleted: vi.fn() };
    const shadow = new OpenAIShadowTranscriber("room", callbacks, { fetch: vi.fn(async () => new Response("{}", { status: 503 })), session: async () => ({ access_token: "room-token" }) });
    await shadow.start();
    expect(callbacks.onState).toHaveBeenLastCalledWith("unavailable");
    expect(shadow.appendAudio(new ArrayBuffer(2))).toBe(false);
  });
});
