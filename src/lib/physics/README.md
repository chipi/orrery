# `src/lib/physics/` — the shared physics kernel

The pure, framework-free spaceflight-physics kernel liberated from Orrery's scripted
surfaces (`/fly`, `/plan`, `/explore`). Two consumers import it unchanged: the SvelteKit app
(the `/lab` Physics Lab) and a standalone Node process (the MCP server).

**Governing docs:** PRD-033 + RFC-037 (both incl. Amendment 01) · boundary classification in
`docs/wip/2026-08-29-s1-kernel-boundary-manifest.md` · epic #458.

## The one rule: this subtree is PURE

Kernel = a **physical quantity** produced by a formula (force, velocity, position, Δv,
time-of-flight, atmosphere, orbit geometry). NOT: cameras, HUDs, shots, framing, sim-clocks,
scene-geometry shapes, or anything about *how Orrery presents/animates* physics.

Enforced by the ESLint `no-restricted-imports` gate on `src/lib/physics/**` (warn during the
S1 move, **error from S1.5**): no `three`, no `svelte`, no `$app/*`, no app-internal `$lib/*`
(components/three/stores/fly/data/…), no DOM globals. Shared `$types/*` and intra-kernel
`$lib/physics/*` imports are allowed.

## Subdirectories (filled during S1.1–S1.4)

| dir | domain |
|---|---|
| `ephemeris/` | JD/GMST/obliquity, JPL-Standish planet positions, Moon, alt-az, precession |
| `transfer/` | Lambert, porkchop grid, vis-viva, Kepler, mission-arc, injection, patched-conic |
| `ascent/` | powered-ascent integrator, Tsiolkovsky, staging, profiles |
| `descent/` | per-body EDL integrator, drag, dynamic pressure, atmospheres |
| `cislunar/` | *(real cislunar compute is `transfer/lambert-geocentric`; Tier-1 scene shapes stay app-side)* |
| `satellite/` | TLE parse, Kepler + J2 propagator, look-angles, next-pass |
| `propulsion/` | engine registry, launcher↔engine cross-refs |
| `util/` | Δv parse, per-body gravity/escape tables, light-time, regime bounds, constants |

`mechanics/` (classical-mechanics foundation — F=ma, weight, momentum, energy, gravitation)
is **greenfield, added at S2b**, demand-driven per goal — not part of the S1 move.

## Provenance (RFC-037 §4, Amendment 01 A01.2a)

Kernel formulas emit `FigureSpec` figures tagged `provenance.fidelity: 'computed'` ONLY.
App-side producers emit `'geometric'` (analytic scene shapes) or `'replayed-published'`
(authored waypoints); the kernel may not. This is the honesty line, made structural.
