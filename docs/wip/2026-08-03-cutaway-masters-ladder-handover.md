# Handover — launcher cutaways, pencil backfill, masters+ladder migration

_2026-08-03, mid-session stop (agent ran low on context; refused to force-push main blind)._

## State of `main` (safe + green)
`origin/main = 0367a450a2`. Shipped + CI-green:
- `f27645b81a` — feat(fleet): 23 launcher exploded cutaways + 8 pencil-anatomy backfills, wired into the fleet DETAIL tab (`launcherCutawayPath` in `spacecraft-diagrams.ts`, render block in `FleetEntryPanel.svelte`, `fleet_exploded_caption` × 14 locales).
- `2c166c8651` — chore(git): `.gitattributes` LFS policy for `original-assets/**` (go-forward only).
- `0367a450a2` — a parallel `fix(deploy)` (tailnet OAuth), not mine.

**Nothing was force-pushed. main history is untouched.** Cumulative `ci` on `0367a45` = success.

## What's DONE but NOT landed — commit A
Branch **`content`** (= `wip/masters-ladder-migration` = `d236b159d9`) holds the correct fix:
- **refactor(images): move launcher/anatomy art onto masters + responsive ladder.**
- 31 art pieces migrated to the canonical pipeline (ADR-080/RFC-030):
  - full-res webp **masters** under `masters/anatomy-exploded/` (23, new) + `masters/anatomy/` (8 pencils) — LFS-tracked.
  - scoped **responsive ladder** rungs in `static/images/**` (1280/2048/base), replacing the single-rung stopgap.
  - **multi-rung `image-ladder.json`** rows (e.g. exploded `[1280,2048,2528]`, pencils `[859,1374,1696]`).
  - the 31 raw 6 MB PNGs **removed** from `original-assets/` (webp masters are the source now).
- Done scoped per-image (`scripts/vision/README §"add a few images — surgical, not a full rebuild"`) — **no whole-corpus `git lfs pull`, no full `build-display-ladder`**.

### Why A isn't on main yet
`git rebase origin/main` misfired replaying A (the LFS clean/smudge filter interacting with the PNG deletions; also I misread `REBASE_EXIT` — it was `tail`'s exit, the pipefail gotcha). No damage — HEAD just detached; `content` still holds A.

### To land A (safe, non-destructive — main stays safe even if it fails)
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
git checkout content                     # = A
git fetch origin main
git rebase origin/main                    # watch for LFS-filter hiccup on the PNG deletes;
                                          # if it stalls: git rebase --abort, then investigate
                                          # `git config filter.lfs` behaviour on the delete
git push origin HEAD:main                 # runs full preflight (~5 min). Expect green:
                                          # ladder contract test now passes with multi-rung rows.
```

## NOT done — B (the debt purge you asked for)
The ~507 MB of raw PNG blobs still sit in **history** (`f27645`'s 31 + the pre-existing ~144 `original-assets/anatomy/*.png`). Removing them = history rewrite + **force-push main** — I would not do this unattended on exhausted context. Do it deliberately:
```bash
git branch backup/pre-lfs-purge origin/main        # rollback ref FIRST
# purge original-assets/**/*.png from all history (git filter-repo preferred):
git filter-repo --path-glob 'original-assets/**/*.png' --invert-paths
git push --force-with-lease origin main            # destructive — you approved "B after A"
```
Note: the pre-existing 144 `original-assets/anatomy/*.png` are redundant with `masters/anatomy/*.webp` (already LFS) — safe to purge. `build-anatomy-webp.mjs` still reads `original-assets/anatomy/`; after purge, migrate the remaining 144 to the masters+ladder path too (same scoped script pattern as A) for full consistency.

## /fly 3D models (your earlier "next" ask — scoped, not started)
Explore-mapped the 3D launcher models: 100% procedural in `src/lib/three/launcher-models.ts` (23 builders), stages as `booster/midStage/upperStage/strapOns/fairing` groups, proportions hard-coded as `vehLen * N` fractions (this is where "comical" sizing lives), capsule-vs-fairing already differentiated at scene level (`ascent-scene.ts` `isCapsulePayload`). Full findings in the session transcript. Needs a plan + your sign-off before edits (/fly rule).
