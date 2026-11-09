# Mission trajectory thumbnail runbook

Every mission has one drawing of where it goes: `static/images/missions/thumbnails/<id>.webp`, 736 × 414
(16:9, 2x of the mission panel's image box), shown on the FLIGHT tab of the mission panel and on the
collectible card (`/cards/mission/<id>`). They are **Orrery's own work, drawn in code** (not AI-generated, not
sourced), credited on `/colophon` under "Mission trajectory plots". Companion to the
[mission-addition runbook](mission-addition-runbook.md); the trajectory data itself is covered by
[mission-trajectories.md](mission-trajectories.md).

Generator: `scripts/render-mission-thumbnails.ts` (`fetch-assets.ts --thumbnails-only` calls it). It reads the
mission JSON and draws what `/fly` flies: it never re-derives a trajectory.

## 1. What a mission needs, by kind

| Mission | Data the generator reads | You get |
| --- | --- | --- |
| Sun-orbiting / planetary (`dest` MARS … NEPTUNE, SUN, COMET, ASTEROID) with a `flight` block | `flight.events[]` (types `launch`, `flyby`, `edl_or_oi`, `arrival` with `met_days`), `departure_date`, `transit_days`; optional waypoint file `static/data/fly-trajectories/<id>.json` or `static/data/trajectories/<id>.json` (which one /fly loads is `flyTrajectoryPath()` in `src/lib/fly-trajectory-ids.ts`; a new id goes into that list too) | heliocentric plot: Sun, Earth ring, destination ring, spline or transfer arc, one disc + label per flyby/arrival |
| Moon (`dest` MOON) with a `flight` block | `flight.cislunar_profile`, `flight.events[]` | Earth-centred plot: Moon ring (drawn only along the Moon's track during the flight, plus a margin, so it ends inside the frame), TLI coast, lunar encounter, return leg for round trips |
| Earth orbit (`dest` EARTH) | an entry in `src/lib/orbital/earth-orbit-registry.ts`: `apogeeKm`, `perigeeKm`, `inclinationDeg`, `revolutions`, `suborbital?` | orbit ring on an Earth disc, `n REV` (suborbital: a ballistic arch) |
| Anything with none of the above | nothing | a placeholder in the same style: Earth disc, mission name and type, caption "NO TRAJECTORY DATA". No path is invented; add the data and re-run to replace it |

The mission name and type line on a placeholder come from `static/data/i18n/en-US.missions.json`, so author the
en-US overlay first.

## 2. Add or refresh a thumbnail

```bash
npx tsx scripts/render-mission-thumbnails.ts --only=<id>[,<id>]            # draw those missions (no ladder / PNG changes)
npx tsx scripts/render-mission-thumbnails.ts --out=/tmp/x --png=/tmp/x-png # preview everything, repo untouched
npx tsx scripts/render-mission-thumbnails.ts                                # all missions: writes webp, updates the ladder, retires old PNGs
node scripts/build-original-work.mjs                                       # colophon list (new mission appears on the next run)
```

A full run is deterministic: running it twice leaves no diff, so a refresh is a reviewable diff of exactly the
missions whose data or algorithm changed. After a new mission run the full command once (the `--only` form
does not add the ladder entry `/images/missions/thumbnails/<id>` = `[736]`), then:

```bash
npm run validate-data          # fails closed on a mission with no thumbnail (.webp)
npx vitest run src/lib/data/mission-thumbnails.test.ts src/lib/image-ladder-contract.test.ts
npm run gen:doc-counts         # only if a count moved
```

`scripts/render-mission-thumbnails.ts` needs the repo's own `canvas` and `sharp` and the bundled font
`scripts/assets/fonts/SpaceMono-Regular.ttf` (SIL OFL 1.1, licence next to it in `OFL.txt`; `node-canvas`
cannot read the site's woff2). Nothing is fetched.

## 3. Style rules (operator decision 2026-11-09)

- Flat navy `#04040c`, no starfield, no texture. Paths muted blue `#889fe7`, brighter toward arrival; amber
  `#f5a524` / gold `#ffc850` for highlights (launch ring, arrival disc, lunar phases, Sun). **No cyan or teal.**
- Body discs in muted natural colours (the `BODY` table in the generator); small Space Mono labels in caps:
  LAUNCH, `<BODY> FLYBY`, `<BODY> ARRIVAL`, LUNAR ARRIVAL, DEORBIT BURN, SPLASHDOWN; one caption line at the
  bottom left.
- Radial scale is compressed beyond 1.6 AU (`r' = 1.6 sqrt(r / 1.6)`, angle kept) for outer-system tours and the
  caption says `RADIAL SCALE COMPRESSED`; inner missions are to scale. Earth-orbit rings are drawn at 1.7 Earth
  radii and captioned `NOT TO SCALE`.
- One render per mission, 736 × 414, WebP quality 82 (about 9 KB). There is no 1x rung and no separate card
  render: the card shows the same file at 96 px, where only the path and discs read (labels do not).
- Labels are baked into the picture in English. A new label word means a new generator branch, not a per-locale
  string.

## 4. Check before committing

1. Contact sheet of **every** thumbnail (the preview run above, tiled with sharp) and look at each: path sane,
   labels not overlapping each other or running off the frame, no blank frame, placeholders say so.
2. `/missions?id=<id>` FLIGHT tab and `/cards/mission/<id>` on a desktop and a phone viewport (dev server on a free
   port, stopped by PID afterwards).
3. A plot that looks wrong is usually the data: compare with what `/fly` draws before touching the generator
   (the cislunar coasts are polylines of about 30 points; a long straight leg is in the data).
4. `npx vitest run src/lib/fly-trajectory-ids.test.ts src/lib/data/mission-thumbnails.test.ts`,
   `npx prettier --check` and `npx eslint` on the touched files.

## 4b. What the generator calls (reuse, do not copy)

`computeMissionApply` (`src/lib/fly-mission-apply.ts`), `flyTrajectoryPath`, `getEarthOrbitCoast`,
`orbitPath` / `earthOrbitPath` / `predictShipPosAtMet` (`src/lib/physics/transfer`), `moonEciPos` and the
`A_MOON_KM` / `R_EARTH_KM` / `R_MOON_KM` constants (`src/lib/orbital/cislunar/cislunar-geometry.ts`),
`LUNAR_LOCAL_PHASE_TYPES` (`src/lib/three/fly-cislunar-overlays.ts`). When /fly's trajectory code changes,
re-run the full generator and read the diff.

## 5. Credit

Thumbnails are original work, so they have **no row in `image-provenance.json`** (the provenance walker skips
`missions/thumbnails/`; `audit-image-usage.ts --write-approved` does not approve them). Their record is
`static/data/original-work.json` → `mission_trajectories` (one row per mission in the index, built by
`scripts/build-original-work.mjs`; schema `static/data/schemas/original-work.schema.json`), listed on `/colophon`
with the strings `colophon_section_mission_trajectories` and `colophon_mission_trajectories_note` in all 14 locales.

## 6. Mobile size

`images/` is pruned from the Capacitor bundle (`scripts/mobile/prune-streamed-assets.mjs`), so the thumbnails add
nothing to the on-device build (`check-mobile-size-budget.mjs` is unaffected). They do ride in the offline download
manifest (`scripts/mobile/build-offline-manifest.mjs`, regenerated at release); route JS/CSS budgets do not count
images.
