# Active Initiative

**Initiative:** BOOTSTRAP — establish caption-system repository baseline  
**Status:** COMPLETE
**Planner:** Planner agent  
**Implementation / verification:** Builder agent

## Objective

Establish the shared agent context in the new repository, verify the actual repository baseline, and prepare the codebase for `CAPTION-001 — Conversation Core` without making product changes during bootstrap.

## Current scope

- Verify GitHub sync workflow.
- Record the actual repository structure and current stack.
- Confirm whether the repository is empty, scaffolded, or already contains application code.
- Identify deployment configuration, CI/CD, environment-variable names, and external providers if they already exist.
- Preserve the planned product architecture in `PROJECT.md` while clearly distinguishing plans from verified implementation.
- Make `CAPTION-001` the next ready initiative after bootstrap.

## Decisions

- GitHub `main` is the shared source of truth.
- The coding runtime is called **Builder** in durable context so Luna/Sol/Cursor can be swapped without rewriting project memory.
- Only one agent edits durable context during a task.
- The product must work in one-device Table Mode before requiring participant joining.
- Provider-specific STT payloads must be hidden behind an internal adapter/normalizer.
- Raw audio is not stored by default.
- Build success alone is insufficient verification for real-time audio work.

## Explicit non-goals

- Do not implement CAPTION-001 during bootstrap.
- Do not create live provider accounts, billing, or secrets during bootstrap unless the human explicitly requests it.
- Do not claim deployment/provider state that cannot be verified.

## Blockers

None yet.

## Verification boundary

Bootstrap verifies repository/source facts only. Live infrastructure remains unverified unless directly inspected.

## Verified baseline

- Repository is clean and synchronized with `origin/main` on branch `main`.
- `HEAD` and `origin/main` were both `45e42267fb4dfb38e940beaeadc072f5c2077220` at bootstrap review time.
- The repository contains only ten tracked starter/context files.
- No application code, package manager, declared runtime, database/auth setup, deployment configuration, CI/CD, environment-variable source configuration, third-party integration, or test/build/lint/typecheck command exists yet.
- Existing documentation is consistent with the planned Next.js/React/TypeScript/PWA architecture and AssemblyAI-first provider abstraction; those remain plans until implemented and verified.

## Next action

Planner resyncs and converts `NOW.md` to the approved `CAPTION-001` implementation plan. The Builder must not begin CAPTION-001 from this bootstrap handoff.
