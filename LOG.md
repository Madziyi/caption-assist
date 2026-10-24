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

### 2026-10-10 — CAPTION-002 — header conversation action refinement
- **Changed:** Removed the footer control bar and made the header conversation control swap between Start Conversation and End Conversation in the same position.
- **Decisions:** Keep the active end action adjacent to the history/full-screen/status controls; preserve the existing recoverable-error End Conversation action.
- **Verification:** Typecheck, lint, tests, build, diff check, and idle browser smoke verification passed. The browser showed Start Conversation in the header and no footer; the active End Conversation swap is source-verified but was not exercised without starting a microphone session.
- **Quality:** The page no longer renders a footer control region. Deeper provider and responsive quality measurements remain pending.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** The active-state swap requires a real or controlled session transition to verify in the browser.
- **Next action:** Run final repository checks and browser smoke verification, then push the Builder handoff; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — live speaker label color refinement
- **Changed:** Changed live caption-area speaker label text to a lighter neutral gray while retaining accent dots; history speaker colors are unchanged.
- **Decisions:** Apply the color change only to `.live-caption-line .speaker-identity` so the chat-style history keeps its existing speaker color cues.
- **Verification:** Typecheck, lint, tests, build, diff check, and browser idle-state smoke verification passed; no audio/provider behavior was changed.
- **Quality:** This is a user-requested readability adjustment. No new latency, accuracy, audio, session, reconnect, or device/browser evidence was produced.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** Live provider-backed speaker labels were not exercised in this check.
- **Next action:** Run normal repository checks and browser smoke verification, then push the Builder handoff; do not start CAPTION-003.

### 2026-10-10 — CAPTION-002 — user-observed live speaker label confirmation
- **Changed:** Recorded the user's confirmation that the lighter gray live speaker label change worked well.
- **Decisions:** Treat this as user-observed visual/product confirmation, not Builder-observed provider or audio benchmarking.
- **Verification:** No new code or live infrastructure verification was performed.
- **Quality:** No latency, accuracy, session, reconnect, speaker-count, or device/browser details were inferred.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** Broader live speaker and responsive quality checks remain pending.
- **Next action:** Planner/user may continue review; do not start CAPTION-003.

### 2026-10-11 — CAPTION-003 — Connected Mode source and infrastructure handoff
- Changed: Added locked mode selector, muted navy You host, local QR invite/Participants/self-mic/end controls; mobile anonymous name/mic-level-check/muted-join/rename/leave; application room transport and personal STT lifecycle; independent exact-identity interims in the existing continuous transcript. Preserved Table diarization, UI refinements, history and Full Screen. Added pinned Supabase/QR dependencies, server-authenticated APIs, metadata/RLS migrations and opt-in infrastructure verification scripts.
- Decisions: Connected room mic stays OFF; all actual re-entries muted; no remote unmute/Hybrid Mode/audio or transcript persistence. Private participant channels bind identity; host controls are host-only; shared Presence is only a roster-refresh hint. Host filters removed/ended messages despite cached authorization. Healthy visibility/blur changes never mute; actual capture/room failure does. Refresh restores room metadata, not transcript.
- Verification: Typecheck/lint, 51 tests / 12 files, production build and diff check passed. Applied two migrations to existing caption-assist Supabase project, matched source/live migration versions; rollback SQL assertions passed. Anonymous Auth/direct private Realtime delivery and rejection of outsiders/impersonation/guest control publication observed. Advisor only reported expected anonymous-access warnings. No secrets/transcripts/audio logged or committed.
- Quality: One synthetic same-process relay sample ~169.9 ms; first subscription failed generically, second passed without weakening policies; root cause unconfirmed. Browser verified selector/configuration feedback/history Escape/Full Screen entry and phone-width participant form. No real device/audio/background/Wake Lock UAT; no accuracy/cost metrics inferred. Disposable infrastructure fixtures cleaned up.
- Live state: Updated only observed project/migration/RLS/Auth/Realtime facts. Full application/deployment/provider configuration remains unverified.
- Known issues: Three Supabase env names absent locally; full configured app/phone UAT outstanding. Browser/OS background limitations unmeasured. Existing dev-only ESLint dependency audit findings recorded in handoff, with no unrelated major-version downgrade.
- Next action: Configure Supabase URL/publishable/server-secret privately, restart/rebuild and execute host + guest-phone UAT; Planner/user decides progression. CAPTION-004 not started.

## 2026-10-11 — CAPTION-003 configured local app follow-up

- User supplied `.env.local`; all four required variable names are nonempty, values never displayed or committed.
- Configured host browser creation opened QR with muted You and count one; mode locked. Explicit mic activation remained pending in IAB, and End canceled it successfully. Old invitation showed ended feedback. No actual audio/provider session inferred. Only IAB available; independent guest/physical-phone/background UAT remains pending.
- Production rebuild passed with configured environment. CAPTION-003 remains active/partial for progression; next action is configured host + guest-phone audio UAT. CAPTION-004 not started.

### 2026-10-11 - CAPTION-003 one-row desktop header refinement
- Changed: CSS uses available screen width and keeps desktop title, mode, actions and status on one row with compact controls. Narrow screens wrap for readability.
- Verification: Local IAB Table idle/Connected active/ended at measured 1280 CSS pixels fit one row without horizontal overflow; 391 CSS pixel view wrapped without overflow. Ended temporary UI verification room. Typecheck, lint and production build passed; 51 tests across 12 files and git diff --check passed. No mic/audio session started.

### 2026-10-11 — CAPTION-003 closure after user acceptance
- Changed: Closed CAPTION-003 after the user reported using the published application and Connected Mode working perfectly; the user also accepted the latest UI refinements. Marked CAPTION-003 done and set CAPTION-004 ready for Planner architecture planning.
- Decisions: Record the user-observed deployed product acceptance without inferring unreported device/browser, background, simultaneous-speech, latency, accuracy, or provider-metric results. Retain distinctions between prior source, infrastructure, browser, and audio verification evidence.
- Verification: Documentation-only change. `git diff --check` run for this closure.
- Quality: Added the user-observed acceptance entry to QUALITY.md; exact device/browser matrix not reported.
- Live state: No new Builder inspection of deployed infrastructure performed; existing verified facts remain in LIVE-STATE.md.
- Known issues: Detailed physical-device/audio-path, background, simultaneous-speech, latency, accuracy, and provider metrics remain unreported/unverified.
- Next action: Planner may begin CAPTION-004 architecture planning; implementation has not started.

### 2026-10-11 - CAPTION-003 reopened for CAPTION-003.1
- Trigger: User's deployed co-located microphone testing found cross-mic duplicate speech, superseding earlier closure. Participant identity authorizes the microphone/source, not a mathematical human-speaker guarantee.
- Changed: Application-owned synchronous CrossMicReconciler between authorized Connected delivery and reducer; short bounded clusters, conservative token/time matching, active-turn-safe interim cleanup, stable final attribution and separate per-segment recognition confidence. Current UI, Table path/model, Supabase authorization and provider strategy preserved. No comparison network call, buffering, persistence or caption text logging.
- Decisions: 4+ tokens ordered Dice >=0.85 / 1800 ms; 3 tokens exact / 600 ms; 1-2 tokens never cross-suppressed; negation/numeric conflicts protected; >=0.15 confidence margin before final only. First final commits immediately; source provenance retained even when displayed label comes from another cluster leader.
- Verification: 93 tests / 13 files, typecheck/lint and production build passed. No physical-device/audio tests or real duplicate/latency measurements inferred. Baseline main had a successful Vercel Git deployment status; new commit deployment to be checked after push.
- Next action: Publish then perform specified deployed two/three-phone scenarios and collect user acceptance. CAPTION-003 stays active; CAPTION-004 deferred.

### 2026-10-11 - CAPTION-003.1 publication verification
- Implementation `c8c95166dadd281801764d0154ae2c60b936d391` pushed to main; Vercel check moved from pending to success. Recorded the observed deployment status in LIVE-STATE.md and handoff.
- Required checks passed: typecheck, lint, 93 tests / 13 files, production build and diff check. No UI/layout/provider model/room authorization migration.
- Next action remains deployed two/three-phone user acceptance; no physical-device UAT inferred from deployment success. CAPTION-003 remains open, CAPTION-004 deferred.

### 2026-10-11 - CAPTION-003.1 observation-only diagnostics
- Trigger: User reports real-device suppression acceptance failed; co-located microphones still produce duplicates. Do not tune thresholds blindly.
- Changed: Bounded opt-in host-memory comparison metrics and temporary ?captionDebug=1 Connected panel with names, constants, Clear and metrics-only Copy. Exposes actual host delta/time anchor, token similarity, length gate, exact-three-word result, short policy, reasons and existing structural merge skips. Expired-final hints are metadata only, not duplicate proof.
- Contracts: No caption text/tokens in retained/copied records, logging, persistence, external diagnostics, new clock sampling, deliberate buffering, threshold/suppression/provider/Table/transport change. Supplemental metrics computed after caption dispatch; debug UI refresh independent.
- Verification: 109 tests / 15 files, typecheck, lint and production build passed. Local IAB showed opt-in panel, default hiding and no overflow at 1280/391 CSS pixels. No real speech/device UAT performed by Builder. Diff and publication checked before handoff.
- Next action: Publish through existing Vercel Git integration, then physical two/three-mic diagnostic test; collect metrics promptly and observed device/mic/switching/latency context before targeted changes. CAPTION-003 stays open, CAPTION-004 deferred.

### 2026-10-11 - CAPTION-003.2 evidence-based episode correction
- Trigger: User supplied deployed diagnostic export showing a 53/55-word duplicate at ~13 ms and ~0.889 similarity rejected by `negation_conflict`, plus later 53/14-word provider segmentation divergence. Do not lower global thresholds.
- Changed: Added bounded SpeechEpisode association to the application-owned reconciler. Strict initial evidence is 8+ words, <=300 ms, similarity >=0.85 and short-side LCS coverage >=0.90; an isolated negation mismatch may be overridden in that tier, while numeral conflicts remain independent. Existing associated sources can continue across provider turn IDs within <=3000 ms using >=5 words and coverage >=0.70 or similarity >=0.25. Rolling context is capped at 100 comparison tokens; episode expiry remains bounded.
- Behavior: First useful captions remain immediate. Matching followers are suppressed/cleared through existing reducer actions; no final is fabricated and committed speaker attribution remains stable. Different speech after expiry and short simultaneous acknowledgements remain independent. Table Mode, provider, transport, persistence and CAPTION-004 unchanged.
- Diagnostics: Existing opt-in panel now exposes episode events, short-side coverage and episode age as metrics only. No caption text/tokens/logging/network. Verification and deployment follow after the full gate run.

### 2026-10-11 - CAPTION-003.2 publication verification
- Implementation `d342b1067f88371324386bd1d48d73a2ac5ffe14` pushed to main. GitHub Vercel status reported success: https://vercel.com/madziyis-projects/caption-assist/9ecVb4HfyXM5dH6kSScCaLZvHPit
- Final gates: 115 tests / 15 files, typecheck, lint, production build and diff check passed. No physical-device re-test performed by Builder; CAPTION-003 remains open and CAPTION-004 deferred.

### 2026-10-11 - CAPTION-003.3 Voice Focus A/B experiment
- Trigger: Transcript-side reconciliation and episode continuity did not reliably solve the user's real co-located duplicate problem. The next experiment isolates AssemblyAI acoustic/STT behavior.
- Changed: Provider now accepts explicit mode options. Table uses Universal Streaming with diarization; Connected personal streams use Universal-3.6 Pro, `speaker_labels=false`, exact `voice_focus` query key, balanced mode and public near-/far-field profile selection with far-field default.
- A/B isolation: ConnectedRoom sends authorized participant captions directly to the reducer; CrossMicReconciler remains intact but is disabled for this experiment. Connected identity remains channel-owned. Table path and temporary token architecture remain unchanged; no browser permanent key exposure or fallback on provider rejection.
- Verification: Provider parameter/profile tests and direct Connected bypass tests added. Full repository gates and real-device deployment follow. CAPTION-003 remains open; CAPTION-004 deferred.

### 2026-10-11 - CAPTION-003.3 publication verification
- Implementation `dcbd894beb00388f7446679c6360a2623e4a9676` pushed to main. GitHub Vercel status reported success: https://vercel.com/madziyis-projects/caption-assist/8Mi3AjeoW5mRSFW614MsqhfbyJMC
- Final gates: 118 tests / 15 files, typecheck, lint, production build and diff check passed. No real Connected Voice Focus microphone session performed by Builder; CAPTION-003 remains open.

## Reconciliation diagnostics publication - 2026-10-11

- Implementation `a308e231b3c14a6f319cb4096692d64ad0d2da77` pushed to main. GitHub Vercel check reported success: [Deployment status](https://vercel.com/madziyis-projects/caption-assist/Hy8PjJApogR2SvEXk9oX8m9yfY2u). Existing Git workflow used; no hosting/provider configuration changes.
- All required gates passed: typecheck, lint, 109 tests / 15 files, production build and staged diff check. Source and local browser verification do not establish physical-device suppression acceptance. CAPTION-003 stays open; next test uses ?captionDebug=1.

### 2026-10-11 — CAPTION-003.4 room-microphone diarization pivot
- Trigger: User reported that none of the personal-microphone fixes (CAPTION-003.1 reconciliation, 003.2 episodes, 003.3 Voice Focus) worked with co-located phones, and approved pivoting Connected Mode to one host room microphone + live diarization + one-time session voice identification. Personal-microphone code and history are kept for Hybrid Mode.
- Changed: Host room microphone with AssemblyAI diarization and 120 s mid-session revisions; provider now applies the documented `revisions` array and word-speaker fallback. New in-memory `VoiceIdentityRegistry` binds the next stable diarized speaker after an Identify request, anchored to evidence turns so names follow revisions. Phones never record audio; "Identify my voice" requests ride on participant presence with request-ID acknowledgement. Reducer resolves speaker aliases to participant names, including history. Host UI shows room-mic state, Participants identification status/actions, a listening banner and naming for unidentified voices. Room-network loss no longer stops captions.
- Decisions: No voiceprints or biometric storage; mapping is per conversation. A speaker already bound to someone else is never taken. A provider reconnect requires re-identification. No migration; pyannote not built.
- Verification: 140 tests / 16 files, typecheck, lint, build. Live AssemblyAI check with synthetic voices and local live end-to-end runs (headless Chromium, WAV as microphone, live Supabase + AssemblyAI) — see QUALITY.md. Found and fixed lost taps right after joining; hardened acknowledgement after one unexplained false withdrawal.
- Known issues: Similar voices can merge; short replies can be mislabelled before revisions; anonymous sign-in rate limit observed in testing; brief disabled "Start room microphone" button while ending.
- Next action: Physical UAT with a host room microphone and two or three people identifying from their phones on the deployed build.

### 2026-10-11 — CAPTION-003.4 publication verification
- Implementation `9770a18` pushed to main. GitHub Vercel status reported success: https://vercel.com/madziyis-projects/caption-assist/49hgxyRQ1BLbPFK5a4DVc22N6j6S
- Final gates: 140 tests / 16 files, typecheck, lint, production build and diff check passed. Final-code local live two-phone run passed (both identified, 13/15 named live, 15/15 after end-of-session revision, phones never opened a microphone). No physical-device UAT performed by Builder; CAPTION-003 remains open.

### 2026-10-11 — CAPTION-008 Headset Mode planned (Planner + human)
- Trigger: The human asked for a completely separate mode in which every speaker wears AirPods or a headset on their own phone, with the room microphone off, and explicitly reprioritized it ahead of the outstanding CAPTION-003.4 physical UAT (paused, not cancelled).
- Decisions:
  - Each phone decides locally, from calibrated loudness, whether it hears its wearer or bleed. Calibration: quiet floor, then own voice. A host-run room check, in which each person reads in turn while all phones measure, gives the real per-seat bleed.
  - The gate leans toward open. A missed sentence is the worse failure for a Deaf user; a duplicate is visible.
  - 008.2 provider is Universal-3.6 Pro with Voice Focus `near-field` per phone (human decision), with no silent fallback.
  - Rooms persist their mode via an additive migration with no signature or policy change. No voiceprints; levels are memory-only numbers.
- Failure-budget note: personal-microphone approaches failed three times (CAPTION-003.1–003.3) with phones on a table. This initiative changes the hardware (close headset mics) and the mechanism (acoustic gating). Its first slice therefore measures separation and gate behaviour on real devices, with no audio leaving any device, before any transcription is built. An explicit go/no-go follows.
- Changed: `CAPTION-008-HEADSET-MODE.md` (spec, exact SQL, contracts, constants, file map, tests, acceptance, physical script); NOW.md (active initiative), TASKS.md, PROJECT.md (mode, planned contracts, privacy, roadmap), QUALITY.md (Headset Mode criteria). No source change.
- Next action: Builder implements CAPTION-008.1 only.
### 2026-10-11 — CAPTION-008.1 Builder implementation
- Changed: Added persisted `connected | headset` room mode, exact additive live migration `20261011140359_headset_mode`, headset transport presence/signals/controls, local calibration/gate/room-check/export modules, injectable headset microphone, host/phone orchestrators, wake-lock hook and accessible host/phone UI. Table and Connected paths retain their existing room microphone/identity contracts.
- Decisions: Headset Mode opens no room microphone or transcription provider; host microphone remains opt-in through Set up my headset. Processing-off constraints are requested and actual track settings are reported. Calibration/levels/audio remain in memory only; export uses anonymous roster refs.
- Verification: Live ref `cqnyvevhuxwfzhqpmccn` confirmed; rollback-only SQL test passed. `npm test` passed with 152 tests / 24 files; typecheck, lint, production build and diff check passed. Local browser smoke created and ended one Headset Mode host room and observed invite copy, speaking board and disabled room-check hint. No physical devices or three-Chromium fake-media protocol run were available.
- Known issues: Deployed three-browser protocol run remains unverified; physical acoustic separation, 390px/1280px measured layout and keyboard/network instrumentation remain unverified. Do not start 008.2.
- Next action: Human runs the physical test script and returns anonymized results to the Planner.

### 2026-10-11 — CAPTION-008.1 publication verification
- Verification: Commit `48c500e` pushed to `main`; GitHub combined status reported Vercel `success`: https://vercel.com/madziyis-projects/caption-assist/HB2d5DWWUejGoiP34iW1naeiiKTy. Deployment status does not establish physical audio behavior.
- Next action: Human runs the physical test script; Planner decides the 008.2 go/no-go from the returned exports and observations.

### 2026-10-11 — CAPTION-008.1 mobile `Illegal invocation` hardening
- Trigger: Human reported `Illegal invocation` on mobile phones; no exact device, browser, action or stack was supplied.
- Changed: Preserved owning receivers for Wake Lock, microphone, media-device listener and clipboard Web API methods; caught clipboard permission failures and exposed a status message.
- Verification: typecheck, lint, 152 tests / 24 files, production build and diff check passed. No physical mobile reproduction was available.
- Decision: Keep scope limited to CAPTION-008.1 compatibility; do not start 008.2–008.4. Ask for exact device/browser/action only if the deployed patch still fails.

### 2026-10-11 — CAPTION-008.1 headset permission activation correction
- Root cause: `HeadsetMicrophone.start()` awaited `stop()` before reaching `getUserMedia()`. That headset-only microtask gap can end a mobile tap's user-activation window; Table/Connected microphone paths did not have this initial await.
- Changed: Detach and stop any previous headset capture without awaiting its asynchronous cleanup before the new permission request. Added a regression test for the ordering.
- Verification: typecheck, lint, 153 tests / 25 files, production build and diff check passed. No physical mobile reproduction was available.

### 2026-10-11 — CAPTION-008.1 mobile fix publication
- Source commit `a1611bf` pushed to `main`; GitHub combined status reported Vercel `success`: https://vercel.com/madziyis-projects/caption-assist/Boy7cRU2xgifEySh1N8sqFEscWRa.
- Next action: Human retries Start headset check on the phones; if it still fails, return device/browser/action details and the visible error.

### 2026-10-11 — CAPTION-008.1 timer root cause reproduced after input-route evidence
- Evidence: human reports Default/generic headset/connected Bluetooth fail, while Speakerphone initially does not. Both earlier speculative compatibility patches failed to resolve the report. Work resumed from this new branch-specific evidence and required a native-browser reproduction before further changes.
- Reproduction: actual HeadsetParticipant in native Chromium throws Illegal invocation when a stored timer is called with the participant receiver. Speakerphone bypasses calibration until Use this microphone anyway, which then throws too. The earlier claimed permission-activation root cause was unproven; this entry corrects it without rewriting history.
- Changed: bind setTimeout/clearTimeout to the global; use actual track device IDs in the picker; classify generic headset routes as unknown and explain that listed routes need not indicate connected hardware. IDs remain local only.
- Verification: browser reproduction fails before the timer fix and passes after for all four routes. Browser-simulated microphone through actual capture/worklet delivers level frames, advances calibration, restarts selected input and cancels on stop. 161 tests / 27 files, typecheck, lint, production build and diff check passed. Physical phones/Bluetooth remain unverified.
- Next action: publish and retry Default/connected Bluetooth on the human's phones, then continue the 008.1 physical script.

### 2026-10-11 — CAPTION-008.1 reproduced timer fix publication
- Source commit `77efcef` pushed to `main`; GitHub combined status reported Vercel `success`: https://vercel.com/madziyis-projects/caption-assist/7ke58AMsU8NYNd51be4wpTuaExhu.
- Next action: reload phone pages and retry Default/connected Bluetooth calibration. Physical audio/Bluetooth behavior still needs human confirmation.

### 2026-10-11 — CAPTION-008.1 participant Presence quota fix
- Trigger: human confirms host calibration/input changes work; joining phones disconnect during setup. Live Realtime log aggregation found 14 ClientPresenceRateLimitReached errors; documented per-connection quota is five Presence updates per 30 s, exceeded by the existing setup sequence.
- Changed: immediate validated headset state Broadcast on existing private participant topics; deduplicated, coalesced Presence snapshots at 12 s with identify metadata preserved. Session/sequence guards reject stale snapshots/retired sessions; pending snapshots cancel on disconnect; fire-and-forget failures now produce visible retry feedback.
- Verification: 168 tests/27 files, typecheck, lint, build and diff check pass. Live local host + two simulated phones calibrated, produced a room-check matrix, and first phone refreshed/rejoined/recalibrated without Presence-limit errors/disconnection/page errors. No host mic, STT request or AssemblyAI socket. Early harness attempts typed before hydration; corrected by waiting for the invitation check. All test rooms ended; synthetic WAVs removed.
- Decisions: keep security policies, provider configuration, acoustic thresholds and audio privacy contracts unchanged. No live configuration or schema mutation; physical phone/Bluetooth confirmation remains pending.
- Next action: publish, reload/rejoin physical phones, complete setup and room check, then return acoustic exports to the Planner.

### 2026-10-11 — CAPTION-008.1 participant connection fix publication
- Source commit `d839f09` pushed to `main`; GitHub combined status reported Vercel `success`: https://vercel.com/madziyis-projects/caption-assist/FHhwJXAXyz9DUgNtT4Z1TRqLzB1H.
- Local verification server stopped. No live infrastructure change; physical-phone retest remains pending.
- Next action: reload host/phone pages, rejoin and retry headset setup and room check before acoustic acceptance.

### 2026-10-11 — Planner: CAPTION-008.1 review, GO, CAPTION-008.2 planned
- **Human physical result** (after the Presence fix): "satisfied with the results, might need to calibrate for less sensitivity, but this could actually work." No exports, devices or numbers were supplied.
- **Review:**
  - Accepted the Broadcast + 12 s Presence-snapshot deviation as a contract amendment.
  - Found that room-check bleed never reaches `gate.setThresholds`, so gates stay at the provisional `ownDb − 10` (a plausible cause of over-sensitivity).
  - Found that a new guest `HeadsetParticipant` per room entry loses calibration on rejoin.
  - Found several required 008.1 tests missing.
- **Decision:** GO for 008.2.
- **Part A (first):**
  - The room check tunes the gate.
  - 2-frame attack.
  - Host per-person sensitivity: Less / Normal / More = +4 / 0 / −3 dB, clamped to [floor + 6, own − 3], via a validated `headset-sensitivity` control.
  - Calibration survives rejoin.
  - Missing tests added.
- **Part B:**
  - Each ready phone streams to its own Universal-3.6 Pro + Voice Focus `near-field` session (human decision), with no fallback.
  - 300 ms look-ahead gating, with silence frames otherwise; no non-silent audio during calibration or a room check.
  - Restored sequence-numbered caption relay without relay-acks; interims coalesced to ≤ 5/s; host binds identity.
  - Host caption stage with a per-person status strip.
  - New privacy and invite copy.
- **Deferred to 008.3:** the duplicate safety net with margin data, adaptive thresholds and recovery.
- **Next action:** Builder implements 008.2 per `CAPTION-008-HEADSET-MODE.md`.

### 2026-10-11 — Planner: first headset export, 008.2 Part A amended
- **Evidence:**
  - The wired headset room check separated by 8.8 dB (usable).
  - The Bluetooth headset's room-check own reading was −66.2 dB against a calibrated −26.1 dB. The human reports connecting and disconnecting during the test (it is unclear whether the headset or the room connection), so that row is invalid.
- **Risk found:** the planned "room check feeds the gate" step would have pulled that phone's open threshold down to about −69 dB.
- **Amendments:**
  - A plausibility guard: the own reading must be present, ≥ calibrated own − 12 dB, and above bleed; otherwise thresholds are unchanged and the phone and host ask for a rerun.
  - `devicechange` fails only for the phone's own lost device; a disconnected state keeps calibration on restart; a `micDrops` count is added.
  - The Builder checks Realtime logs for room disconnections first.
- Both export rows become required test vectors.

### 2026-10-11 — CAPTION-008.2 Builder implementation and pre-coding log check
- Realtime check before coding: exact post-`d839f09` window contained 15 `realtime_logs` rows, 0 `ClientPresenceRateLimitReached`, and no participant channel/error failures; the only disconnect-like matches were normal informational tenant replication shutdown/restart entries.
- Implemented plausible room-check threshold application with the supplied vectors, 2-frame attack, sensitivity control/validation, calibration-preserving rejoin and headset-drop state with memory-only `micDrops`; export v2 records participant drops and per-row application.
- Implemented fixed near-field Universal-3.6 Pro headset transcription, 300 ms gated look-ahead silence frames, bounded reconnect, participant-topic caption relay with interim coalescing and sequence dedupe, exact host identity binding, host transcript/status UI and updated privacy/invite copy. Table and Connected paths remain unchanged.
- Verification: 175 tests / 29 files, typecheck, lint, production build and diff check passed. No physical UAT or real browser/provider session performed by Builder; 008.4 remains the physical acceptance gate.

### 2026-10-11 — CAPTION-008.2 joining-phone setup regression
- Trigger: human reports no microphone options after the captions implementation. Synced clean `main` at `aac146a`.
- Root cause reproduced: immediate non-null initial headset view bypassed the UI's null-only start button, so joining phones had no tap to request capture/enumeration. Pre-fix idle/start, stopped/restart and starting-feedback tests failed.
- Changed: explicit microphone-state entry/restart/permission feedback; no ready claim with a stopped mic. Input picker/constraints/transport/provider/thresholds unchanged. Debugging skill used inline with a persistent evidence checkpoint; no subagent requested.
- Verification: 179 tests/29 files, typecheck, lint, build and diff check passed. Isolated native Chromium UI + real worklet/fake media verified keyboard start, three input routes, selected track ID, selection/restart, stopped restart, zero page errors and no overflow at 390/1280 px. External network blocked; no live room/provider session or physical phone UAT. Initial harness lacked React preamble; corrected test server then passed. Browser/server closed, no audio/storage artifacts.
- Next action: publish and reload/rejoin phones; verify Start headset check and inputs, then continue the physical 008.2 script. No 008.3 work.

### 2026-10-11 — CAPTION-008.2 phone setup fix publication
- Source `df89148` pushed to main; GitHub combined status reported Vercel success: https://vercel.com/madziyis-projects/caption-assist/HB68pZaVw5LLj1toww39zMweRqEA.
- No live infrastructure change. Reload/rejoin physical phones and confirm the setup tap and browser-exposed inputs; full provider/browser-path and physical headset UAT remain outstanding.

### 2026-10-11 — Planner: 008.2 physical review, CAPTION-008.3 planned
- **Workspace incident:** at 14:42 the local working tree had 15 files rewritten to commit `663b57f` content while `HEAD` was `93929c1`, consistent with an editor checkpoint restore. The Planner verified they matched `663b57f` exactly and restored them to `HEAD`. Committed and deployed state was never affected.
- **Human physical result** (wired and Bluetooth headsets):
  - Captions work and are named by phone.
  - Bleed triggers captions when people sit close; a continuous slider is wanted.
  - The delay is about 2 s.
- **Export:**
  - Separation 4.4 and 6.9 dB (weak); 16.1 s of overlapping gates and 7 co-onsets in 160 s.
  - The wired phone's `openDb` showed its room-check tuning had been discarded (recalibrated or reloaded after the check).
  - The Bluetooth calibration own level of −41.6 vs a room-check −26.7 exposes an estimator weakness with on-device noise silencing.
- **Review gaps from 008.2:** no "As built (008.2)" section, no live provider check, no live end-to-end run, and the 200 ms trailing-edge interim delay. These are carried into the 008.3 verification.
- **Decision:** 008.3 is duplicate control.
  - **Part A:** continuous per-person slider (−15 to +6 dB, clamped to `[floor + 6, ownRef + 6]`), phone-reported `tuned` with "Room check needed", a peak-relative own-level estimator, and a leading-edge interim throttle.
  - **Part B:** per-caption relative-level evidence from a phone level history aligned to word timing, host clock alignment by minimum delay, and an arbiter. The arbiter hides weaker interims, holds finals up to 800 ms only when overlapping, suppresses text duplicates by level winner and suppresses weak bleed fragments. Also latency measurement per stage and export version 3.
- **Re-sequenced:** 008.4 is latency (evidence-driven, no visible accuracy loss); 008.5 is recovery plus UAT and closure.
- **Next action:** Builder implements 008.3.

### 2026-10-11 — CAPTION-008.3 Builder implementation and verification

- Preflight per human request: fetched GitHub and verified clean local `HEAD == origin/main == da7d3802eb928c5be8a9a57bdc3533ce7da59d8c`, with prior Builder handoff in ancestry. No user/checkpoint edits reset.
- Implemented Part A continuous numeric sensitivity/legacy mapping/clamps/250 ms sending, robust own estimator, phone tuning lifecycle and visible room-check-needed state, leading-edge 200 ms relay. Part B adds bounded capture history/evidence, provider word-end timing, minimum-delay clock alignment, headset-only duplicate arbiter/conditional 800 ms hold/replacements/restoration, host-only hidden-finals view, per-stage latency and anonymous export v3.
- Owed 008.2 corrections: preserve guest calibration on same-room re-entry while using the current transport; microphone failure stops STT and clears queued audio. Trailing caption delivery errors are caught and shown without falsely disconnecting a healthy room. No new headset-swap/background recovery policy.
- Documented implementation details: numeric own reference in presence for accurate warnings after refresh; 256-token comparison bound fails open; level-only removal counts replacement. Signed provider latency is preserved because word endpoints can slightly lead receipt. No provider/mode/look-ahead/turn-detection tuning, storage, schema or private-channel policy changes. Supabase guidance preserved Broadcast/coalesced Presence cadence.
- Verification: `npm test` 213 tests/33 files; typecheck, lint, production build and diff check passed. Native Chromium host/two fake-media phones used actual capture/worklet, live AssemblyAI and Supabase. Final comparison: four correct-name targets once, zero misses; two text and one level suppressions. Bypass: two duplicates/two wrong names, zero misses. Begin/Turn/Termination observed on both phones, no provider/page/quota errors, host capture zero; 390/1280 px and keyboard sliders/checkbox passed. Exact signed latency and sample counts in QUALITY.md; not human-perceived latency proof.
- Failed/variable evidence retained: initial harness calibration timeout unproven cause; isolated capture subsequently ready. Earlier comparison escaped one duplicate; diagnostic and final comparison passed without changing arbiter/provider parameters. Synthetic pipeline verification is not sustained real-acoustic acceptance.
- Supabase final comparison window 19:27–19:44 UTC: 15 Realtime rows, zero Presence rate-limit events; no live infrastructure change. Rooms ended, browsers/server closed, temporary synthetic audio deleted; no secrets/storage states/transcripts committed.
- Missing As built (008.2) and new As built (008.3) added. Status: source/live pipeline verified; publication and physical acceptance pending. Next: publish, verify Vercel status, then human six-step 008.3 script and Planner review; 008.4/008.5 not started.

### 2026-10-11 — CAPTION-008.3 publication

- Implementation `6695c60e823f655714db9ae09933a11c2b88e811` pushed to `main`; GitHub combined status reported Vercel success: https://vercel.com/madziyis-projects/caption-assist/8p9jzqvjnmnT8pqpFFKQBf8dua7P.
- Source/live-local pipeline checks are complete; deployment status only, no physical or deployed-device UAT inferred. No infrastructure/configuration change. Next owner: human physical script and Planner resync/review; 008.3 remains active until acceptance.

### 2026-10-11 — Human acceptance and headset UI/readability follow-up

- Human reports 008.3 "works perfectly now". Asked for a professional microphone chooser, rounded coloured Speaking/Quiet rectangle on both phones and host (host uncluttered), faster captions and fewer broken sentence blocks. Discussion approved flowing paragraphs and compact host row pills; explicit implementation approval leaves transcription timing unchanged.
- Synced clean `d87d7db`. Added microphone card/expandable browser-route help, shared failure-aware activity pills and headset-only pure paragraph composition (2 s pause, 80-word boundary, no merge across speaker/source/overlap). Original turn IDs/reducer/history/arbiter preserved; no delayed text, timing, provider, audio or transport changes.
- GSD quick skill could not run its normal roadmap workflow because this repository has no `.planning/ROADMAP.md`; used the allowed safe fallback in existing shared-context files, no new planning system or subagents. Plan/scope, verification and commit handoff kept explicit.
- Verification: 238 tests/36 files, typecheck, lint, build and diff check passed. Isolated native Chromium render checks passed at 390/1280 px and 100/200% root text, keyboard picker/help, status failures, paragraph interim/final/removal and reduced motion; screenshots inspected. Real fake-media capture/worklet picker/restart check passed (3 captures, 3 routes, zero page errors). Fixture selector/alias/reduced-motion/hash-navigation issues corrected and recorded in QUALITY.md; no product timing adjusted.
- No new live room/provider or physical device test; no external requests allowed in runners. Browsers/servers closed, synthetic screenshots ignored, no audio or state retained. Next: publish, verify deployment status, human reload/visual confirmation; 008.4 remains separately planned.

### 2026-10-11 — UI/readability follow-up publication

- Source `7d4e8b02c3fde98543ebdb285e9cea625972722e` pushed to main; GitHub combined status reported Vercel success: https://vercel.com/madziyis-projects/caption-assist/DApfCBtoFZrxyavYjxTZp735nioo.
- Presentation-only deployment, no configuration/timing/infrastructure changes. Next: human reloads host/phones and confirms picker, speaking pills and flowing paragraphs; latency optimization still requires separate approval.

### 2026-10-24 — CAPTION-008.4 latency tuning and OpenAI shadow implementation

- Synced clean `main` at `07555fead1d3c289e84d7ccfd036f952a522942e`. The human's explicit request reprioritized active work from the 008.3 UI follow-up to 008.4; 008.3 acceptance remains intact.
- Added Headset-only AssemblyAI `interruption_delay=0`, `min_turn_silence=100`, `max_turn_silence=1000`. Table and Connected options remain unchanged. The 300 ms look-ahead, gate thresholds, and 800 ms arbitration remain unchanged.
- Added monotonic local benchmark episodes, delayed-frame activity metadata, bounded PCM16 16→24 kHz interpolation, authenticated optional OpenAI client-secret route, ephemeral-key WebSocket shadow provider, opt-in participant panel, scripted references, normalized WER and entity matching. OpenAI remains observation-only and cannot publish or replace captions. No persistence/logging of transcripts, audio or credentials was added.
- Verification: `npm run typecheck`, `npm run lint`, serial Vitest (252 tests / 40 files), and `git diff --check` passed. `npm run build` completed successfully on retry after resource-related UI timeouts and Next `EPERM`; it printed the security-upgrade reminder for installed Next.js 16.4.0. The official Next.js advisory names 16.4.1 as patched; dependency upgrade is a separate follow-up and was not included here. Existing Playwright browser script could not run because its Playwright/Chromium prerequisites were absent. No live OpenAI call, deployment environment check, or physical-device test.
- Next: publish source handoff, inspect deployment status, and provide human wired/Bluetooth headset benchmark script. Do not claim provider winner or production migration before physical evidence.
