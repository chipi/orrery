# Mission trajectory thumbnails — regenerate all, add the missing, credit as original work

Status: PHASE 1 (investigation + samples). Nothing in `static/` or `scripts/` was changed. Operator
decision recorded: regenerate every mission card thumbnail with the latest /fly trajectory
algorithms, in the site's current look, add the missing ones, and list them as Orrery original
work in a new colophon section.

Samples (scratchpad, not in the repo):
`/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/thumbs/`
(`sheet-A.png`, `sheet-B.png`, `sheet-C.png`, `sheet-grid.png`, `render.ts`, `shots.mjs`).

## 1. Inventory

### How they are made today

- Generator: `scripts/fetch-assets.ts` lines 2695-3048 (`fetchMissionThumbnails`, run by
  `tsx scripts/fetch-assets.ts --thumbnails-only`). node-canvas, 240 x 120 px PNG, one file per mission
  with a `flight` block, written to `static/images/missions/thumbnails/{id}.png`.
- Four hand-rolled painters (heliocentric arc, waypoint path, cislunar, analytic ring) with a table
  `ANALYTIC_HELIO_AU` of five hard-coded encounter distances.
- Disk: 85 `.png` (278,568 B) + 76 `.webp` (49,026 B) = 161 files, 716 KB on disk (4 KB blocks), 0.33 MB
  of real bytes. The `.webp` twins are not referenced by any component; only `.png` is.
- `static/data/image-ladder.json` has a single rung `[240]` per thumbnail.
- Colours: teal `#4ecdc4` departure node, `#4b9cd3` Earth ring, per-phase rainbow for cislunar
  (`CISLUNAR_PHASE_COLORS`). All of it is the teal/cyan family the site is leaving.

### Where they are shown

1. `src/lib/components/MissionPanel.svelte:519` — FLIGHT tab, `<figure class="flight-thumbnail">`,
   16:9 box with `object-fit: cover` in the 400 px panel (image area about 354 x 199 css px). A 240 x 120
   (2:1) PNG is upscaled about 1.5x and cropped at the sides. This is what operators see as "the mission
   card thumbnail".
2. `src/lib/cards/card-spec.ts:163` -> `CollectibleCard.svelte:111` — the collectible/share card's `.fig`:
   96 x 72 px slot, `object-fit: contain` (so a 2:1 image is 96 x 48), with
   `mix-blend-mode: screen; filter: grayscale(1) brightness(1.9) contrast(1.15)`. Colour is thrown away
   here, only luminance survives.
3. No other consumer (checked with a repo-wide grep for `missions/thumbnails`, `figureUrl`). The
   `/missions` list/grid does not use them. The panel also shows a separate "Mission blueprint" figure
   above the thumbnail for some missions (Voyager, Apollo in `sheet-grid.png`), so the two overlap
   conceptually on those.

### Have / missing

- 126 mission JSON files (`static/data/missions/*/*.json` without `index.json`).
- 85 have a thumbnail = every mission with a `flight` block (by design:
  `src/lib/data/mission-thumbnails.test.ts` asserts thumbnails == missions with `flight`, and
  `scripts/validate-data.ts:1561` fails closed on a flight mission without one).
- 41 have none = the whole `static/data/missions/earth/` folder (Earth-orbit missions, none carry a
  `flight` block). The UI hides the figure for them (`mission.flight ?` gates at `MissionPanel.svelte:517`
  and `card-spec.ts:163`) because asking for them 404ed on prod.
  Missing list: apollo-1, apollo-soyuz, apollo7, apollo9, artemis3, aurora-7, faith-7, freedom-7,
  friendship-7, gemini12, gemini3, gemini4, gemini6a, gemini7, gemini8, inspiration4, liberty-bell-7,
  otv-1..otv-7, polaris-dawn, shenzhou-1, sigma-7, skylab-2, skylab-3, skylab-4, soyuz-1, soyuz-11,
  sputnik1, voskhod-1, voskhod-2, vostok-1..vostok-6.
- Of the 41, 31 have a `/fly` Earth-orbit coast descriptor (`src/lib/orbital/earth-orbit-registry.ts`:
  apogee, perigee, inclination, revolutions, suborbital flag) — enough for an honest orbit plot.
  10 have none: apollo-1 (pad fire, never flew), artemis3, otv-1..otv-7, sputnik1. They need either
  orbit data added or no thumbnail (operator decision).
- No JWST/L2 mission exists in the catalog, so the "Earth-orbit or L2" sample is Gemini 7 (Earth
  orbit, 206 revs, one of the missing ones).

### What /fly uses now, and what to reuse (no duplicate algorithm)

The current generator does NOT draw what /fly draws:

- /fly's single entry point is `computeMissionApply(mission, defaults, trajectoryOverride)` in
  `src/lib/fly-mission-apply.ts` (called from `src/routes/fly/+page.svelte:2188`). It returns `outPts` /
  `retPts` (heliocentric AU, with the Catmull-Rom spline through `static/data/fly-trajectories/<id>.json`
  or `static/data/trajectories/<id>.json`, flyby waypoints remapped onto the real planet positions),
  `cislunarTrajectory` (phases + moon track, Tier-1.5 hold detection) and the timeline.
- fetch-assets instead calls `outboundArc` (a Keplerian half-ellipse) or the old
  `interplanetary_profile.waypoints_helio_au`, and its own `buildCislunarTrajectory` call without the
  mission's flight events. So the 25 `fly-trajectories` missions (Voyager, Cassini, Juno, BepiColombo,
  ...) are drawn on a different path than /fly flies, and Moon missions miss the event-driven phase
  boundaries.

Reuse plan: the thumbnail generator imports and calls `computeMissionApply` exactly like
`scripts/audit-fly-cameras.ts` already does, plus:

- `earthOrbitPath` / `orbitPath` / `destinationPos` (`physics/transfer/mission-arc.ts`) for rings and
  bodies, `predictShipPosAtMet` for event positions, `labelToPlanetId` for naming encounters;
- `getEarthOrbitCoast` (`orbital/earth-orbit-registry.ts`) for the Earth-orbit set;
- `A_MOON_KM`, `R_EARTH_KM`, `R_MOON_KM` from `orbital/cislunar/cislunar-geometry.ts`.

Two small blockers found, both real:

1. `flyTrajectoryPath()` (which tells you which JSON /fly loads) lives in `src/lib/data/interstellar.ts`,
   which imports `src/lib/data/core.ts` -> `$app/paths`, so Node/tsx cannot load it
   (`Cannot find module '$app/paths'`, reproduced). Extract the id sets + `flyTrajectoryPath` into a pure
   module (e.g. `src/lib/fly-trajectory-ids.ts`) and re-export from `interstellar.ts`. My sample renderer
   cheated with a file-exists check; the real script must not.
2. `scripts/audit-fly-cameras.ts` reads only `static/data/trajectories/`, so it misses the
   `fly-trajectories/` overrides that /fly prefers (latent audit bug, same extraction fixes it).

Everything else in `fly-mission-apply.ts` loads under tsx with `.svelte-kit/tsconfig.json` (verified: it
ran for Perseverance, Voyager 2 and Apollo 11).

## 2. Style

Tokens (`src/lib/styles/tokens.css`): bg `#04040c`, text white/dim, gold `#ffc850`, accent blue
`#4466ff`, Mars `#c1440e`. Teal `#4ecdc4` and Earth `#4b9cd3` are the cyan family: not used. Dioramas
(`static/images/illustrations/sites/*.webp`): deep navy field (about `#1b2740`), warm paper/cream
subject, amber callouts, thin white serif/sans labels, leader lines. Rules applied: no cyan/teal;
muted blue `#889fe7` for paths and rings; amber `#f5a524` / gold `#ffc850` for highlights (launch ring,
arrival disc, hot phases, Sun); body discs in muted natural colours.

Variants (all rendered from the real `computeMissionApply` output, 736 x 414 = 2x of the panel image,
368 x 207 = 1x, and the 96 x 72 card slot with the card's CSS filter re-created in pixels):

- A — clean vector plot, flat navy `#04040c` with a faint centre lift. Thin rings, 1.7 px blue path,
  amber Sun, hollow gold launch ring, solid gold arrival disc. No text. `sheet-A.png`. Smallest files.
- B — A plus body discs at encounters, dashed rings, path that brightens toward arrival with a soft
  glow, labelled launch / flybys / arrival / lunar arrival / deorbit burn in mono caps, and a caption
  line (duration, scale note). `sheet-B.png`.
- C — B's geometry on the diorama navy (`#142040 -> #0b1226`) with a seeded starfield (stable per mission
  id), paper grain, corner ticks, vignette, same labels-free marker set plus caption. Echoes the
  dioramas. `sheet-C.png`.
- In the real panel: `sheet-grid.png` (current vs A/B/C for Perseverance, Voyager 2, Apollo 11, sample
  swapped in by request interception on a dev server on port 5811, stopped by PID).

What the sheets show:

- At 1x B's labels (7.5 px) are legible but small; at the card's 96 x 72 slot no label survives. Labels
  belong to the panel only.
- C's navy + starfield + grain turns into grey mush under the card's `grayscale + brightness(1.9) +
  screen` filter (see the bottom row of `sheet-C.png`). C is panel-only unless the card CSS changes.
- A and B survive the card filter as white line-work; the path/ring luminance contrast is what matters,
  not hue, so the blue/amber distinction is invisible there (Sun and discs still read as white dots).
- Recommendation: B for the panel, A (no labels, no glow, 4:3) for the card slot. C only if the operator
  likes the diorama echo more than the byte cost (+22 % vs A) and accepts a different card treatment.

Design decisions the samples force (operator input needed):

1. Radial scale. Voyager-class tours are drawn with radial compression beyond 1.6 AU
   (`r' = 1.6 sqrt(r/1.6)`, angle kept), otherwise Earth's orbit is a 3 px dot. The caption says
   "RADIAL SCALE COMPRESSED". Inner missions are to scale. Accept, or draw outer tours strictly linear?
2. Earth-orbit plots exaggerate the orbit to 1.7 Earth radii so the ring reads (real LEO is 1.05-1.07).
   Captioned "not to scale" only in the doc, not yet on the art. Accept?
3. Aspect. Panel box is 16:9, card slot is 4:3 contain. One 16:9 file letterboxes to 96 x 54 on the card.
   Either two renders per mission (panel 16:9 + card 4:3, the sample card row is already a separate 4:3
   render) or one 16:9 file with a small card.
4. Fonts. `static/fonts` holds only woff2 (Bebas, Space Mono, Crimson); node-canvas cannot load woff2 and
   no Space Mono is installed locally, so labels in the samples fell back to the system mono. Production
   labels need a TTF of Space Mono registered with `registerFont` (a new font file = a new asset; ask
   before adding).
5. Apollo 11 shows the angular outbound/return path that /fly's Tier-1.5 hold detector produces from the
   authored waypoints (`cislunar-geometry.ts`), with the Moon disc placed at the first lunar hold. That is
   what /fly shows today, so the thumbnail is faithful, but it is not a pretty ellipse. Voyager 2 prints
   "ARRIVAL" next to "NEPTUNE" (same encounter, two events); the real script dedupes by event type.

## 3. Sample set

Missions rendered: `perseverance` (Mars transfer, no trajectory override: Keplerian arc via
`buildArcs`), `voyager-2` (spline through `fly-trajectories/voyager-2.json`, Jupiter/Saturn/Uranus/Neptune
encounters), `apollo11` (cislunar, round trip), `gemini7` (Earth orbit, one of the 41 new ones, 206 revs,
drawn 3 loops by the "hybrid loop rule" /fly's coast scene uses).

Individual PNGs: `{A,B,C}-{id}-{1x,2x}.png` in the scratchpad folder.

## 4. Size, time, credit

### Size (mobile budget)

- Today: 85 PNG + 76 WebP = 327 KB of real bytes for 85 missions.
- Measured on the 4 samples (sharp, WebP): 2x (736 x 414) quality 82: A 7.0 KB, B 9.1 KB, C 8.6 KB
  average per mission; quality 70: 5.2 / 7.0 / 6.4 KB; 1x (368 x 207) quality 82: 2.8 / 3.5 / 3.9 KB.
  The PNG 2x originals are 51-82 KB each, so ship WebP only.
- 126 missions, 2x only, q82: A 0.88 MB, B 1.15 MB, C 1.08 MB. Adding a 1x rung: +0.35 to +0.5 MB.
  Adding a 4:3 card render (about 3 KB each): +0.4 MB.
- Net change vs today (and dropping the unreferenced PNG/WebP pairs): B 2x only about +0.8 MB; B with all
  three renders about +1.7 MB.
- Mobile gate: `scripts/mobile/check-mobile-size-budget.mjs` caps the pruned `build/` at 77 MB; its own
  header recorded 75.4 MB on 2026-10-21 (about 1.6 MB headroom then). I did not measure the current
  build (no builds allowed this phase). A +0.8 MB change fits only if nothing else grew; +1.7 MB likely
  forces a re-baseline. Cheapest levers: q70 (about -25 %), 2x only, no card render (let the card
  downscale), or exclude `missions/thumbnails` from the offline bundle with the other streamed assets
  in `scripts/mobile/prune-streamed-assets.mjs` (the panel already tolerates a missing thumbnail via
  `onerror`).
- Route budgets (`scripts/route-budget.json`) are JS/CSS KB only; thumbnails are not in them. The
  precache budget (`check-precache-budget.mjs`, 50 MB) excludes imagery by design.

### Time

Sample renderer, 12 renders of the 4 missions per variant including 1x/2x/card/contact sheet, three
variants, JSON load, `computeMissionApply` and PNG encode: 0.89 s wall for the whole run (about 60
renders, around 15 ms each). Full run is 126 missions x (1-3 renders) + WebP encode: estimated well under
30 s including tsx start-up. Not measured on the real script (it does not exist yet).

### Code changes for phase 2 (list, not started)

1. Pure module with the trajectory-id sets + `flyTrajectoryPath` (re-exported by `interstellar.ts`);
   point `audit-fly-cameras.ts` at it.
2. New generator under `scripts/` (replace fetch-assets lines 2695-3048 with a call into it) that calls
   `computeMissionApply` for helio + cislunar and `getEarthOrbitCoast` for LEO; outputs WebP (+ ladder
   rungs via `scripts/vision/add-card-rungs.mjs` conventions); deterministic (seeded stars) so a re-run
   leaves no diff. Delete the 85 PNG + 76 WebP.
3. Presence gate by data, not by `flight`: `MissionPanel.svelte:517`, `card-spec.ts:163`,
   `mission-thumbnails.test.ts`, `validate-data.ts:1561`, `audit-image-usage.ts:150` (png regex).
4. `static/data/image-ladder.json` entries for the new files (existing ones list `[240]`) and
   `image-ladder-contract.test.ts` stays green.
5. Card CSS: only if C is chosen, or if the 4:3 card render is dropped.
6. The 10 Earth missions with no orbit data: decide per mission (add orbit params to the registry with a
   cited source, or leave without a thumbnail and keep the figure hidden for them).

### Credit / provenance / colophon

These are drawn in code from Orrery's own trajectory model, not AI-generated and not sourced, so
`image-provenance.json` (sourced imagery) gets no rows; they belong in `original-work.json`:

- `scripts/build-original-work.mjs`: new manifest key (e.g. `mission_trajectories`), one row per
  thumbnail `{ title, file, route: /missions/<id>, cover: false }`, plus a count in `counts`; rows built
  from the mission index so a new mission shows up on the next run (the way `site_illustrations` is
  built from `site-illustrations.json`, commit 09f81409bf9).
- `static/data/schemas/original-work.schema.json`: array definition + count property (copy of the
  `site_illustrations` block, route pattern `^/missions/[a-z0-9-]+$`).
- `src/routes/colophon/+page.svelte`: contents link + section with the existing `shown()` / `showAll`
  pattern (126 thumbnails need the "show all N" gate), `IMAGE_SIZES.colophonWide`.
- Messages in all 14 locales: `colophon_section_mission_trajectories` ("Mission trajectory plots"
  or similar) and `colophon_mission_trajectories_note` (drawn in code from /fly's trajectory model; a
  schematic, radially compressed for outer-system tours; not AI-generated, unlike the site maps).
- `docs/adr/TA.md` colophon line and doc-counts regeneration, as 09f81409bf9 did.

## 5. NOT verified

- No build, no e2e, no preflight, no mobile-size measurement; the +0.8 / +1.7 MB figures are arithmetic
  from four samples, not from a `build/`.
- Sizes and the 15 ms/render figure come from four missions; the other 122 were not rendered. Odd cases
  (comets/asteroids with a destination body but no orbit data in `DESTINATIONS`, Parker/Solar Orbiter that
  end at a perihelion, Ulysses polar passes, return-trip missions like Hayabusa2, Starship demos) were not
  tested through `computeMissionApply` for thumbnails.
- Only the Earth-orbit descriptor for Gemini 7 was drawn; Mercury suborbital arcs, Vostok 1 (1 rev),
  Shenzhou, Skylab, Apollo-Soyuz were not.
- The panel screenshots cropped the figure area with a fixed clip, so the Voyager/Apollo panels in
  `sheet-grid.png` are shifted by the Mission-blueprint figure above the thumbnail; the real card image
  `/cards/mission/<id>` was not screenshotted, only simulated in pixels (grayscale 0.2126/0.7152/0.0722,
  brightness 1.9, contrast 1.15, screen blend over a `#17171f` stand-in, not the card's real background).
- Label font, string wording in 14 locales, and the colophon placement were not checked.
- I did not check whether another agent's in-flight work touches `MissionPanel.svelte`, `card-spec.ts` or
  the colophon page (the brief said others edit surface components).
