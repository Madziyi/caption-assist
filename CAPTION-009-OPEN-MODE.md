# CAPTION-009 — Open Mode + Pro STT + Stable Reading

## As built — 2026-10-24

Baseline: clean fetched `619154d8e303a793ec469096d442cf89a982604d`. Human request superseded CAPTION-008.4 follow-up. Only Open (default) and Headset are selectable; Headset has no test label. Open starts local `ConversationSession`, never a Supabase room. Headset creates only `create_headset`.

### Provider contract

| Parameter | Open | Headset |
|---|---|---|
| speech_model | universal-3-6-pro | universal-3-6-pro |
| speaker_labels | true | false |
| mode | balanced | balanced |
| interruption_delay | 0 | 0 |
| sample_rate / format_turns | 16000 / true | 16000 / true |
| speaker_labels_revision_interval_ms | 120000 | absent |
| voice_focus | absent (off) | near-field |
| min_turn_silence / max_turn_silence | absent (semantic defaults) | 100 / 1000 |

AssemblyAI remains production STT. Existing optional OpenAI shadow is preserved, not exercised by this task and never produces captions. No dependency/security/provider benchmark work was added.

### Open reading derivation

`openReadingBlocks(finalized, interim)` is pure, without timers, persistent state or reducer mutations. Adjacent same-speaker finals group within 2000 ms and 80 words. Long provider turns use presentation-only word slices; raw stored text remains intact. Stable block keys use the first caption/slice ID.

Interim text appears immediately in the current natural reading window even when its label is unknown or temporarily different. Finalized different known labels create boundaries, including a one-word interjection. Runs of unresolved finals bridge only between equal surrounding known finalized identities and continuous timing. Leading/trailing unresolved finals, A/null/B and long-pause uncertainty remain neutral. This deliberately does not invent finalized identity.

Every revision recomputes presentation from corrected reducer state; merges and splits leave no second copy or stale label. Names resolve through current speaker profiles at render time. History remains finalized-only. `aria-live=polite`, `aria-atomic=false`, quiet DOM updates and no motion effects. Header wrapping was fixed after enlarged-text overflow was reproduced.

### Removal and reference classification

Repository searches classified Connected references as: (1) retired runtime/UI/provider/voice association, removed; (2) shared Headset infrastructure, preserved/renamed; (3) generic network Connected/disconnected or hardware connection words, retained; (4) legacy persistence guards, tests, database constraints/RPC and migration history, retained; (5) historical LOG/QUALITY/spec evidence, retained and marked retired where active-roadmap wording conflicted.

Removed: VoiceIdentityRegistry/module/tests, identify requests/phases/acknowledgement/Presence metadata/control events, host room-microphone lifecycle, aliases/actions/render/history transformations, Connected provider helpers/environment access, personal microphone class, old cross-mic reconciler and diagnostic runtime/panel. Headset imports only unchanged comparison helpers extracted into `comparison.ts`. No future-Hybrid runtime is kept. `ConnectedRoom` becomes `HeadsetRoom`; participant profile origins/actions are memory-only and renamed `headset-host`, `headset-participant`, `HEADSET_START`, `HEADSET_SPEAKERS`.

Preserved: room creation/expiry/invites/QR, anonymous auth, membership, rename/remove/end, private topics and topic-bound identity, caption relay, Presence snapshots, setup/input selection, calibration/room check/sensitivity, local gate, look-ahead, arbitration constants, speaking indicators and Headset rendering.

### Persistence and security

No schema migration, RLS/policy/retention change. Database check values connected/headset and old service-only create operation remain for historical compatibility. Current authenticated app API rejects `create`; preflights room mode before join/rename/remove/end/invite, ignores legacy restores, rejects old invitations with HTTP 410. Controller/participant checks also fail closed; room-scoped transcription tokens reject legacy rooms. No automatic migration. Database rooms expire normally.

A direct catalog query confirmed security-invoker RPC with no anon/authenticated EXECUTE and service_role EXECUTE, plus existing application-read and Realtime send/receive policies. The full rollback SQL regression attempt returned connector `Invalid or expired requestState`; no passed SQL regression is claimed. Private-topic source tests and live authorized Headset transport pass. No new credentials or audio/transcript storage/logging.

### Verification

- Typecheck, lint, serial Vitest: 191 tests / 37 files passed after obsolete Connected tests/runtime were removed; existing active Headset suites preserved.
- Production build: Next.js 16.4.1 passed. Final post-documentation gates recorded in LOG/QUALITY.
- Actual HomePage in isolated Chromium with real fake-media capture/worklet and mocked provider: two modes/default, keyboard start, immediate interim, unknown bridge, short interjection, revision merge/split, naming, stop and aria semantics passed. 390/1280 px at 100/200% text: no horizontal overflow, zero page errors. Screenshot inspected.
- Existing Headset readability browser regression: picker/help, phone failure/speaking, host pills, flow/removal, reduced motion and both widths/text sizes passed. Existing setup browser: three captures/routes, selected track and restart passed.
- Open real provider smoke using exact source options: Begin 1, Turn 6, SpeakerRevision 1 (session end), Termination 1, Error 0. Begin confirmed Pro/balanced/diarization/Voice Focus null. Three synthetic speaker labels were returned for two synthetic voices; this is expressly not human diarization-quality proof. The session was short; 120-second mid-session revisions were not observed.
- Existing live Headset browser regression: host + two independent fake-media phones, live Supabase + AssemblyAI, four target phrases once each, zero wrong names/misses/duplicates, four text suppressions; bypass two duplicate target lines/two wrong names. Both phones Begin/Turn/Termination, zero provider/page/quota errors, zero host capture. Rooms ended, browsers/server closed, synthetic files deleted by runner. Headset gates/provider/arbitration constants unchanged.
- Physical Open/Headset acceptance, screen-reader-device UAT, Bluetooth/wired acoustic quality and long-session behavior remain unverified.

### Physical acceptance handoff

1. Open: one person speaks naturally for 30–60 seconds with pauses/hesitation and an 80+ word thought. Check quick words and stable readable paragraphs.
2. Open: alternate complete sentences between two people. Check confirmed changes remain clear.
3. Open: A speaks, B says "Yes", A continues. Check the finalized interjection has its own block.
4. Open: watch temporary Someone labels; later same-speaker correction must regroup without duplicates/stale blocks.
5. Open: run over two minutes and observe any SpeakerRevision regrouping. Record first-text feel, unnecessary splits, missed or incorrectly merged genuine changes and ease of reading; no invented percentage scores.
6. Headset: short two-person wired/Bluetooth conversation; confirm exact names, unchanged duplicate handling and similar perceived latency. No new provider benchmark.

Hybrid and CAPTION-005/006/007 are not started. CAPTION-003 experiments remain historical evidence.

### Publication

Implementation `bc73b191ac034f629231b0ede87235f4cbecbd65` pushed to main. Vercel reported success: [deployment status](https://vercel.com/madziyis-projects/caption-assist/3fngbgtCfXZaasrfLg1eSNX95Kmh). This confirms a deployment check, not physical or deployed-microphone acceptance. Documentation-only publication is checked separately in the final Builder response.
