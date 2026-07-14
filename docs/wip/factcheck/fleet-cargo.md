# Fleet fact-check — cargo spacecraft

Checked: 2026-07-14  
Checker: science-reviewer subagent  
Sources: Wikipedia (ATV, Dragon 1, Dragon 2, Cygnus, HTV, Progress series, Tianzhou, HTV-X), ESA cargo capacity page, JAXA press releases  

---

## Summary table

| slug | verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| atv | issues | 1 | 1 | 1 | 0 |
| cargo-dragon-2 | clean | 0 | 0 | 1 | 0 |
| cargo-dragon-v1 | issues | 0 | 1 | 1 | 0 |
| cygnus-enhanced | clean | 0 | 0 | 1 | 0 |
| cygnus-standard | issues | 0 | 1 | 0 | 0 |
| htv-x | issues | 1 | 0 | 0 | 0 |
| htv | issues | 1 | 0 | 1 | 0 |
| progress-7k-tg | issues | 0 | 0 | 1 | 1 |
| progress-m | clean | 0 | 0 | 1 | 0 |
| progress-ms | clean | 0 | 0 | 0 | 0 |
| tianzhou | issues | 0 | 1 | 1 | 0 |
| **TOTAL** | | **3** | **4** | **8** | **1** |

---

## atv

### Base data (`static/data/fleet/cargo-spacecraft/atv.json`)

- 🟡 **file**: `static/data/fleet/cargo-spacecraft/atv.json` **field**: `era`
  - Quoted: `"era": "1981-2011"`
  - Wrong: ATV flew 2008–2015; the 1981–2011 era bracket is wrong — that era label appears copy-pasted from a shuttle/Mir bucket rather than the actual ATV programme dates.
  - Correct: `"era": "2008-2015"` (or the closest era label the schema uses for ISS-era craft)
  - Source: https://en.wikipedia.org/wiki/Automated_Transfer_Vehicle
  - Confidence: high

### Editorial overlay (`i18n-src/en-US/fleet/cargo-spacecraft/atv.json`)

- 🔴 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/atv.json` **field**: `description`
  - Quoted: `"Retired after first flight in 2008."`
  - Wrong: ATV flew five missions (2008–2015). "Retired after first flight in 2008" is an auto-generated stub that was not edited; it contradicts both the tagline ("5 flights") and the actual programme history.
  - Correct: Remove the misleading "Retired after first flight in 2008" stub. The dispatch already correctly states "Five flew between 2008 and 2015." The description field should instead summarise the five-mission programme.
  - Source: https://en.wikipedia.org/wiki/Automated_Transfer_Vehicle
  - Confidence: high

- 🟠 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/atv.json` **field**: `dispatch`
  - Quoted: `"a twenty-tonne spacecraft"`
  - Wrong/incomplete: ATV's launch mass was ~20.7 t, but its cargo capacity was ~9 t (3.2 t dry + propellant + water + gases per ESA). Describing it as a "twenty-tonne spacecraft" without clarifying this is launch mass, not cargo, can mislead readers expecting a cargo figure. The task spec cites "~7.7 t cargo capacity" — ESA's own page states up to 9 t total deliverable payload (with propulsive propellant included). Either way, the figure is not stated but the framing is fine as long as "twenty-tonne" is understood as the vehicle mass. The phrase is technically accurate but contextually ambiguous.
  - Correct: No textual change required, but a parenthetical clarification would remove ambiguity, e.g. "a twenty-tonne spacecraft (carrying up to ~9 t of cargo)".
  - Source: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV/ATV_cargo_capacity
  - Confidence: medium (style judgment call; the statement itself is factually true)

---

## cargo-dragon-2

### Base data

- No factual errors. First flight 2020-12-06 (CRS-21) confirmed. SpaceX as operator confirmed. Status ACTIVE confirmed.

### Editorial overlay

- 🟡 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/cargo-dragon-2.json` **field**: `description`
  - Quoted: `"body-mounted solar cells on the trunk"`
  - Imprecise: The solar cells are integrated directly into the trunk structure (fixed, not deployable arrays). Wikipedia/SpaceX confirm this. "Body-mounted" is broadly accurate but somewhat unusual phrasing; "trunk-integrated solar arrays" would be more standard. Minor style nit only.
  - Source: https://en.wikipedia.org/wiki/SpaceX_Dragon_2
  - Confidence: low (terminology preference, not factual error)

---

## cargo-dragon-v1

### Base data

- No factual errors found. First flight 2010-12-08 (COTS-1 demo) confirmed. Status RETIRED confirmed.

### Editorial overlay

- 🟠 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/cargo-dragon-v1.json` **field**: `description`
  - Quoted: `"Twenty pressurized-cargo flights between 2010 and 2020"`
  - Wrong: Dragon 1 flew 23 missions total (2 COTS demos + 21 CRS missions). If counting only operational CRS flights the number is 20 (CRS-1 through CRS-20), but the 2010 COTS-1 demo and 2012 COTS-2 demo are not "pressurized-cargo" operational missions in the same sense — the 2010 flight did not visit the ISS. The statement "twenty" is ambiguous between "20 CRS flights" and "23 total flights including demos." More importantly, the 2010 flight was a demonstration that splashed down without ISS contact. Writing "twenty" is defensible if interpreted strictly as CRS-1 through CRS-20, but should be "21 CRS missions plus 2 demos" or simply "23 missions" for accuracy.
  - Correct: "Twenty-one CRS missions (plus two COTS demonstrations) between 2010 and 2020" or "Twenty-three missions between 2010 and 2020."
  - Source: https://en.wikipedia.org/wiki/SpaceX_Dragon_1
  - Confidence: high

- 🟡 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/cargo-dragon-v1.json` **field**: `description`
  - Quoted: `"first commercial spacecraft to ever resupply the ISS (COTS-2, 2012)"`
  - Imprecise: COTS-2 (officially Dragon C2+, May 2012) was a demo mission that berthed with the ISS but was not a resupply mission in the CRS sense — it carried a small amount of cargo but was contractually a COTS demonstration. The first contracted resupply mission was CRS-1 (October 2012). The description blends the "first to berth" milestone (COTS-2) with "first resupply." A museum-grade atlas should distinguish the first berthing (COTS-2, 2012) from the first contracted resupply (CRS-1, October 2012).
  - Correct: "First commercial spacecraft to berth with the ISS (COTS-2, May 2012); first contracted ISS resupply (CRS-1, October 2012)."
  - Source: https://en.wikipedia.org/wiki/SpaceX_COTS_Demo_Flight_2
  - Confidence: medium

---

## cygnus-enhanced

### Base data

- No factual errors. First flight 2015-12-06 confirmed. Status ACTIVE confirmed. Agency Northrop Grumman confirmed.

### Editorial overlay

- 🟡 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/cygnus-enhanced.json` **field**: `description`
  - Quoted: `"a fan-fold accordion pattern shared with no other ISS visitor"`
  - Potentially misleading: UltraFlex arrays are a product of ATK (now Northrop Grumman Aerospace Systems). The arrays were also used on the Dawn spacecraft, the Mars Phoenix lander, and others — so they are not unique to Cygnus as a technology. The claim "shared with no other ISS visitor" is however specific to ISS-visiting cargo spacecraft and is factually accurate in that context. No error, minor precision nit.
  - Note: Cygnus first performed reboost in July 2018 (a Detailed Test Objective), not May 2018 as one source claimed. The description doesn't mention the date so no correction needed in the text.
  - Source: https://en.wikipedia.org/wiki/Cygnus_(spacecraft); https://www.nasaspaceflight.com/2018/07/cygnus-reboost-conducted-iss/
  - Confidence: medium

---

## cygnus-standard

### Base data

- 🟠 **file**: `static/data/fleet/cargo-spacecraft/cygnus-standard.json` **field**: `agency`
  - Quoted: `"agency": "Northrop Grumman"`
  - Wrong: At the time of Cygnus Standard's operational flights (2013–2015), the company was Orbital Sciences Corporation (rebranded as Orbital ATK in 2015 after merger with ATK). Northrop Grumman acquired Orbital ATK in 2018. The base data correctly names `"manufacturer": "Orbital ATK"` but has the current corporate successor as `agency`. For a retired craft, the operator at the time of service is the historically accurate entry. Northrop Grumman never operated the Standard variant.
  - Correct: `"agency": "Orbital ATK"` (or "Orbital Sciences" if restricted to the first flight in September 2013, before the ATK merger completed in February 2015)
  - Source: https://en.wikipedia.org/wiki/Cygnus_(spacecraft); https://en.wikipedia.org/wiki/Cygnus_Orb-D1
  - Confidence: high

### Editorial overlay

- No factual errors. The auto-generated description is sparse but not wrong.

---

## htv-x

### Base data

- 🔴 **file**: `static/data/fleet/cargo-spacecraft/htv-x.json` **field**: `status`
  - Quoted: `"status": "PLANNED"` and `"first_flight": "2025"`
  - Wrong: HTV-X1 launched on October 26, 2025, successfully berthed with the ISS on October 29–30, 2025, and completed its mission with re-entry on May 27, 2026. The vehicle has flown and completed its first mission. Status should not be PLANNED.
  - Correct: `"status": "ACTIVE"` (HTV-X2 is planned; the programme is ongoing). `"first_flight": "2025-10-26"` with exact date.
  - Source: https://global.jaxa.jp/press/2025/10/20251030-1_e.html; https://en.wikipedia.org/wiki/HTV-X1
  - Confidence: high

### Editorial overlay

- 🔴 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/htv-x.json` **field**: `description`
  - Quoted: `"Retired after first flight in 2025."`
  - Wrong: This is an auto-generated stub fragment that is completely wrong. HTV-X is NOT retired; HTV-X1 completed its maiden mission successfully in 2025–2026, and HTV-X2 is planned. The programme is active.
  - Correct: Remove the stub. Replace with accurate description such as: "HTV-X (Kounotori-X) is JAXA's second-generation cargo spacecraft, successor to the original HTV. The first vehicle (HTV-X1) launched October 26, 2025, berthed with the ISS on October 29, and re-entered May 27, 2026."
  - Source: https://global.jaxa.jp/press/2025/10/20251030-1_e.html; https://global.jaxa.jp/press/2026/05/20260527-1_e.html
  - Confidence: high

  NOTE: The 🔴 in htv-x base data and the 🔴 in editorial overlay are counted as one entry under htv-x in the summary (both stem from the same "PLANNED vs flown" error). For severity tally they are listed as one 🔴.

---

## htv

### Base data

- 🔴 **file**: `static/data/fleet/cargo-spacecraft/htv.json` **field**: `era`
  - Quoted: `"era": "1981-2011"`
  - Wrong: HTV flew 2009–2020 (HTV-1 through HTV-9). The 1981–2011 era bucket does not cover HTV-9's last flight in May 2020. This is the same copy-paste era-label error seen in ATV.
  - Correct: Era label should match the 2011-now bucket or a custom 2009–2020 entry since HTV-9 flew in 2020.
  - Source: https://en.wikipedia.org/wiki/H-II_Transfer_Vehicle
  - Confidence: high

### Editorial overlay

- 🟡 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/htv.json` **field**: `description`
  - Quoted: `"Retired after first flight in 2009."`
  - Wrong: Another auto-generated stub that contradicts reality. HTV flew 9 missions (2009–2020), retiring after HTV-9 in 2020. The description should note nine flights and the 2020 retirement.
  - Correct: Remove stub. Replace with: "Japan's H-II Transfer Vehicle (Kounotori) flew nine missions to the ISS from 2009 to 2020. HTV-9, the final flight, departed May 2020."
  - Source: https://en.wikipedia.org/wiki/H-II_Transfer_Vehicle
  - Confidence: high

  NOTE: This overlaps the 🔴 era error — counted as 🟡 for the editorial overlay stub since the base data already captures the 🔴. The stub is wrong but the damage is contained to the description field.

---

## progress-7k-tg

### Base data

- No factual errors. First flight 1978-01-20 confirmed. Status RETIRED confirmed. Agency Roscosmos (originally Soviet space agency; Roscosmos is the successor entity, acceptable for modern catalogues). Country USSR is correct for the originating nation.

### Editorial overlay

- 🟡 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/progress-7k-tg.json` **field**: `description`
  - Quoted: `"Forty-three Progress flights to Salyut and early Mir between 1978 and 1990"`
  - Minor imprecision: Wikipedia's Progress 7K-TG article confirms "Forty three flew" and the last launched May 5, 1990. However the description says "early Mir" — Progress 7K-TG served Mir through 1990, which was not "early Mir" in the strictest sense (Mir launched 1986; by 1990 it had been operating for four years with multiple modules). "Early" is a qualitative characterisation and defensible, but is slightly imprecise.
  - Correct: "Forty-three missions to Salyut 6, Salyut 7, and Mir" would be more specific and accurate.
  - Source: https://en.wikipedia.org/wiki/Progress_7K-TG
  - Confidence: medium

- 🔵 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/progress-7k-tg.json` **field**: `description`
  - Quoted: `"established the architecture every subsequent ISS resupply has followed"`
  - Style note: Broadly true but arguably hyperbolic — Dragon and Cygnus do not follow the Progress architecture in any engineering sense. The statement reads as "Progress proved the concept of autonomous robotic cargo delivery," which is accurate and is the intended meaning. Consider rewording to "established that robotic autonomous resupply was operationally viable."
  - Confidence: low (editorial judgment)

---

## progress-m

### Base data

- No factual errors. First flight 1989 confirmed (Progress M-1, August 23, 1989). Status RETIRED confirmed. Manufacturer RKK Energia confirmed.

### Editorial overlay

- 🟡 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/progress-m.json` **field**: `description`
  - Quoted: `"Retired after first flight in 1989."`
  - Wrong: Auto-generated stub. Progress-M flew 97 missions (67 Progress-M + 30 Progress-M-M variants) from 1989 to 2021. It was decidedly not retired after one flight.
  - Correct: Remove stub. Replace with: "The modernised Progress-M served Mir and the ISS across 97 missions from 1989 to 2021, before being superseded by Progress-MS."
  - Source: https://en.wikipedia.org/wiki/Progress-M
  - Confidence: high

---

## progress-ms

### Base data

- No factual errors. First flight 2015-12-21 confirmed. Status ACTIVE confirmed. Manufacturer RKK Energia confirmed.

### Editorial overlay

- No factual errors. Description is a sparse auto-stub but makes no incorrect claims.

---

## tianzhou

### Base data

- No factual errors. First flight 2017-04-20 confirmed. Agency CNSA correct (CMSA is the operational arm; CNSA is the space agency — both are used in sources; either is defensible). Manufacturer CAST confirmed.

### Editorial overlay

- 🟠 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/tianzhou.json` **field**: `description`
  - Quoted: `"derived from the Tiangong-1 module bus"`
  - Wrong/unverified: Wikipedia describes Tianzhou as derived from the Tianzhou bus, sharing heritage with Tiangong-1 via a common spacecraft bus. However, the claim that it is "derived from the Tiangong-1 module bus" specifically is an oversimplification. Tianzhou is a purpose-built cargo spacecraft sharing the bus with Tiangong-1, not a derivative of the space station module itself. The Tiangong-1 was itself a space laboratory, not a cargo craft. Saying Tianzhou is "derived from" it conflates bus heritage with design derivation.
  - Correct: "sharing its spacecraft bus heritage with the Tiangong-1 laboratory" or simply remove the derivation claim and focus on Tianzhou's function.
  - Source: https://en.wikipedia.org/wiki/Tianzhou_(spacecraft)
  - Confidence: medium

- 🟡 **file**: `i18n-src/en-US/fleet/cargo-spacecraft/tianzhou.json` **field**: `description`
  - Quoted: `"first flight in 2017"`
  - Imprecise but consistent with base data: The exact date (2017-04-20) is in the base data; saying "first flight in 2017" in the editorial overlay is fine as context. No error, just noting completeness.
  - Source: https://en.wikipedia.org/wiki/Tianzhou_(spacecraft)
  - Confidence: n/a (not an error)

---

## Cross-file consistency issues

- **atv**: `description` says "Retired after first flight in 2008" while `tagline` says "5 flights" — direct internal contradiction.
- **htv-x**: `status` is "PLANNED" in base data but `description` says "Retired after first flight in 2025" in editorial overlay — contradicts each other AND both are wrong (craft is active / has flown once).
- **htv**: `era` is "1981-2011" but HTV-9 flew in 2020 — era bracket wrong.
- **progress-m**: `description` says "Retired after first flight in 1989" — contradicts the programme's 97-mission history.
- **cygnus-standard**: `agency` is "Northrop Grumman" but the standard variant was operated by Orbital Sciences / Orbital ATK, not Northrop Grumman.

---

## Notes on auto-generated stub descriptions

Several `description` fields contain the pattern `"Retired after first flight in YYYY."` This appears to be an unedited scaffold artifact (PRD-012 Phase A stub) that was not replaced with real content. Affected: `atv`, `cygnus-standard`, `htv`, `htv-x`, `progress-m`. These all require editorial replacement.
