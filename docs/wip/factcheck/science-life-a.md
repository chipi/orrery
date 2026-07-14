# Science fact-check — Life-in-Space, batch A

Independent, web-verified review of 14 SCIENCE overlays. Severity: 🔴 critical (factually wrong, load-bearing) · 🟠 significant (wrong attribution / misleading number) · 🟡 minor (overstated certainty / imprecise) · 🔵 nit (rounding / phrasing).

Reviewer stance: assume-wrong-until-verified. Files reviewed are `i18n-src/en-US/science/life-in-space/<slug>.json`. No `static/data/.../<slug>.json` counterparts carry quantitative claims (they are index/nav only); the `_index.json` was checked and holds no physiological numbers.

## Per-overlay verdicts

| Overlay | Verdict | Findings |
|---|---|---|
| _intro | ✅ clean | 0 |
| bone-density-loss | ✅ solid | 1 🔵 |
| crew-dynamics-psychology | ⚠️ 1 disputed number | 1 🟡 |
| crew-selection | ✅ solid | 1 🟡 |
| crewed-station-design | ✅ solid | 0 |
| eclss-life-support | ⚠️ wrong attribution | 1 🟠, 1 🟡 |
| eva-operations | ✅ solid | 0 |
| eva-physiology | ✅ solid | 1 🔵 |
| eva-suits | ✅ solid | 1 🔵 |
| food-production-off-world | ✅ solid | 0 |
| isru-resource-utilization | ✅ solid | 0 |
| iva-suits | ✅ solid | 0 |
| long-duration-effects | ⚠️ low-side stat | 1 🟡 |
| lunar-habitat-design | 🔴 radiation numbers wrong | 1 🔴 |

**Totals: 🔴 1 · 🟠 1 · 🟡 4 · 🔵 3 = 9 findings across 14 overlays.** Batch is strong overall; one genuine error (lunar radiation), one wrong attribution (Sabatier builder), the rest imprecision/rounding.

---

## _intro.json
No quantitative claims. "65 years" of spaceflight (from 1961) is consistent with a 2026 authoring date. "16 sunrises" implied elsewhere is correct. **Clean.**

---

## bone-density-loss.json

### 🔵 Post-menopausal comparison stated as "1–2%/year"
- **Field:** `body_paragraphs[1]`
- **Quote:** "post-menopausal osteoporosis on Earth runs at about 1–2% per **year**."
- **Assessment:** Correct and well-sourced. Early-postmenopausal bone loss is ~1–2%/yr (spine). The core claim (~1–2%/month in microgravity; ~0.5%/month post-ARED vs 1.5% pre-ARED) is all confirmed by NASA and CSA sources. Intro's "1–2%/month" and body's "0.5%/month with ARED+bisphosphonate" are both standard figures.
- **Source:** https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/ · https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/bones.asp
- **Confidence:** High. No correction needed; logged only to note the numbers were checked and hold.

Note: ARED axial-load figure "~1100 N" is plausible (ARED delivers up to ~600 lbf ≈ 2670 N max; typical squat loads in the 1000+ N range) — not flagged.

---

## crew-dynamics-psychology.json

### 🟡 Mir fire "roared for ~14 minutes" stated as fact
- **Field:** `body_paragraphs[1]`
- **Quote:** "a Vika oxygen-generation candle caught fire in the Kvant-1 module — flames roared for ~14 minutes"
- **What's wrong:** The 14-minute figure is **Jerry Linenger's personal account and is disputed**. The official Russian/NASA record puts the *flame* at roughly 90 seconds; the ~14 minutes is closer to the total time before smoke cleared / the crew stayed masked. Presenting "flames roared for ~14 minutes" as settled fact overstates certainty on a contested number. (The sibling overlay `crewed-station-design.json` handles this more safely, saying only "a fire (1997) bad enough that the crew put on respirators.")
- **Correction:** Attribute it — e.g. "flames that Linenger described as burning for up to ~14 minutes (Russian accounts put the active flame nearer 90 seconds)."
- **Source:** https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/ · https://roundupreads.jsc.nasa.gov/roundup/1869
- **Confidence:** High that the number is disputed; medium on which figure is "true."

Other claims spot-checked and OK: Spektr collision June 1997 at ~1 m/s puncturing the hull; MARS-500 = 520 days; Salyut-6 first long-duration (1977). Not flagged.

---

## crew-selection.json

### 🟡 NASA 2017 class "0.07% acceptance — lower than Harvard"
- **Field:** `body_paragraphs[1]`
- **Quote:** "NASA's 2017 class accepted 12 from 18,300 applicants (0.07% acceptance — significantly lower than Harvard)."
- **Assessment:** 12/18,300 = 0.0656% ≈ 0.066%, rounds to 0.07% ✓. Applicant count (18,300) and class size (12) are correct for the 2017 selection. The "lower than Harvard" aside is true but editorial. **No correction needed** — flagged only because the rhetorical comparison is the kind of line that ages; leave if house style allows.
- **Source:** NASA 2017 astronaut candidate class announcements (well-attested figures).
- **Confidence:** High.

Height windows (Mercury <5'11"/180 cm; Vostok <170 cm; modern 149–193 cm), Santy's *Choosing the Right Stuff* (1994), Gaganyaan 4 IAF test pilots — all consistent with the record. Not flagged.

---

## crewed-station-design.json
Skylab habitable volume "~360 m³" ✓ (Saturn V S-IVB workshop = 360–361 m³). Soyuz 11 (1971) crew death from IVA-suit-less depress ✓. Mir 1997 handled cautiously (see above). ISS "16 pressurised elements" and "13 years / 30+ flights / 160+ EVAs" are standard. **Clean.**

---

## eclss-life-support.json

### 🟠 Sabatier reactor attributed to ESA — it's a US (Hamilton Sundstrand) unit
- **Field:** `body_paragraphs[2]`
- **Quote:** "The Sabatier reactor (ESA-built, installed on ISS in 2010)"
- **What's wrong:** The Sabatier / Carbon Dioxide Reduction Assembly (CRA) delivered to ISS on STS-131 in **April 2010 was built by Hamilton Sundstrand (US)** with NASA JSC/MSFC/SwRI — **not ESA**. ESA later contributed a *separate* Sabatier-based unit, the Advanced Closed Loop System (ACLS), installed in 2018. The install date (2010) is right; the builder attribution is wrong.
- **Correction:** "The Sabatier reactor (Hamilton Sundstrand, installed on ISS in 2010)" — or, if the intent was the ESA ACLS, change the date to 2018.
- **Source:** https://www.prnewswire.com/news-releases/hamilton-sundstrand-water-production-system-delivered-to-iss-during-sts-131-mission-90939019.html · https://en.wikipedia.org/wiki/ISS_ECLSS
- **Confidence:** High.

### 🟡 Water recovery "about 93%" framed as "current"
- **Field:** `body_paragraphs[3]`
- **Quote:** "Current recovery efficiency is about 93% on the US segment; the goal for Mars-class missions is >98%. ... A dedicated Brine Processor Assembly (added 2021) bumps that toward >98%."
- **What's wrong:** Mostly right but the tense is stale. 93–94% was the pre-BPA figure; with the BPA, NASA **announced 98% water recovery in mid-2023** (not "toward >98%" as an aspiration — it was demonstrated). As written it reads as if 98% is still a goal.
- **Correction:** "US-segment recovery was ~93–94% before the Brine Processor Assembly (added 2021); with the BPA, NASA demonstrated ~98% in 2023."
- **Source:** https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/
- **Confidence:** High.

Other figures OK: O₂ partial pressure ~21 kPa ✓; CO₂ headache threshold ~1 kPa reasonable; OGS ~9 kg O₂/day and 1.5 kg/crew/day plausible; H₂ vented until 2010 then routed to Sabatier ✓; LiOH/CDRA/Vozdukh/amine descriptions correct; ~75 kW waste heat + ammonia external loop + 14 radiators ✓; brine residual ~15–20% water ✓. The "solid-fuel oxygen candles ... used during Mir's 1997 fire-stricken weeks, where they were also the cause of the fire" is correct (Vika/SFOG candle ignition). Not flagged.

---

## eva-operations.json
Prebreathe / Campout at 10.2 psi ✓; airlock leak-check at 5.0 psi ✓; two-tether + SAFER (carried since 1994, used in anger 0×) ✓; STS-49 longest EVA 8h29m (1992) ✓; ~5 kg cooling water + ~1 kg O₂ per 6-h EVA plausible; Apollo dust / burnt-gunpowder smell / 2–3 EVA gasket life ✓; AxEMU rear-entry dust-tolerant design ✓. **Clean.**

---

## eva-physiology.json

### 🔵 EMU pressure "4.3 psi (0.29 atm)" / Orlan "5.7 psi" / NBL "10:1"
- **Field:** `intro_sentence`, `body_paragraphs[0,1,3]`, `diagram_caption`
- **Assessment:** EMU 4.3 psi pure O₂ ✓ (4.3/14.7 = 0.293 atm ✓). Orlan is most often cited at **5.7–5.8 psi (0.4 atm / 40 kPa)** — "5.7" is within the accepted range, fine. Cabin 14.7 psi / ~80% N₂ ✓. Campout+in-suit prebreathe ~4 h ✓. Sublimator dumps ~250 W ✓. NBL "~10 hours training per 1 hour EVA" is at the high end of the cited range (sources give 5:1–10:1, with 7:1 most common) — defensible, not wrong.
- **Correction:** None required. Optional: soften NBL to "roughly 7–10 hours."
- **Source:** https://orbitalradar.com/spacesuits/emu · https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Astronauts/Spacewalk_training
- **Confidence:** High.

---

## eva-suits.json

### 🔵 MMU "11 kg of nitrogen and ~25 m/s"
- **Field:** `body_paragraphs[2]`
- **Quote:** "The earlier **MMU** ... carried 11 kg of nitrogen and ~25 m/s"
- **What's wrong:** Trivial rounding. MMU carried **two tanks × 5.9 kg ≈ 11.8 kg** GN₂; typical Δv ~24.4 m/s (≈25 ✓). "11 kg" is ~7% low; "~25 m/s" is spot-on.
- **Correction:** Optional — "~12 kg of nitrogen and ~25 m/s."
- **Source:** https://en.wikipedia.org/wiki/Manned_Maneuvering_Unit · http://www.astronautix.com/s/shuttlemmu.html
- **Confidence:** High.

Everything else verified: SAFER 1.4 kg GN₂, ~3 m/s, 24 thrusters ✓; PLSS O₂ ~6800 kPa/1000 psi ✓; sublimator ~250 W ✓; gold visor ~98% IR reflectance ✓; McCandless/Stewart untethered STS-41B ✓; MMU grounded post-Challenger ✓; EMU 4.3 / Orlan 5.7 psi entry geometry ✓. Strong overlay.

---

## food-production-off-world.json
Veggie first crop "Outredgeous" red romaine eaten Aug 2015 ✓; APH installed 2017 ✓; Mars insolation ~43% of Earth's ✓ (Mars is ~1.52 AU → ~43% flux); perchlorate 0.5–1% in regolith ✓; CHAPEA-1 = 378 days, completed July 2024, second mission underway ✓; MELiSSA (ESA, since 1989, UAB Barcelona) ✓; Bios-3 (Krasnoyarsk, 1972–84, up to ~5-month closed runs) ✓. **Clean.**

---

## isru-resource-utilization.json
MOXIE: 16 runs 2021–2023, total **122 g** O₂, peak **12 g/hr**, output ≥98% pure ✓ (final run 9.8 g Aug 7 2023 ✓). LCROSS Cabeus impact 2009 ✓; Chandrayaan-1 M3 spectral OH/H₂O 2009 ✓; SOFIA non-polar detection 2020 ✓; Sabatier stoichiometry CO₂ + 4 H₂ → CH₄ + 2 H₂O ✓; lunar regolith ~40–50% bound O by mass ✓; regolith sintering ~1100 °C ✓; PSR temps 30–50 K ✓. **Clean** — the most number-dense overlay and all check out.

---

## iva-suits.json
Soyuz 11 (30 June 1971, valve opened at **168 km**, three cosmonauts asphyxiated, shirtsleeve) ✓; Sokol KV-2 mandatory since 1973 ✓; ACES post-Challenger/Columbia ✓; depress inflation to **~0.4 atm pure O₂** ✓; ~30 min chest-reservoir reserve is the standard cited figure ✓. **Clean.**

---

## long-duration-effects.json

### 🟡 SANS prevalence "roughly 60%"
- **Field:** `body_paragraphs[0]`
- **Quote:** "Roughly 60% of long-duration crew develop **SANS**"
- **What's wrong:** Low side. The most-cited figure (Laurie et al. / NASA) is **~70%** of long-duration crew showing at least one SANS sign; one review found 52/64 (81%) with at least one ocular finding. "Roughly 60%" understates the consensus.
- **Correction:** "Roughly 70% of long-duration crew develop SANS" (or "the majority, ~70%").
- **Source:** https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/ · https://eyewiki.org/Spaceflight-Associated_Neuro-Ocular_Syndrome_(SANS)
- **Confidence:** High that ~70% is the standard figure; 60% is defensible-but-low, hence 🟡 not 🟠.

Other claims OK: Twins Study = Scott Kelly 340 days, slower reaction time / accuracy persisting ~6 mo post-flight ✓; ISS sleep ~6 h vs ~7.5 on ground ✓; 16 sunrises/24 h ✓; latent-virus reactivation (EBV, VZV, CMV) ✓; cardiac atrophy + orthostatic intolerance ✓; ~100 long-duration crew total is a fair order-of-magnitude. Not flagged.

---

## lunar-habitat-design.json

### 🔴 Lunar-surface vs ISS radiation dose — both numbers and the ratio are wrong
- **Field:** `body_paragraphs[3]`
- **Quote:** "galactic cosmic rays + episodic solar particle events deliver about 0.5 mSv/day on the lunar surface, vs ~0.04 mSv on the ISS in Earth's magnetosphere — roughly 10× higher dose."
- **What's wrong:** Three-part error:
  1. **ISS dose "~0.04 mSv/day" is wrong by ~10–15×.** Measured ISS dose-equivalent is **~0.5–0.8 mSv/day** (DOSTEL, Columbus; ~0.5 at solar max, ~0.8 at solar min). ISS crews accumulate ~80–160 mSv over a 6-month stay — impossible at 0.04 mSv/day.
  2. **Lunar surface "~0.5 mSv/day" understates the dose-equivalent.** Chang'e-4 LND measured **~1.37 mSv/day dose-equivalent** on the surface. (~0.5 mSv/day is roughly the *absorbed* dose in silicon, a different quantity — likely the source of the mix-up.)
  3. **"Roughly 10× higher" is wrong.** Lunar surface vs ISS is **~2–2.6×**, not 10×. The 10× only appears because the ISS figure was deflated by an order of magnitude.
- **Correction:** "GCR + SPEs deliver about **1.4 mSv/day** on the lunar surface, vs **~0.5–0.7 mSv/day** on the ISS inside Earth's magnetosphere — roughly **2–2.5× higher**." (Keep the qualitative point that the magnetosphere partially shields ISS.)
- **Source:** https://www.science.org/doi/10.1126/sciadv.aaz1334 (Chang'e-4 LND, first surface measurement, 1.369 mSv/day) · https://www.sciencedirect.com/science/article/pii/S2214552423000299 (ISS DOSTEL 0.5–0.8 mSv/day)
- **Confidence:** High. This is the one hard error in the batch.

Other claims OK: south-pole crater sites (Shackleton, de Gerlache, Haworth, Faustini, Shoemaker) ✓; PSR water-ice + peaks-of-eternal-light >85% illumination ✓; regolith berm ~1–2 m blocks ~80% dose (order-of-magnitude reasonable); lava-tube depths / Marius Hills + Mare Tranquillitatis pits ✓; Apollo dust degrading suits within ~10 EVAs ✓; ILRS 10 kWe fission + coalition members ✓. Only the radiation paragraph is wrong.

---

*Reviewer note:* Batch A is high quality — the ISRU, EVA-suits, IVA, and food-production overlays are number-dense and clean. The one genuine error to fix before publish is the lunar radiation paragraph (🔴). Secondary: correct the Sabatier attribution (🟠) and refresh the water-recovery tense (🟡). The rest are polish.
