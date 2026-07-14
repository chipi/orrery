# Fact-check: Essays Batch 2

Essays: `space-comm-arrays.json`, `reusable-launchers.json`, `new-propulsion.json`
Date: 2026-07-14
Methodology: web-verified each specific figure via NASA/JPL primary sources and Wikipedia.

Severity key: 🔴 ERROR (wrong) / 🟠 OVERREACH (technically true but misleading framing) / 🟡 UNSUPPORTED (plausible but unverifiable) / 🔵 NIT (minor)

---

## space-comm-arrays.json

### DSOC 25 Mbps April 2024

**Claim:** "By April 2024, DSOC had transmitted at 25 megabits per second from 140 million miles."

**Verdict:** ✓ CONFIRMED. NASA JPL confirmed 25 Mbps max rate from 140 million miles on 8 April 2024.

Source: https://www.jpl.nasa.gov/news/nasas-optical-comms-demo-transmits-data-over-140-million-miles/

---

### 🔴 ERROR — DSOC December 2024 one-way light travel time

**Claim:** "From Psyche's location during the December 2024 record, the one-way light travel time was about 44 minutes."

**Why wrong:** The December 3, 2024 record was set at 307 million miles (494 million km). At the speed of light (299,792 km/s), that is:
- 494,000,000 km ÷ 299,792 km/s ≈ 1,648 seconds ≈ **27.5 minutes**

44 minutes of one-way light travel time corresponds to ~790 million km (~491 million miles), roughly the maximum Earth–Mars separation — not 307 million miles.

**Correct fact:** ~27 to 28 minutes one-way at the December 2024 record distance.

Source: https://www.jpl.nasa.gov/news/nasas-deep-space-communications-demo-exceeds-project-expectations/ (distance figure confirmed); light-travel-time math is straightforward physics.

---

### DSOC December 2024 distance record

**Claim:** "By December 2024, it had set a distance record: downlinking at useful rates from 307 million miles, 494 million kilometres out."

**Verdict:** ✓ CONFIRMED. NASA JPL: distance record on December 3, 2024.

Source: https://www.jpl.nasa.gov/news/nasas-deep-space-communications-demo-exceeds-project-expectations/

---

### DSOC 10–100× throughput vs radio

**Claim:** "DSOC achieved ten to a hundred times the throughput for the same electrical power."

**Verdict:** ✓ SUPPORTED. NASA states "data rates at least 10 times higher than state-of-the-art radio telecommunications systems of comparable size and power."

The upper bound "hundred times" is at the high end and not directly stated in primary sources, but 10× is confirmed and the broader range is within NASA's stated goals for the technology.

Source: https://www.jpl.nasa.gov/news/nasas-deep-space-communications-demo-exceeds-project-expectations/

---

### DTN on ISS since 2008

**Claim:** "DTN has been running as an operational experiment aboard the International Space Station since 2008."

**Verdict:** ✓ SUPPORTED. DTN Bundle Protocol was first operated on the ISS in November 2008 as a demonstration.

---

### Vint Cerf / DTN late 1990s

**Claim:** "developed in the late 1990s by a working group that included Vint Cerf."

**Verdict:** ✓ SUPPORTED. DTN/IPN group chaired by Cerf began standardization work in the late 1990s at JPL.

---

### DSN demand 10× by 2035

**Claim:** "NASA's own projections…show demand growing by a factor of ten before 2035."

**Verdict:** 🟡 UNSUPPORTED (from public sources). The 10× figure by 2035 is plausible and consistent with DSN strategic planning documents, but the specific figure and timeline were not directly verifiable from publicly available DSN strategic reviews during this fact-check.

---

### DSN schedule "overbooked by forty percent"

**Claim:** "a schedule overbooked by forty percent."

**Verdict:** 🟡 UNSUPPORTED. This is a specific operational figure that does not appear in publicly accessible primary sources. It is plausible for this period but not verified.

---

## reusable-launchers.json

### December 21 2015 Falcon 9 landing date

**Claim:** "On the night of 21 December 2015, a Falcon 9 first stage stood vertically on a concrete pad at Cape Canaveral."

**Verdict:** ✓ CONFIRMED. Orbcomm OG2 mission, booster B1019, Cape Canaveral Landing Zone 1.

Source: https://en.wikipedia.org/wiki/Falcon_9_first-stage_landing_tests

---

### Falcon 9 landing — "three of its nine Merlin engines"

**Claim:** "relit three of its nine Merlin engines, braked through the upper atmosphere, deployed four landing legs, and set itself down upright."

**Verdict:** ✓ BROADLY CONFIRMED with nuance. The boostback and reentry burns use three engines; the final landing burn uses only one Merlin engine. The essay says "three" which matches the boostback/reentry burns but not the final landing burn (which is single-engine). As a summary of the overall sequence the claim is not wrong, but omits that the final landing burn is single-engine. This is a minor simplification, not an error.

Source: https://www.thespacetechie.com/re-entry-burns-of-falcon-9/

---

### Saturn V cost "roughly $185 million in late-1960s dollars — roughly $1.5 billion at today's prices"

**Claim:** "$185 million in late-1960s dollars — roughly $1.5 billion at today's prices."

**Verdict:** 🟡 UNSUPPORTED / POTENTIALLY UNDERSTATED. The $185 million figure is a documented per-unit production cost for 1969–1971. CPI-adjusted to 2024 dollars gives roughly $1.5–$1.6 billion, so the approximate inflation conversion is defensible. However, some analyses place the all-in per-launch cost higher when development is amortised. The figure is not wrong for production cost but is at the low end of estimates depending on accounting methodology.

Source: https://apollo11space.com/the-cost-of-launching-a-saturn-v/

---

### 🔴 ERROR — Saturn V F-1 propellant consumption rate

**Claim:** "each one a staggering piece of machinery that burned 788 kilograms of propellant per second."

**Why wrong:** 788 kg/s is the RP-1 (kerosene fuel only) flow rate for a single F-1 engine. The F-1 also burns 1,789 kg/s of liquid oxygen (LOX). Total propellant consumption per engine is **~2,578 kg/s** (RP-1 + LOX combined). The essay understates this by a factor of ~3.3×.

**Correct fact:** Each F-1 burned approximately 2,578 kg/s of total propellant (788 kg/s RP-1 + 1,789 kg/s LOX). Across all five engines, the Saturn V first stage burned ~12,890 kg/s total.

Source: https://en.wikipedia.org/wiki/Rocketdyne_F-1 ; https://spacelaunchlive.com/articles/f-1-engine/

---

### NASA recovered F-1 engines from seafloor in 2013

**Claim:** "NASA recovered two sets of Saturn V F-1 engines from the seafloor in 2013."

**Verdict:** 🟠 OVERREACH / ATTRIBUTIONAL ERROR. The 2013 recovery was led by Bezos Expeditions (funded by Jeff Bezos), not by NASA. NASA did grant permission and the engines went to museums (the National Air and Space Museum and the Kansas Cosmosphere), but the recovery was a private expedition, not a NASA operation.

Source: https://en.wikipedia.org/wiki/Saturn_V (recovery section); original AP reporting from 2013.

---

### Space Shuttle 135 missions

**Claim:** "The shuttle flew 135 missions between 1981 and 2011."

**Verdict:** ✓ CONFIRMED.

Source: https://en.wikipedia.org/wiki/Space_Shuttle_program

---

### Space Shuttle cost per flight "$1.5 billion"

**Claim:** "The real cost per flight averaged around $1.5 billion when total program expenses were spread across all missions."

**Verdict:** ✓ CONFIRMED. $192 billion total / 135 flights ≈ $1.42 billion per flight in 2010 dollars; rounded to $1.5 billion is accurate.

Source: https://www.space.com/11358-nasa-space-shuttle-program-cost-30-years.html

---

### Space Shuttle "promised $600 per kilogram"

**Claim:** "the argument for it was economic: by flying the orbiter repeatedly, the program would drive the cost of reaching orbit down toward $600 per kilogram."

**Verdict:** ✓ SUPPORTED. The Shuttle's pre-development cost projections of ~$118–$600/kg are well-documented in historical literature. The $600/kg figure is consistent with the lower end of those projections.

---

### Falcon 9 payload "22,800 kilograms to low Earth orbit"

**Claim:** "a Falcon 9 flying with a new booster delivers about 22,800 kilograms to low Earth orbit."

**Verdict:** ✓ CONFIRMED. SpaceX states 22,800 kg to LEO in expendable configuration.

Source: https://www.spacex.com/vehicles/falcon-9

---

### Falcon 9 first reflight March 2017

**Claim:** "in March 2017, SpaceX launched a Falcon 9 on a booster that had already flown, the first time in history that an orbital-class rocket stage flew to space twice."

**Verdict:** ✓ CONFIRMED. SES-10 mission, March 30, 2017, using booster B1021 (previously flown April 2016).

Source: https://spaceflightnow.com/2017/03/31/spacex-flies-rocket-for-second-time-in-historic-test-of-cost-cutting-technology/

---

### Falcon 9 36 missions on one booster (by mid-2026)

**Claim:** "By mid-2026, the most-flown Falcon 9 first stage has completed 36 missions on the same hardware."

**Verdict:** 🟡 UNSUPPORTED (not directly verified). Plausible given cadence trends; could not confirm exact flight count for the lead booster as of mid-2026 from available search results at time of fact-check.

---

### Starship Super Heavy tower catch October 13, 2024

**Claim:** "SpaceX first caught the booster this way on 13 October 2024, Flight 5 of the Starship test programme."

**Verdict:** ✓ CONFIRMED. Starship Flight Test 5, October 13, 2024, Super Heavy Booster 12 caught by Mechazilla arms.

Source: https://en.wikipedia.org/wiki/Starship_flight_test_5

---

### Starship Super Heavy "33 Raptor engines" and "71 metres tall"

**Claim:** "33 Raptor engines burning liquid methane and liquid oxygen, producing roughly twice the thrust of a Saturn V."

**Verdict:** ✓ CONFIRMED. Super Heavy has 33 Raptor engines; stated thrust ~74–75 MN vs Saturn V's ~34 MN ≈ 2× confirmed.

---

### New Glenn first landing "13 November 2025"

**Claim:** "Blue Origin's New Glenn landed its first stage at sea for the first time on 13 November 2025."

**Verdict:** ✓ CONFIRMED. NG-2 mission, booster "Never Tell Me the Odds," landed on drone ship Jacklyn in the Atlantic.

Source: https://techcrunch.com/2025/11/13/blue-origin-sticks-first-new-glenn-rocket-landing-and-launches-nasa-spacecraft/

---

### New Glenn "45,000 kilograms to low Earth orbit in expendable configuration"

**Claim:** "carrying up to 45,000 kilograms to low Earth orbit in expendable configuration."

**Verdict:** ✓ CONFIRMED.

Source: https://en.wikipedia.org/wiki/New_Glenn

---

### New Glenn first reuse "April 2026"

**Claim:** "The first reuse of a New Glenn stage followed in April 2026."

**Verdict:** ✓ CONFIRMED. NG-3 mission, April 19, 2026.

Source: https://techcrunch.com/2026/04/19/blue-origin-successfully-re-uses-a-new-glenn-rocket-for-the-first-time-ever/

---

### SpaceX "134 Falcon 9 missions in 2024"

**Claim:** "SpaceX launched 134 Falcon 9 missions in 2024 — almost three per week."

**Verdict:** 🟠 OVERREACH / ATTRIBUTIONAL CONFLATION. SpaceX launched 134 Falcon-family missions in 2024, but this includes 2 Falcon Heavy flights and 132 Falcon 9 flights. Saying "134 Falcon 9 missions" conflates the Falcon Heavy (which uses Falcon 9 cores but is a distinct vehicle). The total Falcon family count of 134 is confirmed; attributing all to Falcon 9 specifically is imprecise.

Source: https://en.wikipedia.org/wiki/List_of_Falcon_9_and_Falcon_Heavy_launches

---

### "New Glenn ten years after Falcon 9" — relative timing

**Claim:** "ten years after the December 2015 Falcon 9 landing, which gives a sense of how fast the industry moves when SpaceX is setting the pace."

**Verdict:** ✓ CONFIRMED. Dec 2015 → Nov 2025 is approximately 10 years.

---

## new-propulsion.json

### Chemical Isp ceiling "about 450 seconds"

**Claim:** "The best you can do with hydrogen and oxygen…is about 450 seconds."

**Verdict:** ✓ CONFIRMED. RS-25 achieves 452 s in vacuum; theoretical H2/O2 ceiling ~450–455 s.

---

### RS-25 "452 seconds in vacuum"

**Claim:** "The RS-25 engine…achieves 452 seconds in vacuum."

**Verdict:** ✓ CONFIRMED.

---

### RL-10B-2 at 465 seconds

**Claim:** "The RL-10B-2, at 465 seconds, is the highest of any production chemical engine ever built."

**Verdict:** ✓ CONFIRMED.

---

### Deep Space 1 launch year "1998"

**Claim:** "demonstrated not in a laboratory but in space, in 1998, aboard a spacecraft called Deep Space 1."

**Verdict:** ✓ CONFIRMED. Launched October 24, 1998.

Source: https://www.nasa.gov/history/25-years-ago-launch-of-deep-space-1-technology-demonstration-spacecraft/

---

### Deep Space 1 ion thruster thrust "92 millinewtons"

**Claim:** "The ion thruster it carried produced 92 millinewtons of thrust."

**Verdict:** ✓ CONFIRMED. NSTAR at 2.1 kW maximum produces 92 mN.

Source: https://en.wikipedia.org/wiki/Deep_Space_1

---

### Ion thruster "about 3.25 milligrams of propellant per second — ten ounces over a full day"

**Claim:** "it burned through about 3.25 milligrams of propellant per second — ten ounces over a full day of operation."

**Verdict:** 🔵 NIT — unit math: 3.25 mg/s × 86,400 s/day = 280.8 grams ≈ 9.9 oz. "Ten ounces" is approximately correct (within 1%).

---

### Ion engine "3,000 seconds or more"

**Claim:** "a well-designed ion thruster achieves 3,000 seconds or more."

**Verdict:** ✓ CONFIRMED. NSTAR achieves 3,100 s at max power.

Source: https://en.wikipedia.org/wiki/Deep_Space_1

---

### Dawn NSTAR Isp "3,100 seconds"

**Claim:** "Dawn's specific impulse was 3,100 seconds."

**Verdict:** ✓ CONFIRMED.

Source: https://en.wikipedia.org/wiki/Dawn_(spacecraft)

---

### Dawn xenon total "425 kilograms"

**Claim:** "the same journey on 425 kilograms of xenon."

**Verdict:** ✓ CONFIRMED. Dawn carried 425 kg of xenon.

Source: https://en.wikipedia.org/wiki/Dawn_(spacecraft)

---

### Dawn launched "2007"

**Claim:** "Dawn launched in 2007."

**Verdict:** ✓ CONFIRMED. September 27, 2007.

---

### Psyche Hall thruster Isp "1,800 seconds"

**Claim:** "Psyche's thrusters operate at 1,800 seconds specific impulse."

**Verdict:** 🟠 OVERREACH / IMPRECISE. The Psyche spacecraft uses SPT-140 Hall thrusters. Published specifications for the SPT-140 at nominal conditions (300 V, 15 A) show Isp of approximately **1,680–1,780 seconds**, not 1,800 seconds. The 1,800 s figure appears to be a rounded approximation toward the high end of the performance envelope and may refer to a higher-voltage operating point. The essay's figure is slightly overstated vs. the published nominal Isp.

Source: https://ntrs.nasa.gov/api/citations/19980016322/downloads/19980016322.pdf ; https://en.wikipedia.org/wiki/SPT-140

---

### NERVA Isp "around 825 seconds"

**Claim:** "specific impulses around 825 seconds."

**Verdict:** ✓ CONFIRMED. Kiwi/NERVA tests achieved 820–841 seconds depending on configuration; 825 s is accurate as a central figure.

Source: https://en.wikipedia.org/wiki/NERVA

---

### Phoebus 2A "4,100 megawatts of thermal power" tested 1968

**Claim:** "The Phoebus 2A reactor, tested in 1968, was the most powerful nuclear rocket engine ever fired: 4,100 megawatts of thermal power."

**Verdict:** ✓ CONFIRMED. Phoebus 2A reached a peak of 4,082 MW thermal, tested June–July 1968. The essay's 4,100 MW is a rounding of the measured 4,082 MW peak.

Source: https://en.wikipedia.org/wiki/Project_Rover

---

### NERVA total run time "more than two hours"

**Claim:** "The program accumulated more than two hours of total run time, including 28 minutes at full power."

**Verdict:** ✓ CONFIRMED. Multiple sources confirm >2 hours total run time and 28 min at full power.

---

### NERVA cancelled "1973"

**Claim:** "In 1973, with the Moon program over and budgets collapsing and no Mars mission forthcoming, NERVA was cancelled."

**Verdict:** ✓ CONFIRMED. Cancelled by Nixon administration in January 1973.

---

### IKAROS "21 May 2010" and "200-square-metre polyimide sail"

**Claim:** "On 21 May 2010, the Japanese spacecraft IKAROS…deployed a 200-square-metre polyimide sail."

**Verdict:** ✓ CONFIRMED. Launch date May 21, 2010; 200 sq m sail area confirmed.

Source: https://www.isas.jaxa.jp/en/missions/spacecraft/past/ikaros.html

---

### LightSail 2 "2019" and "32-square-metre sail"

**Claim:** "the Planetary Society's LightSail 2, launched in 2019, went further: a small, shoebox-stacked CubeSat that deployed a 32-square-metre sail."

**Verdict:** ✓ CONFIRMED. Launched June 25, 2019; 32 sq m sail confirmed.

Source: https://www.planetary.org/sci-tech/lightsail

---

### ACS3 sail "80-square-metre" launched "April 2024"

**Claim:** "NASA's Advanced Composite Solar Sail System — ACS3 — launched in April 2024, carrying an 80-square-metre sail."

**Verdict:** ✓ CONFIRMED. ACS3 launched April 23, 2024; 80 sq m composite boom sail.

---

### NEA Scout lost after Artemis I November 2022

**Claim:** "NEA Scout, which would have been the first solar sail to visit a near-Earth asteroid, launched aboard Artemis I in November 2022 and was lost."

**Verdict:** ✓ CONFIRMED. NEA Scout launched November 16, 2022 (Artemis I); contact was never established.

---

### DRACO cancelled June 2025

**Claim:** "In June 2025, DARPA cancelled it."

**Verdict:** ✓ CONFIRMED. DARPA cancelled DRACO in June 2025.

---

### Johannes Kepler comet tails "1619"

**Claim:** "Johannes Kepler noted in 1619 that comet tails always point away from the Sun."

**Verdict:** ✓ CONFIRMED. Kepler made this observation in *Astronomia nova* and related works c. 1619.

---

## Summary of actionable findings

| # | Essay | Severity | Issue |
|---|-------|----------|-------|
| 1 | space-comm-arrays | 🔴 ERROR | DSOC Dec 2024 light travel time stated as "44 minutes"; correct is ~27–28 minutes at 307 million miles |
| 2 | reusable-launchers | 🔴 ERROR | F-1 engine burns "788 kg of propellant per second" — that is fuel-only (RP-1); total propellant is ~2,578 kg/s |
| 3 | reusable-launchers | 🟠 OVERREACH | "NASA recovered two sets of Saturn V F-1 engines from the seafloor in 2013" — the recovery was a Bezos Expeditions private operation, not NASA |
| 4 | reusable-launchers | 🟠 OVERREACH | "134 Falcon 9 missions in 2024" — the 134 includes 2 Falcon Heavy flights; Falcon 9-specific count is 132 |
| 5 | new-propulsion | 🟠 OVERREACH | Psyche Hall thruster Isp stated as "1,800 seconds"; published SPT-140 nominal Isp is ~1,680–1,780 s |
