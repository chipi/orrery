# Content 4 — STS-1, STS-51-L, STS-107, Artemis I

**Landed 2026-11-15.** The operator approved every staged image ("images are fine", STS-51-L 06 stays a gallery image), the side branch was merged onto `tech-debt/0.9.9` and the images went through `scripts/replace-gallery-slots.ts` (map `scripts/link-fixes/2026-11-15-content4-images.json`: 27 mission and 5 fleet images). The text below is the state before the merge.

Written 2026-11-15 on `tech-debt/0.9.9`. The four missions are authored and held on the side branch `content4-pending` (one commit on top of `68566680f2e`), because `validate-hero-coverage` fails until each has an approved hero. This file and the image candidates are the only parts on the trunk.

## What is on `content4-pending`

| Part | Files |
|---|---|
| Missions | `static/data/missions/earth/{sts-1,sts-51-l,sts-107}.json`, `moon/artemis1.json`, four rows in `missions/index.json` (`crewed` true for the STS flights; `outcome: "failure"` on STS-51-L and STS-107) |
| Text | en-US and 13 hand-written overlays per mission (52 files), the 14 crew names in `scripts/i18n-tools/native-terms.json`, en-source hashes |
| Programs | `space-shuttle` and `artemis` rosters link `sts-1`, `sts-51-l`, `sts-107`, `artemis1` as mission rows; the roster keys moved to `mission:<id>` in 13 overlays |
| Fleet | `linked_missions` of columbia, challenger, orion, sls-block-1, space-shuttle-stack, lc-39a, lc-39b (derived by `migrate-fleet-linked-missions.ts`; the unrelated churn that script made was reverted) |
| Generated | trajectory thumbnails and card crops, image-ladder rows, link provenance, route-lastmod rows, original-work counts, the corpus-count block of TA.md |
| Code | `fly-craft.ts` rows for the Shuttle orbiters (showcase `columbia`, `challenger`), `lander-cruise-models.ts` row for Artemis I (the Orion cruise model), test counts (132 missions, Moon 35, Earth 44, orbiter rows 5, program links 6) |

## Decisions that need the operator's eye

1. **STS-51-L plays no launch from the UI.** The mission has no `flight` block and no `flight_data_quality`, which is what the mission panel needs to offer the Fly chip. The ascent scene cannot end at T+73 s and no break-up animation was invented. A typed `/fly?mission=sts-51-l` URL still resolves a launch from the `vehicle` string (every vehicle string gets at least the generic profile), so stopping that needs a small code guard; it is not done.
2. **STS-1 and STS-107 offer the Fly chip** (`flight_data_quality: reconstructed`, as the other Earth missions). `/fly` plays the Shuttle ascent with the payload in the bay; there is no Earth-orbit coast descriptor for the Shuttle (`earth-orbit-registry.ts` has none), so the act after ascent is whatever the router does for an Earth mission without one. Not run in a browser.
3. **Artemis I trajectory is schematic.** `tier_1_analytic`, no waypoints: the model has no distant-retrograde-orbit arrival type, and the hybrid generator drew a 500,000 km chord between the pinned flyby events. `transit_days` 9 is the time to DRO insertion. The thumbnail shows launch, lunar arrival and splashdown only.
4. **Crew-loss text** names the crew exactly as NASA does and states the Rogers Commission and CAIB findings in their own words, with no account of the crew's last moments. Reviewed by the science reviewer before translation; its findings are applied (relinked Rogers chapters IV and V, removed an unverified "first Israeli astronaut", added the CAIB foam-strike clause, made the Artemis I transit consistent).

## Image candidates (nothing promoted)

Staged in `static/images/_staging/missions/<id>/` (git-ignored), with source, licence and credit in `docs/wip/content4-image-candidates/<id>.json`. Contact sheets were built in the session scratchpad and viewed. All NASA, public domain. No image of either accident is staged; `sts-51-l` 06 is a liftoff frame of the flight that ended in the accident and is flagged for a ruling. `sts-51-l` 01 (the crew portrait) is the same file as the existing fleet `challenger/02`.

| Mission | Hero candidate | Others |
|---|---|---|
| sts-1 | 01 liftoff from 39A (portrait; 02 is a landscape alternative) | landing approach, Columbia on the lakebed, stack on the pad, Young and Crippen, crew after landing, suit-up check |
| sts-51-l | 01 official crew portrait | pre-launch breakfast, white room, stack on the crawlerway, mission patch, 06 liftoff (ruling) |
| sts-107 | 01 official crew portrait | crew in orbit, crew at the white room, launch (two frames), mission poster (not a hero) |
| artemis1 | 01 SLS lifting off at night | SLS on the pad, Orion with the Moon (two), Orion selfie, capsule after splashdown, splashdown from afar, Moonikin Campos unpacked |

Fleet candidates (new, not yet in the galleries): orion 05, 06; sls-block-1 06; columbia 06; challenger 06 (listed at the end of each mission file).

## To land the missions

1. The operator approves a hero (and gallery) per mission; run `scripts/replace-gallery-slots.ts` with a map in `scripts/link-fixes/`, as slice H did.
2. Merge `content4-pending`; run `node scripts/build-i18n-bundles.mjs`, `npm run validate-data`, the two thumb tests (`entity-thumb`, `programs-roster`) and `npx vitest run scripts/i18n-tools`.
3. Regenerate `route-lastmod` after the commit (the four rows there carry the last-commit dates of the old files).

Facts not read in a primary page are in `docs/wip/2026-11-15-search-backlog.md` S14 to S18.
