# Active Initiative

**Initiative:** CAPTION-004 — Hybrid Mode architecture planning
**Status:** READY FOR PLANNER ARCHITECTURE PLANNING; implementation has not started
**Implementation / verification:** Planner may begin architecture planning after this CAPTION-003 closure. No CAPTION-004 implementation work is authorized or started.

## Closed initiative — CAPTION-003

- Source implementation complete.
- Supabase infrastructure/security verified as documented in the CAPTION-003 handoff and live-state ledger.
- User used the deployed application and reports Connected Mode working perfectly.
- Latest UI refinements accepted by the user.
- CAPTION-003 is complete for progression based on user-observed deployed product acceptance.
- The user's report does not specify a device/browser matrix or separate background, simultaneous-speech, latency, accuracy, or provider-metric results. Earlier verification distinctions remain in `CAPTION-003-HANDOFF.md` and `QUALITY.md`.

## Closed CAPTION-003 scope and contracts

Preserve Table Mode and the continuous transcript, history side panel, header and Full Screen. Add temporary Supabase rooms, anonymous identity, private membership-scoped Realtime, QR/mobile join, mic check, personal streams, exact identity, independent interims, rename/removal/end, and muted re-entry.

Table: room mic, diarization on. Connected: room mic off; host You navy and muted; every join/rejoin muted; personal mic streams, diarization off. No Hybrid Mode/CAPTION-004. Names may duplicate; membership authorizes identity. No transcript/audio persistence. Secure hashed invitations expire within 24 hours. No visibility/blur mute; actual room disconnect stops mic, re-entry muted. Wake Lock is supplemental; browser/OS background execution remains best-effort.

## Completed CAPTION-003 steps and gates

Implement domain/provider/state, migrations/RLS, server-authorized room API and transport; integrate mobile mic/join and host controls; test authorization, interims and lifecycle; run typecheck/lint/tests/build/diff check; perform available browser/live checks and record unverified device/audio checks honestly; update context, commit and push main. Follow all acceptance criteria in the approved CAPTION-003 brief.

## CAPTION-003 constraints and historical verification context

The user supplied local environment values; all four required names are nonempty, and configured host creation/end succeeded without exposing values. Existing caption-assist project has the two Connected migrations applied and verified via connector. Anonymous Auth and direct private Realtime authorization/delivery worked. This does not verify the full application or physical-device audio path. Do not create another project.

## CAPTION-003 verification evidence

Typecheck/lint passed; 51 tests across 12 files passed; production build passed; diff check passed. Live rollback-only SQL verified identity/rejoin/duplicate names/rename/end/expiry/removal, application RLS, topic authorization and service-only RPC. Direct anonymous Realtime smoke verified private delivery, unrelated-user rejection, participant impersonation rejection and guest control publication rejection. One synthetic same-process relay sample was ~169.9 ms; the first authorized subscription failed without diagnostic detail, the second attempt passed. Fixtures cleaned up. No phone microphone, simultaneous speech, sustained session, background app-switch or Wake Lock UAT was performed. See CAPTION-003-HANDOFF.md and QUALITY.md.

## Completed header refinement

Fit the desktop title, controls and status on one line using available screen width and compact control spacing; preserve readable wrapping on narrow screens. Verified Table idle and Connected active/ended at 1280 CSS pixels: controls aligned on one row without overflow. At 391 CSS pixels controls wrap without overflow. Typecheck, lint and production build passed. The user subsequently accepted the latest UI refinements in deployed use.

## Next action

Planner may begin CAPTION-004 architecture planning. CAPTION-004 implementation has not started.
