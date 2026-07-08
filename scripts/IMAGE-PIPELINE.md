# Image pipeline

End-to-end map of how a candidate image becomes a credited gallery slot. Pair with [AGENTS.md §"Image pipeline — gotchas"](../AGENTS.md#image-pipeline--gotchas) for the things that have bitten us — that section is **what NOT to do**; this doc is **what to do, in order**.

When `/missions/<id>` (or any catalog page) renders a gallery, it walks four artefacts in lockstep. Drift between them produces every class of bug we've shipped here — silent 404s, wrong-agency credits, dropped images, double-attribution. Keep these in sync in the same commit:

```
SOURCE SIDECAR  →  DISK FILES  →  pHASH CACHE  →  PROVENANCE  →  COUNT MANIFEST  →  UI
 (the intent)     (the bytes)    (the dedup)    (the credit)    (the loader)     (the render)
```

---

## Source-resolution order — agency archives first, Commons last

> **REGRESSION GUARD.** This rule has been the design since [ADR-046](../docs/adr/ADR-046.md) (agency-first build-time imagery sourcing). It drifted in mid-2026 — batch fetchers like `fetch-zero-image-entities.mjs` skipped tier 1 and went straight to Commons, which is why the 2026-06-17 inventory found dozens of sidecar entries credited as `wikimedia-commons-mirror` when the NASA / JAXA / ESA original was right there. **The rule has not changed; the practice did.** Do not let it drift again:
>
> 1. Every new fetch script must call `nasaSearch()` (or the agency tier-1 equivalent) before touching Commons. The reference shape is `scripts/fetch-batch-2-mission-images.mjs`'s `resolveSource()`.
> 2. `fetch-zero-image-entities.mjs` is **deprecated as a template** — its Commons-only resolver predates the codified order. Copy from `fetch-batch-2-*` instead.
> 3. Every sidecar entry now records `source_type` (`nasa-image-library` | `jpl-photojournal` | `jaxa` | `esa` | `jhu-apl` | `wikimedia-commons`). Auditing the distribution is how we catch drift — a Commons-skew on NASA missions is the regression signal.
> 4. PR reviewers: if a diff adds Commons-only sourcing to a NASA / NASA-co-managed mission, reject and ask for the NASA tier-1 path. The agency master is almost always there.

**Original agency archives are always tried first. Wikimedia Commons is failover, not default.** Re-affirmed 2026-06-17 after the first /missions image inventory.

**v2 (2026-06-17):** the resolver consults `static/data/agency-archives.json` schema_version 2 — each agency carries a `primaries: [...]` array (not a single endpoint) and the global chain is Tier 1 (agency multi-primary) → Tier 2 (institutional secondary) → Tier 3 (Commons failover).

### Tier 1 — Agency primaries (multi-primary per agency)

For a mission with `agency: "ESA / NASA"`, the resolver iterates ALL primaries for ESA, then ALL primaries for NASA, before moving to tier 2. License-incompatible primaries are skipped silently per `license_compatibility.excluded`.

| Agency | Verified primaries | License | Notes |
|---|---|---|---|
| **NASA** | `images-api.nasa.gov/search` | pd-nasa | Reference json-api implementation |
| **Roscosmos** | `flickr.com/photos/roscosmos/` → `roscosmos.ru` | cc-by-2.0 / per-photo | 743 photos. Known Flickr visibility bug — resolver retries |
| **CNSA** | `cnsa.gov.cn/english/n6465652/n6465659/` | **restricted-written-permission** | `auto_fetch_disabled: true` — manual flow only |
| **ESA** | `esahubble.org` (5,507 imgs, CC BY 4.0) → `esa.int/ESA_Multimedia/Images` → `sci.esa.int/web/<mission>/multimedia-gallery` → ESA Flickr | cc-by-4.0 | Per-mission gallery pattern, NOT a central sci.esa.int listing |
| **JAXA** | per-mission galleries (`akatsuki.isas.jaxa.jp/en/gallery/`, `hayabusa2.jaxa.jp/en/galleries/`) → `global.jaxa.jp/multimedia/photos/` | pd-jaxa | **DARTS is research data, NOT a press-image source — excluded** |
| **JHU APL** | `dart.jhuapl.edu/Gallery/index.php` → `pluto.jhuapl.edu/Multimedia/` | permissive-with-credit | Site occasionally times out — curation fallback load-bearing |
| **ISRO** | ISSDC `issdc.gov.in/ch2_gallery.html` → `isro.gov.in/Press_Release.html` | pd-other | ISRO Open Data Policy |
| **SpaceX** | NASA images-api (Crew Dragon/CRS NASA-PD) → Wikimedia `Category:Files_from_SpaceX_Flickr_stream` (grandfathered pre-2018 CC0) | pd-nasa / cc0 | **Current SpaceX Flickr is CC BY-NC 2.0 since 2018 — EXCLUDED** |
| **Blue Origin** | NASA images-api for NASA-shot BO hardware photos only | pd-nasa | "Courtesy of Blue Origin" attribution = BO rights, NOT NASA-PD — excluded |
| **ASI** | `asi.it/` press releases | cc-by | LICIACube on DART; manual scrape |
| **SpaceIL / IAI / USSF / UAESA** | (honest gap — no Tier 1 source) | n/a | All-rights-reserved or unverified; manual permission flow only |

### Tier 2 — Institutional secondary

Tried after Tier 1 exhaustion, before Commons. Non-agency but authoritative (museums, libraries, academic archives).

| ID | Source | License | Coverage | Endpoint |
|---|---|---|---|---|
| `smithsonian-openaccess` | Smithsonian Open Access (NASM + 18 others) | **CC0** | Apollo / Mercury / Gemini / Skylab / Shuttle / Soviet artefacts | `api.si.edu/openaccess/api/v1.0/search` (json-api) |
| `nara-rg-255` | NARA Still Picture Branch RG 255 | **PD-USGov** | **1M+ NASA/NACA photos 1903–2011, 103 series.** Mercury / Gemini / Lunar Orbiter / Apollo / Skylab / Shuttle / probes | `catalog.archives.gov` (scrape, series prefixes 255-MG / 255-AMP / 255-STS / 255-LO) |
| `usgs-astrogeology` | USGS Astrogeology / Astropedia | **PD-USGov** | Planetary mosaics: Mercury / Venus / Moon / Mars / Jupiter / Saturn / Uranus / Neptune / Pluto / small bodies | `astrogeology.usgs.gov/search` (scrape) |
| `eso-public` | European Southern Observatory | **CC BY 4.0** | astronomy / instruments (boundary case) | `eso.org/public/images/` (scrape) |
| `apollo-lunar-surface-journal` | Apollo Lunar Surface Journal | mixed (PD-NASA photos + Jones editorial copyright) | Apollo surface photos + maps + transcripts | `nasa.gov/history/alsj/` (scrape, per-asset license check) |

### Tier 3 — Wikimedia Commons (failover)

`commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6` — tried only after Tier 1 + Tier 2 exhausted. Per-image license still applies. Always note in sidecar that the file came via the Commons mirror, not the agency original.

**Why agency-first matters:**
- **Provenance integrity** — `image-provenance.json`'s `source_url` should point at the agency's canonical hosting, not a Wikimedia mirror that can be re-edited / removed
- **Resolution** — NASA / JPL masters are usually 2× the dimensions of the Commons crop
- **Captioning** — agency pages carry the authoritative caption, photographer, capture date; Commons inherits these but loses fidelity over revisions
- **Credit chain** — `NASA / JPL-Caltech / Cornell University` is the agency's own attribution; Wikimedia summarises it as "NASA" and the walker-fallback then can't reconstruct the team

**When Commons IS the right answer:**
- The agency hosts only thumbnails (some JAXA pages)
- The image is genuinely user-contributed (third-party photographs of launches)
- The agency archive is offline / permanently dark (legacy Roscosmos pages)
- All else fails — but **always note in the sidecar's `credit` field** that this is the Commons mirror, not the original

Any new fetch script **must** implement this order. The reference implementation lives in `scripts/fetch-batch-2-mission-images.mjs` (NASA images-api primary, Commons failover); copy its `resolveSources()` shape rather than starting from `fetch-zero-image-entities.mjs` (Commons-only, predates this rule).

---

## Flow — `mission_id` to rendered gallery

```
candidate URL (Wikimedia / agency API)
        │
        ▼
[fetch-assets.ts] (or a fetch-slice-*.mjs / fetch-zero-image-entities.mjs sibling)
   ├── HTTP GET
   ├── sharp().jpeg()  ← enforces JPEG mime contract (ADR-016 / GH #251)
   └── writes  static/images/missions/<id>/<NN>.jpg
        │
        ▼
[mission-image-sources.json]   ←  records {commons_file, commons_url, credit, license, fetched_at}
        │                          key shape: "<id>/<slot>" (NO extension)
        ▼
[compute-phash.ts]            ←  perceptual hash on each new file
   └── writes static/data/image-phashes.json   (URL-path keyed)
        │
        ▼
[validate-image-phash-dupes.ts] ←  cross-entity dedup gate; allowlist via phash-baseline-allowlist.json
        │
        ▼
[build-image-provenance.ts]   ←  walks sidecars + disk; queries Commons API for {author, license, revision, upload_date}
   └── writes static/data/image-provenance.json   (1300+ TASL rows; fail-closed per ADR-047)
        │
        ▼
[rebuild-gallery-manifests.ts] ←  enumerates disk per surface, writes <id, slot-count>
   └── writes static/data/mission-galleries.json + static/data/fleet-galleries.json
        │
        ▼
[validate-gallery-counts.ts]  ←  preflight gate: manifest ↔ disk parity
        │
        ▼
runtime loader (src/lib/image-gallery.ts) reads count manifest → enumerates `${base}/images/missions/<id>/<NN>.jpg`
        │
        ▼
gallery UI renders + applies credits via getGalleryAgencyLabel() ← src/lib/image-credits.ts
```

Run the whole chain with `npm run fetch` (alias for the per-step sequence). Per-step entry points are below.

---

## Scripts — what runs when

37 image-related scripts split by role. Run them in the order shown for a clean add.

### 1. Discovery + sourcing (writes sidecars + disk)

| Script | Purpose | When |
|---|---|---|
| `fetch-assets.ts` | Main entry. Queries NASA Images API → Wikimedia Commons fallback. `--missions-only=<id>` scopes. | Always |
| `fetch-zero-image-entities.mjs` | Bulk-fetch every entity with zero slots. Template for new sourcing batches. | Bulk fills |
| `fetch-slice-{a,b,c}-{mission,fleet}-images.mjs` | Historical slice batches (Mercury Seven, Apollo 7-10, etc.). Read for shape; don't copy verbatim. | Reference |
| `fetch-tier-{b,c,d,g}-images.mjs` | Per-tier batches by visibility priority. | Reference |
| `fetch-{satellite,spacecraft,right-stuff,hotspot,followup,phase3c}-images.{mjs,ts}` | Targeted sweeps for specific catalogs. | Reference |
| `agency-mission-sources.ts` | The Wikimedia-Commons category-tree resolver for agency-first sourcing per ADR-046. | Library |

### 2. Dedup + content integrity

| Script | Purpose | When |
|---|---|---|
| `compute-phash.ts` | Perceptual hashes per file, over `masters/`. `--force` to invalidate after slot rename. | After every fetch (local) |
| `validate-image-phash-dupes.ts` | Cross-entity dupe check over `masters/`; INLINE_ALLOWLIST for justified pairs. | **Local preflight only** — keys on `masters/` (git-LFS `fetchexclude`d), so it **skips on CI / any clone where masters aren't smudged** (`git lfs pull -I 'masters/**'` first). Not a CI gate (RFC-030 Q0). |
| `validate-image-dupes.ts` | Byte-level dupe check over `masters/` (SHA-256). | **Local preflight only** — same masters/-smudged requirement as above; skips on CI. |
| `snapshot-phash-baseline.ts` | Snapshots residual near-dupes to `phash-baseline-allowlist.json`. Reads INLINE_ALLOWLIST. | Manual, after dedup categorisation |
| `audit-image-mime.ts` | Verifies every disk file is JPEG (catches PNG-as-jpg bait-and-switch). | Preflight |
| `check-no-secrets-in-image.sh` | EXIF + steganography sanity check. | Pre-commit |

### 3. Provenance + credits

| Script | Purpose | When |
|---|---|---|
| `build-image-provenance.ts` | Walks every sidecar + disk fallback, queries Commons API, writes per-image TASL row. **The credits manifest.** | After every sourcing pass |
| `build-image-alt-baseline.ts` | Generates the alt-text baseline that i18n captions overlay. | After sourcing |
| `wave-credits-keys.mjs` | Generates the agency-grouped credit keys consumed by `/credits`. | After provenance |

### 4. Manifest sync (gallery loader)

| Script | Purpose | When |
|---|---|---|
| `rebuild-gallery-manifests.ts` | Enumerates disk per surface → writes `<id, slot-count>` to `mission-galleries.json` + `fleet-galleries.json`. | After every sourcing pass |
| `validate-gallery-counts.ts` | Asserts manifest ↔ disk parity. Catches silent 404s + hidden images. | Preflight |
| `audit-gallery-counts.ts` | Reports the drift table without failing. | Diagnostic |

### 5. Editorial controls

| Script | Purpose | When |
|---|---|---|
| `flag-image.ts` | Marks a slot for re-sourcing (via `image-curation.json` deny-list). | Review |
| `score-images.ts` | Generates the audit HTML for human review. | Review |
| `prune-image-slots.ts` | Removes a flagged slot + cascades manifest update. | After flagging |
| `prune-orphan-images.ts` | Removes disk files not referenced by any sidecar. | Cleanup |
| `fill-gallery-gaps.ts` | Re-fetches into pruned slots. | After pruning |

### 6. Surface hotspot + panorama imagery (`scripts/hotspots/`)

A self-contained sub-pipeline for `/earth` `/moon` `/mars` Tier-2 (zoom) + Tier-3
(panorama) + along-route detail. **Runs under Node 20** (`~/.nvm/versions/node/v20.20.2/bin/node --import tsx …`)
— `gdal-async` ships a `node-v115` ABI binding; the shell's Node 25 (ABI 141) fails
with `Cannot find module …/node-v141…/gdal.node`. Each fetcher **self-credits**
(`upsertProvenanceEntries`) — no separate provenance pass needed for these.

| Script | Purpose | Notes |
|---|---|---|
| `panorama-padder.ts` | Pads a partial-FOV strip → 4096×2048 equirectangular. | Library. Sky gradient above horizon; regolith **fading to shadow** below (`groundColourAtRow`). `srcElevationTop/BottomDeg` = isotropic vFOV `(srcH/srcW)×az`, split at the horizon. |
| `fetch-{moon,mars}-panoramas.ts` | Per-site Tier-3 `tier3-pan.jpg` from cached sources. | Sources cached in `.image-cache/hotspots/panoramas/` → re-pad is **offline**. |
| `fetch-{moon,mars}-traverse.ts` | Along-route detail patches → `<rover>.route-patches.json`. | Moon = Kaguya TC (~7-10 m/px); Mars = HiRISE. Samples the polyline, caps patch count by spacing. |
| `fetch-moon-{featured-images,kaguya-regional,ctx,regional}.ts` | Tier-2 detail/regional LROC + Kaguya crops. | See AGENTS.md §"Image pipeline — gotchas". |

**To regenerate panoramas after a `panorama-padder.ts` change:** `node20 --import tsx scripts/hotspots/fetch-moon-panoramas.ts` (+ `fetch-mars-panoramas.ts`) — offline from cache. **To populate along-route patches:** `… fetch-moon-traverse.ts --rover <id>` (omit `--rover` for all five). The skybox opens centred on yaw 0 / horizon (`enterPanorama` in `SurfaceScene.svelte`).

**Verifying provenance/attribution for a change set — do NOT full-rebuild.** `build-image-provenance.ts` re-hashes all ~9,600 images and rewrites the whole manifest; only run it after a broad sourcing pass. For a handful of changes the fetchers already upserted their entries — confirm coverage with the **read-only** `npm run validate-data` (licenses, attribution, on-disk, dupes, gallery counts; 0-write). Generated/AI art (mission trajectory thumbnails, `/posters`, anatomy webp) lives in `static/data/original-work.json`, not `image-provenance.json`.

---

## Manifests — what each file owns

| Path | Owns | Updated by |
|---|---|---|
| `static/data/mission-image-sources.json` | Per-image source intent for `missions/`. Key: `"<id>/<slot>"` (no ext). | fetch scripts |
| `static/data/fleet-image-sources.json` | Same for `fleet-galleries/`. Key: `"<id>/<slot>.jpg"` (WITH ext, legacy). | fetch scripts |
| `static/data/panel-image-sources.json` | Same for `moon-sites/` / `mars-sites/` / `earth-objects/`. Key: `"<surface>/<id>/<slot>"`. | fetch scripts |
| `static/data/image-phashes.json` | Perceptual-hash cache. URL-path keyed. **Stale after slot rename — always `--force` rebuild.** | `compute-phash.ts` |
| `static/data/phash-baseline-allowlist.json` | Residual near-dupes that aren't bugs (e.g. two-cam stereo). | `snapshot-phash-baseline.ts` |
| `static/data/image-provenance.json` | TASL row per image. `validate-data` fails closed on missing rows (ADR-047). | `build-image-provenance.ts` |
| `static/data/mission-galleries.json` | `<id, slot-count>` for `/missions` loader. **Source of "is there a gallery?"** | `rebuild-gallery-manifests.ts` |
| `static/data/fleet-galleries.json` | Same for `/fleet`. | `rebuild-gallery-manifests.ts` |
| `static/data/image-curation.json` | Deny-list of flagged slots (operator-curated). | `flag-image.ts` |
| `static/data/missions-hero-overrides.json` | Per-mission hero override (file path or external URL). | manual edit |

**The gallery-galleries.json file is the source of truth for "does this entity have a gallery tab"** — if it's missing the entry, the UI shows no gallery even when disk + sidecar are populated. (This was the cause of the 14 sourced-but-invisible missions in 2026-06-17.)

---

## Worked example — adding `opportunity` (Mars rover) end-to-end

Anchor for "how to source a never-imaged mission". The 8 historic-gap missions (opportunity, spirit, mariner9, phoenix, magellan, akatsuki, osiris-rex, dart) all follow this shape.

```bash
# 1. Source from Wikimedia Commons (agency-first per ADR-046).
#    Add an entry block to scripts/fetch-zero-image-entities.mjs or
#    write a one-off scripts/fetch-opportunity-images.mjs that follows
#    the template (search → filter → download → sharp → write).
npm run tsx scripts/fetch-opportunity-images.mjs
#    → writes static/images/missions/opportunity/01.jpg … 05.jpg
#    → updates mission-image-sources.json with 5 entries

# 2. Compute pHashes for the new files.
npx tsx scripts/compute-phash.ts --force
#    → updates static/data/image-phashes.json

# 3. Run the dedup gate; investigate any flagged pairs.
npx tsx scripts/validate-image-phash-dupes.ts
npx tsx scripts/validate-image-dupes.ts
npx tsx scripts/audit-image-mime.ts

# 4. Build the provenance manifest (queries Commons API for credits).
npx tsx scripts/build-image-provenance.ts
#    → updates static/data/image-provenance.json with 5 new TASL rows
#      MUST contain: title, author, agency, source_url, license_short,
#      license_url, license_rationale, modifications, fetched_at.

# 5. Rebuild the count manifest the gallery loader reads.
npx tsx scripts/rebuild-gallery-manifests.ts
#    → updates static/data/mission-galleries.json with "opportunity": 5

# 6. Validate everything is in lockstep.
npm run validate-data

# 7. Browser-verify.
npm run dev
#    → load http://localhost:5173/missions/opportunity, confirm 5-slot
#    gallery, confirm credits read "NASA / JPL-Caltech / MSSS" (or
#    whatever the actual upload metadata says — NEVER hand-write it).

# 8. Commit + push.
```

If any step fails, **diagnose, don't bypass.** Every gate exists because a real bug shipped without it.

---

## Provenance — the credit chain

Per ADR-047, every disk image must have a TASL row in `image-provenance.json`:

```jsonc
{
  "id": "opportunity/01",
  "path": "/images/missions/opportunity/01.jpg",
  "source_type": "wikimedia-commons",
  "title": "NASA Mars Exploration Rover Opportunity panorama at Endurance Crater",
  "author": "NASA / JPL-Caltech / Cornell University",
  "agency": "NASA",
  "source_url": "https://commons.wikimedia.org/wiki/File:Endurance_Crater_panorama.jpg",
  "image_url": "https://upload.wikimedia.org/wikipedia/commons/...",
  "license_short": "PD-NASA",
  "license_url": "https://www.nasa.gov/multimedia/guidelines/index.html",
  "license_rationale": "NASA-produced imagery; public domain.",
  "modifications": ["resized to 1280x720", "sharp.jpeg(quality:85)"],
  "fetched_at": "2026-06-17T..."
}
```

`build-image-provenance.ts` does the Commons API lookup — do NOT hand-write `author` or `license_short`. The UI's `/credits` page groups by `source_type` → `agency` → image, so any drift between sidecar and provenance shows up immediately.

**Credits rendering** lives in `src/lib/image-credits.ts: getGalleryAgencyLabel()` (normalises `Roscosmos` ↔ `ROSCOSMOS` per the walker-fallback gotcha) and `src/routes/credits/+page.svelte`.

---

## Validation gates

`npm run validate-data` runs (in order):

1. `validate-image-dupes.ts` — byte-level
2. `validate-image-phash-dupes.ts` — perceptual
3. `audit-image-mime.ts` — JPEG contract
4. `validate-gallery-counts.ts` — manifest ↔ disk parity
5. Provenance completeness (every disk file must have a TASL row; fail-closed per ADR-047)
6. License allowlist + waivers
7. v2 vision manifest schema (sidecars conform to the surface schema)
8. **Surface-hotspot Tier-2 consumed variants resolve on disk** — for every `surface-hotspots.json` `hotspot_tier2_source` + `hotspot_tier2_regional_source`, the file the /moon + /mars deep-zoom patch actually loads (`image-vision` `variants['1x1']`, else the raw base) must exist. Catches the half-baked-tile trap below.

`npm run preflight` chains this into the pre-push hook. **Trust the exit code, not the prose** — the prettier filter can rewrite output and the test stays accurate.

### ⚠️ Re-fetching a hotspot base = regenerate its variants (mandatory)

The hotspot fetch scripts (`fetch-moon-featured-images.ts`, `fetch-moon-kaguya-regional.ts`, `fetch-mars-*.ts`) write **only** the 2048² base `tier2-*.jpg`. They do **not** produce the `.1x1/.4x3/.16x9` variants — and the /moon + /mars surface scene consumes `variants['1x1']`. So a re-fetched/re-pointed base whose variants weren't rebuilt leaves the manifest pointing at a stale or missing `*.1x1.jpg` → 404 → **empty tile at deepest zoom**. After ANY hotspot base change, run:

```bash
node scripts/hotspots/regenerate-tier3-variants.mjs static/images/hotspots/<body>/<site>/tier2-lroc.jpg [...more bases]
```

(`tier3` name is historical — it regenerates the `.1x1` variant, the only ratio we generate since 2026-06-26, for any base via the same `generateVariants()`; no vision-API cost, no manifest rewrite.) Gate #8 above fails preflight if you forget. This bit us 2026-06-26 on change3/4 + luna16/17/21/24 after the clean-frame swap.

> **Variant policy (2026-06-26):** `1x1` is the only generated ratio. `4x3` (card) + `16x9` (hero) were retired — no UI ever consumed them (`pickVariant` callers all pass `'thumbnail'`). `VARIANT_RATIOS` in `vision/crop-variants.ts` is the single lever (`[1x1]`); `pickVariant` returns `undefined` for non-thumbnail surfaces → caller uses the raw source path. 494 dead `static/images` files + ~1k `image-vision.json` refs removed. `/textures/*.{4x3,16x9}.jpg` are a SEPARATE pipeline (still consumed on `/credits`) — untouched.

---

## ADR cross-references

The pipeline's design decisions are locked in these ADRs. Read the relevant one before changing the corresponding stage.

| Stage | ADR | What it locks |
|---|---|---|
| Build-time sourcing (no runtime fetches) | [ADR-016](../docs/adr/ADR-016.md) | All external assets resolved at build time |
| Agency-first source preference | [ADR-046](../docs/adr/ADR-046.md) | Agency catalogs before Commons; per-entity overrides |
| Provenance manifest + license stewardship | [ADR-047](../docs/adr/ADR-047.md) | TASL completeness; fail-closed gate |
| Outbound link stewardship | [ADR-051](../docs/adr/ADR-051.md) | External link provenance (sibling concept) |
| Fleet imagery taxonomy | [ADR-053](../docs/adr/ADR-053.md) | hero / anatomy SVG / mission patch / crew portrait layering |
| Per-mission overlay completeness | [ADR-069](../docs/adr/ADR-069.md) | validate-data gate + AGENTS.md rule |
| Pipeline-runner infra | [ADR-064](../docs/adr/ADR-064.md) | The `tsx`-entrypoint Docker image (deployment, not content) |

---

## Five gotchas (cross-link to AGENTS.md)

The full prose lives in [AGENTS.md §"Image pipeline — gotchas"](../AGENTS.md#image-pipeline--gotchas). Headlines only:

1. **Sidecar surface routing** — each surface owns one sidecar; wrong routing → duplicate manifest entries.
2. **Cache-staleness after slot rename** — always `compute-phash.ts --force` between delete + fill.
3. **Walker-fallback agency lookup** — non-NASA entities falling through to NASA default → wrong credits.
4. **pHash baseline snapshotting** — read INLINE_ALLOWLIST or re-bloat the JSON.
5. **Gallery count drift** — manifest > disk = 404s; manifest < disk = hidden images. `validate-gallery-counts` catches it.

---

*Orrery · `scripts/IMAGE-PIPELINE.md` · 2026-06-17 — pair with AGENTS.md §"Image pipeline — gotchas" + ADR-016/046/047/053/069*
