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
