# Adding a fleet asset — runbook

The prescribed path for authoring a **fleet asset** — a launcher, spacecraft, lander, rover, station, launch-site, observatory, space-suit, etc. Companion to the [mission-addition runbook](mission-addition-runbook.md) and [`scripts/IMAGE-PIPELINE.md`](../../scripts/IMAGE-PIPELINE.md). **A fleet asset is real content — never a stub.** If a mission references a fleet id that doesn't exist, author it here first; do not auto-generate an empty record.

Worked example: **SLS Block 1B** (`sls-block-1b`, launcher) — the Exploration-Upper-Stage variant Artemis 4 flies, which does not yet exist as an entry.

## When you need this

- A new mission's `fleet_refs[]` points at a launcher / spacecraft / launch-site that has no entry (Artemis 4 → `sls-block-1b`, `gateway`, `i-hab`, `starship-hls`).
- A new vehicle/station/suit enters service.

**Agent orchestration:** the mission-add flow should **detect** the missing fleet ids and **fan out one fleet-authoring sub-agent per asset** (they're independent — parallelize), each running this runbook, then resume the mission once they land. It must NOT stub them (see the mission runbook's "Design intent").

## The 12 categories

`cargo-spacecraft · constellation · crewed-spacecraft · lander · launch-site · launcher · observatory · orbiter · rover · space-suit · station`

The `category` field + the directory `static/data/fleet/<category>/` must agree.

## Touchpoints (in order)

| # | Touchpoint | File | Required | Notes |
|---|---|---|---|---|
| 1 | **Base entry** | `static/data/fleet/<category>/<id>.json` | ✅ | schema `fleet-entry.schema.json` |
| 2 | **Index entry** | `static/data/fleet/index.json` | ✅ | schema `fleet-index.schema.json` |
| 3 | **en-US overlay** | `i18n-src/en-US/fleet/<category>/<id>.json` | ✅ | schema `fleet-overlay.schema.json` |
| 4 | **LEARN links** | `links[]` in the base entry | ✅ (≥1) | agency page > Wikipedia (ADR-051) |
| 5 | **`linked_missions[]`** | base entry | auto | **Do NOT hand-author** — it's the reverse of missions' `fleet_refs`; `npx tsx scripts/migrate-fleet-linked-missions.ts` derives it |
| 6 | **Hero + gallery images** | `static/images/fleet-galleries/<id>/…` | ✅ hero (zero-gap policy) | the [image pipeline](../../scripts/IMAGE-PIPELINE.md#adding-a-new-gallery-image) |
| 7 | **Translations (13 locales)** | `i18n-src/<locale>/fleet/<category>/<id>.json` | quality | `scripts/translate-i18n-gaps.mjs` |
| 8 | **3D surface model** | `src/lib/{moon,mars}-lander-models.ts` | only landers/rovers | reuse an existing builder if the shape fits (ADR-072); don't add ad-hoc |

### 1–3 · Core data

Base entry required (`fleet-entry.schema.json`): `id, name, category, agency, country, manufacturer, first_flight, status, era, epoch, credit, links`. Index required (`fleet-index.schema.json`): `id, name, category, agency, country, era, epoch, status, first_flight, tagline`. Overlay required (`fleet-overlay.schema.json`): `description` (+ `name`, `tagline`, `best_known_for` carried alongside). `id` is `^[a-z0-9-]+$`; copy the shape from the nearest analog (`sls-block-1b` authored from `sls-block-1.json`). `era` is a range (`"2011-now"`); `epoch` is a program tag (`"lunar-return"`).

### 5 · Symmetry is derived, not authored

`linked_missions[]` mirrors every mission whose `fleet_refs[]` names this asset. Author the **mission** side (`fleet_refs`), then run `migrate-fleet-linked-missions.ts` — it populates both directions. `validate-data` fails-closed on asymmetry and prints the command.

### 6 · Images — fleet assets carry ZERO hero gaps

`validate-hero-coverage` fails-closed if `static/images/fleet-galleries/<id>/01.webp` is absent (`FLEET_KNOWN_GAPS` is intentionally empty). Source the hero + gallery through the image pipeline (agency-first → `masters/` → WebP ladder → provenance → counts), **staged for per-image approval** at `/dev/staging`. Native-language sourcing rules apply for non-Western agencies (AGENTS.md).

## Validation = the done-signal

```bash
npm run validate-data     # schema + overlay-completeness + fleet↔mission symmetry + hero coverage + links
npm run preflight         # full pre-push
npm run preview           # eyeball /fleet row + detail panel at localhost
```

## Gotchas

- **Never stub.** Every required field is real content — no `"TBD"` / empty specs. An empty fleet entry is the rot the five-gate rule (AGENTS.md) exists to stop.
- **`category` ↔ directory must match**, and both must be one of the 12.
- **Don't hand-author `linked_missions`** — derive it; hand-editing drifts.
- **Hero image is mandatory** (zero-gap policy) — source real imagery (or agency render), approval-gated.
- **Reuse 3D builders** — a new lander/rover shares an existing builder unless genuinely novel (ADR-072); adding one ad-hoc is blocked by AGENTS.md.
