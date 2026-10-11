import { beforeEach, describe, expect, it } from "vitest";
import type { TranscriptionEvent } from "../captions/types";
import { VOICE_IDENTIFICATION, VoiceIdentityRegistry } from "./voice-identity";

const CONNECTION = "assemblyai/room-one";
const speaker = (label: string, connection = CONNECTION) => `${connection}/speaker/${label}`;
type Part = [speakerId: string | null, text: string, startedAt: number];
const turn = (id: string, parts: Part[], type: "final_turn" | "speaker_revision" = "final_turn"): TranscriptionEvent => ({
  type, sourceTurnId: id,
  captions: parts.map(([speakerId, text, startedAt], index) => ({ id: `${id}/segment/${index}`, sourceTurnId: id, text, speakerId, startedAt, isFinal: true })),
});
const READY = "Hi, this is Sarah. I'm ready for the conversation.";

describe("VoiceIdentityRegistry", () => {
  let now: number;
  let registry: VoiceIdentityRegistry;
  beforeEach(() => {
    now = 1_000_000;
    registry = new VoiceIdentityRegistry(() => now);
    registry.setConnection(CONNECTION);
  });

  it("binds the next unclaimed diarized speaker with enough words to the requesting participant", () => {
    registry.request("sarah");
    expect(registry.phase("sarah")).toBe("listening");
    expect(registry.listeningParticipant).toBe("sarah");
    now += 2_000;
    registry.observe(turn("t1", [[speaker("B"), READY, now - 1_500]]));
    expect(registry.aliases()).toEqual({ [speaker("B")]: "sarah" });
    expect(registry.phase("sarah")).toBe("identified");
    expect(registry.listeningParticipant).toBeNull();
  });

  it("waits for enough speech, ignores interims, PENDING turns and speech that began before the request", () => {
    registry.observe(turn("before", [[speaker("A"), "Earlier sentence from the host still being finalized now.", now - 5_000]]));
    registry.request("sarah");
    registry.observe({ type: "interim", caption: { id: "i", sourceTurnId: "i", text: READY, speakerId: speaker("B"), startedAt: now, isFinal: false } });
    registry.observe(turn("late-final", [[speaker("A"), "Earlier sentence from the host still being finalized now.", now - VOICE_IDENTIFICATION.startToleranceMs - 1]]));
    registry.observe(turn("short", [[null, "Hello?", now + 500]]));
    registry.observe(turn("t1", [[speaker("B"), "Hi there.", now + 1_000]]));
    expect(registry.aliases()).toEqual({});
    registry.observe(turn("t2", [[speaker("B"), "This is Sarah.", now + 3_000]]));
    expect(registry.aliases()).toEqual({ [speaker("B")]: "sarah" });
  });

  it("counts a repeated formatted final for the same turn once", () => {
    registry.request("sarah");
    registry.observe(turn("t1", [[speaker("B"), "hi this is sarah", now + 500]]));
    registry.observe(turn("t1", [[speaker("B"), "Hi, this is Sarah.", now + 500]]));
    expect(registry.phase("sarah")).toBe("listening");
  });

  it("never steals a speaker identified for someone else and reports not_found after the window", () => {
    registry.request("host");
    registry.observe(turn("t1", [[speaker("A"), "Testing the room microphone for me now.", now + 500]]));
    registry.request("james");
    now += 1_000;
    registry.observe(turn("t2", [[speaker("A"), "This still sounds like the host voice.", now]]));
    expect(registry.aliases()).toEqual({ [speaker("A")]: "host" });
    expect(registry.phase("james")).toBe("listening");
    now += VOICE_IDENTIFICATION.windowMs + 1;
    registry.tick();
    expect(registry.phase("james")).toBe("not_found");
    registry.request("james");
    expect(registry.phase("james")).toBe("listening");
  });

  it("picks the dominant eligible speaker when several speak in one window", () => {
    registry.request("sarah");
    registry.observe(turn("t1", [[speaker("C"), "Go ahead.", now + 200], [speaker("B"), READY, now + 1_200]]));
    expect(registry.aliases()).toEqual({ [speaker("B")]: "sarah" });
  });

  it("follows SpeakerRevision corrections of the evidence turns instead of a literal label", () => {
    registry.request("sarah");
    registry.observe(turn("t1", [[speaker("B"), READY, now + 500]]));
    registry.observe(turn("t1", [[speaker("D"), READY, now + 500]], "speaker_revision"));
    expect(registry.aliases()).toEqual({ [speaker("D")]: "sarah" });
    expect(registry.phase("sarah")).toBe("identified");
    registry.observe(turn("unrelated", [[speaker("B"), "Other turns are not evidence.", now + 9_000]], "speaker_revision"));
    expect(registry.aliases()).toEqual({ [speaker("D")]: "sarah" });
  });

  it("gives a contested speaker to the latest identification and asks the displaced participant again", () => {
    registry.request("sarah");
    registry.observe(turn("t1", [[speaker("B"), READY, now + 500]]));
    registry.request("james");
    now += 1_000;
    registry.observe(turn("t2", [[speaker("C"), "Hi, this is James. I'm ready to go.", now]]));
    registry.observe(turn("t2", [[speaker("B"), "Hi, this is James. I'm ready to go.", now]], "speaker_revision"));
    expect(registry.aliases()).toEqual({ [speaker("B")]: "james" });
    expect(registry.phases(["sarah", "james"])).toEqual({ sarah: "needs_again", james: "identified" });
  });

  it("queues simultaneous requests and starts each window only after the previous one finishes", () => {
    registry.request("sarah");
    registry.request("james");
    registry.request("james");
    expect(registry.phases(["sarah", "james"])).toEqual({ sarah: "listening", james: "waiting" });
    now += 3_000;
    registry.observe(turn("t1", [[speaker("B"), READY, now - 500]]));
    expect(registry.phases(["sarah", "james"])).toEqual({ sarah: "identified", james: "listening" });
    registry.observe(turn("old", [[speaker("C"), "Spoken before James's window had started.", now - 2_000]]));
    expect(registry.phase("james")).toBe("listening");
    registry.cancel("james");
    expect(registry.phase("james")).toBe("unidentified");
  });

  it("replaces a participant's earlier binding in the same connection when they identify again", () => {
    registry.request("sarah");
    registry.observe(turn("t1", [[speaker("B"), READY, now + 500]]));
    registry.request("sarah");
    now += 1_000;
    registry.observe(turn("t2", [[speaker("E"), READY, now]]));
    expect(registry.aliases()).toEqual({ [speaker("E")]: "sarah" });
  });

  it("keeps old-connection names for history but requires identification again after a provider reconnect", () => {
    registry.request("sarah");
    registry.observe(turn("t1", [[speaker("B"), READY, now + 500]]));
    registry.setConnection("assemblyai/room-two");
    expect(registry.aliases()).toEqual({ [speaker("B")]: "sarah" });
    expect(registry.phase("sarah")).toBe("needs_again");
    registry.request("sarah");
    registry.observe(turn("t2", [[speaker("B"), READY, now + 1_000]]));
    expect(registry.phase("sarah")).toBe("listening");
    registry.observe(turn("t3", [[speaker("A", "assemblyai/room-two"), READY, now + 1_000]]));
    expect(registry.aliases()).toEqual({ [speaker("B")]: "sarah", [speaker("A", "assemblyai/room-two")]: "sarah" });
    expect(registry.phase("sarah")).toBe("identified");
  });

  it("does not start a window before the room microphone has a provider connection", () => {
    const idle = new VoiceIdentityRegistry(() => now);
    idle.request("sarah");
    expect(idle.phase("sarah")).toBe("waiting");
    now += VOICE_IDENTIFICATION.windowMs * 2;
    idle.tick();
    expect(idle.phase("sarah")).toBe("waiting");
    idle.setConnection(CONNECTION);
    expect(idle.phase("sarah")).toBe("listening");
    idle.reset();
    expect(idle.phase("sarah")).toBe("unidentified");
  });
});
