import { describe, expect, it } from "vitest";
import { Pcm16Resampler16To24 } from "./resampler";
const pcm = (samples: number[]) => { const buffer = new ArrayBuffer(samples.length * 2); const view = new DataView(buffer); samples.forEach((sample, index) => view.setInt16(index * 2, sample, true)); return buffer; };
const values = (buffer: ArrayBuffer) => { const view = new DataView(buffer); return Array.from({ length: buffer.byteLength / 2 }, (_, i) => view.getInt16(i * 2, true)); };

describe("16→24 kHz PCM resampler", () => {
  it("produces a continuous 3:2 sample rate across frame boundaries", () => {
    const all = Array.from({ length: 3200 }, (_, i) => Math.round(12000 * Math.sin(i / 17)));
    const single = new Pcm16Resampler16To24();
    const split = new Pcm16Resampler16To24();
    const expected = values(single.push(pcm(all)));
    const first = values(split.push(pcm(all.slice(0, 713))));
    const actual = first.concat(values(split.push(pcm(all.slice(713)))));
    expect(actual).toEqual(expected);
    expect(actual.length).toBeGreaterThanOrEqual(4798);
    expect(actual.length).toBeLessThanOrEqual(4800);
  });
  it("handles silence, signed boundaries and clips interpolated values", () => {
    const resampler = new Pcm16Resampler16To24();
    expect(values(resampler.push(pcm([0, 0, 0, 0]))).every((sample) => sample === 0)).toBe(true);
    resampler.reset();
    const edge = values(resampler.push(pcm([-32768, 32767, 32767, -32768])));
    expect(edge[0]).toBe(-32768);
    expect(edge).toContain(32767);
    expect(edge.every((sample) => sample >= -32768 && sample <= 32767)).toBe(true);
  });
  it("keeps phase stable for long streams", () => {
    const resampler = new Pcm16Resampler16To24();
    let total = 0;
    for (let i = 0; i < 1000; i++) total += resampler.push(pcm([1, -1, 2, -2, 3, -3, 4, -4])).byteLength / 2;
    expect(total).toBeGreaterThanOrEqual(11999);
    expect(total).toBeLessThanOrEqual(12000);
  });
});
