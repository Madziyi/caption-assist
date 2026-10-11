# Active Initiative

**Initiative:** CAPTION-008 - Headset Mode (separate mode: every speaker wears AirPods/a headset on their own phone; no room microphone)
**Active slice:** CAPTION-008.3 - Duplicate control: continuous per-person sensitivity slider, visible room-check tuning state, robust own-level estimator, calibrated cross-phone arbitration of overlapping captions, latency measurement
**Status:** Ready for Builder. 008.2 is deployed (`aac146a`, setup fix `df89148`).
- The human ran it on two phones (wired and Bluetooth headsets): captions work and are named by phone, but bleed still opens the other phone's gate when people sit close, and captions feel about 2 s behind. The human's verdict: "I'm actually happy, it's kind of working."
- The export shows weak single-phone separation (4.4 and 6.9 dB) and 16 s of both gates open in a 160 s session.
- But the person actually talking is always 4–7 dB nearer their own calibrated level than the other phone is to its own. 008.3 arbitrates on that.
- Full specification: `CAPTION-008-HEADSET-MODE.md` ("Planner review of 008.2", "CAPTION-008.3 specification").
**Owner:** Builder implements 008.3 Part A, then Part B, verifies (including the live provider and end-to-end checks owed from 008.2), updates durable context and pushes. The human then runs the 008.3 physical script and returns the export and notes.

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

Builder: sync `main`, read `CAPTION-008-HEADSET-MODE.md` (Planner review of 008.2, CAPTION-008.3 specification) and implement 008.3.

## Paused

CAPTION-003 (Connected Mode, CAPTION-003.4 room microphone + voice identification) is complete in source and deployed; its physical multi-person UAT is still outstanding and paused while CAPTION-008 is active. See `CAPTION-003-HANDOFF.md`.
