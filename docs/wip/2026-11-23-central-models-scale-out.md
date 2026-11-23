# Central models: scale-out plan (0.9.11)

Pilots approved by the operator on 2026-11-23: the Apollo LM (`showcase/lunar-module.ts`) and
Curiosity (`showcase/mars-rovers.ts`), plus the MSL EDL hardware (`showcase/msl-edl.ts`,
`dgbParachute`). The aim is one model per craft, used in every place (lineup, /fly launch, descent,
Worlds, fleet pages), at that bar.

## Inventory (2026-11-23, corrected)

The first draft counted every fleet entry as a new build. It counted launchers that already have
launch-scene models, and listed the pre-pilot showcase models a second time. Corrected:

| Category | Total | Showcase model | None yet (drawn by an older system) |
| --- | --- | --- | --- |
| lander | 29 | 0 | 29 (Tier 0 shapes, Tier 1 Worlds models) |
| rover | 14 | 1 (Curiosity, pilot) | 13 |
| crewed-spacecraft | 29 | 13 (incl. the LM pilot) | 16 (Mercury, Gemini, Vostok, Voskhod, Soyuz ×5, Shuttle orbiters) |
| cargo-spacecraft | 11 | 8 | 3 (Progress) |
| orbiter | 57 | 16 | 41 |
| observatory | 12 | 0 | 12 |
| station | 13 | 1 (Skylab) | 12 (ISS and Tiangong have their own models: iss-proxy-model, tiangong-proxy-model) |

- 37 of the showcase models predate the pilot bar.
- Launchers (40) are out of scope: all of them have launch-scene models (launcher-models.ts), which
  the operator has approved.

## Order

1. **Descent craft at the pilot bar** (landers, rovers, crew capsules, about 45, new or rebuilt), with
   their EDL hardware: Apollo's three ringsail mains, Viking's DGB, Pathfinder/MER airbags.
2. **Orbiters and observatories.**
3. **Fleet pages** use the central models (wiring).

Deferred by the operator (2026-11-23), who has other plans there: ISS and the other stations, and
the Worlds Tier 1 hotspot models.

## Two passes (operator 2026-11-23)

- **Pass 1: models.** Build every model in scope at the pilot bar and wire each into the places
  that show it (lineup, /fly descent, fleet pages).
- **Pass 2: flows.** Go descent by descent with the checklist below. The landing-mechanism
  research for each family is gathered during pass 1, ready for pass 2.

**Reuse rule (operator 2026-11-23):** near-identical craft share one model, as the six Apollo
landings share one LM. No effort goes into small differences between twins or variants. Pairs and
families that share a model:

- Luna 16/24, Lunokhod 1/2, Chang'e 3/4, Chang'e 5/6, Yutu/Yutu-2, Vikram CY-2/3;
- Viking 1/2, Spirit/Opportunity;
- Vostok/Voskhod (one capsule, Voskhod's airlock only if it is visible at a glance);
- the Soyuz versions, the Progress versions, Mercury, Gemini;
- the six Shuttle orbiters;
- Lunar Orbiter 1–5, Voyager 1/2, Pioneer 10/11, Vega 1/2.

The same rule holds in pass 2: twin descents share one flow.

Pass 1 batches (5–6 models each, two implementer agents at a time):

1. Lunar landers and rovers:
   - east: Luna 9, Luna 16/24, Lunokhod 1/2 with the E-8 stage, Chang'e 3/4 with Yutu/Yutu-2,
     Chang'e 5/6;
   - west: Vikram (CY-2/3) with Pragyan, SLIM, Beresheet, Blue Moon MK1.
2. Mars landers and rovers: Viking, Mars 3, Pathfinder with Sojourner, Spirit/Opportunity, Phoenix,
   InSight, Perseverance, Zhurong, Schiaparelli, Beagle 2, Rosalind Franklin.
3. Crew capsules: Vostok, Voskhod, Mercury, Gemini, Soyuz (7K-OK, T, TM, TMA, MS), Progress; plus a
   re-bar of the Apollo CM, Orion, Dragon and Shenzhou showcase models.
4. ~~Shuttle orbiters~~: already modelled (winged.ts). The first inventory's regex missed entries
   written as `'id': builder(...)`; the corrected inventory also found soyuz-progress.ts, which
   batch 3 replaced.
5. Probes and landers on small bodies and Venus: Huygens, the Galileo probe, Hayabusa 1/2,
   OSIRIS-REx, NEAR, Rosetta with Philae, Venera 7/13, Vega, Mars 2/6, Mars Polar Lander.
6. Observatories (12).
7. Orbiters still without a model (41), in families.
8. Re-bar the remaining pre-pilot showcase models (cargo and orbiters).

## Progress (2026-11-23)

| Batch | Commit | State |
| --- | --- | --- |
| 1 lunar landers and rovers | e3b7f16c52a | accepted; SLIM's shape and Blue Moon's frame parked for pass 2 |
| 2 Mars landers | e77920605c8 | accepted |
| 2b rovers (MER, Perseverance, Zhurong, Rosalind Franklin, LRV) | 78b55b43af9 | accepted |
| 3 classic capsules (Vostok/Voskhod, Mercury, Gemini, Soyuz, Progress) | b04942bb785 | accepted |
| 5 probes (Cassini/Huygens, Galileo, Rosetta, Hayabusa, OSIRIS-REx, Venera, Vega, Giotto) | — | building |
| 6 observatories | — | building |

Still to do in pass 1:

- batch 7, the orbiters with no model;
- batch 8, re-bar the pre-pilot models;
- **wiring**: put each new model into /fly (fly-craft.ts FLY_CRAFT, descent-landers.ts DETAILED) and
  into the fleet pages.

Every new showcase file is now credited automatically (build-model-references globs the folder).
A new reference host needs a publisher group there.

## Lessons from batch 1 (put them in every brief)

- **Builders must see photos.** The `implementer` agent type has no web access, and WebFetch returns
  only text, so the first pass was modelled from memory (SLIM came out as an upright box; the real
  one is a long gold body with a dome at one end). Fix:
  - use the `general-purpose` type;
  - search Wikimedia Commons with `api.php?action=query&list=search&srnamespace=6`;
  - download with `Special:FilePath/<File>?width=800` into the scratchpad;
  - open the image with the Read tool;
  - compare the render with the photo side by side.
  - No personal email in the User-Agent.
- **No guessed numbers in fleet data.** Fleet `specs` are shown to users as facts. With no
  published height, the model sets `heightEstimate` and the line-up sizes it by `heightM`; the
  line-up test enforces one or the other.
- Crinkled foil and seams on every blanketed surface; flat painted boxes fail review.
- A correction round per batch is normal; budget about twice the first build.
- The dev server runs out of memory under several agents (twice on 2026-11-23). It now runs with
  `--max-old-space-size=8192`; at most three rendering agents at once.

## Every landing, not just its model (operator 2026-11-23): pass 2

The pilots went beyond the model: the descent sequence was checked and the landing hardware made
real. Each landing gets the same treatment:

1. **Mechanism from the record.** How it really came down: parachute type, size and count;
   retro rockets; airbags; sky crane; a hard landing; splashdown. Sources cited in the code.
2. **Hardware at the model's bar.** Chute, aeroshell, backshell, airbags, descent stage, drawn to
   scale against the craft.
3. **Sequence.** The beats (events) are in the right order at the right altitudes. Each separation
   reads on screen: what drops, what flies off and where it goes.
4. **Attitude.** Braking tilt, entry attitude and swing under the chute are correct at any scrub
   time.
5. **Camera.** The director frames each beat: the chute, the separation, the touchdown.
6. **Check.** Contact sheet across the descent (entry, each beat, the last seconds, landed) at
   desktop and phone sizes; the descent tests pass.

## How

- Batches of 5–6 models, grouped by family so the parts kit grows with them (legs, bells, foil,
  solar arrays, chutes).
- Each batch is built by one implementer subagent (sonnet). The brief holds the pilot files as
  the style reference, the contract (real metres, base at y = 0, +z front, MeshStandardMaterial)
  and photo references.
- I review each model in `/dev/showcase?hero=1` at three angles, then in its flow (the descent
  or the launch).
- The operator approves each batch from one contact sheet before the next starts.
- A test per model: drawn height matches the fleet `specs`, within 1% (the lineup test does
  this already).

## Cost: not measured yet

- I have no per-model token figure. The pilots took five review rounds each inline, which is
  not a measure for a subagent.
- First batch: measure it (the 5–6 Wave 1 lunar landers), then report the cost per model and
  extrapolate to the 205 before going further.

## Not covered by this plan

- Textures or photogrammetry: the models stay procedural, as in the pilots.
- IBL in the descent scene: metals there still render darker than in the lineup.
- Per-mission EDL timing changes: the trajectories stay as they are.
