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
- Latest verified migration/version: —
- Last verified: —

## Server / API / real-time services

| Service | Version/config | Auth mode | Status | Last verified |
|---|---|---|---|---|
| Application API | — | — | unverified | — |
| Real-time session transport | — | — | unverified | — |

## Speech providers

| Provider | Purpose | Model/config | Credential secret name | Live verified |
|---|---|---|---|---|
| AssemblyAI | initial streaming STT candidate | unverified | `ASSEMBLYAI_API_KEY` (planned name only; not verified in live configuration) | no |
| Deepgram | benchmark candidate | unverified | not established | no |
| Speechmatics | benchmark candidate | unverified | not established | no |

## Scheduled jobs / cron

None expected initially. None verified.

## Known live-state drift

- None recorded.

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

## Reconciliation diagnostics publication - 2026-10-11

- Implementation `a308e231b3c14a6f319cb4096692d64ad0d2da77` pushed to main. GitHub Vercel check reported success: [Deployment status](https://vercel.com/madziyis-projects/caption-assist/Hy8PjJApogR2SvEXk9oX8m9yfY2u). Existing Git workflow used; no hosting/provider configuration changes.
- All required gates passed: typecheck, lint, 109 tests / 15 files, production build and staged diff check. Source and local browser verification do not establish physical-device suppression acceptance. CAPTION-003 stays open; next test uses ?captionDebug=1.
