---
name: i18n-fix-run
description: Fix translations safely — re-translate exact fields from a manifest (retranslate-fields.mjs) or put names back into their English form (i18n-names-pass.mjs), on the latest model per locale, with the shared checks, a free guard replay first, a pilot before the full run, one writer at a time (long-job lock), and a detector re-check after.
when_to_use: Use when asked to "retranslate", "fix the translation hits", "fix <language>", "run the names pass", "translate the missing strings", or before running any scripts/translate-*.mjs, retranslate-fields.mjs or i18n-names-pass.mjs.
---

# i18n-fix-run

Every step below is a mistake made on 2026-10-17. Do them in order.

## 0. Before spending anything

1. **Model**: `scripts/lib/translate-model.mjs` — Haiku default, Sonnet for locales on
   `SONNET_LOCALES` (today sr-Cyrl). Both must be the **latest** of their tier (operator
   2026-10-17); a pilot ran on Sonnet 4.5 while 5.5 existed. Check the Claude Code model
   list if unsure; never Opus. Adding a locale to `SONNET_LOCALES` needs evidence + the
   operator's yes.
2. **Guard replay** (free): `node scripts/i18n-guard-replay.mjs --locales=<loc>`. If you
   changed `scripts/lib/translate-quality.mjs`, run it before and after; a jump in
   rejections of existing strings is a false positive (use `replay-proven-fix` for a
   real check change). Three paid pilot rounds went on false positives ("Glenn's 3",
   "Tianwen-1 orbiter", "F-1s").
3. **One writer**: every run goes through `long-job` with `--lock orrery-i18n`. Two runs
   writing the same files lost edits on 2026-10-17. `scripts/lib/json-surgical.mjs`
   now refuses to overwrite a changed field, but the lock is the rule.

## 1. Pilot (2–3 files, ~50 fields)

```bash
node scripts/i18n-manifest.mjs --loc=<loc> --files=<a>,<b>,<c> > /tmp/pilot.json
set -a; . ./.env; set +a
node scripts/retranslate-fields.mjs --manifest=/tmp/pilot.json        # RETRANSLATE_DEBUG=1 for per-attempt reasons
```

**Read the output yourself** against the English (grammar, names in Latin, nothing
dropped) and `git diff` (layout kept: insertions ≈ deletions). Revert with
`git checkout -- i18n-src/<loc>` if anything is off, fix, pilot again.

## 2. Full run

```bash
J=~/.claude/skills/long-job/scripts/long-job.sh
$J start i18n-<what> --lock orrery-i18n -- bash -c 'set -a; . ./.env; set +a; node scripts/retranslate-fields.mjs --manifest=/tmp/fix.json --concurrency=20'
```

Arm the Monitor it prints. Names pass: `node scripts/i18n-names-pass.mjs --locales=… [--trees=…] [--messages] --concurrency=20 --kept-out=/tmp/kept.json`,
then re-translate the kept fields with step 2.

## 3. After

1. `node scripts/i18n-detect.mjs --out=/tmp/hits.json` — re-translate what's left;
   hand-write a handful of stubborn fields (`problems()` must pass) rather than loop.
2. `npm run validate-data` (length limits: shorten the en-US source, not the target).
3. Graded sample (`i18n-audit` §3) for every locale touched.
4. Commit with the numbers (fields, failures, sample verdicts) and what was NOT checked.

## What the tooling already does (don't redo by hand)

Rules + checks: `scripts/lib/translate-quality.mjs` (NAME_POLICY: names never translated,
geography is; per-locale rules; `problems()`; `fixHomoglyphs()` for Latin lookalikes in
Cyrillic). Retries are edits of the previous answer. Writes keep the file layout.
