import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ARBITER, HeadsetArbiter } from "./arbiter";
import { captionReducer, initialCaptionState, type CaptionAction } from "../captions/reducer";
import type { TranscriptionEvent } from "../captions/types";
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(10000); });
afterEach(() => vi.useRealTimers());
function fixture() {
  let state = initialCaptionState; const actions: CaptionAction[] = [];
  const arbiter = new HeadsetArbiter((action) => { actions.push(action); state = captionReducer(state, action); });
  function feed(id: string, text: string, relDb: number | null, final = false, span = [1000, 2000], turn = "turn", openRatio = 1) {
    const sourceTurnId = `${id}/${turn}`;
    const caption = { id: sourceTurnId, sourceTurnId, sourceId: `participant:${id}`, speakerId: id, text, startedAt: span[0], endedAt: final ? span[1] : undefined, audioEndAt: span[1], isFinal: final };
    const event: TranscriptionEvent = final ? { type: "final_turn", sourceTurnId, captions: [caption] } : { type: "interim", caption };
    arbiter.receive(id, event, { relDb, openRatio, startAt: span[0], endAt: span[1] }); return event;
  }
  return { arbiter, feed, actions, get state() { return state; } };
}
describe("headset relative-level arbiter", () => {
  it("suppresses a bleed text duplicate at 0 versus -5 dB", () => {
    const f = fixture(); f.feed("a", "we should leave at five", 0, true); f.feed("b", "we should leave at five", -5, true);
    expect(f.state.finalized.map((c) => c.speakerId)).toEqual(["a"]);
    expect(f.arbiter.snapshot().participants.b.suppressedText).toBe(1);
  });
  it("suppresses garbled bleed on level and sufficient overlap", () => {
    const f = fixture(); f.feed("a", "we should leave at five", -0.5, true); f.feed("b", "should leaf", -6, true);
    expect(f.state.finalized).toHaveLength(1); expect(f.arbiter.snapshot().participants.b.suppressedLevel).toBe(1);
  });
  it("preserves genuine different overlap at -1 versus 0 dB", () => {
    const f = fixture(); f.feed("a", "the train leaves tomorrow", 0, true); f.feed("b", "my appointment is today", -1, true);
    expect(f.state.finalized).toHaveLength(2);
  });
  it("preserves a soft yeah at -3 dB during a long turn", () => {
    const f = fixture(); f.feed("a", "the train leaves tomorrow", 0, true, [1000, 5000]); f.feed("b", "yeah", -3, true, [2000, 2200]);
    expect(f.state.finalized).toHaveLength(2);
  });
  it("restores a hidden interim's non-duplicate final within the 4 dB margin", () => {
    const f = fixture(); f.feed("a", "the train leaves tomorrow", 0); f.feed("b", "my appointment", -3);
    expect(f.state.activeInterims["participant:b"]).toBeUndefined();
    f.feed("a", "the train leaves tomorrow", 0, true); f.feed("b", "my appointment is today", -3, true);
    expect(f.state.finalized).toHaveLength(2); expect(f.arbiter.snapshot().participants.b.restored).toBe(1);
  });
  it("holds the weaker final until the partner final arrives, without flashing it", async () => {
    const f = fixture(); f.feed("a", "we should leave", 0); f.feed("b", "we should leave", -5);
    f.feed("b", "we should leave", -5, true);
    expect(f.state.finalized).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(799); expect(f.state.finalized).toHaveLength(0);
    f.feed("a", "we should leave", 0, true); expect(f.state.finalized.map((c) => c.speakerId)).toEqual(["a"]);
    await vi.advanceTimersByTimeAsync(1); expect(f.state.finalized).toHaveLength(1);
  });
  it("uses the latest partner interim at the 800 ms hold timeout", async () => {
    const f = fixture(); f.feed("a", "we should", 0); f.feed("b", "we should leave", -5, true);
    f.feed("a", "we should leave", 0);
    await vi.advanceTimersByTimeAsync(800); expect(f.state.finalized).toHaveLength(0);
    expect(f.arbiter.snapshot().participants.b.suppressedText).toBe(1);
  });
  it("removes an already shown loser before dispatching the winning final", () => {
    const f = fixture(); f.feed("b", "we should leave", -5, true);
    f.actions.length = 0; f.feed("a", "we should leave", 0, true);
    expect(f.actions[0]).toEqual({ type: "REMOVE_TURN", sourceTurnId: "b/turn" });
    expect(f.actions[1].type).toBe("TRANSCRIPTION_EVENT");
    expect(f.state.finalized.map((c) => c.speakerId)).toEqual(["a"]); expect(f.arbiter.snapshot().participants.b.replaced).toBe(1);
  });
  it("never level-suppresses missing evidence, but evidence wins a text duplicate", () => {
    const f = fixture(); f.feed("a", "the train leaves tomorrow", 0, true); f.feed("b", "my appointment is today", null, true);
    expect(f.state.finalized).toHaveLength(2);
    f.feed("c", "the train leaves tomorrow", null, true); expect(f.state.finalized).toHaveLength(2);
  });
  it("uses open ratio then start time when relative levels are within 1 dB", () => {
    const f = fixture(); f.feed("a", "we should leave", 0, true, [1000, 2000], "turn", 0.2); f.feed("b", "we should leave", -0.5, true, [1000, 2000], "turn", 0.9);
    expect(f.state.finalized.map((c) => c.speakerId)).toEqual(["b"]);
  });
  it("passes revisions only for shown turns; cancellation prevents delayed dispatch", async () => {
    const f = fixture(); const shown = f.feed("a", "we should leave", 0, true); const hidden = f.feed("b", "we should leave", -5, true);
    if (shown.type === "interim" || hidden.type === "interim") throw Error("expected final");
    f.actions.length = 0;
    f.arbiter.receive("a", { ...shown, type: "speaker_revision" }); f.arbiter.receive("b", { ...hidden, type: "speaker_revision" });
    expect(f.actions).toHaveLength(1);
    f.feed("c", "hello", 0); f.feed("d", "other speech", -1, true); f.arbiter.cancelPending();
    f.actions.length = 0; await vi.advanceTimersByTimeAsync(800); expect(f.actions).toHaveLength(0);
  });
  it("bounds retained turns/hidden finals and ignores expired comparison records", async () => {
    const f = fixture(); f.feed("a", "same words", 0, true);
    for (let i = 0; i < 260; i++) f.feed("b", "same words", -5, true, [1000, 2000], `turn-${i}`);
    expect(f.arbiter.hiddenCaptions()).toHaveLength(ARBITER.maxHidden);
    expect((f.arbiter as unknown as { turns: Map<string, unknown> }).turns.size).toBeLessThanOrEqual(ARBITER.maxTurns);
    await vi.advanceTimersByTimeAsync(15001); f.feed("c", "same words", -10, true);
    expect(f.state.finalized.at(-1)?.speakerId).toBe("c");
    f.arbiter.remove("b"); expect(f.arbiter.hiddenCaptions().some((c) => c.participantId === "b")).toBe(false);
  });
});
