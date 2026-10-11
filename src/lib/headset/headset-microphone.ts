import { MicrophoneCapture } from "../audio/microphone";
import { frameLevelDb } from "./levels";
import { classifyInput, sanitizeInputLabel, type InputClass } from "./input-label";

export type HeadsetInput = { deviceId: string; label: string };
export type HeadsetTrackInfo = { deviceId: string | null; label: string; sanitizedLabel: string; inputClass: InputClass; processing: { autoGainControl: boolean | null; noiseSuppression: boolean | null; echoCancellation: boolean | null } };
export class HeadsetDisconnectedError extends Error { constructor() { super("Your headset disconnected."); this.name = "HeadsetDisconnectedError"; } }
export type HeadsetMicrophoneLike = { start(deviceId?: string): Promise<void>; stop(): Promise<void>; inputs(): Promise<HeadsetInput[]>; info(): HeadsetTrackInfo | null };
type CaptureLike = { start(options?: { constraints?: MediaStreamConstraints }): Promise<void>; stop(): Promise<void>; getTrack(): MediaStreamTrack | null };
export type HeadsetCaptureFactory = (onAudio: (chunk: ArrayBuffer) => void, onFailure: (error?: unknown) => void) => CaptureLike;

export class HeadsetMicrophone implements HeadsetMicrophoneLike {
  private capture: CaptureLike | null = null;
  private track: MediaStreamTrack | null = null;
  private trackInfo: HeadsetTrackInfo | null = null;
  private deviceChange: (() => void) | null = null;
  constructor(private readonly onLevel: (levelDb: number) => void, private readonly onFailure: (error?: unknown) => void, private readonly factory: HeadsetCaptureFactory = (onAudio, onFailed) => new MicrophoneCapture(onAudio, onFailed), private readonly onFrame?: (levelDb: number, frame: ArrayBuffer) => void) {}
  async inputs(): Promise<HeadsetInput[]> {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.enumerateDevices !== "function") return [];
    return (await mediaDevices.enumerateDevices.call(mediaDevices)).filter((device) => device.kind === "audioinput").map((device) => ({ deviceId: device.deviceId, label: sanitizeInputLabel(device.label || "Default") }));
  }
  async start(deviceId?: string) {
    // Initiate cleanup without delaying the new microphone request.
    const previous = this.detach();
    void previous?.stop().catch(() => undefined);
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") throw new Error("This browser does not provide microphone access.");
    const capture = this.factory((chunk) => { const level = frameLevelDb(new Int16Array(chunk)); this.onLevel(level); this.onFrame?.(level, chunk); }, (error) => this.onFailure(error));
    this.capture = capture;
    try {
      await capture.start({ constraints: { audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) } } });
      this.track = capture.getTrack();
      if (!this.track) throw new Error("The microphone track was unavailable.");
      const settings = this.track.getSettings();
      const label = this.track.label || "Default";
      this.trackInfo = { deviceId: settings.deviceId || null, label, sanitizedLabel: sanitizeInputLabel(label), inputClass: classifyInput(label), processing: { autoGainControl: booleanOrNull(settings.autoGainControl), noiseSuppression: booleanOrNull(settings.noiseSuppression), echoCancellation: booleanOrNull(settings.echoCancellation) } };
      this.track.onended = () => this.onFailure(new HeadsetDisconnectedError());
      this.deviceChange = () => { void this.checkDevice(); };
      if (typeof mediaDevices.addEventListener === "function") mediaDevices.addEventListener.call(mediaDevices, "devicechange", this.deviceChange);
    } catch (error) { await this.stop(); this.onFailure(error); throw error; }
  }
  private async checkDevice() {
    const track = this.track;
    if (!track) return;
    if (track.readyState === "ended") { this.onFailure(new HeadsetDisconnectedError()); return; }
    const deviceId = this.trackInfo?.deviceId;
    if (!deviceId) return;
    try {
      const devices = await this.inputs();
      if (!devices.some((device) => device.deviceId === deviceId)) this.onFailure(new HeadsetDisconnectedError());
    } catch { /* An unrelated device event must not fail a healthy capture. */ }
  }
  async stop() {
    const capture = this.detach();
    await capture?.stop();
  }
  private detach() {
    const mediaDevices = navigator.mediaDevices;
    if (this.deviceChange && mediaDevices && typeof mediaDevices.removeEventListener === "function") mediaDevices.removeEventListener.call(mediaDevices, "devicechange", this.deviceChange);
    this.deviceChange = null;
    if (this.track) this.track.onended = null;
    this.track = null;
    this.trackInfo = null;
    const capture = this.capture;
    this.capture = null;
    return capture;
  }
  info() { return this.trackInfo; }
}
function booleanOrNull(value: unknown) { return typeof value === "boolean" ? value : null; }
