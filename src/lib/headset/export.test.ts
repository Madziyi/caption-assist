import { describe, expect, it } from "vitest";
import { headsetResultsExport } from "./export";
import { checkMatrix } from "./room-check";
it("exports v3 numerical metrics with anonymous refs and phone-reported tuning, never hidden text", () => {
  const presence = { mic: "on" as const, setup: "ready" as const, input: "headset" as const, label: "AirPods", processing: null, floorDb: -70, ownDb: -30, visible: true, sensitivityDb: -6, tuned: false };
  const json = headsetResultsExport({ participants: [{ id: "a-private", role: "participant", presence }, { id: "b-private", role: "participant", presence: { ...presence, tuned: true } }], check: { order: ["a-private", "b-private"], matrix: checkMatrix(["a-private", "b-private"], { "a-private": { "a-private": -30, "b-private": -40 }, "b-private": { "a-private": -40, "b-private": -30 } }) }, arbitration: { participants: { "a-private": { shown: 2, suppressedText: 1, suppressedLevel: 0, replaced: 0, restored: 0 } }, pairs: [{ a: "a-private", b: "b-private", duplicatesHidden: 1 }] }, relayLatency: { "a-private": { relayExtraP50: 20, relayExtraP90: 40, relaySamples: 2 } }, preview: { durationMs: 100, participants: {}, pairs: [] } });
  const result = JSON.parse(json);
  expect(result.version).toBe(3); expect(result.check.applied).toEqual({ P1: false, P2: true });
  expect(result.participants[0]).toMatchObject({ sensitivityDb: -6, tuned: false, captions: { shown: 2, suppressedText: 1 }, latency: { relayExtraP50: 20 } });
  expect(result.preview.pairs[0]).toMatchObject({ a: "P1", b: "P2", duplicatesHidden: 1 });
  expect(result.constants.lookaheadMs).toBe(300); expect(result.constants.interimThrottleMs).toBe(200);
  expect(json).not.toContain("private"); expect(json).not.toContain("sourceTurnId"); expect(json).not.toContain('"text":');
});
describe("headset export", () => { it("uses anonymous refs and no names or ids", () => { const json = headsetResultsExport({ participants: [{ id: "owner-id", role: "participant", presence: { mic: "on", input: "headset", label: "Stan's AirPods", processing: { autoGainControl: false, noiseSuppression: false, echoCancellation: false }, setup: "ready", floorDb: -70, ownDb: -30, visible: true } }], check: null, preview: { durationMs: 1, participants: { "owner-id": { opens: 1, openMs: 100 } }, pairs: [] } }); expect(json).toContain("P1"); expect(json).not.toContain("owner-id"); expect(json).not.toContain("Stan"); }); });
