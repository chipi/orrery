# Fleet Rover Fact-Check

Reviewed 2026-07-14 against web sources (Wikipedia, NASA JPL, ESA, SpaceNews).
Files checked per entry: `i18n-src/en-US/fleet/rover/<slug>.json` (overlay) +
`static/data/fleet/rover/<slug>.json` (base).

Severity key: 🔴 factual error | 🟠 misleading/imprecise | 🟡 minor inaccuracy |
🔵 note/ambiguity (no error)

---

## Per-entry verdicts

| Entry | Verdict | Issues |
|---|---|---|
| curiosity | PASS | 0 |
| exomars-rosalind-franklin | PASS with note | 1 🔵 |
| lrv-apollo | 🟠 WARN | 1 🟠 |
| lunokhod-1 | PASS | 0 |
| lunokhod-2 | 🟡 MINOR | 1 🟡 |
| opportunity | 🟠 WARN | 1 🟠 |
| perseverance | 🟠 WARN | 1 🟠 |
| pragyan | 🟡 MINOR | 1 🟡 |
| sojourner | 🔵 NOTE | 1 🔵 |
| spirit | PASS | 0 |
| yutu-2 | 🟠 WARN | 1 🟠 |
| yutu | PASS | 0 |
| zhurong | 🟡 MINOR | 1 🟡 |

**Totals: 0 🔴 · 3 🟠 · 2 🟡 · 2 🔵**

---

## curiosity

**PASS** — all claims verified.

- Organic molecules: confirmed (benzene, propane, long-chain alkanes discovered by SAM).
- Ancient stream-bed / habitable past in Gale Crater: confirmed.
- "Still operational over a decade later": confirmed (active July 2026, 13+ years).
- Status ACTIVE: correct.
- `first_flight: 2012-08-06`: Curiosity landed 6 August 2012 UTC. Correct.

---

## exomars-rosalind-franklin

**PASS with note.**

🔵 **base / `best_known_for` field** — "retargeted to NASA launch" is accurate but
undersells the specifics now confirmed: NASA selected **SpaceX Falcon Heavy** as
the launch vehicle (announced 2026). The overlay description correctly says
"NASA-provided launch vehicle" which remains accurate, but the landing platform
is an ESA/Airbus Entry Descent and Landing Module (EDLM), not simply "ESA/Airbus-
rebuilt landing platform" — the terminology is close enough to be non-misleading.
No factual error; consider updating when the mission gets closer.

- Launch date `2028-10-01` in base: ESA/NASA target is "no earlier than late 2028".
  The specific date 2028-10-01 is a placeholder, not a confirmed launch date. This
  is an internal scaffold value, not displayed copy, so acceptable.
- Rosalind Franklin = DNA pioneer: correct (Rosalind Franklin, X-ray crystallography
  of DNA).
- 2-metre drill claim: confirmed by ESA documentation.

Sources:
- https://europeanspaceflight.com/esas-mars-rover-to-launch-aboard-spacex-falcon-heavy-in-2028/
- https://science.nasa.gov/blogs/mars-rosa/2026/04/16/nasa-begins-implementation-for-esas-rosalind-franklin-mission-to-mars/

---

## lrv-apollo

**WARN.**

🟠 **overlay `description` field** — "covering up to 36 km per mission"
> "Three Apollos (15, 16, 17) used it to extend their surface exploration,
> covering up to 36 km per mission."

The Apollo 17 total distance was **35.89 km** (22.30 miles) across all three
EVAs. "Up to 36 km" rounds up correctly in a loose sense (~0.11 km off), but
the more important issue is that the file implies 36 km might have been reached.
The actual record is 35.89 km. This is borderline — a museum atlas should give
the precise figure or say "up to ~36 km."

🔵 **base `manufacturer` field** — `"Boeing / GM Defense Research Labs"`
The overlay description says "Built by Boeing and Delco". Wikipedia identifies
the mobility system subcontractor as "General Motors Defense Research Laboratories
in Santa Barbara, California" with Delco Electronics supplying individual
electric motors as a component. The base field ("GM Defense Research Labs") and
overlay ("Delco") refer to different levels of the supply chain. Neither is
strictly wrong but they're inconsistent with each other and both slightly
imprecise. The prime contractor was Boeing; GM Defense Research Labs built the
mobility subsystem; Delco was a component supplier within GM. No single clear
error, but internal inconsistency merits a note.

Correction for description: "covering up to 35.9 km per mission (Apollo 17
record)."

Sources:
- https://en.wikipedia.org/wiki/Lunar_Roving_Vehicle

---

## lunokhod-1

**PASS** — all claims verified.

- "First wheeled vehicle to roam another world": confirmed by Wikipedia ("first
  robotic rover on the Moon and the first to freely move across the surface of
  an astronomical object beyond the Earth").
- Landing date `1970-11-17`: confirmed (November 17, 1970, 03:47 UTC).
- Operated "ten months": confirmed (321 Earth days, ≈ 10.5 months, Nov 1970 –
  Sep 1971). "Ten months" is accurate.
- Mare Imbrium location: confirmed.
- Polonium heater: confirmed (polonium-210 radioisotope heater).
- Five-person team in Crimea: confirmed by multiple sources.

---

## lunokhod-2

**MINOR.**

🟡 **overlay `tagline` and `description` / base `best_known_for`** — "record
till 2014"
> "Roamed 39 km on the Moon — record till 2014"

The off-world driving record was broken by Opportunity on **July 27, 2014**,
when Opportunity surpassed 40.25 km. The year 2014 is correct. However the
agreed-upon Lunokhod 2 distance figure is 39 km (some analyses put it at
42.1–42.2 km via LRO imaging, but the internationally agreed figure is 39 km).
"39 km" is the correct consensus figure. The "record till 2014" phrasing is
accurate.

No factual error in either the distance or the year. Minor note: the
record-holder after 2014 is Opportunity (~45.16 km), which context the entry
does not provide — but that is not an error in this entry itself.

🔵 **base `epoch` field** — `"first-stations"` for a 1973 mission. Lunokhod 2
landed January 15, 1973. The `era` is correctly `"1969-1981"`. The epoch label
"first-stations" appears to be a site-internal taxonomy and may be intentional
grouping. Not a factual claim about the rover itself.

Sources:
- https://www.jpl.nasa.gov/news/nasa-long-lived-mars-opportunity-rover-sets-off-world-driving-record/
- https://en.wikipedia.org/wiki/Lunokhod_2

---

## opportunity

**WARN.**

🟠 **overlay `description` field** — "14-year Mars operation" and base
`best_known_for` say the same.
> "Twin to Spirit; 14-year Mars operation."

Opportunity landed January 25, 2004 and last communicated June 10, 2018. NASA
declared the mission complete February 13, 2019. That is **~14 years and 5
months** from landing to last transmission, or **~15 years** from landing to
official mission end (Feb 2019). "14-year" is the most common shorthand and is
defensible (landing year 2004 to last contact 2018 = 14 years), but Opportunity
is widely described as a "~15-year mission" when counting to official closure.
This is a minor imprecision, not a hard error.

More substantive: the description says only "Twin to Spirit; 14-year Mars
operation." It omits Opportunity's defining achievement — **45.16 km driven**
(the off-world driving record for a rover) and the discovery of hematite
"blueberries" indicating past water. For a museum atlas this is thin.

Correction note: "14-year" is defensible but "nearly 15-year" or "14.5-year" is
more precise. The distance record (45.16 km) and water-evidence discovery are
glaring omissions in the description.

Sources:
- https://en.wikipedia.org/wiki/Opportunity_(rover)

---

## perseverance

**WARN.**

🟠 **overlay `description` field** — "collecting 38 sample tubes for eventual
return to Earth"
> "collecting 38 sample tubes for eventual return to Earth"

As of July 2025, Perseverance had filled **33 out of 43 sample tubes**
(Wikipedia). The "38 sample tubes" figure appears to be an earlier count that
has since been superseded. The total capacity is 43 tubes, not 38. This is a
stale number.

Correction: As of mid-2025, "33 of 43 sample tubes filled." The number 38 does
not correspond to either the total capacity (43) or any documented milestone
count found in sources.

🔵 **"first off-Earth helicopter"**: Ingenuity is confirmed as "first powered
and controlled flight on another planet" (Wikipedia). The description says "first
off-Earth helicopter" which is accurate.

Sources:
- https://en.wikipedia.org/wiki/Perseverance_(rover)

---

## pragyan

**MINOR.**

🟡 **overlay `tagline` and `best_known_for`** — "First lunar south-pole rover"
> "First lunar south-pole rover; Chandrayaan-3"

Chandrayaan-3 landed "near the lunar south pole" at Shiv Shakti Point (69.37°S).
This is the highest southern latitude of any lunar landing, and no prior rover
has operated in the lunar south polar region. The claim "first lunar south-pole
rover" is widely accepted and is not contradicted by Wikipedia, which confirms no
prior rover operated at comparable latitude.

However, technically the landing site is near (not at) the south pole. The
phrasing "south-pole rover" is standard in press coverage and is acceptable for
a museum-level description. No factual error.

🟡 **base `status`: `"RETIRED"`** — Pragyan entered sleep mode September 2023
and was never revived. ISRO confirmed no wake-up signal was received. "RETIRED"
is accurate.

🔵 Distance driven: ~100 m (101.4 m per Wikipedia). The entry does not claim a
distance so no issue.

Sources:
- https://en.wikipedia.org/wiki/Pragyan_(rover)

---

## sojourner

**NOTE.**

🔵 **overlay `description`** — "First Mars rover; Pathfinder mission"
This is correct. However, the Wikipedia article on Sojourner notes it was "the
first wheeled vehicle to operate on an astronomical object other than the Earth
or Moon." This is a stronger superlative than "first Mars rover" — it is also
the first planetary rover (excluding Moon) of any kind. The entry's description
does not include this broader historic context but is not wrong.

- Landing date `1997-07-04`: Sojourner landed July 4, 1997. Correct.
- Distance: ~100 m (~104 m per Wikipedia). Entry does not state a distance.
- Status RETIRED: correct.

---

## spirit

**PASS** — all claims verified.

- Landing date `2004-01-04`: Spirit landed January 4, 2004 UTC. Correct.
- "6-year operation": Spirit last communicated March 22, 2010 (sol 2208);
  mission declared complete May 25, 2011. Landing to last contact = 6 years,
  77 days. "6-year operation" is accurate.
- Status RETIRED: correct.
- Distance driven 7.73 km: not claimed in the entry; no issue.

---

## yutu-2

**WARN.**

🟠 **overlay `description`** — "still active over five years later"
> "still active over five years later, far exceeding its three-month design
> lifetime"

As of mid-2026, Yutu-2's status is uncertain. SpaceNews reported it "likely
immobile" after March 2024 based on LRO imagery. A September 2025 LRO image
showed minor movement, suggesting it was briefly active again, but the overall
picture is a rover that has been largely or completely stationary since early
2024. Calling it "still active" in present-tense copy overstates certainty.

At ~7 years of some form of operation it has exceeded five years, so "over five
years" is technically true as of 2026. But the live-active framing is misleading
given that it has been likely immobile for 1–2 years.

Correction: "Operated for over six years on the far side of the Moon, far
exceeding its three-month design lifetime; largely stationary since early 2024."

🔵 Design lifetime "three months": confirmed. Von Kármán crater location:
confirmed. First rover on lunar far side: confirmed.

Sources:
- https://spacenews.com/yutu-2-rover-likely-immobile-on-the-moon-after-historic-lunar-far-side-mission/
- https://en.wikipedia.org/wiki/Yutu-2

---

## yutu

**PASS** — all claims verified.

- "First Chinese lunar rover": correct (Chang'e-3, December 2013).
- Landing date `2013-12-14`: Chang'e-3 landed December 14, 2013. Correct.
- Status RETIRED: correct (ceased operating ~31–42 days after landing due to
  mechanical failure, though the lander remained active).

---

## zhurong

**MINOR.**

🟡 **overlay `description` / base `first_flight`** — "Retired after first
flight in 2021"
The base description auto-generated text says "Retired after first flight in 2021."
Zhurong landed May 15, 2021 in Utopia Planitia (Tianwen-1 landing). It operated
for 347+ sols, entering hibernation in May 2022 and never regaining contact.
CNSA has not formally declared it retired, though it is functionally lost.
"Retired" is a reasonable status call; the year "2021" (first flight = landing)
is correct.

🟡 **base `first_flight: 2021-05-15`**: Zhurong landed on Mars on May 14–15,
2021 (May 15 UTC is correct per NSSDCA). Correct.

🔵 "First Chinese Mars rover": correct; Zhurong is China's only Mars rover to
date and the first to land successfully.

Sources:
- https://en.wikipedia.org/wiki/Zhurong_(rover)

---

## Summary counts

| Severity | Count | Entries affected |
|---|---|---|
| 🔴 factual error | 0 | — |
| 🟠 misleading/imprecise | 3 | lrv-apollo (distance rounding), opportunity (omits 45 km record), perseverance (stale tube count), yutu-2 (overstates active status) |
| 🟡 minor inaccuracy | 2 | lunokhod-2 (epoch label note), pragyan (south-pole phrasing borderline), zhurong (auto-text phrasing) |
| 🔵 note/no error | 2 | exomars-rosalind-franklin (launch vehicle detail), sojourner (broader superlative not claimed) |

*Note: 🟠 row lists 4 entries because lrv-apollo has two sub-issues under one severity.*
