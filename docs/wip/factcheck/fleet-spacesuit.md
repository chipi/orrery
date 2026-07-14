# Fleet space-suit fact-check

**Date:** 2026-07-14
**Reviewer:** automated web-verify pass
**Scope:** 13 entries — i18n-src/en-US/fleet/space-suit/*.json + static/data/fleet/space-suit/*.json

---

## Summary

| Suit | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|------|---------|----|----|----|----|
| a7l | issues | 0 | 0 | 1 | 1 |
| a7lb | issues | 0 | 1 | 0 | 0 |
| aces | issues | 1 | 1 | 0 | 0 |
| axemu | issues | 0 | 0 | 1 | 0 |
| crew-dragon-iva | issues | 0 | 1 | 0 | 0 |
| emu | issues | 1 | 1 | 1 | 0 |
| feitian | issues | 0 | 1 | 1 | 0 |
| krechet-94 | issues | 0 | 1 | 0 | 1 |
| orlan-mks | issues | 1 | 1 | 0 | 0 |
| shenzhou-iva | ✅ | 0 | 0 | 0 | 0 |
| sokol-kv-2 | issues | 1 | 1 | 0 | 0 |
| sokol-m | issues | 0 | 0 | 1 | 0 |
| starliner-suit | issues | 1 | 1 | 0 | 0 |

🔴 = factual error (wrong fact stated), 🟠 = misleading/incomplete, 🟡 = minor imprecision, 🔵 = note/observation, ✅ = clean

---

## Per-entry findings

### a7l

🟡 **Minor imprecision** — manufacturer field
- File: `static/data/fleet/space-suit/a7l.json`, field `manufacturer`
- Quote: `"ILC Industries (later ILC Dover)"`
- The company at the time of the A7L was the Government and Industrial Division of International Latex Corporation. "ILC Industries" was not the official corporate name during the Apollo program — the correct period name is ILC Dover (the Dover, Delaware division of International Latex). The parenthetical "(later ILC Dover)" implies the two are sequential entities, but ILC Dover is the name of the same division that built the suit. Low-level imprecision but not clearly wrong.
- Correction: `"ILC Dover (International Latex Corporation, Dover Division)"` or simply `"ILC Dover"`
- Source: https://en.wikipedia.org/wiki/ILC_Dover — confidence: medium

🔵 **Observation** — era field vs. actual operational range
- File: `static/data/fleet/space-suit/a7l.json`, field `era`
- Quote: `"1969-1981"`
- The A7L's last flight date is listed as `1971-02-09` (Apollo 14); the A7LB replaced it from Apollo 15 onward. The era end-year of 1981 does not match either the last_flight or any known A7L use. If "era" is meant to span the full Apollo/Skylab/ASTP era it should probably end no later than 1975. Worth auditing the `era` field definition across entries.
- Source: https://en.wikipedia.org/wiki/Apollo/Skylab_spacesuit — confidence: high

---

### a7lb

🟠 **Misleading / incomplete** — last_flight vs. actual last use
- File: `static/data/fleet/space-suit/a7lb.json`, field `last_flight` and i18n description
- Quote (i18n description): `"Last flown on Apollo 17 in December 1972."`
- The A7LB was also used on Skylab 2, 3, and 4 (1973–1974) in a modified "Skylab A7LB" configuration. Skylab 4's final EVA was February 3, 1974, with crew return on February 8, 1974. The base `last_flight: "1972-12-19"` matches only the last lunar flight; the Skylab use is omitted. The i18n description actively states December 1972 as the last flight, which is incorrect for the A7LB family.
- Correction: Acknowledge Skylab EVA use through February 1974. If the intent is to distinguish the "lunar" A7LB from the Skylab variant, that distinction should be explicit. The `last_flight` date should be `1974-02-03` (last Skylab EVA) or the description must distinguish the suit configurations.
- Source: https://en.wikipedia.org/wiki/Apollo/Skylab_spacesuit; https://www.nasa.gov/history/50-years-ago-skylab-4-astronauts-return-from-record-breaking-spaceflight/ — confidence: high

---

### aces

🔴 **Factual error** — first flight mission
- File: `static/data/fleet/space-suit/aces.json`, field `first_flight` (value `"1994-02-03"`, STS-60); i18n description `"Replaced the earlier Launch Entry Suit (LES) starting in 1994."`
- The ACES did **not** first fly on STS-60 (February 3, 1994). Wikipedia and the National Museum of the USAF both state ACES first flew on **STS-64** (September 9, 1994). Shuttle crews began wearing ACES after STS-64; STS-60 still used the LES.
- Correction: `first_flight: "1994-09-09"` (STS-64). The i18n description's "starting in 1994" is vague enough to survive but the base date must change.
- Source: https://en.wikipedia.org/wiki/Advanced_Crew_Escape_Suit; https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/1860483/space-shuttle-advanced-crew-escape-suit-1994-2011/ — confidence: high

🟠 **Misleading** — operating pressure claim
- File: i18n description (implicit — the description does not state pressure but "full-pressure" classification matters)
- ACES operating pressure is **3.5 psi (24 kPa)**, per Wikipedia's spec table. This is lower than the EMU's 4.3 psi. Some sources loosely call ACES a "full pressure suit" but the 3.5 psi value should be confirmed against primary sources before adding to descriptions; the current entry does not state a pressure, so this is a watch item if pressure is ever added.
- Source: https://en.wikipedia.org/wiki/Advanced_Crew_Escape_Suit — confidence: medium

---

### axemu

🟡 **Minor imprecision** — CO₂ scrubber description
- File: i18n description
- Quote: `"a regenerable amine CO₂ scrubber"`
- Web sources (including Axiom's own release and Tech Briefs) describe the AxEMU as having a "regenerable carbon dioxide scrubbing system" but do not specifically name amine-swing absorption as the mechanism in any publicly accessible specification. The EMU uses LiOH; NASA's next-gen xEMU (the basis for AxEMU) originally specified a regenerable amine swing-bed CO₂ removal system (CDRA-derived). The "amine" qualifier appears consistent with xEMU heritage but is not confirmed in public AxEMU documentation.
- Correction: "regenerable CO₂ scrubber" is accurate; "amine" is likely correct but unverified in public sources. Flag as unverified detail rather than wrong fact.
- Source: https://www.techbriefs.com/component/content/article/53418-a-next-generation-space-suit-for-artemis-iii; https://www.axiomspace.com/release/axiom-space-prada-unveil-spacesuit-design-for-moon-return — confidence: low (amine claim specifically)

---

### crew-dragon-iva

🟠 **Misleading / incomplete** — suit worn on "every Crew Dragon flight"
- File: i18n best_known_for
- Quote: `"The white slim-fit IVA suit worn on every Crew Dragon flight since Demo-2"`
- Polaris Dawn (September 2024) used the **SpaceX EVA suit** for launch, EVA, and landing — not the standard IVA suit. The Polaris Dawn crew explicitly did not wear the IVA suit; instead they wore the modified EVA suit for all mission phases. "Every Crew Dragon flight" is therefore incorrect.
- Correction: "every crewed NASA Crew Dragon flight" or "every ISS Commercial Crew flight since Demo-2" (Polaris Dawn was a private mission, not a NASA ISS mission).
- Source: https://polarisprogram.com/polaris-dawn-crew-tests-new-suit-and-completes-first-commercial-spacewalk/; https://spacenews.com/spacex-reveals-eva-suit-design-as-polaris-dawn-mission-approaches/ — confidence: high

---

### emu

🔴 **Factual error** — first_flight date
- File: `static/data/fleet/space-suit/emu.json`, field `first_flight`
- Quote: `"1981-04-12"` (STS-1)
- The EMU's first actual EVA flight was **STS-6 (April 4–9, 1983)**, when Story Musgrave and Donald Peterson conducted the first Shuttle spacewalk. STS-1 carried no EMU and performed no EVA. The planned first EVA on STS-5 was cancelled due to a suit malfunction.
- Correction: `first_flight: "1983-04-07"` (or the specific EVA date within STS-6)
- Source: https://en.wikipedia.org/wiki/Extravehicular_Mobility_Unit — confidence: high

🟠 **Misleading** — SAFER timing relative to Challenger
- File: i18n description
- Quote: `"SAFER mini-thruster pack added after Challenger for tether-loss rescue"`
- While it is true SAFER was developed after Challenger (1986) as part of post-Challenger safety improvements, SAFER **first flew on STS-64 in September 1994** — eight years after Challenger. The phrase "added after Challenger" implies a direct causal link and near-term addition; more precisely SAFER emerged from a broader post-Challenger EVA safety program and entered service in 1994. The Wikipedia article on SAFER makes no explicit Challenger causation claim.
- Correction: Replace with "added in 1994" or "introduced on STS-64 in 1994"; the Challenger framing is technically defensible but misleadingly implies rapid response.
- Source: https://en.wikipedia.org/wiki/Simplified_Aid_For_EVA_Rescue — confidence: high

🟡 **Minor imprecision** — SAFER nitrogen mass
- File: i18n description
- Quote: `"1.4 kg N₂"`
- Wikipedia on SAFER lists "total fuel capacity is 1.4 kg (3 pounds)" of GN2. The 1.4 kg figure is therefore confirmed. However, the description's "1.4 kg" is correct; this entry passes on the mass figure.
- Source: https://en.wikipedia.org/wiki/Simplified_Aid_For_EVA_Rescue — confidence: high
- Note: The earlier search return mentioned "1.5 lbs" in one pass but Wikipedia is explicit at 1.4 kg (3 lb). The i18n value of 1.4 kg is correct.

---

### feitian

🟠 **Misleading** — "derived from the Soviet Orlan design"
- File: i18n description
- Quote: `"Chinese rear-entry EVA suit derived from the Soviet Orlan design."`
- The Feitian is China's domestically developed EVA suit. While it shares **architectural similarities** with the Orlan (rear-entry, semi-rigid back hatch), Wikipedia explicitly states it was developed as China's own design, not a derivative. During Shenzhou 7, crew member Liu Boming wore an imported Russian Orlan-M alongside Zhai Zhigang in the Feitian, demonstrating they are distinct suits. Sources describe the Feitian as "modelled after" or "bearing strong resemblance to" the Orlan, but "derived from" implies direct technology transfer that is contested.
- Correction: Change to "Chinese rear-entry EVA suit with architectural similarities to the Soviet Orlan design."
- Source: https://en.wikipedia.org/wiki/Feitian_space_suit — confidence: high

🟡 **Minor imprecision** — name meaning and "Apsara dancers" characterization
- File: i18n description
- Quote: `"The name means 'flying in heaven' — also the name of the Apsara dancers in Chinese mythology."`
- "Feitian" (飞天) literally means "flying sky/heaven" — accurate. However, "Apsara dancers" is an oversimplification. The feitian are celestial beings depicted in Buddhist cave art (most famously Dunhuang), related to apsaras but specifically the Chinese Buddhist artistic tradition. They are not primarily described as "dancers" — they are flying celestial spirits (devas/gandharvas), though they are depicted in dance-like poses. Calling them "Apsara dancers in Chinese mythology" mixes Hindu apsara terminology with Chinese Buddhist iconography.
- Correction: "The name means 'flying heaven' — a reference to the celestial flying spirits (feitian) from Buddhist cave art at Dunhuang, depicted on the suit's arm badge."
- Source: https://en.wikipedia.org/wiki/Feitian_space_suit; https://www.metmuseum.org/art/collection/search/60778 — confidence: high

---

### krechet-94

🟠 **Misleading** — "architectural pattern that later became Orlan"
- File: i18n description
- Quote: `"the architectural pattern that later became Orlan and Feitian"`
- Krechet-94 and Orlan were developed **concurrently** beginning in 1967 — not sequentially. Both went through a full test cycle by 1969. Orlan was not derived from Krechet; they were parallel developments for different mission types (lunar surface vs. orbital). The Wikipedia article on Krechet-94 confirms parallel development. The claim that the Krechet architecture "later became Orlan" is historically inaccurate.
- Correction: "the architectural pattern shared with the Orlan (both developed concurrently in 1967–1969) and later adopted by the Feitian."
- Source: https://en.wikipedia.org/wiki/Krechet-94 — confidence: high

🔵 **Observation** — ground testing vs. flight
- File: `static/data/fleet/space-suit/krechet-94.json`, field `first_flight: "planned"`; also museum mention in i18n
- The Krechet-94 underwent a "full test cycle" (1967–1969) including vacuum chamber and thermal testing per Wikipedia, but never flew in space. The `status: "FAILED"` and `first_flight: "planned"` fields correctly capture this. The i18n note about museum survival is accurate (Memorial Museum of Cosmonautics, Moscow). No correction needed; noting for completeness.
- Source: https://en.wikipedia.org/wiki/Krechet-94 — confidence: high

---

### orlan-mks

🔴 **Factual error** — operating pressure
- File: i18n description
- Quote: `"Operating pressure 5.7 psi pure O₂"`
- The Orlan-MKS operating pressure is **5.8 psi (400 hPa / 40 kPa)**, consistent across Wikipedia and the Orlan family specifications. 5.7 psi is not a documented value for any Orlan variant.
- Correction: `"Operating pressure 5.8 psi (400 hPa) pure O₂"`
- Source: https://en.wikipedia.org/wiki/Orlan_space_suit — confidence: high

🟠 **Misleading** — "used on the ISS Russian segment and the legacy Mir and Salyut stations"
- File: i18n description
- Quote: `"Used on the ISS Russian segment and the legacy Mir and Salyut stations."`
- The **Orlan-MKS specifically** has been used only on the ISS since 2017. It was not used on Mir or Salyut — those stations used earlier Orlan variants (Orlan-D, Orlan-DM, Orlan-M, etc.). The description appears to conflate the Orlan-MKS entry with a general statement about the Orlan family.
- Correction: "Used on the ISS Russian segment. Earlier Orlan variants served on Salyut and Mir stations."
- Source: https://en.wikipedia.org/wiki/Orlan_space_suit — confidence: high

---

### shenzhou-iva

✅ No issues found.

The Shenzhou 5 first flight date (October 15, 2003) and Yang Liwei's crewed flight are confirmed. The suit's architectural similarity to Sokol KV-2 (including the V-shaped entry zipper and soft hood helmet) is well documented; the characterization as reflecting "technology transfer" is a common and defensible description given the close resemblance. Wikipedia characterizes the suit as "a Chinese-made version" of the Sokol-style design. No claims in the entry are demonstrably incorrect.

---

### sokol-kv-2

🔴 **Factual error** — first_flight date
- File: `static/data/fleet/space-suit/sokol-kv-2.json`, field `first_flight`
- Quote: `"1973-09-27"`
- September 27, 1973 was the first flight of the **Sokol-K** (the original version), not the Sokol KV-2. The Sokol KV-2 specifically first flew on **Soyuz T-2, launched June 5, 1980**. The KV-2 replaced the Sokol-K starting with the Soyuz T series.
- Correction: `first_flight: "1980-06-05"` (Soyuz T-2). The i18n tagline says "mandatory since the 1971 Soyuz 11 decompression deaths" which is correct for the Sokol family; the date "1973" in the base data should refer to the Sokol-K, not this specific KV-2 entry.
- Source: https://en.wikipedia.org/wiki/Sokol_space_suit — confidence: high

🟠 **Misleading** — "every launch and re-entry since 1973"
- File: i18n description
- Quote: `"Worn on every Soyuz ascent and re-entry since 1973."`
- The Sokol KV-2 has been in use since 1980 (Soyuz T-2), not 1973. 1973 is when the original Sokol-K was introduced. Additionally, a small number of Soyuz missions in the early 1970s that predated Sokol flew unsuited (Soyuz 12 introduced Sokol, but Soyuz 13–40 used the Sokol-K). The "since 1973" framing is accurate for the Sokol family broadly but not for the KV-2 specifically. The i18n description should align with the entry's actual subject.
- Correction: "Worn on every crewed Soyuz since Soyuz T-2 in 1980, replacing the original Sokol-K."
- Source: https://en.wikipedia.org/wiki/Sokol_space_suit — confidence: high

---

### sokol-m

🟡 **Minor imprecision / unverified** — designation and status
- File: i18n description
- Quote: `"Replacement for Sokol KV-2 ... Slated for Russia's PTK / Orel crewed spacecraft."`
- "Sokol-M" is found in Russian aerospace reporting as the next-gen IVA suit for the Orel spacecraft (confirmation from multiple Russian sources and Wikipedia's Sokol article). However, no public primary source (ESA, Roscosmos official English) confirms "Sokol-M" as the locked designation vs. a working/popular name. Orel itself is now targeting 2027–2028 first flight. The suit has undergone simulator tests at Star City but has not flown. The `status: "PLANNED"` is correct. No major error, but the confidence on the "Sokol-M" name is medium.
- Source: https://en.wikipedia.org/wiki/Sokol_space_suit; https://suzymchale.com/ruspace/rusuits.html — confidence: medium

---

### starliner-suit

🔴 **Factual error** — Wilmore and Williams return date
- File: i18n description
- Quote: `"Debuted on the Crew Flight Test mission flown by Butch Wilmore and Suni Williams (June–September 2024)."`
- Wilmore and Williams did **not** return in September 2024. The Starliner vehicle returned **uncrewed** on September 6, 2024. Wilmore and Williams remained on the ISS and returned to Earth via **SpaceX Crew-9 in February 2025**. The parenthetical "(June–September 2024)" implies a completed September 2024 return that did not happen.
- Correction: `"(June 2024 – February 2025)"` or "Wilmore and Williams launched June 5, 2024 and returned February 2025 via Crew-9 after Starliner returned uncrewed."
- Source: https://en.wikipedia.org/wiki/Boeing_Crew_Flight_Test; NASA FAQ https://www.nasa.gov/missions/station/commercial-crew/starliner-faq/ — confidence: high

🟠 **Misleading** — status: "ACTIVE"
- File: `static/data/fleet/space-suit/starliner-suit.json`, field `status`
- Quote: `status: "ACTIVE"`
- As of July 2026, the Starliner program has not flown astronauts since the CFT mishap. The next Starliner flight (targeting April 2026, now likely later) is uncrewed (cargo only). NASA's Inspector General found Starliner cannot fly astronauts until at least 2027. The Boeing Blue suit has no planned near-term crewed flight. "ACTIVE" overstates operational readiness. A status of "GROUNDED" or "DEVELOPMENT" better reflects the current situation.
- Source: https://easternherald.com/2026/07/03/boeing-starliner-certification-delay-nasa-watchdog/ — confidence: high

---

## Cross-cutting observations

1. **EMU `first_flight: "1981-04-12"`** is the STS-1 launch date, but the EMU was not worn on STS-1 (Columbia carried no EMU and performed no EVA). This appears to be a data entry error copying the Shuttle program start date. Correct date is the STS-6 EVA, April 7, 1983.

2. **ACES `first_flight: "1994-02-03"`** (STS-60) is incorrect. The correct date is STS-64 (September 9, 1994). Both the first_flight field and any i18n references to "starting in 1994" without specifying the mission are affected.

3. **Sokol KV-2 `first_flight: "1973-09-27"`** conflates the Sokol family introduction date (Sokol-K on Soyuz 12) with the KV-2 variant's introduction (Soyuz T-2, 1980). The entry is specifically for the KV-2, so the date must be 1980.

4. **Orlan-MKS pressure 5.7 psi vs. 5.8 psi**: 0.1 psi difference but 5.8 psi (400 hPa) is the canonical value across all Orlan family documentation. Correct to 5.8 psi.

5. **Starliner return date**: A high-visibility factual error — Wilmore/Williams did not return in September 2024. This is easily verifiable and should be corrected urgently as it remains a public-record news story.
