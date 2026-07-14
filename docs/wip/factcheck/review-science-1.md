# Science overlay fact-check — batch 1 (mission-phases + planets)

**Date:** 2026-07-14  
**Reviewer:** Claude Sonnet 4.6 (skeptical fact-checker)  
**Articles checked:** 5  
**Method:** Claims verified via WebSearch + WebFetch against primary NASA/IETF/CSIRO sources; no reliance on training-time memory alone.

---

## Files reviewed

| # | File |
|---|------|
| 1 | `i18n-src/en-US/science/mission-phases/optical-comms.json` |
| 2 | `i18n-src/en-US/science/mission-phases/interplanetary-internet.json` |
| 3 | `i18n-src/en-US/science/mission-phases/antenna-arrays.json` |
| 4 | `i18n-src/en-US/science/planets/regolith.json` |
| 5 | `i18n-src/en-US/science/planets/lunar-ice.json` |

---

## Severity legend

- 🔴 Factually wrong — would mislead a science-literate reader
- 🟠 Overstated / incomplete / misattributed — creates a false impression
- 🟡 Imprecise / worth tightening — not wrong enough to retract
- 🔵 Verified correct

---

## 1. optical-comms

### Claims checked

**"DSOC achieved downlink rates on the order of hundreds of megabits per second from tens of millions of kilometres"**

🔵 Correct. On 11 December 2023, DSOC achieved its peak 267 Mbps at ~19 million miles (~30 million km) from Earth — within "tens of millions of kilometres." By April 2024 at 140 million miles the rate had dropped to ~25 Mbps, consistent with inverse-square law falloff; the article describes the peak capability, not a sustained figure at all distances. Accurate.

Sources: [NASA JPL DSOC record](https://www.jpl.nasa.gov/news/nasas-laser-comms-demo-makes-deep-space-record-completes-first-phase/), [NASA DSOC 267 Mbps](https://www.nasa.gov/directorates/stmd/tech-demo-missions-program/deep-space-optical-communications-dsoc/nasas-deep-space-communications-demo-exceeds-project-expectations/)

**"NASA's Laser Communications Relay Demonstration (LCRD), operating from geostationary orbit since 2021"**

🔵 Correct. LCRD launched 7 December 2021 on an Atlas V 551 into geosynchronous orbit and became operational shortly thereafter.

Source: [Wikipedia LCRD](https://en.wikipedia.org/wiki/Laser_Communications_Relay_Demonstration), [NASA LCRD overview](https://www.nasa.gov/directorates/stmd/tech-demo-missions-program/laser-communications-relay-demonstration-lcrd-overview/)

**"10–100 times more data than radio for the same power and aperture"**

🔵 Consistent with NASA's stated capability range for optical vs. radio.

### Verdict: No errors found.

---

## 2. interplanetary-internet

### Claims checked

**"the Bundle Protocol is an IETF standard, RFC 9171, co-developed by Vint Cerf (one of TCP/IP's original architects) and NASA/JPL"**

🟠 MISATTRIBUTION. RFC 9171 (Bundle Protocol Version 7, published January 2022) was authored by S. Burleigh, K. Fall, and E. Birrane III. Vint Cerf is not listed as an author or co-developer of RFC 9171.

Cerf's actual involvement: he co-authored RFC 4838 ("Delay-Tolerant Networking Architecture," 2007), the foundational architecture document. That is a different RFC from the Bundle Protocol specification itself.

The article conflates Cerf's role in the DTN architecture with authorship of the Bundle Protocol standard. A reader will conclude Cerf co-wrote RFC 9171; he did not.

Suggested fix: "…the Bundle Protocol is an IETF standard, RFC 9171, building on the DTN architecture (RFC 4838) co-authored by Vint Cerf (one of TCP/IP's original architects) and developed with NASA/JPL."

Sources: [RFC 9171 IETF](https://datatracker.ietf.org/doc/rfc9171/), [RFC 4838](https://datatracker.ietf.org/doc/rfc4838/), [DTN Wikipedia](https://en.wikipedia.org/wiki/Delay-tolerant_networking)

**"The ISS has run a DTN node since 2016"**

🟡 Imprecise. The first DTN flight operations on the ISS occurred in 2009 (reported in IEEE papers as "flight test results from the international space station"). The 2016 date refers specifically to when NASA deployed the ION DTN gateway on the ISS as a full operational multi-gateway system. "Since 2016" is technically defensible for the production deployment but omits six years of prior ISS DTN experiments, making the technology seem newer than it is. Worth tightening to "since at least 2009, with a full operational node since 2016" — or just "since 2009" if the goal is earliest deployment.

Sources: [ISS National Lab DTN article](https://issnationallab.org/upward/8-2-interplanetary-internet-cerf/), [NTRS DTN ISS 2016](https://ntrs.nasa.gov/citations/20160014037)

**"Mars orbiters act as the relay tier: NASA's Mars Reconnaissance Orbiter, MAVEN, and ESA's Trace Gas Orbiter"**

🔵 Correct as of publication time. (Note: MAVEN went silent December 2025 and NASA declared the mission ended June 2026; the article's historical accuracy is unaffected.)

### Verdict: One 🟠 (Cerf/RFC 9171 misattribution), one 🟡 (ISS DTN year).

---

## 3. antenna-arrays

### Claims checked

**"Voyager 2's Neptune flyby in August 1989 … required combining the Goldstone 70 m dish with the Parkes 64 m dish in Australia and the 64 m Canberra DSN antenna simultaneously"**

🟠 INCOMPLETE. The article presents the Neptune flyby array as three dishes (Goldstone 70m + Parkes 64m + Canberra 64m). Primary sources — including NASA JPL contemporaneous reporting — document that the array also included:
- The VLA (Very Large Array), New Mexico: 27 × 25m dishes (equivalent collecting area of ~2 × 70m dish)
- Japan's Usuda Deep Space Center: 64m dish

The collaboration with Japan's ISAS involved a formal agreement signed in 1988. The VLA played a significant role in the Voyager 2 Neptune encounter; there is even a dedicated NASA Technical Report ("Phasing the Antennas of the Very Large Array for Reception of Telemetry from Voyager 2 at Neptune Encounter," NTRS 19890000836).

Presenting only three dishes as the full array misrepresents the scope of the international effort that made the Neptune data return possible.

Suggested fix: add "…along with the Very Large Array in New Mexico and Japan's Usuda 64 m dish — a four-continent array."

Sources: [NASA JPL 30 Years Neptune Flyby](https://www.jpl.nasa.gov/news/30-years-ago-voyager-2s-historic-neptune-flyby/), [JPL Usuda announcement](https://www.jpl.nasa.gov/news/usuda-deep-space-center-joins-voyager-2-mission/), [NTRS VLA phasing report](https://ntrs.nasa.gov/citations/19890000836)

**Parkes described as 64 m**

🔵 Correct. Parkes (Murriyang) is 64 m diameter.

**"The DSN's 70 m dishes — at Goldstone, Madrid, and Canberra"**

🔵 Correct. Three DSN 70m sites.

**"noise from each antenna adds incoherently (scales with the square root of N) while signal adds coherently (scales with N)"**

🔵 Correct physics.

### Verdict: One 🟠 (Neptune array incomplete — VLA + Usuda omitted).

---

## 4. regolith

### Claims checked

**"The solar wind, a stream of energetic particles from the Sun, strips electrons from the sunlit surface and drives them into the shadowed side, giving the grains a persistent electrostatic charge."**

🔴 WRONG MECHANISM. This description inverts the actual physics of lunar surface charging:

- **Sunlit side**: UV photoelectric emission is the dominant mechanism. Solar UV radiation ejects electrons from surface grains, leaving the sunlit surface with a *positive* charge. The solar wind plasma also interacts, but the net effect on the sunlit surface is positive charging from photoemission.
- **Shadowed/nightside**: Solar wind electrons (negative charge) impinge directly on the surface since it is not in sunlit plasma sheath, charging it negatively.

The article's claim that solar wind "strips electrons from the sunlit surface and drives them into the shadowed side" is doubly wrong: (a) it is UV that drives electron emission on the sunlit side, not particle stripping; (b) solar wind electrons don't flow across the surface from the lit to dark side — they independently impact the nightside directly.

The practical consequence (charged dust sticks to things) is correct, but the stated mechanism is wrong and would mislead students studying space weather / surface charging.

Suggested fix: "On the sunlit side, ultraviolet radiation ejects electrons from surface grains (photoelectric effect), leaving that side positively charged; on the shadowed side, solar wind electrons accumulate, giving a negative charge. The resulting differential — and the sharp terminator boundary — keeps grains in a persistent electrostatic state."

Sources: [NTRS Electrostatic Charging UV + Solar Wind](https://ntrs.nasa.gov/citations/20090014075), [AIP Physics of Plasmas lunar dust](https://pubs.aip.org/aip/pop/article/31/10/102901/3316998/Revisiting-lunar-dust-charging-and-dynamics), [ICES 2022 electrostatic charging](https://ntrs.nasa.gov/api/citations/20220007230/downloads/FinalManuscript-Electrostatic%20charging%20of%20the%20lunar%20surface-ICES%202022.pdf)

**"regolith layer runs from a few metres deep in the highlands to tens of metres in the maria"**

🔵 Consistent with lunar science literature (highlands ~2–8 m, maria up to ~10–15 m; "tens of metres" is at the upper end but not wrong).

**"impact gardening … can be used to date surfaces: denser crater counts mean older, less-churned terrain"**

🔵 Correct (more craters = older surface = more gardening over time, but gardening also churns and destroys craters — the sentence is simplified but directionally right).

**Apollo astronauts suit degradation within hours / first moonwalk**

🔵 Consistent with Apollo crew reports.

**OSIRIS-REx sample 2020, Hayabusa2 sample 2018**

🟡 Slightly imprecise dates. Hayabusa2 conducted its second touchdown sampling on 11 July 2019 (not 2018), though it arrived at Ryugu in June 2018. OSIRIS-REx's sample collection (TAG) occurred October 2020 — correct. The article says "sampled by JAXA's Hayabusa2 in 2018" — 2018 was arrival, not sampling. Low significance for this article's purpose but worth fixing.

### Verdict: One 🔴 (electrostatic charging mechanism wrong), one 🟡 (Hayabusa2 date imprecise).

---

## 5. lunar-ice

### Claims checked

**"measured temperatures run below 100 K (−170°C), and some spots near the lunar south pole approach 40 K"**

🟡 The general claim "below 100 K" is correct — PSRs range from ~20 K to ~120 K (with the most consistently shadowed areas below 100 K). However, "some spots approach 40 K" understates how cold it gets: the coldest measured PSR temperatures are ~20 K (not 40 K). Some sources report the 20–50 K range for the deepest cold traps. "Approach 40 K" could be read as "just above 40 K," whereas the actual minimum is ~20 K — significantly colder. The article's 40 K figure appears to be a mid-range for cold traps rather than the coldest value.

Sources: [UNM lunar volatiles research](https://news.unm.edu/news/water-on-the-moon-unm-researchers-explore-sample-and-interpret-lunar-volatiles-in-polar-cold-traps), [PNAS lunar PSR](https://www.pnas.org/doi/10.1073/pnas.2321071121)

**"India's Chandrayaan-1 carried NASA's Moon Mineralogy Mapper (M3) instrument, which in 2009 detected the spectral signature of hydroxyl and water molecules"**

🔵 Correct. Chandrayaan-1 launched October 2008; M3 water detection results published September 24, 2009 in Science. Year is accurate.

**"NASA's LCROSS mission in 2009 deliberately crashed a spent rocket stage into a PSR near the south pole"**

🔵 Correct. LCROSS impact: 9 October 2009, Cabeus crater.

**"the plume contained water vapour and ice, directly confirming the presence of water in the cold trap"**

🔵 Correct. ~155 kg of water vapor/ice detected in the plume.

**"figures in the range of hundreds of millions to billions of tonnes"**

🔵 Consistent with published estimates (some sources cite 130 million to 4.3 billion metric tons; NASA north pole estimate ~600 million metric tons).

**Moon's axial tilt ~1.5 degrees**

🔵 Correct (1.54°).

**Chandrayaan-3 landing in 2023 targeted south polar region**

🔵 Correct. Chandrayaan-3 landed 23 August 2023 near the south pole.

### Verdict: One 🟡 (coldest PSR temperature understated — 40 K cited but minimum is ~20 K).

---

## Summary table

| Article | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|
| optical-comms | 0 | 0 | 0 | all ✓ |
| interplanetary-internet | 0 | 1 | 1 | 2 ✓ |
| antenna-arrays | 0 | 1 | 0 | 3 ✓ |
| regolith | 1 | 0 | 1 | 3 ✓ |
| lunar-ice | 0 | 0 | 1 | 5 ✓ |
| **Total** | **1** | **2** | **3** | — |

---

## Fixes required (🔴 + 🟠)

### F1 — regolith — 🔴 — electrostatic charging mechanism

**Wrong:** "The solar wind, a stream of energetic particles from the Sun, strips electrons from the sunlit surface and drives them into the shadowed side, giving the grains a persistent electrostatic charge."

**Correct:** UV photoelectric emission positively charges the sunlit side (electrons ejected by UV); solar wind electrons independently charge the shadowed/nightside negatively. Solar wind does not "drive" electrons from sunlit to shadowed surface.

**Suggested replacement sentence:** "On the sunlit side, ultraviolet radiation ejects electrons from surface grains (photoelectric effect), leaving that side positively charged; on the shadowed side, solar wind electrons accumulate, giving a negative charge. The sharp electrostatic contrast keeps dust grains in a persistent charged state."

### F2 — interplanetary-internet — 🟠 — Vint Cerf / RFC 9171 misattribution

**Wrong:** "…the Bundle Protocol is an IETF standard, RFC 9171, co-developed by Vint Cerf (one of TCP/IP's original architects) and NASA/JPL"

**Correct:** RFC 9171 authors are Burleigh, Fall, and Birrane. Cerf co-authored RFC 4838 (DTN architecture), a separate document.

**Suggested replacement:** "…the Bundle Protocol is an IETF standard (RFC 9171), building on a DTN architecture (RFC 4838) co-developed by Vint Cerf — one of TCP/IP's original architects — and NASA/JPL"

### F3 — antenna-arrays — 🟠 — Neptune array incomplete

**Wrong:** Presents the Neptune flyby array as only Goldstone + Parkes + Canberra DSN.

**Correct:** Also included the VLA (27 × 25m dishes, New Mexico) and Japan's Usuda 64m dish under a 1988 NASA-ISAS agreement.

**Suggested addition to that paragraph:** After "…and the 64 m Canberra DSN antenna simultaneously" → add "…as well as Japan's 64 m Usuda dish and the 27-dish Very Large Array in New Mexico — a four-continent listening array."
