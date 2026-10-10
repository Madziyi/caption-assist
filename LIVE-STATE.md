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
