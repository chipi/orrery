# Fleet Station Fact-Check

Reviewed: 2026-07-14  
Entries: iss, mir, salyut-1 through salyut-7, skylab, tiangong-1, tiangong-2, tiangong  
Scope: i18n-src/en-US + static/data base fields

---

## Per-entry verdicts

| Station | Clean | Issues |
|---|---|---|
| iss | mostly | 🟡×1 (era field wrong) |
| mir | mostly | 🟡×1 (description wording imprecise) |
| salyut-1 | CLEAN | — |
| salyut-2 | 🟠 | 🟠×1 (failure cause wrong — debris not attitude-control) |
| salyut-3 | 🟡 | 🟡×1 (cannon calibre uncertain) |
| salyut-4 | 🟠 | 🟠×1 (Soyuz 17 duration stated as 30 days, actual 29 days) |
| salyut-5 | 🟠 | 🟠×1 (Soyuz 21 duration stated as 48 days, actual 49 days) |
| salyut-6 | CLEAN | — |
| salyut-7 | CLEAN | — |
| skylab | CLEAN | — |
| tiangong-1 | 🟡 | 🟡×1 (description says "Retired after first flight in 2011" — misleading) |
| tiangong-2 | 🟡 | 🟡×1 (description says "Retired after first flight in 2016" — misleading) |
| tiangong | 🟠 | 🟠×1 (description says "roughly the mass of Mir" — Mir 130 t vs Tiangong ~66 t; very different) |

Totals: 🔴 0 · 🟠 4 · 🟡 4 · 🔵 0

---

## Findings

### ISS

**🟡 MINOR — base: `era` field**

- File: `static/data/fleet/station/iss.json`
- Field: `era`
- Quote: `"era": "1981-2011"`
- Problem: ISS assembly began 1998 (Zarya launched 1998-11-20); the station is ACTIVE. The era tag "1981-2011" refers to the Shuttle era and makes no sense for an active station assembled from 1998 and still operational.
- Correction: `"era": "1998-now"` or consistent with however Orrery's era taxonomy assigns active multi-decade stations.
- Source: https://en.wikipedia.org/wiki/Assembly_of_the_International_Space_Station (Zarya launched 20 Nov 1998)
- Confidence: high

---

### Mir

**🟡 MINOR — i18n: description occupancy claim**

- File: `i18n-src/en-US/fleet/station/mir.json`
- Field: `description`
- Quote: `"continuously occupied for nearly a decade through 2000"`
- Problem: Mir's continuous occupancy ended 28 August 1999 (EO-27 departure), not 2000. A brief final crew (EO-28, April–June 2000) returned, but there was a gap of ~7 months (Aug 1999 – Apr 2000) when the station was uncrewed. "Continuously occupied through 2000" is inaccurate. The correct claim is: the longest unbroken stretch was Sept 1989 – Aug 1999 (~10 years); final crew visited Apr–Jun 2000.
- Correction: "continuously occupied for almost 10 years (1989–1999), with a final crew visit in 2000"
- Source: https://en.wikipedia.org/wiki/Mir (occupancy timeline); NASA SP-4225
- Confidence: high

---

### Salyut 1

No issues found.

- Launch date 1971-04-19: confirmed.
- First space station: confirmed.
- Soyuz 11 crew (Dobrovolski, Volkov, Patsayev): confirmed.
- 23 days aboard: confirmed (Soyuz 11 docked June 7, undocked June 29 = 23 days station time).
- All three died on return from capsule depressurisation: confirmed.
- Reentry Oct 11, 1971: confirmed.

---

### Salyut 2

**🟠 SIGNIFICANT — i18n + base: failure mechanism wrong**

- Files: `i18n-src/en-US/fleet/station/salyut-2.json` (dispatch + description), `static/data/fleet/station/salyut-2.json` (credit)
- Field: dispatch / description / credit
- Quote: `"its attitude-control system tumbled the station 11 days later (1973-04-14), and a sudden depressurisation on the 13th day rendered it unusable"`
- Problem: The failure cause in the data is stated as the attitude-control system malfunctioning. However, the established cause (confirmed by multiple sources) is that debris from the Proton third stage — which exploded three days after launch — struck Salyut 2 approximately 10–13 days later, tearing off both solar panels and puncturing the hull, causing depressurisation. Loss of solar panels caused loss of power and attitude control; the attitude-control failure was an effect, not a root cause. The description "its attitude-control system tumbled the station" is causally backwards and misleading.
- Additionally: the quote states the tumbling began "11 days later (1973-04-14)". April 3 + 11 days = April 14. That arithmetic is consistent, but the cause is still wrong.
- Correction: Describe the Proton third-stage debris strike as the root cause: "Debris from the Proton's spent third stage, which exploded three days after launch, struck the station ~10 days later, tearing off both solar panels and puncturing the hull. The resulting power loss and depressurisation on the 13th day (1973-04-14) rendered the station unusable."
- Source: https://en.wikipedia.org/wiki/Salyut_2; https://www.russianspaceweb.com/almaz_ops1.html
- Confidence: high

---

### Salyut 3

**🟡 MINOR — i18n: cannon calibre**

- File: `i18n-src/en-US/fleet/station/salyut-3.json`
- Field: description / credit
- Quote: `"its onboard 23-mm Rikhter R-23M cannon"` (description) and `"23-mm Rikhter R-23M cannon"` (credit)
- Problem: The designation is contested. Some sources identify it as the Nudelman-Rikhter NR-23 (23 mm); others cite the Nudelman NR-30 (30 mm). The Rikhter R-23M was an aircraft cannon adapted for the Almaz. The 23 mm identification is the most-cited (e.g. Wikipedia Salyut 3, National Interest), but the 30 mm claim also has sourcing. Either way, calling it "Rikhter R-23M" specifically is reasonable but should be noted as uncertain.
- Correction: Minor — consider hedging as "reportedly a 23-mm (some sources: 30-mm) Nudelman cannon" or keep 23-mm with the caveat that calibre is disputed.
- Source: https://en.wikipedia.org/wiki/Salyut_3; https://nationalinterest.org/feature/revealed-the-soviet-unions-space-cannon-14068
- Confidence: medium (genuine source disagreement)

Other Salyut 3 facts verified:
- Soyuz 14 crew (Popovich + Artyukhin), 15 days (July 3–19, 1974): confirmed (15.73 days).
- Soyuz 15 failed automatic docking (Aug 26, 1974): confirmed.
- Reentry 1975-01-24: confirmed.

---

### Salyut 4

**🟠 SIGNIFICANT — i18n: Soyuz 17 duration off by 1 day**

- File: `i18n-src/en-US/fleet/station/salyut-4.json`
- Field: dispatch / description / credit
- Quote: `"Soyuz 17 (Gubarev + Grechko, 30 days, 1975-01-11 to 1975-02-09)"`
- Problem: The actual Soyuz 17 mission duration was 29 days, 13 hours, 19 minutes — sources consistently cite "29 days". The data says "30 days". Also, the date range given (Jan 11 to Feb 9) spans 29 days, which contradicts the "30 days" label in the same sentence.
- Correction: Change "30 days" to "29 days".
- Source: https://en.wikipedia.org/wiki/Soyuz_17; https://www.spacefacts.de/mission/english/soyuz-17.htm
- Confidence: high

Other Salyut 4 facts verified:
- Launch 1974-12-26: confirmed.
- Soyuz 18 (Klimuk + Sevastyanov, 63 days, May 24 – July 26, 1975): confirmed.
- Soyuz 18a abort (Lazarev + Makarov, 1975-04-05): confirmed.
- Reentry 1977-02-03: confirmed.

---

### Salyut 5

**🟠 SIGNIFICANT — i18n: Soyuz 21 duration off by 1 day**

- File: `i18n-src/en-US/fleet/station/salyut-5.json`
- Field: dispatch / description / credit
- Quote: `"Soyuz 21 (Volynov + Zholobov, 48 days, 1976-07-06 to 1976-08-24)"`
- Problem: The actual Soyuz 21 mission duration was 49 days, 6 hours, 23 minutes. Sources consistently give "49 days". The data says "48 days". The date range given (July 6 to Aug 24) is 49 days, again contradicting the "48 days" label in the same sentence.
- Correction: Change "48 days" to "49 days".
- Source: https://en.wikipedia.org/wiki/Soyuz_21; https://en.wikipedia.org/wiki/Salyut_5
- Confidence: high

Other Salyut 5 facts verified:
- Launch 1976-06-22: confirmed.
- Soyuz 24 (Gorbatko + Glazkov, ~17–18 days, Feb 7–25, 1977): confirmed (search says ~18 days; data says 17 days — borderline, Feb 7 to Feb 25 = 18 days inclusive, 17 days elapsed).
- Salyut 5 was last Almaz: confirmed.
- Reentry 1977-08-08: confirmed.

---

### Salyut 6

No issues found.

- Launch 1977-09-29: confirmed.
- First dual-port station with Progress resupply: confirmed.
- Operated ~5 years (1977–1982): confirmed.
- Hosted Interkosmos international crews: confirmed.

---

### Salyut 7

No issues found.

- Launch 1982-04-19: confirmed.
- Dzhanibekov + Savinykh rescue 1985: confirmed (Soyuz T-13, arrived June 6, 1985).
- Reentry 1991-02-07 over Argentina (Capitán Bermúdez): confirmed.
- Last Salyut: confirmed.

---

### Skylab

No issues found.

- First US space station: confirmed.
- Launch 1973-05-14: confirmed.
- Three crews of three: confirmed.
- Reentry 1979-07-11 over Australia (Indian Ocean + Western Australia): confirmed.
- Built from Saturn V S-IVB upper stage: confirmed.

---

### Tiangong-1

**🟡 MINOR — i18n: description says "Retired after first flight in 2011" — confusing**

- File: `i18n-src/en-US/fleet/station/tiangong-1.json`
- Field: `description`
- Quote: `"Retired after first flight in 2011."`
- Problem: "First flight in 2011" is accurate (launched 2011-09-29), but "Retired after first flight" implies it only flew once with no further use. In fact it hosted two crewed visits (Shenzhou 9 in 2012, Shenzhou 10 in 2013) and contact was lost March 2016. It reentered uncontrolled April 2, 2018. Saying it was "retired after first flight in 2011" is factually incorrect.
- Correction: "Hosted two crewed visits (Shenzhou 9 and 10, 2012–2013); contact lost 2016; uncontrolled reentry April 2, 2018."
- Source: https://en.wikipedia.org/wiki/Tiangong-1
- Confidence: high

---

### Tiangong-2

**🟡 MINOR — i18n: description says "Retired after first flight in 2016" — confusing**

- File: `i18n-src/en-US/fleet/station/tiangong-2.json`
- Field: `description`
- Quote: `"Retired after first flight in 2016."`
- Problem: Same pattern as Tiangong-1. "First flight in 2016" is the launch date (Sept 15, 2016), but Tiangong-2 hosted a 30-day crewed mission (Shenzhou 11, Oct–Nov 2016) — China's longest mission at the time — plus the Tianzhou-1 cargo docking in 2017. Deorbited July 19, 2019. Saying "retired after first flight in 2016" is factually incorrect.
- Correction: "Hosted Shenzhou 11 (30-day mission, 2016) and Tianzhou-1 cargo ship (2017); deorbited July 19, 2019."
- Source: https://en.wikipedia.org/wiki/Tiangong-2
- Confidence: high

---

### Tiangong

**🟠 SIGNIFICANT — i18n: mass comparison to Mir is wrong**

- File: `i18n-src/en-US/fleet/station/tiangong.json`
- Field: `description`
- Quote: `"Roughly the mass and volume of Mir"`
- Problem: Mir's fully assembled mass was ~130 t (285,900 lbs). Tiangong's fully assembled mass is ~66 t. That is roughly half Mir's mass, not "roughly the same." The volume comparison is closer but also not precise (Mir ~350 m³ pressurised vs Tiangong ~110 m³ — Mir is ~3× larger by volume). This comparison is significantly inaccurate in both dimensions.
- Correction: Remove the Mir comparison entirely, or replace with: "With a mass of ~66 t and pressurised volume of ~110 m³, Tiangong is smaller than Mir (130 t) but represents China's permanent station capability."
- Source: https://en.wikipedia.org/wiki/Tiangong_space_station; https://www.planetary.org/space-missions/chinese-space-station (66 t mass confirmed); https://en.wikipedia.org/wiki/Mir (Mir ~130 t)
- Confidence: high

Other Tiangong facts verified:
- Tianhe core launched 2021-04-29: confirmed.
- Wentian (July 2022) and Mengtian (October 2022) modules: confirmed.
- Fully assembled October 2022: confirmed.
- Continuously crewed since June 2022: confirmed.
- Only currently operational station outside ISS: confirmed.
