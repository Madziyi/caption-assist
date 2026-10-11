import { describe, expect, it } from "vitest";
import { GatedAudio } from "./gated-audio";

const frame = (value: number) => new Uint8Array([value, value]).buffer;

describe("gated audio", () => {
  it("keeps a three-frame look-ahead and sends the pre-roll when the gate opens", () => {
    const audio = new GatedAudio(3);
    expect(audio.push(frame(1), false)).toBeNull();
    expect(audio.push(frame(2), false)).toBeNull();
    expect(audio.push(frame(3), false)).toBeNull();
    expect(new Uint8Array(audio.push(frame(4), true)!)).toEqual(new Uint8Array([1, 1]));
    expect(new Uint8Array(audio.push(frame(5), true)!)).toEqual(new Uint8Array([2, 2]));
  });
  it("emits same-length silence while closed and resets its delay line", () => {
    const audio = new GatedAudio(1);
    expect(audio.push(frame(1), false)).toBeNull();
    expect(new Uint8Array(audio.push(frame(2), false)!)).toEqual(new Uint8Array([0, 0]));
    audio.reset();
    expect(audio.push(frame(3), true)).toBeNull();
  });
});
