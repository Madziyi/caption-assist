# Quality & Field Verification Ledger

This file records measured evidence about whether the product is actually usable as a real-time accessibility tool.

Do not invent values. Mark unmeasured items `unverified`.

### 2026-10-11 — Headset UI/readability follow-up

- Human evidence: deployed 008.3 "works perfectly now"; remaining concerns are input-picker polish, speaking feedback, noticeable latency and fragmented reading lines. Exact devices/session length, numeric misses/duplicates and latency were not supplied. Human approved UI/readability changes only for this pass, explicitly leaving transcription timing unchanged.
- Baseline: fetched clean `HEAD == origin/main == d87d7dbcce8ed2afdf1be4b420057318d4968228`. Changed presentation only: styled native picker, text-labelled coloured phone rectangle/compact existing-row host pills, and pure headset reading blocks. No microphone selection/permission, provider, gate/look-ahead, arbiter, room transport, history or privacy change.
- Automated: `npm test` **238 tests/36 files passed**, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` passed. Generated next-env build drift restored. New coverage: same-speaker finals/interims, 2 s pause, speaker/source/unknown/overlap separation, 80-word turn-boundary limit, final order/dedupe, original records plus correction/removal, stable rendered paragraph, status precedence (12 setup/mic/STT/visibility/check cases), compact rows and collapsed route help. Initial typecheck rejected `toSorted` under the existing JS target; copied-array `sort` fixed it without changing runtime targets.
- Isolated browser: `node scripts/verify-headset-readability-browser.mjs <playwright-path> <chromium-path>` passed in native Chromium. Both phone and host fit at 390 and 1280 CSS px with 100% and 200% root text size (eight combinations), no horizontal overflow or page errors. Keyboard native input selection and disclosure worked; prominent green Speaking and overriding disconnected phone state, two compact host pills, caption failure override, one label/paragraph through interim→final and turn removal, and reduced-motion transition property all passed. Synthetic captions/state only, no external network. Phone and host screenshots visually inspected; downloaded fonts were blocked, so fallback font rendering was tested. Full screen-reader or browser-zoom audit unverified.
- Real capture regression: `node scripts/headset-setup-browser.mjs <playwright-path> <chromium-path>` passed: keyboard start, three fake-media routes, selected input matches active track, input selection/restart (three capture calls), real AudioWorklet levels, 390/1280 px without overflow, zero page errors. No room/STT calls or physical headset in this check.
- Harness fixes recorded: new UI runner initially used exact Speaking text despite its nested Microphone-on text, then expected literal 0 s despite the existing global reduced-motion override at 0.01 ms, and needed a reload on hash-only phone navigation. Existing capture runner lacked the alias used by current components. Selectors/assertions/navigation/alias corrected; generated `.next`/screenshot files ignored by fixture watchers; final runs passed. These were fixture failures, not observed microphone/provider regressions.
- Reading contract: no delay and no transcript rewriting; display groups only adjacent same known speaker/source within 2 s and 80 words at turn boundaries. Single longer provider turns remain intact; overlapping spans/other speakers remain distinct. Source captions and history remain individually addressable for corrections/removal. Physical sentence-flow comfort and any residual visual jumping are pending human feedback.
- Cleanup: both isolated browser/server runners closed their owned resources. No rooms, tokens, audio or storage-state files created by this pass; ignored screenshots contain synthetic fixtures only. No new live provider/audio-quality, real-device, end-to-end latency or cost evidence. Existing working duplicate-control behavior is retained; latency work not started.
- Publication: `7d4e8b02c3fde98543ebdb285e9cea625972722e` pushed to main; Vercel success observed: [deployment status](https://vercel.com/madziyis-projects/caption-assist/DApfCBtoFZrxyavYjxTZp735nioo). Deployment status only; human confirmation of this presentation change remains pending.

### 2026-10-11 — CAPTION-008.3 duplicate-control Builder verification

- Baseline: clean local `HEAD == origin/main == da7d3802eb928c5be8a9a57bdc3533ce7da59d8c` before implementation; last Builder handoff was an ancestor. No reset or checkpoint restore used.
- Automated: `npm test` **213 tests / 33 files passed**; `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check` passed. Build changed generated next-env imports; only that generated drift was restored. Existing Vite future-config warning and Next.js external parent lockfile warning remain non-fatal.
- Coverage: integer/legacy sensitivity math and allowed clamps (including positive threshold ceiling), validation/coalescing/final commits, tuned/restart/recalibration, noisy/digitally silenced estimator vectors, leading/trailing relay/final/disconnect, queued-send warning without false room disconnect, effective-gate history/windows, signed bounded latency samples, +2 s phone clock, all nine required arbiter scenarios, tie/revision/removal/cache/timer behavior, exact membership/headset-only controller dispatch and rejoin, hidden-final opt-in, export v3 anonymity.
- Environment/audio: local Next.js app on Windows, native Chromium, host 1280×844 and two independent fake-media phones 390×844, actual `getUserMedia` → AudioWorklet → calibrated gated PCM → live AssemblyAI → private live Supabase → host reducer. Synthetic David/Zira speech; 76 s fixture per phone, four target sentences and calibration/check phases, other wearer's speech mixed 5 dB quieter. Sliders manually set to +6 dB to deliberately admit bleed. Room-check separation was 2.0/2.7 dB in the final active run (bleed p90 differs from own speech median); not a physical headset model.

| Final comparison | Target occurrences (four sentences) | Wrong-name target lines | Missed targets | Extra duplicate target lines | Shown finals P2/P3 | Suppressed text P2/P3 | Suppressed level P2/P3 |
|---|---|---|---|---|---|---|---|
| Arbiter | 1 / 1 / 1 / 1 | 0 | 0 | 0 | 2 / 2 | 0 / 2 | 1 / 0 |
| Development-only bypass | 2 / 1 / 2 / 1 | 2 | 0 | 2 | 2 / 4 | 0 / 0 | 0 / 0 |

- Replaced/restored counters were 0 for both phones in both final live runs; their branches are unit-tested, not acoustically exercised here. P1 was the host with no headset: zero captions, zero latency samples, zero microphone/provider sessions. Counts refer to target phrase presence/owner, not a full word-error-rate evaluation.
- Provider lifecycle, arbiter run: P2 Begin 1 / Turn 17 / Termination 1, P3 Begin 1 / Turn 22 / Termination 1. Bypass: P2 1 / 16 / 1, P3 1 / 21 / 1. No provider Error, page errors or observed Presence-quota errors. One capture request per phone, none on host. Arbiter-run outbound PCM: P2 139 non-silent / 437 silent frames; P3 143 / 433. Bypass: P2 139 / 435; P3 139 / 434. Config observed: Universal-3.6 Pro, near-field, balanced, `speaker_labels=false`, `format_turns=true`, 16 kHz. No provider parameter changes.

| Run / anonymous phone | STT interim p50/p90 (ms) | STT final p50/p90 (ms) | STT interim/final samples | Relay extra p50/p90 (ms) | Relay samples |
|---|---|---|---|---|---|
| Arbiter P2 | −144 / 505 | −219 / −180 | 12 / 2 | 8 / 127 | 17 |
| Arbiter P3 | −147 / −92 | −158 / −125 | 10 / 3 | 8 / 27 | 22 |
| Bypass P2 | −23 / 539 | −163 / −163 | 11 / 1 | 6 / 92 | 14 |
| Bypass P3 | −97 / −51 | −66 / −36 | 10 / 3 | 5 / 33 | 21 |

- Latency limits: these are signed `receivedAt − audioEndAt` measurements, not onset-to-readable-caption measurements. Some provider word endpoints led receipt by roughly 100–300 ms; negative values are retained, not dropped/clamped. The specified formula yields 164/161 ms for the final arbiter snapshots, which is **not** evidence that human-perceived ~2 s latency is fixed. Phone snapshots publish at most every 10 s; their sample counts can lag received events. Relay estimates remove minimum observed clock/network offset; conditional final hold/render time are not separately included. Do not choose 008.4 levers from these synthetic numbers alone.
- Variability/failures: first live harness timed out awaiting ready calibration; cause not established. Isolated real capture/worklet then passed (floor −83.5, own −25.5, quiet 25 and voice 61 frames). An earlier full comparison had target occurrences 1/2/1/1 (one escaped duplicate), versus bypass 2/2/1/1 (two duplicates). A diagnostic active run and the final comparison each had zero target misses/duplicates/wrong names. No arbiter constants/provider options were tuned to get the final pass. Provider wording/segmentation and evidence windows are plausible contributors to the earlier escape, not proven causes; retain it for physical acceptance/Planner review.
- Accessibility: no horizontal overflow at 390 or 1280 px; keyboard End/Left/Right adjusted sliders and Space enabled the testing checkbox. Native range labels, value text, threshold/quiet-speech feedback and current tuning are unit-tested. Full screen-reader/text-scaling audit is unverified.
- Infrastructure: read-only Supabase project check ACTIVE_HEALTHY. Exact final-comparison log window 19:27–19:44 UTC contained 15 Realtime rows and 0 `ClientPresenceRateLimitReached`. An initial log query failed; simplified count query succeeded. Supabase guidance kept the existing immediate Broadcast + 12 s Presence snapshot design unchanged; no quota/schema/policy changes.
- Cleanup/privacy: all test rooms ended through the app, browsers closed and owned dev server stopped. Synthetic temporary WAVs deleted; no storage-state files created, identities reused in memory across active/bypass. No secrets, invitations, actual conversation transcripts or audio committed. Repeat runner and synthetic speech generator are committed, not their output.
- Unverified: physical iPhone/Android/Bluetooth/wired behavior, background/lock or headset swaps, real soft/overlapping speech, 20–30 min stability/battery, word accuracy and actual billed cost. Result: source/live pipeline verified, physical duplicate-control acceptance pending; no 008.4/008.5 implementation.
- Publication: source `6695c60e823f655714db9ae09933a11c2b88e811` pushed to `main`, Vercel success observed: [deployment status](https://vercel.com/madziyis-projects/caption-assist/8p9jzqvjnmnT8pqpFFKQBf8dua7P). Deployment status is not deployed-device UAT.

### 2026-10-11 — CAPTION-008.2 Builder handoff

- Realtime pre-coding check after `d839f09`: project `cqnyvevhuxwfzhqpmccn`, `realtime_logs` rows 15 in the exact post-deployment window; `ClientPresenceRateLimitReached` 0; no participant channel/error rows. Two matching rows were normal informational tenant replication shutdown/restart events, not room-client disconnects.
- Automated: 175 tests / 29 files passed; typecheck, lint, production build and `git diff --check` passed.
- Gate evidence: room-check rows are applied only when own level is present, at least calibrated own −12 dB, and above bleed; the supplied wired vector applies at open −31.7 / close −35.7 (less −30.3, more −34.7), while the Bluetooth vector is rejected and leaves −36.1 / −40.1 unchanged. Gate attack is two 100 ms frames. Export is v2 with per-participant `micDrops` and per-row `applied`.
- Source path: each ready headset has a Universal-3.6 Pro stream with `voice_focus=near-field`, fixed balanced/16 kHz/formatted-turn settings, 300 ms gated look-ahead with silence frames, bounded reconnect, and sequence-deduped identity-bound relay. No real browser/provider session, physical phone/headset, or acoustic result was performed in this pass.
- Provider/quota documentation checked 2026-10-11: Supabase documents five Presence calls/client/30 s, Free/Pro message limits 100/500 per second, Presence message limits 20/50 per second, and Broadcast payload limits 256 KB/3,000 KB; the live project's plan was not independently verified. AssemblyAI's current official pricing materials list Universal-3.6 Pro Realtime at $0.45/hour, Voice Focus at +$0.10/hour, and unlimited streaming concurrency; free accounts are limited to five new streaming connections/minute and pay-as-you-go accounts start at 100 sessions/minute. These are documentation facts, not account-specific billing verification.

## Bootstrap evidence — 2026-10-10

The repository contains no application, browser surface, microphone path, speech-provider integration, or deployed environment. No product-quality measurements or UAT evidence were possible during bootstrap; all quality dimensions below remain `unverified`.

## Core quality dimensions

### 1. Caption responsiveness

Track where feasible:
- time from audible speech onset to first useful partial text;
- time from end-of-turn to stable/final text;
- UI render delay after provider event receipt.

Initial engineering goal for CAPTION-001:
- captions should feel conversational under stable broadband;
- establish measured baseline before freezing numeric SLA targets.

Status: **unverified**

### 2. Transcript correctness

Track:
- obvious omissions/substitutions in quiet speech;
- degradation with distance/background noise;
- representative accents/speaking speeds;
- overlapping speech behavior.

Formal WER/CER benchmarking belongs primarily to `CAPTION-007`.

Status: **unverified**

### 3. Speaker attribution

For Table Mode:
- diarization consistency;
- short-utterance behavior;
- overlap behavior;
- renamed-speaker stability.

For Connected Mode (CAPTION-003.4 room microphone):
- voice identification success rate and time per person;
- wrong-name events, including similar voices and short replies;
- names following speaker revisions;
- re-identification after provider reconnect or host refresh.

Status: **unverified**

### 4. Reliability

Track:
- permission-denied recovery;
- provider disconnect/reconnect;
- Wi-Fi interruption/recovery;
- browser tab visibility/suspension behavior;
- stop/restart behavior;
- duplicate/interim caption artifacts;
- sustained-session stability.

CAPTION-001 target test: one uninterrupted **30-minute** host-microphone caption session with no manual recovery under stable conditions, plus an intentional network interruption/reconnect test.

Status: **unverified**

### 5. Accessibility/readability

Track:
- readable current caption at normal table viewing distance;
- large text behavior;
- contrast;
- current-speaker prominence;
- keyboard operation;
- status/error visibility;
- whether the user can follow the conversation without continuously interacting with controls.

Status: **unverified**

### 6. Device/browser matrix

Record only what was actually tested.

| Device / OS | Browser | Host mic | Guest mic | Bluetooth mic | 30-min session | Notes |
|---|---|---:|---:|---:|---:|---|
| unverified | unverified | — | — | — | — | — |

### 7. Cost

Record measured provider billing/configuration or carefully calculated cost from the exact live model/rate. Include date because provider pricing can change.

| Date | Provider/model | Mode | Concurrent streams | Cost basis | Estimated/measured session cost |
|---|---|---|---:|---|---|
| — | unverified | — | — | — | — |

### 8. Headset Mode separation and gating (CAPTION-008)

Track per person, recorded from the anonymized results export plus observation:
- headset type and sanitized mic label; input class; the processing (auto gain, noise suppression, echo cancellation) the browser actually applied;
- quiet floor, own-voice level and room-check separation in dB, by seating distance (about 1 m and 50 cm), with the band (clear ≥ 15, usable ≥ 8, weak < 8; provisional);
- gate preview during natural talk: speaking lights for the wrong person, missed lights for the talker, co-onsets and overlap per pair;
- comparison runs: a phone's built-in mic and, if available, a boom-mic headset.

From 008.2 onward also: missed speech, duplicate captions, wrong attribution, latency, and cost per person-hour (one Universal-3.6 Pro stream per speaking person).

Status: **unverified**

## Per-task evidence

### 2026-10-11 — CAPTION-008.2 human physical trial (Planner record)
- **Setup (human-supplied export version 2):** two participant phones, one with a wired headset and one with a Bluetooth headset. Processing reported off on both; host headset not set up. Both caption streams were `on`, and captions appeared named by phone.
- **Wired headset:**
  - floor −41.4, calibrated own −20.0;
  - room check: own −25.6, bleed −30.0, separation **4.4 dB (weak)**;
  - sensitivity Less, `openDb −26`. That is the pre-room-check threshold +4, so room-check tuning was not in effect at export time (probably recalibrated or reloaded after the check).
- **Bluetooth headset:**
  - floor −81.5 (silenced on-device), calibrated own **−41.6**;
  - room check: own −26.7, bleed −33.6, separation **6.9 dB (weak)**; `openDb −30.1` (room check applied);
  - the 15 dB gap between calibration and room check points to an estimator weakness (see 008.3).
- **Preview over 160.4 s:** the wired phone opened 21 times for 40.8 s, the Bluetooth phone 16 times for 37.0 s; **7 co-onsets and 16.1 s of overlap**, about 40% of each phone's open time.
- **Human-observed:**
  - Bleed from the other speaker triggers captions, worse as people sit closer.
  - The three-step control was not enough; the human wants a continuous slider.
  - Latency feels about 2 s.
  - "I'm actually happy, it's kind of working."
- **Planner reading:** single-phone separation is weak at close seating. Relative to each wearer's own level, though, the talker leads the other phone by 4.4–6.9 dB, which is enough for cross-phone arbitration (008.3). Latency is unmeasured by stage; 008.3 adds the measurements.
- **Result:** partial pass. Captions and attribution work, but duplicates under close seating and the ~2 s delay remain open.

### 2026-10-11 — CAPTION-008.2 joining-phone setup entry regression
- User evidence: after `aac146a`, joining phones no longer show microphone options and remain at Using: no microphone selected. Exact device/browser not supplied.
- Reproduced: controller now publishes `currentView` immediately on join (`not_started`, `off`, null input, no inputs), while HeadsetSetup only offered Start headset check for a null view. Three new pre-fix component tests failed for idle start, stopped restart and starting feedback. This blocks the permission tap before enumeration; it is not evidence of missing physical hardware.
- Fix: explicit idle/start, starting/permission and stopped/restart UI; ready text only while mic is on. No capture constraints, enumeration, provider, transport, privacy or acoustic threshold changes.
- Automated: 179 tests / 29 files passed; typecheck, lint, production build and diff check passed. Participant-page regression uses the actual participant initial state with a mocked controller to verify join makes no permission request and the start tap reaches the setup action; existing input-ID picker tests remain green.
- Native browser: isolated actual HeadsetSetup + HeadsetParticipant + MicrophoneCapture/worklet in headless Chromium 1208, fake media. No microphone calls before the tap; keyboard Tab/Enter starts capture; frames arrive; three routes exposed; picker matches active track ID; selecting it restarts capture; stopped state offers restart and capture resumes (three total getUserMedia calls). No page errors; no horizontal overflow at 390×844 and 1280×844. All non-localhost network requests blocked. No live room, Supabase, STT or physical microphone session in this test.
- Harness limitation: first run failed because the isolated Vite page omitted the React preamble; transformIndexHtml corrected the test server, and the rerun passed. Browser/server closed afterward; no audio or storage-state files created.
- Known limits/next action: reload/rejoin physical phones and confirm setup/input selection, then continue the 008.2 physical script. No Bluetooth routing, real acoustics or live AssemblyAI browser-path acceptance inferred.
- Publication: `df89148` pushed to main; GitHub Vercel status success: [deployment status](https://vercel.com/madziyis-projects/caption-assist/HB68pZaVw5LLj1toww39zMweRqEA). No live configuration changed; deployment status does not establish physical capture or captions.

### 2026-10-11 — CAPTION-008.1 human physical trial (Planner record)
- **Human-observed, on real phones with headsets after the Presence fix deployed:** "I am satisfied with the results, might need to calibrate for less sensitivity, but this could actually work."
- **Not supplied:** device, browser and headset models; results exports; separation numbers; seating distances; counts of wrong or missed lights. Acoustic separation therefore remains unquantified.
- **Planner review:** a defect in the as-built source means room-check bleed never updates any phone's gate thresholds (they stay at the provisional `ownDb − 10`). This plausibly contributes to the over-sensitivity. It will be fixed in 008.2 Part A.
- **Result:** qualitative pass; GO for 008.2. Exports are required from the 008.2 physical run.
- **First results export** (human-supplied, version 1, host not set up):
  - **P2, wired headset** (processing off as applied): floor −41.0, calibrated own −22.6. Room check: own −27.3, bleed −36.1, separation **8.8 dB (usable)**.
  - **P3, Bluetooth headset** (processing off): floor −85.3, which suggests the headset gates noise on-device; calibrated own −26.1. Room check: own **−66.2** (40 dB below calibration), "bleed" −36.1, separation −30.1 (weak). **Invalid row:** the human reports "I kept connecting and disconnecting" during the test, and the own reading is implausible.
  - **Preview over 23.1 s:** P2 opened 5 times for 10.4 s; P3 opened 2 times for 1.9 s; 0 co-onsets; 1.3 s overlap.
  - **Planner reading:** the wired headset is usable but its margin is thin (it hears neighbour bleed only about 5 dB above its own noise floor). The Bluetooth separation cannot be judged from this run.
  - **Spec change:** 008.2 Part A now applies room-check rows only when plausible, ignores unrelated device changes, and counts headset drops. Both rows are fixed test vectors.

### 2026-10-11 — CAPTION-008.1 participant Presence quota disconnection
- User evidence: host completes input selection/calibration; joining phones display levels briefly then report room-connection interruption. Calibration tuning is deferred. Exact physical phone/browser not supplied.
- Diagnosis: confirmed project ref `cqnyvevhuxwfzhqpmccn`; read-only unified Realtime log aggregation at 17:12 UTC found 14 ClientPresenceRateLimitReached errors over the default prior-24-hour window. Current Supabase documentation specifies five track/untrack updates per connection per 30 s and channel closure when exceeded. Source sent two initial Presence tracks, initial headset visibility, starting, input/quiet, duplicate quiet and subsequent calibration transitions.
- Fix: immediate private-channel headset-presence Broadcast, deduplicated/coalesced Presence snapshots spaced 12 s apart, preserved identify metadata, session/sequence guards against stale snapshots and old sessions, cancellation on transport shutdown. Delivery rejections have visible retry feedback rather than unhandled promises. Quotas/RLS/provider configuration unchanged.
- Live local verification: headless Chromium 1208, host 1280×800 + two phone-width 390×844 contexts, live Supabase from localhost, synthetic quiet/tone WAV through actual getUserMedia/worklet. Both phones reached ready, host produced a room-check matrix, first phone refreshed/rejoined/recalibrated; zero observed Presence-limit system errors, disconnection screens or page errors. Observed Presence track totals were 2 host, 5 first phone across original/rejoin sessions, 3 second phone; these totals are not rates. No /api/transcription/session request, AssemblyAI socket or host microphone call occurred.
- Test-runner issue: early attempts filled the phone's name before its asynchronous invitation check/React hydration completed, leaving Join disabled. Waiting for confirmed headset invitation before typing fixed the harness. Those attempts did not reproduce an audio failure; their temporary rooms were ended.
- Automated: 168 tests / 27 files passed; typecheck, lint, production build and diff check passed. Added connection-quota simulation, state burst coalescing/deduplication, identify preservation, stale/new/retired-session filtering, late-subscriber recovery, queued-write cancellation and rejection handling tests.
- Cleanup/limits: all temporary test rooms ended; synthesized WAVs removed by the runner. No physical phone/Bluetooth capture, real acoustic separation, measured overflow or keyboard traversal claimed. Re-test deployed joining phones before acoustic go/no-go.
- Publication: source commit `d839f09` pushed to main; GitHub combined status reported Vercel success: [deployment status](https://vercel.com/madziyis-projects/caption-assist/FHhwJXAXyz9DUgNtT4Z1TRqLzB1H). Deployment status is not physical-device acceptance.

### 2026-10-11 — CAPTION-008.1 source, live SQL and browser smoke
- Environment/device: Windows Builder tooling; local Next.js app with configured environment; Codex in-app browser. One temporary Headset Mode host room was created and ended. No physical phone, headset or fake-media Chromium run was available.
- Automated: 152 tests across 24 files passed; typecheck, lint and production build passed; `git diff --check` passed. Coverage includes headset levels/calibration/gate/room-check/input labels/messages/preview/export plus existing Table/Connected behavior.
- Live SQL: Target ref `cqnyvevhuxwfzhqpmccn` confirmed; migration `20261011140359_headset_mode` applied; rollback-only `connected_rooms.sql` passed with mode persistence assertions.
- Browser/accessibility: Headset Mode selector, mode-specific invite copy, no room-microphone control, speaking board with text `Not set up`, disabled room-check hint, optional host setup and end lifecycle were observed. No three-browser fake-media protocol run, 390px/1280px measured viewport check, keyboard traversal, network instrumentation, or Copy-results validation was completed in this environment.
- Audio/provider: Headset Mode source path does not construct a transcription session or provider socket; no microphone was opened in the smoke room because optional host setup was not used. Synthetic protocol/acoustic numbers and physical separation are unverified.
- Deployment: Commit `48c500e` reached Vercel `success`; [deployment status](https://vercel.com/madziyis-projects/caption-assist/HB2d5DWWUejGoiP34iW1naeiiKTy). This is deployment evidence only, not physical audio/UAT evidence.
- Result: Source and live migration gates pass. Human must run the physical test script before any 008.2 decision.

### 2026-10-11 — CAPTION-008.1 mobile invocation and user-activation hardening
- Trigger: User reported `Illegal invocation` on mobile phones while using the deployed Headset Mode slice; exact phone, browser and action were not supplied.
- Changed: Wake Lock request/release and sentinel listeners, `mediaDevices` enumeration/getUserMedia/device-change listeners, and clipboard export preserve Web API receivers. The headset capture path no longer awaits prior asynchronous cleanup before `getUserMedia`, preserving the tap's mobile user-activation window. Clipboard failures now remain in the UI with a retry/manual-copy message.
- Verification: typecheck, lint, 153 tests / 25 files, production build and diff check passed. A focused regression test covers starting a new headset capture before prior cleanup resolves. No physical phone or mobile browser reproduction was available in the Builder environment.
- Result: Targeted mobile compatibility patch ready for deployment; if the error persists, collect exact phone model, browser/version, action and visible stack/message before further scope changes.

### 2026-10-11 — CAPTION-008.1 mobile fix publication
- Source commit `a1611bf` pushed to `main`; GitHub combined status reported Vercel `success`: [deployment status](https://vercel.com/madziyis-projects/caption-assist/Boy7cRU2xgifEySh1N8sqFEscWRa).
- Deployment evidence only; physical phone/headset behavior remains unverified.

### 2026-10-11 — CAPTION-008.1 reproduced calibration timer failure and input selection
- User evidence: Default, generic Headset microphone and a newly connected Bluetooth headset still reported `Illegal invocation`; Speakerphone did not initially. A generic headset route was listed even without connected hardware. Exact phone/browser not supplied.
- Reproduction: actual `HeadsetParticipant` source in installed headless Chromium 1208, with native browser timers and injected microphone metadata. Default/Headset/Bluetooth failed on entering calibration. Speakerphone paused at the built-in-input warning, then threw the same error on Use this microphone anyway. The receiver of the stored native `setTimeout` was the participant object. This reproduces the pattern without microphone hardware or provider access.
- Fix: bind stored `setTimeout`/`clearTimeout` to the global; all four routes now start/stop calibration without errors. Track device IDs, not sanitized labels, determine the picker selection; missing ID shows an explicit browser-selected placeholder. IDs remain local, absent from presence/export. Generic Headset microphone labels are unknown and route-list limitations are explained.
- Audio verification: actual capture/PCM AudioWorklet with Chromium's fake microphone on a temporary loopback server delivered level frames; calibration advanced quiet → voice, chosen-ID capture restarted and stop kept its timer cancelled. This proves browser execution/lifecycle only; no physical Bluetooth/acoustic result or live multi-room protocol is claimed.
- Automated: 161 tests / 27 files passed; typecheck, lint and production build passed. Added receiver-enforcing timer, device-ID selection, duplicate-label, missing-ID and generic-route tests. Diff check passed.
- Correction: earlier claims that an awaited cleanup caused a confirmed mobile permission-window failure were unsupported and did not resolve the user's report. The native timer reproduction supersedes that diagnosis. Phone confirmation remains pending.
- Publication: source commit `77efcef` pushed to `main`; Vercel reported `success`: [deployment status](https://vercel.com/madziyis-projects/caption-assist/7ke58AMsU8NYNd51be4wpTuaExhu). Physical mobile confirmation remains pending.

### 2026-10-10 — CAPTION-001 source and browser verification
- Environment/device: Codex in-app browser on the local Next.js development server; desktop viewport. Node.js `v22.15.0` for source gates.
- Audio path: Builder-observed real microphone/provider path was not completed during that verification session; the browser remained at the microphone-permission state without a usable local provider credential. A later user-observed real UAT report is recorded below; no raw audio was stored.
- Session length: UI smoke session only; started from idle, observed the permission-needed state, then ended the conversation.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: Speaker attribution intentionally out of scope; `speakerId` remains `null`.
- Failure/recovery tests: Missing server configuration returned controlled HTTP 503 JSON without exposing a secret. Reconnect and cleanup logic are covered at source level but need real provider verification.
- Accessibility observations: Idle/start/end states rendered; keyboard focus reached the primary action with a visible focus ring. Computed browser styles reported Atkinson Hyperlegible for body text and Inter for headings. Narrow/mobile viewport and text-scaling UAT remain pending.
- Cost evidence: Not measured.
- Result: Automated source gates passed; Builder-observed real microphone/provider acceptance was unavailable in that environment. Later user-observed functional validation is recorded below, with deeper quality checks still pending.

### 2026-10-10 — CAPTION-001 user-observed real UAT
- Environment/device: Not reported by the user.
- Audio path: The user reports using the real application and reports that captioning is functioning very well. This is user-observed evidence for the actual microphone → AssemblyAI → caption UI path, not Builder-observed UAT.
- Session length: Not reported.
- Latency observations/measurements: No exact latency measurement reported.
- Accuracy observations/measurements: Qualitative report only; no WER, accuracy percentage, or representative test set reported.
- Speaker observations: Speaker attribution remains out of scope for CAPTION-001.
- Failure/recovery tests: Not reported; intentional network interruption/reconnect remains pending.
- Accessibility observations: Newest-first finalized-caption ordering is implemented. No additional device, browser, or text-scaling details were reported.
- Cost evidence: Not measured.
- Result: User-observed functional validation supports progression to CAPTION-002. Sustained 30-minute stability, reconnect behavior, formal latency/accuracy measurements, and broader browser/device coverage remain pending.

### 2026-10-10 — CAPTION-002 source and browser verification
- Environment/device: Codex in-app browser on the local Next.js development server; browser viewport shown in the captured desktop/narrow layout. Node.js `v22.15.0` for source gates.
- Audio path: Builder did not complete a real multi-speaker microphone → AssemblyAI diarization session. The browser reached the microphone-permission state and the conversation-ended state; no raw audio was stored.
- Session length: Browser smoke interaction only; no sustained provider session.
- Latency observations/measurements: No real diarization latency measurement. Source behavior renders interim text immediately and processes speaker metadata in the provider event path without an added request or intentional debounce.
- Accuracy observations/measurements: No physical-speaker or formal accuracy measurement.
- Speaker observations: Automated provider tests covered stable opaque connection-scoped IDs, unresolved `UNKNOWN`/`PENDING`/missing labels, mixed word-level segmentation, and speaker revisions. No stable physical speaker count was observed.
- Failure/recovery tests: Source tests covered revision replacement and connection namespace isolation. Real reconnect identity behavior was not observed.
- Accessibility observations: Source implements interactive stable speaker labels, neutral non-interactive `Someone`, visible focus styles, keyboard Escape handling, responsive speaker management, and left/right plus name/accent cues. Browser UAT observed the caption-first layout, permission-needed status, and end state; the provider-backed panel was not reachable without a stable speaker event.
- Cost evidence: Not measured.
- Result: CAPTION-002 source implementation and browser/source verification are complete. Real multi-speaker diarization, naming during speech, revision, reconnect, and responsive provider-backed UAT remain pending and are not being represented as Builder-observed results.

### 2026-10-10 — CAPTION-002 — caption transition readability adjustment
- Environment/device: Codex in-app browser on the local Next.js development server; no new audio measurement performed.
- Accessibility observations: Replaced the duplicate large `Conversation` heading with `Captions`. Browser smoke verification showed the updated heading and enlarged caption stage. The latest finalized caption now remains visible in the large caption stage for a 2-second visual dwell while the history state updates immediately, so live caption latency and history ordering are not intentionally delayed.
- Result: User-requested readability adjustment implemented; the dwell duration is a product-tuning value and has not been measured against field preference.

### 2026-10-10 — CAPTION-002 — compact header refinement
- Environment/device: Local Next.js development server; no new audio measurement performed.
- Accessibility observations: Reduced the header to a compact menu-like brand/status row while retaining the visible status notification and its live-region behavior. The status remains available for connection and error feedback.
- Result: User-requested header density adjustment implemented; no provider, audio, or live-system behavior changed.

### 2026-10-10 — CAPTION-002 — caption stage space refinement
- Environment/device: Codex in-app browser on the local Next.js development server; desktop viewport.
- Accessibility observations: Reduced the shell's top padding by approximately 90%, moved the live speaker label to the top of the caption stage, and allowed the live caption region to use the remaining stage height instead of limiting it to 22vh.
- Result: User-requested layout refinement implemented; no provider, audio, or caption timing behavior changed.

### 2026-10-10 — CAPTION-002 — user-observed product/UAT acceptance
- Environment/device: Not reported by the user.
- Audio path: The user personally reviewed and tested the current speaker-aware interface and reports that it is working well and that they are happy with what they tested and saw. This is user-observed product/UAT acceptance, not Builder-observed provider benchmarking.
- Session length: Not reported.
- Latency observations/measurements: No exact latency measurement reported.
- Accuracy observations/measurements: No formal diarization accuracy, WER, or DER measurement reported.
- Speaker observations: No physical speaker count or quantitative attribution result reported.
- Failure/recovery tests: Sustained-session and intentional reconnect results were not reported.
- Accessibility observations: User acceptance supports progression of the reviewed speaker-aware interface. Narrow/mobile speaker-placement verification was not reported.
- Cost evidence: Not measured.
- Result: CAPTION-002 is accepted for progression based on user-observed product/UAT feedback. Formal diarization accuracy, exact latency, sustained-session stability, reconnect behavior, broader device/browser coverage, and narrow/mobile speaker-placement verification remain pending.

### 2026-10-10 — CAPTION-002 — continuous transcript presentation refinement
- Environment/device: Codex in-app browser on the local Next.js development server; desktop idle-state smoke verification.
- Accessibility observations: Expanded the main caption stage to 70vh, kept finalized turns visible in chronological order, appended the current interim turn at the bottom, auto-scrolled within the stage, reduced live caption text by 15%, reduced history text by 30%, and placed history speaker labels beside their left/right bubbles.
- Result: User-requested presentation refinement implemented. Provider behavior, caption event normalization, speaker identity, privacy, and separate newest-first history behavior remain unchanged. Live multi-turn scrolling and narrow/mobile side-label layout still require user/provider-backed verification.

### 2026-10-10 — CAPTION-002 — continuous transcript layout tuning
- Environment/device: Source-level verification; no new provider session performed.
- Accessibility observations: Set the live caption box to a fixed 65vh height with no minimum height, kept its internal scroll behavior, and centered the live speaker indicator above each live caption line. Older lines scroll out of the live box as it fills while remaining available in caption history.
- Result: User-requested layout tuning implemented; no caption event, speaker identity, history retention, or provider behavior changed.

### 2026-10-10 — CAPTION-002 — live caption text scale tuning
- Environment/device: Source-level verification; no new provider session performed.
- Accessibility observations: Reduced the live caption text scale by 25% from the prior tuned size to fit more transcript lines in the fixed 65vh live box. History text size and live scrolling behavior are unchanged.
- Result: User-requested readability adjustment implemented; no caption event, speaker identity, history retention, or provider behavior changed.

### 2026-10-10 — CAPTION-002 — caption history panel refinement
- Environment/device: Codex in-app browser on the local Next.js development server; desktop idle-state UI smoke verification, no new provider session performed.
- Audio path: No new microphone or AssemblyAI verification performed.
- Session length: Not measured.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: History continues to use the existing newest-first grouped speaker records; no physical speaker result was inferred.
- Failure/recovery tests: Not performed.
- Accessibility observations: Removed the bottom history region from normal page flow; added a visible header Caption history control and keyboard-closeable left-side pane sharing the screen with the live caption area at up to half the workspace width. Each history group presents its speaker name above the caption text, regardless of the prior left/right chat alignment.
- Cost evidence: Not measured.
- Result: User-requested navigation/layout refinement implemented. Browser smoke verification showed the header control, side-by-side left history pane, live caption area shifted right to accommodate it, and Escape dismissal; provider-backed history and narrow/mobile review remain pending. Provider, audio, caption event, retention, and speaker identity behavior are unchanged.

### 2026-10-10 — CAPTION-002 — header controls and caption stage refinement
- Environment/device: Codex in-app browser on the local Next.js development server; source-level UI refinement, no new provider session performed.
- Audio path: No new microphone or AssemblyAI verification performed.
- Session length: Not measured.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: No physical speaker result was inferred.
- Failure/recovery tests: No provider/reconnect test performed; the browser full-screen toggle was exercised and exited successfully.
- Accessibility observations: Moved the start action into the header, added a labeled full-screen toggle with pressed state, kept the end action available while active, and expanded the live caption stage to a fixed 85vh with no minimum height.
- Cost evidence: Not measured.
- Result: User-requested presentation refinement implemented. Browser smoke verification showed Start Conversation and Full Screen in the header, the 85vh caption stage, successful full-screen entry/exit, and the side-by-side history pane. Audio, provider, caption event, history retention, and speaker identity behavior are unchanged; narrow/mobile review remains pending.

### 2026-10-10 — CAPTION-002 — header conversation action refinement
- Environment/device: Codex in-app browser on the local Next.js development server; source-level UI refinement, no new provider session performed.
- Audio path: No new microphone or AssemblyAI verification performed.
- Session length: Not measured.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: No physical speaker result was inferred.
- Failure/recovery tests: Not performed.
- Accessibility observations: Removed the footer control bar and made the header conversation action swap between Start Conversation and End Conversation in the same position according to session state.
- Cost evidence: Not measured.
- Result: User-requested control-placement refinement implemented. Idle browser smoke verification showed the header Start Conversation action and no footer; the active End Conversation swap is source-verified but was not exercised without starting a microphone session. Provider, audio, caption event, history retention, full-screen, and speaker identity behavior are unchanged.

### 2026-10-10 — CAPTION-002 — live speaker label color refinement
- Environment/device: Codex in-app browser on the local Next.js development server; source-level visual refinement, no new provider session performed.
- Audio path: No new microphone or AssemblyAI verification performed.
- Session length: Not measured.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: No physical speaker result was inferred.
- Failure/recovery tests: Not performed.
- Accessibility observations: Set live caption-area speaker label text to a lighter neutral gray while retaining colored speaker dots as visual indicators. Caption-history speaker colors remain unchanged.
- Cost evidence: Not measured.
- Result: User-requested live label readability refinement implemented; provider, audio, caption event, history retention, and speaker identity behavior are unchanged. Browser/provider-backed live speaker review remains pending.

### 2026-10-10 — CAPTION-002 — user-observed live speaker label confirmation
- Environment/device: Not reported by the user.
- Audio path: The user confirmed that the live speaker label color change worked well; no new provider or microphone details were reported.
- Session length: Not reported.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: No physical speaker count or attribution result was reported.
- Failure/recovery tests: Not reported.
- Accessibility observations: User confirmed the lighter gray live speaker label change.
- Cost evidence: Not measured.
- Result: User-observed visual/product confirmation recorded. No broader provider, audio, latency, accuracy, or device/browser claims are inferred.

Append concise entries:

```text
### YYYY-MM-DD — <task>
- Environment/device:
- Audio path:
- Session length:
- Latency observations/measurements:
- Accuracy observations/measurements:
- Speaker observations:
- Failure/recovery tests:
- Accessibility observations:
- Cost evidence:
- Result:
```

### 2026-10-11 — CAPTION-003 Connected source / live infrastructure verification
- Environment/device: Windows Builder tooling; local Codex in-app browser, default host viewport and 390×844 phone-width participant route. No physical phone was tested.
- Audio path: No real microphone → AssemblyAI → Supabase → host session completed. The user supplied local environment values; all required names are nonempty and configured host creation/end passed. The AssemblyAI key was not printed or validated by real speech.
- Automated: typecheck/lint passed; 51 tests across 12 files passed; production build and diff check passed. Coverage includes separate diarization modes, exact membership identity, independent interims, muted joins/rejoins, capture cleanup, permission/meter setup, no visibility/blur mute, stale removal/end filtering, rename resolution and local QR host controls.
- Live SQL: Both metadata/RLS migrations applied to the existing caption-assist project. Rollback-only tests passed for identity reuse, duplicate names, rename, end/expiry, removal, application-table RLS, service-only RPC and private-topic authorization, including Broadcast denial on the advisory Presence topic.
- Live transport: Anonymous sign-in worked. Direct private Realtime guest→host synthetic broadcast succeeded; unrelated user/other-participant subscriptions and guest control publication denied. First authorized subscription failed without useful detail; focused second attempt passed. Root cause remains unconfirmed.
- Latency: One small synthetic same-process send→host-receive observation 169.8906 ms. Not STT latency, phone latency, mean/percentile or production guarantee. Application round-trip acknowledgements are separately available in memory; cross-device clocks are not assumed synchronized.
- Accessibility: Browser showed mode selector, controlled unavailable-setup feedback, preserved history side pane/Escape dismissal, Full Screen entry, and phone-width name form. Mocked UI tests verified local QR dialog, locked active mode, You muted/count, permission explanation before mic check, and release-before-muted-join. Full configured Connected app/device UAT remains unverified.
- Background/Wake Lock: Source continues healthy capture across visibility/blur changes and detects actual track/AudioContext interruption. No desktop audio tab-switch, Android/iPhone app-switch, PWA or Wake Lock test performed; browser/OS limitations remain unmeasured.
- Quality not yet measured: Physical QR scan/join latency, selected real mic, real mute/unmute, speech identity/accuracy, overlapping speakers, end-to-end reconnect/removal/end, sustained session and cost.
- Cleanup: Disposable test rooms ended and six synthetic Auth users deleted with cascading room/membership cleanup; query confirmed zero test rooms remain. SQL fixtures rolled back.
- Result: Source and infrastructure security verified; CAPTION-003 remains active/partial pending host + phone audio UAT. See CAPTION-003-HANDOFF.md.

- Configured browser follow-up: live room creation opened QR with muted You/count one, locked mode and personal Unmute. Mic activation remained pending in IAB; End succeeded and returned ended state, then the old invitation showed conversation-ended feedback. No completed capture or speech session inferred. Only IAB was available, so no independent guest browser or physical-device UAT. Production rebuild passed with the user-supplied environment.

### 2026-10-11 - CAPTION-003 one-row desktop header
- User-requested CSS refinement expands the shell to available width, keeps desktop title/controls/status on one row, and uses compact readable control spacing/type. Narrow screens retain wrapping.
- Local IAB: Table idle and Connected active/ended checked at measured 1280 CSS pixels; active buttons shared the same top coordinate, status centered, document width did not exceed viewport. Ended Start New Conversation fit on the same row. Measured 391 CSS pixel view wrapped without horizontal overflow. Created verification room ended; no microphone/audio session started.
- Typecheck, lint and production build passed. No new provider, speech, latency, background or physical-device evidence.

### 2026-10-11 — CAPTION-003 user acceptance
- Environment/device: Published application; exact device/browser matrix not reported.
- Audio path: User reports deployed Connected Mode working perfectly.
- Accessibility/UI: User made/accepted additional UI refinements.
- Result: User-observed product acceptance recorded. CAPTION-003 accepted for progression.

### 2026-10-11 - CAPTION-003.1 cross-microphone correction
- User evidence: Deployed Connected Mode testing revealed duplicate physical speech when nearby personal microphones heard the same person. This supersedes earlier general product acceptance. Device/browser matrix, mic count and quantitative duplicate counts were not reported.
- Source: Synchronous host-memory reconciliation only; 4+ tokens >=0.85 ordered Dice within 1800 ms; 3-token exact within 600 ms; 1-2 tokens preserved. No deliberate buffering or comparison network call. Word recognition confidence preserved separately; >=0.15 interim leader margin, stable final label.
- Verification: 93 tests / 13 files passed; typecheck/lint and production build passed. Synthetic tests cover matching/divergent/short/repeated/simultaneous speech, three-source clusters, confidence, interim cleanup, removal, expiry and Connected re-entry. Existing UI/Table tests passed; current header/layout source untouched.
- Real-device UAT: Not performed by Builder. Before/after duplicate count, false/missed suppression, interim label switching, perceived caption latency, physical devices and number of open mics remain unmeasured for the fix. Text matching does not prove the human speaker. No accuracy percentages inferred.
- Next measurement: Deployed two/three phones naturally placed, each owner's speech, unrelated simultaneous sentences and simultaneous Yes. Record the above observations before accepting CAPTION-003; CAPTION-004 deferred.

### 2026-10-11 - CAPTION-003.1 failed acceptance / diagnostic observation
- User evidence: Duplicate captions persisted during deployed co-located Connected microphone testing. This is failed suppression acceptance; exact devices, browsers, mic counts, transcript differences and receive timing were not supplied. No root cause or threshold change inferred.
- Source: Opt-in ?captionDebug=1 host-local metrics ledger, latest 30 decisions; opaque IDs copied, display names resolved in panel. Comparison gates, timing anchor, exact-three-word result, short policy, conflict/oversize reasons, skipped merges and metadata-only expired-final hints exposed. No text/tokens/credentials/URLs in records or copies; no storage/diagnostic traffic. Constants unchanged. Optional similarity completes after caption dispatch.
- Automated: 109 tests / 15 files passed; typecheck, lint and production build passed. Tests cover matched suppression/clustered partials, timing/similarity/length failures, short/exact speech, conflict guards, oversized/expired hints, committed-final skips, bounded private records, disabled default, clear/copy controls, Table-only hiding and enabled/disabled action/clock equivalence.
- Browser: Local IAB opt-in Connected panel with constants and controls observed; hidden in Table and ordinary Connected URL. Measured 1280 and 391 CSS pixel layouts had no horizontal overflow. Empty-state panel only; no physical microphone/provider session performed.
- Measurements still pending: Real missed/false suppression, duplicate counts, label switching, perceived latency, number of open mics and devices/browsers. No accuracy percentages inferred.
- Next test: Open deployed host with ?captionDebug=1 before creating/restoring room. Clear before each two/three-device scenario, copy promptly after escaped duplicate (last 30 comparisons only), record scenario/device/browser/mic count and observed duplicate/switching/latency separately without retaining private transcripts. Repeat owner speech, different simultaneous speech and simultaneous Yes. CAPTION-003 open; CAPTION-004 not started.

### 2026-10-11 - CAPTION-003.2 episode correction
- Observed root causes: diagnostic evidence showed a 53/55-word, ~13 ms, ~0.889-similarity, ~0.991-containment duplicate rejected only by `negation_conflict`; later streams also diverged into 53/14-word provider finals. These are the supplied real-device metrics, not synthetic estimates.
- Changed: Strict strong-episode admission (8+ words, <=300 ms, similarity >=0.85, short-side coverage >=0.90) can tolerate isolated negation disagreement; numeral conflicts remain protected. Episode members retain bounded rolling source context (100 tokens) and may continue/rejoin across provider turn IDs within <=3000 ms using >=5-word partial evidence (coverage >=0.70 or similarity >=0.25). Ordinary matching and 1-2-word preservation remain unchanged.
- Diagnostics: Existing `?captionDebug=1` panel now reports episode creation, source join/continuation, expiry, strong/partial evidence, negation override, similarity, directional coverage and episode age. No transcript text/tokens/persistence/network traffic.
- Automated coverage added for the supplied 53/55 negation case, segmentation revisions, multiple short provider turns, episode expiry, directional coverage and diagnostic episode events. Physical-device re-test remains pending; no accuracy percentage inferred.

### 2026-10-11 - CAPTION-003.3 Voice Focus A/B preparation
- Decision: Transcript-side reconciliation and episode continuity both failed real co-located microphone acceptance. Test the acoustic/STT layer independently; do not lower text thresholds or start CAPTION-004.
- Configuration: Table remains `universal-streaming-english` with diarization. Connected personal streams use `universal-3-6-pro`, `speaker_labels=false`, `voice_focus=far-field` by default, `mode=balanced`, 16 kHz PCM16 and formatted turns. Public `NEXT_PUBLIC_CONNECTED_VOICE_FOCUS_PROFILE` accepts only `near-field` or `far-field`; invalid/missing defaults safely to far-field.
- A/B isolation: Connected host events bypass CrossMicReconciler; the reconciler remains available but no text suppression or old reconciliation diagnostics run in the caption path. Temporary debug UI shows model/profile/mode and `Text reconciliation: OFF` only with `?captionDebug=1`.
- UAT pending: No real Universal-3.6 Pro Voice Focus Connected session has been completed in this pass. Record neighboring meaningful transcripts, owner accuracy, interim leakage and latency for far-field, then near-field if warranted.
- Superseded: the user reported that none of the personal-microphone approaches worked in real use; CAPTION-003.4 replaced them before a Voice Focus result was recorded.

### 2026-10-11 - CAPTION-003.4 room-microphone diarization pivot
- Automated: 140 tests / 16 files, typecheck, lint and production build passed. New coverage: provider revision-array parsing and room options, voice-identity registry (binding, pre-request/interim/PENDING exclusion, formatted-duplicate idempotence, no stealing, revisions moving names, contested speakers, queue/cancel, re-identify, reconnect), presence-request transport validation, host request dedupe/withdrawal, phone acknowledgement including a reordered stale phase, unanswered-request notice, room-mic lifecycle through network loss and end.
- Live provider check (Builder, Node, real `AssemblyAIStreamingProvider` + `VoiceIdentityRegistry`, synthetic Windows text-to-speech voices David/Zira/Hazel streamed in real time as 16 kHz PCM16; same audio three times): AssemblyAI accepted the Connected room parameters (Begin, Turn, SpeakerRevision, Termination; no Error). The end-of-session `SpeakerRevision` arrived in the documented `revisions` array form, which the previous parser dropped. David and Zira were identified. David 5/5 turns named correctly; Zira 4/7 live (two short replies shown as David, one unlabeled) and 7/7 after the revision. Hazel was merged with Zira by diarization (0/5 correct); her identification ended "not identified" without taking Zira's speaker.
- Local live end-to-end (Builder, headless Chromium 1208 via Playwright with a WAV file as the host microphone; localhost dev server with live Supabase Realtime and live AssemblyAI; host 1280×800, phones 391×844): host made exactly one `getUserMedia` call and both phones made none. With two phones, David and Zira tapped Identify on their phones; phones and host Participants showed "✓ Voice identified"; every long sentence was named correctly; no duplicate captions. Short replies "That works for me." and "Perfect." showed as David live, and the end-of-session revision moved "Perfect." to Zira on screen.
- Bug found and fixed: a tap right after joining was lost because the host had not yet subscribed to the new participant channel (one-shot broadcast). Requests now ride on participant presence. Re-test: immediate tap → host banner "Listening for Sarah's voice.", phone example sentence, Cancel cleared both, End showed "Conversation ended" on the phone (passed twice, including after the acknowledgement change).
- A first two-phone presence run falsely withdrew David's request about 3 s after his tap; a traced rerun passed (host received presence updates 1.7–2.3 s after publish). The cause was not proven, so acknowledgement now requires a phase that names the phone's own request ID; a unit test covers a stale phase delivered after acknowledgement.
- Test-environment limit: further two-phone runs were blocked for a while when Supabase anonymous sign-in failed ("Could not connect anonymously") after roughly 20 sign-ins in about 35 minutes from one IP.
- Final code (`9770a18`), same local live two-phone run: David and Zira identified from their phones; host 1 `getUserMedia` call, phones 0; live 13/15 caption lines named correctly (Zira's "That works for me." and "Perfect." shown as David); after the conversation ended the revision corrected both, 15/15; no duplicates; both phones showed "Conversation ended". A host refresh restored the open room with "Start room microphone" and did not start the microphone by itself.
- Not verified: physical phones, human voices, real room acoustics, mobile browser background behaviour, Bluetooth input, sessions longer than two minutes (mid-session revisions), sustained sessions, accuracy percentages or measured cost. Cost note only: Connected now uses one AssemblyAI stream per room instead of one per participant.
# 2026-10-24 — CAPTION-008.4 local implementation verification

- Baseline: fetched `main`; `HEAD == FETCH_HEAD == 07555fead1d3c289e84d7ccfd036f952a522942e`, clean before editing. Human request reprioritized the active slice to CAPTION-008.4; 008.3 remains accepted.
- Source changes: Headset-only AssemblyAI parameters encode `interruption_delay=0`, `min_turn_silence=100`, `max_turn_silence=1000`; Table/Connected option objects remain unchanged. Existing signed `PhoneLatencyStats` stays intact. A separate monotonic in-browser collector records gate-open, first delayed audio, provider first text/final, and logical gate-close timing. No physical latency results were collected.
- OpenAI path: enabled only for non-host participant pages with `?sttBenchmark=1`. The shadow resamples the same delayed active `GatedAudio` frames (16 kHz PCM16 mono) to 24 kHz, commits on delayed active→inactive, and never publishes captions. Server route checks authenticated membership and an open Headset room, uses server-only `OPENAI_API_KEY`, and returns only the ephemeral credential/expiry. Context names are sent only after the optional toggle is enabled. Transcript/reference/metrics state is memory-only and capped at 25 utterances. No actual OpenAI provider session was made in this verification.
- Tests: `npx vitest run --pool=vmThreads --maxWorkers=1 --no-file-parallelism` — **252 tests / 40 files passed**. Coverage includes provider parameter isolation, detailed look-ahead activity metadata, same delayed active PCM reaching both sides, commit after inactive output, 16→24 kHz chunk continuity/phase/bounds, opt-in gating, ephemeral-only WebSocket auth, server route failure isolation, WER/entity scoring, monotonic timing and bounded history.
- Gates: `npm run typecheck` passed; `npm run lint` passed; serial Vitest passed 252 tests / 40 files; `npm run build` completed successfully on retry; `git diff --check` passed. The first parallel run caused four unrelated 5-second UI test timeouts and a Next prerender `EPERM` while resource contention was high. Build uses Next.js 16.4.0, and the build emitted the official October 14, 2026 security-upgrade reminder; Next.js identifies 16.4.1 as patched. No dependency was changed in this task. Track the 16.4.1 upgrade as a separate security follow-up.
- Browser/live: Existing Playwright scripts require a Playwright module path and Chromium executable, neither is installed or available in the workspace. No browser smoke, live OpenAI session, deployed secret check, or physical microphone/headset UAT was performed. No AssemblyAI/OpenAI comparative latency or accuracy result is claimed.
- UAT handoff: Use `?sttBenchmark=1`, select and read each scripted phrase, then one minute of natural speech. Record AssemblyAI/OpenAI first-text and final P50/P90, selected-phrase WER/entity scores, names/numbers/technical terms, truncation and delayed finals. Repeat with wired and Bluetooth headsets if available. `OPENAI_API_KEY` still needs deployment-environment confirmation before deployed shadow testing.

# 2026-10-24 — SEC-001 Next.js security patch verification

- Changed exact pins for `next` and `eslint-config-next` from 16.4.0 to 16.4.1, the release identified as patched by the official Next.js October 14 security update. Updated only these package pins and their lockfile dependency graph; application source and other direct dependencies are unchanged.
- Verification: `npm run typecheck`, `npm run lint`, `npx vitest run --pool=vmThreads --maxWorkers=1 --no-file-parallelism` (**252 tests / 40 files**), `npm run build` (Next.js 16.4.1; passed without the former security-upgrade reminder), and `git diff --check` passed.
- `npm audit` still reports two high findings, both already present at the synced baseline: `undici@7.30.0` via `jsdom@29.1.1` and `zod@4.6.5` via `eslint-config-next`; npm reports fixes available. These are recorded separately as SEC-002 and were not changed in this scoped patch.
- No browser, physical microphone, provider session, secret inventory or deployed runtime version was inspected. A successful deployment check will not be treated as runtime verification.


# 2026-10-24 — CAPTION-009 Open Mode / retired Connected

- Baseline: clean fetched main `619154d8e303a793ec469096d442cf89a982604d`. Two modes only; Open default, Headset preserved. Connected runtime/voice identification/aliasing and dead personal-mic reconciliation removed; only Headset comparison helpers extracted unchanged. No gate/arbitration/look-ahead tuning.
- Automated: typecheck and lint passed; serial Vitest `npx vitest run --pool=vmThreads --maxWorkers=1 --no-file-parallelism` passed **191 tests / 37 files** after retired suites were removed. Earlier intermediate suite had obsolete identification/config expectations; updated to new contracts before final pass. Next.js 16.4.1 production build passed; final build repeated after CSS fix.
- Open real-page browser: actual capture/worklet with synthetic browser media, mocked provider, no external network. Immediate unknown/wrong interim, A/null/A bridge, true A/B/A interjection, revision merge/split, speaker rename, keyboard start/end, two-mode selector and aria-live semantics passed. 390/1280 px × 100/200% text: no horizontal overflow, zero page errors; screenshot inspected. First browser navigation was sandbox-denied; authorized localhost retry ran. Initial enlarged-text header overflow reproduced and fixed through wrapping, not text clipping.
- Existing Headset browser scripts passed: readability (phone picker/help, speaking/failure precedence, host pills, flow/removal, reduced motion, 390/1280 px × 100/200% text) and real fake-media input selection/restart (3 captures, 3 routes, zero page errors).
- Open live provider: exact source configuration Pro/balanced/diarization/0 interruption/120 s revision interval/no Voice Focus/no explicit silence overrides, 16 kHz/formatted turns. Begin 1, Turn 6, end-session SpeakerRevision 1, Termination 1, Error 0. Begin echoed Pro/balanced/speaker_labels true/voice_focus null. Two synthetic voices generated three speaker labels; this does not establish physical diarization accuracy. No >=120 s mid-session revision observation or first-text latency measurement.
- Existing live Headset regression: four target phrases once each, zero wrong names/misses/duplicates, four text suppressions. Bypass: two target duplicates and two wrong names, zero misses. Both phones Begin/Turn/Termination, zero provider/page/quota errors, host mic calls zero. 390/1280 px and keyboard sensitivity/debug controls pass. Synthetic test, not physical acoustic acceptance. Existing signed latency collector remains unchanged; negative provider-end offsets are not human-perceived latency claims.
- Supabase read-only catalog: service-only/security-invoker room RPC and application/Realtime policies present. Full rollback SQL regression attempted but connector returned Invalid or expired requestState; not a passed check. No migration/policy/config change. Source private-topic authorization tests and live member transport pass.
- Runner cleanup: test rooms ended, browsers closed, synthetic temporary audio removed; owned dev server stopped. No raw audio, real transcripts, tokens or secrets retained/committed. Optional OpenAI path was not invoked.
- Remaining: five physical Open scenarios and short two-person Headset regression in CAPTION-009-OPEN-MODE.md, long session revisions, physical screen-reader/browser/headset/background behavior. CAPTION-003 historical failures/measurements above remain intact; it is retired from active product.

- CAPTION-009 publication: implementation `bc73b191ac034f629231b0ede87235f4cbecbd65` pushed to main; GitHub Vercel status **success** observed: [deployment status](https://vercel.com/madziyis-projects/caption-assist/3fngbgtCfXZaasrfLg1eSNX95Kmh). Status only; deployed microphone/device behavior and physical acceptance remain unverified. Final documentation-only handoff follows this implementation.


## 2026-10-24 — CAPTION-010 Single Speaker Mode

- Human requested a sermon/lecture mode without diarization, immediate captions and word-count paragraph breaks. Synced clean main `d3ba7608ec238c86c05253646613c38561fdfdfd`. Added Single Speaker Mode (Open remains default), local ConversationSession with Pro/balanced/0 interruption/explicit partials/no diarization or Voice Focus. No silence overrides or speaker revisions. Open/Headset provider and gate/arbitration behavior preserved.
- Pure Single presentation fills 80-word paragraphs across finals/interims and arbitrarily long pauses; 81st interim word starts the next paragraph without waiting for silence/finalization. No speaker labels/naming, source rewriting, extra transcript or persistent storage. Final/correction replacement recomputes without duplication; history remains finals only.
- Typecheck/lint/build/diff check passed; serial Vitest 197 tests / 38 files. Chromium actual page + real fake-media worklet verified 161 interim words -> 3 paragraphs, final replacement, no labels, keyboard/stop/aria; 390/1280 px at 100/200% text, zero overflow/page errors. Screenshot inspected. Existing Open browser regression passed; active Headset automated suites pass.
- Live synthetic Single source-option provider smoke: Begin 1, Turn 12 (9 partials/3 finals), Termination 1, Error 0, no speaker labels/revisions. Partial text before first final; Begin confirmed Pro/balanced/diarization off/Voice Focus null. No latency or sermon-accuracy claim. Browser/provider closed; no raw audio/transcripts/credentials persisted. No dependency/security/database/provider-benchmark scope added.
- Physical sermon/PA acoustics and sustained-session acceptance remain human-owned; see CAPTION-010-SINGLE-SPEAKER.md. Prior Open/Headset physical UAT remains pending separately.

- Publication: implementation `dd04ae5cd23d2dcac9319d912daf8d3861a54f5b` pushed to main; Vercel **success** observed: [deployment status](https://vercel.com/madziyis-projects/caption-assist/EqnqHNz3WrgEL2zp8gFG2PvG3WzA). Deployment-check evidence only; no deployed physical sermon/microphone UAT inferred. Documentation-only handoff follows.


### 2026-10-24 — CAPTION-010 human paragraph correction

- Human supplied physical-use screenshot and rejected arbitrary 80-word splits; requested new paragraphs after a 3-second pause. Synced clean main `0ea492cbbe8a6e43fbe4f7cea18f53de1bee6186`. Removed Single's word cap, deriving >=3000 ms gaps from preceding audioEndAt (endedAt fallback) to next startedAt; missing endpoint evidence keeps text together. Words remain immediate, with no silence timer/debounce, blank paragraph or provider finalization wait.
- Automated: typecheck/lint passed; serial Vitest 201 tests/38 files. 2999/3000/3001 ms, 161 continuous interim words, finals/short pauses, audio-vs-arrival timing, missing endpoints/overlap and correction/dedupe covered. Production build and diff checks recorded before publication.
- Actual-page Chrome fake-media capture/worklet + mocked provider: 161 interim words remain one paragraph; resumed interim after exactly 3 seconds starts paragraph two; final replacement/no labels/keyboard/aria/stop pass. 390/1280 px at 100/200% text: no overflow, zero page errors. Browser/server closed; no audio/transcript storage. No new live STT test because provider/audio/transport configuration is unchanged. Open/Headset tests pass.
- Physical sermon readability/long-session acceptance remains human-owned. No accuracy/latency measurements inferred from screenshot or synthetic checks. Earlier 80-word implementation evidence above remains historical and is superseded for Single Mode only.
