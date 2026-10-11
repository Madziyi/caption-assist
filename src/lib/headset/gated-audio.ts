export class GatedAudio {
  private queue: Array<{ frame: ArrayBuffer; send: boolean }> = [];
  constructor(private readonly preRollFrames = 3) {}
  push(frame: ArrayBuffer, gateOpen: boolean): ArrayBuffer | null {
    this.queue.push({ frame, send: gateOpen });
    if (gateOpen) for (const entry of this.queue) entry.send = true;
    if (this.queue.length <= this.preRollFrames) return null;
    const next = this.queue.shift()!;
    if (next.send) return next.frame;
    return new ArrayBuffer(next.frame.byteLength);
  }
  reset() { this.queue = []; }
}
