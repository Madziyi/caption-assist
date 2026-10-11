import { afterEach, describe, expect, it, vi } from "vitest";
import { AssemblyAIStreamingProvider, connectedAssemblyAIOptions, connectedVoiceFocusProfile, normalizeSpeakerId, TABLE_ASSEMBLYAI_OPTIONS } from "./provider";
import type { TranscriptionEvent } from "./types";

class FakeWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static lastUrl = "";
  static lastSocket: FakeWebSocket | null = null;
  readyState = FakeWebSocket.OPEN;
  binaryType = "";
  onopen: (() => void) | null = null;
  onmessage: ((message: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;

  constructor(url: string) {
    FakeWebSocket.lastUrl = url;
    FakeWebSocket.lastSocket = this;
    queueMicrotask(() => this.onopen?.());
  }

  send(): void {}

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({});
  }
}

describe("AssemblyAIStreamingProvider", () => {
  it("preserves separate mean recognition confidence per segment, excluding invalid values", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const provider = new AssemblyAIStreamingProvider("temporary-token", "confidence");
    const events: TranscriptionEvent[] = []; provider.onEvent(event => events.push(event)); await provider.connect();
    FakeWebSocket.lastSocket?.onmessage?.({ data: JSON.stringify({ type: "Turn", turn_order: 1, end_of_turn: true, end_of_turn_confidence: .99,
      words: [{ text: "Hello", speaker: "A", confidence: .6 }, { text: "there", speaker: "A", confidence: .8 },
        { text: "How", speaker: "B", confidence: .9 }, { text: "are", speaker: "B" }, { text: "you", speaker: "B", confidence: 2 }] }) });
    const result = events[0]; if (result.type === "interim") throw new Error("Expected final");
    expect(result.captions[0].recognitionConfidence).toBeCloseTo(.7);
    expect(result.captions[1].recognitionConfidence).toBe(.9);
    expect(result.captions.map(c => c.confidence)).toEqual([.99, .99]);
  });
  it("averages interim and single-speaker final recognition confidence and tolerates missing values", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const provider = new AssemblyAIStreamingProvider("temporary-token", "confidence", false);
    const events: TranscriptionEvent[] = []; provider.onEvent(event => events.push(event)); await provider.connect();
    for (const end_of_turn of [false, true]) FakeWebSocket.lastSocket?.onmessage?.({ data: JSON.stringify({ type: "Turn", turn_order: 1, end_of_turn,
      words: [{ text: "Sounds", confidence: .7 }, { text: "good", confidence: .9 }, { text: "today" }] }) });
    for (const event of events) expect((event.type === "interim" ? event.caption : event.captions[0]).recognitionConfidence).toBeCloseTo(.8);
    FakeWebSocket.lastSocket?.onmessage?.({ data: JSON.stringify({ type: "Turn", turn_order: 2, end_of_turn: true, words: [{ text: "Okay", confidence: -1 }] }) });
    const last = events.at(-1)!; expect((last.type === "interim" ? last.caption : last.captions[0]).recognitionConfidence).toBeUndefined();
  });
  it("disables diarization for a personal Connected stream", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    await new AssemblyAIStreamingProvider("temporary-token", "personal-stream", false).connect();
    expect(new URL(FakeWebSocket.lastUrl).searchParams.get("speaker_labels")).toBe("false");
  });
  it("configures Connected Voice Focus with the Pro model and exact parameter spelling", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    await new AssemblyAIStreamingProvider("temporary-token", "connected", connectedAssemblyAIOptions("far-field")).connect();
    const params = new URL(FakeWebSocket.lastUrl).searchParams;
    expect(params.get("speech_model")).toBe("universal-3-6-pro");
    expect(params.get("speaker_labels")).toBe("false");
    expect(params.get("voice_focus")).toBe("far-field");
    expect(params.get("mode")).toBe("balanced");
    expect(params.has("voice-focus")).toBe(false);
  });
  it("selects near-field only for the explicit valid profile and defaults safely", () => {
    expect(connectedVoiceFocusProfile("near-field")).toBe("near-field");
    expect(connectedVoiceFocusProfile("near_field")).toBe("far-field");
    expect(connectedVoiceFocusProfile("unexpected")).toBe("far-field");
    expect(TABLE_ASSEMBLYAI_OPTIONS).toEqual({ speechModel: "universal-streaming-english", diarization: true });
  });
  it("surfaces a non-secret Voice Focus rejection category without fallback", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const statuses: string[] = []; const provider = new AssemblyAIStreamingProvider("temporary-token", "connected", connectedAssemblyAIOptions());
    provider.onStatus(status => { if (status.type === "error") statuses.push(status.message); });
    await provider.connect();
    FakeWebSocket.lastSocket?.onmessage?.({ data: JSON.stringify({ type: "Error", error: "configuration rejected" }) });
    expect(statuses.at(-1)).toContain("connected_voice_focus_configuration_rejected");
    expect(statuses.at(-1)).not.toContain("temporary-token");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeWebSocket.lastSocket = null;
  });

  it("preserves the current model and enables diarization without speaker limits", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const provider = new AssemblyAIStreamingProvider("temporary-token", "connection-one");

    await provider.connect();

    const params = new URL(FakeWebSocket.lastUrl).searchParams;
    expect(params.get("speech_model")).toBe("universal-streaming-english");
    expect(params.get("speaker_labels")).toBe("true");
    expect(params.has("max_speakers")).toBe(false);
    expect(params.has("speakers_expected")).toBe(false);
  });

  it("normalizes final turns, splits genuine word-level speaker changes, and hides raw labels", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const provider = new AssemblyAIStreamingProvider("temporary-token", "connection-one");
    const events: TranscriptionEvent[] = [];
    provider.onEvent((event) => events.push(event));
    await provider.connect();

    FakeWebSocket.lastSocket?.onmessage?.({
      data: JSON.stringify({
        type: "Turn",
        turn_order: 4,
        end_of_turn: true,
        transcript: "Hello there, how are you?",
        words: [
          { text: "Hello", start: 10, end: 20, speaker: "A" },
          { text: "there,", start: 20, end: 30, speaker: "A" },
          { text: "how", start: 30, end: 40, speaker: "B" },
          { text: "are", start: 40, end: 50, speaker: "B" },
          { text: "you?", start: 50, end: 60, speaker: "B" },
        ],
      }),
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "final_turn", sourceTurnId: "connection-one/turn/4" });
    if (events[0]?.type !== "final_turn") throw new Error("Expected a final turn");
    expect(events[0].captions.map((caption) => caption.text)).toEqual(["Hello there,", "how are you?"]);
    expect(events[0].captions[0]?.speakerId).toMatch(/^connection-one\/speaker\/s/);
    expect(events[0].captions[0]?.speakerId).not.toContain("/A");
    expect(events[0].captions[1]?.speakerId).not.toContain("/B");
  });

  it.each([undefined, "UNKNOWN", "PENDING", "  unknown  "])('normalizes unresolved speaker label %s to null', (label) => {
    expect(normalizeSpeakerId("connection-one", label)).toBeNull();
  });

  it("emits revisions against the same connection-scoped source turn", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const provider = new AssemblyAIStreamingProvider("temporary-token", "connection-two");
    const events: TranscriptionEvent[] = [];
    provider.onEvent((event) => events.push(event));
    await provider.connect();

    FakeWebSocket.lastSocket?.onmessage?.({
      data: JSON.stringify({
        type: "SpeakerRevision",
        turn_order: 4,
        words: [{ text: "Hello", start: 10, end: 20, speaker: "A" }],
        transcript: "Hello",
      }),
    });

    expect(events[0]).toMatchObject({ type: "speaker_revision", sourceTurnId: "connection-two/turn/4" });
    if (events[0]?.type !== "speaker_revision") throw new Error("Expected a speaker revision");
    expect(events[0].captions[0]?.isFinal).toBe(true);
  });

  it("keeps a single-speaker final turn as one readable caption", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const provider = new AssemblyAIStreamingProvider("temporary-token", "connection-one");
    const events: TranscriptionEvent[] = [];
    provider.onEvent((event) => events.push(event));
    await provider.connect();

    FakeWebSocket.lastSocket?.onmessage?.({
      data: JSON.stringify({
        type: "Turn",
        turn_order: 8,
        end_of_turn: true,
        speaker_label: "A",
        transcript: "That sounds good.",
        utterance: "That sounds good.",
        words: [
          { text: "That", start: 1, end: 2, speaker: "A" },
          { text: "sounds", start: 2, end: 3, speaker: "A" },
          { text: "good.", start: 3, end: 4, speaker: "A" },
        ],
      }),
    });

    if (events[0]?.type !== "final_turn") throw new Error("Expected a final turn");
    expect(events[0].captions).toHaveLength(1);
    expect(events[0].captions[0]).toMatchObject({ text: "That sounds good.", isFinal: true });
  });

  it("keeps the same provider label isolated across connections", () => {
    expect(normalizeSpeakerId("connection-one", "A")).not.toBe(normalizeSpeakerId("connection-two", "A"));
  });
});
