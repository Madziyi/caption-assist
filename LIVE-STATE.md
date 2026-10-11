# Live State Ledger

This file records only facts verified against live infrastructure.

Do not infer live state from repository files.
Never store secret values.

## Bootstrap review note — 2026-10-10

The Builder inspected repository source only; no deployed system, provider account, database, hosting environment, or live endpoint was inspected. All live-state entries below therefore remain unverified.

## Environments

### Production

- URL: unverified / not established
- Hosting: unverified / not established
- Last verified: —
- Verified by: —

### Staging / Development

- URL: unverified / not established
- Hosting: unverified / not established
- Last verified: —
- Verified by: —

## Database

- Provider: not yet verified / may not be required for CAPTION-001
- Project / instance identifier: —
- Latest verified migration/version: `20261011140359_headset_mode`
- Last verified: 2026-10-11

## Server / API / real-time services

| Service | Version/config | Auth mode | Status | Last verified |
|---|---|---|---|---|
| Application API | — | — | unverified | — |
| Real-time session transport | — | — | unverified | — |

## Speech providers

| Provider | Purpose | Model/config | Credential secret name | Live verified |
|---|---|---|---|---|
| AssemblyAI | Table/Connected and per-phone headset STT | Headset: universal-3-6-pro / near-field / balanced / 16 kHz / no diarization / formatted turns | `ASSEMBLYAI_API_KEY` (local token route exercised; value never recorded) | yes, local live browser path; deployed physical acceptance unverified |
| Deepgram | benchmark candidate | unverified | not established | no |
| Speechmatics | benchmark candidate | unverified | not established | no |

## Scheduled jobs / cron

None expected initially. None verified.

## Known live-state drift

- None recorded.

## CAPTION-008.3 local live browser/provider verification — 2026-10-11

- Verified local browser path, not deployed device behavior: host + two independent fake-media Chromium phones, live Supabase project `cqnyvevhuxwfzhqpmccn`, real AssemblyAI streaming v3 sessions using temporary tokens from the local API. The project connector reported ACTIVE_HEALTHY, ca-central-1, Postgres 17.11. No new project, migration, policy, quota or live provider configuration.
- Observed options on every tested phone: `speech_model=universal-3-6-pro`, `voice_focus=near-field`, `mode=balanced`, `speaker_labels=false`, `format_turns=true`, `sample_rate=16000`. Final arbitration comparison: phone Begin/Turn/Termination counts 1/17/1 and 1/22/1; bypass 1/16/1 and 1/21/1. No provider Error. Host made no capture request and opened no provider session.
- Actual gated PCM and private participant caption/state Broadcasts reached the host. Four synthetic targets appeared once under the correct owners with arbitration; bypass exposed two duplicates/two wrong-name lines; no target misses. An earlier run escaped one duplicate; no sustained or physical reliability claim. Detailed counts and signed endpoint-latency limitations are in QUALITY.md.
- Read-only exact window `2026-10-11T19:27:00Z` through `2026-10-11T19:44:00Z`: 15 `realtime_logs` rows, 0 `ClientPresenceRateLimitReached`. Initial aggregate query failed; simplified query succeeded. Browser traces also observed zero quota errors. This is window-limited evidence, not a global guarantee against disconnections.
- Temporary rooms ended, browsers closed, synthetic audio removed and owned dev server stopped. Anonymous fixture auth sessions stayed in memory and were reused across comparison runs; no audio, invitations, tokens, storage states or transcripts persisted in the repository. Physical-phone UAT remains pending.

## CAPTION-008.2 phone setup regression deployment — 2026-10-11

- Source commit `df89148` pushed to `main`; GitHub combined status reported Vercel `success`: [deployment status](https://vercel.com/madziyis-projects/caption-assist/HB68pZaVw5LLj1toww39zMweRqEA).
- Restores the microphone setup action for initialized joining-phone views. No hosting, database, policy, quota or provider configuration changes.
- Deployment status verified only. Isolated local fake-media UI/capture verification is recorded in QUALITY.md; deployed physical-phone and live AssemblyAI browser-path acceptance remain unverified.

## CAPTION-008.2 pre-coding Realtime log check — 2026-10-11

- Query window: `2026-10-11T17:29:27Z` (the `d839f09` commit time) through `2026-10-11T23:59:59Z`, project `cqnyvevhuxwfzhqpmccn`.
- `realtime_logs` rows: 15. `ClientPresenceRateLimitReached`: **0**. Realtime channel/error matches (`error`, `channel`, `disconnect`, `rate`): **2 informational rows**, both the normal tenant replication shutdown/restart sequence (`Tenant has no connected users`, `Disconnecting broadcast changes handler`, followed by initialization); no participant channel error or room disconnection was observed.
- No live schema, policy, quota, or provider configuration was changed during this check. This evidence did not require a room-disconnection fix before coding.

## CAPTION-008.1 participant Presence quota fix deployment — 2026-10-11

- Source commit `d839f09` pushed to `main`; GitHub combined status reported Vercel `success`: [deployment status](https://vercel.com/madziyis-projects/caption-assist/FHhwJXAXyz9DUgNtT4Z1TRqLzB1H).
- Live project `cqnyvevhuxwfzhqpmccn` confirmed ACTIVE_HEALTHY. Read-only Realtime log aggregation found 14 ClientPresenceRateLimitReached errors in the prior-24-hour window at 17:12 UTC.
- Local app with live Realtime: two simulated joining phones completed calibration, room check and one refresh/rejoin without disconnection. Temporary rooms ended and synthetic audio removed. No live schema, policy, quota or provider configuration changed.
- Deployment completion verified; deployed physical phone/Bluetooth confirmation remains pending.

## CAPTION-008.1 calibration timer and input picker deployment — 2026-10-11

- Source commit `77efcef` pushed to `main`; GitHub combined status reported Vercel `success`: [deployment status](https://vercel.com/madziyis-projects/caption-assist/7ke58AMsU8NYNd51be4wpTuaExhu).
- Includes browser-global timer binding, active-track device-ID selection and generic headset-route guidance. No infrastructure/provider configuration changed.
- Deployment completion verified; physical phone/Bluetooth retest remains pending.

## CAPTION-008.1 mobile fix deployment — 2026-10-11

- Source commit `a1611bf` (preserve mobile microphone permission activation) was pushed to `main`.
- GitHub combined status reported Vercel `success`: [deployment status](https://vercel.com/madziyis-projects/caption-assist/Boy7cRU2xgifEySh1N8sqFEscWRa).
- This confirms the source deployment completed; it does not establish physical mobile microphone or headset behavior.

## CAPTION-008.1 live migration and SQL verification — 2026-10-11

- Confirmed target before applying: Supabase project `caption-assist`, ref `cqnyvevhuxwfzhqpmccn`, region `ca-central-1`, status `ACTIVE_HEALTHY`.
- Applied exactly one additive migration: `20261011140359_headset_mode`, adding `caption_rooms.mode` and the specified backward-compatible `caption_room_action` update. No other live schema or policy change was made.
- Extended `supabase/tests/connected_rooms.sql` passed rollback-only against the same ref, including connected/headset create, check, join, snapshot, restore and separate-owner mode assertions plus the existing authorization/RLS checks. Synthetic identities/rooms were rolled back.
- Commit `48c500e` was pushed to `main`; GitHub combined status reported Vercel `success`. [Deployment status](https://vercel.com/madziyis-projects/caption-assist/HB2d5DWWUejGoiP34iW1naeiiKTy). Existing Vercel Git integration was used; no hosting configuration changed.

## Security observations

- No live security state verified yet.

## CAPTION-003 verified infrastructure — 2026-10-11

- Existing Supabase project: caption-assist, reference cqnyvevhuxwfzhqpmccn, ca-central-1; connector reported ACTIVE_HEALTHY. No new project created.
- Live migration history observed: 20261011061744 connected_rooms; 20261011063435 connected_presence_discovery. Tables caption_rooms and caption_room_participants have RLS, service-only transactional mutation RPC, and membership/owner-scoped private Realtime policies. No audio/transcript table was added.
- Live rollback-only SQL assertions passed for membership identity/reuse, duplicate names, rename, expiry/end/removal, application RLS, private topic authorization and RPC execution restrictions.
- Anonymous sign-ins succeeded for disposable fixtures. Direct private Realtime delivery and denial of unrelated/impersonating subscription and guest host-control publication were verified. First subscription attempt failed generically; second passed. Dashboard-wide public-access setting was not independently inspected.
- Security advisor returned only three anonymous-access policy warnings, expected for the approved membership-scoped anonymous flow; no other finding was returned.
- Synthetic fixtures were ended/removed; zero fixture rooms remained. No user conversation/audio was accessed.
- This does not establish a deployed application, configured local Supabase environment, real AssemblyAI audio session, multi-device UAT, or production/private-access dashboard configuration. Hosting and prior provider ledger entries remain unverified.

- Configured local app follow-up: user-supplied environment names verified nonempty privately; localhost host room creation authenticated successfully, subscribed, opened QR as muted You, and ended successfully. The ended invitation was rejected. Production build passed. This establishes local room configuration, not deployed hosting, AssemblyAI speech, guest-device audio or background behavior.

## CAPTION-003.1 deployment status - 2026-10-11

- GitHub combined commit status for `c8c95166dadd281801764d0154ae2c60b936d391` reported Vercel success after push to main. [Deployment status](https://vercel.com/madziyis-projects/caption-assist/3P9W5V6gqpR91WYzB6toEAmjv8MV). Existing Vercel Git integration was used; no hosting/provider configuration changed.
- This is deployment-status evidence only. Builder did not perform physical-device/audio duplicate-suppression UAT or inspect deployed runtime credentials. No new Supabase schema/authorization changes.

## CAPTION-003.4 local live observations - 2026-10-11

- AssemblyAI streaming v3 (temporary token from the local `ASSEMBLYAI_API_KEY`; value not printed or recorded) accepted `speech_model=universal-streaming-english`, `speaker_labels=true`, `format_turns=true`, `speaker_labels_revision_interval_ms=120000`, `sample_rate=16000`: Begin, Turn, SpeakerRevision and Termination received, no Error. The session-end SpeakerRevision used the `revisions` array form. Synthetic audio only; mid-session revisions (after ~2 minutes of audio) were not observed.
- Supabase project `cqnyvevhuxwfzhqpmccn` from a localhost dev server: participant presence payloads carrying an identify request ID reached the host's private participant subscription, observed 1.7–2.3 s after publish; host control broadcasts of identification phases reached phones. No schema, policy or Auth configuration was changed.
- Anonymous sign-in began failing after roughly 20 sign-ins in about 35 minutes from one IP. The configured Auth rate-limit value was not inspected.
- Test rooms were ended through the app. One room from a rate-limited run may remain open with no connected host or microphone until its 24-hour expiry; it could not be listed because the available Supabase connector points at a different project (`kzyoptgjzxtitdkvdstr`).
- Local only: this does not establish deployed behaviour, physical devices or real voices.
- Publication: `9770a18` pushed to `main`; GitHub combined status reported Vercel success: [Deployment status](https://vercel.com/madziyis-projects/caption-assist/49hgxyRQ1BLbPFK5a4DVc22N6j6S). Existing Vercel Git integration; no hosting/provider configuration changed. Deployment status only; the deployed build was not exercised with devices.

## Reconciliation diagnostics publication - 2026-10-11

- Implementation `a308e231b3c14a6f319cb4096692d64ad0d2da77` pushed to main. GitHub Vercel check reported success: [Deployment status](https://vercel.com/madziyis-projects/caption-assist/Hy8PjJApogR2SvEXk9oX8m9yfY2u). Existing Git workflow used; no hosting/provider configuration changes.
- All required gates passed: typecheck, lint, 109 tests / 15 files, production build and staged diff check. Source and local browser verification do not establish physical-device suppression acceptance. CAPTION-003 stays open; next test uses ?captionDebug=1.
