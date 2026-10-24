# Active Initiative

**Initiative:** CAPTION-008 - Headset Mode (separate mode: every speaker wears AirPods/a headset on their own phone; no room microphone)
**Active slice:** CAPTION-008.4 — Headset latency tuning and OpenAI shadow STT benchmark.
**Status:** CAPTION-008.3 remains accepted by the human. This approved experiment targets the reported roughly 2 s perceived delay. AssemblyAI remains the only production caption provider; OpenAI is opt-in, observation-only, and must receive exactly the same delayed gated content. No production migration, Table/Connected behavior change, persistence, gate threshold/look-ahead/arbitration change, or CAPTION-009 work.
- The human ran it on two phones (wired and Bluetooth headsets): captions work and are named by phone, but bleed still opens the other phone's gate when people sit close, and captions feel about 2 s behind. The human's verdict: "I'm actually happy, it's kind of working."
- The export shows weak single-phone separation (4.4 and 6.9 dB) and 16 s of both gates open in a 160 s session.
- But the person actually talking is always 4–7 dB nearer their own calibrated level than the other phone is to its own. 008.3 arbitrates on that.
- Full specification: `CAPTION-008-HEADSET-MODE.md` ("Planner review of 008.2", "CAPTION-008.3 specification").
**Scope/contracts:** Keep universal-3-6-pro, near-field, balanced, speaker labels off; add Headset-only interruption/silence tuning (0/100/1000 ms). Retain signed provider audio-end latency and add monotonic in-browser episode receipt timings. Enable OpenAI only with `?sttBenchmark=1`; use server-minted ephemeral credentials and a 16→24 kHz streaming resampler on the same gated PCM. Benchmark transcripts and scripted WER remain memory-only. Failure of the shadow path cannot affect AssemblyAI, capture, relay, gate or arbitration.

**Ordered work:** (1) implement isolated options, detailed gated frames, timing and resampling; (2) add opt-in ephemeral-secret/WebSocket shadow path and benchmark panel/script scoring; (3) focused tests and requested automated/browser checks; (4) update durable evidence honestly; (5) commit/push main and inspect deployment status. Physical headset acceptance is handed to the human; synthetic/local evidence is not physical acceptance.

**Owner:** Builder implements and verifies source/local browser behavior. Human configures `OPENAI_API_KEY` in deployment if desired and performs wired/Bluetooth physical UAT; no provider winner is declared without that evidence.

**Builder progress:** Source and focused/full automated checks are implemented and passing locally. Existing Playwright browser scripts require an external Playwright/Chromium path that is not installed in this workspace; physical-device and deployed OpenAI availability remain unverified. Deployment and Git handoff are pending.

## Approved UI/readability follow-up (current Builder pass)

- Human reports 008.3 "works perfectly now"; this is user-observed acceptance, not new quantitative device/accuracy evidence. Latency remains noticeable and short provider turns waste reading space.
- Scope: styled accessible native microphone selector in a compact card; prominent rounded Speaking/Quiet rectangle on phones and compact replacement status pills in existing host rows, with failure/setup states taking precedence. Browser route labels remain advisory; device selection/permission behavior unchanged.
- Headset live view groups adjacent same-speaker/source captions visually; short pauses/provider finals do not repeat the label. Initial display limits: a pause over 2 s or an 80-word block limit at turn boundaries starts a new paragraph. Other speakers and overlap stay distinct. Underlying turn IDs/events remain untouched for revisions and duplicate removal. No new delay, transcript rewriting or persistence; Table/Connected/history behavior unchanged.
- Order: presentation helper/components/tests → responsive/keyboard browser checks → full automated gates → durable handoff and commit/push. Provider timing, gate/look-ahead and arbiter constants are explicitly unchanged; 008.4 is not started.
- Acceptance: selected input stays correct; prominent/compact indicators never say Quiet during mic/STT failure; finals/interims flow in one block without delaying updates; removal/revision regroup correctly; 390/1280 px and enlarged text remain usable. Physical readability confirmation remains human-owned.
- Implemented: microphone card with native select/expandable guidance; shared activity-state precedence and coloured text-labelled rectangles; headset-only presentation grouping, with original reducer records/history unchanged. 238 tests/36 files, typecheck, lint, production build and browser checks passed. Both surfaces fit 390/1280 px at 100/200% root text; real fake-media capture/worklet input selection/restart passed. No new provider/audio/latency measurement.

## Current implementation evidence

- Clean local `HEAD` and `origin/main` matched Planner baseline `da7d3802eb928c5be8a9a57bdc3533ce7da59d8c` before edits; no checkpoint-restored files remained.
- Continuous sliders, phone `tuned`, robust own estimator, leading-edge relay, bounded level history/evidence, clock alignment, headset-only arbiter, opt-in hidden finals and export v3 are implemented. Same-instance rejoin preserves calibration with a current transport; microphone failure stops STT and clears queued audio.
- Final real Chromium host + two fake-media phones, live Supabase + AssemblyAI: four target sentences appeared once under correct names, zero missed target lines; three finals suppressed (two text, one level). Bypass exposed two duplicates and two wrong-name lines. Both phones received Begin/Turn/Termination with zero provider/page/quota errors; host made no microphone request.
- An earlier comparison escaped one duplicate. Provider segmentation varies; no thresholds or provider options were changed to obtain the final pass. Synthetic audio proves the path, not sustained reliability or physical acoustics.
- Phone latency samples include negative provider-endpoint offsets. The displayed formula estimate is not a measured human-perceived delay. Detailed per-stage numbers and limits are in QUALITY.md.
- No schema, policy, quota, retention or provider strategy change. 008.4 and 008.5 have not started.

## Why

A single loudness threshold per phone cannot separate wearer from bleed once people sit close: separation drops to 4–7 dB. Comparing phones against each wearer's own calibrated level still identifies the talker. That relative comparison, plus manual per-person tuning, is the path to "each sentence once, under the right name".

## Contracts for 008.3 (summary; the specification governs)

- **Sensitivity slider:** per person `sensitivityDb`, an integer from −15 to +6 (negative = less sensitive). It moves `openDb` by that amount, clamped to `[floor + 6, ownRef + 6]`. The host has a range input per person with live "Opens at" feedback. Control messages are throttled to 4/s during a drag, and legacy step values are mapped.
- **Room-check tuning state:** the phone reports `tuned`, the host shows "Room check needed", and the export uses the phone's own state.
- **Own-level estimator:** speech frames must be `≥ max(floor + 6, p95 − 15)`.
- **Leading-edge interim throttle:** the first interim is sent immediately, then at most 5/s.
- **Evidence:** each caption carries `relDb` (level relative to the wearer's own level over the caption's audio window), `openRatio` and its capture span. The host aligns phone clocks by minimum observed delay.
- **Arbiter (headset rooms only):**
  - Hides an interim that is 3 dB or more weaker than an overlapping turn.
  - When an overlapping turn on another phone is still open, holds the final up to 800 ms to compare.
  - Suppresses text duplicates by level winner, and suppresses non-duplicate bleed fragments 4 dB or more weaker with at least half their span overlapping.
  - Otherwise shows both.
  - Adds `REMOVE_TURN` for rare replacements.
  - A host testing checkbox shows hidden duplicates.
- **Latency measurement:** provider latency per phone and relay delay per phone, with an estimated delay shown on the host. No latency tuning beyond the throttle (that is 008.4).
- **Export version 3** adds slider, tuning, latency and arbitration counters, still with no names, IDs, audio or text.
- No storage, schema or policy change. Table and Connected behaviour is unchanged.

## Next action

Human reloads and verifies microphone choice, green Speaking/neutral Quiet indicators and paragraph continuity. Quantitative duplicate/latency notes remain useful under the six-step 008.3 script. Provider timing stays unchanged until separately approved 008.4 work; Planner resyncs before advancing. UI deployment status: https://vercel.com/madziyis-projects/caption-assist/DApfCBtoFZrxyavYjxTZp735nioo.

## Paused

CAPTION-003 (Connected Mode, CAPTION-003.4 room microphone + voice identification) is complete in source and deployed; its physical multi-person UAT is still outstanding and paused while CAPTION-008 is active. See `CAPTION-003-HANDOFF.md`.
