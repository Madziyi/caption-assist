import { describe, expect, it } from "vitest";
import { HeadsetGate } from "./gate";
describe("headset gate", () => { it("opens, holds hysteresis and closes after 600ms", () => { const gate = new HeadsetGate({ openDb: -30, closeDb: -40 }); expect(gate.push(-30)).toEqual({ open: true, changed: true }); expect(gate.push(-35)).toEqual({ open: true, changed: false }); expect(gate.push(-41, 500)).toEqual({ open: true, changed: false }); expect(gate.push(-41, 100)).toEqual({ open: false, changed: true }); }); });
