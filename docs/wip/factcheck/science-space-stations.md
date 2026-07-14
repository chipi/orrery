# Fact-check — SCIENCE / space-stations

Reviewer: science-reviewer (independent, web-verified)
Date: 2026-07-14
Scope: `i18n-src/en-US/science/space-stations/{_intro, expedition-cadence, node-module, pressurized-volume, solar-power-budget}.json`
Base data (`static/data/science/space-stations/*.json`) present; en-US i18n src is the authored source and the subject of this review.

Severity: 🔴 critical (materially wrong / misleading) · 🟠 significant · 🟡 minor / imprecise · 🔵 nit / style

## Per-overlay verdicts

| Overlay | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| _intro | Mostly sound; one wrong assembly claim | 0 | 1 | 1 | 0 |
| expedition-cadence | Solid; minor consumable/cert nits | 0 | 0 | 2 | 1 |
| node-module | Good; a couple port/topology imprecisions | 0 | 1 | 2 | 0 |
| pressurized-volume | **Systematic label confusion + wrong Tiangong figure** | 1 | 1 | 2 | 0 |
| solar-power-budget | Good; internal-consistency + label nits | 0 | 1 | 2 | 0 |

**Totals: 🔴 1 · 🟠 4 · 🟡 9 · 🔵 1 (15 findings)**

The single 🔴 is the load-bearing one: the whole `pressurized-volume` overlay conflates *total pressurized volume* (~916 m³ ISS / ~340 m³ Tiangong) with *habitable volume* (~388 m³ ISS / ~122 m³ Tiangong), and the Tiangong number it uses (~110 m³) is neither of the two published figures. Because the overlay's own title is "Pressurized Volume" but the numbers quoted are the *habitable* ones, and because it mixes the two axes inside a single "to scale" comparison, the section is internally inconsistent as written.

---

## _intro (`_intro.json`)

### 🟠 ISS did NOT "start as one Russian module" being the whole station — wording implies Zarya was Russian-*owned*; it was US-funded
- **Field:** `paragraphs[2]`
- **Quote:** "The ISS started as one Russian module (Zarya, 1998) and grew to a 109-meter truss with sixteen pressurized modules over fifteen years..."
- **What's wrong:** Two issues. (1) Zarya was Russian-*built* (Khrunichev) but US-*funded and US-owned* (NASA contract) — calling it "one Russian module" without qualification is a common but real oversimplification for a museum-neutral atlas. Minor. (2) The bigger issue: "sixteen pressurized modules" is a defensible count but depends heavily on what you count as a "module" (nodes, airlocks, PMMs, cupola, BEAM, docking adapters). The `pressurized-volume` body lists exactly 16 by enumerating them, so the number is at least self-consistent within this overlay — but it is on the high end and worth a footnote. The truss length (~109 m) is correct.
- **Correction:** Prefer "The ISS started with a single module (Zarya, launched 1998 — Russian-built, US-funded) and grew over fifteen years to a truss ~109 m across with roughly a dozen and a half pressurized elements." Keep the module count consistent with the enumerated list in `pressurized-volume`.
- **Source:** https://en.wikipedia.org/wiki/International_Space_Station ; https://en.wikipedia.org/wiki/Zarya_(ISS_module)
- **Confidence:** High (Zarya ownership); Medium (module-count phrasing)

### 🟡 "-270°C" for space temperature is imprecise
- **Field:** `paragraphs[0]`
- **Quote:** "keep the inside warmer than -270°C"
- **What's wrong:** -270°C (≈3 K) is the CMB floor / deep-space radiative sink, which is fine rhetorically, but a sunlit LEO surface actually swings roughly +120°C to -160°C, not a steady -270°C. The sentence is defensible as "the sky the radiators dump into is near -270°C," but a careful reader will note the ISS exterior is nowhere near that cold on the sunlit side.
- **Correction:** Optionally qualify: "chill the metal toward deep-space temperatures (the radiative sink is near -270°C)." Low priority — it's illustrative, not a spec claim.
- **Source:** https://en.wikipedia.org/wiki/International_Space_Station (thermal control)
- **Confidence:** Medium

---

## expedition-cadence (`expedition-cadence.json`)

Overall strong. Rubio 371 d (Soyuz MS-22 coolant leak, landed 2023-09-27), Polyakov 437.7 d (Mir, 1994–95), Vande Hei 355 d, Kelly+Kornienko 340 d — all verified correct. Expedition numbering (Exp 1, Nov 2000; 3-crew → 6-crew in 2009) correct. Tiangong Shenzhou durations (SZ-12 92 d, SZ-13 183 d, etc.) match published figures.

### 🟡 Soyuz / Crew Dragon "210-day" docked certification is stated with false precision
- **Field:** `narrative_101[0]` and `body_paragraphs[0]`
- **Quote:** "Soyuz and Crew Dragon spacecraft are certified to stay docked for ~210 days" / "docked-spacecraft certification (Soyuz: 210 days; Crew Dragon: 210 days; Shenzhou: 180-210 days)"
- **What's wrong:** Soyuz's on-orbit certified lifetime is commonly cited as ~200–210 days (the hydrogen-peroxide propellant / seal life driver), so ~210 is reasonable. Crew Dragon's *baseline* certification was ~180–210 days and has since been extended (Crew-x missions have flown longer, and SpaceX has certified extended stays). Quoting both as a flat "210 days" is over-precise and the Dragon figure is effectively stale (it has been extended). Shenzhou "180–210" is a reasonable estimate but not officially published in those terms.
- **Correction:** Soften to "~6–7 months of certified docked life (Soyuz ~200 d; Crew Dragon originally ~210 d, since extended)." Avoid stating exact day counts as if they were fixed specs.
- **Source:** https://en.wikipedia.org/wiki/Soyuz_(spacecraft) ; https://en.wikipedia.org/wiki/Crew_Dragon
- **Confidence:** Medium-High

### 🟡 "Russian Orlan EVA suits are recharged on the ground every six months" is inaccurate — Orlans are serviced ON ORBIT
- **Field:** `narrative_101[0]`
- **Quote:** "Russian Orlan EVA suits are recharged on the ground every six months."
- **What's wrong:** Orlan-MK/MKS suits are *not* returned to the ground on a six-month cycle. They are serviced and their consumables replenished **on orbit**, and an Orlan has a certified on-orbit service life measured in years / a fixed number of EVAs before disposal (older Orlans were discarded via cargo vehicle, not returned). US EMU suits are the ones with a ground-refurbishment cadence (and even those aren't a clean six months). This sentence attributes a ground-refurb cycle to the wrong suit and overstates it as a driver of the 6-month cadence.
- **Correction:** Drop or rewrite — e.g. "EVA-suit consumables (O₂, LiOH, battery) are replenished on orbit; suit certification life caps how long a suit can stay in service." Do not tie the 6-month rotation to Orlan ground refurbishment.
- **Source:** https://en.wikipedia.org/wiki/Orlan_space_suit
- **Confidence:** Medium-High

### 🔵 Crew-size band "6 (Exp 20–63)" then "7–9 (Exp 64–)" — the standard long-duration crew is 7, not "7–9"
- **Field:** `body_paragraphs[1]`
- **Quote:** "6 (Exp 20-63), variable 7-9 with Crew Dragon overlap (Exp 64-)."
- **What's wrong:** The nominal USOS+ROS long-duration crew since Crew Dragon (Exp 64 onward, Nov 2020) is **7**. Transient peaks of 10–11 occur during handovers (both crews aboard), not a steady "7–9." Framing the standing crew as "7–9" overstates the baseline.
- **Correction:** "7 (Exp 64–), briefly higher during crew handovers." The task brief confirms "usually 7."
- **Source:** https://en.wikipedia.org/wiki/List_of_International_Space_Station_expeditions
- **Confidence:** High

---

## node-module (`node-module.json`)

Core claims verified: three ISS nodes (Unity/Node 1 STS-88 Dec 1998; Harmony/Node 2 STS-120 2007; Tranquility/Node 3 STS-130 Feb 2010) — all correct. Node function (connector, tree topology, CBM ports) correct. Cupola on Tranquility nadir, Leonardo PMM forward, BEAM aft — all verified.

### 🟠 Unity (Node 1) port assignments are partly wrong/stale
- **Field:** `body_paragraphs[1]`
- **Quote:** "Six CBM ports: forward to Destiny, aft to Zarya, port to BEAM (was Tranquility), starboard to Quest, zenith to Z1 truss, nadir to Leonardo PMM."
- **What's wrong:** Multiple errors. (1) **"port to BEAM"** is wrong — BEAM is on **Tranquility's aft port**, never on Unity. The parenthetical "(was Tranquility)" reveals the confusion: Tranquility was originally berthed to Unity's *port* side (2010), so that port has held **Tranquility**, not BEAM. (2) **"nadir to Leonardo PMM"** — Leonardo (PMM) was berthed to Unity's nadir 2011–2015, then relocated to Tranquility's forward port in 2015; so "nadir to Leonardo" is stale (and Leonardo is now on Tranquility, as this same overlay correctly states two paragraphs later). Unity's nadir has more often carried a PMA / cargo vehicle berthing. Destiny (forward), Zarya (aft), Quest (starboard), Z1 truss (zenith) are correct.
- **Correction:** "Six CBM ports: forward → Destiny, aft → Zarya, starboard → Quest airlock, zenith → Z1 truss, port → Tranquility (2010), nadir → PMA/cargo berthing (formerly Leonardo PMM 2011–2015)."
- **Source:** https://en.wikipedia.org/wiki/Unity_(ISS_module) ; https://en.wikipedia.org/wiki/Tranquility_(ISS_module)
- **Confidence:** High

### 🟡 Tianhe "forward docking hub has 4 CBM-equivalent ports" overstates the node
- **Field:** `body_paragraphs[4]`
- **Quote:** "Forward docking hub has 4 CBM-equivalent ports plus an aft docking port... Wentian and Mengtian dock laterally via the forward node hub."
- **What's wrong:** Tianhe's forward node hub has a forward axial port (Shenzhou), a zenith/radial port, and **two lateral radial ports** used by Wentian (starboard) and Mengtian (port) after they were relocated by the arm. Calling it "4 CBM-equivalent ports" is loose: China uses its own **Chinese Docking Mechanism**, not CBM, and the count/geometry is: forward axial + 2 lateral radial + 1 nadir/zenith node port, plus the separate aft axial (Tianzhou). "4 CBM-equivalent ports" on the forward hub is an over-count and the "CBM-equivalent" label is imprecise.
- **Correction:** "Tianhe's node hub carries a forward axial port (Shenzhou), two lateral radial ports (Wentian to starboard, Mengtian to port, both relocated there by the arm), and a nadir port; the aft axial port takes Tianzhou cargo. Ports use the Chinese Docking Mechanism, not the US CBM."
- **Source:** https://en.wikipedia.org/wiki/Tiangong_space_station ; https://en.wikipedia.org/wiki/Tianhe_core_module
- **Confidence:** Medium-High

### 🟡 Harmony "docking adaptor for visiting vehicles (forward)" — Harmony has TWO forward-facing IDA ports, and Kibo/Columbus sides are correct but worth precision
- **Field:** `narrative_101[1]` and `body_paragraphs[2]`
- **Quote:** "Harmony connects the US lab cluster to the Japanese and European modules" / "connects Destiny to Columbus (port), Kibo (starboard), and the docking adaptor for visiting vehicles (forward)."
- **What's wrong:** Substantially correct (Columbus is on Harmony's port side, Kibo on starboard, Destiny aft). But Harmony hosts **two** International Docking Adapters — PMA-2/IDA-2 on the forward port and PMA-3/IDA-3 on the zenith port — so "the docking adaptor (forward)" singular undercounts the crew-vehicle berthing on Harmony. Minor.
- **Correction:** "...and the two docking adapters (IDA-2 forward, IDA-3 zenith) for Crew Dragon / Starliner."
- **Source:** https://en.wikipedia.org/wiki/Harmony_(ISS_module)
- **Confidence:** High

---

## pressurized-volume (`pressurized-volume.json`)

This overlay is the weakest of the five. The individual numbers are each defensible in isolation, but the overlay **titles itself "Pressurized Volume" and then quotes the HABITABLE volume figures** — and the Tiangong figure is wrong on either axis.

### 🔴 Systematic total-vs-habitable volume confusion; Tiangong figure (~110 m³) is wrong
- **Field:** `narrative_101[0]`, `body_paragraphs[1-2]`, `diagram_caption`
- **Quote:** "The ISS comes in at roughly 388 m³ ... Tiangong comes in at about 110 m³" / "ISS: ~388 m³ across 16 pressurized modules" / "Tiangong: ~110 m³ across three modules" / diagram: "Tiangong (~110 m³), Mir (~350 m³), ISS (~388 m³)."
- **What's wrong:**
  1. **Label mismatch.** The overlay's title and intro define the metric as *pressurized volume* ("the inside of the modules that crew can breathe inside, summed across the whole station"). But **388 m³ is the ISS *habitable* volume**; the ISS *pressurized* volume is **~916 m³** (NASA facts-and-figures; some current NASA pages cite ~1,005 m³). So the overlay quotes the habitable number under a "pressurized volume" title — a category error repeated in the diagram.
  2. **Tiangong number is wrong on both axes.** Tiangong's published *total pressurized* volume is **~340 m³**; its *habitable* volume is **~122 m³**. The overlay's "~110 m³" matches neither cleanly (it's close-ish to the habitable figure but low, and it sits in a diagram alongside ISS's *habitable* 388 and Mir's *total* 350 — mixing axes).
  3. **Mir mixing.** Mir "~350 m³" is the *total pressurized* volume — so the diagram compares ISS-habitable (388) against Mir-total (350) against a Tiangong number that's neither. Three different measurement bases in one "to scale" chart.
- **Correction:** Pick ONE axis and hold it across all three bodies. Cleanest: keep the *habitable* framing (it's the more human number) and correct the values —
  - ISS habitable ≈ **388 m³** (keep), or if using pressurized, **~916 m³**.
  - Tiangong habitable ≈ **122 m³** (replace 110), or pressurized ≈ **340 m³**.
  - Mir — use the habitable figure to match, or relabel the chart axis as "total pressurized" and use ISS ~916 / Tiangong ~340 / Mir ~350.
  Also fix the intro/title so the metric name matches the numbers quoted (don't call the *habitable* 388 "pressurized volume").
- **Source:** https://www.nasa.gov/international-space-station/space-station-facts-and-figures/ ; https://en.wikipedia.org/wiki/International_Space_Station ; https://en.wikipedia.org/wiki/Tiangong_space_station ; https://en.wikipedia.org/wiki/Mir
- **Confidence:** High

### 🟠 "388 m³ ≈ a Boeing 747 passenger cabin" comparison is off
- **Field:** `narrative_101[0]`
- **Quote:** "roughly 388 m³ (about the volume of a Boeing 747's passenger cabin)"
- **What's wrong:** A 747's passenger cabin volume is roughly 800–900 m³ (the main-deck cabin alone is several hundred m³; total pressurized fuselage is larger). 388 m³ is closer to a 747's *main-deck passenger section* only under a narrow definition. If the intent is to match the *pressurized* ISS volume (~916 m³), then the 747 comparison actually fits the ~916 figure — which reinforces that the overlay mixed up habitable vs pressurized (a 747 ≈ ISS *pressurized*, not ISS *habitable*).
- **Correction:** Either compare the ISS *pressurized* volume (~916 m³) to a 747 cabin, or change the analogy for 388 m³ (habitable) to something ~1.5× a typical 3-bedroom house, or "a bit larger than a Boeing 747's main passenger deck."
- **Source:** https://en.wikipedia.org/wiki/Boeing_747 (cabin dimensions)
- **Confidence:** Medium-High

### 🟡 "14 m³ per person net habitable volume" attributed to NASA-STD-3001 as a hard number
- **Field:** `narrative_101[2]` and `body_paragraphs[3]`
- **Quote:** "Crews need about 14 m³ per person of 'net habitable volume' ... The 14 m³/person guideline (NASA-STD-3001 Volume 2)..."
- **What's wrong:** NASA-STD-3001 Vol. 2 and the associated HIDH give net-habitable-volume *guidance curves that vary with mission duration*, not a single flat "14 m³/person." Published performance-limit / tolerable curves land around ~10–25 m³/person depending on duration and whether you cite the "performance limit" vs "optimal" curve. Quoting a single "14 m³" as *the* standard is over-precise; 14 is within range but not a fixed spec.
- **Correction:** "roughly 15–25 m³ per person for multi-month missions (NASA-STD-3001 net-habitable-volume guidance is duration-dependent, not a single fixed value)."
- **Source:** https://www.nasa.gov/wp-content/uploads/2023/03/nasa-std-3001-vol-2-rev-d.pdf (NASA-STD-3001 Vol 2); HIDH net habitable volume section
- **Confidence:** Medium

### 🟡 "ISS and Tiangong both clear [14 m³/person] by 3–4×" doesn't follow from the overlay's own numbers
- **Field:** `narrative_101[2]`
- **Quote:** "ISS and Tiangong both clear this by 3-4× ..."
- **What's wrong:** Using the overlay's own figures: ISS 388 m³ ÷ 7 crew ≈ 55 m³/person → ~4× the 14 figure ✓. But Tiangong 110 m³ ÷ 3 crew ≈ 37 m³/person → ~2.6×, not "3–4×," and using the *habitable* 122 m³ it's ~40 m³/person ≈ 2.9×. And 388 m³ is *gross/habitable*, not *net* — dividing gross by crew and comparing to a *net*-habitable standard double-counts the rack volume the overlay itself says is 30–50% of the total. So the "3–4×" is internally inconsistent with the net-vs-gross distinction the body paragraph draws.
- **Correction:** Recompute against net habitable volume consistently, or soften to "both comfortably exceed the minimum."
- **Source:** derivation from overlay figures + https://en.wikipedia.org/wiki/Tiangong_space_station
- **Confidence:** Medium

---

## solar-power-budget (`solar-power-budget.json`)

Headline numbers verified: 8 main wings, each 35 m × 12 m; ~120 kW peak sunlit for the original 8 (some sources 160 kW current sunlit / ~84–120 kW average); iROSA ×6, each +>20 kW; **~215 kW total installed at completion** ✓. Tiangong ~27–30 kW plausible. Mir ~30 kW (max ~35 kW) ✓. Orbit ~92 min with ~60% sunlit ✓. Li-ion battery ORUs replaced Ni-H₂ ✓.

### 🟠 "~215 kW peak gross" then "~120 kW after duty cycle" double-applies losses / mislabels
- **Field:** `body_paragraphs[1]`
- **Quote:** "As of 2025: ~215 kW peak gross, ~120 kW after duty cycle and storage losses."
- **What's wrong:** The ~215 kW is the **installed/at-completion sunlit generation** figure once all six iROSA are up. Applying a ~0.6 duty cycle to 215 gives ~129 kW *orbit-average generation* — but the overlay elsewhere describes ~120 kW as "reaching the actual loads after losses," and the `narrative_101` says the *original* array delivers "75–90 kW to the loads." Mixing "215 peak → 120 after duty cycle" with the earlier "120 kW from eight arrays... 75–90 kW reaches loads" produces two different meanings for "120 kW" in the same overlay. Also, published NASA framing is that with iROSA the station reaches **215 kW of generation capability**; the ~95 kW / ~120 kW splits refer to the mix of shadowed original arrays vs new iROSA, not a clean duty-cycle derating.
- **Correction:** State one consistent chain: "8 original wings ~160 kW sunlit (derated with age); + 6 iROSA (>20 kW each) → ~215 kW sunlit generation at completion; orbit-average (×~0.6 sunlit fraction, minus storage/regulation losses) ≈ 84–120 kW delivered to loads." Don't reuse "120 kW" for two different quantities.
- **Source:** https://www.nasa.gov/missions/station/new-solar-arrays-to-power-nasas-international-space-station-research/ ; https://en.wikipedia.org/wiki/Electrical_system_of_the_International_Space_Station
- **Confidence:** Medium-High

### 🟡 iROSA count/placement: "augments each main wing" implies 8, but only 6 iROSA were installed
- **Field:** `narrative_101[1]` and `body_paragraphs[1]`
- **Quote:** "recently augmented by six smaller iROSA roll-out arrays" (✓) / "iROSA augments each main wing with an iROSA roll-out array at the inboard end, adding ~20 kW peak each."
- **What's wrong:** "each main wing" implies all 8 wings get an iROSA, but only **6** iROSA units were installed (covering 6 of the 8 original wings; two original wings remain uncovered). The narrative_101 correctly says "six," but the body_paragraphs "augments each main wing" contradicts that.
- **Correction:** "iROSA covers six of the eight original wings (2A, 4A, 3A/3B, 1A/1B by pair), each adding >20 kW; two original wings remain uncovered."
- **Source:** https://space.skyrocket.de/doc_sdat/irosa-1.htm ; https://www.nasa.gov/missions/station/new-solar-arrays-to-power-nasas-international-space-station-research/
- **Confidence:** High

### 🟡 "eight 35 m × 12 m arrays" vs "109 m wing-to-wing" — the 109 m is the TRUSS, not the array span
- **Field:** `narrative_101[0-1]`
- **Quote:** "the ISS arrays span 109 m wing-to-wing — bigger than a football field"
- **What's wrong:** ~109 m is the **integrated truss structure (ITS) length**, which is essentially the array-span dimension, so it's roughly right as "solar wing tip to solar wing tip." But the same 109 m appears in `_intro` as the *truss* length. Using "arrays span 109 m" and "109-meter truss" interchangeably is loose — they're close but not the same measurement (the truss is the backbone; the arrays extend along/around it). Minor; the ~73 m *overall* array wingspan per pair and the ~109 m truss are sometimes conflated in popular sources.
- **Correction:** "The solar wings run the length of the ~109 m truss." Keep the truss vs array-span distinction consistent with `_intro`.
- **Source:** https://en.wikipedia.org/wiki/Integrated_Truss_Structure ; https://en.wikipedia.org/wiki/International_Space_Station
- **Confidence:** Medium

---

*End of fact-check. No edits applied — findings only, per review brief.*
