# Next steps — start here

State as of 2026-11-01. Update this file at the end of every arc; delete finished notes once
their open items are in the inventory (git keeps them). `docs/wip/_archive/` was deleted on
2026-11-01 in `2f710bdd67e`; a reference to `docs/wip/_archive/<file>` reads from
`git show 2f710bdd67e^:docs/wip/_archive/<file>`.

## Where things stand

- **Prod runs 0.9.2** at `a5d740bd2b8` (Deploy to prod VPS run 41298755798, deploy + validate
  green). The deploy log shows `HEAD is now at a5d740bd2`, the three `sha-a5d740b` images pulled, `web
  OK / lab-api OK / mcp OK`. www.orrerylearn.com shows `v0.9.2 · 2026-11-01`.
- **Staging** (GitHub Pages) runs main and redeploys on every push to main.
- **main** = `80133d232fe` plus any local commits not yet pushed (check `git log
  origin/main..HEAD`). `tech-debt/phases` was squash-merged as `d28002f3639` (PR #624).
- **Tags and Releases:** `v0.9.1` (backfilled 2026-11-01) and `v0.9.2` exist with GitHub Releases.
  The v0.9.2 Release notes were corrected after publishing; the CHANGELOG inside the `v0.9.2` tag
  keeps the old intro sentence ("the remaining English UI text was translated"), main has the
  fix. Only 0.9.1 was backfilled (operator's choice); missing tags for older versions were left
as they are.
- GlitchTip ORRERY-PROD-20 resolved after the deploy.

## The next arc (operator, 2026-10-31)

The rest of the tech debt, plus more checks on translation quality. The operator has not set an
order inside it; ask before choosing one.

1. **[`2026-10-31-tech-debt-open-inventory.md`](2026-10-31-tech-debt-open-inventory.md)** — every
   open and partly-done item per phase with its evidence, the translation-quality table, and the
   translation handover (method, costs, guard behaviour, locale conventions, tools).
2. **[`2026-10-31-garble-pass.md`](2026-10-31-garble-pass.md)** — the numbers behind the
   translation items (§1–9), including what each round did not cover.
3. **[`2026-10-31-essays-science-spot-check.md`](2026-10-31-essays-science-spot-check.md)** —
   per-locale grades for essays and science.
4. **[`2026-10-31-space-terms-glossary-pilot.md`](2026-10-31-space-terms-glossary-pilot.md)** —
   the glossary pilot and its "Next" batch.
5. **[`2026-10-29-i18n-guidance-consolidation.md`](2026-10-29-i18n-guidance-consolidation.md)** —
   where translation guidance lives; the style guide (`docs/guides/i18n-style-guide.md`) is the
   authority. Tools: `scripts/i18n-tools/README.md`.

Open items found on 2026-11-01, already in the inventory: `data/offline-manifest.json` still says
0.9.1 on staging and prod; `/fly` fetches a trajectory file for every mission (hundreds of 404s);
nothing alerts when docker-e2e skips its image publish on main.

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
