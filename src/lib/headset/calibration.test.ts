import { describe, expect, it } from "vitest";
import { applySensitivity, gateThresholds, ownVoiceLevel, quietFloor, separationBand, sensitivityDb } from "./calibration";
describe("headset calibration", () => {
  it("estimates digitally silenced headset speech using the peak-relative threshold", () => {
    expect(ownVoiceLevel([...Array(30).fill(-55), ...Array(30).fill(-27)], -81.5)).toEqual({ ok: true, ownDb: -27 });
  });
  it("maps legacy values and applies continuous sensitivity with both clamps and own-reference ceiling", () => {
    expect(["lower", "normal", "higher"].map((s) => sensitivityDb(s as "lower" | "normal" | "higher"))).toEqual([-4, 0, 3]);
    const c = { floorDb: -41.4, ownDb: -20 };
    expect(applySensitivity({ openDb: -30, closeDb: -34 }, -6, c)).toEqual({ openDb: -24, closeDb: -28 });
    expect(applySensitivity({ openDb: -30, closeDb: -34 }, 6, c).openDb).toBe(-35.4);
    expect(applySensitivity({ openDb: -20, closeDb: -24 }, -15, c, -18).openDb).toBe(-12);
    expect(applySensitivity({ openDb: -11, closeDb: -15 }, -15, { floorDb: -40, ownDb: -1 }).openDb).toBe(4);
  });
  it("calculates floor and own voice", () => { expect(quietFloor([-70, -72, -71])).toBe(-71); expect(ownVoiceLevel(Array(12).fill(-40), -70)).toEqual({ ok: true, ownDb: -40 }); expect(ownVoiceLevel(Array(9).fill(-30), -70)).toEqual({ ok: false, reason: "too_short" }); expect(ownVoiceLevel(Array(12).fill(-61), -70)).toEqual({ ok: false, reason: "too_quiet" }); });
  it("uses floor minimum and bands", () => { expect(gateThresholds({ floorDb: -70, ownDb: -30 }, null)).toEqual({ openDb: -40, closeDb: -44 }); expect(separationBand(7.9)).toBe("weak"); expect(separationBand(8)).toBe("usable"); expect(separationBand(14.9)).toBe("usable"); expect(separationBand(15)).toBe("clear"); });
  it("applies sensitivity with the specified clamps", () => { const calibration = { floorDb: -41, ownDb: -27.3 }; const base = gateThresholds(calibration, -36.1); expect(base).toEqual({ openDb: -31.7, closeDb: -35.7 }); expect(applySensitivity(base, "normal", calibration)).toEqual({ openDb: -31.7, closeDb: -35.7 }); expect(applySensitivity(base, "lower", calibration)).toEqual({ openDb: -27.7, closeDb: -31.7 }); expect(applySensitivity(base, "higher", calibration)).toEqual({ openDb: -34.7, closeDb: -38.7 }); });
  it("matches the first physical export vectors", () => { const wired = { floorDb: -41, ownDb: -22.6 }; expect(applySensitivity(gateThresholds({ floorDb: wired.floorDb, ownDb: -27.3 }, -36.1), "normal", { floorDb: wired.floorDb, ownDb: -27.3 })).toEqual({ openDb: -31.7, closeDb: -35.7 }); const invalid = { floorDb: -85.3, ownDb: -26.1 }; expect(gateThresholds(invalid, null)).toEqual({ openDb: -36.1, closeDb: -40.1 }); });
});
