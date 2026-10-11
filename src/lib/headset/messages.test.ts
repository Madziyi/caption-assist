import { describe, expect, it } from "vitest";
import { validHeadsetControl, validHeadsetPresence, validHeadsetPresenceUpdate, validHeadsetSignal } from "./messages";
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
