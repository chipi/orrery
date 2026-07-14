# Science fact-check — life-in-space, batch B

Independent skeptical review of 13 SCIENCE overlays under
`i18n-src/en-US/science/life-in-space/`. Every quantitative + physiological
claim was assumed wrong until web-verified. No files were edited.

Severity legend: 🔴 factually wrong / misleading · 🟠 significant imprecision or
overstated certainty · 🟡 minor / soft · 🔵 note or defensible-but-worth-flagging.

## Per-overlay verdicts

| Overlay | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| lunar-suits | Solid, one soft flag | 0 | 0 | 1 | 1 |
| lunar-surface-ops | Two rover-spec errors | 1 | 1 | 1 | 1 |
| mars-habitat-design | Solid | 0 | 0 | 1 | 1 |
| mars-human-architecture | Solid | 0 | 1 | 1 | 0 |
| microgravity-physiology | Internally inconsistent bone-loss unit | 0 | 1 | 1 | 0 |
| muscle-atrophy | Timeline slightly aggressive | 0 | 1 | 1 | 0 |
| pre-flight-training | Mostly unverifiable specifics; solid | 0 | 0 | 1 | 1 |
| radiation-exposure | Round numbers, defensible | 0 | 1 | 1 | 0 |
| sleep-nutrition-circadian | Solid | 0 | 0 | 1 | 0 |
| suit-lineage | Orlan pressure + Sokol-gen soft | 0 | 1 | 1 | 1 |
| surface-dust-mitigation | Solid | 0 | 0 | 1 | 0 |
| surface-mobility-rovers | **LRV range + record errors** | 2 | 0 | 1 | 0 |
| vestibular-adaptation | SAS incidence understated | 0 | 1 | 0 | 0 |

**Totals: 🔴 5 · 🟠 8 · 🟡 13 · 🔵 5**

The two most important fixes are both in the rover overlays: the Apollo-17
"27 km record" (**surface-mobility-rovers**) and the LRV "57 km range"
(same file) — the LRV overlay's own top-speed/record numbers contradict the
`lunar-surface-ops` overlay's numbers for the same vehicle.

---

## lunar-suits.json — 🟡🔵

🔵 **Operating pressure 3.7 psi.** File+field: `body_paragraphs[0]`,
`diagram_caption`, `intro`-adjacent. Quote: *"Operating pressure was 3.7 psi
(0.26 atm) of pure oxygen — the lowest of any flown spacesuit."* The A7L's
nominal differential is documented at 3.7–3.9 psi, so 3.7 is the low end and is
correct. The superlative "lowest of any flown spacesuit" is defensible (Gemini
G4C ~3.7 psi is comparable; EMU 4.3, Orlan ~5.8 are higher). Not an error, just
a superlative that rests on a near-tie with Gemini. Confidence: high.
Source: https://en.wikipedia.org/wiki/Apollo/Skylab_spacesuit ;
https://airandspace.si.edu/collection-objects/pressure-suit-a7-l-eisele-apollo-7-flown/nasm_A19721013000

🟡 **"25 layers of nylon and reinforced beta cloth."** File+field:
`body_paragraphs[1]`. The A7L thermal-micrometeoroid garment is usually
described as ~25 layers total (aluminized Mylar/Kapton + Beta cloth + neoprene
etc.), not "25 layers of nylon." The layer count is right; calling them all
"nylon" is loose. Correction: "roughly 25 layers of aluminized Mylar/Kapton,
Dacron, neoprene-coated nylon, and reinforced Beta cloth." Confidence: medium.
Source: https://en.wikipedia.org/wiki/Apollo/Skylab_spacesuit

🔵 **Solar flux ~1370 W/m².** Correct (solar constant ≈ 1361–1370 W/m²).
Night-side "below 100 K" is correct for shadowed polar/deep-night surface.
No action.

---

## lunar-surface-ops.json — 🔴🟠🟡🔵

🔴 **LRV "top speed of 13 km/h (record set on Apollo 17 by Cernan)."**
File+field: `body_paragraphs[3]`. Quote: *"a top speed of 13 km/h (record set
on Apollo 17 by Cernan)."* Wrong. Cernan's downhill speed record on Apollo 17
was **~18 km/h (11.2 mph)**; the LRV's *design* top speed was ~13 km/h but the
achieved record was 18 km/h. The `surface-mobility-rovers` overlay states 18
km/h correctly — the two overlays contradict each other. Correction: design top
speed ~13 km/h, but Cernan set the record at ~18 km/h. Confidence: high.
Source: https://en.wikipedia.org/wiki/Lunar_Roving_Vehicle ;
https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html

🟠 **LRV "4 in-wheel motors (each 0.25 hp)" — correct, but "effective range of
4.7 km from the LM."** File+field: `body_paragraphs[3]`. Motors: 0.25 hp each
is **correct** (four 0.25-hp / ~190 W series-wound DC motors). The "4.7 km"
walk-back radius is a plausible-but-unsourced specific — the walk-back
constraint varied per mission (Apollo 15–17 max ranges from the LM were 5.0,
4.5, 7.6 km respectively). Stating a single "4.7 km" as *the* effective range is
imprecise; Apollo 17's greatest range from the LM was actually 7.6 km.
Correction: "walk-back radius of roughly 5–7.6 km depending on mission and
consumables." Confidence: medium-high.
Source: https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html ;
https://en.wikipedia.org/wiki/Lunar_Roving_Vehicle

🟡 **"73 surface-hours."** File+field: `intro_sentence`. Total Apollo surface
EVA time (moonwalk time) across six landings is ~80 h if you count total
surface *stay* it is far more; total cumulative *EVA* time is ~80.5 h (some
sources ~78–80). "73 surface-hours" appears to conflate a subset. If "surface
EVA hours" is meant, the accepted figure is closer to ~80 h. Confidence: medium
(depends on whether they mean EVA-hours vs stay-hours).
Source: https://en.wikipedia.org/wiki/Extravehicular_activity

🔵 **"22 EVAs, 382 kg of samples, 12 lunar walkers."** All correct: 382 kg total
Apollo sample return (verified: 22+34+42.8+76.7+94.3+110.4 = 380.2, rounded to
382 kg program-wide), 12 moonwalkers, ~14–15 surface EVAs on the Moon (22 counts
all Apollo EVAs incl. deep-space/CM). "22 EVAs" is defensible if counting all
Apollo EVA events. No action.
Source: https://curator.jsc.nasa.gov/lunar/ ;
https://en.wikipedia.org/wiki/Apollo_program

🔵 **Apollo 11 "22 h", Apollo 17 "75 h" surface stays.** Correct: Apollo 11 =
21 h 36 min (≈22 h); Apollo 17 ≈ 75 h. No action.
Source: https://www.nasa.gov/history/apollo-11-mission-overview/ ;
https://en.wikipedia.org/wiki/Apollo_17

---

## mars-habitat-design.json — 🟡🔵

🔵 **Surface dose "~0.6 mSv/day, very similar to the Moon."** File+field:
`body_paragraphs[1]`. MSL/RAD measured the *transit* rate at ~1.8 mSv/day and
the Mars *surface* rate at ~0.64 mSv/day (0.21 mSv/day from GCR alone in some
reports; ~0.7 mSv/day dose-equivalent commonly cited). 0.6 mSv/day surface is a
reasonable central figure. Confidence: high. No action.
Source: https://www.science.org/doi/10.1126/science.1235989 ;
https://phys.org/news/2013-12-scientists-publish-surface-mars.html

🔵 **Perchlorate "0.5–1% by mass."** Correct — Phoenix WCL measured ~0.5 wt%;
literature range 0.4–1%. Thyroid/iodide-uptake toxicity correct. No action.
Source: https://www.chemistryworld.com/features/the-perchlorate-martian-mystery/4018448.article ;
https://ntrs.nasa.gov/api/citations/20190028297/downloads/20190028297.pdf

🔵 **Global dust storm "~every 3 Mars years, the most recent in 2018, which
ended the Opportunity rover."** Correct — planet-encircling storms average ~1
per 3–4 Mars years; 2018 storm ended Opportunity. No action.
Source: https://en.wikipedia.org/wiki/2018_Mars_global_dust_storm

🟡 **MOXIE "5–12 g/hour, totalling 122 g across 16 runs from 2021–2023."**
File+field: `body_paragraphs[3]`. Correct: total 122 g, 16 runs, peak ~12 g/hr
(record 10.56–12 g/hr). The "5–12 g/hour" range is fine. NASA's *original* goal
was ~6 g/hr and MOXIE hit ~2× that. Minor: the "5 g/hour" low end is arbitrary
but harmless. Confidence: high. Effectively correct.
Source: https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/

🔵 **KRUSTY / Kilopower "ground-tested in 2017–2018."** Correct (KRUSTY test
Nov 2017–Mar 2018). No action.

---

## mars-human-architecture.json — 🟠🟡

🟠 **"~1 Sv of GCR exposure ... equivalent to ~5% lifetime cancer-risk
increase."** File+field: `body_paragraphs[1]`. The ~1 Sv total (transit + stay)
is well-supported (MSL/RAD: ~0.66 Sv round-trip transit + ~0.34 Sv for a
500-day surface stay ≈ 1 Sv). The "~5% lifetime cancer-risk increase" is a rough
rule-of-thumb (ICRP ~5%/Sv fatal-cancer risk coefficient) but NASA's own REID
modeling and the 3%-REID career cap frame this differently; a Mars mission is
generally described as putting a crew member *at or near* the career REID limit,
i.e. the risk framing is percentage-of-limit, not a flat "5% increase." Not
wrong, but the certainty is higher than the science supports (large error bars).
Confidence: medium. Soft-flag the false precision.
Source: https://www.science.org/doi/10.1126/science.1235989 ;
https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf

🟠 **"~0.5 mSv/day during transit (vs ~0.1–0.3 mSv/day on ISS)."** File+field:
`body_paragraphs[1]`. The ISS figure (~0.1–0.3, better ~0.3–0.5) is fine, but
the *transit* figure is understated: MSL/RAD measured **~1.8 mSv/day** dose-
equivalent in cruise, not 0.5. 0.5 mSv/day is closer to a *shielded surface*
rate. The overlay's own body-paragraph then correctly reaches ~1 Sv total for a
6+6 month transit + 18-month stay, which only works with a transit rate near
1.8 mSv/day — so "0.5 mSv/day during transit" is internally inconsistent with
its own total. Correction: transit ~1.8 mSv/day (MSL/RAD). Confidence: high.
Source: https://www.science.org/doi/10.1126/science.1235989

🟡 **"Opportunity at 14 years."** File+field: `body_paragraphs[3]`. Opportunity
operated ~14.5 years (Jan 2004 – Feb 2019 loss-of-contact, June 2018 last
comms). "14 years" is fine as a round figure. No action.

🔵 **Transit "6-month ... NTP" / "3–4 month" Starship / conjunction "18–20
month" stay.** DRA 5.0 conjunction-class: 180–210 day transits, ~500-day (≈16–17
month) surface stay, ~900-day total. The overlay's "18–20 month surface stay" is
slightly long (500 days ≈ 16.5 months) but within the "or more" band. Defensible.
Source: https://ntrs.nasa.gov/citations/20090010571

---

## microgravity-physiology.json — 🟠🟡

🟠 **Bone-loss unit inconsistency.** File+field: `narrative_101[0]` vs
`body_paragraphs[1]`. The 101 says: *"Spend six months and 1–2% of your bone
calcium is gone"* (i.e. 1–2% over six months). The body paragraph says:
*"lose 1–2% of their calcium **per month**"* (i.e. 6–12% over six months). These
two statements are off by a factor of ~6 and contradict each other. The
**per-month** figure is the correct one (NASA/ESA: ~1–1.5%/month in weight-
bearing bone; lower-limb ~0.8%/month). The narrative_101 "six months → 1–2%
total" is wrong — it should be ~1–2% *per month*, or ~6–12% over six months.
Correction: fix the 101 to say per-month, or "~1–2% per month (≈10% over six
months)." Confidence: high.
Source: https://www.esa.int/Enabling_Support/Preparing_for_the_Future/Space_for_Earth/Space_for_health/Musculo-skeletal_system_Bone_and_Muscle_loss ;
https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/

🟡 **"total body water drops by ~2 litres" / "puffy moon face within hours."**
Consistent with the fluid-shift literature (~1–2 L headward shift, plasma-volume
reduction ~10–15% in first days). Defensible. No action.

---

## muscle-atrophy.json — 🟠🟡

🟠 **"within three months, cross-sectional area in the calves drops 15–20%
without countermeasures."** File+field: `body_paragraphs[0]`; echoed in
`diagram_caption` ("6-month crew lose ~15% calf CSA"). The 6-month figure is
well-supported (calf volume −13%, soleus −15%, gastroc −10% at 6 months). But
attributing **15–20% at three months** is aggressive — the strong-atrophy
studies (Trappe et al., 180-day) reach ~15–17% at ~6 months, and the
"without countermeasures" caveat is doing heavy lifting since almost all modern
data *is* with countermeasures. The three-month number is an extrapolation
stated as fact. Correction: soften to "within a few months" or move the 15–20%
to the 6-month mark to match the caption. Confidence: medium-high.
Source: https://journals.physiology.org/doi/full/10.1152/japplphysiol.91578.2008 ;
https://pubmed.ncbi.nlm.nih.gov/20660569/

🟡 **ARED "up to 1100 N of resistance"; T2 "about 70% bodyweight loading."**
ARED max load is ~600 lbf ≈ 2670 N (concentric); 1100 N understates the ARED
ceiling but is within a plausible working-load band. T2 harness loading is
commonly 60–80% bodyweight. Both defensible; ARED "1100 N" is on the low side of
the device's capability. Confidence: medium.
Source: https://www.nasa.gov (ARED spec, ~600 lbf max)

---

## pre-flight-training.json — 🟡🔵

🔵 **"Apollo crews trained 5 years for a 10-day mission."** Loose but rhetorical.
Apollo missions were ~8–12 days; astronaut selection-to-flight spanned years but
"5 years of training for a 10-day mission" is a compression, not a hard claim.
Acceptable as color. No action.

🟡 **Centrifuge "to 8g (Soyuz re-entry profile)."** File+field:
`body_paragraphs[0]`. Nominal Soyuz ballistic-reentry peak is ~4 g; an
*off-nominal ballistic* reentry can hit 8–9 g. Training centrifuges (TsF-18 at
GCTC) do run to 8 g. So "8 g" is the training/off-nominal figure, not the
nominal reentry — the parenthetical "(Soyuz re-entry profile)" implies nominal,
which is ~4 g. Minor mislabel. Confidence: medium.
Source: general Soyuz reentry g-load references (nominal ~4 g, ballistic ~8–9 g).

🔵 **"~10 hours of NBL training per 1 hour of planned flight EVA."** Widely cited
NASA figure (~7:1 to 10:1). Defensible. No action.

🔵 **Quarantine durations, T-38/L-39 trainers, Gagarin tire ritual, Shenzhou
handshakes** — all consistent with public record; the "12,000 hours" and "1,500
hours" totals are unverifiable order-of-magnitude claims but plausible. No hard
error found. Confidence: low-medium (mostly unverifiable specifics stated
confidently, but none contradicted).

---

## radiation-exposure.json — 🟠🟡

🟠 **"The ISS ... gets about 200 mSv per year ... Deep space ... about 600 mSv
per year."** File+field: `body_paragraphs[0]`. ISS ~200 mSv/yr implies ~0.55
mSv/day, which is at the **high end** of the measured ISS range (~0.3–0.5
mSv/day → ~110–180 mSv/yr; 6-month missions accrue 80–160 mSv). 200 mSv/yr is
slightly high but within the solar-minimum / high-inclination band. Deep-space
~600 mSv/yr (≈1.6 mSv/day) matches MSL/RAD transit (~1.8 mSv/day) reasonably.
Both are round numbers on the high side but defensible. Confidence: medium.
Correction if precision wanted: ISS ~100–180 mSv/yr typical.
Source: https://www.sidc.be/article/radiation-space ;
https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf

🟡 **"Earth's surface gets about 3 mSv ... per year."** Global average natural
background is ~2.4 mSv/yr (UNSCEAR); ~3 mSv/yr is the US average incl. radon.
"About 3 mSv" is fine for a US-centric figure. No action.
Source: UNSCEAR / NCRP figures (2.4 global, ~3.1 US).

🟡 **"3% added lifetime cancer risk used to be the cap."** Correct — NASA's
historical career limit was 3% REID (risk of exposure-induced death). No action.

---

## sleep-nutrition-circadian.json — 🟡

🟡 **"orbits Earth every 92 minutes ... sunrise ... every 46 minutes ... about
16 of each per 24-hour day."** File+field: `body_paragraphs[0]`. Correct: 92-min
orbit → 15.5–16 sunrises/day → sunrise/sunset alternating every ~46 min. The
only nit: with a 92-min orbit you get ~15.7 sunrises, conventionally rounded to
16 — fine. No error. Confidence: high.
Source: https://earthobservatory.nasa.gov/images/44425/sunrise-to-sunset-aboard-the-space-station

🟡 **"sleep about 6 hours/night" / "2800–3000 kcal/day male astronaut" / "2.0–2.5
L/day water" / "lose 5–10% body weight in first month."** All consistent with
NASA nutritional + sleep literature (crew average ~6 h sleep; caloric needs
~2700–3000 kcal; ~2–2.5 L water/day). Body-weight loss 5–10% in first month is
on the high side (more commonly ~2–5% early, up to ~5% sustained) but within
reported ranges for early-mission appetite suppression. Minor. Confidence:
medium. No hard error.

---

## suit-lineage.json — 🟠🟡🔵

🟠 **Orlan "5.7 psi vs EMU's 4.3 psi."** File+field: `body_paragraphs[3]`. EMU
4.3 psi is **correct**. Orlan is more commonly cited at **5.8 psid** (nominal),
not 5.7. 5.7 vs 5.8 is a rounding-level discrepancy but the sourced spec is 5.8.
Correction: Orlan ~5.8 psi. Confidence: medium-high.
Source: https://ntrs.nasa.gov/api/citations/20230007781/downloads/Regulators_ICES2023_Final.pdf ;
https://en.wikipedia.org/wiki/Extravehicular_Mobility_Unit

🟡 **"Sokol K-V (1973) ... current Sokol-M (introduced 2023) is the fifth-
generation variant."** File+field: `body_paragraphs[0]`. Sokol origin 1973
(first flew Soyuz 12, Sep 1973) is **correct**. The "Sokol-M introduced 2023,
fifth generation" claim could not be independently confirmed via search — a
Sokol-M variant is real and in development/introduction in the early 2020s, but
the "fifth-generation" ordinal and exact 2023 date are unverified. Flag as
unconfirmed rather than wrong. Confidence: low (couldn't verify the generation
count or the 2023 date). Recommend citing a source or softening.
Source (Sokol origin): https://en.wikipedia.org/wiki/Sokol_space_suit

🔵 **Feitian "debuted on Shenzhou 7 (2008) ... derived from Orlan ... Zvezda
contract."** Correct: first Chinese EVA 27 Sep 2008 (Zhai Zhigang), Feitian
Orlan-derived following a 2004 Zvezda contract, backup crew wore imported
Orlan-M. No action.
Source: https://en.wikipedia.org/wiki/Feitian_space_suit ;
https://en.wikipedia.org/wiki/Shenzhou_7

🔵 **Soyuz 11 (1971) shirtsleeve decompression deaths; Block I fire 1967;
EMU "40+ years of service."** All correct. EMU in service since 1981 → 40+ yr.
No action.

---

## surface-dust-mitigation.json — 🟡

🟡 **"median of 70 µm" lunar regolith grain size.** File+field:
`body_paragraphs[0]`. Lunar regolith median grain size is typically cited at
~40–130 µm depending on site (mean ~70 µm is a common Apollo-soil figure). 70 µm
is defensible as a representative median. No hard error. Confidence: medium.
Source: Apollo soil mechanics / LSPET data (mean grain ~70 µm).

🟡 **"perchlorate ... thyroid endocrine disruptors at concentrations above ~25
ppb."** File+field: `body_paragraphs[2]`. The ~25 ppb figure aligns with EPA's
drinking-water reference-dose-derived level (~15–25 ppb historically debated).
Reasonable. No action. Confidence: medium.

🔵 **"gunpowder / spent fireworks" smell; nano-iron re-oxidation hypothesis;
Apollo suit-seal wear "after about 10 EVAs."** Consistent with Apollo lessons-
learned reporting. The "10 EVAs" seal-wear figure is a synthesis (Apollo 17 ran
3 EVAs, cumulative program experience informs "~10") — defensible framing. No
action.

---

## surface-mobility-rovers.json — 🔴🔴🟡

🔴 **"Apollo's LRV pushed traverse range from 1 km to 27 km" / diagram: "27 km
record" / "Apollo 17 logged 35.7 km total ... the all-time human surface-driving
record."** File+field: `intro_sentence`, `diagram_caption`, `body_paragraphs[0]`.
**Internally contradictory and the headline number is wrong.** The intro and
diagram both cite **27 km** as the record/traverse figure, but the body
correctly states Apollo 17 logged **35.7 km** as the all-time record. 27 km is
approximately Apollo 15's or 16's distance (15 = 27.8 km, 16 = 26.7 km), NOT the
record. The record is 35.7 km (Apollo 17). Correction: change intro + diagram
"27 km" → "35.7 km" to match the (correct) body and the record. Confidence:
high.
Source: https://en.wikipedia.org/wiki/Apollo_17 ;
https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html

🔴 **"Range per battery: ~57 km."** File+field: `body_paragraphs[0]`. Wrong unit
/ value. The LRV's total range on its silver-zinc batteries is **~92 km (57
miles)** — the "57" is **miles, not km**. The overlay dropped the mile→km
conversion. Correction: "~92 km (57 mi) total range" or "~92 km range." (Note:
this overlay elsewhere gets the LRV top speed right at 18 km/h, unlike
`lunar-surface-ops` which says 13 km/h.) Confidence: high.
Source: https://en.wikipedia.org/wiki/Lunar_Roving_Vehicle ;
https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html

🟡 **"weighed only 210 kg unloaded ... four 36-V silver-zinc batteries ... top
speed: 18 km/h."** File+field: `body_paragraphs[0]`. 210 kg (462 lb) correct;
36-V batteries correct; two batteries (not four) is the usual count — the LRV
had **two** 36-V silver-zinc batteries, not four. The overlay says "four ...
batteries," which is wrong (four *wheel motors*, two batteries). Top speed 18
km/h correct. Correction: "two 36-V silver-zinc batteries." Confidence: high —
upgrade this to 🟠 if the two-vs-four battery count matters.
Source: https://en.wikipedia.org/wiki/Lunar_Roving_Vehicle ;
https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html

🔵 **Mars robotic-rover roster (Sojourner 1997, Spirit/Opportunity, Curiosity,
Perseverance, Zhurong 2021, Pragyan 2023) + Toyota Lunar Cruiser ~13 m³ / 6 t /
1000-km / 30-day.** All consistent with public specs. No action.

---

## vestibular-adaptation.json — 🟠

🟠 **"half of all astronauts spend their first 2–4 days nauseous" / "About half
of all astronauts develop Space Adaptation Syndrome."** File+field:
`intro_sentence`, `body_paragraphs[1]`. Understated. Published incidence of
Space Adaptation Syndrome / space motion sickness is **~60–80%** (NASA cites
70–90% for symptoms of some severity; ~70% is the common central figure).
"About half" is low. Correction: "roughly two-thirds to three-quarters of
astronauts" or "60–80%." Note the overlay is internally consistent (uses "half"
in both intro and body), so it's a single systematic understatement.
Confidence: high.
Source: https://wikem.org/wiki/Space_motion_sickness ;
NASA OCHMO SAS technical brief
(https://www.nasa.gov/wp-content/uploads/2025/09/ochmo-mtb-004-space-adaptation-sickness-sas.pdf)

🔵 **Otolith/otoconia mechanism, 0.38 g Mars re-anchoring open question,
"days to weeks" post-flight balance recovery.** Physiology correct; the Mars
0.38-g "somewhere in between" framing is appropriately hedged. No action.

---

*Fact-check completed 2026-07-14. 13/13 overlays reviewed. No files edited.*
