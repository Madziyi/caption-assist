# Active Initiative

**Initiative:** CAPTION-010 — Single Speaker Mode
**Status:** Implemented and verified locally; publication in progress. CAPTION-009 is shipped; its physical UAT remains pending separately.
**Baseline:** Clean fetched main d3ba7608ec238c86c05253646613c38561fdfdfd.

Objective: add Single Speaker Mode beside Open and Headset, using one local microphone and Pro STT without diarization. Open remains default. Words appear from partial events immediately. Paragraphs break every 80 words across finals/interims, irrespective of pauses/provider turn endings, without speaker labels. Provider: balanced, interruption delay 0, include_partial_turns true, no Voice Focus, revisions or silence overrides. Raw reducer/history/privacy contracts unchanged.

Order: provider configuration and pure word-count presentation; mode/UI wiring and focused tests; full typecheck/lint/serial tests/build; available browser and live synthetic provider checks; durable handoff, commit/push main, Vercel status verification.

Acceptance: 81st live word starts paragraph 2 without final/silence; long pauses do not split short paragraphs; final/revision replacement has no duplicates; no Supabase room or speaker naming; mode locks during capture; Open/Headset behavior preserved. No storage/audio retention, RLS, dependencies or Headset tuning changes.

Risks: provider latency/accuracy and physical sermon acoustics remain measured separately; partial wording can change before final. Human UAT: natural continuous sermon speech with 80+ words, pauses, stop/restart, readability and first-text feel.

Next action: publish and confirm Vercel status, then human tries a natural sermon/lecture with pauses and 80+ continuous words.
