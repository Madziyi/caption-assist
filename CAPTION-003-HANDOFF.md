# CAPTION-003 — Connected Mode / QR Participant Rooms

**Status:** COMPLETE FOR PROGRESSION — user-observed deployed product acceptance recorded

The source implementation and Supabase infrastructure/security verification are complete. The user used the published application, reports Connected Mode working perfectly, and accepted the latest UI refinements. CAPTION-004 is ready for Planner architecture planning; implementation has not started. The evidence distinctions and limitations below remain in force; the user's report did not specify an exact device/browser matrix or separate background, simultaneous-speech, latency, accuracy, or provider-metric results.

## Changed and architecture

Mode selector locks during an active session. Table Mode retains its room microphone, diarization and speaker management. Connected Mode creates a temporary room, joins the host as navy You muted, and automatically opens a local QR invitation. Host controls include self-mic, Participants, invite/removal, history, Full Screen and end.

`/join/[token]` provides display name → mic explanation → permission → input meter (no STT) → release test mic → join muted → explicit Unmute. Guest page is a personal microphone endpoint with rename and leave, without transcript/audio playback. Real re-entry is always muted; healthy tab/app switches are not treated as re-entry.

Transport, microphone and room lifecycle are application-owned classes under `src/lib/rooms`, outside presentation components. Exact identity is assigned from the authorized participant channel. Independent interims feed the existing continuous transcript; finals append in host ingest order. Registry rename updates historical labels without rewriting caption objects. Disconnected/removed identities remain available for history.

Host refresh restores the latest open room for its anonymous identity, muted, without restoring transcript text. Only invitation metadata is optionally in sessionStorage. If lost, requesting a fresh invite rotates the invitation hash.

## Supabase setup and database/RLS

The existing project `caption-assist` (`cqnyvevhuxwfzhqpmccn`, ca-central-1) was used. No new project was created. Applied migration versions are `20261011061744_connected_rooms` and `20261011063435_connected_presence_discovery`; local filenames match live history. Do not reapply those migrations to this project.

Tables: `caption_rooms` and `caption_room_participants`, containing temporary metadata only. Room expiry is 24 hours. Only a SHA-256 invitation hash is stored. Service-only transactional mutation RPC authenticates through server `auth.getUser`; clients cannot execute it. RLS restricts room reads to members and participant-table reads to self/host. The non-exposed private helpers check caller identity, active membership and topic ownership.

Private channels:

| Topic suffix | Purpose | Publication |
|---|---|---|
| `:control` | end/removal and relay acknowledgements | host only |
| `:participant:<membershipId>` | normalized captions and authoritative channel-bound mic/presence state | that participant only |
| `:presence` | advisory roster-discovery signal, payload ignored | active members, Presence only; Broadcast denied |

Host receives each participant topic. Guests receive their own topic and host controls. Metadata reconciliation also runs every three seconds. Local host filtering rejects removed/ended events despite cached channel authorization. No caption/audio tables, persistence or logging were added. Development request-path logging is suppressed and referrers disabled; deployment/proxy request logging still needs invitation redaction.

Security advisor reported only the three expected anonymous-access warnings on the membership-scoped policies. Anonymous access is intentional; disabling it would break the approved account-free flow. [Advisor explanation](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins).

## Required local configuration

The user supplied `.env.local`. All four required variable names were verified nonempty without displaying values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `ASSEMBLYAI_API_KEY`. The configured app successfully authenticated, created a private room, opened its QR invitation, and ended the room. The production build passed with this environment. The AssemblyAI credential has not been validated by a completed real speech session. `.env.local` remains ignored and is not committed.

Anonymous sign-ins were verified live. Private channel authorization was verified directly. The dashboard-wide “Allow public access” switch was user-reported/configured by assumption, not independently inspected. Confirm it is disabled before deployment. Use HTTPS for a guest phone; localhost on a phone refers to that phone, and ordinary HTTP LAN origins do not support microphone access.

## Verification and quality

| Layer | Actual evidence |
|---|---|
| Automated | Typecheck, lint, 51 tests / 12 files, production build, diff check passed |
| Mocked/source UX | Connected creation does not invoke Table capture; locked mode, muted host, count/QR invite/end/new; guest explanation before permission, meter and release-before-muted-join |
| Lifecycle/state | Muted entry/re-entry; cleanup on mute/leave/end/removal/disconnect; visibility/blur do not invoke mute; exact identity, duplicate names, multi-interims, rename history, stale-event rejection, stream deduplication |
| Live SQL | `supabase/tests/connected_rooms.sql`: rollback-only checks passed for transactional identity/reuse/name/expiry/end/removal, table RLS, private topic checks, shared Presence denying Broadcast, guest-denied service RPC |
| Live Auth/Realtime | Three disposable anonymous identities per attempt; authorized guest broadcast reached host; outsider and another-participant subscriptions denied; guest host-control send denied |
| Live failure | First authorized private subscription returned a generic failure; second diagnostic attempt passed. No precise root cause established. No policy weakening used |
| Relay timing | One small synthetic send→host-receive sample ~169.9 ms, measured within the same Node process. This is not phone, STT, average, percentile or production latency |
| Browser | Existing local dev server; mode selector/missing-configuration feedback; history open/Escape close; Full Screen entry. Phone-width 390×844 participant name/setup-unavailable screen rendered. Configured host creation/QR, muted You, participant count, locked mode, pending explicit mic activation canceled by End, and ended-invitation rejection were observed. Only IAB was available; no independent guest browser |
| Cleanup | Synthetic rooms ended and six disposable Auth users deleted; associated memberships/rooms cascade-deleted. Query confirmed zero fixture rooms remain. Rollback fixtures retained nothing |
| Physical devices/audio | Not performed. No real microphone/provider session, phone QR scan, simultaneous speech, background app switch, sustained session or Wake Lock observation |

The browser/OS may suspend audio execution. Visibility changes alone do nothing to audio/room state; actual microphone-track loss or AudioContext suspension/interruption is treated as unhealthy capture and visibly stopped. Room transport loss stops capture and requires muted re-entry. STT-only loss retries three times with identity intact. Wake Lock is best-effort while visible and is not background execution. No native-call guarantee is claimed.

The relay transport also measures sender-clock round-trip acknowledgements in memory (`RoomView.relay`). Those are upper-bound relay observations, not synchronized one-way phone-clock measurements; no caption buffering is introduced for measurement.

Dependency audit reports five high findings in the existing development-only ESLint→fast-glob→micromatch→braces chain. No runtime Supabase/QR advisory was reported. The suggested automated fix downgrades eslint-config-next across major versions, so it was not applied as unrelated tooling migration. Review separately.

## Retained limitations / progression

The user-observed deployed product acceptance closes CAPTION-003 for progression. Previously unperformed checks remain unverified: physical-device QR scan/join, detailed real microphone/provider session behavior, simultaneous speech, sustained session, background app-switch and Wake Lock behavior. No quantitative latency, accuracy, cost, or provider metrics were reported. These are retained evidence limitations and do not change the recorded acceptance decision.

Planner may begin CAPTION-004 architecture planning. CAPTION-004 implementation has not started.

Opt-in infrastructure replay is provided by `scripts/verify-connected-realtime.mjs`. It takes URL/publishable key on stdin, keeps access tokens in memory, prints opaque fixture IDs/hash, then expects room/host/guest membership IDs after authorized synthetic metadata creation. It is not part of `npm test`. Run only on a chosen development project and clean up exactly its printed disposable users/rooms afterward. The companion SQL test is transaction/rollback-only.
