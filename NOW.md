# Active Initiative

**Initiative:** CAPTION-008 - Headset Mode (separate mode: every speaker wears AirPods/a headset on their own phone; no room microphone)
**Active slice:** CAPTION-008.3 - Duplicate control: continuous per-person sensitivity slider, visible room-check tuning state, robust own-level estimator, calibrated cross-phone arbitration of overlapping captions, latency measurement
**Status:** 008.3 implemented and published as `6695c60`; Vercel reported success. Automated gates and the final local live-provider comparison passed. Physical testing and Planner review remain pending. 008.2 was deployed as `aac146a` (setup fix `df89148`).
- The human ran it on two phones (wired and Bluetooth headsets): captions work and are named by phone, but bleed still opens the other phone's gate when people sit close, and captions feel about 2 s behind. The human's verdict: "I'm actually happy, it's kind of working."
- The export shows weak single-phone separation (4.4 and 6.9 dB) and 16 s of both gates open in a 160 s session.
- But the person actually talking is always 4–7 dB nearer their own calibrated level than the other phone is to its own. 008.3 arbitrates on that.
- Full specification: `CAPTION-008-HEADSET-MODE.md` ("Planner review of 008.2", "CAPTION-008.3 specification").
**Owner:** Human runs the 008.3 physical script and returns the export and notes; Planner resyncs and reviews the published implementation and field evidence before selecting 008.4 latency work.

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

Human reloads every device, calibrates both headsets, runs the room check, tunes sliders at normal and 50 cm seating, counts duplicates/misses/wrong names and returns **Copy results** plus delay observations. Follow the six-step 008.3 script in `CAPTION-008-HEADSET-MODE.md`. Planner resyncs and reviews before advancing. Deployment-status evidence: https://vercel.com/madziyis-projects/caption-assist/8p9jzqvjnmnT8pqpFFKQBf8dua7P (not physical-device UAT).

## Paused

CAPTION-003 (Connected Mode, CAPTION-003.4 room microphone + voice identification) is complete in source and deployed; its physical multi-person UAT is still outstanding and paused while CAPTION-008 is active. See `CAPTION-003-HANDOFF.md`.
