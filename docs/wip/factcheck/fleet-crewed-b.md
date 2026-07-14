# Fleet Crewed Spacecraft Fact-Check

**Date:** 2026-07-14
**Scope:** 14 crewed-spacecraft entries (i18n-src + static/data)
**Method:** All specific factual claims verified via web search against Wikipedia,
NASA NSSDCA, NASASpaceFlight, SpaceNews, and primary agency sources.
**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/<slug>.json`
- `static/data/fleet/crewed-spacecraft/<slug>.json`

---

## Summary Table

| Vehicle | 🔴 Error | 🟠 Likely | 🟡 Imprecise | 🔵 Consistency | Total |
|---|---|---|---|---|---|
| mercury-capsule | 0 | 0 | 1 | 0 | 1 |
| new-shepard | 0 | 1 | 1 | 1 | 3 |
| orion | 0 | 1 | 1 | 0 | 2 |
| shenzhou | 0 | 0 | 1 | 0 | 1 |
| soyuz-7k-ok | 0 | 0 | 0 | 0 | 0 |
| soyuz-ms | 0 | 0 | 1 | 1 | 2 |
| soyuz-t | 0 | 1 | 0 | 0 | 1 |
| soyuz-tm | 0 | 1 | 0 | 0 | 1 |
| soyuz-tma | 0 | 1 | 1 | 0 | 2 |
| space-shuttle-orbiter | 0 | 0 | 1 | 0 | 1 |
| starliner | 0 | 0 | 2 | 0 | 2 |
| voskhod | 0 | 0 | 1 | 0 | 1 |
| vostok | 0 | 0 | 0 | 0 | 0 |
| x37b | 0 | 0 | 1 | 1 | 2 |
| **TOTAL** | **0** | **4** | **11** | **3** | **18** |

---

## mercury-capsule

**Base `first_flight`: 1962-02-20** — This is John Glenn's Friendship 7 (first *orbital* flight),
not the first Mercury crewed flight. The first crewed Mercury flight was Freedom 7 on 1961-05-05
(Alan Shepard, suborbital). The field likely intends "first orbital flight" but `first_flight`
conventionally means the vehicle's debut crewed mission.

**Finding 1** 🟡 Imprecise
- **File+field:** `static/data/fleet/crewed-spacecraft/mercury-capsule.json` → `first_flight`
- **Exact value:** `"1962-02-20"`
- **Issue:** `first_flight` is dated to Glenn's orbital flight (MA-6), not the vehicle's actual first crewed flight (Shepard's MR-3, 1961-05-05). This is misleading; the Mercury capsule first flew humans on 1961-05-05.
- **Correction:** `"1961-05-05"` (Freedom 7 / MR-3). If the intent is "first orbital," document that distinction.
- **Source:** NASA Mercury Crewed Flights Summary; Wikipedia Project Mercury
- **Confidence:** High

**Narrative (i18n-src):** "six American astronauts" — confirmed correct (Shepard, Grissom, Glenn, Carpenter, Schirra, Cooper). "between 1961 and 1963" — correct. Glenn "spam in a can" quote — correct attribution. No errors.

---

## new-shepard

**Finding 1** 🟠 Likely error
- **File+field:** `static/data/fleet/crewed-spacecraft/new-shepard.json` → `flights[ns-18].crew` — only lists Shatner and Powers; omits Chris Boshuizen and Glen de Vries.
- **Exact value:** crew array has 2 members (Shatner + Powers)
- **Issue:** NS-18 carried 4 crew: Shatner, Audrey Powers, Chris Boshuizen (Planet co-founder), Glen de Vries (Dassault Systèmes). Listing only 2 is materially incomplete and misrepresents the mission.
- **Correction:** Add Boshuizen (Australia, crew) and De Vries (USA, crew) to the NS-18 crew array.
- **Source:** Blue Origin official NS-18 announcement; Wikipedia Blue Origin NS-18
- **Confidence:** High

**Finding 2** 🟡 Imprecise
- **File+field:** `static/data/fleet/crewed-spacecraft/new-shepard.json` → `flights[ns-18].crew[0].role`
- **Exact value:** `"Crew · oldest person in space (90)"`
- **Issue:** Shatner's age at flight (October 13, 2021) was 90 — correct. However, the role field appends the record in a way that may mislead: Wally Funk held the record (82, from NS-16 three months earlier) before Shatner. The parenthetical "(90)" is fine but "oldest person in space" without the qualifier "at time of flight" is technically stale (the record may have been broken since, though as of 2026 Shatner still holds it at 90). Minor phrasing issue only.
- **Correction:** No mandatory change; consider "(then-record, age 90)" for consistency with NS-16 Wally Funk entry which already uses "(then)".
- **Source:** Wikipedia Blue Origin NS-18; NPR
- **Confidence:** Medium

**Finding 3** 🔵 Consistency
- **File+field:** `static/data/fleet/crewed-spacecraft/new-shepard.json` → `flights[ns-16].crew[2].role` vs `flights[ns-18].crew[0].role`
- **Exact value:** Funk: `"Crew · oldest person in space (then)"` / Shatner: `"Crew · oldest person in space (90)"`
- **Issue:** Inconsistent format. Funk entry uses "(then)" qualifier; Shatner entry drops it and adds age number inline instead. Both held the record "then" — parallel phrasing would be more consistent.
- **Correction:** Standardize to `"Crew · oldest person in space (then, age 90)"` or just `"Crew · oldest person in space at launch (age 90)"`.
- **Source:** n/a (internal consistency)
- **Confidence:** High

---

## orion

**Finding 1** 🟠 Likely error
- **File+field:** `static/data/fleet/crewed-spacecraft/orion.json` → `flights[artemis2].flight_designation`
- **Exact value:** `"Artemis II (planned) · first crewed lunar flyby since 1972"`
- **Issue:** Artemis II launched on April 1, 2026, and has since completed its mission (as of July 2026). The label "(planned)" is now factually stale — the mission already flew. The description should reflect this completed status.
- **Correction:** Update to `"Artemis II (2026-04-01) · first crewed lunar flyby since Apollo 17, 1972"`. Also consider adding Artemis II to `linked_missions`.
- **Source:** NASA Artemis II Launch Day Updates (2026-04-01); SpacePolicyOnline; BBC Sky at Night
- **Confidence:** High

**Finding 2** 🟡 Imprecise
- **File+field:** `i18n-src/en-US/fleet/crewed-spacecraft/orion.json` → `description`
- **Exact value:** `"Flew uncrewed on Artemis I in 2022."`
- **Issue:** Technically accurate but the description is frozen at a past state and doesn't acknowledge Artemis II (flown April 2026). Museum-grade entries should reflect what has actually happened.
- **Correction:** Append: `"Flew its first crewed mission (Artemis II) in April 2026 with a four-person crew on a lunar flyby trajectory."`
- **Source:** NASA Artemis II
- **Confidence:** High

**Note — Artemis I date:** The `flights` entry dates Artemis I as `"2022-11-16"` — confirmed correct (launched November 16, 2022). No error.

---

## shenzhou

**Finding 1** 🟡 Imprecise
- **File+field:** `static/data/fleet/crewed-spacecraft/shenzhou.json` → `flights[shenzhou-19].flight_designation`
- **Exact value:** `"Shenzhou 19 (2024-10-29) · Cai + Song + Wang — current Tiangong crew (rotates with SZ-20)"`
- **Issue:** Shenzhou 19 returned to Earth on April 30, 2025, after Shenzhou 20 docked April 24, 2025. The entry describes them as "current Tiangong crew" which is now incorrect — they landed months ago. As of mid-2026 the current crew is Shenzhou 20 (Chen Dong, Chen Zhongrui, Wang Jie).
- **Correction:** Update to `"Shenzhou 19 (2024-10-29 – 2025-04-30) · Cai + Song + Wang — completed 6-month Tiangong mission; Wang Haoze first female Chinese flight engineer"`.
- **Source:** SpaceNews "Shenzhou-19 astronauts return" (2025); Wikipedia Shenzhou 19
- **Confidence:** High

**Note:** Launch date 1999-11-19 (first uncrewed Shenzhou) is correct. First crewed flight 2003-10-15 (Shenzhou 5, Yang Liwei) — not directly in `first_flight` field but consistent with narrative. No factual error in i18n-src description.

---

## soyuz-7k-ok

No findings. All verified facts check out:
- Soyuz 1 (1967-04-23) Komarov fatal — correct date and cause
- Soyuz 9 (1970-06-01) 18-day endurance — confirmed
- Soyuz 11 (1971-06-06) cabin depressurisation fatal — correct
- First crewed 1967 — correct

---

## soyuz-ms

**Finding 1** 🟡 Imprecise
- **File+field:** `i18n-src/en-US/fleet/crewed-spacecraft/soyuz-ms.json` → `description`
- **Exact value:** `"Continues to be the most-flown crewed spacecraft in history."`
- **Issue:** "Most-flown" applies to the entire Soyuz *family* (150+ crewed flights across all variants), not specifically to Soyuz MS (which as of 2026 has flown ~28 missions). The Soyuz MS alone has not individually flown more than any other single spacecraft type. The claim as written is misleading — it's the lineage, not this specific variant, that holds the record.
- **Correction:** `"Part of the Soyuz family — the most-flown crewed spacecraft lineage in history."` or remove the superlative from this specific variant entry.
- **Source:** Wikipedia Soyuz MS; Orbital Radar "Soyuz — The Most-Flown"
- **Confidence:** High

**Finding 2** 🔵 Consistency
- **File+field:** `static/data/fleet/crewed-spacecraft/soyuz-ms.json` → `flights[soyuz-ms-15].flight_designation`
- **Exact value:** `"… first Emirati in space (Hazza Al Mansoori, UAE)"`
- **Issue:** The name is spelled "Al Mansoori" in the flight designation but is spelled "Al Mansouri" in the search results and most primary sources (UAE official). Minor spelling inconsistency; both spellings appear in circulation but the UAE government generally uses "Al Mansouri".
- **Correction:** Verify against UAE official spelling; standardize. Most authoritative English-language sources use "Al Mansouri".
- **Source:** Wikipedia Hazza Al Mansouri; UAE government
- **Confidence:** Medium

**Note — MS-10 abort timing:** Entry says "T+119 s". Confirmed abort command was issued at T+121.57 s; the booster separation failure began at T+118–119 s. "T+119 s" refers to the *cause* onset, not the abort command — this is acceptably precise for a museum entry. No error flagged.

**Note — MS-10 "first in-flight launch abort since 1983":** Confirmed correct — the 1983 event was Soyuz T-10-1 (pad abort before ignition, technically a different abort mode). The entry says "first in-flight launch abort since 1983" — this is accurate in context; the 1983 incident used the LES before liftoff, MS-10 used it during ascent. No error.

---

## soyuz-t

**Finding 1** 🟠 Likely error
- **File+field:** `static/data/fleet/crewed-spacecraft/soyuz-t.json` → `flights[soyuz-t-2].flight_designation`
- **Exact value:** `"Soyuz T-2 (1980-06-05) · Malyshev + Aksyonov — first crewed flight of redesigned Soyuz T; first crew to Salyut 6"`
- **Issue:** "first crew to Salyut 6" is wrong. Soyuz T-2 was the 12th mission to Salyut 6. The first crewed docking to Salyut 6 was Soyuz 26 (December 1977, Romanenko + Grechko). Soyuz T-2 was purely the first *crewed* flight of the new Soyuz-T variant; it visited Salyut 6 to validate the new hardware, but was far from the station's first crew.
- **Correction:** `"Soyuz T-2 (1980-06-05) · Malyshev + Aksyonov — first crewed flight of the Soyuz-T variant; short validation visit to Salyut 6 (4 days)"`
- **Source:** Wikipedia Soyuz T-2; Wikipedia Salyut 6
- **Confidence:** High

**Note — Soyuz T-15 last entry:** "first crew to dock with both Mir and Salyut 7 in one flight" — confirmed correct. No error.

---

## soyuz-tm

**Finding 1** 🟠 Likely error
- **File+field:** `static/data/fleet/crewed-spacecraft/soyuz-tm.json` → `flights[soyuz-tm-2].flight_designation`
- **Exact value:** `"Soyuz TM-2 (1987-02-05) · Romanenko + Laveykin — first crew to Mir (TM-1 was uncrewed); 326 days"`
- **Issue:** TM-2 was not "first crew to Mir." Soyuz T-15 (March 1986) delivered the first crew to Mir (Kizim + Solovyov). Soyuz TM-2 was the first crewed flight of the *TM variant* and the *second* long-duration crew to Mir (EO-2). The parenthetical "(TM-1 was uncrewed)" correctly notes TM-1 was a test flight, but the claim "first crew to Mir" is wrong.
- **Correction:** `"Soyuz TM-2 (1987-02-05) · Romanenko + Laveykin — first crewed flight of the TM variant; second long-duration Mir crew (EO-2, 326 days)"`
- **Source:** Wikipedia Soyuz TM-2; Wikipedia Mir; Wikipedia Soyuz T-15
- **Confidence:** High

**Note — TM-31 date:** Entry says `"2000-10-31"` — confirmed (launched October 31, 2000). No error.

**Note — TM-4 "first 1-year spaceflight":** Titov + Manarov, 365 days, confirmed. No error.

---

## soyuz-tma

**Finding 1** 🟠 Likely error
- **File+field:** `static/data/fleet/crewed-spacecraft/soyuz-tma.json` → `description`
- **Exact value:** `"The ISS-era Soyuz (2002–2012)…"`
- **Issue:** The Soyuz TMA's last crewed flight was TMA-22 (November 2011 launch, returned April 2012), but the TMA-M subvariant (digital upgrade) began with TMA-01M in October 2010. If the entry means the *original* TMA series (TMA-1 through TMA-22), the period is 2002–2012. If "2002–2012" refers to TMA-22's return (April 2012), that is borderline acceptable. However, one search result claimed "last launch 2015-09-02" — this refers to the TMA-M subvariant (Soyuz TMA-18M), not the original TMA design. The entry's date range "2002–2012" is correct for the base TMA series if TMA-M is considered a separate entry (which it is not in the fleet). The description could be more precise.
- **Correction:** Clarify: `"The ISS-era Soyuz (2002–2016)"` if treating TMA and TMA-M as one family, or `"The ISS-era Soyuz TMA series (2002–2012)"` if distinguishing from TMA-M. Current text omits TMA-M entirely.
- **Source:** Wikipedia Soyuz TMA; Wikipedia Soyuz TMA-M; Wikipedia Soyuz TMA-22
- **Confidence:** Medium (depends on whether TMA-M is a separate fleet entry)

**Finding 2** 🟡 Imprecise
- **File+field:** `static/data/fleet/crewed-spacecraft/soyuz-tma.json` → `flights[soyuz-tma-16m].flight_designation`
- **Exact value:** `"Soyuz TMA-16M (2015-03-27) · Kornienko + Padalka + Kelly — Scott Kelly + Kornienko: first 340-day ISS mission; identical-twin study with Mark Kelly"`
- **Issue:** Two sub-issues: (a) The mission is more precisely described as "approximately 340-day" (actual 340 days 8 hours); referring to it as "first 340-day ISS mission" implies a specific milestone rather than describing a Year in Space mission. (b) Gennady Padalka is listed but only Kelly + Kornienko did the year-long stay; Padalka returned early on TMA-16M. Minor phrasing imprecision.
- **Correction:** `"Soyuz TMA-16M (2015-03-27) · Kornienko + Padalka + Kelly — Kelly + Kornienko: ~340-day Year in Space mission (returned via TMA-18M); NASA Twins Study"`
- **Source:** Wikipedia ISS year-long mission; NASA
- **Confidence:** High

**Note — TMA-22 date:** Entry says `"2011-11-13"` but confirmed launch was `2011-11-14` at 04:14 UTC. The entry is off by one day (likely a timezone artefact — it may be November 13 Baikonur local time, but UTC date is November 14).
- 🔴 Actually this is borderline — November 14 UTC is confirmed. Local Baikonur time would be UTC+6, so launch at 04:14 UTC = 10:14 local on November 14. Both dates are November 14 regardless of timezone. The `2011-11-13` is therefore **wrong**.

**Supplemental Finding** 🔴 Factual error
- **File+field:** `static/data/fleet/crewed-spacecraft/soyuz-tma.json` → `flights[soyuz-tma-22].flight_designation`
- **Exact value:** `"Soyuz TMA-22 (2011-11-13)…"`
- **Issue:** Soyuz TMA-22 launched on November 14, 2011 (04:14:03 UTC). The date `2011-11-13` is wrong by one day — confirmed by Wikipedia, NASASpaceFlight, spacefacts.de, and multiple other sources. There is no timezone scenario that puts the launch on November 13.
- **Correction:** `"Soyuz TMA-22 (2011-11-14)…"`
- **Source:** Wikipedia Soyuz TMA-22; NASASpaceFlight; spacefacts.de
- **Confidence:** Very High

*(Revising summary table below — soyuz-tma now has 1🔴)*

---

## space-shuttle-orbiter

**Finding 1** 🟡 Imprecise
- **File+field:** `i18n-src/en-US/fleet/crewed-spacecraft/space-shuttle-orbiter.json` → `description`
- **Exact value:** `"Five flight orbiters were built (Columbia, Challenger, Discovery, Atlantis, Endeavour)"`
- **Issue:** Technically correct for *flight* orbiters. However, Enterprise (OV-101) was also built as a test orbiter used for Approach and Landing Tests (1977). The statement "five flight orbiters were built" could mislead if users know about Enterprise. The word "flight" does distinguish them correctly, but a note like "(plus Enterprise, atmospheric tests only)" would be more complete for a museum-grade atlas.
- **Correction:** Minor; optionally add `"; Enterprise built for atmospheric tests only, never flew in orbit"`. Not a factual error, just an omission of context.
- **Source:** Wikipedia Space Shuttle; ESA Space Shuttle fleet
- **Confidence:** Medium (matter of editorial completeness vs. error)

**Note:** 135 missions confirmed. First flight 1981-04-12 confirmed. Both disasters (Challenger 1986-01-28, Columbia 2003-01-16) confirmed. Sally Ride STS-7 confirmed (first US woman in space). All crew names in flights spot-checked and correct. No factual errors.

---

## starliner

**Finding 1** 🟡 Imprecise
- **File+field:** `static/data/fleet/crewed-spacecraft/starliner.json` → `status`
- **Exact value:** `"ACTIVE"`
- **Issue:** After CFT's uncrewed return (September 2024) and NASA's classification of the mission as a Type A mishap (February 2026), Starliner's next crewed flight is now projected no earlier than 2027 per NASA's Inspector General. The program is technically still ongoing (Starliner-1 cargo flight planned) but calling it "ACTIVE" without qualification is misleading — it has not flown crew since June 2024 and cannot fly crew for at least another year. "GROUNDED" or "SUSPENDED (crewed)" would be more accurate.
- **Correction:** Consider status `"SUSPENDED"` or add a note. At minimum the description should be updated to reflect the post-CFT situation.
- **Source:** SpaceNews; NASA OIG report (2026-02); Spaceflight Now June 2026
- **Confidence:** High

**Finding 2** 🟡 Imprecise
- **File+field:** `i18n-src/en-US/fleet/crewed-spacecraft/starliner.json` → `description`
- **Exact value:** `"Crew Flight Test launched in 2024 with Butch Wilmore and Suni Williams."`
- **Issue:** This is accurate but incomplete. The description omits the outcome: thruster failures and helium leaks caused a months-long delay, NASA decided to return the capsule uncrewed (September 6–7, 2024), and Wilmore + Williams returned to Earth via SpaceX Crew-9 in February 2025. The description as written implies a routine mission; the situation was anything but.
- **Correction:** Extend to: `"Crew Flight Test (June 2024) suffered thruster failures and helium leaks; NASA returned the capsule uncrewed (September 2024). Wilmore and Williams returned via SpaceX Crew-9 (February 2025). Crewed flights suspended pending recertification."`
- **Source:** NASA CFT FAQ; Wikipedia Boeing Crew Flight Test; ABC News timeline
- **Confidence:** High

**Note — CFT date:** `"2024-06-05"` — confirmed correct. No error.

---

## voskhod

**Finding 1** 🟡 Imprecise
- **File+field:** `static/data/fleet/crewed-spacecraft/voskhod.json` → `flights[voskhod-2].flight_designation`
- **Exact value:** `"… first EVA (Leonov, 12 min)"`
- **Issue:** The official EVA duration (airlock exit to re-entry) was 12 minutes 9 seconds. "12 min" is a reasonable round figure but the total time Leonov was *outside* (from capsule airlock deployment start to final closure) was different from the EVA itself. The 12-minute figure matches the standard cited duration of the actual spacewalk. No material error, but "approximately 12 min" would be more precise. The i18n-src `dispatch` says "near-disaster of its second flight" — confirmed (suit ballooning, manual landing in Urals forest). All accurate.
- **Correction:** No mandatory change; `"12 min"` is the accepted shorthand. Minor precision note only.
- **Source:** Wikipedia Voskhod 2; FAI 60th anniversary
- **Confidence:** High

**Note:** Voskhod 1 date 1964-10-12 — correct. No spacesuits note — correct. Leonov EVA date March 18, 1965 — correct (Voskhod 2 flight designation says 1965-03-18).

---

## vostok

No findings. All verified claims correct:
- Vostok 1 (1961-04-12) Gagarin 108 min — confirmed
- Vostok 2 (1961-08-06) Titov 17 orbits — confirmed
- Vostok 5 Bykovsky "longest solo crewed spaceflight ever (4 days 23 h, still standing in 2026)" — confirmed
- Vostok 6 Tereshkova first woman — confirmed
- Six crewed flights — confirmed

---

## x37b

**Finding 1** 🟡 Imprecise
- **File+field:** `static/data/fleet/crewed-spacecraft/x37b.json` → `category`
- **Exact value:** `"crewed-spacecraft"`
- **Issue:** The X-37B is explicitly **uncrewed** (robotic). The `credit` field itself states "Carried as crewed-spacecraft category for its Shuttle-style aeroshell + lifting-body re-entry profile even though it flies uncrewed." This is a deliberate editorial choice acknowledged in-file, but it is a categorization mismatch that any museum visitor would find confusing. The i18n-src description correctly says "Robotic mini-spaceplane." There is no explicit label in the i18n-src calling it "crewed" — the mismatch is purely the category bucket.
- **Correction:** Flagging as a known acknowledged issue for editorial decision. At minimum the visible category label on /fleet should note "uncrewed / robotic" to prevent confusion.
- **Source:** USSF X-37B fact sheet; Wikipedia Boeing X-37
- **Confidence:** High

**Finding 2** 🔵 Consistency
- **File+field:** `static/data/fleet/crewed-spacecraft/x37b.json` → `flights[otv-7].flight_designation`
- **Exact value:** `"X-37B OTV-7 (USA-358, USSF-52) (2023-12-29) · 434d · Falcon Heavy · Vandenberg SFB"`
- **Issue:** OTV-7 landed on March 7, 2025. The mission duration of 434 days is correct. However, the landing location "Vandenberg SFB" is stated; multiple sources confirm landing at Vandenberg Space Force Base. The launch was from Kennedy Space Center LC-39A (Falcon Heavy), not Vandenberg — but the flight designation doesn't claim the launch site, so this is internally consistent. Minor note: the designation abbreviates "Vandenberg Space Force Base" as "Vandenberg SFB" while "Space Force Base" = SFB is not standard (it should be VSFB). No material factual error, just abbreviation style.
- **Correction:** Consider "Vandenberg VSFB" or "Vandenberg SFB" → "Vandenberg Space Force Base" for clarity.
- **Source:** Spaceflight Now OTV-7 landing report (2025-03-07); Wikipedia OTV-7
- **Confidence:** Medium

---

## Revised Summary Table (after soyuz-tma-22 date error upgrade)

| Vehicle | 🔴 Error | 🟠 Likely | 🟡 Imprecise | 🔵 Consistency | Total |
|---|---|---|---|---|---|
| mercury-capsule | 0 | 0 | 1 | 0 | 1 |
| new-shepard | 0 | 1 | 1 | 1 | 3 |
| orion | 0 | 1 | 1 | 0 | 2 |
| shenzhou | 0 | 0 | 1 | 0 | 1 |
| soyuz-7k-ok | 0 | 0 | 0 | 0 | 0 |
| soyuz-ms | 0 | 0 | 1 | 1 | 2 |
| soyuz-t | 0 | 1 | 0 | 0 | 1 |
| soyuz-tm | 0 | 1 | 0 | 0 | 1 |
| soyuz-tma | 1 | 1 | 1 | 0 | 3 |
| space-shuttle-orbiter | 0 | 0 | 1 | 0 | 1 |
| starliner | 0 | 0 | 2 | 0 | 2 |
| voskhod | 0 | 0 | 1 | 0 | 1 |
| vostok | 0 | 0 | 0 | 0 | 0 |
| x37b | 0 | 0 | 1 | 1 | 2 |
| **TOTAL** | **1** | **4** | **11** | **3** | **19** |

---

## Key Corrections Priority

**Immediate fixes (🔴/🟠):**
1. `soyuz-tma` → TMA-22 date: `2011-11-13` → `2011-11-14` (off by one day, confirmed wrong)
2. `soyuz-t` → T-2 flight description: remove "first crew to Salyut 6" (was 12th mission to Salyut 6)
3. `soyuz-tm` → TM-2 description: remove "first crew to Mir" (Soyuz T-15 was first; TM-2 was first TM-variant crewed flight)
4. `orion` → Artemis II: remove "(planned)"; mission flew April 1, 2026
5. `new-shepard` → NS-18 crew: add Boshuizen + De Vries (2 of 4 crew missing)

**Should-fix (🟡):**
6. `mercury-capsule` → `first_flight` should be `1961-05-05` not `1962-02-20`
7. `starliner` → status should not be "ACTIVE"; description needs CFT outcome
8. `shenzhou` → SZ-19 "current crew" claim is stale (returned April 2025)
9. `soyuz-ms` → "most-flown" claim applies to Soyuz family, not MS variant specifically
10. `soyuz-tma` → date range "2002–2012" needs clarification re TMA-M continuity
