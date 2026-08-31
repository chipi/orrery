# Physics Lab — Family C + renderer heroes (2026-08-30 handover)

Session picked up mid-G10 review pass and ran through Family C + the full renderer
"hybrid". Everything below is **committed locally, nothing pushed** (push gated).

## Commits this session (newest first)

| Commit | What |
|---|---|
| `74c5c3c` | Orbit-shell hero — choose-an-orbit opener as a to-scale orbit diagram (Tier-2, first) |
| `44b3aaf` | Canvas heroes — transfer-ellipse, moon-phase, dv-waterfall, force-diagram |
| `ba5fe6b` | SVG renderer baseline lift — ticks, gridlines, area fill, glow (all curve figures) |
| `e3ceb6f` | Family C capstone — "plan a deep-space mission" (generic planner, Grand Tour) |
| `46ce8f7` | G10 review pass — SSO/J2, Molniya, constellation coverage, launch azimuth |
| (earlier) `ad8d46a` G9 · `c15c91d` G8 · `2705ab8` G7 review passes |

All preflight-green (`PREFLIGHT_EXIT=0`); tests 773 pass; opus-reviewed.

## Family C (`plan-a-mission`)

The cross-cutting capstone, gated on Family A ∧ B. Generic mission planner taught on
Voyager 2's Grand Tour, Cassini VVEJGA as the counterpoint. New honest `assist-chain`
accumulator (Σ 2·v∞ upper bound). Added Uranus + Neptune to `HELIO_ORBIT_AU` /
`HELIO_PLANET_IDS` so the outer system is reachable. 26 keys ×14 locales.
**Opus review caught 3 M6-class on-screen dishonesties — all fixed at cause** (verdict
wired the cheap Jupiter cost; model stopped at Saturn; 13-month vs 176-year window
conflation). On-screen numbers verified against the corrected narrative.

## Renderer hybrid

- **Phase 1 (SVG baseline, all curves):** labelled axis ticks + numeric values,
  data-aligned gridlines (incl. log decades), area fill, feGaussianBlur glow. Pure
  `niceTicks`/`fmtTick` in `figure-style.ts` (unit-tested). Golden-master (fidelity
  registers) untouched.
- **Phase 2 (canvas heroes):** one hero per figure KIND → lifts every goal using it.
  Shared chrome in `hero-canvas.ts` (background, vignette, glow, honesty line,
  reduced-motion-aware draw-in over `createAnimateLoop`). Heroes: `TransferEllipse`,
  `MoonPhase`, `DvWaterfall`, `ForceDiagram`, `OrbitDiagram`. All SSR-safe, keep
  `role=img`+aria-label and the always-on honesty line + fidelity register.
  Opus-reviewed; fixes folded in (honesty-line baseline; force-diagram reverted to the
  single register colour instead of an invented up/down teal/gold; moon full-phase path).

## What's NOT done — your call before I continue

Remaining **Tier-2 heroes** for the observe goals that still render curves. Each SWAPS a
curve's teaching content, so I stopped rather than decide unilaterally:

- **catch-the-ISS → ground-track hero** — equirectangular graticule + glowing sinusoidal
  ISS track + terminator + station dot. Iconic; asset-free if drawn as a graticule (no
  world-map raster). Would replace the westward-shift curve.
- **observe-the-sky → sky-chart hero** — the ecliptic + planet positions/elongations.
  Needs the ephemeris positions the formula already computes.
- **land goals → entry-corridor hero** (`entry-corridor` stub kind) — the re-entry
  heating/deceleration corridor.

Also open (pre-existing, unrelated): #1 e2e marathon image, #2 S4 MCP hard-gate,
#4 lab-report export.

**To resume:** pick which Tier-2 heroes to build (or say the orbit-shell swap should stay
a curve — trivially reversible). Then it's the same rhythm: build kind → wire formula →
test → opus review → preflight → commit.
