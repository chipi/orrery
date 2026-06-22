# Spacecraft anatomy art — generation runbook (#367)

How to generate the remaining spacecraft anatomy illustrations **in the same
style** as the 72 already shipped, and wire them in end-to-end.

The art is AI-generated (Higgsfield `nano_banana_pro`) editorial cutaways. The
whole point of this doc is **style consistency** — a new batch must look like
it came from the same hand as the existing set.

---

## 0. The golden rules (read first — this is how we avoid drift)

Batches look different when the recipe drifts. To prevent that:

1. **Copy the prompt recipe VERBATIM.** Only swap the bracketed parts
   (`[CRAFT]`, `[KEY PARTS]`, `[AGENCY]`). Do **not** paraphrase the style
   clauses ("watercolor and ink-wash on faint graph paper …"). Those clauses
   ARE the style.
2. **Never change the model.** Always `nano_banana_pro`.
3. **Never change aspect ratio per style:** watercolor = `3:2`, pencil = `2:3`.
4. **Strongest guard — pass a reference image.** Hand the model one of the
   existing illustrations as a style reference (see §3). This locks the look
   far more tightly than text alone. Use a watercolor reference for watercolor
   craft, a pencil reference for launchers.
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
{ "model": "nano_banana_pro",
  "params": { "prompt": "<recipe>", "aspect_ratio": "3:2", "count": 1 } }
```

Up to **8 concurrent** on the PLUS plan — fire a wave of 8, then poll
(`job_status` with `sync:true`) to get the result URLs. Each image = **2
credits**.

### Reference-image anti-drift (recommended)

To pin the style, attach an existing illustration as a reference:

1. `media_import_url` (or `media_upload`) one of the shipped images, e.g. the
   raw URL of `static/images/anatomy/voyager-2` (a clean watercolor) — get back
   a `media_id`.
2. Pass it in `params.medias: [{ "value": "<media_id>", "role": "<style/ref
   role from models_explore>" }]`. Check `models_explore` for the exact role
   name nano_banana_pro expects for a style/reference image.

Keep one watercolor ref + one pencil ref handy and reuse them across the batch.

---

## 4. Download → resize → wire (per wave)

```bash
# 1. Download each result PNG into the committed originals dir, named by id:
curl -s -o original-assets/anatomy/<id>.png "<rawUrl>"

# 2. Resize to webp + regenerate the id manifest (anatomy-ids.json):
node scripts/build-anatomy-webp.mjs

# 3. Regenerate the colophon bill-of-materials:
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
git add original-assets/anatomy static/images/anatomy src/lib/anatomy-ids.json \
        static/data/original-work.json
```

Full-res PNGs live in `original-assets/anatomy/` (committed backup); the app
serves the ~130 KB webp from `static/images/anatomy/`.

---

## 5. Remaining craft

Style in (): P = pencil, W = watercolor. Marko's call was **notable first,
obscure long-tail last**.

**✅ The 72 notable craft are DONE** (generated 2026-06-22, all on disk +
wired). The full notable set — 53 watercolor + 19 pencil launchers — shipped in
one batch using the locked recipe; ids and prompts are preserved verbatim in
`/tmp/anatomy-prompts.mjs` (regenerate any time with `node`). The `[tail]` craft
below are all that's left, and were deliberately deferred as obscure.

> Don't re-generate the 72 — `node scripts/build-anatomy-webp.mjs` + the
> missing-check (§4) will show they're already present. Only the tail is open.

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
| Generated originals (committed backup) | `original-assets/anatomy/*.png` |
| Served display images | `static/images/anatomy/*.webp` |
| Id manifest (auto-derived) | `src/lib/anatomy-ids.json` |
| Resolver + visitor aliases | `src/lib/spacecraft-diagrams.ts` |
| Resize + ids script | `scripts/build-anatomy-webp.mjs` |
| Colophon bill-of-materials | `scripts/build-original-work.mjs` → `static/data/original-work.json` |
| Consistency test | `src/lib/spacecraft-diagrams.test.ts` |
| Fleet DETAIL tab render | `src/lib/components/FleetEntryPanel.svelte` |
| Colophon showcase | `src/routes/colophon/+page.svelte` |
