# Active Initiative

**Initiative:** CAPTION-010 — Single Speaker paragraph correction
**Status:** Replaced the 80-word rule with a pause of at least 3000 ms; source/browser verification passed, publication in progress.
**Baseline:** Clean fetched main 0ea492cbbe8a6e43fbe4f7cea18f53de1bee6186.

Human correction: continuous sermon speech must stay in one paragraph regardless of word count. On resumed speech after >=3 seconds of silence, start a new paragraph immediately. Short pauses/provider finals do not split it. No timers or waiting to display words; derive the gap from preceding last-word audio endpoint to next speech start. Missing endpoint evidence keeps the paragraph together. No diarization/labels.

Scope: Single presentation helper, tests/browser harness and durable contracts. Raw reducer/history, STT settings, Open/Headset and privacy remain unchanged. No provider/schema/dependency changes.

Verification: typecheck, lint, serial Vitest (201 tests / 38 files), build and diff check; actual-page Chromium fake-media worklet/provider fixture proves 161 continuous interim words stay together and an exact 3-second speech gap creates paragraph two before final. 390/1280 px at 100/200% text, no overflow/page errors. Physical sermon acoustics/readability still require human UAT.

Next action: publish verified change, check Vercel status, then human speaks continuously past 80 words and resumes after a 3-second pause.
