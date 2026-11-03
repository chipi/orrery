# Next steps — start here

State as of 2026-11-02. Update this file at the end of every arc; delete finished notes once
their open items are in the inventory (git keeps them). `docs/wip/_archive/` was deleted on
2026-11-01 in `2f710bdd67e`; a reference to `docs/wip/_archive/<file>` reads from
`git show 2f710bdd67e^:docs/wip/_archive/<file>`.

## Where things stand

- **Prod runs 0.9.3** at `b4ddf1e1d96` (Deploy to prod VPS run 41412677296, deploy + validate
  green: `72 passed · 0 warn · 0 failed`; containers on `sha-b4ddf1e`). `deploy-verify` PASS
  (logs, traces, metrics, GlitchTip, Umami, 58/58 live JS with a debugId, 56 matched to a bundle).
- **Staging** (GitHub Pages) runs main and redeploys on every push to main.
- **main** = `e49ed164c95` (the 0.9.3 CHANGELOG date). `tech-debt/0.9.3` was squash-merged as
  `b4ddf1e1d96` (PR #633).
- **Work in progress lands on branch `tech-debt/0.9.4`** (operator, 2026-11-02), not on main.
- **Tags and Releases:** `v0.9.1`, `v0.9.2` and `v0.9.3` exist with GitHub Releases.
- **GitHub issues:** reviewed 2026-11-02, 25 open; per-issue state in
  [`2026-11-02-open-issues-inventory.md`](2026-11-02-open-issues-inventory.md).
- **Log redaction:** orrery's prod logs go through infra's key-redaction block; checked live by
  the homelab session 2026-11-02 (a fake key stored as `sk-REDACTED`).

## The next arc (operator, 2026-10-31)

The rest of the tech debt, plus more checks on translation quality. The operator has not set an
order inside it; ask before choosing one.

1. **[`2026-10-31-tech-debt-open-inventory.md`](2026-10-31-tech-debt-open-inventory.md)** — every
   open and partly-done item per phase with its evidence, the translation-quality table, and the
   translation handover (method, costs, guard behaviour, locale conventions, tools). Updated for
   0.9.3 and the first 0.9.4 items on 2026-11-02.
2. **[`2026-10-31-garble-pass.md`](2026-10-31-garble-pass.md)** — the numbers behind the
   translation items (§1–9), including what each round did not cover.
3. **[`2026-10-31-essays-science-spot-check.md`](2026-10-31-essays-science-spot-check.md)** —
   per-locale grades for essays and science.
4. **[`2026-10-31-space-terms-glossary-pilot.md`](2026-10-31-space-terms-glossary-pilot.md)** —
   the glossary pilot and its "Next" batch.
5. **[`2026-10-29-i18n-guidance-consolidation.md`](2026-10-29-i18n-guidance-consolidation.md)** —
   where translation guidance lives; the style guide (`docs/guides/i18n-style-guide.md`) is the
   authority. Tools: `scripts/i18n-tools/README.md`.

**0.9.5 starts from [`2026-11-03-0.9.5-fly-handover.md`](2026-11-03-0.9.5-fly-handover.md)** — the
`/fly` flight-and-descent work left after 0.9.4 (Earth capsules, Moon cruise events, models,
missing descents), separate from the tech-debt list above.

The three items found on 2026-11-01 (stale offline-manifest version, `/fly` trajectory 404s, no
alert when docker-e2e skips its image publish) shipped fixed in 0.9.3.

## Things that cost time this arc

- **Push with Node 22:** `mise exec node@22 -- git push …`. The shell's default Node is 20, and
  the pre-push preflight (Vitest 5) fails on it.
- **Docs build is a gate now** (CI step after `npm run build`, `preflight:full`, and
  `preflight-smart` when `docs/` changes). A bare `<tag>` in Markdown breaks VitePress.
- **docker-e2e publish jobs** must test `needs.<job>.result` explicitly. A skipped ancestor job
  (`cron-gate`) makes the implicit `success()` false, and the image is silently not published
  (`a5d740bd2b8`). deploy-prod refuses a sha whose `orrery-pipeline-runner:sha-<7>` is missing.
- **Order of pushes during a release:** don't push to main while the chain that publishes the
  deploy's image is running.
- **Prod box access from the Linux workstation:** no key for `deploy@prod-podcast` here, and the
  mini has none either. What the box runs was read from the deploy run's job log
  (`gh api --allow-escape-sequences repos/chipi/orrery/actions/jobs/<id>/logs`). The
  `prod-deploy` skill has no `orrery` config (`~/.local/state/prod-deploy/orrery.json`).
- **GlitchTip from the workstation:** through the mini (`ssh -i ~/.ssh/homelab_mini
  markodragoljevic@homelab`), API at `http://localhost:8090`, token `~/agents-glitchtip.env`;
  list issues per project (`/api/0/projects/homelab/<project>/issues/`); the org search does not
  match short ids.
- **Squash merge:** branch shas are not ancestors of main. Check that a fix shipped by its content.
- **Staging check for a release:** the 0.9.2 change-set check (deployed sha, glossary pages, the
  Hill sphere / suits / porkchop / garble fixes in the served JSON) was a session script, not a
  repo tool.

## Other notes in this folder

Still live: `2026-10-31-fleet-garble-findings.md` (checked 2026-11-01: most listed defects are
still in the text; the term-consistency skill links it; tracked in the inventory under
"Translation quality"), and the undated topic notes (backlogs, guides, fact-check logs; not
re-checked). Deleted on 2026-11-01 (`2f710bdd67e`, with the rest of `_archive/`) because their open items are in the inventory: the i18n,
Phase 5 and Phase 6 plans, the `/explore` split plan, the 2026-10-19 i18n handover, and the four
v1.0 notes (`2026-10-16-next-pr-content-scope`, `2026-10-17-post-v1-arc-plan`,
`2026-10-20-v1.0-backlog`, `2026-10-21-v1.0-fix-arc-close`; open items in the inventory section
"Carried over from the v1.0 notes").
