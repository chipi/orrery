# launches-replay

Replay proof for the 2026-10-16 launch fix (#566): the GCAT 1.8.8 format change and first-flight detection. Old code (from git) and new code run over one frozen corpus and are compared against explicit pass criteria.

| File | Owns |
|---|---|
| `corpus/2026-10-16/ll2-upcoming.json.gz` | LL2 `launches/upcoming` in `mode=detailed`, 476 launches fetched 2026-10-16 10:10 UTC, trimmed to the fields the LL2 source reads plus each configuration's counts |
| `corpus/2026-10-16/gcat-launch.tsv.gz` | GCAT `launch.tsv` Release 1.8.8 (data update 2026-10-15): the header plus the rows whose `Category` the parser keeps (`Sat`/`Spc`/`Lunar`/`Deep`); dropped rows can't affect either parser |
| `corpus/2026-10-16/live-0928-first-flight.json` | What prod published at 09:28 UTC: 465 upcoming, the ids of the 50 tagged `first-flight-vehicle` |
| `replay.ts` | `runReplay(codeRoot)`: mirrors `scripts/fetch-launches.ts` phases 1–5 with the code under `codeRoot` |
| `check.ts` | Pass criteria; CLI exits 1 on failure |
| `replay.test.ts` | The new-code criteria, run by `npm run test` (so preflight and CI) |

## Run

```bash
# New code only (also runs in vitest):
npx tsx scripts/launches-replay/check.ts

# Old vs new: check out the commit before the fix as a worktree first.
git worktree add --detach /tmp/launches-baseline <commit-before-fix>
npx tsx scripts/launches-replay/check.ts --baseline /tmp/launches-baseline
git worktree remove /tmp/launches-baseline
```

## Criteria

- **Baseline is faithful.** On this corpus the old code hits prod's GCAT header failure and reproduces prod's 465 upcoming entries and exactly its 50 first-flight ids.
- **History is unchanged.** The new code on the real 33-column GCAT gives the same 7,367 historic entries, with identical tiers, as the old code on the same rows projected to 1.8.0's 28 columns.
- **Every upcoming first flight is a vehicle LL2 says never flew.** Its configuration is not a placeholder, has 0 launches, and is not a generic configuration whose same-named family has flown. It is its configuration's earliest launch, and the only first flight for that configuration.
- **Nothing else moves.** Every upcoming entry that is a first flight in neither run keeps its tier and reason.

## Result (2026-10-16)

- Upcoming first flights: 50 → 24.
  - **Removed (42):** every one either has launches on record (Falcon 9 Block 5 640, Electron 97, PSLV-CA 18, Vega-C 8, …), is a later launch of a not-yet-flown configuration, or is a placeholder / generic configuration ("Unknown Launch Vehicle", "Ariane 6", "Vulcan", "H3").
  - **Added (16):** configurations with 0 launches that the family-name rule missed (Gravity-2, RFA One, Long March 10A, Vega-E, …).
- Historic: 7,367 entries and 279 first flights, both identical to the old code.
- **Mutants**, all killed by `check.ts --baseline`:
  - flag every launch of a 0-launch configuration;
  - treat a missing count as 0;
  - drop the placeholder guard;
  - drop the generic-family rule;
  - ignore the header index;
  - read fields by 1.8.0 position;
  - drop GCAT's two-launch minimum;
  - use the cross-source family rule.
- **End-to-end run:** `scripts/fetch-launches.ts` against live sources in a scratch data dir gave the same 24 / 279. No `rocket_config_prior_launches` leaked into the manifest, and `sources_active` was `["gcat","ll2"]`.

## Not covered

- **Not in the corpus:** NASA and ESA (the SpaceX source was removed later the same day, #603). They returned nothing in prod's 09:28 run, so the corpus has no agency-direct entries. An upcoming launch that only those sources know about never gets a first-flight flag.
- **The orchestration is mirrored, not imported.** `replay.ts` copies `fetch-launches.ts`'s phases rather than calling them; a wiring change in `fetch-launches.ts` is caught only by the end-to-end run, not by this gate.
- **Where LL2's two counts disagree:** "Long March 10" (config 536) and "Mir" (config 502) report 0 launches for the configuration but 1 for the same-named family, so the generic-family rule drops them. The operator confirmed both as maiden flights (2026-10-16, #603); they are listed in `launches-curation.json` `first_flight_configs`, and `checkNew` exempts listed configs from the generic-family test only. Replay of HEAD vs that change on this corpus: exactly those 2 upcoming entries move (T3/standard → T1/first-flight-vehicle); all other upcoming and historic tiers are identical. Any other vehicle in this situation stays unflagged until it is listed.
- **LL2 data quality:** a wrong `total_launch_count` upstream gives a wrong flag. Operators can still feature or demote via `launches-curation.json`.
