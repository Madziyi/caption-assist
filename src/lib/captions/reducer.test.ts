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

  it("registers stable speakers in discovery order and keeps Someone out of the registry", () => {
    let state = captionReducer(initialCaptionState, {
      type: "TRANSCRIPTION_EVENT",
      event: { type: "interim", caption: event({ speakerId: null }) },
    });
    state = captionReducer(state, {
      type: "TRANSCRIPTION_EVENT",
      event: {
        type: "final_turn",
        sourceTurnId: "turn-2",
        captions: [event({ id: "turn-2", sourceTurnId: "turn-2", isFinal: true, speakerId: "speaker-a" })],
      },
    });
    state = captionReducer(state, {
      type: "TRANSCRIPTION_EVENT",
      event: {
        type: "final_turn",
        sourceTurnId: "turn-3",
        captions: [event({ id: "turn-3", sourceTurnId: "turn-3", isFinal: true, speakerId: "speaker-b" })],
      },
    });

    expect(state.speakers).toMatchObject([
      { id: "speaker-a", ordinal: 1, side: "left", accentIndex: 0 },
      { id: "speaker-b", ordinal: 2, side: "right", accentIndex: 1 },
    ]);
  });

  it("updates names without changing speaker placement and removes names", () => {
    const withSpeaker = captionReducer(initialCaptionState, {
      type: "TRANSCRIPTION_EVENT",
      event: { type: "interim", caption: event({ speakerId: "speaker-a" }) },
    });
    const renamed = captionReducer(withSpeaker, { type: "RENAME_SPEAKER", speakerId: "speaker-a", name: "  Sarah  " });
    expect(renamed.speakers[0]).toMatchObject({ displayName: "Sarah", ordinal: 1, side: "left", accentIndex: 0 });

    const removed = captionReducer(renamed, { type: "REMOVE_SPEAKER_NAME", speakerId: "speaker-a" });
    expect(removed.speakers[0]?.displayName).toBeNull();
  });

  it("reuses profiles and permits duplicate human-readable names", () => {
    let state = captionReducer(initialCaptionState, {
      type: "TRANSCRIPTION_EVENT",
      event: { type: "interim", caption: event({ speakerId: "speaker-a" }) },
    });
    state = captionReducer(state, {
      type: "TRANSCRIPTION_EVENT",
      event: { type: "interim", caption: event({ id: "turn-2", speakerId: "speaker-a" }) },
    });
    state = captionReducer(state, {
      type: "TRANSCRIPTION_EVENT",
      event: { type: "interim", caption: event({ id: "turn-3", speakerId: "speaker-b" }) },
    });
    state = captionReducer(state, { type: "RENAME_SPEAKER", speakerId: "speaker-a", name: "Alex" });
    state = captionReducer(state, { type: "RENAME_SPEAKER", speakerId: "speaker-b", name: "Alex" });

    expect(state.speakers).toHaveLength(2);
    expect(state.speakers.map((speaker) => speaker.displayName)).toEqual(["Alex", "Alex"]);
  });

  it("replaces finalized segments in place when a speaker revision arrives", () => {
    const initial = captionReducer(initialCaptionState, {
      type: "TRANSCRIPTION_EVENT",
      event: {
        type: "final_turn",
        sourceTurnId: "turn-1",
        captions: [event({ id: "turn-1/segment/0", sourceTurnId: "turn-1", isFinal: true, speakerId: "speaker-a" })],
      },
    });
    const later = captionReducer(initial, {
      type: "TRANSCRIPTION_EVENT",
      event: {
        type: "final_turn",
        sourceTurnId: "turn-2",
        captions: [event({ id: "turn-2/segment/0", sourceTurnId: "turn-2", text: "Later", isFinal: true, speakerId: "speaker-b" })],
      },
    });
    const revised = captionReducer(later, {
      type: "TRANSCRIPTION_EVENT",
      event: {
        type: "speaker_revision",
        sourceTurnId: "turn-1",
        captions: [event({ id: "turn-1/segment/0", sourceTurnId: "turn-1", text: "Hello revised", isFinal: true, speakerId: "speaker-b" })],
      },
    });

    expect(revised.finalized.map((caption) => caption.text)).toEqual(["Hello revised", "Later"]);
  });

  it("keeps diarized room speakers when the Connected roster refreshes and stores voice aliases until a new room", () => {
    let state = captionReducer(initialCaptionState, { type: "CONNECTED_START" });
    const roster = [{ id: "host", ordinal: 1, displayName: "You", side: "left" as const, accentIndex: 6, identityOrigin: "connected-host" as const }];
    state = captionReducer(state, { type: "CONNECTED_SPEAKERS", speakers: roster });
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: { type: "final_turn", sourceTurnId: "t1", captions: [event({ id: "t1", sourceTurnId: "t1", isFinal: true, speakerId: "room/speaker/B" })] } });
    state = captionReducer(state, { type: "CONNECTED_SPEAKERS", speakers: [{ ...roster[0], displayName: "Host" }] });
    expect(state.speakers).toMatchObject([{ id: "host", displayName: "Host" }, { id: "room/speaker/B", ordinal: 1, identityOrigin: "diarized" }]);
    state = captionReducer(state, { type: "SPEAKER_ALIASES", aliases: { "room/speaker/B": "host" } });
    expect(state.speakerAliases).toEqual({ "room/speaker/B": "host" });
    expect(captionReducer(state, { type: "CONNECTED_START" }).speakerAliases).toEqual({});
  });

  it("resets speaker profiles on a new conversation while ended state retains them", () => {
    const listening = captionReducer(initialCaptionState, {
      type: "TRANSCRIPTION_EVENT",
      event: { type: "interim", caption: event({ speakerId: "speaker-a" }) },
    });
    const ended = captionReducer(listening, { type: "ENDED" });
    expect(ended.speakers).toHaveLength(1);
    const newConversation = captionReducer(ended, { type: "START" });
    expect(newConversation.speakers).toEqual([]);
  });
});
