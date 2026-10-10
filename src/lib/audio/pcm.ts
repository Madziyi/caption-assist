export const TARGET_SAMPLE_RATE = 16_000;
export const AUDIO_FRAME_DURATION_MS = 100;
export const AUDIO_FRAME_SAMPLES = (TARGET_SAMPLE_RATE * AUDIO_FRAME_DURATION_MS) / 1000;

export function floatToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    pcm[index] = sample < 0 ? Math.round(sample * 32_768) : Math.round(sample * 32_767);
  }
  return pcm;
}

export function resampleMono(input: Float32Array, sourceRate: number, targetRate = TARGET_SAMPLE_RATE): Float32Array {
  if (sourceRate <= 0 || targetRate <= 0) throw new Error("Sample rates must be positive.");
  if (sourceRate === targetRate) return new Float32Array(input);
  if (input.length === 0) return new Float32Array(0);

  const outputLength = Math.max(1, Math.round(input.length * (targetRate / sourceRate)));
  const output = new Float32Array(outputLength);
  const ratio = sourceRate / targetRate;
  for (let index = 0; index < output.length; index += 1) {
    const sourcePosition = index * ratio;
    const left = Math.floor(sourcePosition);
    const right = Math.min(left + 1, input.length - 1);
    const fraction = sourcePosition - left;
    output[index] = (input[left] ?? 0) * (1 - fraction) + (input[right] ?? 0) * fraction;
  }
  return output;
}

export class Pcm16Chunker {
  private readonly pending: number[] = [];

  constructor(private readonly frameSamples = AUDIO_FRAME_SAMPLES) {
    if (frameSamples < TARGET_SAMPLE_RATE * 0.05) {
      throw new Error("Audio frames must be at least 50 ms.");
    }
  }

  push(samples: Int16Array): ArrayBuffer[] {
    this.pending.push(...samples);
    const chunks: ArrayBuffer[] = [];
    while (this.pending.length >= this.frameSamples) {
      const frame = Int16Array.from(this.pending.splice(0, this.frameSamples));
      chunks.push(frame.buffer);
    }
    return chunks;
  }

  clear(): void {
    this.pending.length = 0;
  }
}
