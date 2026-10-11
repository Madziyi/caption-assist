import { describe, expect, it } from "vitest";
import { readingBlocks, READING_BLOCKS } from "./reading-blocks";
import { captionReducer, initialCaptionState } from "./reducer";
import type { CaptionEvent } from "./types";
const caption = (id: string, start = 0, speaker = "a", text = "Some speech."): CaptionEvent => ({ id, sourceTurnId: id, sourceId: `participant:${speaker}`, speakerId: speaker, text, startedAt: start, endedAt: start + 500, isFinal: true });

describe("headset reading blocks (presentation only)", () => {
  it("continues several sentences and short pauses with one label, without changing source captions", () => {
    const a = caption("a"), b = caption("b", 800, "a", "Another sentence.");
    const blocks = readingBlocks([a, b], []);
    expect(blocks).toHaveLength(1); expect(blocks[0].parts).toEqual([a, b]);
    expect(blocks[0].parts[0]).toBe(a); expect(a.text).toBe("Some speech.");
  });
  it("includes a continuing interim immediately in the same block", () => {
    const live = { ...caption("live", 700), isFinal: false, endedAt: undefined, audioEndAt: 950 };
    expect(readingBlocks([caption("a")], [live])[0].parts).toHaveLength(2);
  });
  it("starts a block on a speaker change, a substantial pause or a source change", () => {
    expect(readingBlocks([caption("a"), caption("b", 600, "b"), caption("c", 1200)], [])).toHaveLength(3);
    expect(readingBlocks([caption("a"), caption("b", 501 + READING_BLOCKS.pauseMs)], [])).toHaveLength(2);
    expect(readingBlocks([caption("a"), { ...caption("b", 600), sourceId: "another-mic" }], [])).toHaveLength(2);
  });
  it("does not join unknown speakers or overlapping spans", () => {
    expect(readingBlocks([{ ...caption("a"), speakerId: null }, { ...caption("b", 600), speakerId: null }], [])).toHaveLength(2);
    expect(readingBlocks([caption("a"), caption("b", 250)], [])).toHaveLength(2);
  });
  it("keeps genuine simultaneous live sources separate", () => {
    const a = { ...caption("live-a", 700), isFinal: false, audioEndAt: 1200 };
    const b = { ...caption("live-b", 750, "b"), isFinal: false, audioEndAt: 1200 };
    expect(readingBlocks([caption("a")], [a, b])).toHaveLength(3);
  });
  it("limits block length at turn boundaries and preserves a single long provider turn", () => {
    const long = "word ".repeat(READING_BLOCKS.maxWords).trim();
    expect(readingBlocks([caption("a", 0, "a", long), caption("b", 600)], [])).toHaveLength(2);
    expect(readingBlocks([caption("a", 0, "a", long + " extra")], [])[0].parts).toHaveLength(1);
  });
  it("does not reorder final ingest order or repeat an interim for an already-final turn", () => {
    const a = caption("a", 1000), b = caption("b", 0, "b");
    expect(readingBlocks([a, b], [{ ...a, isFinal: false }]).map((block) => block.id)).toEqual(["a", "b"]);
  });
  it("recomputes text after revisions and duplicate removal without merging reducer records", () => {
    let state = captionReducer(initialCaptionState, { type: "TRANSCRIPTION_EVENT", event: { type: "final_turn", sourceTurnId: "a", captions: [caption("a")] } });
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: { type: "final_turn", sourceTurnId: "b", captions: [caption("b", 700)] } });
    expect(state.finalized).toHaveLength(2); expect(readingBlocks(state.finalized, [])).toHaveLength(1);
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: { type: "speaker_revision", sourceTurnId: "b", captions: [caption("b", 700, "a", "Corrected wording.")] } });
    expect(readingBlocks(state.finalized, [])[0].parts[1].text).toBe("Corrected wording.");
    state = captionReducer(state, { type: "REMOVE_TURN", sourceTurnId: "a" });
    expect(readingBlocks(state.finalized, [])[0].parts.map((part) => part.id)).toEqual(["b"]);
  });
});
