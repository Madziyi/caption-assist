import { describe, expect, it } from "vitest";
import { singleSpeakerReadingBlocks } from "./single-speaker-reading-blocks";
import { captionReducer, initialCaptionState } from "./reducer";
import type { CaptionEvent } from "./types";
const c = (id: string, words: number, isFinal = true, startedAt = 0): CaptionEvent => ({ id, sourceTurnId: id, text: Array.from({ length: words }, (_, i) => `${id}${i}`).join(" "), speakerId: null, startedAt, isFinal });
const text = (blocks: ReturnType<typeof singleSpeakerReadingBlocks>) => blocks.map((b) => b.parts.map((p) => p.text).join(" ")).join(" ").trim().split(/\s+/u);
describe("Single Speaker word-count paragraphs", () => {
  it("shows and splits a continuous live interim before any silence or final", () => {
    const interim = Object.freeze(c("live", 161, false));
    const blocks = singleSpeakerReadingBlocks([], interim);
    expect(blocks.map((b) => text([b]).length)).toEqual([80, 80, 1]);
    expect(text(blocks)).toEqual(interim.text.split(" "));
    expect(blocks[0].id).toBe(singleSpeakerReadingBlocks([], c("live", 79, false))[0].id);
    expect(blocks.every((b) => b.parts.every((p) => !p.isFinal))).toBe(true);
  });
  it("fills paragraphs across provider finals and pauses, independently of identity", () => {
    const finals = [Object.freeze(c("a", 45)), Object.freeze({ ...c("b", 30, true, 60000), speakerId: "ignored" })];
    const interim = c("c", 10, false, 120000);
    const blocks = singleSpeakerReadingBlocks(finals, interim);
    expect(blocks.map((b) => text([b]).length)).toEqual([80, 5]);
    expect(text(blocks)).toEqual([...finals, interim].flatMap((p) => p.text.split(" ")));
    expect(finals[1].speakerId).toBe("ignored");
  });
  it("replaces interim/final and corrections without stale or duplicate words", () => {
    let state = captionReducer(initialCaptionState, { type: "CAPTION", event: c("turn", 81, false) });
    expect(singleSpeakerReadingBlocks(state.finalized, state.interim)).toHaveLength(2);
    state = captionReducer(state, { type: "CAPTION", event: c("turn", 81) });
    expect(text(singleSpeakerReadingBlocks(state.finalized, state.interim))).toHaveLength(81);
    expect(text(singleSpeakerReadingBlocks(state.finalized, c("turn", 81, false)))).toHaveLength(81);
    state = captionReducer(state, { type: "TRANSCRIPTION_EVENT", event: { type: "speaker_revision", sourceTurnId: "turn", captions: [c("turn", 79)] } });
    expect(singleSpeakerReadingBlocks(state.finalized, state.interim)).toHaveLength(1);
    expect(text(singleSpeakerReadingBlocks(state.finalized, state.interim))).toHaveLength(79);
  });
  it("keeps an exact 80 words together and handles empty input", () => {
    expect(singleSpeakerReadingBlocks([], null)).toEqual([]);
    expect(singleSpeakerReadingBlocks([c("a", 0)], null)).toEqual([]);
    expect(singleSpeakerReadingBlocks([c("a", 80)], null)).toHaveLength(1);
  });
});
