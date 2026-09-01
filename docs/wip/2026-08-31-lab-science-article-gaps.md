# Encyclopedia article-gap audit — Physics Lab spaceflight/systems concepts (#32)

**Date:** 2026-08-31 · **Method:** every concept the Physics Lab now teaches (formulas + goals in
`src/lib/physics/registry/`) grepped against the `/science` corpus (`static/data/science/**`).

The `/science` encyclopedia is otherwise thorough — Tsiolkovsky, TWR, vis-viva, Hohmann, Lambert,
gravity-assist, Oberth, C3, v∞, free-return, gravity-turn, sun-synchronous, porkchop, EDL,
entry-heating, ballistic-coefficient, propulsive-landing, skycrane are all covered. The gaps below
are concepts the Lab teaches (often as a whole lesson) with **no** matching article.

## Ranked gaps (0 articles found)

1. **Lifting entry / lift-vector (bank-angle) steering** — the entry computer's core (ADR-088,
   `entry-steering`). A capsule's one control on re-entry is bank; lift roughly doubles the
   survivable-angle corridor. **Nothing** in `/science`. *(the flagged #1.)* Category:
   `mission-phases`.
2. **Skip entry / super-circular atmospheric skip** — lunar-return entry at ~11 km/s (ADR-089,
   `apollo8`): the craft dips, skips back out of the atmosphere, re-enters. No article.
   Category: `mission-phases`.
3. **Entry footprint / range control** — the reachable landing-range band and the g each range costs
   (`entry-range-control`). No article. Category: `mission-phases`.
4. **Powered Explicit Guidance (PEG) / closed-loop ascent guidance** — "the flying computer"
   (`ascent-guidance`). `mission-phases` has `gravity-turn`, `launch`, `max-q`, `orbit-insertion`,
   but nothing on the *guidance loop* that flies a low-TWR upper stage to orbit. Category:
   `mission-phases` or `propulsion`.
5. **Escape velocity** — taught in `leave-the-solar-system`; it's implicit in `vis-viva`/`keplerian`
   but has no standalone article. Category: `orbits`.
6. **Synodic period / launch windows** — the `launch-window` lesson teaches phasing + the synodic
   recurrence; the `porkchop` category covers the *plot* (`what-is-a-porkchop`, `dv-heatmap`, axes)
   but not the synodic-period concept itself. Category: `orbits` or `porkchop`.

## Not a gap (already covered, for the record)

- `entry-corridor` → partly covered by `mission-phases/deorbit-corridor` (deorbit targeting) +
  `entry-heating`; the *survivable-angle* framing is the lifting-entry article's job (#1).
- Molniya / critical inclination → `orbits/special-orbits`.

## Recommendation

Write the six, top-to-bottom. #1 (lifting entry) is the highest-value and most-referenced by the new
systems lessons. Each is a real editorial artifact → must pass the `science-reviewer` gate before it
ships (AGENTS.md content rule). This audit is the input to that content pass; it does not itself add
articles.
