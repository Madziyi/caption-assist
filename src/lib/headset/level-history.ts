import { percentile } from "./levels";
export class LevelHistory {
  private values: Array<{ atMs: number; levelDb: number; open: boolean }> = [];
  constructor(private readonly capacity = 600) {}
  push(atMs: number, levelDb: number, open: boolean) {
    if (!Number.isFinite(atMs) || !Number.isFinite(levelDb)) return;
    this.values.push({ atMs, levelDb, open });
    if (this.values.length > this.capacity) this.values.splice(0, this.values.length - this.capacity);
  }
  stats(fromMs: number, toMs: number, ownRefDb: number) {
    const frames = this.values.filter((frame) => frame.atMs >= fromMs && frame.atMs <= toMs);
    const open = frames.filter((frame) => frame.open);
    const relDb = percentile((open.length ? open : frames).map((frame) => frame.levelDb - ownRefDb), 50);
    return { relDb: relDb === null ? null : Math.max(-100, Math.min(40, relDb)), openRatio: frames.length ? open.length / frames.length : 0, frames: frames.length };
  }
  reset() { this.values = []; }
}
