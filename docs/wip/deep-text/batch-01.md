# Deep text, batch 1 (drafts)

Drafts only. Nothing here is in `i18n-src/` or `static/` yet. 2026-11-12, branch `tech-debt/0.9.9`.

## Proposed shape

- Deep-sky objects: new overlay `i18n-src/en-US/universe/deep-sky/<id>.json` with `fact` (one line) and `bio` (the rest), the field names the star overlays use. The existing `i18n-src/<locale>/deep-sky.json` is keyed by gallery `photoKey` and only covers the 44 photographed objects, so it cannot hold these 20.
- Black holes: new overlay `i18n-src/en-US/universe/black-holes/<id>.json` with `fact` and `bio`.
- Selection of the 20: the brief models deep-sky pages at 92-239 en-US characters, so all 141 are under the floor. I took the first 20 in `static/data/universe/deep-sky-objects.json` order that have **no** overlay prose at all (`photoKey: null`): m2, m3, m4, m5, m6, m7, m9, m10, m11, m12, m13, m14, m15, m17, m18, m19, m20, m21, m22, m23. The 44 photographed objects (30-doradus, barnard-33, carina-nebula, cas-a, ...) already have a caption, type and distance and were skipped.
- Counts are `fact` + `bio` characters, whitespace included.
- Numbers are written as the site writes them: "light-years", comma thousands separators.
- Source tag S-NASA-Mn = https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-n/ (fetched). Messier 6, 18, 21, 23 have no NASA page (404); those use the Wikipedia article only as a pointer to the cited papers, and are marked WEAK.

## Deep-sky objects

### m2 (globular cluster, Aquarius)
Target: `universe/deep-sky/m2.json`
- fact: A rich globular cluster in Aquarius, holding over 150,000 stars about 37,000 light-years away.
- bio: Jean-Dominique Maraldi found it in 1746 while he was watching a comet, and it was the first globular cluster added to Messier's catalog. It spans more than 150 light-years, which makes it one of the largest clusters of its kind. Like every globular cluster it is a spherical swarm of stars bound together by their own gravity, and under ideal conditions it can be seen with the naked eye.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-2/ (discoverer, 1746, distance, diameter, star count, first globular in catalog, naked-eye).

### m3 (globular cluster, Canes Venatici)
Target: `universe/deep-sky/m3.json`
- fact: One of the largest and brightest globular clusters known, with more than 500,000 stars about 34,000 light-years away.
- bio: Charles Messier spotted it in 1764 and took it for a nebula without any stars; William Herschel resolved its individual stars in 1784. M3 holds at least 274 known variable stars, among the richest populations of any cluster. Their brightness cycles are tied to their true luminosity, so astronomers use them to estimate distances. The cluster is about 11 billion years old and can be seen with binoculars.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-3/

### m4 (globular cluster, Scorpius)
Target: `universe/deep-sky/m4.json`
- fact: The closest globular cluster to Earth, about 6,000 light-years away in Scorpius.
- bio: Jean-Philippe Loys de Chéseaux discovered it in 1746. It holds more than 100,000 stars and is predicted to contain up to 40,000 white dwarfs, stellar cores that help astronomers estimate the age of the universe. In 2003, Hubble observations confirmed a planet of about 2.5 Jupiter masses, PSR B1620-26 b, orbiting a pulsar and a white dwarf in the cluster. M4 is easy to find because it sits close to the bright star Antares.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-4/

### m5 (globular cluster, Serpens)
Target: `universe/deep-sky/m5.json`
- fact: A globular cluster in Serpens with about 100,000 stars, some 25,000 light-years away.
- bio: The German astronomer Gottfried Kirch discovered it in 1702. Most of its stars formed more than 12 billion years ago, yet astronomers have found younger-looking blue stragglers among them. These stars likely formed through collisions or other interactions between stars in the crowded cluster. In binoculars M5 appears as a patch of light.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-5/

### m6 (open cluster, Scorpius) - WEAK sourcing
Target: `universe/deep-sky/m6.json`
- fact: The Butterfly Cluster, a young open cluster in Scorpius about 1,500 light-years away.
- bio: Giovanni Battista Hodierna recorded it before 1654; Jean-Philippe Loys de Chéseaux rediscovered it in 1746, and Charles Messier catalogued it in 1764. Gaia data identify more than 500 likely members, spread over roughly 12 light-years. The cluster is roughly 90 to 100 million years old.
- Sources: https://en.wikipedia.org/wiki/Messier_6 (fetched; pointer). It cites Wu et al. 2009, MNRAS, "The orbits of open clusters in the Galaxy" (distance, age) and Kilicoglu et al. 2016, AJ (120 members). The papers themselves were not fetched. Last clause of bio ("young compared with...") is general and unsourced: delete if the reviewer objects.

### m7 (open cluster, Scorpius)
Target: `universe/deep-sky/m7.json`
- fact: Ptolemy's Cluster, an open cluster of about 80 stars in Scorpius, 980 light-years away.
- bio: Claudius Ptolemy recorded it in 130 AD, and Charles Messier added it to his catalog in May 1764. It is the southernmost object in Messier's catalog and lies close to the stinger of the scorpion, near M6. The cluster likely formed about 220 million years ago. From southern latitudes it can be seen with the naked eye.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-7/

### m9 (globular cluster, Ophiuchus)
Target: `universe/deep-sky/m9.json`
- fact: A globular cluster in Ophiuchus, 25,000 light-years away and one of the closest to the centre of the Milky Way.
- bio: Charles Messier discovered it in 1764. Its closeness to the galactic centre has warped its shape, so it is less spherical than a typical globular cluster. Most of its stars are concentrated toward the middle. In the Hubble image the colours show temperature: red stars are cooler, blue stars are extremely hot. A small telescope will show it.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-9/

### m10 (globular cluster, Ophiuchus)
Target: `universe/deep-sky/m10.json`
- fact: A globular cluster in Ophiuchus, roughly 15,000 light-years away, rich in blue stragglers.
- bio: Charles Messier discovered it in 1764. M10 has an unusually high number of blue stragglers, stars that look younger than the much older stars around them. They formed through collisions or other interactions between stars, which happen readily where up to a few million stars are tightly packed together. The cluster can be seen with binoculars; from the northern hemisphere it is best placed in July evenings.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-10/

### m11 (open cluster, Scutum)
Target: `universe/deep-sky/m11.json`
- fact: The Wild Duck Cluster, an open cluster of over 2,900 stars in Scutum, 6,200 light-years away.
- bio: The German astronomer Gottfried Kirch identified it in 1681. Its brightest stars are arranged in a rough V, like migrating waterfowl, which gives the cluster its name. It is about 220 million years old and one of the most densely populated open clusters known. Among the open clusters in Messier's catalog it is the most distant one that can be seen with the naked eye, under dark skies.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-11/

### m12 (globular cluster, Ophiuchus)
Target: `universe/deep-sky/m12.json`
- fact: A loosely packed globular cluster in Ophiuchus, 23,000 light-years away.
- bio: Charles Messier discovered it in 1764. Although it is relatively diffuse, M12 contains many interacting binary stars that give off X-rays. Astronomers suspect that gravity ripped many low-mass stars away from it as it passed through denser regions of the galaxy, possibly costing it up to one million stars. Binoculars show it; from the northern hemisphere it is best placed in July evenings.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-12/

### m13 (globular cluster, Hercules)
Target: `universe/deep-sky/m13.json`
- fact: The Hercules Cluster, over 100,000 stars about 25,000 light-years away.
- bio: Edmond Halley discovered it in 1714. Charles Messier added it to his catalog in 1764, believing it held no stars; its individual stars were first resolved in 1779. Near its core the density of stars is about a hundred times greater than in the neighbourhood of our Sun. M13 also hosts blue stragglers, stars that look younger because of stellar collisions.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-13/

### m14 (globular cluster, Ophiuchus)
Target: `universe/deep-sky/m14.json`
- fact: A globular cluster in Ophiuchus with over 150,000 stars, 29,000 light-years away.
- bio: Charles Messier discovered it in 1764. In the summer of 1938 one of its stars erupted as a nova, a sudden outburst in which a star's brightness rises at least 10,000-fold within days; it then faded over the following months, and it was only noticed on photographic plates in 1964. Like every globular cluster, it is a spherical group of stars bound together by their mutual gravity. M14 is best viewed with a telescope.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-14/

### m15 (globular cluster, Pegasus)
Target: `universe/deep-sky/m15.json`
- fact: One of the densest and oldest globular clusters known, in Pegasus, about 35,000 light-years away.
- bio: Jean-Dominique Maraldi found it in 1746 while hunting for comets. M15 is about 12 billion years old and is the first globular cluster known to host a planetary nebula, Pease 1, detected in 1928. Hubble measurements in 2002 suggested a central black hole of roughly 4,000 solar masses, but later data do not require one, and a radio search set an upper limit near 500. Binoculars show the cluster.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-15/ (the page also says "some 35,000 light-years"; I used the first figure).

### m17 (nebula, Sagittarius)
Target: `universe/deep-sky/m17.json`
- fact: The Omega Nebula, also called the Swan or Checkmark Nebula, a huge star-forming region 5,500 light-years away in Sagittarius.
- bio: Jean-Philippe Loys de Chéseaux discovered it in 1745. It is one of the largest star-forming regions in the Milky Way and contains one of the galaxy's youngest star clusters, only 1 million years old. Many of its young stars are hidden by the surrounding gas and dust. It can be seen with binoculars, near M16 and M18.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-17/ (NASA names "Omega/Swan"; "Checkmark" is the repo's own name field, not checked at a source: delete from fact if wanted).

### m18 (open cluster, Sagittarius) - WEAK sourcing
Target: `universe/deep-sky/m18.json`
- fact: A sparse open cluster in Sagittarius, roughly 4,000 to 5,000 light-years away, sometimes called the Black Swan Cluster.
- bio: Charles Messier discovered it in 1764. The cluster is about 33 million years old and has a radius of roughly 26 light-years. It contains 29 B-type stars, which are hot and blue, and one definite Be star. In the sky it lies between the Omega Nebula, M17, and the Small Sagittarius Star Cloud, M24.
- Sources: https://en.wikipedia.org/wiki/Messier_18 (fetched; pointer). It cites Kharchenko et al. 2005 (distance, 4.23 kly) and Piskunov et al. 2008 (age). Discovery date 3 June 1764 and the M17/M24 position come from a web-search summary of that article, not from a fetched page of its own. Papers not fetched.

### m19 (globular cluster, Ophiuchus)
Target: `universe/deep-sky/m19.json`
- fact: A globular cluster in Ophiuchus, 28,500 light-years away and only 6,500 light-years from the Milky Way's centre.
- bio: Charles Messier discovered it in 1764. M19 has a slightly elongated shape rather than a perfect sphere, possibly because of tidal forces from the galactic centre nearby. It is one of several globular clusters in Ophiuchus. Binoculars show it as a faint patch of light; seeing its individual stars takes a large telescope.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-19/

### m20 (nebula, Sagittarius)
Target: `universe/deep-sky/m20.json`
- fact: The Trifid Nebula, a star-forming region 5,000 light-years away in Sagittarius.
- bio: Charles Messier discovered it in 1764. Its name comes from three wing-like bands of thick dust that divide it. At its centre a group of recently formed, massive, bright stars floods it with ultraviolet light that has blown away the gas and dust nearby. The region also contains Herbig-Haro 399, a jet of plasma ejected by a star still forming. Hubble images taken in 1997 and 2026 show the nebula changing over 29 years.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-20/ (the 2026 comparison is on that page; the date is recent, re-check before shipping).

### m21 (open cluster, Sagittarius) - WEAK sourcing
Target: `universe/deep-sky/m21.json`
- fact: A young open cluster in Sagittarius, about 4,000 light-years away, close to the Trifid Nebula in the sky.
- bio: Charles Messier discovered it on 5 June 1764. The cluster has at least 105 members and is only a few million years old, a tiny fraction of the Sun's age. At an apparent magnitude of about 6.5 it is bright enough to be spotted in the smallest binoculars on a dark night.
- Sources: https://en.wikipedia.org/wiki/Messier_21 (fetched; pointer): 3,930 ly (Kharchenko et al. 2005), about 6.6 million years (Piskunov et al. 2008), 105 +/- 11 members, 5 June 1764, magnitude 6.5 and binoculars. "Same night as M20" and the "less than a degree" come from a web-search summary (Wikipedia/Universe Today), not a fetched page. A search summary gave 4,250 light-years and 4.6 Myr; see Data conflicts. Papers not fetched.

### m22 (globular cluster, Sagittarius)
Target: `universe/deep-sky/m22.json`
- fact: One of the brightest globular clusters visible from northern latitudes, 10,000 light-years away in Sagittarius.
- bio: The German amateur astronomer Abraham Ihle found it in 1665, making it one of the first globular clusters ever detected. It is about 70 light-years across and its stars are typically 12 to 13 billion years old. It contains two radio sources thought to be stellar-mass black holes, and Hubble microlensing observations hinted at six possible free-floating planet-mass objects. It is one of only four globular clusters known to host a planetary nebula.
- Sources: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-22/

### m23 (open cluster, Sagittarius) - WEAK sourcing
Target: `universe/deep-sky/m23.json`
- fact: An open cluster in Sagittarius, about 2,000 light-years away, with a few hundred stars.
- bio: Charles Messier discovered it in 1764. Estimates of how many stars belong to it range from 169 to 414, and the cluster is about 330 million years old. Its brightest star is only magnitude 9.3, so the cluster is a modest sight in binoculars or a small telescope. Five of its members are candidate red giants.
- Sources: https://en.wikipedia.org/wiki/Messier_23 (fetched; pointer): 2,050 ly (Kharchenko et al. 2005), 330 +/- 100 Myr (Netopil et al. 2016), 169-414 members, magnitude 9.3, five candidate red giants. A search summary gave 2,150 ly from other sources; see Data conflicts. Papers not fetched.

## Black holes

### sagittarius-a-star
Target: `universe/black-holes/sagittarius-a-star.json`
- fact: The supermassive black hole at the centre of the Milky Way, about 27,000 light-years away, with about 4.3 million times the Sun's mass.
- bio: The Event Horizon Telescope Collaboration released its first image on 12 May 2022. It shows a dark central region, the shadow, surrounded by a bright ring of glowing gas. The black hole itself is completely dark, and the size of the ring agreed with the prediction of Einstein's general relativity. Supermassive black holes like this one sit at the centres of nearly all large galaxies.
- Sources: https://www.eso.org/public/news/eso2208-eht-mw/ (date, 27,000 ly, four million Suns, shadow and ring, agreement with relativity); https://science.nasa.gov/universe/black-holes/types/ ("centers of nearly all large galaxies", Sgr A* 4 million). Both fetched.

### m87-star
Target: `universe/black-holes/m87-star.json`
- fact: The first black hole ever imaged, 6.5 billion times the Sun's mass, more than 50 million light-years away.
- bio: The Event Horizon Telescope Collaboration released the image on 10 April 2019. It shows a ring-like structure around a dark central region, the black hole's shadow: the closest we can come to an image of the black hole itself, because it is completely dark. The shadow measures just under 40 billion kilometres across, about 2.5 times the size of the event horizon. The glowing ring is superheated material orbiting the black hole.
- Sources: https://www.eso.org/public/news/eso1907/ (fetched on retry after a 502): date, 6.5 billion Suns, shadow description, size.

### cygnus-x-1
Target: `universe/black-holes/cygnus-x-1.json`
- fact: A stellar-mass black hole about 7,200 light-years away, with 21 times the mass of the Sun.
- bio: In 2021 a team led by James Miller-Jones of Curtin University used the Very Long Baseline Array, a network of 10 radio telescopes across the United States, to refine the distance to Cygnus X-1. The larger distance, about 2.2 kiloparsecs, implied a mass of about 21 Suns, roughly 40% more than the earlier estimate of about 15. The result was published in the journal Science. Stellar-mass black holes typically form when massive stars collapse, often in supernova explosions.
- Sources: web-search summaries only (the NRAO and Science pages returned 404 and 403): e.g. https://www.technologyreview.com/2021/02/18/1019091/first-black-hole-ever-discovered-cygnus-x-1-more-massive/amp/ and https://www.scimex.org/newsfeed/first-black-hole-ever-detected-is-more-massive-than-we-thought (listed by the search; not fetched). Paper title: "Cygnus X-1 contains a 21-solar mass black hole - Implications for massive star winds", Science 2021. Supernova formation: https://science.nasa.gov/universe/black-holes/types/ (fetched). WEAK on the 2021 numbers until the paper is fetched.

### gargantua (fictional)
Target: `universe/black-holes/gargantua.json`
- fact: A fictional black hole from the film Interstellar (2014), designed with the physicist Kip Thorne.
- bio: Gargantua does not exist: it is an invented object in a film. Its look comes from real equations for light around a spinning black hole, turned into images by the visual-effects software DNGR; the method was published in Classical and Quantum Gravity in 2015. The lensing is real physics, but the disk is not: the lopsided Doppler glow was left out so audiences would not be confused, and the disk was made cool, about the Sun's temperature; Thorne has said a realistic disk would have been hot enough to fry the astronauts with X-rays and gamma rays.
- Sources: https://arxiv.org/abs/1502.03808 (James, von Tunzelmann, Franklin, Thorne; DNGR, Kerr black hole, Gargantua, CQG 2015; fetched); https://www.aps.org/apsnews/2014/12/black-holes-hollywood-and-interstellar-qa-with-kip-thorne (Thorne: Doppler shift left out; cool "anemic" disk at about the Sun's temperature; realistic disk would fry Cooper; fetched). "Lensing is real physics": arXiv abstract page above.
- Left out: mass (the repo says 100 million solar masses), spin (0.9999), size. I could not source them: the arXiv PDF text was unreadable and the APS interview does not state them.

## Data conflicts

- m87-star distance: repo 53,500,000 ly; ESO eso1907 says 55 million. Text says "more than 50 million" to agree with both. Decide which to put in the data file.
- sagittarius-a-star mass: repo 4,300,000 (GRAVITY 2022); ESO and NASA say "four million". Text says "roughly four million", consistent with both. The data file's source for 4.3 million was not fetched.
- Magnitudes in `deep-sky-objects.json` differ from NASA's: m3 6.39 (NASA 6.2), m4 5.4 (5.9), m5 5.95 (6.7), m10 4.98 (6.4), m11 5.8 (6.3), m12 6.07 (7.7), m14 5.73 (8.3), m15 6.3 (6.2), m17 7 (6.0), m19 5.57 (7.7), m20 8.5 (6.3), m22 6.17 (5.1). Catalogues use different bands, so this may not be an error; none of the texts states a magnitude.
- m5 `con` in the data is "Se1"; it is Serpens (NASA), so the code looks like a typo for "Ser".
- m21 distance: Wikipedia (Kharchenko 2005) 3,930 ly vs a search summary 4,250 ly; age 6.6 vs 4.6 Myr. Text says "about 4,000" and "a few million years".
- m23 distance: 2,050 ly (Wikipedia) vs 2,150 ly in a search summary.
- m18 distance: 4.23 kly (about 4,200 ly) from the Wikipedia article; a search summary gave "about 4,900". Text uses 4,200.
- m11, m17 repo names ("Amas de l'Ecu de Sobieski", "Checkmark Nebula") differ from NASA's (Wild Duck Cluster, Omega/Swan). Texts use NASA names; the repo names are not sourced.
- m4: NASA says 5,500 ly; the repo has no distance for m2-m12, m14, m15, m17-m23 (only m13, which agrees).

## Not sourced, left out

- Cygnus X-1: discovery history, companion star, its spin. Gargantua: mass, spin, size.
- Sgr A* and M87* spin (repo 0.9 for both).
- Any cultural or mythology claim for any object.
- M6 BM Scorpii, M21 "never photographed by Hubble" (time-sensitive).
- Not verified: the NASA Hubble pages were each read through a summarising fetch tool, not line by line; the weak items above should be re-fetched by the science-reviewer.

## Science review (2026-11-12) — fixes applied

Reviewer: science-reviewer agent; verdict "fix then ship" (3 BLOCKER, 9 MAJOR, 10 MINOR, 4 NIT). All
BLOCKER / MAJOR and the MINOR wording fixes are applied above:

- cygnus-x-1: "about 40% more than ~15" and 2.2 kpc (Miller-Jones et al. 2021, https://arxiv.org/abs/2102.09091); "typically … often in supernova explosions" (https://science.nasa.gov/universe/black-holes/types/).
- m22: "visible from northern latitudes" (Dec −23.9°); black holes as "radio sources thought to be" (Strader et al. 2012); free-floating objects as microlensing hints (Sahu et al. 2001, https://sci.esa.int/web/hubble/-/27593-hint-of-planet-sized-drifters-bewilders-hubble-scientists-heic0107).
- m3: superlative dropped (Omega Centauri has more variables, https://arxiv.org/abs/astro-ph/0406456); age about 11 billion years (VandenBerg et al. 2013, via https://en.wikipedia.org/wiki/Messier_3).
- m15: central black hole stated as suggested, not required (https://arxiv.org/abs/1204.4457); distance about 35,000 ly (NASA page's second figure, modern value).
- m6: more than 500 Gaia members, about 1,500 ly (Gao 2019, AJ 156, 121); age range 90–100 Myr; discovery sequence Hodierna / de Chéseaux / Messier.
- m18, m21, m23: pre-Gaia distances rounded (m18 4,000–5,000; m21 ~4,000; m23 ~2,000); unsourced "3 June", "same night", "tightly packed" removed.
- m4: planet wording (pulsar + white dwarf; Hubble 2003 confirmed the mass) and ~6,000 ly.
- sagittarius-a-star: 4.3 million (GRAVITY 2022, https://arxiv.org/abs/2112.07478), matches the data file.
- gargantua: the hot-disk claim attributed to Thorne (APS Q&A).
- Months of the year qualified as northern-hemisphere evenings or dropped (global audience); m11 "under dark skies"; m19 "possibly"; m14 "at least 10,000-fold", 1964 plates (Wikipedia M14); m13 unsourced closing sentence removed; m5 "about 100,000".

### Data-file corrections from the review (not applied yet — integration step)
- `black-holes.json` m87-star `dist_ly` 53,500,000 → 55,000,000 (ESO eso1907 / EHT).
- `deep-sky-objects.json` names: m11 → "Wild Duck Cluster"; m17 → "Omega Nebula".
- `deep-sky-objects.json` `mag`: `scripts/refresh-messier-catalog.mjs` stores `V-Mag || B-Mag` (mixed bands); several values are implausible (M10 4.98 vs ~6.4, M12, M14, M19, M20, M17). Use one band or drop `mag` before any page shows it.
- `con: "Se1"` / `"Se2"` (M5 / M16): likely OpenNGC's Serpens Caput / Cauda codes — map to Serpens wherever `con` is displayed.
- gargantua `spin` / `dist_ly`: unsourced — verify against The Science of Interstellar before showing.
