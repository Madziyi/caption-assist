# Tasks

Use these states:

- `[ready]`
- `[in-progress]`
- `[blocked]`
- `[done]`
- `[deferred]`

## In progress

- **CAPTION-008** `[in-progress]` — Headset Mode, a separate mode: every speaker wears AirPods/a headset on their own phone, no room microphone; each phone gates its wearer's speech by calibrated loudness. Spec: `CAPTION-008-HEADSET-MODE.md`.
  - **008.1** `[done]` — Headset check, calibration, room check, gate preview, results export; no audio leaves any device. Includes the additive `caption_rooms.mode` migration. Timer/input selection fixed; participant Presence quota disconnections addressed with immediate state Broadcast and throttled snapshots. Live local two-phone simulated calibration, matrix and rejoin pass; 168 tests/27 files and source gates pass. The human tried it physically and was satisfied, though possibly too sensitive (no exports yet). Planner: GO.
  - **008.2** `[done]` — Implemented Part A plausible room-check gating, 2-frame attack, host sensitivity control, calibration-preserving rejoin/drop handling, mic-drop export state, and Part B gated near-field Universal-3.6 Pro transcription, 300 ms look-ahead silence frames, bounded reconnect, sequence/deduped caption relay, identity-bound host captions, status strip and privacy/invite copy. Automated gates pass. Live provider/browser-path verification and the missing as-built summary were completed during 008.3; remaining physical recovery/UAT belongs to 008.5.
  - **008.2 setup follow-up** `[done]` — Restored Start headset check for the non-null initialized guest view introduced in `aac146a`, permission-pending feedback and stopped-mic restart. 179 tests/29 files and source gates pass; isolated Chromium with real capture/worklet and simulated media verified input listing/selection and restart at 390/1280 px without overflow. Physical-phone confirmation remains pending.
  - **008.2 physical trial** — The human ran it on two phones: captions work and are named by phone, but bleed opens gates when people sit close, and the delay is about 2 s. The export shows separation of 4.4 and 6.9 dB and 16 s of overlapping gates in 160 s. "Kind of working."
  - **008.3** `[in-progress]` — Duplicate control implemented, locally verified and published as `6695c60` (Vercel success); physical acceptance and Planner review pending:
    - continuous per-person sensitivity slider (−15 to +6 dB);
    - visible room-check tuning state;
    - robust own-level estimator;
    - leading-edge interim throttle;
    - calibrated cross-phone arbitration of overlapping captions (relative-level evidence, clock alignment, final hold of at most 800 ms, hidden-duplicates testing view);
    - latency measurement;
    - export version 3.
    - Final synthetic live comparison: four correct-owner target sentences once each, zero target misses; bypass two duplicates/two wrong-name lines. Earlier run escaped one duplicate; do not treat the final pass as sustained acoustic acceptance. All source gates pass; exact counts and signed latency caveats in QUALITY.md.
  - **008.4** `[planned]` — Latency improvements chosen from the 008.3 measurements, without visible accuracy loss.
  - **008.3 UI/readability follow-up** `[done]` — Human reports deployed duplicate control works perfectly; approved polished native microphone picker, rounded phone speaking indicator, compact replacement host pills and flowing same-speaker paragraphs. Implemented with display-only 2 s pause/80-word turn-boundary limits; 238 tests/36 files, source gates and isolated browser/capture checks pass. Published `7d4e8b0`, Vercel success; human visual confirmation pending. Provider/gate/arbiter timing unchanged.
  - **008.5** `[planned]` — Remaining recovery items, physical multi-person UAT and closure.
- **CAPTION-003** `[in-progress]` — Paused while CAPTION-008 is active. Reopened after deployed user testing revealed duplicate speech on nearby personal microphones. CAPTION-003.1 text reconciliation, CAPTION-003.2 episode continuity and CAPTION-003.3 Voice Focus all failed real acceptance, so personal-microphone work stopped. CAPTION-003.4 pivots Connected Mode to one host room microphone + AssemblyAI diarization + one-time session voice identification from QR phones that do not record audio. Closure awaits physical multi-person UAT and user acceptance.

## Ready

## Planned

- **CAPTION-004** `[deferred]` — Hybrid Mode: host room mic plus headsets/personal microphones where acoustically isolated microphones exist. Reuse the dormant personal-microphone, cross-mic reconciliation and caption-relay modules kept from CAPTION-003.1–003.3. Not started.
- **CAPTION-003 follow-ups** `[ready]` — (a) Verify and, if needed, raise the Supabase Auth anonymous sign-in rate limit for shared-Wi-Fi events. (b) Hide the brief disabled "Start room microphone" button while a Connected conversation is ending. (c) Consider clearer copy when identification fails because the voice sounded like an already-identified person. (d) Diarization upgrade (e.g. pyannoteAI) only if physical UAT shows AssemblyAI diarization is insufficient.
- **CAPTION-005** `[ready]` — Accessibility layer: refined caption presentation, large text, high contrast, keyboard controls, history behavior, optional non-speech event research/implementation.
- **CAPTION-006** `[ready]` — Production hardening: failure recovery, room expiry, rate limiting, privacy controls, diagnostics without transcript leakage, compatibility hardening.
- **CAPTION-007** `[ready]` — Benchmark + field validation: compare candidate STT providers and microphone setups using representative conversations; measure latency, accuracy, speaker attribution, reliability, and actual operating cost.

## Blocked

None.

## Done

- **BOOTSTRAP** `[done]` — Establish verified repository context and shared Planner/Builder workflow.
- **CAPTION-001** `[done]` — Conversation Core source implementation and user-observed functional validation complete; deeper quality checks remain pending.
- **CAPTION-002** `[done]` — Speaker-aware Table Mode source implementation, user-observed product/UAT acceptance, and caption-history panel refinement complete for progression; deeper quality checks remain pending.

## Deferred

- Native iOS/Android app — defer until PWA/browser limitations are measured.
- Translation — outside the initial captioning roadmap.
- Persistent conversation archives — privacy/product decision required before implementation.
