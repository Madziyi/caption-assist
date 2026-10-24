import { applySensitivity, gateThresholds, ownVoiceLevel, plausibleRoomCheckRow, quietFloor, separationBand, sensitivityDb, type GateThresholds, type HeadsetCalibration, type Sensitivity, type SeparationBand } from "./calibration";
import { HeadsetGate } from "./gate";
import { HeadsetDisconnectedError, HeadsetMicrophone, type HeadsetMicrophoneLike } from "./headset-microphone";
import type { HeadsetControl, HeadsetPresence, HeadsetSignal } from "./messages";
import { checkDurationMs, RoomCheckRecorder, slotAt, type RoomCheckPlan } from "./room-check";
import { GatedAudio } from "./gated-audio";
import { LevelHistory } from "./level-history";
import { captionEvidence, eventCaptions, type CaptionEvidence } from "./evidence";
import { PhoneLatencyStats, type PhoneLatency } from "./latency";
import type { HeadsetTranscriberLike, SttState } from "./headset-transcriber";
import { Pcm16Resampler16To24 } from "./resampler";
import { OpenAIShadowTranscriber } from "./openai-shadow";
import { HeadsetBenchmarkSession, type BenchmarkView } from "./benchmark-session";
import type { OpenAIShadowCallbacks } from "./openai-shadow";

export type HeadsetParticipantView = {
  setup: HeadsetPresence["setup"]; mic: HeadsetPresence["mic"];
  input: { deviceId: string | null; label: string; inputClass: "headset" | "built-in" | "unknown"; processing: NonNullable<HeadsetPresence["processing"]> } | null;
  inputs: Array<{ deviceId: string; label: string }>;
  calibration: HeadsetCalibration | null; thresholds: GateThresholds | null;
  sensitivity?: Sensitivity; micDrops?: number; stt?: "off" | "connecting" | "on" | "reconnecting" | "failed";
  sensitivityDb?: number; tuned?: boolean;
  levelDb: number; speaking: boolean;
  check: { index: number; total: number; phase: "gap" | "reading"; mine: boolean } | null;
  result: { separationDb: number | null; band: SeparationBand | null } | null;
  notice: string | null;
  benchmark?: BenchmarkView;
};
type ShadowProvider = Pick<OpenAIShadowTranscriber, "start" | "appendAudio" | "commit" | "setKeywords" | "stop">;
type Deps = { microphone?: HeadsetMicrophoneLike; now?: () => number; setTimeout?: typeof globalThis.setTimeout; clearTimeout?: typeof globalThis.clearTimeout; transcriberFactory?: (publish: (event: import("../captions/types").TranscriptionEvent) => void, onState: (state: SttState) => void) => HeadsetTranscriberLike; benchmark?: { roomId: string; hints?: () => string[] }; shadowFactory?: (roomId: string, callbacks: OpenAIShadowCallbacks) => ShadowProvider };
const QUIET_MS = 3000; const VOICE_MS = 6000;

export class HeadsetParticipant {
  private view: HeadsetParticipantView;
  private readonly microphone: HeadsetMicrophoneLike;
  private readonly now: () => number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private levels: number[] = [];
  private calibration: HeadsetCalibration | null = null;
  private gate: HeadsetGate | null = null;
  private gateSeq = 0;
  private lastSignalAt = 0;
  private roomCheck: { plan: RoomCheckPlan; recorder: RoomCheckRecorder; startedAt: number; checkId: string } | null = null;
  private preserveCalibration = false;
  private sensitivity: Sensitivity = "normal";
  private micDrops = 0;
  private appliedCalibration: HeadsetCalibration | null = null;
  private appliedBleedDb: number | null = null;
  private tuned = false;
  private readonly history = new LevelHistory();
  private readonly latencyStats = new PhoneLatencyStats();
  private latency: PhoneLatency | undefined;
  private lastLatencyAt = -Infinity;
  private get ownRefDb() { return Math.max(this.calibration?.ownDb ?? -100, this.appliedCalibration?.ownDb ?? -100); }
  private readonly gatedAudio = new GatedAudio(3);
  private readonly resampler = new Pcm16Resampler16To24();
  private gateOpenedAt: number | null = null;
  private gateClosedAt: number | null = null;
  private readonly benchmarkSession: HeadsetBenchmarkSession | null;
  private readonly shadow: ShadowProvider | null;
  private readonly transcriber: HeadsetTranscriberLike | null;
  constructor(private readonly selfId: string, private readonly io: { setPresence(p: HeadsetPresence): Promise<void>; sendSignal(s: HeadsetSignal): Promise<void>; sendCaption?(event: import("../captions/types").TranscriptionEvent, streamId: string, evidence?: CaptionEvidence): Promise<void> }, private readonly onView: (view: HeadsetParticipantView) => void, deps: Deps = {}) {
    this.now = deps.now ?? Date.now;
    // Browser timers require the Window receiver when stored on a class.
    this.setTimer = (deps.setTimeout ?? globalThis.setTimeout).bind(globalThis);
    this.clearTimer = (deps.clearTimeout ?? globalThis.clearTimeout).bind(globalThis);
    this.microphone = deps.microphone ?? new HeadsetMicrophone((level) => this.level(level), (error) => this.fail(error), undefined, (level, frame) => this.frame(level, frame));
    this.benchmarkSession = deps.benchmark ? new HeadsetBenchmarkSession((benchmark) => this.update({ benchmark }), () => performance.now()) : null;
    this.shadow = deps.benchmark && this.benchmarkSession ? (deps.shadowFactory ?? ((roomId, callbacks) => new OpenAIShadowTranscriber(roomId, callbacks)))(deps.benchmark.roomId, {
      onState: (state) => { this.benchmarkSession?.setState(state); if (state === "on" && this.benchmarkSession?.view.contextHints) this.shadow?.setKeywords(deps.benchmark?.hints?.() ?? []); },
      onDelta: (delta, at, itemId) => this.benchmarkSession?.openaiDelta(delta, at, itemId),
      onCommitted: (itemId) => this.benchmarkSession?.openaiCommitted(itemId),
      onCompleted: (text, itemId, at) => this.benchmarkSession?.openaiCompleted(text, itemId, at),
    }) : null;
    this.transcriber = deps.transcriberFactory?.((event) => { this.benchmarkSession?.assemblyEvent(event); this.caption(event); }, (state) => this.stt(state)) ?? null;
    this.view = { setup: "not_started", mic: "off", input: null, inputs: [], calibration: null, thresholds: null, sensitivity: this.sensitivity, micDrops: 0, stt: "off", levelDb: -100, speaking: false, check: null, result: null, notice: null };
  }
  get currentView() { return this.view; }
  private caption(event: import("../captions/types").TranscriptionEvent) {
    const now = this.now();
    if (event.type !== "speaker_revision") {
      const ends = eventCaptions(event).map((c) => c.audioEndAt).filter((end): end is number => end !== undefined && Number.isFinite(end));
      if (ends.length) this.latencyStats.push(event.type === "final_turn", now - Math.max(...ends));
      if (now - this.lastLatencyAt >= 10000) { this.lastLatencyAt = now; this.latency = this.latencyStats.snapshot(); this.presence({ latency: this.latency }); }
    }
    const evidence = event.type === "speaker_revision" ? undefined : captionEvidence(event, this.history, this.ownRefDb, now);
    void this.io.sendCaption?.(event, streamIdForEvent(event), evidence).catch(() => this.syncFailure());
  }
  private update(values: Partial<HeadsetParticipantView>) { this.view = { ...this.view, ...values }; this.onView(this.view); }
  private presence(overrides: Partial<HeadsetPresence> = {}) { const current = this.view.input; void this.io.setPresence({ mic: this.view.mic, input: current?.inputClass ?? null, label: current?.label ?? null, processing: current?.processing ?? null, setup: this.view.setup, floorDb: this.calibration?.floorDb ?? null, ownDb: this.calibration?.ownDb ?? null, visible: document.visibilityState === "visible", sensitivityDb: sensitivityDb(this.sensitivity), tuned: this.tuned, ownRefDb: this.ownRefDb, ...(this.latency ? { latency: this.latency } : {}), openDb: this.view.thresholds?.openDb ?? null, micDrops: this.micDrops, stt: this.view.stt ?? "off", ...overrides }).catch(() => this.syncFailure()); }
  async startSetup(deviceId?: string) {
    if (this.shadow) void this.shadow.start();
    this.clearTimerIfNeeded(); this.history.reset(); this.gate?.reset();
    if (!this.preserveCalibration) this.tuned = false;
    this.update({ mic: "starting", setup: "not_started", tuned: this.tuned, speaking: false, notice: null, result: null }); this.presence({ mic: "starting", setup: "not_started" });
    try {
      await this.microphone.start(deviceId); const info = this.microphone.info();
      if (!info) throw new Error("The microphone could not be started.");
      const inputs = await this.microphone.inputs();
      if (this.preserveCalibration && this.calibration && info.inputClass !== "built-in") { this.preserveCalibration = false; const applied = this.appliedCalibration ?? this.calibration; const thresholds = applySensitivity(gateThresholds(applied, this.appliedBleedDb), this.sensitivity, applied, this.ownRefDb); this.gate = new HeadsetGate(thresholds); this.update({ mic: "on", input: { deviceId: info.deviceId, label: info.sanitizedLabel, inputClass: info.inputClass, processing: info.processing }, inputs, setup: "ready", calibration: this.calibration, thresholds, tuned: this.tuned, notice: null }); this.presence({ mic: "on", setup: "ready", openDb: thresholds.openDb }); void this.transcriber?.start(); return; }
      this.preserveCalibration = false; this.tuned = false; this.update({ mic: "on", input: { deviceId: info.deviceId, label: info.sanitizedLabel, inputClass: info.inputClass, processing: info.processing }, inputs, tuned: false, setup: info.inputClass === "built-in" ? "input" : "quiet" });
      this.presence({ mic: "on", setup: info.inputClass === "built-in" ? "input" : "quiet" });
      if (info.inputClass === "built-in") return;
      this.runCalibration();
    } catch (error) { this.fail(error); throw error; }
  }
  useCurrentInput() { if (this.view.setup === "input") this.runCalibration(); }
  async chooseInput(deviceId: string) { await this.startSetup(deviceId); }
  async restartMicrophone() { this.preserveCalibration = true; await this.startSetup(); }
  async retryCaptions() { await this.transcriber?.retry?.(); }
  selectBenchmarkPhrase(index: number | null) { this.benchmarkSession?.selectPhrase(index); }
  setBenchmarkContextHints(enabled: boolean, hints: string[] = []) { this.benchmarkSession?.setContextHints(enabled); this.shadow?.setKeywords(enabled ? hints.map((name) => name.replace(/[<>\r\n]/gu, " ").trim()).filter(Boolean).slice(0, 20) : []); }
  setSensitivity(sensitivity: Sensitivity) {
    this.sensitivity = sensitivityDb(sensitivity);
    const applied = this.appliedCalibration ?? this.calibration;
    const thresholds = applied ? applySensitivity(gateThresholds(applied, this.appliedBleedDb), sensitivity, applied, this.ownRefDb) : this.view.thresholds;
    if (thresholds) { this.gate?.setThresholds(thresholds); this.update({ thresholds, sensitivityDb: sensitivityDb(sensitivity) }); }
    else this.update({ sensitivityDb: sensitivityDb(sensitivity) });
    this.presence({ sensitivityDb: sensitivityDb(sensitivity), openDb: thresholds?.openDb ?? null });
  }
  receiveControl(control: HeadsetControl) {
    if (control.type === "headset-sensitivity") { this.setSensitivity(control.levels[this.selfId] ?? "normal"); return; }
    if (control.type === "headset-check-cancel") { if (this.roomCheck?.checkId === control.checkId) { this.roomCheck = null; this.clearTimerIfNeeded(); this.update({ check: null }); } return; }
    if (this.view.setup !== "ready" || this.view.mic !== "on") return;
    const plan: RoomCheckPlan = { order: control.order, slotMs: control.slotMs, gapMs: control.gapMs };
    this.roomCheck = { plan, recorder: new RoomCheckRecorder(plan, this.selfId, this.calibration?.floorDb ?? -100), startedAt: this.now(), checkId: control.checkId };
    this.tickCheck(); this.timer = this.setTimer(() => { if (this.roomCheck?.checkId === control.checkId) { void this.io.sendSignal({ kind: "check-result", checkId: control.checkId, levels: this.roomCheck.recorder.result() }).catch(() => this.syncFailure()); this.finishCheck(); } }, checkDurationMs(plan) + 50);
  }
  setVisible(visible: boolean) { this.presence({ visible }); }
  async stopMicrophone() { this.clearTimerIfNeeded(); this.roomCheck = null; this.gate?.reset(); this.gatedAudio.reset(); this.resampler.reset(); this.gateOpenedAt = null; this.gateClosedAt = null; this.benchmarkSession?.discardActive(); this.preserveCalibration = Boolean(this.calibration); await this.transcriber?.stop(); await this.shadow?.stop(); this.update({ mic: "stopped", speaking: false, check: null, stt: "off" }); this.presence({ mic: "stopped", setup: this.view.setup, stt: "off" }); await this.microphone.stop(); }
  private runCalibration() { this.clearTimerIfNeeded(); this.levels = []; this.update({ setup: "quiet", notice: null, result: null }); this.presence({ setup: "quiet" }); this.timer = this.setTimer(() => { const floor = quietFloor(this.levels.slice(-30)); this.levels = []; this.update({ setup: "voice" }); this.presence({ setup: "voice", floorDb: floor }); this.timer = this.setTimer(() => this.finishCalibration(floor), VOICE_MS); }, QUIET_MS); }
  private finishCalibration(floorDb: number) { const result = ownVoiceLevel(this.levels, floorDb); if (!result.ok) { this.update({ setup: "failed", notice: result.reason === "too_short" ? "We couldn't hear you clearly. Check your headset is on and connected, then try again." : "We couldn't hear you clearly. Check your headset is on and connected, then try again." }); this.presence({ setup: "failed", floorDb }); return; } this.tuned = false; this.calibration = { floorDb, ownDb: result.ownDb }; this.appliedCalibration = null; this.appliedBleedDb = null; const thresholds = applySensitivity(gateThresholds(this.calibration, null), this.sensitivity, this.calibration); this.gate = new HeadsetGate(thresholds); this.update({ setup: "ready", calibration: this.calibration, thresholds, sensitivityDb: sensitivityDb(this.sensitivity), tuned: false, notice: null }); this.presence({ setup: "ready", floorDb, ownDb: result.ownDb, sensitivityDb: sensitivityDb(this.sensitivity), openDb: thresholds.openDb }); void this.transcriber?.start(); }
  private level(levelDb: number) { this.update({ levelDb }); if (this.view.setup === "quiet") { this.levels.push(levelDb); return; } if (this.view.setup === "voice") { this.levels.push(levelDb); return; } if (this.roomCheck) { const elapsed = this.now() - this.roomCheck.startedAt; this.roomCheck.recorder.push(levelDb, elapsed); const slot = slotAt(this.roomCheck.plan, elapsed); if (slot) this.update({ check: { index: slot.index, total: this.roomCheck.plan.order.length, phase: slot.phase, mine: this.roomCheck.plan.order[slot.index] === this.selfId } }); }
    if (!this.gate) return; const result = this.gate.push(levelDb); if (result.changed) { this.update({ speaking: result.open }); if (this.benchmarkSession) { const at = performance.now(); if (result.open) { this.gateOpenedAt = at; this.gateClosedAt = null; } else this.gateClosedAt = at; } this.sendGate(result.open, levelDb); } else if (result.open && this.now() - this.lastSignalAt >= 2000) this.sendGate(true, levelDb); }
  private frame(levelDb: number, frame: ArrayBuffer) { const open = this.view.setup === "ready" && this.view.mic === "on" && !this.roomCheck && Boolean(this.gate?.open); this.history.push(this.now(), levelDb, open); const output = this.gatedAudio.pushDetailed(frame, open, this.view.setup !== "ready" || Boolean(this.roomCheck)); if (output) { this.transcriber?.sendFrame(output.frame); if (this.shadow && this.benchmarkSession?.view.state === "on") { const at = performance.now(); const shouldCommit = this.benchmarkSession.gateOutput(output.active, at, this.gateOpenedAt, this.gateClosedAt); if (output.active) { const resampled = this.resampler.push(output.frame); if (!this.shadow.appendAudio(resampled)) this.benchmarkSession.setState("unavailable"); } if (shouldCommit) { if (!this.shadow.commit()) this.benchmarkSession.setState("unavailable"); this.resampler.reset(); this.gateOpenedAt = null; this.gateClosedAt = null; } } } void levelDb; }
  private stt(state: SttState) { this.update({ stt: state, notice: state === "failed" ? "Captioning couldn't start on this phone. The speech service rejected its settings." : this.view.notice }); this.presence({ stt: state }); }
  private sendGate(open: boolean, levelDb: number) { this.lastSignalAt = this.now(); void this.io.sendSignal({ kind: "gate", seq: ++this.gateSeq, open, levelDb, openDb: this.view.thresholds?.openDb ?? -100, at: this.now() }).catch(() => this.syncFailure()); }
  private syncFailure() { if (!["stopped", "denied"].includes(this.view.mic)) this.update({ notice: "Your headset status could not reach the host. Try the check again." }); }
  private tickCheck() { if (!this.roomCheck) return; const elapsed = this.now() - this.roomCheck.startedAt; const slot = slotAt(this.roomCheck.plan, elapsed); this.update({ check: slot ? { index: slot.index, total: this.roomCheck.plan.order.length, phase: slot.phase, mine: this.roomCheck.plan.order[slot.index] === this.selfId } : null }); if (slot) this.timer = this.setTimer(() => this.tickCheck(), 100); }
  private finishCheck() { const result = this.roomCheck?.recorder.result(); if (result && this.calibration) { const own = result[this.selfId] ?? null; const bleed = this.bleed(result); const separation = own === null || bleed === null ? null : Math.round((own - bleed) * 10) / 10; const applied = plausibleRoomCheckRow(this.calibration, own, bleed); if (applied && own !== null) { this.tuned = true; this.appliedCalibration = { floorDb: this.calibration.floorDb, ownDb: own }; this.appliedBleedDb = bleed; const thresholds = applySensitivity(gateThresholds(this.appliedCalibration, bleed), this.sensitivity, this.appliedCalibration, this.ownRefDb); this.gate?.setThresholds(thresholds); this.update({ thresholds, tuned: true, notice: null }); this.presence({ openDb: thresholds.openDb }); } else this.update({ notice: "The room check didn't hear you clearly. Check your headset is connected, then ask the host to run the room check again." }); this.update({ result: { separationDb: separation, band: separationBand(separation) } }); } this.roomCheck = null; this.update({ check: null }); }
  private bleed(result: Record<string, number | null>) { const values = Object.entries(result).filter(([id, value]) => id !== this.selfId && value !== null).map(([, value]) => value as number); return values.length ? Math.max(...values) : null; }
  private fail(error?: unknown) { const disconnected = error instanceof HeadsetDisconnectedError && this.view.setup === "ready"; if (disconnected) this.micDrops += 1; void this.microphone.stop(); void this.transcriber?.stop(); void this.shadow?.stop(); this.gatedAudio.reset(); this.resampler.reset(); this.gateOpenedAt = null; this.gateClosedAt = null; this.benchmarkSession?.discardActive(); this.clearTimerIfNeeded(); this.update(disconnected ? { mic: "disconnected", setup: "ready", speaking: false, notice: "Your headset disconnected." } : { mic: error ? "denied" : "stopped", setup: "failed", speaking: false, notice: error instanceof Error ? error.message : "We couldn't hear you clearly. Check your headset is on and connected, then try again." }); this.presence(disconnected ? { mic: "disconnected", setup: "ready", micDrops: this.micDrops } : { mic: "denied", setup: "failed", micDrops: this.micDrops }); }
  private clearTimerIfNeeded() { if (this.timer) this.clearTimer(this.timer); this.timer = null; }
}
function streamIdForEvent(event: import("../captions/types").TranscriptionEvent): string {
  const raw = event.type === "interim" ? event.caption.sourceTurnId ?? event.caption.id : event.sourceTurnId;
  return raw.split("/turn/")[0].split("/").at(-1) ?? raw;
}
