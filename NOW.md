# Active Initiative

**Initiative:** CAPTION-008 - Headset Mode (separate mode: every speaker wears AirPods/a headset on their own phone; no room microphone)
**Active slice:** CAPTION-008.2 - Gate correction (room check tunes the gate, 2-frame attack, host sensitivity control, calibration survives rejoin), then gated per-phone transcription with Universal-3.6 Pro + Voice Focus `near-field`, captions relayed to the host and named by phone
**Status:** Ready for Builder. 008.1 is deployed and the human tried it on real phones and headsets: "satisfied with the results, might need to calibrate for less sensitivity, but this could actually work". No exports or device models were returned. Planner go/no-go: **GO**. Planner review found that the room check never applies the measured bleed to the gate, so every gate keeps the provisional `ownDb - 10` threshold (a likely cause of over-sensitivity), and that calibration is lost on rejoin. Full specification: `CAPTION-008-HEADSET-MODE.md` ("Planner review of 008.1" and "CAPTION-008.2 specification").
**Owner:** Builder implements 008.2 Part A, then Part B, verifies, updates durable context and pushes. The human then runs the 008.2 physical test script and returns exports and notes to the Planner.

## Why

CAPTION-003.1-003.3 failed because phone microphones on a table hear neighbours almost as loudly as their owners. A headset microphone sits a few centimetres from its wearer's mouth, so each phone can tell its wearer from bleed by loudness, calibrated per person and per room. 008.1 showed on real hardware that this looks workable; 008.2 turns the gate into captions.

## Contracts for 008.2 (summary; the specification governs)

- Part A first:
  - Room-check bleed sets each phone's thresholds.
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

Builder: sync `main`, read `CAPTION-008-HEADSET-MODE.md` (008.1 as built, Planner review, 008.2 specification) and implement 008.2.

## Paused

CAPTION-003 (Connected Mode, CAPTION-003.4 room microphone + voice identification) is complete in source and deployed; its physical multi-person UAT is still outstanding and paused while CAPTION-008 is active. See `CAPTION-003-HANDOFF.md`.
