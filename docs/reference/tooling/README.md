# Orrery tooling reference

The canonical map of Orrery's **standing tools** — the scripts and `npm run`
targets you actually invoke (build, validate, fetch, generate, deploy). It exists
because `scripts/` had grown to ~260 files and the ~60 durable tools were buried
under ~165 one-shot wave/slice/migration scripts (now in
[`scripts/_archive/`](archive.md)).

This is an **index**: each category page lists tools with *what / when / gotchas /
state*, and links to the deep references rather than duplicating them. The deep
references remain authoritative for end-to-end flow:

- **[`docs/adr/TA.md` §pipelines](../../adr/TA.md)** — the 10 numbered build-time pipelines.
- **[`scripts/IMAGE-PIPELINE.md`](../../../scripts/IMAGE-PIPELINE.md)** — full image pipeline (source order, worked example).
- **[`docs/guides/image-pipeline-v2.md`](../../guides/image-pipeline-v2.md)**, **[`docs/guides/audio-pipeline-setup.md`](../../guides/audio-pipeline-setup.md)**, **[`docs/anatomy-art-runbook.md`](../../anatomy-art-runbook.md)** — operator runbooks.

## Category pages

| Page | Covers |
|---|---|
| [build-ci-deploy.md](build-ci-deploy.md) | `build` / `preflight` / `lint` / `typecheck` / `test`, screenshots, secret scans, docker, the deploy + release workflows |
| [data-validation.md](data-validation.md) | `validate-data` orchestrator + every validator gate + the on-demand `audit:*` family |
| [image-pipeline.md](image-pipeline.md) | `fetch-assets` → `score-images` → `/dev/staging` → `build-image-provenance`, hotspots, hero/dedup maintenance, `scripts/lib/` |
| [content-pipelines.md](content-pipelines.md) | i18n (`wave23` + paraglide), audio, links, launches, science index, porkchops, tech-BOM, cislunar |
| [archive.md](archive.md) | the 135 retired one-shot scripts + why |

## When to reach for what (quick index)

| I want to… | Run | Page |
|---|---|---|
| Verify before pushing | `npm run preflight` | [build-ci-deploy](build-ci-deploy.md) |
| Check JSON data is valid + complete | `npm run validate-data` | [data-validation](data-validation.md) |
| Prove every shipped image is used | `npm run audit:images` | [data-validation](data-validation.md) |
| Fetch new imagery for an entity | `npm run fetch-assets` (stages to `_staging/`) | [image-pipeline](image-pipeline.md) |
| Score fetched images | `npm run images:score` | [image-pipeline](image-pipeline.md) |
| Review + promote staged images | `/dev/staging` (dev route) | [image-pipeline](image-pipeline.md) |
| Re-credit after promoting | `npm run build-image-provenance -- --offline` | [image-pipeline](image-pipeline.md) |
| Add surface (Mars/Moon) detail imagery | `npm run images:hotspots` (Node 20 + gdal) | [image-pipeline](image-pipeline.md) |
| Compile messages for dev/build | `npm run i18n:compile` | [content-pipelines](content-pipelines.md) |
| Translate to all 14 locales | `scripts/wave23/` toolchain | [content-pipelines](content-pipelines.md) |
| Generate narration audio | `npm run audio:generate -- --episode <id>` | [content-pipelines](content-pipelines.md) |
| Validate outbound LEARN links | `npm run check-learn-links` | [content-pipelines](content-pipelines.md) |
| Refresh the launches manifest | `npm run fetch:launches` | [content-pipelines](content-pipelines.md) |
| Deploy to prod | trigger **Deploy to prod VPS** workflow | [build-ci-deploy](build-ci-deploy.md) |

## State & opportunities (assessed 2026-06-28)

**Overall: healthy.** The durable surface is small, mostly npm-wired, and gated by
`preflight` + `validate-data`. The pipelines (fetch, provenance, validation,
audio, i18n, deploy) are all current and exercised by CI/docker-e2e.

What this audit changed:

- **Resolved the one-shot sprawl.** 135 dead one-shots moved to
  [`scripts/_archive/`](archive.md); `scripts/` now reflects only standing tools.
  ESLint / Prettier / tsconfig exclude the archive.
- **Fixed a broken standing tool.** `scripts/release-rehearsal.ts` redeclared
  `const changelogPath` at module scope (TS2451) — `npm run release:rehearsal`
  would have thrown at parse. `scripts/` is outside the tsconfig include, so
  `npm run typecheck` never caught it. De-duped this session.

Opportunities worth a future slice (none blocking):

1. **`scripts/` isn't typechecked.** The TS2451 above slipped through because the
   tsconfig include is src-focused; standing `scripts/*.ts` get type-checked only
   when something imports them or when `tsx` runs them. Worth a `tsconfig.scripts.json`
   + a `typecheck:scripts` step so tool bugs fail closed in CI.
2. **Promote audits into gates.** `npm run audit:images` is the strongest
   candidate — it already exits 1 on orphans and knows all ~11 gallery manifests,
   vs the 2 that `validate-gallery-counts` gates. Folding it (and `audit-image-mime`,
   already inline) into `validate-data` makes image-orphan regressions fail closed.
   Coverage is a one-way ratchet (AGENTS.md).
3. **Overlapping/disk-mutating audits.** `audit-fleet-heroes.ts` *mutates disk*
   (auto-swaps slots + rewrites the sidecar) and overlaps the newer read-only
   `audit-heroes.ts` — retirement / merge candidate. Audit tools should default
   to read-only with an explicit `--repair`.
4. **Small consolidations.** `check` and `typecheck` are byte-identical npm
   scripts; `gh-pages-compat.mjs` hand-mirrors the locale list from
   `project.inlang/settings.json` (drift hazard — derive it).
5. **Stub commands exit 2.** `npm run audio:translate` and `audio:build` are
   not-implemented stubs (deferred to v0.8 / #152). Fine, but document/track so
   nobody wires them into a pipeline expecting output.
6. **Discoverability + headers.** Many standing tools aren't npm-aliased
   (`compute-phash`, `generate-hero-overrides`, `prune-orphan-images`) — run via
   `npx tsx scripts/<name>.ts`. Alias the frequently-used ones, and give every
   *standing* script a one-line header (purpose + alias) so this index can be
   regenerated mechanically — most archived one-shots had none.
7. **`hotspots/` has its own one-shots.** `backfill-imagery-provenance.ts`,
   `reupsert-tier2-provenance.ts` are one-shot backfills left in place because the
   subdir is a cohesive unit; a future pass could split `hotspots/_archive/`.
8. **Fetch-script pattern.** The archived `fetch-batch-*` / `fetch-tier-*` /
   `handsource-*` sprawl shows the recurring need was always "source images for a
   named set of entities." The standing answer is `fetch-assets` +
   `source-known-gaps` + `fill-gallery-gaps`; extend those with an
   `--entities <list>` input rather than writing another per-batch script.

Keeping this index honest: when you add a standing tool, add a row to the right
category page; when you retire one, move it to `_archive/` and note it in
[archive.md](archive.md).
