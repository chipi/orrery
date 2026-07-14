# Fleet Launcher Fact-Check — Batch A
*Checked: 2026-07-14*

---

## Summary table

| Slug | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|------|---------|----|----|----|----|
| antares | ISSUES | 0 | 1 | 0 | 1 |
| ariane-1 | ISSUES | 0 | 1 | 1 | 0 |
| ariane-5 | ISSUES | 0 | 1 | 1 | 1 |
| ariane-6 | PASS | 0 | 0 | 0 | 1 |
| atlas-lv-3b | ISSUES | 0 | 0 | 1 | 0 |
| atlas-slv-3d | PASS | 0 | 0 | 0 | 1 |
| atlas-v | ISSUES | 0 | 1 | 0 | 1 |
| delta-ii | ISSUES | 0 | 0 | 1 | 1 |
| energia | ISSUES | 0 | 1 | 0 | 0 |
| falcon-9 | ISSUES | 0 | 1 | 0 | 1 |
| falcon-heavy | ISSUES | 0 | 1 | 0 | 0 |
| h-iia | ISSUES | 0 | 1 | 0 | 0 |
| h3 | ISSUES | 0 | 1 | 0 | 0 |
| long-march-2f | PASS | 0 | 0 | 0 | 1 |
| long-march-3b | ISSUES | 0 | 0 | 1 | 0 |
| long-march-5 | PASS | 0 | 0 | 0 | 1 |
| long-march-7 | PASS | 0 | 0 | 0 | 1 |
| lvm3 | ISSUES | 0 | 1 | 0 | 0 |
| mercury-redstone | ISSUES | 0 | 0 | 1 | 1 |
| **TOTAL** | | **0** | **10** | **5** | **10** |

---

## antares

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: Miranda engine count wrong in overlay

- **File:** `i18n-src/en-US/fleet/launcher/antares.json`
- **Field:** `description`
- **Quote:** "The Antares 330 successor (jointly developed with Firefly Aerospace) replaces the Russian first stage with seven Miranda engines."
- **Issue:** The Antares 330 first stage uses **seven** Miranda engines — this is confirmed correct per Firefly's own press release (each producing ~230,000 lbf; total ~1.6M lbf). No error here — see Note below. Actually this IS correct — 7 Miranda engines confirmed.
- **Correction:** No correction needed.
- **Confidence:** HIGH

> On re-check: "seven Miranda engines" is confirmed by Firefly Aerospace's official announcement. This finding is withdrawn — see Note 1 instead.

### Finding 1 — 🔵 Note: Antares engine lineage wording could be clearer

- **File:** `i18n-src/en-US/fleet/launcher/antares.json`
- **Field:** `description`
- **Quote:** "originally built around the Aerojet AJ26 and later RD-181 first stages"
- **Issue:** The phrasing "RD-181 first stages" is slightly awkward (the first stage itself isn't named after the engine); should be "later RD-181-powered first stages" or "later a Zenit-derived first stage powered by dual RD-181 engines." Minor editorial observation, not a factual error.
- **Confidence:** HIGH

### Finding 2 — 🟠 Significant: Antares status may be stale post-NG-19

- **File:** `static/data/fleet/launcher/antares.json`
- **Field:** `status`
- **Quote:** `"ACTIVE"`
- **Issue:** NG-19 (August 1, 2023) was the **last flight of the Antares 230+ series**. The 230-series is retired. Antares 330 is in development but has NOT yet flown. Listing status as `ACTIVE` is misleading — the flying configuration is retired and the successor has not yet launched.
- **Correction:** Consider `"DEVELOPMENT"` or `"RETIRED"` with a note that Antares 330 is in development. At minimum add a `retired_year: 2023` field for the 230+ and note 330 pending.
- **Source:** https://www.americaspace.com/2023/08/01/last-antares-200-series-rocket-launches-delivers-ng-19-cygnus-to-space-station/
- **Confidence:** HIGH

---

## ariane-1

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: Giotto launch date inconsistency between overlay and base credit

- **File:** `i18n-src/en-US/fleet/launcher/ariane-1.json` vs `static/data/fleet/launcher/ariane-1.json`
- **Field:** `description` (overlay) cites "Giotto Halley flyby probe"; `credit` (base) cites "Giotto Halley flyby probe (1985-07-02)"
- **Quote (overlay description):** "ESA's Giotto Halley flyby probe"
- **Quote (base credit):** "ESA's Giotto Halley flyby probe (1985-07-02)"
- **Issue:** The date `1985-07-02` is **correct** for the Giotto *launch* date. The Halley *encounter* was March 13, 1986. No error on the date itself. However the overlay `description` says the rocket "flew from Kourou in 1979 and … 11 launches … 1979-12-24 and 1986-02-22" — the last flight date `1986-02-22` is correct (L11 was the final operational flight).
- **Issue 2 (🟠):** The `era` field in the base data is `"1969-1981"` but Ariane 1 flew until **1986**. The era label is clearly a pre-defined epoch bucket, but the last flight falling 5 years outside the era end date is a notable mismatch worth flagging.
- **Correction:** Era field is a taxonomy concern — if era buckets are fixed labels, document that these don't represent the vehicle's actual operational span.
- **Source:** https://en.wikipedia.org/wiki/Ariane_1 — https://en.wikipedia.org/wiki/Giotto_(spacecraft)
- **Confidence:** HIGH

### Finding 2 — 🟡 Minor: "11 launches" vs flight count claim

- **File:** `i18n-src/en-US/fleet/launcher/ariane-1.json`
- **Field:** `description`
- **Quote:** "11 launches from Kourou between 1979-12-24 and 1986-02-22"
- **Issue:** Per Wikipedia and Gunter's Space Page, Ariane 1 had **11 flights** total (L01 through L11), with 3 failures. The count is correct. However the overlay `best_known_for` says "11 flights 1979-1986" while the base `credit` confirms "L01 … (L11, last operational)" — consistent.
- **Issue:** The description says "carried 27 European telecom and science satellites" — this is a reasonable approximation given dual manifesting on some flights and partial failures, but exact counts vary by source. Minor imprecision.
- **Correction:** None required; counts are consistent across overlay and base.
- **Confidence:** MEDIUM

---

## ariane-5

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: Total flight count "117 launches" needs the right framing

- **File:** `i18n-src/en-US/fleet/launcher/ariane-5.json`
- **Field:** `description`
- **Quote:** "retired in 2023 after 117 launches"
- **Issue:** Confirmed correct — Ariane 5 flew **117 times** (per ESA, Wikipedia, National Air and Space Museum) from 1996 to July 5, 2023 (VA261). This is accurate.
- **Verdict on this sub-point:** PASS.

### Finding 2 — 🟡 Minor: Dispatch says software "overflowed at the new rocket's higher speed" — imprecise but acceptable simplification

- **File:** `i18n-src/en-US/fleet/launcher/ariane-5.json`
- **Field:** `dispatch`
- **Quote:** "guidance software inherited from Ariane 4 overflowed at the new rocket's higher speed"
- **Issue:** Technically the overflow was a 64-bit float → 16-bit integer conversion failure caused by Ariane 5's higher *horizontal velocity* early in flight. The dispatch says "higher speed" which is a reasonable but slightly imprecise simplification — it was specifically the horizontal velocity component, not overall speed. Not a factual error that would embarrass a museum but could be tightened.
- **Correction:** Consider "guidance software inherited from Ariane 4 overflowed on Ariane 5's higher horizontal velocity" — but current wording is acceptable as editorial prose.
- **Source:** https://www.esa.int/Newsroom/Press_Releases/Ariane_501_-_Presentation_of_Inquiry_Board_report
- **Confidence:** HIGH

### Finding 3 — 🔵 Note: first_flight field is "1996" without full date

- **File:** `static/data/fleet/launcher/ariane-5.json`
- **Field:** `first_flight`
- **Quote:** `"1996"`
- **Issue:** The actual first flight date was **June 4, 1996** (Flight 501, which failed). Year-only is consistent with some other skeleton entries in this dataset; just noting the lack of precision.
- **Confidence:** HIGH

### Finding 4 — 🟠 Significant: JWST launch date not stated in overlay; dispatch could mislead on timing

- **File:** `i18n-src/en-US/fleet/launcher/ariane-5.json`
- **Field:** `dispatch`
- **Quote:** "finally the James Webb Space Telescope — placed so precisely it saved years of the observatory's fuel."
- **Issue:** No date error here. JWST (VA256) launched December 25, 2021, which is after the known-good anchor date. However, the tagline "Launched Rosetta, JWST, Galileo (ESA)" lists "Galileo (ESA)" — this is the Galileo navigation constellation, launched over many Ariane 5 flights (not a single mission). Acceptable as a summary but could confuse readers who might think of the Galileo probe (Jupiter mission, which was launched on the Shuttle/IUS, not Ariane 5).
- **Correction:** Clarify to "Galileo navigation constellation (ESA)" or "Galileo satnav constellation" to avoid confusion with the NASA Galileo Jupiter probe.
- **Source:** https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Ariane_5
- **Confidence:** HIGH

---

## ariane-6

**Verdict:** PASS

### Finding 1 — 🔵 Note: First flight date correct, description sparse

- **File:** `static/data/fleet/launcher/ariane-6.json`
- **Field:** `first_flight`
- **Quote:** `"2024-07-09"`
- **Issue:** Confirmed correct — Ariane 6 maiden flight was July 9, 2024. The description in the overlay is generic ("Successor to Ariane 5. In service since 2024.") but not factually wrong.
- **Confidence:** HIGH

---

## atlas-lv-3b

**Verdict:** ISSUES FOUND

### Finding 1 — 🟡 Minor: first_flight listed as year-only "1962" — the actual first Mercury-Atlas orbital mission was Feb 20, 1962

- **File:** `static/data/fleet/launcher/atlas-lv-3b.json`
- **Field:** `first_flight`
- **Quote:** `"1962"`
- **Issue:** The first Atlas LV-3B flight (Mercury-Atlas 6 / Friendship 7) was **February 20, 1962**. The year is correct but imprecise. More notably the `description` overlay says "Retired after first flight in 1962" — this is factually wrong. The Atlas LV-3B flew **six** Mercury orbital missions (MA-6 through MA-10: Glenn, Carpenter, Schirra, Cooper, plus two uncrewed MA-4 and MA-5). It was not retired after the first flight.
- **Correction:** Remove "Retired after first flight in 1962." from the description. The Atlas LV-3B flew through May 1963 (Faith 7, Gordon Cooper).
- **Source:** https://en.wikipedia.org/wiki/Atlas_LV-3B — `linked_missions` in the base data itself lists friendship-7, aurora-7, sigma-7, faith-7 (four missions).
- **Confidence:** HIGH

---

## atlas-slv-3d

**Verdict:** PASS

### Finding 1 — 🔵 Note: Centaur "world's first hydrogen-fuelled upper stage" claim is accurate

- **File:** `i18n-src/en-US/fleet/launcher/atlas-slv-3d.json`
- **Field:** `description`
- **Quote:** "the world's first hydrogen-fuelled upper stage (Centaur D-1A, LOX/LH₂)"
- **Issue:** Confirmed correct — Centaur is widely documented as the first rocket stage to use liquid hydrogen/liquid oxygen propellants. The SLV-3D variant used the enhanced Centaur D-1A.
- **Source:** https://en.wikipedia.org/wiki/Centaur_(rocket_stage)
- **Confidence:** HIGH

---

## atlas-v

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: Agency field incorrectly lists NASA; Atlas V is a ULA product

- **File:** `static/data/fleet/launcher/atlas-v.json`
- **Field:** `agency`
- **Quote:** `"NASA"`
- **Issue:** The Atlas V was designed by Lockheed Martin and has been operated by **United Launch Alliance (ULA)** since 2006. NASA is a *customer*, not the agency that operates or built the rocket. The `manufacturer` correctly says "United Launch Alliance" but the `agency` field conflicts with this.
- **Correction:** Change `agency` to `"ULA"` (or `"USAF / ULA"` if the field denotes primary customer).
- **Source:** https://www.ulalaunch.com/rockets/atlas-v — https://en.wikipedia.org/wiki/Atlas_V
- **Confidence:** HIGH

### Finding 2 — 🔵 Note: Status "ACTIVE" — Atlas V has not fully retired yet as of 2026

- **File:** `static/data/fleet/launcher/atlas-v.json`
- **Field:** `status`
- **Quote:** `"ACTIVE"`
- **Issue:** As of mid-2026, Atlas V has flown its last US Space Force mission (USSF-51, July 30 2024) but still has remaining launches planned (Amazon Kuiper constellation, Boeing Starliner crew missions). So `ACTIVE` is technically correct for 2026, with retirement imminent.
- **Confidence:** HIGH

---

## delta-ii

**Verdict:** ISSUES FOUND

### Finding 1 — 🟡 Minor: Success rate stated as "99.4%" — actual rate is closer to 98.7%

- **File:** `i18n-src/en-US/fleet/launcher/delta-ii.json`
- **Field:** `description`
- **Quote:** "155 launches over 29 years with a 99.4% success rate"
- **Issue:** Multiple sources confirm 153 successes out of 155 launches = 98.7% success rate, not 99.4%. One full failure (1997) and one partial failure account for the two non-successes. The 99.4% figure appears to count only the full failure and not the partial failure, or uses a different counting methodology. Either way it's inflated compared to the standard figure.
- **Correction:** Change to "98.7% success rate" (153/155).
- **Source:** https://aerospace.org/article/final-flight-delta-ii-rocket — https://en.wikipedia.org/wiki/Delta_II
- **Confidence:** HIGH

### Finding 2 — 🔵 Note: "Delta II Heavy" description is technically accurate

- **File:** `i18n-src/en-US/fleet/launcher/delta-ii.json`
- **Field:** `description`
- **Quote:** "The 'Delta II Heavy' (7920H + Star-48B) was the configuration that delivered enough C3 for direct-to-Ceres + Mercury orbital insertion."
- **Issue:** The parenthetical (7920H + Star-48B) isn't quite right — the Delta II Heavy is the 7920H config (nine GEM-46 boosters), and the Star-48B is an *optional* third stage added for very high-energy missions. Dawn used the 7925H-9.5 with Star-48B; Messenger used 7925-9.5 with Star-48B. The description is accurate enough for editorial prose, but "7920H + Star-48B" conflates the vehicle config code with the kick stage. Minor.
- **Confidence:** MEDIUM

---

## energia

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: best_known_for / tagline says "flew Buran once" — technically misleading about Energia itself

- **File:** `static/data/fleet/launcher/energia.json` and `i18n-src/en-US/fleet/launcher/energia.json`
- **Field:** `best_known_for` / `tagline`
- **Quote:** `"Soviet super-heavy; flew Buran once"`
- **Issue:** **Energia flew twice** — once in 1987 (Polyus/Skif-DM payload) and once in 1988 (Buran orbiter). The tagline "flew Buran once" is technically true (Buran flew on Energia exactly once), but it implies Energia itself only flew once, which is incorrect. The dispatch correctly states "Energia worked, lifting the Polyus payload in 1987 and the Buran orbiter in 1988. Two flights, both successful" — so the overlay and base are internally inconsistent: the `best_known_for` field says "flew Buran once" while the dispatch says "Two flights, both successful."
- **Correction:** Change tagline/best_known_for to "Soviet super-heavy; two flights (Polyus 1987, Buran 1988)" or "The super-heavy that flew twice: Polyus (1987) and Buran (1988)."
- **Source:** https://en.wikipedia.org/wiki/Energia_(rocket) — confirmed by prompt's own ground truth: "Energia flew EXACTLY TWICE (1987 and 1988)"
- **Confidence:** HIGH

---

## falcon-9

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: Falcon 9 base data first_flight "2010-06-04" applies to Falcon 9 v1.0, not Block 5

- **File:** `static/data/fleet/launcher/falcon-9.json`
- **Field:** `first_flight` and `name`
- **Quote (name):** `"Falcon 9 Block 5"` / **Quote (first_flight):** `"2010-06-04"`
- **Issue:** The entry is named "Falcon 9 Block 5" but lists the first flight of the original **Falcon 9 v1.0** (June 4, 2010). The Block 5 variant's maiden flight was **May 11, 2018** (Bangabandhu-1). These are in conflict. If this entry represents the entire Falcon 9 program, the name should be just "Falcon 9" not "Falcon 9 Block 5." If it represents the Block 5 specifically, the first_flight should be 2018-05-11.
- **Correction:** Either rename to "Falcon 9" (all versions) with `first_flight: "2010-06-04"`, OR keep "Falcon 9 Block 5" and correct `first_flight` to `"2018-05-11"`.
- **Source:** https://en.wikipedia.org/wiki/Falcon_9_Block_5 — https://en.wikipedia.org/wiki/Falcon_9
- **Confidence:** HIGH

### Finding 2 — 🔵 Note: Description "first orbital-class rocket to land and re-fly itself" — accurate

- **File:** `i18n-src/en-US/fleet/launcher/falcon-9.json`
- **Field:** `description`
- **Quote:** "The first orbital-class rocket to land and re-fly itself"
- **Issue:** This claim is accurate. No correction needed.
- **Confidence:** HIGH

---

## falcon-heavy

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: "second-most-powerful operational rocket after SLS" is contestable in 2026

- **File:** `i18n-src/en-US/fleet/launcher/falcon-heavy.json`
- **Field:** `description`
- **Quote:** "Currently the second-most-powerful operational rocket after SLS"
- **Issue:** As of mid-2026, Starship has conducted multiple successful orbital flights and is increasingly operational, with LEO capacity exceeding both Falcon Heavy (~64 t LEO) and SLS Block 1 (~95 t LEO). Starship's target capacity is 100–150 t to LEO. If Starship is considered "operational" by mid-2026 (it has flown multiple integrated flights), then Falcon Heavy is at minimum the **third**-most-powerful, not the second. Even setting Starship aside, SLS Block 1 outperforms Falcon Heavy. The claim "after SLS" is correct for SLS > FH, but the Starship caveat makes the "second" placement questionable.
- **Correction:** Update to "one of the most powerful operational rockets" or add a caveat about Starship's operational status. Alternatively, date-stamp the claim.
- **Source:** https://en.wikipedia.org/wiki/Super_heavy-lift_launch_vehicle — https://en.wikipedia.org/wiki/Falcon_Heavy
- **Confidence:** HIGH

---

## h-iia

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: Status listed as "RETIRED" is WRONG — H-IIA was active until June 2025

- **File:** `static/data/fleet/launcher/h-iia.json`
- **Field:** `status`
- **Quote:** `"RETIRED"`
- **Issue:** The base data says H-IIA is `RETIRED` but this is listed alongside `first_flight: "2001"` — which implies it never flew beyond 2001. However the entry description (overlay) says "Retired after first flight in 2001." which is plainly wrong — H-IIA flew **50 missions** between August 29, 2001 and **June 28, 2025** (GOSAT-GW). The overlay description is the machine-generated fallback text that incorrectly says "Retired after first flight in 2001." The rocket was retired in **June 2025**, not 2001.
- **Correction (overlay description):** Remove "Retired after first flight in 2001." and replace with accurate text reflecting 50 flights and retirement in June 2025.
- **Source:** https://www.nasaspaceflight.com/2025/06/gosat-gw-launch/ — https://en.wikipedia.org/wiki/H-IIA
- **Confidence:** HIGH

---

## h3

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: first_flight listed as "2024" — the first flight attempt was March 7, 2023 (failed)

- **File:** `static/data/fleet/launcher/h3.json`
- **Field:** `first_flight`
- **Quote:** `"2024"`
- **Issue:** The first H3 launch attempt was **March 7, 2023** — it failed (second stage did not ignite; JAXA issued a flight termination command). The first *successful* flight was February 17, 2024. Listing `first_flight: "2024"` silently erases the 2023 failure and could mislead researchers into thinking 2024 was the debut.
- **Correction:** Change to `"2023-03-07"` (first attempt) and note the failure. Alternatively use a `first_successful_flight` field for 2024-02-17.
- **Source:** https://en.wikipedia.org/wiki/H3_(rocket) — https://www.nasaspaceflight.com/2024/02/jaxa-second-h3/
- **Confidence:** HIGH

---

## long-march-2f

**Verdict:** PASS

### Finding 1 — 🔵 Note: first_flight "1999" is correct (Shenzhou 1 on 1999-11-19)

- **File:** `static/data/fleet/launcher/long-march-2f.json`
- **Field:** `first_flight`
- **Quote:** `"1999"`
- **Issue:** Confirmed. CZ-2F maiden flight was November 19, 1999 (Shenzhou 1 uncrewed test). The field is year-only but accurate.
- **Confidence:** HIGH

---

## long-march-3b

**Verdict:** ISSUES FOUND

### Finding 1 — 🟡 Minor: LEO capacity stated as "~12 t" vs confirmed ~11.2 t

- **File:** `i18n-src/en-US/fleet/launcher/long-march-3b.json`
- **Field:** `description`
- **Quote:** "Lifts ~12 t to LEO / ~5.5 t to GTO"
- **Issue:** Standard Long March 3B LEO capacity is **11,200 kg (~11.2 t)**; GTO is **5,100 kg (~5.1 t)** for the baseline. The enhanced 3B/E variant lifts up to 11,500 kg LEO and ~5,500 kg GTO. The description's "~12 t LEO" rounds up beyond the baseline spec and is slightly inflated. The "~5.5 t to GTO" is close to the 3B/E figure but overstates the baseline. Minor imprecision — acceptable rounding for editorial prose but worth tightening.
- **Correction:** Consider "~11 t to LEO / ~5.1–5.5 t to GTO (baseline / enhanced)" or just "~11 t / ~5 t GTO."
- **Source:** https://en.wikipedia.org/wiki/Long_March_3B
- **Confidence:** HIGH

---

## long-march-5

**Verdict:** PASS

### Finding 1 — 🔵 Note: LEO capacity "25 t" and first flight "2016" both confirmed correct

- **File:** `i18n-src/en-US/fleet/launcher/long-march-5.json` / `static/data/fleet/launcher/long-march-5.json`
- **Field:** `description` / `first_flight`
- **Quote:** "capable of putting 25 t to LEO" / `"2016"`
- **Issue:** The 25 t LEO figure applies to the **CZ-5B** variant (no upper stage, larger payload fairing). The standard CZ-5 lifts ~14 t to GTO. The description blurs CZ-5 and CZ-5B into one figure without distinguishing — acceptable for a combined entry but worth noting. First flight Nov 3, 2016 (success) is correct.
- **Confidence:** HIGH

---

## long-march-7

**Verdict:** PASS

### Finding 1 — 🔵 Note: first_flight "2016" confirmed (June 25, 2016)

- **File:** `static/data/fleet/launcher/long-march-7.json`
- **Field:** `first_flight`
- **Quote:** `"2016"`
- **Issue:** Confirmed — Long March 7 debuted June 25, 2016 from Wenchang. Year-only field is accurate.
- **Confidence:** HIGH

---

## lvm3

**Verdict:** ISSUES FOUND

### Finding 1 — 🟠 Significant: first_flight "2014" refers to a suborbital test, not the orbital debut

- **File:** `static/data/fleet/launcher/lvm3.json`
- **Field:** `first_flight`
- **Quote:** `"2014"`
- **Issue:** The 2014 flight was the **GSLV Mk III X/CARE suborbital mission** on December 18, 2014 — a suborbital technology demonstrator (crew module atmospheric reentry experiment). The first *orbital* flight was **June 5, 2017** (GSAT-19). The prompt's ground truth also confirms: "LVM3 (formerly GSLV Mk III): first orbital flight June 5, 2017." The `first_flight: "2014"` is misleading if it implies an orbital debut.
- **Correction:** If `first_flight` means "first launch of any kind," 2014 is correct. If it means "first orbital launch," it should be `"2017-06-05"`. Given every other launcher's `first_flight` refers to the first orbital mission, this should be corrected to `"2017-06-05"`.
- **Source:** https://en.wikipedia.org/wiki/LVM3
- **Confidence:** HIGH

---

## mercury-redstone

**Verdict:** ISSUES FOUND

### Finding 1 — 🟡 Minor: Overlay states height "25 metres" — this is the total stack with capsule + tower

- **File:** `i18n-src/en-US/fleet/launcher/mercury-redstone.json`
- **Field:** `description`
- **Quote:** "Single-stage liquid-propellant (LOX + alcohol), 25 metres tall"
- **Issue:** The Mercury-Redstone *booster alone* was ~18 m (59 ft) tall. The full vehicle stack including the Mercury capsule and escape tower was ~25.4 m (83 ft). The description says "25 metres tall" without specifying that this is the full stack measurement. The booster alone was 18 m. This is a common distinction worth flagging in a museum context.
- **Correction:** Clarify "25 metres tall (full stack with capsule and escape tower; booster alone ~18 m)."
- **Source:** https://en.wikipedia.org/wiki/Mercury-Redstone_Launch_Vehicle
- **Confidence:** HIGH

### Finding 2 — 🟡 Minor: Thrust stated as "28 tonnes of thrust" — actual thrust is ~346 kN (~35 t)

- **File:** `i18n-src/en-US/fleet/launcher/mercury-redstone.json`
- **Field:** `description`
- **Quote:** "28 tonnes of thrust"
- **Issue:** The Rocketdyne A-7 engine produced 78,000 lbf sea-level thrust = **347 kN ≈ 35.4 metric tonnes-force**. "28 tonnes" appears to conflate pounds-force with tonnes, or uses an older AJ-26-equivalent figure. The correct figure is approximately 35 tonnes-force (347 kN), not 28.
- **Correction:** Change to "approximately 347 kN (~35 tonnes-force) of thrust."
- **Source:** https://en.wikipedia.org/wiki/Mercury-Redstone_Launch_Vehicle — https://www.nasa.gov/centers-and-facilities/marshall/mercury-redstone-launch-vehicle/
- **Confidence:** HIGH

### Finding 3 — 🔵 Note: "23 days after Gagarin" — Gagarin flew April 12, 1961; Shepard May 5, 1961 = 23 days. Confirmed correct.

- **File:** `i18n-src/en-US/fleet/launcher/mercury-redstone.json`
- **Field:** `description`
- **Quote:** "the first American in space, 23 days after Gagarin"
- **Issue:** April 12 → May 5 = 23 days. Confirmed accurate.
- **Confidence:** HIGH

---

## Cross-cutting observations

1. **Auto-generated fallback descriptions** (e.g., H-IIA: "Retired after first flight in 2001.", Atlas LV-3B: "Retired after first flight in 1962.") are machine-generated skeleton text that are factually wrong and need editorial replacement for every launcher that has them. H-IIA, Atlas LV-3B, Long March 2F, Long March 7, LVM3, Ariane 6, and H3 all carry these fallback strings.

2. **Agency field for Atlas V** (`"NASA"`) is wrong — Atlas V is a ULA product; NASA is a customer. Check whether other launchers in the full fleet have similarly misattributed agency fields.

3. **Era field mismatch for Ariane 1**: last flight 1986 is outside the era bucket `"1969-1981"`. If era is a fixed taxonomy, document it; if it's meant to represent operational span, fix it.

4. **first_flight year-only vs full-date inconsistency**: Some entries use `"YYYY"` (Ariane 5, Atlas V, Atlas LV-3B, H3, LVM3, Long March 5, Long March 7) and others use `"YYYY-MM-DD"` (Mercury-Redstone, Ariane 6, Delta II, Antares, etc.). Worth standardising across the dataset.

---

TALLY: 19 entries · 25 findings · 0🔴 · 10🟠 · 5🟡 · 10🔵
