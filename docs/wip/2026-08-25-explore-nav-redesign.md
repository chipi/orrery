# /explore nav redesign — #45 (mockup for approval)

Status: **mockup, awaiting operator approval before implementation.**
Visual: `2026-08-25-explore-nav-redesign-mockup.png` (before/after, neighborhood + Milky Way).

## The problems (operator report, on-device)
1. **Breadcrumb is redundant with the scale picker.** The top breadcrumb
   (`.context-crumbs`) names the current scale ("Solar System › Stellar
   Neighborhood"), and the bottom-right picker (`ExploreScalePicker`) names the
   *same* thing ("STELLAR NEIGHBORHOOD ▾"). Two controls, one message.
2. **Picker overlaps the distance legend.** Bottom-right, the picker sits on top
   of / merged with the scale-hud ("the picker goes over it", "the distance
   became too fat").
3. **Scale readout placement is inconsistent across scales.** Solar/neighborhood
   show the rich `.scale-hud` (KM/AU/LY/PC + readout + bar); Milky-Way+ show a
   different **footer strip** ("~30 kpc across · SCALE · Learn more"). Different
   place, different style.
4. **Hanging speaker** — the audio/speaker control reads as a floating orphan; it
   is itself hierarchical (acts like a breadcrumb). *(Not yet located precisely;
   see open question 2.)*

## The redesign
- **Drop the breadcrumb** (`.context-crumbs`) entirely.
- **Promote the scale picker to a persistent top navigator** (just under the nav
  bar, always visible on every scale). It becomes "where am I + jump":
  - `‹` — back one level (walks out one shell; replaces the breadcrumb's back).
  - `◉ <Scale name> ▾` — names the current scale + dropdown to jump to ANY scale
    (Solar System → Neighborhood → Milky Way → Local Group → …). Replaces the
    breadcrumb's per-level jumps AND the old bottom-right picker.
  - `⟲` — reset view (shown only when `scaleResetVisible`; replaces the
    breadcrumb's reset crumb).
- **One consistent scale strip at the bottom**, same position + style on EVERY
  scale — only the content adapts:
  - Solar/neighborhood: `[KM|AU|LY|PC]  1.04 ly ≈ 0.32 pc  ▬▬▬ 0.158 ly · light 381 days`
  - Milky-Way+: `~30 kpc across  ~100,000 ly  ▬▬▬  schematic · Learn more →`
  - Because the picker moved up, the strip no longer collides with it (fixes #2),
    and it's the same element everywhere (fixes #3).

## Why this is not a pure delete
The breadcrumb carries **three functions** that must be re-homed, not lost:
back-navigation, per-level jumps, and **Reset View**. The mockup folds all three
into the promoted picker (`‹` / `▾` / `⟲`). That's the main design decision to
confirm.

## Open questions for the operator
1. **Reset + back placement** — OK to put `‹ back` and `⟲ reset` flanking the
   picker as drawn? Or keep reset elsewhere?
2. **The "hanging speaker"** — which control exactly? (audio toggle? the `~` nav
   icon?) Once identified, fold it into the same top row or remove the float.
3. **Unifying the scale strip** across all 8 shells is the biggest code change
   (solar/neighborhood use `.scale-hud`; Milky-Way+ use a per-shell footer with
   different data). Ship it as one component, or keep two and just align their
   position/style? (Mockup assumes one unified strip.)

## Implementation notes (once approved)
- Remove `.context-crumbs` block (`+page.svelte` ~2577–2673) + its CSS.
- Reposition `ExploreScalePicker` to a top container; add `‹` / `⟲` affordances
  (wire to the existing `exit*Fn` chain + `resetCurrentScale`).
- Consolidate `.scale-hud` (2830–2868) + the Milky-Way footer into one bottom
  strip component, driven by `scaleReadout` + per-shell context.
- Verify at solar-system / neighborhood / milky-way (+ one deep shell) on a
  390 px viewport before committing.
