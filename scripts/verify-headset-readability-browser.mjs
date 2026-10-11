// Isolated real component render, synthetic captions/state; no room/provider/audio.
// node scripts/verify-headset-readability-browser.mjs <playwright-path> <chromium-executable>
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
import { HeadsetSpeakingBoard } from '/src/components/headset-panels.tsx';
import { HeadsetTranscript } from '/src/components/headset-transcript.tsx';
import '/src/app/globals.css';
const renderRoot = createRoot(document.getElementById('root'));
const inputs = [{ deviceId:'headset',label:'Bluetooth headset microphone' },{ deviceId:'default',label:'Default' }];
let phone = { mic:'on',setup:'ready',stt:'on',speaking:false,inputs,input:{ ...inputs[0],inputClass:'headset',processing:{} },check:null,notice:null,levelDb:-25 };
const presence = { mic:'on',setup:'ready',stt:'on',visible:true,tuned:true };
let host = { mode:'headset',snapshot:{ participants:[{ id:'a',displayName:'Alice' },{ id:'b',displayName:'Bob' }] },headsetHost:{ people:{ a:{ presence,speaking:false },b:{ presence,speaking:false } },check:null } };
const caption = (id,start,text) => ({ id,sourceTurnId:id,sourceId:'participant:a',speakerId:'a',startedAt:start,endedAt:start+500,isFinal:true,text });
let finals = [caption('a',0,'One thought can continue through a short pause.'),caption('b',800,'These words stay together in the same paragraph.')];
let interims = [{ ...caption('c',1500,'Even as new words arrive'),isFinal:false }];
const phoneOnly = location.hash === '#phone';
function render() {
  renderRoot.render(phoneOnly ? React.createElement('main',{ className:'participant-shell' },React.createElement('h1',null,'Your headset'),React.createElement(HeadsetSetup,{ view:phone,start(){},retry(){},useAnyway(){},choose(id){ phone={ ...phone,input:{ ...phone.input,...inputs.find(input=>input.deviceId===id),inputClass:id==='headset'?'headset':'unknown' } };window.__chosen=id;render(); } })) :
    React.createElement('main',{ style:{ margin:'1rem',minWidth:0 } },React.createElement(HeadsetSpeakingBoard,{ view:host }),React.createElement('section',{ className:'caption-stage',style:{ marginTop:'1rem' } },React.createElement('div',{ className:'live-caption-scroll' },React.createElement(HeadsetTranscript,{ finalized:finals,interims,speaker:(id)=>React.createElement('button',{ className:'speaker-identity speaker-identity-live' },id==='a'?'Alice':'Bob') })))));
}
window.__state = (change) => { phone={ ...phone,...change };host={ ...host,headsetHost:{ ...host.headsetHost,people:{ ...host.headsetHost.people,a:{ presence:{ ...presence,...change },speaking:change.speaking??false } } } };render(); };
window.__finalize = () => { finals=[...finals,{ ...interims[0],isFinal:true,text:'Even as new words arrive, the paragraph stays put.' }];interims=[];render(); };
window.__remove = () => { finals=finals.filter(caption=>caption.id!=='b');render(); };
render();
`;
let server, browser;
try {
  server = await createServer({ root, configFile: false, resolve: { alias: { "@": path.join(root, "src") } },
    plugins: [react(), { name: "headset-readability-fixture",
      resolveId(id) { if (id === "/headset-readability.tsx") return "\0headset-readability"; },
      load(id) { if (id === "\0headset-readability") return entry; },
      configureServer(dev) { dev.middlewares.use((request, response, next) => {
        if (request.url !== "/") return next();
        response.setHeader("Content-Type", "text/html");
        void dev.transformIndexHtml("/", '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Headset readability verification</title><div id="root"></div><script type="module" src="/headset-readability.tsx"></script>').then(html => response.end(html)).catch(next);
      }); },
    }], server: { host: "127.0.0.1", port: 0, watch: { ignored: ["**/.next/**", "**/test-results/**"] } },
  });
  await server.listen();
  browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
  await page.goto(base + "#phone");
  const picker = page.getByLabel("Choose input"); await picker.waitFor();
  assert.equal(await picker.inputValue(), "headset");
  await picker.focus(); assert.equal(await picker.evaluate(el => el === document.activeElement), true);
  await picker.press("ArrowDown"); await picker.press("Enter");
  assert.equal(await page.evaluate(() => window.__chosen), "default");
  const help = page.getByText("About microphone choices"); await help.focus(); await help.press("Enter");
  assert.equal(await help.evaluate(el => el.parentElement.open), true);
  await help.press("Enter");
  await picker.selectOption("headset"); await picker.blur();
  await page.evaluate(() => window.__state({ speaking: true }));
  await page.locator(".headset-activity-speaking").waitFor();
  assert.equal(await page.locator(".headset-activity-speaking").count(), 1);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(root, "test-results/headset-readability-phone.png"), fullPage: true });
  await page.evaluate(() => window.__state({ mic: "disconnected" }));
  await page.getByText("Your headset disconnected.", { exact: true }).waitFor();
  assert.equal(await page.getByText("Speaking", { exact: true }).count(), 0);
  await page.goto(base);
  await page.locator(".headset-reading-block").waitFor();
  assert.equal(await page.locator(".headset-reading-block").count(), 1);
  assert.equal(await page.locator(".headset-reading-block .speaker-identity").count(), 1);
  await page.evaluate(() => window.__finalize());
  await page.getByText(/the paragraph stays put/).waitFor();
  assert.equal(await page.locator(".headset-reading-block").count(), 1);
  await page.evaluate(() => window.__remove());
  assert.equal(await page.getByText(/These words stay together/).count(), 0);
  await page.evaluate(() => window.__state({ speaking: true }));
  await page.getByText("Speaking", { exact: true }).waitFor();
  assert.equal(await page.locator(".headset-activity-compact").count(), 2);
  const layouts = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const scale of [100, 200]) {
      await page.evaluate(scale => { document.documentElement.style.fontSize = scale + "%"; }, scale);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false); layouts.push({ surface: "host", width, scale, overflow });
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = "100%"; });
  await page.screenshot({ path: path.join(root, "test-results/headset-readability-host.png"), fullPage: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".headset-activity").first().evaluate(el => getComputedStyle(el).transitionProperty), "none");
  await page.evaluate(() => window.__state({ stt: "failed", speaking: true }));
  await page.getByText("Captions stopped", { exact: true }).waitFor();
  assert.equal(await page.getByText("Speaking", { exact: true }).count(), 0);
  await page.goto(base + "#phone"); await page.reload(); await picker.waitFor();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const scale of [100, 200]) {
      await page.evaluate(scale => { document.documentElement.style.fontSize = scale + "%"; }, scale);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false); layouts.push({ surface: "phone", width, scale, overflow });
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pickerKeyboard: true, expandableHelp: true, phoneSpeakingAndFailure: true, compactHostPills: 2, flowingParagraph: true, finalAndRemoval: true, reducedMotion: true, layouts, pageErrors: 0, externalNetworkAllowed: false }));
} finally { await browser?.close(); await server?.close(); }
