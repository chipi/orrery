# UXD-045 — INDEX rows: the type is a 14 px glyph with a tooltip, the name keeps the row's width

- **Status**: accepted (built; unit and e2e tests green, see Verification)
- **Date**: 2026-11-15
- **Decider**: the operator, 2026-11-15 — "Maybe the type of item should be a small item with a tooltip, and we get the space for the full name to render."
- **Answers**: L46 follow-up (names cut at "M13 · Hercules G…")
- **Builds on**: [UXD-017](UXD-017-one-index-on-every-scale.md) (one INDEX, one row component), [UXD-025](UXD-025-lists-carry-a-round-photo.md) (the 28 px photo that took 36 px from the name)
- **Changes**: `src/lib/explore/index-kind-glyph.ts` (kind to glyph), `src/lib/components/IndexKindGlyph.svelte` (the 14 drawings), `ScaleIndex.svelte` (the glyph, `data-tip`, hidden text), `src/lib/styles/index-panel.css` (`.si-kind`), tests (`index-kind-glyph.test.ts`, `scale-index.spec.ts`). No string, image or dependency changed.

## Context

The type text ("Globular cluster", "Star-forming region") sat beside the name and kept up to 45% of the 320 px row. After the flex fix 7d24947025a 44 of the 209 neighbourhood rows still cut the name; before it 98 did.

## Decision

1. **The type is a glyph** at the row's end (after the name, before the badges), 14 px, `currentColor` on `--color-state` (the colour the text had), on every scale except the solar system (its two-line meta is distance and size, not a type) and the Local Group (its meta is the group line).
2. **14 drawings, none reused**: no object-type glyph existed in the repo (the scale and route glyphs are 48 px level and route cards): star, galaxy (also satellite and dwarf galaxies), cluster (star cluster, galaxy cluster, concentration), globular, nebula (also star-forming region, dark nebula, cloud), shell (planetary nebula, supernova remnant), group, network (supercluster), wall, void, attractor, black hole, spiral arm, other. The exact type is always the label; a glyph that shares a type with a sibling is never the only carrier.
3. **Tooltip and accessible name.** The exact localized type is `data-tip`, drawn as a small card inside the row (so the list's scroll box does not clip it) on hover of the glyph and on keyboard focus of the row; for a screen reader it is hidden text after the name ("M13 · Hercules Globular Cluster, Globular cluster"). Meaning is never colour-only.
4. **A star keeps its constellation as text** before its star glyph: the constellation is information, not the type.
5. Row height and photo slot are unchanged. RTL follows the row's direction (the tooltip opens toward the name on both sides).

## Not done here

- No tooltip on touch: a tap selects the row; the type is in the panel that opens. The glyph alone does not say the type to a sighted touch reader.
- The Local Group rows still show the group line, not a type glyph.

## Verification

31 of 209 neighbourhood rows still cut the name at 320 px (28 deep-sky names long in themselves, 3 stars with a constellation); 44 before this change. `index-kind-glyph.test.ts` 22 passed; `scale-index.spec.ts` 45 passed on desktop-chromium against the shared dev server.
