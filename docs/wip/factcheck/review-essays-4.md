# Fact-check: seven-minutes.json + the-body-in-the-dark.json

Reviewed: 2026-07-14
Checker: Claude (sonnet-4-6), web-verified claims
Essays: `i18n-src/en-US/essays/seven-minutes.json`, `i18n-src/en-US/essays/the-body-in-the-dark.json`

---

## seven-minutes.json

### RED findings

#### SM-1 — Schiaparelli impact speed significantly understated

**Claim:** "hit the ground at roughly 300 kilometres per hour"

**Correct:** ESA's official Schiaparelli Anomaly Inquiry report gives the estimated impact speed as **540 km/h**. The essay's figure is ~56% of the real value — a material understatement. The 300 km/h figure appears in some early press reports and in the Wikipedia article (which describes it as "near terminal velocity"), but the primary ESA source is unambiguous: 540 km/h.

Source: ESA Schiaparelli Anomaly Inquiry (2017) — confirmed by WebFetch of the ESA investigation page and the SpaceNews/Space.com reports that quote the official inquiry.

---

#### SM-2 — Schiaparelli failure characterised incorrectly

**Claim:** "a corrupted gyroscope reading that caused the onboard computer to believe it was already below the surface"

**Correct:** The failure was caused by **IMU saturation**, not a corrupted reading. As the parachute opened, unexpected violent oscillations exceeded the measurement range of the Inertial Measurement Unit for approximately one second. The IMU returned a saturated (maxed-out) value that persisted longer than expected, producing a large attitude estimation error. The guidance software concluded the lander was below ground level and triggered premature parachute jettison + minimal thruster firing. There was no data corruption — the sensor was simply operating outside its design envelope. "Corrupted gyroscope reading" mischaracterises both the hardware (IMU, not just a gyroscope) and the failure mode (saturation, not corruption).

Source: ESA Schiaparelli Anomaly Inquiry; ESA official investigation page; SpaceNews "Bad IMU Data Doomed ESA's Schiaparelli Lander."

---

### ORANGE findings

#### SM-3 — Mars entry speed slightly understated

**Claim:** "from the first bite of atmosphere at roughly 19,000 kilometres per hour"

**Correct:** NASA's official Perseverance EDL documentation and JPL press kit give the entry speed as **~20,000 km/h** (12,500 mph). "Roughly 19,000" is ~5% low; 20,000 km/h is the standard figure used in all official NASA EDL materials for both Curiosity and Perseverance. This is a minor but specific technical claim that is off by a round number.

Source: NASA Mars 2020 EDL page (mars.nasa.gov/mars2020/timeline/landing/entry-descent-landing/); SciTechDaily EDL article citing ~12,500 mph.

---

#### SM-4 — Schiaparelli thruster duration: "less than four seconds" correct but imprecise

**Claim:** "fired the retrorockets for less than four seconds instead of thirty"

**Correct:** The thrusters fired for exactly **3 seconds** instead of 30. The essay's phrasing ("less than four seconds") is technically true but oddly vague given that the exact duration is documented. Recommend sharpening to "about three seconds."

Source: ESA official investigation page; Space.com ESA inquiry article.

---

### YELLOW findings

#### SM-5 — Venera 13 temperature

**Claim:** "465-degree Celsius atmosphere"

**Correct:** The Venera 13 probe measured **457°C** at its specific landing site (east of Phoebe Regio, slightly elevated above mean planetary radius). The general Venusian surface average is ~467°C. 465°C is not sourced to the Venera 13 measurement specifically; it sits between the two figures and appears in some secondary sources. The precise measured value for that landing site is 457°C (per Wikipedia Venera 13 article and ESA/NASA datasets). This is a 2% error on a secondary number — yellow rather than orange given the natural surface variation.

---

#### SM-6 — Schiaparelli description: "gyroscope" vs "IMU"

Part of SM-2. Additionally: the essay uses "gyroscope" as the failing component. The hardware is an Inertial Measurement Unit (IMU), which contains gyroscopes but is a distinct, broader system. This is a secondary terminology inaccuracy already flagged in SM-2.

---

### GREEN (verified correct)

- "Seven minutes" duration for Curiosity/Perseverance EDL — confirmed
- Round-trip light-lag "six to forty-four minutes" — confirmed (one-way range: ~3–22 min)
- Curiosity "nearly 900" kg mass — confirmed (899 kg)
- Sky crane used for both Curiosity (2012) and Perseverance (2021) — confirmed
- Perseverance landed "February 18, 2021" in Jezero Crater — confirmed
- Curiosity landed "August 6, 2012" in Gale Crater at 2:32 am California time — confirmed
- Pathfinder: July 4, 1997, Ares Vallis, "bounced at least fifteen times", speed "about 50 km/h" — confirmed (14 m/s ≈ 50.4 km/h; bounce count ≥15)
- Viking 1: landed 1976, "ran for more than six years" — confirmed (2,306 Earth days ≈ 6.3 years)
- Venera 13: landed March 1, 1982; expected life "thirty-two minutes"; actual 127 minutes; 89× Earth pressure — all confirmed
- Huygens: released "Christmas Day 2004," hit Titan atmosphere "January 14, 2005"; descent "two hours and twenty-seven minutes"; surface transmission "seventy-two minutes" — all confirmed
- "Most distant landing in history" (Titan) — confirmed (outer solar system, ~1.2 billion km from Earth at time of landing)
- Apollo LM: "dedicated descent engine that burned for twelve minutes" — confirmed (~12.6 minutes powered descent)
- Mars atmosphere "about one percent as dense as Earth's" — confirmed (surface pressure ~610 Pa vs ~101,325 Pa ≈ 0.6%)
- Mars 2 in 1971 — first man-made object to reach Martian surface, crashed — confirmed
- Mars Polar Lander failure description (vibrations from leg deployment misread as touchdown) — confirmed
- Beagle 2 failure (solar panels failed to fully deploy) — confirmed

---

## the-body-in-the-dark.json

### ORANGE findings

#### BD-1 — SANS prevalence significantly understated

**Claim:** "early estimates suggested around 40 percent of those on six-month missions"

**Correct:** The essay hedges with "early estimates," but even early estimates from the initial ISS data were higher than 40%. NASA's 2023 SANS Clinical Update (the most current systematic review) puts the prevalence at **~66%** of long-duration spaceflight astronauts showing at least one SANS indicator, with some studies citing 70%. The 40% figure appears to have been an early/conservative estimate that has since been substantially revised upward by additional crew data. Given that the essay describes SANS as a "showstopper" concern — which is accurate — readers should have the current, not the superseded, prevalence figure.

Source: NASA NTRS "SANS: 2023 Clinical Update" (abstract); Frontiers in Ophthalmology PMC article on SANS.

---

### YELLOW findings

#### BD-2 — Peggy Whitson "665 days across three missions" — now outdated

**Claim:** "Peggy Whitson's cumulative 665 days across three missions"

**Correct:** This was accurate for her NASA government astronaut career. However, Whitson has since flown on Axiom Mission 2 (Ax-2) and Axiom Mission 4 (Ax-4) as commander, bringing her total to approximately **695+ days** as of 2026. The essay's "three missions" framing is now inaccurate. Whether this matters depends on editorial scope — if the essay is intentionally citing only her ISS government record, a qualifier ("across her NASA career") would fix it. As written it reads as a current total, which it is not.

Source: NASA ISS record-holder page; Axiom Space biography; multiple space news sources.

---

#### BD-3 — Bone loss rate: "one to one and a half percent per month" — slightly below upper end of literature

**Claim:** "Bone mineral density falls at roughly one to one and a half percent per month in the load-bearing bones"

**Correct:** The figure is broadly defensible. Multiple sources cite 1–1.5% per month in load-bearing bones, but some literature and at least one NASA reference cite up to 1–2% per month. The essay's figure is on the conservative end of the range. Not wrong, but it understates the upper bound slightly. Severity: yellow — the range given is cited in the peer-reviewed literature.

Source: CSA TBone studies page; NASA Risk of Spaceflight-Induced Bone Changes; ISS radiation brief.

---

### GREEN (verified correct)

- Valeri Polyakov: 437 consecutive days on Mir, January 1994 – March 1995 (specifically: Soyuz TM-18, 8 January 1994 – 22 March 1995) — confirmed exactly
- Polyakov walked away from Soyuz under his own power post-landing — confirmed (widely reported, explicitly confirmed in cosmonaut accounts)
- Polyakov's record "still unbroken, three decades later" — confirmed (no single continuous flight has exceeded 437 days as of 2026)
- Scott Kelly "340-day mission" — confirmed (340 days aboard ISS)
- NASA Twin Study findings: gene expression, telomere dynamics, gut microbiome, cognitive performance; "most reversed on return, but not all" — confirmed (7% of gene expression changes did not fully revert)
- Mars-500: "520 days" sealed habitat, Moscow, 2010–2011 — confirmed (started 3 June 2010, ended 4 November 2011)
- Mars-500: "six volunteers completed the full duration without leaving" — confirmed
- Mars-500 communication delay approaching "20 minutes" simulation — confirmed
- ISS 6-month dose "roughly 80 millisieverts" — confirmed (80 mSv at solar maximum; 160 mSv at solar minimum — essay doesn't specify cycle, so this is within the documented range)
- Mars round-trip radiation "500 to 1,200 millisieverts" — consistent with published estimates
- SANS: optic nerve head changes, globe flattening, visual acuity degradation — mechanism description correct
- SANS: "one of the three or four showstoppers" for crewed Mars missions — accurate per NASA's Human Research Program risk register framing
- Skylab missions: 28, 59, and 84 days in 1973 and 1974 — confirmed
- Polaris Dawn 2024: private crewed flight through outer Van Allen belts — confirmed (reached 1,400 km; inner belt begins ~1,000 km)
- Tiangong crews on "90- and 180-day rotations since 2021" — confirmed
- Career dose limits: three percent excess cancer risk ceiling, varying by age and sex — confirmed (NASA's pre-2023 limits; note: NASEM 2021 report recommended shifting to a single limit)

---

## Summary table

| ID | Essay | Severity | Claim | Verdict |
|---|---|---|---|---|
| SM-1 | seven-minutes | RED | Schiaparelli impact "~300 km/h" | Should be ~540 km/h |
| SM-2 | seven-minutes | RED | "corrupted gyroscope reading" | IMU saturation, not corruption |
| SM-3 | seven-minutes | ORANGE | Entry speed "roughly 19,000 km/h" | Official figure is ~20,000 km/h |
| SM-4 | seven-minutes | ORANGE | Retrorockets "less than four seconds" | Exactly 3 seconds — sharpen |
| BD-1 | body-in-dark | ORANGE | SANS "around 40 percent" | Current data: ~66% (2023 NASA update) |
| SM-5 | seven-minutes | YELLOW | Venera 13 "465°C" | Measured at site: 457°C |
| BD-2 | body-in-dark | YELLOW | Whitson "665 days across three missions" | Now outdated; she has flown Ax-2 + Ax-4 since |
| BD-3 | body-in-dark | YELLOW | Bone loss "1–1.5% per month" | Some lit cites up to 2%; conservative but defensible |
