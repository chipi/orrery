# Fact-check — Moon missions (Luna / orbiters / Artemis)

Reviewer: science-reviewer · Date: 2026-07-14 · Present = 2026
Scope: `moon/lro, luna9, luna10, luna16, luna17, luna21, luna24, artemis2, artemis3, artemis4`
Files per mission: prose overlay `i18n-src/en-US/missions/moon/<slug>.json` + base `static/data/missions/moon/<slug>.json`

## Verdicts

| Mission | Verdict | CRITICAL | HIGH | MED | LOW |
|---|---|---|---|---|---|
| lro | PASS (minor) | 0 | 0 | 0 | 1 |
| luna9 | PASS (minor) | 0 | 0 | 1 | 1 |
| luna10 | PASS | 0 | 0 | 0 | 1 |
| luna16 | PASS | 0 | 0 | 0 | 1 |
| luna17 | PASS | 0 | 0 | 0 | 1 |
| luna21 | PASS | 0 | 0 | 0 | 1 |
| luna24 | PASS (minor) | 0 | 0 | 1 | 1 |
| **artemis2** | **FAIL** | 1 | 2 | 1 | 0 |
| **artemis3** | **FAIL** | 1 | 0 | 0 | 0 |
| **artemis4** | **FAIL** | 1 | 0 | 0 | 0 |

**Totals: 3 CRITICAL · 2 HIGH · 3 MEDIUM · 8 LOW.**
The three Artemis files are all stale against reality (present = 2026). The Luna/orbiter files are historically accurate; only minor polish flags.

---

## moon/lro — PASS (minor)

Cross-checked: launch 2009-06-18 (Atlas V 401, SLC-41, LCROSS co-manifest) ✓; LOI 2009-06-23 ✓; 50 cm/pixel LROC NAC ✓; located Lunokhod 1 in 2010 ✓; south-pole water-ice quantification ✓. Active since 2009 ✓.

- **LOW — overlay `description` "It found Lunokhod 1 thirty-nine years after the rover went dark."**
  Lunokhod 1 last contact 1971; LRO localized its retroreflector in 2010 → 39 years. Accurate but "thirty-nine years after the rover went dark" is a stretch: the rover's *last command session* was 1971-09-14, so 2010 − 1971 = 39 yrs ✓. No change required; keep as-is.
  Source: https://en.wikipedia.org/wiki/Lunokhod_1 · Confidence: high.

- Note (not a defect): base `arrival` block lists `periapsis_km: 30` and event text "30 × 216 km polar mapping orbit". LRO's commissioning orbit was ~30 × 216 km before the ~50 km circular mapping orbit; overlay says "50 km mean lunar altitude". Both are correct for different mission phases — consistent, no action.

---

## moon/luna9 — PASS (minor)

Cross-checked: launch 1966-01-31 (Molniya-M, Baikonur) ✓; first soft landing + first surface images 1966-02-03 18:45 UTC ✓; Oceanus Procellarum ~7.08°N 64.37°W (file: 7.13°N, 64.37°W — within rounding) ✓; nine images ✓; battery loss / last contact 1966-02-06 ✓; settled the "Moon dust" debate ✓.

- **MED — overlay `description`: "Nine panoramic images returned over 8 minutes"** and event note "Nine panoramic images."
  The nine transmissions were **not all panoramas** — sources describe nine images of which ~five were panoramas, sent in several sessions over 1966-02-03…04 (not "over 8 minutes"). NSSDCA and RussianSpaceWeb: images returned across multiple sessions until 1966-02-06. The "over 8 minutes" figure is unsupported and conflates one transmission with the whole set.
  Correction: "Several images including five panoramas, returned across three sessions over three days." Overlay event note "Nine panoramic images returned in three transmission sessions" is closer but still calls all nine panoramas.
  Source: https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-006A · https://www.russianspaceweb.com/luna9.html · Confidence: medium-high.

- **LOW — overlay `description`: "The mission lasted 3 days before battery depletion"** vs event `met:6 SIGNAL LOSS ... final transmission 1966-02-06`.
  Landing 02-03, last contact 02-06 = 3 days ✓ but the base MET timeline is internally inconsistent: `transit_days: 3` (launch 01-31 → land 02-03 ✓) yet the SIGNAL LOSS event is placed at `met: 6` (= 02-06). Overlay dispatch "lasted 3 days" refers to *surface* life; fine. No factual error, just verify the "3 days" in prose is surface-ops not total. Keep.
  Confidence: high.

---

## moon/luna10 — PASS

Cross-checked: launch 1966-03-31 (file 10:46 UTC) ✓; LOI 1966-04-03 → first artificial satellite of the Moon / any body but Earth ✓ (3 yrs before Apollo 8, 1968 — file says "before Apollo 8"; Apollo 8 was Dec 1968, ~2.7 yrs later — "Three years before" is loose but defensible) ; Internationale broadcast to 23rd CPSU Congress 1966-04-04 ✓; ~460 orbits ✓; ended 1966-05-30 ✓; remains in lunar orbit ✓; 350 × 1017 km, 71.9° inc ✓ (Wikipedia: 350 × 1016.8 km).

- **LOW — overlay `description` "Three years before Apollo 8".**
  Apollo 8 reached lunar orbit 1968-12-24 — that's ~2 years 8 months after 1966-04-03, i.e. "two and a half years", not "three years". Tighten to "more than two years before Apollo 8" or "two and a half years".
  Source: https://en.wikipedia.org/wiki/Luna_10 · Confidence: high.

---

## moon/luna16 — PASS

Cross-checked: launch 1970-09-12 (Proton-K/D) ✓; landing Mare Fecunditatis 1970-09-20 05:18 UTC ✓; 101 g regolith, ~35 cm drill depth ✓; ascent 1970-09-21 ✓; capsule recovered Kazakhstan 1970-09-24 ✓; first robotic sample return ✓; technique reused Luna 20/24, Chang'e 5/6 ✓.

- **LOW — overlay `description`: "After Apollo 11 brought home 22 kg of crewed samples in 1969".**
  Apollo 11 returned 21.55 kg (≈21.5 kg). "22 kg" is a rounding-up; acceptable but 21.5 kg is more precise. Also base event says "Launched 14 months after Apollo 11" — Apollo 11 landed 1969-07; Luna 16 launched 1970-09 = ~14 months ✓.
  Source: https://en.wikipedia.org/wiki/Apollo_11 · Confidence: high.

- Note: overlay `first` "first non-American lunar samples" is correct — Apollo 11/12 preceded it; Luna 16 was the first *Soviet / non-US* return. ✓

---

## moon/luna17 — PASS

Cross-checked: launch 1970-11-10 (Proton-K/D) ✓; landing Mare Imbrium 1970-11-17 ✓; Lunokhod 1 = first roving vehicle on the Moon ✓; 10.5 km traverse ✓; 11 lunar days / 322 Earth days ✓ (overlay says "11 lunar days (322 Earth days)" ✓); design life 3 lunar days / ~90 days, operated ~11 months ✓; 20,000+ images ✓; relocated by LRO in 2010 ✓; 5-person crew, 2.5-s light delay ✓.

- **LOW — internal consistency: base event `met:329 FINAL CONTACT ... 1971-09-14` vs overlay "322 Earth days" / "11 lunar days".**
  Lunokhod 1 last successful session 1971-09-14; formally shut down 1971-10-04. 1970-11-17 → 1971-09-14 ≈ 301 days; the widely-cited "322 Earth days" refers to total operational span to the final shutdown. Numbers are all sourceable and mutually consistent; the base `met:329` (≈ 2971-09-... from 1970-11-10 launch) lines up with mid-Sept 1971. No correction needed; keep.
  Source: https://en.wikipedia.org/wiki/Lunokhod_1 · Confidence: medium-high.

---

## moon/luna21 — PASS

Cross-checked: launch 1973-01-08 (Proton-K/D) ✓; landing Le Monnier crater 1973-01-15 (23:35 UT), rover deployed 01:14 UT 1973-01-16 ✓; Lunokhod 2 ✓; ~39 km traverse ✓ (remapped 39.16 km, historically cited 37 km); record held until Mars Opportunity surpassed it 2014-07-27 ✓; 80,000 TV frames + 86 panoramas ✓; ended May 1973 after dust/thermal contamination ✓; 836 kg rover ✓.

- **LOW — overlay `description` "traversed approximately 39 km ... a record ... that held until NASA's Opportunity rover passed it on Mars in 2014".**
  Fully accurate; note the base `payload` also embeds "traversed 39 km — longest rover distance until 2014" — consistent. Optional precision: the LRO remap gives 39.16 km (historic mission estimate 37 km). Both defensible; "~39 km" is the modern value. No change required.
  Source: https://en.wikipedia.org/wiki/Lunokhod_2 · https://www.planetary.org/articles/06211627-opportunity-lunokhod-record · Confidence: high.

- Note (not a defect): base event text "Lunokhod 2 + Lunokhod 1 still hold the only two operational moon-rover records the Soviets ever produced — both predating Apollo's surface mobility milestones by years." **This is FALSE ordering.** Apollo 15 LRV drove on the Moon 1971-07-31; Lunokhod 2 operated 1973. Lunokhod **1** (1970) predated the LRV; Lunokhod **2** (1973) did **not**. Reclassify: bump to **MED** — "both predating Apollo's surface mobility milestones" is wrong for Lunokhod 2. Correction: drop the "both … predating Apollo" clause or restrict it to Lunokhod 1.
  Source: https://en.wikipedia.org/wiki/Lunar_Roving_Vehicle · Confidence: high. (Adjust luna21 tally: +1 MED.)

---

## moon/luna24 — PASS (minor)

Cross-checked: launch 1976-08-09 (Proton-K/D) ✓; landing Mare Crisium 1976-08-18 06:36 UTC ✓; ~2 m drill depth ✓; 170.1 g returned ✓; ascent 1976-08-19 ✓; capsule landed 1976-08-22 ✓; last Soviet lunar mission ✓; last soft landing until Chang'e 3 (2013-12-14), 37 years ✓.

- **MED — overlay `description`: "Among the samples: minerals containing trace water, foreshadowing the discovery of substantial lunar water ice deposits 30 years later."**
  Stated as settled fact. The Luna 24 water detection (Akhmanova, Dement'ev & Markov, Vernadsky Inst., 1978; ~0.1 wt% via 3 μm IR) is **real but controversial and never independently confirmed** — samples exchanged under the US-USSR agreement showed no water; widely treated as possible terrestrial contamination. Present the claim as reported-but-disputed, not as established fact.
  Correction: "A 1978 Soviet analysis reported ~0.1% water by mass in the core — an unconfirmed, still-debated result — foreshadowing later confirmed detections of lunar water."
  Source: https://en.wikipedia.org/wiki/Lunar_water · https://ui.adsabs.harvard.edu/abs/1978Geokh......285A/abstract · Confidence: high.

- **LOW — base landing coords `12.75°N, 62.20°E`.**
  Wikipedia/NSSDCA give Luna 24 landing ≈ 12.71°N, 62.21°E — file's 12.75°N is within rounding. OK.
  Source: https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1976-081A · Confidence: high.

---

## moon/artemis2 — FAIL (1 CRITICAL, 2 HIGH, 1 MED)

Artemis II **flew** in April 2026. Overlay is mostly past-tense (good), but the **dates, closest-approach altitude, and duration are wrong**, and the base `events` are still written in planned/future tense.
Ground truth: launched **2026-04-01 22:35 UTC** (LC-39B), closest approach to far side **~6,545 km on 2026-04-06**, splashdown **2026-04-11 00:07 UTC** (Pacific, SW of San Diego), total **~9 days (9d 1h 32m)**. Free-return, no LOI. Farthest-from-Earth human record 406,771 km. Orion named "Integrity".

- **CRITICAL — closest-approach altitude "~9,200 km" is wrong; actual ~6,545 km.**
  Appears in BOTH files, multiple fields:
  - overlay `description`: "swung them around the Moon's far side at roughly 9,200 km altitude"
  - overlay event `met:4 LUNAR FLYBY`: "Closest approach over the far side, ~9,200 km altitude."
  - base `credit`: "~9,200 km altitude"
  - base `arrival.periapsis_km: 9200` and `arrival.source: "...closest approach ~9,200 km past lunar far side"`
  - base `cislunar_profile.lunar_arrival.periselene_km: 9200`
  - base event `met:4 flyby`: "Closest approach ~9,200 km past the lunar far side."
  Correct value: **~6,545 km** (NASA/Wikipedia: 4,067 mi from the far-side surface, 2026-04-06). Fix every instance.
  Source: https://en.wikipedia.org/wiki/Artemis_II · Confidence: high.

- **HIGH — dates wrong.** Base `departure_date: "2026-04-03"`, `arrival_date: "2026-04-13"`, `transit_days: 5`; overlay/base "10-day mission".
  Actual: launch **2026-04-01**, splashdown **2026-04-11**, duration **~9 days** (not 10). `departure_date` should be 2026-04-01; the `arrival_date`/`transit_days` fields fit an orbiter poorly (this is a flyby) but if kept, arrival (splashdown) = 2026-04-11. Overlay "A 10-day mission" → "a roughly 9-day mission" (or "10-day" was the pre-flight plan; it flew 9d 1h). `credit` "April 2026" ✓.
  Source: https://en.wikipedia.org/wiki/Artemis_II · https://www.nasa.gov/news-release/liftoff-nasa-launches-astronauts-on-historic-artemis-moon-mission/ · Confidence: high.

- **HIGH — base `events` still planned/future tense for a mission that flew.**
  - `met:0` label "Launch — SLS Block 1 / Orion (planned)" and desc "planned 2026"
  - `met:0.13` desc future framing "will bend / no LOI burn needed" (acceptable as physics, but the "(planned)" and "planned 2026" tags are stale)
  - `met:4` "Artemis II is a translunar-flyby test mission validating … before Artemis III lands on the surface" — doubly stale: present tense for a flown mission AND asserts "Artemis III lands on the surface" (false post-Feb-2026 replan; landing moved to Artemis IV).
  - `met:10` desc "Planned 2026. … First crewed deep-space mission of the 21st century."
  Correction: convert base events to past tense with actual dates (launch 2026-04-01, flyby 2026-04-06, splashdown 2026-04-11); remove "(planned)"; fix the "before Artemis III lands on the surface" clause → "before later Artemis missions land on the surface" (see artemis3/4).
  Source: as above · Confidence: high.

- **MED — overlay `first` / `type`.** `type: "CREWED FLYBY · FLOWN"` ✓ (correctly past). `first`: "First crewed flight beyond low-Earth orbit since Apollo 17 (1972)" ✓ true. Minor: base `credit` and overlay both fine on the "since Apollo 17" superlative. The only MED here is the "10-day" duration echoed in overlay `description` — flag with HIGH above; leave `first` as PASS.
  Confidence: high.

---

## moon/artemis3 — FAIL (1 CRITICAL)

- **CRITICAL — entire file describes the pre-Feb-2026 profile: a crewed south-pole landing. That is no longer Artemis III.**
  Per NASA's 2026-02-27 restructuring, **Artemis III is now a crewed low-Earth-orbit demonstration/risk-reduction mission** (Orion + HLS rendezvous/docking + spacesuit checkout in LEO, ~430 km), **NET late 2027**. The **first crewed lunar landing moved to Artemis IV** (NET 2028). The file still asserts throughout:
  - overlay `first`: "First crewed lunar landing since Apollo 17 (1972)" — **now false.**
  - overlay `description`: full NRHO + Starship HLS south-pole landing narrative, "Will land the first woman and first person of colour on the Moon."
  - overlay events: NRHO arrival, HLS descent to south pole, ascent, TEI, splashdown.
  - base `credit`, `year: 2027` (date roughly OK if NET late 2027, but *profile* wrong), `vehicle: "SLS Block 1 + Starship HLS"`, `arrival.periapsis_km: 3000` (NRHO), all `flight.events` (NRHO insertion, HLS powered descent to south pole, Shackleton/Connecting Ridge sites, 6.5-day surface stay), and the `cislunar_profile` (NRHO waypoints).
  Correction: reprofile the whole mission to a LEO crewed demo — Orion systems eval + HLS (Blue Origin Blue Moon MK2 / SpaceX Starship) rendezvous & docking demo + spacesuit checkout in LEO (~430 km); NET late 2027; risk-reduction for Artemis IV. Remove all lunar-landing / south-pole / "first woman + first person of colour on the Moon" / NRHO claims. The "first woman / first person of colour on the Moon" superlative now belongs to Artemis IV.
  Source: https://en.wikipedia.org/wiki/Artemis_3 · https://www.nasa.gov/mission/artemis-iii/ · https://spacepolicyonline.com/news/nasa-shares-early-planning-for-artemis-iii/ · Confidence: high.

---

## moon/artemis4 — FAIL (1 CRITICAL)

- **CRITICAL — Artemis IV is now the program's FIRST crewed lunar landing, not the "second".**
  Post-Feb-2026 replan, Artemis IV **inherited the landing profile** (NET 2028). The file calls it:
  - overlay `first`: "First crewed mission to the Lunar Gateway; **second crewed lunar landing**" — the "second" is wrong; it is the **first** crewed landing.
  - overlay `description`: "…for the program's **second crewed landing**…"
  - base `credit`: "conducts the **second crewed lunar landing** via a Starship HLS."
  Correction: change "second crewed lunar landing" → "**first** crewed lunar landing" in all three spots. Gateway-first + I-HAB (ESA/JAXA) + SLS Block 1B/EUS debut remain correct. Consider adding the "first woman / first person of colour on the Moon" superlative here (moved from Artemis III), and note the HLS may be SpaceX Starship or Blue Origin Blue Moon MK2.
  Also LOW: base `vehicle` correctly says "SLS Block 1B … Exploration Upper Stage" but `fleet_refs` still lists `sls-block-1` (should be the Block 1B variant if one exists) — non-blocking.
  Source: https://en.wikipedia.org/wiki/Artemis_4 · https://www.csis.org/analysis/what-comes-next-artemis · Confidence: high.

---

## Summary of required fixes (priority order)

1. **artemis3** — full reprofile: LEO crewed demo, NET late 2027, first landing moved to Artemis IV. (CRITICAL)
2. **artemis4** — "second crewed landing" → "first crewed landing" (3 spots); move the first-woman/first-POC superlative here. (CRITICAL)
3. **artemis2** — closest approach 9,200 → **6,545 km** (6 fields); dates → launch 2026-04-01 / splashdown 2026-04-11, duration ~9 days; convert base events to past tense; fix "before Artemis III lands on the surface" clause. (1 CRITICAL + 2 HIGH)
4. **luna21** — remove/repair "both … predating Apollo's surface mobility milestones" (false for Lunokhod 2 vs 1971 LRV). (MED)
5. **luna24** — present the 1978 water detection as unconfirmed/disputed, not settled fact. (MED)
6. **luna9** — "nine panoramic images over 8 minutes" → five panoramas among nine images across three sessions/three days. (MED)
7. **luna10** — "Three years before Apollo 8" → "two and a half years". (LOW)
8. Assorted LOW rounding notes (Apollo 11 21.5 vs 22 kg; Luna 24 coords) — optional.
