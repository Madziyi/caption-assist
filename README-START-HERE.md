# Accessible Conversation Captions — Multi-Agent Starter

This folder is designed to be copied into the root of a new GitHub repository.

## Roles

- **Planner:** ChatGPT conversation responsible for requirements, architecture, research, acceptance criteria, and review.
- **Builder:** interchangeable coding runtime (Luna, Sol, Codex, Cursor, etc.) responsible for implementation and verification.

## First use

1. Create the GitHub repository.
2. Put these files at the repository root.
3. Give the coding agent the **Initial Builder bootstrap prompt** from `PROMPTS.md`.
4. Wait for its commit + handoff.
5. Give the handoff to the Planner.
6. Planner resyncs `main`, reviews bootstrap, and writes the full `CAPTION-001` plan into `NOW.md`.
7. Give the coding agent the **Normal Planner → Builder execution prompt**.

Do not create provider secrets until the relevant implementation task requires them.
