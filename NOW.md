# Active Initiative

**Initiative:** CAPTION-008 - Headset Mode (separate mode: every speaker wears AirPods/a headset on their own phone; no room microphone)
**Active slice:** CAPTION-008.2 - Gate correction (room check tunes the gate, 2-frame attack, host sensitivity control, calibration survives rejoin), then gated per-phone transcription with Universal-3.6 Pro + Voice Focus `near-field`, captions relayed to the host and named by phone
**Status:** 008.2 published as `aac146a`; joining-phone setup regression fixed in this follow-up. Initialized idle views now offer Start headset check, starting states show permission feedback, and stopped microphones offer Turn microphone back on. 179 tests/29 files and all source gates pass; isolated native Chromium UI + simulated capture/worklet verified start, input selection, restart and 390/1280 px overflow. Live AssemblyAI browser-path and physical headset verification remain unverified.
**Owner:** Builder publishes the scoped setup fix and deployment evidence; then Planner/human resume the 008.2 physical script.

## Why

CAPTION-003.1-003.3 failed because phone microphones on a table hear neighbours almost as loudly as their owners. A headset microphone sits a few centimetres from its wearer's mouth, so each phone can tell its wearer from bleed by loudness, calibrated per person and per room. 008.1 showed on real hardware that this looks workable; 008.2 turns the gate into captions.

## Contracts for 008.2 (summary; the specification governs)

- Part A first:
  - Check the Realtime logs for room disconnections and fix them first if they persist.
  - Room-check bleed sets each phone's thresholds, but only from a plausible row (own reading present, at least calibrated own − 12 dB, and above bleed). Otherwise the thresholds stay unchanged and the phone and host ask for a rerun.
  - An unrelated `devicechange` no longer fails the microphone. A headset drop shows "Your headset disconnected." and keeps calibration on restart; drops are counted.
  - The gate opens after 2 consecutive frames above `openDb`.
  - The host sets sensitivity per person (Less / Normal / More: `+4 / 0 / -3 dB`, clamped to `[floor + 6, own - 3]`) through a new validated `headset-sensitivity` control.
  - The guest's `HeadsetParticipant` is reused across rejoins of the same room.
  - New Part A tests close the 008.1 gaps.
- Each ready phone streams to its own AssemblyAI session:
  - Uses `HEADSET_ASSEMBLYAI_OPTIONS = connectedAssemblyAIOptions("near-field")`: `universal-3-6-pro`, `voice_focus=near-field`, `speaker_labels=false`, `mode=balanced`, `format_turns=true`, 16 kHz.
  - No fallback on rejection; failure states are visible with Retry; reconnect is bounded.
- Audio sent is gated through a 3-frame (300 ms) look-ahead, so speech goes out with its first syllable and silence frames are sent otherwise. Nothing non-silent is sent during calibration or a room check.
- Captions are relayed on the phone's own participant topic:
  - Uses the pre-pivot `CaptionEnvelope` with sequence numbers.
  - The host validates, dedupes and binds identity with `exactIdentity`.
  - No relay-acks; interims are coalesced to at most 5 per second per phone.
  - Headset rooms only.
- The host's main stage shows named captions, with a compact per-person status strip (speaking + caption state).
- New privacy and invite copy as written in the specification.
- No storage, no schema or policy change. Table and Connected behaviour is unchanged.
- The Builder records Supabase Realtime quotas and AssemblyAI Universal-3.6 Pro / Voice Focus pricing and the concurrency limit, dated, in QUALITY.md.

## Next action

Human: reload host/phone pages, rejoin and tap Start headset check; confirm input selection is restored, then run the 008.2 physical multi-person script. Do not infer acoustic or mobile recovery acceptance from the automated or isolated browser gates.

## Paused

CAPTION-003 (Connected Mode, CAPTION-003.4 room microphone + voice identification) is complete in source and deployed; its physical multi-person UAT is still outstanding and paused while CAPTION-008 is active. See `CAPTION-003-HANDOFF.md`.
