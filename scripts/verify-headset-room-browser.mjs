// Opt-in local-app/live-Realtime test. Never prints invitations, tokens or transcripts.
// node scripts/verify-headset-room-browser.mjs <playwright-path> <chromium-executable> [--expect-disconnect]
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2], "index.mjs")).href);
const origin = "http://127.0.0.1:3000";
const expectDisconnect = process.argv.includes("--expect-disconnect");

// Only synthesized tones, generated in a task-owned temp directory and removed afterward.
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "caption-headset-test-"));
const wavPath = path.join(scratch, "synthetic-calibration.wav");
function generateAudio() {
  const rate = 16000;
  const seconds = 90;
  const wav = Buffer.alloc(44 + rate * seconds * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = 0; i < rate * seconds; i += 1) {
    const time = i / rate;
    const amplitude = time < 3.4 ? 0.001 : 0.25;
    wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 220 * time) * amplitude * 32767), 44 + i * 2);
  }
  fs.writeFileSync(wavPath, wav);
}

function trace(page) {
  const result = { presenceTracks: 0, headsetStates: 0, systemErrors: [], pageErrors: 0, transcriptionRequests: 0, providerSockets: 0, microphoneCalls: 0 };
  page.on("console", (message) => { if (message.text() === "headset-test-microphone-start") result.microphoneCalls += 1; });
  page.on("pageerror", () => { result.pageErrors += 1; });
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/transcription/session") result.transcriptionRequests += 1; });
  page.on("websocket", (socket) => {
    if (socket.url().includes("assemblyai.com")) result.providerSockets += 1;
    socket.on("framesent", ({ payload }) => {
      try {
        // realtime-js encodes outgoing Broadcast as a binary UTF-8 envelope.
        if (Buffer.isBuffer(payload) && payload[0] === 3) {
          const offset = 7 + payload[1] + payload[2] + payload[3];
          if (payload.subarray(offset, offset + payload[4]).toString("utf8") === "headset-presence") result.headsetStates += 1;
          return;
        }
        const frame = JSON.parse(String(payload));
        const event = Array.isArray(frame) ? frame[3] : frame.event;
        const data = Array.isArray(frame) ? frame[4] : frame.payload;
        if (event === "presence" && data?.event === "track") result.presenceTracks += 1;
        if (event === "broadcast" && data?.event === "headset-presence") result.headsetStates += 1;
      } catch { /* Ignore non-JSON wire frames. */ }
    });
    socket.on("framereceived", ({ payload }) => {
      const value = String(payload);
      if (value.includes("ClientPresenceRateLimitReached")) result.systemErrors.push("ClientPresenceRateLimitReached");
    });
  });
  return result;
}

async function main() {
  generateAudio();
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-audio-capture=${wavPath}`] });
  const contexts = [];
  let host;
  let roomCreated = false;
  try {
    const newPage = async (phone = false) => {
      const context = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 }, permissions: ["microphone"] });
      contexts.push(context);
      await context.addInitScript(() => {
        window.__micCalls = 0;
        const media = navigator.mediaDevices;
        const original = media.getUserMedia.bind(media);
        media.getUserMedia = (...args) => { window.__micCalls += 1; console.debug("headset-test-microphone-start"); return original(...args); };
      });
      const page = await context.newPage();
      return { page, evidence: trace(page) };
    };
    const hostFixture = await newPage();
    host = hostFixture.page;
    await host.goto(origin);
    await host.getByLabel("Conversation mode").selectOption("headset", { timeout: 20000 });
    await host.getByRole("button", { name: "Start Conversation", exact: true }).click();
    const invite = host.getByRole("dialog");
    await invite.waitFor({ timeout: 25000 });
    const joinUrl = await invite.locator("a.room-link").getAttribute("href");
    roomCreated = true;
    await invite.getByRole("button", { name: "Close", exact: true }).click();
    const phones = [];
    for (let i = 0; i < (expectDisconnect ? 1 : 2); i += 1) {
      const fixture = await newPage(true);
      phones.push(fixture);
      await fixture.page.goto(joinUrl);
      // Wait for the asynchronous invitation check and React hydration before typing.
      await fixture.page.getByText(/This conversation uses Headset Mode/).waitFor({ timeout: 20000 });
      await fixture.page.getByLabel("Your display name").fill(`Headset fixture ${i + 1}`);
      await fixture.page.waitForFunction(() => Boolean(document.querySelector("[role=alert]") || document.querySelector("form button:not([disabled])")), undefined, { timeout: 15000 });
      const joinError = await fixture.page.getByRole("alert").count() ? await fixture.page.getByRole("alert").textContent() : null;
      if (joinError) throw new Error(`Pre-join check failed: ${joinError}`);
      await fixture.page.getByRole("button", { name: "Join Conversation", exact: true }).click();
      await fixture.page.getByText("● Connected", { exact: true }).waitFor({ timeout: 25000 });
      await fixture.page.getByRole("button", { name: "Start headset check", exact: true }).click();
      if (expectDisconnect) {
        await fixture.page.getByRole("heading", { name: "Room disconnected" }).waitFor({ timeout: 20000 });
      } else {
        await fixture.page.getByText(/Headset ready\. Keep this page open/).waitFor({ timeout: 20000 });
      }
    }
    if (!expectDisconnect) {
      await host.getByRole("button", { name: "Start room check", exact: true }).click({ timeout: 20000 });
      await host.locator("table.headset-matrix").waitFor({ timeout: 30000 });
      await phones[0].page.reload();
      await phones[0].page.getByText(/This conversation uses Headset Mode/).waitFor({ timeout: 20000 });
      await phones[0].page.getByLabel("Your display name").fill("Headset fixture 1");
      await phones[0].page.getByRole("button", { name: "Join Conversation", exact: true }).click();
      await phones[0].page.getByText("● Connected", { exact: true }).waitFor({ timeout: 25000 });
      await phones[0].page.getByRole("button", { name: "Start headset check", exact: true }).click();
      await phones[0].page.getByText(/Headset ready\. Keep this page open/).waitFor({ timeout: 20000 });
    }
    for (const fixture of [hostFixture, ...phones]) {
      assert.equal(fixture.evidence.transcriptionRequests, 0);
      assert.equal(fixture.evidence.providerSockets, 0);
    }
    assert.equal(hostFixture.evidence.microphoneCalls, 0);
    console.log(JSON.stringify({ scenario: expectDisconnect ? "pre-fix disconnect" : "two-phone calibration/check/rejoin", host: hostFixture.evidence, phones: phones.map(({ evidence }) => evidence) }, null, 2));
    if (expectDisconnect) assert(phones[0].evidence.systemErrors.includes("ClientPresenceRateLimitReached"));
    else for (const { page, evidence } of phones) {
      assert.equal(await page.getByRole("heading", { name: "Room disconnected" }).count(), 0);
      assert.equal(evidence.systemErrors.length, 0);
      assert.equal(evidence.pageErrors, 0);
    }
    console.log(expectDisconnect ? "Confirmed live pre-fix Presence rate-limit disconnect." : "PASS: live two-phone calibration, room matrix and rejoin; no transcription or host microphone.");
  } finally {
    if (roomCreated && host) {
      await host.getByRole("button", { name: "End Conversation", exact: true }).click();
      await host.getByText("Conversation ended", { exact: true }).first().waitFor({ timeout: 10000 });
      console.log("Temporary test room ended.");
    }
    for (const context of contexts) await context.close();
    await browser.close();
  }
}

main().catch((error) => { console.error(error.message.replace(/https?:\/\/[^\s'"<>]+/g, "<URL redacted>")); process.exitCode = 1; }).finally(() => { fs.unlinkSync(wavPath); fs.rmdirSync(scratch); });
