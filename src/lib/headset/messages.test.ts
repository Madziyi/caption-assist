import { describe, expect, it } from "vitest";
import { validHeadsetControl, validHeadsetPresence, validHeadsetPresenceUpdate, validHeadsetSignal } from "./messages";
it("validates continuous sensitivity and legacy values, rejecting out-of-range or fractional sliders", () => {
  for (const value of [-15, 0, 6, "lower", "normal", "higher"]) expect(validHeadsetControl({ type: "headset-sensitivity", levels: { a: value } })).toBe(true);
  for (const value of [-16, 7, 0.5, NaN, "-6", "wrong"]) expect(validHeadsetControl({ type: "headset-sensitivity", levels: { a: value } })).toBe(false);
  expect(validHeadsetControl({ type: "headset-sensitivity", levels: Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`p${i}`, 0])) })).toBe(false);
});
describe("headset messages", () => { it("rejects malformed values and accepts contracts", () => { expect(validHeadsetPresence({ mic: "on", input: "headset", label: "AirPods", processing: { autoGainControl: false, noiseSuppression: false, echoCancellation: false }, setup: "ready", floorDb: -70, ownDb: -30, visible: true })).toBe(true); expect(validHeadsetPresence({ mic: "on", input: "headset", label: "", processing: null, setup: "ready", floorDb: -70.01, ownDb: -30, visible: true })).toBe(false); expect(validHeadsetSignal({ kind: "gate", seq: 1, open: true, levelDb: -30, openDb: -40 })).toBe(true); expect(validHeadsetControl({ type: "headset-check", checkId: "bad", order: ["a", "b"], slotMs: 6000, gapMs: 1500 })).toBe(false); }); });

it("validates versioned headset state before a host accepts it", () => {
  const update = { sessionId: "test-session", seq: 1, presence: { mic: "on", input: "headset", label: "AirPods", processing: null, setup: "ready", floorDb: -70, ownDb: -30, visible: true } };
  expect(validHeadsetPresenceUpdate(update)).toBe(true);
  expect(validHeadsetPresenceUpdate({ ...update, seq: 0 })).toBe(false);
  expect(validHeadsetPresenceUpdate({ ...update, seq: 1.5 })).toBe(false);
  expect(validHeadsetPresenceUpdate({ ...update, sessionId: "bad" })).toBe(false);
  expect(validHeadsetPresenceUpdate({ ...update, presence: { ...update.presence, label: "x".repeat(61) } })).toBe(false);
  expect(validHeadsetPresenceUpdate(null)).toBe(false);
});
