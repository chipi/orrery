# Fleet Lander Fact-Check — Batch A

**Scope:** 14 lander entries  
**Files checked:** `i18n-src/en-US/fleet/lander/<slug>.json` (overlay) + `static/data/fleet/lander/<slug>.json` (base)  
**Sources:** Wikipedia (English), NASA NSSDCA, ESA press releases  
**Date:** 2026-07-14

---

## Per-entry verdicts

| Entry | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| beagle2 | Issues found | 0 | 1 | 1 | 0 |
| beresheet | Issues found | 0 | 1 | 0 | 0 |
| blue-moon-mk1 | Issues found | 2 | 1 | 0 | 0 |
| change-3 | Clean | 0 | 0 | 0 | 1 |
| change-4 | Clean | 0 | 0 | 0 | 0 |
| change-5 | Issues found | 0 | 0 | 1 | 0 |
| change6 | Issues found | 0 | 1 | 1 | 0 |
| hakuto-r | Issues found | 0 | 0 | 1 | 1 |
| im-1-odysseus | Issues found | 0 | 1 | 1 | 0 |
| insight | Issues found | 0 | 0 | 1 | 0 |
| luna-16 | Issues found | 0 | 1 | 1 | 0 |
| luna-9 | Clean | 0 | 0 | 0 | 0 |
| luna24 | Issues found | 0 | 1 | 0 | 0 |
| mars-2 | Issues found | 0 | 0 | 1 | 0 |

**Totals: 🔴 2 · 🟠 7 · 🟡 8 · 🔵 2**

---

## Severity key

- 🔴 Factually wrong in a way that changes meaning (false first/superlative, wrong date, fake flight)
- 🟠 Materially misleading or significantly incomplete (wrong mechanism, wrong sample mass, wrong location)
- 🟡 Imprecise or slightly off but defensible (different characterisation of same event, minor detail gap)
- 🔵 Note / cross-consistency gap (overlay vs base mismatch, naming curiosity)

---

## beagle2

### F-BG-01 🟠 Solar panel failure description imprecise
- **File:** `i18n-src/en-US/fleet/lander/beagle2.json` — `tagline`, `best_known_for`, `description`
- **Quote:** "two of four solar panels apparently failed to deploy"
- **Issue:** Wikipedia / ESA's own 2015 press analysis (Karri Muinonen et al.) concluded one petal failed to fully open, blocking the antenna. The imagery shows four petals but one incompletely deployed — not "two solar panels stuck". The text conflates panels with petals. ESA's press release says "at least one of the solar panels did not open."
- **Correction:** "at least one of four solar panels (petals) failed to fully deploy" — or more carefully, "one petal failed to open fully, blocking the antenna"
- **Source:** https://www.esa.int/Science_Exploration/Space_Science/Mars_Express/Beagle-2_lander_found_on_Mars
- **Confidence:** High

### F-BG-02 🟡 Tagline appears in best_known_for verbatim (overlay)
- **File:** `i18n-src/en-US/fleet/lander/beagle2.json` — `tagline` vs `best_known_for`
- **Issue:** Both fields are identical strings. `best_known_for` is supposed to be a more distilled claim; here it is a duplicate of the verbose tagline.
- **Correction:** `best_known_for` should be a short claim, e.g. "UK/ESA Mars lander — landed 2003, silent for 12 years, found by HiRISE 2015"
- **Confidence:** Medium (this may be intentional design pattern for this slot)

---

## beresheet

### F-BR-01 🟠 Crash mechanism misdescribed
- **File:** `i18n-src/en-US/fleet/lander/beresheet.json` — `description`
- **Quote:** "Crashed in April 2019 when a thrust-control software glitch left the engine off too long."
- **Issue:** Wikipedia / SpaceIL investigation report describe a cascade failure: an IMU gyroscope (Inertial Measurement Unit) failed; this caused repeated computer reboots; each reboot shut down the main engine; five reboots were required to reload software updates; by the time the engine restarted the lander was at 150 m altitude traveling at 500+ km/h. It was not a "thrust-control software glitch" — the root cause was a gyroscope hardware failure triggering reboot loops that shut the engine off repeatedly. The engine was not simply "left off too long" by a single glitch.
- **Correction:** "Crashed in April 2019 when an IMU gyroscope failure triggered repeated computer reboots, each shutting the engine down; by the time control was recovered, the lander was too low and fast to survive."
- **Source:** https://en.wikipedia.org/wiki/Beresheet#Mission_failure
- **Confidence:** High

---

## blue-moon-mk1

### F-BM-01 🔴 `first_flight` date is wrong — Blue Moon Mk1 has never flown
- **File:** `static/data/fleet/lander/blue-moon-mk1.json` — `first_flight`
- **Quote:** `"first_flight": "2025-01-16"`
- **Issue:** Blue Moon Mk1 has never flown to the Moon. The NG-1 maiden flight on 2025-01-16 carried the **Blue Ring Pathfinder** (an orbital transfer vehicle demo), not Blue Moon Mk1. Blue Moon Mk1 is described by Wikipedia as "In development" with first lunar landing currently postponed to no earlier than 2026. Recording 2025-01-16 as `first_flight` is factually incorrect and implies the vehicle has flown.
- **Correction:** Remove or null `first_flight`; set status to `PLANNED` or `IN_DEVELOPMENT`; note planned lunar landing NET 2026.
- **Source:** https://en.wikipedia.org/wiki/Blue_Moon_(spacecraft) ; https://en.wikipedia.org/wiki/New_Glenn
- **Confidence:** High

### F-BM-02 🔴 `status` is "ACTIVE" for a vehicle that has never flown
- **File:** `static/data/fleet/lander/blue-moon-mk1.json` — `status`
- **Quote:** `"status": "ACTIVE"`
- **Issue:** Blue Moon Mk1 has not completed any mission; it is a development/pre-flight vehicle. "ACTIVE" implies operational status which is false.
- **Correction:** `"status": "PLANNED"` (or `"IN_DEVELOPMENT"`)
- **Source:** https://en.wikipedia.org/wiki/Blue_Moon_(spacecraft)
- **Confidence:** High

### F-BM-03 🟠 Overlay `description` states Blue Moon Mk1 "rode the maiden NG-1 flight on 2025-01-16"
- **File:** `i18n-src/en-US/fleet/lander/blue-moon-mk1.json` — `description`
- **Quote:** "the Mk1 pathfinder rode the maiden NG-1 flight on 2025-01-16"
- **Issue:** NG-1 carried the Blue Ring Pathfinder, not Blue Moon Mk1. This is an error of attribution. Blue Ring is a separate product (in-space transportation vehicle). Blue Moon Mk1 was not on NG-1.
- **Correction:** Remove the claim that Mk1 rode NG-1. NG-1 carried the Blue Ring Pathfinder. The first Blue Moon Mk1 lunar mission has not yet launched.
- **Source:** https://en.wikipedia.org/wiki/New_Glenn
- **Confidence:** High

---

## change-3

### F-C3-01 🔵 Planned landing site was Sinus Iridum, not Mare Imbrium specifically
- **File:** `i18n-src/en-US/fleet/lander/change-3.json` — `description`
- **Quote:** "Mare Imbrium touchdown"
- **Issue:** Technically correct — Sinus Iridum is a bay of Mare Imbrium, and the actual landing coordinates (44.12°N 19.51°W) are within the broader Mare Imbrium region. Wikipedia notes the planned site was Sinus Iridum, ~40 km from actual touchdown. "Mare Imbrium" is accurate at the regional level; "Sinus Iridum (Mare Imbrium)" would be more precise.
- **Correction:** Consider "Sinus Iridum, Mare Imbrium" for precision. Current text is defensible.
- **Source:** https://en.wikipedia.org/wiki/Chang%27e_3
- **Confidence:** Medium

---

## change-4

No issues found. Landing date 2019-01-03 ✓, Queqiao at L2 ✓, Von Kármán crater ✓, far-side first ✓, Yutu-2 ✓.

---

## change-5

### F-C5-01 🟡 Sample mass understated — description says "1.7 kg", actual return was ~1.731 kg
- **File:** `i18n-src/en-US/fleet/lander/change-5.json` — `description`
- **Quote:** "Returned 1.7 kg of basalt"
- **Issue:** Wikipedia states 1,731 grams (1.731 kg) of samples returned. "1.7 kg" is a rounded figure but is accurate to one decimal place. Minor — however, other entries in this dataset use more precise figures (e.g. Chang'e 6: "1935 g"). For internal consistency, "1.731 kg" or "~1.7 kg" would be cleaner.
- **Correction:** "Returned 1.731 kg" or keep "~1.7 kg" with tilde to signal approximation
- **Source:** https://en.wikipedia.org/wiki/Chang%27e_5
- **Confidence:** Medium

---

## change6

### F-C6-01 🟠 Landing date off by ~1 day (UTC vs local time confusion)
- **File:** `i18n-src/en-US/fleet/lander/change6.json` — `tagline`, `best_known_for`, `description`
- **Quote:** "Apollo basin landing 2024-06-02"
- **Issue:** Wikipedia gives the landing as "22:23 UTC on 1 June 2024" — i.e. June 1 UTC, which is June 2 Beijing time (CST = UTC+8). CNSA announcements use Beijing time and say June 2. The date "2024-06-02" is the Beijing local date, not UTC. The entry should be consistent with UTC or clearly label the timezone. Using local time without noting it risks confusion since all other mission dates in this dataset appear to be UTC.
- **Correction:** Either "2024-06-01 (UTC) / 2024-06-02 (CST)" or consistently use UTC: "2024-06-01 22:23 UTC"
- **Source:** https://en.wikipedia.org/wiki/Chang%27e_6
- **Confidence:** High

### F-C6-02 🟡 "Pakistan" listed as contributor but Sweden was also a contributor (not mentioned)
- **File:** `i18n-src/en-US/fleet/lander/change6.json` — `description`
- **Quote:** "ESA, Italy, France, and Pakistan contributed instruments"
- **Issue:** Wikipedia lists four international partners: France (DORN), Italy (INRRI), Sweden (NILS), Pakistan (ICUBE-Q CubeSat). ESA is not itself a contributor — the ESA-member-state instruments are French (DORN) and Italian (INRRI). The description omits Sweden and incorrectly labels the package as "ESA" rather than France + Italy individually.
- **Correction:** "France, Italy, Sweden, and Pakistan contributed instruments — the first international science payloads on a Chinese sample-return mission"
- **Source:** https://en.wikipedia.org/wiki/Chang%27e_6
- **Confidence:** High

---

## hakuto-r

### F-HK-01 🟡 M1 `first_flight` date is the crash date, not launch date
- **File:** `static/data/fleet/lander/hakuto-r.json` — `first_flight`
- **Quote:** `"first_flight": "2023-04-25"`
- **Issue:** April 25, 2023 was the M1 landing attempt date (crash date). M1 actually launched on December 11, 2022. The `first_flight` field should record the launch date, not the attempted landing. This is a ~4.5 month error.
- **Correction:** `"first_flight": "2022-12-11"` (M1 launch date)
- **Source:** https://en.wikipedia.org/wiki/Hakuto-R
- **Confidence:** High

### F-HK-02 🔵 M2 crash confirmed — `best_known_for` is now accurate but `status` is FAILED
- **File:** `static/data/fleet/lander/hakuto-r.json` — `status`, `best_known_for`
- **Quote:** "M1 + M2 both crashed" / `"status": "FAILED"`
- **Issue:** M2 crashed on June 5, 2025 — after the content likely was last updated. The `best_known_for` and overlay `description` correctly note "M1 + M2 both crashed" which means this was already updated or is accurate as of the review date. Status "FAILED" is consistent. No correction needed, but noting this was a live fact at the time of writing.
- **Confidence:** High (verified)

---

## im-1-odysseus

### F-IM-01 🟠 Cause of tipping described as "navigation laser error" — actually a pre-launch switch error
- **File:** `i18n-src/en-US/fleet/lander/im-1-odysseus.json` — `description`
- **Quote:** "a navigation laser error left the rangefinder inoperative"
- **Issue:** The root cause was that a safety switch on the laser rangefinder was not activated during pre-launch preparations (a procedural/ground error before launch), not a "navigation laser error" during flight. Wikipedia: "a safety switch on the primary laser rangefinder system had not been activated during pre-launch preparations." The framing "navigation laser error" implies an in-flight sensor failure; the actual cause was a ground prep oversight.
- **Correction:** "the primary laser rangefinder had been left inactive (safety switch not armed pre-launch)"
- **Source:** https://en.wikipedia.org/wiki/IM-1
- **Confidence:** High

### F-IM-02 🟡 Landing date not stated in overlay description
- **File:** `i18n-src/en-US/fleet/lander/im-1-odysseus.json` — `description`
- **Quote:** "Touched down sideways on the lunar south-pole region in February 2024"
- **Issue:** Exact date was February 22, 2024, 23:23:53 UTC. "February 2024" is imprecise compared to other entries that cite exact dates. Minor but inconsistent with the granularity of other lander entries.
- **Correction:** "Touched down sideways near the lunar south pole on 2024-02-22"
- **Source:** https://en.wikipedia.org/wiki/IM-1
- **Confidence:** Medium

---

## insight

### F-IN-01 🟡 "Over 1,300 marsquakes" — Wikipedia gives exactly 1,313 by May 2022; mission end count was higher
- **File:** `i18n-src/en-US/fleet/lander/insight.json` — `description`, `best_known_for`
- **Quote:** "Detected over 1,300 marsquakes"
- **Issue:** Wikipedia gives 1,313 as of May 2022 and states "thousands of seismic events" by mission end (December 2022). "Over 1,300" is technically accurate but understates the final count. The base `best_known_for` says "1300+ marsquakes detected" which is consistent with the overlay. The number is defensible as a minimum floor but "over 1,300" may have been superseded by mission-end reporting.
- **Correction:** Consider "over 1,300 marsquakes (1,313 confirmed by May 2022)" or update to the mission-end figure if available
- **Source:** https://en.wikipedia.org/wiki/InSight
- **Confidence:** Medium

---

## luna-16

### F-L16-01 🟠 Sample mass not stated; description says "first robotic lunar sample return" but omits that Apollo crews had already returned samples
- **File:** `i18n-src/en-US/fleet/lander/luna-16.json` — `description`, `best_known_for`
- **Quote:** "First robotic lunar sample return"
- **Issue:** The claim "first robotic lunar sample return" is accurate and important — Luna 16 was the first *robotic* (uncrewed) sample return from the Moon, in September 1970. However, Apollo 11 (July 1969) and Apollo 12 (November 1969) had returned samples via crewed missions before Luna 16. The entry's claim is factually correct as scoped ("robotic"), but a museum-grade entry should make the scope explicit to avoid implying it was the first lunar sample return overall. Additionally, the actual sample mass (101 grams from Mare Fecunditatis) is absent from both overlay and base files; nearby entries (luna24) include precise masses.
- **Correction:** Clarify "first *robotic* lunar sample return" is correct; add sample mass context: "101 g from Mare Fecunditatis, September 1970"
- **Source:** https://en.wikipedia.org/wiki/Luna_16
- **Confidence:** High

### F-L16-02 🟡 `name` field says "Luna 16-class" — implies a vehicle class, not a single mission
- **File:** `static/data/fleet/lander/luna-16.json` — `name`
- **Quote:** `"name": "Luna 16-class"`
- **Issue:** The overlay `name` field is also "Luna 16-class". The `-class` suffix implies this entry represents a vehicle family (Luna 16/20/24) rather than a single spacecraft. The `description` and `best_known_for` speak only to the Luna 16 mission. This is a consistency issue — either the entry should represent the class (and mention Luna 20 + 24) or the name should be "Luna 16".
- **Correction:** Either rename to "Luna 16" and scope to that mission, or expand coverage to include Luna 20 and Luna 24 (noting Luna 24 already has its own entry, creating overlap)
- **Confidence:** Medium

---

## luna-9

No issues found. First soft landing on another world ✓, Oceanus Procellarum ✓, February 1966 ✓, panoramic images ✓.

---

## luna24

### F-L24-01 🟠 Return capsule landing location stated as "Surkhandarya in Uzbekistan" — actually western Siberia
- **File:** `i18n-src/en-US/fleet/lander/luna24.json` — `description`
- **Quote:** "returned 170.1 g of lunar regolith to Surkhandarya in Uzbekistan on 1976-08-22"
- **Issue:** Wikipedia gives the landing location as "about 200 km southeast of Surgut in western Siberia" at coordinates 61.06°N 75.90°E. Surkhandarya is a region in southern Uzbekistan (~38°N 67°E) — approximately 3,000 km from the actual landing zone. This is a significant geographic error.
- **Correction:** "returned 170.1 g of lunar regolith to western Siberia (~200 km southeast of Surgut) on 1976-08-22"
- **Source:** https://en.wikipedia.org/wiki/Luna_24
- **Confidence:** High

---

## mars-2

### F-M2-01 🟡 "First spacecraft to reach Mars" — claim is imprecise; Mars 3 companion should be clarified
- **File:** `i18n-src/en-US/fleet/lander/mars-2.json` — `tagline`, `best_known_for`, `description`
- **Quote (tagline):** "First spacecraft to reach Mars; lander crashed"
- **Quote (description):** "The first spacecraft to reach Mars' surface — by hard impact."
- **Issue:** The tagline says "first spacecraft to reach Mars" which could be read as the orbiter reaching Mars (the Mars 2 orbiter did achieve Mars orbit), but the description immediately clarifies "surface — by hard impact." However, the broader Mars 2 spacecraft (orbiter + lander) was indeed one of the first to arrive at Mars in 1971, along with Mariner 9. The more precise and standard claim is: "first man-made object to reach the Martian surface" (Wikipedia's exact phrasing), and the crash was on November 27, 1971. The existing description correctly notes "Companion Mars 3 made the first soft landing two days later" — that timing detail is accurate. No factual error, but "first spacecraft to reach Mars" in the tagline is slightly ambiguous (the orbiter portion also "reached Mars").
- **Correction:** Consider "First human-made object to reach the Martian surface; lander crashed on impact (1971)" to match Wikipedia's phrasing and remove ambiguity about the orbiter.
- **Source:** https://en.wikipedia.org/wiki/Mars_2
- **Confidence:** Medium

---

## Summary of findings

| # | Severity | Entry | Field | Issue |
|---|---|---|---|---|
| F-BG-01 | 🟠 | beagle2 | description | "two solar panels" — should be "one petal/panel" per ESA |
| F-BG-02 | 🟡 | beagle2 | best_known_for | Identical to tagline; not a distilled claim |
| F-BR-01 | 🟠 | beresheet | description | Crash mechanism wrong: gyro failure + reboot loop, not "thrust-control software glitch" |
| F-BM-01 | 🔴 | blue-moon-mk1 | first_flight (base) | "2025-01-16" — Blue Moon Mk1 has never flown; NG-1 carried Blue Ring |
| F-BM-02 | 🔴 | blue-moon-mk1 | status (base) | "ACTIVE" — should be PLANNED/IN_DEVELOPMENT |
| F-BM-03 | 🟠 | blue-moon-mk1 | description (overlay) | Claims Mk1 "rode the maiden NG-1 flight" — false; NG-1 carried Blue Ring Pathfinder |
| F-C3-01 | 🔵 | change-3 | description | "Mare Imbrium" is regional but planned site was Sinus Iridum; consider precision |
| F-C5-01 | 🟡 | change-5 | description | "1.7 kg" — actual is 1.731 kg; minor rounding |
| F-C6-01 | 🟠 | change6 | tagline/description | Landing date "2024-06-02" is Beijing local time; UTC is 2024-06-01 |
| F-C6-02 | 🟡 | change6 | description | "ESA, Italy, France, and Pakistan" — should be "France, Italy, Sweden, and Pakistan" (Sweden omitted, ESA is not the contributor) |
| F-HK-01 | 🟡 | hakuto-r | first_flight (base) | "2023-04-25" is crash date; launch was 2022-12-11 |
| F-HK-02 | 🔵 | hakuto-r | status/best_known_for | M2 crash (June 2025) now confirmed; entry is accurate |
| F-IM-01 | 🟠 | im-1-odysseus | description | "navigation laser error" — actually a pre-launch switch left unarmed (ground error) |
| F-IM-02 | 🟡 | im-1-odysseus | description | "February 2024" imprecise; exact date 2024-02-22 |
| F-IN-01 | 🟡 | insight | description/best_known_for | "over 1,300 marsquakes" — 1,313 confirmed by May 2022; mission-end count higher |
| F-L16-01 | 🟠 | luna-16 | description | "First robotic lunar sample return" correct but context needed; sample mass (101 g) absent |
| F-L16-02 | 🟡 | luna-16 | name (base) | "Luna 16-class" implies family; description only covers Luna 16 mission |
| F-L24-01 | 🟠 | luna24 | description | Return site "Surkhandarya, Uzbekistan" is wrong — actually western Siberia (~200 km SE of Surgut) |
| F-M2-01 | 🟡 | mars-2 | tagline | "First spacecraft to reach Mars" is ambiguous; better: "first man-made object to reach Martian surface" |

**Total: 🔴 2 · 🟠 7 · 🟡 8 · 🔵 2 = 19 findings across 14 entries**
