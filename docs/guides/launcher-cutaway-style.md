# Launcher exploded-cutaway art — generation recipe (FROZEN)

The house recipe for the **exploded-stage cutaway** of a launch vehicle — a
richer companion to the single pencil anatomy sketch. Locked with Marko
2026-08-02 after the Saturn V anchor (v3). Match it exactly so the batch reads
as one hand and sits happily next to the existing `/images/anatomy/*` cutaways.

The look = the **watercolor cutaway** style of the shipped anatomy set
(apollo-csm, cassini): watercolor + ink-wash on aged graph paper, warm metallic,
margin physics equations, vintage agency markings.

---

## 0. Golden rules (this is where drift dies)

1. **Model:** always `nano_banana_pro`. **Aspect:** `3:2`. **Resolution:** `2k`.
2. **Always pass the per-launcher structural SVG sketch as the reference image**
   (`medias:[{value, role:"image"}]`). It carries the composition, the stage
   count, the exact engine counts, and the labels. Text alone will not hold them.
3. **PROPORTION IS THE THING WE GOT WRONG TWICE — do not repeat it.**
   - Each exploded stage is a **TALL, SLENDER cylinder** at its real aspect
     (S-IC ≈ 4:1, upper stages ≈ 2.5:1). **Never short-and-fat / squat.**
   - Segments follow the **same proportion as the assembled reference stack at
     left** — they are the same rocket pulled apart, not re-drawn boxes.
   - The prompt MUST keep the clause: *"preserving the tall-and-narrow
     proportions of every stage (do NOT make them short or fat)."*
4. **Composition (all three, every time):**
   - **Left:** a small **assembled reference rocket in true proportion** + a
     tiny **human silhouette** (1.8 m) beside it + a total-height dimension line.
     This is the size anchor.
   - **Right:** the pieces **exploded apart in two columns** so each is large +
     un-squished (big stages in one column, upper pieces/payload in the other).
   - Every stage **cut open** to show its LOX + fuel tanks; engines drawn at the
     base in the **exact count**; fairing/payload + boosters where the vehicle
     has them.
5. **Vintage, free-to-use agency markings.** Lean into the retro **NASA "worm"
   and "meatball"** (and each agency's period logo) — public-domain era
   markings, flags, stencilled serials. More of that = more awesome (Marko).
6. **QC every render** against the Saturn V anchor + the anatomy set before
   committing. Wrong engine count or squat stages → regenerate.

## 1. The palette / background

Aged cream **graph paper** with foxing/ink-splatter; warm muted **metallic**
(brass, steel, copper); handwritten annotations + thin ruled leader lines;
**faint physics equations in the margins**; vintage scientific-sketchbook /
editorial-infographic aesthetic. (Same family as the watercolor anatomy recipe
in `anatomy-art-runbook.md` §2 — this is the exploded, multi-stage extension.)

## 2. The locked prompt template (swap the [bracketed] parts)

```
Exploded technical cutaway illustration of the [VEHICLE] rocket, watercolor and
ink-wash on faint aged graph paper, exposed internal structure. Follow the
reference layout EXACTLY, preserving the tall-and-narrow proportions of every
stage (do NOT make them short or fat): at far left a small assembled
scale-reference rocket in correct proportion with a tiny human figure beside it
and a '[HEIGHT] m' dimension line; the stages exploded apart in two columns,
each stage a TALL SLENDER cylinder cut open to reveal its tanks with the engines
drawn at the base. Exposed internals: propellant tanks, turbopumps, engine
bells[, strap-on boosters]. Handwritten engineering annotations, thin ruled
leader lines, dimension lines, faint physics equations in the margins,
ink-splatter wash clouds, warm muted metallic palette (brass, steel, copper on
cream paper), vintage scientific sketchbook / editorial infographic aesthetic.
Vintage [AGENCY] markings (retro logo, flag, stencilled serials). KEEP the
engine counts exact ([PER-STAGE COUNTS]), the cut-open [PROPELLANT] tanks, and
every label legible and in place: [LABELS]. A warm hand-painted sketchbook
cutaway — not a flat vector chart, not photorealistic.
```

## 3. Pipeline

1. `node scripts/essays/build-cutaway-sketches.mjs` — data-driven from
   `src/lib/orbital/launcher-engines.ts` (stages, engine counts, arrangement,
   boosters) + `engine-registry.ts` (propellants). Emits one structural SVG +
   PNG per launcher to `docs/wip/essay-diagram-sources/launcher-cutaways/`.
2. Upload each PNG (`media_upload` → PUT → `media_confirm`), generate with the
   template above (up to 8 concurrent, poll `job_status sync:true`), 2 credits
   each.
3. Download raw PNG → `original-assets/launcher-cutaways/<id>.png` (committed
   backup) → resize webp to `static/images/anatomy-exploded/<id>.webp`
   (`sharp().resize(1600).webp({quality:86})`).
4. Wire into the fleet DETAIL tab **alongside** the pencil anatomy (a second
   view, not a replacement). Generated art → no provenance row (Orrery-original).

## 4. Where things live

| Thing | Path |
|---|---|
| Structural sketches (input) | `docs/wip/essay-diagram-sources/launcher-cutaways/*.svg` |
| Generated originals (backup) | `original-assets/launcher-cutaways/*.png` |
| Served display images | `static/images/anatomy-exploded/*.webp` |
| Sketch generator | `scripts/essays/build-cutaway-sketches.mjs` |
| Reference anchor | Saturn V v3 (`saturn-v-exploded`) — the north star |

## 5. Manual exceptions — do NOT regenerate these from the generator

The `build-cutaway-sketches.mjs` generator encodes ONE model: an **in-line
tandem stack** (cylindrical stages atop each other, tank split + engine bells
per stage, one representative booster, a fairing+payload cone on top). That is
correct for ~70% of the fleet but structurally WRONG for vehicles that deviate.
These 7 were **hand-authored from corrected prose** (2026-08-02), anchored to
the Saturn V for style, and passed NO generator sketch. Re-running the generator
for them would reintroduce the wrong geometry — edit the prose instead.

| id | Why the generator is wrong | Corrected to |
|---|---|---|
| `space-shuttle-stack` | Side-mount, not a tandem stack | Orbiter (3× RS-25) + External Tank (no engines) + 2 SRBs, exploded |
| `soyuz` | Strap-ons cluster around the core, not stacked | Korolev cross — 4 conical boosters around Blok-A core |
| `vostok-k` | Same, + spherical capsule not a fairing | Korolev cross + spherical Vostok capsule |
| `voskhod-11a57` | Same cluster | Korolev cross around the core |
| `titan-ii-glv` | Flew a bare capsule, no fairing | Bare Gemini capsule on top, no clamshell |
| `atlas-lv-3b` | Bare capsule + escape tower, no fairing | Mercury capsule + escape tower, stage-and-a-half |
| `mercury-redstone` | Bare capsule + escape tower, no fairing | Mercury capsule + escape tower, single stage |

The corrected prose for each lives in the git history of this session; regenerate
from that, not from a generator sketch.
