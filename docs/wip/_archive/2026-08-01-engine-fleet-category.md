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

---

## Imagery + provenance — vetted & gate-green (2026-08-02, UNCOMMITTED)

Sourced → vetted → provenanced. **37 good images across 14 engines**; every one
carries a real source + TASL provenance row. `npm run validate-data` → exit 0
(hero-coverage 266 ok / 8 known-gap / 0 unexpected · gallery-counts ✓ ·
provenance-walker OK · credits-bundling OK · no byte-dupes across 37 masters).

### Provenance built surgically (not a full rebuild)
The `build-image-provenance` full rebuild degrades in this worktree (masters are
git-LFS stubs → 62% row drop → the safety guard refuses to write). Per the tool's
own guidance, engine rows were appended surgically to `image-provenance.json`
(3748 → 3785), sourced from `fleet-image-sources.json`:
- **9 NASA images-api** → `PD-NASA`, `nasa_id` extracted from the CDN URL,
  `source_url` percent-encoded (one NASA id contained spaces).
- **28 Wikimedia Commons** → real `Artist` + per-file license via the **batched**
  Commons API (single query avoids the per-request throttling that silently drops
  licenses), normalised through `normaliseLicenseShortName` → allowlist. Licenses:
  PD-Old ×12, CC0 ×6, CC-BY-SA-4.0 ×3, CC-BY-3.0 ×2, CC-BY-SA-2.0/2.5, CC-BY-4.0,
  CC-BY-2.0, CC-BY-SA-3.0.

### 8 gaps (FLEET_KNOWN_GAPS + fleet-galleries.json = 0)
`ce-20, hm7b, le-7a, lr87, vikas, yf-100` — Commons has no free engine photo
(only documents / buildings). `le-5b, le-9` — see drops below.

### 5 images DROPPED from the earlier montage-approved set — WHY
Reading the actual Commons filenames during the provenance vet exposed problems a
thumbnail montage can't show. **These were removed rather than shipped:**
| slot | file | problem |
|---|---|---|
| le-5b/01 | S-IC engines and Von Braun.jpg | Saturn-V **F-1** cluster — not the JAXA LE-5B |
| le-9/01 | S-IC engines and Von Braun.jpg | same wrong image; LE-9 is the H3 engine |
| vulcain-2/02 | Ariane viking.jpg | **Viking** engine (Ariane 4), not Vulcain-2; dupe of viking/02 |
| viking/01, /03 | Viking_5C.jpg | **GFDL** (not allowlisted) + dupes |

`viking` renumbered 02→01 (kept the correct Ariane-Viking, CC-BY-3.0 / DLR);
`vulcain-2` kept 01 (Moteur-Vulcain, CC-BY-SA-3.0 / Pline). le-5b + le-9 → gaps.
Per the per-image approval gate, the operator may re-source correct, licensable
photos for these later.

### Not done / follow-ups
- **phash cache not updated** for the 37 new masters. Not a ship gate
  (`validate-image-phash-dupes` auto-skips when masters are stub-only). Add the 37
  entries when `masters/**` is next fully `git lfs pull`-ed.
- **Uncommitted** — masters + `static/images/fleet-galleries/*` + the 6 modified
  data/script files await the operator's review + commit (commits/pushes are gated).

---

## All engine heroes closed — 0 gaps (2026-08-02, UNCOMMITTED)

The 8 formerly-heroless engines now ship vetted, licensed, honestly-captioned
heroes. `FLEET_KNOWN_GAPS` is empty; `validate-data` green (fleet **274 ok · 0
known-gap · 0 unexpected**, provenance-walker OK).

**How (answering "did we try all documented sources?"):** the fleet fetch
(`fetchFleetImages`) only does NASA images-api + Commons `list=search` (+ native
`extraQueries`) + a curated fallback — it never touches the documented Tier-1
agency primaries or Tier-2 museums. Closing the gaps needed the rest of the
ladder: **Commons category enumeration** (`list=categorymembers` + one subcat
hop — surfaces museum artifacts filed by engine name, invisible to keyword
search) + **native-language** (ja/zh) + **Tier-2 institutional museums**.

| engine | hero | license · source |
|---|---|---|
| ce-20 | CE-20 bell + GODL hot-fires | CC-BY-SA-4.0 + GODL-India (ISRO) |
| vikas | "High Thrust Vikas" hot-fire | GODL-India (ISRO) |
| hm7b | HM7B museum engine | CC-BY-2.0 (S. Jurvetson) |
| lr87 | Titan-I / LR87, Udvar-Hazy | CC0 (Smithsonian/Evergreen) |
| yf-100 | YF-100 at Nat'l Museum of China | CC0 (Shujianyang) |
| le-5b | LE-5, Nat'l Museum Tokyo | CC0 (Daderot) |
| le-7a | LE-7A, Miraikan | CC-BY-SA-4.0 |
| le-9 | LE-9 scale model, JAXA Tsukuba | CC-BY-SA-4.0 |

18 images (hero + curated gallery), replicated the exact ladder
(RUNGS 1280/2048/3072 q80) + 1x1 via the repo's own `generateVariants`.
Provenance built surgically (Commons batch API → real Artist + license →
allowlist, GODL-India handled). phash cache +55 engine entries (surgical; not a
gate — `validate-image-phash-dupes` auto-skips stub masters).

**Operator's three follow-ups — all satisfied:**
- **Credits** — auto: 55 engine images render on `/credits` grouped by source
  (fleet-galleries ∉ `OWN_ASSET_SURFACES`). Sources shown: ISRO 64, JAXA 49,
  CNSA 187, ESA 146, Wikimedia contributors 79, etc.
- **Cross-ref** — `engine-registry.test.ts` 10/10 (every designation ∈
  launcher-engines; every engine resolves ≥1 launcher). "Flies on" + science
  links render live in the panel.
- **Type filter** — `engine` already a `/fleet` category chip → grid filter.

**Known minor (pre-existing, not from this pass):** rs-25/02 ≈ rs-25/03
(phash d=8, two similar SSME test-firings); rd-107-108/02 Commons Artist is a
filename string. Both in the earlier approved set — flagged, not silently changed.
