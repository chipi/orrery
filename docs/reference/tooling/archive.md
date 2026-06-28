# Archived one-shot scripts (`scripts/_archive/`)

> Inventory of the 135 retired one-shot scripts moved out of `scripts/` on
> 2026-06-28. These ran **once** during a specific wave/slice/migration and are
> kept for historical reference only — they are **not** re-runnable as-is (their
> relative imports no longer resolve from the archive depth) and are excluded
> from ESLint, Prettier, and `tsconfig`. Nothing in the live tree imports them
> (verified by reference check before the move).

**If you need the behaviour of one again, don't un-archive it** — read it for the
recipe, then write a fresh standing tool (or extend an existing one) under
`scripts/`. The recurring patterns these encode now live in durable tools:
translation → `scripts/wave23/` + the ADR-069 gate; image sourcing → the
[image pipeline](image-pipeline.md); data shape → the schema + `validate-data`.

## Why these were archived

The live `scripts/` directory had grown to ~260 files, ~165 of them one-shots,
drowning the ~60 standing tools agents actually need. Separating them makes the
durable surface legible (see the [tooling index](README.md)) and stops new
agents from cargo-culting a dead per-batch script when a standing tool exists.

## Groups

### `_archive/i18n/` (36) — per-wave translation passes
The historical translation toolchain: `translate-*.mjs` (per-surface: satellites,
belts, science, iconic missions, orbit rulers, fly phases, launchers, shuttles,
panel/chip labels, tides, v0.7 UI, …), `apply-slice-*-translations.mjs`,
`seed-satellite-i18n.mjs`, `paraglide-add-keys.mjs`, `add-flat-patch-i18n.mjs`,
`patch-tooltip-messages.mjs`, `wave-credits-keys.mjs`, `fill-moon-sites-locale-gaps.ts`.
**Superseded by** `scripts/wave23/` (catalog → maps → apply) + the ADR-069
overlay-completeness gate in `validate-data`.

### `_archive/image-sourcing/` (39) — per-batch fetch + hand-source passes
`fetch-batch-2-*`, `fetch-broader-*`, `fetch-followup-*`, `fetch-phase3c-*`,
`fetch-right-stuff-*`, `fetch-satellite-*`, `fetch-slice-*`, `fetch-spacecraft-*`,
`fetch-tier-*`, `fetch-v2-practice-pass`, `fetch-via-agency-registry`,
`fetch-zero-image-entities`, `fetch-iconic-better-heroes`, the `handsource-*`
family (11 manual-sourcing passes), `hubble-pass`, `sun-replace`,
`audit-fleet-weak-heroes`, `audit-image-source-order`.
**Superseded by** the standing [image pipeline](image-pipeline.md):
`fetch-assets.ts` (agency-first, staging-by-default), `fill-gallery-gaps.ts`,
`source-known-gaps.ts`, `fetch-fleet-sub-a-curation.ts`.

### `_archive/slices/` (19) — the slice-by-slice imagery curation waves
`slice-a-*` (dryrun / vision-pass / salvage / review / cluster-report / apply /
manual-source), `slice-b-*`, `slice-explore-*`, `slice-f-audit`,
`slice-pre-a-corpus-vet`, `build-slice-{a,b,c}-*`. The `/dev/slice-a-review`
route is the (now-orphaned) review surface these fed; the durable equivalent is
`/dev/staging` (RFC-029).

### `_archive/data-builds/` (20) — one-time catalog builders
`build-apollo-missions`, `build-mercury-missions`, `build-tier-{b,c,d,f,g}-*`,
`build-followup-entries`, `build-right-stuff-entries`, `bodies-{apply,salvage}`,
`belts-{curate,structure-curate}`, `copy-mission-to-fleet`,
`curate-science-sections`, `augment-flight-rosters{,-2}`, `scaffold-fleet-entries`,
`wire-spacecraft-refs`, `fix-stringified-arrays`. These seeded `static/data/`
catalogs that are now committed and edited in place.

### `_archive/migrations-fixups/` (17) — one-time schema migrations + backfills
`migrate-fleet-{crew-flights,en-us-overlays,learn-links}`, `migrate-{mission,site}-fleet-refs`,
`backfill-{cislunar-profiles,region-bounds,traverse-stops,sidecar-from-report,walker-fallback-titles,crewed-flag}`,
`remap-sidecars-after-dupe-delete`, `harvest-sidecars-from-sourcing-report`,
`fill-{hotspot-metadata,site-story}-stubs`, `seed-iss-overlays`, `patch-image-provenance`.
**Note:** `migrate-fleet-linked-missions.ts` and `migrate-fleet-linked-sites.ts`
were **kept** in `scripts/` (not archived) because `validate-data` emits them as
live fix-hints when `fleet_refs`↔`linked_*` drift — see
[content-pipelines.md](content-pipelines.md).

### `_archive/diagnostics/` (4) — scratch/diagnostic probes
`_hirise-{diag,dtype,pattern}.ts` (HiRISE format probes from the hotspots
bring-up), `analyze-moon-meet-points.mjs`.

## Reversibility

The move was `git mv` (history preserved). To inspect any script's full history:
`git log --follow scripts/_archive/<group>/<name>`. Deleting `_archive/` entirely
is safe at any time — nothing references it.
