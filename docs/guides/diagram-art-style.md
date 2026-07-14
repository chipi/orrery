# Orrery diagram art — the "sketched Wired" style

The house style for editorial diagrams across Orrery — **The Long View essays**
now, and the **/science** section later (same pipeline, same look, so the whole
atlas reads as one hand). Locked with Marko, July 2026.

Reference implementations: the [Navigation essay](../wip/the-long-view-navigation-prototype.md)
(first pass) and **delta-v** (first pass in this style). The sources live under
`docs/wip/essay-diagram-sources/<slug>/*.svg`.

---

## The pipeline (SVG sketch → Higgsfield art)

1. **Author a precise SVG sketch** — the compositional + factual truth. Deterministic,
   in-palette, every label + number in place. Build script pattern:
   `scripts/essays/build-<slug>-sketches.mjs` (mirror `build-nav-diagram-sketches.mjs`).
   Rasterise each to a 2048-px PNG with `sharp`. Output to
   `docs/wip/essay-diagram-sources/<slug>/` (NOT the shipped `static/` tree).
2. **Upload each PNG to Higgsfield** (`media_upload` → PUT the presigned URL → `media_confirm`).
3. **Generate** with `nano_banana_pro`, `aspect_ratio: "16:9"`, `resolution: "2k"`,
   passing the sketch as `medias: [{ value: <media_id>, role: "image" }]` and the
   **style prompt below** (swap in the per-diagram subject + labels).
4. **Download the raw art**, convert to `static/images/essays/<slug>/<name>.webp`
   (`sharp().resize(1600).webp({ quality: 86 })`).
5. **Wire** the `figure` blocks into the essay overlay + set `hero` in the base
   (see `scripts/essays/wire-nav-figures.mjs`). `align: 'wide'`.

## The palette

Deep midnight-navy ground `#0a0e18` · luminous cyan linework `#7fb0e0` · warm-cream
highlights `#cfe3fb`/white · a single warm-amber glow `#ffd27f` for a Sun/star/key
accent. Faint blueprint grid + printed-paper grain ghosted behind. Monospace/hand
lettering.

## The locked style prompt (the "blend")

A blend of *elegant hand-sketched* (spare, atmospheric, glowing amber accent) and
*engineering-notebook* (ghosted blueprint grid, hand-lettered callouts). Use verbatim,
substituting the bracketed parts:

> Reinterpret this schematic as a hand-drawn editorial feature illustration for
> WIRED magazine — art-directed, not a clean computer diagram. Elegant, confident
> hand-sketched ink linework with light cross-hatching and a few loose construction
> strokes; hand-lettered annotations that feel drawn, not typed. Deep midnight-navy
> ground with subtle printed-paper grain and a faint blueprint grid ghosted behind
> the art; luminous cyan linework, warm-cream highlights, a single warm-amber glow
> accent. Spare, atmospheric, sophisticated — a beautiful magazine science spread,
> not busy. KEEP the geometry + these key labels legible and in place: **[list every
> heading, label and number]**. Not photorealistic, not a flat vector chart.
> Subject: **[one-line description of what the diagram shows]**.

**Why the label list matters:** this is a museum-grade atlas — the numbers and
names must survive the restyle. Always enumerate them in the prompt; if the art
garbles one, regenerate rather than ship it.

**Reference-first, not text-only.** Always pass the SVG sketch as the reference
image — it carries the layout so the art stays correct while the style goes loose.

## Heroes vs inline

- **Diagram-hero** (e.g. delta-v's mass-budget bar) — generate like any diagram.
- **Photo figures** — reuse vetted `missions/<id>/NN` or `fleet-galleries/…` imagery
  (no generation), honest mission-level captions + credit. Don't newly source.
- **Bespoke photo-hero** — a single text-to-image piece with NO reference sketch and
  NO text in the image (see Navigation's lone-craft hero).

## Reusing for /science

Same prompt, same palette, same pipeline. A `/science` concept diagram is authored
as an SVG sketch (the section's key figure), then run through this style so the
essays and the science overlays share one visual language.
