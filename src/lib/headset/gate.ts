import type { GateThresholds } from "./calibration";

export class HeadsetGate {
  private isOpen = false;
  private belowMs = 0;
  constructor(private thresholds: GateThresholds, private readonly holdMs = 600) {}
  setThresholds(thresholds: GateThresholds) { this.thresholds = thresholds; this.belowMs = 0; }
  push(levelDb: number, frameMs = 100): { open: boolean; changed: boolean } {
    if (!this.isOpen) {
      if (levelDb >= this.thresholds.openDb) { this.isOpen = true; this.belowMs = 0; return { open: true, changed: true }; }
      return { open: false, changed: false };
    }
    if (levelDb < this.thresholds.closeDb) this.belowMs += frameMs;
    else this.belowMs = 0;
    if (this.belowMs >= this.holdMs) { this.isOpen = false; this.belowMs = 0; return { open: false, changed: true }; }
    return { open: true, changed: false };
  }
  get open() { return this.isOpen; }
  reset() { this.isOpen = false; this.belowMs = 0; }
}
