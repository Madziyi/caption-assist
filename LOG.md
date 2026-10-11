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

### 2026-10-10 — CAPTION-002 — speaker-aware Table Mode source implementation
- **Changed:** Added AssemblyAI streaming diarization configuration, opaque connection-scoped speaker IDs, normalized interim/final/revision events, word-level finalized segmentation, in-memory speaker profiles, newest-first grouped chat bubbles, live speaker labels, responsive speaker management, and focused provider/state/history tests.
- **Decisions:** Preserved `universal-streaming-english`; added only `speaker_labels=true`; did not add speaker-count constraints, another provider, a secondary AI request, persistence, voiceprints, or user identity. Speaker names remain local to the current conversation and are resolved retroactively from profiles.
- **Verification:** `npm run typecheck` passed; `npm run lint` passed with no errors; `npm test` passed with 5 files and 25 tests; `npm run build` passed with routes `/` and `/api/transcription/session`; `git diff --check` passed. Browser smoke verification observed the caption-first layout, microphone-permission status, and ended state.
- **Quality:** No physical-speaker count, WER, accuracy percentage, formal latency, session duration, reconnect, or revision UAT values were invented. Source/browser evidence and pending real-provider checks are recorded in `QUALITY.md`.
- **Live state:** No deployed system or live AssemblyAI configuration was verified; `LIVE-STATE.md` remains unchanged.
- **Known issues:** Real multi-speaker provider UAT remains pending because this Builder session did not complete a usable diarization path. The known safe limitation that reconnect-created speaker identities are new profiles is documented in source context.
- **Next action:** Planner/user performs the applicable real multi-speaker, naming, responsive, revision, and reconnect UAT before advancing beyond CAPTION-002; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — caption transition readability adjustment
- **Changed:** Replaced the duplicate large `Conversation` heading with `Captions` and added a 2-second visual dwell for the latest finalized caption in the main caption stage.
- **Decisions:** Finalized captions still enter newest-first history immediately; only the visual departure from the large stage is delayed. Interim caption rendering and provider timing remain unchanged.
- **Verification:** Focused source inspection, local browser smoke verification of the updated `Captions` heading and enlarged stage, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check` passed.
- **Quality:** This is a user-requested readability adjustment. Browser smoke evidence was limited to the updated heading and enlarged stage; no new audio, latency, accuracy, or live-provider evidence was produced.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** The 2-second dwell is an initial tuning value and may need user feedback after real sessions.
- **Next action:** Planner/user validates the transition feel during the next real captioning session; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — compact header refinement
- **Changed:** Reduced the header padding, type scale, status height, and spacing so the brand and status read as a compact menu-like row. Preserved the existing visible status notification.
- **Decisions:** Keep status text visible for accessibility and connection/error feedback; do not hide it or replace it with a status dot alone.
- **Verification:** Source validation and local browser smoke verification completed after the CSS update; no audio/provider behavior changed.
- **Quality:** This is a user-requested visual-density adjustment. No new latency, accuracy, audio, or live-provider evidence was produced.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** The compact row may wrap status text at very narrow widths, by design, to preserve the notification.
- **Next action:** Planner/user validates the compact header during the next browser review; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — caption stage space refinement
- **Changed:** Reduced the shell's top padding by approximately 90%, top-aligned the live speaker label, and removed the live caption region's 22vh height cap so it can use the remaining 50vh caption stage.
- **Decisions:** Keep caption text centered within the available live region; change layout density only, without changing caption ordering, dwell timing, provider events, or privacy behavior.
- **Verification:** Source validation and local browser smoke verification completed after the CSS update; no audio/provider behavior changed.
- **Quality:** This is a user-requested caption readability/layout adjustment. No new latency, accuracy, audio, or live-provider evidence was produced.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** Narrow/mobile layout still requires focused visual review after this desktop-oriented spacing adjustment.
- **Next action:** Planner/user validates speaker placement and caption use of the stage during the next browser review; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — user-observed product/UAT acceptance and closure
- **Changed:** Updated durable context to mark CAPTION-002 complete for progression after the user's personal review and testing of the current speaker-aware interface.
- **Decisions:** Treat the report as user-observed product/UAT acceptance, not Builder-observed provider benchmarking. Keep CAPTION-003 ready but do not start it in this task.
- **Verification:** Confirmed commit `17d6a2d7b7b36fd0892e9f4e9713bdd3054042b9` is present on synchronized `main`; no application code changed.
- **Quality:** The user reports that the interface is working well and that they are happy with what they tested and saw. No speaker count, WER/DER, exact latency, session duration, reconnect, device/browser, or narrow/mobile result was inferred; those checks remain pending.
- **Live state:** `LIVE-STATE.md` remains unchanged because no new live infrastructure evidence was obtained.
- **Known issues:** Formal diarization accuracy, exact caption latency, sustained-session stability, intentional reconnect, broader device/browser coverage, and narrow/mobile speaker placement remain unmeasured.
- **Next action:** Planner reviews the closure and decides whether to activate CAPTION-003; do not begin CAPTION-003 during this task.

### 2026-10-10 — CAPTION-002 — continuous transcript presentation refinement
- **Changed:** Made the main caption stage a persistent chronological transcript with the interim turn appended at the bottom and automatic internal scrolling; increased the stage to 70vh, reduced live caption text by 15%, reduced history text by 30%, and moved history speaker labels beside their left/right bubbles.
- **Decisions:** Retained the separate newest-first caption history. Kept transcript and speaker state in memory only. Preserved per-line polite live announcements for assistive technology.
- **Verification:** Typecheck passed; lint passed; 26 tests passed; production build passed; browser idle-state smoke verification showed the expanded caption stage and preserved status/history regions; `git diff --check` passed.
- **Quality:** No new audio, provider, latency, accuracy, session, reconnect, or device/browser measurements were produced. Multi-turn live scrolling and narrow/mobile label placement remain pending.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** The provider-backed multi-turn transcript and responsive side-label layout still require user review.
- **Next action:** Planner/user reviews the continuous transcript behavior; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — continuous transcript layout tuning
- **Changed:** Set the live caption box to a fixed 65vh height without a minimum, centered the live speaker indicator, and preserved internal scrolling so lines leave the live viewport as it fills while remaining in caption history.
- **Decisions:** The centered speaker name is an indicator for the live caption area; side-positioned speaker names remain specific to the chat-style history. No transcript retention or provider behavior changed.
- **Verification:** Source validation and browser idle-state smoke verification completed after the CSS update; no audio/provider behavior changed.
- **Quality:** No new latency, accuracy, audio, session, reconnect, or device/browser evidence was produced. Provider-backed multi-turn scroll behavior and narrow/mobile layout remain pending.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** User review is still needed for the final live multi-turn appearance.
- **Next action:** Planner/user reviews the tuned continuous transcript; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — live caption text scale tuning
- **Changed:** Reduced the live caption font scale by 25% from the previous tuned size; left the 65vh viewport, centered speaker indicator, history font, and internal scrolling unchanged.
- **Decisions:** Apply the reduction only to `.current-caption`; chat-style history remains at its separately tuned size.
- **Verification:** Source validation and browser idle-state smoke verification completed after the CSS update; no audio/provider behavior changed.
- **Quality:** This is a user-requested readability adjustment. No new latency, accuracy, audio, session, reconnect, or device/browser evidence was produced.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** User review is still needed for the final live multi-turn appearance.
- **Next action:** Planner/user reviews the tuned live caption text scale; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — caption history panel refinement
- **Changed:** Removed the bottom caption history section and added a header Caption history control that opens a left-side pane beside the live caption area. The pane keeps newest-first history and places each speaker name above its caption text.
- **Decisions:** Keep history retained in memory and available on demand; use the existing grouped history data and speaker identities without changing provider or transcript behavior.
- **Verification:** Typecheck, lint, tests, build, diff check, and browser idle-state smoke verification passed. The browser showed the header control, side-by-side left history pane, live caption area shifted right, and Escape dismissal; no audio/provider behavior was changed.
- **Quality:** The pane is keyboard-closeable, shares the desktop workspace with the live caption area, and falls back to a full-width narrow layout. Provider-backed history, narrow/mobile review, and deeper quality measurements remain pending.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** The panel has no new provider/audio evidence yet.
- **Next action:** Run normal repository checks and browser smoke verification, then push the Builder handoff; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — header controls and caption stage refinement
- **Changed:** Moved Start Conversation into the header, added a Full Screen/Exit Full Screen toggle using the browser Fullscreen API, retained End Conversation while active, and increased the live caption stage to 85vh.
- **Decisions:** Keep the start action visible only when a new conversation can begin; keep history and status controls in the header; do not change provider, event, retention, or speaker behavior.
- **Verification:** Typecheck, lint, tests, build, diff check, and browser smoke verification passed. The browser showed the header start/full-screen controls, successful full-screen entry/exit, the expanded caption stage, and the side-by-side history pane; no audio/provider behavior was changed.
- **Quality:** The full-screen control exposes a pressed state and accessible label. Browser capability and narrow/mobile review remain pending.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** Full-screen behavior may depend on browser support or user-agent restrictions.
- **Next action:** Run final repository checks and browser smoke verification, then push the Builder handoff; do not start CAPTION-003.
