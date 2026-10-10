# Active Initiative

**Initiative:** CAPTION-001 — Conversation Core
**Status:** COMPLETE — source implementation; real provider/audio UAT pending
**Planner:** Planner agent  
**Implementation / verification:** Builder agent

## Objective

Build the first functioning one-device conversation-captioning path: microphone permission, in-browser 16 kHz mono PCM16 capture, short-lived AssemblyAI v3 streaming authentication, normalized interim/final caption events, accessible caption-first UI, bounded reconnect, and graceful cleanup.

## Current scope

- Create a strict TypeScript Next.js App Router application using a `src/` layout and committed npm lockfile.
- Implement an internal streaming transcription-provider boundary with an AssemblyAI v3 adapter using `universal-streaming-english`.
- Mint short-lived provider tokens server-side through `POST /api/transcription/session`; never expose the permanent API key to client code.
- Capture microphone audio through an AudioWorklet, resample to mono 16 kHz PCM16, and send approximately 100 ms binary frames.
- Implement explicit session states, reducer-driven interim/final caption handling, bounded reconnect, and graceful stop cleanup.
- Build a responsive, keyboard-accessible caption-first interface using Atkinson Hyperlegible for body/caption text and Inter for headings.
- Add focused unit tests for caption state, PCM/resampling utilities, session transitions, and token-route behavior.

## Decisions

- GitHub `main` is the shared source of truth.
- The coding runtime is called **Builder** in durable context so Luna/Sol/Cursor can be swapped without rewriting project memory.
- Only one agent edits durable context during a task.
- The product must work in one-device Table Mode before requiring participant joining.
- Provider-specific STT payloads must be hidden behind an internal adapter/normalizer.
- Raw audio is not stored by default.
- Build success alone is insufficient verification for real-time audio work.
- AssemblyAI v3 `wss://streaming.assemblyai.com/v3/ws` with `speech_model=universal-streaming-english` is the initial provider path; provider-specific events remain behind an adapter.
- `speakerId` remains `null` for CAPTION-001; diarization and participant identity are later-scope work.
- Transcript state is memory-only; no audio, transcript, analytics, database, auth, or deployment infrastructure is added in this initiative.

## Explicit non-goals

- No speaker diarization, QR rooms, participant devices, WebRTC, hybrid deduplication, sound recognition, persistence, exports, accounts, Supabase, deployment, provider benchmarking, or native apps.
- No offline/service-worker/PWA installability work for CAPTION-001.
- No raw-audio replay across provider outages.

## Blockers

- Real AssemblyAI/provider and physical-microphone UAT depends on locally available credentials and hardware; source implementation is complete with those checks explicitly pending.

## Verification plan

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`
- Browser UAT for idle/start/error/reconnect/end/responsive states where the local environment supports it.
- Real microphone/provider path only when valid local configuration and hardware are available; otherwise report pending honestly.

## Next action

Planner/user performs real microphone + AssemblyAI UAT when credentials and hardware are available, then reviews the source handoff without starting CAPTION-002.
