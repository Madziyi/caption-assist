import type { Participant } from "../rooms/types";
import { GatePreviewStats } from "./preview-stats";
import { checkDurationMs, checkMatrix, type CheckMatrix, type RoomCheckPlan } from "./room-check";
import type { HeadsetControl, HeadsetPresence, HeadsetSignal } from "./messages";
import { sensitivityDb, validSensitivity, type Sensitivity } from "./calibration";
import { headsetResultsExport } from "./export";
import type { HeadsetParticipant } from "./headset-participant";
import type { ArbitrationStats, HiddenCaption } from "./arbiter";
import type { RelayLatency } from "./latency";

export type HeadsetHostView = { people: Record<string, { presence: HeadsetPresence | null; speaking: boolean }>; sensitivities?: Record<string, Sensitivity>; arbitration?: ArbitrationStats; relayLatency?: Record<string, RelayLatency>; hiddenCaptions?: HiddenCaption[]; check: { plan: RoomCheckPlan; status: "running" | "done" | "cancelled"; matrix: CheckMatrix | null; missing: string[] } | null; canStartCheck: boolean; preview: ReturnType<GatePreviewStats["snapshot"]> };
export class HeadsetHost {
  private people = new Map<string, { presence: HeadsetPresence | null; speaking: boolean; lastOpen: number }>();
  private roster: Participant[] = []; private local = new Map<string, HeadsetParticipant>(); private results = new Map<string, Record<string, number | null>>(); private check: HeadsetHostView["check"] = null; private activeCheckId: string | null = null; private checkTimer: ReturnType<typeof setTimeout> | null = null; private readonly stats: GatePreviewStats; private sensitivities: Record<string, Sensitivity> = {};
  private readonly staleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly now: () => number;
  private sensitivityTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSensitivityAt = -Infinity;
  private arbitration: ArbitrationStats = { participants: {}, pairs: [] };
  private relayLatency: Record<string, RelayLatency> = {};
  private hiddenCaptions: HiddenCaption[] = [];
  captionStats(arbitration: ArbitrationStats, relayLatency: Record<string, RelayLatency>, hidden: HiddenCaption[]) { this.arbitration = arbitration; this.relayLatency = relayLatency; this.hiddenCaptions = hidden; this.update(); }
  private view: HeadsetHostView = { people: {}, check: null, canStartCheck: false, preview: { durationMs: 0, participants: {}, pairs: [] } };
  constructor(private readonly io: { sendControl(c: HeadsetControl): Promise<void> }, private readonly onView: (view: HeadsetHostView) => void, deps: { now?: () => number } = {}) { this.now = deps.now ?? Date.now; this.stats = new GatePreviewStats(this.now); }
  private update() { this.view = { people: Object.fromEntries(this.people), sensitivities: { ...this.sensitivities }, arbitration: this.arbitration, relayLatency: this.relayLatency, hiddenCaptions: this.hiddenCaptions, check: this.check, canStartCheck: [...this.people.values()].filter((p) => p.presence?.setup === "ready" && p.presence.mic === "on" && p.presence.visible).length >= 2, preview: this.stats.snapshot() }; this.onView(this.view); }
  setRoster(participants: Participant[]) { this.roster = participants.filter((p) => !p.removed); for (const p of this.roster) { if (!this.people.has(p.id)) this.people.set(p.id, { presence: null, speaking: false, lastOpen: 0 }); if (this.sensitivities[p.id] === undefined) this.sensitivities[p.id] = 0; } for (const id of [...this.people.keys()]) if (!this.roster.some((p) => p.id === id)) { this.people.delete(id); delete this.sensitivities[id]; } this.update(); }
  presence(id: string, presence: HeadsetPresence | null) { const person = this.people.get(id); if (!person) return; person.presence = presence; this.update(); }
  signal(id: string, signal: HeadsetSignal) { const person = this.people.get(id); if (!person) return; if (signal.kind === "gate") { person.speaking = signal.open; person.lastOpen = signal.open ? this.now() : person.lastOpen; this.stats.gate(id, signal.open); if (signal.open) { const prior = this.staleTimers.get(id); if (prior) clearTimeout(prior); this.staleTimers.set(id, setTimeout(() => { const current = this.people.get(id); if (current && current.lastOpen === person.lastOpen) { current.speaking = false; this.stats.gate(id, false); this.update(); } }, 5000)); } else { const prior = this.staleTimers.get(id); if (prior) clearTimeout(prior); this.staleTimers.delete(id); } this.update(); return; } if (this.check?.status === "running" && signal.checkId === this.activeCheckId) { this.results.set(id, signal.levels); if (this.results.size === this.check.plan.order.length) this.finishCheck(); } }
  attachLocal(selfId: string, participant: HeadsetParticipant) { this.local.set(selfId, participant); }
  setSensitivity(id: string, sensitivity: Sensitivity, final = true) {
    if (!this.people.has(id) || !validSensitivity(sensitivity)) return;
    this.sensitivities[id] = sensitivityDb(sensitivity);
    this.local.get(id)?.setSensitivity(sensitivityDb(sensitivity));
    if (final || this.now() - this.lastSensitivityAt >= 250) this.syncSensitivity();
    else if (!this.sensitivityTimer) this.sensitivityTimer = setTimeout(() => this.syncSensitivity(), 250 - (this.now() - this.lastSensitivityAt));
    this.update();
  }
  syncSensitivity() {
    if (this.sensitivityTimer) clearTimeout(this.sensitivityTimer);
    this.sensitivityTimer = null; this.lastSensitivityAt = this.now();
    void this.io.sendControl({ type: "headset-sensitivity", levels: { ...this.sensitivities } }).catch(() => undefined);
  }
  dispose() {
    if (this.sensitivityTimer) clearTimeout(this.sensitivityTimer);
    if (this.checkTimer) clearTimeout(this.checkTimer);
    for (const timer of this.staleTimers.values()) clearTimeout(timer);
    this.staleTimers.clear(); this.sensitivityTimer = null; this.checkTimer = null;
  }
  async startCheck() { if (!this.view.canStartCheck) return; const order = this.roster.filter((p) => { const v = this.people.get(p.id)?.presence; return v?.setup === "ready" && v.mic === "on" && v.visible; }).map((p) => p.id); const plan = { order, slotMs: 6000, gapMs: 1500 }; const checkId = `${crypto.randomUUID()}`; this.activeCheckId = checkId; this.results.clear(); this.stats.reset(); this.check = { plan, status: "running", matrix: null, missing: [] }; this.update(); const control = { type: "headset-check", checkId, order, slotMs: plan.slotMs, gapMs: plan.gapMs } as const; await this.io.sendControl({ type: "headset-sensitivity", levels: { ...this.sensitivities } }); await this.io.sendControl(control); for (const participant of this.local.values()) participant.receiveControl(control); this.checkTimer = setTimeout(() => this.finishCheck(), checkDurationMs(plan) + 4000); }
  async cancelCheck() { if (!this.check) return; const checkId = this.activeCheckId ?? crypto.randomUUID(); this.check = { ...this.check, status: "cancelled" }; if (this.checkTimer) clearTimeout(this.checkTimer); this.checkTimer = null; this.activeCheckId = null; this.update(); await this.io.sendControl({ type: "headset-check-cancel", checkId }); for (const participant of this.local.values()) participant.receiveControl({ type: "headset-check-cancel", checkId }); }
  resetPreview() { this.stats.reset(); this.update(); }
  exportResults() { return headsetResultsExport({ participants: this.roster.map((p) => ({ id: p.id, role: p.role, presence: this.people.get(p.id)?.presence ?? null })), check: this.check ? { order: this.check.plan.order, matrix: this.check.matrix } : null, preview: this.stats.snapshot(), arbitration: this.arbitration, relayLatency: this.relayLatency }); }
  private finishCheck() { if (!this.check || this.check.status !== "running") return; const order = this.check.plan.order; const missing = order.filter((id) => !this.results.has(id)); const calibrations = Object.fromEntries(order.map((id) => { const p = this.people.get(id)?.presence; return [id, p?.floorDb !== null && p?.floorDb !== undefined && p?.ownDb !== null && p?.ownDb !== undefined ? { floorDb: p.floorDb, ownDb: p.ownDb } : null]; })); const matrix = missing.length ? null : checkMatrix(order, Object.fromEntries(this.results), calibrations); this.check = { ...this.check, status: "done", matrix, missing }; this.checkTimer = null; this.update(); }
}
