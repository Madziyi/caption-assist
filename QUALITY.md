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
