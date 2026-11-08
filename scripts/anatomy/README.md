# scripts/anatomy — cutaways, exploded views, landing sheets, mission blueprints

Generated art for `/fleet`, `/missions` and `/colophon`. The method (references, house styles,
review, where masters go) is in [`docs/anatomy-art-runbook.md`](../../docs/anatomy-art-runbook.md)
and [`docs/guides/launcher-cutaway-style.md`](../../docs/guides/launcher-cutaway-style.md). Read a
script's header before running it.

| File | What it is | Run |
| --- | --- | --- |
| `prompts-history.json` | every shipped generation: prompt, references, generation id | record; append after each batch |
| `blueprints-history.json` | the same for mission blueprints | record |
| `build-batch-2026-10-23.mjs` → `batch-2026-10-23.json` | the 62 cutaway prompts of the 2026-10-23 batch, from the house templates | `node scripts/anatomy/build-batch-2026-10-23.mjs` |
| `exploded-specs.mjs` | stage and engine specs for launchers with an exploded cutaway that `/fly` does not fly; read by `scripts/essays/build-cutaway-sketches.mjs` | imported |
| `lander-exploded-2026-11.mjs` | exploded cutaways of the landed craft, in the launcher exploded style (two references: style, then the craft's own cutaway) | `node scripts/anatomy/lander-exploded-2026-11.mjs [id …]` (prints the requests) |
| `landing-sequences-2026-11.mjs` | one landing-sequence sheet per site: arrival, descent, touchdown, after landing (text-free Curiosity anchor as reference) | `node scripts/anatomy/landing-sequences-2026-11.mjs [id]` (prints the requests) |
| `blueprint-plan-view.ts` | blueprint reference sheet: heliocentric plan view from real data, empty panels for the drawings | `npx tsx scripts/anatomy/blueprint-plan-view.ts <mission> <out.png>` |
| `blueprint-cislunar-view.ts` | the same for Earth–Moon missions: free-return figure-eight in the rotating frame | `npx tsx scripts/anatomy/blueprint-cislunar-view.ts <mission> <out.png>` |
| `blueprint-earth-view.ts` | the same for Earth-orbit missions: ground track on a world map, orbit to scale | `npx tsx scripts/anatomy/blueprint-earth-view.ts <mission> <out.png>` |
| `blueprint-polar-view.ts` | the same for out-of-ecliptic missions (Ulysses): side view, orbit over the Sun's poles | `npx tsx scripts/anatomy/blueprint-polar-view.ts <mission> <out.png>` |

The `blueprint-*` scripts are free and local (they draw PNGs). The two `-2026-11` scripts only
print the generation requests. Sending them to the image service spends credits, so size the
run and get a go first.
