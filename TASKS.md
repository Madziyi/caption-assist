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

- **CAPTION-004** `[ready]` — Hybrid Mode: room mic + joined mics, authoritative personal streams, duplicate suppression, overlapping connected-speaker handling. Ready for Planner architecture planning; implementation has not started.
- **CAPTION-005** `[ready]` — Accessibility layer: refined caption presentation, large text, high contrast, keyboard controls, history behavior, optional non-speech event research/implementation.
- **CAPTION-006** `[ready]` — Production hardening: failure recovery, room expiry, rate limiting, privacy controls, diagnostics without transcript leakage, compatibility hardening.
- **CAPTION-007** `[ready]` — Benchmark + field validation: compare candidate STT providers and microphone setups using representative conversations; measure latency, accuracy, speaker attribution, reliability, and actual operating cost.

## Blocked

None.

## Done

- **BOOTSTRAP** `[done]` — Establish verified repository context and shared Planner/Builder workflow.
- **CAPTION-001** `[done]` — Conversation Core source implementation and user-observed functional validation complete; deeper quality checks remain pending.
- **CAPTION-002** `[done]` — Speaker-aware Table Mode source implementation, user-observed product/UAT acceptance, and caption-history panel refinement complete for progression; deeper quality checks remain pending.
- **CAPTION-003** `[done]` — Connected Mode / QR participant rooms source and Supabase infrastructure/security verification complete; user-observed deployed product acceptance recorded. User reports Connected Mode working perfectly and accepted the latest UI refinements. Exact device/browser matrix and detailed audio-path checks were not reported; see CAPTION-003-HANDOFF.md.

## Deferred

- Native iOS/Android app — defer until PWA/browser limitations are measured.
- Translation — outside the initial captioning roadmap.
- Persistent conversation archives — privacy/product decision required before implementation.
