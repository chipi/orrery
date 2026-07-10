# scripts/vision — WebP display ladder + vision scoring

This dir derives the WebP responsive display ladder, 1×1 thumbnails, and vision focal-point scores from the **git-LFS `masters/` store** (ADR-080, RFC-030). The pipeline transforms full-resolution originals (permanent, never mutated) into regenerable derivatives for serving.

## Master → derivative model

- **Source:** `masters/<rel>/*` (full-res, git-LFS, the source of truth)
- **Served:** `static/images/<rel>/*` (WebP + capped JPEG)
- **Mapping:** a served path maps to its master by dropping `static/images/` and prepending `masters/` (e.g., `static/images/fleet/foo.webp` → `masters/fleet/foo.jpg`).
- **Precondition:** Masters must be smudged before running any script: `git lfs pull --include='masters/**'`. Pointer stubs exit with an error.

## Per-script table

| Script | Reads | Writes | When | ADR/RFC |
|---|---|---|---|---|
| `crop-variants.ts` | masters + vision cache | `NN.1x1.jpg` (≤512 px, focal-crop) | on `images:score` | PRD-018 · RFC-022 §5.2 |
| `cap-display-images.mjs` | `static/images/*` | NN.jpg (capped 3840 px / q85) | **one-time bulk migration** (capped the pre-WebP served jpg) — NOT per-image; the ladder builder caps from the master | RFC-030 D2 |
| `optimize-1x1-thumbnails.mjs` | `static/images/**/*.1x1.*` | NN.1x1.jpg (downsized to 512 px) | one-time migration + re-runs on crop change | ADR-079 |
| `build-display-ladder.mjs` | `masters/**` | NN.webp + NN-1280/2048/3072.webp + image-ladder.json | after cap or on refresh | RFC-030 D1; ADR-080 |
| `rekey-provenance-webp.mjs` | image-provenance.json | image-provenance.json (.jpg→.webp paths for bases) | after ladder complete | RFC-030 D1 |
| `build-manifest.ts` | vision cache + variant cache | image-vision.json (focal point, category, score) | on `images:score` final | PRD-018 · RFC-022 §2.1 |

## File-naming conventions

- **`NN.webp`** — Base (unsuffixed = largest rung, 3072 px max); also the `<img src>` fallback.
- **`NN-<width>.webp`** — Ladder rungs at 1280, 2048 widths (responsive `srcset` candidates).
- **`NN.1x1.jpg`** — Thumbnail (always JPEG, focal-point crop, ≤512 px, gallery rows/cards).
- **Exclusions:** `hotspots/` and `posters/` stay full-res JPEG; they do not receive the ladder or cap.

## Gotchas

- **Masters not smudged:** build-display-ladder exits with "ENOENT" if masters are pointer stubs. Run `git lfs pull --include='masters/**'` first.
- **Rebuild rewrites manifest:** build-display-ladder regenerates the entire `image-ladder.json` from a full `masters/` walk — all masters must exist; partial walks leave orphan entries.
- **Hotspots and posters are excluded:** the ladder builder skips any path containing `/hotspots/` or `/posters/`, and rekey-provenance does not re-path them. Verify exclusion if adding a new directory.

## Cross-references

- **Full pipeline:** [scripts/IMAGE-PIPELINE.md](../IMAGE-PIPELINE.md) — the complete ingest → score → serve flow.
- **Architecture decisions:** [ADR-080](../../docs/adr/ADR-080.md) — responsive ladder + srcset delivery (locked 2026-07-08); [RFC-030](../../docs/rfc/RFC-030.md) — full design including cost analysis and slice plan.
- **Gotchas and gotchas:** [AGENTS.md §Image pipeline — gotchas](../../AGENTS.md) — memory of cross-architecture phash baseline issues, cache staleness, walker agency fallback.
