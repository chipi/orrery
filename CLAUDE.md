# CLAUDE.md — Orrery

The canonical agent-instruction file for this repo is **[AGENTS.md](AGENTS.md)** — it's tool-agnostic and applies to every coding agent (Claude, Cursor, etc.). Read it first. Everything below this line is Claude Code-specific tuning that adds to, not replaces, AGENTS.md.

---

## Claude Code-specific notes

### Bash output filtering

Some Claude Code sessions silently rewrite Prettier's `[warn] path/to/file.ts` lines to a reassuring `Prettier: All files formatted correctly` while still returning exit code 1. **Trust the exit code, not the prose.** When output looks clean but a script exited non-zero, re-run with `/usr/bin/env bash -c '<cmd> 2>&1; echo EXIT=$?'` to bypass the filter. The pre-push hook trusts exit codes, so this never causes a bad push — but it can cause confusion when triaging locally.

This caveat lives here (not in AGENTS.md) because it's a Claude Code environment artefact, not a property of the codebase.

---

*Orrery · CLAUDE.md · May 2026 — thin pointer to AGENTS.md*
