# Quality & Field Verification Ledger

This file records measured evidence about whether the product is actually usable as a real-time accessibility tool.

Do not invent values. Mark unmeasured items `unverified`.

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
