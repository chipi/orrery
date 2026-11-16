# UXD-033 — Program rosters: a row that names an entry links to it, hardware lists are filled, episodes sit under Milestones

- **Status**: accepted (built; checked by unit tests, e2e on three projects and screenshots, not yet by the operator)
- **Date**: 2026-11-14 (proposed 2026-11-13, decided and built)
- **Decider**: the operator, 2026-11-14 — the recommendations of `docs/wip/2026-11-13-slice-E2-brief.md` §12 approved as written (E-decisions 5a, 6a, 7a, 8a, 9a, "approved all E-series recommendations")
- **Answers**: PG7, PG8, PG9 of the UX feedback plan; slice E2
- **Builds on**: [UXD-032](UXD-032-program-page-card-rails-and-compact-hardware.md) (the sections and cards of the page)
- **Changes**: `static/data/programs/*.json` (33 files), `src/types/program.ts` (`ProgramRosterLink`, `link`, `milestone`), `src/lib/program-page.ts` (`milestoneRows`, `rowPath`, the `milestones` section), `src/routes/programs/[id]/+page.svelte`, `+page.server.ts`, `+page.ts`, `static/data/schemas/program.schema.json`, `messages/*.json` (`program_section_milestones`), `src/lib/programs-roster.test.ts` (new), `tests/e2e/programs-roster.spec.ts` (new)

## Context

Of 291 roster rows, 109 named something without linking to it. 14 of those named an entry that exists (Apollo 1, 7 and 9, Huygens, Viking 1, Mariner 10; Challenger, Columbia, Compton, Gaia, Euclid, Viking 2, N1, Columbus). Nine programs had no hardware row though the fleet holds their craft (Cassini, Voyager, Pioneer, Galileo, New Horizons, the Mars rovers). Cassini's "four missions" were one mission and three segments, and 56 of 126 missions sat in no roster.

## Decision

1. **A row that names an existing entry links to it (5a).** A name-only row about a mission becomes a linked row (`linked_id` + `ref: mission`, year and note kept). A name-only row about a craft or a station module keeps its name, year and note and gains `link: { ref: 'fleet' | 'module', id, station? }`; a module link names its station (`iss` | `tiangong`), so Columbus under `esa-human` opens `/iss?module=columbus`. `rowPath(programId, row)` builds the path for every row kind. Flights of a craft (Gemini 1, Shenzhou 5, Lunar Orbiter) stay context: they are flights, not the craft.
2. **Hardware is what the program's missions flew (6a).** A fleet entry reached through a linked mission's `fleet_refs` is a hardware row if it is a launcher, a spacecraft, a lander, an orbiter or a rover; launch sites are left out. Sputnik, Commercial stations and ROS stay without hardware (Sputnik's rocket in the fleet is Vostok's R-7) and draw no Hardware section. The card's name is the entry's own, in the page's locale (`fleetNames`, from the server load), not a capitalised id.
3. **Missions that exist join the roster (7a).** Luna 9, 10, 16, 17, 21 (Soviet lunar), Giotto, Rosetta, Juice, BepiColombo, SMART-1 (Ariane), Galileo, Ulysses, Magellan (Space Shuttle; the mission files name the Shuttle as vehicle), Mariner 4 and 9. Missions that do not exist (Kaguya, Chandrayaan-2, STS-1, Artemis I) are not added; they go to the content stream and the mission runbook.
4. **Milestones (9a).** `milestone: true` marks a name-only row that is an episode, phase, decision or plan inside the program, not a flight, a craft or a test. It is drawn under a **Milestones** heading right after Missions (order: Missions, Milestones, On the surface, Hardware, Related programs, Go deeper, Sources), as the same timeline without a pane or a card; a program with no mission row draws only Milestones. A milestone row has no link.
5. **Mission rows show the mission's own name** (`missionDetails[id].name`, localised) instead of a capitalised id (`viking1` read "Viking1").
6. **Dispatch debt (8a).** Linking does not wait for a dispatch; the targets that have none are on the deferred list (`docs/wip/2026-11-13-slice-E2-brief.md` §2.5 counts them).

## Consequences

- One new key, `program_section_milestones`, in 14 locales, shown only where a program has milestones. The glossary has no entry for the word; each locale's form follows its existing "historic milestone" string.
- Roster `name`, `role` and `note` stay English in every locale (unchanged).
- `programs-roster.test.ts` guards the data: every `linked_id` and `link` resolves, no name-only row equals an existing mission, craft or module name, no entry is listed twice in a program, every linked mission has a thumb, a milestone row names no entry.
- A program whose earliest linked mission changed opens its pane on that mission (Apollo: Apollo 1).
