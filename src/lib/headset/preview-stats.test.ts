import { describe, expect, it } from "vitest";
import { GatePreviewStats } from "./preview-stats";
describe("headset preview stats", () => {
  it("counts opens, onsets, overlap and reset", () => { let now = 0; const stats = new GatePreviewStats(() => now); stats.gate("a", true); now = 300; stats.gate("b", true); now = 800; stats.tick(); now = 1000; stats.gate("a", false); now = 1100; stats.gate("b", false); const snapshot = stats.snapshot(); expect(snapshot.participants.a.opens).toBe(1); expect(snapshot.participants.a.openMs).toBe(1000); expect(snapshot.participants.b.openMs).toBe(800); expect(snapshot.pairs[0]).toMatchObject({ coOnsets: 1, overlapMs: 700 }); stats.reset(); expect(stats.snapshot()).toMatchObject({ durationMs: 0, participants: {}, pairs: [] }); });
});
