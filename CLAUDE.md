# CLAUDE.md — Orrery

The canonical agent-instruction file for this repo is **[AGENTS.md](AGENTS.md)** — it's tool-agnostic and applies to every coding agent (Claude, Cursor, etc.). Read it first. Everything below this line is Claude Code-specific tuning that adds to, not replaces, AGENTS.md.

---

## Reading order for any non-trivial task

1. **AGENTS.md** (this folder, ↑) — universal agent instructions: stack, i18n rules, mobile-first, testing, what-not-to-do.
2. **[`docs/adr/TA.md`](docs/adr/TA.md)** — single-page architecture map (v2.0, current as of v0.6.0). Every route, subsystem, 3D scene, asset pipeline, contract, and constraint with the ADR that locked it. **Read this before touching anything that crosses one file.**
3. The specific ADR / PRD / RFC referenced by TA.md for your task area.

If TA.md and the code disagree on a contract or constraint, one is wrong — fix it. Same rule as AGENTS.md.

---

## Claude Code-specific notes

### Bash output filtering

Some Claude Code sessions silently rewrite Prettier's `[warn] path/to/file.ts` lines to a reassuring `Prettier: All files formatted correctly` while still returning exit code 1. **Trust the exit code, not the prose.** When output looks clean but a script exited non-zero, re-run with `/usr/bin/env bash -c '<cmd> 2>&1; echo EXIT=$?'` to bypass the filter. The pre-push hook trusts exit codes, so this never causes a bad push — but it can cause confusion when triaging locally.

This caveat lives here (not in AGENTS.md) because it's a Claude Code environment artefact, not a property of the codebase.

### Tools to prefer

- **`TaskCreate` / `TaskUpdate`** for any multi-step work (3+ steps). Keeps the user in the loop on progress.
- **`EnterPlanMode` + `ExitPlanMode`** before non-trivial implementation — get the user's sign-off on the approach before writing code. Especially when touching `/fleet`, `/science`, `/fly` cislunar, or anything that modifies the asset / provenance pipelines.
- **`Agent` (subagent) with `Explore`** for codebase research that would take 4+ Bash/Grep calls. Particularly useful for cross-route audits like "what's the actual route inventory" or "where do we use feature X".

### Preflight before push

`npm run preflight` mirrors CI exactly (typecheck → lint → test → validate-data → build). The husky pre-push hook auto-runs it. If preflight passes, push is safe. If preflight fails, do not push — diagnose the failure rather than reaching for `--no-verify`.

---

*Orrery · CLAUDE.md · May 2026 — thin pointer to AGENTS.md + TA.md*
