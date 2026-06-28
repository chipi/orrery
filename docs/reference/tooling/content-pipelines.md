# Content-pipeline tooling

Reference for the durable **content** tooling in Orrery — i18n/translation, narrated
audio, outbound-link provenance + health, the launches calendar, and the science/data
builders. This is a catalogue, not a tutorial: for end-to-end flow see
[TA.md §pipelines](../../adr/TA.md#pipelines) (Pipeline 3 link-provenance, 4 link-health,
8 science-index, 10 i18n, 12 audio), and for operator runbooks the deep references linked
per section. Day-to-day rules live in [AGENTS.md §"i18n rules"](../../../AGENTS.md) and
[AGENTS.md §"Audio narration"](../../../AGENTS.md).

## Quick reference

| Tool | Command | When |
|------|---------|------|
| Compile messages | `npm run i18n:compile` | Prereq of dev/build/check/typecheck/test (auto-chained) |
| Translate overlays | `scripts/wave23/` toolchain | New base-data → 14-locale overlays (per-wave) |
| Translate audio (stub) | `npm run audio:translate` | Deferred to v0.8 (issue #152) — exits 2 |
| Generate audio | `npm run audio:generate -- --episode <id>` | Render one episode's mp3/vtt/txt |
| Full audio rebuild (stub) | `npm run audio:build` | Deferred to v0.8 — exits 2 |
| Audio cost gate | `npm run audio:check-cost` | In preflight; ad-hoc spend check |
| Link provenance | `npm run build-link-provenance` | After editing any `links[]`/`wiki` field |
| Link health | `npm run check-learn-links` (`--update`) | Periodic outbound-link probe |
| Fetch launches | `npm run fetch:launches` | Rebuild the launches manifest |
| Audit launches | `npm run audit:launches` | Inspect provenance/family gaps after a fetch |
| Build science index | `npm run build-science-index` | Build prereq (auto-chained) |
| Precompute porkchops | `npm run precompute-porkchops` | Build prereq (auto-chained) |
| Tech BOM | `npm run build-tech-bom` / `check-tech-bom` | Regenerate / CI-verify license BOM |
| Site-stories index | `tsx scripts/build-site-stories-index.ts` | After authoring a new site story |
| Colophon original-work | `node scripts/build-original-work.mjs` | After adding an original diagram |
| Cislunar waypoints | `tsx scripts/cislunar/generate-*-waypoints.ts` | Bake Tier 1.5 trajectory for a mission |
| Fleet link repair | `tsx scripts/migrate-fleet-linked-*.ts` | When `validate-data` emits the fix-hint |

---

## i18n

### `npm run i18n:compile`

**Command** — `paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`
**What** — Compiles the per-locale message catalogues in `messages/<locale>.json` into the
typed `src/lib/paraglide/` runtime (the `t()` import surface). 14 locales:
`ar de en-US es fr hi it ja ko nl pt-BR ru sr-Cyrl zh-CN`.
**When** — A hard prereq of `dev`, `build`, `check`, `check:watch`, `typecheck`, `test`,
`test:coverage` — every one of those npm targets runs `i18n:compile` first, so it is rarely
invoked by hand. `src/lib/paraglide/` is generated; don't hand-edit it.
**Gotchas** — Recompiling while `vite dev` is running can leave HMR holding a stale module
graph and surface as a **circular-dependency error** in the browser. It is not a code bug —
restart the dev server and it clears (MEMORY: dev-server paraglide-recompile circular dep).
**State** — healthy.

### `scripts/wave23/` translation toolchain

**Command** — staged scripts under `scripts/wave23/` (catalog → maps → apply-translations),
run via `npx tsx`.
**What** — The **current recommended** way to translate base-data overlays to all 14 locales,
per [TA.md §Pipeline 10](../../adr/TA.md#pipelines) (ADR-033 + ADR-054). Three stages:
1. **catalog** — read every en-US overlay (missions, fleet, science, surface sites, ISS/Tiangong
   modules) into a flat `key → en-US string` map.
2. **maps** — translate each string per target locale with `argos-translate` offline-NMT, merge
   any LLM spot-fix overrides → per-locale `key → translated string` map.
3. **apply-translations** — read each base file, swap en-US fields for the locale's translation,
   write the per-locale overlay.
The same toolchain is reused identically across mission/fleet/science content — no per-surface
forks. `scripts/wave23/packed-lines/<locale>/all.txt` retains the packed CJK source lines
(ja / zh-CN / hi / ko) the stage scripts consume.
**When** — After adding base-data IDs and their en-US overlays; translations land in a separate
commit from the en-US ship (en-US alone is enough to ship — runtime falls back to en-US).
**Gotchas** — `sr-Cyrl` has no argos model: it is hand-authored, so the pipeline writes a stub
overlay for a human curator to fill. Completeness is **gated by `npm run validate-data`** (ADR-069
Layer 1: every declared ID must have an en-US overlay on disk, or preflight/pre-push fails).
**State** — healthy. The legacy per-surface `scripts/translate-*.mjs` passes (Apollo, launchers,
panoramas, satellites, science sections, …) were **one-shot per-wave** scripts and are now archived
in [`scripts/_archive/i18n/`](../../../scripts/_archive/i18n/) (~35 files). The durable pattern is
wave23 + the ADR-069 overlay-completeness gate; don't write a new per-surface translate script.

---

## Audio

The narrated-episode pipeline (PRD-016 / RFC-019). v0.7 ships **en-US only**. Source scripts:
`content/episodes/<locale>/<id>.md` (YAML frontmatter + SSML). Outputs: content-addressed
`static/audio/<locale>/<persona>/<id>.<hash8>.{mp3,vtt,txt}`. Manifest:
`static/data/audio/audio-provenance.json`. **Operator runbook:**
[docs/guides/audio-pipeline-setup.md](../../guides/audio-pipeline-setup.md). Adding a provider:
see [AGENTS.md §"Audio narration"](../../../AGENTS.md).

### `npm run audio:generate`

**Command** — `npm run audio:generate -- --episode <id> [--locale en-US] [--provider google|elevenlabs]`
(`scripts/audio/generate.ts`)
**What** — Pipeline 2 — the operational entry point in v0.7. Reads the episode markdown, renders
SSML via the selected `TtsProvider`, writes the `.mp3`/`.vtt`/`.txt` triple, appends a
cost-ledger row, and records an `audio-provenance.json` entry (text authorship + provider +
tts_model + voice id, all surfaced on `/credits`).
**When** — Operator-only, per episode. Provider precedence: CLI `--provider` → `TTS_PROVIDER` env
→ default `google`.
**Gotchas** — Cache key is `SHA-256(provider + voiceId + ssml)`; identical input never
re-generates (reuses the existing `.<hash8>.mp3`, logs a `cached` ledger row). Editing SSML forces
a full re-render. Adding/renaming an episode without a provenance row leaves it invisible at runtime.
**State** — healthy.

### `npm run audio:check-cost`

**Command** — `npm run audio:check-cost` (`scripts/audio/check-cost-thresholds.ts`)
**What** — Reads `static/data/audio/cost-ledger.json`, prints the current month's per-provider
totals, and gates on spend: **$50/mo soft warn** (prints, exit 0), **$200/mo hard halt** (prints,
exit 1).
**When** — Wired into `npm run preflight` (and `preflight:full`) — an over-cap month blocks pushes.
**Gotchas** — No ledger → no-op (exit 0). The ledger is the gate's only input; nothing else clamps spend.
**State** — healthy.

### `npm run audio:translate` / `npm run audio:build` (stubs)

**Command** — `npm run audio:translate` (`translate.ts`) | `npm run audio:build` (`build.ts`)
**What** — `audio:translate` = Pipeline 1, Claude-API SSML-safe en-US→11-locale translation;
`audio:build` = full-corpus translate→generate orchestrator. Both are **not-implemented stubs**.
**When** — Deferred to v0.8 (epic #146 / issue #152). For v0.7 en-US, chain `audio:generate` per episode.
**Gotchas** — Both exit **2** (operator-misuse), not 1, so an accidental `&&` chain doesn't fail-stop.
**State** — stubbed pending v0.8.

### Audio support modules (`scripts/audio/`)

Not directly runnable — imported by the pipeline above:

- **`cost-ledger.ts`** — `appendEntry` / threshold guard. Atomic tmp-file+rename writes; UTC-ISO
  `ts` asserted (catches month-boundary drift); incremental per-month totals.
- **`provenance.ts`** — `audio-provenance.json` append helper, mirrors the image-provenance pattern.
- **`tts/provider.ts`** — `TtsProvider` interface + `Persona`/`ProviderName` unions.
- **`tts/google.ts`, `tts/elevenlabs.ts`** — concrete providers (Google Cloud TTS, ElevenLabs).
- **`tts/retry.ts`** — `withRetry`: 3-attempt exponential backoff on network/5xx/429, honours `Retry-After`.
- **`suggest-stages.ts`** — `tsx scripts/audio/suggest-stages.ts <episode-id>`: parses an episode's
  SSML + VTT and emits a VTT-anchored `EPISODE_STAGES` block to paste into `src/lib/audio-tour.ts`.

---

## Links & launches

### `npm run build-link-provenance`

**Command** — `npm run build-link-provenance` (`scripts/build-link-provenance.ts`)
**What** — ADR-051 Milestone L-B. Walks every JSON under `static/data/` (+ `i18n/en-US/` overlays),
collects `links: [{l,u,t}]` arrays + the small-body `wiki` field, classifies each URL by host + tier,
and writes `static/data/link-provenance.json` + `docs/provenance/last-link-provenance-diff.md`. The
manifest is the single source consumed by validate-data, the runtime data layer, `LinkCredit`, and `/library`.
**When** — After adding/editing any outbound link. Chained into `npm run fetch`.
**Gotchas** — **Fails closed** when a URL can't be classified to a known `source_id` in
`static/data/source-logos.json` — register the host first.
**State** — healthy.

### `npm run check-learn-links`

**Command** — `npm run check-learn-links` (`--update`) (`scripts/check-learn-links.ts`)
**What** — ADR-051 Milestone L-E. Probes every `link-provenance.json` entry (HEAD, GET fallback for
HEAD-blocking hosts), records alive/redirect/dead, writes `docs/provenance/last-link-check.md`.
With **`--update`** it rewrites `last_verified` (YYYY-MM-DD) on every ≤400 entry and re-emits the manifest.
**When** — Periodic health sweep; `fetch` runs it with `--update`.
**Gotchas** — Network-bound (slow); `--update` mutates the manifest, so run after `build-link-provenance`.
**State** — healthy.

### `npm run fetch:launches`

**Command** — `npm run fetch:launches` (`scripts/fetch-launches.ts`)
**What** — PRD-020 / RFC-023 launches-calendar orchestrator. Pulls each registered `LaunchSource`
(GCAT historic primary, LL2 upcoming fallback, plus NASA/SpaceX/ESA agency-direct) in priority order,
dedupes by stable Orrery id, merges first-seen-wins, applies the curation override file, writes the
manifest files + an audit-report stub.
**When** — Rebuilding the launches manifest. Docker variant: `npm run docker:fetch-launches`.
**Gotchas** — GCAT release is pinned (`GCAT_RELEASE_PIN`) for reproducibility.
**State** — healthy.

### `npm run audit:launches`

**Command** — `npm run audit:launches` (`scripts/audit-report-launches.ts`)
**What** — RFC-023 §10. Generates the gitignored dev-only `static/audit-report-launches.html`:
provenance gaps (rows where the agency-direct chain returned nothing, fell back to LL2), unmapped
rocket families, and tier-reason distribution.
**When** — After `fetch:launches`, to triage which agency-direct provider to improve next.
**State** — healthy.

### `scripts/gcat/parse-launch-log.ts`

**Command** — library (imported by `GcatSource`); covered by `parse-launch-log.test.ts`.
**What** — RFC-023 §12.1. Pure-function parser for Jonathan McDowell's GCAT `launch.tsv` master
launch list (28-field, space-padded, comment-prefixed header). Asserts the header, parses dates with
precision, builds stable ids.
**Gotchas** — GCAT is CC-BY J.C. McDowell — preserve attribution. Header-shape changes upstream trip
`assertGcatHeader`.
**State** — healthy.

---

## Science & data builders

### `npm run build-science-index`

**Command** — `npm run build-science-index` (`scripts/build-science-index.ts`)
**What** — RFC-011 step 9. Walks every section overlay in `static/data/i18n/en-US/science/` →
`static/data/science-index.json` (one entry per section: URL + title + intro + key terms) for the
`⌘K` fuzzy search in `ScienceSearch.svelte`.
**When** — **Build prereq** (auto-chained into `npm run build`).
**State** — healthy.

### `npm run precompute-porkchops`

**Command** — `npm run precompute-porkchops` (`scripts/precompute-porkchops.ts`)
**What** — ADR-016/026/028. Pre-computes Lambert porkchop grids for 9 destinations (Mercury → Pluto,
Ceres) → `static/data/porkchop/earth-to-<id>.json`, so `/plan` first paint never spawns a worker.
**When** — **Build prereq** (auto-chained into `npm run build`).
**Gotchas** — Idempotent — the Lambert solver is deterministic and output is rounded before
serialising, so re-runs produce identical bytes. Grids are committed for offline capability.
**State** — healthy.

### `npm run build-tech-bom` / `check-tech-bom`

**Command** — `npm run build-tech-bom` | `npm run check-tech-bom` (`scripts/build-tech-bom.ts [--check]`)
**What** — Walks the npm dep tree (`npm ls --json --all --omit=optional`), reads each package's
license, classifies runtime vs development, emits `docs/TECH-BOM.md` + `static/data/tech-bom.json`
(CycloneDX-ish). `--check` verifies the committed output is current without rewriting.
**When** — After dependency changes; `check-tech-bom` for a CI drift gate.
**State** — healthy.

### `scripts/build-site-stories-index.ts`

**Command** — `tsx scripts/build-site-stories-index.ts`
**What** — Builds `static/data/site-stories/index.json` from the `site-stories/` file listing so
`getSiteStory` can probe before fetching — launch sites without an editorial story no longer trigger
speculative 404s.
**When** — After authoring a new site story.
**Gotchas** — Idempotent (rewrites only on id-list change) — safe to chain into preflight as a no-op.
**State** — healthy. Not npm-aliased.

### `scripts/build-original-work.mjs`

**Command** — `node scripts/build-original-work.mjs`
**What** — Generates `static/data/original-work.json`, the bill-of-materials of Orrery's **original**
content for `/colophon` (also consumed by `/science`). Auto-scans the hand-authored SVG diagram
directories; 3D/canvas/UI/writing categories are curated inline (live-rendered geometry has no
thumbnail, so those link to the drawing route).
**When** — After adding an original diagram. **Standing tool** (not archived).
**State** — healthy.

### `scripts/cislunar/`

- **`generate-hybrid-waypoints.ts`** — `tsx scripts/cislunar/generate-hybrid-waypoints.ts <mission.json>`.
  GH #107. Reads a Moon mission's parametric Tier-1 `flight.cislunar_profile` + event METs, runs the
  same `buildCislunarTrajectory` the renderer uses, resamples to 100 MET-even waypoints, pins event
  anchors, writes back the Tier-1.5 waypoints.
- **`generate-helio-hybrid-waypoints.ts`** — `#107 Step 6d`. The interplanetary mirror for
  Mars/outer-system missions (`buildInterplanetaryTrajectory` → `flight.interplanetary_profile.waypoints_helio_au`).
- **`check-science-map-refs.ts`** — validates every `(tab, slug)` in `cislunar-phase-science-map.json`
  resolves to a real `/science` section file; **chained from `validate-data`** so a typo fails fast
  instead of producing a dead `?` chip in `/fly`.

**State** — healthy. The two generators are per-mission CLI tools, run when adding/updating a Tier-1.5 trajectory.

### Fleet link-repair tools — `migrate-fleet-linked-{missions,sites}.ts`

**Command** — `tsx scripts/migrate-fleet-linked-missions.ts` | `tsx scripts/migrate-fleet-linked-sites.ts`
**What** — Derive the reverse `linked_missions` / `linked_sites` pointers on fleet entries
mechanically from the forward `fleet_refs` on missions / moon-sites / mars-sites / earth-objects,
keeping the bidirectional graph (ADR-052) consistent.
**When** — **Run when `validate-data` tells you to.** The symmetric-link validator emits these exact
commands as live fix-hints when `fleet_refs` ↔ `linked_*` drift (`scripts/validate-data.ts` lines 572 / 626).
**Gotchas** — Originally one-shot migrations, deliberately **kept** (not archived) because they double
as standing repair tools — don't move them to `_archive/`.
**State** — healthy (as repair tools).

---

*See also: [README.md](README.md) (tooling index) · [data-validation.md](data-validation.md) ·
[image-pipeline.md](image-pipeline.md) · [ADR-051](../../adr/ADR-051.md) ·
[ADR-069](../../adr/ADR-069.md) · [TA.md §pipelines](../../adr/TA.md#pipelines).*
