# Batch C5b — two /science articles (draft for science review)

Plan item C5b: the deep-sky pages for nebulae (star-forming regions) and for planetary nebulae and
supernova remnants had no /science article to link. English only. Target files after review:
`i18n-src/en-US/science/observation/<id>.json` (overlay) and
`static/data/science/observation/<id>.json` (structural). Distances follow the ranges below; the
catalogue layer (`static/data/universe/deep-sky-objects.json`) has M42 1412 ly, M16 5540 ly, M8 4149 ly,
30 Doradus 161741 ly, M1 6523 ly, M57 2569 ly, M27 1269 ly, Cas A 10763 ly. NASA's Messier pages give
M42 1,500, M16 7,000, M8 5,200, M1 6,500, M57 2,000, M27 1,200 ly. The text uses rounded ranges that
cover both and says "about".

## Article 1 — `nebulae`

### Overlay `i18n-src/en-US/science/observation/nebulae.json`

```json
{
  "title": "Nebulae: the clouds where stars are born",
  "intro_sentence": "A nebula is a cloud of gas and dust between the stars. Some glow red, some shine blue, some are black silhouettes, and the cold, dark ones are where new stars begin to form.",
  "body_paragraphs": [
    "An emission nebula makes its own light. Hot, young stars, mostly of spectral types O and B, flood the gas around them with ultraviolet light, which strips the electrons from hydrogen atoms. When protons and electrons recombine, they give off light at specific wavelengths. The strongest in the visible range is hydrogen-alpha, a deep red, so these glowing clouds, called H II regions (ionised hydrogen), look red or pink in photographs. NASA compares the effect to a neon sign. Other elements add their own colours: oxygen, sulfur, nitrogen. Because the glow needs ultraviolet light from stars that live only a few million years, an emission nebula is a sign that massive stars have formed there recently.",
    "A reflection nebula does not glow on its own. Its stars are too cool to ionise the gas, so the cloud only scatters their light, and dust grains scatter blue light more strongly than red, which gives these nebulae a blue cast. A dark nebula is dust dense enough to block visible light from everything behind it, so it appears as a silhouette against brighter stars or glowing gas. Dark nebulae are the visible face of molecular clouds, cold clouds in which hydrogen is bound into molecules. The largest hold between about ten thousand and ten million solar masses and span roughly 15 to 600 light-years. One kind of cloud can appear as any of the three, depending on whether a hot star, a cool star or no star lies near it.",
    "Stars form inside molecular clouds. Gravity gathers the denser parts into clumps, and the clumps into dense cores, cold (about 10 to 20 kelvin) and only about 0.1 parsec (0.3 light-year) across. A core that collapses heats at its centre and becomes a protostar; the contraction continues until the centre is hot enough to fuse hydrogen. The whole process can take a million years or more. Only a small fraction of a cloud's mass, of the order of a few per cent, ends up in stars. One cloud breaks into many cores at once, so stars are born in groups: the four Trapezium stars in the Orion Nebula, or the several thousand stars of the cluster NGC 6530 in the Lagoon Nebula.",
    "The Orion Nebula (M42), at roughly 1,300 to 1,500 light-years, is the closest large star-forming region; its Trapezium stars carve a cavity with their ultraviolet light. The Eagle Nebula (M16), at roughly 5,000 to 7,000 light-years depending on the measurement, holds the Pillars of Creation, columns 4 to 5 light-years tall that young stars just outside the frame are eroding. The Lagoon Nebula (M8), about 5,000 light-years away, has funnels each about half a light-year long. The Tarantula Nebula (30 Doradus), in the Large Magellanic Cloud about 160,000 light-years away, is among the most active star-forming regions known, far larger than any in our own galaxy."
  ],
  "diagram_caption": "Emission nebulae glow red (hydrogen-alpha), reflection nebulae scatter blue, dark nebulae are dust silhouettes. Stars form in cold molecular-cloud cores, in groups.",
  "seo_title": "Nebulae: emission, reflection, dark and star formation",
  "seo_description": "What nebulae are: why emission nebulae glow red, why reflection nebulae are blue, how dark clouds form stars. With Orion, Eagle, Lagoon and Tarantula."
}
```

### Structural `static/data/science/observation/nebulae.json`

Photo pick: `jwst-orion` (`static/images/deep-sky/jwst-orion.jpg`, ships today; the M42 catalogue entry
uses photoKey `jwst-orion`). Credit line copied from `static/data/deep-sky.json` key `jwst-orion`
(credit "NASA · ESA · CSA · STScI", licence "CC BY-SA 3.0 igo"). Alternative: `jwst-pillars`
(NASA · ESA · CSA · STScI, public domain).

```json
{
  "id": "nebulae",
  "tab": "observation",
  "order": 15,
  "photo": {
    "src": "/images/deep-sky/jwst-orion.jpg",
    "credit": "NASA · ESA · CSA · STScI · The Orion Nebula (M42), the closest large star-forming region, seen by the James Webb Space Telescope."
  },
  "see_in_app": [
    { "route": "/explore/deep-sky/m42", "context_key": "Orion Nebula (M42), emission nebula and star-forming region" },
    { "route": "/explore/deep-sky/m16", "context_key": "Eagle Nebula (M16) and the Pillars of Creation" },
    { "route": "/explore/deep-sky/m8", "context_key": "Lagoon Nebula (M8)" },
    { "route": "/explore/deep-sky/30-doradus", "context_key": "Tarantula Nebula (30 Doradus) in the Large Magellanic Cloud" }
  ],
  "links": [
    { "l": "NASA · Decoding nebulae", "u": "https://science.nasa.gov/universe/decoding-nebulae", "t": "intro" },
    { "l": "NASA · Hubble Messier 42 (Orion Nebula)", "u": "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-42/", "t": "core" },
    { "l": "NASA · Hubble Messier 16 (Eagle Nebula)", "u": "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-16/", "t": "core" },
    { "l": "NASA · Webb's star formation discoveries", "u": "https://science.nasa.gov/mission/webb/science-overview/science-explainers/webbs-star-formation-discoveries/", "t": "deep" }
  ]
}
```

(The Webb explainer URL came from a search result; its page was not fetched. Reviewer: open it before
it ships, or swap it for one that was read.)

### Sources — `nebulae`

| Claim | Source (read) |
|---|---|
| Emission nebulae: stars heat gas which glows in colours, "neon sign" comparison | NASA, Decoding nebulae: https://science.nasa.gov/universe/decoding-nebulae (fetched) |
| Reflection nebulae scatter starlight; blue because dust grains preferentially reflect blue | same (fetched) |
| Dark nebula: dense dust blocks visible light from objects behind | same (fetched) |
| Star formation: gas and dust clump by gravity; can take a million years or more | same (fetched) |
| Hydrogen-alpha red; ionisation by hot stars; recombination; H II region; reflection stars too weak to ionise | WebSearch summary (astrobackyard, Sky at Night, search 2) — SECONDARY, not a primary page; the H-alpha / H II wording needs a primary check (suggest NASA/ESA Hubble Soul Nebula or an ESO page) |
| O and B stars live only a few million years (so recent massive star formation) | NOT SOURCED in this pass (common knowledge; reviewer to confirm or cut) |
| Molecular clouds: dark nebulae as silhouettes; GMC 10 thousand to 10 million solar masses, 15–600 ly | Wikipedia, Molecular cloud (fetched), SECONDARY: https://en.wikipedia.org/wiki/Molecular_cloud |
| About 2% of cloud mass becomes stars (text says "a few per cent") | same, SECONDARY |
| Cores 10–20 K, ~0.1 pc, n ~ 10^4 cm^-3; clumps then cores then protostars; thousands of protostars per cloud | WebSearch summary of arXiv/NASA Webb results (search 7), SECONDARY; primary candidate: https://arxiv.org/pdf/astro-ph/0309829 and Webb explainer above, not opened |
| Collapse continues until hydrogen fusion starts | Wikipedia, Molecular cloud (fetched), SECONDARY |
| "One cloud / one kind can show all three depending on neighbours" | Synthesis of the three NASA definitions above, not a stated sentence in any source |
| M42: closest large star-forming region; ~1,500 ly (NASA); Trapezium four massive young stars; UV carves a cavity | https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-42/ (fetched) |
| M42 ~1,300–1,400 ly range lower end | Operator brief; catalogue layer 1412 ly; no primary page read for 1,300 |
| M16: 7,000 ly (NASA); pillars 4–5 ly tall; winds/UV of young stars erode them | https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-16/ (fetched); 5,540 ly from catalogue layer (low end of the range) |
| M8: 5,200 ly; funnels ~half a light-year long; NGC 6530 several thousand stars; UV from embedded massive stars ionises gas | https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-8/ (fetched) |
| 30 Doradus: in LMC, ~160,000 ly, among the most active star-forming regions known, no galactic region as large | WebSearch summary (search 3: Crowther 2019 paper in Galaxies, ESA/Hubble, ESO) — SECONDARY summary; primary candidates https://esahubble.org/images/heic1206a/ and https://www.eso.org/public/images/eso1033a, not opened |

## Article 2 — `how-stars-end`

### Overlay `i18n-src/en-US/science/observation/how-stars-end.json`

```json
{
  "title": "How stars end",
  "intro_sentence": "A star's mass decides its death. Stars up to about eight times the Sun's shed their outer layers and leave a white dwarf; heavier ones explode, leaving a neutron star or a black hole.",
  "body_paragraphs": [
    "A star with less than about eight times the Sun's mass ends quietly. When the hydrogen in its core runs out, fusion moves to the outer layers, which expand, and the star becomes a red giant. Eventually the star becomes unstable and blows its outer layers away as an expanding cloud of gas and dust, a planetary nebula. The name has nothing to do with planets: William Herschel used it in the 1780s because these objects looked like planets in small telescopes. What lights the cloud is the exposed core, which is hot enough (above about 30,000 kelvin) to ionise the gas with its ultraviolet light. The glow lasts only of the order of ten thousand years, a short phase in a star's life.",
    "What is left at the centre is a white dwarf: the core, no longer fusing anything, slowly cooling. A typical one has about half the Sun's mass in a body only slightly bigger than Earth. Its electrons, packed as tightly as quantum physics allows, hold it up. This has a ceiling: Chandrasekhar showed that a white dwarf cannot exceed about 1.4 solar masses, and a heavier one cannot be supported. Two planetary nebulae to look at are the Ring Nebula (M57), roughly 2,000 to 2,600 light-years away, where Hubble found a football-shaped structure seen end-on piercing the ring, and the Dumbbell Nebula (M27), about 1,200 light-years away, the first planetary nebula ever discovered, by Charles Messier in 1764.",
    "Stars above about eight solar masses end in a core-collapse supernova. When fusion can no longer support the core, it collapses and rebounds, sending a shock wave through the star. In 1054 Chinese astronomers recorded a guest star that stayed visible in daylight for 23 days; its remnant is the Crab Nebula (M1), now about six light-years wide and about 6,500 light-years away. Cassiopeia A, about 11,000 light-years away, is another remnant, from an explosion whose light reached Earth about 330 years ago. NASA gives roughly eight to 20 solar masses as the range of stars that leave neutron stars.",
    "The core of the Crab is a neutron star, a core of between about one and three solar masses squeezed into a ball about 20 kilometres across, so dense that a sugar cube of it would weigh about a billion tonnes. It spins about 30 times a second, and its beams sweep past Earth like a lighthouse: a pulsar. Pulsars are rotating neutron stars seen as regular pulses, from milliseconds to seconds apart. If the collapsing core is heavier than about three solar masses, nothing stops it, and it keeps collapsing into a stellar-mass black hole; NASA puts the heavier stars in this group. The black holes article covers what happens there."
  ],
  "diagram_caption": "Up to ~8 solar masses: red giant, planetary nebula, white dwarf (limit 1.4). Above that: supernova, then a neutron star, or a black hole for the heaviest.",
  "seo_title": "How stars end: white dwarfs, supernovae, neutron stars",
  "seo_description": "How a star's mass decides its death: planetary nebulae and white dwarfs, core-collapse supernovae, neutron stars, pulsars and black holes. M57, M27, the Crab."
}
```

Reviewer flags inside the text (fix at review, do not ship as is):
- "Chandrasekhar showed that a white dwarf cannot exceed..." — the limit is sourced; the attribution to
  Chandrasekhar is from the search summaries (secondary). Check.
- "Its electrons ... hold it up" (electron degeneracy pressure) — NASA Imagine page says "degenerate
  matter" only; the electron wording is from the secondary search summary.

### Structural `static/data/science/observation/how-stars-end.json`

Photo pick: `jwst-ring` (`static/images/deep-sky/jwst-ring.jpg`, M57 photoKey; credit "NASA · ESA · CSA ·
STScI", licence "CC BY 4.0"), copied from `static/data/deep-sky.json` key `jwst-ring`. Alternative:
`hst-crab` (NASA · ESA · Hubble, CC BY 2.0) for the supernova half.

```json
{
  "id": "how-stars-end",
  "tab": "observation",
  "order": 16,
  "photo": {
    "src": "/images/deep-sky/jwst-ring.jpg",
    "credit": "NASA · ESA · CSA · STScI · The Ring Nebula (M57), the shed outer layers of a dying Sun-like star, seen by the James Webb Space Telescope."
  },
  "see_in_app": [
    { "route": "/explore/deep-sky/m57", "context_key": "Ring Nebula (M57), planetary nebula" },
    { "route": "/explore/deep-sky/m27", "context_key": "Dumbbell Nebula (M27), planetary nebula" },
    { "route": "/explore/deep-sky/m1", "context_key": "Crab Nebula (M1), supernova remnant with a pulsar" },
    { "route": "/explore/deep-sky/cas-a", "context_key": "Cassiopeia A, supernova remnant" }
  ],
  "links": [
    { "l": "NASA · Types of stars and their life cycles", "u": "https://science.nasa.gov/universe/stars/types/", "t": "intro" },
    { "l": "NASA · Hubble Messier 1 (Crab Nebula)", "u": "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-1/", "t": "core" },
    { "l": "NASA · Hubble Messier 27 (Dumbbell Nebula)", "u": "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-27/", "t": "core" },
    { "l": "NASA Imagine the Universe · Neutron stars", "u": "https://imagine.gsfc.nasa.gov/science/objects/neutron_stars.html", "t": "deep" }
  ]
}
```

### Sources — `how-stars-end`

| Claim | Source (read) |
|---|---|
| Below ~8 solar masses: red giant when core hydrogen runs out; outer layers expand | NASA, Star types: https://science.nasa.gov/universe/stars/types/ (fetched) |
| Red giant becomes unstable, blows layers away, planetary nebula; core remains as white dwarf | same (fetched) |
| ~8 to 20 solar masses: core collapses and rebounds, shock wave, supernova, neutron star; heavier stars: stellar-mass black holes | same (fetched; NASA gives no threshold for black holes) |
| Planetary nebula: Herschel, 1780s, resembled planets; ~10,000 years; central star above ~30,000 K ionises; progenitors 1–8 solar masses | Wikipedia, Planetary nebula (fetched), SECONDARY: https://en.wikipedia.org/wiki/Planetary_nebula |
| Name from round, planet-like appearance in small telescopes; M27 first planetary nebula discovered, Messier 1764; ~1,200 ly | NASA M27: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-27/ (fetched) |
| M57: ~2,000 ly (NASA); discovered 1779 by Darquier; football-shaped structure seen end-on piercing the ring; glowing remains of a Sun-like star | https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-57/ (fetched); 2,569 ly from catalogue layer (high end of the range) |
| White dwarf: typical half a solar mass, slightly bigger than Earth; Chandrasekhar limit 1.4 solar masses | NASA Imagine, White dwarfs: https://imagine.gsfc.nasa.gov/science/objects/dwarfs2.html (fetched) |
| White dwarf attributed to Chandrasekhar; supported by electrons; heavier white dwarf is smaller | WebSearch summary (search 4), SECONDARY; NASA Imagine page names degenerate matter only |
| Core-collapse supernova needs at least ~8–9 solar masses | Wikipedia, Core-collapse supernova (fetched), SECONDARY (text says "above about eight", matching NASA's threshold) |
| Crab: 1054 guest star; visible in daylight 23 days; six-light-year-wide remnant; 6,500 ly; neutron star pulses 30 times per second | NASA M1: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-1/ (fetched: 1054, 6,500 ly, six-light-year, 30 per second); "23 days" from the search 8 summary of NASA Hubble / Chandra pages (not opened individually) |
| Cas A: ~11,000 ly, remnant of a massive star, about 330 years ago, neutron star at the centre | Chandra, via WebSearch summary (search 1): https://chandra.harvard.edu/photo/1999/casajph/index.html (page not opened) |
| Neutron star ~20 km across; core 1–3 solar masses; sugar cube about a billion tons; pulsars: regular pulses ms to seconds; cores above 3 solar masses collapse to stellar-mass black holes | NASA Imagine, Neutron stars: https://imagine.gsfc.nasa.gov/science/objects/neutron_stars.html (fetched) |
| "Black holes article covers what happens there" | internal link to the existing `black-holes` science article (id `black-holes`, observation tab, order 7) |

## NOT sourced / NOT verified (read before review)

- Search budget used: 8 of 15 WebSearch calls. 11 page fetches succeeded; three failed with 404
  (NASA nebulae index, ESA Hubble life cycle, Chandra casa.html) and were replaced by search summaries.
- Distances are given as ranges because NASA's popular pages and the catalogue layer disagree
  (M16 5,540 vs 7,000 ly; M57 2,000 vs 2,569; M42 1,412 vs 1,500). The 1,300 ly lower bound for M42 and
  the "5,000" for M8 (NASA says 5,200; catalogue 4,149) have no primary page read for those exact
  numbers. A recent distance paper for M42 and M16 would settle them.
- Hydrogen-alpha / H II wording, core temperature and size (10–20 K, 0.1 pc), the 30 Doradus
  description and the Cas A figures rest on search-result summaries, not on a page I opened.
- Star-formation fraction "a few per cent" (Wikipedia says 2%) is deliberately loosened.
- "O and B stars live only a few million years" is unsourced.
- Chandrasekhar attribution and the electron-pressure explanation: secondary only.
- The Webb star-formation explainer link was not opened.
