# Active Initiative

**Initiative:** CAPTION-003 - Connected Mode / QR Participant Rooms
**Active correction:** CAPTION-003.1 - Temporary observation-only reconciliation diagnostics
**Status:** User real-device suppression acceptance failed: duplicates still observed. Observation-only diagnostics implemented; 109 tests / 15 files, typecheck, lint and production build passed. Matching constants and suppression behavior unchanged. Diff check passed; diagnostics implementation a308e231b3c14a6f319cb4096692d64ad0d2da77 pushed to main and GitHub Vercel status reported success. Physical-device diagnostic test pending.
**Owner:** Builder until verified commit/push. CAPTION-004 planning/implementation is deferred by the current user instruction.

## Objective and contracts

A participant channel identifies the microphone/source exactly, not necessarily the physical human speaker. Nearby open microphones can hear the same speech. Keep membership identity, colors, names, private transport, removal filtering and the accepted header/layout intact. Table Mode remains unchanged; host room mic remains OFF in Connected Mode.

CAPTION-003.1 adds deterministic application-owned CrossMicReconciler after authorized exactIdentity delivery and before Connected reducer actions. Compare recent text in host memory using performance.now; no API/LLM/storage/network calls or deliberate buffering. Preserve displayed wording and source provenance. Prefer the first matching source, permit a meaningful recognition-confidence improvement only before final commitment, and freeze final speaker selection. The first final always displays immediately. Suppress matched followers and clear only their competing interims. Preserve unrelated simultaneous speech, short acknowledgements and same-source repeated turns. Handle three or more sources and bounded state expiry.

## Implementation and gates

1. Preserve per-segment mean word recognition confidence separately from end-of-turn confidence.
2. Add comparison normalization, ordered token similarity, clusters and lifecycle cleanup in the caption domain.
3. Integrate only the Connected controller and preserve final attribution on late Connected revisions.
4. Test normalization, finals/interims, confidence, short/repeated/overlapping speech, three sources, divergence, expiry, removal and re-entry.
5. Run typecheck, lint, tests, build and diff check; inspect full diff; update handoff and quality; commit and push main.
6. Follow existing Vercel Git deployment if configured. Record deployment separately from physical-device tests.

## Acceptance and limitations

No provider/model/Voice Focus migration, room authorization change, transcript persistence, Hybrid Mode or room microphone. Algorithm thresholds need deployed UAT, with two/three physical phones: each owner speaking, different simultaneous sentences, simultaneous Yes, duplicate before/after counts, false/missed suppression, speaker switching and perceived latency. Do not infer accuracy percentages or device results from synthetic tests. CAPTION-003 remains open until user accepts duplicate suppression.

## Current diagnostic task

Add an opt-in host-local bounded metrics ledger and temporary panel only at ?captionDebug=1. Record comparison reasons, actual timing/similarity/length gates and metadata-only expired-cluster hints. Copy metrics only, no text/tokens/credentials/invitations. Keep all matching constants, actions, receive-clock sampling, provider, Table Mode and network traffic unchanged. Compute optional diagnostic similarity after reducer dispatch; panel refresh runs independently. Verify disabled default, behavioral equivalence, privacy, bounds, controls and UI.

## Next action

Publish diagnostics, then reproduce the two/three-phone duplicate issue with captionDebug=1 and copy metrics for evidence-based investigation.
