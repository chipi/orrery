# Fleet Observatory Fact-Check
Date: 2026-07-14
Reviewer: science-reviewer agent (web-verified)
Scope: 12 entries — chandra, compton-gro, euclid, gaia, hitomi, hubble, jwst,
       kepler, spektr-rg, spitzer, tess, xmm-newton

## Per-entry verdicts

| Entry | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| chandra | WARN | 0 | 1 | 1 | 0 |
| compton-gro | PASS | 0 | 0 | 0 | 1 |
| euclid | WARN | 0 | 1 | 1 | 0 |
| gaia | PASS | 0 | 0 | 1 | 0 |
| hitomi | WARN | 0 | 1 | 0 | 0 |
| hubble | WARN | 0 | 1 | 0 | 1 |
| jwst | PASS | 0 | 0 | 0 | 1 |
| kepler | WARN | 0 | 0 | 1 | 1 |
| spektr-rg | FAIL | 1 | 1 | 0 | 0 |
| spitzer | PASS | 0 | 0 | 0 | 1 |
| tess | WARN | 0 | 0 | 1 | 1 |
| xmm-newton | PASS | 0 | 0 | 0 | 1 |

Totals: 🔴 1 · 🟠 5 · 🟡 5 · 🔵 7

---

## CHANDRA

### 🟠 CH-1 — Status may be misleading for 2026 context
- File: `static/data/fleet/observatory/chandra.json`
- Field: `status`
- Quote: `"ACTIVE"`
- Issue: Technically still operational, but NASA's FY2026 budget cuts Chandra
  funding to $26.6M (from $68.3M in 2023), with plans to effectively retire
  the mission by end of 2026. Half the staff were to be laid off by end of
  2025; a partial reprieve kept funding through Sep 30 2025. Status "ACTIVE"
  is not wrong but is incomplete — by late 2026 the mission may be shuttered.
- Correction: Consider `"ACTIVE (at risk)"` or add a note field; at minimum
  flag for re-check after FY2026 appropriations resolve.
- Source: https://www.space.com/chandra-x-ray-observatory-nasa-fy2025-budget
- Confidence: HIGH

### 🟡 CH-2 — `era` field spans era boundary
- File: `static/data/fleet/observatory/chandra.json`
- Field: `era`
- Quote: `"era": "1981-2011"`
- Issue: Chandra launched 1999 and is still active in 2026 — it has operated
  across both the `1981-2011` and `2011-now` eras. The field as used here
  appears to mean "launched during this era", which is consistent with the
  field's meaning elsewhere in the fleet data and is not factually wrong. Low
  severity.
- Correction: No change needed if `era` = launch era by design. Flag for docs
  clarification if the schema is ambiguous.
- Confidence: MEDIUM (schema intent unclear without field-level docs)

---

## COMPTON-GRO

### 🔵 CG-1 — Correct but deorbit nuance worth noting
- File: `static/data/fleet/observatory/compton-gro.json`
- Field: `status`, `first_flight`
- Issue: Launch date 1991-04-05 confirmed. Status "RETIRED" is correct
  (deorbited 2000-06-04, deliberately after one gyroscope failed). The
  description "1991–2000" in the i18n src is accurate. No errors found.
- Confidence: HIGH

---

## EUCLID

### 🟠 EU-1 — Manufacturer attribution reverses prime/sub roles
- File: `static/data/fleet/observatory/euclid.json`
- Field: `manufacturer`
- Quote: `"Airbus Defence and Space / Thales Alenia Space"`
- Issue: **Thales Alenia Space (TAS)** is the prime contractor (satellite +
  service module). Airbus (formerly Astrium) built the payload module
  (telescope + optical bench). The current entry lists Airbus first, implying
  it is the prime — this is backwards.
- Correction: `"Thales Alenia Space / Airbus Defence and Space"` (TAS prime;
  Airbus payload module)
- Source: https://www.esa.int/Science_Exploration/Space_Science/Thales_Alenia_Space_kicks_off_Euclid_construction
- Confidence: HIGH

### 🟡 EU-2 — Launch date off by one day
- File: `static/data/fleet/observatory/euclid.json`
- Field: `first_flight`
- Quote: `"2023-07-01"`
- Issue: Euclid launched July 1, 2023 at 11:12 a.m. EDT = 15:12 UTC. The date
  `2023-07-01` is correct in UTC. No error.
- Correction: None needed — date is correct UTC.
- Confidence: HIGH

### 🟡 EU-3 — Description omits near-infrared wavelength band
- File: `i18n-src/en-US/fleet/observatory/euclid.json`
- Field: `description`
- Quote: `"Dark-energy survey across one third of the sky. In service since 2023."`
- Issue: The description is a near-verbatim echo of `tagline` and `best_known_for`.
  It omits that Euclid operates in visible + near-infrared (VIS + NISP), which
  is substantively different from, e.g., an X-ray or infrared-only telescope.
  Not factually wrong, but thin to the point of being misleading by omission.
- Correction: Expand: "surveys the sky in visible and near-infrared light to
  map the large-scale structure of the Universe and constrain dark energy."
- Source: https://www.esa.int/Science_Exploration/Space_Science/Euclid_overview
- Confidence: HIGH

---

## GAIA

### 🟡 GA-1 — Description says "Operated 2013–2025" but ops ended March 2025
- File: `i18n-src/en-US/fleet/observatory/gaia.json`
- Field: `description`
- Quote: `"Operated 2013–2025"`
- Issue: Science observations ended **15 January 2025**; spacecraft operations
  (all subsystems shut down, retirement orbit injection) completed **27 March
  2025**. "2013–2025" is therefore accurate as an end-year, but could be
  tightened to "science ops ended January 2025; spacecraft retired March 2025".
  Status "RETIRED" in base JSON is correct.
- Correction: Minor precision issue, not a factual error. Optional: "science
  observations ended January 2025; spacecraft decommissioned March 2025."
- Source: https://www.esa.int/Enabling_Support/Operations/Farewell_Gaia!_Spacecraft_operations_come_to_an_end
- Confidence: HIGH

---

## HITOMI

### 🟠 HI-1 — Days-before-loss count is wrong
- File: `i18n-src/en-US/fleet/observatory/hitomi.json`
- Field: `description`
- Quote: `"lost just 38 days after launch"`
- Issue: Hitomi launched 2016-02-17; contact lost 2016-03-26. That is **37
  days** (26 March − 17 February = 37 days), not 38. Multiple primary sources
  (Wikipedia, SpaceflightNow, SLAC Q&A) confirm "38 days" is the figure that
  circulates widely, but computing the interval precisely gives 37 days.
  Some sources round up to 38 because they count inclusively; others count
  calendar days differently. The discrepancy is minor but worth flagging.
- Correction: Use "37 days" for strict calendar-day accuracy, or "about five
  weeks" to avoid the dispute.
- Source: https://en.wikipedia.org/wiki/Hitomi_(satellite)
         https://spacenews.com/jaxa-abandons-efforts-to-recover-hitomi-satellite/
- Confidence: MEDIUM (depends on counting convention — JAXA itself uses "38")

---

## HUBBLE

### 🟠 HU-1 — Description implies COSTAR is still installed (it was removed in 2009)
- File: `i18n-src/en-US/fleet/observatory/hubble.json`
- Field: `description`
- Quote: `"a primary mirror corrected by COSTAR after the manufacturing flaw
  was discovered post-launch"`
- Issue: COSTAR was installed during Servicing Mission 1 (December 1993) and
  **removed during SM4 (May 2009)** to make room for the Cosmic Origins
  Spectrograph. All post-1993 instruments had built-in corrective optics.
  The description is factually accurate about the historical correction but
  implies COSTAR is part of the current telescope, which is misleading to a
  general reader.
- Correction: "a primary mirror flaw corrected in 1993 by COSTAR (later
  replaced by instruments with built-in corrective optics)"
- Source: https://en.wikipedia.org/wiki/Corrective_Optics_Space_Telescope_Axial_Replacement
         https://science.nasa.gov/mission/hubble/observatory/missions-to-hubble/servicing-mission-4/
- Confidence: HIGH

### 🔵 HU-2 — Five servicing missions confirmed; dates + agencies correct
- File: `static/data/fleet/observatory/hubble.json`
- Fields: `first_flight`, `agency`, `status`
- Issue: Launch 1990-04-24 confirmed. Agency "NASA / ESA" confirmed (ESA
  provides 15% of observing time + instruments). Status "ACTIVE" confirmed —
  Hubble continues to operate in 2026 (though on reduced gyroscopes).
  No errors.
- Confidence: HIGH

---

## JWST

### 🔵 JW-1 — All key facts verified correct
- File: `static/data/fleet/observatory/jwst.json` + i18n
- Fields: `first_flight`, `agency`, `description`
- Issue: Launch 2021-12-25 confirmed. Mirror 6.5 m confirmed. L2 orbit
  confirmed. Agency NASA / ESA correct (CSA is the third partner but does not
  appear in the agency field — acceptable for a two-slot field). "January 2022"
  L2 arrival confirmed. "Largest infrared space telescope ever built" confirmed
  (no larger one exists as of 2026). No errors.
- Confidence: HIGH

---

## KEPLER

### 🟡 KE-1 — "2,600+" exoplanet count is low and frozen at retirement
- File: `i18n-src/en-US/fleet/observatory/kepler.json`
- Field: `description`, `best_known_for`
- Quote: `"Discovered over 2,600 confirmed exoplanets"`
- Issue: Kepler had 2,662 confirmed at retirement (Oct 2018). Subsequent
  analysis of archived Kepler data has continued raising the count; as of
  November 2025, the NASA Exoplanet Archive lists 2,784 Kepler confirmed
  planets (plus 549 from K2 extension). "2,600+" is defensible as a floor
  but is stale; the tagline `"Discovered 2,600+ exoplanets"` uses a "+" that
  technically covers the higher count but could be more precise.
- Correction: Update to "more than 2,700 confirmed exoplanets" (or "2,700+")
  to reflect ongoing archival confirmations.
- Source: https://en.wikipedia.org/wiki/Kepler_space_telescope
         https://science.nasa.gov/mission/kepler/
- Confidence: HIGH

### 🔵 KE-2 — Retirement date, orbit type, launch date all correct
- File: `static/data/fleet/observatory/kepler.json`
- Fields: `first_flight`, `status`
- Issue: Launch 2009-03-07 confirmed. Status "RETIRED" confirmed (retired
  Oct 30 / Nov 15 2018). No errors.
- Confidence: HIGH

---

## SPEKTR-RG

### 🔴 SR-1 — Agency field omits DLR / German partnership; mission is joint
- File: `static/data/fleet/observatory/spektr-rg.json`
- Field: `agency`
- Quote: `"Roscosmos"`
- Issue: Spektr-RG is formally a **Russian–German** mission. The German
  Space Agency (DLR) and the Max Planck Institute for Extraterrestrial Physics
  (MPE) built and own the eROSITA instrument. "Roscosmos" alone misrepresents
  the mission as Russian-only — the tagline even says "Russian-German" while
  the agency field contradicts this. This is a factual error for a museum-
  grade atlas.
- Correction: `"Roscosmos / DLR"` (or `"IKI / MPE"` at institute level, but
  agency-level is DLR)
- Source: https://en.wikipedia.org/wiki/Spektr-RG
         https://www.mpe.mpg.de/7856215/news20220303
- Confidence: HIGH

### 🟠 SR-2 — Status "ACTIVE" is misleading: eROSITA halted Feb 2022
- File: `static/data/fleet/observatory/spektr-rg.json`
- Field: `status`
- Quote: `"ACTIVE"`
- Issue: As of February 26, 2022, the eROSITA instrument (the primary German
  telescope, which produced the landmark all-sky X-ray survey) was switched to
  safe mode at DLR's request following Russia's invasion of Ukraine. ART-XC
  (Russian instrument) continues to operate. The spacecraft is alive but the
  flagship instrument is offline indefinitely. "ACTIVE" overstates the
  situation.
- Correction: `"PARTIAL"` or `"ACTIVE (eROSITA halted 2022)"`. The i18n
  description should note that eROSITA is suspended.
- Source: https://www.mpe.mpg.de/7856215/news20220303
         https://en.wikipedia.org/wiki/EROSITA
- Confidence: HIGH

---

## SPITZER

### 🔵 SP-1 — All facts verified correct
- File: both JSON files
- Fields: `first_flight`, `status`, `description`
- Issue: Launch 2003-08-25 confirmed. Retired 2020-01-30 confirmed. Cryogenic
  coolant exhausted 2009 → warm mission confirmed. "16 years of data" (2003–
  2020 = 16 years, 5 months) confirmed. Status "RETIRED" confirmed. Orbit
  is heliocentric (Earth-trailing solar orbit), not mentioned in the base JSON
  but not contradicted. No errors.
- Confidence: HIGH

---

## TESS

### 🟡 TE-1 — "26 sectors" coverage claim needs precision
- File: `i18n-src/en-US/fleet/observatory/tess.json`
- Field: `description`
- Quote: `"Surveys nearly the entire sky in 26 sectors"`
- Issue: TESS surveys the sky in 26 sectors **per year** (13 in the northern
  hemisphere + 13 in the southern hemisphere per 2-year cycle), covering ~85%
  of the sky. "26 sectors" is the yearly sector count; saying "nearly the
  entire sky in 26 sectors" conflates the per-cycle count with total coverage.
  Not wrong but imprecise; a careful reader might miscount.
- Correction: "Surveys ~85% of the sky across 26 sectors per year" or simply
  "surveys nearly the entire sky."
- Source: https://en.wikipedia.org/wiki/Transiting_Exoplanet_Survey_Satellite
         https://heasarc.gsfc.nasa.gov/docs/tess/what-is-tess.html
- Confidence: MEDIUM

### 🔵 TE-2 — Orbit and launch facts correct
- File: `static/data/fleet/observatory/tess.json`
- Fields: `first_flight`, `status`, `manufacturer`
- Issue: Launch 2018-04-18 confirmed. Manufacturer "Orbital ATK" correct
  (company was called Orbital ATK at launch; now Northrop Grumman Innovation
  Systems, but Orbital ATK is the build-time name and is correct). Status
  "ACTIVE" confirmed (TESS still operating as of May 2026 per NASA). Orbit
  is a unique 13.7-day HEO (not LEO, not L2) — not stated in the base JSON,
  no contradiction. No errors.
- Confidence: HIGH

---

## XMM-NEWTON

### 🔵 XM-1 — All facts verified correct
- File: both JSON files
- Fields: `first_flight`, `status`, `agency`, `manufacturer`
- Issue: Launch 1999-12-10 confirmed. Agency "ESA" confirmed. Status "ACTIVE"
  confirmed — XMM-Newton received a mission extension endorsed at ESA's Science
  Programme Committee meeting June 2026; scheduled to operate until 2034+.
  Manufacturer "Airbus Defence and Space" correct (built as Dornier/Astrium,
  now Airbus). No errors.
- Source: https://www.esa.int/Science_Exploration/Space_Science/XMM-Newton
         https://www.cosmos.esa.int/web/xmm-newton
- Confidence: HIGH
