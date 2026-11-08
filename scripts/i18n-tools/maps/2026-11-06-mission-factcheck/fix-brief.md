# Mission fact-check — fix brief (2026-11-06)

A read-only science review found sourced errors in our mission text. Your job: apply the accepted
fixes listed in your task, in **all 14 locales**, plus the base file and the fleet entry where the
same wrong fact repeats. Repo root: `/work/orrery/worktrees/0.9.5`. Work from the repo root.

## Where the text lives

- `i18n-src/<loc>/missions/<body>/<id>.json` — the displayed text, one overlay per locale:
  `first`, `dispatch`, `description`, `payload`, `type`, `events[i].met|label|note`.
  Locales: en-US ar de es fr hi it ja ko nl pt-BR ru sr-Cyrl zh-CN. Event `met` values are in every
  overlay (days since launch).
- `static/data/missions/<body>/<id>.json` — base file: `payload`, `credit`, `status`, dates,
  `flight.events[i].description` (English only, no overlay).
- Fleet entries: `static/data/fleet/<type>/<id>.json` (`best_known_for`, `credit`, specs) with overlays
  `i18n-src/<loc>/fleet/<type>/<id>.json`. Use `grep -rl` to find the fleet file that repeats a wrong
  number (e.g. a mass) and fix it too.

## Tools (in this folder)

- `node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/show.mjs <body/id> <field> '<regex>' [len]`
  prints that field's matching sentence in all 14 locales — use it to copy the exact text to replace.
- `node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/apply.mjs <spec.json>` applies a spec,
  all-or-nothing (any find not present → nothing written, the misses are printed). Spec format:
  ```json
  [
    { "m": "moon/luna17", "text": { "en-US": [["find", "replace"]], "de": [["…", "…"]] } },
    { "m": "moon/luna17", "met": { "2": 1.12 }, "sort": true },
    { "m": "moon/luna17", "base": [["find", "replace"]] },
    { "overlay": "i18n-src/{loc}/fleet/rover/lunokhod-1.json", "text": { "en-US": [["…", "…"]] } },
    { "baseFile": "static/data/fleet/rover/lunokhod-1.json", "base": [["…", "…"]] }
  ]
  ```
  Write your spec as `scripts/i18n-tools/maps/2026-11-06-mission-factcheck/batch<N>.json`.
- `batch2.json` in this folder is a finished example (translated replacements for 14 locales).

## Rules

1. **Exact finds.** Copy the find text from `show.mjs`/the file, never retype it. Keep finds short but
   unique (a clause, not a whole paragraph).
2. **Every locale.** A fact that appears in a locale's text is fixed in that locale. Write the
   replacement in that language, in the register of the surrounding text. Keep names as the locale
   already writes them. Numbers in the locale's own format (de/es/fr/it/nl/pt-BR/ru/sr use a decimal
   comma where the file already does).
3. **Minimal edits.** Change the wrong fact only. No rewording beyond it, no new claims beyond the
   fact given in your task. Prefer removing a number you cannot source over guessing a new one.
4. **Text that is English-only** (base `credit`, `flight.events[].description`) — fix it once in the
   base file.
5. **Do not touch**: `scripts/i18n-tools/term-keeps.json`, `native-terms.json`, bundles, any other
   mission than yours. Do not run `build-i18n-bundles`, vitest, `validate-data`, prettier on other
   files, or git (no add, no commit). The lead runs the gates and commits.
6. After applying: `npx prettier --write <the files you changed>` and `node -e` is blocked — use script
   files if you need code. Check with `git diff --stat` that only your mission/fleet files changed.

## Report back (short)

- spec file path, the apply output line (`N edits in M files`)
- each finding: applied / skipped (why) — one line each
- fleet files changed
- anything you could not place (a fact absent from some locale is fine; say which).
