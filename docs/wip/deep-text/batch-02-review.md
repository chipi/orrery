# Science review — deep text batch 2 (2026-11-12)

Reviewer: science-reviewer agent. Verdict: **fix then ship** — 6 BLOCKER, 14 MAJOR, ~25 MINOR / NIT.
Gaia-era checks: open clusters against Cantat-Gaudin et al. 2020 (CG20, VizieR J/A+A/640/A1); globular
clusters against Baumgardt's table (all 15 batch values match). Hunt & Reffert 2023 was not reachable.

CG20 values (distance, age): M25 2,280 ly, 112 Myr · M26 6,270 ly, 141 Myr · M29 5,250 ly, 22 Myr ·
M34 1,740 ly, 132 Myr · M36 3,790 ly, 28 Myr · M37 4,670 ly, 447 Myr · M38 3,600 ly, 295 Myr ·
M39 1,010 ly, 398 Myr · M41 2,240 ly, 170 Myr · M47 1,640 ly, 110 Myr · M46 4,930 ly, 302 Myr ·
M48 2,520 ly · M50 3,200 ly, 132 Myr · M52 5,390 ly, 155 Myr · M35 2,950 ly, 148 Myr ·
M44 600 ly, 676 Myr · M67 2,900 ly, 4.3 Gyr.

## Fixes to apply (BLOCKER and MAJOR)

1. **m61** — "Seven supernovae" → "At least eight supernovae have been observed in it since 1926" (Wikipedia M61 lists 1926A … 2020jfo).
2. **m64** — keep 1779 (NASA's "1719" is a typo; note it in the sources). Rotation → "The gas in its outer regions rotates opposite to the gas in its inner regions, which may be the leftover of a merger with a satellite galaxy or of gas falling in from outside." (no stellar counter-rotation).
3. **m78** — distance → "about 1,350 light-years" (Gaia; matches the repo's M42).
4. **m26** — "about 6,000 light-years"; age "roughly 100 to 140 million years" (or drop); size "about 25 light-years" (or drop); "Cuffey showed" → "Cuffey proposed"; "about 25 stars" need a 150–200 mm telescope, not "a small telescope".
5. **m75** — "the most centrally concentrated … in Messier's catalogue" → "one of the most tightly concentrated globular clusters"; binoculars → "its centre is so condensed that M75 is easy to spot in binoculars".
6. **m79** — origin → "Some astronomers think it was acquired from a dwarf galaxy that the Milky Way absorbed; its exact origin is still debated." Drop "one of only two". Fact line: "beyond the Sun, in the direction away from the galactic centre", not "on the far side of the Galaxy".
7. **m34** — "about 1,700 light-years"; age "roughly 130 to 250 million years, depending on the study" (or drop the Pleiades/Hyades comparison).
8. **m49** — drop the 565 million black-hole mass; keep NASA's X-ray wording, or "a supermassive black hole, with published estimates differing widely".
9. **m58** — black hole "estimated at about 70 million solar masses"; distance "roughly 60 to 70 million light-years".
10. **m59 / m60** — black-hole masses "estimated"; m60 "one of the more massive" hedge stays.
11. **m49 / m59 / m60** distances — one consistent Virgo value: "about 55 million light-years" for all three.
12. **m69** — "over ten times more iron" → "unusually rich in iron for a globular cluster, with several times the iron of a typical one"; fact line "iron-rich" not "rich in heavy elements".
13. **m72** — drop "first" (of the five clusters); mass "roughly 80,000 to 170,000" (or Baumgardt's ~80,000 alone, attributed).
14. **m46** — planetary nebula: "NASA says it lies in front of the cluster … radial velocities show it is not a member" (Kiss et al. 2008, https://arxiv.org/abs/0809.0327); drop "2,400 light-years nearer"; cluster "about 5,000 light-years".
15. **m24** — drop "along the Sagittarius spiral arm" → "a window through the Great Rift"; depth "10,000 to 16,000 ly" attributed to NASA.
16. **m43** — "Mairan discovered it in or before 1731" (Messier catalogued it in 1769). No distance in text (fine).
17. **m25** — age "roughly 100 million years"; distance "about 2,300 light-years".
18. **m47** — age "roughly 80 to 110 million years".
19. **m52** — distance "about 5,000 to 5,400 light-years"; variables "candidate slowly pulsating B stars and a delta Scuti variable".
20. **m39** age "roughly 280 to 400 million years"; **m38** age "about 250 to 300 million years"; **m29** age "roughly 13 to 20 million years".

## MINOR / NIT

- m28: attribute "first millisecond pulsar found in a globular cluster" to Wikipedia, not NASA; keep "in the 1980s".
- m30: "about 12 to 13 billion years" (NASA's range is for globulars in general).
- m35: "about 2,800 to 3,000 light-years".
- m41: drop "equilateral" (just "a triangle").
- m54: "the cluster will eventually merge with it" → name it: the nucleus of the Sagittarius dwarf galaxy.
- m60: "paired with the spiral NGC 4647" → "overlaps on the sky with".
- m63: "two main arms" only in near-infrared; visible structure is flocculent; distance "about 27 to 29 million light-years".
- m65: soften "short of dust and gas" → "little recent star formation".
- m66: drop "off-centre core" (unsourced).
- m76: text "Little Dumbbell Nebula" vs data name "Barbell Nebula" — one name per entity; use "Little Dumbbell Nebula" in text and flag the data name.
- m77: source the unified-model sentence to Antonucci & Miller 1985 (ApJ 297, 621).

## Data-file corrections (integration step; not applied)

- `static/data/universe/deep-sky-objects.json` `category`: m24 "star" → "star-cloud" (or "other"); m73 "other" → "asterism" if the enum allows; m78 "nebula" → "reflection-nebula" if allowed.
- `dist_ly` null for the batch: fill globulars from Baumgardt (kpc × 3,262), open clusters from CG20 (above), M43 / M78 ~1,350, M44 ~600.
- m26 `mag` 8.87 vs commonly ~8.0; `mag` mixes bands (batch 1) — keep off pages.
- m29 `size_arcmin` 3.6 looks small (~7′; unchecked).
- m76 `name` "Barbell Nebula" vs the common "Little Dumbbell Nebula".

## Could not verify

Hunt & Reffert 2023; the M49 / M58 / M59 / M60 black-hole papers; Antonucci & Miller 1985 text, Lyne et al.
1987, M75's discovery day, Harris concentration indices (memory); NGC 2438's distance relative to M46; the
2022 M79 origin probabilities (search summary); M66 "off-centre core" and M65 "short of dust and gas"
sources; M76 / M77 Gaia-era distances; M64's original observing logs.
