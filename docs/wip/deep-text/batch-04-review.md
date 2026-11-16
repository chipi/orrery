# Deep text batch 4: science review

2026-11-12. The science-reviewer agent reviewed `batch-04.md`. Verdict: **FIX THEN SHIP**.

- 2 BLOCKER (ngc-1300, ngc-2392), 11 FIX, 8 OK.
- Data: 9 distance values change, 9 stay.

The reviewer opened about 45 pages: ESA/Webb, ESA/Hubble, ESA, NASA/JPL, NASA nssdc, STScI, EurekAlert, arXiv abstracts (Meaburn, Szyszka, Atkinson, Fabian, Venuti), and Wikipedia as a pointer. It could not read the catalogue file, so every "current" value below is as quoted to it.

**Status:** the text fixes are applied in `batch-04.md`. The data corrections are applied separately, in the catalogue layer, with each bibcode verified there.

## Text fixes

| id | verdict | finding | fix applied |
|---|---|---|---|
| ngc-1300 | BLOCKER | "not active: either no black hole" is wrong. Atkinson et al. 2005 measured 6.6 (+6.3/−3.2) × 10^7 M☉ (astro-ph/0502573). The 45 Mly figure (CF4) is an outlier: ESA/Hubble 60, ESA/Webb and NASA 69, PHANGS 18.99 ± 2.85 Mpc (about 62). The funnelling claim rests on an STScI release the reviewer did not open. | Quiet nucleus with a black hole of about 70 million M☉. 62 Mly, range 60–70. Funnelling attributed to STScI. |
| ngc-1365 | FIX | The observation was in July 2012; the paper appeared in 2013 (ESA). The 2 million M☉ figure comes from Wikipedia only. | Date fixed; mass dropped. |
| ngc-2014-2020 | FIX | LMC eclipsing-binary distance 49.59 kpc ≈ 161,700 ly (Pietrzyński 2019). STScI gives 163,000. | About 160,000. |
| ngc-2174 | OK | | |
| ngc-2264 | OK | Gaia gives 700–740 pc. Age spread per Venuti et al. 2018. | |
| ngc-2392 | BLOCKER | NASA: each *bubble* is about 1 ly long. The comet-shaped objects form a separate ring and are far smaller. "Its first after the servicing mission" is not in the source. The distance spread runs 1.3–2.0 kpc. | Rewritten per the NASA caption; "taken after"; "roughly 6,000". |
| ngc-3132 | FIX | The one-companion / others split is not in the release ("four or even five" objects shaped the ejection). | Companions shaped the ejection. |
| ngc-3324 | FIX | The nickname covers the cluster and the nebula together. | Fixed. |
| ngc-3372 | FIX | Gaia EDR3 gives 2.32–2.37 kpc and the Homunculus expansion parallax 2.35 ± 0.05 kpc, about 7,700 ly (Shull 2021). 8,500 comes from Wikipedia. Wikipedia says the dust "absorbs much of the light". | About 7,700, the same figure as the data. Dust sentence fixed. |
| ngc-4038-4039 | OK | Schweizer 2008: 22 ± 3 Mpc. The 13.3 Mpc TRGB value was retracted. | |
| ngc-5139 | OK | | The caption's 17,000 is fixed at integration. |
| ngc-6302 | FIX | 220,000 K is not in the Szyszka abstract (0.64 M☉, near the WD cooling track, about 200,000 K). Meaburn 2008 expansion parallax gives 1.17 ± 0.14 kpc ≈ 3,800 ly. | Both fixed; range 3,400–4,000. |
| ngc-6543 | FIX | ESA counts eleven or more rings; Balick 2001 counts nine. Gaia-era distance 1.3–1.6 kpc. | "A series of rings (ESA counts eleven or more)", plus the Gaia range. |
| ngc-7293 | OK | | |
| ngc-7635 | FIX | ESA's 10 ly and 10–20 M☉ are 2016 figures at 8,000 ly. Gaia (Green 2019) gives 2.3 ± 0.2 pc ≈ 7.5 ly. BD+60 2522 is O6.5, about 45 M☉. | Gaia figures first, ESA's as older. |
| perseus-cluster | OK (nit) | Fabian et al. was *published* in 2003; the observation is earlier. | "Reported in 2003". |
| rho-ophiuchi | FIX | VLBA gives 137.3 ± 1.2 pc (Ortiz-León 2017) and Zucker 2020 a median of 136 pc, i.e. 444–448 ly. 417 ly matches neither. | About 440. |
| serpens-nebula | FIX | "Expected to grow to the Sun's mass" is not in the ESA text. | Dropped; the age is attributed to ESA. |
| sn-1572 | FIX | At 9,000 ly the explosion happened long before 1572, which is when the light arrived. | "Whose explosion was seen from Earth in 1572". |
| v838-mon | FIX | The geometric distance comes from light-echo polarimetry, 6.1 ± 0.6 kpc (Sparks 2008), not from Bond 2003 (secondary reports only). The light-arrival wording also applies. | Fixed. |
| wr-124 | FIX | ESA's 10 ly assumes its 15,000 ly distance and mixes scales with the 21,000 ly fact line. The masses are ESA's only. The 15,000 ly distance is older. | Size and masses attributed to ESA; 15,000 described as older. |

Not taken verbatim: the 600-character limit forced trims in ngc-1300 ("Atkinson, 2005"), ngc-3372, ngc-6543 and wr-124. All 21 entries are 400–600 characters after the fixes.

## Data corrections (catalogue layer)

| id | current dist_ly | proposed | source | reviewer's confidence |
|---|---|---|---|---|
| ngc-1300 | 45,300,000 (CF4) | 62,000,000 | PHANGS 18.99 ± 2.85 Mpc (Anand 2021, arXiv 2012.00757) | medium |
| ngc-2014-2020 and every LMC-host object | 166,340 (McConnachie 51 kpc) | 161,700 | Pietrzyński 2019, 49.59 kpc, 2019Natur.567..200P | high |
| ngc-3372 / carina-nebula | 8,545 | 7,700 | Shull 2021, 2.32–2.37 kpc (arXiv 2103.07922) | high |
| ngc-6302 | 2,433 | 3,800 | Meaburn 2008, 1.17 ± 0.14 kpc (arXiv 0711.4359) | medium |
| rho-ophiuchi | 417 | 445 | Zucker 2020, 136 pc; Ortiz-León 2017, 137.3 pc (arXiv 1611.06466) | medium-high |
| m17 | 1,975 (wrong H&R match, 606 pc) | 5,500 | Stoop 2024, 1,675 pc (arXiv 2311.04174) | high |
| hen-2-104 | 15,000 | 10,800 | Santander-García 2008, 3.3 ± 0.9 kpc, 2008A&A...485..117S | medium |
| ic-342 | 7,300,000 (CF4) | 11,000,000 | Cepheids 3.3 Mpc (Saha 2002); TRGB 3.45 Mpc | medium |
| ngc-3324 | 7,890 | keep; fix the note (it computes 7,792 from Cantat-Gaudin, a different value) | | |
| ngc-2392 | 5,983 | keep; widen the note to 4,100–6,800 | | |

Kept as they are: ngc-1365, ngc-2264, ngc-6543, ngc-7635, sn-1572, wr-124, ngc-4038-4039, ngc-5139.

Bibcodes the reviewer gave "from memory" must be verified before they enter the catalogue.

## Duplicate entity: ngc-3372 / carina-nebula

The primary id is `ngc-3372` (NGC, Caldwell 92, the OpenNGC key), with `carina-nebula` as an alias. The two texts do not contradict each other. Both said 8,500 ly. The batch-3 fix 16 ("about 7,500") had not been applied to `carina-nebula.json`. Both pages get the corrected distance.

## Captions to fix at integration

- ngc-1300: "200,000-light-year bar" has no source.
- ngc-1365: 56 Mly is old.
- ngc-5139: 17,000 ly.
- sn-1572: 10,000 ly.
- ngc-3324 and ngc-3372: caption distances against the data.

## NOT VERIFIED (by the reviewer)

- The catalogue records for the 21 objects. The reviewer could not read the file.
- Bibcodes marked "from memory".
- The STScI 2005 release on NGC 1300 (funnelling).
- Risaliti 2013: the NGC 1365 black-hole mass and spin.
- The NASA Caldwell 69 page (re-open).
- The Balick 2001 abstract.
- Bond 2003.
- The NGC 3132 Webb release (404).
- Distances: NGC 2174, Serpens, Perseus.
- Wikipedia-only facts: discoverers and dates, the Helix knots, Muñoz and Tycho, Eta Carinae "second-brightest".
- The WR 124 masses, which come from ESA only.
- Whether the `links` hosts exist in `source-logos.json`.
