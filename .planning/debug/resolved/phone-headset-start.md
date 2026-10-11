---
status: resolved
trigger: "After aac146a, microphone options no longer show on joining phones; Using says no microphone selected."
created: 2026-10-11
updated: 2026-10-11
---

## Symptoms
- Expected: joining a headset room offers Start headset check; permission and capture then populate the actual input and available routes.
- Actual: no input selected and no microphone options on joining phones after the captions implementation.
- Timeline: worked in 008.1; reported after aac146a.
- Reproduction: join a Headset Mode room on a phone.

## Current Focus
- hypothesis: controller publishes non-null currentView at join; HeadsetSetup only offers start for null, stranding not_started/off.
- next_action: publish and request physical-phone re-test; live provider/acoustic UAT remains separate.

## Evidence
- aac146a adds currentView publication immediately after guest participant creation.
- Initial state is setup=not_started, mic=off, input=null, inputs=[]. No capture is requested until a tap.
- HeadsetSetup start button only exists in the null-view branch. Non-null initial state renders Using: No microphone selected and no action.
- Inline debugging per skill adapter: no subagent requested; symptoms already supplied by user and repository evidence.
- Three new component tests failed on aac146a: initialized idle start absent, stopped restart absent, and starting status absent. Existing picker tests passed.

## Resolution
- root_cause: the UI's null-view start condition excluded the controller's new non-null not_started/off join state.
- fix: explicitly render start, permission-pending and stopped/restart states; only claim ready while mic is on. No input enumeration, transport, provider or gate changes.
- verification: 179 tests/29 files, typecheck, lint and production build pass. Native Chromium real UI/capture/worklet with fake media verifies keyboard start, three inputs, ID selection and restart, no page errors or overflow at 390/1280 px. External network blocked; no physical/live-provider claims.
