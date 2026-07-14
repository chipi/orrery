# Fleet Lander Fact-Check — Batch B

Reviewer: science-reviewer agent
Date: 2026-07-14
Scope: 13 lander entries · i18n-src/en-US + static/data

Sources consulted: Wikipedia (Mars 3, Venera 7, Venera 13, SLIM, Mars 6, Schiaparelli EDM,
Viking 1, Viking 2, Mars Polar Lander, Phoenix, Chandrayaan-3), JAXA press releases,
NASA NSSDCA, ESA investigation report.

---

## Per-Entry Verdict Summary

| Entry | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| mars-3 | ISSUES | 1 | 0 | 1 | 0 |
| mars-polar-lander | CLEAN | 0 | 0 | 0 | 1 |
| mars6 | ISSUES | 0 | 1 | 1 | 0 |
| phoenix | ISSUES | 0 | 0 | 1 | 0 |
| schiaparelli | ISSUES | 0 | 0 | 1 | 0 |
| slim | ISSUES | 0 | 1 | 1 | 0 |
| surveyor-3 | CLEAN | 0 | 0 | 0 | 0 |
| venera-13 | ISSUES | 0 | 0 | 1 | 1 |
| venera-7 | ISSUES | 0 | 1 | 0 | 0 |
| viking-1 | ISSUES | 0 | 0 | 1 | 0 |
| viking2-lander | ISSUES | 0 | 0 | 1 | 0 |
| vikram-cy2 | CLEAN | 0 | 0 | 0 | 0 |
| vikram-cy3 | ISSUES | 0 | 0 | 1 | 0 |

Totals: 🔴 1 · 🟠 3 · 🟡 9 · 🔵 2

---

## Severity Key

- 🔴 Factual error — wrong or inverting a core claim
- 🟠 Significant inaccuracy — misleading number or framing that distorts the record
- 🟡 Minor inaccuracy / imprecision — low risk but verifiably off
- 🔵 Note / missing context — not wrong, but incomplete or worth flagging

---

## mars-3

### Finding 1 — 🔴 Transmission duration wrong

**Files:** i18n-src/en-US/fleet/lander/mars-3.json · field: tagline, description, best_known_for
**Exact quote:** "First soft landing on Mars; 110 s of telemetry" / "Returned 110 seconds of partial
telemetry"
**What's wrong:** Wikipedia (Mars 3 article) states "After 20 seconds, transmission stopped for
unknown reasons." Other sources cite 14.5 s. The "110 seconds" figure appears to be a confusion
with the post-landing wait before transmission began (the lander began transmitting 90 s after
touchdown, then ran for ~20 s). 110 s is not the transmission duration; it is an internally
inconsistent composite figure not supported by any primary source.
**Correction:** "~20 seconds of transmission from the surface" (Wikipedia figure) or
"~14.5 seconds" (alternate well-cited figure). The tagline should read something like
"First soft landing on Mars; ~20 s of surface transmission."
**Source:** https://en.wikipedia.org/wiki/Mars_3
**Confidence:** High

### Finding 2 — 🟡 "possibly an image" undersells / misdescribes what was received

**Files:** i18n-src/en-US/fleet/lander/mars-3.json · field: description
**Exact quote:** "Returned 110 seconds of partial telemetry — possibly an image"
**What's wrong:** What was received was the beginning of a scan that produced a featureless grey
image — not ambiguously "possibly" an image. The featureless grey result is documented. The
uncertainty is about whether the dust storm was to blame, not about whether an image was
attempted.
**Correction:** "began transmitting what would have been a surface image, but contact was lost
after ~20 seconds leaving only a featureless grey frame"
**Source:** https://en.wikipedia.org/wiki/Mars_3
https://www.inverse.com/science/mars-3-anniversary
**Confidence:** High

---

## mars-polar-lander

### Finding 1 — 🔵 Failure cause not mentioned; "drove faster-better-cheaper review" accurate but
vague

**Files:** i18n-src/en-US/fleet/lander/mars-polar-lander.json · field: description
**Exact quote:** "Lost on landing; drove faster-better-cheaper review"
**What's wrong:** Not wrong — MPL's loss along with Mars Climate Orbiter were the key failures
that ended the faster-better-cheaper era and triggered the Mars Program Independent Assessment
Team review. However the entry says nothing about the actual failure cause (premature engine
shutdown due to spurious leg-deployment touchdown signal, ~40 m above surface). The
`first_flight` field (1999-12-03) records the landing attempt date, not the launch date
(1999-01-03) — this is unusual but consistent with the "first flight" field being used for
"first arrived at target" across lander entries, so not flagged as error.
**Correction:** No correction required for factual accuracy. Consider adding failure mechanism
context in a future description pass.
**Source:** https://en.wikipedia.org/wiki/Mars_Polar_Lander
**Confidence:** High

---

## mars6

### Finding 1 — 🟠 Signal loss altitude "~148 m" unverified / possibly fabricated

**Files:** i18n-src/en-US/fleet/lander/mars6.json · field: tagline, description, best_known_for,
credit
**Exact quote:** "Signal was lost at ~148 m altitude during retrorocket firing"
**What's wrong:** Wikipedia's Mars 6 article does not specify the altitude at which signal was
lost. It states only that "all contact was lost" with the spacecraft "about to fire its
retrorockets in preparation for landing." The 148 m figure does not appear in primary sources
(NSSDCA, Wikipedia, ESA ESA hazards page). This number appears to be either confabulated or
drawn from an uncited secondary source.
**Correction:** Remove the specific altitude. State: "Signal was lost just before landing,
during retrorocket firing; whether the lander crashed or survived to the surface is unknown."
**Source:** https://en.wikipedia.org/wiki/Mars_6
https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-052A
**Confidence:** High (absence of the figure across multiple authoritative sources)

### Finding 2 — 🟡 "first direct atmospheric measurements" claim needs nuance

**Files:** i18n-src/en-US/fleet/lander/mars6.json · field: tagline, best_known_for
**Exact quote:** "first direct atmospheric measurements (224 s of descent telemetry)"
**What's wrong:** While Mars 6 did return atmospheric telemetry, Wikipedia notes that "due to a
design flaw, a chip aboard the spacecraft had degraded during the mission, and a large amount of
the data which had been returned was unusable." The composition data was largely corrupt. Calling
it unqualifiedly "first direct atmospheric measurements" without noting the data was mostly
unusable overstates the science return. The description body does note the corruption but the
tagline/best_known_for do not.
**Correction:** Tagline should qualify: "first descent telemetry from Mars atmosphere (224 s,
mostly corrupted)" or similar.
**Source:** https://en.wikipedia.org/wiki/Mars_6
**Confidence:** High

---

## phoenix

### Finding 1 — 🟡 first_flight date is landing date, not launch date

**Files:** static/data/fleet/lander/phoenix.json · field: first_flight
**Exact quote:** `"first_flight": "2008-05-25"`
**What's wrong:** May 25, 2008 is the Mars landing date. Phoenix launched on August 4, 2007.
The field name is "first_flight" — using the landing date is internally inconsistent with
missions like Viking 2 (1975-09-09 = launch date) and Mars Polar Lander (1999-12-03 = landing
date). The schema appears inconsistently applied across lander entries. At minimum this entry
should be flagged for schema clarification. If first_flight = launch date, the value is wrong.
**Correction:** If first_flight = launch date → change to 2007-08-04.
If first_flight = target-arrival date for landers → 2008-05-25 is correct but Viking 2's
1975-09-09 is then wrong.
**Source:** https://en.wikipedia.org/wiki/Phoenix_(spacecraft)
**Confidence:** Medium (schema intent unclear; the date itself is a known fact mismatch
against launch)

---

## schiaparelli

### Finding 1 — 🟡 Failure description oversimplifies to "faulty IMU saturated"

**Files:** i18n-src/en-US/fleet/lander/schiaparelli.json · field: description
**Exact quote:** "a faulty IMU saturated, triggering an early parachute deploy and engine cutoff"
**What's wrong:** The ESA investigation found four root causes. The IMU did saturate, but it was
not "faulty" in a hardware-defect sense — the issue was that the guidance software was not
designed to handle the saturation condition (it propagated invalid data as a negative altitude
reading). The failure was a software/system-design failure, not a hardware failure. Also:
the parachute was already deployed at the time; what was premature was the parachute *release*
(jettison), not its deployment. The entry reverses this.
**Correction:** "the IMU saturated during parachute descent, causing the flight computer to
believe it was below ground level; it released the parachute and fired the retrorockets for only
3 seconds instead of 30, then went silent and impacted at ~300 km/h from 3.7 km altitude."
**Source:** https://sci.esa.int/documents/33431/35950/1567260317467-ESA_ExoMars_2016_Schiaparelli_Anomaly_Inquiry.pdf
https://en.wikipedia.org/wiki/Schiaparelli_EDM
**Confidence:** High

---

## slim

### Finding 1 — 🟠 Orientation described as "upside-down" — actually nose-down / on its side

**Files:** i18n-src/en-US/fleet/lander/slim.json · field: description
**Exact quote:** "tipped over on landing, ending up upside-down"
**What's wrong:** JAXA and multiple sources describe SLIM as landing on its nose / at a
90-degree angle (effectively standing on its nose), not upside-down. The solar panels faced
west (away from the Sun) because of this attitude. The Wikipedia article says "landed on its
side with the solar panels oriented westwards." SYFY Wire headline: "alive, despite landing
upside-down" — some popular press did say upside-down, but JAXA's own characterisation and
NASA LRO imagery show the lander nose-down at ~90 degrees, not inverted 180 degrees.
**Correction:** "touched down on its nose at roughly 90 degrees, with solar panels facing
away from the Sun"
**Source:** https://global.jaxa.jp/press/2024/01/20240120-1_e.html
https://www.nasaspaceflight.com/2024/01/slim-landing/
**Confidence:** High

### Finding 2 — 🟡 "several lunar days" — actually survived four complete lunar nights

**Files:** i18n-src/en-US/fleet/lander/slim.json · field: description
**Exact quote:** "Still operated for several lunar days from that orientation"
**What's wrong:** The Wikipedia fetch confirms SLIM survived four complete lunar nights before
losing contact in late May 2024. "Several lunar days" is technically correct (several ≥ 3)
but vague; the actual achievement was surviving four lunar nights without radioisotope heating,
which is the record worth stating.
**Correction:** "survived four lunar nights without radioisotope heating — a record for
passively-heated lunar surface missions"
**Source:** https://en.wikipedia.org/wiki/Smart_Lander_for_Investigating_Moon
**Confidence:** High

---

## surveyor-3

No findings. Landing date (1967-04-20), Apollo 12 visit, manufacturer (Hughes Aircraft), all
verified correct. The bounce on landing is a known fact and the entry's tagline focuses on the
Apollo 12 connection, which is accurate.

---

## venera-13

### Finding 1 — 🟡 Temperature stated as 470 °C — Wikipedia says 457 °C

**Files:** i18n-src/en-US/fleet/lander/venera-13.json · field: description
**Exact quote:** "before silicon-electronic failure in the 470 °C / 89-atmosphere CO₂
environment" (description); "survived 127 minutes in 470 °C / 89-bar conditions" (best_known_for
in static/data)
**What's wrong:** Wikipedia Venera 13 article gives the surface temperature as 457 °C (855 °F).
The entry uses 470 °C which is the commonly quoted figure for Venus surface average but not
specifically what Venera 13 measured at its landing site. 457 °C is the figure from the
spacecraft's own measurements.
**Correction:** Change 470 °C → 457 °C to reflect Venera 13's own measured value.
**Source:** https://en.wikipedia.org/wiki/Venera_13
**Confidence:** High

### Finding 2 — 🔵 "first colour images of the Venusian surface" — Venera 9/10 took B&W images
in 1975; colour was the Venera 13/14 first

**Files:** i18n-src/en-US/fleet/lander/venera-13.json · field: description, best_known_for
**Exact quote:** "First panoramic colour images of the Venusian surface"
**What's wrong:** The claim is correct — colour images are the right first for Venera 13.
Venera 9 and 10 (1975) returned black-and-white panoramas; colour images of the surface first
came with Venera 13 (1982). The entry is accurate; noting here for completeness since the
reviewer was asked to specifically verify this claim.
**Correction:** No change needed.
**Source:** https://www.planetary.org/articles/every-picture-from-venus-surface-ever
**Confidence:** High

---

## venera-7

### Finding 1 — 🟠 "First soft landing on another planet" — correct, but misses the second and
equally important first

**Files:** i18n-src/en-US/fleet/lander/venera-7.json · field: tagline, best_known_for,
description
**Exact quote:** "First soft landing on another planet (Venus)"
**What's wrong:** Not wrong, but critically incomplete. Venera 7 was also the first spacecraft
to transmit data from the surface of another planet — the combination is what makes it
historically paramount. This is the stronger claim because earlier craft (Venera 4, 5, 6) had
entered the atmosphere and transmitted but were destroyed before reaching the surface. Omitting
"first data from Venus surface" loses the defining achievement. Mars 3 later claimed the
"first soft landing on Mars" first; Venera 7's durability claim is specifically about surviving
to transmit.
**Correction:** best_known_for and tagline should read: "First soft landing on another planet
and first to transmit data from another planet's surface (Venus, 1970)"
**Source:** https://en.wikipedia.org/wiki/Venera_7
https://www.space.com/30276-venera-7-venus-lander-launch-45th-anniversary.html
**Confidence:** High

---

## viking-1

### Finding 1 — 🟡 "First successful Mars lander" needs careful framing relative to Mars 3

**Files:** i18n-src/en-US/fleet/lander/viking-1.json · field: tagline, best_known_for,
description, dispatch
**Exact quote:** "The first successful Mars lander mission" (description) / "First successful
Mars lander" (tagline)
**What's wrong:** The entry is broadly correct — Viking 1 is widely described as the first
*successful* Mars lander. However the dispatch text says "The Soviet landers before it had died
within seconds of touchdown" — Mars 3 landed in December 1971, not days but rather years before
Viking 1 (July 1976). The statement is arguably defensible (Mars 3 transmitted only ~20 s),
but "died within seconds" is a loose characterisation. More precisely: Mars 3 transmitted for
~20 seconds and returned an unusable featureless grey frame; no meaningful surface data was
obtained. Viking 1 is correctly the first *functionally successful* Mars lander.
**Correction:** Dispatch: change "within seconds" to "within about twenty seconds, returning
only a featureless grey frame" for precision.
**Source:** https://en.wikipedia.org/wiki/Viking_1
**Confidence:** High

---

## viking2-lander

### Finding 1 — 🟡 first_flight date (1975-09-09) is launch date, but entry says lander landed
1976-09-03 — inconsistent with other lander first_flight conventions

**Files:** static/data/fleet/lander/viking2-lander.json · field: first_flight
**Exact quote:** `"first_flight": "1975-09-09"`
**What's wrong:** Viking 2 spacecraft launched September 9, 1975; the lander touched down
September 3, 1976. Phoenix (another lander) uses its landing date (2008-05-25) in first_flight.
Mars Polar Lander uses its landing-attempt date (1999-12-03). Viking 1 uses 1976-07-20
(landing date). Viking 2 uses the launch date — inconsistent. The description body correctly
gives the landing date as 1976-09-03.
**Correction:** For consistency with other lander entries (which use arrival/landing date),
first_flight should be 1976-09-03. Alternatively the schema definition should be standardized
and all entries updated together.
**Source:** https://en.wikipedia.org/wiki/Viking_2
**Confidence:** High (the inconsistency is clear; which date is "right" depends on schema intent)

---

## vikram-cy2

No findings. Landing attempt date (2019-09-07), crash confirmed, orbiter still operational —
all accurate. The entry is appropriately brief given failed-mission status.

---

## vikram-cy3

### Finding 1 — 🟡 "First lunar south-pole landing" — landing was near the south pole, not at it

**Files:** i18n-src/en-US/fleet/lander/vikram-cy3.json · field: tagline, best_known_for,
description
**Exact quote:** "First lunar south-pole landing" (tagline/best_known_for) / "the first
spacecraft to land near the lunar south pole" (description)
**What's wrong:** The tagline says "First lunar south-pole landing" while the description
correctly says "near the lunar south pole." The landing site (Statio Shiv Shakti) is at 69°S,
approximately 600 km from the geographic south pole. The tagline is misleading — it implies
landing at the south pole. The description body is accurate.
**Correction:** Tagline → "First landing near the lunar south pole" to match the description.
**Source:** https://en.wikipedia.org/wiki/Chandrayaan-3
https://en.wikipedia.org/wiki/Statio_Shiv_Shakti
**Confidence:** High

---

## Cross-Entry Notes

### first_flight schema inconsistency (affects phoenix, viking2-lander, mars-polar-lander,
viking-1)

The `first_flight` field is used for launch date in some lander entries (viking2-lander:
1975-09-09) and for landing date in others (viking-1: 1976-07-20, phoenix: 2008-05-25,
mars-polar-lander: 1999-12-03). This is a data-model issue, not a per-entry factual error,
but it means the field cannot be trusted without checking each entry individually.
Recommend a schema decision and a sweep to standardize.
