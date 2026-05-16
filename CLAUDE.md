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

> **Preflight ≠ release readiness.** Preflight does NOT run e2e. Routine pushes can pass preflight and still break e2e on CI. **Before tagging or cutting a GitHub Release, you MUST run the full Playwright suite locally on BOTH `desktop-chromium` AND `mobile-chromium` projects** — see AGENTS.md §"Before tagging or releasing — full local e2e on BOTH projects". The v0.6.0 → v0.6.1 release cycle ended up in a four-round CI ping-pong because mobile e2e wasn't validated locally first.

### Run e2e locally with `Bash run_in_background` + `Monitor`

The Playwright suite takes 3–16 minutes depending on subset. Don't block a Bash tool call on it.

```ts
// 1. Kick off the run, redirect to a log file, signal completion at end.
Bash({
  command: "(npx playwright test --workers=1 --project=mobile-chromium tests/e2e/i18n-*.spec.ts > /tmp/pw-mobile.log 2>&1; echo \"EXIT=$?\" >> /tmp/pw-mobile.log)",
  run_in_background: true,
})

// 2. Watch for the EXIT= sentinel via Monitor. One notification, ends in seconds after the run finishes.
Monitor({
  command: "until grep -q 'EXIT=' /tmp/pw-mobile.log; do sleep 5; done; echo '===DONE==='; tail -30 /tmp/pw-mobile.log",
  description: "playwright mobile run completion",
  timeout_ms: 900000,
  persistent: false,
})
```

Always pass `--workers=1` — the vite preview server is shared across workers, and the default 2-worker setup can crash mid-run with `net::ERR_CONNECTION_REFUSED`. Match CI's worker count locally.

### Iterating on broken specs

When the e2e log shows a failure, the actual assertion details are in `test-results/<spec-name>/error-context.md`. Read that file directly — it has the locator, the expected/received values, and a code snippet. Don't try to derive the root cause from the high-level `✘` line alone.

```bash
cat test-results/i18n-de--lang-de-smoke-loc-b05de-persistence-work-for-German-mobile-chromium/error-context.md
```

### Untracked PRD/RFC drafts no longer block `git push` (v0.6.2 onwards)

As of v0.6.2, `validate-data` scopes its PRD/RFC/ADR gating-sentence check to `git ls-files` (issue #136). Untracked drafts a parallel agent leaves in `docs/prd/` or `docs/rfc/` are no longer scanned. If you have a draft you DO want gated, `git add` it — staged-but-uncommitted files appear in `ls-files` and stay covered.

If `git` isn't accessible (e.g. CI shallow-clone edge case) the check falls back to the filesystem walk so the gate still catches gating-sentence regressions on tracked files. Don't `--no-verify` past a failure.

### Tag + GitHub Release + Deploy are three separate actions

After `git push --tags`, the tag exists but there's no GitHub Release entry and no auto-deploy. Run `gh release create vX.Y.Z --notes-file ...` to cut the Release. If the e2e gate blocked the auto-deploy, run `gh workflow run "Deploy preview" --ref main` to force the publish. AGENTS.md has the full table of what each action does and doesn't do.

---

*Orrery · CLAUDE.md · May 2026 — thin pointer to AGENTS.md + TA.md*
