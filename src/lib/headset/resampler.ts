/** Bounded streaming linear interpolator for mono PCM16, 16 kHz → 24 kHz. */
export class Pcm16Resampler16To24 {
  private previous: number | null = null;
  private inputIndex = -1;
  // Output sample positions are stored in thirds of an input sample. 2 ticks
  // between outputs gives the exact 3/2 rate without accumulating float drift.
  private nextOutputTick = 0;

  push(input: ArrayBuffer): ArrayBuffer {
    const view = new DataView(input);
    const samples = Math.floor(input.byteLength / 2);
    const output: number[] = [];
    for (let i = 0; i < samples; i++) {
      const current = view.getInt16(i * 2, true);
      const currentIndex = ++this.inputIndex;
      if (this.previous === null) {
        output.push(current);
        this.nextOutputTick = 2;
      } else {
        while (this.nextOutputTick <= currentIndex * 3) {
          const position = this.nextOutputTick / 3;
          const fraction = position - (currentIndex - 1);
          output.push(clampPcm16(this.previous + (current - this.previous) * fraction));
          this.nextOutputTick += 2;
        }
      }
      this.previous = current;
    }
    const result = new ArrayBuffer(output.length * 2);
    const outputView = new DataView(result);
    output.forEach((sample, index) => outputView.setInt16(index * 2, sample, true));
    return result;
  }

  reset() {
    this.previous = null;
    this.inputIndex = -1;
    this.nextOutputTick = 0;
  }
}

function clampPcm16(value: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(value)));
}
