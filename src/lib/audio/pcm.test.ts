import { describe, expect, it } from "vitest";
import { Pcm16Chunker, floatToPcm16, resampleMono } from "./pcm";

describe("PCM audio utilities", () => {
  it("converts float samples, clips, and preserves silence", () => {
    expect(Array.from(floatToPcm16(new Float32Array([-2, -1, 0, 1, 2])))).toEqual([-32768, -32768, 0, 32767, 32767]);
  });

  it("resamples a 48 kHz mono buffer to approximately 16 kHz", () => {
    const input = new Float32Array(4_800).fill(0.25);
    const output = resampleMono(input, 48_000);
    expect(output).toHaveLength(1_600);
    expect(output[800]).toBeCloseTo(0.25);
  });

  it("emits 100 ms frames and never intentionally emits a sub-50 ms frame", () => {
    const chunker = new Pcm16Chunker();
    const chunks = chunker.push(new Int16Array(1_600 * 2 + 100));
    expect(chunks).toHaveLength(2);
    expect(chunks.every((chunk) => chunk.byteLength === 1_600 * 2)).toBe(true);
  });
});
