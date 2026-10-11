import { MicrophoneCapture } from "../audio/microphone";
import { frameLevelDb } from "./levels";
import { classifyInput, sanitizeInputLabel, type InputClass } from "./input-label";

export type HeadsetInput = { deviceId: string; label: string };
export type HeadsetTrackInfo = { label: string; sanitizedLabel: string; inputClass: InputClass; processing: { autoGainControl: boolean | null; noiseSuppression: boolean | null; echoCancellation: boolean | null } };
export type HeadsetMicrophoneLike = { start(deviceId?: string): Promise<void>; stop(): Promise<void>; inputs(): Promise<HeadsetInput[]>; info(): HeadsetTrackInfo | null };
type CaptureLike = { start(options?: { constraints?: MediaStreamConstraints }): Promise<void>; stop(): Promise<void>; getTrack(): MediaStreamTrack | null };
export type HeadsetCaptureFactory = (onAudio: (chunk: ArrayBuffer) => void, onFailure: () => void) => CaptureLike;

export class HeadsetMicrophone implements HeadsetMicrophoneLike {
  private capture: CaptureLike | null = null;
  private track: MediaStreamTrack | null = null;
  private trackInfo: HeadsetTrackInfo | null = null;
  private deviceChange: (() => void) | null = null;
  constructor(private readonly onLevel: (levelDb: number) => void, private readonly onFailure: (error?: unknown) => void, private readonly factory: HeadsetCaptureFactory = (onAudio, onFailed) => new MicrophoneCapture(onAudio, onFailed)) {}
  async inputs(): Promise<HeadsetInput[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    return (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput").map((device) => ({ deviceId: device.deviceId, label: sanitizeInputLabel(device.label || "Default") }));
  }
  async start(deviceId?: string) {
    await this.stop();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not provide microphone access.");
    const capture = this.factory((chunk) => this.onLevel(frameLevelDb(new Int16Array(chunk))), () => this.onFailure());
    this.capture = capture;
    try {
      await capture.start({ constraints: { audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) } } });
      this.track = capture.getTrack();
      if (!this.track) throw new Error("The microphone track was unavailable.");
      const settings = this.track.getSettings();
      const label = this.track.label || "Default";
      this.trackInfo = { label, sanitizedLabel: sanitizeInputLabel(label), inputClass: classifyInput(label), processing: { autoGainControl: booleanOrNull(settings.autoGainControl), noiseSuppression: booleanOrNull(settings.noiseSuppression), echoCancellation: booleanOrNull(settings.echoCancellation) } };
      this.track.onended = () => this.onFailure();
      this.deviceChange = () => this.onFailure(new Error("Microphone changed — check again."));
      navigator.mediaDevices.addEventListener?.("devicechange", this.deviceChange);
    } catch (error) { await this.stop(); this.onFailure(error); throw error; }
  }
  async stop() { if (this.deviceChange) navigator.mediaDevices?.removeEventListener?.("devicechange", this.deviceChange); this.deviceChange = null; if (this.track) this.track.onended = null; this.track = null; this.trackInfo = null; const capture = this.capture; this.capture = null; await capture?.stop(); }
  info() { return this.trackInfo; }
}
function booleanOrNull(value: unknown) { return typeof value === "boolean" ? value : null; }
