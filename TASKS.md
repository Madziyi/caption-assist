# Tasks

Use these states:

- `[ready]`
- `[in-progress]`
- `[blocked]`
- `[done]`
- `[deferred]`

## In progress

None.

## Ready

## Planned

- **CAPTION-002** `[ready]` — Speaker-aware Table Mode: streaming diarization, temporary speaker IDs, rename flow, speaker-aware transcript presentation.
- **CAPTION-003** `[ready]` — QR participant rooms: guest web join, name, mic permission/test, presence, separate participant streams, exact identity by connection.
- **CAPTION-004** `[ready]` — Hybrid Mode: room mic + joined mics, authoritative personal streams, duplicate suppression, overlapping connected-speaker handling.
- **CAPTION-005** `[ready]` — Accessibility layer: refined caption presentation, large text, high contrast, keyboard controls, history behavior, optional non-speech event research/implementation.
- **CAPTION-006** `[ready]` — Production hardening: failure recovery, room expiry, rate limiting, privacy controls, diagnostics without transcript leakage, compatibility hardening.
- **CAPTION-007** `[ready]` — Benchmark + field validation: compare candidate STT providers and microphone setups using representative conversations; measure latency, accuracy, speaker attribution, reliability, and actual operating cost.

## Blocked

None.

## Done

- **BOOTSTRAP** `[done]` — Establish verified repository context and shared Planner/Builder workflow.
- **CAPTION-001** `[done]` — Conversation Core source implementation and user-observed functional validation complete; deeper quality checks remain pending.

## Deferred

- Native iOS/Android app — defer until PWA/browser limitations are measured.
- Translation — outside the initial captioning roadmap.
- Persistent conversation archives — privacy/product decision required before implementation.
