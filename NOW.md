# Active Initiative

**Initiative:** CAPTION-008 - Headset Mode (separate mode: every speaker wears AirPods/a headset on their own phone; no room microphone)
**Active slice:** CAPTION-008.1 - Headset check, calibration, room check and gate preview (no audio leaves any device)
**Status:** 008.1 source/live migration implemented. Human confirms host input selection/calibration now works, but joining phones were disconnected during setup. Verified Realtime logs show ClientPresenceRateLimitReached; setup exceeded five Presence writes per 30 s. Immediate headset state now uses Broadcast with throttled Presence snapshots. Live local host + two simulated phones completed calibration, room-check matrix and refresh/rejoin without disconnects. 168 tests/27 files and source gates pass. Physical phone/Bluetooth confirmation remains pending. Full specification: `CAPTION-008-HEADSET-MODE.md`.
**Owner:** Human runs the physical test script and returns exports to the Planner after the mobile fix is deployed.

## Why

CAPTION-003.1-003.3 failed because phone microphones on a table hear neighbours almost as loudly as their owners. A headset microphone sits a few centimetres from its wearer's mouth, so each phone should be able to tell its wearer from bleed by loudness, calibrated per person and per room. CAPTION-008.1 measures that on real hardware before any transcription is built.

## Contracts for 008.1 (summary; the specification governs)

- New persisted room mode `connected | headset` (additive migration; `create_headset` operation; mode returned by every snapshot and by `check`). Apply live to `cqnyvevhuxwfzhqpmccn` and pass the rollback-only SQL test **before** pushing dependent source; stop and hand the SQL to the human if access is unavailable.
- Headset Mode: no room microphone, no voice identification, no AssemblyAI token or socket, no audio over any network. The host opens a microphone only via the optional "Set up my headset".
- Phones capture with automatic gain control, noise suppression and echo cancellation requested off, and report what the browser actually applied, plus the sanitized mic label and input class.
- Calibration (quiet floor, own voice), host-orchestrated room check (each person reads in turn while every phone measures), per-phone gate with hysteresis and hold, speaking lights on phone and host, anonymized results export. All constants are provisional.
- New signals are small JSON on existing private topics (participant presence/broadcast, host control); no policy change.
- Table Mode and Connected Mode (CAPTION-003.4) behaviour unchanged.

## Decided for 008.2 (not built in 008.1)

Each phone transcribes its own gated audio with AssemblyAI **Universal-3.6 Pro + Voice Focus `near-field`**, `speaker_labels=false`, `mode=balanced`, `format_turns=true`, with no silent fallback on rejection. Captions are named by the sending phone's channel identity.

## Next action

Human reloads the deployed host/phone pages, rejoins and completes participant headset setup and a host room check; then returns anonymized exports/observations from the physical script to the Planner for the 008.2 go/no-go. Do not start 008.2.

## Paused

CAPTION-003 (Connected Mode, CAPTION-003.4 room microphone + voice identification) is complete in source and deployed; its physical multi-person UAT is still outstanding and paused while CAPTION-008 is active. See `CAPTION-003-HANDOFF.md`.
