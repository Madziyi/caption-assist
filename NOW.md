# Active Initiative

**Initiative:** CAPTION-002 — Speaker-aware Table Mode (closure)
**Status:** COMPLETE FOR PROGRESSION — user-observed product/UAT acceptance recorded; continuous-transcript presentation, caption-history panel, and header control refinements implemented; deeper quality checks remain pending
**Planner:** Planner agent  
**Implementation / verification:** Builder agent

## Objective

Extend the working one-device captioning path with AssemblyAI streaming diarization, conversation-local speaker profiles, newest-first speaker-aware chat history, speaker revisions, and responsive speaker management without intentionally delaying live text.

## Current scope

- Preserve the AssemblyAI v3 `universal-streaming-english` baseline and enable `speaker_labels=true` in the existing adapter.
- Normalize interim turns, finalized speaker-attributed segments, speaker revisions, and provider status into application-owned events.
- Namespace turn and speaker identities by provider connection so reconnect labels cannot collide or inherit names.
- Add in-memory conversation-local speaker profiles with stable ordinal, alternating side, accent, and editable display name.
- Keep live caption text dominant and immediate while showing the best current speaker label above it.
- Render newest-first finalized history as separate accessible left/right chat bubbles with derived consecutive-speaker grouping.
- Keep caption history out of the default page flow and expose it through a header control that opens a left-side pane beside the live caption area, with speaker names above each caption group.
- Keep conversation start and full-screen controls available in the header; use the expanded 85vh live caption stage for focused viewing.
- Keep the active conversation action in the same header position, swapping Start Conversation for End Conversation; do not render a footer control bar.
- Add responsive Speakers management and fast naming/renaming/removal without transcript or name persistence.
- Add focused provider, registry/reducer, grouping, and UI tests plus normal typecheck, lint, test, build, and diff checks.

## Decisions

- GitHub `main` is the shared source of truth.
- The coding runtime is called **Builder** in durable context so Luna/Sol/Cursor can be swapped without rewriting project memory.
- Only one agent edits durable context during a task.
- The product must work in one-device Table Mode before requiring participant joining.
- Provider-specific STT payloads must be hidden behind an internal adapter/normalizer.
- Raw audio is not stored by default.
- Build success alone is insufficient verification for real-time audio work.
- AssemblyAI v3 `wss://streaming.assemblyai.com/v3/ws` with `speech_model=universal-streaming-english` is the initial provider path; provider-specific events remain behind an adapter.
- CAPTION-002 adds AssemblyAI streaming diarization with `speaker_labels=true`; no speaker-count constraints or alternate provider are introduced.
- Speaker identity is application-owned and connection-scoped; raw provider labels never reach presentation code and names are conversation-local memory only.
- Caption text is rendered as soon as it arrives; speaker metadata may revise finalized history later without a second network request.
- Transcript and speaker state remain memory-only; no audio, name, analytics, database, auth, or deployment infrastructure is added in this initiative.

## Explicit non-goals

- No QR rooms, participant devices, WebRTC, hybrid deduplication, sound recognition, persistence, exports, accounts, Supabase, deployment, provider benchmarking, model migration, or native apps.
- No speaker merge/split, bubble editing, manual reassignment, current-user identity, voiceprints, cross-conversation recognition, or expected speaker-count setup.
- No raw-audio replay across provider outages.

## Blockers

- None currently known. Real diarization UAT depends on credentials, microphone hardware, and multiple available voices; report any unavailable checks honestly.

## Verification plan

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`
- Browser UAT for live speaker labels, newest-first bubbles, naming, speaker panel, keyboard behavior, and desktop/narrow responsive states where the local environment supports it.
- Real microphone/provider UAT for multiple voices, naming during speech, short turns, revisions, reconnect identity isolation, and end/new-conversation lifecycle when valid local configuration and hardware are available.
- Record only observed speaker counts, perceived latency, grouping, revision, reconnect, and responsive evidence; do not infer metrics.

## Next action

Planner reviews the CAPTION-002 closure and the tuned continuous-transcript presentation, then decides whether to activate CAPTION-003; do not begin CAPTION-003 during this task.
