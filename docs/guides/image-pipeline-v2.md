# Image Pipeline v2 — vision scoring + smart cropping + curation loop

`scripts/score-images.ts` + `scripts/crop-variants.ts` + `scripts/build-image-vision-manifest.ts` + `scripts/flag-image.ts` are the v2 layer on top of the existing image pipeline (`scripts/fetch-assets.ts`, ADR-016 / ADR-046 / ADR-047). v2 is **purely additive** — the existing 1345-entry `image-provenance.json` (ADR-047 fail-closed gate) stays untouched.

This guide is the recipe for using v2 day-to-day: when to run scoring, which scope flag to pick, how to read the audit report, how to flag bad picks back into the curation loop.

For the architectural decisions behind v2 (manifest model, vision provider abstraction, smart-crop variants, cost ledger, deny-list mechanic), see **[PRD-018](../prd/PRD-018.md)** + **[RFC-022](../rfc/RFC-022.md)**.

---

## Prerequisite: `ANTHROPIC_API_KEY` (one-time setup)

v2 calls the Anthropic Vision API directly (Claude Sonnet 4.6). **Anthropic recently announced that API calls are NOT covered by Claude Code subscriptions** — v2 needs its own paid API key.

**Local setup** (one-time, on Marko's machine):

1. Get an API key at <https://console.anthropic.com/settings/keys>.
2. Add to your shell profile (`~/.zshrc`):
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```
   Or to `.env.local` in the repo root (gitignored):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Verify: `node -e 'console.log(process.env.ANTHROPIC_API_KEY?.slice(0,10))'` should print the key prefix.

**GitHub Actions setup** (one-time, for CI builds that need to re-score):

1. Go to <https://github.com/chipi/orrery/settings/secrets/actions>.
2. Add a new repository secret: `ANTHROPIC_API_KEY` = `sk-ant-...`.
3. The audio-pipeline workflow (PRD-016 / RFC-019) already uses an `ANTHROPIC_API_KEY` secret for translations — same key works for both pipelines (Anthropic billing is per-account, not per-product).

**Without the key:** v2 scoring fails with HTTP 401. The build does NOT fail closed (per RFC-022 §10) — the pipeline logs the auth error, marks affected images as `failed: true` in the cache, and continues. Frontend reads what the manifest already has from previous successful runs.

**Cost reminder:** v2 uses paid API calls. Whole-corpus first build = ~$67. Routine iteration = $0.50–$5/mission. The cost ledger (`static/data/image-vision-cost-ledger.json`) tracks every call; the soft warn is $50/build, hard halt $200/build (matches PRD-016 audio policy).

---

## What v2 produces

After a successful pipeline run, three new artefacts exist:

```
static/data/image-vision.json              ← machine-generated, committed
static/data/image-curation.json            ← human-edited, committed
static/data/audit-report.html              ← gitignored, dev-only
static/data/image-vision-cost-ledger.json  ← committed (audit trail of API spend)
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

`static/data/image-vision-cost-ledger.json` records every API call:

```jsonc
{
  "version": 1,
  "entries": [
    { "ts": "2026-05-16T14:32Z", "image_path": "...", "model": "claude-sonnet-4-6",
      "chars_input": 0, "chars_output": 184, "cost_usd": 0.0512 }
  ],
  "monthly_totals": { "2026-05": { "anthropic": 22.45 } }
}
```

CI cost-cap policy (matches PRD-016 audio):
- **$50/build soft warn** — pipeline continues, log shows a banner.
- **$200/build hard halt** — pipeline exits non-zero, cache for completed images preserved, you investigate before re-running.

If a single `--all` cold build hits $80, that's expected (sized for the whole 1345-entry corpus). The hard halt only triggers on runaway loops or pricing surprises.

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

## See also

- **[PRD-018](../prd/PRD-018.md)** — product requirements (what ships in v2.0, v2.1, v2.2)
- **[RFC-022](../rfc/RFC-022.md)** — architecture (manifest layout, cache strategy, scoring prompt, provider abstraction)
- **[ADR-046](../adr/046-asset-pipeline.md)** — existing asset-fetch pipeline (unchanged by v2)
- **[ADR-047](../adr/047-image-provenance-manifest.md)** — image-provenance.json schema + fail-closed gate (unchanged by v2)
- **[ADR-016](../adr/016-build-time-asset-resolution.md)** — build-time-only constraint (v2 strictly respects)
- **[user-guide.md](./user-guide.md)** — end-user-facing product guide (v2 is invisible to end users; this guide is for maintainers)
- **[visual-regression-baselines.md](./visual-regression-baselines.md)** — sister guide for the other build-time visual-quality gate
