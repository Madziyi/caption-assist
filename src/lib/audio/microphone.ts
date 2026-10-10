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

  constructor(private readonly onAudio: (chunk: ArrayBuffer) => void) {}

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicrophoneCaptureError("microphone_unavailable", "This browser does not provide microphone access.");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.acceptingAudio = true;
      this.context = new AudioContext();
      await this.context.audioWorklet.addModule("/audio/pcm-worklet.js");
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

  async stop(): Promise<void> {
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
