# CAPTION-010 — Single Speaker Mode

Human request: caption a pastor's sermon or other single-speaker presentation accurately and quickly, without diarization or waiting for silence; split paragraphs by word count.

## As built

Baseline: clean fetched main `d3ba7608ec238c86c05253646613c38561fdfdfd`. Added Single Speaker Mode between Open and Headset. Open remains default; selecting a mode is locked during capture. Single uses the existing local ConversationSession/microphone/token/reconnect/stop path, no Supabase room. Open and Headset options/logic remain unchanged.

AssemblyAI Universal-3.6 Pro, speaker_labels=false, balanced, interruption_delay=0, include_partial_turns=true, 16 kHz mono and formatted turns. No Voice Focus, revision interval or explicit silence overrides. Provider finalization can still use its endpointing; visible words and paragraph boundaries do not wait for it. Official parameter reference: https://www.assemblyai.com/docs/streaming/api-spec/streaming-websocket.

Pure singleSpeakerReadingBlocks() packs 80 words per paragraph across finalized records and the current interim, regardless of pauses/identity/provider turn boundaries. Even one long unfinished turn gets readable paragraphs immediately. Source-turn replacement/corrections recompute without stale duplicate text; raw records/history remain intact. No speaker labels or naming UI; Single history hides the unnecessary neutral identity label and still contains finals only. aria-live polite, aria-atomic false; no new delays/animations, persistent transcripts or audio storage.

## Verification — 2026-10-24

- Typecheck/lint/production build (Next.js 16.4.1)/diff check passed. Serial Vitest: 197 tests / 38 files, including provider settings, mode wiring, 80/81/161-word boundaries during interims, packing across finals and minute-long gaps, empty input, replacement/correction and source immutability. Active Headset suites passed.
- Actual page in Chromium, fake media + real worklet and mocked provider: keyboard mode/start, no diarization config, 161 interim words split into three paragraphs before final, no speaker labels, final replacement without duplication, new partial, stop and aria passed. 390/1280 px at 100/200% text: no overflow; zero page errors. Screenshot inspected. Existing Open browser regression also passed.
- Short live synthetic Single provider smoke: Begin 1, Turn 12 (9 partial / 3 final), Termination 1, Error 0, zero speaker labels, no SpeakerRevision. Partial text arrived before the first final. Begin echoed Pro/balanced/speaker_labels false/voice_focus null. Credentials/audio/transcripts stayed in memory; no audio files retained. This verifies configuration/lifecycle, not real-sermon accuracy or measured human-perceived latency.
- No dependency/schema/RLS/retention/Headset gate/arbitration changes; no OpenAI call or new benchmark.

## Human acceptance

Select Single Speaker Mode and read naturally for a minute with 80+ words, hesitations and longer pauses. Confirm words keep arriving during speech, each paragraph reaches 80 words before another starts, pauses don't add paragraphs, no Someone/Speaker labels appear, and stopping/restarting works. Then try the actual sermon microphone/PA setup and record first-text feel, missing/incorrect words and readability. Physical acoustics, sustained sermon sessions and screen-reader device UAT remain unverified. CAPTION-009 physical UAT remains separate.

- Publication: implementation `dd04ae5cd23d2dcac9319d912daf8d3861a54f5b` pushed to main; Vercel **success** observed: [deployment status](https://vercel.com/madziyis-projects/caption-assist/EqnqHNz3WrgEL2zp8gFG2PvG3WzA). Deployment-check evidence only; no deployed physical sermon/microphone UAT inferred. Documentation-only handoff follows.
