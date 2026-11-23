# Pass 2 hand-off: every descent, one by one (start here)

Written 2026-11-23 at the end of the session that did pass 1. A new session picks up from this
file alone. Branch `tech-debt/0.9.11`, worktree `/work/orrery/worktrees/0.9.5`. Nothing from this
work is pushed: every commit is local. Pushing needs the operator's go.

Read first, in this order:

1. this file;
2. [`2026-11-23-central-models-scale-out.md`](2026-11-23-central-models-scale-out.md): the plan,
   the progress table, the parachute table, the lessons, the operator's wish list;
3. the research records: [`2026-11-23-lunar-landings-record.md`](2026-11-23-lunar-landings-record.md)
   and [`2026-11-23-mars-landings-record.md`](2026-11-23-mars-landings-record.md). They list,
   per mission, what really happened against what the profile does, and the engine features pass
   2 needs. Their figures are partly from secondary sources: verify before changing a profile.

## What pass 1 delivered (done)

| Commit | What |
| --- | --- |
| f167f7c59e0 | Pilot models: Apollo LM, Curiosity (the operator's quality bar) |
| 38e35a78e50 | Descents fly the central models; the camera director (`src/lib/orbital/descent-director.ts`); MSL's real 21.35 m chute and sky crane; the HUD scrim |
| e3b7f16c52a, e77920605c8, 78b55b43af9 | Batches 1, 2, 2b: lunar landers and rovers, Mars landers, rovers |
| b04942bb785 | Batch 3: Vostok/Voskhod, Mercury, Gemini, Soyuz (one builder), Progress; credits for every model file |
| de434b4d937, 1a6c5e03f3b | Batch 5: probes (Cassini/Huygens, Galileo, Rosetta/Philae, Hayabusa 1/2, OSIRIS-REx, Venera, Vega, Giotto) |
| 27fca04db80 | Batch 6: 12 observatories |
| eabdb25eae3 | Every robotic Moon and Mars landing flies its new model; surface-only parts (arrays, petals, ramps, masts) stowed until touchdown |
| b1cbd559433 | Vostok, Voskhod, Mercury, Gemini and Soyuz re-entries fly the new capsules |
| ba9d7f9f969, 0386f255b02 | Every parachute redrawn: ringsails and disk-gap-bands at sourced sizes, drogue then mains, Huygens main → stabiliser, Venera chute cut at ~47 km |

Where things live:

- Models: `src/lib/three/showcase/<family>.ts`, contract in `types.ts`, parts kit in `kit.ts`.
- Descent model per site: `src/lib/three/descent-landers.ts` (`DETAILED`, `STOWED`,
  `detailedReturnCapsule`, `detailedProbe`) and `src/lib/three/descent-models.ts` (the EDL
  stacks: aeroshell, chutes, retro, airbags, sky crane; `CAPSULE_MAINS`, `CAPSULE_DROGUES`).
- The scene's timing of every part: `src/lib/three/descent-scene.ts` `setState` (heat shield,
  chute stages via `userData.chuteStage`, backshell, sky crane lower and flyaway, stowed parts).
- Events and archetypes: `src/lib/physics/descent/descent-profile-registry.ts`; profiles:
  `static/data/descent-profiles/<mission>.json`.
- Tests: `src/lib/three/descent-models.test.ts`, `src/lib/orbital/descent-director.test.ts`.

## Pass 1 finished (state at the end of the session, 2026-11-23)

All 148 showcase models are at the pilot bar and wired; nothing of pass 1 is left.

| Commit | What |
| --- | --- |
| 4c46ce95221, 852610a0735 | /fly launch, cruise and orbit fly the central model wherever `FLY_CRAFT` maps one (the second commit fixed the lookup order: the older silhouettes had kept winning for 18 probes) |
| 20d87f76384, 04910e44432, 5369fedbd2b | Batch 7: lunar orbiters, outer-planet craft, Mars and inner-planet orbiters |
| 17433562f00 | The 3D craft viewer on /fleet/[id] and /missions/[id] (`CraftViewer.svelte`, `craft-viewer.ts`, `showcase-index.ts`), 14 locales |
| 18701aac116, e014a4a6409, 14541006221, d6531ea456f, 9f4e4772caa, 1b69c0125ae | Batch 8: every pre-pilot model rebuilt (stations, freighters, Apollo CSM, Shenzhou, Shuttles, Buran, X-37B, commercial capsules, inner-planet and small-body probes, Mars orbiters in `orbiters.ts`) |
| 36818ec4a20, d6531ea456f | Apollo, Shenzhou and Dragon re-entries come home in the rebuilt capsules (`CAPSULE_MODEL` in `descent-landers.ts`) |
| 46fd233ac84 | Credits regenerated |
| e2fca28e4d4 | /colophon: 251 model entries (73 new, the superseded capsule, probe and craft entries removed), new thumbnails, all 13 locales; the empty "Capsules" section is hidden |

| 80a17174365 | The descents' craft models load on demand: `preloadDescentModels()` in `descent-landers.ts`, awaited by `DescentScene.svelte` (until loaded, lookups answer null and the Tier 0 silhouette flies). A new descent model goes into a family listed in its `FAMILIES` glob |
| 30e6f948c68 | Route budgets re-measured against 0.9.10 (`scripts/route-budget.json`); the commit lists what grew and why |
| 5ce0d7f196d | The whole-catalogue model tests have a 30 s budget (they build every craft) |

Final checks at the end of the session: `npm run check` 0 errors; `npm run validate-data` all
checks passed; eslint and prettier clean on tracked files (the untracked `scripts/*.tmp.*` scratch
files fail both — a clean checkout has none; move them out of `scripts/` before running `npm run preflight`, which
checks the working tree); production build with `SENTRY_SOURCEMAPS=1` within every route budget,
prerender, internal links and SEO passing; `npm run test:coverage` 569 files, 9640 tests passed,
coverage thresholds met. Nothing is pushed.

What the line-up and flight scenes still draw with older builders, on purpose: the lander
cruise stages (`lander-cruise-models.ts`) for missions not in `FLY_CRAFT` (the Mars landers,
Apollo, Artemis, Luna, Chang'e …), `craft-cassini` for the `huygens` mission, New Horizons, and
the /moon and /mars Tier 1 site models.

Known limits of the batch 8 models, from the builders' own reports (pass-2 material if a scene
shows them up close): the Shuttle's wing tops read slightly blue-grey under the studio light; X-37B
still looks a little rocket-like from above; Mars Express's dish sits on the back to keep its
1.8 m height; Hope's bus colour is assumed gold; DART had no Commons photo (NASA specs only).

## Pass 2: the method (operator 2026-11-23)

The pilots went beyond the model; every landing gets the same care. For each descent:

1. **Mechanism from the record**: chute type, size and count; retro; airbags; sky crane; a hard
   landing or a failure. Cite the source in the code.
2. **Hardware at the model's bar**, to scale against the craft.
3. **Sequence**: the beats in the right order at the right altitudes; each separation reads on
   screen (what drops, what flies off, where to).
4. **Attitude**: braking tilt, entry attitude and swing under the chute, correct at any scrub time
   (`setState(s, prior)` gets the state 2 s earlier for exactly this).
5. **Camera**: the director frames each beat (`BEAT_SHOT` in descent-director.ts).
6. **Check**: a picture grid across the descent (entry, each beat, the last seconds, landed) at
   desktop and phone sizes; the descent tests pass.

Twins share one flow (operator's reuse rule): Apollo 11–17, Luna 16/24, Luna 17/21, Chang'e 3/4,
Chang'e 5/6, Spirit/Opportunity, Vega 1/2, Vostok 1–6, Gemini, Mercury, Skylab 2–4.

## Pass 2: every descent (80 profiles)

Engine features several landings need (build each once, then use it everywhere; details in the
research records):

- **hover** (Chang'e 3–6 at 100 m; Chandrayaan-3 at 800 m and 150 m; Tianwen-1 at ~100 m);
- **engine cutoff above the ground**, then verniers or free fall (Luna E-8 at ~20 m; Chang'e
  at ~4 m);
- **bridle lowering and cut, airbag inflation, bounces and roll** (Pathfinder, Spirit,
  Opportunity, Beagle 2);
- **failures**: SLIM (engine lost at ~50 m, nose-down), Beresheet (engine cut, impact),
  Chandrayaan-2 (loss at ~2.1 km), Schiaparelli (early chute release, 3 s burn, free fall),
  Mars 3 (signal lost after 14.5–20 s), Beagle 2 (partly opened petals);
- **after-landing beats**: petals, arrays (InSight), ramps and rover egress (Lunokhod, Yutu,
  Pragyan, Zhurong);
- **leg deploy, radar lock**, Viking's 2.4 m/s constant-velocity phase from 17 m.

| Body | Descents | Pass 2 focus |
| --- | --- | --- |
| Moon (22) | Apollo 11–17, Artemis 4/5, Luna 9/16/17/21/24, Chang'e 3–6, Chandrayaan-2/3, SLIM, Beresheet, Blue Moon MK1 | lunar record file; SLIM's model shape and Blue Moon's frame are open |
| Mars (14) | Viking 1, Mars 3, Pathfinder, Spirit, Opportunity, Phoenix, InSight, Curiosity, Perseverance, Schiaparelli, Tianwen-1, Beagle 2, two Starship | Mars record file. `/fly?mission=mars-pathfinder&descent=1` opened the planning page in the shot tool: check why first |
| Earth (33) | Mercury ×6 (check the launch escape tower shows on the Atlas stack), Gemini ×6, Vostok ×6, Voskhod ×2, Soyuz-1/11, Apollo 7/8/9, Apollo–Soyuz, Skylab 2–4, Shenzhou-1, Inspiration4, Polaris Dawn, Starship Flight 5 | chutes are done (table in the plan). Open: drogue sizes except Soyuz and Vostok; Voskhod main size; Vostok's cosmonaut ejected at 7 km and landed apart from the capsule; Voskhod's soft-landing rocket; Soyuz-1's tangled chute; Apollo, Dragon and Shenzhou still use the older capsule models (batch 8) |
| Venus (3) | Venera 13, Vega 1/2 | Vega's balloon deployment; Venera chute size not sourced |
| Titan, Jupiter | Huygens, Galileo probe | Galileo's descent renders washed out; probe not visible |
| Small bodies (5) | Hayabusa 1/2, OSIRIS-REx, NEAR Shoemaker, Philae | Philae is a dot in wide frames; NEAR uses LUNAR_POWERED (check it is right) |

## Tools (copies kept here, outputs to `test-results/shots/`, which git ignores)

Dev server: `NODE_OPTIONS=--max-old-space-size=8192 npx vite dev --port 5199 --strictPort`
(the 8 GB heap matters: it ran out of memory twice under several render agents; keep it to three
rendering agents at once). Then:

- `node docs/wip/2026-11-23-pass2-tools/desc-shot.mjs <prefix> <mission> "f0.5,-20,0"`: shots of
  a descent; `fX` is a fraction of the descent, a negative number is seconds before the end.
- `node docs/wip/2026-11-23-pass2-tools/hero-shot.mjs <fleet-id> <prefix> "30,10;-40,18"`: one
  model from given azimuth,elevation (the `/dev/showcase` page).
- `node docs/wip/2026-11-23-pass2-tools/sheet.mjs <prefix> <out.png> 4`: a picture grid of the
  shots with that prefix.
- `SHOT_DIR` and `DEV_URL` override the output folder and the server.

## Rules learned this round (keep them)

- **Photos before modelling.** Agents must download Commons images and compare renders side by
  side (`general-purpose` agent type; the `implementer` type has no web access). UA
  `OrreryRefBot/1.0 (reference images for 3D models)`, never a personal email.
- **No guessed numbers in fleet JSON** (shown to users as facts). Use `heightEstimate`.
- **Sizes in code cite their source**; an estimate says it is one.
- **Reference URLs go through `encodeURI`**: a raw `–` or `é` fails `npm run validate-data`.
- After a model batch: `npx tsx scripts/build-model-references.ts` (regenerates the credits),
  then `npm run check`, the lineup and descent tests, eslint, prettier, `npm run validate-data`.
- Unit tests for a change are mutation-checked: break the value, see the test fail, restore.

## After pass 2: the operator's wish list

1. Falcon 9 booster landings: on a pad (return to launch site) and on a droneship at sea. Part of
   this exists: the launch scene already shows a recovered booster's landing in an inset, with the
   drone ship, landing zones and the tower catch (`src/lib/three/landing-inset.ts`, UXD-050). The
   wish is a full scene for it, as the Starship catch has; start from the inset.
2. Apollo's way home: LM ascent, docking with the CSM, trans-Earth injection, re-entry and
   splashdown under three mains; then see whether Luna 16/24 or Chang'e 5/6 fit the same chain.

3. **ISS and Tiangong at the Dragon's level of detail** (operator 2026-11-23, after seeing the
   rebuilt Crew Dragon: "can we actually make ISS and Tiangong way better to this dragon level").
   Assess first, then build. The concern is rendering cost: a station is dozens of modules, and
   each new model is hundreds of meshes. Measure before deciding:
   - today's cost: draw calls, triangles and frame time of `/iss` and `/tiangong` on a phone-class
     profile (the `?debug=1` Perf tab), and of one rebuilt craft (Crew Dragon) in the viewer;
   - the levers: merge each module's static parts into one geometry per material
     (`BufferGeometryUtils.mergeGeometries`, already in three), instance repeated parts (truss
     segments, radiator panels, array cells, handrails), level of detail (the full model close
     up, the current proxy far away), and keep picking on a separate low-poly proxy
     (`userData.moduleId`, ADR-041 / ADR-049);
   - the constraints the rebuild must keep: the assembly walkers (`iss-assembly-phases.ts`,
     `tiangong-assembly-phases.ts`) animate modules in by id, the AR replay reuses them, and the
     visiting-craft dock events use the docking ports.
   Then a go or no-go per station with the measured budget, before any modelling.

4. **Untranslated /colophon entries outside the 3D models** (operator 2026-11-23: "hand over to
   the next session"). Regenerating the English base (`node scripts/i18n-tools/build-en-overlays.mjs
   original-work`) showed 252 entries that no locale has ever translated, from earlier arcs, not
   the models: `mission_trajectories` 140, `landing_art` 39, `exploded_art` 36, `blueprint_art`
   18, `site_illustrations` 16, `diagrams_science` 3. They show in English on /colophon in every
   locale. Same method as the 3D-model round of this session: a per-locale todo (keys missing from
   `i18n-src/<loc>/original-work.json`), the translation brief kept at
   `docs/wip/2026-11-23-pass2-tools/colophon-translation-brief.md`, one agent per locale group.

Deferred by the operator until then: the other stations, the Worlds Tier 1 models.
