import { AUDIO_FRAME_SAMPLES } from "./pcm";

export type MicrophoneErrorCode = "microphone_denied" | "microphone_unavailable";

export class MicrophoneCaptureError extends Error {
  constructor(public readonly code: MicrophoneErrorCode, message: string) {
    super(message);
    this.name = "MicrophoneCaptureError";
  }
}

export class MicrophoneCapture {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;
  private acceptingAudio = true;
  private generation = 0;

  constructor(private readonly onAudio: (chunk: ArrayBuffer) => void, private readonly onFailure?: () => void) {}

  async start(options?: { constraints?: MediaStreamConstraints }): Promise<void> {
    const generation = ++this.generation;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicrophoneCaptureError("microphone_unavailable", "This browser does not provide microphone access.");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(options?.constraints ?? {
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (generation !== this.generation) { stream.getTracks().forEach((track) => track.stop()); return; }
      this.stream = stream;
      stream.getTracks().forEach((track) => { track.onended = () => { if (this.acceptingAudio) this.onFailure?.(); }; });
      this.acceptingAudio = true;
      this.context = new AudioContext();
      await this.context.audioWorklet.addModule("/audio/pcm-worklet.js");
      if (generation !== this.generation) return;
      this.source = this.context.createMediaStreamSource(this.stream);
      this.worklet = new AudioWorkletNode(this.context, "pcm-worklet", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { frameSize: AUDIO_FRAME_SAMPLES },
      });
      this.sink = this.context.createGain();
      this.sink.gain.value = 0;
      this.worklet.port.onmessage = (event: MessageEvent<{ type: string; buffer?: ArrayBuffer }>) => {
        if (this.acceptingAudio && event.data.type === "audio" && event.data.buffer) this.onAudio(event.data.buffer);
      };
      this.source.connect(this.worklet);
      this.worklet.connect(this.sink);
      this.sink.connect(this.context.destination);
      await this.context.resume();
      if (generation !== this.generation) return;
      this.context.onstatechange = () => {
        if (this.acceptingAudio && this.context && ["suspended", "interrupted"].includes(String(this.context.state))) this.onFailure?.();
      };
    } catch (error) {
      await this.stop();
      if (error instanceof MicrophoneCaptureError) throw error;
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw new MicrophoneCaptureError("microphone_denied", "Microphone access was denied. Allow microphone access and try again.");
      }
      throw new MicrophoneCaptureError("microphone_unavailable", "The microphone could not be started. Check the selected input and try again.");
    }
  }

  getTrack(): MediaStreamTrack | null { return this.stream?.getAudioTracks()[0] ?? null; }

  async stop(): Promise<void> {
    ++this.generation;
    this.acceptingAudio = false;
    this.worklet?.port.close();
    this.source?.disconnect();
    this.worklet?.disconnect();
    this.sink?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.context && this.context.state !== "closed") await this.context.close();
    this.stream = null;
    this.context = null;
    this.source = null;
    this.worklet = null;
    this.sink = null;
  }
}
