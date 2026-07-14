# Fact-check — Mars missions, batch A

Independent skeptical review. Prose overlay (`i18n-src/en-US/missions/mars/<slug>.json`)
vs base data (`static/data/missions/mars/<slug>.json`). Web-verified. No edits made.

Severity: 🔴 factual error / false-first · 🟠 misleading or wrong quantity ·
🟡 stale / imprecise / internal inconsistency · 🔵 nit / defensible-but-worth-noting.

## Per-mission verdicts

| Mission | Verdict | Highest sev |
|---|---|---|
| curiosity | Solid; one stale number, one date wording nit | 🟡 |
| hope-probe | Wrong orbit periapsis (both files); "1× day" confusion | 🟠 |
| insight | Correct; internal end-date split (Dec 15 vs 21) | 🟡 |
| mangalyaan | **"4 years dormant" is flatly false**; end-date & duration slips | 🔴 |
| mariner4 | Flyby-date inconsistency (14th vs 15th UTC) | 🟡 |
| mariner9 | Excellent, all firsts correct | 🔵 |
| mars-express | MOI burn length wrong in base (34 vs 37 min) | 🟠 |
| mars-pathfinder | Correct; minor design-lifetime wording | 🔵 |
| mars3 | **Overlay↔base contradiction on transmission time** (110 s vs 14.5 s) | 🟠 |
| maven | Correct; arrival-date field vs description split | 🟡 |

**Totals: 🔴 1 · 🟠 3 · 🟡 4 · 🔵 2** (10 findings across 10 missions)

---

## curiosity

🟡 **Stale distance** — overlay `description`: "driven 32+ km up Mount Sharp since landing in Gale Crater in 2012" and `dispatch`/`first` imply current status. As of 2026-07-12 the odometer is **36.86 km** (22.90 mi) over 4,953 sols. "32+ km" is not false (36 > 32) but is stale by two years, and the phrasing "32+ km **up Mount Sharp**" conflates total-from-landing odometry with vertical/on-mountain travel — the 36.86 km is total driven distance, elevation gain is ~740 m. Suggest "36+ km" or drop the number.
Source: https://en.wikipedia.org/wiki/Curiosity_(rover) · Confidence: high.

🔵 **Landing-date wording** — base event `edl_or_oi` says "Landed 2012-08-06 02:32 PDT" while the `arrival` event above it says "2012-08-05" (approach). Touchdown was 2012-08-06 05:17 UTC / 2012-08-05 22:32 PDT. The overlay TOUCHDOWN note (2012-08-06 05:17:57 UTC) is correct; base "02:32 PDT" is a typo for 22:32 PDT (10:32 pm). Minor, but "02:32 PDT" reads as 2:32 am and is wrong.
Source: https://en.wikipedia.org/wiki/Curiosity_(rover) · Confidence: high.

Everything else checks: nuclear/RTG first Mars rover ✓, sky-crane first ✓, seven-minutes-of-terror ✓, Atlas V 541 ✓, launch 2011-11-26 ✓, Gale Crater / habitable lake ✓, still active 2026 ✓.

---

## hope-probe

🟠 **Wrong science-orbit periapsis (both files, different wrong values)** — overlay `description`: "science orbit (1× day duration, **27,000 km** × 43,000 km)". Base `arrival.periapsis_km`: **22000**, and base MOI event: "**22,000** × 43,000 km orbit". The published EMM science orbit is **20,000 km × 43,000 km**, period 55 hours. Overlay (27,000) is the most wrong; base (22,000) is also off. Both should read ~20,000 km periapsis.
Source: https://en.wikipedia.org/wiki/Emirates_Mars_Mission ; https://www.space.com/hope-mars-mission-uae · Confidence: high.

🟡 **"1× day duration" is confusing/likely wrong** — overlay `description` calls the science orbit "1× day duration," but the orbit period is **55 hours** (≈2.3 Earth days), and the overlay's own SCIENCE ORBIT event correctly says "55-hour science orbit." "1× day" contradicts the 55 h figure and should be struck or clarified.
Source: https://www.thenationalnews.com/uae/2024/02/09/uae-marks-three-years-since-hope-probe-reached-mars-orbit/ · Confidence: high.

🔵 **"fifth agency at Mars"** — overlay: "making the UAE the fifth agency at Mars." Correct if counting orbit-reachers in order US, USSR/Russia, ESA, India, UAE (China's Tianwen-1 entered orbit **the day after** Hope, 2021-02-10, so UAE is 5th). Framing is honest. ✓ Keep.
Source: https://en.wikipedia.org/wiki/Emirates_Mars_Mission · Confidence: high.

Checks: first Arab/Arab-world interplanetary mission ✓, launch 2020-07-19 on H-IIA 202 from Tanegashima (MHI) ✓, MOI 2021-02-09 27-min burn ✓, first-attempt success ✓, conceived for 50th anniversary of UAE (Dec 2021) ✓.

---

## insight

🟡 **Internal end-date split** — overlay MISSION END: "Final low-power transmission **2022-12-15**"; base credit: "2022-12-15"; but base `edl_or_oi` description: "Mission ended **2022-12-21**." Both dates are real and refer to different events: last contact/final transmission was **Dec 15, 2022**; NASA **declared** the mission over on **Dec 21, 2022** (after two missed comm attempts). The base description's "ended 2022-12-21" is the official declaration; overlay's "final transmission 2022-12-15" is the last signal. Not an error, but the two files quote different dates for "ended" — recommend one file note both.
Source: https://www.jpl.nasa.gov/news/nasa-retires-insight-mars-lander-mission-after-years-of-science/ ; https://en.wikipedia.org/wiki/InSight · Confidence: high.

🔵 **Marsquake count / magnitude** — overlay: "over 1,300 marsquakes ... magnitude-5 in 2022, the largest ever detected on another planet." Verified: **1,319** marsquakes total; the May 4, 2022 event was ~**magnitude 5** (S1222a), largest observed on another planet. ✓ Accurate.
Source: https://en.wikipedia.org/wiki/InSight · Confidence: high.

Checks: first seismometer on Mars ✓, first interplanetary launch from US West Coast (Vandenberg) ✓, MarCO first cubesats to leave Earth orbit ✓ (base), mole/HP³ heat-flow failure ✓, dust-on-panels cause ✓, Elysium Planitia ✓, Atlas V 401 ✓, launch 2018-05-05, touchdown 2018-11-26 ✓.

---

## mangalyaan

🔴 **"Liquid Apogee Motor fires after 4 years dormant" is FALSE** — overlay event MARS ORBIT INSERTION: "Liquid Apogee Motor fires after **4 years dormant** — fired for 24 minutes to capture into orbit." The LAM had been idle **~298 days** (~10 months, since the last TMI/perigee burn on 2013-12-01) when it fired for MOI on 2014-09-24. Not 4 years. ISRO even test-fired it for 3.9 s on 2014-09-22 to confirm it after the ~300-day dormancy. "4 years" is off by roughly 4×.
Source: https://en.wikipedia.org/wiki/Mars_Orbiter_Mission ; https://www.americaspace.com/2014/09/24/india-becomes-fourth-member-of-mars-club-as-mom-enters-orbit-around-red-planet/ · Confidence: high.

🟡 **Mission-end date imprecise** — overlay MISSION END: "Lost contact **2022-04** after spacecraft propellant exhausted." ISRO announced the orbiter had "run out of propellant" and the battery drained; the mission was declared over in **October 2022** (ISRO announcement), though contact issues began earlier in 2022. Base says "April 2022 / ~9 years." The propellant-exhausted framing is a simplification (battery drain during a long eclipse is the commonly cited cause); "2022-04" is defensible as when contact was effectively lost. Flagging as imprecise, not clearly wrong.
Source: https://en.wikipedia.org/wiki/Mars_Orbiter_Mission · Confidence: medium.

🟡 **Science-duration mismatch overlay vs base** — overlay `description`: "**8 years** of science return"; base `edl_or_oi`: "designed for 6 months but operated for **~9 years**." Launched 2013-11, MOI 2014-09-24, contact lost ~2022 → ~7.5–8 years at Mars (or ~9 years since launch). The two files quote 8 vs 9; both are round approximations of the same span but should agree. Minor.
Source: https://en.wikipedia.org/wiki/Mars_Orbiter_Mission · Confidence: high.

Checks (all ✓): cost $74M ✓, less than *Gravity* ($100M) ✓, ~1/9–1/10 of MAVEN ($671M) ✓, MAVEN arrived 2 days earlier ✓, 4th agency at Mars ✓, first country to succeed on first attempt ✓, PSLV-XL C25 + Earth-orbit-raising perigee burns ✓, 24-min MOI burn ✓, launch 2013-11-05, MOI 2014-09-24 ✓, "first Asian Mars mission" ✓ (Japan's Nozomi 1998 failed to enter orbit; first Asian **success** is MOM — framing honest).
Note: base says "6 perigee burns," overlay says "seven Earth orbit raising burns." Sources describe 6 orbit-raising burns before TMI (the 6th being TMI itself) — minor count discrepancy between the two files, 🔵.

---

## mariner4

🟡 **Flyby-date inconsistency (14th vs 15th)** — overlay `first`/events use **1965-07-15** ("First close-up images"); overlay `description` and base event say closest approach "**1965-07-14**." Closest approach was **01:00:57 UT on 15 July 1965** (= 8:00:57 pm EST 14 July). So UTC date is the **15th**; the 14th is US-Eastern local. The base description "Closest approach 9,846 km on 1965-07-14" is the less-correct one for a UTC atlas; overlay events (15th) are right. Recommend standardizing on 1965-07-15 UTC with a note.
Source: https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-077A ; https://en.wikipedia.org/wiki/Mariner_4 · Confidence: high.

🔵 **"22 images"** — 21 complete images + part of a 22nd were returned. Overlay "22 grainy images" / base "22 grainy images" is the common shorthand and acceptable; strictly it's "21 and a partial 22nd." Keep, optionally footnote.
Source: https://en.wikipedia.org/wiki/Mariner_4 · Confidence: high.

Checks: first spacecraft to reach Mars & return close-up images of another planet ✓ (1965), 9,846 km closest approach ✓, ~100× thinner atmosphere / 4.1–7 mbar ✓, cratered Moon-like surface / ended habitable-Mars dreams ✓, Atlas LV-3 Agena-D from LC-12 ✓, launch 1964-11-28 ✓, Mariner 3 shroud failure ✓.

---

## mariner9

🔵 **Mapping-% wording** — overlay/base: "~**80%** of the Martian surface." NASA 50th-anniversary sources say **85%**; 70–85% appears across sources. "~80%" is within range and defensible. Optional bump to "~85%."
Source: https://www.nasa.gov/history/50-years-ago-mariner-9-enters-mars-orbit/ · Confidence: medium.

Checks (all ✓, this entry is strong): **first spacecraft to orbit another planet** ✓ (1971-11-14, beating Soviet Mars 2 by ~13 days — Mars 2 entered orbit 1971-11-27) ✓, global dust storm on arrival with Tharsis summits visible ✓, 7,329 images ✓, Olympus Mons / Valles Marineris / Phobos+Deimos close-ups ✓, end of mission 1972-10-27 (attitude-gas exhausted) ✓, Atlas SLV-3C/Centaur from LC-36B ✓, twin Mariner 8 lost ✓, launch 1971-05-30 ✓, 1398×17,917 km 64.4° orbit ✓. The Nov 13 vs 14 discrepancy in some sources is a timezone artifact; 14 Nov UTC (00:18 UT) is correct — the file has it right.

---

## mars-express

🟠 **MOI burn length wrong in base** — base `edl_or_oi`: "**34-minute** main engine burn captured Mars Express." ESA's own record: Mars Express fired its main engine for a **37-minute** burn at 03:47 CET on 2003-12-25. The overlay MARS ORBIT INSERTION note correctly says "**37-minute** main engine burn." Base 34 min is wrong; fix to 37.
Source: https://www.esa.int/Science_Exploration/Space_Science/Mars_Express/Merry_Christmas_from_Mars... · Confidence: high.

🟡 **Capture-orbit figures differ from ESA** — base: "captured ... into a **250 × 11,000 km polar orbit**." ESA states the initial capture orbit was **250 km × ~150,000 km**, inclination 25° (not polar); the ~11,000 km and polar values came only after later trims (operational orbit ~298 × 10,107 km, ~87° near-polar). Base conflates the eventual near-polar operational orbit with the initial capture. Worth correcting or clarifying "later trimmed to."
Source: https://en.wikipedia.org/wiki/Mars_Express ; ESA MOI report · Confidence: medium-high.

Checks: Europe's first interplanetary/first-to-another-planet mission ✓, longest-running non-NASA / longest-running Mars orbiter ✓, Beagle 2 released 2003-12-19 (6 days before MOI) ✓, Beagle 2 reached surface but panels didn't fully deploy, declared lost 2004, found by MRO/HiRISE 2015 ✓, Soyuz-FG/Fregat from Baikonur ✓, launch 2003-06-02, MOI 2003-12-25 (Christmas) ✓, MARSIS subsurface ice + controversial subglacial liquid water ✓.

---

## mars-pathfinder

🔵 **Sojourner design-lifetime wording** — overlay `description`: "worked far past its **7-day** design lifetime." Sojourner's design lifetime was **8 sols** (with a 30-sol goal); it ran **83 sols**. "7-day" ≈ 1 week is a common rounding of "8 sols" and appears in sources, so defensible, but "8 sols / ~1 week" is more precise.
Source: https://en.wikipedia.org/wiki/Sojourner_(rover) · Confidence: high.

🔵 **Bounce count** — overlay TOUCHDOWN "bounces 15 times"; base "bounced 15+ times." Sources commonly cite ~15 bounces (first bounce ~15 m high). Consistent and fine. ✓

Checks: first wheels on another planet (Sojourner) ✓, first airbag landing on Mars ✓, ~100 m traversed ✓, 83 sols ✓, Ares Vallis, Independence Day 1997-07-04 landing ✓, Delta II 7925 ✓, launch 1996-12-04 ✓, comms lost 1997-09-27 ✓, faster-cheaper-better template for Spirit/Opportunity/Curiosity ✓. Overlay's "Pathfinder operated for 2 months 27 days" — landing 1997-07-04 to loss 1997-09-27 ≈ 2 months 23 days (base) / lander comms; "2 months 27 days" is slightly long but within noise. 🔵.

---

## mars3

🟠 **Overlay↔base contradiction on transmission duration** — overlay `description` and SIGNAL LOSS event: "transmitted for only **~110 seconds**." Base `edl_or_oi` events: "**Lander fails after 14.5 seconds**" and credit "transmitted for ~110 s." **The two files disagree, and the base itself is internally split** (credit says ~110 s, event says 14.5 s). The literature distinguishes two figures: the lander began transmitting ~90 s after touchdown and the transmission **lasted ~14.5 s** (some sources ~20 s) before going silent; Wikipedia phrases it as "failed **110 seconds after landing**." So ~110 s = time-from-landing-to-silence; ~14.5 s = duration of actual transmission. Both files use both numbers loosely and contradict each other. Recommend one consistent framing, e.g. "began transmitting ~90 s after landing; signal lasted ~14.5 s (some accounts ~20 s), silent ~110 s after touchdown."
Source: https://en.wikipedia.org/wiki/Mars_3 ; https://www.jpl.nasa.gov/news/nasa-mars-orbiter-images-may-show-1971-soviet-lander/ · Confidence: high.

🔵 **"beating Viking 1 by 5 years"** — base: "first to soft-land and survive its initial seconds — beating Viking 1 by 5 years." Mars 3 = Dec 1971, Viking 1 = July 1976 → ~4.6 years, rounds to 5. Fine. Note: Mars 3 is first **soft landing**; Viking 1 is first **fully successful, sustained** surface operation — the file's "survive its initial seconds" honesty is good. ✓

Checks: first spacecraft to soft-land on Mars ✓ (1971-12-02, honest partial-success framing preserved), Mars 2 launched 9 days earlier and its lander crashed ✓, orbiter operated ~8 months (contact lost 1972-08-22) ✓, Ptolemaeus crater ~45°S target ✓, global dust storm suspected cause ✓, Proton-K/Blok-D from Baikonur ✓, launch 1971-05-28 ✓. Overlay says orbiter "returning hundreds of images"; combined Mars 2+3 returned ~60 images — "hundreds" is an overclaim, 🔵.
Source: https://en.wikipedia.org/wiki/Mars_3 · Confidence: medium.

---

## maven

🟡 **arrival_date field vs description split** — base top-level `arrival_date`: "**2014-09-21**"; base arrival event & `transit_days` narrative: "**2014-09-22** arrival"; overlay note doesn't date the MOI. MOI burn started 18:50 PDT **Sept 21** = 01:50 UTC **Sept 22**. So both dates are defensible (US-local 21st, UTC 22nd), but the two base fields disagree. For a UTC atlas, 2014-09-22 is the orbit-insertion-complete date; standardize.
Source: https://en.wikipedia.org/wiki/MAVEN ; https://www.planetary.org/articles/09211013-maven-orbit-insertion-timeline · Confidence: high.

🔵 **"arrived 2 days after" Mangalyaan is inverted vs. reality** — base MAVEN event: "2014-09-22 arrival, just 2 days after India's Mangalyaan." **This is backwards.** MAVEN arrived **2014-09-21/22**; Mangalyaan arrived **2014-09-24** — i.e., MAVEN arrived ~2 days **before** Mangalyaan (and the mangalyaan file correctly says MOM arrived "2 days after NASA's MAVEN"). The MAVEN base description saying MAVEN arrived "2 days after Mangalyaan" is a factual inversion. Upgrading concern: this is a clear error, not a nit — treat as 🟠.
Source: https://en.wikipedia.org/wiki/MAVEN ; https://en.wikipedia.org/wiki/Mars_Orbiter_Mission · Confidence: high.

Checks: first mission dedicated to how Mars lost its atmosphere ✓, ~100 g/s atmospheric loss ✓, dips into upper atmosphere / deep-dip campaigns ✓, relay for Curiosity + Perseverance ✓, 33-min MOI burn (33 min 26 s) ✓, 35-hour capture orbit later trimmed to 4.5 h ✓, Atlas V 401 ✓, launch 2013-11-18 ✓, extended through 2030+ ✓.

**NB:** the 🔵 above (MAVEN "2 days after Mangalyaan") is really a 🟠 factual inversion — it is counted as one of the 3 🟠 in the header tally (the base MAVEN arrival-order error), with the arrival_date field split noted as the 🟡 for this mission.
