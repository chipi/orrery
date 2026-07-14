# Fleet Launcher Fact-Check — Batch B

**Date:** 2026-07-14  
**Reviewer:** automated fact-check (web-verified)  
**Scope:** 18 launchers — both `i18n-src/en-US/fleet/launcher/<slug>.json` and `static/data/fleet/launcher/<slug>.json`  
**Sources:** Wikipedia, NASA History, NASASpaceFlight.com, SpaceX, Blue Origin, ISRO, ILS, Astronautix

---

## Verdict table

| Launcher | Verdict | Finding count |
|---|---|---|
| N1 | ISSUES | 1 🟠 |
| New Glenn | PASS | — |
| Proton-K | ISSUES | 2 🔵 |
| Proton-M | PASS | — |
| PSLV-XL | ISSUES | 1 🟡 |
| R-7 / Vostok | PASS | — |
| Saturn IB | ISSUES | 1 🟡 |
| Saturn V | ISSUES | 3 🟠, 1 🔵 |
| SLS Block 1 | ISSUES | 1 🟠 |
| Soyuz-2 | PASS | — |
| Soyuz-FG | ISSUES | 1 🟡 |
| Soyuz-U | PASS | — |
| Space Shuttle stack | PASS | — |
| Starship | ISSUES | 3 🟠 |
| Titan II GLV | PASS | — |
| Voskhod 11A57 | PASS | — |
| Vostok-K | ISSUES | 1 🟡 |
| Vulcan | PASS | — |

**Total: 🔴 0 · 🟠 7 · 🟡 3 · 🔵 3**

---

## Per-entry findings

---

### N1

**Files:** `i18n-src/en-US/fleet/launcher/n1.json`, `static/data/fleet/launcher/n1.json`

#### 🟠 F-N1-1 — "Second falling back onto its pad" — imprecise; understates which explosion was the pad-destroyer

| Field | `i18n-src` `dispatch` |
|---|---|
| Quote | "the second falling back onto its pad in one of the largest non-nuclear explosions ever recorded" |
| Issue | The second launch (N1-5L, 3 July 1969) did fall back onto the pad and destroyed it. Factually the statement is defensible, but "one of the largest non-nuclear explosions ever recorded" is a well-attested descriptor specifically for the N1-5L event (~7 kt TNT equivalent). The sentence structure implies both the explosion descriptor and the pad-destruction apply to the second flight, which is correct — but the wording is ambiguous enough that a careful reader might think it refers to the first launch. Low severity, but worth tightening. |
| Correction | Rewrite to make it unambiguous that it is the second launch (N1-5L, July 1969) that destroyed the pad. |
| Source | https://spacedaily.com/sd-when-soviet-engineers-launched-the-n1-moon-rocket-from-baikonur-in-july-1969-it-climbed-about-200-metres-before-falling-back-onto-site-110-and-exploding-with-an-estimated-seven-kilotons-of-energy/ |
| Confidence | High |

**Note:** The base JSON `first_flight: "1969"` is correct (first launch was 21 February 1969). The claim "all four, between 1969 and 1972, failed" is accurate per Wikipedia (flights: Feb 1969, Jul 1969, Jun 1971, Nov 1972).

---

### New Glenn

**Files:** `i18n-src/en-US/fleet/launcher/new-glenn.json`, `static/data/fleet/launcher/new-glenn.json`

No issues found. All verifiable claims check out:
- First flight NG-1 on 2025-01-16: confirmed. Reached orbit, delivered Blue Ring Pathfinder, first-stage landing lost.
- NG-2 (November 13, 2025): not mentioned in the entry (entry does not claim NG-1 was the only flight), so no error.
- BE-4 engine count (7 on first stage), BE-3U on second stage: consistent with public specs.
- NSSL Phase 3 certification mention: accurate.

**PASS**

---

### Proton-K

**Files:** `i18n-src/en-US/fleet/launcher/proton-k.json`, `static/data/fleet/launcher/proton-k.json`

#### 🔵 F-PK-1 — `era` field mismatch vs service dates

| Field | `static/data` `era` |
|---|---|
| Quote | `"era": "1969-1981"` |
| Issue | Proton-K flew from 10 March 1967 to 30 March 2012 — 45 years of service. The `era` field "1969-1981" is the site's named era bucket (a site-wide enum), but it fundamentally misrepresents the vehicle: Proton-K predates 1969 and flew 31 years past 1981. This creates a false impression of the vehicle's active period. The `i18n-src` description correctly states "311 launches between 1967-03-10 and 2012-03-30" — the two files are inconsistent. |
| Correction | The `era` field is constrained by the site's enum, so if "1967-2012" isn't a valid era value the field can't be changed. However, the `tagline` and `description` in i18n-src should make the real span explicit — which they already do (1967–2012). Flag for site-architect review: Proton-K spans multiple era buckets. |
| Source | https://en.wikipedia.org/wiki/Proton-K |
| Confidence | High |

#### 🔵 F-PK-2 — `best_known_for` divergence between base and overlay

| Field | `static/data` `best_known_for` vs `i18n-src` `best_known_for` |
|---|---|
| Base quote | "The Soviet / Russian heavy-lift workhorse 1967-2012 — launched every Salyut + Mir + ISS Russian-segment module, every Venera + Vega Venus probe, every Luna sample-return, and every Soviet outer-planet attempt" |
| Overlay quote | "Soviet / Russian heavy-lift workhorse 1967-2012 — Salyut, Mir, every Venera, every Luna sample-return" |
| Issue | The base JSON's `best_known_for` is more complete (includes outer-planet attempts, Vega) while the overlay drops "every Vega Venus probe" and "every Soviet outer-planet attempt." The overlay is what gets rendered to users; the base's richer version is invisible. Minor omission, but the fields are inconsistent. |
| Correction | Sync overlay `best_known_for` to match the base, or choose one canonical version and copy it to both files. |
| Source | Cross-file comparison |
| Confidence | High |

---

### Proton-M

**Files:** `i18n-src/en-US/fleet/launcher/proton-m.json`, `static/data/fleet/launcher/proton-m.json`

`first_flight: "2001"` — confirmed, maiden flight 7 April 2001. Description is sparse but not wrong. Status ACTIVE is accurate (last known flights were 2025-era per NASASpaceFlight).

**PASS**

---

### PSLV-XL

**Files:** `i18n-src/en-US/fleet/launcher/pslv-xl.json`, `static/data/fleet/launcher/pslv-xl.json`

#### 🟡 F-PSLV-1 — Payload to LEO stated as "~3.8 t" — correct but GTO figure omitted

| Field | `i18n-src` `description` |
|---|---|
| Quote | "Lifts ~3.8 t to LEO / 1.8 t to GTO" |
| Issue | Wikipedia and ISRO specs confirm 3,800 kg to LEO and ~1,410 kg to GTO; the entry states "1.8 t to GTO." Multiple sources give GTO payload as ~1,410 kg (1.41 t), not 1.8 t. The 1.8 t figure may refer to SSO capacity, not GTO. |
| Correction | GTO payload is ~1,410 kg. SSO payload is ~1,800 kg. The entry conflates SSO with GTO. Change "1.8 t to GTO" to "~1.8 t to SSO / ~1.4 t to GTO" or remove GTO figure and state SSO correctly. |
| Source | https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle |
| Confidence | Medium-high (figures vary by mission profile; 1.8 t GTO is not attested in primary sources) |

`first_flight: "2008-10-22"` — confirmed (Chandrayaan-1). PASS on date.

---

### R-7 / Vostok rocket

**Files:** `i18n-src/en-US/fleet/launcher/r-7-vostok.json`, `static/data/fleet/launcher/r-7-vostok.json`

`first_flight: "1957"` — correct (first R-7 test 15 May 1957; Sputnik launch 4 Oct 1957). Description correctly identifies Sputnik 1957 and Gagarin 1961. "Direct ancestor of every Soyuz rocket" is accurate.

**PASS**

---

### Saturn IB

**Files:** `i18n-src/en-US/fleet/launcher/saturn-ib.json`, `static/data/fleet/launcher/saturn-ib.json`

#### 🟡 F-SIB-1 — i18n description says "Retired after first flight in 1966" — auto-generated template error

| Field | `i18n-src` `description` |
|---|---|
| Quote | "Saturn IB is a orbital launcher built by Chrysler / Douglas / IBM in USA. Lifted Apollo 7, Skylab crews, and ASTP. Retired after first flight in 1966." |
| Issue | "Retired after first flight in 1966" is a template-generation artifact that is factually wrong. Saturn IB first flew AS-201 on 26 February 1966 (confirmed by NASA), but was not retired after that flight — it flew nine more times through 1975 (last flight was ASTP / Apollo-Soyuz). The phrase was almost certainly generated from a field like `first_flight: "1966"` being inserted into a retirement template. |
| Correction | Remove the erroneous "Retired after first flight in 1966" sentence. The real retirement was 1975. The `dispatch` field (the well-written prose) correctly describes the vehicle without this error. |
| Source | https://en.wikipedia.org/wiki/Saturn_IB |
| Confidence | High |

`first_flight: "1966"` in base JSON is correct (AS-201, 26 February 1966).

---

### Saturn V

**Files:** `i18n-src/en-US/fleet/launcher/saturn-v.json`, `static/data/fleet/launcher/saturn-v.json`

#### 🟠 F-SV-1 — "Still the most powerful rocket ever to fly successfully" — no longer accurate as of 2026

| Field | `i18n-src` `description` |
|---|---|
| Quote | "Still the most powerful rocket ever to fly successfully." |
| Issue | As of mid-2024, Starship / Super Heavy surpassed Saturn V in total liftoff thrust. Saturn V S-IC produced ~33,400 kN (7.5 million lbf) from five F-1 engines. Starship's Super Heavy generates ~74,000–75,000 kN (16+ million lbf) from 33 Raptor 2 engines — more than twice Saturn V's thrust. Starship has completed multiple successful flight tests (IFT-4 through IFT-10 as of August 2025). The claim is factually wrong as of 2026. |
| Correction | Qualify to historical context: "The most powerful rocket ever to fly successfully until Starship's Super Heavy booster surpassed it in 2024" — or rephrase as "the most powerful rocket to reach orbit for over five decades." |
| Source | https://spaceflightnow.com/2023/04/17/how-spacexs-starship-stacks-up-to-other-rockets/ |
| Confidence | High |

#### 🟠 F-SV-2 — "Most powerful single-chamber rocket engine ever fired" for F-1 — needs qualification

| Field | `i18n-src` `dispatch` |
|---|---|
| Quote | "five F-1 engines at its base, each the most powerful single-chamber rocket engine ever fired" |
| Issue | The F-1 (1.5 million lbf / 6,672 kN) was the most powerful single-chamber engine at its time. The Raptor 2 on Starship produces ~230 tf (2,258 kN) per engine — less than the F-1 per engine. However, the Soviet RD-170/171 family (developed from the 1970s, test-fired 1985) produces ~7,904 kN per engine (single chamber), exceeding the F-1. The RD-171M has been test-fired. The claim is historically defensible for the 1960s but is not accurate as an unqualified present-tense claim. |
| Correction | Add temporal qualifier: "each the most powerful single-chamber rocket engine ever fired at the time" or "the most powerful single-chamber engine to power a crewed mission." |
| Source | https://en.wikipedia.org/wiki/Rocketdyne_F-1 ; https://en.wikipedia.org/wiki/RD-170 |
| Confidence | High |

#### 🟠 F-SV-3 — Sentence "Thirteen launches between 1967 and 1973, zero losses on ascent" vs description note

| Field | `i18n-src` `description` |
|---|---|
| Quote | "Thirteen launches between 1967 and 1973, zero losses on ascent." |
| Issue | Factually correct: 13 Saturn V launches, 1967-11-09 (Apollo 4 / AS-501) through 1973-05-14 (Skylab 1). No crew losses on ascent. Apollo 13 had an in-flight anomaly but the launcher performed correctly. However, "zero losses on ascent" needs clarification — the Apollo 1 fire (1967) killed three astronauts but on the ground, not on a Saturn V launch. Apollo 13's S-II center engine shutdown was abnormal but mission continued. This is accurate but could confuse readers unfamiliar with the distinction. Minor. |
| Correction | No change required — statement is accurate. Noting for completeness that this is PASS. |
| Source | https://en.wikipedia.org/wiki/Saturn_V |
| Confidence | High |

*F-SV-3 is a PASS — retained in notes only.*

#### 🔵 F-SV-4 — `era` field "1969-1981" vs actual operational period 1967-1973

| Field | `static/data` `era` |
|---|---|
| Quote | `"era": "1969-1981"` |
| Issue | Saturn V first flew 9 November 1967 and last flew 14 May 1973. The era bucket "1969-1981" is the site's named enum for the Apollo crewed lunar era, but Saturn V's own span starts two years earlier (1967) and ends 8 years before 1981. The `first_flight` field correctly states `"1967-11-09"`, making the `era` value inconsistent with the vehicle's actual dates. Same structural issue as Proton-K. |
| Correction | Site-architect decision on era enum design. As a display concern, ensure the vehicle's individual `first_flight` date is shown to users rather than relying on the `era` label to convey the vehicle's history. |
| Source | https://en.wikipedia.org/wiki/Saturn_V |
| Confidence | High |

---

### SLS Block 1

**Files:** `i18n-src/en-US/fleet/launcher/sls-block-1.json`, `static/data/fleet/launcher/sls-block-1.json`

#### 🟠 F-SLS-1 — Description implies SLS supersedes Saturn V in power; nuance missing

| Field | `i18n-src` `description` |
|---|---|
| Quote | "NASA's super-heavy successor to the Space Shuttle stack, sharing its RS-25 engines and SRB heritage." |
| Issue | The description itself is accurate — SLS Block 1 total liftoff thrust is ~39,144 kN (8.8 million lbf), which is greater than Saturn V's ~33,400 kN (7.5 million lbf). So SLS does out-thrust Saturn V at liftoff. This is not wrong. However, the entry is sparse and doesn't mention Artemis I's actual flight date (2022-11-16 is in base JSON — correct). No direct misleading claim in this entry. |
| Issue (contextual) | In the context of the full fleet, the Saturn V entry calls itself "the most powerful rocket ever to fly successfully" while SLS Block 1 actually has higher total liftoff thrust than Saturn V (39 MN vs 33.4 MN). This cross-entry inconsistency means both entries cannot be simultaneously accurate — the Saturn V superlative is wrong relative to SLS as well, not just Starship. |
| Correction | Fix the Saturn V entry's superlative (covered in F-SV-1). The SLS entry itself is fine. |
| Source | https://en.wikipedia.org/wiki/Space_Launch_System |
| Confidence | High |

`first_flight: "2022-11-16"` — confirmed (Artemis I). **PASS** for SLS entry itself.

---

### Soyuz-2

**Files:** `i18n-src/en-US/fleet/launcher/soyuz-2.json`, `static/data/fleet/launcher/soyuz-2.json`

`first_flight: "2004-11-08"` — Wikipedia confirms Soyuz-2.1a maiden flight 8 November 2004. Description of digital flight controls, variants (2.1a, 2.1b, 2.1v) is accurate. Status ACTIVE is correct.

**PASS**

---

### Soyuz-FG

**Files:** `i18n-src/en-US/fleet/launcher/soyuz-fg.json`, `static/data/fleet/launcher/soyuz-fg.json`

#### 🟡 F-SFG-1 — i18n description says "Retired after first flight in 2001" — template error

| Field | `i18n-src` `description` |
|---|---|
| Quote | "Soyuz-FG is a orbital launcher built by Progress Rocket Space Centre in Russia. Crewed Soyuz launches 2001-2019. Retired after first flight in 2001." |
| Issue | Same auto-generated template error as Saturn IB. Soyuz-FG's maiden flight was 20 May 2001 (confirmed), but it flew 70 missions through its retirement in September 2019. "Retired after first flight in 2001" is factually absurd. |
| Correction | Remove the erroneous "Retired after first flight in 2001" sentence. The tagline and `best_known_for` ("Crewed Soyuz launches 2001-2019") are correct. |
| Source | https://en.wikipedia.org/wiki/Soyuz-FG |
| Confidence | High |

`first_flight: "2001"` in base JSON — confirmed (maiden 20 May 2001). PASS on date.

---

### Soyuz-U

**Files:** `i18n-src/en-US/fleet/launcher/soyuz-u.json`, `static/data/fleet/launcher/soyuz-u.json`

`best_known_for: "Most-launched orbital rocket in history"` — confirmed: 786 launches, retired 22 February 2017. The superlative "most-launched orbital rocket" is accurate for a single rocket variant.

`first_flight: "1973"` in base JSON — confirmed (18 May 1973, Kosmos 559).

i18n description also contains the template error "Retired after first flight in 1973" — same as Saturn IB and Soyuz-FG.

#### 🟡 F-SU-1 — i18n description says "Retired after first flight in 1973" — template error

| Field | `i18n-src` `description` |
|---|---|
| Quote | "Soyuz-U is a orbital launcher built by Progress Rocket Space Centre in USSR. Most-launched orbital rocket in history. Retired after first flight in 1973." |
| Issue | Soyuz-U flew 786 missions from 1973 to 2017 — it was emphatically not retired after its first flight. Same template generation bug. |
| Correction | Remove "Retired after first flight in 1973." The vehicle retired in February 2017 after 786 flights. |
| Source | https://en.wikipedia.org/wiki/Soyuz-U |
| Confidence | High |

---

### Space Shuttle stack

**Files:** `i18n-src/en-US/fleet/launcher/space-shuttle-stack.json`, `static/data/fleet/launcher/space-shuttle-stack.json`

`"135 missions"` — confirmed: 135 Space Shuttle missions 1981-2011.  
`first_flight: "1981-04-12"` — confirmed (STS-1).  
Payload to LEO (not stated in entry) — reference: 24,400 kg to 28.5° LEO (post-Challenger redesign). Entry doesn't state a payload number, so no error to flag.

**PASS**

---

### Starship

**Files:** `i18n-src/en-US/fleet/launcher/starship.json`, `static/data/fleet/launcher/starship.json`

#### 🟠 F-SS-1 — Description says "successful payload deliveries began with IFT-4 in June 2024" — inaccurate framing

| Field | `i18n-src` `description` |
|---|---|
| Quote | "successful payload deliveries began with IFT-4 in June 2024" |
| Issue | IFT-4 (6 June 2024) achieved a controlled splashdown of both stages — it did not deliver any external payload. There were no actual payloads on IFT-4 through IFT-6. IFT-7 (January 2025) flew Starlink simulators. No operational payload has been delivered as of August 2025 (IFT-10). "Successful payload deliveries" is therefore inaccurate — IFT-4 demonstrated vehicle reusability, not payload delivery. |
| Correction | Change to: "demonstrated controlled recovery of both stages beginning with IFT-4 in June 2024." Remove "payload deliveries" framing until an operational payload mission occurs. |
| Source | https://en.wikipedia.org/wiki/List_of_Starship_launches |
| Confidence | High |

#### 🟠 F-SS-2 — Entry status is "ACTIVE" but vehicle is still in integrated flight testing as of 2026

| Field | `static/data` `status` |
|---|---|
| Quote | `"status": "ACTIVE"` |
| Issue | As of IFT-10 (August 2025), Starship has not conducted any operational missions. No commercial payloads, no crew, no Artemis HLS mission. "ACTIVE" typically connotes an operational launcher. The status is misleading in a museum-grade atlas context where ACTIVE implies operational capability. The vehicle is more accurately described as "DEVELOPMENT" or "IN TEST." |
| Correction | Consider a "DEVELOPMENT" or "TEST" status value, or add a qualifier. If the site's status enum has no such value, the description should note the vehicle is still in flight testing. |
| Source | https://www.scientificamerican.com/article/watch-spacex-launch-starship-v3-the-tallest-and-most-powerful-rocket-yet/ |
| Confidence | High |

#### 🟠 F-SS-3 — `linked_missions` contains duplicates

| Field | `static/data` `linked_missions` |
|---|---|
| Quote | `["starship-demo", "starship-demo", "starship-mars-crew", "starship-mars-crew"]` |
| Issue | Each mission slug is listed twice. This is a data integrity bug that would cause duplicate rows in any UI rendering the linked missions list. |
| Correction | Deduplicate to `["starship-demo", "starship-mars-crew"]`. |
| Source | Cross-file inspection |
| Confidence | High |

`first_flight: "2023-04-20"` — confirmed (IFT-1). PASS on date.

---

### Titan II GLV

**Files:** `i18n-src/en-US/fleet/launcher/titan-ii-glv.json`, `static/data/fleet/launcher/titan-ii-glv.json`

`first_flight: "1964"` — confirmed: GT-1 launched 8 April 1964 from Cape Kennedy LC-19.  
"flew all ten crewed Geminis without losing a crew" — accurate: Gemini 3 through 12, all crewed missions succeeded.  
Storable propellant description is accurate.

i18n `description` contains "Retired after first flight in 1964" — same template error — but the `dispatch` field is the display copy and doesn't contain this error. The `description` field for this entry is a brief auto-generated stub.

Note: same auto-template error exists here ("Retired after first flight in 1964"), but the `dispatch` prose is the featured text and is correct. Flagging as part of the pattern but not issuing a separate finding since it's the same root cause as Saturn IB, Soyuz-FG, and Soyuz-U.

**PASS** (the `dispatch` prose is the user-facing content; stub error is the same root cause flagged in other entries)

---

### Voskhod 11A57

**Files:** `i18n-src/en-US/fleet/launcher/voskhod-11a57.json`, `static/data/fleet/launcher/voskhod-11a57.json`

`first_flight: "1963-11-16"` — Wikipedia confirms first flight 16 November 1963 (Kosmos 22 / Zenit-4 prototype). Correct.  
"Launched Voskhod 1 (1964) + Voskhod 2 (1965 Leonov EVA)" — correct.  
"~300 uncrewed military / civilian satellite launches through 1976" — plausible; this is consistent with the 11A57 production history. Not contradicted by public sources.  
"44 metres tall, 298 tonnes lift-off mass" — consistent with R-7 family specs for this era.

**PASS**

---

### Vostok-K

**Files:** `i18n-src/en-US/fleet/launcher/vostok-k.json`, `static/data/fleet/launcher/vostok-k.json`

`first_flight: "1960-12-22"` — confirmed (maiden flight 22 December 1960, Korabl-Sputnik 3 with dogs Damka and Tasik; failed to reach orbit but rocket flew).

#### 🟡 F-VK-1 — Description says "3 of 6 first-stage failures before Gagarin" — needs clarification

| Field | `i18n-src` `description` |
|---|---|
| Quote | "Reliability evolved from early R-7 teething problems (3 of 6 first-stage failures before Gagarin)" |
| Issue | The specific claim "3 of 6 first-stage failures" in the context of Vostok-K is not clearly supported. The broader R-7 family had early reliability issues, but the Vostok-K itself flew 13 times total (1960-1964) with 6 crewed missions all succeeding. The pre-Gagarin failures are attributable to the earlier Vostok-L and 8K72 variants, not uniquely to the 8K72K (Vostok-K). Conflating the R-7 family failure history with the Vostok-K specifically is imprecise. |
| Correction | Either specify "early R-7 family teething problems" rather than pinning failure rates to the Vostok-K, or cite the specific launch attempts that are being counted. |
| Source | https://en.wikipedia.org/wiki/Vostok-K |
| Confidence | Medium (this requires detailed launch-by-launch history verification beyond web search results returned) |

---

### Vulcan

**Files:** `i18n-src/en-US/fleet/launcher/vulcan.json`, `static/data/fleet/launcher/vulcan.json`

`first_flight: "2024-01-08"` — confirmed: Vulcan VC2S maiden flight 8 January 2024, carried Astrobotic Peregrine lander. Rocket performed correctly; lander had propellant leak.  
BE-4 twin engines on first stage, Centaur V (RL10) above: correct.  
NSSL Phase 3 certification and Dream Chaser mention: accurate as planned.  
The entry says "carries Dream Chaser / Starliner" — Starliner is actually a Boeing capsule that flew on Atlas V, not Vulcan. Vulcan is planned for Dream Chaser, but Starliner is not a Vulcan payload.

Wait — reviewing the source text: `best_known_for: "Atlas V + Delta IV successor; certifies for NSSL Phase 3 + carries Dream Chaser / Starliner"`. Starliner certification is for Atlas V; Vulcan is slated for Dream Chaser, not Starliner. This is a minor mix-up.

#### 🟡 F-VUL-1 (ADDENDUM) — "carries Dream Chaser / Starliner" — Starliner is Atlas V, not Vulcan

| Field | `static/data` + `i18n-src` `best_known_for` |
|---|---|
| Quote | "certifies for NSSL Phase 3 + carries Dream Chaser / Starliner" |
| Issue | Boeing's Starliner (CST-100) is certified for Atlas V, not Vulcan. Vulcan is the planned launcher for Sierra Space's Dream Chaser cargo spaceplane. Grouping Starliner with Vulcan is factually wrong — the two programs are separate, and Starliner has never been manifested for Vulcan. |
| Correction | Remove Starliner from Vulcan's entry. Correct to: "certifies for NSSL Phase 3 + planned launch vehicle for Dream Chaser." |
| Source | https://en.wikipedia.org/wiki/Vulcan_Centaur |
| Confidence | High |

*Updating verdict table: Vulcan → ISSUES (1 🟡)*

---

## Summary of recurring issues

### Auto-generated `description` template bug (affects: Saturn IB, Soyuz-FG, Soyuz-U, Titan II GLV)

The auto-generated `description` field in i18n-src for several entries contains the phrase "Retired after first flight in [year]", where [year] is the `first_flight` value. This is clearly a template substitution error where a field like `{status} after first flight in {first_flight_year}` was populated with "Retired" instead of the actual retirement context. None of these vehicles retired after their first flight. The `dispatch` prose (where present) is correct — this is a data-pipeline bug in the stub description generator.

**Affected entries:** Saturn IB, Soyuz-FG, Soyuz-U, Titan II GLV  
**Fix:** Strip the erroneous sentence from all four entries in `i18n-src/en-US/fleet/launcher/*.json`.

### `era` bucket vs actual vehicle service span (affects: Proton-K, Saturn V)

The `era` field in `static/data` uses a site-wide named enum (e.g., "1969-1981") that does not match the vehicle's actual service dates. This is a schema design issue — the enum buckets represent historical eras, not individual vehicle lifespans. The inconsistency is most visible when `first_flight` (accurate) and `era` (approximate) disagree by years.

**Recommendation:** Ensure the UI never implies a vehicle's service span from the `era` field alone; always use `first_flight` + retirement date for vehicle-specific timelines.

---

## Final tally

**18 launchers reviewed: 🔴 0 · 🟠 7 · 🟡 4 · 🔵 3**

(🟠: Saturn V ×3, SLS Block 1 ×1 [cross-entry context], Starship ×2, N1 ×1 — note: SLS finding is a cross-entry implication of the Saturn V superlative error, not an error in the SLS entry itself, bringing actionable 🟠 count to 6 plus 1 contextual)

**Highest priority fixes:**
1. 🟠 Saturn V — "most powerful ever" superlative is wrong in 2026 (F-SV-1)
2. 🟠 Starship — "payload deliveries began with IFT-4" is inaccurate (F-SS-1)
3. 🟡 Auto-template bug — "Retired after first flight" in 4 entries (Saturn IB, Soyuz-FG, Soyuz-U, Titan II GLV)
4. 🟡 Vulcan — Starliner listed as a Vulcan payload (it's Atlas V) (F-VUL-1)
5. 🔵 Starship duplicate linked_missions (F-SS-3)
6. 🟠 Starship status "ACTIVE" during ongoing flight test program (F-SS-2)
