# Project

## Name

**Accessible Conversation Captions** — working title.

## Purpose

Build a production-grade, low-cost real-time captioning system that allows a Deaf or hard-of-hearing participant to remain engaged in ordinary in-person group conversations. The participant can speak normally and read what others say on a nearby laptop, tablet, or phone.

The product must work immediately with one host device, while allowing nearby participants to optionally join by QR/link and contribute their own microphone for stronger speaker attribution and audio quality.

## Primary users

- Deaf or hard-of-hearing participants who can read live captions and speak for themselves.
- Friends, family, classmates, coworkers, and other participants in the same physical conversation.
- Administrators/supporters configuring devices only when needed; daily use should not depend on technical assistance.

## Core product principles

- **Conversation first:** the technology should disappear behind the interaction.
- **Works with one device:** other participants must not be required to install or join anything for the system to function.
- **Progressive accuracy:** optional participant phones/microphones improve quality without changing the basic experience.
- **Caption-first UX:** optimize for glanceable, readable live conversation rather than meeting-note transcription.
- **Low latency:** partial captions should feel conversational, not delayed like a post-meeting transcript.
- **Failure must be visible:** never silently appear to be listening when audio/transcription is broken.
- **Privacy by default:** no raw audio retention and no durable transcript retention unless explicitly enabled later.
- **Low operating cost:** architecture and provider choices should support hours of daily use without premium accessibility-device pricing.
- **Evidence over assumptions:** provider claims are not accepted as proof until tested on representative conversations.

## Product modes

### Open Mode (default)
One device and one room microphone capture everyone speaking naturally. AssemblyAI Universal-3.6 Pro produces immediate captions with live diarization; ordinary speaker naming remains available. No room, QR, membership or voice-identification procedure is needed.

Open uses `speaker_labels=true`, `mode=balanced`, `interruption_delay=0`, `speaker_labels_revision_interval_ms=120000`, formatted turns and mono 16 kHz PCM. Voice Focus is off; explicit minimum/maximum silence overrides are absent. The provider's semantic endpointing owns these defaults.

The raw reducer preserves turn IDs, text and speaker assignments for correction/history. `OpenTranscript` derives `openReadingBlocks()` from current state: immediate interim words, conservative provisional boundaries, same-speaker flow, 2 s pause and 80-word paragraphs, confirmed different-speaker boundaries, and recomputation after revisions. Unknown finalized speech is bridged only when surrounding finalized speakers agree within the reading window; otherwise it stays neutral. Names resolve at render time. No second stored transcript or visual debounce.

### Single Speaker Mode
For sermons, lectures or one person speaking: one local microphone, no room or diarization. Uses Universal-3.6 Pro, balanced, interruption_delay=0 and explicit include_partial_turns=true; Voice Focus, speaker revision interval and silence overrides are absent. Words render as partials arrive; no waiting for finalization or pauses. Paragraphs contain 80 words across provider turns, with the 81st live word starting the next paragraph. Pause duration never creates a paragraph. No speaker labels/naming; history remains finalized-only. Pure presentation preserves source text/turns and correctable interims, without another transcript or storage. Open remains default; Headset remains unchanged. See `CAPTION-010-SINGLE-SPEAKER.md`.

### Headset Mode
The accepted CAPTION-008 architecture remains: one headset/phone per speaker, calibration and room check, local loudness gating with 300 ms look-ahead, continuous sensitivity, authorized participant caption relay, cross-phone arbitration, speaking indicators, and flowing reading blocks. Names come from the participant channel; no diarization is required. Host capture is optional and starts only through headset setup. Supabase supplies private transport, membership, expiry and invitation links.

Headset provider settings remain Pro / no speaker labels / near-field Voice Focus / balanced / 0 ms interruption / 100 ms minimum silence / 1000 ms maximum silence. OpenAI remains observation-only behind the existing `?sttBenchmark=1` opt-in; it cannot supply production captions.

### Retired Connected Mode and deferred Hybrid Mode
CAPTION-003 is retired from the active product. Its historical experiments and failures below remain evidence, not active contracts. Room controller is now `HeadsetRoom`; voice identification, room microphone lifecycle, aliases and dormant personal-mic reconciliation runtime are removed. Only comparison helpers used by Headset arbitration survive in `comparison.ts`.

Database `connected` values and the service-role-only legacy RPC remain for expiring historical data. Current app/API never creates, joins, restores or uses Connected rooms: old restores return null; invitations/mutations fail with "This conversation is no longer available." No schema migration or automatic conversion. In-memory origins/actions were renamed to Headset terms; they are neither persisted nor externally transmitted.

Hybrid Mode is deferred as a separate future initiative. Design it from future evidence; no dormant runtime is retained for it. As-built details and physical UAT: `CAPTION-009-OPEN-MODE.md`.

## Historical contracts (retired/superseded by CAPTION-009)

## CAPTION-003 source contracts — 2026-10-11

- Supabase is the room/network layer; AssemblyAI remains STT. Pinned `@supabase/supabase-js` 2.117.3 and local-only `qrcode.react` 4.2.0.
- Anonymous technical sessions persist through Supabase Auth; there is no visible account UX. Room and participant metadata alone are stored in Postgres. Raw audio and caption content are never stored there.
- Server-only room mutations authenticate bearer tokens with `auth.getUser`, then call a service-role-only transaction. Invitations contain 256 random bits; only SHA-256 hashes are stored in the room table. Rooms expire after 24 hours; end/expiry invalidates invitations.
- Database membership owns ID, name, role, color and removal. Same-user rejoin preserves identity/color/name; duplicate names on different memberships remain distinct. Guests may rename themselves; host cannot rename guests or remotely unmute them.
- Private control topics permit only host publication. Private participant topics permit only the owner to publish captions/state, and the host to receive. Room-wide Presence is only a discovery hint; its payload is ignored. Per-participant Presence supplies connection/microphone state with channel-owned identity. Three-second metadata reconciliation provides fallback for rename, missed control, expiry and removal.
- Application-table RLS restricts reads to membership/host ownership. Internal membership helpers are in non-exposed `caption_private`, with explicit caller identity, fixed search paths and restricted execution. The mutation RPC is security-invoker and executable only by `service_role`.
- The host independently rejects events from removed participants and ended rooms, covering cached Realtime authorization. Captions use application stream/turn IDs and membership identity, not provider labels or Supabase auth IDs. Per-stream sequence numbers reject duplicates; finalized display order is monotonic host ingest without device-clock reordering.
- Independent Connected interims feed the existing continuous transcript after CAPTION-003.1 cross-microphone reconciliation. The chronological viewport, internal scroll, live label styling, optional newest-first history side panel, Full Screen and Table speaker naming remain intact. Names resolve through the registry, including past captions.
- Mute/leave/end/removal/real room disconnect stop capture and transmission. Permission acquisition is cancellable by cleanup; streams obtained late are stopped. STT-only interruption retries a bounded three times without changing room identity; failed speech recovery becomes muted with visible feedback. Provider sockets close on mute for straightforward cleanup; cost optimization remains out of scope.
- Visibility and blur never intentionally mute/disconnect. Actual track loss or AudioContext suspension/interruption produces visible failure and stops unhealthy capture. While the browser/OS permits execution, personal audio and room connections continue across app/tab switches. Screen Wake Lock is supplemental, best-effort and reacquired when visible; it is not background execution.
- Host refresh restores the latest open room for the anonymous identity, muted. Transcripts remain memory-only and are lost on full refresh. Only invitation metadata is optionally held in sessionStorage. If that invitation is unavailable after refresh, host requesting Invite rotates the hashed invitation; previous link then becomes invalid.
- Development request-path logging is disabled and referrers suppressed to avoid leaking invitation URLs. Hosting/proxy logging must also redact `/join` credentials when deploying; no hosting was configured in this pass.
- See `CAPTION-003-HANDOFF.md` for verified layers, setup and remaining device UAT. CAPTION-004 has not started.

## CAPTION-003.1 cross-microphone reconciliation contract

- Participant identity authorizes the microphone/source, not mathematically the human speaker. Preserve membership identity, private channels and original event source/turn IDs; the selected visible speaker may be a matching cluster leader.
- `CrossMicReconciler` in the application caption domain runs synchronously after authorized `exactIdentity` delivery and membership/removal filtering in ConnectedRoom, before reducer actions. Table Mode bypasses it. Source IDs are generic so a future approved room-mic adapter can reuse the abstraction, but no Hybrid/room microphone is implemented.
- Host-local `performance.now()` receive times govern comparison; device/provider timestamps do not order or match cross-device speech. No caption buffering, API/LLM, comparison network call, Supabase caption write, new model or Voice Focus.
- Comparison-only NFKC/lowercase/punctuation/whitespace tokenization expands a small explicit set of unambiguous contractions and standalone zero-ten number words. Displayed text stays intact; pre-expansion word counts keep short contractions conservative. Ordered token Dice via longest common subsequence requires >=0.85 for both turns of 4+ tokens within 1800 ms. Admission windows do not extend after a final; already matched turn IDs remain followers until divergence/expiry. Three tokens require exact normalized text within 600 ms; 1-2 tokens never cross-deduplicate. Conflicting negation or present-on-both-sides numerals block matching.
- Multi-source clusters have at most one turn per microphone; same-source new turns cannot match their own prior clusters. First-established source leads; valid mean word recognition confidence can change an interim leader only with >=0.15 improvement. Missing confidence is not treated as zero. `recognitionConfidence` is distinct from provider end-of-turn `confidence`.
- First final displays immediately, using that final's original wording and microphone provenance with the selected leader's visible label. Commit freezes that label; later follower finals/revisions do not enter history. Accepted-source revisions preserve final attribution even after cache expiry. Clear only interims whose currently active turn belongs to the matched cluster, never unrelated newer turns from that source. Diverging partials split conservatively.
- State is memory-only and bounded to 128 recent turns, 256 comparison tokens per turn, 4 seconds inactivity and 15 seconds absolute cluster life. Oversized turns bypass comparison. Prune on events and existing 3-second room reconciliation ticks; reset on release/re-entry, discard removed sources. No transcript text is logged. In-memory diagnostics expose counts only.
- Limitations: text/time cannot prove which physical person spoke; distinct people repeating the same longer sentence closely may be merged. Short speech, delayed duplicates, markedly different wording, oversized turns and insufficient common partials may remain duplicated. Already committed separate finals are never retrospectively deleted. Thresholds require real-device acceptance; CAPTION-003 is reopened until that acceptance. CAPTION-004 remains deferred.

## CAPTION-003.2 episode reconciliation correction

The deployed diagnostics showed two concrete CAPTION-003.1 failure modes: a 53-versus-55-word match at roughly 13 ms and 0.889 ordered similarity was rejected by the ordinary negation guard, and later provider segmentation produced 53-versus-14-word finals. The reconciler now retains a bounded SpeechEpisode association in host memory after strict evidence, rather than requiring every provider turn to remain the same turn ID.

Initial episode evidence requires at least 8 words, at most 300 ms host receive delta, ordered similarity at least 0.85, and short-side LCS coverage at least 0.90. This tier may tolerate an isolated negation disagreement; numeral conflicts remain protected. Episode continuation uses at most 3000 ms, at least 5 words, and short-side coverage at least 0.70 or similarity at least 0.25 for an already-associated source. The existing ordinary 1800 ms / 0.85 matcher and short-speech policy remain unchanged for unrelated sources. Rolling source context is capped at 100 comparison tokens and episode inactivity remains bounded by the existing 4-second lifecycle.

Episode members can receive new provider turn IDs and revisions without immediately splitting the episode. Accepted episode followers are suppressed or cleared using the existing reducer actions; no final text is fabricated and speaker attribution remains frozen after the first committed final. Episode diagnostics expose creation, joins, continuation, expiry, strong/partial evidence and the negation override as scalar metrics. Table Mode, Supabase transport/RLS, AssemblyAI configuration, persistence and CAPTION-004 remain unchanged.

## Planned technology stack

## CAPTION-003.3 Voice Focus acoustic A/B experiment

Transcript-side CAPTION-003.1 and CAPTION-003.2 reconciliation both failed real co-located microphone acceptance. CAPTION-003.3 therefore tests the acoustic/STT layer independently. Table Mode remains `universal-streaming-english` with `speaker_labels=true`. Connected personal streams, including host `You`, use `universal-3-6-pro`, `speaker_labels=false`, `voice_focus` with the profile from `NEXT_PUBLIC_CONNECTED_VOICE_FOCUS_PROFILE`, `mode=balanced`, `sample_rate=16000`, `format_turns=true`, and the existing v3 WebSocket. The valid profile values are `near-field` and `far-field`; invalid or missing values default to `far-field`.

The Connected host path bypasses text reconciliation for this experiment. `CrossMicReconciler` and its episode/diagnostic history remain in the repository for future comparison, but no hidden text suppression runs while measuring Voice Focus. Authorized participant channel identity remains authoritative and provider speaker labels are not used for Connected identity. The temporary debug panel reports the Connected STT model, Voice Focus profile, balanced mode and `Text reconciliation: OFF`; it remains hidden during normal product use. The server-generated temporary token path and server-only `ASSEMBLYAI_API_KEY` remain unchanged. No fallback to Universal Streaming is permitted after a Pro/Voice Focus configuration rejection.

These are architectural intentions until verified by repository implementation and live configuration.

## CAPTION-003.4 room-microphone diarization contract

Supersedes the personal-microphone parts of the CAPTION-003 source contracts (participant mute/unmute, microphone check, per-participant caption relay, per-stream sequence numbers, Wake Lock), the CAPTION-003.1–003.3 contracts above and the temporary diagnostic contract below. Those modules stay in the repository, unwired, for Hybrid Mode. Rooms, membership identity, RLS, invitations, expiry, removal, rename and the accepted header/layout are unchanged.

- Audio: only the host captures audio in Connected Mode, through the existing `ConversationSession` and temporary-token path. Connected uses `CONNECTED_ROOM_ASSEMBLYAI_OPTIONS`: Table's `universal-streaming-english` with `speaker_labels=true` and `format_turns=true`, plus `speaker_labels_revision_interval_ms=120000` (AssemblyAI's minimum; the first mid-session revision follows about two minutes of audio). The room microphone lifecycle is independent of room networking: Supabase reconnects do not stop captions; ending the conversation or the room becoming unavailable stops it. A restored host room waits for an explicit **Start room microphone** gesture.
- Provider: `SpeakerRevision` messages are parsed in the documented `revisions: [{ turn_order, speaker_label, words }]` form and applied to the remembered final text of that turn. Words without a speaker inherit the turn label. Session start time is stamped when the socket opens so caption start times track the provider's audio clock. Each provider connection has a fresh `assemblyai/<uuid>` speaker namespace.
- Voice identity: `VoiceIdentityRegistry` maps diarized speaker IDs to participant IDs in host memory only. Identification windows are queued one at a time, last 20 s, use final turns only, ignore unresolved labels and speech that started more than 1.5 s before the request, and bind the most-heard speaker after at least 5 words. A speaker already bound to another participant is never taken by a new request. Bindings keep up to 6 evidence turns and are recomputed from those turns after revisions, so the name follows the corrected speaker; the reducer resolves aliases at render time, including history. Phases: unidentified, waiting, listening, identified, not identified, needs to identify again. A new provider connection marks identified people "needs to identify again" while earlier history keeps their names.
- Signalling: a phone publishes its request as presence state `{ online: true, identify: <request id> | null }` on its own private participant channel. The host applies each request ID once per participant (surviving transport reconnects) and treats a withdrawn request as cancel. Host-only control broadcasts `voice-identification` with `phases` and `requests` (the request ID each phase answers), validated on receipt. The phone stops requesting only when a phase naming its own request reports an outcome, which makes stale or reordered broadcasts harmless; after 10 s without acknowledgement it withdraws and shows a notice. No migration was needed: the CAPTION-003 private-topic policies already scope participant topics to the owner (publisher) and host (receiver), and control publication to the host.
- Privacy: no voiceprints, embeddings, audio or biometric templates are created or stored by the application; the mapping is ordinary in-memory association between provider labels and participants for one conversation and is discarded when the room ends, changes or the host refreshes. Caption text remains memory-only and is not sent to Supabase.
- Limitations: diarization can merge similar voices, short replies can be mislabelled before revisions, overlapping speech gets one label, and people speaking during someone else's window can mis-bind it (re-identification replaces it).

## CAPTION-008 Headset Mode source contracts

008.1–008.4 exist in source. `CAPTION-008-HEADSET-MODE.md` holds the specification and as-built summaries; QUALITY.md distinguishes source, synthetic live checks and outstanding physical acceptance.

- Rooms persist `mode` (`connected` | `headset`) through an additive migration and a `create_headset` operation, with no function-signature or policy change. Every snapshot and `check` returns the mode; clients treat a missing mode as `connected`.
- Headset rooms never start the host room microphone or voice identification. Phones open the headset microphone on a user gesture, with automatic gain control, noise suppression and echo cancellation requested off, and report what the browser actually applied.
- Headset signalling uses the existing private topics: immediate participant `headset-presence` broadcasts carry validated `{ sessionId, seq, presence }` setup/visibility/input status. A deduplicated, coalesced Presence snapshot (at most one every 12 s) keeps headset state available for late host subscribers without exceeding the connection's five Presence writes per 30 s. Session/sequence guards prevent older snapshots from replacing newer broadcast state. Participant broadcast `headset` carries gate transitions and room-check results; host control carries `headset-check` / `headset-check-cancel`. No payload carries audio or conversation text; temporary transport versions are not retained or exported.
- The gate decision is phone-local, uses calibrated thresholds with hysteresis and hold, and leans toward open.
- 008.2 provider: one AssemblyAI v3 stream per phone, `universal-3-6-pro`, `speaker_labels=false`, `voice_focus=near-field`, `mode=balanced`, `format_turns=true`, with no silent fallback. Caption identity comes from the sending participant's channel.
- 008.2 (implemented):
  - Room-check bleed sets each phone's gate thresholds, adjusted by a host-set per-person sensitivity (memory-only, clamped).
  - A phone streams gated audio only after setup is ready: a 300 ms look-ahead, with silence frames while the gate is closed and throughout calibration and room checks.
  - Phones relay sequence-numbered caption events on their own participant topic. The host validates them, binds identity and dispatches them. There are no relay-acks, and interims are coalesced to at most 5 per second per phone.
- 008.3 (implemented):
  - Sensitivity becomes a continuous per-person integer offset (−15 to +6 dB).
  - Each caption envelope may carry memory-only evidence (level relative to the wearer's calibrated own level, open ratio, capture span). This is loudness statistics, not audio and not a voiceprint.
  - In headset rooms the host arbitrates overlapping captions between phones and may hide a weaker duplicate. Hidden duplicates are memory-only and visible to the host only through a testing toggle.
  - Own level uses speech frames above `max(floor + 6, p95 − 15)`; the phone reports whether room-check tuning is still current. Slider thresholds use the higher calibrated/applied own reference and warn about quiet-speech loss.
  - The first interim relays immediately, subsequent interims at most once per 200 ms. Only overlapping unfinished turns can hold a final, for at most 800 ms. Table and Connected bypass the arbiter.
  - Provider latency uses signed `receivedAt − audioEndAt`; clock-aligned relay extra delay is measured separately. Synthetic provider endpoints sometimes lead receipt, so negative samples and the resulting on-screen estimate are not human end-to-end latency guarantees. Export v3 contains numerical diagnostics, no names, IDs, audio or caption text.
  - Human-approved presentation follow-up: microphone card retains native device-ID selection and advisory browser-route guidance; shared Speaking/Quiet indicators are prominent on phones and compact in existing host rows, with errors/setup states taking precedence. Headset live captions use display-only same-speaker/source reading blocks, breaking for speaker change, overlap, pause over 2 s or an 80-word turn-boundary limit. Original turns, revisions, duplicate removal, history and Table/Connected rendering remain unchanged; no text buffering or provider-timing change.

## Verified repository baseline — 2026-10-10

The repository is currently a context-only starter. Its ten tracked files are the durable project/workflow documents, `README-START-HERE.md`, and `PROMPTS.md`; there are no application source files or top-level source directories.

- Application code and entry points: none found.
- Frontend/backend boundary: not established; no frontend or backend exists yet.
- Package manager and runtime: no package manifest, lockfile, runtime declaration, or executable scripts found.
- Database and authentication: no schema, migration, database client, or authentication setup found.
- Deployment and hosting: no deployment configuration found; hosting remains unverified.
- CI/CD: no workflow or other CI/CD configuration found.
- Environment variables: no `.env` files or source configuration declaring environment variables found. `ASSEMBLYAI_API_KEY` appears only as a planned secret name in the starter live-state ledger, not as verified configuration.
- Third-party services: AssemblyAI, Deepgram, and Speechmatics appear only as documented provider candidates; no integration code or live connection was found.
- Test/build/lint/typecheck commands: none are declared or runnable from the current repository contents.
- Documentation conflicts: none found between the starter README/prompts and the durable product context.

## CAPTION-001 source baseline — 2026-10-10

The first application scaffold is now present in source. These are source facts, not deployment or provider-live verification:

- Runtime/tooling observed: Node.js `v22.15.0`, npm `11.3.0`.
- Application: Next.js `16.4.0`, React/React DOM `19.3.0`, App Router, strict TypeScript, `src/` layout.
- TypeScript: `6.0.3`, selected because the current Next.js ESLint parser does not yet support TypeScript 7 in this environment.
- Verification tooling: Vitest `5.0.3`, Testing Library React `16.3.3`, ESLint `9.39.5`, jsdom `29.1.1`.
- Speech source path: browser AudioWorklet → in-memory mono 16 kHz PCM16 chunks → AssemblyAI v3 WebSocket adapter. The browser receives a short-lived token from `POST /api/transcription/session`; the permanent key remains server-only.
- AssemblyAI source configuration: `wss://streaming.assemblyai.com/v3/ws`, `speech_model=universal-streaming-english`, `sample_rate=16000`, and approximately 100 ms binary frames.
- Transcript state: normalized `CaptionEvent` values held in memory only; no database, local/session storage, audio persistence, analytics, authentication, or provider proxy was added.
- Typography: browser CSS loads Atkinson Hyperlegible for body/caption text and Inter for headings from Google Fonts, with system fallbacks. Build-time font downloading is intentionally avoided so offline builds remain possible.

### Frontend
- Next.js
- React
- TypeScript
- PWA-capable responsive web application
- Browser MediaDevices / Web Audio APIs as appropriate
- CAPTION-002 speaker-aware Table Mode uses in-memory React/reducer state for conversation-local profiles, newest-first chat history, and responsive naming controls.

### Backend
- Server-side TypeScript/Node runtime
- WebSocket or equivalent real-time session transport where appropriate
- Provider abstraction for streaming speech-to-text
- Persistent database only where product requirements justify it

### Initial speech strategy
- Begin with a streaming cloud STT provider behind an internal adapter.
- AssemblyAI is the initial implementation candidate.
- Deepgram and Speechmatics remain benchmark candidates.
- Provider-specific events must be normalized before entering UI/application state.
- CAPTION-002 preserves `universal-streaming-english` and enables AssemblyAI `speaker_labels=true` without speaker-count constraints; provider labels are converted to opaque, connection-scoped application speaker IDs.

### Infrastructure
- Hosting/deployment provider: not yet verified.
- Database: not yet required/verified.
- Authentication: guests should not require accounts for joining a conversation.
- Secrets: server-side only; use temporary/short-lived browser credentials when supported.

## Stable architecture

```text
Host microphone / participant microphone(s)
                │
                ▼
        Audio capture layer
                │
                ▼
         STT provider adapter
                │
                ▼
     Normalized caption events
                │
                ▼
      Conversation state engine
                │
      ┌─────────┴─────────┐
      ▼                   ▼
Live caption UI      Transcript/history UI
```

Future Hybrid Mode adds multiple audio sources and duplicate-resolution logic without changing the normalized caption contract consumed by the UI.

## Stable caption event contract

Provider-specific payloads should be converted into an application-owned model similar to:

```ts
export type CaptionEvent = {
  id: string;
  text: string;
  speakerId: string | null;
  speakerName?: string;
  startedAt: number;
  endedAt?: number;
  isFinal: boolean;
  confidence?: number;
  sourceId?: string;
};
```

The exact fields may evolve through an approved architecture change, but UI components must not depend directly on a speech provider's raw schema.

CAPTION-002 extends the provider boundary with application-owned transcription events for immediate interim captions, finalized turns containing one or more speaker-attributed segments, and quiet speaker revisions. Finalized records carry a stable source-turn identifier so revisions replace the correct turn without changing the user's saved display name. Speaker profiles remain conversation-local and in memory only:

```ts
export type SpeakerProfile = {
  id: string;
  ordinal: number;
  displayName: string | null;
  side: "left" | "right";
  accentIndex: number;
};
```

Provider connections receive unique namespaces. A provider label from a later reconnect is therefore a new application identity and is never automatically assigned a prior name.

## Privacy and security rules

- Never expose permanent speech-provider API keys in the browser.
- Never commit secrets.
- Never store raw audio by default.
- Do not persist conversation transcripts by default during the initial milestones.
- Do not log full caption text in production diagnostics unless explicitly approved and protected.
- Use short-lived room/session credentials for guest participation.
- Expire guest rooms and participant tokens.
- Use HTTPS for microphone access outside local development.
- Use least-privilege access for infrastructure and providers.
- Record secret/environment-variable **names only** in `LIVE-STATE.md`, never values.
- Treat conversation text as sensitive user content.
- Retired Connected voice identification never stored voiceprints or biometric data; it is absent from the active product.
- Headset Mode calibration and room-check levels are plain loudness numbers held in memory for one conversation; they are not voiceprints and are never stored. CAPTION-008.1 sends no audio. From 008.2, a phone sends audio for transcription only while its wearer's gate is open. Exported diagnostics contain no names, IDs, audio or caption text.

## Accessibility requirements

- Main caption view must remain usable without fine motor interaction once a conversation starts.
- Text size must support large viewing sizes.
- Typography: use **Atkinson Hyperlegible** from Google Fonts for body text and caption words; use **Inter** from Google Fonts for headings. Keep readable local/system fallbacks in the implementation.
- Strong contrast and clear current-speaker emphasis.
- Keyboard-accessible controls for core desktop actions.
- Status must clearly distinguish listening, connecting, reconnecting, microphone blocked, and stopped states.
- Do not use color as the only means of identifying speaker/status.
- Interim text and confirmed/final text should be visually distinguishable without becoming distracting.
- Previous conversational turns should remain briefly available while keeping the newest speech dominant.

## Constraints

- Must remain useful when only the host device is present.
- Guest participants should be able to join from a link/QR without app installation.
- Bluetooth microphone routing differs by browser/OS; the product must test and display the actual selected/available input rather than assuming earbuds are active.
- Mobile browsers may suspend background pages; Headset participant UX must account for this later.
- Overlapping room speech cannot be assumed to diarize perfectly from one microphone.
- Low-cost operation matters, but cost reductions must not silently compromise accessibility reliability.

## Explicit initial non-goals

- Replacing hearing aids or medical devices.
- Diagnosing hearing conditions.
- Recording/archiving raw audio.
- Building a general meeting-minutes product.
- Translation as part of CAPTION-001.
- Native iOS/Android applications before web/PWA limitations are measured.
- Non-speech sound classification before core speech reliability is established.

## Roadmap

- `CAPTION-010` — Active: Single Speaker Mode for sermons/lectures; physical acceptance pending.
- `CAPTION-009` — Shipped: Open Mode + Pro STT + Stable Reading; physical acceptance pending.
- `CAPTION-005` — Accessibility refinement.
- `CAPTION-006` — Production hardening.
- `CAPTION-007` — Field validation / provider benchmarking (separate approval).
- `CAPTION-004` — Hybrid Mode, deferred as a separate initiative.
- `CAPTION-001/002` — Historical Conversation Core / Table Mode.
- `CAPTION-003` — Connected Mode, retired from active product; evidence retained.
- `CAPTION-008` — Accepted Headset implementation and separate remaining recovery/UAT history.

## Definition of done

A meaningful feature is done only when:
- implementation is complete;
- focused automated tests pass;
- type/lint/build gates pass as applicable;
- browser UAT is complete for relevant UI work;
- real microphone/audio-path verification is complete when applicable;
- live verification is complete for deployment/provider work;
- required quality evidence is recorded;
- context files are updated;
- changes are committed and pushed to `main`.

## Historical temporary cross-microphone diagnostic contract (removed in CAPTION-009)

After CAPTION-003.1 failed user real-device acceptance, add observation only before any threshold changes. The host URL ?captionDebug=1 opts in to an in-memory ledger and Connected-only panel; ordinary use leaves collection disabled. Keep the latest 30 scalar comparison records, with opaque participant/source IDs, event kinds, conservative word counts, host-local receive deltas, ordered token similarity, length-bound containment score, configured gates and decision/reason. Display names resolve locally in the host UI; copied JSON contains constants and opaque-source metrics only. No caption text, tokens, turn IDs, access credentials, invitation URLs, persistence, diagnostic network traffic or logging.

The existing performance.now samples and caption action order are unchanged. Supplemental similarity for skipped gates is computed after caption reducer dispatch; the panel refreshes independently every 500 ms. Length/containment is the existing 2*min(token lengths)/sum(token lengths) upper-bound gate, not semantic overlap. Existing-cluster checks may bypass timing; structural skips (both finals already committed or source overlap) are exposed without changing them. Expired-final hints retain only bounded source/time/word-count metadata and cannot establish that the new speech duplicated old speech. Clearing the ledger does not reset reconciliation; room release discards working metadata while metrics remain available to copy until clear/reload. Table Mode, provider configuration and Supabase traffic are unchanged. CAPTION-003 stays open; CAPTION-004 remains deferred.
