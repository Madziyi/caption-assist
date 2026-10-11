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

### Table Mode
One host laptop/tablet/phone captures the room and produces live captions. Speaker diarization may provide temporary labels such as `Speaker 1`, `Speaker 2`.

### Connected Mode
Host room microphone OFF. The host automatically joins as `You`, with reserved navy identity, initially MUTED. Every participant joins/rejoins muted. Participants scan a QR/link, enter a display name, consent to a microphone-only level check, release the test microphone, and explicitly Unmute after joining. Each device supplies a personal microphone stream with exact microphone/source membership identity and diarization OFF. This normally names that participant, but does not guarantee physical human speaker identity: nearby open microphones can hear the same speaker. Connected captions therefore pass through local cross-mic reconciliation before reduction. Host Unmute is a personal You stream, never a room microphone.

### Hybrid Mode
Future CAPTION-004 only; not implemented. The host room microphone would remain active alongside personal streams and require duplicate suppression.

Table Mode uses the host as a room microphone with diarization ON. Mode selection is locked for the active conversation; end before selecting another mode.

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

## Planned technology stack

These are architectural intentions until verified by repository implementation and live configuration.

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
- Mobile browsers may suspend background pages; connected-participant UX must account for this later.
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

- `CAPTION-001` — Conversation Core
- `CAPTION-002` — Speaker-aware Table Mode
- `CAPTION-003` — QR participant rooms
- `CAPTION-004` — Hybrid room + personal microphones
- `CAPTION-005` — Accessibility and optional sound-event layer
- `CAPTION-006` — Production hardening
- `CAPTION-007` — Provider/accuracy/cost benchmark and field validation

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

## Temporary cross-microphone diagnostic contract

After CAPTION-003.1 failed user real-device acceptance, add observation only before any threshold changes. The host URL ?captionDebug=1 opts in to an in-memory ledger and Connected-only panel; ordinary use leaves collection disabled. Keep the latest 30 scalar comparison records, with opaque participant/source IDs, event kinds, conservative word counts, host-local receive deltas, ordered token similarity, length-bound containment score, configured gates and decision/reason. Display names resolve locally in the host UI; copied JSON contains constants and opaque-source metrics only. No caption text, tokens, turn IDs, access credentials, invitation URLs, persistence, diagnostic network traffic or logging.

The existing performance.now samples and caption action order are unchanged. Supplemental similarity for skipped gates is computed after caption reducer dispatch; the panel refreshes independently every 500 ms. Length/containment is the existing 2*min(token lengths)/sum(token lengths) upper-bound gate, not semantic overlap. Existing-cluster checks may bypass timing; structural skips (both finals already committed or source overlap) are exposed without changing them. Expired-final hints retain only bounded source/time/word-count metadata and cannot establish that the new speech duplicated old speech. Clearing the ledger does not reset reconciliation; room release discards working metadata while metrics remain available to copy until clear/reload. Table Mode, provider configuration and Supabase traffic are unchanged. CAPTION-003 stays open; CAPTION-004 remains deferred.
