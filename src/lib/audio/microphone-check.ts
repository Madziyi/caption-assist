export class MicrophoneCheck {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private frame = 0;
  private generation = 0;
  async start(onLevel: (level: number, label: string) => void) {
    const generation = ++this.generation;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== this.generation) { stream.getTracks().forEach((track) => track.stop()); return; }
      this.stream = stream;
      const context = new AudioContext(); this.context = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser(); analyser.fftSize = 256;
      source.connect(analyser); await context.resume();
      const samples = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (generation !== this.generation) return;
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((total, sample) => total + sample * sample, 0) / samples.length);
        onLevel(Math.min(1, rms * 5), stream.getAudioTracks()[0]?.label || "Default microphone");
        this.frame = requestAnimationFrame(tick);
      };
      tick();
    } catch (error) { await this.stop(); throw error; }
  }
  async stop() {
    ++this.generation; cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach((track) => track.stop()); this.stream = null;
    const context = this.context; this.context = null;
    if (context && context.state !== "closed") await context.close();
  }
}
