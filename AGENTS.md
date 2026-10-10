# Agent Entry Point

This repository uses a shared-context workflow so a planning/review agent and a coding/verification agent can work on the same product without losing decisions, duplicating discovery, or overwriting each other.

The role names are intentionally runtime-agnostic. The **Builder** may be Luna, Sol, another Codex runtime, Cursor, or another coding agent.

## Read this first

Before planning, coding, provider integration, deployment work, or substantial review:

1. Sync with GitHub `main`.
2. Read:
   - `AGENT-WORKFLOW.md`
   - `PROJECT.md`
   - `NOW.md`
   - `TASKS.md`
   - `LIVE-STATE.md`
   - `QUALITY.md`
   - the newest relevant entries in `LOG.md`
3. Inspect only the files needed for the active task.
4. Confirm the active initiative in `NOW.md` before editing.

GitHub `main` is the durable shared source of truth.

## Roles

### Planner — product / architecture / review
The Planner owns:
- discussing requirements with the human;
- product and accessibility decisions;
- architecture and implementation planning;
- research and provider tradeoffs;
- sequencing work;
- defining acceptance criteria and measurement requirements;
- reviewing Builder handoffs and actual repository state;
- deciding whether a task is complete, needs a targeted fix, or should advance;
- maintaining durable project context when the Planner is the active writer.

The Planner may make bounded source changes when appropriate, but must never claim local tests, browser/device UAT, audio tests, or live deployment verification that were not actually performed.

### Builder — coding / verification
The Builder owns:
- local repository execution;
- targeted code exploration;
- implementation of approved scope;
- automated tests, lint, type checking, and builds;
- browser/device verification that the runtime can actually perform;
- microphone/audio-path debugging;
- deployment or provider configuration when explicitly authorized;
- exact verification evidence;
- updating durable context at the end of the implementation pass;
- committing and pushing the verified handoff to `main`.

The Builder does **not** silently change product scope, accessibility behavior, provider strategy, retention policy, or long-lived architecture.

## One-writer rule

Do not let Planner and Builder edit the same durable context files concurrently.

The agent actively executing a task owns the durable context files until that task is committed and pushed. The other agent must resync from `main` before continuing.

## Durable context files

- `PROJECT.md` — stable purpose, architecture, constraints, security/privacy rules, and long-lived contracts.
- `NOW.md` — exactly one active initiative and its current implementation state.
- `TASKS.md` — prioritized backlog/status board.
- `LIVE-STATE.md` — only facts verified against deployed/live systems. Never secret values.
- `QUALITY.md` — accessibility, latency, reliability, device/browser, accuracy, and cost verification ledger.
- `LOG.md` — append-only concise history of meaningful decisions, implementation, failures, and verification.
- `AGENT-WORKFLOW.md` — shared operating protocol.

## Core rules

- Accessibility correctness is product correctness, not optional polish.
- A passing build is not proof that real-time captions work.
- A source file or environment variable name is not proof that an external service is configured live.
- Never commit secrets, credentials, private keys, access tokens, raw audio, or sensitive conversation transcripts.
- Raw audio is not retained by default.
- Do not silently broaden scope.
- Do not weaken privacy or accessibility requirements to make implementation easier without Planner/human approval.
- After two materially different failed approaches, stop and record evidence, hypotheses, and the decision needed.
- Do not force-push or reset away another agent's work.
- Every completed task ends with verification evidence and a durable handoff.
