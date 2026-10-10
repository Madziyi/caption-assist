class PcmWorkletProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.frameSize = options.processorOptions?.frameSize ?? 1600;
    this.sourceSamples = [];
    this.sourceOffset = 0;
    this.outputSamples = [];
    this.sourcePerTarget = sampleRate / 16000;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    this.sourceSamples.push(...channel);
    while (this.sourceOffset + 1 < this.sourceSamples.length) {
      const leftIndex = Math.floor(this.sourceOffset);
      const fraction = this.sourceOffset - leftIndex;
      const left = this.sourceSamples[leftIndex] ?? 0;
      const right = this.sourceSamples[leftIndex + 1] ?? left;
      this.outputSamples.push(left + (right - left) * fraction);
      this.sourceOffset += this.sourcePerTarget;

      if (this.outputSamples.length === this.frameSize) {
        const pcm = new Int16Array(this.frameSize);
        for (let index = 0; index < this.frameSize; index += 1) {
          const sample = Math.max(-1, Math.min(1, this.outputSamples[index] ?? 0));
          pcm[index] = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
        }
        this.port.postMessage({ type: "audio", buffer: pcm.buffer }, [pcm.buffer]);
        this.outputSamples = [];
      }
    }

    const consumed = Math.floor(this.sourceOffset);
    if (consumed > 0) {
      this.sourceSamples.splice(0, consumed);
      this.sourceOffset -= consumed;
    }
    return true;
  }
}

registerProcessor("pcm-worklet", PcmWorkletProcessor);
