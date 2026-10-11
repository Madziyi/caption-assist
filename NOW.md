# Active Initiative

**Initiative:** CAPTION-003 — Connected Mode / QR Participant Rooms
**Status:** SOURCE IMPLEMENTED; PARTIAL FOR PROGRESSION — infrastructure/security verification passed, configured host browser checks passed; full multi-device audio UAT pending
**Implementation / verification:** Builder owns durable context until pushed.

## Scope and contracts

Preserve Table Mode and the continuous transcript, history side panel, header and Full Screen. Add temporary Supabase rooms, anonymous identity, private membership-scoped Realtime, QR/mobile join, mic check, personal streams, exact identity, independent interims, rename/removal/end, and muted re-entry.

Table: room mic, diarization on. Connected: room mic off; host You navy and muted; every join/rejoin muted; personal mic streams, diarization off. No Hybrid Mode/CAPTION-004. Names may duplicate; membership authorizes identity. No transcript/audio persistence. Secure hashed invitations expire within 24 hours. No visibility/blur mute; actual room disconnect stops mic, re-entry muted. Wake Lock is supplemental; browser/OS background execution remains best-effort.

## Steps and gates

Implement domain/provider/state, migrations/RLS, server-authorized room API and transport; integrate mobile mic/join and host controls; test authorization, interims and lifecycle; run typecheck/lint/tests/build/diff check; perform available browser/live checks and record unverified device/audio checks honestly; update context, commit and push main. Follow all acceptance criteria in the approved CAPTION-003 brief.

## Constraints

The user supplied local environment values; all four required names are nonempty, and configured host creation/end succeeded without exposing values. Existing caption-assist project has the two Connected migrations applied and verified via connector. Anonymous Auth and direct private Realtime authorization/delivery worked. This does not verify the full application or physical-device audio path. Do not create another project.

## Verification evidence

Typecheck/lint passed; 51 tests across 12 files passed; production build passed; diff check passed. Live rollback-only SQL verified identity/rejoin/duplicate names/rename/end/expiry/removal, application RLS, topic authorization and service-only RPC. Direct anonymous Realtime smoke verified private delivery, unrelated-user rejection, participant impersonation rejection and guest control publication rejection. One synthetic same-process relay sample was ~169.9 ms; the first authorized subscription failed without diagnostic detail, the second attempt passed. Fixtures cleaned up. No phone microphone, simultaneous speech, sustained session, background app-switch or Wake Lock UAT was performed. See CAPTION-003-HANDOFF.md and QUALITY.md.

## Next action

Run host + guest-phone UAT from CAPTION-003-HANDOFF.md. Keep CAPTION-003 active until Planner/user acceptance; do not start CAPTION-004.
