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
