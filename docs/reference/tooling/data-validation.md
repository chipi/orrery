# Data-validation + audit tooling

Reference for Orrery's `scripts/` validation and audit suite. **Validators** are
fail-closed gates: they exit non-zero on a violation so `npm run preflight` (and
therefore the husky pre-push hook + CI) refuses the push. **Audits** are
on-demand diagnostics — most report and exit non-zero, but they're run by hand,
not chained into the gate.

The gate entry point is `npm run validate-data`, which runs
`scripts/validate-data-runner.ts` — a parallel runner (`Promise.all`) that spawns
every gating validator concurrently and re-throws the worst exit code. It
replaced the old serial `&&` chain (GH #272) so preflight doesn't pay wall-clock
for independent checks. Adding a new gate = add a `Task` entry to that runner's
`TASKS` array.

Cross-references (not duplicated here): **ADR-069** (overlay-completeness
fail-closed contract), **AGENTS.md** §"No-stub validation" + §"Image pipeline —
gotchas", **docs/adr/TA.md** §pipelines.

| Validator | Gate? | What it checks |
|---|---|---|
| validate-data.ts | yes | ajv schemas for all `static/data/**` + ~20 runtime consistency invariants |
| validate-diagrams.ts | yes | every `/science` section `diagram` field has its SVG on disk |
| validate-satellites.ts | yes | satellites.json schema + gallery + per-locale overlay coverage |
| validate-hero-coverage.ts | yes | every surface index id has a `01.jpg` hero (with fallback ladder) |
| validate-image-dupes.ts | yes | cross/same-surface SHA-256 byte-dupes in `static/images/` |
| validate-image-phash-dupes.ts | yes | perceptual near-dupes (Hamming ≤ 6) from the phash cache |
| validate-gallery-counts.ts | yes | `*-galleries.json` counts match on-disk slot reality |
| validate-provenance-walker.ts | yes | walker schema-sync: no `FilePath/undefined`, NASA-CDN rows carry `nasa_id` |
| validate-allowlist-discipline.ts | yes | dupe-allowlist growth vs `main` stays within budget unless authorized |
| validate-credits-bundling.ts | yes (informational) | `/credits` bundling integrity; only hard-fails on `FilePath/undefined` |
| audit-image-mime.ts | inline only | `.jpg` files start with JPEG SOI bytes (same check runs inside validate-data) |
| license-allowlist.ts | n/a (module) | shared license allowlist consumed by validate-data |
| audit-image-usage.ts | no | every shipped image is referenced/used somewhere |
| audit-report-launches.ts | no | launches provenance gaps + unmapped rocket families (HTML report) |
| audit-gallery-counts.ts | no | gallery counts below threshold (agency-balance diagnostic) |
| audit-heroes.ts | no | hero-quality rubric across all surfaces (markdown reports) |
| audit-fleet-heroes.ts | no | fleet hero rubric — **mutates** sidecar + swaps slots |
| audit-site-imagery.mjs | no | /earth /moon /mars site imagery categorisation (read-only) |
| build-audit-report.ts | no | image-pipeline HTML report (vision + curation + cost ledger) |

---

## validate-data.ts

**Command** — `npm run validate-data` (runs it as one of the parallel tasks); standalone `tsx scripts/validate-data.ts`
**What** — The core validator. Compiles ~45 JSON schemas (`Ajv({strict:true, strictRequired:false})`) and validates every reference file, mission, overlay, fleet entry, science section, launch, audio manifest, etc. Then layers on ~20 runtime invariants the schema can't express.
**When** — automatically in `npm run validate-data` → preflight → CI.
**Fails on** (any of, summed at the end → `process.exit(1)`): schema violation; cislunar/interplanetary waypoint invariant breach (MET-0 anchor, strictly-increasing, window cap, ≤200 pts); fleet↔mission↔site bidirectional drift + orphan/category mismatch; doc gating-sentence missing (PRD "Why this is a PRD", RFC "Why this is an RFC", ADR "> Status ·"); tcm_count drift; provenance license-not-allowed / missing-file / duplicate-path; text-sources + source-logos dupes/missing; link-provenance unknown-source/tracker-survivor/dup/bad-BCP47; launches missing-primary/missing-citation/orphan-launcher-ref; oversized image > 8 MiB workbox cap; `.jpg` non-JPEG bytes; image-vision/curation malformed; **surface-hotspot Tier-2 consumed-variant missing on disk**; **missing en-US overlay** (earth-objects/fleet/moon-sites/mars-sites/science/fleet-galleries); audio + episode-sources cross-ref breaks.
**Gotchas**
- **Fails CLOSED on a missing en-US overlay** (ADR-069 / GH #83): adding a registry id without its `i18n/en-US/.../<id>.json` breaks the build here, not just at e2e. Other locales fall back to en-US so only en-US presence is enforced.
- Doc gating-sentence check is scoped to `git ls-files` (issue #136) — untracked PRD/RFC drafts a parallel agent left don't block your push; `git add` them to re-cover. Falls back to a filesystem walk when git metadata is unavailable.
- `WORKBOX_CACHE_LIMIT_BYTES` (8 MiB) must stay in sync with `maximumFileSizeToCacheInBytes` in `vite.config.ts` — bump both together. 5–8 MiB is a soft warn band.
- The surface-hotspot variant check mirrors the runtime `pickVariant(entry,'thumbnail')` resolve: a hotspot base re-fetched without regenerating its `*.1x1.jpg` variants 404s at deepest zoom. MANDATORY after any hotspot re-fetch: `node scripts/hotspots/regenerate-tier3-variants.mjs <base>.jpg`.
- Link-provenance freshness + launches-curation dangling refs are WARN-only (don't fail the build).
**State** — Healthy, the workhorse gate. It has accreted ~20 inline runtime blocks; opportunity: extract the image/overlay blocks into their own runner tasks so they parallelise instead of running serially inside this one process.

## validate-data-helpers.ts

**Command** — n/a (imported by validate-data.ts)
**What** — Pure detector functions for the cross-reference integrity checks: `findBidirectionalFleet{Mission,Site}Drift`, `findProvenanceFailures`, `findLaunchesMissing{PrimaryProvenance,Citations}`, `findLaunchesOrphan{LauncherRefs,RocketMappingTargets}`. Keeps detection logic pure (testable) while validate-data owns the console templating.
**State** — Healthy; the seam that makes the integrity rules unit-testable.

## validate-diagrams.ts

**Command** — `npm run validate-diagrams`; also a parallel task inside `validate-data`
**What** — Walks every base `/science` section JSON and asserts any declared `diagram` field resolves to an SVG at `static/diagrams/science/<diagram>` (ADR-035).
**When** — automatically in `npm run validate-data`; also exposed standalone.
**Fails on** — any `diagram` reference with no matching SVG on disk.
**Gotchas** — skips `_index.json`; exits 0 (skip) when `static/data/science/` is absent.
**State** — Healthy, narrow scope.

## validate-satellites.ts

**Command** — `tsx scripts/validate-satellites.ts` (parallel task in `validate-data`)
**What** — Schema + coverage for the natural-satellite layer (#304): required fields + library tier/kind enums on `satellites.json`, `satellite-galleries.json` coverage, and a per-locale overlay file for every satellite × locale.
**When** — automatically in `npm run validate-data`.
**Fails on** — missing required field, duplicate id, invalid library tier/kind, missing gallery entry, or a missing overlay file in any locale.
**Gotchas** — orphan gallery entries and missing per-locale `satellites/` dirs are WARN, not fail. Skips `packed-lines`.
**State** — Healthy.

## validate-hero-coverage.ts

**Command** — `tsx scripts/validate-hero-coverage.ts` (parallel task in `validate-data`)
**What** — Walks every surface index (missions/fleet/moon-sites/mars-sites/earth-objects/planets) and verifies a `01.jpg` hero exists, following the same cross-surface fallback ladder as the runtime gallery loader.
**When** — automatically in `npm run validate-data`.
**Fails on** — any id with no hero on disk AND no fallback hit AND not in that surface's `KNOWN_*_GAPS` allowlist.
**Gotchas** — all `KNOWN_*_GAPS` sets are currently empty (#342 cleared the cruise-phase backlog). The fallback ladder is bidirectional (surface↔missions↔fleet) so a byte-dedup pass that dropped a redundant copy doesn't false-flag. Adding an id to a gap set requires a real fetch + a `docs/provenance/image-hero-inventory.md` entry.
**State** — Healthy / current. Coupled to the runtime loader's ladder — keep `FALLBACK_LADDER` in sync with `src/lib/data.ts`.

## validate-image-dupes.ts

**Command** — `tsx scripts/validate-image-dupes.ts` (parallel task in `validate-data`)
**What** — SHA-256-hashes every base `.jpg` in `static/images/` and fails on any 2+ files sharing bytes (cross-surface OR same-surface) unless the 8-char prefix is in the inline `ALLOWLIST`. Exports `ALLOWLIST` for the phash validator to import.
**When** — automatically in `npm run validate-data`.
**Fails on** — any un-allowlisted byte-dupe group.
**Gotchas** — skips `.1x1/.4x3/.16x9` variant crops (only base images). `main()` runs only when invoked directly, so the phash sibling can import `ALLOWLIST` without triggering a scan. The allowlist is large and growing — every legitimate editorial cross-surface reuse needs a one-line prefix + comment; this is the duplicate-manifest-entry trap that `validate-allowlist-discipline.ts` polices.
**State** — Healthy but the allowlist is heavy (~250 entries). Each is human-justified; growth is gated.

## validate-image-phash-dupes.ts

**Command** — `tsx scripts/validate-image-phash-dupes.ts` (parallel task in `validate-data`)
**What** — Reads the `static/data/image-phashes.json` cache (built by `compute-phash.ts`), does an O(n²) Hamming scan, fails on any pair with d ≤ 6 not in `INLINE_ALLOWLIST` + `phash-baseline-allowlist.json`. Auto-skips byte-identical pairs already signed off in the byte-allowlist.
**When** — automatically in `npm run validate-data`.
**Fails on** — any un-allowlisted near-dupe at d ≤ 6.
**Gotchas** — **phash cache staleness**: this reads a precomputed cache, not live pixels — re-run `compute-phash.ts` after image changes or the scan validates stale state. Threshold 6 is hand-tuned to the current corpus; it catches re-encodes/crops, NOT "same subject different shoot" (those land at d≈25-40). The dual-allowlist (inline categorised + JSON baseline snapshot) means a near-dupe can be silenced in two places.
**State** — Healthy; depends on cache freshness being maintained out-of-band.

## validate-gallery-counts.ts

**Command** — `tsx scripts/validate-gallery-counts.ts` (parallel task in `validate-data`)
**What** — Asserts `fleet-galleries.json` + `mission-galleries.json` counts equal the on-disk count of `NN.jpg` base slots per id. The count IS the contract the gallery loader uses to enumerate slot URLs.
**When** — automatically in `npm run validate-data`.
**Fails on** — any id where manifest count ≠ disk count (over → 404, under → silently-hidden images).
**Gotchas** — only counts base `\d{2}\.jpg`; covers fleet + mission manifests only (satellite/site/planet count-checks live elsewhere — see audit-image-usage's broader manifest map).
**State** — Healthy. Opportunity: it covers 2 of the ~11 count manifests `audit-image-usage.ts` knows about; the others aren't gated against disk here.

## validate-provenance-walker.ts

**Command** — `tsx scripts/validate-provenance-walker.ts [--manifest=...]` (parallel task in `validate-data`)
**What** — Enforces the build-image-provenance walker's schema-sync contract: no entry has `image_url` ending `Special:FilePath/undefined`, and every NASA-CDN-referencing entry carries a non-null `nasa_id`.
**When** — automatically in `npm run validate-data`.
**Fails on** — any `FilePath/undefined` survivor or NASA-CDN row with null `nasa_id`.
**Gotchas** — defends against two specific historical walker bugs (Slice A v3); the `FilePath/undefined` check is also re-asserted defensively in `validate-credits-bundling.ts`.
**State** — Healthy, tightly scoped to known regressions.

## validate-allowlist-discipline.ts

**Command** — `tsx scripts/validate-allowlist-discipline.ts [--base=main --max=5]` (parallel task in `validate-data`)
**What** — Diffs the dupe-allowlist entries (byte + phash) against `origin/main`/`main` and fails when more than `MAX_AUTOLAND` (5) new entries land on the branch without an `ALLOWLIST_AUTHORIZED:` token in a commit message. Stops the "silence the build by padding the allowlist" pattern that shipped 707 bad swaps.
**When** — automatically in `npm run validate-data`.
**Fails on** — net-new allowlist entries > max AND no `ALLOWLIST_AUTHORIZED:` token in branch commits.
**Gotchas** — skips silently when no baseline ref is resolvable (initial setup / shallow clone). Authorization is a literal commit-message token after curator review, not a code change.
**State** — Healthy; the meta-gate over the two dupe validators.

## validate-credits-bundling.ts

**Command** — `tsx scripts/validate-credits-bundling.ts [--top=N --fail-on-split]` (parallel task in `validate-data`)
**What** — Mirrors `src/lib/credits-grouping.ts` to report how `/credits` collapses provenance entries into bundles: cross-route reuse, cross-source "split" bundles. Defensively re-checks for `FilePath/undefined`.
**When** — automatically in `npm run validate-data`.
**Fails on** — `FilePath/undefined` survivors (always); cross-source splits only when `--fail-on-split` is passed (off in the gate).
**Gotchas** — `agencyToSourceId` + `SOURCE_TYPE_TO_ID` are hand-mirrored from `credits-grouping.ts`; if either drifts, split detection becomes inaccurate (still informative). In the gate it's effectively a `FilePath/undefined` guard + a report.
**State** — Healthy but mostly informational in CI. Opportunity: the manual mirror of the grouping logic is a drift risk — import the real functions instead.

## audit-image-mime.ts

**Command** — `npx tsx scripts/audit-image-mime.ts` (report) · `--repair` (re-encode in place) · `--quiet`
**What** — Walks `static/images/**/*.jpg` and verifies each starts with the JPEG SOI marker (`ff d8 ff`). GH #251: 110 fleet files had `.jpg` extensions but raw PNG bytes, silently breaking Anthropic vision scoring.
**When** — the **check** runs inline inside `validate-data` (so it gates); this standalone script is the on-demand reporter + repair tool.
**Fails on** — any `.jpg`/`.jpeg` whose first 3 bytes aren't JPEG.
**Gotchas** — `--repair` re-encodes via `coerceToJpeg()` then re-verifies. Fetchers should call `coerceToJpeg()` to prevent regression. Browsers + sharp sniff and render anyway, so the mismatch is otherwise invisible.
**State** — Healthy; the gate copy and the standalone repair tool share `lib/image-bytes.ts`.

## license-allowlist.ts

**Command** — n/a (module)
**What** — Canonical license allowlist for image + text provenance (ADR-046 Milestone C). Exports `isAllowedLicense`, `getAllowlistEntry`, `normaliseLicenseShortName`. Includes the deliberate non-Western-agency precedents (CNSA-EDU, ISRO-EDU, JAXA-OPEN, SpaceIL-EDU) and `Orrery-Original` for in-house prose.
**When** — consumed by validate-data's provenance + text-sources gates.
**Gotchas** — anything not in the allowlist AND not waived in `license-waivers.json` fails closed. Prefer extending the allowlist (with a rationale) over filing a waiver.
**State** — Healthy / current; the single source of truth for license stewardship.

---

## Audit family (on-demand — not in `validate-data`)

### audit-image-usage.ts

**Command** — `npm run audit:images` · `npm run audit:images -- --write-approved`
**What** — Proves the RFC-029 invariant: every shipped image under `static/images/` (minus gitignored `_staging/`) is referenced by a display manifest, source code, a gallery count-cap, a hero slot, or is a body/card/hotspot. `--write-approved` (re)derives `image-approved.json` from the same classifier.
**When** — on-demand. Strong candidate to promote into the gate (it's the broadest coverage check and already exits 1 on orphans).
**Fails on** — any UNKNOWN orphan not in `ALLOWED_ORPHANS` (currently empty).
**Gotchas** — variant-aware (a used base covers all its crops). `BOOKKEEPING` regex excludes all-path manifests so they don't mark everything "referenced". Knows all ~11 gallery count manifests — broader than the gated `validate-gallery-counts.ts`.
**State** — Current; the natural next promotion into `validate-data`.

### audit-report-launches.ts

**Command** — `npm run audit:launches` (also `npm run docker:audit-launches`)
**What** — Writes gitignored `static/audit-report-launches.html`: provenance gaps (rows where agency-direct returned nothing, source `ll2`), unmapped rocket families, tier-reason distribution (RFC-023 §10).
**When** — on-demand, after `npm run fetch:launches`.
**State** — Current; pure reporter, never exits non-zero.

### audit-gallery-counts.ts

**Command** — `npx tsx scripts/audit-gallery-counts.ts [--json] [--non-nasa] [--threshold N]`
**What** — Reports mission + fleet gallery counts below a threshold (default 3), grouped by agency — surfaces non-NASA coverage gaps for agency balance.
**When** — on-demand. Exits non-zero when any entry is below threshold (a diagnostic, not wired into the gate).
**State** — Current.

### audit-heroes.ts

**Command** — `npx tsx scripts/audit-heroes.ts [--surface=<name>] [--list-clean]`
**What** — Applies the hero-quality rubric (URL deny-list, subject deny-list, vision category/score rules, subject↔id mismatch) across all 8 surfaces and writes `docs/provenance/<surface>-hero-audit.md` with swap proposals / needs-sourcing / accepted-overrides. Read-only on manifests; does not apply swaps.
**When** — on-demand, no API calls.
**Gotchas** — `<surface>-hero-overrides.json` wins over rubric output silently; the report lists overrides to keep them reviewable.
**State** — Current; the quality counterpart to the coverage gate.

### audit-fleet-heroes.ts

**Command** — `npx tsx scripts/audit-fleet-heroes.ts`
**What** — Older, fleet-only hero auditor. **Mutates**: applies auto-swaps to disk + rewrites `fleet-image-sources.json`, writes `docs/provenance/fleet-hero-audit.md`. `ACCEPTED_OVERRIDES` holds the no-clean-photo cohort (Energia, Tiangong-2, Salyut-7, Soyuz 7K-OK).
**When** — on-demand only — it writes files, so never in CI.
**Gotchas** — superseded in scope by the read-only `audit-heroes.ts`; this one still has the destructive swap path. Run deliberately.
**State** — Needs-attention — overlaps `audit-heroes.ts` (which is read-only + multi-surface). Candidate for retirement once its swap utility is folded into a non-destructive apply step.

### audit-site-imagery.mjs

**Command** — `node scripts/audit-site-imagery.mjs`
**What** — Categorises every /earth /moon /mars site by own-vs-mission-vs-fleet hero byte-size into KEEP_OWN / DELETE_OWN_USE_MISSION / FALLBACK_OK / HAND_SOURCE etc. Writes `/tmp/site-image-audit.json`. Read-only.
**When** — on-demand.
**State** — Current; a one-shot triage helper (size-heuristic, not vision-based).

### build-audit-report.ts

**Command** — `npx tsx scripts/build-audit-report.ts [--threshold N]`
**What** — Renders gitignored `static/audit-report.html` from `image-curation.json` + `image-vision.json` + `cost-ledger.json`: flagged deny-list, low-score images, fallback/rejected, recent scoring runs + total spend (PRD-018 M6 / RFC-022 §8).
**When** — on-demand.
**State** — Current; the image-pipeline operator dashboard.
