# Quality & Field Verification Ledger

This file records measured evidence about whether the product is actually usable as a real-time accessibility tool.

Do not invent values. Mark unmeasured items `unverified`.

## Bootstrap evidence — 2026-10-10

The repository contains no application, browser surface, microphone path, speech-provider integration, or deployed environment. No product-quality measurements or UAT evidence were possible during bootstrap; all quality dimensions below remain `unverified`.

## Core quality dimensions

### 1. Caption responsiveness

Track where feasible:
- time from audible speech onset to first useful partial text;
- time from end-of-turn to stable/final text;
- UI render delay after provider event receipt.

Initial engineering goal for CAPTION-001:
- captions should feel conversational under stable broadband;
- establish measured baseline before freezing numeric SLA targets.

Status: **unverified**

### 2. Transcript correctness

Track:
- obvious omissions/substitutions in quiet speech;
- degradation with distance/background noise;
- representative accents/speaking speeds;
- overlapping speech behavior.

Formal WER/CER benchmarking belongs primarily to `CAPTION-007`.

Status: **unverified**

### 3. Speaker attribution

For Table Mode:
- diarization consistency;
- short-utterance behavior;
- overlap behavior;
- renamed-speaker stability.

For Connected Mode:
- connection identity must map deterministically to participant identity.

Status: **unverified**

### 4. Reliability

Track:
- permission-denied recovery;
- provider disconnect/reconnect;
- Wi-Fi interruption/recovery;
- browser tab visibility/suspension behavior;
- stop/restart behavior;
- duplicate/interim caption artifacts;
- sustained-session stability.

CAPTION-001 target test: one uninterrupted **30-minute** host-microphone caption session with no manual recovery under stable conditions, plus an intentional network interruption/reconnect test.

Status: **unverified**

### 5. Accessibility/readability

Track:
- readable current caption at normal table viewing distance;
- large text behavior;
- contrast;
- current-speaker prominence;
- keyboard operation;
- status/error visibility;
- whether the user can follow the conversation without continuously interacting with controls.

Status: **unverified**

### 6. Device/browser matrix

Record only what was actually tested.

| Device / OS | Browser | Host mic | Guest mic | Bluetooth mic | 30-min session | Notes |
|---|---|---:|---:|---:|---:|---|
| unverified | unverified | — | — | — | — | — |

### 7. Cost

Record measured provider billing/configuration or carefully calculated cost from the exact live model/rate. Include date because provider pricing can change.

| Date | Provider/model | Mode | Concurrent streams | Cost basis | Estimated/measured session cost |
|---|---|---|---:|---|---|
| — | unverified | — | — | — | — |

## Per-task evidence

### 2026-10-10 — CAPTION-001 source and browser verification
- Environment/device: Codex in-app browser on the local Next.js development server; desktop viewport. Node.js `v22.15.0` for source gates.
- Audio path: Builder-observed real microphone/provider path was not completed during that verification session; the browser remained at the microphone-permission state without a usable local provider credential. A later user-observed real UAT report is recorded below; no raw audio was stored.
- Session length: UI smoke session only; started from idle, observed the permission-needed state, then ended the conversation.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: Speaker attribution intentionally out of scope; `speakerId` remains `null`.
- Failure/recovery tests: Missing server configuration returned controlled HTTP 503 JSON without exposing a secret. Reconnect and cleanup logic are covered at source level but need real provider verification.
- Accessibility observations: Idle/start/end states rendered; keyboard focus reached the primary action with a visible focus ring. Computed browser styles reported Atkinson Hyperlegible for body text and Inter for headings. Narrow/mobile viewport and text-scaling UAT remain pending.
- Cost evidence: Not measured.
- Result: Automated source gates passed; Builder-observed real microphone/provider acceptance was unavailable in that environment. Later user-observed functional validation is recorded below, with deeper quality checks still pending.

### 2026-10-10 — CAPTION-001 user-observed real UAT
- Environment/device: Not reported by the user.
- Audio path: The user reports using the real application and reports that captioning is functioning very well. This is user-observed evidence for the actual microphone → AssemblyAI → caption UI path, not Builder-observed UAT.
- Session length: Not reported.
- Latency observations/measurements: No exact latency measurement reported.
- Accuracy observations/measurements: Qualitative report only; no WER, accuracy percentage, or representative test set reported.
- Speaker observations: Speaker attribution remains out of scope for CAPTION-001.
- Failure/recovery tests: Not reported; intentional network interruption/reconnect remains pending.
- Accessibility observations: Newest-first finalized-caption ordering is implemented. No additional device, browser, or text-scaling details were reported.
- Cost evidence: Not measured.
- Result: User-observed functional validation supports progression to CAPTION-002. Sustained 30-minute stability, reconnect behavior, formal latency/accuracy measurements, and broader browser/device coverage remain pending.

### 2026-10-10 — CAPTION-002 source and browser verification
- Environment/device: Codex in-app browser on the local Next.js development server; browser viewport shown in the captured desktop/narrow layout. Node.js `v22.15.0` for source gates.
- Audio path: Builder did not complete a real multi-speaker microphone → AssemblyAI diarization session. The browser reached the microphone-permission state and the conversation-ended state; no raw audio was stored.
- Session length: Browser smoke interaction only; no sustained provider session.
- Latency observations/measurements: No real diarization latency measurement. Source behavior renders interim text immediately and processes speaker metadata in the provider event path without an added request or intentional debounce.
- Accuracy observations/measurements: No physical-speaker or formal accuracy measurement.
- Speaker observations: Automated provider tests covered stable opaque connection-scoped IDs, unresolved `UNKNOWN`/`PENDING`/missing labels, mixed word-level segmentation, and speaker revisions. No stable physical speaker count was observed.
- Failure/recovery tests: Source tests covered revision replacement and connection namespace isolation. Real reconnect identity behavior was not observed.
- Accessibility observations: Source implements interactive stable speaker labels, neutral non-interactive `Someone`, visible focus styles, keyboard Escape handling, responsive speaker management, and left/right plus name/accent cues. Browser UAT observed the caption-first layout, permission-needed status, and end state; the provider-backed panel was not reachable without a stable speaker event.
- Cost evidence: Not measured.
- Result: CAPTION-002 source implementation and browser/source verification are complete. Real multi-speaker diarization, naming during speech, revision, reconnect, and responsive provider-backed UAT remain pending and are not being represented as Builder-observed results.

### 2026-10-10 — CAPTION-002 — caption transition readability adjustment
- Environment/device: Codex in-app browser on the local Next.js development server; no new audio measurement performed.
- Accessibility observations: Replaced the duplicate large `Conversation` heading with `Captions`. Browser smoke verification showed the updated heading and enlarged caption stage. The latest finalized caption now remains visible in the large caption stage for a 2-second visual dwell while the history state updates immediately, so live caption latency and history ordering are not intentionally delayed.
- Result: User-requested readability adjustment implemented; the dwell duration is a product-tuning value and has not been measured against field preference.

### 2026-10-10 — CAPTION-002 — compact header refinement
- Environment/device: Local Next.js development server; no new audio measurement performed.
- Accessibility observations: Reduced the header to a compact menu-like brand/status row while retaining the visible status notification and its live-region behavior. The status remains available for connection and error feedback.
- Result: User-requested header density adjustment implemented; no provider, audio, or live-system behavior changed.

### 2026-10-10 — CAPTION-002 — caption stage space refinement
- Environment/device: Codex in-app browser on the local Next.js development server; desktop viewport.
- Accessibility observations: Reduced the shell's top padding by approximately 90%, moved the live speaker label to the top of the caption stage, and allowed the live caption region to use the remaining stage height instead of limiting it to 22vh.
- Result: User-requested layout refinement implemented; no provider, audio, or caption timing behavior changed.

### 2026-10-10 — CAPTION-002 — user-observed product/UAT acceptance
- Environment/device: Not reported by the user.
- Audio path: The user personally reviewed and tested the current speaker-aware interface and reports that it is working well and that they are happy with what they tested and saw. This is user-observed product/UAT acceptance, not Builder-observed provider benchmarking.
- Session length: Not reported.
- Latency observations/measurements: No exact latency measurement reported.
- Accuracy observations/measurements: No formal diarization accuracy, WER, or DER measurement reported.
- Speaker observations: No physical speaker count or quantitative attribution result reported.
- Failure/recovery tests: Sustained-session and intentional reconnect results were not reported.
- Accessibility observations: User acceptance supports progression of the reviewed speaker-aware interface. Narrow/mobile speaker-placement verification was not reported.
- Cost evidence: Not measured.
- Result: CAPTION-002 is accepted for progression based on user-observed product/UAT feedback. Formal diarization accuracy, exact latency, sustained-session stability, reconnect behavior, broader device/browser coverage, and narrow/mobile speaker-placement verification remain pending.

### 2026-10-10 — CAPTION-002 — continuous transcript presentation refinement
- Environment/device: Codex in-app browser on the local Next.js development server; desktop idle-state smoke verification.
- Accessibility observations: Expanded the main caption stage to 70vh, kept finalized turns visible in chronological order, appended the current interim turn at the bottom, auto-scrolled within the stage, reduced live caption text by 15%, reduced history text by 30%, and placed history speaker labels beside their left/right bubbles.
- Result: User-requested presentation refinement implemented. Provider behavior, caption event normalization, speaker identity, privacy, and separate newest-first history behavior remain unchanged. Live multi-turn scrolling and narrow/mobile side-label layout still require user/provider-backed verification.

### 2026-10-10 — CAPTION-002 — continuous transcript layout tuning
- Environment/device: Source-level verification; no new provider session performed.
- Accessibility observations: Set the live caption box to a fixed 65vh height with no minimum height, kept its internal scroll behavior, and centered the live speaker indicator above each live caption line. Older lines scroll out of the live box as it fills while remaining available in caption history.
- Result: User-requested layout tuning implemented; no caption event, speaker identity, history retention, or provider behavior changed.

### 2026-10-10 — CAPTION-002 — live caption text scale tuning
- Environment/device: Source-level verification; no new provider session performed.
- Accessibility observations: Reduced the live caption text scale by 25% from the prior tuned size to fit more transcript lines in the fixed 65vh live box. History text size and live scrolling behavior are unchanged.
- Result: User-requested readability adjustment implemented; no caption event, speaker identity, history retention, or provider behavior changed.

### 2026-10-10 — CAPTION-002 — caption history panel refinement
- Environment/device: Codex in-app browser on the local Next.js development server; desktop idle-state UI smoke verification, no new provider session performed.
- Audio path: No new microphone or AssemblyAI verification performed.
- Session length: Not measured.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: History continues to use the existing newest-first grouped speaker records; no physical speaker result was inferred.
- Failure/recovery tests: Not performed.
- Accessibility observations: Removed the bottom history region from normal page flow; added a visible header Caption history control and keyboard-closeable left-side pane sharing the screen with the live caption area at up to half the workspace width. Each history group presents its speaker name above the caption text, regardless of the prior left/right chat alignment.
- Cost evidence: Not measured.
- Result: User-requested navigation/layout refinement implemented. Browser smoke verification showed the header control, side-by-side left history pane, live caption area shifted right to accommodate it, and Escape dismissal; provider-backed history and narrow/mobile review remain pending. Provider, audio, caption event, retention, and speaker identity behavior are unchanged.

### 2026-10-10 — CAPTION-002 — header controls and caption stage refinement
- Environment/device: Codex in-app browser on the local Next.js development server; source-level UI refinement, no new provider session performed.
- Audio path: No new microphone or AssemblyAI verification performed.
- Session length: Not measured.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: No physical speaker result was inferred.
- Failure/recovery tests: No provider/reconnect test performed; the browser full-screen toggle was exercised and exited successfully.
- Accessibility observations: Moved the start action into the header, added a labeled full-screen toggle with pressed state, kept the end action available while active, and expanded the live caption stage to a fixed 85vh with no minimum height.
- Cost evidence: Not measured.
- Result: User-requested presentation refinement implemented. Browser smoke verification showed Start Conversation and Full Screen in the header, the 85vh caption stage, successful full-screen entry/exit, and the side-by-side history pane. Audio, provider, caption event, history retention, and speaker identity behavior are unchanged; narrow/mobile review remains pending.

### 2026-10-10 — CAPTION-002 — header conversation action refinement
- Environment/device: Codex in-app browser on the local Next.js development server; source-level UI refinement, no new provider session performed.
- Audio path: No new microphone or AssemblyAI verification performed.
- Session length: Not measured.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: No physical speaker result was inferred.
- Failure/recovery tests: Not performed.
- Accessibility observations: Removed the footer control bar and made the header conversation action swap between Start Conversation and End Conversation in the same position according to session state.
- Cost evidence: Not measured.
- Result: User-requested control-placement refinement implemented. Idle browser smoke verification showed the header Start Conversation action and no footer; the active End Conversation swap is source-verified but was not exercised without starting a microphone session. Provider, audio, caption event, history retention, full-screen, and speaker identity behavior are unchanged.

### 2026-10-10 — CAPTION-002 — live speaker label color refinement
- Environment/device: Codex in-app browser on the local Next.js development server; source-level visual refinement, no new provider session performed.
- Audio path: No new microphone or AssemblyAI verification performed.
- Session length: Not measured.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: No physical speaker result was inferred.
- Failure/recovery tests: Not performed.
- Accessibility observations: Set live caption-area speaker label text to a lighter neutral gray while retaining colored speaker dots as visual indicators. Caption-history speaker colors remain unchanged.
- Cost evidence: Not measured.
- Result: User-requested live label readability refinement implemented; provider, audio, caption event, history retention, and speaker identity behavior are unchanged. Browser/provider-backed live speaker review remains pending.

### 2026-10-10 — CAPTION-002 — user-observed live speaker label confirmation
- Environment/device: Not reported by the user.
- Audio path: The user confirmed that the live speaker label color change worked well; no new provider or microphone details were reported.
- Session length: Not reported.
- Latency observations/measurements: Not measured.
- Accuracy observations/measurements: Not measured.
- Speaker observations: No physical speaker count or attribution result was reported.
- Failure/recovery tests: Not reported.
- Accessibility observations: User confirmed the lighter gray live speaker label change.
- Cost evidence: Not measured.
- Result: User-observed visual/product confirmation recorded. No broader provider, audio, latency, accuracy, or device/browser claims are inferred.

Append concise entries:

```text
### YYYY-MM-DD — <task>
- Environment/device:
- Audio path:
- Session length:
- Latency observations/measurements:
- Accuracy observations/measurements:
- Speaker observations:
- Failure/recovery tests:
- Accessibility observations:
- Cost evidence:
- Result:
```

### 2026-10-11 — CAPTION-003 Connected source / live infrastructure verification
- Environment/device: Windows Builder tooling; local Codex in-app browser, default host viewport and 390×844 phone-width participant route. No physical phone was tested.
- Audio path: No real microphone → AssemblyAI → Supabase → host session completed. The user supplied local environment values; all required names are nonempty and configured host creation/end passed. The AssemblyAI key was not printed or validated by real speech.
- Automated: typecheck/lint passed; 51 tests across 12 files passed; production build and diff check passed. Coverage includes separate diarization modes, exact membership identity, independent interims, muted joins/rejoins, capture cleanup, permission/meter setup, no visibility/blur mute, stale removal/end filtering, rename resolution and local QR host controls.
- Live SQL: Both metadata/RLS migrations applied to the existing caption-assist project. Rollback-only tests passed for identity reuse, duplicate names, rename, end/expiry, removal, application-table RLS, service-only RPC and private-topic authorization, including Broadcast denial on the advisory Presence topic.
- Live transport: Anonymous sign-in worked. Direct private Realtime guest→host synthetic broadcast succeeded; unrelated user/other-participant subscriptions and guest control publication denied. First authorized subscription failed without useful detail; focused second attempt passed. Root cause remains unconfirmed.
- Latency: One small synthetic same-process send→host-receive observation 169.8906 ms. Not STT latency, phone latency, mean/percentile or production guarantee. Application round-trip acknowledgements are separately available in memory; cross-device clocks are not assumed synchronized.
- Accessibility: Browser showed mode selector, controlled unavailable-setup feedback, preserved history side pane/Escape dismissal, Full Screen entry, and phone-width name form. Mocked UI tests verified local QR dialog, locked active mode, You muted/count, permission explanation before mic check, and release-before-muted-join. Full configured Connected app/device UAT remains unverified.
- Background/Wake Lock: Source continues healthy capture across visibility/blur changes and detects actual track/AudioContext interruption. No desktop audio tab-switch, Android/iPhone app-switch, PWA or Wake Lock test performed; browser/OS limitations remain unmeasured.
- Quality not yet measured: Physical QR scan/join latency, selected real mic, real mute/unmute, speech identity/accuracy, overlapping speakers, end-to-end reconnect/removal/end, sustained session and cost.
- Cleanup: Disposable test rooms ended and six synthetic Auth users deleted with cascading room/membership cleanup; query confirmed zero test rooms remain. SQL fixtures rolled back.
- Result: Source and infrastructure security verified; CAPTION-003 remains active/partial pending host + phone audio UAT. See CAPTION-003-HANDOFF.md.

- Configured browser follow-up: live room creation opened QR with muted You/count one, locked mode and personal Unmute. Mic activation remained pending in IAB; End succeeded and returned ended state, then the old invitation showed conversation-ended feedback. No completed capture or speech session inferred. Only IAB was available, so no independent guest browser or physical-device UAT. Production rebuild passed with the user-supplied environment.

### 2026-10-11 - CAPTION-003 one-row desktop header
- User-requested CSS refinement expands the shell to available width, keeps desktop title/controls/status on one row, and uses compact readable control spacing/type. Narrow screens retain wrapping.
- Local IAB: Table idle and Connected active/ended checked at measured 1280 CSS pixels; active buttons shared the same top coordinate, status centered, document width did not exceed viewport. Ended Start New Conversation fit on the same row. Measured 391 CSS pixel view wrapped without horizontal overflow. Created verification room ended; no microphone/audio session started.
- Typecheck, lint and production build passed. No new provider, speech, latency, background or physical-device evidence.

### 2026-10-11 — CAPTION-003 user acceptance
- Environment/device: Published application; exact device/browser matrix not reported.
- Audio path: User reports deployed Connected Mode working perfectly.
- Accessibility/UI: User made/accepted additional UI refinements.
- Result: User-observed product acceptance recorded. CAPTION-003 accepted for progression.

### 2026-10-11 - CAPTION-003.1 cross-microphone correction
- User evidence: Deployed Connected Mode testing revealed duplicate physical speech when nearby personal microphones heard the same person. This supersedes earlier general product acceptance. Device/browser matrix, mic count and quantitative duplicate counts were not reported.
- Source: Synchronous host-memory reconciliation only; 4+ tokens >=0.85 ordered Dice within 1800 ms; 3-token exact within 600 ms; 1-2 tokens preserved. No deliberate buffering or comparison network call. Word recognition confidence preserved separately; >=0.15 interim leader margin, stable final label.
- Verification: 93 tests / 13 files passed; typecheck/lint and production build passed. Synthetic tests cover matching/divergent/short/repeated/simultaneous speech, three-source clusters, confidence, interim cleanup, removal, expiry and Connected re-entry. Existing UI/Table tests passed; current header/layout source untouched.
- Real-device UAT: Not performed by Builder. Before/after duplicate count, false/missed suppression, interim label switching, perceived caption latency, physical devices and number of open mics remain unmeasured for the fix. Text matching does not prove the human speaker. No accuracy percentages inferred.
- Next measurement: Deployed two/three phones naturally placed, each owner's speech, unrelated simultaneous sentences and simultaneous Yes. Record the above observations before accepting CAPTION-003; CAPTION-004 deferred.

### 2026-10-11 - CAPTION-003.1 failed acceptance / diagnostic observation
- User evidence: Duplicate captions persisted during deployed co-located Connected microphone testing. This is failed suppression acceptance; exact devices, browsers, mic counts, transcript differences and receive timing were not supplied. No root cause or threshold change inferred.
- Source: Opt-in ?captionDebug=1 host-local metrics ledger, latest 30 decisions; opaque IDs copied, display names resolved in panel. Comparison gates, timing anchor, exact-three-word result, short policy, conflict/oversize reasons, skipped merges and metadata-only expired-final hints exposed. No text/tokens/credentials/URLs in records or copies; no storage/diagnostic traffic. Constants unchanged. Optional similarity completes after caption dispatch.
- Automated: 109 tests / 15 files passed; typecheck, lint and production build passed. Tests cover matched suppression/clustered partials, timing/similarity/length failures, short/exact speech, conflict guards, oversized/expired hints, committed-final skips, bounded private records, disabled default, clear/copy controls, Table-only hiding and enabled/disabled action/clock equivalence.
- Browser: Local IAB opt-in Connected panel with constants and controls observed; hidden in Table and ordinary Connected URL. Measured 1280 and 391 CSS pixel layouts had no horizontal overflow. Empty-state panel only; no physical microphone/provider session performed.
- Measurements still pending: Real missed/false suppression, duplicate counts, label switching, perceived latency, number of open mics and devices/browsers. No accuracy percentages inferred.
- Next test: Open deployed host with ?captionDebug=1 before creating/restoring room. Clear before each two/three-device scenario, copy promptly after escaped duplicate (last 30 comparisons only), record scenario/device/browser/mic count and observed duplicate/switching/latency separately without retaining private transcripts. Repeat owner speech, different simultaneous speech and simultaneous Yes. CAPTION-003 open; CAPTION-004 not started.
