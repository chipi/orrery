# UXD-032 — The program page: no empty sections, card rails, compact hardware, a mission pane that keeps its box

- **Status**: accepted (built; checked by unit tests, e2e on three projects and screenshots, not yet by the operator)
- **Date**: 2026-11-14 (proposed 2026-11-13, decided and built)
- **Decider**: the operator, 2026-11-14 — the recommendations of `docs/wip/2026-11-13-slice-E1-brief.md` §12 approved as written (E-decisions 1a, 2a, 3a, 4a, "approved all E-series recommendations")
- **Answers**: PG2, PG3, PG4, PG5, PG6 of the UX feedback plan; slice E1
- **Builds on**: [UXD-012](UXD-012-one-page-shell.md) (the page shell and section label), [UXD-025](UXD-025-lists-carry-a-round-photo.md) (the round photo, which this record departs from for hardware on this page)
- **Changes**: `src/routes/programs/[id]/+page.svelte`, `+page.server.ts`, `+page.ts`, `src/lib/program-page.ts` (new), `src/lib/components/MiniCard.svelte` and `CardRail.svelte` (new), `src/lib/entity-thumb.ts` (`heroOfThumb`, `siteHeroOf`, `fleetHeroOf`), `src/lib/image-sizes.ts`, `src/types/program.ts` (`ProgramSeeAlso.kind` widened to the six kinds the data has), `tests/e2e/programs-page.spec.ts` (new)

## Context

Sputnik drew a "Hardware" heading over an empty list (9 of 42 programs have no hardware row). Related programs were plain English-slug links ("Esa Human") after "Go deeper"; surface sites were text rows; hardware was a grid of round 28 px photos; the mission pane changed height with the length of the blurb. Nine surface sites on Earth linked `/earth?site=<id>`, a parameter Earth reads only for launch pads (its objects read `object`).

## Decision

1. **A section with no rows draws nothing, label included.** `programSections(p)` returns the sections that have rows, in order: Missions, On the surface, Hardware, Related programs, Go deeper, Sources (the spine and the assembly section are unchanged above them).
2. **One MiniCard for both rails (E-decision 1a).** 176 px wide: a 16:9 hero, a one-line kind label (the world for a surface site, the agency for a program), a one-line title (Bebas 20 px, ellipsis), an optional one-line meta (a program's years). Border, radius and hover edge are the programs index card's. `CardRail` scrolls it sideways (native scroll, snap `proximity`, no arrows), its accessible name the section label. Names come from the program overlays, so they are localised.
3. **"Go deeper" drops its `program` rows (E-decision 2a)** at render: every one repeats a related program. The data keeps them.
4. **Hardware is compact cards (E-decision 3a).** 56 px tall, a rectangular 72×48 mini hero at the left (the fleet entry's blessed gallery slot, as it is), the name over the role. This departs from UXD-025 on `/programs/<id>` only: hardware has no round photo here; the mission rows keep their round photos and patches, and every other list keeps the round thumb.
5. **The mission pane keeps its box (PG4).** Meta and name are one line with an ellipsis (the full text in `title`), the blurb reserves three lines (clamped at three), so the pane has one height for every mission.
6. **Earth surface links use `?object=` (E-decision 4a)**: `surfaceSiteHref`. Moon, Mars and Venus keep `?site=`.
7. **No hero image is changed.** Each card uses its entity's existing hero. Card data (heroes, rail cards) is resolved on the server so the route's JS budget does not grow by the thumbs manifest or the programs index.

## Consequences

- No new message key (the rails reuse `programs_related` and `programs_on_surface`).
- Surface-site titles that are longer than one line at 176 px are cut with an ellipsis (the full label in `title`).
- The hardware role stays English in every locale (roster text is not translated; unchanged).
