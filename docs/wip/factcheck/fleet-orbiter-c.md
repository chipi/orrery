# Fleet Orbiter Fact-Check C — 18 entries

Reviewed: 2026-07-14  
Files checked: `i18n-src/en-US/fleet/orbiter/<slug>.json` + `static/data/fleet/orbiter/<slug>.json`  
Method: full file read + web verification for every superlative/date/number claim.

---

## Per-entry verdicts

| Slug | Status | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| messenger | PASS | 0 | 0 | 0 | 1 |
| mro | PASS | 0 | 0 | 1 | 0 |
| osiris-rex | PASS | 0 | 0 | 0 | 0 |
| parker-solar-probe | ISSUES | 0 | 1 | 1 | 0 |
| phobos-2 | ISSUES | 0 | 1 | 1 | 0 |
| pioneer-10 | PASS | 0 | 0 | 0 | 1 |
| pioneer-11 | ISSUES | 0 | 0 | 1 | 1 |
| psyche-spacecraft | ISSUES | 0 | 0 | 1 | 1 |
| rosetta | PASS | 0 | 0 | 0 | 0 |
| smart-1 | ISSUES | 0 | 1 | 0 | 0 |
| solar-orbiter | PASS | 0 | 0 | 0 | 0 |
| tianwen-1 | PASS | 0 | 0 | 0 | 0 |
| ulysses | ISSUES | 0 | 0 | 1 | 0 |
| vega-1 | ISSUES | 0 | 1 | 0 | 1 |
| vega-2 | ISSUES | 0 | 1 | 0 | 0 |
| viking1-orbiter | ISSUES | 0 | 0 | 1 | 0 |
| voyager-1 | ISSUES | 0 | 0 | 1 | 0 |
| voyager-2 | PASS | 0 | 0 | 0 | 0 |

**Totals: 0 🔴 / 5 🟠 / 8 🟡 / 4 🔵**

---

## Detailed findings

### MESSENGER
**Verdict: PASS — all key facts verified**

🔵 **[static] `credit` — minor: crater location phrasing**  
File: `static/data/fleet/orbiter/messenger.json`, field: `credit`  
Quote: "left an artificial 16 m crater near the north pole"  
Note: Verified correct — 16 m diameter, near-north-pole site confirmed.  
Source: https://astronomynow.com/2015/04/30/new-craters-named-as-messenger-prepares-to-crash-on-mercury/  
Confidence: HIGH — no change needed.

All other claims verified: 6 gravity assists (1 Earth, 2 Venus, 3 Mercury), 6.6-year cruise, orbit insertion 2011-03-18, impact 2015-04-30, discoveries (water ice, hollows, exosphere, offset magnetic field) — all accurate.

---

### MRO (Mars Reconnaissance Orbiter)
**Verdict: PASS with note**

🟡 **[static] `era` field mislabeled**  
File: `static/data/fleet/orbiter/mro.json`, field: `era`  
Quote: `"era": "1981-2011"`  
What's wrong: MRO launched 2005-08-12 and remains active to 2026. The `1981-2011` era label misclassifies it as pre-commercial-era when it was launched mid-ISS-assembly and has operated through the entire commercial era.  
Correction: `"era": "2011-now"` (same as other active missions like OSIRIS-REx, Parker). MRO's significant science phase extends well past 2011.  
Source: https://www.nasa.gov/image-article/august-2005-mars-reconnaissance-orbiter-mro-launched/  
Confidence: HIGH — factual mismatch between `first_flight` (2005) and era bracket.

---

### OSIRIS-REx
**Verdict: PASS — all key facts verified**

Sample return date September 24, 2023 (per NASA) vs. the entry's "September 2023" — acceptable rounding.  
Extended mission as OSIRIS-APEX en route to Apophis confirmed.  
No issues.

---

### Parker Solar Probe
**Verdict: ISSUES**

🟠 **[i18n-src] `description` — speed figure off by ~0.6%**  
File: `i18n-src/en-US/fleet/orbiter/parker-solar-probe.json`, field: `description`  
Quote: "Peak speed at perihelion: 192 km/s, the fastest human-made object ever."  
What's wrong: The Guinness World Record certified speed is 192.22 km/s (692,000 km/h). Some sources round to 191 km/s depending on reference frame (heliocentric ecliptic vs. inertial). The 192 km/s in the entry is a reasonable rounded figure, but since the official record is 192.22 km/s, describing it as simply "192 km/s" under-represents the precision of the record that is explicitly cited as a superlative.  
Correction: Use "192.22 km/s" or "≈192 km/s" to avoid ambiguity with the 191 km/s figure that also circulates.  
Source: https://www.guinnessworldrecords.com/world-records/66135-fastest-spacecraft-speed  
Confidence: MEDIUM — "192 km/s" is defensible as a rounded figure; the 192.22 figure is more precise.

🟡 **[static] `best_known_for` — distance from Sun's surface vs. center ambiguity**  
File: `static/data/fleet/orbiter/parker-solar-probe.json`, field: `best_known_for`  
Quote: "Closest spacecraft to the Sun ever flown (9.86 R☉, 6.1 M km from the surface)"  
What's wrong: The 9.86 R☉ figure is the distance from the Sun's CENTER (solar radii from center), while 6.1 million km is distance from the surface. These are not equivalents — a solar radius is ~696,000 km, so 9.86 R☉ from center ≈ 6.86 million km from center, and subtracting 1 R☉ (~0.696 million km) gives ~6.16 million km from surface. Both numbers are individually correct, but presenting them as a pair without the center/surface distinction is slightly misleading. The i18n `description` correctly specifies "9.86 solar radii" (implicitly from center) and "6.1 million km from the Sun's surface" — the base `best_known_for` compresses this in a way that could confuse.  
Correction: Clarify: "(9.86 R☉ from center; 6.1 M km from the surface)" or simply drop one.  
Source: https://science.nasa.gov/blogs/parker-solar-probe/2024/12/20/parker-solar-probe-begins-record-setting-closest-approach-to-the-sun/  
Confidence: MEDIUM — both numbers are correct individually; framing is the issue.

All other claims verified: P22 on 2024-12-24 confirmed; P8 on 2021-04-28 corona crossing confirmed; fastest human-made object confirmed.

---

### Phobos 2
**Verdict: ISSUES**

🟠 **[i18n-src] `description` — cause of failure misattributed**  
File: `i18n-src/en-US/fleet/orbiter/phobos-2.json`, field: `description`  
Quote: "Two final images suggest something — likely a thruster failure — but the cause was never confirmed."  
What's wrong: The established engineering finding is that contact was lost due to an on-board computer malfunction (not a thruster failure). By 1989 it was known that two of the three on-board computers had already failed; the final failure was attributed to the on-board computer causing loss of attitude control and then power failure — not a thruster. "Thruster failure" is a popular misconception.  
Correction: "…attributed to an on-board computer failure causing loss of attitude control and power — but the complete sequence was never fully reconstructed."  
Source: https://en.wikipedia.org/wiki/Phobos_2; https://biorestorative.com/on-this-day-in-space-march-27-1989-phobos-2-mars-mission-fails/  
Confidence: HIGH.

🟡 **[i18n-src] `description` — "Two final images" is imprecise**  
File: `i18n-src/en-US/fleet/orbiter/phobos-2.json`, field: `description`  
Quote: "Two final images suggest something"  
What's wrong: Phobos 2 returned 37 images of Phobos with up to 40 m resolution before the final failure. The "two final images" wording conflates the dramatic last-moment data with the actual science return. The mission was otherwise successful.  
Correction: "Phobos 2 returned 37 images of Phobos before contact was lost on 1989-03-27, just before the planned approach to within 50 m of Phobos's surface."  
Source: https://en.wikipedia.org/wiki/Phobos_2  
Confidence: HIGH.

---

### Pioneer 10
**Verdict: PASS with note**

🔵 **[general] Pioneer 10 not confirmed in interstellar space — entry does not claim this**  
The entry correctly calls it "first spacecraft to traverse the asteroid belt" and "first to fly past Jupiter" — does not claim interstellar space. Verified: Pioneer 10 had not confirmed heliopause crossing when contact was lost in 2003 at ~80 AU. The Voyagers are the only confirmed interstellar spacecraft. Entry is clean on this sensitive trap.  
Source: https://science.nasa.gov/mission/pioneer-10/  
Confidence: HIGH.

No factual errors found.

---

### Pioneer 11
**Verdict: ISSUES**

🟡 **[static] `credit` — Epimetheus "rediscovery" claim is imprecise**  
File: `static/data/fleet/orbiter/pioneer-11.json`, field: `credit`  
Quote: "discovery of a new ring (F-ring) and a new moon (Epimetheus rediscovery)"  
What's wrong: The parenthetical "rediscovery" misstates the situation. Pioneer 11 nearly collided with a small moon tentatively identified at the time as Epimetheus. However, the actual discovery credit for Epimetheus as a distinct moon from Janus is shared between Walker (1966 observations, later reinterpreted) and Larson/Fountain (1978 analysis). Voyager 1 in 1980 definitively separated Janus and Epimetheus. Calling it "Epimetheus rediscovery" implies Pioneer 11 made the definitive identification, which is incorrect — Pioneer 11 observed an object that was later identified as probably Epimetheus (or Janus; the exact identity was uncertain).  
Correction: Change to "and a close encounter with a small inner moon" or "near-collision with an object later identified as Epimetheus or Janus."  
Source: https://en.wikipedia.org/wiki/Pioneer_11; https://en.wikipedia.org/wiki/Janus_(moon)  
Confidence: HIGH.

🔵 **[i18n-src] `best_known_for` — "22 years before Cassini" — minor framing**  
File: `i18n-src/en-US/fleet/orbiter/pioneer-11.json`, field: `best_known_for`  
Quote: "flew past Jupiter in 1974 then used the Jupiter gravity assist to reach Saturn in 1979, 22 years before Cassini"  
Note: Cassini entered Saturn orbit 2004-07-01, which is 25 years after Pioneer 11's 1979-09-01 Saturn flyby, not 22. The "22 years before Cassini" is incorrect.  
Correction: "25 years before Cassini" or drop the comparison.  
Source: https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens  
Confidence: HIGH — 1979 + 22 = 2001, not 2004.

Wait — re-checking: Pioneer 11 Saturn: 1979-09-01. Cassini Saturn arrival: 2004-07-01. Difference = 24 years and 10 months, commonly rounded to "25 years." The stated "22 years" is clearly wrong.  
Reclassify: 🟠 (wrong number in a factual claim, not just framing).

**Revised verdict for pioneer-11: 🟠 1 / 🟡 1**

🟠 **[static] `best_known_for` — "22 years before Cassini" wrong**  
File: `static/data/fleet/orbiter/pioneer-11.json`, field: `best_known_for`  
Quote: "22 years before Cassini"  
Correction: "25 years before Cassini" (1979→2004).  
Source: https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens  
Confidence: HIGH.

---

### Psyche (spacecraft)
**Verdict: ISSUES**

🟡 **[i18n-src + static] `description` / `best_known_for` — Mars flyby date wrong**  
File: `i18n-src/en-US/fleet/orbiter/psyche-spacecraft.json`, field: `description`  
Quote: "uses … a 2026 Mars gravity assist en route to a 2029 Psyche rendezvous"  
Status: The Mars flyby occurred on 2026-05-15 — so "2026 Mars gravity assist" is technically still future at the time of writing but has already occurred as of the review date (2026-07-14). The date itself is correct. No error.

🔵 **[static] `best_known_for` — "first interplanetary mission" with Hall thrusters is the correct superlative**  
File: `static/data/fleet/orbiter/psyche-spacecraft.json`, field: `best_known_for`  
Quote: "Hall-effect ion-thruster cruise to a 2029 Psyche rendezvous"  
Note: Confirmed first interplanetary use of Hall-effect thrusters (SPT-140). Mars flyby completed 2026-05-15, Psyche arrival now expected August 2029. Entry is accurate. Mark as informational note only.  
Source: https://www.jpl.nasa.gov/press-kits/psyche/mission/  
Confidence: HIGH.

🟡 **[static] `best_known_for` — asteroid Psyche size given in i18n description as 226 km, needs verification**  
File: `i18n-src/en-US/fleet/orbiter/psyche-spacecraft.json`, field: `description`  
Quote: "a 226-km M-type asteroid"  
What's wrong: The asteroid 16 Psyche's dimensions are approximately 280×232×189 km (triaxial ellipsoid). A single "226-km" figure is a rough mean diameter approximation and not wrong per se, but it should be "~280 km × ~230 km" or simply "~230 km across" for accuracy.  
Correction: "~230-km M-type asteroid" or specify it is a mean diameter.  
Source: https://en.wikipedia.org/wiki/Psyche_(spacecraft)  
Confidence: MEDIUM — "226 km" is within range; precision could be better.

---

### Rosetta
**Verdict: PASS — all key facts verified**

Rendezvous with 67P: 2014-08-06 confirmed.  
Philae landing: 2014-11-12 confirmed (bounced, settled in shadow).  
Rosetta crash-landing: 2016-09-30 confirmed.  
No factual errors found. Entry is a skeleton with limited claims; all verified.

---

### SMART-1
**Verdict: ISSUES**

🟠 **[static] `epoch` field mislabeled**  
File: `static/data/fleet/orbiter/smart-1.json`, field: `epoch`  
Quote: `"epoch": "shuttle-and-mir"`  
What's wrong: SMART-1 launched 2003-09-27. The "shuttle-and-mir" epoch in Orrery's own schema corresponds to the Shuttle + Mir era (roughly 1986–1998, ending with Mir deorbit in 2001). By 2003, Mir was already gone (deorbited 2001-03-23) and ISS assembly was well underway. SMART-1's correct epoch is `"iss-assembly"` — the same epoch used by Rosetta (launched 2004-03-02, epoch `iss-assembly`).  
Correction: Change `"epoch"` from `"shuttle-and-mir"` to `"iss-assembly"`.  
Source: https://en.wikipedia.org/wiki/SMART-1 (launched 2003); Mir deorbit 2001  
Confidence: HIGH — clear internal inconsistency vs. Rosetta (2004, iss-assembly) and against SMART-1's own launch date.

All narrative claims verified: PPS-1350 Hall thruster, Ariane 5 shared launch, 13-month spiral, lunar capture 2004-11-15, 16-month polar orbit, impact 2006-09-03, Lacus Excellentiae location, CFHT observation of impact flash — all confirmed accurate.

---

### Solar Orbiter
**Verdict: PASS — all key facts verified**

0.28 AU perihelion confirmed (inside Mercury's 0.31 AU perihelion).  
~33° heliographic inclination via Venus assists confirmed.  
Launch 2020-02-10 on Atlas V 411 confirmed.  
First perihelion 2020-06-15 at 0.51 AU confirmed.  
"First to image Sun's polar regions in detail" is the correct superlative — Solar Orbiter is the first to combine high inclination with close perihelion for polar imaging; entry is accurate.  
No issues.

---

### Tianwen-1
**Verdict: PASS — all key facts verified**

Zhurong rover landing: 2021-05-14 UTC in Utopia Planitia confirmed.  
Orbiter continues solo science operations confirmed.  
"First Chinese Mars mission" — correct; first CNSA Mars orbiter + lander + rover combination.  
No issues.

---

### Ulysses
**Verdict: ISSUES**

🟡 **[static] `best_known_for` — "18 years" survey period is slightly overstated**  
File: `static/data/fleet/orbiter/ulysses.json`, field: `best_known_for`  
Quote: "surveyed the heliosphere for 18 years"  
What's wrong: Ulysses launched 1990-10-06, mission ended 2009-06-30. That is 18 years and ~8 months — "18 years" is acceptable as a rounded figure. However, its actual active solar science began after the Jupiter flyby in February 1992, giving ~17.5 years of heliospheric/polar science. "18 years" counting from launch is accurate enough.  
Note: The `credit` field correctly states "mission ended 2009-06-30 when the X-band transmitter heater failed" — this is verified accurate.

What is actually slightly wrong: The `credit` description says "Three complete polar orbits gave us…" but ESA's own records show Ulysses completed approximately 2.5 solar orbits and made three sets of polar passes (not three complete polar orbits). The passes are: south pole 1994, north pole 1995 (one orbit); south 2000, north 2001 (second orbit); south 2007, north 2008 (third orbit, partially completed). This is technically three polar passes per pole, not "three complete polar orbits."  
Correction: "Three pairs of polar passes" or "three solar orbits" (it actually completed approximately 2.5 orbits). Source confirms "completed 2-1/2 solar orbits."  
Source: https://sci.esa.int/web/ulysses/-/41197-polar-passes  
Confidence: MEDIUM — "three complete polar orbits" vs "2.5 solar orbits / three polar pass pairs" — nuanced but inaccurate.

---

### Vega 1
**Verdict: ISSUES**

🟠 **[static] `agency` field incorrectly lists ESA**  
File: `static/data/fleet/orbiter/vega-1.json`, field: `agency`  
Quote: `"agency": "Roscosmos / ESA"`  
What's wrong: Vega 1 was a Soviet/USSR mission operated by IKI (Space Research Institute) and the broader Soviet space program via Interkosmos framework. ESA contributed a single instrument (the APV-V wave/plasma analyzer from ESTEC) and coordinated tracking support for the Halley encounter, but ESA was not a mission agency or co-operator. The mission was Soviet — ESA was a cooperative scientific partner, not an agency principal. Listing "Roscosmos / ESA" implies co-equal agency status which is factually incorrect. Note also: in 1984, "Roscosmos" did not yet exist as an agency — it was created in 1992. The correct agency is "Soviet IKI / Interkosmos" or simply "USSR."  
Correction: `"agency": "Soviet IKI"` or `"USSR"` with cooperative partners noted in `credit`.  
Source: https://en.wikipedia.org/wiki/Vega_1; https://en.wikipedia.org/wiki/Vega_program  
Confidence: HIGH.

🔵 **[static] `country` field partially correct**  
File: `static/data/fleet/orbiter/vega-1.json`, field: `country`  
Quote: `"country": "USSR / Russia"`  
Note: "USSR / Russia" is a reasonable historical notation (mission was Soviet, successor state is Russia). Acceptable as-is but could be simplified to "USSR" since the mission was 1984–1986.

---

### Vega 2
**Verdict: ISSUES**

🟠 **[static] `agency` field incorrectly lists ESA (same error as Vega 1)**  
File: `static/data/fleet/orbiter/vega-2.json`, field: `agency`  
Quote: `"agency": "Roscosmos / ESA"`  
Same issue as Vega 1. ESA was not an agency principal for Vega 2.  
Correction: `"agency": "Soviet IKI"` or `"USSR"`.  
Source: https://en.wikipedia.org/wiki/Vega_2; https://en.wikipedia.org/wiki/Vega_program  
Confidence: HIGH.

---

### Viking 1 Orbiter
**Verdict: ISSUES**

🟡 **[static + i18n-src] `best_known_for` / `credit` — orbit decay forecast outdated**  
File: `static/data/fleet/orbiter/viking1-orbiter.json`, field: `credit`  
Quote: "Deliberately raised to a 357 × 33614 km park orbit that's expected to remain stable through ~2024 (decayed ~2025 per Aerospace Corp re-entry forecast)."  
What's wrong: The orbit was raised to a higher park orbit (Wikipedia states 320 × 56,000 km, not the figures cited) to prevent Mars impact until at least 2019. A 2009 analysis concluded the spacecraft most likely remained in orbit past that date. The entry's "357 × 33614 km" and "~2024 / ~2025" decay forecast is likely outdated or inaccurate. Wikipedia states the orbit was raised to "320 × 56,000 km" — the "357 × 33614 km" figure may refer to the pre-maneuver orbit. The "decayed ~2025" claim lacks a citable source and contradicts the Wikipedia statement that it could remain stable well past 2019.  
Correction: Use the Wikipedia-sourced post-maneuver orbit (320 × 56,000 km); remove the specific "decayed ~2025" claim unless a primary source is available; say "orbit was raised in 1980 to prevent Mars impact; current status unconfirmed."  
Source: https://en.wikipedia.org/wiki/Viking_1  
Confidence: MEDIUM — orbit figures need primary source verification; the decay date claim is unverified.

---

### Voyager 1
**Verdict: ISSUES**

🟡 **[i18n-src] `description` — distance figure stale**  
File: `i18n-src/en-US/fleet/orbiter/voyager-1.json`, field: `description`  
Quote: "over 24 billion kilometers from the Sun and growing"  
What's wrong: As of July 2026, Voyager 1 is approximately 25.5–25.9 billion km from the Sun (≈172–175 AU). The "24 billion km" figure was accurate at some earlier point but is now ≥6% low.  
Correction: Update to "over 25 billion kilometers" or, better, use a non-specific formulation like "more than 170 AU from the Sun" to avoid requiring repeated updates.  
Source: https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/  
Confidence: HIGH — multiple independent sources place V1 well past 25 billion km as of mid-2026.

Note: The entry does NOT claim Voyager 1 visited all four giant planets (it visited Jupiter and Saturn only) — this trap is correctly handled. The "first spacecraft to enter interstellar space" superlative is implicit in "most distant human-made object" and is accurate. Heliopause crossing 2012-08-25 confirmed.

---

### Voyager 2
**Verdict: PASS — all key facts verified**

"Only spacecraft to visit all four giant planets" — confirmed correct; Jupiter 1979, Saturn 1981, Uranus 1986, Neptune 1989.  
Heliopause crossing November 2018 confirmed (November 5, 2018 at 119 AU).  
"Followed its twin Voyager 1 into interstellar space" — correct; Voyager 1 crossed 2012, Voyager 2 crossed 2018.  
No issues.

---

## Summary of changes needed

| Priority | Entry | Field | Fix |
|---|---|---|---|
| 🟠 | pioneer-11 | `best_known_for` (both files) | "22 years before Cassini" → "25 years before Cassini" |
| 🟠 | phobos-2 | `description` (i18n-src) | "thruster failure" → "on-board computer failure causing loss of attitude control and power" |
| 🟠 | smart-1 | `epoch` (static) | `shuttle-and-mir` → `iss-assembly` |
| 🟠 | vega-1 | `agency` (static) | `Roscosmos / ESA` → `Soviet IKI` (or `USSR`) |
| 🟠 | vega-2 | `agency` (static) | `Roscosmos / ESA` → `Soviet IKI` (or `USSR`) |
| 🟡 | mro | `era` (static) | `1981-2011` → `2011-now` |
| 🟡 | parker-solar-probe | `description` (i18n-src) | `192 km/s` → `192.22 km/s` for precision |
| 🟡 | phobos-2 | `description` (i18n-src) | "Two final images" → note the 37 total images returned |
| 🟡 | pioneer-11 | `credit` (static) | Epimetheus "rediscovery" → "close encounter with an inner moon later identified as Epimetheus or Janus" |
| 🟡 | psyche-spacecraft | `description` (i18n-src) | "226-km" → "~230-km" (mean diameter) |
| 🟡 | ulysses | `credit` (static) | "Three complete polar orbits" → "three pairs of polar passes (≈2.5 solar orbits)" |
| 🟡 | viking1-orbiter | `credit` (static) | Verify orbit figures; remove unverified "decayed ~2025" decay date |
| 🟡 | voyager-1 | `description` (i18n-src) | "24 billion km" → "over 25 billion km" (or use AU) |

---

*Sources: Wikipedia (Pioneer 10/11, Phobos 2, SMART-1, Vega 1/2, Viking 1, Voyager 1/2, Rosetta, Parker Solar Probe); NASA Science/JPL mission pages; ESA mission pages; Guinness World Records (PSP speed); NASA JPL Voyager mission status; Space.com / NASA for Psyche Mars flyby (2026-05-15 confirmed).*
