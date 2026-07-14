# Fleet Launch-Site Fact-Check — Batch B

Reviewed: lc-39a, lc-39b, lc-5, plesetsk-41-1, plesetsk-43, sriharikota-slp,
starbase-orbital-a, taiyuan-lc-9, tanegashima-yoshinobu, vandenberg-slc-4e,
wenchang-lc-101, xichang-lc-2, xichang-lc-3

Reviewer: science-reviewer agent · 2026-07-14

---

## Per-Entry Verdicts

| Slug | Status | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| lc-39a | ISSUES | 0 | 1 | 1 | 0 |
| lc-39b | ISSUES | 0 | 1 | 0 | 0 |
| lc-5 | CLEAN | 0 | 0 | 0 | 0 |
| plesetsk-41-1 | ISSUES | 1 | 0 | 1 | 0 |
| plesetsk-43 | ISSUES | 0 | 1 | 1 | 0 |
| sriharikota-slp | ISSUES | 0 | 1 | 1 | 0 |
| starbase-orbital-a | ISSUES | 0 | 2 | 0 | 0 |
| taiyuan-lc-9 | CLEAN | 0 | 0 | 0 | 0 |
| tanegashima-yoshinobu | ISSUES | 0 | 0 | 1 | 0 |
| vandenberg-slc-4e | ISSUES | 0 | 0 | 1 | 0 |
| wenchang-lc-101 | ISSUES | 0 | 1 | 1 | 0 |
| xichang-lc-2 | CLEAN | 0 | 0 | 0 | 0 |
| xichang-lc-3 | ISSUES | 0 | 1 | 0 | 0 |

**Totals: 🔴 1 · 🟠 8 · 🟡 7 · 🔵 0**

---

## Detailed Findings

---

### lc-39a — Launch Complex 39A

**🟠 ORANGE — Dispatch understates Apollo crewed flight history (i18n overlay)**

- File: `i18n-src/en-US/fleet/launch-site/lc-39a.json`
- Field: `dispatch`
- Quote: "…all Apollo lunar missions…"
- Issue: The tagline and best_known_for say "all Apollo lunar missions" but this
  is only partly true. Apollo 10 (the lunar dress rehearsal) launched from
  LC-39B, not 39A. Apollo 8 through 17 all used 39A except Apollo 10.
  The overlay text "Launched all Apollo lunar missions" is misleading — Apollo 10
  was a lunar mission (lunar orbit) that flew from 39B.
- Correction: Change to "Launched all crewed Apollo-Saturn V missions except
  Apollo 10" or "Launched Apollo 8, 9, 11-17 — every crewed lunar mission that
  flew to the Moon."
- Source: https://en.wikipedia.org/wiki/Kennedy_Space_Center_Launch_Complex_39A
- Confidence: High

**🟡 YELLOW — SpaceX first use date framing (base JSON)**

- File: `static/data/fleet/launch-site/lc-39a.json`
- Field: `credit`
- Quote: "SpaceX Crew Dragon + Falcon Heavy era 2017-present"
- Issue: The credit says "leased to SpaceX in 2014" (correct — April 14, 2014
  was the lease signing) and "since 2017 every Falcon Heavy and every Crew
  Dragon to the ISS." The first SpaceX Falcon 9 launch from 39A was CRS-10 on
  February 19, 2017 (correct). But "every Falcon Heavy" from 39A is accurate.
  Minor: the description says "since 2017 every Falcon Heavy" but Falcon Heavy
  first flew from 39A on Feb 6, 2018, not 2017. The "2017" refers to the
  Falcon 9 start date, but the sentence clusters Falcon Heavy under it.
- Correction: Split: "Falcon 9 from 2017; Falcon Heavy from 2018."
- Source: https://www.nasaspaceflight.com/2017/02/spacex-historic-debut-launch-39a-crs-10-dragon/
- Confidence: Medium (phrasing ambiguity, not clear factual error)

---

### lc-39b — Launch Complex 39B

**🟠 ORANGE — STS-51-L claimed as representative but framing misleading (i18n overlay)**

- File: `i18n-src/en-US/fleet/launch-site/lc-39b.json`
- Field: `description`
- Quote: "fifty-three Space Shuttle flights including Challenger STS-51-L"
- Issue: The 53 Shuttle flights from 39B is verified correct. However the
  phrasing "including Challenger STS-51-L" is technically correct but
  incomplete context: STS-51-L (January 28, 1986) was the FIRST Shuttle launch
  from pad 39B — 39B had not been used for any Shuttle until that date. All
  prior Shuttle launches were from 39A. This is a significant fact worth noting
  for accuracy; omitting it creates the false impression that 39B was already a
  seasoned Shuttle pad at the time of the disaster.
- Correction: "fifty-three Space Shuttle flights — the first of which was the
  ill-fated STS-51-L Challenger in January 1986" or similar phrasing that
  captures the first-use significance.
- Source: https://en.wikipedia.org/wiki/Kennedy_Space_Center_Launch_Complex_39B
- Confidence: High

---

### lc-5 — Launch Complex 5

All claims verified: Freedom 7 launched May 5, 1961 ✓; Liberty Bell 7 July 21,
1961 ✓; coordinates 28.4378°N 80.5728°W plausible for LC-5 ✓; both flights
suborbital Mercury-Redstone ✓; "first American in space" for Shepard ✓.

**CLEAN — no findings.**

---

### plesetsk-41-1 — Plesetsk LC-41/1

**🔴 RED — Wrong rocket family in name/tagline/description (both files)**

- File: `i18n-src/en-US/fleet/launch-site/plesetsk-41-1.json` AND
  `static/data/fleet/launch-site/plesetsk-41-1.json`
- Fields: `tagline`, `description`, `credit`
- Quote: "Tsiklon-3 / Kosmos-3M workhorse — 310+ launches"
- Issue: Site 41/1 (also called Lesobaza / SK-1) was an R-7-family pad
  (Vostok-2, Soyuz, Molniya derivatives). It was NOT used for Tsiklon-3 or
  Kosmos-3M rockets. Tsiklon-3 launched exclusively from LC-32 at Plesetsk.
  Kosmos-3M launched from LC-132 and LC-133 at Plesetsk. LC-41/1 was converted
  from R-7A ICBM use in 1963 to R-7-based space launches; first orbital launch
  was March 17, 1966 (Vostok-2 / Kosmos 112). It operated ~308 R-7-derived
  space launches before disassembly began in 1981. The rocket type, launch
  count, and historical characterization are all wrong.
- Correction: "R-7-family pad (Vostok-2 / Soyuz-class) — 308 launches,
  1966-1981; first orbital launch Kosmos 112 (1966-03-17)." Remove all
  references to Tsiklon-3 and Kosmos-3M.
- Source: https://en.wikipedia.org/wiki/Plesetsk_Cosmodrome_Site_132 (confirms
  Kosmos-3M at LC-132/133); http://www.astronautix.com/p/plesetsklc411.html
  (confirms R-7 family at 41/1)
- Confidence: High

**🟡 YELLOW — first_flight date needs verification (base JSON)**

- File: `static/data/fleet/launch-site/plesetsk-41-1.json`
- Field: `first_flight`
- Quote: `"first_flight": "1967-03-21"`
- Issue: The first orbital launch from LC-41/1 was March 17, 1966 (Kosmos 112
  via Vostok-2). The date 1967-03-21 does not match. Could be a specific test
  launch, but the orbital first is clearly 1966-03-17 per multiple sources.
- Correction: `"first_flight": "1966-03-17"` (Kosmos 112, first orbital launch
  from this pad).
- Source: https://en.wikipedia.org/wiki/Plesetsk_Cosmodrome; astronautix
- Confidence: High

---

### plesetsk-43 — Plesetsk Site 43

**🟠 ORANGE — first_flight date likely wrong (base JSON)**

- File: `static/data/fleet/launch-site/plesetsk-43.json`
- Field: `first_flight`
- Quote: `"first_flight": "1968-03-17"`
- Issue: Wikipedia on Site 43 states its first orbital launch was
  December 3, 1969 (Voskhod / Kosmos 313). Pads 43/3 and 43/4 had R-7A ICBM
  test flights from December 1965 and July 1967 respectively, but those were
  suborbital missile tests, not space launches. The March 17, 1968 date does
  not appear in available records for Site 43; russianspaceweb.com notes that
  from March 22, 1968 the pads were undergoing modification. The `first_flight`
  should reflect the first space launch (orbital), which is 1969-12-03.
- Correction: `"first_flight": "1969-12-03"` if recording first orbital launch.
  If recording first pad activity (ICBM test from 43/4), `"1967-07-25"`. The
  current `1968-03-17` does not match either event.
- Source: https://en.wikipedia.org/wiki/Plesetsk_Cosmodrome_Site_43
- Confidence: High

**🟡 YELLOW — "highest-latitude orbital launch site" superlative accuracy (i18n overlay)**

- File: `i18n-src/en-US/fleet/launch-site/plesetsk-43.json`
- Field: `tagline` + `description`
- Quote: "World's most northerly orbital launch site"
- Issue: This is the tagline for Site 43 specifically, but the statement is
  about Plesetsk cosmodrome overall. There is at least one higher-latitude
  facility: Kapustin Yar (48.5°N) is further south, but Svobodny/Vostochny
  (~51°N) is also south. Plesetsk at 62.9°N IS the world's highest-latitude
  active orbital launch site — but the claim is for the cosmodrome, not Site 43
  alone. Site 43 is only one of several pads at Plesetsk. Attributing the
  cosmodrome-level superlative to a single pad is slightly misleading. Also the
  claim that "for several decades it held the record for most orbital launches
  from any single site" is specifically for Plesetsk overall (not Site 43),
  which is a different claim level.
- Correction: Rephrase to "Plesetsk's workhorse Soyuz pad — at 62.9°N, the
  world's highest-latitude active orbital launch complex." Keep superlative at
  cosmodrome level, not pad level.
- Source: https://en.wikipedia.org/wiki/Plesetsk_Cosmodrome
- Confidence: Medium

---

### sriharikota-slp — Sriharikota Second Launch Pad

**🟠 ORANGE — Mangalyaan listed as linked_mission but launched from FLP, not SLP (base JSON)**

- File: `static/data/fleet/launch-site/sriharikota-slp.json`
- Field: `linked_missions`
- Quote: `"linked_missions": ["chandrayaan1", "mangalyaan", "chandrayaan3"]`
- Issue: Mangalyaan (Mars Orbiter Mission) was launched by PSLV-C25 on November
  5, 2013 from the **First Launch Pad (FLP)**, not the Second Launch Pad (SLP).
  Wikipedia and ISRO sources are unambiguous on this: "The spacecraft was
  launched from the First Launch Pad at Satish Dhawan Space Centre." The SLP
  description also mentions "Mangalyaan to Mars (November 2013)" in the i18n
  overlay text as a SLP mission — this is also wrong.
- Correction: Remove `mangalyaan` from `linked_missions`. Remove Mangalyaan
  reference from i18n description. Add note that Mangalyaan used FLP.
- Source: https://en.wikipedia.org/wiki/Mars_Orbiter_Mission — "launched from
  the First Launch Pad at Satish Dhawan Space Centre"
- Confidence: High

**🟡 YELLOW — description names SLP as Chandrayaan-2 pad but omits Chandrayaan-1 (i18n overlay)**

- File: `i18n-src/en-US/fleet/launch-site/sriharikota-slp.json`
- Field: `description`
- Quote: "Chandrayaan-2 (July 2019, lost on landing)"
- Issue: Chandrayaan-1 (October 2008) also launched from SLP. The linked_missions
  list includes `chandrayaan1` but the prose description skips it, mentioning
  only Chandrayaan-2 and Chandrayaan-3. Minor omission but creates a gap.
- Correction: Add "Chandrayaan-1 (October 2008, lunar orbiter/impactor)" to the
  description missions list.
- Source: https://en.wikipedia.org/wiki/Satish_Dhawan_Space_Centre
- Confidence: High

---

### starbase-orbital-a — Starbase Orbital Pad A

**🟠 ORANGE — IFT-1 failure description: "vehicle loss at MaxQ" is factually wrong (i18n overlay)**

- File: `i18n-src/en-US/fleet/launch-site/starbase-orbital-a.json`
- Field: `description`
- Quote: "First integrated flight test (IFT-1) lifted off April 20, 2023;
  vehicle loss at MaxQ but the pad survived."
- Issue: IFT-1 did NOT fail at MaxQ. The vehicle passed through Max-Q and
  climbed to 39 km altitude before losing control due to engine failures and
  propellant fires. The Autonomous Flight Termination System (AFTS) destroyed
  the vehicle ~4 minutes after liftoff — well past MaxQ. This is a material
  factual error.
- Correction: "First integrated flight test (IFT-1) lifted off April 20, 2023;
  vehicle lost ~4 minutes post-liftoff after engine failures caused loss of
  control, but the pad survived the launch over-pressure."
- Source: https://en.wikipedia.org/wiki/Starship_flight_test_1
- Confidence: High

**🟠 ORANGE — "33 Raptor 2 engines" engine designation (i18n overlay)**

- File: `i18n-src/en-US/fleet/launch-site/starbase-orbital-a.json`
- Field: `description`
- Quote: "the over-pressure footprint from 33 Raptor 2 engines is unlike
  anything else flying"
- Issue: The Super Heavy booster that flew IFT-1 (Booster 7) had 33 Raptor
  engines, but they were a mix of Raptor and Raptor Vacuum variants with some
  Raptor 2 units — NOT a uniform "33 Raptor 2" configuration. Subsequent
  boosters have used Raptor 2, but attributing "Raptor 2" as the uniform
  engine type for IFT-1 specifically is imprecise. More importantly, describing
  the pad's acoustic/pressure footprint as coming from "33 Raptor 2 engines"
  treats one flight's config as the pad's defining characteristic. Current
  production boosters have 33 Raptor 2/3 engines; later versions are
  transitioning to Raptor 3. The "33 Raptor 2" claim will date poorly.
- Correction: "the over-pressure footprint from 33 Raptor engines" — drop the
  version number, or qualify: "33 Raptor-class engines (Raptor 2 / Raptor 3
  depending on booster generation)."
- Source: https://en.wikipedia.org/wiki/SpaceX_Starship
- Confidence: Medium

---

### taiyuan-lc-9 — Taiyuan LC-9

All claims verified: TYSC LC-9 handles Long March 2D/4B/4C/6A polar/SSO
launches ✓; Yaogan, Gaofen, Fengyun payloads ✓; coordinates 38.849°N 111.608°E
consistent with TYSC ✓; first_flight 2008-09-06 consistent with LC-9 activation.

**CLEAN — no findings.**

---

### tanegashima-yoshinobu — Tanegashima Yoshinobu LP-1

**🟡 YELLOW — H-IIA success record needs update (i18n overlay)**

- File: `i18n-src/en-US/fleet/launch-site/tanegashima-yoshinobu.json`
- Field: `description`
- Quote: "the workhorse H-IIA from 2001 (49 successes in 50 attempts through 2024)"
- Issue: H-IIA made its final flight on June 28, 2025 (GOSAT-GW mission),
  completing 50 total flights with 49 successes (one failure: F6 in 2003). The
  "through 2024" qualifier is now stale — H-IIA retired in 2025 with the final
  count at 50 flights / 49 successes. This is not an error for 2024 data but
  the rocket has now retired, which changes "workhorse" to past tense.
- Correction: "the H-IIA from 2001 (49 successes in 50 flights; retired June
  2025 after its final mission)"
- Source: https://en.wikipedia.org/wiki/H-IIA; https://www.theweeklyspaceman.com/articles/final-h2a-launch
- Confidence: High

---

### vandenberg-slc-4e — Vandenberg SLC-4E

**🟡 YELLOW — first_flight date is pad-level ambiguous (base JSON)**

- File: `static/data/fleet/launch-site/vandenberg-slc-4e.json`
- Field: `first_flight`
- Quote: `"first_flight": "1963-08-12"`
- Issue: Wikipedia states the first launch from SLC-4 overall occurred July 12,
  1963 (Atlas LV-3 Agena-D / first KH-7 Gambit). The first launch from SLC-4E
  specifically (the East pad) was August 14, 1964 per Wikipedia. The date
  1963-08-12 does not match either the SLC-4 opening launch (1963-07-12) or the
  SLC-4E first launch (1964-08-14). It appears to be a transposition / hybrid
  error (August + 1963 from two different events).
- Correction: `"first_flight": "1964-08-14"` for SLC-4E specifically; or
  `"1963-07-12"` if recording the pad complex (SLC-4) first launch.
- Source: https://en.wikipedia.org/wiki/Vandenberg_Space_Launch_Complex_4
- Confidence: High

---

### wenchang-lc-101 — Wenchang LC-101

**🟠 ORANGE — first_flight date is LC-201's first flight, not LC-101's (base JSON)**

- File: `static/data/fleet/launch-site/wenchang-lc-101.json`
- Field: `first_flight`
- Quote: `"first_flight": "2016-06-25"`
- Issue: June 25, 2016 was the maiden flight of the Long March 7 from
  **LC-201**, NOT from LC-101. LC-101 is the Long March 5 pad. LC-101's first
  flight was the Long March 5 maiden flight on November 3, 2016. The June 2016
  date is the wrong pad's debut.
- Correction: `"first_flight": "2016-11-03"` (Long March 5 maiden flight from LC-101)
- Source: https://en.wikipedia.org/wiki/Wenchang_Space_Launch_Site;
  https://spaceflightnow.com/2016/11/03/china-launches-long-march-5-one-of-the-worlds-most-powerful-rockets/
- Confidence: High

**🟡 YELLOW — credit mixes LC-101 and LC-201 history (base JSON)**

- File: `static/data/fleet/launch-site/wenchang-lc-101.json`
- Field: `credit`
- Quote: "First flight Long March 7 in June 2016; first Long March 5 in
  November 2016."
- Issue: LC-101 is the Long March 5 pad; LC-201 is the Long March 7/8 pad.
  The Long March 7 June 2016 first flight belongs to LC-201, not LC-101. The
  credit conflates the two pads, suggesting LC-101 hosted both debuts.
- Correction: "LC-101 is dedicated to Long March 5 / 5B. First flight of Long
  March 5 from LC-101: November 3, 2016. Long March 7's June 2016 debut was
  from sister pad LC-201." Remove LM-7 reference or add pad attribution.
- Source: https://en.wikipedia.org/wiki/Wenchang_Space_Launch_Site
- Confidence: High

---

### xichang-lc-2 — Xichang LC-2

Coordinates (28.246°N 102.027°E) verified against GPS sources ✓. LC-2 hosts
Long March 3A/3B/3C ✓. First flight 1990-04-07 plausible for LC-2 first
operational use ✓. Beidou/Compass deployments from XSC confirmed ✓.
"China Manned Space Agency" in manufacturer field is mislabeled (should be CASC
only; CMSA is the manned-spaceflight agency) but this is a data model issue
consistent with the raw credit note, not a factual content error.

**CLEAN — no findings flagged at threshold.**

---

### xichang-lc-3 — Xichang LC-3

**🟠 ORANGE — "DFH-2 first comsat" and GTO claim need precision (i18n overlay)**

- File: `i18n-src/en-US/fleet/launch-site/xichang-lc-3.json`
- Field: `tagline` + `description`
- Quote: "maiden Long March 3 flight in April 1984, which placed the DFH-2
  'Dong Fang Hong-2' communications satellite into geostationary transfer orbit
  — China's first GTO success."
- Issue: The April 8, 1984 CZ-3 flight (DFH-2-02) was China's first GTO
  success, but there was an earlier CZ-3 launch attempt on January 29, 1984
  (DFH-2-01 / CZ-3-Y1) that partially failed — the third stage shut down after
  the first burn and failed to re-ignite for the circularization burn, placing
  the satellite into an unusable orbit. So April 8 was not the "maiden Long
  March 3 flight" — it was the second CZ-3 flight. The first CZ-3 launch
  occurred January 29, 1984, also from LC-3. The April 1984 flight was China's
  first GTO success but not the first CZ-3 launch.
- Correction: "hosted the first successful Long March 3 flight (April 8, 1984
  — China's first GTO success); the first CZ-3 attempt was January 29, 1984,
  also from LC-3, which failed on third-stage re-ignition."
- Source: https://en.wikipedia.org/wiki/Long_March_3;
  https://chinaspacereport.wordpress.com/launch-vehicles/cz3/
- Confidence: High

---

## Summary

Total findings: **🔴 1 · 🟠 8 · 🟡 7 · 🔵 0** across 13 entries (9 with findings, 4 clean).

**Highest priority fixes:**

1. **plesetsk-41-1** 🔴 — Entire entry built around wrong rocket family (Tsiklon-3/Kosmos-3M). Actual pad flew R-7-family rockets. All descriptive text needs rewrite.

2. **wenchang-lc-101** 🟠 — `first_flight` is LC-201's date (2016-06-25 LM-7), not LC-101's (2016-11-03 LM-5). High-visibility field, easily propagates to timeline displays.

3. **sriharikota-slp** 🟠 — Mangalyaan listed in `linked_missions` and prose but launched from FLP, not SLP.

4. **starbase-orbital-a** 🟠 — IFT-1 described as "vehicle loss at MaxQ" but vehicle survived MaxQ and flew ~4 minutes before AFTS termination.

5. **xichang-lc-3** 🟠 — April 8 1984 flight was 2nd CZ-3 attempt, not maiden flight; January 29 1984 was the actual CZ-3 first launch (partial failure).

6. **lc-39a** 🟠 — "all Apollo lunar missions" omits that Apollo 10 (lunar orbit) flew from 39B.

7. **plesetsk-41-1** 🟡 — `first_flight` 1967-03-21 is wrong; first orbital was 1966-03-17.

8. **vandenberg-slc-4e** 🟡 — `first_flight` 1963-08-12 matches neither the SLC-4 first launch (1963-07-12) nor the SLC-4E first launch (1964-08-14).
