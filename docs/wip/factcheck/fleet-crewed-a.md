# Fact-check: Fleet — Crewed Spacecraft (Batch A)

Checked 14 entries · 2026-07-14

---

## Summary Table

| Entry | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| apollo-csm-block-i | Minor issues | 0 | 1 | 1 | 1 |
| apollo-csm-block-ii | Issues | 0 | 2 | 0 | 0 |
| apollo-lm | Issues | 1 | 1 | 0 | 0 |
| atlantis | Clean | 0 | 1 | 0 | 0 |
| buran-ok-gli | Minor issue | 0 | 0 | 1 | 0 |
| buran | Clean | 0 | 0 | 0 | 1 |
| challenger | Issues | 0 | 1 | 1 | 0 |
| columbia | Issues | 0 | 1 | 1 | 0 |
| crew-dragon | Issues | 1 | 0 | 1 | 0 |
| discovery | Clean | 0 | 0 | 1 | 0 |
| endeavour | Clean | 0 | 0 | 0 | 0 |
| enterprise | Issues | 0 | 1 | 1 | 0 |
| gaganyaan | Issues | 1 | 0 | 0 | 0 |
| gemini | Issues | 0 | 1 | 1 | 0 |
| **TOTALS** | | **2** | **9** | **8** | **2** |

---

## Findings by Entry

---

### apollo-csm-block-i

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/apollo-csm-block-i.json`
- `static/data/fleet/crewed-spacecraft/apollo-csm-block-i.json`

**Claims evaluated:**

The entry correctly states that no Block I CSM ever flew crewed, that the Apollo 1 fire occurred on 1967-01-27, that AS-201 and AS-202 were uncrewed suborbital tests, and that the inward-opening hatch was sealed against 29 psi. The description mentions only CSM-009 (AS-201) and CSM-011 (AS-202) as uncrewed flights.

#### Finding 1 — 🟠 Misleading / incomplete: AS-203 omitted from uncrewed flight list

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/apollo-csm-block-i.json`, `description`
- **Quote:** "CSM-009 + CSM-011 flew uncrewed suborbital tests (AS-201 1966-02-26 + AS-202 1966-08-25)"
- **Issue:** AS-203 (1966-07-05) also flew a Block I vehicle — it was an uncrewed orbital mission carrying only the S-IVB stage (no CSM aboard), testing propellant behavior in zero-g. Technically no CSM serial number flew, but the mission is part of the Block I test sequence and is entirely absent. Also, Apollo 4 (1967-11-09) flew CSM-017, an unmanned Block I command module on the first Saturn V flight — this is a significant omission from the uncrewed flight record.
- **Correction:** Apollo 4 (1967-11-09) flew CSM-017 — a Block I command module on the first all-up Saturn V; Apollo 6 (1968-04-04) flew CSM-020 — another Block I on the second Saturn V. Both flew after the Apollo 1 fire and should appear in the uncrewed flight list.
- **Source:** https://en.wikipedia.org/wiki/Apollo_command_and_service_module#Block_I
- **Confidence:** High

#### Finding 2 — 🟡 Minor / wording: Apollo 1 date in tagline uses wrong date (pad fire)

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/apollo-csm-block-i.json`, `tagline` and `best_known_for`
- **Quote:** "killed Apollo 1 crew on the pad 1967-01-27"
- **Issue:** The Apollo 1 fire was on 1967-01-27, which is correct. No error here — this is accurate.
- **Verdict:** Correct. No change needed. Marking as checked.

#### Finding 3 — 🔵 Note: Cabin pressure claim needs precision

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/apollo-csm-block-i.json`, `description`
- **Quote:** "Pure-O₂ pressurised cabin at 16.7 psi pre-launch (5 psi in flight)"
- **Issue:** 16.7 psi is the approximate atmospheric pressure at sea level (equivalent to 1 atm = 14.696 psi, so 16.7 psi is slightly overstated — the standard sea-level atmosphere is ~14.7 psi). The cabin was pressurized to slightly above sea level for the plugs-out test. Some sources say 16 psi, some 16.7 psi. The in-flight operational pressure was 5 psi pure O2. This is not definitively wrong but the pre-launch overpressure figure varies by source.
- **Correction:** Standard sea-level = 14.7 psi; plugs-out test pressure was reportedly 16.7 psi per some sources (slightly above sea level). Cannot definitively flag as wrong.
- **Source:** https://history.nasa.gov/Apollo204/
- **Confidence:** Medium (ambiguous across sources)

---

### apollo-csm-block-ii

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/apollo-csm-block-ii.json`
- `static/data/fleet/crewed-spacecraft/apollo-csm-block-ii.json`

**Claims evaluated:**

The description says "Eleven flights — including Apollo 13's improvised lifeboat configuration — plus three Skylab visits and the Apollo-Soyuz Test Project." The static data file lists flights apollo7 through apollo17 (11 crewed lunar program flights), plus skylab-2, skylab-3, skylab-4, and apollo-soyuz. The i18n dispatch says "it brought every astronaut who set out for the Moon back alive."

#### Finding 1 — 🟠 Misleading: "eleven flights" undercounts total Block II crewed missions

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/apollo-csm-block-ii.json`, `description`
- **Quote:** "Eleven flights — including Apollo 13's improvised lifeboat configuration — plus three Skylab visits and the Apollo-Soyuz Test Project"
- **Issue:** The framing "eleven flights... plus three Skylab visits and ASTP" implies 11 + 3 + 1 = 15 crewed Block II flights total. Counting: Apollo 7 through Apollo 17 = 11 missions. Skylab 2, 3, 4 = 3 missions. ASTP = 1 mission. Total = 15. This is correct arithmetic but the prose structure "eleven flights... plus" creates an ambiguous read. Not strictly wrong but the wording "eleven flights" as a standalone count is confusing — it sounds like the total.
- **Correction:** Clarify as "Fifteen crewed flights in total: Apollo 7–17 (eleven missions), three Skylab crew rotations, and the 1975 Apollo-Soyuz Test Project."
- **Source:** https://en.wikipedia.org/wiki/Apollo_command_and_service_module
- **Confidence:** High

#### Finding 2 — 🟠 Misleading: "brought every astronaut who set out for the Moon back alive" — Apollo 1 caveat

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/apollo-csm-block-ii.json`, `dispatch`
- **Quote:** "it brought every astronaut who set out for the Moon back alive"
- **Issue:** This claim is specifically about Block II and the Moon — the Apollo 1 crew died in a Block I vehicle on the ground, not Block II and not "setting out for the Moon." So the literal claim is technically accurate. However, it could mislead a reader into thinking the overall Apollo program had no fatalities. The prose context is about reentry from the Moon, so this is marginal — but for a museum-grade atlas the implied meaning matters.
- **Correction:** The literal statement is accurate; consider adding a qualifying note that Block I was a different vehicle and its crew died before Block II flew.
- **Source:** https://en.wikipedia.org/wiki/Apollo_command_and_service_module
- **Confidence:** Medium (contextual reading)

#### Finding 3 — Note: `first_flight` field is the first CREWED Block II flight (correct)

- **File:** `static/data/fleet/crewed-spacecraft/apollo-csm-block-ii.json`
- **Quote:** `"first_flight": "1968-10-11"`
- **Note:** Apollo 7 launched 1968-10-11. This is the first crewed Block II flight. Correct.

---

### apollo-lm

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/apollo-lm.json`
- `static/data/fleet/crewed-spacecraft/apollo-lm.json`

**Claims evaluated:**

The static data lists `"first_flight": "1968-10-11"` — this is the date of Apollo 7, which did NOT carry a Lunar Module (the LM was not ready). The flights list in the static file starts with Apollo 5 (1968-01-22, uncrewed LM-1 test) then Apollo 9 (1969-03-03, first crewed LM flight).

#### Finding 1 — 🔴 Wrong fact: `first_flight` date is incorrect for the Apollo LM

- **File:** `static/data/fleet/crewed-spacecraft/apollo-lm.json`
- **Quote:** `"first_flight": "1968-10-11"`
- **Issue:** 1968-10-11 is the launch date of Apollo 7 — a Command Module-only mission that did NOT fly a Lunar Module. The LM's first flight was Apollo 5 on 1968-01-22 (uncrewed). The first *crewed* LM flight was Apollo 9 on 1969-03-03. The `first_flight` date is apparently copied from the apollo-csm-block-ii entry and is wrong for the LM.
- **Correction:** If `first_flight` means first LM flight (uncrewed): `1968-01-22` (Apollo 5). If it means first *crewed* LM flight: `1969-03-03` (Apollo 9). The current value `1968-10-11` is incorrect for either interpretation.
- **Source:** https://en.wikipedia.org/wiki/Apollo_Lunar_Module
- **Confidence:** Very high

#### Finding 2 — 🟠 Misleading: description says "Six successful landings" — Apollo 13 LM was the lifeboat

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/apollo-lm.json`, `description`
- **Quote:** "Six successful landings between 1969 and 1972 — Eagle, Intrepid, Antares, Falcon, Orion, Challenger — plus Aquarius, which served as Apollo 13's lifeboat."
- **Issue:** This is actually correct. There were exactly six lunar landings (Apollo 11, 12, 14, 15, 16, 17) and the LMs named are correct. Aquarius (Apollo 13) did not land. The statement is accurate.
- **Verdict:** Correct. However, the description omits that Snoopy (LM-4, Apollo 10) descended to 15.6 km above the lunar surface — notable but not a landing. No correction needed for the six-landings claim.

#### Finding 3 — Note (additional): `era` field says "1969-1981" but first LM flight was 1968

- **File:** `static/data/fleet/crewed-spacecraft/apollo-lm.json`
- **Quote:** `"era": "1969-1981"`
- **Issue:** The LM's first flight (Apollo 5) was in January 1968. The era start of 1969 appears to track when crewed landings began, but the vehicle itself flew in 1968. This is a categorization choice rather than an outright error, but it's inconsistent with the `first_flight` discussion above. If `first_flight` is meant to reflect 1968, then era should start in 1968.
- **Confidence:** Medium (depends on era definition)

---

### atlantis

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/atlantis.json`
- `static/data/fleet/crewed-spacecraft/atlantis.json`

**Claims evaluated:**

Both files are consistent and detailed. Let's check specific claims.

#### Finding 1 — 🟠 Slightly imprecise: "7 of the 9 Shuttle-Mir docking missions" — actual count

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/atlantis.json`, `description` and `static/data/fleet/crewed-spacecraft/atlantis.json`, `credit`
- **Quote:** "flew 7 of the 9 Shuttle-Mir docking missions between 1995-1997"
- **Issue:** The Shuttle-Mir program flew nine Shuttle docking missions to Mir (STS-71, 74, 76, 79, 81, 84, 86, 89, 91). Atlantis flew STS-71, 74, 76, 79, 81, 84, 86 = 7 missions. STS-89 and STS-91 were flown by Endeavour and Discovery respectively. The "7 of 9" claim is correct. The dates "1995-1997" are also correct for Atlantis's Mir docking flights (STS-71 June 1995 through STS-86 September 1997). Note: STS-89 (Endeavour, Jan 1998) and STS-91 (Discovery, June 1998) happened after 1997 but Atlantis's share ended in 1997. This is accurate.
- **Correction:** No change needed on the 7-of-9 count. The description in i18n-src says "7 of the 9 Shuttle-Mir docking missions" without specifying the other two were Endeavour/Discovery — worth adding for completeness, but not factually wrong.
- **Source:** https://en.wikipedia.org/wiki/Shuttle%E2%80%93Mir_program
- **Confidence:** High

---

### buran-ok-gli

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/buran-ok-gli.json`
- `static/data/fleet/crewed-spacecraft/buran-ok-gli.json`

**Claims evaluated:**

Both files agree: 24 atmospheric flights 1985-11-10 through 1988-04-15, at Zhukovsky. The vehicle was BTS-002 (the static file incorrectly uses "BTS-002" vs the i18n which says "Officially BTS-002").

#### Finding 1 — 🟡 Minor: Category mismatch — OK-GLI is categorized as "crewed-spacecraft"

- **File:** `static/data/fleet/crewed-spacecraft/buran-ok-gli.json`
- **Quote:** `"category": "crewed-spacecraft"`
- **Issue:** OK-GLI never carried a crew in any of its 24 flights — all atmospheric tests were piloted only for the approach/landing phase with test pilots in the cockpit, but it was an *atmospheric test vehicle*, not a crewed spacecraft in the conventional sense. The same applies to Enterprise. This is a categorization decision rather than a factual error, but worth flagging for consistency: both Enterprise and OK-GLI fit better as "test vehicles" within a crewed-spacecraft section.
- **Correction:** Depends on the data model's intent. If category = "crewed-spacecraft" means "part of a crewed spacecraft program," OK-GLI qualifies. If it means "carried crew to space," it does not. The data model appears to use the former definition (Enterprise is also in this category). No change needed if the model definition is intentional.
- **Source:** https://en.wikipedia.org/wiki/OK-GLI
- **Confidence:** High (categorization issue, not factual)

---

### buran

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/buran.json`
- `static/data/fleet/crewed-spacecraft/buran.json`

**Claims evaluated:**

Both files correctly state: one unmanned orbital flight on 1988-11-15, never crewed, program cancelled after Soviet collapse, orbiter destroyed in hangar collapse 2002.

#### Finding 1 — 🔵 Note: "Soviet shuttle" categorized under Roscosmos agency

- **File:** `static/data/fleet/crewed-spacecraft/buran.json`
- **Quote:** `"agency": "Roscosmos"`, `"country": "USSR"`
- **Issue:** Buran was built and flown under the Soviet Ministry of General Machine Building (Minsredmash) and the Soviet space program, not Roscosmos (which was established in 1992, after Buran's only flight in 1988 and after Soviet collapse). The NPO Energia led the program. "Roscosmos" is an anachronism — should be "Soviet Space Program" or "NPO Energia / Ministry of General Machine Building." The `country: USSR` is correct.
- **Correction:** Agency should reflect the Soviet program, not Roscosmos. However, this may be a deliberate data-model simplification (Russia/Roscosmos as the successor agency). Flag for editorial consideration.
- **Source:** https://en.wikipedia.org/wiki/Buran_programme
- **Confidence:** High

---

### challenger

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/challenger.json`
- `static/data/fleet/crewed-spacecraft/challenger.json`

**Claims evaluated:**

Both files state: STS-51-L, 1986-01-28, 7 crew killed, T+73s failure. The static data lists 4 flights in its `flights` array (STS-6, STS-41-B, STS-41-G, STS-51-L) but the description says "10 missions before STS-51-L."

#### Finding 1 — 🟠 Incomplete: flights array has only 4 of 10 entries (misleading count)

- **File:** `static/data/fleet/crewed-spacecraft/challenger.json`, `flights` array
- **Quote:** The `flights` array contains only STS-6, STS-41-B, STS-41-G, STS-51-L (4 entries)
- **Issue:** Challenger flew 10 missions total: STS-6, STS-7, STS-8, STS-41-B, STS-41-C, STS-41-G, STS-51-B, STS-51-F, STS-51-L, and one more (STS-61-A). Actually the complete list is: STS-6 (1983), STS-7 (1983), STS-8 (1983), STS-41-B (1984), STS-41-C (1984), STS-41-G (1984), STS-51-B (1985), STS-51-F (1985), STS-61-A (1985), STS-51-L (1986) = 10 missions. The flights array only includes 4 of these 10. The description text correctly states "10 missions" but the data doesn't enumerate them.
- **Correction:** The flights array is incomplete. The description text is correct ("Flew 10 missions"). The missing missions include STS-7 (first American woman, Sally Ride), STS-8, STS-41-C, STS-51-B, STS-51-F, STS-61-A.
- **Source:** https://en.wikipedia.org/wiki/Space_Shuttle_Challenger
- **Confidence:** Very high

#### Finding 2 — 🟡 Minor: Description mentions Sally Ride in dispatch but omits her mission designation

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/challenger.json`, `dispatch`
- **Quote:** "carried the first American woman, Sally Ride, to orbit"
- **Issue:** The claim is accurate — Sally Ride flew on STS-7 (1983-06-18) aboard Challenger. No factual error, just notably absent from the flights array (STS-7 is not listed).
- **Correction:** No factual error. STS-7 should be added to the flights array (see Finding 1 above).
- **Source:** https://en.wikipedia.org/wiki/STS-7
- **Confidence:** High

---

### columbia

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/columbia.json`
- `static/data/fleet/crewed-spacecraft/columbia.json`

**Claims evaluated:**

Both files agree: first flight STS-1 (1981-04-12), 28 missions, lost STS-107 (2003-02-01), seven crew named correctly (Husband, McCool, Anderson, Brown, Chawla, Clark, Ramon).

#### Finding 1 — 🟠 Imprecise: STS-95 — John Glenn described as "Senator"

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/columbia.json`, `description`
- **Quote:** "Senator John Glenn's STS-95 return-to-space in 1998"
- **Issue:** John Glenn was indeed a US Senator from Ohio when he flew STS-95 in October 1998. He retired from the Senate in January 1999. So "Senator" is technically correct for his title at the time of the flight. No factual error. The static/data credit file also says "Senator John Glenn."
- **Verdict:** Correct.

#### Finding 2 — 🟠 Slightly misleading: "the first crewed test flight of a new American spacecraft in 25 years"

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/columbia.json`, `description`
- **Quote:** "STS-1 (the first crewed test flight of a new American spacecraft in 25 years)"
- **Issue:** Apollo-Soyuz (1975) was the last US crewed spaceflight before STS-1 (1981) — a gap of ~6 years, not 25 years. The "25 years" refers to the last time a *new, unproven* American spacecraft was flown on its maiden voyage with crew aboard — Gemini 3 (1965) was the first crewed Gemini flight. From 1965 to 1981 = 16 years. Mercury/Atlas (John Glenn, 1962) to 1981 = 19 years. The correct reference is that STS-1 was unique in being the only time a new US crewed spacecraft's very first flight was crewed (all others flew uncrewed test flights first). The "25 years" figure does not correspond to any clear interval and is likely inaccurate.
- **Correction:** The factually defensible claim is: "STS-1 was the first (and only) US crewed spacecraft to fly its maiden voyage with crew aboard" — no new American spacecraft had done that since... never (Mercury flew John Glenn on its 3rd orbital flight, Gemini flew uncrewed first, Apollo flew uncrewed first). The "25 years" figure appears to be invented or refers to an unclear baseline. Delete or replace with the correct unique distinction.
- **Source:** https://en.wikipedia.org/wiki/STS-1
- **Confidence:** High

#### Finding 3 — 🟡 Minor: STS-107 launch date vs loss date

- **File:** `static/data/fleet/crewed-spacecraft/columbia.json`, `flights` array
- **Quote:** `"STS-107 (2003-01-16) · LOST on re-entry 2003-02-01"`
- **Issue:** STS-107 launched 2003-01-16 and was lost on re-entry 2003-02-01. Both dates are correctly stated in the flights array. The `best_known_for` field also correctly states `2003-02-01`. No error here.
- **Verdict:** Correct.

---

### crew-dragon

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/crew-dragon.json`
- `static/data/fleet/crewed-spacecraft/crew-dragon.json`

**Claims evaluated:**

First flight listed as `2020-05-30` (Demo-2). The i18n description says "the first commercial vehicle to carry humans to orbit (Demo-2, 2020)."

#### Finding 1 — 🔴 Wrong: Description says "first commercial vehicle to carry humans to orbit" — needs precision

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/crew-dragon.json`, `description`
- **Quote:** "the first commercial vehicle to carry humans to orbit (Demo-2, 2020)"
- **Issue:** The claim is directionally correct but imprecise in a material way: SpaceShipOne (Scaled Composites / Virgin Galactic, 2004) was a commercial vehicle that carried humans to *suborbital* space. Crew Dragon (Demo-2, 2020-05-30) was indeed the first *privately built/operated* crewed vehicle to reach *orbit*, breaking a monopoly held by government vehicles (Soyuz, Shuttle). The claim is correct if "orbit" is the qualifier, but the phrase "first commercial vehicle to carry humans" without strong orbital emphasis could be read as excluding SpaceShipOne. The i18n text does say "to orbit" so the claim is technically accurate.
- **Correction:** The claim is technically accurate as written (says "to orbit"). However, for a museum-grade atlas, clarify: "first privately developed and operated spacecraft to carry humans to orbit." The word "commercial" is slightly ambiguous since Shuttle contractors were commercial but the vehicle was government-operated.
- **Source:** https://en.wikipedia.org/wiki/SpaceX_Crew_Dragon
- **Confidence:** Medium (depends on definitional precision)

#### Finding 2 — 🔴 Wrong fact: Description says "the trunk's body-mounted solar cells" — Crew Dragon trunk has deployable solar arrays

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/crew-dragon.json`, `description`
- **Quote:** "The trunk's body-mounted solar cells differ visibly from every other crewed spacecraft's deployable wings."
- **Issue:** This is factually incorrect. The Crew Dragon trunk does NOT have body-mounted solar cells — it has two deployable solar array panels that fold out from the trunk. They are clearly visible in photos as extending panels, not flush body-mounted cells. The claim that they "differ from deployable wings" inverts the reality: Crew Dragon HAS deployable panels; the trunk panels rotate out from the cylindrical trunk. This is a flat error in the description.
- **Correction:** The Crew Dragon's trunk features two solar array panels that deploy after fairing separation. They are deployable, not body-mounted. The distinctive visual feature is that the trunk is jettisoned before re-entry (no heat shield on trunk). Remove or correct the "body-mounted solar cells" claim.
- **Source:** https://en.wikipedia.org/wiki/SpaceX_Dragon_2 ; https://www.spacex.com/vehicles/dragon/
- **Confidence:** High

#### Finding 3 — 🟡 Minor: The `first_flight` field uses the Demo-2 crewed date, not Demo-1 (uncrewed)

- **File:** `static/data/fleet/crewed-spacecraft/crew-dragon.json`
- **Quote:** `"first_flight": "2020-05-30"`
- **Issue:** Crew Dragon flew its first uncrewed demonstration (Demo-1) on 2019-03-02. The `first_flight` of 2020-05-30 refers to Demo-2, the first *crewed* flight. For a crewed spacecraft fleet entry, using the first crewed flight date is defensible, but it's inconsistent with how, e.g., Apollo LM lists its first_flight as the first vehicle flight (1968-01-22). The inconsistency is a data modeling issue.
- **Correction:** Either standardize on "first flight of the vehicle" (2019-03-02, Demo-1 uncrewed) or "first crewed flight" (2020-05-30, Demo-2) consistently across all entries. Document which convention is used.
- **Confidence:** Medium (data model convention)

---

### discovery

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/discovery.json`
- `static/data/fleet/crewed-spacecraft/discovery.json`

**Claims evaluated:**

Both files state: first flight STS-41-D (1984-08-30), 39 missions, Hubble deployed STS-31, both return-to-flight missions, John Glenn STS-95 at age 77, final flight STS-133.

#### Finding 1 — 🟡 Minor: "36 years after his 1962 Friendship 7 flight" — calculation

- **File:** `static/data/fleet/crewed-spacecraft/discovery.json`, `flights` array
- **Quote:** "STS-95 (1998-10-29) · returned John Glenn to orbit at age 77 (36 years after his 1962 Friendship 7 flight)"
- **Issue:** Glenn's Friendship 7 flight was 1962-02-20. STS-95 flew 1998-10-29. The gap is 36 years 8 months, so "36 years" is correct (rounding down). Glenn was born 1921-07-18; at STS-95 he was 77 years old. Both figures are accurate.
- **Verdict:** Correct.

#### Finding 2 — 🟡 Minor: i18n description says "flew both return-to-flight missions" — accurate check

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/discovery.json`, `description` and `dispatch`
- **Quote:** "STS-26 (1988-09-29) was the post-Challenger return-to-flight; STS-114 (2005-07-26) was the post-Columbia return-to-flight"
- **Issue:** Both dates are correct. STS-26 launched 1988-09-29, first Shuttle flight after Challenger (32-month gap). STS-114 launched 2005-07-26, first Shuttle flight after Columbia (29-month gap). Discovery flying both is a genuine, accurate distinction.
- **Verdict:** Correct.

---

### endeavour

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/endeavour.json`
- `static/data/fleet/crewed-spacecraft/endeavour.json`

**Claims evaluated:**

Both files are consistent and detailed. First flight STS-49 (1992-05-07), built to replace Challenger, named after HMS Endeavour (Cook's vessel).

All factual claims checked: STS-49 first three-person EVA, STS-61 first Hubble servicing (COSTAR + WFPC2), STS-88 first ISS assembly, STS-100 Canadarm2, STS-130 Tranquility + Cupola, STS-134 AMS-02 and final EVA crew. All are accurate.

The note about Barbara Morgan (STS-118, "teacher Barbara Morgan, originally a Challenger backup") is correct — Morgan was the backup Teacher in Space to Christa McAuliffe.

**Verdict: No findings. Entry is clean.**

---

### enterprise

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/enterprise.json`
- `static/data/fleet/crewed-spacecraft/enterprise.json`

**Claims evaluated:**

Both files correctly state Enterprise never reached orbit, was renamed from Constitution, ALT programme 1977.

#### Finding 1 — 🟠 Imprecise: Renamed after "Star Trek's 10th anniversary"

- **File:** `static/data/fleet/crewed-spacecraft/enterprise.json`, `credit`; also `i18n-src/en-US/fleet/crewed-spacecraft/enterprise.json`, `description`
- **Quote:** "renamed Enterprise after a fan-letter campaign tied to Star Trek's 10th anniversary" / "tied to the Star Trek 10th anniversary"
- **Issue:** Star Trek premiered 1966-09-08. The rename decision was made in 1976. 1976 - 1966 = 10 years — so "10th anniversary" is approximately correct. However, the actual reason cited in NASA records is simply the large volume of fan mail organized by Gene Roddenberry's fans, not specifically tied to the "10th anniversary" as an event. The 1977 actual first flight would be the 11th anniversary. The "10th anniversary" framing is a common but slightly inaccurate shorthand — the fan campaign ran in 1976 when the orbiter was being named, which was indeed ~10 years after the show's premiere, but it wasn't an anniversary campaign per se.
- **Correction:** "renamed Enterprise after a fan-letter campaign organized by Star Trek fans in 1976" — dropping the anniversary specificity.
- **Source:** https://en.wikipedia.org/wiki/Space_Shuttle_Enterprise
- **Confidence:** Medium

#### Finding 2 — 🟡 Minor: "eight captive flights and five free flights" — ALT flight count

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/enterprise.json`, `description`
- **Quote:** "eight captive flights and five free flights from the Shuttle Carrier Aircraft over Edwards Air Force Base in 1977"
- **Issue:** The ALT programme had 8 captive (non-flight) carry tests (some manned, some unmanned) and 5 free flights. This matches the Wikipedia record. The static file's flights array lists 1 captive-inert flight and 5 free flights (only 6 entries vs the actual 8+5=13). However, the i18n description's "eight captive flights and five free flights" is factually accurate.
- **Verdict:** The i18n text is correct. The static flights array is incomplete (only shows 5 entries; 8 captive + 5 free = 13 total test events). Low severity since flights array is clearly selective.
- **Confidence:** High

---

### gaganyaan

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/gaganyaan.json`
- `static/data/fleet/crewed-spacecraft/gaganyaan.json`

**Claims evaluated:**

The i18n description says "planned for 2026 launch on the LVM3."

#### Finding 1 — 🔴 Wrong fact: Description says "planned for 2026 launch" — timeline has slipped to 2027

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/gaganyaan.json`, `description`
- **Quote:** "India's first crewed spacecraft, planned for 2026 launch on the LVM3. Three astronauts on a roughly seven-day low-Earth-orbit mission"
- **Issue:** As of 2026, the Gaganyaan crewed mission has slipped. ISRO's own schedule updates put the first crewed flight no earlier than 2027. The uncrewed Gaganyaan G1 test flight was planned for late 2024 and has faced delays. The "2026 launch" claim is outdated and wrong as of the document date (2026-07-14). The current status should be "planned" with best estimate 2027 for first crewed flight.
- **Correction:** Update description to reflect the current schedule: "India's first crewed spacecraft, targeting a 2027 crewed flight on the LVM3 (formerly GSLV Mk III). ISRO has completed crew module qualification tests and trained astronaut candidates (Gaganaut candidates); multiple uncrewed precursor flights are planned before the crewed mission."
- **Source:** https://en.wikipedia.org/wiki/Gaganyaan (as of mid-2026 reporting)
- **Confidence:** High (given current date of 2026-07-14, the "2026 launch" is in or past the current year with no crewed launch having occurred)

---

### gemini

**Files checked:**
- `i18n-src/en-US/fleet/crewed-spacecraft/gemini.json`
- `static/data/fleet/crewed-spacecraft/gemini.json`

**Claims evaluated:**

The i18n description says "Ten crewed flights between 1965 and 1966." The static data `first_flight` is "1965" (year only). The flights array lists exactly 10 crewed missions (Gemini 3 through Gemini 12) — correct.

#### Finding 1 — 🟠 Incomplete: "Ten crewed flights" — omits two uncrewed Gemini flights

- **File:** `i18n-src/en-US/fleet/crewed-spacecraft/gemini.json`, `description`
- **Quote:** "Ten crewed flights between 1965 and 1966"
- **Issue:** The Gemini program flew two uncrewed test missions before the crewed series: Gemini 1 (1964-04-08, uncrewed orbital test) and Gemini 2 (1965-01-19, uncrewed suborbital reentry test). The description's count of "ten crewed flights" is correct as a count of crewed flights, but the omission of the uncrewed precursors could mislead someone about the program's total flight history. The crewed-flight count itself (10) is accurate.
- **Correction:** No factual error in the crewed count. Consider noting "two uncrewed precursor flights (Gemini 1 and 2) preceded the crewed series." This is contextual enrichment, not a correction.
- **Source:** https://en.wikipedia.org/wiki/Project_Gemini
- **Confidence:** High

#### Finding 2 — 🟡 Minor: `first_flight` is "1965" (year only) — inconsistent with other entries' ISO-8601 dates

- **File:** `static/data/fleet/crewed-spacecraft/gemini.json`
- **Quote:** `"first_flight": "1965"`
- **Issue:** All other entries use full ISO-8601 dates (e.g., `"1983-04-04"`). Gemini uses only the year. The first crewed Gemini flight was Gemini 3 on 1965-03-23. The first Gemini flight at all was Gemini 1 on 1964-04-08. Using "1965" is imprecise and inconsistent.
- **Correction:** Set `"first_flight": "1965-03-23"` (first crewed flight) or `"1964-04-08"` (first program flight). Recommend `"1964-04-08"` for consistency with the LM's Apollo 5 first-flight date.
- **Source:** https://en.wikipedia.org/wiki/Gemini_3
- **Confidence:** High

---

## Methodology Notes

1. Files read: all 28 (14 slugs × 2 files each) in parallel.
2. Cross-check method: compared i18n overlay claims to base data, then both against known public record.
3. Unverifiable claims (specific museum location details, internal part numbers) not flagged without contradicting evidence.
4. `first_flight` convention inconsistency (crewed vs first-vehicle-flight) flagged but not counted as 🔴 where the data is internally consistent.
5. Shuttle flight-array incompleteness (Challenger, Discovery, Columbia) noted where description text and array count diverge materially.
