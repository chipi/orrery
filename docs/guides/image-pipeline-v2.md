# Image Pipeline v2 — vision scoring + smart cropping + curation loop

`scripts/score-images.ts` + `scripts/crop-variants.ts` + `scripts/build-image-vision-manifest.ts` + `scripts/flag-image.ts` are the v2 layer on top of the existing image pipeline (`scripts/fetch-assets.ts`, ADR-016 / ADR-046 / ADR-047). v2 is **purely additive** — the existing 1345-entry `image-provenance.json` (ADR-047 fail-closed gate) stays untouched.

This guide is the recipe for using v2 day-to-day: when to run scoring, which scope flag to pick, how to read the audit report, how to flag bad picks back into the curation loop.

For the architectural decisions behind v2 (manifest model, vision provider abstraction, smart-crop variants, cost ledger, deny-list mechanic), see **[PRD-018](../prd/PRD-018.md)** + **[RFC-022](../rfc/RFC-022.md)**.

---

## Prerequisite: `ANTHROPIC_API_KEY` (one-time setup)

v2 calls the Anthropic Vision API directly (Claude Sonnet 4.6). **Anthropic recently announced that API calls are NOT covered by Claude Code subscriptions** — v2 needs its own paid API key.

**Local setup** (one-time, on Marko's machine):

1. Get an API key at <https://console.anthropic.com/settings/keys>.
2. **Preferred — `.env` in the repo root** (gitignored, auto-loaded by every script that needs secrets via Node ≥ 20.6's `process.loadEnvFile`):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   `.env.example` at the repo root documents every supported key. Copy it to `.env` and fill in.
3. Or, equivalently, export in `~/.zshrc`:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```
4. Verify: `node -e 'console.log(process.env.ANTHROPIC_API_KEY?.slice(0,10))'` should print the key prefix.

The ambient shell environment wins where both are set — `.env` only fills holes. This avoids the surprise where `~/.zshrc` exports it but a fresh non-login shell (e.g. agent subshells, container shells) doesn't see it. With `.env` present, every TS script that calls `process.loadEnvFile('.env')` at boot picks the key up consistently.

**GitHub Actions setup** (one-time, for CI builds that need to re-score):

1. Go to <https://github.com/chipi/orrery/settings/secrets/actions>.
2. Add a new repository secret: `ANTHROPIC_API_KEY` = `sk-ant-...`.
3. The audio-pipeline workflow (PRD-016 / RFC-019) already uses an `ANTHROPIC_API_KEY` secret for translations — same key works for both pipelines (Anthropic billing is per-account, not per-product).

**Without the key:** v2 scoring fails with HTTP 401. The build does NOT fail closed (per RFC-022 §10) — the pipeline logs the auth error, marks affected images as `failed: true` in the cache, and continues. Frontend reads what the manifest already has from previous successful runs.

**Cost reminder:** v2 uses paid API calls. Whole-corpus first build = ~$67. Routine iteration = $0.50–$5/mission. The cost ledger (`static/data/image-vision-cost-ledger.json`) tracks every call; the soft warn is $50/build, hard halt $200/build (matches PRD-016 audio policy).

---

## Mime/extension contract — bytes on disk match the extension (GH #251)

**Rule:** every byte that lands at a `.jpg` or `.jpeg` path passes through `sharp(buf).jpeg({ quality: 85, mozjpeg: true }).toBuffer()` first. No exceptions.

**Why:** the original v0.6 fetcher pasted source URL bodies verbatim — and Wikimedia `?format=jpg` URLs routinely return PNG bytes. Browsers + `sharp` sniff and render either way, so the mismatch was invisible until Anthropic's vision API (which strict-checks declared mime) rejected 110 fleet-gallery files with `image/jpeg vs image/png`.

**Enforced by:**
- `scripts/lib/image-bytes.ts` — shared `coerceToJpeg(buf)` helper; every fetcher uses it.
- `scripts/fetch-assets.ts` — `writeImageBytes(dest, buf)` wraps `writeFile` with a dest-extension check; all gallery-image writes route through it.
- All `scripts/hotspots/fetch-*.ts` panorama + patch fetchers — already produce JPEG bytes via `panorama-padder.ts` / `gdal-crop.ts` (sharp-based), unaffected.
- `scripts/audit-image-mime.ts` — CLI audit (`--repair` to fix in place).
- `scripts/validate-data.ts` — wired into `npm run preflight`; CI blocks PRs that ship mime-mismatched `.jpg` files.

**Operator commands:**
```bash
# CI-friendly audit (exits non-zero on any mismatch)
npx tsx scripts/audit-image-mime.ts

# Fix in place — runs every flagged file through sharp.jpeg()
npx tsx scripts/audit-image-mime.ts --repair
```

If you write a new fetcher: import `coerceToJpeg` from `scripts/lib/image-bytes.ts` and run every JPEG-bound write through it. Skip this and the preflight gate catches you on push.

---

## What v2 produces

After a successful pipeline run, three new artefacts exist:

```
static/data/image-vision.json              ← machine-generated, committed
static/data/image-curation.json            ← human-edited, committed
static/audit-report.html                   ← gitignored, dev-only (built by scripts/build-audit-report.ts)
static/data/cost-ledger.json               ← committed (audit trail of API spend)
.image-cache/                              ← gitignored (per-image hash-keyed scoring + variant cache)
static/images/<path>/<base>.1x1.jpg        ← machine-generated, committed
static/images/<path>/<base>.4x3.jpg        ← machine-generated, committed
static/images/<path>/<base>.16x9.jpg       ← machine-generated, committed
```

The original source images stay where they were. The `.1x1` / `.4x3` / `.16x9` variants are NEW siblings.

---

## When to run

You **must** run v2 scoring when any of these change:

- A new image is added to `image-provenance.json` (run `--mission <id>` or the smallest matching scope).
- A `gallery_query` field changes for a mission (run `--mission <id> --force-score`).
- The scoring prompt rubric in `scripts/vision/prompt.ts` changes (run `--all --force-score` — full rebuild ~$67).
- The vision model is swapped (run `--all --force-score`).
- `image-curation.json` deny-list grows or changes (next run automatically picks up; no flag needed — the cache invalidates for affected images).
- `sharp` dependency upgrades (run `--all --skip-scoring` — re-crops everything; cheap, only sharp time).

You **should** run v2 scoring weekly on ACTIVE missions whose imagery the agencies update (`--mission perseverance`, `--mission curiosity` — picks up newly published NASA imagery within ~$2).

You **should not** run `--all` casually — it costs ~$67 cold and is rarely needed once the cache is warm.

---

## Default behaviour: incremental (`--new-only` implicit)

Running with NO flags is the routine workflow. It processes only:
- New entries in `image-provenance.json` (added since the last run).
- Entries whose source images changed (file bytes differ).
- Entries whose cache was invalidated by a prompt-version bump, model swap, or `image-curation.json` deny-list update.

If nothing changed, the run completes in ~30 seconds and costs $0.

```bash
npm run images:score                    # incremental, default. $0–$5 typical.
npm run images:score -- --new-only      # explicit form, same behaviour.
```

This is the command you'll run 95 % of the time after `fetch-assets.ts` lands new images. Don't reach for `--all` unless you've explicitly bumped the scoring prompt or the vision model — that's the only time the whole corpus needs reprocessing.

## Architectural guarantee — never reprocess unchanged entries

Cache invalidation triggers are explicit and finite. A run will re-score / re-crop an entry ONLY when:

1. The source image bytes changed.
2. `scripts/vision/prompt.ts` `SCORING_PROMPT_VERSION` constant bumped.
3. The vision model config string changed.
4. The entry was added to `image-curation.json` (or one of its ~5 nearest neighbours in the prompt context window changed).
5. (Variants only) `sharp` major version upgraded.

Time-based triggers (e.g. "re-score everything monthly") do NOT exist. If you ran the pipeline yesterday and nothing in the above list changed, today's run is free. Only `--all --force-score` bypasses the cache; that's an explicit operator gesture, not an accident.

## Picking a narrower scope (when default isn't enough)

For the rare cases where you want to constrain MORE than incremental default does:

| Scope | Cost (cold; cached = $0) | When to use |
|---|---|---|
| Default (no flags) | $0–$5 typical | **Routine** — covers 95 % of runs. |
| `--changed-since <git-ref>` | $0.25–$1 typical | CI on a PR — process only what the PR diff touched. |
| `--mission <id>` | ~$0.75 | Iterating on one mission's imagery, want to force a re-look even when nothing changed. |
| `--agency <name>` | ~$3–$30 | After fetching new imagery from one agency's portal in bulk and want to re-score them all (not just the new ones). |
| `--source <name>` | ~$5–$40 | When a source's API output structure changes and you need to re-score everything that came from it. |
| `--fleet-asset <type>` | ~$3–$22 | When you've added a batch of patches / portraits / heroes / galleries. |
| `--segment <name>` | ~$5–$22 | When you've reorganised an entire segment of the corpus. |
| `--all` | ~$67 | First build, or after a prompt-rubric / model change. Explicit opt-in. |

Examples:

```bash
# Routine — just added some new images via fetch-assets
npm run images:score                                # incremental, default

# CI workflow — process only what this PR changed
npm run images:score -- --changed-since main

# Just changed the gallery_query on Curiosity — force re-look even though source bytes are same
npm run images:score -- --mission curiosity --force-score

# Fetched 80 new ESA mission images this morning (the new ones already auto-detected; only run this if you ALSO want to re-score the existing ESA images)
npm run images:score -- --agency ESA --force-score

# Bumped the prompt rubric (changed scoring criteria)
npm run images:score -- --all --force-score        # ~$67, ~25 min
```

Combinations are AND-joined: `--agency NASA --fleet-asset patches` scores NASA mission patches only. `--agency NASA --new-only` processes new NASA images only (skip any NASA images already in the manifest).

---

## Skip-scoring + force-score flags

- `--force-score` invalidates the scoring cache for the matched scope. Use after a prompt change. **Costs API calls.**
- `--skip-scoring` runs ONLY the variant-cropping path on existing scores. Use after a `sharp` upgrade or when only the crop logic changed. **Free.**
- `--skip-crops` runs ONLY the scoring path; doesn't regenerate variant files. Use when you want to refresh scores without touching disk.

---

## The audit report — every iteration loop's home base

After a scoring run:

```bash
open static/data/audit-report.html
```

You'll see one section per scored image, each with:

- Thumbnail (192 px square)
- Score (1–10)
- Category (one of nine: `spacecraft`, `surface`, `launch`, `orbital`, `hardware`, `people`, `diagram`, `render`, `other`)
- Subject (one-sentence description from the model)
- Focal-point crosshair overlaid on the thumbnail
- Selection status (selected as hero, selected as gallery slot N, rejected with reason, fallback used)
- Per-image cost ($)
- 🚩 Flag button

Read it carefully — this is where you spot the bad picks.

---

## Flagging a bad image — the curation loop

When you see a bad pick in the audit report:

1. Click the 🚩 **Flag this image** button.
2. A small modal appears, pre-filled with the image path.
3. Type a one-sentence reason: "subject is occluded by hardware caption", "wrong rover", "looks like a render", "press conference photo".
4. Click **Submit**. The modal copies a JSON payload to your clipboard.
5. Run the helper:
   ```bash
   pbpaste | node scripts/flag-image.ts
   ```
   This appends to `static/data/image-curation.json`.
6. Commit the deny-list change:
   ```bash
   git add static/data/image-curation.json
   git commit -m "curate: flag <image-path> — <reason>"
   ```
7. Next time you run scoring (e.g. `--mission curiosity`), the flagged image is automatically scored as `score: 0, rejected_by: "human"`. The model also sees your most recent ~5 deny-list entries as in-context bias examples ("avoid this kind of result") so its future picks improve over time.

The deny-list is permanent. Old entries rotate out of the prompt-context window after 100 entries but stay in the deny-list.

---

## Cost ledger — watch the spend

`static/data/cost-ledger.json` records every scoring run that actually called the provider (cache-only runs are skipped to keep noise down). One row per CLI invocation:

```jsonc
{
  "version": "1.0",
  "thresholds": { "soft_usd": 50, "hard_usd": 200 },
  "entries": [
    {
      "ts": "2026-05-24T18:00Z",
      "scope": "all",
      "images_processed": 1414,
      "images_cached": 601,
      "cost_usd": 6.23,
      "provider": "anthropic",
      "model": "claude-sonnet-4-6"
    }
  ]
}
```

Per-image cost detail lives in the `scoring_cost_usd` field on each `image-vision.json` entry (same source of truth). `src/lib/cost-ledger.ts` exposes `loadLedger()`, `appendLedgerEntry()`, `totalSpend()`, `rollingSpend()` (30-day window), and `checkThresholds(ledger, forecastUsd)` for pre-flight cost checks before spending.

Threshold policy (rolling 30-day spend, matches PRD-016 audio):
- **$50 soft warn** — pipeline continues, prints `⚠` banner at run end.
- **$200 hard halt** — `checkThresholds()` returns status `'hard'` and callers should refuse to spend without operator override.

---

## Frontend integration

Components import the manifest at build time:

```typescript
import { getImage } from '$lib/image-vision';
const img = getImage('static/images/missions/curiosity-hero.jpg');
// img.variant_16x9 → URL of the 16:9 pre-cropped variant for the desktop hero
// img.variant_4x3  → 4:3 for gallery cards
// img.variant_1x1  → 1:1 for mobile thumbnails / fleet-gallery rows
// img.focal_point  → { x, y } for CSS object-position
// img.subject      → alt text
// img.license, img.credit → from image-provenance.json (ADR-047 join)
```

CSS pattern:

```css
.hero-image {
  object-fit: cover;
  object-position: var(--focal-x) var(--focal-y);
}
```

```svelte
<img
  src={img.variant_16x9}
  alt={img.subject}
  style="--focal-x: {img.focal_point.x * 100}%; --focal-y: {img.focal_point.y * 100}%"
/>
```

### Mobile (Capacitor wrapper) picks 1:1 variants

The `MOBILE=1` build environment (RFC-018 §4) reroutes fleet-gallery components to use `variant_1x1` instead of source. Net: ~30 MB shaved off the fleet-gallery bucket on the Capacitor install.

---

## Fitting v2 with the existing pipeline

| Layer | What it does | Owner |
|---|---|---|
| `scripts/fetch-assets.ts` | Fetches candidate images from NASA / Wikimedia / agency portals; writes to `static/images/<path>` | ADR-016 + ADR-046 |
| `static/data/image-provenance.json` | Per-image license, credit, source, last-verified date (1345 entries today) | ADR-047 (fail-closed gate in `validate-data.ts`) |
| `scripts/score-images.ts` (v2) | Scores fetched images via Anthropic Vision API; writes per-image cache | RFC-022 |
| `scripts/crop-variants.ts` (v2) | Generates 1:1 + 4:3 + 16:9 variants via `sharp`, anchored on the model's focal point | RFC-022 |
| `scripts/build-image-vision-manifest.ts` (v2) | Merges per-image cache files → `static/data/image-vision.json`; renders `audit-report.html` | RFC-022 |
| `scripts/flag-image.ts` (v2) | Appends to `static/data/image-curation.json` from a clipboard payload | RFC-022 |
| `validate-data.ts` | Fail-closed image-provenance check (existing) + NEW optional v2 manifest schema check | ADR-047 + RFC-022 §9 |

v2 reads from ADR-047's manifest by image-path key but **never writes to it**. Backing out v2 = `rm -rf static/data/image-vision.json static/data/image-curation.json static/images/**/*.{1x1,4x3,16x9}.jpg .image-cache/ scripts/score-images.ts scripts/crop-variants.ts scripts/build-image-vision-manifest.ts scripts/flag-image.ts`. The existing image pipeline keeps working unchanged.

---

## Common workflows

**"Fetched a new mission's imagery and want to publish it":**
```bash
npm run fetch-assets -- --mission new-mission                   # existing pipeline
npm run images:score -- --mission new-mission                   # ~$0.75
open static/data/audit-report.html                              # review picks
# (flag any bad ones via the audit report's 🚩 button)
git add static/{images,data}                                    # commit imagery + manifest
```

**"Want to re-score a single bad mission after flagging things":**
```bash
# (after a few flags in image-curation.json)
npm run images:score -- --mission problem-mission --force-score # ~$0.75
open static/data/audit-report.html                              # verify the new picks are better
git add static/data/{image-vision.json,image-curation.json,image-vision-cost-ledger.json}
```

**"Sharp dependency upgraded — re-crop everything but don't re-score":**
```bash
npm run images:score -- --all --skip-scoring                    # free, ~10 min wall clock
git add static/images                                           # commit re-cropped variants
```

**"Prompt rubric changed — full rebuild":**
```bash
npm run images:score -- --all --force-score                     # ~$67, ~25 min
open static/data/audit-report.html                              # spot-check
git add static/{images,data}
```

---

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `validate-data` reports "manifest references missing variant file" | Source image deleted but manifest still references it | Re-run scoring on the affected scope to regenerate the entry |
| Audit report shows "fallback: true" on every entry for a mission | All candidates scored below threshold | Adjust the mission's `gallery_query` (broader keywords) and re-run with `--force-score` |
| Hard cost-halt at $200 | Runaway `--all --force-score` hit the cap | Investigate why the cache didn't hit; usually a model-version mismatch invalidated everything |
| `sharp` OOM on `--all` | Memory budget on weak machines | Run scope-by-scope (`--agency NASA` then `--agency ESA` etc.) |
| "Anthropic API outage during scoring" log line | Transient | Pipeline retries 3× then skips that image; re-run later, cache picks up where it left off |

---

## Surface Hotspots Tier 2 patches — auto-fetch (v0.7.x)

For the v0.7 Surface Hotspots epic (#108 / PRD-014), Mars hotspots
fetch their HiRISE Tier 2 patches automatically via
`scripts/fetch-hotspot-imagery.ts`. The pipeline is serial,
fail-fast, and polite to the UAHiRISE PDS server.

> **Mars-specific deep-dive:** the operator playbook (when to pin vs
> auto-pick, HiRISE product-ID naming convention, UInt16→UInt8
> stretch, Polar_Stereographic guard, validation runbook, failure-
> mode matrix) lives in [mars-hotspot-imagery.md](./mars-hotspot-imagery.md).
> Read that one when you're debugging a specific Mars site or
> changing `gdal-crop.ts`. **This section stays the cross-platform
> overview** (also relevant to Moon Tier B once that lands).

```bash
# Fetch all configured Mars hotspots + variant generation.
npm run images:hotspots

# Same, but skip sites whose patch is already on disk
# (incremental retry against only the unresolved subset).
npm run images:hotspots -- --missing-only

# Single site — bypasses --missing-only, force-rebuilds the patch.
npm run images:hotspots -- --site curiosity

# Inventory without fetching.
npm run images:hotspots -- --list
npm run images:hotspots -- --dry-run

# Skip the post-fetch Image Pipeline v2 scoring step.
npm run images:hotspots -- --skip-score
```

### How it works (pipeline per site)

```
[1] Catalog (one-time, cached 164 MB)
    Download UAHiRISE's RDRCUMINDEX.TAB — every HiRISE image ever
    taken (~120k rows). Cached at .image-cache/hirise/.
    Schema lives in RDRCUMINDEX.LBL — we parse fixed-width offsets
    for: PRODUCT_ID, IMAGE_LINES, LINE_SAMPLES, INCIDENCE_ANGLE,
    SUB_SPACECRAFT_LAT/LON, MAP_SCALE, START_TIME, plus
    CORNER1-4_LATITUDE/LONGITUDE (the projected image bbox).

[2] Find candidates that *might* contain the site
    Coarse pre-filter: SUB_SPACECRAFT track within 100 km of site
    (cheap distance check on ~120k rows). Then exact:
    point-in-polygon (PIP) against the 4 corner coords. Typically
    10-50 candidates per site survive.

[3] Rank candidates (lower compositeScore = better)
    - MAP_SCALE (m/px, primary)        — smaller = sharper.
    - |INCIDENCE_ANGLE - 50°|          — ~50° gives the best shadows.
    - distance from polygon centroid   — target closer to image
      centre is more likely to actually have data (catalog corners
      describe the projected raster bbox, not the actual image
      footprint; frames whose target lands near the polygon edge
      often have huge no-data padding there).

[4] Try candidates top-down (up to MAX_CANDIDATES_PER_SITE = 15)
    a. Build deterministic PDS URL from product ID.
    b. Download JP2 (~500 MB-1.5 GB) to .image-cache/hotspots/raw/
       (sha256-of-URL keyed; cache-hit on re-runs).
       Download has 3 retries with exponential backoff (1s/2s/4s)
       — HiRISE PDS streams terminate mid-flight ~30-50% of the
       time on large transfers. Partial .tmp files are cleaned
       between attempts.
    c. Open with gdal-async. Project (target lat,lon) → projected
       coords → pixel coords via CoordinateTransformation (handles
       equirectangular + polar stereographic SRS), then apply the
       Mars-Equirectangular projection correction (see lesson #2
       below). Without the correction, sites in rasters with
       `latitude_of_origin ≠ 0` sample 300+ km away from the actual
       target — and look identical to a real "no-data at target"
       failure.
    d. FAIL-FAST: read a 32×32 pixel sample at the target. If
       ≥95% of pixels are no-data (encoded as zero), throw
       CropError('NO_DATA_AT_TARGET'). Catches the case where the
       corner polygon contains the target but the actual image data
       doesn't reach it — cheaper than committing to the full crop.
    e. Extract 2048×2048 window centred on target. Post-crop
       sanity: if ≥80% black, throw CropError('CROP_MOSTLY_BLACK')
       (sliver-edge case the 32×32 sample missed).
    f. JPEG q=88 to static/images/hotspots/mars/<site>/tier2-hirise.jpg.
    On CropError (any code), fall through to next candidate. If all
    candidates exhaust, the site is reported as failed.

[5] Append provenance
    image-provenance.json gets an entry per successful patch:
    PD-NASA license, NASA/JPL-Caltech/UAHiRISE attribution,
    source_url = the exact JP2 the patch was cropped from. The
    fail-closed gate accepts the new files cleanly.

[6] Polite pause (90 s) before the next site
    UAHiRISE doesn't publish rate limits but a hammering script is
    exactly what an ops team will throttle preemptively. The pause
    only fires after sites that actually touched the network
    (purely-cached resolves don't pause) and not after the last site.

[7] (Optional, --skip-score off) Image Pipeline v2 variant pass
    Re-runs images:score --segment hotspots over the new patches
    to generate 1:1 / 4:3 / 16:9 variants + image-vision.json scores.
```

### Operator override (the editorial knob)

Auto-pick is best-effort. For sites where the algorithm picks the
wrong frame (poor lighting, dust storm, sliver-edge that the 80%
post-crop check let through, or just an editorially worse image than
a known better one), pin a specific HiRISE product ID:

```json
"curiosity": {
  ...
  "hotspot_tier2_force_product_id": "ESP_030313_1755"
}
```

The orchestrator builds the URL deterministically and skips the
catalog query entirely. Override frames also benefit from the
fail-fast + retry + provenance machinery — they're just freed from
ranking. Use this when you know the right product ID from external
sources (UAHiRISE "Image of the Week", landing-site press releases,
direct researcher recommendation).

### Hard-won lesson #1 — PIP corners describe the bbox, not the data footprint

The first cut filtered by SUB_SPACECRAFT distance only and produced
8 of 9 patches as 16 KB all-black no-data crops. The second cut
added corner-polygon PIP and properly skipped frames whose bbox
didn't contain the target — but still produced 3 of 6 broken patches
because **the corner coords in `RDRCUMINDEX.TAB` describe the
projected raster bounding box, NOT the actual image footprint**. A
6 km × 15 km HiRISE swath rotated ~10° spacecraft-skew sits inside
a wider rectangular bbox with no-data padding everywhere else. PIP
says "target inside bbox"; the actual data may be nowhere near it.

The fail-fast 32×32 pixel sample (step 4d) is the only honest test.
It costs the full JP2 download per candidate but rejects in
milliseconds once data is local. Combined with the centroid-distance
penalty in ranking (step 3) the algorithm finds a usable frame in
1-2 candidates per site for sites that have one — and correctly
gives up on sites where no candidate's image data reaches the target.

### Hard-won lesson #2 — GDAL inverts the HiRISE Equirectangular convention

Most HiRISE RDRs project lat/lon to projected metres with this
convention:

```
x_hirise = R × cos(lat_origin_rad) × (lon - central_meridian)_rad
y_hirise = R × lat_rad                                  (NO lat_origin shift)
```

GDAL's `CoordinateTransformation` does the opposite:

```
x_gdal   = R × (lon - central_meridian)_rad             (NO cos scaling)
y_gdal   = R × (lat - lat_origin)_rad                   (WITH shift)
```

The raster's `geo_transform` was authored in the HiRISE convention.
GDAL transforms (lat,lon) → (x_gdal, y_gdal) in its own convention.
The two disagree by:

- X: factor of `cos(lat_origin)` — wrong by 0% at lat_origin=0,
  ~3% at lat_origin=15° (~300 km horizontal at the Mars equator),
  more at higher latitudes
- Y: offset of `R × lat_origin_rad` — 0 m at lat_origin=0,
  ~2660 km at lat_origin=45°

For rasters with `latitude_of_origin = 0` (Plate Carrée) both
corrections are no-ops and GDAL produces correct pixel coords. For
rasters with `lat_origin ≠ 0` (most HiRISE products outside
~±5° of the equator), GDAL's pixel coord is silently wrong — often
hundreds of km from the target — and the 32×32 sample reads
no-data padding even though the lander is well inside the image.

The fix lives in `scripts/hotspots/gdal-crop.ts:correctHiriseProjection()`.
It parses `latitude_of_origin` and the SPHEROID radius from the WKT
and applies:

```
x_corrected = x_gdal × cos(lat_origin_rad)
y_corrected = y_gdal + R × lat_origin_rad
```

For lat_origin=0 the correction is a no-op (passes through). For
non-zero values it recovers the correct projection that matches the
raster's geo_transform.

The bug masquerades perfectly as "no-data at target" — same
NO_DATA_AT_TARGET error, same 100% no-data sample, indistinguishable
from a frame whose data genuinely doesn't reach the lander. Mars
Pathfinder ate 2-3 days of failed runs before this was caught with a
direct GDAL → pixel diagnostic on a cached JP2.

### Hard-won lesson #3 — the correction is Equirectangular-ONLY (2026-05-21)

`correctHiriseProjection()` is specific to the Equirectangular GDAL-
vs-HiRISE convention mismatch above. Other projections — notably
**Polar_Stereographic**, used by HiRISE products at sites poleward of
±60° (Phoenix at 68°N, future Chandrayaan-3 at 69°S, future south-
pole Artemis sites) — do NOT need the correction. GDAL's
`transformPoint` already handles them correctly.

Pre-2026-05-21 the function applied unconditionally. For a Polar
Stereographic raster with `latitude_of_origin = 90°`:

```
x_corrected = x_gdal × cos(90°)            = 0           # 💥
y_corrected = y_gdal + R × π/2             = +5.3M m off # 💥
```

→ pixel coordinates wildly out of bounds → `assertTargetHasData`
silently clamps to row 0 → reads the pole nodata cap → 100% rejection
on every candidate → site permanently broken.

**The fix** is a projection-name guard at the head of the function:

```ts
const projMatch = wkt.match(/PROJECTION\["([^"]+)"\]/);
if (projMatch?.[1] !== 'Equirectangular') return { xCorr: projX, yCorr: projY };
```

Polar_Stereographic, Stereographic, sinusoidal, etc. — all pass
through unmodified.

### Hard-won lesson #4 — HiRISE bands are UInt16; UInt8 reinterpretation = mottled noise (2026-05-21)

HiRISE RED.JP2 source files are **UInt16** (10-12 effective bits of
dynamic range packed into 16-bit storage). The crop output is
**UInt8** JPEG. The naïve

```ts
const data = await band.pixels.readAsync(...);          // returns Uint16Array
new Uint8Array(data.buffer);                            // reinterprets — does NOT scale
```

reinterprets each 16-bit pixel's TWO BYTES as TWO 8-bit pixels —
alternating each pixel's low byte (small, often < 5) with its high
byte (the real signal). For bright Mars surface (16-bit values
~60000), this rendered as a mottled mid-gray noise pattern that
**fooled the eye + the variance-only fail-fast for months**. For
dim polar terrain (Phoenix), the low byte accidentally contained the
meaningful signal, so it looked vaguely-OK by accident.

**Symptom check**: any output that looks like uniform mottled gray
with no recognisable craters / dunes / fractures is this bug. Trust
the EYE, not stddev — pixel statistics pass while the image is
visually broken.

**The fix** is `stretchToUint8()` — P2/P98 percentile linear stretch
(robust to hot pixels), applied to BOTH the pre-crop sampler AND the
main crop loop. UInt8 inputs (LROC byte products) bypass the stretch.

Audited 2026-05-21: 4/13 Mars sites had been shipping noise for
months (Curiosity, Pathfinder, Viking 1, Viking 2 — all sites where
the terrain happens to be bright). The 9 "valid" sites looked OK by
the same low-byte coincidence and got dramatically sharper after the
stretch fix.

See [mars-hotspot-imagery.md → Audit story](./mars-hotspot-imagery.md#audit-story)
for the diagnostic walk-through and
[GitHub issue #248](https://github.com/chipi/orrery/issues/248) for
the full retrospective.

### Cost + bandwidth (realistic — auto-pick can iterate)

- First-run download: **15-40 GB transient** (13 Mars sites × up
  to 15 candidate JP2s × ~500 MB-1.5 GB each, depending on which
  rank position has actual data). Cached on disk afterwards. The
  full Mars set converged at 14 GB of cached JP2s after ~6 hours
  of cumulative server time over multiple runs.
- Wall-clock: highly variable on UAHiRISE PDS health. Healthy
  server: 1-2 hours for all 13 sites. Flaky server (observed
  16-32 min hangs before terminating): 4-8 hours. Use
  `--missing-only` to make subsequent runs target only the unresolved
  subset — purely-cached resolves run in seconds with no network
  hit, so re-running over a partial state is cheap.
- Disk: `.image-cache/hotspots/raw/` settles at 8-15 GB. Cache is
  gitignored. Delete after success with `rm -rf .image-cache/hotspots/raw/`
  if disk pressure matters (re-running rebuilds it).
- API cost: $0. UAHiRISE PDS is free, no API key.
- Image Pipeline v2 scoring (downstream, --skip-score to suppress):
  ~$0.05/image × 13 = ~$0.65 (Sonnet 4.6).

### Operator playbook for sites auto-pick can't resolve

The v0.7 Mars run hit each of these failure modes and the playbook
below is what worked. Apply in order of escalating effort:

1. **Wait for server health + retry with `--missing-only`** — UAHiRISE
   PDS has bad days. On one run a single PSP-era JP2 burned 60+ min
   over 3 retries; the next morning the same product downloaded in
   3 min. The first thing to try is usually just a fresh run a few
   hours later.

2. **Verify the published lander coords vs. modern HiRISE-localized
   values** — `mars-sites.json` historically used NSSDCA's Viking-era
   measurements, which can be 13-33 km off the actual HiRISE-localized
   lander position. Examples encountered in v0.7:
   - Viking 1: NSSDCA 22.27°N, HiRISE 22.4856°N — 13 km offset
   - Viking 2: NSSDCA 47.97°N, HiRISE 47.673°N — 33 km offset
     (and even more in older publications)
   - Mars Pathfinder: NSSDCA 19.13°N, HiRISE 19.0949°N — 2.4 km offset
   - Schiaparelli: had a longitude *sign* error (+6.21° instead of
     -6.21°) — put the target on the opposite side of Mars

   Update `mars-sites.json` with the modern HiRISE coords. The
   frontend shifts by km on a globe-scale view, well below visual
   tolerance.

3. **Pin a known-good product ID via operator override** — for sites
   where the auto-pick can't find a frame in the top 15 (sparse
   coverage, or every PIP-passing frame really does have no data at
   target). Research at `https://www.uahirise.org/<PRODUCT_ID>` for
   the lander's published image page. Each Mars lander has at least
   one canonical UAHiRISE-published "image of the lander" page, e.g.
   - Viking 1: `PSP_001521_2025` (Thomas Mutch Memorial Station)
   - Viking 2: `PSP_001501_2280` (Gerald Soffen Memorial Station)
   - Spirit: `PSP_001513_1655` (Spirit at Gusev Crater)
   - Mars Pathfinder: `PSP_001890_1995` (HiRISE Images Pathfinder Site)
   - Schiaparelli: `ESP_048120_1780` (Second Image of Schiaparelli)
   - Mars 3: `ESP_031036_1345` (Could This Be the Soviet Mars 3 Lander?)

   Pin via `hotspot_tier2_force_product_id` in
   `static/data/surface-hotspots.json`. The orchestrator skips the
   catalog query and goes straight to that single product (still
   subject to the fail-fast sample, so a wrong pin is caught).

4. **Editorial coord nudge for high-uncertainty sites** — Mars 3 has
   documented ±10 km coordinate uncertainty. The candidate Mars 3
   hardware was found in HiRISE imagery (ESP_031036_1345) centred at
   lat -45.05°, but `mars-sites.json` stored lat -45.00° — the
   raster's top edge was at lat -45.001°, so the target landed 53 m
   north of the image data. Nudging the stored lat to -45.05° (well
   within the ±10 km uncertainty band) puts the sample inside the
   image. Always add a `_lat_note` or `_lon_note` field documenting
   editorial coord nudges so future operators understand why the
   stored value differs from NSSDCA's headline number.

5. **Accept partial coverage as a last resort** — frontend renders
   missing-patch sites with the placeholder material (geometry + LOD
   swap still verifiable). Surface this in release notes if any site
   ships without a Tier 2 patch.

### What v0.7 final Mars state looks like

13 of 13 Mars sites resolved end-to-end. Mix of paths:

| Path | Sites |
|---|---|
| Auto-pick clean (all default thresholds) | curiosity, opportunity, phoenix |
| Auto-pick after projection-fix + wider candidate pool | perseverance, insight, zhurong, beagle2 |
| Operator override + projection fix | viking1-lander, viking2-lander, mars-pathfinder, spirit |
| Operator override + longitude sign fix | schiaparelli |
| Operator override + editorial lat nudge within uncertainty band | mars3 |

### Mars Tier 2a regional layer — Murray Lab Global CTX Mosaic V01 (v0.7.x)

v0.7.x extends the single-layer HiRISE patch into a two-layer Tier 2
composition: a wider **regional context** disc from the Murray Lab
Global CTX Mosaic V01 (Dickson et al. 2024, doi:10.1029/2024EA003555)
+ the existing HiRISE detail patch on top.

```bash
# Same orchestrator, new layer flag:
npm run images:hotspots -- --layer ctx              # fetch regional only
npm run images:hotspots -- --layer hirise           # fetch detail only
npm run images:hotspots -- --layer all              # both (default)
npm run images:hotspots -- --layer ctx --missing-only --site curiosity
```

#### Pipeline (parallel to HiRISE)

```
[1] Compute Murray Lab tile name from (lat, lon).
    Format: E{lon}_N{lat} where lon is 4°-step, 3-digit-padded
    (E000-E176 for positives, E-004 to E-180 for negatives),
    and lat is 4°-step, 2-digit-padded (N00-N84 for positives,
    N-04 to N-88 for negatives). Computed by
    scripts/hotspots/ctx-mosaic.ts:tileNameForLatLon().
[2] Build deterministic ZIP URL:
    https://murray-lab.caltech.edu/CTX/V01/tiles/
      MurrayLab_GlobalCTXMosaic_V01_{tileName}.zip
    No catalog query needed — the Murray Lab mosaic IS a single
    blended source; each lat/lon maps to exactly one tile.
[3] Download (~1.7 GB ZIP) via curl. Caltech's TLS cert chain
    fails Node fetch's strict validation (InCommon → USERTrust);
    curl uses system trust and works. 3 retries with backoff.
[4] Unzip to .image-cache/ctx-mosaic/{tileName}/. Drop everything
    except the .tif. The extracted GeoTIFF is ~2 GB (compressed
    LZW) and represents ~190k × 190k pixels = 948 km × 948 km of
    Mars surface at 5 m/px.
    Murray Lab's inside-the-zip filename has varied across
    releases (MurrayLab_GlobalCTXMosaic vs MurrayLab_CTX_..._Mosaic);
    the fetcher discovers the GeoTIFF by extension, not by
    expected name.
[5] Crop 2048×2048 centred on the lander's (lat, lon) via the
    existing cropRemoteRasterToLatLon() pipeline (same gdal-async
    open + project + read + JPEG q=88 encode used by HiRISE).
    Equirectangular Mars projection correction (the hard-won fix
    from #PA) applies here too — same SRS family.
[6] Write to static/images/hotspots/mars/<site>/tier2-ctx.jpg
    (~600-900 KB per patch; ~10.2 km × 10.2 km of ground surface).
[7] Append provenance entry with CC-BY-Murray-Lab license +
    Caltech + JPL/MSSS attribution chain.
[8] Polite 60 s pause before the next site (Murray Lab politeness).
```

#### Cost + bandwidth

- Per-site download: 1.7 GB (one tile ZIP). 13 Mars sites span
  ~10-12 unique tiles (some sites share — Opportunity and
  Schiaparelli are both in `E-008_N-04`).
- First-run total: ~20-25 GB transient, of which 8-15 GB lands
  on disk as cached `.image-cache/ctx-mosaic/*/*.tif` GeoTIFFs.
- Wall-clock: ~12-20 minutes per unique tile (download bandwidth
  ~1.5-2 MB/s + 60 s polite pause). All 13 sites: ~3-5 hours.
- API cost: $0. Cite Dickson et al. 2024 per Murray Lab terms.
- Cache cleanup: same `rm -rf .image-cache/ctx-mosaic/` once
  patches are on disk.

#### Two-layer rendering composition

The frontend treats both layers as ONE Tier-2 dispatcher unit
(`src/lib/hotspot-surface-patch.ts:buildHotspotSurfacePatch()`
extended to accept `regionalTextureUrl`). Composition:

- **Regional disc**: 1.5 u world units in diameter (~170 km
  displayed; 14× editorial scale-up). PolygonOffsetFactor = -1.
- **Detail disc**: 0.6 u world units (~67 km displayed; 136×
  scale-up). PolygonOffsetFactor = -2 — wins depth-test against
  regional, sits visually on top.
- **Rim ring + centre pin**: shared, marks the exact lander spot.

No cross-fade between layers — they render simultaneously when
Tier 2 is active. Visual hierarchy comes from size + depth offset.
The user perceives a smooth zoom-in: at moderate zoom they see the
wider CTX regional context with the small HiRISE detail patch
overlaid, and as they zoom in further the HiRISE patch fills the
view naturally.

Sites without a regional source render only the detail patch
(backward-compatible).

#### Source-attribution info card (v0.7.x)

When Tier 2 is active, a small floating card (bottom-left) shows
site name + agency chip + current layer attribution (which source,
which product, what resolution, what license). Card content swaps
between "Regional view · CTX Murray Lab · 5 m/px" (at moderate
zoom) and "Detail view · HiRISE <product_id> · 25 cm/px" (at
close zoom). Click "source ↗" opens the canonical agency page.

Implementation: per-frame derivation in `mars/+page.svelte` against
the dominant Tier 2 hotspot. Hidden in panorama mode and 2D view.

### Moon (v0.7.x #PC, planned)

Moon two-layer hotspots use the same architecture: **LROC NAC**
(50 cm/px, NASA PD via PDS) for detail + **CNSA Chang'e 2 lunar
mosaic** (7 m/px, CC-BY-CNSA) for regional. Chang'e 2 was chosen
over LROC WAC (100 m/px) — Chinese imagery is sharper for the
regional layer, and it's an explicit multi-agency representation
choice (per PRD-014 §v0.7.x global-space-program direction).

Until #PC ships: the 18 Moon hotspots render Tier 0 + Tier 1
models; Tier 2 patches show the neutral placeholder material
(geometry + LOD swap still verifiable; just no real imagery yet).

---

## See also

- **[PRD-018](../prd/PRD-018.md)** — product requirements (what ships in v2.0, v2.1, v2.2)
- **[RFC-022](../rfc/RFC-022.md)** — architecture (manifest layout, cache strategy, scoring prompt, provider abstraction)
- **[PRD-014](../prd/PRD-014.md)** — Surface Hotspots product requirements
- **[RFC-017](../rfc/RFC-017.md)** — Surface Hotspots architecture (LOD dispatcher, surface patch quad, hardware authoring)
- **[ADR-046](../adr/ADR-046.md)** — existing asset-fetch pipeline (unchanged by v2)
- **[ADR-047](../adr/ADR-047.md)** — image-provenance.json schema + fail-closed gate (unchanged by v2)
- **[ADR-016](../adr/ADR-016.md)** — build-time-only constraint (v2 strictly respects)
- **[user-guide.md](./user-guide.md)** — end-user-facing product guide (v2 is invisible to end users; this guide is for maintainers)
- **[visual-regression-baselines.md](./visual-regression-baselines.md)** — sister guide for the other build-time visual-quality gate
