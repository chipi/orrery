# Image pipeline — tooling index

> **This is the tooling INDEX for the image pipeline** — one entry per durable
> tool (what / when / gotcha / state), cross-linked to the deep docs. It does
> **not** re-explain the flow. For the end-to-end map (sidecar → disk → pHash →
> provenance → count manifest → UI), the worked example, and the ADR
> cross-refs, read the deep reference first:
>
> - [`scripts/IMAGE-PIPELINE.md`](../../../scripts/IMAGE-PIPELINE.md) — **deep end-to-end reference** (flow, source-resolution tiers, validation gates, worked example).
> - [`docs/guides/image-pipeline-v2.md`](../../guides/image-pipeline-v2.md) — operator setup for the v2 vision-scoring layer (API key, cost ledger, sidecar manifest).
> - [`docs/anatomy-art-runbook.md`](../../anatomy-art-runbook.md) — the SEPARATE spacecraft-anatomy art pipeline.
> - [AGENTS.md §"Image pipeline — gotchas"](../../../AGENTS.md#image-pipeline--gotchas) — what NOT to do (canonical gotcha prose).
> - [docs/adr/TA.md §pipelines](../../adr/TA.md#pipelines) — Pipeline 1 (asset fetch) + Pipeline 2 (provenance manifest).

**STANDING** = re-run as part of routine sourcing/dedup/credit work.
**ONE-SHOT-BUT-KEPT** = ran once for a specific wave/migration; kept for the
recipe, not routine re-execution. (Fully-retired one-shots live in
[`scripts/_archive/`](archive.md).)

---

## Happy path

The end-to-end sequence for adding/refreshing gallery imagery (full version with
disk paths + the validate-data lockstep is in
[`scripts/IMAGE-PIPELINE.md`](../../../scripts/IMAGE-PIPELINE.md)):

1. **Fetch** → `npm run fetch-assets` (stages to `_staging/` by default, RFC-029).
2. **Score** → `npm run images:score` (incremental vision scoring + 1x1 crops).
3. **Review** → open **`/dev/staging`** (dev-only), filter, mark Promote/Prune.
4. **Promote** → "Apply marked actions" moves files to the shipped tree, appends to `image-approved.json`, bumps the gallery count.
5. **Credit** → `npm run build-image-provenance` (add `--offline` to skip Wikimedia enrichment if it hangs).
6. **Validate** → `npm run validate-data` (dupes + mime + counts + provenance completeness gates).

`npm run fetch` chains steps 1+5 + link provenance + validate-data in one go.

---

## Sourcing + fetch

### `fetch-assets.ts` — main fetch entry **(STANDING)**

- **Command** `npm run fetch-assets` · scope: `-- --missions-only=<id,…>` · `-- --fleet-only[=<id,…>]` · `-- --iss-only` · `-- --no-stage`
- **What** Build-time asset fetcher (ADR-016). NASA Images API → Wikimedia Commons fallback (agency-first per ADR-046). Round-trips every `.jpg`/`.jpeg` write through `sharp().jpeg()` (`lib/image-bytes.ts`) so on-disk bytes are valid JPEG (GH #251). Also fetches textures, agency logos, fonts.
- **When** Any new/refreshed gallery imagery; the entry point for sourcing.
- **Gotchas** Stages by default per RFC-029 — gallery-slot downloads land in `static/images/_staging/` (gitignored, off `/credits`, pruned from prod), NOT the shipped tree. Promote at `/dev/staging`. `--no-stage` restores legacy write-straight-to-main. Textures/logos/fonts and single-file covers bypass staging (see `lib/staging.ts`).
- **State** Largest script in the tree (~148 KB) — carries all the curated query/fallback maps that `build-image-provenance.ts` re-imports as the single source of truth. Opportunity: the curated maps could split into data files.

### `agency-mission-sources.ts` — agency-first resolver **(STANDING, library)**

- **Command** (imported by `fetch-assets.ts`; not a CLI)
- **What** `normalizeAgency()` maps `missions/index.json` agency strings → closed `AgencyKey`; `fetchAgencyPrimaryImageUrls()` resolves agency-primary URLs before Commons (ADR-046). The richer multi-primary tier chain lives in `lib/agency-resolver.mjs` (consumes `agency-archives.json` schema v2).
- **When** Whenever a fetcher needs to resolve a source agency-first.
- **Gotchas** Keep agency-name casing aligned with the catalog (`Roscosmos` vs `ROSCOSMOS`) — drift here feeds the walker-fallback mis-credit gotcha downstream.
- **State** Has a co-located `.test.ts`. Opportunity: consolidate with `lib/agency-resolver.mjs` (two resolvers, overlapping responsibility).

### `source-known-gaps.ts` — curated hero-gap sourcing **(ONE-SHOT-BUT-KEPT)**

- **Command** `npx tsx scripts/source-known-gaps.ts [--dry]`
- **What** Sources the `KNOWN_HERO_GAPS` entries (#5 Phase 4) from a curated agency-first `SOURCING_MAP` (Commons title OR `copyFrom` a sibling surface). Writes `01.jpg` + `01.1x1.jpg`, removes the sourced id from the hero-coverage allowlist. Idempotent.
- **When** Re-run if new hero gaps are added to the map; otherwise the recipe.
- **Gotchas** 1x1 is the only variant generated (variant policy below).
- **State** Map is frozen at the #5 backfill set. Opportunity: fold into a generic gap filler.

### `fill-gallery-gaps.ts` — auto-query gap fill **(STANDING)**

- **Command** `npx tsx scripts/fill-gallery-gaps.ts [--dry]`
- **What** Walks galleries, finds entities under TARGET (5) slots, sources extras from Commons. pHash-checks each candidate against the entity's slots AND the global corpus before landing (never introduces a near-dupe).
- **When** After pruning, or any time galleries are under target.
- **Gotchas** Derives the query from the entity id (`luna10` → "luna10"), which misses Commons' canonical naming — use `fill-curated-queries.ts` for those. Run `compute-phash.ts --force` first if slots were just renamed (stale cache lets dupes through).
- **State** STANDING. Writes `docs/provenance/fill-gallery-gaps-report.md`.

### `fill-curated-queries.ts` — targeted gap fill **(ONE-SHOT-BUT-KEPT)**

- **Command** `npx tsx scripts/fill-curated-queries.ts [--dry]`
- **What** Same pHash-guarded fill as above, but with hand-curated per-entity Commons queries for the entities the auto-query couldn't reach (canonical category / mission designation).
- **When** Re-run if the curated query map gains entries.
- **Gotchas** Same pHash-cache-staleness caveat.
- **State** Query map frozen at the 2026-06-14 under-target set.

### `fetch-fleet-sub-a-curation.ts` — fleet single-image top-up **(ONE-SHOT-BUT-KEPT)**

- **Command** `npx tsx scripts/fetch-fleet-sub-a-curation.ts`
- **What** Adds 1 image each to 8 single-image non-NASA fleet entries (GH #255) via the Wikipedia REST summary API. URLs hand-validated; goes through `coerceToJpeg`.
- **When** Recipe for hard-to-source non-NASA hardware; not routine.
- **Gotchas** Run `npm run images:score -- --new-only` afterward.
- **State** Frozen curation list.

---

## Vision scoring (Image Pipeline v2)

### `score-images.ts` + `scripts/vision/` — vision scorer **(STANDING)**

- **Command** `npm run images:score` (incremental/`--new-only` implicit) · `-- --all` · `-- --mission <id>` · `-- --agency <name>` · `-- --force-score` · `-- --skip-crops` / `-- --skip-scoring`
- **What** Orchestrator (PRD-018 / RFC-022). For new/changed images: Anthropic vision score (subject, category, focal point) → 1x1 crop variants → writes `static/data/image-vision.json`. Default run is effectively free (cache hits).
- **When** After any fetch; before promote/prune ranking (prune-image-slots reads the scores).
- **Gotchas** Needs `ANTHROPIC_API_KEY` (loaded from `.env`); Claude Code subscriptions do NOT cover API calls — operator supplies the key. On 401 it logs + skips, doesn't fail the build. Cost ledger tracked via `src/lib/cost-ledger.ts` + `static/data/cost-ledger.json`.
- **State** STANDING. `scripts/vision/` modules:
  - `provider.ts` — `VisionProvider` interface (swap model = new impl, not a rewrite).
  - `anthropic.ts` — default impl, Sonnet 4.6 (`claude-sonnet-4-6`); per-image ~$0.025–0.05, whole-corpus first build ≈ $67, cached runs $0.
  - `prompt.ts` — static rubric + `SCORING_PROMPT_VERSION` (bump to invalidate the whole score cache).
  - `cache.ts` — per-image score cache; key = source bytes + prompt version + model id ONLY (no time-based invalidation). Stored under `.image-cache/scores/` (gitignored).
  - `crop-variants.ts` — sharp crop at the vision focal point. **`VARIANT_RATIOS` is the single variant lever — `[1x1]` only since 2026-06-26.**
  - `build-manifest.ts` — assembles `image-vision.json` (the frontend-read sidecar; keyed to match `image-provenance.json`).

---

## Review surface

### `/dev/staging` — RFC-029 promote/prune **(STANDING, dev route)**

- **Command** open `http://localhost:5173/dev/staging` (dev-only; `src/routes/dev/+layout.ts` 404s the subtree in prod builds). Backed by `src/routes/dev/staging/api/`.
- **What** Reviews `static/images/_staging/` fetches. Filter, bulk-mark Promote/Prune, "Apply marked actions": promote moves the file to the shipped tree, appends to `image-approved.json` (durable allowlist), bumps the id's contiguous gallery count.
- **When** After every staged fetch, before crediting.
- **Gotchas** Never hand-move files between `_staging/` and main + counts — moving *middle* gallery slots out leaves 404 gaps. Use the surface. `/credits` + `build-image-provenance.ts` intersect `image-approved.json` (scoped to `/images/`), so a staged/unapproved image can never be credited.
- **State** STANDING. See [AGENTS.md §"Image pipeline — gotchas"](../../../AGENTS.md#image-pipeline--gotchas) "Staging ground".

---

## Provenance + credits

### `build-image-provenance.ts` — the credits manifest **(STANDING)**

- **Command** `npm run build-image-provenance` · `-- --offline`
- **What** Walks disk image trees + curated source maps (re-imported from `fetch-assets.ts`), queries Commons `imageinfo`/`extmetadata` live, writes a TASL row per image to `static/data/image-provenance.json` + `docs/provenance/last-fetch-diff.md`. Fail-closed per ADR-047.
- **When** After every sourcing/promote pass; part of `npm run fetch`.
- **Gotchas** `--offline` skips Commons enrichment (which can hang). Never hand-write `author`/`license_short` — the Commons lookup is upstream-truth. **Walker-fallback agency lookup**: `buildWalkerFallbackEntries` falls through to the surface default if a non-NASA entity isn't found in the per-catalog HUMAN map → wrong credit. **Concurrent-write hotspot**: a parallel run can clobber fresh hotspot upserts via a load-snapshot race; re-run + verify before committing.
- **State** STANDING but huge (~105 KB) — carries the walker + all credit-derivation logic. Opportunity: extract the walker.

### `build-image-alt-baseline.ts` — alt-text baseline **(STANDING)**

- **Command** `npx tsx scripts/build-image-alt-baseline.ts [--check]`
- **What** Builds `static/data/image-alt-text/en-US.json` from provenance captions (caption_short > title > description). i18n locale files overlay this (deferred to #257/v0.9).
- **When** After provenance rebuilds.
- **Gotchas** en-US only; non-English locales fall back to en-US in `src/lib/image-alt.ts`.
- **State** STANDING.

### `flag-image.ts` — editorial deny-list **(STANDING)**

- **Command** `npx tsx scripts/flag-image.ts <path> --reason "<why>"` · `--list` · `--unflag <path>`
- **What** Appends to `static/data/image-curation.json` so the next scoring run skips the image and surfaces recent deny-reasons as prompt bias (RFC-022 §8).
- **When** Reviewing a bad image you want re-sourced.
- **State** STANDING.

---

## Dedup + content integrity

### `compute-phash.ts` — pHash cache **(STANDING)**

- **Command** `npx tsx scripts/compute-phash.ts [--force]`
- **What** DCT pHash per base `.jpg` → `static/data/image-phashes.json` (URL-path keyed). Incremental by mtime. Feeds `validate-image-phash-dupes.ts` + the source-time fill guards.
- **When** After every fetch; **mandatory `--force` between any slot delete/rename and a fill run.**
- **Gotchas** **Cache-staleness after slot rename** — the cache key is the URL path, so renaming `03.jpg → 02.jpg` leaves a stale entry and fill scripts let near-dupes through. Always `--force` rebuild after renames.
- **State** STANDING. ~10–15 s on the ~2000-image corpus.

### `snapshot-phash-baseline.ts` — baseline allowlist **(STANDING, intent-only)**

- **Command** `npx tsx scripts/snapshot-phash-baseline.ts`
- **What** Snapshots current residual near-dupes (≤ threshold) into `static/data/phash-baseline-allowlist.json` — the ratchet that lets the validator pass today while failing on NEW dupes.
- **When** Only with INTENT, after cleaning/categorising dupes — NOT routinely.
- **Gotchas** Reads `INLINE_ALLOWLIST` from `validate-image-phash-dupes.ts` (parses TS source as text) and excludes those pairs — re-snapshotting without that re-bloats the JSON. Re-snapshotting after a sourcing pass widens the gate to whatever dupes that pass added (the opposite of its purpose).
- **State** STANDING but rare. Treat like pinning a snapshot test.

### `delete-intra-entity-dupes.ts` — dupe delete + renumber **(ONE-SHOT-BUT-KEPT)**

- **Command** `npx tsx scripts/delete-intra-entity-dupes.ts [--dry]`
- **What** Deletes the higher-numbered slot of each hard-coded intra-entity dupe `PAIRS`, renumbers survivors contiguous. Run `compute-phash.ts --force` then `fill-gallery-gaps.ts` to top up.
- **When** Re-run if new dupe pairs are added to the list.
- **Gotchas** The `PAIRS` list is the lever; stale pHash cache between delete and fill re-introduces the same dupes.
- **State** Frozen at the post-#5 cleanup set.

---

## Manifest + slot maintenance

### `rebuild-gallery-manifests.ts` — count manifests **(STANDING)**

- **Command** `npx tsx scripts/rebuild-gallery-manifests.ts [--check]`
- **What** Walks each surface's image dir, counts non-variant base JPEGs, writes the `<id, count>` map (`mission-galleries.json`, `fleet-galleries.json`, `planet-/small-body-/satellite-/earth-object-galleries.json`). The source of "does this entity have a gallery tab".
- **When** After any sourcing/prune/promote pass that changed disk slot counts.
- **Gotchas** **Count drift = silent 404s** (manifest > disk) or hidden images (manifest < disk). `validate-gallery-counts` gates this in preflight. Sync the manifest in the same commit as any slot delete/rename.
- **State** STANDING.

### `prune-image-slots.ts` — top-5 cap + renumber **(STANDING)**

- **Command** `npx tsx scripts/prune-image-slots.ts [--dry]`
- **What** Enforces max-5 base slots per id. Ranks by `image-vision.json` score DESC, keeps top 5, renumbers 01..05 (so slot 01 = best, the default hero pick). Updates vision/provenance/sidecar manifests for renamed paths. 2-pass conflict-free rename. Idempotent.
- **When** After scoring, when an id exceeds 5 slots.
- **Gotchas** Reads vision scores — run `images:score` first or unscored slots tie last.
- **State** STANDING. Writes `docs/provenance/prune-image-slots-report.md`.

### `prune-orphan-images.ts` — stale-file sweep **(STANDING)**

- **Command** `npx tsx scripts/prune-orphan-images.ts [--dry]`
- **What** Deletes dash-legacy variants, dead-code `*.4x3`/`*.16x9` variants, and dead-base variants whose base is gone. Drops the matching `image-vision.json` + alt-text keys. Idempotent.
- **When** Cleanup after the variant-policy change or stray fetcher output.
- **Gotchas** Keeps `.1x1` + base files even if the base lacks provenance (the fix for missing provenance is to extend the walker, not delete content).
- **State** STANDING. Writes `docs/provenance/prune-orphan-images-report.md`.

---

## Hero selection

### `generate-hero-overrides.ts` — hero override JSON **(STANDING)**

- **Command** `npx tsx scripts/generate-hero-overrides.ts`
- **What** Reads the `## ⇄ Swap proposals` tables in `docs/provenance/*-hero-audit.md` (from `audit-heroes.ts`) → writes `static/data/<surface>-hero-overrides.json`, consumed by `pickHero()` + `loadHeroOverrides`. Idempotent.
- **When** After a hero audit produces new swap proposals.
- **Gotchas** Hero per surface lives in the override JSON, NOT slot 01 — disk-copying to slot 01 is invisible if an override exists.
- **State** STANDING.

### `fix-fleet-heroes.ts` — fleet hero curation **(ONE-SHOT-BUT-KEPT)**

- **Command** `tsx scripts/fix-fleet-heroes.ts`
- **What** Replaces bad/empty fleet `01.jpg` with curated canonical Commons filenames (resolved via Wikipedia `pageimages`, ADR-046 rationale). Old 01 shifts to a free slot; sidecar updated.
- **When** Recipe for fixing a specific fleet hero; not routine.
- **Gotchas** Commons SEARCH is noisy ("Cygnus" → swans) — that's why this uses curated infobox-derived filenames.
- **State** `HERO_OVERRIDES` map frozen.

---

## Anatomy art (SEPARATE pipeline)

### `build-anatomy-webp.mjs` — anatomy art manifest **(STANDING)**

- **Command** `node scripts/build-anatomy-webp.mjs`
- **What** Derives web-sized `.webp` (≈10× smaller, 1100 px longest edge) from the full-res `.png` anatomy originals in `original-assets/anatomy/` → `static/images/anatomy/`. Surfaced on the fleet DETAIL tab + `/colophon` (#367). Auto-derives `src/lib/anatomy-ids.json`.
- **When** After generating new anatomy art.
- **Gotchas** This is NOT the photo pipeline — it's AI-generated watercolor/pencil cutaways. To generate more without style drift, follow [`docs/anatomy-art-runbook.md`](../../anatomy-art-runbook.md) (verbatim prompts, fixed model/aspect, reference-image anti-drift). Do NOT hand-edit `anatomy-ids.json` — it's regenerated here.
- **State** STANDING.

---

## Surface hotspots sub-pipeline (`scripts/hotspots/`)

Orbital-surface imagery for `/moon` + `/mars` deep zoom is its OWN sub-pipeline
(27 files, #309/#360/#361) — HiRISE/CTX/LROC/Kaguya crops for landing zones and
along rover traverses. **Runs under Node 20** (`~/.nvm/.../v20.20.2/bin/node`) with
the gdal-async binding (`node-v115`); the TS tier-2 fetchers run via `tsx`.

Canonical prose is in [AGENTS.md §"Image pipeline — gotchas"](../../../AGENTS.md#image-pipeline--gotchas)
(the "Orbital surface imagery", "Moon REGIONAL/DETAIL/TRAVERSES", and
"re-fetching a hotspot base" paragraphs) + [RFC-017](../../rfc/RFC-017.md). Key
entrypoints only:

### `fetch-hotspot-imagery.ts` — hotspot orchestrator **(STANDING)**

- **Command** `npm run images:hotspots`
- **What** Drives the Mars (HiRISE/CTX/panorama) + Moon (Kaguya regional / LROC featured / panorama / traverse) tier-2/tier-3 fetchers; each self-credits provenance via `hotspots/provenance.ts`.
- **When** Adding/refreshing a surface site's deep-zoom imagery.
- **Gotchas** **Re-fetching a base = regenerate its variants** (below) — the fetchers write only the 2048² base, not the `.1x1` the surface scene consumes. Half-baked re-fetch → empty tile at deepest zoom; `validate-data` gate #8 catches it.
- **State** STANDING.

**Other standing hotspot tools** (per-body fetchers, called by the orchestrator or
directly): `fetch-mars.ts` / `fetch-mars-ctx.ts` / `fetch-mars-panoramas.ts` /
`fetch-mars-traverse.ts`; `fetch-moon.ts` / `fetch-moon-regional.ts` /
`fetch-moon-kaguya-regional.ts` / `fetch-moon-featured-images.ts` /
`fetch-moon-panoramas.ts` / `fetch-moon-traverse.ts`; catalog/crop libs
`hirise-catalog.ts`, `lroc-fetch.ts`, `lroc-products.ts`, `ctx-mosaic.ts`,
`gdal-crop.ts`, `panorama-padder.ts`; provenance `provenance.ts`;
co-registration helpers `coreg-*.mjs` / `verify-coreg-geometry.mjs` /
`validate-coreg.mjs`.

### `regenerate-tier3-variants.mjs` — variant regen **(STANDING, mandatory after base change)**

- **Command** `node scripts/hotspots/regenerate-tier3-variants.mjs static/images/hotspots/<body>/<site>/tier2-*.jpg [...]`
- **What** Re-runs `generateVariants()` (centred focal point) for a base without a vision-API pass. Despite the `tier3` name, regenerates the `.1x1` variant (the only ratio since 2026-06-26).
- **When** **After ANY hotspot base re-fetch/re-point.** Gated by `validate-data` #8.
- **Gotchas** No vision cost, no manifest rewrite — manifest already references the path. Don't `--no-verify` past the gate; run the command it prints.
- **State** STANDING.

**One-shot hotspot backfills (KEPT):** `backfill-imagery-provenance.ts` (mints
route-patch provenance + patches spacecraft fields onto existing Mars entries),
`reupsert-tier2-provenance.ts` (re-adds tier-2 regional provenance the
provenance rebuild drops because hotspots aren't in its curated maps),
`build-moon-traverses.mjs` (writes V1 procedural Moon traverse polylines),
`author-moon-ground.mjs` / `backfill-tier2-ground.mjs` (author co-scale ground
extents). Re-run only if their inputs change.

---

## Shared infra (`scripts/lib/`)

| Module | Role |
|---|---|
| `staging.ts` | RFC-029 staging redirect — `toStagingDest()`, `STAGED_CATEGORIES`. Gallery slots stage; textures/logos/covers pass through. |
| `phash.ts` | DCT pHash + `hammingDistance` (≤4 identical, 5–10 same-subject, >20 unrelated). |
| `image-bytes.ts` | `coerceToJpeg()` / `isJpegBytes()` — the GH #251 mime contract. Every `.jpg` write round-trips through it. |
| `agency-resolver.mjs` | Multi-primary tier chain (agency primaries → institutional secondary → Commons) over `agency-archives.json` schema v2. |
| `vision-judge.mjs` | Haiku 4.5 content-vs-subject QA (~$0.0004/img); fail-open `unsure` on errors. |
| `relevance-gate.mjs` | 0..1 relevance scorer used by `agency-resolver.mjs` across every tier to filter keyword-matched-but-tangential records. |

---

## Variant policy (load-bearing)

`1x1` is the **only** generated crop ratio (since 2026-06-26). `4x3`/`16x9` were
retired as dead code — no UI consumed them (`pickVariant` callers all pass
`'thumbnail'`; `pickVariant` returns `undefined` for other surfaces → caller uses
the raw source path). The single lever is `VARIANT_RATIOS` in
`scripts/vision/crop-variants.ts` (`['1x1']`), which feeds `build-manifest.ts`,
`score-images.ts`, and `regenerate-tier3-variants.mjs`. To re-introduce a ratio,
add it back **and wire a real consumer first**. Note: `static/textures/*.{4x3,16x9}.jpg`
are a SEPARATE pipeline (planet-texture cards on `/credits`) — untouched.

---

*Orrery · `docs/reference/tooling/image-pipeline.md` · index entry — deep ref is [`scripts/IMAGE-PIPELINE.md`](../../../scripts/IMAGE-PIPELINE.md).*
