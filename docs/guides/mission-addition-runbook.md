# Adding a new mission — runbook

The single prescribed path for bringing a new mission's content (text · links · flight · images · translations) into Orrery. Analogous to [`scripts/IMAGE-PIPELINE.md`](../../scripts/IMAGE-PIPELINE.md) "Adding a new gallery image" and the AGENTS.md "Adding a new flyby body" checklist. **Read this before hand-authoring mission JSON.**

Worked example throughout: **Artemis 4** (`artemis4`, a planned NASA Moon mission), added 2026-07-10.

## The model — mostly hand-authored JSON, gated by `validate-data`

There is **no `add-mission` script** — a mission is static JSON validated by fail-closed gates. **`npm run validate-data` is your checklist**: it names every missing/asymmetric touchpoint (often with the exact fix command). Author → `validate-data` → fix what it flags → repeat until green. Multi-device is automatic: `static/data` is bundled into the iOS/Android apps and renders on mobile + TV through the same components — no per-device step.

### Design intent — derive integrity + source images, but never fabricate content

The process should do more of the mechanical work for you, along one clear line — **derive/source where the answer is unambiguous; block-and-prompt where it's real content that needs authoring + approval**:

- **Integrity is auto-derived (do it, don't ask).** Fleet-ref **symmetry** (`linked_missions`) is pure derivation from `fleet_refs` — the add flow should run `migrate-fleet-linked-missions.ts` for you, not make you chase a `validate-data` failure. Same for any manifest that's a function of disk (gallery counts).
- **Images are auto-*sourced to staging* (attempt, then human-approve).** The add flow should kick off the agency-first fetch for the hero + gallery **into `_staging/`** for review at `/dev/staging` — "to some extent where possible" (rich for flown missions, agency **concept art** for future ones like Artemis 4). It never auto-ships: per-image approval stands (AGENTS.md), and the WebP/masters derive + provenance run only after promotion.
- **New fleet *records* are NOT auto-created — they're detected + blocked.** When a mission references a fleet asset that doesn't exist (Artemis 4 wants `sls-block-1b` / `gateway` / `i-hab` / `starship-hls`), the process must say "author these first" — **not** stub them. An auto-generated fleet entry is a bare stub (specs/agency/images/provenance all empty), the exact rot AGENTS.md's five-gate rule exists to stop. Adding a mission that needs a new launcher is legitimately *two* authoring tasks.

Net: `validate-data` flagging a missing fleet asset is correct — but the *fix* for **symmetry** should be automatic, while the fix for a **missing fleet record** should be an explicit prompt to author it.

## Touchpoints (in order)

| # | Touchpoint | File | Required | Fix / script |
|---|---|---|---|---|
| 1 | **Base record** | `static/data/missions/<dest_lower>/<id>.json` | ✅ | schema `mission.schema.json` |
| 2 | **Index entry** | `static/data/missions/index.json` | ✅ | schema `mission-index.schema.json` |
| 3 | **en-US overlay** | `i18n-src/en-US/missions/<dest>/<id>.json` | ✅ | schema `mission-overlay.schema.json` |
| 4 | **LEARN links** | `links[]` in the base record | ✅ (≥1) | `npm run check-learn-links -- --update` (ADR-051) |
| 5 | **Fleet cross-refs** | `fleet_refs[]` in base record | optional | **`npx tsx scripts/migrate-fleet-linked-missions.ts`** (derives the reverse `linked_missions[]` — symmetry is fail-closed) |
| 6 | **Flight + trajectory** | `flight.*` + generated `waypoints_km` / `waypoints_helio_au` | optional (needed for `/fly`) | Moon: `generate-hybrid-waypoints.ts`; Mars/outer: `generate-helio-hybrid-waypoints.ts` |
| 7 | **Hero + gallery images** | `static/images/missions/<id>/…` | ✅ hero (zero-gap policy) | the image pipeline — see below |
| 8 | **Translations (13 locales)** | `i18n-src/<locale>/missions/<dest>/<id>.json` | quality (not a hard gate) | `scripts/translate-i18n-gaps.mjs` |

### 1–3 · Core data

Base record required fields (`mission.schema.json`): `id, agency, agency_full, sector, dest, color, year, status, departure_date, arrival_date, transit_days, vehicle, payload, delta_v, data_quality, credit, links`. Index required: `id, agency, dest, status, year, sector, color` (+ `crewed`). Overlay required: `name, type, first, description`. `id` is `^[a-z0-9-]+$`; `dest` must match the file-path destination. Copy the shape from the nearest analog (Artemis 4 was authored from `artemis3.json`).

### 5 · Fleet refs — author new fleet entries FIRST

`fleet_refs[]` must point at **existing** fleet entries; a new launcher/spacecraft (Artemis 4 really wants `sls-block-1b`, `gateway`, `i-hab`, `starship-hls` — none exist yet) must be authored via the [fleet-addition runbook](fleet-addition-runbook.md) **before** you can reference it (an agent can fan out one sub-agent per missing asset). Never stub them. Then run `migrate-fleet-linked-missions.ts` to populate the reverse pointers (symmetry is fail-closed). *In the Artemis 4 dogfood we reused `sls-block-1` + `orion` + `lc-39b`; the Block 1B / Gateway / I-HAB fleet entries are a follow-up.*

### 6 · Flight data is OPTIONAL — but nothing warns you `/fly` is empty

A mission validates with **no** `flight` block; it just renders on `/missions` and not on `/fly`. If you want the `/fly` trajectory, add `flight.*` (launch/cruise/arrival/totals/events + `cislunar_profile` for Moon or `interplanetary_profile` for Mars/outer) **and generate the waypoints** — the geometry won't render without them:

```bash
npx tsx scripts/cislunar/generate-hybrid-waypoints.ts static/data/missions/moon/<id>.json      # Moon
npx tsx scripts/cislunar/generate-helio-hybrid-waypoints.ts static/data/missions/<dest>/<id>.json  # Mars / outer
```

### 7 · Images — missions carry ZERO hero gaps

`validate-hero-coverage` fails-closed if `static/images/missions/<id>/01.webp` is absent (`MISSIONS_KNOWN_GAPS` is intentionally empty since #342). Source the hero + gallery through the **[image pipeline runbook](../../scripts/IMAGE-PIPELINE.md#adding-a-new-gallery-image)**: source (agency-first) → `masters/` (git-LFS) → WebP ladder + 1x1 → provenance → gallery counts. For a **future mission** with no photos (Artemis 4), the hero is agency **concept art** — same pipeline, and **image changes need per-image approval** (see AGENTS.md).

### 8 · Translations — en-US is the gate; the other 13 are quality

`validate-data` only requires the **en-US** overlay (non-English falls back to en-US at runtime, so the mission renders everywhere in English immediately). Ship the 13 translations as a quality pass: `set -a; source .env; set +a; node scripts/translate-i18n-gaps.mjs` (Claude API, per ADR-033), then `npm run i18n:compile`.

## Validation = the done-signal

```bash
npm run validate-data     # schema + overlay-completeness + fleet symmetry + hero coverage + links
npm run preflight         # full pre-push (typecheck → lint → test → validate → build)
npm run preview           # eyeball /missions card + /fly (if flight data) at localhost
```

Each `validate-data` failure names the touchpoint and usually the fix command — treat it as the interactive checklist.

## Gotchas (learned in the Artemis 4 dogfood)

- **New fleet deps cascade.** An accurate mission often needs new fleet entries authored first (Block 1B / Gateway / I-HAB). Reuse existing entries only when honest.
- **`fleet_refs` are one-directional until you run the migrate script** — symmetry is fail-closed; the error even prints the command.
- **`flight` optional + no `/fly` warning** — a mission can ship looking complete while `/fly?mission=<id>` is empty because waypoints were never generated.
- **Hero image is mandatory** (zero-gap policy) — you cannot ship a mission without one; for future missions that means sourcing concept art through the approval-gated image pipeline.
- **en-US suffices to pass CI**; don't mistake a green `validate-data` for "fully localized."
