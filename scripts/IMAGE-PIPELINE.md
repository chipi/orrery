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

The resolver tries sources in this order, stopping at the first hit:

| Order | Source | When | API |
|---|---|---|---|
| 1 | **NASA Image and Video Library** (`images-api.nasa.gov`) | NASA missions, NASA-co-managed missions (DART, OSIRIS-REx, MER, Phoenix, Magellan, Mariner 9, Hubble crops) | `GET https://images-api.nasa.gov/search?q=<query>&media_type=image` |
| 2 | **NASA JPL Photojournal** (`photojournal.jpl.nasa.gov`) | JPL-led missions (Mars rovers, Voyager, Cassini, Galileo, Magellan, MRO HiRISE) — higher-res masters | scrape mission page `targetFamily=Mars&target=...&mission=...` |
| 3 | **JAXA Digital Archive** / **DARTS** | JAXA missions (Akatsuki, Hayabusa, Hayabusa2, SLIM, IKAROS) | scrape mission page (no public API) |
| 4 | **ESA Multimedia** (`esa.int/ESA_Multimedia`) / **esahubble.org** | ESA missions (Solar Orbiter, JUICE, BepiColombo, Mars Express, Rosetta, Hubble joint) | scrape set page |
| 5 | **JHU APL** (`dart.jhuapl.edu`, `parker-solar-probe.jhuapl.edu`) | APL-led missions (DART, Parker, New Horizons, Dragonfly) | scrape gallery page |
| 6 | **CNSA / Roscosmos / ISRO / SpaceIL** mission pages | per-mission, language-specific | manual / scrape |
| 7 | **Wikimedia Commons** (`commons.wikimedia.org/w/api.php`) | **failover only** when 1–6 miss or yield nothing usable | `action=query&list=search&srnamespace=6` |

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
| `compute-phash.ts` | Perceptual hashes per file. `--force` to invalidate after slot rename. | After every fetch |
| `validate-image-phash-dupes.ts` | Cross-entity dupe check; INLINE_ALLOWLIST for justified pairs. | Preflight |
| `validate-image-dupes.ts` | Byte-level dupe check (exact md5 collisions). | Preflight |
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

`npm run preflight` chains this into the pre-push hook. **Trust the exit code, not the prose** — the prettier filter can rewrite output and the test stays accurate.

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
