# Deep text, batch 5 (drafts)

Drafts only. Nothing here is in `i18n-src/` or `static/` yet. 2026-11-13, branch `tech-debt/0.9.9`. Reviewed: see `batch-05-review.md`; its fixes are applied below (each Sources line ends with a **Review fix (b5f)** note).

## Shape and selection

- Same shape as batch 4, but the overlay path is the one the galaxy brief proposes (`docs/wip/2026-11-12-galaxy-pages-brief.md` §3.3): `i18n-src/en-US/universe/galaxies/<id>.json` with `fact` and `bio`, plus one or two `links` (host, label, `t`: intro or core). Counts are `fact` + `bio` characters, spaces included, no joining space (measured with `b5-count.mjs`, a script file: see the table at the end; all 29 are between 400 and 600 unless flagged SHORT).
- Selection: the 29 galaxies of the brief: the Milky Way, the Large and Small Magellanic Clouds and the 26 other dwarfs of `static/data/universe/local-group.json`. Ids are exactly those of that file. M31 (`andromeda`), M33 (`triangulum`), M32 and M110 are not here: they already have deep-sky pages.
- 47 Tucanae and NGC 6752: the brief (decision 3 and the batch table, §3.5) lists them under the deep-sky page set, not under batch 05 (29 galaxies). They are left out of this batch. They need their own deep-sky records plus overlays (or a batch 05b), the lead decides.
- Sources. McConnachie 2012 (AJ 144, 4; arXiv 1204.1562): the PDF was downloaded with WebFetch (the fetch tool could not read it as text), then Table 1 (discovery publications, pp. 89 to 93), Table 2 (distances, pp. 94 to 98) and Table 3 (absolute magnitudes, pp. 101 to 103) were read from the page images. Every distance in the data file matches Table 2 (kpc values checked for all 26 dwarfs, LMC, SMC). Wikipedia articles were fetched and are used as pointers; where a claim rests only on a Wikipedia article it says "Wikipedia" in the Sources line. Papers named in the text were fetched as arXiv abstract pages unless the Sources line says otherwise.
- Luminosity wording. "About N times the Sun's visible-light output" is computed by the writer from McConnachie's absolute magnitude M_V with the Sun at M_V = 4.83 (the solar value is not from a fetched page); the figure is rounded to one significant digit. Review G2: the Sun is 4.83 here; with 4.81 the figures stay the same except And III, which is borderline (839,000 to 855,000) and is written as 850,000, and Aquarius (1.46 to 1.49 million), kept at 1.5 million because one digit would be 1 million. Sextans is now 400,000. McConnachie Table 3 L_V was not read directly.
- Discovery years: McConnachie's Table 1 gives the original publication; where Wikipedia gives an earlier observation date the text gives that and says "published".
- Light-arrival wording: no object here is stated to have changed in a given year; supernova 1987A is "seen" in 1987.

## Galaxies

### milky-way (Milky Way, barred spiral)
Target: `universe/galaxies/milky-way.json`
- fact: The Milky Way is the barred spiral galaxy that contains the Sun, a disk of stars that extends roughly 100,000 light-years.
- bio: Its stars number 100 to 400 billion; its mass is uncertain by over a factor of two. The Sun is about 26,700 light-years from the centre, measured in 2019 by the GRAVITY collaboration from the orbit of the star S2 around the central black hole, Sagittarius A*. Whether it has two or four spiral arms is debated. Gaia data show the disk was disturbed 300 to 900 million years ago, consistent with estimates of the Sagittarius Dwarf's last passage (Antoja and colleagues, 2018).
- links: NASA Imagine the Universe (https://imagine.gsfc.nasa.gov/science/objects/milkyway1.html, intro); arXiv, GRAVITY 2019 (https://arxiv.org/abs/1904.05721, core)
- Sources: NASA Imagine milkyway1 (fetched: large barred spiral, disk about 100,000 ly, Sun about 25,000 ly from the centre, "latest data shows four arms"); Wikipedia Milky Way (fetched as a pointer: 100 to 400 billion stars, mass range 5.8e11 to 1.5e12 solar masses, two stellar arms versus four gas arms debated); arXiv 1904.05721 (fetched: R0 = 8178 pc, about 26,700 ly); arXiv 1804.10196 (fetched: disturbance 300 to 900 Myr ago, "aligns with" the Sagittarius dwarf's previous pericentre). Data conflict: `diam_kly` 105; NASA about 100,000; Wikipedia D25 diameter 87,400 +/- 3,600 ly. The text says "roughly 100,000". `milky-way-schematic.json` has the Sun at 26,700 ly: agrees. **Review fix (b5f):** Review M2: "consistent with". M1: kept 2019 R0 (lead decision). G3: "extends".

### lmc (Large Magellanic Cloud, irregular galaxy)
Target: `universe/galaxies/lmc.json`
- fact: The Large Magellanic Cloud is an irregular galaxy, a satellite of the Milky Way, about 162,000 light-years away.
- bio: A 2019 study of 20 eclipsing binary stars put it at 49.59 kiloparsecs, about 162,000 light-years, to within about one per cent (Pietrzynski and colleagues, Nature). It holds the Tarantula Nebula, and Supernova 1987A was seen there in 1987. Hubble measurements of its motion rule out orbital periods shorter than about 4 billion years; if the two Clouds have been a bound pair for several billion years, the authors favour a first close approach (Kallivayalil and colleagues, 2013).
- links: arXiv, Pietrzynski 2019 (https://arxiv.org/abs/1903.08096, core); Wikipedia (https://en.wikipedia.org/wiki/Large_Magellanic_Cloud, intro)
- Sources: arXiv 1903.08096 (fetched: 49.59 +/- 0.09 +/- 0.54 kpc, 20 eclipsing binaries); arXiv 1301.0832 (fetched: periods of 4 Gyr or less ruled out, first passage favoured); Wikipedia LMC (fetched as a pointer: Tarantula Nebula, SN 1987A). Magnitude M_V = -18.1 (McConnachie Table 3), not used. Data conflict: `local-group.json` 0.1663 Mly (51 kpc, McConnachie); `milky-way-schematic.json` 163,000 ly; Pietrzynski 49.59 kpc = about 161,700 ly. The text gives the data file's 165,000 and the measurement's 162,000 side by side. The earliest-observation claims in Wikipedia (Vespucci 1502) are left out: not checked against a primary source. **Review fix (b5f):** Review L1 (fact 162,000, equal to the bio and to the corrected data), L2, L3 applied.

### smc (Small Magellanic Cloud, dwarf irregular)
Target: `universe/galaxies/smc.json`
- fact: The Small Magellanic Cloud is an irregular dwarf galaxy and a companion of the Large Cloud, about 204,000 light-years away.
- bio: A 2020 study of 15 eclipsing binary systems gave 62.44 kiloparsecs, about 204,000 light-years, and found the galaxy elongated, with a line-of-sight depth of up to about 7 kiloparsecs; its nearest and farthest systems lie about 10 kiloparsecs apart (Graczyk and colleagues). A gas bridge links it to the Large Cloud, a sign they have interacted. In 1908 Henrietta Leavitt noted that brighter variable stars had longer periods; the period-luminosity relation followed in 1912.
- links: arXiv, Graczyk 2020 (https://arxiv.org/abs/2010.08754, core); Wikipedia (https://en.wikipedia.org/wiki/Small_Magellanic_Cloud, intro)
- Sources: arXiv 2010.08754 (fetched: 62.44 +/- 0.47 +/- 0.81 kpc, elongated, depth variation); Wikipedia SMC (fetched as a pointer: gas bridge, Leavitt 1908). The Leavitt paper itself was not fetched. Data conflict: `local-group.json` 0.2087 Mly (64 kpc, McConnachie); `milky-way-schematic.json` 200,000 ly; Graczyk 62.44 kpc = about 203,700 ly. Diameter: `diam_kly` 19 (local-group) and 18.9 (schematic): agree. Text uses 210,000 (data) and 204,000 (measurement). **Review fix (b5f):** Review S1-S3 applied. Abstract re-fetched (arXiv 2010.08754): 10 new plus 5 earlier = 15 systems, 10 kpc nearest-to-farthest, depth 7 kpc.

### sagittarius-dsph (Sagittarius Dwarf, dwarf spheroidal)
Target: `universe/galaxies/sagittarius-dsph.json`
- fact: The Sagittarius Dwarf is a dwarf spheroidal galaxy that the Milky Way is tearing apart, about 85,000 light-years away.
- bio: Rodrigo Ibata, Mike Irwin and Gerry Gilmore reported it in 1994, and it was then the nearest galaxy known to the Milky Way. Its stars form a stream that loops around our galaxy, and the globular cluster M54 sits at the centre of its nucleus (Bellazzini and colleagues, 2008). Gaia data on the Milky Way's disturbed disk are consistent with a passage of this dwarf 300 to 900 million years ago (Antoja and colleagues, 2018), though how long it has orbited remains uncertain.
- links: Wikipedia (https://en.wikipedia.org/wiki/Sagittarius_Dwarf_Spheroidal_Galaxy, intro); arXiv, Antoja 2018 (https://arxiv.org/abs/1804.10196, core)
- Sources: Wikipedia Sagittarius Dwarf Spheroidal (fetched as a pointer: Ibata, Irwin, Gilmore 1994; "nearest known neighbour at the time"; stream; M54 "appears to reside at its core", the article does not say it is the nucleus; uncertainty about orbit); McConnachie Table 1 (Ibata et al. 1994; "tidally disrupting"); arXiv 1804.10196 (fetched). Ibata 1994 itself not fetched (the arXiv id tried returned another paper). Data: 0.0848 Mly (26 kpc) agrees with McConnachie; Wikipedia 80,380 ly. The brief asks the writer to source "M54 is the nucleus": not established, so the text says "appears to lie at its core". **Review fix (b5f):** Review SG1 (M54 at the centre of the nucleus, Bellazzini 2008, search-snippet level, not fetched), SG2.

### ursa-minor-dwarf (Ursa Minor Dwarf, dwarf spheroidal)
Target: `universe/galaxies/ursa-minor-dwarf.json`
- fact: The Ursa Minor Dwarf is a faint dwarf spheroidal galaxy that orbits the Milky Way, about 250,000 light-years away.
- bio: Albert Wilson of Lowell Observatory found it on Palomar Sky Survey plates; McConnachie's catalogue cites his 1955 paper. It extends about 2,000 light-years and gives off roughly 300,000 times the Sun's visible light. A 1999 Hubble study (Mighell and Burke) found its stars to be about as old as the globular cluster M92, most of them formed in a single burst early in the Universe's history.
- links: Wikipedia (https://en.wikipedia.org/wiki/Ursa_Minor_Dwarf, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Ursa Minor Dwarf (fetched as a pointer: Wilson 1955, Palomar Sky Survey; mostly old stars; Mighell and Burke 1999 single burst, "probably as old as the Milky Way"; the 1999 paper was not fetched); McConnachie Table 1 (Wilson 1955), Table 3 (M_V -8.8). Data conflict: data and McConnachie 0.2479 Mly (76 kpc); Wikipedia 200 kly (60 +/- 10 kpc). Text follows the data. **Review fix (b5f):** Review U1 applied; the Mighell and Burke wording is the reviewer's, the paper not fetched here.

### draco-dwarf (Draco Dwarf, dwarf spheroidal)
Target: `universe/galaxies/draco-dwarf.json`
- fact: The Draco Dwarf is a faint dwarf spheroidal galaxy that orbits the Milky Way, about 250,000 light-years away.
- bio: Albert Wilson found it on Palomar Sky Survey plates in the 1950s; McConnachie's catalogue cites his 1955 paper. It extends about 3,000 light-years and shines with roughly 300,000 times the Sun's visible light. Its stars move as though it holds far more mass than its light shows: a mass-to-light ratio of up to about 440 in solar units has been reported. McConnachie's catalogue places it about 76 kiloparsecs, roughly 250,000 light-years, from us.
- links: Wikipedia (https://en.wikipedia.org/wiki/Draco_Dwarf_Galaxy, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Draco Dwarf (fetched as a pointer: Wilson 1954 on POSS plates, 75 to 90 per cent of stars older than 10 Gyr, mass-to-light 440, M_V -8.6); McConnachie Table 1 (Wilson 1955), Table 3 (M_V -8.8). The 440 figure is Wikipedia's only; the underlying paper was not fetched. The article's "most dark matter dominated object known (2007)" is a superlative and is left out; the 2024 Hubble proper-motion remark is left out (not read in a source). Data conflict: 0.2479 Mly (76 kpc) agrees; Wikipedia 260 kly (75.4 kpc) agrees, its "modern estimate" 80 +/- 10 kpc. Discovery year: Wikipedia 1954 (plates), McConnachie 1955 (paper). **Review fix (b5f):** Review D1 applied. G1: the Wikipedia-only star-age sentence (older than 10 Gyr, small burst 2 to 3 Gyr ago) is cut; the 76 kpc sentence is from McConnachie Table 2 and the data file.

### sculptor-dwarf (Sculptor Dwarf, dwarf spheroidal)
Target: `universe/galaxies/sculptor-dwarf.json`
- fact: The Sculptor Dwarf is a dwarf spheroidal galaxy that orbits the Milky Way, about 280,000 light-years away.
- bio: Harlow Shapley found it on plates from Boyden Observatory in South Africa; McConnachie's catalogue cites his 1938 paper and calls it "the prototypical dSph". Its stars fall into two groups: an older, metal-poor population spread widely, and a younger, more metal-rich one more concentrated towards the centre. It gives off roughly 2 million times the Sun's visible light and extends about 3,000 light-years.
- links: Wikipedia (https://en.wikipedia.org/wiki/Sculptor_Dwarf_Galaxy, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Sculptor Dwarf Galaxy (fetched as a pointer: Shapley 1937 on 24-inch Bruce refractor plates, two metallicity groups, older one more extended); McConnachie Table 1 (Shapley 1938, comment "The prototypical dSph"), Table 3 (M_V -11.1). No conflict in distance (86 kpc). Discovery year: Wikipedia 1937, McConnachie 1938 (publication). The Wikipedia claims about AS0039 ("most metal-poor star outside the Milky Way") are left out as a superlative. **Review fix (b5f):** Review OK; G3 "extends".

### sextans-dwarf (Sextans Dwarf, dwarf spheroidal)
Target: `universe/galaxies/sextans-dwarf.json`
- fact: The Sextans Dwarf is a dwarf spheroidal galaxy that orbits the Milky Way, about 280,000 light-years away.
- bio: Mike Irwin, Peter Bunclark, Mick Bridgeland and Richard McMahon found it in 1990; it was then the eighth dwarf spheroidal galaxy known around the Milky Way. It looks large on the sky but is faint, giving off roughly 400,000 times the Sun's visible light. Its stars are old and metal-poor: in one study most had between about 1/25 and 1/1,600 of the Sun's iron-to-hydrogen ratio, and the few examined for barium were nearly all deficient in it.
- links: Wikipedia (https://en.wikipedia.org/wiki/Sextans_Dwarf_Spheroidal, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Sextans Dwarf Spheroidal (fetched as a pointer: Irwin et al. 1990, eighth satellite, [Fe/H] -3.2 to -1.4, barium deficiency "with rare exceptions"); McConnachie Table 1 (Irwin et al. 1990), Table 3 (M_V -9.3, half-light radius 695 pc). "Looks large on the sky": Wikipedia gives 30 x 12 arcminutes, the Moon is 30 arcminutes; the Moon comparison is not in the text. The 1/25 and 1/1,600 are computed from [Fe/H] by the writer (10^-1.4, 10^-3.2). No data conflict (86 kpc). **Review fix (b5f):** Review X1, X2; G2: 450,000 to 400,000 (computed 449,000 / 441,000).

### carina-dwarf (Carina Dwarf, dwarf spheroidal)
Target: `universe/galaxies/carina-dwarf.json`
- fact: The Carina Dwarf is a dwarf spheroidal galaxy that orbits the Milky Way, about 340,000 light-years away.
- bio: Cannon and colleagues found it in 1977 on plates from the UK Schmidt Telescope. It extends about 2,000 light-years and gives off roughly 400,000 times the Sun's visible light. A 2014 analysis of its star formation history found two main episodes, an old one more than 8 billion years ago and an intermediate one between 2 and 8 billion years ago, which produced about 60 per cent of its stars.
- links: Wikipedia (https://en.wikipedia.org/wiki/Carina_Dwarf_Galaxy, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Carina Dwarf Galaxy (fetched as a pointer: Cannon et al. 1977, UK Schmidt; 7 Gyr plus bursts at 13 and 3 Gyr; the claim "being tidally disrupted" is Wikipedia's and McConnachie does not flag it, so it is left out); McConnachie Table 1 (Cannon et al. 1977), Table 3 (M_V -9.1). Data conflict: data 0.3425 Mly (105 kpc) agrees with McConnachie; Wikipedia 330 +/- 30 kly (100 +/- 10 kpc) agrees within error. Wikipedia's diameter 1,600 ly vs `diam_kly` 2: the text says "about 2,000". **Review fix (b5f):** G1: the Wikipedia ages (7 Gyr with bursts at 13 and 3 Gyr) are replaced by arXiv 1409.3229 (abstract fetched via the arXiv API: two episodes, old >8 Gyr and intermediate 2-8 Gyr, 60 +/- 9 per cent in the intermediate one). Authors not named: not confirmed on the page read.

### fornax-dwarf (Fornax Dwarf, dwarf spheroidal)
Target: `universe/galaxies/fornax-dwarf.json`
- fact: The Fornax Dwarf is a dwarf spheroidal galaxy that orbits the Milky Way, about 480,000 light-years away.
- bio: Harlow Shapley found it in 1938 on Boyden Observatory plates, soon after the Sculptor Dwarf. It gives off roughly 20 million times the Sun's visible light and extends about 6,000 light-years. It has five long-known globular clusters, a high number for a galaxy of its size, and a sixth confirmed in 2021. Most are old, but a 2002 spectroscopic study found a tentative age spread, with one cluster 2 to 3 billion years younger than the others.
- links: Wikipedia (https://en.wikipedia.org/wiki/Fornax_Dwarf, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Fornax Dwarf (fetched as a pointer: Shapley 1938, six globular clusters "an unusually high number for its size", young and intermediate-age populations, the debate about late cluster formation; the primary papers were not fetched); McConnachie Table 1 (Shapley 1938b), Table 3 (M_V -13.4). Data conflict: 0.4794 Mly (147 kpc) agrees with McConnachie; Wikipedia 466,000 ly (143 kpc). `diam_kly` 6; Wikipedia 9,295 ly (2.85 kpc): the text uses the data. **Review fix (b5f):** BLOCKER F1: the "debated" sentence is removed. Cluster number: arXiv 2012.08058 abstract (fetched via the arXiv API: five GCs, "an exceptionally large number compared to other galaxies of similar stellar mass"); ages: arXiv astro-ph/0212001 (2002, spectroscopy of the Fornax dwarf clusters: tentative spread, H5 younger by 2-3 Gyr). The sixth cluster confirmed in 2021 is the reviewer's statement, not read here.

### leo-i (Leo I, dwarf spheroidal)
Target: `universe/galaxies/leo-i.json`
- fact: Leo I is a dwarf spheroidal galaxy, about 830,000 light-years away, one of the most distant of the Milky Way's satellites.
- bio: Albert Wilson and Robert Harrington found it in 1950 on Palomar Sky Survey plates. Before Hubble measured its motion in 2013 (Sohn and colleagues) it was uncertain whether it is bound to the Milky Way; for most plausible masses of the Milky Way it is. A 2021 claim of a central black hole of about 3 million solar masses (Bustamante-Rosell and colleagues) was not confirmed by a 2024 study (Pascale and colleagues), which allows at most a few hundred thousand.
- links: Wikipedia (https://en.wikipedia.org/wiki/Leo_I_(dwarf_galaxy), intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Leo I (fetched as a pointer: 1950, Wilson on POSS plates; Regulus Dwarf; star formation 6 to 2 Ga; black-hole claim 2021 and non-confirmation 2024; the two papers were not fetched, which is why the sentence is attributed to "claim" and "study" without authors); McConnachie p. 16 (fetched: "all galaxies within 300 kpc ... likely bound satellites ... with the exception of Leo I, which may be unbound unless its tangential components are significantly overestimated"; satellites found out to about 280 kpc then a gap), Table 1 (Harrington and Wilson 1950). "Near the outer edge" is the writer's reading of the 254 kpc distance against that 280 kpc statement. No data conflict (254 kpc). Wikipedia's "highest dark matter density among classical dwarf spheroidals" is left out (superlative). **Review fix (b5f):** Review LI1, LI2, LI3 applied. The formation-era sentence (6 to 2 Gyr, Wikipedia only) is cut to make room.

### leo-ii (Leo II, dwarf spheroidal)
Target: `universe/galaxies/leo-ii.json`
- fact: Leo II is a dwarf spheroidal satellite of the Milky Way, about 760,000 light-years away.
- bio: Robert Harrington and Albert Wilson found it in 1950 on Palomar Sky Survey plates. It extends about 2,000 light-years and gives off roughly 700,000 times the Sun's visible light. It is made largely of old, metal-poor stars. A 2007 study of the motions of 171 of its stars with ESO's Very Large Telescope (Koch and colleagues) gives a mass of about 30 million Suns within the region observed, more than ten times what its stars can account for.
- links: Wikipedia (https://en.wikipedia.org/wiki/Leo_II_(dwarf_galaxy), intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Leo II (fetched as a pointer: Harrington and Wilson 1950, old metal-poor stars, Subaru 2007 82,252 stars, mass (2.7 +/- 0.5) x 10^7 solar masses from ESO; the survey and ESO papers were not fetched); McConnachie Table 1 (Harrington and Wilson 1950), Table 3 (M_V -9.8). "Many times the mass of its stars" is the writer's inference from 27 million versus the roughly 700,000 solar luminosities and is not stated in the source: the reviewer may prefer to drop it. Data conflict: data 0.7599 Mly (233 kpc, McConnachie); Wikipedia 690,000 ly (210 +/- 20 kpc). **Review fix (b5f):** Review LII1 applied (reviewer's wording; Koch 2007 not fetched here); Subaru line cut.

### ngc-147 (NGC 147, dwarf spheroidal near Andromeda)
Target: `universe/galaxies/ngc-147.json`
- fact: NGC 147 is a dwarf galaxy about 2.2 million light-years away, a satellite of the Andromeda Galaxy and a probable partner of NGC 185.
- bio: John Herschel found it in 1829 and published it in 1833. Walter Baade resolved it into individual stars in 1944. It gives off roughly 60 million times the Sun's visible light. McConnachie's catalogue marks it as a possible binary with NGC 185 and notes a tidal stream, and places it about 676 kiloparsecs from us.
- links: Wikipedia (https://en.wikipedia.org/wiki/NGC_147, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia NGC 147 (fetched as a pointer: Herschel September 1829, Baade 1944, no H I, star formation about 3 Gyr ago, physical pair with NGC 185); McConnachie Table 1 (Herschel 1833; comments "Binary w/ NGC185? Tidal stream"), Table 3 (M_V -14.6). "Probable partner" in the fact line is hedged from McConnachie's question mark and Wikipedia's "forms a physical pair". Data conflict: data 2.2048 Mly (676 kpc, McConnachie); Wikipedia 2.53 +/- 0.11 Mly average (the article lists 2.21 by tip of the red giant branch). **Review fix (b5f):** Review N147 applied; the Wikipedia-only no-hydrogen and 3 Gyr claims are cut; 676 kpc is the data file / McConnachie Table 2.

### ngc-185 (NGC 185, dwarf spheroidal near Andromeda)
Target: `universe/galaxies/ngc-185.json`
- fact: NGC 185 is a dwarf galaxy about 2.0 million light-years away, a satellite of the Andromeda Galaxy.
- bio: William Herschel found it in 1787. Unusually for a galaxy of its type it has young star clusters near its centre, where Walter Baade noticed blue objects in 1951. It gives off roughly 70 million times the Sun's visible light. Some authors have classed its nucleus as a Seyfert type, a status that is disputed. McConnachie's catalogue marks it as a possible binary with NGC 147.
- links: Wikipedia (https://en.wikipedia.org/wiki/NGC_185, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia NGC 185 (fetched as a pointer: W. Herschel 30 November 1787, young clusters, Baade 1951, star formation about 1 Gyr ago at the centre, Seyfert status disputed); McConnachie Table 1 (Herschel 1789 publication; "Binary w/ NGC147?"), Table 3 (M_V -14.8). Data conflict: data 2.0124 Mly (617 kpc, McConnachie); Wikipedia 2.05 Mly agrees. The superlative about "closest Seyfert" is left out. **Review fix (b5f):** Review: "about a billion years ago" cut. "Wikipedia" removed from the Seyfert sentence ("disputed" remains an unsourced-to-paper statement).

### andromeda-i (Andromeda I, dwarf spheroidal)
Target: `universe/galaxies/andromeda-i.json`
- fact: Andromeda I is a dwarf spheroidal galaxy about 2.4 million light-years away, a satellite of the Andromeda Galaxy.
- bio: Sidney van den Bergh found it, with Andromeda II and III, on Palomar Schmidt plates taken around 1970; McConnachie cites his 1972 paper. McConnachie places it about 58 kiloparsecs, roughly 190,000 light-years, from M31. It gives off roughly 4 million times the Sun's visible light. Hubble found its horizontal-branch stars mainly red (1996), and 99 RR Lyrae variables had been counted by 2005; such variables mark an old stellar population.
- links: Wikipedia (https://en.wikipedia.org/wiki/Andromeda_I, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Andromeda I (fetched as a pointer: van den Bergh 1970, Palomar 48-inch, red horizontal branch (1996), 99 RR Lyrae (2005), age about 10 Gyr); McConnachie Table 1 (van den Bergh 1972), Table 2 (D_M31 = 58 kpc), Table 3 (M_V -11.7). Data conflict: data 2.4299 Mly (745 kpc) agrees with McConnachie; Wikipedia 2.40 Mly agrees; Wikipedia's projected distance from M31 of about 40 kpc differs from McConnachie's 58 kpc (projected versus three-dimensional); the text follows McConnachie. Wikipedia's "least luminous galaxy with a globular cluster" (2000) is left out. **Review fix (b5f):** Review AI applied (the "reads as" clause and the 10 Gyr age cut).

### andromeda-ii (Andromeda II, dwarf spheroidal)
Target: `universe/galaxies/andromeda-ii.json`
- fact: Andromeda II is a dwarf spheroidal galaxy about 2.1 million light-years away, a satellite of the Andromeda Galaxy.
- bio: Sidney van den Bergh found it in 1970 or 1971 on Palomar Schmidt plates, along with Andromeda I and III. A 2014 Hubble study of its star formation history found it formed 50 to 70 per cent of its stars between 12.5 and 5 billion years ago and was abruptly quenched about 5 billion years ago. Amorisco and colleagues (2014) read a stellar stream in it as the remnant of a merger of two dwarf galaxies. It gives off roughly 8 million times the Sun's visible light.
- links: Wikipedia (https://en.wikipedia.org/wiki/Andromeda_II, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Andromeda II (fetched as a pointer: van den Bergh 1970-71, Da Costa et al. 1999 ages 6 to 9 Gyr, stellar stream, merger about 5 Gyr ago, "uncertain whether it orbits M31 or M33"); McConnachie Table 1 (van den Bergh 1972; comment "In Pisces"), Table 3 (M_V -12.4). The merger claim is from Wikipedia only and the underlying paper was not fetched; the sentence attributes it to "researchers". Data conflict: data 2.1265 Mly (652 kpc, McConnachie); Wikipedia 2.22 Mly (680 kpc). **Review fix (b5f):** Review AII: the Da Costa year could not be confirmed, so that sentence is replaced by arXiv 1405.4870 (abstract fetched: 50-70 per cent of stellar mass between 12.5 and 5 Gyr ago, abruptly quenched about 5 Gyr ago; authors not named). Merger study named per the reviewer (Amorisco 2014, not fetched).

### andromeda-iii (Andromeda III, dwarf spheroidal)
Target: `universe/galaxies/andromeda-iii.json`
- fact: Andromeda III is a faint dwarf spheroidal galaxy about 2.4 million light-years away, a satellite of the Andromeda Galaxy.
- bio: Sidney van den Bergh found it on Palomar Schmidt plates taken in 1970 and 1971; McConnachie cites his 1972 paper. It lies about 75 kiloparsecs, roughly 245,000 light-years, from M31 and gives off roughly 850,000 times the Sun's visible light. A 2002 Hubble study found most of its stars about 3 billion years younger than typical Milky Way globular clusters, with some as old as them, and no sign of stars younger than a few billion years.
- links: Wikipedia (https://en.wikipedia.org/wiki/Andromeda_III, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Andromeda III (fetched as a pointer: van den Bergh 1970-71, WFPC2 2002 ages, "no evidence for younger stars", 56 variables of which 51 RR Lyrae; the 2002 paper was not fetched); McConnachie Table 1 (van den Bergh 1972), Table 2 (D_M31 = 75 kpc), Table 3 (M_V -10.0). No data conflict (748 kpc; Wikipedia 2.44 Mly).  **Review fix (b5f):** Review AIII applied. G2: 900,000 to 850,000 (computed 855,000 with M_sun 4.83 and 839,000 with 4.81: borderline between 800,000 and 900,000).

### pegasus-dsph (Andromeda VI, also the Pegasus Dwarf Spheroidal)
Target: `universe/galaxies/pegasus-dsph.json`
- fact: The Pegasus Dwarf Spheroidal, also called Andromeda VI, is a dwarf galaxy about 2.6 million light-years away and a satellite of Andromeda.
- bio: It was found in 1999 on Second Palomar Sky Survey films, reported by Karachentsev and Karachentseva and, in the same year, by Armandroff and colleagues. It is faint and of low surface brightness, giving off roughly 3 million times the Sun's visible light, and its stars are mostly metal-poor. McConnachie places it about 269 kiloparsecs, roughly 880,000 light-years, from M31. It is a different galaxy from the Pegasus Dwarf Irregular.
- links: Wikipedia (https://en.wikipedia.org/wiki/Pegasus_Dwarf_Spheroidal_Galaxy, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Pegasus Dwarf Spheroidal Galaxy (fetched as a pointer: other name Andromeda VI, discovered 1999 on POSS II films, mainly metal-poor [Fe/H] about -1.3, low surface brightness); McConnachie Table 1 (Karachentsev and Karachentseva 1999; Armandroff et al. 1999), Table 2 (D_M31 = 269 kpc), Table 3 (M_V -11.3). Data conflict: data 2.5538 Mly (783 kpc, McConnachie, which is also M31's own distance in the data); Wikipedia 2.713 Mly (831.8 kpc), its M_V -11.6 and 281.6 kpc from M31. The id is `pegasus-dsph`; the data name is "Andromeda VI (Pegasus)". **Review fix (b5f):** Review OK; no change.

### ngc-6822 (NGC 6822, Barnard's Galaxy, dwarf irregular)
Target: `universe/galaxies/ngc-6822.json`
- fact: NGC 6822, also called Barnard's Galaxy, is an irregular dwarf galaxy about 1.5 million light-years away.
- bio: Edward Emerson Barnard found it in 1884 with a 6-inch refractor. In 1925 Edwin Hubble used the 100-inch telescope at Mount Wilson to find Cepheid variables in it, evidence that it lies far outside the Milky Way. It has over 150 catalogued glowing nebulae, among them the star-forming region Hubble V. McConnachie places it about 459 kiloparsecs from us.
- links: NASA, Caldwell 57 (https://science.nasa.gov/?p=29831, core); Wikipedia (https://en.wikipedia.org/wiki/NGC_6822, intro)
- Sources: NASA Caldwell 57 page (fetched: discovered 1884 by Barnard; Hubble made the first detailed photographic study in 1925 with the 100-inch; Hubble-V stellar nursery); Wikipedia NGC 6822 (fetched as a pointer: 15 variables, 11 Cepheids; "first system beyond the Magellanic Clouds"; over 150 H II regions; 1.63 Mly); McConnachie Table 3 (M_V -15.2). Data conflict: data 1.4971 Mly (459 kpc, McConnachie); Wikipedia and ESA 1.6 Mly (500 kpc); NASA "2 million light-years". Text says "about 1.5 million". Wikipedia's "closest non-satellite" claim and the virial-radius remark are left out. The link URL is NASA's short link as fetched. **Review fix (b5f):** Review N6822 applied; the "first system beyond the Magellanic Clouds" superlative is cut. 459 kpc is the data file / McConnachie.

### ic-1613 (IC 1613, dwarf irregular)
Target: `universe/galaxies/ic-1613.json`
- fact: IC 1613 is an irregular dwarf galaxy about 2.5 million light-years away, on the outskirts of the Local Group.
- bio: Max Wolf found it in 1906. It is moving toward us along the line of sight at about 230 kilometres a second, and it gives off roughly 100 million times the Sun's visible light. It holds Cepheid and RR Lyrae variable stars, and because it has little dust it has been used to calibrate the Cepheid period-luminosity relation, a step in measuring distances. A 1999 study found its dominant stellar population to be about 7 billion years old.
- links: Wikipedia (https://en.wikipedia.org/wiki/IC_1613, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia IC 1613 (fetched as a pointer: Wolf 1906, Cepheids, RR Lyrae, dust-poor and used for the Cepheid relation, 1999 study age about 7 Gyr; the 1999 paper was not fetched); McConnachie Table 1 (Wolf 1906), Table 2 (heliocentric velocity -233.0 km/s), Table 3 (M_V -15.2). Data conflict: data 2.4625 Mly (755 kpc) agrees with McConnachie; Wikipedia 2.38 Mly (730 kpc). **Review fix (b5f):** Review NIT applied; "Wikipedia says" removed (the calibration and 1999-age claims stay unattributed to a paper; the 1999 paper was not fetched).

### ic-10 (IC 10, dwarf irregular)
Target: `universe/galaxies/ic-10.json`
- fact: IC 10 is an irregular dwarf galaxy in Cassiopeia, about 2.6 million light-years away, with unusually active star formation.
- bio: Lewis Swift found it in 1887. It lies close to the plane of the Milky Way, so dust dims it and its distance was hard to fix: estimates range from 1.5 to 4.5 million light-years. Its star formation is unusually vigorous for its size, with a high density of Wolf-Rayet stars. As of 2008 it holds IC 10 X-1, a black hole of at least 23 solar masses on cautious assumptions, and at least about 33 on the paper's main estimate (Silverman and Filippenko).
- links: Wikipedia (https://en.wikipedia.org/wiki/IC_10, intro); arXiv, Silverman and Filippenko 2008 (https://arxiv.org/abs/0802.2716, core)
- Sources: Wikipedia IC 10 (fetched as a pointer: Swift 8 October 1887; Cassiopeia; near the Milky Way plane; estimates 1.5 to 4.5 Mly; "the only known starburst galaxy in the Local Group"; Mayall 1935 and the 1996 Cepheid distance); arXiv 0802.2716 (fetched: minimum black-hole mass 32.7 +/- 2.6 solar masses, 23.1 +/- 2.1 under conservative assumptions, Wolf-Rayet companion, period about 35 hours). The text now says at least 23 (conservative) and at least about 33 (main estimate). McConnachie Table 1 (Swift 1888 publication). Data: 2.5897 Mly (794 kpc) agrees with McConnachie; X-1 mass is a minimum. **Review fix (b5f):** Review IC10-a, IC10-b applied; the "only known starburst" claim is cut.

### wlm (WLM, Wolf-Lundmark-Melotte, dwarf irregular)
Target: `universe/galaxies/wlm.json`
- fact: WLM, short for Wolf-Lundmark-Melotte, is an irregular dwarf galaxy about 3.0 million light-years away, on the far edge of the Local Group.
- bio: Max Wolf found it in 1909, and Knut Lundmark and Philibert Melotte described it in 1926. It is seen almost edge-on as a rotating disk. It gives off roughly 40 million times the Sun's visible light. McConnachie's catalogue lists it among the galaxies that define the radius of the Local Group, and puts it about 933 kiloparsecs from us.
- links: Wikipedia (https://en.wikipedia.org/wiki/Wolf%E2%80%93Lundmark%E2%80%93Melotte, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Wolf-Lundmark-Melotte (fetched as a pointer: Wolf 1909, Lundmark and Melotte 1926, edge-on rotating disk, asymmetric rotation curve, M_V and star-formation findings); McConnachie Table 1 (Wolf 1910; Melotte 1926 including K. E. Lundmark; comment "Defines R_LG"), Table 3 (M_V -14.2). Left out: Wikipedia's globular cluster WLM-1 age of "about 15 billion years" (exceeds the age of the universe, so left out as unreliable), the 1994 Hubble starburst claim and the 2024 contact-binary result (not read in a source). Data conflict: data 3.043 Mly (933 kpc, McConnachie); Wikipedia 3.226 Mly (989 kpc). Discovery year: Wikipedia 1909, McConnachie 1910 (publication). **Review fix (b5f):** Review OK; G1: the Wikipedia asymmetric-rotation-curve clause is cut. 933 kpc is the data file / McConnachie.

### leo-a (Leo A, dwarf irregular)
Target: `universe/galaxies/leo-a.json`
- fact: Leo A is an isolated dwarf irregular galaxy about 2.6 million light-years away, also called Leo III.
- bio: Fritz Zwicky identified it in 1942. A 2007 Hubble study (Cole and colleagues) found that over 90 per cent of its stars formed in the last 8 billion years, with the peak about 1.5 to 4 billion years ago at 5 to 10 times today's rate. Its heavy-element content is only about 3 to 5 per cent of the Sun's (van Zee, 2006). It gives off roughly 6 million times the Sun's visible light.
- links: Wikipedia (https://en.wikipedia.org/wiki/Leo_A, intro); arXiv, Cole 2007 (https://arxiv.org/abs/astro-ph/0702646, core)
- Sources: arXiv astro-ph/0702646 (fetched: over 90 per cent of star formation more recent than 8 Gyr ago, peak 1.5 to 4 Gyr ago at 5 to 10 times the present rate, authors "cannot exclude" that all ancient star formation preceded the end of reionization); Science News (fetched: Cole, "it could be that the delay turns out to be a common feature"); Wikipedia Leo A (fetched as a pointer: Zwicky 1942, Leo III, metallicity 1 to 2 per cent of solar); McConnachie Table 3 (M_V -12.1). No data conflict (798 kpc; Wikipedia 790 kpc). **Review fix (b5f):** Review LA1. The "may or may not be common" clause is cut: the Cole 2007 abstract (re-fetched) has no such statement; it came from a Science News quote. van Zee: arXiv astro-ph/0509678 abstract gives 12 + log(O/H) = 7.30 to 7.38, i.e. about 4 to 5 per cent of solar for 8.69 and about 3 per cent for 8.83; "3 to 5" is the reviewer's range.

### phoenix-dwarf (Phoenix Dwarf, dwarf irregular)
Target: `universe/galaxies/phoenix-dwarf.json`
- fact: The Phoenix Dwarf is an outlying dwarf galaxy about 1.4 million light-years away, classed between the irregular and spheroidal types.
- bio: Hans-Emil Schuster and Richard West found it in 1976 and at first took it for a globular cluster; a 1977 study identified it as a galaxy. It gives off roughly 800,000 times the Sun's visible light. It has an inner part of young stars stretched east to west and an outer part of mainly old stars stretched north to south. A cloud of neutral hydrogen of about 100,000 solar masses was found just west of it in 1999.
- links: Wikipedia (https://en.wikipedia.org/wiki/Phoenix_Dwarf, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Phoenix Dwarf (fetched as a pointer: Schuster and West 1976, mistaken for a globular cluster, structure, 1999 H I cloud of about 100,000 solar masses); McConnachie Table 1 (Schuster and West 1976, footnote a: "originally thought to be a globular cluster. Canterna and Flower (1977) subsequently identified its galactic nature"), Table 3 (M_V -9.9, type dIrr/dSph). Data conflict: data 1.3535 Mly (415 kpc, McConnachie); Wikipedia 1.44 Mly (440 kpc). McConnachie class L/G (Local Group, possible Milky Way member), hence "outlying" rather than "isolated". **Review fix (b5f):** Review OK; "Wikipedia describes" removed (G1).

### sagittarius-dirr (Sagittarius Dwarf Irregular Galaxy, SagDIG)
Target: `universe/galaxies/sagittarius-dirr.json`
- fact: The Sagittarius Dwarf Irregular Galaxy, or SagDIG, is a dwarf galaxy about 3.5 million light-years away, near the edge of the Local Group.
- bio: It was found on photographic plates of the ESO atlas survey in 1977 and is not related to the Sagittarius Dwarf Spheroidal. McConnachie's catalogue lists it among the galaxies that define the radius of the Local Group. It has had a long period of star formation, and a 2007 study (Gullieuszik and colleagues) put the dominant stars at 4 to 8 billion years old and metal-poor. It gives off roughly 3 million times the Sun's visible light.
- links: Wikipedia (https://en.wikipedia.org/wiki/Sagittarius_Dwarf_Irregular_Galaxy, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Sagittarius Dwarf Irregular Galaxy (fetched as a pointer: 13 June 1977 on ESO 1-m Schmidt plates, "thought to be the member most remote from the barycentre", Gullieuszik et al. 2007: [Fe/H] <= -1.3, age 4 to 8 Gyr; the 2007 paper was not fetched); McConnachie Table 1 (Cesarsky et al. 1977; Longmore et al. 1978; comment "Defines R_LG"), Table 3 (M_V -11.5). The superlative-like "farthest" is attributed to Wikipedia with "thought to be". Data: 3.4801 Mly (1067 kpc) agrees with McConnachie; Wikipedia about 3.4 Mly. **Review fix (b5f):** Review SD1 applied.

### aquarius-dwarf (Aquarius Dwarf, DDO 210, dwarf irregular)
Target: `universe/galaxies/aquarius-dwarf.json`
- fact: The Aquarius Dwarf, also catalogued as DDO 210, is a faint dwarf irregular galaxy about 3.5 million light-years away.
- bio: Sidney van den Bergh catalogued it in 1959 in the David Dunlap Observatory survey, and its Local Group membership was established in 1999 from the brightness of its red giant stars. It gives off roughly 1.5 million times the Sun's visible light, yet holds neutral hydrogen and forms stars at a very low rate. RR Lyrae variables show it has stars older than 10 billion years.
- links: Wikipedia (https://en.wikipedia.org/wiki/Aquarius_Dwarf, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Aquarius Dwarf (fetched as a pointer: DDO survey 1959, membership 1999 by tip of the red giant branch, neutral hydrogen with low-level star formation, RR Lyrae older than 10 Gyr, median age 6.8 Gyr); McConnachie Table 1 (van den Bergh 1959; "DDO 210"), Table 3 (M_V -10.6). Data conflict: data 3.4964 Mly (1072 kpc, McConnachie); Wikipedia 3.2 +/- 0.2 Mly (980 +/- 50 kpc). Left out: Wikipedia's "one of the least luminous Local Group galaxies with ongoing star formation" (superlative-like). **Review fix (b5f):** Median age cut (Wikipedia only). G2: 1.5 million kept (computed 1.49 / 1.46 million); one-digit rounding would give 1 million, a 30 per cent understatement.

### tucana-dwarf (Tucana Dwarf, dwarf spheroidal)
Target: `universe/galaxies/tucana-dwarf.json`
- fact: The Tucana Dwarf is an isolated dwarf spheroidal galaxy about 2.9 million light-years away, far from both the Milky Way and Andromeda.
- bio: Russell Lavery reported it in 1990, and a 1992 paper with Kenneth Mighell announced it as a new member. Its stars are all old, from a single era of star formation around the time the Milky Way's globular clusters formed, and it has no current star formation. It gives off roughly 500,000 times the Sun's visible light. McConnachie's catalogue notes that its velocity suggests it is not associated with a nearby hydrogen cloud.
- links: Wikipedia (https://en.wikipedia.org/wiki/Tucana_Dwarf, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Tucana Dwarf (fetched as a pointer: Lavery and Mighell 1992, discovery in 1990, old stars from one era, no current star formation, backsplash possibility; the backsplash paper was not fetched); McConnachie Table 1 (Lavery 1990; comment "Isolated dSph"), Table 2 footnote q ("Optical velocity suggests that Tucana is not associated with nearby HI cloud"), Table 3 (M_V -9.5). Data: 2.893 Mly (887 kpc) agrees with McConnachie. Wikipedia's "2,800 light-years" for 870 kpc is a typo in the article and is ignored. **Review fix (b5f):** The backsplash / 11 Gyr sentence is cut (paper not found). Last sentence from McConnachie Table 2 footnote q.

### cetus-dwarf (Cetus Dwarf, dwarf spheroidal)
Target: `universe/galaxies/cetus-dwarf.json`
- fact: The Cetus Dwarf is an isolated dwarf spheroidal galaxy about 2.5 million light-years away.
- bio: Alan Whiting, George Hau and Mike Irwin announced it in 1999 in a paper titled "A New Local Group Galaxy in Cetus". It gives off roughly 3 million times the Sun's visible light and extends about 4,000 light-years. Its brightest stars are red giants, and as of 2000 no neutral hydrogen gas had been found with it. McConnachie's catalogue calls it an isolated dwarf spheroidal.
- links: Wikipedia (https://en.wikipedia.org/wiki/Cetus_Dwarf, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Cetus Dwarf (fetched as a pointer: Whiting, Hau and Irwin 1999, "A New Local Group Galaxy in Cetus", red giants, no H I as of 2000); McConnachie Table 1 (Whiting et al. 1999; "Isolated dSph"), Table 3 (M_V -11.2). No data conflict (755 kpc). Little in the sources read; no star-formation history found, so the text rests on discovery, magnitude and one Wikipedia remark. **Review fix (b5f):** Review OK; "Per Wikipedia" removed (G1).

### pegasus-dirr (Pegasus Dwarf Irregular, DDO 216)
Target: `universe/galaxies/pegasus-dirr.json`
- fact: The Pegasus Dwarf Irregular, also called DDO 216, is a dwarf galaxy about 3.0 million light-years away, between the irregular and spheroidal types.
- bio: A. G. Wilson identified it in the 1950s, and McConnachie cites Holmberg (1958). It gives off roughly 6 million times the Sun's visible light. McConnachie's catalogue classes it as a Local Group galaxy possibly linked to Andromeda, about 470 kiloparsecs from it. A 2005 study (McConnachie and colleagues) improved its distance from the brightness of its red giants to within about 3 per cent.
- links: Wikipedia (https://en.wikipedia.org/wiki/Pegasus_Dwarf_Irregular_Galaxy, intro); arXiv, McConnachie 2012 (https://arxiv.org/pdf/1204.1562, core)
- Sources: Wikipedia Pegasus Dwarf Irregular Galaxy (fetched as a pointer: Wilson 1950s, Tully and Fisher 1975, dIrr/dSph transitional, McConnachie 2005 tip of the red giant branch, distance within 10 per cent by 2000 and 3 per cent by 2005, "companion of Andromeda"; the 2005 paper was not fetched); McConnachie Table 1 ("A. G. Wilson. Reported in Holmberg (1958)"; class L/A, dIrr/dSph), Table 3 (M_V -12.2). Data: 3.0006 Mly (920 kpc) agrees with McConnachie; `parent` is "independent", Wikipedia says an M31 companion, McConnachie L/A: a data/text mismatch the lead should look at. Not the same object as `pegasus-dsph` (Andromeda VI). **Review fix (b5f):** Review PD1 applied; `parent: independent` kept.

## Names (for the glossary agent; not added to native-terms.json)

Catalogue codes that stay as written in all locales: NGC 147, NGC 185, NGC 6822, IC 10, IC 1613, WLM, DDO 210, DDO 216, Leo A, Leo I, Leo II, Leo III, Andromeda I, II, III, VI, SagDIG, M54, Sagittarius A*, Supernova 1987A, SN 1987A.

Common names (English form in the data; each needs a form per locale): Milky Way, Large Magellanic Cloud, Small Magellanic Cloud, Sagittarius Dwarf (Spheroidal), Ursa Minor Dwarf, Draco Dwarf, Sculptor Dwarf, Sextans Dwarf, Carina Dwarf, Fornax Dwarf, Phoenix Dwarf, Aquarius Dwarf, Tucana Dwarf, Cetus Dwarf, Pegasus Dwarf Irregular, Pegasus Dwarf Spheroidal, Sagittarius Dwarf Irregular Galaxy, Barnard's Galaxy, Wolf-Lundmark-Melotte, Regulus Dwarf, Tarantula Nebula, Hubble V.

Terms used in the text that are not in the data and may need a glossary entry: dwarf spheroidal galaxy, dwarf irregular galaxy, irregular galaxy, barred spiral galaxy, satellite galaxy, eclipsing binary, Cepheid variable, RR Lyrae variable, horizontal branch, red giant (branch), tip of the red giant branch, Wolf-Rayet star, starburst galaxy, metal-poor (metallicity), globular cluster, mass-to-light ratio, dark matter, tidal stream, Seyfert, Local Group, backsplash galaxy, proper motion, H II region, neutral hydrogen, absolute magnitude, surface brightness, light-year, kiloparsec, Gaia, GRAVITY.

## Data conflicts

| id | data file | other source | note |
|---|---|---|---|
| milky-way | `diam_kly` 105 | NASA about 100,000 ly; Wikipedia D25 87,400 +/- 3,600 ly | text says "roughly 100,000" |
| lmc | local-group 0.1617 Mly (49.59 kpc); schematic 161,741 ly (both corrected after review) | Pietrzynski 2019 49.59 kpc | resolved: fact and bio say 162,000 |
| smc | local-group 0.2037 Mly (62.44 kpc); schematic 203,650 ly (both corrected after review) | Graczyk 2020 62.44 kpc | resolved: fact and bio say 204,000 |
| sagittarius-dsph | 0.0848 Mly (26 kpc) | Wikipedia 80,380 ly | agrees with McConnachie |
| ursa-minor-dwarf | 0.2479 Mly (76 kpc) | Wikipedia 60 +/- 10 kpc | text follows data |
| leo-ii | 0.7599 Mly (233 kpc) | Wikipedia 210 +/- 20 kpc | text follows data |
| carina-dwarf | 0.3425 Mly (105 kpc) | Wikipedia 100 +/- 10 kpc; diameter 1,600 ly vs `diam_kly` 2 | within error |
| fornax-dwarf | 0.4794 Mly; `diam_kly` 6 | Wikipedia 143 kpc; 9,295 ly | text follows data |
| ngc-147 | 2.2048 Mly (676 kpc) | Wikipedia 2.53 Mly average | text follows data |
| andromeda-i | 2.4299 Mly | Wikipedia 40 kpc projected distance from M31 vs McConnachie 58 kpc | text uses McConnachie 58 |
| andromeda-ii | 2.1265 Mly (652 kpc) | Wikipedia 2.22 Mly (680 kpc) | text follows data |
| pegasus-dsph | 2.5538 Mly (783 kpc, same as M31) | Wikipedia 2.713 Mly (831.8 kpc), M_V -11.6, 281.6 kpc from M31 | text follows data and McConnachie |
| ngc-6822 | 1.4971 Mly (459 kpc) | Wikipedia and ESA 1.6 Mly; NASA 2 Mly | text says "about 1.5 million" |
| ic-1613 | 2.4625 Mly | Wikipedia 2.38 Mly | small |
| ic-10 | 2.5897 Mly (794 kpc) | Wikipedia 1.5 to 4.5 Mly range | the text states the range |
| wlm | 3.043 Mly (933 kpc) | Wikipedia 3.226 Mly (989 kpc) | text follows data |
| phoenix-dwarf | 1.3535 Mly (415 kpc) | Wikipedia 1.44 Mly (440 kpc) | text follows data |
| aquarius-dwarf | 3.4964 Mly (1072 kpc) | Wikipedia 3.2 Mly (980 kpc) | text follows data |
| pegasus-dirr | `parent`: independent | Wikipedia "companion of Andromeda"; McConnachie class L/A | data/text mismatch |
| (all dwarfs) | Table 2 kpc values | match the data file for all 26 dwarfs, LMC, SMC | only the schematic's LMC and SMC values differ |

## Characters

Counted by `b5f-count` (the `b5-count.mjs` logic, scratchpad) after the review fixes: `fact` + `bio`, spaces included.

| id | chars | note |
|---|---|---|
| milky-way | 597 | |
| lmc | 593 | |
| smc | 597 | |
| sagittarius-dsph | 591 | |
| ursa-minor-dwarf | 505 | |
| draco-dwarf | 557 | |
| sculptor-dwarf | 513 | |
| sextans-dwarf | 548 | |
| carina-dwarf | 497 | |
| fornax-dwarf | 546 | |
| leo-i | 582 | |
| leo-ii | 531 | |
| ngc-147 | 445 | |
| ngc-185 | 475 | |
| andromeda-i | 553 | |
| andromeda-ii | 576 | |
| andromeda-iii | 560 | |
| pegasus-dsph | 573 | |
| ngc-6822 | 457 | |
| ic-1613 | 546 | |
| ic-10 | 572 | |
| wlm | 473 | |
| leo-a | 480 | |
| phoenix-dwarf | 546 | |
| sagittarius-dirr | 575 | |
| aquarius-dwarf | 491 | |
| tucana-dwarf | 560 | |
| cetus-dwarf | 465 | |
| pegasus-dirr | 538 | |

All 29 are between 400 and 600 after the fixes; none is SHORT. The three thinnest on sourcing (not on length) are wlm, cetus-dwarf and sextans-dwarf: their length comes from the discovery line, the magnitude-derived luminosity and one or two Wikipedia remarks.

## Not verified

- Not read as text: McConnachie 2012 is a 100-page PDF. Tables 1, 2 and 3 were read from page images (pp. 89 to 103); the body text was read only on pp. 14 to 17 and 76 to 87 (the text and figures around satellite membership). No dwarf's own section of the paper was read.
- Wikipedia carries the history, star-formation and dark-matter claims for most dwarfs. The papers it cites (Mighell and Burke 1999, Da Costa 1999, the 2002 Andromeda III Hubble study, Gullieuszik 2007, Cole 2014, the 2021 and 2024 Leo I black-hole papers, the Tucana backsplash paper, Dolphin, Martinez-Delgado 1999) were NOT fetched. Every such sentence says "Wikipedia" or "is reported". The reviewer should check them or cut them.
- Not fetched: Ibata et al. 1994 (Sagittarius), Leavitt 1908, Hubble 1925 (only NASA and Wikipedia accounts), the Fornax and Sculptor primary papers, the GRAVITY S2 paper beyond its abstract page, Gaia-Enceladus (not used).
- The discovery years differ between Wikipedia (observation) and McConnachie (publication) for Draco, Sculptor, NGC 147, NGC 185, IC 10, WLM, Tucana, And I to III; the text uses wording that gives both where it matters.
- The solar absolute magnitude 4.83 behind every "times the Sun's visible light" figure is from memory, not from a fetched page; the conversions are the writer's. The Sextans iron ratios (1/25, 1/1,600) are computed from [Fe/H].
- "Wikipedia calls it the only known starburst galaxy in the Local Group" (IC 10) and "first system beyond the Magellanic Clouds" (NGC 6822) are superlatives attributed to Wikipedia. Delete them if the reviewer finds no current paper that says it.
- Link URLs: every link is a page that was fetched, except the NGC 6822 link, which is NASA's short URL as fetched. Hosts (wikipedia.org, arxiv.org, nasa.gov) are not checked against `static/data/source-logos.json`.
- The Milky Way fact line says "roughly 100,000 light-years" while `diam_kly` is 105 and Wikipedia's D25 is 87,400: a definitional spread, flagged above.
- Brief items not checked: 47 Tucanae and NGC 6752 (left out, see Shape and selection); the LMC's link to 30 Doradus and the SMC's links to NGC 346 and NGC 602 are not in the text (Related list is built from data).
- Not run: any validate-data gate (no overlay exists yet).

## Tool use

Writer: WebSearch 6, WebFetch 44 (see above). Review-fix pass: WebSearch 0; WebFetch 8 (Cole 2007 abstract, Graczyk 2020 abstract, and arXiv API queries for Carina, Leo A van Zee, Fornax clusters, Andromeda II, plus two that returned nothing useful).

## Not verified after the review fixes

- Review texts taken from the reviewer without opening the paper: Bellazzini 2008, Mighell and Burke 1999, Sohn 2013, Bustamante-Rosell 2021, Pascale 2024, Koch 2007, Amorisco 2014, the sixth Fornax cluster (2021), Leavitt 1908/1912, the 2002 Andromeda III study.
- Authors of the Carina 2014 (arXiv 1409.3229), Andromeda II 2014 (arXiv 1405.4870) and Fornax 2002 (arXiv astro-ph/0212001) studies are not named because they were not read on the pages fetched.
- Wikipedia-derived sentences that remain without the word "Wikipedia" and without a paper: Sagittarius stream, Leo I formation era (cut), Phoenix structure and H I cloud, WLM edge-on disk, IC 1613 calibration and 1999 age, NGC 6822 150 nebulae, Aquarius RR Lyrae and H I, Tucana single old era, Cetus red giants, NGC 185 Seyfert dispute, Leo II old stars.
- The Wikipedia links (intro) remain in the link lists; hosts not checked against source-logos.json.
- Leo A: the van Zee 3 to 5 per cent range was checked only against the abstract's oxygen abundance (7.30 to 7.38), which gives about 4 to 5 per cent for a solar 8.69.
