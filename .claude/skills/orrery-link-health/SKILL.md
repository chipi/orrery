---
name: orrery-link-health
description: Find and fix Orrery's broken links and prod 404s — the prod 404 report from the nginx access log (who asked, from which of our pages, does it still 404), the in-data link check for every locale, and the outbound link check with its report. Says which 404s are ours to fix, which are accepted, and how each class was fixed before.
when_to_use: Use when asked "check the links", "any 404s", "are we in control of 404s", "link tracker", "dead links", "broken images on prod", after a deploy that removed or renamed pages, images or ids, and before tagging a release.
---

# orrery-link-health

Goal (operator, 2026-11-01): fix every 404 and stay in control of them. Four tools,
one question each (scripts/README.md, "Links and 404s").

## 1. What prod answered 404 to

```bash
node scripts/prod-404-report.mjs --days=7 --md=/tmp/404.md   # tailnet: VictoriaLogs
```

Rows sort by class; fix from the top:

| Class | Meaning | Action |
| --- | --- | --- |
| our-link | the referrer is one of our pages (not the URL itself) | a bug: find what builds that URL and fix it at the cause |
| reader | a browser, no crawler signature | check the path: an old link elsewhere → maybe a 301 in ops/docker/nginx.conf |
| crawler | bot UA | a 301 when a real target exists (see the `_webp` rule), else accept |
| probe | validate-prod's deliberate 404s, our own checkers | ignore |
| old-build | /_app/immutable/ files of a previous deploy | accepted 2026-11-01 |

The `Now` column re-requests each path: a 404 that is 200 now was fixed by a later
deploy. Rows after a fix keep appearing until clients with old pages are gone.

## 2. Links held in data (every locale)

```bash
node scripts/check-data-links.mjs        # also inside npm run validate-data
```

Fails on: a path no route serves, a query parameter the route doesn't read
(`ROUTE_PARAMS`), a missing mission/fleet id, an asset path whose file is missing or
pruned from the build. Adding a route parameter: add it to `ROUTE_PARAMS` with the code
that reads it.

## 3. Outbound links

```bash
node scripts/check-external-links.mjs              # stale (>7 d) URLs only
node scripts/check-external-links.mjs --max-age=0  # everything (~9k URLs, ~15 min)
```

Reads the URL set from what readers can click (build HTML when `build/` exists, data the
app reads, overlays, messages, components). Report: docs/provenance/external-link-check.md
— Dead, Inconclusive (403, 429, timeouts: recheck by hand) and Moved. Never raise the
per-host rate: Wikimedia answers 429 to bursts; wiki pages go through the API instead.

## Fixed before — the same classes come back

- Code asking for a file per entity when only some have one (fleet badges, mission
  thumbnails): render only when the manifest/data says it exists; add a data test.
- Images deleted by a clean-up but still referenced (site stories, credits): check-data-links.
- Translators transliterating paths in overlays (sr-Cyrl `viking1-лендер`): check-data-links.
- Link parameters a route never read (`/fleet?focus=`): `ROUTE_PARAMS`.
- Crawlers requesting keys from JSON (`/images/…_webp`): 301 in nginx.conf.
- Files the build prunes (texture 4:3/16:9 crops) still linked: `PRUNED` in check-data-links.

## Report

Per class: count, what was fixed (commit), what is accepted and why. Paste the report's
summary line and the checker's last line as evidence.
