# Moon Sites B — Fact-Check

Reviewer: independent web-verification pass, 2026-07-14.
Sources: Wikipedia (EN/RU/ZH), NASA NSSDCA, ESA, JAXA, Nature, Science, Planetary Society, SpaceNews.

---

## Summary table

| slug | verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| change5 | WARN | 0 | 0 | 1 | 1 |
| change6 | WARN | 0 | 1 | 0 | 1 |
| clementine | PASS | 0 | 0 | 0 | 1 |
| lro | WARN | 0 | 0 | 1 | 0 |
| luna10 | WARN | 0 | 0 | 1 | 0 |
| luna16 | WARN | 0 | 0 | 2 | 0 |
| luna17 | WARN | 0 | 0 | 1 | 1 |
| luna21 | WARN | 0 | 0 | 1 | 1 |
| luna24 | WARN | 0 | 0 | 1 | 0 |
| luna9 | PASS | 0 | 0 | 0 | 0 |
| lunar-prospector | PASS | 0 | 0 | 0 | 1 |
| slim | WARN | 0 | 0 | 1 | 0 |
| smart-1 | PASS | 0 | 0 | 0 | 1 |

Totals: 0 🔴 · 1 🟠 · 9 🟡 · 7 🔵

---

## Per-entry findings

---

### change5

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/change5.json`
**Base data:** `static/data/moon-sites.json` id=`change5`

All coordinates, sample mass (1.731 kg), and landing date (2020-12-01) verified correct.
Site name "Mons Rümker (Oceanus Procellarum)" verified. Mission type "Uncrewed Sample Return" correct.
Formal site name is Statio Tianchuan, but the overlay's geographic description is accurate.
"First lunar sample return in 44 years" is correct (1976→2020 = 44 years). Verified.
"Returned 1.731 kg" matches base data and scientific literature exactly.

Finding 1:
- **Severity**: 🟡 minor
- **File+field**: `i18n-src/en-US/moon-sites/change5.json` → `fact`
- **Quote**: "geologically young region (2 billion years old vs 3–4 billion for Apollo samples)"
- **Issue**: The 2 Ga figure (2,030 ± 4 Ma per Nature 2021) is correct. However, stating the Apollo samples are "3–4 billion" is somewhat loose — the youngest Apollo samples date to ~3.1 Ga and the oldest to ~4.5 Ga, so "3–4 billion" is a reasonable shorthand but slightly compresses the spread. Not wrong, but a purist would say "~3.1 to 4.5 billion."
- **Correction**: Optional: "…vs ~3.1–4.5 billion for Apollo samples" for precision.
- **Source**: https://www.nature.com/articles/s41586-021-04100-2
- **Confidence**: high

Finding 2:
- **Severity**: 🔵 note
- **File+field**: `i18n-src/en-US/moon-sites/change5.json` → `fact`
- **Quote**: "Rewrote our model of lunar volcanism: the Moon was geologically active much more recently than thought."
- **Issue**: Accurate and well-supported, but the capability field's claim that Chang'e 5 is a "direct precursor to Mars Sample Return's lander/ascent vehicle/orbiter chain" is an editorial inference — the architectures are analogous but MSR is a separate program. Not a factual error; noted for editorial awareness.
- **Correction**: None required.
- **Source**: https://www.planetary.org/space-missions/change-5
- **Confidence**: high

---

### change6

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/change6.json`
**Base data:** `static/data/moon-sites.json` id=`change6`

Base data landing date: 2024-06-02. Actual UTC landing time: 22:23 UTC on 1 June 2024, which is 06:23 on 2 June Beijing time. The date in the base record (June 2) reflects Beijing local time; UTC date would be June 1. Both are defensible depending on timezone convention. The overlay itself does not state a date so this is a base-data note only.

Sample mass 1.935 kg verified (1935.3 g per CNSA/Nature Astronomy). Coordinates (−41.6, −153.9) verified as correct (41°38′S 153°59′W per Nature Astronomy landing site paper).

Finding 1:
- **Severity**: 🟠 significant error
- **File+field**: `i18n-src/en-US/moon-sites/change6.json` → `capability`
- **Quote**: "combines the architectures of Chang'e 4 (far-side comms) and Chang'e 5 (sample return)"
- **Issue**: The claim that Chang'e 6 used "Chang'e 4 (far-side comms)" is misleading and partly incorrect. Chang'e 4 was the lander/rover mission; the far-side communications relay for Chang'e 4 was the Queqiao-1 satellite. Chang'e 6 used the new Queqiao-2 relay satellite (launched March 2024), not the same relay infrastructure as Chang'e 4. The overlay conflates the lander mission (Chang'e 4) with its relay satellite (Queqiao-1/Queqiao-2).
- **Correction**: "combines the far-side relay architecture pioneered by Queqiao-1 for Chang'e 4 (now upgraded via Queqiao-2) and the sample-return architecture of Chang'e 5"
- **Source**: https://en.wikipedia.org/wiki/Queqiao-2 ; https://www.planetary.org/space-missions/queqiao-2-chinas-bridge-for-lunar-exploration
- **Confidence**: high

Finding 2:
- **Severity**: 🔵 note
- **File+field**: `static/data/moon-sites.json` id=`change6` → `landing_date`
- **Quote**: `"landing_date": "2024-06-02"`
- **Issue**: Actual UTC landing was 2024-06-01 at 22:23 UTC. June 2 is Beijing time. If the convention for all other entries is UTC, this entry should be 2024-06-01. If the convention is local mission-control time, it is consistent. Worth confirming the site-wide convention.
- **Correction**: If UTC convention: change to `"2024-06-01"`.
- **Source**: https://en.wikipedia.org/wiki/Chang%27e_6 ; https://spacenews.com/change-6-set-for-weekend-landing-attempt-as-sun-rises-over-apollo-crater/
- **Confidence**: medium (depends on site-wide timezone convention)

---

### clementine

**Verdict: PASS**

**Overlay file:** `i18n-src/en-US/moon-sites/clementine.json`
**Base data:** `static/data/moon-sites.json` id=`clementine`

Kind=orbiter in base data, mission_type "Orbiter · Ended 1994" in overlay — correctly coded as non-lander. No false landing claim.
"Joint NASA/DoD Strategic Defense Initiative mission" — verified correct.
"Ten weeks mapping" — mission mapped February 19–May 3, 1994 = ~11 weeks. Minor rounding, not an error.
"11 spectral bands" — verified: 5 UV-VIS + 6 NIR = 11 total.
Bistatic radar measurements at south pole — verified correct. "First hints of polar water ice" — verified; formally announced March 1998.
"Later confirmed by Lunar Prospector and Chandrayaan-1" — verified (LP neutron spectrometer + M³ on Chandrayaan-1). Correct.

Finding 1:
- **Severity**: 🔵 note
- **File+field**: `i18n-src/en-US/moon-sites/clementine.json` → `fact`
- **Quote**: "Spent ten weeks mapping the Moon at 11 spectral bands"
- **Issue**: Mapping phase was Feb 19 – May 3, 1994, which is closer to 11 weeks than 10. Not a material error; "ten weeks" is a reasonable approximation.
- **Correction**: Optional: "eleven weeks" for precision, or "nearly three months."
- **Source**: https://www.nasa.gov/history/30-years-ago-clementine-changes-our-view-of-the-moon/
- **Confidence**: medium

---

### lro

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/lro.json`
**Base data:** `static/data/moon-sites.json` id=`lro`

Kind=orbiter in base data. Correctly coded as non-lander. "Active Orbiter · 2009 – present" correct.
"Lunar polar orbit, ~50 km" — verified for the original circular orbit (Sep 2009–Dec 2011). LRO moved to an elliptical orbit in December 2011. Current orbit is elliptical, not a circular 50 km orbit. The overlay's "~50 km" is the historical science phase altitude; it's now incorrect for "present."

Finding 1:
- **Severity**: 🟡 minor
- **File+field**: `i18n-src/en-US/moon-sites/lro.json` → `site_name` / `mission_type`
- **Quote**: `"site_name": "Lunar polar orbit, ~50 km"` and base data `"altitude_km": 50`
- **Issue**: LRO operated in a 50 km circular polar orbit 2009–2011, then moved to an elliptical orbit (varying ~30–200 km). The 50 km figure and base data altitude are correct only for the initial science phase, not the current "active" orbital configuration.
- **Correction**: `site_name`: "Lunar polar orbit (~50 km science phase; elliptical since 2011)"; base data `altitude_km` should reflect current elliptical range or be noted as science-phase value.
- **Source**: https://en.wikipedia.org/wiki/Lunar_Reconnaissance_Orbiter ; https://lroc.im-ldi.com/about/specs
- **Confidence**: high

---

### luna10

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/luna10.json`
**Base data:** `static/data/moon-sites.json` id=`luna10`

Kind=orbiter in base data. Correctly coded as non-lander. 
"First artificial satellite of any body other than Earth" — verified as correct per NASA NSSDCA and Wikipedia. (Sun heliocentric orbits are excluded by convention as they orbit the Sun, not another body.) Statement is accurate.
"April 1966" — verified: entered lunar orbit April 3, 1966. Correct.
"Three months before NASA's Lunar Orbiter 1" — Lunar Orbiter 1 launched August 10, 1966 and reached lunar orbit August 14, 1966. That is about 4.5 months after Luna 10's April 3 orbit insertion, not 3 months.
"Broadcast 'The Internationale' from lunar orbit during a Communist Party Congress" — verified correct.
"Ran for 56 days before its batteries died" — verified: operated 56 days, 460 orbits, last contact May 30, 1966. Correct.
Altitude ~350 km in base data — verified (initial orbit 349 km × 1015 km). The 350 km figure is the periapsis / lower bound; reasonable approximation.

Finding 1:
- **Severity**: 🟡 minor
- **File+field**: `i18n-src/en-US/moon-sites/luna10.json` → `fact`
- **Quote**: "Reached lunar orbit in April 1966 — three months before NASA's Lunar Orbiter 1"
- **Issue**: Lunar Orbiter 1 entered lunar orbit on August 14, 1966 — approximately 4.5 months after Luna 10 (April 3, 1966), not 3 months.
- **Correction**: "four and a half months before NASA's Lunar Orbiter 1"
- **Source**: https://en.wikipedia.org/wiki/Lunar_Orbiter_1 ; https://en.wikipedia.org/wiki/Luna_10
- **Confidence**: high

---

### luna16

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/luna16.json`
**Base data:** `static/data/moon-sites.json` id=`luna16`

Landing site Mare Fecunditatis verified. Landing date 1970-09-20 verified.
Sample mass 101 g verified. "First fully robotic sample return from another world" — verified correct.
"Without orbital rendezvous" — verified: Luna 16 ascent stage launched directly to Earth (direct return trajectory, no lunar orbit rendezvous). Correct.
"Landed in Kazakhstan a day later" — search confirms capsule returned to Earth September 24, 1970 (not "a day later" — it took 3 days from lunar launch on Sep 21 to Sep 24 landing). However the overlay says "Landed in Kazakhstan a day later" referring to the return capsule landing, and the ascent stage left the Moon on Sep 21 with return on Sep 24, which is 3 days. "A day later" is wrong.
"Three Luna sample returns followed (17 / 20 / 24)" — Note: Luna 17 was a rover mission, not a sample return. Luna 20 (not mentioned in the overlay slug list) and Luna 24 were sample returns. Luna 17/Lunokhod 1 returned no samples. The parenthetical "(17 / 20 / 24)" is incorrect — Luna 17 was a rover, not a sample return.

Finding 1:
- **Severity**: 🟡 minor
- **File+field**: `i18n-src/en-US/moon-sites/luna16.json` → `fact`
- **Quote**: "transferred 101 g of dust + small rock fragments into a sealed return capsule, then launched directly back to Earth without orbital rendezvous. Landed in Kazakhstan a day later."
- **Issue**: "A day later" is incorrect. The ascent stage lifted off from the Moon on September 21, 1970, and the return capsule landed in Kazakhstan on September 24, 1970 — three days later, not one.
- **Correction**: "Landed in Kazakhstan three days later."
- **Source**: https://en.wikipedia.org/wiki/Luna_16 ; https://www.drewexmachina.com/2020/09/12/luna-16-the-first-robotic-sample-return/
- **Confidence**: high

---

### luna17

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/luna17.json`
**Base data:** `static/data/moon-sites.json` id=`luna17`

Landing site Mare Imbrium verified. Landing date 1970-11-17 verified.
"First remote-controlled rover to operate on another world" — verified correct.
"Drove 10.5 km over 322 days" — Wikipedia and multiple sources confirm 10.54 km over 322 days. The overlay rounds to 10.5 km; the actual figure is 10.54 km. Minor rounding.
"Photographing over 20,000 images" — verified: >20,000 TV images confirmed.
"Lost to history until 2010, when the Lunar Reconnaissance Orbiter spotted it from orbit" — verified correct (LRO LROC image April 2010 confirmed its location).
"Still sitting exactly where it stopped" — correct; Lunokhod 1 remains at its final position.
Base data surface_duration_days=322 — correct.
Base data left field states "Lunokhod 1 rover (322 kg)" — this is the rover mass at launch. Actual rover mass is documented at 756 kg (the rover itself; 322 kg is sometimes cited as a different variant figure or is the lander ascent hardware). Need to verify.

Finding 1:
- **Severity**: 🟡 minor
- **File+field**: `i18n-src/en-US/moon-sites/luna17.json` → `left`
- **Quote**: "Lunokhod 1 rover (322 kg)"
- **Issue**: The figure "322 kg" appears to conflate the 322-day operational duration with the rover's mass. Lunokhod 1's mass is documented as 756 kg (fully fueled rover), or ~840 kg including landing platform. The number 322 in this field is the number of operational days, not the rover mass in kg.
- **Correction**: "Lunokhod 1 rover (756 kg), descent stage" — or remove the parenthetical mass entirely if sourcing is uncertain.
- **Source**: https://en.wikipedia.org/wiki/Lunokhod_1 ; https://www.space.com/35090-lunokhod-1.html
- **Confidence**: high

Finding 2:
- **Severity**: 🔵 note
- **File+field**: `i18n-src/en-US/moon-sites/luna17.json` → `fact`
- **Quote**: "Drove 10.5 km over 322 days"
- **Issue**: Actual distance is 10.54 km. "10.5 km" is a round-down; not incorrect for a public atlas, but could be stated as "10.54 km" for precision.
- **Correction**: Optional: "10.54 km" or "more than 10.5 km."
- **Source**: https://en.wikipedia.org/wiki/Lunokhod_1
- **Confidence**: high

---

### luna21

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/luna21.json`
**Base data:** `static/data/moon-sites.json` id=`luna21`

Landing site Le Monnier Crater (Mare Serenitatis) verified. Landing date 1973-01-15 verified.
"5-person ground crew rotating in shifts at the IKI control centre" — this detail is plausible but not independently confirmed by the web sources consulted. Wikipedia and primary sources describe the team as a group of operators; "5-person" is a specific claim not found in top-level sources. Lower confidence.
"In 4 months it covered ~37 km" — the original figure was 37 km; revised to 39 km (agreed) or 42.1 km (Russian LRO-based estimate). The overlay's "~37 km" uses the older pre-LRO figure. The consensus figure as of the LRO analysis is 39 km.
"The lunar-surface distance record that stood for 41 years until NASA's Opportunity Mars rover passed it in 2014" — verified: Opportunity surpassed Lunokhod 2's record on July 27, 2014. Lunokhod 2 operated January–May 1973. 2014−1973 = 41 years. Correct.
"Carried French laser retroreflectors still used for Earth-Moon ranging today" — verified correct.
Base data surface_duration_days=125 — Lunokhod 2 operated January 15–May 11, 1973 = ~116 days. 125 days is slightly high; the commonly cited figure is ~4 months / ~116 days.

Finding 1:
- **Severity**: 🟡 minor
- **File+field**: `i18n-src/en-US/moon-sites/luna21.json` → `fact`
- **Quote**: "In 4 months it covered ~37 km"
- **Issue**: Post-LRO reanalysis revised the distance to an agreed consensus of 39 km (original wheel-odometry figure was 37 km; Russian LRO estimate was 42.1 km; agreed international figure is 39 km). The overlay uses the pre-revision figure.
- **Correction**: "In 4 months it covered ~39 km" (agreed consensus) or "In 4 months it covered 37–42 km depending on measurement method (consensus: ~39 km)."
- **Source**: https://en.wikipedia.org/wiki/Lunokhod_2 ; https://www.space.com/21923-soviet-moon-rover-driving-record.html
- **Confidence**: high

Finding 2:
- **Severity**: 🔵 note
- **File+field**: `static/data/moon-sites.json` id=`luna21` → `surface_duration_days` and `credit`
- **Quote**: `"surface_duration_days": 125` and credit text "traversed ~39 km"
- **Issue**: The `surface_duration_days` value of 125 is slightly high. Luna 21 landed Jan 15, 1973; Lunokhod 2 last communicated May 11, 1973 = 116 days. 125 days would run to May 20. Conversely, the credit already uses the corrected 39 km figure — consistent with the correction needed in the overlay's `fact` field.
- **Correction**: `surface_duration_days`: 116 days (Jan 15 to May 11, 1973).
- **Source**: https://en.wikipedia.org/wiki/Lunokhod_2
- **Confidence**: medium (exact end date varies slightly by source)

---

### luna24

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/luna24.json`
**Base data:** `static/data/moon-sites.json` id=`luna24`

Landing site Mare Crisium verified. Landing date 1976-08-18 verified. Sample mass 170 g verified (170.1 g exact).
"Last Soviet lunar mission" — verified correct.
"Last uncrewed Moon landing until China's Chang'e 3 in 2013: a gap of 37 years" — verified: Chang'e 3 landed December 14, 2013; Luna 24 landed August 18, 1976. Gap = ~37.3 years. Correct.
"Returned 170 g of samples including minerals containing water" — verified. The 1978 Soviet paper by Surkov et al. reported water-bearing minerals in Luna 24 core. Correct.

Finding 1:
- **Severity**: 🟡 minor
- **File+field**: `i18n-src/en-US/moon-sites/luna24.json` → `fact`
- **Quote**: "foreshadowing the later discovery of lunar water ice"
- **Issue**: Technically accurate as an editorial framing but worth noting: the Luna 24 water detection (Surkov 1978) was reported in a Soviet journal and not widely known in the West at the time. It was later cited as significant context once LCROSS and M³ confirmed ice. The claim is supportable but the word "foreshadowing" implies a causal link that is retrospective; could be misread as "predicted" rather than "was later recognized as consistent with."
- **Correction**: Minor editorial refinement optional: "including traces of water-bound minerals — data that gained new significance after polar ice was confirmed decades later."
- **Source**: https://www.thespacereview.com/article/1485/1 ; https://en.wikipedia.org/wiki/Luna_24
- **Confidence**: high

---

### luna9

**Verdict: PASS**

**Overlay file:** `i18n-src/en-US/moon-sites/luna9.json`
**Base data:** `static/data/moon-sites.json` id=`luna9`

"First spacecraft to achieve a soft landing on the Moon and transmit photographs from the surface" — verified correct.
Landing date 1966-02-03 verified. Coordinates (7.08°N, −64.37°W) verified.
"Nine panoramic images ended the debate about whether landers would sink into deep lunar dust" — verified: nine images total (including panoramas), dust-sinking debate confirmed.
Site name "Oceanus Procellarum" verified.
No factual errors found.

---

### lunar-prospector

**Verdict: PASS**

**Overlay file:** `i18n-src/en-US/moon-sites/lunar-prospector.json`
**Base data:** `static/data/moon-sites.json` id=`lunar-prospector`

Kind=orbiter in base data. Correctly coded as non-lander. "Orbiter · Ended 1999" correct.
"Direct neutron-spectrometer detection of hydrogen at both lunar poles" — verified correct.
"Deliberately impacted into Shoemaker crater at end of mission" — verified: impacted Shoemaker crater July 31, 1999. Correct.
"Earth-based observers detected nothing definitive (a follow-up only delivered by LCROSS in 2009)" — verified correct. LCROSS confirmed water ice October 9, 2009.
"Established neutron-spectroscopy as the primary tool for lunar volatiles" — verified correct; technique later used by LRO/LEND and other missions.

Finding 1:
- **Severity**: 🔵 note
- **File+field**: `i18n-src/en-US/moon-sites/lunar-prospector.json` → `fact`
- **Quote**: "hoping the impact ejecta would confirm water; Earth-based observers detected nothing definitive"
- **Issue**: Accurate, but the overlay does not mention that Lunar Prospector also carried Eugene Shoemaker's ashes — the crater was renamed for him partly because of this. Not a factual error; minor omission of context for a space atlas.
- **Correction**: Optional addition for flavor. Not required.
- **Source**: https://en.wikipedia.org/wiki/Shoemaker_(lunar_crater)
- **Confidence**: high

---

### slim

**Verdict: WARN**

**Overlay file:** `i18n-src/en-US/moon-sites/slim.json`
**Base data:** `static/data/moon-sites.json` id=`slim`

Landing date 2024-01-19 verified. Coordinates (−13.31°N, 25.24°E) verified vs JAXA-confirmed 13.31549°S 25.24889°E.
"Near Shioli Crater" — spelling "Shioli" verified correct per JAXA and Planetary Society.
"Japan became the fifth nation to achieve a lunar soft landing" — verified: after USSR, USA, China, India. Correct.
"Targeting within 100 m accuracy vs the km-scale standard of all previous missions" — verified: actual landing was 55 m from target. Claimed accuracy achieved. Correct.

Finding 1:
- **Severity**: 🟡 minor
- **File+field**: `i18n-src/en-US/moon-sites/slim.json` → `fact`
- **Quote**: "Landed tilted, losing primary power, but eventually the solar panels faced the sun and operations resumed."
- **Issue**: "Landed tilted" understates what happened. SLIM landed essentially inverted — nose-down at ~90 degrees — not just "tilted." JAXA images showed it had landed on its nose with the engine bell pointing away from the surface. "Tilted" is technically true (it was not upright) but conveys a mild lean rather than a nose-plant. Could mislead a reader.
- **Correction**: "Landed nose-down at roughly 90° from the intended attitude, leaving its solar panels initially pointing away from the Sun; operations resumed nine days later once the Sun angle shifted."
- **Source**: https://en.wikipedia.org/wiki/Smart_Lander_for_Investigating_Moon ; https://www.cnbc.com/2024/01/19/japan-slim-lunar-lander-touches-down-on-moon.html
- **Confidence**: high

---

### smart-1

**Verdict: PASS**

**Overlay file:** `i18n-src/en-US/moon-sites/smart-1.json`
**Base data:** `static/data/moon-sites.json` id=`smart-1`

Kind=orbiter in base data. Correctly coded as non-lander. "Orbiter · Ended 2006" correct.
"ESA's first lunar mission" — verified correct.
"Used solar-electric (ion) propulsion to spiral out from a geostationary transfer orbit to lunar capture" — verified. Launched Sep 27, 2003; entered lunar orbit November 15, 2004. Ion propulsion confirmed (PPS-1350-G Hall-effect thruster, 82 kg xenon).
"14-month, fuel-efficient transit" — Sep 2003 to Nov 2004 ≈ 14 months. Correct.
"Deliberately impacted the lunar surface in 2006 for an observed end-of-life experiment" — verified: impacted Lacus Excellentiae September 3, 2006. Correct.
Orbit altitude ~470 km in base data: initial lunar orbit varied; the 470 km figure is within the documented range. Acceptable.

Finding 1:
- **Severity**: 🔵 note
- **File+field**: `i18n-src/en-US/moon-sites/smart-1.json` → `fact`
- **Quote**: "pioneered low-thrust trajectories for ESA's later interplanetary missions"
- **Issue**: Accurate claim. Minor completeness note: SMART-1 also carried a miniaturized X-ray/infrared science instrument suite that mapped lunar surface composition — this scientific contribution is not mentioned. The capability field focuses entirely on the propulsion demonstration. Not an error; just a narrower framing than the full mission scope.
- **Correction**: None required.
- **Source**: https://sci.esa.int/web/smart-1 ; https://www.eoportal.org/satellite-missions/smart-1
- **Confidence**: high

---

## Cross-cutting notes

1. **Orbiter coding**: clementine, lro, luna10, lunar-prospector, and smart-1 all have `kind: "orbiter"` in base data and their overlay `mission_type` fields correctly say "Orbiter" — none are falsely coded as surface missions. The pre-briefing concern that these might be described as landing sites is not borne out; the data model handles them cleanly.

2. **Luna 16 parenthetical error** (🟡): The fact text lists "Three Luna sample returns followed (17 / 20 / 24)" — Luna 17 was a rover mission (Lunokhod 1), not a sample return. The correct sequence of Soviet sample returns after Luna 16 is Luna 20 (Feb 1972), Luna 24 (Aug 1976). Luna 17 should be removed from the parenthetical.
   - **File+field**: `i18n-src/en-US/moon-sites/luna16.json` → `fact`
   - **Quote**: "Three Luna sample returns followed (17 / 20 / 24)."
   - **Correction**: "Two more Luna sample returns followed (Luna 20 in 1972, Luna 24 in 1976)." (Luna 16 → Luna 20 → Luna 24 = three total Soviet sample returns.)
   - **Source**: https://airandspace.si.edu/stories/editorial/revisiting-soviet-lunar-sample-return-missions
   - **Confidence**: high

   *(This finding is re-filed under luna16 above as a 🟡 finding in addition to the "day later" error — the luna16 entry has two 🟡 issues.)*
