# Slice A v3 — manual-source backlog

Generated 2026-06-18 after Slice A v3 round-4 ship.

## Why this list exists

During Marko's round-4 manual rescue pass, several gallery slots were
"approved" not because the proposed image was a true hero — but because
the auto-pipeline had nothing better. The dropped-pool alternatives for
these slots were random off-topic content (cars, horses, houses, trees,
etc., surfaced via fuzzy NASA Images query matches). Marko picked the
duplicate-of-another-slot as the **least-bad** option so the gallery
isn't blank on the live site, with the explicit understanding that
these slots need hand-sourcing later.

The underlying cause: the `slice-a-*-dryrun.json` files were generated
**before** commit `20f3016ac` (Stage 2 — resolver per-pick dedup
across dry-run). Inside a single dryrun the resolver returned the same
top-1 candidate for every slot of a given mission. The next pipeline
iteration regenerates the dry-runs through the diversified resolver,
which will give multi-slot missions a fighting chance at distinct
candidates — but until then, the slots listed below are knowingly
populated with duplicates.

The allowlists are in `scripts/validate-image-dupes.ts` under the
`ALLOWLIST_AUTHORIZED (2026-06-18) — Slice A v3 round-4 rescue ship`
comment block. Removing entries from there once the slots have proper
hand-sourced replacements lands as part of the cleanup.

## Items needing hand-sourcing

### Fleet galleries (gallery slots filled with duplicate of hero)

| Mission | Slots | Same byte SHA | Rationale |
|---|---|---|---|
| `a7l` (A7L spacesuit) | 03, 04, 05 | `eada8e1c` | Suit lineage gallery; 3 slots show the same suit photo |
| `aces` (ACES launch/entry suit) | 02, 03, 04, 05 | `702fcc41` | All 4 gallery slots collapsed to one image |
| `cygnus-standard` | 02, 03, 05 | `78248fa6` | Cygnus cargo fleet gallery; 3 slots same image |
| `emu` (Extravehicular Mobility Unit) | 02, 03, 04, 05 | `0028195c` | EVA suit gallery; all 4 slots one image |
| `lc-34` (Launch Complex 34) | 03, 04, 05 | `7dacaa15` | Apollo-era pad; gallery shows same pad shot 3× |
| `lunar-prospector` | 01, 04 | `5671243e` | Hero AND gallery slot 04 are the same image |
| `maven` | 01, 04 | `d79e07ae` | Hero AND gallery slot 04 are the same image |

### Mission galleries (hero + gallery slot duplicate)

| Mission | Slots | Same byte SHA | Rationale |
|---|---|---|---|
| `dart` | 01, 05 | `12042c1f` | DART hero + slot 05 share the same image |
| `freedom-7` | 03, 05 | `730db1bd` | Two gallery slots show same image |
| `friendship-7` | 01, 02 | `5faf9c60` | Hero + gallery slot 02 are the same image |
| `mercury-atlas-9` | 03, 05 | `f2730ab6` | Two gallery slots show same image |
| `mercury-redstone-3` | 01, 04 | `de85aceb` | Hero + gallery slot 04 are the same image |
| `spirit` | 01, 02 | `ff4e464c` | Hero + gallery slot 02 are the same image |

## Suggested hand-sourcing priority

1. **Hero+slot dupes** (lunar-prospector, maven, dart, friendship-7,
   mercury-redstone-3, spirit) — these create a "the hero is the same
   as one gallery slot" visual repeat that's especially obvious on the
   site. Sourcing distinct slot images first removes the most visible
   collisions.
2. **Long galleries with single image** (aces 02-05, emu 02-05) —
   these show "1 image pretending to be 4" which is the worst UX. Even
   1 alternative per slot would help.
3. **Spacesuit gallery slots** (a7l 03-05) — lower priority because the
   suit hardware is consistent across photos; less "obvious copy" feel.
4. **Pad/launch-site galleries** (lc-34 03-05) — same shot from
   different angles is plausible; lower visual impact.

## When sourcing replacements

For each slot above:

1. Find a candidate image via the Wikimedia Commons / NASA Images /
   agency archive that's distinct from the existing slot 01 of that
   mission.
2. Drop the file at `static/images/<surface>/<missionId>/<slot>.jpg`
   replacing the duplicate.
3. Update the matching sidecar entry in
   `static/data/fleet-image-sources.json` or
   `static/data/mission-image-sources.json` with the new source
   metadata (`source_type`, `image_url`, `credit`, `license`).
4. Remove the corresponding SHA from
   `scripts/validate-image-dupes.ts` ALLOWLIST so the byte-dupe gate
   re-engages.
5. Re-run `npm run build-image-provenance` and the byte/phash
   validators to confirm clean.

## Counts

- Items in this backlog: **13 dupe groups** spanning **33 image files**.
- Each group has 2–4 slots collapsed to a single image.
- Total cleanup work: ~33 hand-sourced replacements + 13 allowlist
  entries to retire.
