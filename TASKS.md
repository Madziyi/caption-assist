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
  - **008.2** `[ready]` — Part A: room check tunes the gate (review defect), 2-frame attack, host per-person sensitivity control, calibration survives rejoin, missing 008.1 tests. Part B: gated per-phone transcription with Universal-3.6 Pro + Voice Focus `near-field` (300 ms look-ahead, silence otherwise), caption relay named by phone, host caption stage.
  - **008.3** `[planned]` — Duplicate safety net by calibrated margin, adaptive thresholds, headset/phone recovery.
  - **008.4** `[planned]` — Physical multi-person UAT and closure.
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
