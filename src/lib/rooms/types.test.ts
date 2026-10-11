import { describe, expect, it } from "vitest";
import { exactIdentity, participantProfiles, validateName, validEnvelope } from "./types";
import { captionReducer, initialCaptionState } from "../captions/reducer";
import type { TranscriptionEvent } from "../captions/types";
const event = (id: string, final = false): TranscriptionEvent => {
  const caption = { id, sourceTurnId: id, speakerId: "claimed-other-person", text: "Test caption", startedAt: 1, isFinal: final };
  return final ? { type: "final_turn", sourceTurnId: id, captions: [caption] } : { type: "interim", caption };
};
describe("Connected identity and caption state", () => {
  it("allows Unicode/duplicate display names but rejects empty or long names", () => {
    expect(validateName("  家人  ")).toBe("家人");
    expect(() => validateName(" ")).toThrow();
    expect(() => validateName("a".repeat(41))).toThrow();
  });
  it("reserves navy for You and keeps duplicate named guests distinct", () => {
    const profiles = participantProfiles([
      { id: "host", role: "host", displayName: "You", accentIndex: null, removed: false },
      { id: "sarah", role: "participant", displayName: "Alex", accentIndex: 0, removed: false },
      { id: "james", role: "participant", displayName: "Alex", accentIndex: 1, removed: false },
    ]);
    expect(profiles[0]).toMatchObject({ accentIndex: 6, identityOrigin: "connected-host", displayName: "You" });
    expect(profiles.slice(1).map((p) => p.accentIndex)).toEqual([0, 1]);
    expect(profiles[1].id).not.toBe(profiles[2].id);
  });
  it("binds identity to the authorized channel, preserves simultaneous interims and clears only the finalized stream", () => {
    let state = captionReducer(initialCaptionState, { type: "CONNECTED_START" });
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: exactIdentity(event("turn"), "sarah") });
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: exactIdentity(event("turn"), "james") });
    expect(Object.values(state.activeInterims).map((c) => c.speakerId)).toEqual(["sarah", "james"]);
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: exactIdentity(event("turn", true), "sarah") });
    expect(state.activeInterims["participant:sarah"]).toBeUndefined();
    expect(state.activeInterims["participant:james"].speakerId).toBe("james");
    expect(state.finalized[0].speakerId).toBe("sarah");
    const finalCount = state.finalized.length;
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: exactIdentity(event("turn"), "sarah") });
    expect(state.activeInterims["participant:sarah"]).toBeUndefined();
    expect(state.finalized).toHaveLength(finalCount);
    state = captionReducer(state, { type: "ENDED" });
    expect(state.activeInterims).toEqual({});
    expect(state.finalized).toHaveLength(1);
  });
  it("rejects malformed and oversized broadcast events", () => {
    expect(validEnvelope({ event: event("turn"), sequence: 1, readyAt: 10, streamId: crypto.randomUUID() })).toBe(true);
    expect(validEnvelope({ event: event("turn"), sequence: -1, readyAt: 10 })).toBe(false);
    expect(validEnvelope({ event: { type: "final_turn", captions: "invalid" }, sequence: 1, readyAt: 10, streamId: crypto.randomUUID() })).toBe(false);
    const envelope = { event: event("turn"), sequence: 1, readyAt: 10, streamId: crypto.randomUUID(), evidence: { relDb: -5, openRatio: 0.5, startAt: 0, endAt: 1000 } };
    expect(validEnvelope(envelope)).toBe(true); expect(validEnvelope({ ...envelope, evidence: { ...envelope.evidence, relDb: NaN } })).toBe(false);
  });
});
