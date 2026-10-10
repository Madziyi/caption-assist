import { describe, expect, it } from "vitest";
import { captionReducer, initialCaptionState } from "./reducer";
import type { CaptionEvent } from "./types";

const event = (overrides: Partial<CaptionEvent> = {}): CaptionEvent => ({
  id: "turn-1",
  text: "Hello there",
  speakerId: null,
  startedAt: 1,
  isFinal: false,
  ...overrides,
});

describe("captionReducer", () => {
  it("shows interim text and replaces it for the same live turn", () => {
    const first = captionReducer(initialCaptionState, { type: "CAPTION", event: event() });
    const second = captionReducer(first, { type: "CAPTION", event: event({ text: "Hello there, how are" }) });

    expect(second.interim?.text).toBe("Hello there, how are");
    expect(second.finalized).toHaveLength(0);
  });

  it("commits a final caption once and clears its interim", () => {
    const interim = captionReducer(initialCaptionState, { type: "CAPTION", event: event() });
    const final = captionReducer(interim, { type: "CAPTION", event: event({ text: "Hello there.", isFinal: true, endedAt: 2 }) });
    const duplicate = captionReducer(final, { type: "CAPTION", event: event({ text: "Hello there.", isFinal: true, endedAt: 2 }) });

    expect(final.finalized).toHaveLength(1);
    expect(final.finalized[0]?.text).toBe("Hello there.");
    expect(final.interim).toBeNull();
    expect(duplicate.finalized).toHaveLength(1);
  });

  it("preserves finalized captions and clears interim text during reconnect", () => {
    const final = captionReducer(initialCaptionState, { type: "CAPTION", event: event({ isFinal: true }) });
    const interim = captionReducer(final, { type: "CAPTION", event: event({ id: "turn-2", text: "Next" }) });
    const reconnecting = captionReducer(interim, { type: "RECONNECTING", attempt: 1 });

    expect(reconnecting.finalized).toHaveLength(1);
    expect(reconnecting.interim).toBeNull();
    expect(reconnecting.status).toBe("reconnecting");
  });

  it("resets the transcript for a new session", () => {
    const state = captionReducer(
      captionReducer(initialCaptionState, { type: "CAPTION", event: event({ isFinal: true }) }),
      { type: "START" },
    );

    expect(state.status).toBe("requesting_permission");
    expect(state.finalized).toEqual([]);
  });

  it("supports the major session status transitions", () => {
    let state = captionReducer(initialCaptionState, { type: "START" });
    expect(state.status).toBe("requesting_permission");
    state = captionReducer(state, { type: "CONNECTING" });
    state = captionReducer(state, { type: "LISTENING" });
    state = captionReducer(state, { type: "RECONNECTING", attempt: 2 });
    state = captionReducer(state, { type: "STOPPING" });
    state = captionReducer(state, { type: "ENDED" });
    expect(state.status).toBe("ended");
  });
});
