// Live localhost app + Supabase + AssemblyAI, synthetic voices only.
// Keeps tokens, invitations, transcripts and storage state in memory; prints counts only.
// node scripts/verify-headset-captions-browser.mjs <playwright-path> <chromium-executable>
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import ts from "typescript";
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2], "index.mjs")).href);
const executablePath = process.argv[3];
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "caption-headset-live-"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RATE = 16000;
const expected = ["garden gate", "train station", "umbrella", "appointment"];
function readWave(name) {
  const data = fs.readFileSync(path.join(scratch, `${name}.wav`));
  let offset = 12;
  while (data.toString("ascii", offset, offset + 4) !== "data") offset += 8 + data.readUInt32LE(offset + 4) + (data.readUInt32LE(offset + 4) % 2);
  const samples = new Int16Array(data.buffer.slice(data.byteOffset + offset + 8, data.byteOffset + offset + 8 + data.readUInt32LE(offset + 4)));
  const levels = [];
  for (let i = 0; i + 1600 <= samples.length; i += 1600) { let sum = 0; for (let j = i; j < i + 1600; j++) sum += samples[j] ** 2; levels.push(20 * Math.log10(Math.max(1, Math.sqrt(sum / 1600)) / 32768)); }
  const sorted = [...levels].sort((a, b) => a - b), peak = sorted[Math.ceil(sorted.length * 0.95) - 1];
  const speech = sorted.filter((db) => db >= peak - 15); const own = speech[Math.ceil(speech.length / 2) - 1];
  const gain = 10 ** ((-25 - own) / 20);
  assert.ok(Number.isFinite(gain), "speech fixture contained no finite audio levels");
  console.log(JSON.stringify({ fixture: name, durationMs: Math.round(samples.length / RATE * 1000), normalizedOwnDb: -25 }));
  return Float64Array.from(samples, (sample) => sample * gain);
}
function createWaves() {
  execFileSync("powershell.exe", ["-NoProfile", "-File", path.resolve("scripts/create-headset-speech.ps1"), "-OutputDirectory", scratch], { windowsHide: true, stdio: "pipe" });
  const cal = [readWave("cal-a"), readWave("cal-b")];
  const turns = [readWave("turn-a"), readWave("turn-b"), readWave("second-a"), readWave("second-b")];
  const paths = [];
  for (let phone = 0; phone < 2; phone++) {
    const pcm = new Float64Array(RATE * 76);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin(i / RATE * 2 * Math.PI * 220) * 3;
    const mix = (samples, atSeconds, gain = 1) => { const at = Math.round(atSeconds * RATE); for (let i = 0; i < samples.length && at + i < pcm.length; i++) pcm[at + i] += samples[i] * gain; };
    mix(cal[phone], 3.5);
    // Room check starts at capture + 15 s. Every phone hears each slot, with 5 dB bleed.
    for (let who = 0; who < 2; who++) mix(cal[who], 16.5 + who * 7.5, who === phone ? 1 : 10 ** (-5 / 20));
    for (let i = 0; i < 4; i++) mix(turns[i], 36 + i * 7, i % 2 === phone ? 1 : 10 ** (-5 / 20));
    const wav = Buffer.alloc(44 + pcm.length * 2); wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(RATE, 24); wav.writeUInt32LE(RATE * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(pcm.length * 2, 40);
    for (let i = 0; i < pcm.length; i++) wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i]))), 44 + i * 2);
    const output = path.join(scratch, `phone-${phone}.wav`); fs.writeFileSync(output, wav); paths.push(output);
  }
  return paths;
}
function trace(page) {
  const result = { begin: 0, turns: 0, termination: 0, errors: 0, nonSilent: 0, silent: 0, micCalls: 0, pageErrors: 0, rateLimitErrors: 0, providerOptions: [], captionEvidence: [], wordTimings: [] };
  page.on("pageerror", () => result.pageErrors++);
  page.on("console", (message) => { if (message.text() === "headset-live-mic") result.micCalls++; });
  page.on("websocket", (socket) => {
    if (!socket.url().includes("assemblyai.com")) {
      socket.on("framereceived", ({ payload }) => { if (String(payload).includes("ClientPresenceRateLimitReached")) result.rateLimitErrors++; });
      socket.on("framesent", ({ payload }) => {
        try {
          if (!Buffer.isBuffer(payload) || payload[0] !== 3) return;
          const eventAt = 7 + payload[1] + payload[2] + payload[3];
          if (payload.subarray(eventAt, eventAt + payload[4]).toString("utf8") !== "caption") return;
          const envelope = JSON.parse(payload.subarray(eventAt + payload[4] + payload[5]).toString("utf8"));
          const event = envelope.event; const captions = event.type === "interim" ? [event.caption] : event.captions;
          const text = captions.map((c) => c.text).join(" ").toLowerCase();
          result.captionEvidence.push({ final: event.type === "final_turn", turn: Number((event.sourceTurnId ?? event.caption?.sourceTurnId).split("/turn/").at(-1)), phrase: expected.findIndex((phrase) => text.includes(phrase)), readyAt: envelope.readyAt, evidence: envelope.evidence, audioEndAt: captions.at(-1).audioEndAt, startedAt: captions[0].startedAt, endedAt: captions.at(-1).endedAt });
        } catch { /* Print no raw frames, tokens, topic IDs or transcripts. */ }
      });
      return;
    }
    const params = new URL(socket.url()).searchParams;
    result.providerOptions.push(Object.fromEntries(["speech_model", "voice_focus", "speaker_labels", "mode", "format_turns", "sample_rate"].map((name) => [name, params.get(name)])));
    socket.on("framesent", ({ payload }) => { if (Buffer.isBuffer(payload)) { if (payload.some((byte) => byte !== 0)) result.nonSilent++; else result.silent++; } });
    socket.on("framereceived", ({ payload }) => { try { const data = JSON.parse(String(payload)); if (data.type === "Begin") result.begin++; if (data.type === "Turn") { result.turns++; result.wordTimings.push({ final: data.end_of_turn, formatted: data.turn_is_formatted, words: data.words?.length ?? 0, firstWordFields: Object.keys(data.words?.[0] ?? {}), start: data.words?.[0]?.start, end: data.words?.at(-1)?.end, receivedAt: Date.now() }); } if (data.type === "Termination") result.termination++; if (data.type === "Error") result.errors++; } catch { /* No transcript/socket-frame logging. */ } });
  });
  return result;
}
const states = new Map();
async function fixture(wav, key, bypass = false) {
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", ...(wav ? [`--use-file-for-fake-audio-capture=${wav}`] : [])] });
  const context = await browser.newContext({ viewport: wav ? { width: 390, height: 844 } : { width: 1280, height: 844 }, permissions: ["microphone"], ...(states.has(key) ? { storageState: states.get(key) } : {}) });
  await context.addInitScript(({ bypass }) => {
    window.__captionHeadsetTest = { bypass };
    const media = navigator.mediaDevices, original = media.getUserMedia.bind(media);
    media.getUserMedia = (...args) => { window.__captureAt = Date.now(); console.debug("headset-live-mic"); return original(...args); };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { async writeText(text) { window.__headsetExport = text; } } });
  }, { bypass });
  const page = await context.newPage();
  return { browser, context, page, evidence: trace(page), key };
}
async function run(wavs, bypass) {
  const fixtures = []; let host; let roomCreated = false;
  try {
    host = await fixture(null, "host", bypass); fixtures.push(host);
    await host.page.goto("http://127.0.0.1:3000");
    await host.page.getByLabel("Conversation mode").selectOption("headset");
    await host.page.getByRole("button", { name: /Start (New )?Conversation/, exact: false }).click();
    const dialog = host.page.getByRole("dialog"); await dialog.waitFor({ timeout: 25000 });
    const invite = await dialog.locator("a.room-link").getAttribute("href"); roomCreated = true;
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    const phones = [];
    for (let i = 0; i < 2; i++) {
      const phone = await fixture(wavs[i], `phone-${i}`); fixtures.push(phone); phones.push(phone);
      await phone.page.goto(invite); await phone.page.getByText(/Put on your AirPods or headset/).waitFor();
      await phone.page.getByLabel("Your display name").fill(`Synthetic ${i + 1}`);
      await phone.page.getByRole("button", { name: "Join Conversation" }).click();
      await phone.page.getByRole("button", { name: "Start headset check" }).waitFor({ timeout: 20000 });
    }
    await Promise.all(phones.map((phone) => phone.page.getByRole("button", { name: "Start headset check" }).click()));
    const captureAt = Math.max(...await Promise.all(phones.map((phone) => phone.page.evaluate(() => window.__captureAt))));
    try { await Promise.all(phones.map((phone) => phone.page.getByText(/Headset ready/).waitFor({ timeout: 15000 }))); }
    catch (error) { console.log(JSON.stringify({ calibrationFailure: await Promise.all(phones.map((phone) => phone.page.locator(".participant-shell").innerText())) })); throw error; }
    await Promise.all(phones.map((phone) => phone.page.getByText("Captioning your voice").waitFor({ timeout: 15000 })));
    const remaining = captureAt + 15000 - Date.now(); assert.ok(remaining > 0, "provider setup exceeded synthetic room-check schedule"); await sleep(remaining);
    await host.page.getByRole("button", { name: "Start room check", exact: true }).click();
    await host.page.getByRole("table", { name: "Room check results in dB" }).waitFor({ timeout: 22000 });
    await host.page.waitForFunction(() => !document.body.textContent.includes("Room check needed"), { timeout: 5000 });
    // Approved manual slider +6 makes 5 dB simulated bleed audible to both streams.
    for (let i = 0; i < 2; i++) { const slider = host.page.getByRole("slider", { name: `Sensitivity for Synthetic ${i + 1}` }); await slider.focus(); await slider.press("End"); await slider.press("ArrowLeft"); await slider.press("ArrowRight"); }
    const checkbox = host.page.getByRole("checkbox", { name: "Show hidden duplicates (for testing)" }); await checkbox.focus(); await checkbox.press("Space"); assert.equal(await checkbox.isChecked(), true);
    const layouts = [];
    for (const width of [390, 1280]) { await host.page.setViewportSize({ width, height: 844 }); layouts.push({ width, overflow: await host.page.evaluate(() => document.documentElement.scrollWidth > innerWidth) }); }
    assert.ok(layouts.every((layout) => !layout.overflow));
    await sleep(Math.max(0, captureAt + 67000 - Date.now()));
    await host.page.getByRole("button", { name: "Copy results", exact: true }).click();
    const exported = JSON.parse(await host.page.evaluate(() => window.__headsetExport));
    const visibleText = await host.page.locator(".live-caption-scroll").innerText().catch(() => "");
    const normalized = visibleText.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ");
    const occurrences = expected.map((phrase) => normalized.split(phrase).length - 1);
    const ownership = await host.page.locator(".live-caption-line").evaluateAll((lines, expected) => lines.flatMap((line) => {
      const text = line.querySelector("p")?.textContent?.toLowerCase() ?? "";
      const speaker = line.querySelector(".speaker-identity")?.textContent ?? "";
      return expected.flatMap((phrase, index) => text.includes(phrase) ? [{ phrase: index, owner: speaker.includes(`Synthetic ${index % 2 + 1}`) }] : []);
    }), expected);
    const result = { bypass, occurrences, wrongNames: ownership.filter((line) => !line.owner).length, missedLines: occurrences.filter((n) => !n).length, duplicateLines: occurrences.reduce((total, n) => total + Math.max(0, n - 1), 0), captions: exported.participants.map((p) => p.captions), latency: exported.participants.map((p) => p.latency), participants: exported.participants.map((p) => ({ ref: p.ref, ownDb: p.ownDb, sensitivityDb: p.sensitivityDb, tuned: p.tuned })), separationDb: exported.check.separationDb, layouts };
    await host.page.getByRole("button", { name: "End Conversation", exact: true }).click(); roomCreated = false;
    await Promise.all(phones.map((phone) => phone.page.getByRole("heading", { name: "Conversation ended" }).waitFor()));
    await sleep(7000);
    result.transport = fixtures.map((f) => ({ ...f.evidence, ...(!process.argv.includes("--diagnostic") ? { captionEvidence: f.evidence.captionEvidence.filter((e) => e.final), wordTimings: undefined } : {}) }));
    for (const phone of phones) { assert.ok(phone.evidence.begin >= 1 && phone.evidence.turns > 0 && phone.evidence.termination >= 1); assert.equal(phone.evidence.errors, 0); assert.equal(phone.evidence.pageErrors, 0); assert.equal(phone.evidence.rateLimitErrors, 0); }
    assert.equal(host.evidence.micCalls, 0);
    console.log(JSON.stringify(result));
    return result;
  } finally {
    if (roomCreated && host) await host.page.getByRole("button", { name: "End Conversation", exact: true }).click().catch(() => undefined);
    for (const f of fixtures) { states.set(f.key, await f.context.storageState()); await f.browser.close(); }
  }
}
try {
  const wavs = createWaves();
  if (process.argv.includes("--capture-debug")) {
    const urls = new Map();
    const moduleUrl = (file) => {
      if (urls.has(file)) return urls.get(file);
      const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/from\s+["'](\.[^"']+)["']/g, (_, relative) => `from ${JSON.stringify(moduleUrl(path.resolve(path.dirname(file), relative + ".ts")))}`);
      const url = "data:text/javascript;base64," + Buffer.from(source).toString("base64"); urls.set(file, url); return url;
    };
    const entry = moduleUrl(path.resolve("src/lib/headset/headset-participant.ts"));
    const f = await fixture(wavs[0], "capture-debug");
    try {
      await f.page.goto("http://127.0.0.1:3000/audio/pcm-worklet.js");
      const evidence = await f.page.evaluate(async (entry) => {
        const { HeadsetParticipant } = await import(entry); let view; const levels = { quiet: [], voice: [] };
        const participant = new HeadsetParticipant("synthetic", { async setPresence() {}, async sendSignal() {} }, (next) => { view = next; if (levels[next.setup]) levels[next.setup].push(next.levelDb); });
        await participant.startSetup(); await new Promise((resolve) => setTimeout(resolve, 9500));
        const summary = { setup: view.setup, notice: view.notice, inputClass: view.input?.inputClass, calibration: view.calibration, levels: Object.fromEntries(Object.entries(levels).map(([phase, values]) => [phase, { frames: values.length, min: Math.min(...values), max: Math.max(...values) }])) };
        await participant.stopMicrophone(); return summary;
      }, entry); console.log(JSON.stringify(evidence));
    } finally { await f.browser.close(); }
  } else {
    const active = await run(wavs, false);
    if (process.argv.includes("--diagnostic")) process.exitCode = 0;
    else {
    const bypass = await run(wavs, true);
    assert.equal(active.missedLines, 0); assert.equal(active.duplicateLines, 0);
    assert.equal(active.wrongNames, 0);
    assert.ok(bypass.duplicateLines > active.duplicateLines, "bypass must expose the duplicates removed by arbitration");
    console.log("PASS: live provider Begin/Turn/Termination and two-phone arbitration/bypass pipeline; synthetic evidence only.");
    }
  }
} catch (error) { console.error(error.message.replace(/https?:\/\/\S+/g, "<redacted URL>")); process.exitCode = 1; }
finally {
  states.clear();
  for (const name of fs.readdirSync(scratch)) fs.unlinkSync(path.join(scratch, name)); fs.rmdirSync(scratch);
}
