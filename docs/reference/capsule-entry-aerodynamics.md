# Capsule entry aerodynamics — sourced reference

> Library reference for the descent/entry calibration (ADR-088, `descent-physics.ts`,
> `static/data/descent-profiles/*.json`). Per-capsule entry aerodynamic parameters with
> **sources**, plus the flown peak-g figures used to validate the model. When a value here is
> pulled from an external document, its link is in the [Source library](#source-library) below —
> add to that list whenever you source a new figure.
>
> Convention: **L/D** = hypersonic trim lift-to-drag. **BC** = ballistic coefficient
> m/(Cd·A) (kg·m⁻²) — lower = more drag area = gentler entry. Peak-g = felt deceleration on a
> nominal *guided* (lifting) entry unless noted; ballistic-mode g in parentheses.

## Crewed re-entry capsules

| Capsule | L/D | Base Ø (m) | BC (kg·m⁻²) | Flown peak-g (LEO) | Flown peak-g (lunar) | Sources |
|---|---|---|---|---|---|---|
| **Apollo CM** | 0.30 | 3.91 | **313.5** (sourced) | ~3.3 g (Apollo 7) | ~6.5–8 g (skip) | [NASA aero][apollo-aero], [FAA/NASA][faa], [ASME][asme] |
| **Soyuz DM** | 0.30 | 2.17 | ~530 (derived) | 3–4 g | ~8 g | [prokosmos (RU)][soyuz-ru], [kaketoustroeno (RU)][soyuz-ru2] |
| **Shenzhou RV** | ≥0.20 | 2.52 | ~440 (derived) | ≤4 g (bank-steered, ~20° trim) | (skip design) | [Tencent explainer (CN)][sz-cn], [jdse skip-entry (CN)][sz-skip] |
| **Crew Dragon** | 0.18 | 3.66 | ~500 (derived) | ~4 g | — | [Georgia Tech][gatech] |
| **Gemini RM** | 0.19 | 2.28 | ~330 (derived) | ~5–8 g | — | [DTIC AD0856691][dtic-gemini] |
| **Mercury** (orbital) | 0 (ballistic) | 1.89 | — | ~7.8 g | — | [FAA/NASA][faa] |
| **Mercury** (suborbital) | 0 (ballistic) | 1.89 | — | ~11 g (Redstone hop) | — | [FAA/NASA][faa] |
| **Vostok / Voskhod** | 0 (ballistic) | 2.30 | — | ~8 g | — | [FAA/NASA][faa] |

Notes:
- **Apollo CM BC 313.5 kg·m⁻²** is directly sourced (NASA aero data, ref area 12.0 m², 3.91 m base
  → Cd·A 17.7, Cd ≈ 1.47). This calibrates the blunt-body Cd used to *derive* the others' Cd·A
  from their published base diameters — those BCs are marked "derived" (model estimates).
- **L/D is sourced for every lifting capsule** (see per-capsule links). Apollo & Soyuz share the
  0.3 "offset-CG / headlight" value; Dragon is lowest at 0.18 (12° trim); Gemini 0.19; Shenzhou ≥0.2.
- **Ballistic capsules** (Mercury/Vostok/Voskhod) have no lift — an offset-CG lift vector was not
  yet used; they ate the full ~8 g. Correct to keep them lift-free.
- **Suborbital gap (honest):** the two Mercury-Redstone hops (freedom-7, liberty-bell-7) read ~8.7 g
  in the model vs the flown ~11 g. Their 18° entry angle + drag area are model estimates (marked in
  `estimatedFields`), unclosed — a known low-fidelity corner, not a sourced match.

## How the Orrery model uses these

- Profiles set `liftToDragRatio` (sourced), `entryCdA` (Apollo sourced, others geometry-derived),
  `flightPathAngleDeg` (~1.5° LEO deorbit, estimate), `targetDownrangeKm` (estimate). The estimated
  fields are declared in each profile's `estimatedFields`; a test enforces it (ADR-088 Phase 0b/1a).
- **Known model gap (honest):** the range-control solve flies a single *fixed* bank, so modeled
  guided peak-g runs **above** the flown value for low-L/D capsules — Apollo 4.2 g (flown 3.3),
  Soyuz **5.6 g** (flown 3–4), Shenzhou 5.0 g (flown ≤4), Dragon 5.3 g (flown ~4); i.e. **+1 to
  +2.6 g**. Real vehicles actively bank-*modulate* to hold a g-limit. **Measured negative result:**
  wiring the kernel's own decel-hold controller (`bankLiftFraction`) does NOT close this — it
  *overshoots* (Apollo target 3 g → peak ~6 g, worse than the fixed bank's ~4.2 g), because early in
  entry, with g below target, it digs *in* to build g. Holding a target g genuinely needs a
  predictor-corrector (integrate-ahead) controller, which is a large build; the residual stands
  documented, not faked. Separately, at lunar-return energy the capsule *lofts/skips*, which the
  #29 loft model DOES reproduce (ADR-089).

## Source library

<!-- Add every externally-sourced link here when you pull a figure into the calibration. -->

- [apollo-aero]: Apollo command capsule aerodynamic coefficients (drag/lift) — https://www.researchgate.net/figure/Aerodynamic-coefficients-for-Apollo-command-capsule-a-Drag-coefficient-b-Lift_fig16_268557220
- [faa]: FAA/NASA "Returning from Space: Re-entry" (LEO vs lunar g-loads) — https://www.faa.gov/sites/faa.gov/files/about/office_org/headquarters_offices/avs/III.4.1.7_Returning_from_Space.pdf
- [asme]: ASME Apollo Command Module landmark (lunar-return entry) — https://www.asme.org/wwwasmeorg/media/resourcefiles/aboutasme/who%20we%20are/engineering%20history/landmarks/162-apollo-space-command-module.pdf
- [soyuz-ru]: prokosmos.ru — Союз: устройство и спуск (L/D 0.3, g-loads) — https://prokosmos.ru/2025/11/28/kosmicheskij-korabl-soyuz
- [soyuz-ru2]: kaketoustroeno.ru — Спускаемый аппарат: аэродинамическое торможение — http://transport.kaketoustroeno.ru/a_transport&spuskaemiy-apparat&1.htm
- [sz-cn]: Tencent News — 神舟载人飞船是如何返回地面的 (L/D ≥0.2, ≤4 g bank-steer) — https://news.qq.com/rain/a/20241105A01HC000
- [sz-skip]: 深空探测跳跃式再入返回任务设计 (lunar-return skip-entry design, CN) — https://jdse.bit.edu.cn/sktcxb/cn/article/pdf/preview/10.15982/j.issn.2096-9287.2021.20210016.pdf
- [gatech]: Georgia Tech — SpaceX Dragon Re-Entry Vehicle: Aerodynamics (L/D 0.18, 12° trim) — https://repository.gatech.edu/server/api/core/bitstreams/39f02e86-13a2-4066-a79d-2a87df7d2ccd/content
- [dtic-gemini]: DTIC AD0856691 — Hypersonic Aerodynamic Characteristics of the Gemini Re-Entry Module — https://apps.dtic.mil/sti/tr/pdf/AD0856691.pdf

[apollo-aero]: https://www.researchgate.net/figure/Aerodynamic-coefficients-for-Apollo-command-capsule-a-Drag-coefficient-b-Lift_fig16_268557220
[faa]: https://www.faa.gov/sites/faa.gov/files/about/office_org/headquarters_offices/avs/III.4.1.7_Returning_from_Space.pdf
[asme]: https://www.asme.org/wwwasmeorg/media/resourcefiles/aboutasme/who%20we%20are/engineering%20history/landmarks/162-apollo-space-command-module.pdf
[soyuz-ru]: https://prokosmos.ru/2025/11/28/kosmicheskij-korabl-soyuz
[soyuz-ru2]: http://transport.kaketoustroeno.ru/a_transport&spuskaemiy-apparat&1.htm
[sz-cn]: https://news.qq.com/rain/a/20241105A01HC000
[sz-skip]: https://jdse.bit.edu.cn/sktcxb/cn/article/pdf/preview/10.15982/j.issn.2096-9287.2021.20210016.pdf
[gatech]: https://repository.gatech.edu/server/api/core/bitstreams/39f02e86-13a2-4066-a79d-2a87df7d2ccd/content
[dtic-gemini]: https://apps.dtic.mil/sti/tr/pdf/AD0856691.pdf

---
*Orrery · docs/reference/capsule-entry-aerodynamics.md · created 2026-08-31 (ADR-088 Phase 1a)*
