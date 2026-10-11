# CAPTION-003 — Connected Mode / QR Participant Rooms

**Status:** REOPENED / PARTIAL FOR PROGRESSION - CAPTION-003.1 implementation verified automatically; physical-device duplicate-suppression acceptance pending.

Earlier user acceptance of deployed Connected Mode and UI remains historical evidence. The latest deployed user testing revealed duplicate physical speech captured by nearby personal microphones, so CAPTION-003 is open again. Exact device/browser matrix, number of microphones, before/after duplicate counts and timing measurements were not provided. CAPTION-004 is deferred; no Hybrid or room mic implementation has started.

## Changed and architecture

Mode selector locks during an active session. Table Mode retains its room microphone, diarization and speaker management. Connected Mode creates a temporary room, joins the host as navy You muted, and automatically opens a local QR invitation. Host controls include self-mic, Participants, invite/removal, history, Full Screen and end.

`/join/[token]` provides display name → mic explanation → permission → input meter (no STT) → release test mic → join muted → explicit Unmute. Guest page is a personal microphone endpoint with rename and leave, without transcript/audio playback. Real re-entry is always muted; healthy tab/app switches are not treated as re-entry.

Transport, microphone and room lifecycle are application-owned classes under `src/lib/rooms`, outside presentation components. Exact microphone/source identity is assigned from the authorized participant channel; physical speaker identity requires cross-mic reconciliation. Independent interims feed the existing continuous transcript; finals append in host ingest order. Registry rename updates historical labels without rewriting caption objects. Disconnected/removed identities remain available for history.

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
| Automated | Original pass: 51 tests / 12 files. CAPTION-003.1: 93 tests / 13 files; typecheck, lint, production build and diff check passed |
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

The later deployed duplicate report supersedes the prior closure decision. CAPTION-003 remains open pending user acceptance of cross-microphone suppression; CAPTION-004 is deferred.

## CAPTION-003.1 algorithm and confidence

Application-owned `src/lib/captions/cross-mic-reconciler.ts` compares authorized Connected events synchronously in host memory, after channel identity binding and removal filtering, before the existing reducer. Table provider/model/UI and room authorization/transport remain unchanged. No new dependency, comparison request, transcript storage/logging, LLM, model migration, Voice Focus or deliberate buffering delay.

| Policy | Initial value |
|---|---|
| 4+ token matching | Ordered token Dice (LCS) >=0.85; host-receive delta <=1800 ms |
| 3 tokens | Exact normalized text; <=600 ms |
| 1-2 tokens | No cross-source suppression |
| Interim confidence improvement | >=0.15, only with both valid scores and before commitment |
| Memory bounds | 128 recent turns; max 256 comparison tokens; 4 s inactivity / 15 s total life |

Comparison normalizes NFKC/case/punctuation/whitespace, a small explicit unambiguous contraction list, and standalone zero-ten words. Original display text stays intact. Pre-expansion word counts keep short contractions such as I'm sorry conservative. Negation/numeral conflicts preserve speech. Same-source distinct turns do not merge; groups can contain three or more sources. Matching partials can later diverge and split. Active-turn guards ensure CLEAR_INTERIM does not erase unrelated newer partials. Known matched turn IDs remain followers through delayed finals until divergence/expiry; they cannot extend admission windows to merge later speech. Generation guards reject callbacks from released transports. State prunes on events and existing three-second room ticks, resets on room release/re-entry, and discards removed sources.

Provider adapter preserves the arithmetic mean of finite [0,1] word confidence values in each caption segment as `recognitionConfidence`; missing/invalid values are ignored, with undefined when none are valid. End-of-turn `confidence` is unchanged. The earliest established source normally leads. A materially stronger recognition score can select another interim leader; tiny differences cannot. The first finalized text is committed immediately under the selected visible label, retaining its actual microphone/source provenance. A follower may provide that first final; no partial text is manufactured into a final. Subsequent matching followers are suppressed and final attribution frozen, including late accepted-source revisions after the reconciler cache expires.

## CAPTION-003.1 verification and real-device acceptance

Automated tests cover capitalization/punctuation/whitespace/Unicode, numbers/contractions, near-identical and unrelated/partial text, exact/near final suppression, independent interims, short acknowledgements, same-source repetitions, three sources including You, follower cleanup, first-final immediacy, speaker stability/confidence, diverging prefixes, removal, expired caches/bounds and Connected controller re-entry. Existing Table, provider/model, host/guest UI and room lifecycle tests continue passing. UI source/header/layout untouched.

No Builder physical-device/audio UAT performed for this correction. No before/after real duplicate counts, false suppression, missed suppression, interim switching, perceived latency or device matrix measured. The user supplied the observed pre-fix issue; synthetic examples are not field measurements. No synchronized phone clocks assumed.

After the pushed Vercel Git deployment, run two phones naturally positioned: A speaks with both mics open (one final), B speaks (one final), both speak different sentences (two independent streams), both say Yes (both retained); then one speaker with three open mics (one result when sufficient matching evidence). Record devices/browsers, mic count, duplicates before/after, false/missed suppression, label switches and perceived latency. No accuracy percentages inferred from a few examples. User acceptance is required before CAPTION-003 closes.

Known limits: matching cannot determine the true human speaker or the closest mic; higher STT confidence is not proof of ownership. Identical longer speech by different people in the window can falsely merge. Delayed/short/differently recognized/oversized duplicates can remain. Already accepted distinct finals are not retroactively removed. Provider turn segmentation differences can miss duplicates. Thresholds may need evidence-based tuning.

Opt-in infrastructure replay is provided by `scripts/verify-connected-realtime.mjs`. It takes URL/publishable key on stdin, keeps access tokens in memory, prints opaque fixture IDs/hash, then expects room/host/guest membership IDs after authorized synthetic metadata creation. It is not part of `npm test`. Run only on a chosen development project and clean up exactly its printed disposable users/rooms afterward. The companion SQL test is transaction/rollback-only.

## CAPTION-003.1 publication

Implementation commit `c8c95166dadd281801764d0154ae2c60b936d391` is pushed to main. GitHub reported the configured Vercel deployment check successful: [Vercel deployment](https://vercel.com/madziyis-projects/caption-assist/3P9W5V6gqpR91WYzB6toEAmjv8MV). This verifies deployment status, not physical-device caption/audio behavior. All 93 tests / 13 files, typecheck, lint, build and diff checks passed. Real-device acceptance remains pending.

## Failed real-device acceptance: observation-only diagnostics

The user subsequently tested CAPTION-003.1 on real co-located devices and still observed duplicate captions. Acceptance failed. The previous pending-acceptance publication entry is historical; no cause established and no matching constants changed in this task. CAPTION-003 remains open; CAPTION-004 has not started.

Open the deployed host with ?captionDebug=1 before room creation/restoration. Only Connected Mode shows the temporary panel. It retains the latest 30 comparison decisions in host memory and resolves opaque IDs to roster display names locally. Clear affects diagnostics only; Copy diagnostics exports configured constants and scalar opaque-source metrics without caption text/tokens, participant names, turn IDs, credentials or invitation URLs. Reload discards the ledger; ending a room leaves metrics copyable but drops pending working/expiry metadata. No diagnostics sent to Supabase or any other service.

4+ words: unchanged 1800 ms / 0.85 ordered token Dice. 3 words: unchanged 600 ms / exact only. 1-2 words preserved. The containment score is the actual length-bound gate 2*min(token lengths)/sum(token lengths). Records expose delta, host receive/final-commitment time basis, event kinds, word counts, similarity, configured gates, exact result and decision/reason. Window-bypassed existing-cluster comparisons and structural skips (both finals committed or source overlap) are labeled. Similarity for an earlier rejected/skipped gate is supplemental observation, calculated after caption actions dispatch; it was not used to change that decision. Expired-final hints compare only source/time/word-count metadata; old text is not retained or compared, so they cannot prove duplicate speech.

Verification: 109 tests / 15 files, typecheck, lint and production build passed; final diff check before publication. Tests verify match/failure/short/expiry/oversized/conflict/skip records, bounded private metrics, disabled default, same caption actions/clock calls/constants, Clear/Copy and Table hiding. Local IAB confirmed empty panel, constants/controls, ordinary Connected hiding and no overflow at measured 1280/391 CSS pixels. No Builder physical-device/audio UAT or new real accuracy/latency measurements performed.

Next physical test: naturally position two devices (then three); clear before each case, have each owner speak, use different simultaneous sentences and simultaneous Yes. If duplicates escape, copy immediately before the 30-record window rolls over. Record mic count, browser/device context, visible duplicate count, missed/false suppression, interim label switching and perceived latency separately. Review delta/reason/similarity/exact/skip/expiry metrics before proposing a targeted correction. Do not close CAPTION-003 without user acceptance.

## Reconciliation diagnostics publication - 2026-10-11

- Implementation `a308e231b3c14a6f319cb4096692d64ad0d2da77` pushed to main. GitHub Vercel check reported success: [Deployment status](https://vercel.com/madziyis-projects/caption-assist/Hy8PjJApogR2SvEXk9oX8m9yfY2u). Existing Git workflow used; no hosting/provider configuration changes.
- All required gates passed: typecheck, lint, 109 tests / 15 files, production build and staged diff check. Source and local browser verification do not establish physical-device suppression acceptance. CAPTION-003 stays open; next test uses ?captionDebug=1.

## CAPTION-003.2 episode correction

The next deployed diagnostic export supplied two root causes. A 53-word versus 55-word pair arrived about 13 ms apart with ordered similarity about 0.889 and containment about 0.991, but ordinary `negation_conflict` kept it. A later comparison showed 53 words versus 14 words about 94 ms apart, demonstrating that independent AssemblyAI sessions can segment the same speech differently. These observations are the basis for this correction; global similarity and ordinary windows were not lowered or widened.

`CrossMicReconciler` now retains a bounded SpeechEpisode association in memory. Strict episode admission requires 8+ words, <=300 ms host receive delta, ordered similarity >=0.85 and short-side LCS coverage >=0.90. It can override an isolated negation disagreement only in this very-strong tier; numeral conflicts still preserve separate speech. Once established, sources can continue across provider turn IDs with a <=3000 ms continuity window, at least 5 words, and short-side coverage >=0.70 or similarity >=0.25. Rolling source context is limited to 100 normalized comparison tokens and episodes expire with bounded inactivity. The original ordinary 1800 ms / 0.85 path and conservative 1-2-word policy remain for unassociated speech.

Episode members do not make waiting intentional: the first final is still immediate. Later compatible provider segments are suppressed/cleared as duplicate episode material, while no final is synthesized and committed speaker attribution remains frozen. After expiry, genuinely different speech starts new independent episodes. Diagnostics retain only scalar metrics and expose episode creation, source join/continuation, strong/partial evidence, negation override and expiry; the existing panel remains opt-in at `?captionDebug=1`.

Publication: `d342b1067f88371324386bd1d48d73a2ac5ffe14` pushed to `main`; [Vercel deployment status](https://vercel.com/madziyis-projects/caption-assist/9ecVb4HfyXM5dH6kSScCaLZvHPit) reported success. Final verification passed with 115 tests / 15 files, typecheck, lint, production build and diff check. This does not establish real-device acceptance.

## CAPTION-003.3 Voice Focus acoustic A/B

Both transcript-side CAPTION-003.1 matching and CAPTION-003.2 episode continuity failed real co-located microphone acceptance. This experiment measures whether AssemblyAI Voice Focus makes each personal stream sufficiently local before transcription. It does not lower global text thresholds and does not start CAPTION-004.

Table Mode remains `universal-streaming-english` with `speaker_labels=true`. Connected personal streams, including host `You`, use `universal-3-6-pro`, `speaker_labels=false`, `voice_focus=<profile>`, `mode=balanced`, `sample_rate=16000`, `format_turns=true` over the existing v3 WebSocket. `NEXT_PUBLIC_CONNECTED_VOICE_FOCUS_PROFILE` accepts `near-field` or `far-field`; invalid/missing values default to `far-field`, which is the initial phone-on-table test profile. The exact query key is `voice_focus` and values use hyphens.

ConnectedRoom bypasses CrossMicReconciler during this A/B and dispatches authorized participant events directly into the existing reducer/order path. The reconciler and all tests/history remain available for later comparison. `?captionDebug=1` shows Connected STT model/profile/mode and `Text reconciliation: OFF`; it does not activate hidden suppression. Connected identity remains authorized channel identity, never a provider speaker label. Temporary AssemblyAI tokens and server-only `ASSEMBLYAI_API_KEY` are unchanged. Provider configuration errors surface a non-secret rejection category; no silent Universal Streaming fallback is used.

Verification tests cover Table/Connected models and diarization, exact Voice Focus parameter spelling and hyphenated profiles, safe defaults, balanced mode and direct Connected bypass. Real-device Voice Focus UAT is pending; do not claim activation from a WebSocket opening alone. Test far-field first using the prior duplicate arrangement, then near-field only if the physical setup warrants it or far-field is inadequate. Record duplicate persistence, owner accuracy, wrong-stream interim leakage and perceived latency.

Publication: `dcbd894beb00388f7446679c6360a2623e4a9676` pushed to `main`; [Vercel deployment status](https://vercel.com/madziyis-projects/caption-assist/8Mi3AjeoW5mRSFW614MsqhfbyJMC) reported success. This confirms deployment only; no physical microphone/provider speech session was performed in this implementation pass.
