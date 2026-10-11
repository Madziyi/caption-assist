// Isolated UI + real capture/worklet regression. No room or speech-provider calls.
// node scripts/headset-setup-browser.mjs <playwright-package-path> <chromium-executable>
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2], "index.mjs")).href);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HeadsetSetup } from '/src/components/headset-setup.tsx';
import { HeadsetParticipant } from '/src/lib/headset/headset-participant.ts';
import '/src/app/globals.css';
const root = createRoot(document.getElementById('root'));
window.__micCalls = 0;
window.__levels = 0;
const media = navigator.mediaDevices;
const original = media.getUserMedia.bind(media);
media.getUserMedia = (...args) => { window.__micCalls++; return original(...args); };
const participant = new HeadsetParticipant('synthetic-person', {
  async setPresence() {}, async sendSignal() {}
}, (view) => { window.__view = view; if (view.mic === 'on') window.__levels++; render(view); });
function render(view) {
  root.render(React.createElement('main', { className: 'participant-shell' },
    React.createElement(HeadsetSetup, { view, start: () => void participant.startSetup(),
      useAnyway: () => participant.useCurrentInput(), retry: () => void participant.restartMicrophone(),
      choose: (id) => void participant.chooseInput(id) })));
}
window.__participant = participant;
render(participant.currentView);
`;
let server;
let browser;
try {
  server = await createServer({
    root, configFile: false,
    plugins: [react(), {
      name: "isolated-headset-setup",
      resolveId(id) { if (id === "/headset-setup-test.tsx") return "\0headset-setup-test"; },
      load(id) { if (id === "\0headset-setup-test") return entry; },
      configureServer(dev) {
        dev.middlewares.use((request, response, next) => {
          if (request.url !== "/") return next();
          response.setHeader("Content-Type", "text/html");
          const html = '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Headset setup regression</title><div id="root"></div><script type="module" src="/headset-setup-test.tsx"></script>';
          void dev.transformIndexHtml("/", html).then((result) => response.end(result)).catch(next);
        });
      },
    }],
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ headless: true, executablePath: process.argv[3], args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") { externalRequests.push(url.hostname); await route.abort(); }
    else await route.continue();
  });
  await page.goto(`http://127.0.0.1:${port}`);
  const start = page.getByRole("button", { name: "Start headset check" });
  await start.waitFor();
  assert.equal(await page.evaluate(() => window.__micCalls), 0);
  await page.keyboard.press("Tab");
  assert.equal(await start.evaluate((button) => document.activeElement === button), true);
  await page.keyboard.press("Enter");
  await page.getByText("Stay quiet for 3 seconds…").waitFor();
  await page.waitForFunction(() => window.__levels > 10);
  const inputCount = await page.evaluate(() => window.__view.inputs.length);
  assert.ok(inputCount > 1, "simulated Chromium exposes multiple audio routes");
  const picker = page.getByLabel("Choose input");
  const activeId = await page.evaluate(() => window.__view.input.deviceId);
  assert.equal(await picker.inputValue(), activeId);
  await picker.selectOption(activeId);
  await page.waitForFunction(() => window.__micCalls === 2 && window.__view.mic === "on");
  const widths = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false);
    widths.push({ width, overflow });
  }
  await page.evaluate(() => window.__participant.stopMicrophone());
  const restart = page.getByRole("button", { name: "Turn microphone back on" });
  await restart.click();
  await page.waitForFunction(() => window.__micCalls === 3 && window.__view.mic === "on");
  await page.evaluate(() => window.__participant.stopMicrophone());
  assert.deepEqual(errors, []);
  // Font fetches are blocked; no actual request is allowed outside localhost.
  assert.ok(externalRequests.every((host) => host === "fonts.googleapis.com" || host === "fonts.gstatic.com"));
  console.log(JSON.stringify({ keyboardStart: true, microphoneCalls: 3, receivedLevels: true, pickerMatchedTrack: true, inputCount, restart: true, widths, pageErrors: errors.length, externalNetworkAllowed: false }));
} finally {
  await browser?.close();
  await server?.close();
}
