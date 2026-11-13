# Slice E1 brief — the program page: no empty sections, card rails for related programs and surface sites, compact hardware cards, a mission pane that keeps its height (PG2, PG3, PG4, PG5, PG6)

Read-only brief, written at HEAD `07ef5237c7a` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and read-only node scripts over `static/data/` (scratchpad `ebr-spine.mjs`, `ebr-related.mjs`, `ebr-seealso.mjs`, `ebr-sites.mjs`, `ebr-sites2.mjs`, `ebr-heroes.mjs`, `ebr-blurb.mjs`, `ebr-detail.mjs`, not in the repo; their output is quoted). Nothing was built, run in a browser or measured on screen; every row count of text below is arithmetic (§13). No code was changed. The working tree holds other agents' uncommitted edits: not touched. The slice has no open operator question in the plan (`CHANGE-INVENTORY.md` line 73: "Waits on: —"), so the forks in §12 are about shape and scope. The roster data (PG7 to PG9) is slice E2; E1 reads the roster as it is.

## 0. Answer first

1. **Sputnik's empty section is a heading with nothing under it, and it is one of nine.** `+page.svelte:305` always draws the "Hardware" `h2` and `:306-316` an empty `ul` when the program has no `ref: 'fleet'` row. `ebr-spine.mjs` finds 9 of 42 programs with no hardware row (commercial-stations, ros, sputnik, voyager, cassini, pioneer, galileo, new-horizons, mars-rovers); no other section can be empty (the six spine lists are never empty on any of the 42; assembly, surface, see-also, related and sources are already behind `{#if}`). E2 links hardware for six of the nine, so after E2 three stay empty (sputnik, commercial-stations, ros): the rule "an empty section draws nothing, label included" is still needed.
2. **The related programs are plain links with English slugs.** `:352-361` prints `pretty(rid)` (`:68-87`: capitalises the id: "Esa Human", "Jaxa Robotic", "Mars Rovers"), not the program's name from its overlay, so the 111 related links (42 programs, 1 to 8 each) are not localised and have no picture. All 111 targets exist and have a hero (`ebr-related.mjs`: target missing 0, without hero 0). The section is last but one, after "Go deeper"; the plan wants it above.
3. **The surface sites are a text list, and 9 of 27 links may point nowhere.** `:319-335` renders `surface_sites` (27 rows on 14 programs, all 27 ids exist in the Worlds' site data, all 27 have a photo slot in `entity-thumbs.json`) as bordered text rows. For the 9 rows with `surface: 'earth'` (iss, tiangong, starlink, kuiper, hubble, chandra, jwst, gaia, xmm) the link is `/earth?site=<id>` (`:325`) while `SurfaceScene.svelte:1764` reads `site` for sites and `:2234` reads `object` for Earth objects: read, not run (NV3). It sits after Hardware today; the plan wants it after Missions, before Hardware.
4. **The mission pane changes height with the blurb.** The `aside.detail` (`:279-302`) is hero 16:9, a meta line, a name and `d-blurb` of one to three lines (`ebr-blurb.mjs`: 70 linked missions, blurb 23 to 146 characters, median 72, none over three lines at about 62 characters a line). Mercury's six missions estimate at 3 or 4 text rows (`ebr-detail.mjs`); 11 of 26 programs with a pane would change height between their missions, by up to two rows. That is the plan's "1 vs 2 rows" (the operator saw the blurb; the meta line is one row for all 70 by the same estimate).
5. **Recommendation:** (a) every section draws only when it has rows (Hardware first); (b) a shared `MiniCard` in a `CardRail` for related programs and surface sites, same size and look (Decision 1); (c) hardware as compact horizontal cards with a rectangular mini hero at the left; (d) the pane gets a reserved box: meta one line, name one line, blurb three lines, link last; (e) section order Missions, On the surface, Hardware, Related programs, Go deeper, Sources; the 35 "Go deeper" rows of kind `program` (all 35 repeat a related program) leave the list.
6. **No data change in E1, no image, 0 new keys** (the rails take the existing section labels as their names). One new UXD record, Design System and READMEs, one new e2e spec on three projects.
7. **Needs the operator before code:** nothing blocks; 4 forks in §12 (numbers 1 to 4 of the E series).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 227-237; slice row 375)

| ID | Text | State at HEAD |
|---|---|---|
| PG2 | "Good overall. Sputnik's hardware section is empty: hide an empty section and its label." | Heading and empty list drawn on 9 programs (§2.1). |
| PG3 | "Related programs more visual: a rail of mini cards from the programs page instead of plain links, placed above 'Go deeper in Orrery'." | Plain, unlocalised links, after "Go deeper" (§2.2). |
| PG4 | "Missions: reserve the right side so it doesn't jump between missions (Mercury: sub-heading text 1 vs 2 rows)." | The pane has no reserved height (§2.4). |
| PG5 | "Surface sites: a card rail with surface cards inspired by the landing-zone panels, reusing their hero, same style and size as the mini cards; after Missions, before Hardware." | Text rows after Hardware (§2.3). |
| PG6 | "Hardware as smaller compact cards: rectangular, low height, mini hero on the left." | A grid of round 28 px photos with name and role (§2.5). |

Done when (plan row 375): "shots of Sputnik, Apollo, Cassini, Mars rovers".
Plan wording that is outdated: PG6 asks for a "mini hero"; L45-T4 (UXD-025, built today) put a round 28 px thumb on these rows, so the hardware part of that decision is superseded by PG6 (Decision 3); the mission timeline keeps its round thumbs and patches (the plan row says "compact hardware cards", not the timeline).

## 2. Current state (file:line at `07ef5237c7a`; `src/routes/programs/[id]/+page.svelte` unless said)

### 2.1 The page spine and what can be empty

Order today: hero `:163-195`, six spine sections `:97-104` and `:197-220`, assembly `:222-247` (`{#if modules.length}`, ISS and Tiangong only), Missions `:249-303`, Hardware `:305-316` (inside `section.roster`, heading unconditional), On the surface `:319-335` (`{#if p.surface_sites?.length}`), Go deeper `:337-350` (`{#if p.see_also?.length}`), Related programs `:352-361`, Sources `:363-370`. Counts from `ebr-spine.mjs`: spine lists empty on 0 of 42, surface sites empty on 28 of 42, hardware on 9 of 42, missions on 0.

### 2.2 Related programs and "Go deeper"

`related_programs` has 111 links, all resolving to a program with a hero (`ebr-related.mjs`); 43 of 111 are one-way (the target does not link back). `see_also` has 106 rows (body 30, program 35, fleet 23, science 10, explore 7, gallery 1); **all 35 `program` rows repeat an entry of `related_programs`** (`ebr-seealso.mjs`: "also in related_programs 35; not in related 0"). `types/program.ts:36-40` types `ProgramSeeAlso.kind` as `'body' | 'science' | 'explore'` while the data and `LINK_KIND` (`:40-47`) also use fleet, gallery and program: the type is narrower than the data.

The programs index card (`routes/programs/+page.svelte:150-179`, CSS `:246-300`) is a 300 px minimum card: 16:9 hero, agency badge and years, a 28 px Bebas title, a tagline. It is the source the plan means by "mini cards from the programs page"; there is no shared component (`git grep -ni "mini-card\|MiniCard"` finds none).

### 2.3 Surface sites

`surface_sites` rows: `{ surface, site, label }`, 27 rows on 14 programs (apollo 2, soviet-lunar 3, change 3, viking 3, mars-rovers 5, mangalyaan 1, mariner 1, iss, tiangong, starlink, kuiper, jwst 1 each, great-observatories 2, esa-science 2). `ebr-sites.mjs`: every id exists in the Worlds' data; 27 of 27 have a slot in `entity-thumbs.json` `sites` (`moon`, `mars`, `earth-objects`). The slot fragment (`missions/apollo15/02`) is also the path of the full hero (`/images/<fragment>.webp`; `entity-thumb.ts:45-55` builds the 192 px crop from it), so a 16:9 card needs no new file. `ebr-sites2.mjs`: programs whose roster mission has a Worlds' site the program does not list: apollo (apollo11, 12, 14, 17), artemis (artemis4), jaxa-robotic (slim), chandrayaan (chandrayaan1, 3), change (change1, 5, 6): 12 sites, a data question for E2's review, not E1.

### 2.4 The mission pane

`.roster-split` is a grid `minmax(190px, 250px) 1fr` (`:549-568`); the pane `.detail` is sticky (`:586-594`), `.d-hero` 16:9 (`:595-600`), `.d-meta` Space Mono label (`:601-608`), `.d-name` Bebas 30 px (`:609-614`), `.d-blurb` 14 px / 1.55 (`:615-620`), `.d-open` link (`:621-627`), `.d-empty` (`:628-632`). The page is `page-shell--reading` (760 px, `page-shell.css:11`), so the pane is about 440 to 500 px wide beside the timeline. Under 640 px it stacks under the timeline (`:563-568`), so a taller pane pushes the Hardware heading down. `+page.ts:30-45` builds `blurb: mission.first ?? mission.description`.

`ebr-detail.mjs` (arithmetic: meta 54, name 22, blurb 62 characters a line; not rendered): 26 programs have a pane; in 11 the estimated total text rows differ between the program's missions (largest spread 2: mars-rovers 3 to 5 rows from opportunity's 134-character blurb; hayabusa 4 to 6). Mercury: freedom-7 blurb 23 characters (1 row), liberty-bell-7 86 (2 rows).

### 2.5 Hardware

`:305-316`: `ul.hardware`, grid `repeat(auto-fill, minmax(180px, 1fr))` (`:726-755`), each `li` a 28 px `EntityThumb` (`fallback="none"`) and the name with the role label. 88 hardware rows over 81 distinct fleet entries, 88 of 88 with a gallery hero and a thumb (`ebr-heroes.mjs`), the largest list apollo 10, salyut 7, tiangong 6. The link is `href(r)` (`:89-95`): `/fleet?id=<id>&from=program:<program>`.

### 2.6 Tests that touch the page

`entity-page-thumbs.spec.ts:72-83` (apollo: at least 8 thumbs, lazy and decorative, a patched row keeps its patch: it counts the hardware thumbs, so it changes), `page-shell.spec.ts:30-31` (`/programs`, `/programs/apollo` at 760), `a11y.spec.ts:74` (apollo), `chip.spec.ts` (programs group-by only), `visual.spec.ts:126-128` (the index header only), `data.test.ts:1326-1380` (loaders). No spec asserts a section's presence, order or the pane's height.

## 3. Screenshot list (before the build and again after; no browser was used for this brief)

Desktop 1440×900 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), phone 844×390 (`mobile-landscape-chromium`), `en-US`; one `de` shot of a related rail (long names, localised):
1. `/programs/sputnik`: before, a "Hardware" heading over nothing; after, no heading (and no empty block).
2. `/programs/apollo`: the whole page top to bottom, section order; the surface rail (Apollo 15, 16) and 10 hardware cards.
3. `/programs/cassini`: before and after E2, hardware empty then one card.
4. `/programs/mars-rovers`: five surface cards in a rail (scrolls at 390), hardware empty (after E2: five rovers).
5. `/programs/mercury`: all six missions selected in turn, three frames each, the pane's box outline kept still (the PG4 proof).
6. Related rail on `/programs/voyager` (de): names and heroes from the overlays.
7. `/programs/iss`: the Earth surface card opens `/earth` with the ISS selected (Decision 4).

## 4. Proposal

### 4.1 Sections draw only with rows (PG2)

`:305-316` moves inside `{#if fleet.length}` (heading included). A small pure `programSections(p, ...)` in `src/lib/program-page.ts` returns the ordered list of sections that have rows, so the order and the hide rule are one tested function instead of nine inline `{#if}`.

### 4.2 Two shared parts (PG3, PG5, PG6)

- `MiniCard.svelte`: a link card, 176 px wide: a 16:9 hero (`responsive()`, `IMAGE_SIZES.card`), a one-line kind label (Space Mono 11 px, the label colour), a title (Bebas 20 px, one line, ellipsis), a one-line meta (years or place). The programs index card's look reduced: same border `rgba(255,255,255,0.1)`, 8 px radius, hover edge `rgba(127,176,224,0.5)` as `routes/programs/+page.svelte:246-258`, no tagline.
- `CardRail.svelte`: `ul` in a horizontal scroll container, `scroll-snap-type: x proximity`, 10 px gap, the section label as `aria-label`, items `li`; no arrow buttons (native scroll, touch swipe, the cards are tab stops so keyboard scrolls the rail into view). Two cards and a half show at 390 px, so the rail visibly continues.
- `HardwareCard` (markup in the page, CSS in the page): a link, 56 px tall, grid `72px 1fr`: a rectangular mini hero 72×48 at the left (`object-fit: cover`, 4 px radius, the fleet entry's blessed hero), the name (14 px / 600) over the role label (11 px, label colour). Grid `repeat(auto-fill, minmax(220px, 1fr))`, 8 px gap; one column under 480 px.

### 4.3 Order and content

Missions, On the surface (rail of `MiniCard`s: hero from the site manifest fragment, kind label the world's name, title the site `label`, meta the year or none), Hardware (compact cards), Related programs (rail: hero from the programs index, kind label the agency, title the localised name, meta `start–end`), Go deeper (the 71 remaining rows), Sources. `+page.ts` loads `getProgramIndex(locale)` once and passes the related entries, so names and taglines come from the overlays (the de test in §8). The 35 `program` rows of `see_also` are filtered at render (data untouched in E1, so a later revert is one line).

### 4.4 The pane keeps its box (PG4)

`.detail` becomes a fixed-structure box: hero 16:9 (already), meta `white-space: nowrap; text-overflow: ellipsis` with the full text in `title`, name one line (ellipsis), blurb `-webkit-line-clamp: 3` with `min-height: 3 × 1.55em` (no mission of the 70 exceeds three lines by §2.4), the open link last at a fixed offset. The empty state (`d-empty`) takes the same `min-height`. Result: the pane is the same height for every selection and the same on the stacked mobile layout, so nothing below it moves.

### 4.5 The Earth link (finding, same slice)

A pure `surfaceSiteHref(surface, site)` returns `/<surface>?site=<id>` for moon, mars and venus and `/earth?object=<id>` for Earth objects (the parameter `SurfaceScene.svelte:2234` reads), so the ISS card opens the ISS. Fixing it here follows AGENTS.md rule 10 (a bug found while changing the code is fixed in the same pass); if the `?site=` form already works for Earth through a path not read, the helper reduces to one line.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on E1 |
|---|---|
| A2 (page shell, UXD-012) | The page is `page-shell--reading`, labels are `page-section-label`, Space Mono body: the rails and cards sit inside the 720 px content width and use the same label classes. |
| A3 (accent) | Link blue `--color-accent`, hover edge `rgba(127,176,224,0.5)` already in this file; the cards add no teal and no new colour. |
| A4 (one chip) | Cards are not chips (IA §controls "cards" stay outside the chip); the programs group-by is untouched. |
| B1 | No panel here; none of the panel-action rules apply. |
| L45 (UXD-025) | T4 put 28 px round thumbs on `/programs/<id>` hardware and unpatched mission rows. The mission rows keep them; the hardware rows get a rectangular mini hero (Decision 3), which supersedes the hardware part of T4 on this page only; `entity-page-thumbs.spec.ts:72-83` moves with it. |
| C5 | Ruler founding missions link missions that exist: unaffected. |
| E2 | Fills the roster (hardware for six empty programs, milestone rows); E1's hide rule keeps working whatever E2 does. Order: either; the shots of Cassini and Mars rovers are best taken after E2. |

Plan ideas now outdated: "Related programs more visual ... from the programs page" (the programs page card is 300 px and has a tagline; the rail card is a reduced new component, not a reuse); "hide an empty section" (only Hardware can be empty).

## 6. i18n impact (14 locales)

None. The rails reuse `programs_related` and `programs_on_surface` as their accessible names, the cards print data (names from the program overlays, years, site labels from `link_labels`), and the hardware role text is the existing roster `role` (English in every locale today, see NV6). No key added or removed.

## 7. Data changes

None in E1. (E2 owns `static/data/programs/*.json`; the 12 Worlds' sites in §2.3 are listed there.)

## 8. Tests to add or change

**Unit (vitest):**
- `src/lib/program-page.test.ts` (new): `programSections` over all 42 real programs: Hardware absent exactly for the programs with no fleet row; order is Missions, On the surface, Hardware, Related programs, Go deeper, Sources; `see_also` program rows removed; `surfaceSiteHref('earth', 'iss')` is `/earth?object=iss`, `('moon', 'apollo15')` is `/moon?site=apollo15`.
- `entity-thumb.test.ts`: `siteHeroOf(body, id)` returns `/images/<fragment>.webp` for the 27 program sites.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `programs-page.spec.ts`: `/programs/sputnik` has no heading "Hardware" and no empty `ul`; `/programs/apollo` section headings in DOM order; the surface rail has 2 cards, the hardware list 10 compact cards (each a link with an `img`, `alt=""`, 72×48); the related rail card count equals the program's `related_programs` length and a card's name is the overlay name (`/de/programs/voyager`: not a capitalised slug); the rail scrolls sideways inside its container and the page does not (`scrollWidth <= clientWidth` at 390).
2. Same spec: `/programs/mercury`: click each of the six missions, assert the `aside.detail` bounding box height is equal for all six (±1 px) on all three projects, and that the Hardware heading's y does not change at 390 px.
3. `/programs/iss`: the Earth card's `href` has `object=iss`; following it leaves the ISS selected (`select-focus.spec.ts` pattern).
4. `entity-page-thumbs.spec.ts:72-83`: hardware assertion becomes "compact cards with a mini hero"; the patched-row part stays.
5. `a11y.spec.ts`: `/programs/apollo` and `/programs/sputnik` 0 serious (rail names, card link names unique).
6. `page-shell.spec.ts`: both program pages stay inside 760 px.

## 9. Docs to update by name

- **UXD-NNN** (new, `docs/uxs/decisions/UXD-NNN-program-page-card-rails-and-compact-hardware.md`; 027 is the last at HEAD and the C9, C10, D1 to D4 briefs name 027 to 031: take the next free at build time): the hide rule, the two cards, the order, the pane box; row in `docs/uxs/decisions/README.md`; row E1 in `docs/uxs/CHANGE-INVENTORY.md` (line 73); close PG2 to PG6.
- `docs/concept/05_Design_System.md`: new §5.18 "Mini card, card rail and compact hardware card" (§5.17 is the last at HEAD) (sizes, hover, rail behaviour), §4.3 card grid (one line pointing to it), §5.4 (a card is not the mission-library card).
- `docs/uxs/UXS-004.md` (the catalog UXS the inventory names: add a "Program page" extension; it has no programs content today, `grep -n programs` is empty), `docs/uxs/IA.md` §surfaces/§url-structure (the program page's sections and the Earth link form), `docs/uxs/decisions/UXD-025-lists-carry-a-round-photo.md` "T4" paragraph (hardware on `/programs/<id>` now compact cards, by the new UXD).
- `docs/guides/program-addition-runbook.md` (the page now hides empty sections; the surface and related rails; `surface_sites` for Earth objects use `object=`).
- `docs/adr/TA.md` (the `/programs` row, line 97, and the List thumbnails paragraph, line 393: `/programs/<id>` hardware no longer uses `thumbOf`), `src/lib/components/README.md` (`MiniCard`, `CardRail`, the List-thumbnail paragraph's `/programs/<id>` clause), `src/types/program.ts` (`ProgramSeeAlso.kind` widened to the six kinds the data has).

## 10. Phased plan

1. **E1a the rule and the order:** `program-page.ts` and its test red first, hide Hardware, reorder, filter `see_also` program rows, the Earth href; the Sputnik and Apollo e2e.
2. **E1b the parts:** `MiniCard`, `CardRail`, the surface and related rails (index load in `+page.ts`), the compact hardware card; the rail e2e; shots 1 to 6.
3. **E1c the pane:** the fixed box and the Mercury height test; shot 5; docs of §9; `npm run validate-data` is unaffected (no data), `npm run preflight` once before a push, `npm run preflight:coverage` (the new pure module is tested).

## 11. Acceptance checks

- No program page draws a section heading without rows: Sputnik, Commercial stations and ROS have no Hardware heading (e2e on Sputnik; the unit test covers all 42).
- Related programs and On the surface are rails of one card size; the related names are the overlay names in `de`; both rails sit where §4.3 says on all three projects.
- The Mercury pane has one height for six missions (e2e); the stacked layout at 390 px moves nothing below it.
- The ISS card opens `/earth` with the ISS selected.
- Hardware is compact cards with a rectangular mini hero; the mission timeline keeps its thumbs and patches.
- Docs of §9 updated; the inventory row E1 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the five E briefs)

1. **One card for both rails.** **(a) One `MiniCard` for related programs and surface sites, 176 px wide, 16:9 hero, a kind line, a title and one meta line** (recommended: the plan says "same style and size"; the programs index card is 300 px with a tagline and does not fit a rail); (b) reuse the programs index card at its 300 px size in the rail (heavier, 2 cards on desktop, 1 on a phone; no new component); (c) two different cards (a program card with a tagline, a site card without).
2. **What "Go deeper" keeps.** **(a) Drop its 35 rows of kind `program` at render (all 35 repeat a related program, so the rail shows them) and keep body, fleet, science, explore and gallery rows (71)** (recommended: no data edit, no duplicate); (b) keep them and accept the duplicate (the plan only says "placed above"); (c) delete the 35 rows from the 42 data files (a data change in E2's files; same result, harder to revert).
3. **Hardware: a rectangular mini hero replaces the round photo.** **(a) Yes, on `/programs/<id>` only: 72×48 hero at the left of a compact card; the 28 px round thumb stays on the mission rows and on every other list** (recommended: it is what PG6 says and L45 (UXD-025) said lists carry a round photo of the row's own thing, so this page departs from it by an explicit decision, noted in the UXD); (b) keep the round 28 px photo and only change the layout to a card (UXD-025 stays whole; the "mini hero" of PG6 is not delivered); (c) round 40 px photo (a compromise that fits neither).
4. **The Earth surface links.** **(a) Fix `?site=` to `?object=` for Earth objects in this slice (9 of 27 rows), with the unit test** (recommended: AGENTS.md rule 10, one helper); (b) leave the links and report them (a known broken link stays on the page I am rebuilding).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. All row counts of text (§2.4, §4.4) are arithmetic over character counts at assumed characters per line (meta 54, name 22, blurb 62 at the 440 px pane width); the real line breaks, the real pane width at 1280 and the sticky behaviour were not measured. Whether the operator's "1 vs 2 rows" is the blurb or the meta line was read from the Mercury data, not seen.
- NV2 Whether a three-line blurb clamp is enough at the narrowest pane (the 640 to 760 px range, where the first column takes up to 250 px and the pane is about 320 px at 641 px) was not measured; at 320 px the longest blurb (146 characters) estimates at four lines (about 43 characters a line), so the clamp or a taller reserve may need a breakpoint.
- NV3 `/earth?site=iss` was not run. The read of `SurfaceScene.svelte:1764` (sites) against `:2234` (Earth objects) says the Earth links select nothing; a mapping from `site` to Earth objects in the URL sync (`:1681-1684`) was not read.
- NV4 The 16:9 hero path `/images/<fragment>.webp` for the 27 sites was derived from `entity-thumb.ts:45-55`; that each file exists in the responsive ladder (`image-ladder.json`) was not checked.
- NV5 The rail's keyboard behaviour (tab stops scrolling the rail, scroll-snap `proximity`), RTL (`ar`: the rail starts at the right, snapping) and Safari were not tried.
- NV6 The roster's `name`, `role` and `note` live in the base file and are English in all 14 locales (no `roster` key in `i18n-src/de/programs/cassini.json`); compact hardware cards print that English `role`. Not new, not fixed here.
- NV7 `docs/uxs/UXS-004.md` has no program content and the program page has no UXS of its own; the inventory's "UXS-004" pointer was followed, not confirmed as the right home.
- NV8 `static/data/schemas/program.schema.json` is not read by any script (`git grep "program.schema"` over `scripts` and `src` finds nothing), so no gate guards the roster or `surface_sites` shape; the §8 unit test is the only guard this slice adds.
