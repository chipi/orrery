Status: fixes applied in batch-05.md (this commit); data corrections as listed

# Deep text batch 5: science review

Verdict FIX THEN SHIP: 1 BLOCKER (fornax-dwarf), 16 FIX, 12 OK.

(The review text was delivered to the lead by the reviewer; the lead reconstructed it from the complete set of findings. It is saved here as given.)

## Cross-cutting

- G1: no "Wikipedia" in bios; source or cut.
- G2: luminosity rounding, solar M_V 4.81 vs 4.83, And III and Pegasus dIrr borderline, uneven rounding (Sextans 450,000; Aquarius 1.5 million).
- G3: diameters say "extends about".

## Text fixes

- milky-way:
  - M1: R0 superseded (lead decision: keep 2019, attributed).
  - M2: "matching" -> "consistent with" (Antoja 2018, arXiv 1804.10196).
- lmc:
  - L1: fact 165,000 -> 162,000.
  - L2: "orbits the Milky Way" -> "a satellite of the Milky Way".
  - L3: Kallivayalil 2013 conditional: "if the two Clouds have been a bound pair for several billion years, favour a first close approach".
- smc:
  - S1: fact 210,000 -> 204,000.
  - S2: "15 eclipsing binary systems", line-of-sight depth up to about 7 kpc, elongated; the nearest and farthest about 10 kpc apart.
  - S3: Leavitt noted in 1908 that brighter variables had longer periods; the period-luminosity relation is 1912.
- sagittarius-dsph:
  - SG1: "the globular cluster M54 sits at the centre of its nucleus (Bellazzini and colleagues, 2008)".
  - SG2: "is consistent with a passage".
- ursa-minor-dwarf, U1: "A 1999 Hubble study (Mighell and Burke) found its stars to be about as old as the globular cluster M92, most of them formed in a single burst early in the Universe's history."
- draco-dwarf, D1: "a mass-to-light ratio of up to about 440 in solar units has been reported".
- sculptor-dwarf: OK.
- sextans-dwarf:
  - X1: "the eighth dwarf spheroidal galaxy then known around the Milky Way".
  - X2: "in one study most had between about 1/25 and 1/1,600 of the Sun's iron-to-hydrogen ratio, and the few examined for barium were nearly all deficient in it".
- carina-dwarf: cut "13 and" from the burst ages, or cite a primary paper.
- fornax-dwarf, F1 (BLOCKER): the debate sentence is not in the source. Replace it with: six globular clusters, a high number for its size; most old, at least one several billion years younger. Name a source for the cluster ages, or cut. The debate was about Fornax 6's membership (confirmed 2021).
- leo-i:
  - LI1: "Before Hubble measured its motion in 2013 (Sohn and colleagues) it was uncertain whether it is bound to the Milky Way; for most plausible masses of the Milky Way it is."
  - LI2: "one of the most distant of the Milky Way's satellites".
  - LI3: the black-hole text is OK; name Bustamante-Rosell 2021 and Pascale 2024 if room.
- leo-ii, LII1: "A 2007 study of the motions of 171 of its stars with ESO's Very Large Telescope (Koch and colleagues) gives a mass of about 30 million Suns within the region observed, more than ten times what its stars can account for." Cut the Subaru 80,000 stars line.
- ngc-147, N147: "Walter Baade resolved it into individual stars in 1944." Cut or source "no hydrogen observed".
- ngc-185: cut or source "about a billion years ago".
- andromeda-i: cut "which Wikipedia reads as" (RR Lyrae mark an old population).
- andromeda-ii, AII: the Da Costa year is likely 2000 (check). Name the merger study (Amorisco 2014) or cut.
- andromeda-iii: "and no sign of stars younger than a few billion years".
- pegasus-dsph: OK.
- ngc-6822, N6822: "In 1925 Edwin Hubble used the 100-inch telescope at Mount Wilson to find Cepheid variables in it, evidence that it lies far outside the Milky Way."
- ic-1613: NIT, say "toward us along the line of sight".
- ic-10:
  - IC10-a: cut the "only known starburst" claim. Use "Its star formation is unusually vigorous for its size, with a high density of Wolf-Rayet stars."
  - IC10-b: the black hole is OK, "as of 2008".
- wlm: OK.
- leo-a, LA1: "Its heavy-element content is only about 3 to 5 per cent of the Sun's" (van Zee 2006). Check the Cole 2007 "may or may not be common" wording against the abstract.
- phoenix-dwarf: OK.
- sagittarius-dirr, SD1: "McConnachie's catalogue lists it among the galaxies that define the radius of the Local Group."
- aquarius-dwarf: the median age is Wikipedia-only; source or cut.
- tucana-dwarf: the 11-billion-years passage is Wikipedia-only; name the paper or cut the date.
- cetus-dwarf: OK.
- pegasus-dirr, PD1: "McConnachie's catalogue classes it as a Local Group galaxy possibly linked to Andromeda, about 470 kiloparsecs from it." Keep `parent: independent`.

## Data

LMC and SMC in both files. Keep the pegasus-dirr parent, the milky-way diam_kly and the pegasus-dsph distance.

- local-group.json: lmc dist_mly 0.1663 -> 0.1617 (49.59 kpc, Pietrzynski 2019, arXiv 1903.08096); smc 0.2087 -> 0.2037 (62.44 kpc, Graczyk 2020, arXiv 2010.08754).
- milky-way-schematic.json: lmc dist_from_sun_ly 163000 -> 161741; smc 200000 -> 203650.

## NOT VERIFIED (reviewer)

- McConnachie Tables 1 and 3 not re-read; bibcodes not opened.
- Search-snippet-only items: Hubble 1925, Sohn 2013, GRAVITY 2021, van Zee 2006, Koch 2007, Bellazzini 2008, Mighell and Burke 1999.
- Many Wikipedia-only claims.
- Fornax cluster count (6 vs 7).
- LMC first-passage later work.
