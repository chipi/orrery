# Batch C5c — /science article "Star clusters" (draft for science review)

Plan item 0.9.11 C5: the deep-sky open- and globular-cluster pages (60 in the catalogue) linked only
the H–R article. English first; files `i18n-src/en-US/science/observation/star-clusters.json`
(overlay) and `static/data/science/observation/star-clusters.json` (structural). New glossary term:
`main-sequence turn-off`.

Distances follow the catalogue layer (`static/data/universe/deep-sky-objects.json`) where it has the
object: M44 598 ly, M67 2,731 ly, Omega Centauri 17,710 ly, 47 Tucanae 14,742 ly, M13 24,201 ly. The
Hyades and the Pleiades are not in it; their distances are ESA's and NASA's.

## Sources

Status: FETCHED = the page was opened and the quote seen; SECONDARY = Wikipedia or a search summary.

| Claim (as written) | Source | Status | What it says |
|---|---|---|---|
| Stars of a cluster formed at almost the same time from the same cloud; same age | https://courses.ems.psu.edu/astro801/content/l7_p6.html | FETCHED | "all stars in a cluster formed almost simultaneously from the same cloud of interstellar gas" |
| Nearly the same chemical make-up | https://openstax.org/books/astronomy-2e/pages/22-3-checking-out-the-theory | FETCHED (paraphrase only) | stars in a cluster share the same age and composition |
| Same distance; "mainly their mass" differs; natural experiment | synthesis of the two above | — | not a quoted sentence |
| Open: tens to thousands of stars, core a few ly, outer part tens of ly; disc, in and between the arms; most under 1 Gyr | https://science.nasa.gov/universe/stars/star-clusters-inside-the-universes-stellar-collections/ | FETCHED | "tens to thousands of stars"; "core that typically measures a few light-years across"; "can stretch about tens of light-years"; "less than a billion years old"; "in our galaxy's disk, both in and between its spiral arms" |
| Loosely bound; the galaxy's pull and passing gas clouds scatter them | https://en.wikipedia.org/wiki/Open_cluster | SECONDARY | tidal forces; passing close to or through a molecular cloud disrupts the cluster |
| Hyades ~153 ly, 600–700 Myr, nearest | https://www.esa.int/Science_Exploration/Space_Science/Gaia/Is_the_nearest_star_cluster_to_the_Sun_being_destroyed | FETCHED | "just over 153 light years away"; "600–700 million year history"; "the nearest star cluster to the Sun" |
| Pleiades ~445 ly | https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-45 | FETCHED | "445 light-years from Earth" (Gaia DR2 136.67 pc = 446 ly, arXiv 1808.02968) |
| Pleiades a little over 100 Myr | https://arxiv.org/abs/1804.06441 | FETCHED | "near 110-160 Myr" (lithium depletion 112 ± 5 Myr, Dahm 2015: SECONDARY) |
| Beehive ~600 ly, about as old as the Hyades | https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-44 | FETCHED | "600 light-years"; "around 600-700 million years old" |
| M67 ~2,700–2,800 ly, ~4 Gyr, Sun's age, oldest open cluster in the Messier catalogue | https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-67 | FETCHED | "~2,800 light-years"; "approximately 4 billion years of age ― about the same as our Sun"; "the oldest open cluster in the Messier catalog" (catalogue 2,731 ly) |
| 2023 Gaia search: more than 7,000 clusters, nearly all open or candidates | https://arxiv.org/abs/2303.13424 (Hunt & Reffert 2023) | FETCHED | "recovered 7167 clusters, 2387 of which are candidate new objects … including 134 globular clusters" |
| Globular: tens of thousands to millions of stars, 50–450 ly, ~150 in the Milky Way, halo, 8–13 Gyr | https://science.nasa.gov/universe/stars/star-clusters-inside-the-universes-stellar-collections/ | FETCHED | "tens of thousands to millions of stars"; "50 to 450 light-years across"; "about 8 to 13 billion years ago"; "found throughout the halo"; "about 150 known globular clusters" (Harris 2010: 157, arXiv 1012.3224) |
| Omega Cen ~17,700 ly, ~10 million stars | https://esahubble.org/news/heic2409/ | FETCHED | "17 700 light-years away"; "roughly 10 million stars" |
| Largest and brightest in the sky; ~10× the mass of other big globulars | https://science.nasa.gov/missions/hubble/nasas-hubble-finds-strong-evidence-for-intermediate-mass-black-hole-in-omega-centauri/ | FETCHED | "largest and brightest globular cluster in the sky"; "about 10 times as massive as other big globular clusters" |
| Probably the core of a small galaxy stripped by the Milky Way | https://arxiv.org/abs/astro-ph/9910278 (Majewski et al. 2000) | FETCHED | "the remains (nucleus) of a once larger satellite dwarf galaxy … reduced by tidal stripping" (a hypothesis, hence "probably") |
| 2024: seven fast stars near the centre, IMBH of at least 8,200 solar masses | https://arxiv.org/abs/2405.06015 (Häberle et al., Nature 10 July 2024); ESA heic2409 | FETCHED | "seven fast-moving stars in the central 3 arcseconds"; "a firm lower limit of the black hole mass of ∼8,200 Msun" |
| 47 Tuc ~15,000 ly, second brightest | https://esahubble.org/images/heic1510a/ | FETCHED | "15000 light years"; "After Omega Centauri it is the brightest globular cluster in the night sky" |
| M13 ~24,000 ly, several hundred thousand stars | https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-13 | FETCHED | "25,000 light-years"; "hundreds of thousands of stars in the cluster" (catalogue 24,201 ly) |
| Arecibo radio message 1974 aimed at M13 | https://science.nasa.gov/image-article/apod-1997-july-17-a-message-from-earth/ | FETCHED | "toward the globular star cluster M13 in 1974" |
| Main sequence = core hydrogen fusion | existing glossary `main sequence`; NASA Imagine below | — | — |
| Massive stars use fuel faster; Sun ~10 Gyr on the main sequence; massive stars millions of years | https://imagine.gsfc.nasa.gov/science/objects/stars1.html | FETCHED | "Our sun will spend about 10 billion years on the main sequence"; "a more massive star … may only be on the main sequence for millions of years" |
| Main-sequence turn-off: where stars begin to leave the main sequence; gives the age | OpenStax 22.3 (above); PSU astro801 (above) | FETCHED | "The location in the H–R diagram where the stars have begun to leave the main sequence is called the main-sequence turnoff"; "the same age as the most massive star left on the Main Sequence" |
| Turn-off moves down with age | OpenStax 22.3 | FETCHED (by the reviewer) | "the older the cluster, the lower the point on the main sequence where stars begin to move toward the red giant region" |
| Blue stragglers above the turn-off; mass transfer or merger | https://science.nasa.gov/missions/hubble/nasas-hubble-space-telescope-finds-blue-straggler-stars-in-the-core-of-a-globular-cluster/ | FETCHED | the less massive star "would siphon fresh hydrogen" from its companion; "the stars might actually merge" |
| 2020 study, 68 globulars, oldest average ~13.3 Gyr, lower limit on the universe's age | https://arxiv.org/abs/2007.06594 (Valcin et al. 2020) | FETCHED | "average age of the oldest globular clusters is t_GC=13.32 ± 0.1 (stat.) ± 0.5 (sys.)" |

## Not sourced / left out

- Left out because no fetched page confirmed them: Omega Centauri's ~4 million solar masses,
  "globular clusters are metal-poor", Planck's 13.8 Gyr, the lifetime law t ∝ M^-2.5 (Ohio State
  gives M^-3), main-sequence fitting for distances, Westerlund 2.
- The dispersal cause (galactic tide, molecular clouds) rests on Wikipedia only.
- "Turn-off moves down with age" is a search summary; it follows from the fetched lines.
- Research used 17 WebSearch calls.

## Science review (2026-11-22, science-reviewer on Sonnet): FIX-THEN-SHIP

0 errors, 3 overreach, 3 unsupported, 5 nits; all applied.

- Valcin 2020 is a mean age with ±0.5 Gyr systematics, not a "lower limit": now "give or take half a
  billion. The universe must be older than its oldest stars, and the same study estimated its age at
  about 13.5 billion years".
- Dispersal: tidal forces, gas-cloud encounters and the clusters' slow loss of their own stars
  ("gradually disperse them"); still Wikipedia-level, a review source (Krumholz, McKee &
  Bland-Hawthorn 2019, ARA&A) was suggested and not opened.
- Omega Centauri's origin: "may be the leftover core of a small galaxy" (Majewski et al. 2000 is a
  hypothesis; the cited ESA page does not mention it).
- Pleiades age: the source is Dahm 2015 (112 ± 5 Myr, lithium depletion boundary,
  https://ui.adsabs.harvard.edu/abs/2015ApJ...813..108D), not the NASA M45 page; wording kept.
- M13: the reviewer's read of the NASA page gives "over 100,000 stars": now "more than 100,000".
- Hunt & Reffert: "about 7,200 clusters and candidates … only 134 of them are globular clusters".
- Reading-link label: ESA's real headline ("strong evidence for intermediate-mass black hole").
- Globulars "mostly in its halo"; the most massive stars leave the main sequence first; the
  turn-off stars' lifetime is "about" the cluster's age; the Hyades is "the nearest star cluster to
  the Sun" (ESA's wording).
- The reviewer opened OpenStax 22.3: "the older the cluster, the lower the point on the main
  sequence where stars begin to move toward the red giant region", so "turn-off moves down with
  age" is FETCHED.
- Not checked by the reviewer: the ESA Hyades, Hunt & Reffert, Majewski, Häberle, 47 Tuc and Arecibo
  pages (the research agent's FETCHED claims).

## After review

- The deep reading link moved from OpenStax 22.3 (openstax.org is not a classified host in
  `build-link-provenance.ts`, which fails closed) to the Baumgardt & Vasiliev Galactic globular
  cluster database (University of Queensland), a source the site's globular-cluster pages already
  cite. OpenStax stays a source of the text, in the table above.
- Translations: 13 locales by four Sonnet translators with a term sheet
  (`scripts/i18n-tools/maps/2026-11-22-turn-off-term/term-sheet.mjs`); checked by hand for numbers
  (every value kept; CJK and hi in their own units), length limits, plural titles, a hi "millions"
  written as लाखों (hundreds of thousands, fixed to दसियों लाख), and CJK Gaia / Hubble put back in
  Latin script (check-i18n-name-drift). term-drift: 0 unreviewed misses.
- Not done: a native-speaker read of the 13 translations.
