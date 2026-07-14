# Fact-check — MARS missions, batch B

Reviewer: science-reviewer (skeptical, web-verified). Date of review: 2026-07-14.
NOTE present = "as of 2026". Web-verified every date, superlative, quantity, mechanism, and overlay↔base consistency.

## Per-mission verdicts

| Mission | Verdict | Highest severity |
|---|---|---|
| mars/mmx | PASS (well-framed as PLANNED) | LOW |
| mars/opportunity | ISSUES — "14 years 47 days" is the *excess over design*, not the surface lifetime | MED |
| mars/perseverance | ISSUES — dispatch conflates landing site with the delta; Ingenuity "comms relay" claim is false | HIGH |
| mars/phoenix | PASS | — |
| mars/schiaparelli | PASS | — |
| mars/spirit | ISSUES — sol count off by 2 | LOW |
| mars/starship-demo | PASS (well-framed as PLANNED/speculative) | — |
| mars/starship-mars-crew | PASS (well-framed as CONCEPT) | — |
| mars/tianwen1 | PASS | — |
| mars/viking1 | ISSUES — orbiter resolution wrong (100m vs ~300m); lander end date off by 2 days | MED |

**Totals: 5 PASS, 5 with issues. Findings by severity — HIGH 2, MED 3, LOW 3.**

---

## mars/mmx — PASS (LOW)

Framed correctly as PLANNED throughout (`type: "PHOBOS SAMPLE RETURN · PLANNED"`, `status: PLANNED`, all events forward-dated). All quantities verified.

- Phobos sample ~10 g ✓; Earth return ~2031 ✓; sample collection 2028–2029 ✓ (JAXA: land on Phobos 2029); Mars arrival 2027 ✓; IDEFIX rover ~25 kg, DLR/CNES ✓; launch NET 2026 after H3 delay from 2024 ✓.
- Superlative "First sample return from a Martian moon" — true and correctly hedged as planned.
- Source: https://en.wikipedia.org/wiki/Martian_Moons_eXploration , https://www.mmx.jaxa.jp/en/ , https://en.wikipedia.org/wiki/Idefix_(rover)

**LOW — base `departure_date`**
- File: `static/data/missions/mars/mmx.json` · field `departure_date`
- Quote: `"departure_date": "2026-09-01"`
- Issue: Verified launch window is **November–December 2026** (spacecraft arrived at Tanegashima 2026-03-31; launch NET Nov/Dec 2026). 2026-09-01 is ~2–3 months early. Note the overlay/credit correctly say "NET 2026-09" — so the whole file is internally consistent but the specific month is slightly optimistic vs the current published window.
- Correction: use 2026-11 or 2026-12 as the placeholder launch date, or keep "2026 NET" language.
- Source: https://www.space.com/astronomy/mars/japans-audacious-sample-return-mission-to-the-mars-moon-phobos-has-made-it-to-the-launch-pad
- Confidence: medium (windows shift; JAXA's own JFY2026 statement is broad).

---

## mars/opportunity — ISSUES (MED)

Most claims verified: landing 2004-01-25 Meridiani Planum ✓; Eagle Crater ~22 m, bounced 26 times ✓; jarosite + hematite "blueberries" ✓; 45.16 km = marathon/longest-drive record ✓ (odometry at last comms, sol 5111, 2018-06-10); final transmission 2018-06-10 ✓; end-of-mission declared 2019-02-13 ✓; Delta II 7925H Heavy ✓.

**MED — "14 years 47 days" is the *excess over design*, not the surface lifetime (repeated 3×)**
- Files/fields:
  - `i18n-src/en-US/missions/mars/opportunity.json` · `description` — "Over 14 years 47 days Opportunity traversed 45.16 km"
  - `static/data/missions/mars/opportunity.json` · `credit` — "after 14 years 47 days of surface operations"
  - `static/data/missions/mars/opportunity.json` · `flight.events[].description` — "Traversed 45.16 km over 14+ years"
- Quote: `"after 14 years 47 days of surface operations"`
- What's wrong: NASA/Wikipedia state "14 years 47 days" is how far Opportunity **exceeded its 90-sol design mission**, NOT its total operating time. Actual surface lifetime = **5111 sols = 14 years 138 days** (2004-01-25 → 2018-06-10). The files present the 47-day figure as the mission *duration*, which understates it by ~91 days. (The overlay `first` field "14-year surface lifetime" and the dispatch "worked for fourteen years" are fine — the error is only where "14 years 47 days" is used as the total.)
- Correction: "14 years 138 days (5111 sols)" for total surface operations; reserve "exceeded its design by 14 years 47 days" if the excess is what's meant.
- Source: https://en.wikipedia.org/wiki/Opportunity_(rover) ("operated for 5111 sols … exceeded its planned mission by 14 years, 47 days"); https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/
- Confidence: high.

Note (not a finding): overlay `first` "Longest-driving Mars rover (45.16 km)" is correct and correctly dated (record as of its 2018 end / still stands 2026).

---

## mars/perseverance — ISSUES (HIGH)

Verified: landed 2021-02-18 Jezero, Octavia E. Butler Landing ✓; Atlas V 541 ✓; Ingenuity first flight 2021-04-19, ~39 s, first powered flight on another planet ✓; 72 flights, grounded 2024-01-18 by rotor damage ✓; MOXIE first in-situ O₂ ✓; MSR sample caching, first tube 2021-09-06 ✓; base flight desc coordinates 18.4447°N 77.4508°E ✓.

**HIGH — dispatch conflates the landing site with the delta**
- File: `i18n-src/en-US/missions/mars/perseverance.json` · `dispatch`
- Quote: "Landed in 2021 in Jezero Crater — the delta of a river that fed a lake billions of years ago, exactly the kind of place life would have left traces"
- What's wrong: Perseverance landed on the **Jezero crater floor** (Octavia E. Butler Landing), NOT in/on the delta. It began the "Delta Front" campaign and reached the delta only in **April 2022** (Sol 415, 2022-04-20) — 14 months after landing. The em-dash apposition reads as "landed … [in] the delta," which is wrong.
- Correction: "Landed in 2021 on the floor of Jezero Crater — a basin holding the delta of a river that fed a lake billions of years ago …" (keep the delta as the *reason for the site*, not the touchdown point).
- Source: https://science.nasa.gov/mission/mars-2020-perseverance/location-map/ ; https://www.pma.caltech.edu/news/... (Delta Front campaign began Sol 415, 2022-04-20)
- Confidence: high.

**HIGH — Ingenuity "remains operational as a comms relay" is false**
- File: `i18n-src/en-US/missions/mars/perseverance.json` · `events[].note` (INGENUITY RETIRED, met 1278)
- Quote: "Rotor blade damaged on 72nd flight 2024-01-18; helicopter remains operational as a comms relay."
- What's wrong: Ingenuity's mission was **declared ended**. It is grounded and repurposed as a **stationary weather/environment station** — it takes daily images + temperature data and stores them onboard for possible future retrieval. It does NOT function as a comms relay: it can only downlink its *own* data through Perseverance, and Perseverance has since driven ~3 km away. "Operational as a comms relay" is doubly wrong (mission ended; not a relay).
- Correction: "… helicopter grounded; repurposed as a stationary weather/data station, storing readings for future retrieval." Also fix base `credit` if it implies otherwise (it says "retired 2024-01" — fine).
- Source: https://www.jpl.nasa.gov/news/nasas-ingenuity-mars-helicopter-team-says-goodbye-for-now/ ; https://www.nasa.gov/news-release/after-three-years-on-mars-nasas-ingenuity-helicopter-mission-ends/
- Confidence: high.

Minor (LOW, not counted separately): overlay INGENUITY FIRST FLIGHT note says "39.1 seconds at up to 5 m altitude" — flight 1 hovered at ~3 m (10 ft) for ~39 s. "up to 5 m" is a slight overstatement of the *first* flight altitude (5 m was a later flight). Verify if tightening: https://en.wikipedia.org/wiki/List_of_Ingenuity_flights

---

## mars/phoenix — PASS

All verified:
- Landed 2008-05-25, Vastitas Borealis (Green Valley) ✓; 68.22°N 234.25°E ✓ (northernmost surface mission at the time) ✓.
- "First soft propulsive Mars landing since Viking 2 (1976)" ✓ — NASA: first stationary soft-lander since Viking 2, ~32 years.
- Water-ice exposure sublimating on camera over ~4 sols ✓ (Surface Stereo Imager, 2008-06-15→19); perchlorates ✓; snow from clouds ✓.
- Mission end 2008-11-02, solar power below threshold at onset of polar winter ✓.
- Salvaged from cancelled Mars Surveyor 2001 lander, ~6 yr in storage ✓.
- Delta II 7925 ✓.
- Source: https://en.wikipedia.org/wiki/Phoenix_(spacecraft) ; https://science.nasa.gov/mission/phoenix/
- Confidence: high.

---

## mars/schiaparelli — PASS

All verified:
- Launch 2016-03-14 Baikonur on Proton-M/Briz-M (TGO + Schiaparelli stack) ✓; separation from TGO 2016-10-16 ✓; entry 2016-10-19 ✓ (3 days later ✓).
- Failure mechanism ✓: IMU saturated during parachute-phase oscillation → erroneous (negative) altitude → premature parachute jettison + thruster cutoff at ~3.7 km → impact.
- Impact ~540 km/h = ~150 m/s ✓ (overlay "~150 m/s" and base "540 km/h" are mutually consistent).
- Meridiani Planum target ✓; TGO orbit insertion succeeded, still operating ✓.
- Correctly framed as CRASHED; overlay does not overclaim (notes it was an EDL *demonstrator* for ExoMars Rosalind Franklin).
- Source: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/Schiaparelli_landing_investigation_completed ; https://en.wikipedia.org/wiki/Schiaparelli_EDM
- Confidence: high.

Minor: base credit says "parachute jettisoned 3.7 km too early" — the ~3.7 km is the *altitude at which* the erroneous jettison occurred, not a "3.7 km early" delta. Prose is slightly loose but conveys the right event; low priority.

---

## mars/spirit — ISSUES (LOW)

Verified: MER-A, Gusev Crater, landed 2004-01-04 ✓; bounced 28 times, rolled ~250 m to 14.57°S 175.47°E ✓; drove 7.73 km ✓; stuck at Troy 2009-04 (wheel through sulphate crust) ✓; final transmission 2010-03-22 ✓; mission declared ended 2011-05-25 ✓; twin launched 3 weeks later ✓; hot-spring silica / hematite water evidence ✓. Overlay `first` and dispatch ("built for ninety days and worked for six years") ✓.

**LOW — sol count off by 2**
- Files/fields:
  - `i18n-src/en-US/missions/mars/spirit.json` · `description` — "would survive 2,210 sols"
  - `static/data/missions/mars/spirit.json` · `flight.events[].description` (launch) — "would survive 2,210 sols on the surface"
- Quote: `"would survive 2,210 sols"`
- What's wrong: Wikipedia gives **2,208 sols** (6 years 77 days) of operation. Off by 2.
- Correction: 2,208 sols.
- Source: https://en.wikipedia.org/wiki/Spirit_(rover)
- Confidence: medium (some sources round differently; 2,208 is the Wikipedia/most-cited figure — the exact value depends on whether you count to last-contact or declaration).

Note: overlay `first` "longest-lived rover until passed by Curiosity" is correct — Spirit held the longevity title briefly before Opportunity (its twin) surpassed it; strictly Opportunity exceeded Spirit long before Curiosity. Phrase is defensible if read as "the MER-A design lifetime record" but slightly loose — consider "until surpassed by its twin Opportunity." LOW, not counted.

---

## mars/starship-demo — PASS

Correctly framed as PLANNED/speculative, NOT flown:
- `type: "UNCREWED MARS DEMO · PLANNED"`, `status: PLANNED`.
- Description explicitly states Starship "still working through orbital flight reliability and on-orbit refilling has not been demonstrated," and that 2028+ is "more likely" than the SpaceX 2026-2027 target — honest hedging.
- Credit repeats "will likely slip into 2028-2029."
- Superlative "First fully reusable launch system to attempt Mars landing" is correctly conditional ("attempt"), not stated as achieved.
- Payload ~100 t and Δv framed as architecture *targets*.
- Confidence: high (it's a plan; no factual claim of a flown event to falsify).

---

## mars/starship-mars-crew — PASS

Correctly framed as CONCEPT, NOT flown:
- `type: "CREWED SAMPLE RETURN · CONCEPT"`; description says "The architecture is conceptual — date and parameters subject to substantial revision."
- Sabatier ISRU (CH₄ + LOX from CO₂ + subsurface H₂O) ✓ mechanism; crew ~10, IAC 2016/2017/2024 provenance ✓; timeline explicitly "illustrative."
- Superlative "First proposed crewed return mission to Mars (SpaceX architecture)" — hedged as *proposed*.
- Note: `status: PLANNED` in base while overlay `type` says CONCEPT — mild inconsistency (PLANNED vs CONCEPT), but both credit and description make the conceptual nature unambiguous, so not a factual error. Consider aligning status label to "CONCEPT" for consistency. Not counted.
- Confidence: high.

---

## mars/tianwen1 — PASS

All verified:
- China's first Mars mission ✓; "first to deliver orbiter + lander + rover in a single launch" ✓ (unique achievement).
- Launch 2020-07-23 Long March 5, Wenchang ✓; MOI 2021-02-10 ✓; Zhurong landing Utopia Planitia 2021-05-14, rolled off 2021-05-22 ✓.
- Zhurong: 358 sols ✓ (1,921 m ≈ 1.9 km ✓); hibernation May 2022 ✓; has not woken (dust on panels) ✓; orbiter still active ✓.
- Base flight desc "China the second nation to successfully drive on Mars after the United States" ✓.
- Superlatives correctly dated and true.
- Source: https://en.wikipedia.org/wiki/Zhurong_(rover) ; https://en.wikipedia.org/wiki/Tianwen-1
- Confidence: high.

---

## mars/viking1 — ISSUES (MED)

Verified: launch 1975-08-20 Titan IIIE-Centaur ✓; MOI 1976-06-19 ✓; lander touchdown 1976-07-20 (Chryse Planitia), exactly 7 yr after Apollo 11 (1969-07-20) ✓; biology experiments ambiguous/still-debated ✓; re-targeted from orbit after original site too rough ✓. "First fully successful Mars landing" — defensible (Mars 3 in 1971 touched down but failed after ~20 s; base flight desc correctly says "Mars 3 … operated for only 15 seconds" and does NOT overclaim "first ever photo"). Overlay `first`/note phrasing ("first sustained look," "first high-resolution surface images") is honestly hedged — no Mars 3 overclaim. Good.

**MED — orbiter mapping resolution wrong**
- File: `i18n-src/en-US/missions/mars/viking1.json` · `description`
- Quote: "The orbiter mapped 97% of Mars at 100m resolution"
- What's wrong: The 97% figure is right (both Viking orbiters together), but the resolution was **~300 m (984 ft)**, not 100 m. NASA: "mapped about 97 percent of the surface at a resolution of 984 feet (300 meters)."
- Correction: "mapped 97% of Mars at ~300 m resolution." (Also note this is a *two-orbiter* achievement, not Viking 1 orbiter alone — consider "the Viking orbiters mapped …".)
- Source: https://science.nasa.gov/mission/viking-1/ ; https://solarviews.com/eng/vikingfs.htm
- Confidence: high.

**LOW — lander end date off by 2 days**
- Files/fields:
  - `static/data/missions/mars/viking1.json` · `flight.events[].description` (touchdown) — "Lasted until 1982-11-13."
  - (base `credit` says "6 years 4 months" — consistent with either date)
- Quote: `"Lasted until 1982-11-13"`
- What's wrong: Viking 1 lander's last transmission / shutdown was **1982-11-11** (a faulty command ended operations). Files say 1982-11-13.
- Correction: 1982-11-11.
- Source: https://en.wikipedia.org/wiki/Viking_1 ; https://science.nasa.gov/mission/viking-1/
- Confidence: high (1982-11-11 is the standard cited date).

---

*End of batch B fact-check.*
