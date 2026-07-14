# Science fact-check — porkchop / trajectory-planning overlays

Reviewer: science-reviewer (skeptical, web-verified)
Date: 2026-07-14
Scope: `i18n-src/en-US/science/porkchop/{_intro, what-is-a-porkchop, contour-reading, departure-axis, dv-heatmap, tof-axis, viability}.json`
No base overlay present (`i18n-src/base/science/porkchop/` does not exist).

## Per-overlay verdicts

| Overlay | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| _intro | PASS (minor) | 0 | 0 | 1 | 0 |
| what-is-a-porkchop | PASS (minor) | 0 | 0 | 1 | 1 |
| contour-reading | PASS | 0 | 0 | 1 | 0 |
| departure-axis | PASS | 0 | 0 | 1 | 1 |
| dv-heatmap | REVIEW | 0 | 1 | 1 | 1 |
| tof-axis | PASS | 0 | 0 | 1 | 0 |
| viability | PASS (minor) | 0 | 0 | 1 | 0 |

**Totals: 🔴 0 · 🟠 1 · 🟡 6 · 🔵 4**

No hard mechanism errors. The physics of porkchop plots, Lambert grids, Type I/II
transfers, synodic windows, and TOF trade-offs is described correctly. The one
🟠 is a units/quantity conflation in the dv-heatmap overlay. The 🟡s are mostly
one recurring conceptual imprecision (∆v-vs-C3 quantity choice) plus small
numeric roundings. Confidence high across the board.

---

## _intro.json

**🟡 The color-metric is called "∆v heatmap" throughout, but standard porkchop plots plot C3 / arrival V∞, not ∆v.**
- Field: `paragraphs[2]` — "the colour scale (∆v heatmap)"
- What's off: The canonical porkchop plot (NASA, Wikipedia, Degenerate Conic,
  the MATLAB reference script) plots **contours of characteristic energy C3
  (km²/s²)** for departure and **arrival V∞ (km/s)**, with TOF as a secondary
  contour set — not a single "∆v cost." Orrery's choice to collapse the color
  onto a ∆v-in-km/s scale is a legitimate *pedagogical simplification*, but the
  intro presents it as *the* porkchop convention without flagging that real
  porkchops usually show C3 / V∞.
- Correction: Optionally note this is a simplified ∆v rendering; standard
  porkchops contour C3 and arrival V∞. Not wrong, just non-standard framing.
- Source: https://en.wikipedia.org/wiki/Porkchop_plot ; https://degenerateconic.com/porkchop-plots.html
- Confidence: high (that standard porkchops use C3/V∞); the simplification itself is a design call, not an error.

---

## what-is-a-porkchop.json

**🟡 Same ∆v-vs-C3 framing as _intro (intro_sentence + body).**
- Field: `intro_sentence` — "A 2D heatmap showing ∆v cost across every (departure date, transit time) pair"; `diagram_caption` — "colour = ∆v cost"
- What's off: See _intro finding. Real porkchops contour C3 (departure energy)
  and arrival V∞. The "∆v cost" label is Orrery's simplification.
- Correction: Same as above — acceptable if intentional; flag the divergence from convention.
- Source: https://en.wikipedia.org/wiki/Porkchop_plot
- Confidence: high.

**🔵 "Solve Lambert millions of times" / "each pixel is one Lambert problem" — correct, minor note.**
- Field: `narrative_101[2]`, `body_paragraphs[1]`
- What's fine: Each cell IS a Lambert boundary-value problem (fixed departure
  position/time, fixed arrival position/time → solve for the transfer conic).
  This is exactly right. "Millions" is rhetorical but fair for a fine
  daily×daily grid over four years (~1,460² ≈ 2.1M cells if fully sampled).
- Correction: none needed.
- Source: https://en.wikipedia.org/wiki/Porkchop_plot (Lambert basis); https://degenerateconic.com/porkchop-plots.html
- Confidence: high.

---

## contour-reading.json

**🟡 Type I / Type II described correctly, but the "two cheap lobes side by side" geometry is slightly idealized.**
- Field: `narrative_101[1]`, `body_paragraphs[1]`
- What's verified CORRECT: Type I = transfer angle < 180° (short way, faster);
  Type II = transfer angle > 180° (long way, slower, sometimes cheaper). Both
  are real and flown. Confirmed against the literature (Type I 180–260 d, Type II
  ~400–500 d for Earth–Mars). This is accurate.
- Minor: On a real Mars porkchop the Type I and Type II minima are separated by
  the "180° ridge" (the bone of the chop — where a plane change blows up ∆v), so
  they read as two lobes split by a high-cost ridge rather than two neatly
  "parallel cheap bands." `body_paragraphs[1]` says "two parallel cheap bands,"
  which is a reasonable simplification but the defining feature is the ridge
  *between* them.
- Correction: Optionally mention the high-∆v ridge at ~180° transfer angle that
  separates the two lobes (this is literally why the plot looks like a chop with
  a bone).
- Source: https://en.wikipedia.org/wiki/Porkchop_plot ; GitHub ravi4ram/Porkchop-Plot (Type I/II)
- Confidence: high.

Note: `body_paragraphs[0]` "centred near a 250-day TOF, recurring every 26 months"
— both numbers correct (Hohmann Mars TOF ~259 d; Earth–Mars synodic ~779.9 d ≈ 25.6 mo).

---

## departure-axis.json

**🟡 Venus/Jupiter synodic figures — Venus fine, Jupiter defensible but rounded.**
- Field: `narrative_101[1]`, `body_paragraphs[1]` — "Mars ~26 months. Venus ~19. Jupiter ~13."
- Verified: Earth–Venus synodic = 583.9 d = 19.2 mo ✓. Earth–Mars = 779.9 d = 25.6 mo ≈ 26 ✓.
  Earth–Jupiter synodic = 398.9 d = **13.1 months** ✓ — "every 13 months" is correct.
- Minor: `body_paragraphs[1]` explains Jupiter's 13-month period as "close to
  Earth's year" — accurate framing (Jupiter barely moves, so Earth re-laps it
  ~33 days after each Earth year).
- Correction: none required; all three synodic values check out.
- Source: https://www.firgelliauto.com/blogs/engineering-calculators/synodic-period-calculator ; https://en.wikipedia.org/wiki/Launch_window
- Confidence: high.

**🔵 "four years captures two full synodic cycles" holds only for Mars.**
- Field: `narrative_101[0]`, `body_paragraphs[0]` — "about four years... enough to capture two full synodic cycles"
- What's off: A 4-year span = two Mars synodic cycles (2×25.6 mo ≈ 51 mo ≈ 4.3 yr) ✓,
  but for Venus (19 mo) four years = ~2.5 cycles and for Jupiter (13 mo) = ~3.7
  cycles. The "two synodic cycles" justification is Mars-specific; it's presented
  as the general reason for the 4-year window.
- Correction: Clarify the "two cycles" rationale is for Mars; other destinations
  fit more windows in the same span.
- Source: synodic values above.
- Confidence: high.

Note: `body_paragraphs[2]` cites the axis label `DEPARTURE WINDOW · 2026 — 2030`
— that's a 4-year span, internally consistent with the text.

---

## dv-heatmap.json

**🟠 Mixes ∆v (km/s) and C3 (km²/s²) in the same overlay without flagging that they are different quantities.**
- Field: `body_paragraphs[1]` — "Voyager 1 launched at C3 ≈ 99 km²/s² (V∞ ≈ 10 km/s) — already near the limit of what was flyable in 1977."
- What's off: The whole overlay teaches the color axis as **∆v in km/s**
  (teal ~3, red >9–11 km/s). Then it introduces Voyager 1 in **C3 (km²/s²)** to
  illustrate "the limit." C3 and ∆v are different quantities (C3 = V∞²; a
  departure ∆v from LEO of ~3–7 km/s corresponds to C3 up to a few tens of
  km²/s²). Dropping a 99 km²/s² number next to an 11 km/s ∆v ceiling invites
  the reader to compare them directly, which is a category error. A porkchop
  cell's "∆v cost" and a launch vehicle's injection C3 are not the same axis.
- Correction: Either express Voyager's energy as a departure ∆v (its injection
  ∆v from LEO was ~7+ km/s), or explicitly say "C3 is the squared form; on a ∆v
  scale that's the far-red end." Don't juxtapose 99 km²/s² and 11 km/s as if
  they sit on one ruler.
- Source: https://en.wikipedia.org/wiki/Characteristic_energy (C3 = V∞², units km²/s²); https://en.wikipedia.org/wiki/Porkchop_plot
- Confidence: high (the units/quantity distinction is unambiguous).

**🔵 Voyager 1 "C3 ≈ 99 km²/s², V∞ ≈ 10 km/s" — internally consistent, number defensible but unverified to a primary source.**
- Field: `body_paragraphs[1]`
- Status: √99 = 9.95 ≈ 10 km/s, so the pair is self-consistent. Published
  Voyager-1 injection C3 values cluster around 100–107 km²/s² (V∞ ≈ 10–10.3 km/s
  heliocentric-excess-relative-to-Earth); I could not pin the exact figure to a
  JPL primary in this pass. ~99 is close enough to be defensible; would upgrade
  only if a primary source shows a materially different value.
- Correction: none required; optionally cite the source or round to "~100 km²/s²."
- Source: https://en.wikipedia.org/wiki/Characteristic_energy (comparison values); Voyager-1 exact C3 not located in a primary this pass.
- Confidence: medium (value plausible, primary not confirmed).

**🟡 "~3 km/s teal = what an actual Hohmann to Mars costs" — this is the HELIOCENTRIC ∆v, not total-from-LEO.**
- Field: `narrative_101[1]`, `body_paragraphs[0]` — "Cool teal ~3 km/s — what an actual Hohmann to Mars costs"
- What's off: The heliocentric two-burn Hohmann Earth→Mars ∆v is ~5.6 km/s
  (2.94 + 2.65 km/s at the two ends of the heliocentric ellipse). The ~3–3.9 km/s
  figure is the *trans-Mars injection* ∆v from LEO (the departure burn only), or
  roughly the departure-leg ∆v. The overlay's ~3 km/s teal floor is a reasonable
  porkchop *departure*-∆v/C3-equivalent number, but calling it "what a Hohmann to
  Mars costs" is ambiguous — total mission ∆v (LEO→Mars capture) is much larger.
- Correction: Specify it's the departure (TMI-from-LEO) ∆v, or the porkchop's
  departure-energy metric — not the full Hohmann or the total mission ∆v.
- Source: http://marspedia.org/Earth-Mars_Transfer_Trajectory ; Hohmann Mars departure ∆v ~3.6–3.9 km/s from LEO vs ~5.6 km/s heliocentric.
- Confidence: high.

---

## tof-axis.json

**🟡 "Hohmann transfer to Mars is always around 8.5 months" and "~250 days" — correct.**
- Field: `narrative_101[2]`, `body_paragraphs[0]`
- Verified: Minimum-energy Hohmann Earth→Mars TOF ≈ 259 days ≈ 8.5 months ✓.
  Y-range "roughly 100–500 days" for Mars-class targets is sensible (spans
  fast Type I ~150 d through slow Type II ~450 d). Jupiter "years" ✓ (Hohmann
  Earth→Jupiter TOF ≈ 2.7 yr).
- What's fine: The physical claim — faster-than-Hohmann trips cost more ∆v
  (steeper transfer ellipse), slower trips loiter — is correct. Crew-vs-cargo
  trade (food/water/O₂/radiation per extra month) is a valid mission-design point.
- Minor: "fast trips are expensive because you're forcing a steep transfer
  ellipse" — accurate; below the Hohmann TOF you climb toward hyperbolic/high-C3
  departures.
- Correction: none required.
- Source: http://marspedia.org/Earth-Mars_Transfer_Trajectory ; https://en.wikipedia.org/wiki/Hohmann_transfer_orbit
- Confidence: high.

Note: `body_paragraphs[2]` — "Jupiter's [porkchop] wider — the gravity assist
landscape spreads launch options across more dates." This blends two ideas: a
ballistic Jupiter porkchop's lobe width is set by orbital geometry, while
*gravity-assist* trajectories (VEEGA etc.) are a separate design layer, not part
of a ballistic Lambert porkchop. Minor conceptual blur, not an error worth a tag.

---

## viability.json

**🟡 "rocket's ∆v capability ≥ cell's ∆v cost" framing is sound but simplifies the C3/mass coupling.**
- Field: `intro_sentence`, `narrative_101[0-1]`, `body_paragraphs[0]`
- What's fine: The core viability logic — compare vehicle capability to the
  porkchop's per-cell cost, cells within capability are flyable — is exactly how
  feasibility screening works. Iterating vehicle / payload / schedule until the
  cheap zone fits is a faithful description of real trajectory/launch-vehicle
  trades.
- Minor: A launch vehicle's capability is usually published as **C3 vs payload
  mass** (a curve), not a single "∆v capability." The overlay flattens this to
  one "∆v ceiling" per vehicle. Fine as a simplification, but the real gate is
  "C3 the vehicle can deliver for *this payload mass*," which is why the same
  rocket's usable lobe shrinks as payload grows.
- Correction: Optionally note vehicle capability is C3-vs-mass, so heavier
  payloads shrink the feasible lobe.
- Source: https://trajbrowser.arc.nasa.gov/user_guide.php (injection ∆v ↔ C3 ↔ payload); https://en.wikipedia.org/wiki/Characteristic_energy
- Confidence: high.

---

## Summary of the one recurring theme

The overlays consistently teach the porkchop color axis as **"∆v cost in km/s."**
Real porkchops contour **C3 (departure, km²/s²)** and **arrival V∞ (km/s)**.
That's a defensible pedagogical simplification and I did not tag it 🔴/🟠 on its
own — BUT it becomes a real problem in `dv-heatmap.json` where a C3 value
(99 km²/s²) is dropped onto the same ruler as an 11 km/s ∆v ceiling (🟠). The
cleanest fix is to (a) keep the ∆v-km/s scale, and (b) when citing Voyager,
either convert to a ∆v or explicitly mark C3 as the squared quantity. Everything
else — Lambert basis, Type I/II, synodic windows (Mars 26 / Venus 19 / Jupiter 13
mo, all verified), Hohmann TOF ~259 d / 8.5 mo, the fast-trip-costs-more gradient,
and the viability comparison — is scientifically sound.
