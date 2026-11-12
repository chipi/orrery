# Science review — deep text batch 3 (2026-11-12)

Reviewer: science-reviewer agent. Verdict: **fix then ship** — 2 BLOCKER, 19 MAJOR, ~13 MINOR / NIT.
41 of 50 objects checked against NASA, Wikipedia (as pointer to papers) and arXiv abstracts.

## Fixes to apply (exact wording)

1. **m84** (B) — "Bower and colleagues put it near 1.5 billion solar masses in 1998." → "which points to a black hole; estimates of its mass range from about 0.9 to 1.5 billion Suns." (Walsh et al. 2010, https://arxiv.org/pdf/1008.0005; Maciejewski & Binney 2001.)
2. **ic-342** (B) → "It is one of the brightest members of the IC 342 / Maffei Group, one of the nearest galaxy groups, and in 2020 the dwarf galaxy KKH 32 was identified as its first known dwarf spheroidal satellite."
3. **m1** — "about six light-years across" → "about 11 light-years across" (Wikipedia Crab Nebula, 3.4 pc).
4. **m104** — the 800 billion sentence → "NASA gives the whole galaxy a mass of about 800 billion Suns."
5. **m99** — merger clause → "it is classed as a luminous red nova, a kind of eruption whose origin is debated; a stellar merger is a leading explanation." Arms sentence → "NASA calls it a grand-design spiral, though its arms are lopsided: one is more extended and less tightly wound."
6. **m100** — "M100 put the Virgo Cluster on the cosmic distance ladder" → "and the result gave a distance of about 55 million light-years to a galaxy in the Virgo Cluster". Fact line → "…whose Cepheid stars gave Hubble a distance to the Virgo Cluster."
7. **m94** → "A 2008 study argued that M94 has little or no dark matter, a result that remains debated."
8. **m108** — black-hole sentence → "A supermassive black hole is thought to sit at its centre, and Chandra found 83 X-ray sources, one of them suspected to be an intermediate-mass black hole feeding on gas." Gingerich → "Owen Gingerich added it to the list in the 20th century." "found it in 1781" → "found it in 1781 or 1782".
9. **m109** — "added to the Messier list in 1953" → "added to the Messier list only in the 20th century". Fact line distance → "roughly 60 to 80 million light-years away".
10. **m91** → "listed it in 1781, one of nine objects (M84 to M92) from one night, but gave its position relative to the wrong object".
11. **Virgo distances** — fact lines of m85, m86, m88, m89, m90, m91 → "about 55 million light-years away". Leave m84, m87, m99, m100. m98: keep 44 million and attribute to NASA.
12. **m96** → "NASA says the pull of its neighbours in the group is thought to have shaped it." Fact line → "one of the brightest members of the M96 Group".
13. **hen-2-104** → "Its central pair is not one dying star but a symbiotic system: a red giant and a white dwarf orbiting each other, whose gas is thought to be shed by the red giant and shaped by the white dwarf."
14. **ngc-602** → "A 2024 study reported candidate brown dwarfs there."
15. **gum-29** → "Published distances run from roughly 9,000 to 26,000 light-years; NASA uses about 20,000, while a spectroscopic and Hubble study found about 13,500."
16. **carina-nebula** — fact line → "about 7,500 light-years away". Eta Carinae → "Its most famous star, Eta Carinae, is a pair of massive stars; the larger is about 100 times the Sun's mass and about five million times its luminosity."
17. **cygnus-loop** → "A recent Gaia-based study puts its age at about 20,000 years."
18. **eso-350-40** — "some 190,000 light-years across" → "roughly 150,000 light-years across".
19. **m101** → "NASA gives its bright disc as about 170,000 light-years across, wider than the Milky Way's." (drop the trillion stars)
20. **m42** — fact line → "The Orion Nebula, the nearest region of massive-star formation, about 1,350 light-years away."
21. **m107** — "William Herschel independently in 1793" → "and William Herschel independently found it later".

## MINOR / NIT

- m57: "Antoine Darquier de Pellepoix and Charles Messier found it independently in 1779."
- m74: drop "despite its size".
- m82: "NASA expects the burst to fade, probably within a few tens of millions of years."
- m86: mention that part of the blueshift is the Milky Way's own motion toward Virgo.
- m88: "will make its closest approach to M87 in about 200 to 300 million years".
- m93: drop "from southern and tropical latitudes"; age "roughly 400 to 600 million years" stays.
- m87: "an estimated 12,000 globular clusters".
- m51: "the first nebula seen to have a spiral form".
- 30-doradus: "the closest seen since Kepler's supernova of 1604".
- m16: "about 5,600 to 5,700 light-years".

## Existing captions to fix at integration (`i18n-src/en-US/deep-sky.json`)

- `hst-veil`: "after 10,000 years" → "about 20,000 years" (Fesen et al. 2021).
- `jwst-casa`: "the youngest known supernova remnant in the galaxy" → "one of the youngest known supernova remnants in the galaxy" (G1.9+0.3 is younger).
- `hst-whirlpool`: 31 Mly vs the TRGB 28 Mly — align with the data file.
- `jwst-rho-ophiuchi` vs M42: "closest star-forming region" (Rho Oph) and "nearest region of massive-star formation" (M42) are both kept, so they no longer conflict.

## Data-file corrections (integration / #658)

`dist_ly`: m51 28,000,000 (McQuinn 2016); m104 31,000,000 (McQuinn 2016); m74 32,000,000 (McQuinn 2017);
m8 4,300 (Damiani 2019); m16 5,700 (Kuhn 2019); m57 2,570 (Gaia DR3); carina-nebula 7,500; gum-29 keep
20,000 with a note; m84 55,000,000 (Tully 2016); m87 53,500,000 (EHT); m109 70,000,000 (uncertain);
m97 null; m92 27,700 and m107 18,400 (Baumgardt). `category`: gum-29 "star-cluster"; m93 / m103
"open-cluster" if allowed.

## Could not verify

CG20 for M93 / M103 (VizieR 404); Hunt & Reffert 2023; Virgo Gaia-era distances; NASA pages for M83,
M85, M86, M89, M90, M95, M98; Satyapal 2008 (M108), Devereux 2003 (M81), the M105 black-hole paper,
Ivanova 2013, Fesen 2021 (via Wikipedia); M97 Gaia distance; the Cartwheel diameter; Wikipedia-only
counts (NGC 346, NGC 604, M93 variables, M89 rings, R136 mass); Gingerich's year; M91 vs M92 order.
