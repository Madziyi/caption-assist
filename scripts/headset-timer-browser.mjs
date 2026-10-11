// Isolated native-browser regression: no room, provider or external network.
// Add --capture for a browser-simulated microphone through the real AudioWorklet.
// node scripts/headset-timer-browser.mjs <playwright-package-path> <chromium-executable> [--expect-failure] [--capture]
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
const { chromium } = await import(process.argv[2] ? pathToFileURL(path.resolve(process.argv[2], "index.mjs")).href : "playwright");
const moduleUrls = new Map();

function browserModule(file) {
  if (moduleUrls.has(file)) return moduleUrls.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from\s+["'](\.[^"']+)["']/g, (_, relative) => {
    const dependency = path.resolve(path.dirname(file), `${relative}.ts`);
    return `from ${JSON.stringify(browserModule(dependency))}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  moduleUrls.set(file, url);
  return url;
}

async function main() {
  const capture = process.argv.includes("--capture");
  let server;
  const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}), ...(capture ? { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } : {}) });
  try {
    const page = await browser.newPage();
    const entry = browserModule(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/lib/headset/headset-participant.ts"));
    const results = await page.evaluate(async (entry) => {
      const { HeadsetParticipant } = await import(entry);
      const results = [];
      for (const [label, inputClass] of [["Default", "unknown"], ["Headset microphone", "headset"], ["Bluetooth headset", "headset"], ["Speakerphone", "built-in"]]) {
        let view;
        const microphone = {
          async start() {}, async stop() {}, async inputs() { return []; },
          info() { return { deviceId: "test-input", label, sanitizedLabel: label, inputClass, processing: { autoGainControl: false, noiseSuppression: false, echoCancellation: false } }; },
        };
        const participant = new HeadsetParticipant("test-person", { async setPresence() {}, async sendSignal() {} }, (next) => { view = next; }, { microphone });
        let error = null;
        try { await participant.startSetup(); } catch (failure) { error = failure.message; }
        const initial = view.setup;
        if (inputClass === "built-in" && !error) {
          try { participant.useCurrentInput(); } catch (failure) { error = failure.message; }
        }
        const afterContinue = view.setup;
        try { await participant.stopMicrophone(); } catch (failure) { error = failure.message; }
        results.push({ label, initial, afterContinue, error });
      }
      return results;
    }, entry);
    console.log(JSON.stringify(results, null, 2));
    if (process.argv.includes("--expect-failure")) {
      for (const result of results) assert.equal(result.error, "Illegal invocation");
      assert.equal(results[3].initial, "input");
      console.log("Confirmed pre-fix failure: all calibration paths throw; Speakerphone initially bypasses calibration.");
    } else {
      for (const result of results) {
        assert.equal(result.error, null);
        assert.equal(result.afterContinue, "quiet");
      }
      assert.equal(results[3].initial, "input");
      console.log("PASS: all four input routes start calibration and stop with native Chromium timers.");
    }
    if (capture) {
      const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
      const worklet = fs.readFileSync(path.join(sourceRoot, "public/audio/pcm-worklet.js"), "utf8");
      server = http.createServer((request, response) => {
        const audio = request.url === "/audio/pcm-worklet.js";
        response.writeHead(200, { "Content-Type": audio ? "text/javascript" : "text/html" });
        response.end(audio ? worklet : "<!doctype html><title>Isolated headset regression</title>");
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const audioResult = await page.evaluate(async (entry) => {
        const { HeadsetParticipant } = await import(entry);
        let view;
        let levelUpdates = 0;
        const states = [];
        const participant = new HeadsetParticipant("test-person", { async setPresence() {}, async sendSignal() {} }, (next) => {
          view = next;
          if (states.at(-1) !== next.setup) states.push(next.setup);
          if (next.mic === "on" && (next.setup === "quiet" || next.setup === "voice")) levelUpdates += 1;
        });
        try {
          await participant.startSetup();
          const activeId = view.input.deviceId;
          const selectedId = view.inputs.find((input) => input.deviceId === activeId)?.deviceId;
          await new Promise((resolve) => window.setTimeout(resolve, 3200));
          const phaseAfterQuiet = view.setup;
          // Simulated capture may contain silence; count level notifications,
          // not amplitude, to establish that the worklet delivered frames.
          const receivedLevels = levelUpdates > 10;
          if (!selectedId) throw new Error("Active simulated microphone not in enumerated inputs.");
          await participant.chooseInput(selectedId);
          const phaseAfterSelection = view.setup;
          await participant.stopMicrophone();
          const phaseAfterStop = view.mic;
          await new Promise((resolve) => window.setTimeout(resolve, 3200));
          return { states, phaseAfterQuiet, receivedLevels, phaseAfterSelection, phaseAfterStop, timerStayedCancelled: view.mic === "stopped" && view.setup === "quiet" };
        } finally { await participant.stopMicrophone(); }
      }, entry);
      console.log(JSON.stringify(audioResult, null, 2));
      assert.equal(audioResult.phaseAfterQuiet, "voice");
      assert.equal(audioResult.receivedLevels, true);
      assert.equal(audioResult.phaseAfterSelection, "quiet");
      assert.equal(audioResult.phaseAfterStop, "stopped");
      assert.equal(audioResult.timerStayedCancelled, true);
      console.log("PASS: real capture/AudioWorklet delivers simulated PCM; calibration advances; ID selection restarts; stop cancels calibration.");
    }
  } finally {
    await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error.message.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, "<browser module>")); process.exitCode = 1; });
