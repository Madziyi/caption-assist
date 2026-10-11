import { describe, expect, it } from "vitest";
import { gateThresholds, ownVoiceLevel, quietFloor, separationBand } from "./calibration";
describe("headset calibration", () => {
  it("calculates floor and own voice", () => { expect(quietFloor([-70, -72, -71])).toBe(-71); expect(ownVoiceLevel(Array(12).fill(-40), -70)).toEqual({ ok: true, ownDb: -40 }); expect(ownVoiceLevel(Array(9).fill(-30), -70)).toEqual({ ok: false, reason: "too_short" }); expect(ownVoiceLevel(Array(12).fill(-61), -70)).toEqual({ ok: false, reason: "too_quiet" }); });
  it("uses floor minimum and bands", () => { expect(gateThresholds({ floorDb: -70, ownDb: -30 }, null)).toEqual({ openDb: -40, closeDb: -44 }); expect(separationBand(7.9)).toBe("weak"); expect(separationBand(8)).toBe("usable"); expect(separationBand(14.9)).toBe("usable"); expect(separationBand(15)).toBe("clear"); });
});
