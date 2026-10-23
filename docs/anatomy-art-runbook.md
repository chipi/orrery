# Spacecraft anatomy art — generation runbook (#367)

How to generate the remaining spacecraft anatomy illustrations **in the same
style** as the shipped set, and wire them in end-to-end.

The art is AI-generated (Higgsfield `nano_banana_2`, "Nano Banana 2") editorial cutaways. The
whole point of this doc is **style consistency** — a new batch must look like
it came from the same hand as the existing set.

---

## 0. The golden rules (read first — this is how we avoid drift)

Batches look different when the recipe drifts. To prevent that:

1. **Copy the prompt recipe VERBATIM.** Only swap the bracketed parts
   (`[CRAFT]`, `[KEY PARTS]`, `[AGENCY]`). Do **not** paraphrase the style
   clauses ("watercolor and ink-wash on faint graph paper …"). Those clauses
   ARE the style.
2. **Never change the model.** Always `nano_banana_2` — the model id every shipped
   generation records in `scripts/anatomy/prompts-history.json`.
3. **Never change aspect ratio per style:** watercolor = `3:2`, pencil = `2:3`.
4. **Strongest guard — pass a reference image.** Hand the model one of the
   existing illustrations as a style reference (see §3). This locks the look
   far more tightly than text alone. Use a watercolor reference for watercolor
   craft, a pencil reference for launchers.
   **A reference passes on content, not only style** (2026-10-23 batch): Giotto
   on a Rosetta reference grew Rosetta's solar wings; Falcon Heavy on the Saturn V
   cutaway drew an S-IC and a Lunar Module; Salyut 2 on Salyut 1 kept its docked
   Soyuz. So pick a reference with the **same layout** (a sister craft where one
   exists), and end the prompt with the matching clause from
   `scripts/anatomy/build-batch-2026-10-23.mjs` — "sister craft: keep the layout,
   change the details" or "different craft: take only the style, do not copy its
   shape, parts, text or markings". Write negations in lower case ("no upper
   stage"), never "NO …": capitals leak into the drawing as labels.
5. **QC every batch against the existing set** — render a contact sheet
   (`build-anatomy-webp` already lists ids) and eyeball it next to a few of the
   shipped ones before committing. Regenerate any that drift.

---

## 1. Style assignment

- **Launchers (rockets) → PENCIL sketch** (`2:3`, white sketchbook paper).
- **Everything else (crewed, cargo, orbiters, landers, rovers, observatories,
  stations) → WATERCOLOR cutaway** (`3:2`, graph paper).

---

## 2. The two recipes (verbatim templates)

### Watercolor (payload craft) — aspect `3:2`

```
Technical cutaway illustration of [CRAFT], watercolor and ink-wash on faint
graph paper, exposed internal structure — [KEY PARTS]. Handwritten engineering
annotations, dimension lines, faint physics equations in the margins,
ink-splatter wash clouds, warm muted metallic palette, vintage scientific
sketchbook / editorial infographic aesthetic. [AGENCY] markings.
```

Palette hints you may append where apt: `rusty` for Mars craft, `with solar
gold` for sun-facing, `ochre-metallic` for Venus.

### Pencil (launchers) — aspect `2:3`

```
Loose hand-drawn pencil sketch of [CRAFT], vertical, on white sketchbook paper.
Graphite shading, expressive cross-hatching, rough artistic linework,
monochrome grey, engineering concept sketch. [KEY PARTS/STAGES]. A few sketchy
handwritten labels.
```

`[KEY PARTS]` = the craft's real structure (bus, antenna, solar config,
engines, booms…). Accuracy matters — research the actual layout per craft.

---

## 3. Generating (Higgsfield MCP)

One call per craft (`mcp__claude_ai_Higgsfield__generate_image`):

```jsonc
{ "model": "nano_banana_2",
  "params": { "prompt": "<recipe>", "aspect_ratio": "3:2", "count": 1 } }
```

Up to **8 concurrent** on the PLUS plan — fire a wave of 8, then poll
(`job_status` with `sync:true`) to get the result URLs. Each image = **2
credits**.

### Reference-image anti-drift (recommended)

To pin the style, attach an existing illustration as a reference. A shipped
generation's id works directly — no upload: `params.medias: [{ "value":
"<generation_id>", "role": "image_references" }]`, with the id from
`scripts/anatomy/prompts-history.json`. The pencil set uses one fixed style
reference, media `1191305d-f91f-41fc-b5ac-8b1f1966a646`. Pick the reference by
layout (golden rule 4), not just by style.

**Where the prompts live.** `scripts/anatomy/prompts-history.json` holds the
exact prompt, model, aspect, resolution and reference of every shipped cutaway
(recovered from the Higgsfield history, 2026-10-23).
`scripts/anatomy/build-batch-2026-10-23.mjs` writes the prompts of the
2026-10-23 batch to `scripts/anatomy/batch-2026-10-23.json`; copy it for the next
batch. Never keep prompts only in `/tmp`: the 2026-06-22 prompts were kept in
`/tmp/anatomy-prompts.mjs` and lost.

---

## 4. Download → master → wire (per wave)

The set was re-mastered at 4K and folded into the responsive ladder
(RFC-030/ADR-080); `original-assets/anatomy/` was retired. Masters are now the
source of truth. **Save the highest-res render you have** (upscale to ~4K via
Higgsfield `upscale_image` if the generator capped it) as the master:

```bash
# 0. Keep the raw generation as downloaded (no re-encode) — the archive of record;
#    build-display-ladder.mjs skips this folder:
cp <download>.png masters/anatomy-originals/<id>.png

# 1. Save the full-res render as the master (git-LFS tracked), named by id:
#    (encode PNG → webp; keep it big — the ladder downscales from it)
cwebp -q 90 <id>-4k.png -o masters/anatomy/<id>.webp   # or sharp/any encoder

# 2. Derive the served responsive ladder (base {id}.webp + width rungs) from it:
node scripts/vision/build-display-ladder.mjs            # scope to masters/anatomy if iterating

# 3. Regenerate the id manifest (anatomy-ids.json) from the masters:
node scripts/build-anatomy-webp.mjs

# 4. Regenerate the colophon bill-of-materials:
node scripts/build-original-work.mjs
```

That's it — the manifest is **auto-derived**:
- `src/lib/spacecraft-diagrams.ts` builds `SPACECRAFT_ANATOMY_IMG` from
  `anatomy-ids.json` (no hand-edit). The fleet DETAIL tab + station panels read
  it. Underscore station-visitor ids alias to the kebab webp via
  `ANATOMY_ALIAS` — add an entry there only for a NEW underscore/kebab split.
- `/colophon` "Spacecraft cutaways" section + the consistency test pick the new
  ids up automatically.

### Verify + commit

```bash
npx vitest run src/lib/spacecraft-diagrams.test.ts   # ids <-> webp in sync
npm run i18n:compile && npx svelte-check --tsconfig ./tsconfig.json
```

Commit **only** the anatomy files (parallel agents work this repo — never
`git add -A`):

```bash
git add masters/anatomy static/images/anatomy static/data/image-ladder.json \
        src/lib/anatomy-ids.json static/data/original-work.json
```

Full-res masters live in `masters/anatomy/*.webp` (git-LFS, 4K); the app serves
the responsive ladder (`static/images/anatomy/{id}.webp` + width rungs) via
`<img srcset>`. The legacy `original-assets/anatomy/*.png` archive was purged.

---

## 5. Coverage

Style in (): P = pencil, W = watercolor.

- **2026-06-22:** the 72 notable craft (53 watercolor + 19 pencil launchers).
- **2026-08-02:** 8 pencil backfills, plus the 23 launcher exploded cutaways
  (docs/guides/launcher-cutaway-style.md).
- **2026-10-23:** the whole `[tail]` below — 4 pencil + 41 watercolor, and 17 more
  exploded cutaways. Every fleet launcher, crewed and cargo craft, orbiter, lander,
  rover, observatory and station now has a cutaway. All anatomy masters are 4K
  upscales (the 9 earlier 2k ones were upscaled in the same pass).

The `[tail]` list, kept for the record (all done 2026-10-23):

**`[tail]` launcher (P):** atlas-lv-3b, atlas-slv-3d, proton-k, r-7-vostok,
soyuz-fg, soyuz-u, titan-ii-glv, vostok-k, voskhod-11a57

**`[tail]` orbiter (W):** change-1, change-2, clementine, giotto, phobos-2,
vega-1, vega-2, luna10, viking1-orbiter, mars2-orbiter, mars3-orbiter,
lunar-orbiter-1..5

**`[tail]` lander (W):** mars-2, mars-polar-lander, vikram-cy2, luna24, change6,
viking2-lander, mars6, beagle2

**`[tail]` station (W):** salyut-2, salyut-3, salyut-4, salyut-5

**`[tail]` crewed-spacecraft (W):** the named Shuttle orbiters
(atlantis/columbia/discovery/endeavour/challenger/enterprise — visually
identical to the existing space-shuttle-orbiter, skip or do one), buran-ok-gli,
soyuz-7k-ok, soyuz-t, soyuz-tm, voskhod, apollo-csm-block-i

**`[tail]` cargo-spacecraft (W):** cygnus-standard (alias to cygnus-enhanced
instead), progress-7k-tg

---

## 6. Where everything lives

| Thing | Path |
|---|---|
| Full-res masters (git-LFS, 4K) | `masters/anatomy/*.webp` |
| Raw Higgsfield generations (archive, not built) | `masters/anatomy-originals/{id}.png` (`.jpeg` where Higgsfield returned JPEG) |
| Served responsive ladder | `static/images/anatomy/{id}.webp` + `{id}-<w>.webp` |
| Ladder manifest | `static/data/image-ladder.json` |
| Id manifest (auto-derived from masters) | `src/lib/anatomy-ids.json` |
| Resolver + visitor aliases | `src/lib/spacecraft-diagrams.ts` |
| Ladder builder | `scripts/vision/build-display-ladder.mjs` |
| Ids script (from masters) | `scripts/build-anatomy-webp.mjs` |
| Colophon bill-of-materials | `scripts/build-original-work.mjs` → `static/data/original-work.json` |
| Consistency test | `src/lib/spacecraft-diagrams.test.ts` |
| Fleet DETAIL tab render | `src/lib/components/FleetEntryPanel.svelte` |
| Colophon showcase | `src/routes/colophon/+page.svelte` |
