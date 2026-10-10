# Project Log

Append concise entries. Do not rewrite history unless correcting a factual error.

Use this format:

```text
### YYYY-MM-DD — <task / decision>
- Changed:
- Decisions:
- Verification:
- Quality:
- Live state:
- Known issues:
- Next action:
```

---

### Bootstrap — shared Planner/Builder workflow prepared
- **Changed:** Added durable project context specialized for a production-grade real-time conversation captioning system.
- **Decisions:** GitHub `main` is the shared source of truth. Builder is runtime-agnostic. One active initiative and one durable-context writer at a time. Real microphone/audio verification is required for audio features. Raw audio is not retained by default.
- **Verification:** Starter context authored; repository-specific facts still need to be mapped by the Builder after the files are added to the real repository.
- **Quality:** Added `QUALITY.md`; no product measurements exist yet.
- **Live state:** Unverified.
- **Known issues:** Hosting, provider credentials/configuration, device support, and actual application scaffold are not yet verified.
- **Next action:** Builder performs repository bootstrap and returns a commit SHA; Planner then defines the executable CAPTION-001 plan.

### 2026-10-10 — BOOTSTRAP — repository baseline verified
- **Changed:** Recorded the actual source baseline in `PROJECT.md`, completed the bootstrap initiative in `NOW.md`, marked BOOTSTRAP done in `TASKS.md`, and clarified unverified live/quality state.
- **Decisions:** Preserved the planned Next.js/React/TypeScript/PWA stack, AssemblyAI-first candidate strategy, provider abstraction, one-device Table Mode requirement, and no-raw-audio-retention default. No application architecture was invented because no application exists yet.
- **Verification:** `git fetch origin` succeeded; branch is `main`; working tree was clean; `HEAD` matched `origin/main` at `45e42267fb4dfb38e940beaeadc072f5c2077220`; repository inventory found ten tracked starter/context files and no package, runtime, source, infrastructure, CI, or test configuration.
- **Quality:** No product, browser, microphone, latency, accuracy, accessibility, reliability, or cost evidence exists; quality remains unverified.
- **Live state:** No live system or provider was inspected; `LIVE-STATE.md` remains unverified.
- **Known issues:** Application scaffold, runtime, deployment, provider configuration, and all implementation/test infrastructure remain to be established during CAPTION-001 planning and execution.
- **Next action:** Planner resyncs `main` and writes the approved CAPTION-001 implementation plan into `NOW.md`.

### 2026-10-10 — Typography decision recorded
- **Changed:** Added the requested typography contract to the accessibility requirements in `PROJECT.md`.
- **Decisions:** Atkinson Hyperlegible is the body/caption font and Inter is the heading font, both sourced from Google Fonts with readable local/system fallbacks.
- **Verification:** Repository sync confirmed `main` matches `origin/main`; no application scaffold or UI files exist to implement or visually verify yet.
- **Quality:** No visual, browser, text-scaling, or readability evidence produced; typography remains pending implementation and UAT.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** The font choice is documented but not yet wired into application code because no application exists in the repository.
- **Next action:** Apply the typography contract when the approved application scaffold is created.

### 2026-10-10 — CAPTION-001 — Conversation Core source implementation
- **Changed:** Added the Next.js App Router scaffold, strict TypeScript tooling, npm lockfile, server-only temporary-token route, AssemblyAI v3 adapter, AudioWorklet PCM16 pipeline, normalized caption reducer, explicit session/reconnect states, accessible caption-first UI, and focused unit/API tests.
- **Decisions:** AssemblyAI uses `wss://streaming.assemblyai.com/v3/ws` with `speech_model=universal-streaming-english`; the permanent `ASSEMBLYAI_API_KEY` is server-only; browser audio is mono 16 kHz PCM16 in approximately 100 ms binary frames; captions remain memory-only; speaker attribution and later roadmap features remain out of scope.
- **Verification:** `npm run typecheck` passed; `npm run lint` passed; `npm test` passed with 3 files and 10 tests; `npm run build` passed with routes `/` and `/api/transcription/session`; `git diff --check` passed. Local POST without configuration returned controlled HTTP 503. Browser UAT verified idle, permission-needed, end, keyboard focus, and typography states.
- **Quality:** Recorded source/browser evidence in `QUALITY.md`. No latency, accuracy, sustained-session, reconnect, or cost measurements were invented.
- **Live state:** No deployed environment or live AssemblyAI session was verified; `LIVE-STATE.md` remains unverified.
- **Known issues:** Builder-observed microphone/provider UAT was unavailable in that environment; a later user-observed functional report is recorded below. Short outage audio replay is not implemented by design. Next build reports a non-blocking host-level parent `package-lock.json` warning.
- **Next action:** Planner/user runs the real microphone → AudioWorklet → AssemblyAI → caption UI path when credentials and hardware are available; do not start CAPTION-002.

### 2026-10-10 — CAPTION-001 — newest captions first
- **Changed:** Updated the live conversation history renderer so the newest finalized caption appears at the top while preserving the reducer’s chronological state order.
- **Decisions:** Reverse a render-time copy rather than mutating `state.finalized`; interim caption behavior is unchanged.
- **Verification:** Focused source inspection plus the standard typecheck, lint, test, build, and diff checks are required before publishing.
- **Quality:** This is a caption-readability/usability adjustment; no new latency, accuracy, or live-provider measurement was produced.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** Builder-observed microphone/provider UAT was unavailable; later user-observed functional validation is recorded below.
- **Next action:** Planner/user verifies newest-first order during the next real conversation session.

### 2026-10-10 — CAPTION-001 — user-observed real-world validation
- **Changed:** Updated `NOW.md`, `TASKS.md`, and `QUALITY.md` to record the user's real-world functional report without changing application behavior.
- **Decisions:** Treat the report as user-observed real UAT, not Builder-observed UAT. Record only that the real application was used, captioning is functioning, the user reports it is working very well, and newest-first ordering is implemented.
- **Verification:** Confirmed commit `07f41bc3060f5ae6c4b54d9d26cc312afbba1c57` is present on synchronized `main`.
- **Quality:** No latency, accuracy, duration, browser/device, reconnect, or 30-minute stability values were inferred. Those checks remain pending.
- **Live state:** No deployment or live infrastructure verification was performed; `LIVE-STATE.md` remains unchanged.
- **Known issues:** Deeper CAPTION-001 quality validation is still outstanding despite functional progression being supported.
- **Next action:** Planner may advance to CAPTION-002 after review while retaining the pending quality checks.
