# scripts — family map

Operational scripts, named by verb prefix; the prefix tells you the contract
before you open the file:

- **`validate-*`** — invariant guards over data/assets (allowlist discipline,
  credits bundling, …). Read-only; fail loudly. Run these before trusting a
  data change.
- **`build-*`** — derive artifacts from sources (i18n bundles, anatomy webp,
  constellation lines, audit report). Outputs are generated files; never
  hand-edit what a `build-*` script owns.
- **`audit-*`** — rule-based read-only reports (hero imagery, image MIME,
  usage). Produce findings; change nothing.
- **`fetch-*`** — pull external assets/data at build time (ADR-016).
- **`translate-*` / `check-*`** — the i18n pipeline and its verifiers
  (binding rules: docs/guides/i18n-style-guide.md, ADR-033).
- **`migrate-* / backfill-* / fill-* / prune-*`** — one-shot data surgeries
  on `static/data`. These mutate; read their header before running.
- **`__fixtures__/`** — shared test fixtures. **`__smoke__/`** — LLM/vision
  smoke probes. **`_archive/`** — retired scripts kept for reference; do not
  extend anything in there.

Conventions: tsx or .mjs, colocated `*.test.ts` where logic warrants it;
script headers cite the ADR/PRD/RFC that governs them — keep that up.

## Translations — which tool, when

Every locale but en-US is a translation of `i18n-src/en-US/**` (content
overlays) or `messages/en-US.json` (UI strings). The locale list comes from
`project.inlang/settings.json` via `scripts/lib/locales.mjs`. Before any paid
run, load the `i18n-fix-run` skill (model, free guard replay, pilot, one writer
at a time); to measure quality, the `i18n-audit` skill. Every script below that
calls the Claude API goes through `translationClient` (`lib/translate-model.mjs`):
it picks the model per locale (Haiku; Sonnet for the locales in
`SONNET_LOCALES`), adds the shared rules (`lib/translate-quality.mjs`:
`BASE_RULES`, `NAME_POLICY`, per-locale rules) to every prompt, and checks
every answer with `problems()`, retrying on failure. Run them with the API key
from `.env` (`set -a; . ./.env; set +a`).

**New English content → create its 13 translations.** Each tool skips locale
files that already exist, so re-runs are safe.

| You added | Run |
|---|---|
| missions, fleet, science, planets, earth objects, moon/mars sites | `translate-i18n-gaps.mjs` (every en-US file missing in a locale) |
| an essay (`essays/`) | `translate-essays-i18n.mjs [--only=<slug>]` |
| a program (`programs/`) | `translate-programs-i18n.mjs [--only=<id>]` |
| a `dispatch` field on a mission/fleet entry | `translate-dispatch-i18n.mjs` (it also covers files that already exist) |
| a culture door (`culture-doors/`) | `translate-culture-doors-i18n.mjs [--only=<id>]` |
| an exoplanet (`universe/exoplanets/`) | `translate-exoplanets-i18n.mjs [--only=<id>]` |
| a named star (`universe/named-stars/`) | `translate-named-stars-i18n.mjs [--only=<id>]` |
| UI strings in `messages/en-US.json` | `translate-v07-ui.mjs --keys=a,b` or `--auto` (keys still equal to English) |
| image alt texts | `translate-alt-text.mjs plan` → `pilot` → `submit` → `status` / `fetch` → `apply` (Message Batches API, half price; see its header) |

All take `--locales=de,fr` to limit the run.

**Changed English, or a bad translation → re-translate fields in place.**

| Situation | Run |
|---|---|
| exact fields (a fact-check fix, detector hits) | `i18n-manifest.mjs` builds the field list → `retranslate-fields.mjs --manifest=…` (the current fix route; it only edits files that exist) |
| one field of a /science article in every locale | `translate-science-fields.mjs --file=<tab>/<section> …` |
| a name was translated instead of kept in English | `i18n-names-replace.mjs` (no model, free) first, then `i18n-names-pass.mjs` (an edit, not a re-translation) |

**Measure first (free, read-only).**

| Question | Run |
|---|---|
| which strings are missing or empty in a locale | `i18n-coverage-scan.mjs` |
| which translations have defects (wrong script, placeholders, English left in) | `i18n-detect.mjs [--out=hits.json]` |
| would a change to the shared checks reject good strings | `i18n-guard-replay.mjs` (before and after the change) |
| how good is a locale, by segment | `i18n-segment-sample.mjs` → graded by a reviewer (`i18n-audit` skill) |

After writing: `npm run validate-data`, then `build-i18n-bundles.mjs` runs in
the build. Names: put the canonical form in `i18n-tools/native-terms.json`
before any text (glossary first).

**Hand edits, no model.** `i18n-tools/` is the hand translation-editing kit
(its own README lists every tool): reviewed path edits (`apply-edits.mjs`,
checked with `problems()`), literal fixes, UI keys in every locale, name and
CJK-spacing passes, and analysis tools. Use it for a handful of stubborn fields
instead of looping a paid run. Several of its tools keep a locale list as the
column order of a hand-written table, so do not swap those lists for
`lib/locales.mjs`. `i18n-tools/maps/2026-10-17-translation-cleanup/` (77 MB) is
the provenance store that `native-terms.json` cites (the `wikidata-*.tsv`
tables); keep it.

## Links and 404s — which tool, when

| Question | Run | Where it runs |
| --- | --- | --- |
| does a prerendered page link to a page we don't build | `check-internal-links.mjs` | every `npm run build` |
| does data / an overlay / a message link to a missing route, a query parameter the route ignores, an id that doesn't exist, or a missing / pruned file (all 14 locales) | `check-data-links.mjs` | `validate-data` |
| are the outbound links readers can click still alive (pages, image-credit sources, references, components) | `check-external-links.mjs` → `docs/provenance/external-link-check.md` | by hand; cached 7 days in `.cache/`, Wikipedia/Commons via their API |
| are the curated LEARN links alive (`link-provenance.json`) | `check-learn-links.ts` | `npm run fetch` |
| what did prod answer 404 to, who asked, and does it still 404 | `prod-404-report.mjs [--days=7]` | by hand, on the tailnet (VictoriaLogs) |
| a dead outbound link: what could replace it (Wayback snapshot, wiki search hits) | `link-fix-candidates.mjs` → `.cache/link-fix-candidates.json` | by hand, after the outbound check |
| replace reviewed dead links everywhere they are written (all locales, labels too) | `apply-link-fixes.mjs <map.json>` (probes every replacement first; maps under `link-fixes/`) | by hand |
| an image credit whose Commons title never existed, once the real file is known | `backfill-provenance-commons.ts <map.json>` | by hand |

Runbook: the `orrery-link-health` skill. The two outbound checkers share
`lib/link-probe.mjs` (polite User-Agent, 2 requests per host, HEAD then GET).

**Manual tools no npm script or workflow runs** (read the header first):

- `mobile/build-offline-manifest.mjs` — regenerates the committed
  `static/data/offline-manifest.json` the native offline download reads
  (RFC-040 Contract C). It lists images, posters, hotspot tiles and audio,
  so it goes stale when any of those change.
- `score-staging.ts` — scores `static/images/_staging/` for /dev/staging;
  **paid** on vision-cache misses (Anthropic vision, needs `.env`).
- `search-badge-candidates.mjs` → `search-badge-multisource.mjs` — find
  mission/fleet badge candidates (Wikipedia infobox, then NASA / Commons)
  into `/tmp` review files; a human picks before `badge-sources.json`.
- `peg-orbit-validation.mjs` — reports whether each flagship launcher
  profile reaches a real stable orbit (ascent integrator check).
- `__smoke__/resolver-diversity.mjs [--skip-network]` — image resolver
  diversity smoke (offline dedup unit + an optional live pass).
