import { describe, expect, it } from "vitest";
import { frameLevelDb, percentile } from "./levels";
describe("headset levels", () => {
  it("measures silence, full scale and half sine", () => { expect(frameLevelDb(new Int16Array(1600))).toBe(-100); expect(frameLevelDb(new Int16Array(1600).fill(32767))).toBeCloseTo(0, 1); const sine = Int16Array.from({ length: 1600 }, (_, i) => Math.round(16384 * Math.sin(i * Math.PI / 800))); expect(frameLevelDb(sine)).toBeCloseTo(-9, 0); });
  it("uses nearest rank percentiles", () => { expect(percentile([], 50)).toBeNull(); expect(percentile([4], 0)).toBe(4); expect(percentile([1, 2, 3, 4], 50)).toBe(2); expect(percentile([1, 2, 3, 4], 90)).toBe(4); });
});
