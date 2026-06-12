# Image hero+gallery inventory — Phase 0 of #5 rework

*Generated June 2026. Pre-rework snapshot. Read alongside
`docs/guides/post-332-follow-ups.md` §5.*

## Scope

Eleven detail-panel surfaces that follow a hero+gallery pattern were
audited for hero-file coverage, provenance consistency, and refactor
remnants.

## Per-surface inventory

| Surface | Entities on disk | Hero coverage | Pattern |
|---|---:|---:|---|
| Missions | 233 hero files + 58 gallery dirs (old) + 24 gallery dirs (new) | **24 missing** (Slice A/B/C) | `missions/<id>.jpg` for hero; gallery split between `missions/<id>/` (old) and `mission-galleries/<id>/` (new) |
| Fleet | 236 entity dirs | 100% (236 / 236) | `fleet-galleries/<id>/01.jpg` for both hero + first gallery slot |
| Moon sites | 16 | 100% | `moon-sites/<id>/01.jpg` |
| Mars sites | 25 | 100% | `mars-sites/<id>/01.jpg` |
| Earth objects | 13 | 100% | `earth-objects/<id>/01.jpg` |
| Planets | 8 | 100% | `planets/<id>/01.jpg` |
| Satellites | 16 | 100% | `satellites/<id>/01.jpg` |
| Small bodies | 8 | 100% | `small-bodies/<id>/01.jpg` |
| ISS modules | 24 | 100% | `iss-modules/<id>/01.jpg` |
| Tiangong modules | 6 | 100% | `tiangong-modules/<id>/01.jpg` |
| Sun | 1 (single entity, 20 gallery files flat) | n/a | `sun/<nn>.jpg` |

**Missions is the only surface with a hero gap, and the gap is
structural — a 24-entry cohort with three sequential follow-up steps
all skipped.**

## The 24-mission hero gap — root cause

Slice A/B/C (commits `62c35a0da`, `45f668cd4`, `f4ee2e15d` on main —
"feat(missions + fleet)") added 24 missions to the catalog via the
new `static/images/mission-galleries/<id>/` directory pattern. Three
follow-up steps that the older `static/images/missions/<id>/` flow
includes were skipped:

1. **Hero staging:** the cover image at
   `static/images/missions/<id>.jpg` was never copied from the gallery.
   Card UI references that path; the `onerror="cover-missing"` handler
   hides the figure gracefully but the cards lose their visual identity.
2. **Provenance registration:** none of the gallery files in
   `mission-galleries/` were added to `static/data/image-provenance.json`.
   This shows up as 491 orphan files on disk vs 0 broken-reference
   entries in the manifest (the manifest is internally consistent but
   silent on a whole subtree of the corpus).
3. **Vision scoring:** because the gallery isn't in provenance,
   `scripts/score-images.ts` never sees these files. They have no
   entry in `static/data/image-vision.json` and no pre-cropped variants
   (`.1x1.jpg` / `.4x3.jpg` / `.16x9.jpg`).

### The 24 affected mission ids

```
apollo-1     apollo-soyuz    inspiration4   mariner10
otv-1        otv-2           otv-3          otv-4
otv-5        otv-6           otv-7          polaris-dawn
shenzhou-1   skylab-2        skylab-3       skylab-4
voskhod-1    voskhod-2       vostok-1       vostok-2
vostok-3     vostok-4        vostok-5       vostok-6
```

## Provenance ↔ disk consistency

- **`static/data/image-provenance.json` entries:** 4241
- **Broken references (path in JSON but file missing on disk):** 0
- **Disk source files (non-variant):** 2300
- **Disk source files registered in provenance:** 1809
- **Disk orphans (file exists but not in provenance):** 491 — 100% in
  `mission-galleries/`, matching the Slice A/B/C cohort above.

The manifest itself is clean. The data hygiene gap is **absence**, not
wrongness — 491 files live outside the only system that scores them.

## Pattern inconsistencies worth flagging

- **Hero-path convention:** missions use `<surface>/<id>.jpg` (a top-
  level file). Every other surface uses `<surface>/<id>/01.jpg` (a slot
  inside the gallery dir). The mission outlier is what made the
  Slice A/B/C skip possible — the staging step has no equivalent on the
  other surfaces because the first gallery slot *is* the hero.
- **Variant filename convention:** old pattern uses `01.16x9.jpg` (dot
  separator). Slice A/B/C `mission-galleries/` uses `01-16x9.jpg`
  (dash separator). Pipeline tooling that grep-matches one form
  silently skips the other.

Both inconsistencies are fixable in the rework (collapse missions onto
the universal `<surface>/<id>/01.jpg` pattern, standardise on dot or
dash) but are independent of the hero-quality problem and shouldn't be
mixed into the same change without a separate review.

## What Phase 1 needs to handle

Per the rubric locked in chat (see §"HERO CRITERIA"), the audit script
needs to evaluate every entity × surface for:

1. **Hero existence** — does the file at the conventional hero path
   exist? (Catches the 24-mission cohort + any future skipped staging.)
2. **Provenance coverage** — is the hero registered? (Catches the
   orphan-corpus class.)
3. **Hero quality** — pulls existing score from `image-vision.json`,
   applies the eight-point hero rubric (subject / composition / context
   / render policy / no-deny-list / recognition / prefer-alternate /
   cross-surface), emits per-surface audit markdown.
4. **Cross-surface consistency** — flags assets that appear under both
   a mission and a fleet entry (BepiColombo, Juno, SLIM noted in chat)
   so the same canonical hero resolves for both.

Output: one `docs/provenance/<surface>-hero-audit.md` per surface
covering auto-swap proposals, needs-curation queue, and accepted
overrides — same format as the existing `fleet-hero-audit.md` but
emitted from one shared script driven by a per-surface config.

## Budget plan

- **Phase 1 (audit infrastructure):** $0 — no API calls, uses existing
  manifest data + algorithmic post-filter.
- **Phase 2 (operator review):** $0 — Marko reads the per-surface
  markdowns, marks them up.
- **Phase 3 (targeted rescore with hero rubric):** $1-4 worst case —
  bump `SCORING_PROMPT_VERSION` to v1.1, extend the prompt to return a
  `hero_score` field alongside `score`, re-run **only on Phase 2's
  flagged candidates** (estimated 50-150 images).
- **Phase 4 (sourcing the missing):** $0 — agency-first fetcher
  pattern (Wikimedia / NASA Image Library / agency archives), applied
  to the Phase 1 needs-curation queue + the 24-mission backlog from
  this report.
- **Phase 5 (frontend wiring):** $0 — replace hardcoded image-path
  references with `pickHero(surface, id)` that reads the audit-
  approved manifest + an optional `<surface>-hero-overrides.json`.

Total expected: **< $5 USD**. Hard ceiling per Marko: $20 USD.

---

*This inventory file is the artefact for Phase 0. Phase 1 (the
generalised audit script) will be drafted next; outline + sample
output will land here before any code is committed.*
