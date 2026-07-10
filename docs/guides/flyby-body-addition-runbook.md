# Adding a new flyby body to `/fly` — runbook

A new destination (planet / dwarf / comet / asteroid / KBO) needs wiring across ~10 files so its encounter composes an iconic hero shot on `/fly`. This runbook extracts the repeatable checklist from AGENTS.md §"Adding a new flyby body to `/fly`" and mirrors the pattern of [mission-addition-runbook.md](mission-addition-runbook.md). **Read this before touching the flyby stack.**

Worked examples in order of increasing scope:

- **Arrokoth** (commit `e6e9175b`) — single-body, end-to-end. Canonical reference; read this diff first.
- **Halley + 67P** (commit `3c1e6938e`) — comet pair with synonym-label workaround ("Churyumov" → '67p').
- **#341 Batch 5** (commit `91b8ed0db`) — 10 bodies in one sweep, proving batch efficiency. Also documents the file-rename gotcha: mission JSONs move to `static/data/missions/<dest_lowercase>/` when `dest` changes.

## The model — data-driven composition

No new body is "done" until a mission can fly past it at iconic MET and the camera frames it as a recognisable hero shot. `npm run validate-data` does NOT gate bodies (unlike missions) — **browser-verify step 15 is your done-signal.** The checklist is mechanical; the composition tuning is empirical.

## Touchpoints (numbered to match TA.md §body-wiring)

| # | Touchpoint | File | Required | Notes |
|---|---|---|---|---|
| 1 | **Orbital data** | `static/data/small-bodies.json` | ✅ | `a, e, T, L0, incl, color, radius_km, discovered, mission_visited, description, wiki` |
| 2 | **`DestinationId` union** | `src/lib/lambert-grid.constants.ts` | ✅ | New literal in union; `DESTINATIONS[id]` entry calling appropriate builder |
| 3 | **`PLANET_SIZES`** | `src/lib/orbital/find-flyby-planet.ts` | ✅ | Stylised render radius (small bodies: 0.3–0.9 to read against bloom) |
| 4 | **Label parser** | same file | ✅ | Add to `findFlybyPlanetFromLabel` + `findClosestPlanetToShip` candidates; synonym branch if needed |
| 5 | **`PlanetId` union + `PLANET_COMPOSITION`** | `src/lib/orbital/flyby-camera-plan.ts` | ✅ | `camRMultiplier` (6× small bodies, 4× giants), `iconicLeadDays` (2–3 outer/sparse, 1 inner) |
| 6 | **`DEST_STYLE` + `bodyTextures`** | `src/lib/three/fly-helio-scene.ts` | ✅ | Visual radius, stylised color; texture slot optional |
| 7 | **`labelToPlanetId` + `FLYBY_RADIUS_AU`** | `src/lib/fly-mission-apply.ts` | ✅ CRITICAL | Remaps trajectory waypoint through `destinationPos()` so ship glyph + destination mesh coincide. **Skip this and the ship sits 20+ AU off-axis.** |
| 8 | **`NON_CONTEXT_BODIES`** | `src/routes/fly/+page.svelte` | ✅ | Triggers destination-mesh swap for secondary flybys (e.g. NH at Arrokoth past Pluto) |
| 9 | **Debug-panel `planetIdGuess`** | same file | ✅ | Add to loop in `FlybyDebugViewer` snippet |
| 10 | **`DESTINATION_LABEL_COLORS`** | `src/lib/fly-scene-constants.ts` | ✅ | Label color constant |
| 11 | **`/plan` label switch** | `src/routes/plan/+page.svelte` | ✅ | Exhaustive case in `destinationLabel()` function (NOT added to `DESTINATION_IDS`/`FLYBY_ONLY` unless it has a porkchop grid) |
| 12 | **14-locale messages** | `messages/en-US.json` + 13 others | ✅ | `plan_destination_<id>` key; use Arrokoth commit's Python pattern for non-English transliterations |
| 13 | **i18n overlay** (optional) | `static/data/i18n/en-US/planets/{id}.json` | optional | `/explore` detail panel (name, type, fact, bio, source links) — mirrors the mission overlay pattern |
| 14 | **Tests** | `src/lib/orbital/find-flyby-planet.test.ts` | ✅ | Move new body out of "returns null" bucket; add positive case |
| 15 | **Browser-verify** | `/fly` with a real mission | ✅ | Load any mission that flies past the body at its iconic MET; confirm composition frames it |

## Per-body steps — detailed

### 1 · Orbital data

Entry in `static/data/small-bodies.json`. Required fields:

```json
{
  "id": "arrokoth",
  "a": 44.587,
  "e": 0.04146,
  "T": 108740,
  "L0": 5.67,
  "incl": 2.39,
  "color": "#9b5a48",
  "radius_km": 21,
  "discovered": 1996,
  "mission_visited": ["new-horizons"],
  "description": "Contact-binary Kuiper Belt object visited by New Horizons in 2019.",
  "wiki": "486958_Arrokoth"
}
```

**Eccentric bodies** (`e > 0.20`): use `buildDwarfDestination` builder; below that, circular model is fine. **Comets**: use `buildCometDestination` (Lambert convergence concern logged, not gated).

### 2 · `DestinationId` widening

In `src/lib/lambert-grid.constants.ts`:

- Add literal to the `DestinationId` union: `| 'arrokoth'`
- Add entry to `DESTINATIONS` object calling the appropriate builder:
  ```typescript
  arrokoth: buildKboDestination('arrokoth', bodies.arrokoth),
  ```
- Choose builder based on body type: `buildPlanetDestination` (planets), `buildDwarfDestination` (Pluto/Eris/Haumea), `buildKboDestination` (small KBOs), `buildCometDestination` (comets).

### 3 · `PLANET_SIZES`

In `src/lib/orbital/find-flyby-planet.ts`, add to the `PLANET_SIZES` object. Small bodies typically 0.3–0.9 to render at visibility against bloom:

```typescript
PLANET_SIZES: {
  // ... existing entries
  arrokoth: 0.5,
},
```

### 4 · Label parser

Same file, `find-flyby-planet.ts`. Two functions need the new body:

**`findFlybyPlanetFromLabel`** — trajectory waypoints carry a string label; match it to the body id:
```typescript
if (label.toLowerCase().includes('arrokoth')) return 'arrokoth';
```

**`findClosestPlanetToShip`** — fallback when label doesn't match; iterate candidate ids:
```typescript
const candidates = ['sun', 'mercury', ..., 'arrokoth'] as const;
```

**Synonym branch** — if the data label differs from the id (e.g., "Churyumov" → '67p' for comet 67P/Churyumov-Gerasimenko), add a conditional:
```typescript
if (label.toLowerCase().includes('churyumov')) return '67p';
```

### 5 · `PlanetId` union + `PLANET_COMPOSITION`

In `src/lib/orbital/flyby-camera-plan.ts`:

- Widen `PlanetId` type union: `| 'arrokoth'`
- Add entry to `PLANET_COMPOSITION` record with composition parameters:
  ```typescript
  arrokoth: {
    camRMultiplier: 6,           // small bodies: 6×
    sideAngleRad: Math.PI / 3,  // 60° side angle
    pitchRad: 0.43,             // ~24° pitch
    iconicLeadDays: 2,           // 2-day lead (short encounter window)
    targetBias: 0.4,             // bias toward body
  },
  ```
  Tune from empirical testing in step 15.

### 6 · `DEST_STYLE` + `bodyTextures`

In `src/lib/three/fly-helio-scene.ts`:

- Add to `DEST_STYLE`:
  ```typescript
  arrokoth: {
    size: 0.5,
    color: new THREE.Color(0x9b5a48),
  },
  ```

- Optional texture slot in `bodyTextures`:
  ```typescript
  bodyTextures.arrokoth = undefined; // no public-domain source
  ```
  Bodies ship without texture if no CC/PD image exists.

### 7 · `labelToPlanetId` + `FLYBY_RADIUS_AU` — CRITICAL

In `src/lib/fly-mission-apply.ts`. **This is the most subtle step and most common source of empty-frame flybys.**

**`labelToPlanetId` mapping** — routes trajectory waypoint labels through `destinationPos()` so ship glyph coincides with destination mesh:
```typescript
if (label === 'arrokoth') return 'arrokoth';
```

Without this, the ship sits at raw trajectory coords (~20+ AU off-axis) while the mesh is at `destinationPos()` — camera composes one, ship is at the other, frame is empty.

**`FLYBY_RADIUS_AU` table** — defines the +Y-offset "above-pole" convention for the body. Add entry:
```typescript
arrokoth: 0.002,  // ~300,000 km
```

### 8 · `NON_CONTEXT_BODIES`

In `src/routes/fly/+page.svelte`, in the heliocentric branch near the destinationMesh updates:

```typescript
const NON_CONTEXT_BODIES = new Set(['pluto', 'arrokoth', 'ceres']);
```

Triggers the mesh-swap mechanism when a flyby targets a body that differs from the mission's primary destination (e.g., New Horizons at Arrokoth *past* Pluto). When exiting the cinema, the mesh reverts to primary.

### 9 · Debug-panel `planetIdGuess` loop

Same file, in the `FlybyDebugViewer` snippet (the `/fly` DebugPanel "FLY" tab when `?debug=1`). Add the new id to the loop that guesses the closest body to the current ship position:

```typescript
for (const id of ['sun', 'mercury', ..., 'arrokoth'] as const) {
  // distance calculation
}
```

### 10 · `DESTINATION_LABEL_COLORS`

In `src/lib/fly-scene-constants.ts`, add a label color constant (used in scene labels / UI):

```typescript
DESTINATION_LABEL_COLORS: {
  // ... existing
  arrokoth: '#9b5a48',
},
```

### 11 · `/plan` label switch

In `src/routes/plan/+page.svelte`, in the exhaustive `destinationLabel()` function:

```typescript
case 'arrokoth':
  return m.plan_destination_arrokoth();
```

**Note:** DO NOT add to `DESTINATION_IDS` or `FLYBY_ONLY` arrays unless the body has a precomputed porkchop grid. Arrokoth has none, so it appears in `/plan` labels only; it's not in the destination picker.

### 12 · 14-locale messages

In `messages/en-US.json` + all 13 other locales:

**en-US:**
```json
"plan_destination_arrokoth": "Arrokoth"
```

**For non-English locales**, use the Arrokoth commit's Python pattern — transliterate where linguistically appropriate, keep Latin forms where standard (e.g., comet 67P keeps "67P" in all locales):

- Arabic `ar.json`: transliterate (e.g. "أروكوث")
- Hindi `hi.json`: transliterate
- Japanese `ja.json`: katakana form (e.g. "アロコス")
- Korean `ko.json`: transliterate
- Russian `ru.json`: Cyrillic transliteration
- Serbian Cyrillic `sr-Cyrl.json`: Cyrillic transliteration
- Chinese `zh-CN.json`: Han characters (e.g. "阿罗科斯")
- **European** (es/fr/de/it/nl/pt-BR): Latin name unchanged

Check the Arrokoth commit for the worked pattern; also see ADR-043 (Serbian Cyrillic) and ADR-044 (CJK fonts).

### 13 · i18n overlay (optional)

If the body warrants `/explore` detail-panel documentation, create `static/data/i18n/en-US/planets/arrokoth.json`:

```json
{
  "name": "Arrokoth",
  "type": "Kuiper Belt Object",
  "fact": "Contact-binary system discovered in 1996 via Hubble Space Telescope.",
  "bio": "Arrokoth is a binary system in the Kuiper Belt visited by New Horizons in January 2019. The encounter revealed unprecedented detail of primitive Solar System formation.",
  "sources": [
    {
      "title": "Arrokoth on Wikipedia",
      "url": "https://en.wikipedia.org/wiki/486958_Arrokoth"
    },
    {
      "title": "New Horizons at Arrokoth — NASA",
      "url": "https://science.nasa.gov/mission/new-horizons/"
    }
  ]
}
```

This is optional — bodies without an overlay render in `/explore` but with no detail panel. If you author one, **localize it to all 14 locales** (same as missions).

### 14 · Tests

In `src/lib/orbital/find-flyby-planet.test.ts`:

- **Remove from the "returns null" test** if it was there.
- **Add a positive case** asserting the label resolves correctly:
  ```typescript
  it('finds Arrokoth by label', () => {
    const result = findFlybyPlanetFromLabel('Arrokoth');
    expect(result).toEqual({
      id: 'arrokoth',
      size: 0.5,
    });
  });
  ```

Run `npm run test` to verify.

### 15 · Browser-verify — the done-signal

Load the development server:
```bash
npm run dev
```

Navigate to a mission that encounters the new body near its iconic MET. Example: `/fly?mission=new-horizons&day=4730` (Arrokoth at MET 4730 days).

**Checklist:**
- [ ] Body mesh renders (not empty space)
- [ ] Ship glyph coincides with body mesh at iconic frame
- [ ] Composition frames the body against the lit hemisphere (not the night side)
- [ ] For small bodies, the body dominates the frame (not a speck)
- [ ] Label appears in the scene (if integrated)
- [ ] Zoom / pan ergonomics feel natural

If the frame is empty or the ship is off-mesh, backtrack to step 7 (`labelToPlanetId` mapping) — that's the most common culprit.

## Validation & gates

- `npm run validate-data` — does NOT enforce bodies (unlike missions); use step 15 as your done-signal
- `npm run preflight` — full pre-push (typecheck → lint → test → validate → build)
- `npm run docs:build` — strict docs build (if you added an i18n overlay, wire it into the index)

## Gotchas (learned from production wiring)

- **Step 7 is critical.** The trajectory waypoint label remapping is invisible in output but load-bearing. Skip it and every newly-wired body composes as empty space. It's the first place to backtrack if browser-verify fails.
- **File-rename trap** — when a mission's `dest` changes to a new body, the mission JSON file must move from `static/data/missions/<old_dest>/` to `static/data/missions/<new_dest_lowercase>/`. The runtime loader resolves by directory, not filename.
- **Porkchop grids are optional.** Small-body flybys don't need Lambert-solver grids (no `/plan` configuration). Planets + dwarfs with multiple destination missions should get them precomputed (see `scripts/precompute-porkchops.ts`).
- **Label synonyms.** Comets + asteroids often have multiple data representations (e.g., "Churyumov" vs. "67p"). Capture the synonym in step 4 so waypoint labels resolve correctly.
- **Eccentric bodies.** Bodies with `e > 0.20` use the eccentric-arrival logic (`buildDwarfDestination`); the circular model is fine below that. Check the Bennu / Pluto pattern if unsure.
- **Composition tuning.** Parameters in step 5 (`camRMultiplier`, `iconicLeadDays`, `pitchRad`) are empirical; you'll iterate them in step 15 based on the mission trajectory. The audit dashboard at `/dev/fly-cameras` (after commit) helps: it shows all flyby/arrival events and their verdict (iconic vs. non-iconic).

## Worked example structure

The Arrokoth commit `e6e9175b` touched these files across the 15 steps:

```
messages/                          (step 12: all 14 locales)
  ar.json, de.json, en-US.json, ... (14 files)
src/lib/
  fly-mission-apply.ts            (step 7: labelToPlanetId + FLYBY_RADIUS_AU)
  fly-scene-constants.ts          (step 10: DESTINATION_LABEL_COLORS)
  lambert-grid.constants.ts       (step 2: DestinationId union + DESTINATIONS)
  orbital/
    find-flyby-planet.test.ts     (step 14: test case)
    find-flyby-planet.ts          (steps 3–4: PLANET_SIZES, label parser)
    flyby-camera-plan.ts          (step 5: PlanetId union + PLANET_COMPOSITION)
  three/
    fly-helio-scene.ts            (step 6: DEST_STYLE + bodyTextures)
src/routes/
  fly/+page.svelte               (steps 8–9: NON_CONTEXT_BODIES, debug loop)
  plan/+page.svelte              (step 11: destinationLabel switch)
static/data/
  small-bodies.json              (step 1: orbital data)
  i18n/en-US/planets/arrokoth.json (step 13: optional overlay)
static/data/missions/pluto/
  new-horizons.json              (side effect: extended arrival_date to cover Arrokoth)
```

All 15 steps in ~10 files, executed as one coherent feature.

## Cross-references

- **AGENTS.md §"Adding a new flyby body to `/fly`"** — source of this checklist
- **TA.md §body-wiring** — architectural background (composition, label remapping, mesh swap)
- **ADR-077** — cislunar body-wiring + per-event hero compositions
- **mission-addition-runbook.md** — parallel runbook for missions (which depend on bodies)
- **mission-trajectories.md** — authoring flight waypoints + phases for a mission
