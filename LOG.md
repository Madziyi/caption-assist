# Project Log

Append concise entries. Do not rewrite history unless correcting a factual error.

Use this format:

```text
### YYYY-MM-DD — <task / decision>
- Changed:
- Decisions:
- Verification:
- Quality:
- Live state:
- Known issues:
- Next action:
```

---

### Bootstrap — shared Planner/Builder workflow prepared
- **Changed:** Added durable project context specialized for a production-grade real-time conversation captioning system.
- **Decisions:** GitHub `main` is the shared source of truth. Builder is runtime-agnostic. One active initiative and one durable-context writer at a time. Real microphone/audio verification is required for audio features. Raw audio is not retained by default.
- **Verification:** Starter context authored; repository-specific facts still need to be mapped by the Builder after the files are added to the real repository.
- **Quality:** Added `QUALITY.md`; no product measurements exist yet.
- **Live state:** Unverified.
- **Known issues:** Hosting, provider credentials/configuration, device support, and actual application scaffold are not yet verified.
- **Next action:** Builder performs repository bootstrap and returns a commit SHA; Planner then defines the executable CAPTION-001 plan.

### 2026-10-10 — BOOTSTRAP — repository baseline verified
- **Changed:** Recorded the actual source baseline in `PROJECT.md`, completed the bootstrap initiative in `NOW.md`, marked BOOTSTRAP done in `TASKS.md`, and clarified unverified live/quality state.
- **Decisions:** Preserved the planned Next.js/React/TypeScript/PWA stack, AssemblyAI-first candidate strategy, provider abstraction, one-device Table Mode requirement, and no-raw-audio-retention default. No application architecture was invented because no application exists yet.
- **Verification:** `git fetch origin` succeeded; branch is `main`; working tree was clean; `HEAD` matched `origin/main` at `45e42267fb4dfb38e940beaeadc072f5c2077220`; repository inventory found ten tracked starter/context files and no package, runtime, source, infrastructure, CI, or test configuration.
- **Quality:** No product, browser, microphone, latency, accuracy, accessibility, reliability, or cost evidence exists; quality remains unverified.
- **Live state:** No live system or provider was inspected; `LIVE-STATE.md` remains unverified.
- **Known issues:** Application scaffold, runtime, deployment, provider configuration, and all implementation/test infrastructure remain to be established during CAPTION-001 planning and execution.
- **Next action:** Planner resyncs `main` and writes the approved CAPTION-001 implementation plan into `NOW.md`.

### 2026-10-10 — Typography decision recorded
- **Changed:** Added the requested typography contract to the accessibility requirements in `PROJECT.md`.
- **Decisions:** Atkinson Hyperlegible is the body/caption font and Inter is the heading font, both sourced from Google Fonts with readable local/system fallbacks.
- **Verification:** Repository sync confirmed `main` matches `origin/main`; no application scaffold or UI files exist to implement or visually verify yet.
- **Quality:** No visual, browser, text-scaling, or readability evidence produced; typography remains pending implementation and UAT.
- **Live state:** Unchanged; no live system was inspected.
- **Known issues:** The font choice is documented but not yet wired into application code because no application exists in the repository.
- **Next action:** Apply the typography contract when the approved application scaffold is created.
