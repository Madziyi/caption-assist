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
