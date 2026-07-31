# Engines as a /fleet category (PRD-032)

**Status:** built + integrated (2026-08-01). Data + cross-links + editorial +
14-locale i18n shipped; imagery sourced via the curated pipeline. Autonomous
build block per operator's "full solution" green light.

## Why

The engine is the workhorse of every launcher, and several are legends in their
own right (F-1, Merlin, Raptor, RS-25, the R-7's RD-107/108). We already built
the engine data as a byproduct of the "nail the exact engine count per stage"
work (`src/lib/orbital/launcher-engines.ts`). Surfacing engines as first-class
/fleet items turns that latent data into a browsable collection — and the
compelling part is the **cross-vehicle graph**: an engine's legend is its reuse
across launchers (RS-25 → Shuttle + SLS; RD-107/108 → Vostok/Voskhod/Soyuz;
Merlin → Falcon 9/Heavy). That story is lost if it only lives on one rocket page.

Shape decision (operator): **a category inside /fleet** (option 2), not a
dedicated /engines route — engines sit beside launchers/spacecraft.

## Coverage (~22, curated legendary/workhorse, every agency)

NASA/US: F-1, J-2, H-1, RS-25, RL10, Rocketdyne A-7, LR87 · SpaceX: Merlin 1D,
Raptor · Roscosmos: RD-107/108, RD-180, RD-253 · ESA: Vulcain 2, HM7B, Viking ·
CNSA: YF-100, YF-77 · ISRO: Vikas, CE-20 · JAXA: LE-7A, LE-9, LE-5B.

Obscure vernier/stage engines (LR101, RD-0107, etc.) stay as data on the
launcher only — the bar is "defines a family or hit a milestone."

## Architecture

- **`src/lib/orbital/engine-registry.ts`** — single source of truth: 22
  `EngineMeta` (specs + `designations`, the exact strings in
  `launcher-engines.ts`). Exports the bidirectional index DERIVED from
  `launcher-engines.ts`, so the "Flies on" graph can never drift from the 3D
  engine counts: `launchersForEngine(id)` / `enginesForLauncher(id)`.
- **`scripts/build-engine-fleet.ts`** — generates
  `static/data/fleet/engine/*.json` + merges the fleet index + gallery stubs.
  Idempotent; re-run after editing the registry. Editorial text is NOT written
  here (it lives in i18n-src overlays).
- **Category registration** (the launch-site playbook, 5 sync points):
  `types/fleet.ts`, `fleet/+page.svelte` (CATEGORIES + label + color),
  `validate-data.ts` (FLEET_CATEGORIES), both fleet JSON schemas.
- **`FleetEntryPanel.svelte`** — engine spec rows (cycle / propellant / thrust /
  Isp); an engine's "Flies on" list (linkified to the launcher entries) + two
  propulsion science primers; a launcher's "Engines" list (linkified to the
  engine entries). Cross-navigation via `onNavigate` + `knownIds` from
  `/fleet/+page.svelte` (never links a dead id).
- **Editorial** — en-US authored + science-editor fact-checked (9 blockers
  fixed: HM7B/CE-20 first-flight dates, RD-253 thrust+cycle, RD-107/108 thrust,
  LR87 date + Gemini escape-system claim, +minor spec corrections). Translated
  to all 13 non-en-US locales via `scripts/translate-i18n-gaps.mjs`
  (286 overlays, 0 failures).
- **Imagery** — `FLEET_IMAGE_QUERIES` in `fetch-assets.ts`, agency-archive →
  Commons, native-language extraQueries for the non-Western archives. Heroes
  allowlisted in `validate-hero-coverage.ts` (`FLEET_KNOWN_GAPS`) until each
  engine's images land, then cleared per-id.

## Verification gates

- `npm run validate-data` — green (fleet 252 ok + 22 engine known-gap).
- `npm run typecheck` — 0 errors.
- `tests/e2e/fleet.spec.ts` — engine category filter shows ≥20; engine→launcher
  cross-link navigates the panel (Merlin 1D → Falcon 9).

## Not done / follow-ups

- Per-engine 3D models — deliberately NOT built; engine cards cross-link to the
  launcher whose nozzle cluster already renders in /fly.
- Imagery quality bar — auto-sourced heroes; the operator's per-image review
  remains the final taste gate for any that read as museum-plaque / diagram /
  low-res rather than a clean engine portrait.
