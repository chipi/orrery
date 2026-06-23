# Science Cover Style Bible

*The visual language for /science chapter covers + the /science landing hero.*
*v1 · 2026-06-23 · grounded in the five "loved" covers: scales-time, planets, orbits, transfers, porkchop.*

---

## 0. Why this exists

The first chapter covers (scales-time, planets, orbits, transfers, porkchop) share one
coherent DNA — **celestial-poetic**. Later covers (history, propulsion, space-stations,
life-in-space, observation, mission-phases) drifted into a second register —
**technical-schematic** (icons, wireframe boxes, bar charts, monospace labels). The set lost
coherence because no spec was written down. This is that spec. Every new or re-done cover —
and any Higgsfield-generated art — must clear this bar so the family stays whole.

**The rule of thumb:** a cover paints *the sky*, not *the hardware*. Mood over mechanism.
The diagrams (per-page) carry the mechanism; the covers set the mood.

---

## 1. The two registers — and which one wins

| | **Celestial-poetic** (KEEP) | **Technical-schematic** (AVOID on covers) |
|---|---|---|
| Subject | orbits, sun, planets, trajectory arcs — the sky | rockets, station boxes, timelines, bar charts |
| Type | italic serif whisper-caption | monospace UPPERCASE labels |
| Feeling | atmospheric, restrained, art | engineering UI, schematic |
| Examples | scales-time, planets, orbits, transfers, porkchop | history, propulsion, space-stations, life-in-space, observation, mission-phases |

Covers are **celestial-poetic, always.** If a chapter's subject is inherently hardware
(propulsion, space-stations), express it *celestially* — a thrust arc and a receding
trajectory, not a rocket icon; an orbital ring with a single bright node, not a wireframe truss.

---

## 2. Palette — exact tokens

The app field behind every cover is **`#04040c`** (deep near-black navy). Covers are drawn
transparent over it. Generated raster art must use `#04040c` as the base field.

| Role | Value | Use |
|---|---|---|
| **Field** | `#04040c` | background, always |
| **Accent (cyan)** | `#4ecdc4` | the ONE hero line — a trajectory, the live orbit, the focal arc. Used sparingly. |
| **Sun / gold** | `#ffc850` | the star; warm focal glow |
| **Earth blue** | `#4b9cd3` (`rgba(75,156,211,0.85)`) | the blue world |
| **Mars rust** | `#c1440e` (`rgba(193,68,14,0.85)`) | the red world / warm secondary |
| **Structure whites** | `rgba(255,255,255,α)` at α = `0.1 / 0.18–0.22 / 0.35–0.4 / 0.55` | orbit rings & geometry, faint→bright tiers |
| **Stars** | white `0.45–0.5` (bright), `0.22–0.25` (dim), r ≈ 0.6–1.2 | scattered sparse, never busy |
| **Caption ink** | `rgba(255,255,255,0.45)` | the whisper-caption |

**Discipline:** exactly **one** cyan accent element per cover. Everything else is white-on-navy
at varying opacity, plus the warm sun and at most two colored worlds (blue, rust). More color = dilution.

---

## 3. Composition

- **Canvas:** covers `viewBox="0 0 600 260"` (≈ 2.3∶1). Landing hero: wider, see §6.
- **One focal system, off-center.** scales-time anchors the sun-system at left (cx≈80);
  transfers spans a single arc across the middle. Negative space is the point — let the
  field breathe. Roughly 50–65% of the canvas stays near-empty.
- **Orbit rings:** concentric ellipses, opacity tiered faint→bright as they near the focus.
  One ring (or one arc) is promoted to cyan `#4ecdc4`; the rest are white tiers.
- **Glow:** the sun and any bright node carry a soft radial glow. Worlds get a faint
  1-ring halo (e.g. Earth `r=8` body + `r=14` `0.3`-opacity ring).
- **Stars:** 8–12 max, scattered top + bottom margins, mixed bright/dim. Sparse. Never a starfield.
- **No hard edges, no boxes, no charts, no icons, no arrows-with-arrowheads-as-UI.** Curves and dots only.

---

## 4. Typography — the whisper-caption

- **Font:** `'Crimson Pro', serif`, **italic**, ~13px on the 600×260 canvas (scale for hero).
- **Ink:** `rgba(255,255,255,0.45)` — quiet, never competing with the art.
- **Placement:** a corner (porkchop uses all four sparingly; scales-time uses bottom-right `text-anchor="end"`).
- **Voice — lowercase, lyric, ≤4 words per line.** It names a *feeling*, not a fact:
  - scales-time → *"vast and quiet"*
  - porkchop → *"expensive / cheap"* + *"a map of / when to leave"*
  - Write new ones in this register. NEVER monospace, NEVER UPPERCASE, NEVER a label like `LAUNCH` or `BONE MUSC CM`.

---

## 5. Per-chapter motif cues (celestial translations)

For the 6 diluted covers, re-express the subject celestially:

| Chapter | Diluted version (avoid) | Celestial translation (target) |
|---|---|---|
| history | timeline + year ticks | a single long arc sweeping across deep field, faint earlier orbits ghosting behind — *"how far we've come"* |
| propulsion | rocket icon on a line | one bright cyan thrust-arc leaving a glowing node, exhaust as a fading trail — *"the long push"* |
| space-stations | wireframe truss boxes | a single bright node on a low ring around a blue world, faint horizon curve — *"a home in orbit"* |
| life-in-space | astronaut + bar charts | a lone soft figure-glow against vast field, one tether-line to a bright node — *"fragile and far"* |
| observation | telescope box + spectrum bar | a faint dotted sight-line from a near node to a distant glowing galaxy-spiral — *"listening to light"* |
| mission-phases | LAUNCH→LEO→CRUISE flowchart | one continuous arc rising from a blue world, cresting, settling at a rust world — phases as glow-nodes, not labels — *"the whole journey, one line"* |

---

## 6. The /science landing hero (Option 1)

The landing page currently has **no hero**. Add one in this style, but *grander* — it's the
overture to the whole encyclopedia, so it may combine motifs (a sun-system + a transfer arc +
distant galaxy) rather than a single chapter's.

- **Aspect:** wide cinematic banner — target **~16∶6 to 21∶9** (e.g. 1600×600 or 1920×640),
  responsive-cropped. Confirm exact bleed against the landing layout before final.
- **Composition:** the full poetic vocabulary at once — off-center glowing sun, tiered orbit
  rings, one cyan focal arc, a scatter of worlds receding, sparse stars, deep `#04040c` field.
- **Caption:** one whisper-line, landing-scale, lower corner. Candidate voice:
  *"everything moves"* / *"the sky, explained"* / *"vast, and knowable"* (pick at gen time).
- **Format:** WebP. (Covers are currently SVG; the colophon manifest auto-scans `*.svg` —
  going raster touches `science/[tab]` cover markup + `build-original-work.mjs`. The landing
  hero is a *new* asset so it has no such constraint — render it freely.)
- **LOCKED 2026-06-23:** `landing-hero-2` — flat overture (sun + tilted rings + cyan arc + faint
  galaxy), generated via the §7 locked-reference method. Vast right-side void for `h1` + lede.
  Staged at `/tmp/sci-render/LOCKED/_science-landing-hero.png`. New asset → wire straight into
  `src/routes/science/+page.svelte` `.hero` (no manifest conflict).

---

## 7. Higgsfield generation recipe — VALIDATED METHOD (2026-06-23)

**Do NOT elevate the style.** A detour tried "premium / luminous / atmospheric depth" renders
(nano_banana, nebula haze, 3D-ish sun) and a hand-authored SVG uplift — both were rejected as
*worse than the originals*. The loved flat covers are good **as they are**. The job is only to
bring the diluted covers up to the *same* flat language — faithful family-matching, not elevation.

**The method that worked — locked multi-reference conditioning:**

1. **Lock 3 loved covers as a combined style reference.** Render `_cover-scales-time`,
   `_cover-orbits`, `_cover-transfers` at ~1200px wide on a `#04040c` field; `media_upload` +
   `media_confirm` each; pass all three as `medias:[{role:'image'}]`. Multiple refs average the
   *style* so the model doesn't clone a single *composition*.
2. **Model:** `nano_banana_2` (Higgsfield routes it to `nano_banana_flash` — fine). It honors
   image references hard, which is what locks the flat look. Recraft `vector` mode outputs real
   SVG but couldn't take a reference image → drifted; not used for the series.
3. **Aspect `21:9`, resolution `2k`, count 2–3** per subject. ~1 credit each. Output is **raster
   PNG** (3168×1344 ≈ the covers' 2.31∶1) — mixed-format vs the SVG originals, but visually identical family.
4. **Prompt template** (the load-bearing part is the style-lock preamble + per-subject motif):
   > A chapter cover illustration in the EXACT same flat 2D minimalist vector style as the
   > reference images — same deep near-black navy field (#04040c), same thin delicate white
   > elliptical orbit lines, same single soft cyan-teal (#4ecdc4) accent, same sparse faint stars,
   > same restraint and vast negative space. Strictly FLAT 2D, NO 3D, NO realistic shading, NO
   > photographic rendering, NO nebula, NO texture. **Subject for THIS cover ([chapter] — [§5
   > celestial translation]): [bespoke composition].** No text, no labels, no numbers, no icons,
   > no rockets, no spacecraft hardware, no human figures, no boxes, no charts, no wireframes.

**Negative / must-not:** rockets, spacecraft hardware, wireframes, boxes, bar charts, timelines,
monospace text, UPPERCASE labels, arrows, busy starfields, photoreal 3D, nebula haze, lens flare,
logos. **Caption is overlaid in-app, never generated** — image models garble text.

**Per-subject note — `life-in-space`** broke the family's cyan-only rule on purpose: its concept
is *"we are stardust"* — an amber star shedding glowing dust that coalesces into a green+blue
cluster around a **carbon hexagon**. Green is an intentional, meaningful palette extension for
*life*; warmth/green = life is the whole point. When a subject has a real reason to bend the
palette, bend it — but only for a reason this strong.

**Acceptance checklist (every generation):**
- [ ] Field reads `#04040c`, flat 2D, no 3D/nebula/photoreal
- [ ] Single accent (cyan — or amber/green only with a §-strong reason)
- [ ] Negative space ≥ ~50%
- [ ] Zero text/icons/boxes/labels baked in
- [ ] Sits beside `scales-time` / `orbits` / `transfers` without looking foreign
- [ ] Reads as its subject (the diluted original's meaning, re-told celestially)

**Locked set (6 diluted covers re-done, 2026-06-23):** history, mission-phases, propulsion,
space-stations, observation, life-in-space. Staged as raster at `/tmp/sci-render/LOCKED/` pending
the format + wiring decision (§8).

---

## 8. Wiring & format — OPEN DECISION

The 6 re-done covers are **raster PNG (21:9, 3168×1344)**; the live covers are **SVG**
(`static/diagrams/science/_cover-{tab}.svg`, 600×260). Installing the new set touches:

- **Cover markup** — `src/routes/science/[tab]/+page.svelte` hard-codes
  `/diagrams/science/_cover-{tab}.svg`. The 6 raster covers need either `.webp` with an
  extension-aware path, or per-tab format handling.
- **Colophon manifest** — `scripts/build-original-work.mjs` auto-scans `*.svg` in
  `static/diagrams/science/`. Raster covers won't be picked up unless the scan + the colophon
  "Science Diagrams" grid (`src/routes/colophon/+page.svelte`) learn about non-SVG covers.
- **Optimization** — 2K PNG is heavy; convert to `.webp` (and a mobile-tier variant) before ship.
- **Captions** — overlay the serif whisper-caption in-app (not on the raster), per §4/§6.

Two clean resolutions: **(a)** keep raster for the 6 new + SVG for the 5 loved (mixed, smallest
change), or **(b)** trace the raster to SVG to keep the whole set one format (more work, uniform
pipeline). Decision pending; do not wire in until chosen and per-image approval is on record.

---

*Single source of truth for science cover art. Update the version line + date on any change.
Linked from the asset pipeline; pair with `docs/anatomy-art-runbook.md` for the broader art system.*
