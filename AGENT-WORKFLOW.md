# Shared Agent Workflow

This is the default operating protocol for every AI runtime working on this repository.

## 1. GitHub sync preflight

Before repository-specific work:

```bash
git fetch origin
git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Then:
- If the working tree is clean and `origin/main` is ahead, fast-forward.
- If local and remote diverged, stop and inspect deliberately.
- If the working tree is dirty, do not reset or overwrite it.
- Never force-push unless the human explicitly authorizes it for a specific reason.
- If remote state cannot be checked, say that the baseline is unconfirmed.

After syncing, reread the durable context files.

## 2. Read context in this order

1. `AGENTS.md`
2. `AGENT-WORKFLOW.md`
3. `PROJECT.md`
4. `NOW.md`
5. `TASKS.md`
6. `LIVE-STATE.md`
7. `QUALITY.md`
8. newest relevant `LOG.md` entries

Do not remap the whole repository by default. Explore only the subsystem needed for the active initiative.

## 3. Planning contract

Before implementation, the active initiative should identify:
- objective;
- user-visible behavior;
- in-scope behavior;
- explicit non-goals;
- affected subsystems;
- audio/data/event contracts;
- privacy/security constraints;
- ordered implementation steps;
- acceptance criteria;
- verification commands;
- required browser/device/manual tests;
- risks/blockers;
- one next action.

If requirements materially change, update the plan before continuing.

## 4. One active initiative

`NOW.md` must contain exactly one active initiative.

Do not start unrelated work while another initiative is active unless the human explicitly reprioritizes.

## 5. Bounded implementation

The Builder should:
- inspect only relevant files;
- make the smallest coherent change;
- avoid unrelated cleanup;
- preserve stable contracts unless the plan explicitly changes them;
- add tests proportional to risk;
- keep provider-specific response formats behind adapters;
- keep UI state independent from raw provider events;
- preserve privacy defaults.

## 6. Verification layers

A feature is verified in layers. Do not substitute one layer for another.

### Code gates

Typical checks:

```bash
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Use repository-specific commands when they differ.

### Browser/UI gates

For UI work, test relevant desktop and narrow/mobile widths. Verify keyboard navigation and text scaling where applicable.

### Real-time audio gates

For microphone or caption-streaming work, verification must include the real audio path when possible:
- permission grant/deny behavior;
- microphone selection where supported;
- visible input-level/health indication;
- partial and final caption behavior;
- duplicate suppression;
- stop/start behavior;
- network interruption and reconnect;
- a sustained session of the duration required by the active task.

A mocked WebSocket test alone is not sufficient proof of real microphone/STT behavior.

### Live/provider gates

For provider/deployment work:
- configure intentionally;
- verify against the actual environment/provider;
- verify a safe invocation/session;
- record provider/model/config names, never credential values;
- update `LIVE-STATE.md` with exact observed facts.

A source file is not proof of deployment.

## 7. Quality evidence

Update `QUALITY.md` when a task produces meaningful evidence about:
- caption latency;
- transcription accuracy;
- speaker attribution;
- reconnect behavior;
- browser/device compatibility;
- session stability;
- estimated or measured provider cost;
- accessibility/usability observations.

Do not invent measurements. Mark unmeasured items as unverified.

## 8. Failure budget

After two materially different focused attempts fail:
- stop;
- record exact evidence;
- list current hypotheses;
- state the decision/blocker required;
- do not keep circling.

## 9. Handoff

Every implementation pass ends with:

```text
Task: <ID — goal>
Status: done | partial | blocked
Changed: <files/subsystems and behavior>
Decisions: <important contracts future agents must preserve>
Verification: <commands/checks + exact results>
Audio/UAT: <real microphone/browser/device checks actually performed>
Quality: <measurements/observations added to QUALITY.md>
Live state: <only if relevant>
Known issues: <risks, failures, or none>
Next action: <one concrete next step>
Commit: <sha if published>
```

Update `NOW.md`, `TASKS.md`, `LOG.md`, `QUALITY.md`, and `LIVE-STATE.md` as appropriate before the final commit/push.

## 10. Context ownership

Recommended loop:

```text
Human + Planner discuss requirement
        ↓
Planner researches / decides contracts / defines acceptance criteria
        ↓
Plan is written to durable GitHub context
        ↓
Builder syncs main
        ↓
Builder implements locally
        ↓
Builder tests + performs available browser/audio UAT
        ↓
Builder updates context and evidence
        ↓
Builder commits + pushes
        ↓
Human gives Builder handoff to Planner
        ↓
Planner resyncs GitHub and reviews actual implementation
        ↓
Close task / targeted fix / next task
```

Whoever is executing owns the context files until their commit is pushed.

## 11. Live-state rule

Any action involving database schema, migrations, server/serverless functions, secrets-by-name, cron/schedulers, hosting, production/staging configuration, or external speech providers must distinguish:

- **source state** — what exists in the repository;
- **verified live state** — what has actually been observed running.

Only the latter belongs in `LIVE-STATE.md` as verified.

## 12. Completion standard

A task is complete only when:
- acceptance criteria are satisfied;
- relevant code checks pass;
- real audio/browser verification is performed when required and possible;
- live state is verified if applicable;
- quality evidence is recorded honestly;
- durable context is updated;
- implementation and handoff are published;
- another agent can continue without rediscovering the work.
