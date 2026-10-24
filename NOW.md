# Active Initiative

**Initiative:** CAPTION-009 - Open Mode + Universal-3.6 Pro + Stable Reading
**Status:** Source implemented; automated, browser and live synthetic provider/Headset verification passed. Publication in progress; physical acceptance pending. Human request supersedes CAPTION-008.4 follow-up; accepted Headset behavior remains protected.
**Baseline:** Clean main, HEAD == origin/main == 619154d8e303a793ec469096d442cf89a982604d after fetch.

Scope: two modes (Open default, Headset); remove Connected runtime and voice identification, reject legacy rooms without migration; Open uses Pro/balanced/diarization/0 ms interruption/120 s revisions without Voice Focus or silence overrides. Pure Open reading derivation keeps words immediate, groups same speakers and transient uncertainty, preserves confirmed changes and revisions, with 2 s / 80 word paragraph limits.

Order: classify references, mode/controller/transport cleanup, provider/Open presentation, focused and full tests, available browser/provider/live checks, durable handoff, commit/push main and deployment check.

Non-goals: Hybrid, Jev, new benchmarks, security/dependency work, Headset gate/arbitration tuning, history redesign, retention or RLS changes.

Acceptance: stable accessible live reading without delayed text or invented finalized identity; exact Headset identity and infrastructure preserved; legacy rooms unavailable. Required gates: typecheck, lint, serial Vitest, build, diff check; browser/provider checks where available. Physical Open five-scenario UAT and short two-person Headset regression remain human-owned.

Next action: publish verified handoff, confirm Vercel check, then human physical Open and short Headset UAT in CAPTION-009-OPEN-MODE.md.
