export const LOOKAHEAD_MS = 300;
export type GatedAudioOutput = { frame: ArrayBuffer; active: boolean };
export class GatedAudio {
  private queue: Array<{ frame: ArrayBuffer; send: boolean }> = [];
  constructor(private readonly preRollFrames = 3) {}
  push(frame: ArrayBuffer, gateOpen: boolean, forceSilence = false): ArrayBuffer | null {
    return this.pushDetailed(frame, gateOpen, forceSilence)?.frame ?? null;
  }
  pushDetailed(frame: ArrayBuffer, gateOpen: boolean, forceSilence = false): GatedAudioOutput | null {
    if (forceSilence) for (const entry of this.queue) entry.send = false;
    this.queue.push({ frame, send: gateOpen });
    if (gateOpen) for (const entry of this.queue) entry.send = true;
    if (this.queue.length <= this.preRollFrames) return null;
    const next = this.queue.shift()!;
    return next.send ? { frame: next.frame, active: true } : { frame: new ArrayBuffer(next.frame.byteLength), active: false };
  }
  reset() { this.queue = []; }
}
