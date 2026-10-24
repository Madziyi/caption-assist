import { describe, expect, it } from "vitest";
import { openReadingBlocks } from "./open-reading-blocks";
import { captionReducer, initialCaptionState } from "./reducer";
import type { CaptionEvent } from "./types";
const c = (id: string, speakerId: string | null, text = "Some words", startedAt = 0, isFinal = true): CaptionEvent => ({ id, sourceTurnId: id, speakerId, text, startedAt, audioEndAt: startedAt + 100, endedAt: isFinal ? startedAt + 100 : undefined, isFinal });
const ids = (captions: CaptionEvent[], interim: CaptionEvent | null = null) => openReadingBlocks(captions, interim).map((b) => b.speakerId);

describe("Open reading presentation", () => {
  it("groups multiple provider finals without mutating source records", () => {
    const input = [c("1", "A", "I think we should leave"), c("2", "A", "around seven tomorrow", 200), c("3", "A", "because traffic is lighter.", 400)];
    const snapshot = structuredClone(input); input.forEach(Object.freeze); Object.freeze(input);
    const blocks = openReadingBlocks(input, null);
    expect(blocks).toHaveLength(1); expect(blocks[0].parts.map((p) => p.text)).toEqual(snapshot.map((p) => p.text));
    expect(input).toEqual(snapshot);
  });
  it("splits at the 80 word limit and long pauses without changing identity", () => {
    expect(ids([c("1", "A", "word ".repeat(50)), c("2", "A", "word ".repeat(31), 200)])).toEqual(["A", "A"]);
    const long = openReadingBlocks([c("1", "A", "word ".repeat(161))], null);
    expect(long[0].id).toBe("1");
    expect(long.map((b) => b.speakerId)).toEqual(["A", "A", "A"]);
    expect(long.flatMap((b) => b.parts).map((p) => p.text).join("")).toBe("word ".repeat(161));
    expect(ids([c("1", "A"), c("2", "A", "later", 2101)])).toEqual(["A", "A"]);
    expect(ids([c("1", "A"), c("2", "A", "still", 2100)])).toEqual(["A"]);
  });
  it.each([null, "B"])("shows %s interim immediately in the current window without committing a boundary", (speaker) => {
    const interim = c("2", speaker, "Immediate words", 200, false);
    const blocks = openReadingBlocks([c("1", "A")], interim);
    expect(blocks).toHaveLength(1); expect(blocks[0].parts[1]).toBe(interim); expect(interim.speakerId).toBe(speaker);
    expect(ids([c("1", "A"), c("2", "A", "Corrected", 200)])).toEqual(["A"]);
    expect(ids([c("1", "A"), c("2", "B", "Confirmed", 200)])).toEqual(["A", "B"]);
  });
  it("bridges only an unresolved run surrounded by the same finalized speaker", () => {
    expect(ids([c("1", "A"), c("2", null, "uncertain", 200), c("3", "A", "again", 400)])).toEqual(["A"]);
    expect(ids([c("1", "A"), c("2", null, "uncertain", 200), c("3", "B", "different", 400)])).toEqual(["A", null, "B"]);
    expect(ids([c("1", "A"), c("2", null, "uncertain", 200)])).toEqual(["A", null]);
    expect(ids([c("1", null), c("2", "A", "first known", 200)])).toEqual([null, "A"]);
    expect(ids([c("1", "A"), c("2", null, "uncertain", 3000), c("3", "A", "again", 3200)])).toEqual(["A", null, "A"]);
  });
  it("preserves genuine short finalized interjections", () => {
    expect(ids([c("1", "A", "Should we go?"), c("2", "B", "Yes.", 200), c("3", "A", "Okay.", 400)])).toEqual(["A", "B", "A"]);
  });
  it("recomputes merges and splits from reducer SpeakerRevision without duplicates", () => {
    let state = initialCaptionState;
    for (const caption of [c("1", "A", "First"), c("2", "B", "Middle", 200), c("3", "A", "Last", 400)]) state = captionReducer(state, { type: "CAPTION", event: caption });
    expect(ids(state.finalized)).toEqual(["A", "B", "A"]);
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: { type: "speaker_revision", sourceTurnId: "2", captions: [c("2", "A", "Middle", 200)] } });
    expect(ids(state.finalized)).toEqual(["A"]);
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: { type: "speaker_revision", sourceTurnId: "2", captions: [c("2", "B", "Middle", 200)] } });
    expect(ids(state.finalized)).toEqual(["A", "B", "A"]);
    expect(openReadingBlocks(state.finalized, null).flatMap((b) => b.parts).map((p) => p.text)).toEqual(["First", "Middle", "Last"]);
  });
});
