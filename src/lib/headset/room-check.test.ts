import { describe, expect, it } from "vitest";
import { checkMatrix, RoomCheckRecorder, slotAt } from "./room-check";
it("uses the same peak-relative estimator in the room-check own slot", () => {
  const recorder = new RoomCheckRecorder({ order: ["a", "b"], slotMs: 10000, gapMs: 1500 }, "a", -81.5);
  for (let i = 0; i < 60; i++) recorder.push(i < 30 ? -55 : -27, 2250 + i * 100);
  expect(recorder.result().a).toBe(-27);
});
describe("headset room check", () => { it("uses gap, reading and measurement boundaries", () => { const plan = { order: ["a", "b"], slotMs: 6000, gapMs: 1500 }; expect(slotAt(plan, 0)?.phase).toBe("gap"); expect(slotAt(plan, 1500)?.measuring).toBe(false); expect(slotAt(plan, 2250)?.measuring).toBe(true); expect(slotAt(plan, 7500)?.phase).toBe("gap"); }); it("builds separation bands", () => { const matrix = checkMatrix(["a", "b"], { a: { a: -30, b: -50 }, b: { a: -52, b: -32 } }); expect(matrix.separationDb).toEqual({ a: 20, b: 20 }); expect(matrix.band).toEqual({ a: "clear", b: "clear" }); }); it("filters own quiet frames", () => { const plan = { order: ["a", "b"], slotMs: 6000, gapMs: 1500 }; const recorder = new RoomCheckRecorder(plan, "a", -70); for (let i = 0; i < 5; i++) recorder.push(-30, 2250 + i * 100); expect(recorder.result().a).toBe(-30); }); });
