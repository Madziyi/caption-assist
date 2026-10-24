import { describe, expect, it } from "vitest";
import { singleSpeakerReadingBlocks } from "./single-speaker-reading-blocks";
import { captionReducer, initialCaptionState } from "./reducer";
import type { CaptionEvent } from "./types";
const c = (id: string, startedAt = 0, audioEndAt = startedAt + 100, isFinal = true): CaptionEvent => ({ id, sourceTurnId: id, text: id, speakerId: null, startedAt, audioEndAt, isFinal });
const text = (blocks: ReturnType<typeof singleSpeakerReadingBlocks>) => blocks.flatMap((b) => b.parts).map((p) => p.text);
describe("Single Speaker pause-based paragraphs", () => {
  it("keeps continuous speech together without any word limit", () => {
    const interim = Object.freeze({ ...c("live", 0, 16000, false), text: "word ".repeat(161).trim() });
    const blocks = singleSpeakerReadingBlocks([], interim);
    expect(blocks).toHaveLength(1); expect(text(blocks)).toEqual([interim.text]);
    expect(blocks[0].parts[0].isFinal).toBe(false);
    expect(blocks[0].id).toBe(singleSpeakerReadingBlocks([], { ...interim, text: "word" })[0].id);
  });
  it.each([[2999, 1], [3000, 2], [3001, 2]])("uses a %i ms audio pause for %i paragraphs, even before resumed speech finalizes", (gap, count) => {
    const first = Object.freeze(c("before", 0, 1000));
    const resumed = Object.freeze(c("after", 1000 + gap, 4500, false));
    const blocks = singleSpeakerReadingBlocks([first], resumed);
    expect(blocks).toHaveLength(count); expect(text(blocks)).toEqual(["before", "after"]);
    expect(blocks.at(-1)!.parts.at(-1)!.isFinal).toBe(false);
  });
  it("does not break for provider finals, short pauses or identity changes", () => {
    const finals = [Object.freeze(c("a")), Object.freeze({ ...c("b", 400), speakerId: "ignored" }), c("c", 600)];
    expect(singleSpeakerReadingBlocks(finals, c("d", 900, 1000, false))).toHaveLength(1);
    expect(finals[1].speakerId).toBe("ignored");
  });
  it("prefers last-word audio timing over end-of-turn delivery and handles missing timing conservatively", () => {
    expect(singleSpeakerReadingBlocks([{ ...c("a", 0, 1000), endedAt: 3500 }], c("b", 4000, 4100, false))).toHaveLength(2);
    expect(singleSpeakerReadingBlocks([{ ...c("a"), audioEndAt: undefined, endedAt: 1000 }], c("b", 4000))).toHaveLength(2);
    expect(singleSpeakerReadingBlocks([{ ...c("a"), audioEndAt: undefined }], c("b", 60000))).toHaveLength(1);
    expect(singleSpeakerReadingBlocks([c("a", 1000, 2000)], c("overlap", 1500))).toHaveLength(1);
  });
  it("recomputes final/correction replacements without duplicates", () => {
    let state = captionReducer(initialCaptionState, { type: "CAPTION", event: c("first", 0, 1000) });
    state = captionReducer(state, { type: "CAPTION", event: c("resumed", 4000, 4500, false) });
    expect(singleSpeakerReadingBlocks(state.finalized, state.interim)).toHaveLength(2);
    state = captionReducer(state, { type: "CAPTION", event: c("resumed", 4000, 4500) });
    expect(text(singleSpeakerReadingBlocks(state.finalized, state.interim))).toEqual(["first", "resumed"]);
    expect(text(singleSpeakerReadingBlocks(state.finalized, c("resumed", 4000, 4500, false)))).toEqual(["first", "resumed"]);
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: { type: "speaker_revision", sourceTurnId: "resumed", captions: [c("resumed", 2000, 4500)] } });
    expect(singleSpeakerReadingBlocks(state.finalized, state.interim)).toHaveLength(1);
  });
  it("handles empty input without blank paragraphs", () => {
    expect(singleSpeakerReadingBlocks([], null)).toEqual([]);
    expect(singleSpeakerReadingBlocks([{ ...c("a"), text: " " }], null)).toEqual([]);
  });
});
