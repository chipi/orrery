# Deep text, batch 4 (drafts)

Drafts only. Nothing here is in `i18n-src/` or `static/` yet. 2026-11-12, branch `tech-debt/0.9.9`.

## Shape and selection

- Same shape as batch 3: new overlay `i18n-src/en-US/universe/deep-sky/<id>.json` with `fact` and `bio`, plus one or two `links` (host, label, `t`: intro or core). Counts are `fact` + `bio` characters (measured with a script file: all 21 are between 400 and 600).
- Selection: the 21 objects of `static/data/universe/deep-sky-objects.json` with no file in `i18n-src/en-US/universe/deep-sky/`: ngc-1300, ngc-1365, ngc-2014-2020, ngc-2174, ngc-2264, ngc-2392, ngc-3132, ngc-3324, ngc-3372, ngc-4038-4039, ngc-5139 (Omega Centauri), ngc-6302, ngc-6543, ngc-7293, ngc-7635, perseus-cluster, rho-ophiuchi, serpens-nebula, sn-1572, v838-mon, wr-124. All 21 have a photo. With these the deep-sky list is complete (141 objects).
- The caption of each object (`i18n-src/en-US/deep-sky.json`, keyed by `photoKey`) was read first; the text does not repeat it.
- Distances, magnitudes and sizes follow the catalogue layer (#658). Where a source differs, the text says so only if the difference is large; all differences are under Data conflicts.
- Source tags: S-WP-name = the Wikipedia article (fetched, used as a pointer; papers it cites were not fetched unless named). "A search summary" = a WebSearch result summary of a page that was not itself fetched (the page is named). Link URLs in the drafts are pages that were fetched; Wikipedia is linked only where that article was fetched.
- Carina (`ngc-3372`) and `carina-nebula` are one nebula with two entries; this draft avoids the other overlay's content.

## Deep-sky objects

### ngc-1300 (barred spiral galaxy, Eridanus)
Target: `universe/deep-sky/ngc-1300.json`
- fact: A barred spiral galaxy in Eridanus, about 45 million light-years away, described by Hubble's team as prototypical of its kind.
- bio: John Herschel found it in 1835. Its arms do not wind into the centre but join the two ends of a straight bar of stars. Hubble found a second, smaller grand-design spiral at its core, about 3,300 light-years long; models suggest gas funnelled along a bar can spiral inward through it to fuel a central black hole. The nucleus is not active: either no black hole is present or it is quiet. Published distances run from about 45 to 70 million light-years.
- links: Wikipedia (https://en.wikipedia.org/wiki/NGC_1300, intro); ESA/Hubble (https://esahubble.org/images/opo0501a/, core)
- Characters: 578
- Sources: S-WP-NGC1300 (Herschel 1835, 3,300 ly nuclear spiral, black-hole mass range), ESA/Hubble opo0501a (fetched: prototypical barred spiral, 60 Mly), a search summary of the NASA/STScI 2005 release (funnelling, no active nucleus, 69 Mly). Data conflict: dist_ly 45.3 Mly (Cosmicflows-4); ESA/Hubble 60, Wikipedia 61.3, STScI 69; text states 45 in the fact line and the range in the bio. The caption's "200,000-light-year bar" was not found in any source (Wikipedia gives the whole galaxy about 130,000 ly); fix the caption at integration.

### ngc-1365 (barred spiral galaxy, Fornax)
Target: `universe/deep-sky/ngc-1365.json`
- fact: A large barred spiral galaxy in the Fornax Cluster, about 61 million light-years away, with a rapidly spinning central black hole.
- bio: James Dunlop discovered it in 1826. Webb's infrared images, taken for the PHANGS survey of nearby galaxies, trace dust and young stars across the disc. In 2013 simultaneous X-ray observations by XMM-Newton and NuSTAR showed that the black hole at its centre, of about 2 million solar masses, spins almost as fast as general relativity allows. The team read this as a sign of steady growth but cannot rule out an earlier merger.
- links: Wikipedia (https://en.wikipedia.org/wiki/NGC_1365, intro); ESA (https://www.esa.int/Science_Exploration/Space_Science/Speedy_black_hole_holds_galaxy_s_history, core)
- Characters: 557
- Sources: S-WP-NGC1365 (Dunlop 1826, 2 million solar masses), esawebb weic2403f (fetched: backward-S dust, PHANGS, NIRCam + MIRI), ESA 'Speedy black hole holds galaxy's history' (fetched: XMM-Newton + NuSTAR 2012 observation, near-maximal spin, steady growth, merger not excluded, Nature 28 Feb 2013). The 'at least 84 per cent of maximum' spin and the 2 million solar masses come from a search summary and Wikipedia; the Risaliti paper was not fetched (the arXiv fetch returned another paper) and neither number is in the text. Data conflict: dist_ly 61.1 Mly (Cosmicflows-4); caption and ESA/Webb 56 Mly. Text follows the data file.

### ngc-2014-2020 (emission nebulae, Large Magellanic Cloud, Dorado)
Target: `universe/deep-sky/ngc-2014-2020.json`
- fact: The Cosmic Reef, two neighbouring nebulae in the Large Magellanic Cloud, about 170,000 light-years away.
- bio: James Dunlop catalogued NGC 2014 in 1826. The large red nebula, NGC 2014, is gas lit by a group of bright stars, each 10 to 20 times the Sun's mass, whose ultraviolet radiation heats the dense gas around them. The smaller blue nebula, NGC 2020, was shaped by one massive star about 200,000 times as luminous as the Sun, which lost part of its outer envelope in a series of eruptions. Both lie in a larger star-forming region of the Large Magellanic Cloud, a satellite galaxy of the Milky Way.
- links: STScI release (https://www.stsci.edu/contents/news-releases/2020/news-2020-16, core); Wikipedia (https://en.wikipedia.org/wiki/NGC_2014, intro)
- Characters: 596
- Sources: STScI news-2020-16 (fetched: 163,000 ly, stars 10 to 20 solar masses, 200,000 times the Sun, eruptive mass loss), S-WP-NGC2014 (Dunlop 1826). Data conflict: dist_ly 166,340 (McConnachie 2012, LMC); STScI 163,000; text rounds the data's label to 170,000.

### ngc-2174 (emission nebula, Orion)
Target: `universe/deep-sky/ngc-2174.json`
- fact: The Monkey Head Nebula, a glowing cloud of ionised gas in Orion, about 6,400 light-years away.
- bio: Édouard Stephan discovered it in 1877. ESA/Hubble calls it a violent stellar nursery: hot young stars inside it drive fast winds that blow the gas outward. It spans about 40 arcminutes of sky, wider than the full Moon, so Hubble's picture shows only a part. That image, made in infrared light with Wide Field Camera 3 for the telescope's 24th anniversary in 2014, looks through some of the dust to star-forming regions that visible light hides.
- links: ESA/Hubble (https://esahubble.org/news/heic1406/, core); Wikipedia (https://en.wikipedia.org/wiki/NGC_2174, intro)
- Characters: 538
- Sources: ESA/Hubble heic1406 (fetched: 6,400 ly, violent stellar nursery, winds), S-WP-NGC2174 (Stephan 6 Feb 1877, 40 arcminutes, infrared 24th-anniversary image), a search summary of the release (Wide Field Camera 3, infrared). 'Looks through some of the dust' is Wikipedia's 'previously hidden' wording, not ESA's. The caption's pillars are not repeated. No conflict.

### ngc-2264 (young open cluster and H II region, Monoceros)
Target: `universe/deep-sky/ngc-2264.json`
- fact: The Christmas Tree Cluster and the Cone Nebula, a young star cluster and its gas in Monoceros, about 2,300 light-years away.
- bio: NGC 2264 is an open cluster with an H II region. The Christmas Tree Cluster is the stars; the Cone is a dark pillar of cold gas and dust that ultraviolet light has eroded over millions of years. Hubble's 2002 image shows only the top 2.5 light-years of it. Studies of the cluster's stars find an age spread: star formation is older in the north, around the bright binary S Monocerotis, and younger and still under way in the embedded Cone region.
- links: ESA/Hubble (https://esahubble.org/images/heic0206c/, core); Wikipedia (https://en.wikipedia.org/wiki/NGC_2264, intro)
- Characters: 570
- Sources: ESA/Hubble heic0206c (fetched: upper 2.5 ly of the Cone, dark cold gas, UV erosion over millions of years), S-WP-NGC2264 (open cluster plus H II region, S Monocerotis), a search summary of the Gaia-ESO CSI 2264 papers (arXiv 1709.03178: age spread, older north around S Mon, younger Cone; the paper itself was not fetched). Data conflict: dist_ly 2,284 (Hunt and Reffert 2023); ESA says 2,500, Wikipedia 2,350 (Maiz Apellaniz 2019 Gaia DR2). The caption's seven-light-year length (ESA agrees) is not repeated. The data file names the Christmas Tree Cluster but its photo is the Cone.

### ngc-2392 (planetary nebula, Gemini)
Target: `universe/deep-sky/ngc-2392.json`
- fact: The Eskimo Nebula, a planetary nebula in Gemini, about 6,000 light-years away.
- bio: William Herschel found it in 1787. Seen through ground-based telescopes it looks like a face in a fur parka, hence the name. Hubble's image, its first after the December 1999 servicing mission, separates two structures: an inner bubble blown by a fast wind from the central star, and an outer disc of comet-shaped filaments, each about a light-year long, with tails streaming outward. NASA gives the wind as about 1.5 million kilometres an hour and the slower equatorial ring as about 115,000.
- links: NASA caption (https://nssdc.gsfc.nasa.gov/photo_gallery/caption/hst_eskimo_ngc2392_0007.txt, core)
- Characters: 571
- Sources: NASA caption hst_eskimo_ngc2392_0007 (fetched: Herschel 1787, parka, inner bubble from fast wind, outer comet-shaped filaments, 900,000 mph wind and 72,000 mph equatorial ring, bubbles about a light-year long; first image after the December 1999 servicing mission, from a search summary). Data conflict: dist_ly 5,983 (SIMBAD, Gaia-based); NASA says about 5,000, the data's own note lists 4.1 to 6.8 kly. The age (10,000 years) is in the caption and left out.

### ngc-3132 (planetary nebula, Vela)
Target: `universe/deep-sky/ngc-3132.json`
- fact: The Southern Ring Nebula, a planetary nebula in Vela, about 2,500 light-years away.
- bio: It was one of the first targets Webb released in 2022. A follow-up study by a team of nearly 70 astronomers, in Nature Astronomy, found that the star that cast off the gas about 2,500 years ago, now a white dwarf of about half the Sun's mass, sits in a veil of dust. One companion is thought to have stripped gas from it, and others may have carved its arcs. The team counts four or five stars in the system, one perhaps hidden in the dusty disc.
- links: NASA/ESA release (https://www.eurekalert.org/news-releases/973668, core)
- Characters: 529
- Sources: EurekAlert 973668 (fetched: Nature Astronomy 8 Dec 2022, 2,500 ly, ejected about 2,500 years ago, half-solar-mass white dwarf, four or five stars, dusty disc), a search summary for the 'nearly 70 astronomers' count. The Webb release page itself returned 404. The data names the object Eight-Burst Nebula; the text uses the popular name. No conflict: caption 2,500, data 2,471.

### ngc-3324 (open cluster and nebula, Carina)
Target: `universe/deep-sky/ngc-3324.json`
- fact: An open cluster and nebula in Carina, near the Carina Nebula, about 7,900 light-years away; its edge is Webb's Cosmic Cliffs.
- bio: James Dunlop catalogued it in 1826. The cavity is hollowed out by ultraviolet radiation and stellar winds from massive, hot, young stars above the top of the image, and the tallest peaks are about 7 light-years high. As the bright rim advances into the cloud, the pressure it exerts is thought to collapse material into new stars. Webb reveals hundreds of hidden stars there. The nebula IC 2599 around it is nicknamed the Gabriela Mistral Nebula.
- links: ESA/Webb (https://esa.int/Science_Exploration/Space_Science/Webb/Webb_reveals_Cosmic_Cliffs_a_glittering_landscape_of_star_birth, core); Wikipedia (https://en.wikipedia.org/wiki/NGC_3324, intro)
- Characters: 571
- Sources: ESA Webb 'Cosmic Cliffs' page (fetched: 7,600 ly, 7 ly peaks, UV and winds hollow the cavity, ionisation front triggers collapse, hundreds of hidden stars), S-WP-NGC3324 (Dunlop 1826, IC 2599 / Gum 31, Gabriela Mistral Nebula). Data conflict: dist_ly 7,890 (Hunt and Reffert 2023) vs the note's Cantat-Gaudin value of 2,389 pc = 7,792 ly (so 7,890 is not that value; the H&R figure was not fetched); caption and ESA 7,600; Wikipedia 9,100. Text follows the data. 'IC 2599' as the Gabriela Mistral Nebula is Wikipedia only.

### ngc-3372 (star-forming region, Carina)
Target: `universe/deep-sky/ngc-3372.json`
- fact: The Carina Nebula, a giant star-forming region in the southern sky, about 8,500 light-years away.
- bio: It covers about two degrees of sky, four full Moons across. Hubble's 2007 panorama is a mosaic of 48 frames from its Advanced Camera for Surveys, showing a landscape sculpted by the winds and ultraviolet radiation of massive stars. In the 1840s the star Eta Carinae erupted and for a time ranked second-brightest in the sky; the dust it threw out now screens part of the nebula from its light. The nebula was one of five targets for Webb's first science images, in 2022.
- links: ESA/Hubble (https://esahubble.org/images/heic0707a/, core); Wikipedia (https://en.wikipedia.org/wiki/Carina_Nebula, intro)
- Characters: 567
- Sources: ESA/Hubble heic0707a (fetched: 48-frame ACS mosaic, winds and UV of the monster stars; it says 7,500 ly), S-WP-Carina (2 degrees, Eta Carinae 1840s eruption, second-brightest star, dust screening, Webb's five first targets). Data conflict: dist_ly 8,545 (SIMBAD, Kuhn 2019 parallax); caption and ESA 7,500; the carina-nebula overlay says 8,500. Duplicate entity: this is the same nebula as carina-nebula; the text avoids Lacaille, Trumpler and the Mystic Mountain, which that overlay has, but the two pages still describe one object.

### ngc-4038-4039 (interacting galaxies, Corvus)
Target: `universe/deep-sky/ngc-4038-4039.json`
- fact: The Antennae Galaxies, two spiral galaxies in the middle of a collision in Corvus, about 69 million light-years away.
- bio: William Herschel discovered them in 1785. ESA/Hubble says the two galaxies began to merge a few hundred million years ago, and their long tidal tails, which give the pair its name, formed 200 to 300 million years ago. In Hubble's 2006 image nearly half the faint objects are young clusters. Only about 10 per cent of the new super star clusters should survive 10 million years, but around 100 of the most massive are expected to become ordinary globular clusters.
- links: ESA/Hubble (https://esahubble.org/news/heic0615/, core); Wikipedia (https://en.wikipedia.org/wiki/Antennae_Galaxies, intro)
- Characters: 580
- Sources: ESA/Hubble heic0615 (fetched: merging a few hundred million years ago, tails 200 to 300 million years, nearly half the faint objects young clusters, 10 per cent survive, about 100 become globulars, ACS 2006), S-WP-Antennae (Herschel 1785). ESA's 'nearest and youngest pair' superlative is left out. Data conflict: dist_ly 68.6 Mly (Cosmicflows-4); Wikipedia 71.8 Mly (22 Mpc). Fine for 'about 69'.

### ngc-5139 (globular cluster, Centaurus)
Target: `universe/deep-sky/ngc-5139.json`
- fact: A massive globular cluster in Centaurus, about 18,000 light-years away, widely thought to be the core of a stripped dwarf galaxy.
- bio: Ptolemy listed it as a star around 150 AD, Edmond Halley as a non-stellar object in 1677, and James Dunlop recognised a globe of stars in 1826. N-body fits give about 4 million solar masses. Unlike most globular clusters, its stars span a range of ages and compositions, so it did not form all at once. In 2024 Häberle and colleagues reported fast-moving stars near its centre that imply a black hole of at least 8,200 solar masses; the claim has been questioned.
- links: Wikipedia (https://en.wikipedia.org/wiki/Omega_Centauri, intro); Baumgardt (https://people.smp.uq.edu.au/HolgerBaumgardt/globular/fits/ngc5139.html, core)
- Characters: 592
- Sources: S-WP-OmegaCen (Ptolemy, Halley 1677, Dunlop 1826, range of ages and metallicities, dwarf-galaxy core), arXiv 2405.06015 (fetched: Haeberle et al., fast-moving stars, lower limit 8,200 solar masses), Baumgardt N-body table (fetched: 5,430 pc, 3.94 million solar masses). 'The claim has been questioned' rests on one Wikipedia sentence; the contesting papers were not fetched. The 'largest globular cluster' superlative is left out. Data conflict: caption 17,000 ly, data 17,710 (label '~18,000'); text 'about 18,000'.

### ngc-6302 (planetary nebula, Scorpius)
Target: `universe/deep-sky/ngc-6302.json`
- fact: The Butterfly Nebula, a planetary nebula in Scorpius, about 2,400 light-years away.
- bio: Hubble's Wide Field Camera 3 imaged it in 2009, soon after the last servicing mission. That year Szyszka and colleagues identified the central star, a white dwarf of about 0.64 solar masses with an estimated temperature of 200,000 to 220,000 kelvin. NASA says the lobes formed about 2,250 years ago, with gas leaving at over a million miles an hour, and the dusty ring at its waist earlier, 5,000 to 2,900 years ago. Estimates of the distance range from about 2,400 to 4,000 light-years.
- links: NASA Hubble (https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-69/, core); Wikipedia (https://en.wikipedia.org/wiki/NGC_6302, intro)
- Characters: 570
- Sources: NASA Caldwell 69 page (fetched: lobes 2,250 years ago, over a million mph, torus 5,000 to 2,900 years ago, distance 4,000 ly), S-WP-NGC6302 (Szyszka et al. 2009: 0.64 solar masses), a search summary of arXiv 0909.5143 (T = 200,000 K, a second estimate 220,000 K; paper not fetched). Data conflict: dist_ly 2,433 (SIMBAD, Szyszka 2010 per bibcode); NASA 4,000; Wikipedia 3,400; the bio states the range. NASA gives Herschel 1826 as discoverer while Wikipedia starts in 1888; the text names neither. The caption's 'past 20,000 C' is not repeated.

### ngc-6543 (planetary nebula, Draco)
Target: `universe/deep-sky/ngc-6543.json`
- fact: The Cat's Eye Nebula, a planetary nebula in Draco, about 4,500 light-years away.
- bio: William Herschel discovered it in 1786. In 1864 William Huggins studied its spectrum and showed that it is glowing gas, not a cluster of stars. Hubble images show eleven or more concentric rings around the core, each holding about as much mass as all the planets of the Solar System. A 2001 analysis found that the shells were shed about every 1,500 years. Why remains unsolved; magnetic cycles, orbiting companions and pulsations have each been proposed.
- links: ESA (https://www.esa.int/Science_Exploration/Space_Science/Cat_s_Eye_Nebula_NGC_65432, core); Wikipedia (https://en.wikipedia.org/wiki/Cat%27s_Eye_Nebula, intro)
- Characters: 535
- Sources: S-WP-CatsEye (Herschel 15 Feb 1786, Huggins 1864), ESA Cat's Eye page (fetched: eleven or more rings, 1,500-year pulses, each ring as massive as all the planets, magnetic cycles / companions / pulsations, unsolved), Balick et al. 2001 abstract at IOP (fetched: nine rings, 1,500 years). Data conflict: dist_ly 4,455 (SIMBAD, Gaia-based); Wikipedia 3,300; ESA/Hubble heic0414a 3,000. Text follows the data. The caption's superlative ('most intricate') is not repeated.

### ngc-7293 (planetary nebula, Aquarius)
Target: `universe/deep-sky/ngc-7293.json`
- fact: The Helix Nebula, a planetary nebula in Aquarius, about 650 light-years away.
- bio: Karl Ludwig Harding discovered it, most likely before 1824. It is a few light-years across, and its expansion rate gives an age of roughly 10,000 years. It holds tens of thousands of cometary knots, first seen in this nebula, and a white dwarf at its centre. In 2007 Spitzer found dust glowing close to that white dwarf, about 35 to 150 astronomical units away, and astronomers proposed that comets which survived the star's death are colliding and kicking up the dust.
- links: Spitzer (https://www.spitzer.caltech.edu/image/ssc2007-03a-comets-kick-up-dust-in-helix-nebula, core); Wikipedia (https://en.wikipedia.org/wiki/Helix_Nebula, intro)
- Characters: 546
- Sources: S-WP-Helix (Harding before 1824, about 10,600 yr expansion age, cometary knots, Gaia 655 ly), Spitzer ssc2007-03a (fetched: 700 ly, dust at the white dwarf, comets; the 35 to 150 AU range is from a search summary of the same release). Wikipedia says the knots number about 40,000 and were first discovered in this nebula; the text says 'tens of thousands'. Data: dist_ly 651 (SIMBAD, Gaia), caption 700; consistent.

### ngc-7635 (emission nebula, Cassiopeia)
Target: `universe/deep-sky/ngc-7635.json`
- fact: The Bubble Nebula, an emission nebula in Cassiopeia, about 9,100 light-years away.
- bio: William Herschel discovered it in 1787. The bubble is blown by the wind of the hot young star BD+60 2522, and it sits inside a giant molecular cloud that glows in the star's ultraviolet light. Sources disagree on its scale: NASA gives the bubble as 7 light-years across and the star as about 45 solar masses; ESA/Hubble gives about 10 light-years and 10 to 20 solar masses. Hubble's 2016 image is a mosaic of four Wide Field Camera 3 pictures that frame the whole object.
- links: ESA/Hubble (https://esahubble.org/news/heic1608/, core); Wikipedia (https://en.wikipedia.org/wiki/Bubble_Nebula, intro)
- Characters: 553
- Sources: ESA/Hubble heic1608 (fetched: 10 to 20 solar masses, about 10 ly, 8,000 ly, molecular cloud, four-image mosaic), S-WP-BubbleNebula (Herschel 1787, BD+60 2522, about 44 solar masses), a search summary of the NASA 2016 release (7 ly, 45 solar masses; the NASA page itself was not fetched). Conflict between ESA and NASA is stated in the text. Data conflict: dist_ly 9,132 (SIMBAD, 2025 paper); ESA 8,000; Wikipedia 7,100 to 11,000.

### perseus-cluster (galaxy cluster, Perseus)
Target: `universe/deep-sky/perseus-cluster.json`
- fact: A rich cluster of galaxies in Perseus, about 240 million light-years away, bathed in multimillion-degree gas.
- bio: The gas between its galaxies is hot enough to shine in X-rays. At the centre, NGC 1275 hosts the radio source 3C 84, whose bubbles show up as holes in the X-ray image. A deep Chandra observation in 2003, led by Andrew Fabian, found ripples in the gas and a weak shock; the team argued that these sound waves carry energy that offsets the gas's cooling. Euclid's image also shows faint light between the central galaxies, from stars flung out by past galaxy interactions.
- links: ESA Euclid (https://www.esa.int/Science_Exploration/Space_Science/Euclid/Euclid_s_view_of_the_Perseus_cluster_of_galaxies, core); Wikipedia (https://en.wikipedia.org/wiki/Perseus_Cluster, intro)
- Characters: 579
- Sources: ESA Euclid page (fetched: 1,000 galaxies, 100,000 background, 240 Mly, intracluster light from stars flung out), S-WP-Perseus (NGC 1275, 3C 84, holes in X-ray image), Fabian et al. 2003 arXiv astro-ph/0306036 (fetched: ripples, weak shock, sound waves offset cooling). The 9.6-million-year period and '57 octaves' are Wikipedia only and left out. 'Brightest cluster in X-rays' left out (Wikipedia only). The caption's galaxy counts are not repeated. The data has no mag or size_arcmin conflicts.

### rho-ophiuchi (star-forming region, Ophiuchus)
Target: `universe/deep-sky/rho-ophiuchi.json`
- fact: A cloud complex of gas and dust in Ophiuchus where Sun-like stars are forming, about 420 light-years away.
- bio: Webb's first-anniversary image, released in July 2023, shows about 50 young stars, all around the Sun's mass or less except the more massive S1. With no foreground stars in the way, Webb sees it in unusual detail. Jets of molecular hydrogen, shown in red, cross the field. Shadows cast by discs of dust around young stars mark where planets may form, and dust envelopes hide protostars in the darkest patches. Project scientist Klaus Pontoppidan called this a very brief stage in a star's life.
- links: NASA JPL (https://www.jpl.nasa.gov/news/webb-celebrates-first-year-of-science-with-close-up-on-birth-of-sun-like-stars/, core)
- Characters: 600
- Sources: NASA JPL (fetched: 390 ly, about 50 young stars, S1, jets in red, shadows of discs, dust envelopes, Pontoppidan). Data conflict: dist_ly 417 (Zucker 2020, bibcode 2020A&A...633A..51Z); JPL 390; caption 430. Text follows the data. 'Nearest star-forming region' is NASA's phrase and is not repeated, because the caption has it.

### serpens-nebula (star-forming region, Serpens)
Target: `universe/deep-sky/serpens-nebula.json`
- fact: A dense nest of newly forming stars in Serpens, about 1,300 light-years away.
- bio: Webb's 2024 near-infrared image shows a cluster only about 100,000 years old, in which some stars are expected to grow to the Sun's mass. In the top left corner a group of protostellar outflows all point the same way; these jets show as clumpy red streaks, shock waves where they hit gas and dust. Outflows in one region normally point in many directions, so the alignment is unusual. The red colour marks molecular hydrogen and carbon monoxide.
- links: ESA/Webb (https://esawebb.org/images/weic2415a/, core)
- Characters: 522
- Sources: esawebb weic2415a (fetched: 1,300 ly, about 100,000 years, aligned outflows, red streaks as shocks, molecular hydrogen and CO), a search summary for the 'orientations usually vary' sentence (same release). The caption's 'crystalline dust' was not found in the ESA page and is not repeated. No conflict.

### sn-1572 (supernova remnant, Cassiopeia)
Target: `universe/deep-sky/sn-1572.json`
- fact: Tycho's Supernova Remnant, the debris of a star that exploded in Cassiopeia in 1572, about 9,000 light-years away.
- bio: The star appeared in early November 1572, peaked near magnitude -4 and stayed visible into early 1574. Tycho Brahe's measurements, compared with those of Jerónimo Muñoz, showed it lay beyond the Moon. The remnant is about 8 arcminutes across. In 2008 Krause and colleagues took a spectrum of the supernova's light echo, light scattered by dust centuries after the blast, and showed it was a normal Type Ia explosion, the thermonuclear destruction of a white dwarf.
- links: Wikipedia (https://en.wikipedia.org/wiki/SN_1572, intro); arXiv (https://arxiv.org/abs/0810.5106, core)
- Characters: 578
- Sources: S-WP-SN1572 (November 1572, magnitude -4, 8 arcminutes, Munoz comparison, distance 2.5 to 3 kpc), Krause et al. 2008 arXiv 0810.5106 (fetched: light-echo spectrum, normal Type Ia). Data conflict: dist_ly 9,230 (SIMBAD, Ruiz-Lapuente 2004); Wikipedia 8,000 to 9,800; caption 10,000. Text says 'about 9,000'. The Chandra X-ray image is in the caption.

### v838-mon (luminous red nova, Monoceros)
Target: `universe/deep-sky/v838-mon.json`
- fact: A star in Monoceros that erupted in 2002, about 20,000 light-years away.
- bio: The outburst began in January 2002, and the star reached a visual peak in early February. It did not shed its outer layers as a nova does; it swelled into a cool supergiant. The ring-like echoes are light from the eruption reaching successive layers of dust, so they show the dust's shape and not matter moving outward. Howard Bond's team used Hubble images to place it about 20,000 light-years away. It is now classed as a luminous red nova, thought to follow a merger of two stars.
- links: Wikipedia (https://en.wikipedia.org/wiki/V838_Monocerotis, intro)
- Characters: 555
- Sources: S-WP-V838Mon (6 Jan 2002, peak 6.75 on 6 Feb, luminous red nova, merger, light echo shows dust geometry), a search summary of the 2003 Hubble release and Physics World (Bond et al. Nature March 2003: 20,000 ly, no ejected shell, cool supergiant). Luminosity (600,000 to about a million Suns) and radius (800 to 1,570 solar radii) differ between sources and are left out. The Bond paper was not fetched.

### wr-124 (Wolf-Rayet star, Sagitta)
Target: `universe/deep-sky/wr-124.json`
- fact: A Wolf-Rayet star in Sagitta, about 21,000 light-years away, surrounded by a nebula of its own ejected gas.
- bio: The nebula, M1-67, is about 10 light-years across. ESA says it formed from random, asymmetric ejections rather than uniform shells, and Webb's image shows clumps like tadpoles swimming toward the star with tails blown back by its wind. The star has about 30 times the Sun's mass and has shed about 10 solar masses so far. Dust forms as the ejected gas cools; how much is made is a question Webb helps address. ESA/Webb gives the distance as 15,000 light-years.
- links: ESA/Webb (https://www.esa.int/Science_Exploration/Space_Science/Webb/Webb_captures_rarely_seen_prelude_to_a_supernova, core)
- Characters: 567
- Sources: ESA 'Webb captures rarely seen prelude to a supernova' (fetched: 15,000 ly, 30 solar masses, 10 shed, dust), esawebb weic2307a (fetched: 10 ly, asymmetric ejections, tadpoles). Data conflict: dist_ly 20,801 (SIMBAD, Gaia-based, with a 2.2 to 20.8 kly spread in the note); ESA 15,000; caption 21,000. The fact line follows the data, the bio gives ESA's figure. Mass figures are ESA's, one source. Wikipedia WR 124 not fetched, so not linked.

## Data conflicts (summary)

- Distances where a cited source differs from the data file: ngc-1300 (45 vs 60 to 69 Mly), ngc-1365 (61 vs 56 Mly; the caption says 56), ngc-2014-2020 (166,340 vs 163,000), ngc-2264 (2,284 vs 2,500 ESA), ngc-2392 (5,983 vs 5,000 NASA), ngc-3324 (7,890 vs 7,600 caption; also the file's own note computes 7,792 from 2,389 pc), ngc-3372 (8,545 vs 7,500 caption), ngc-6302 (2,433 vs 3,400 / 4,000), ngc-6543 (4,455 vs 3,000 to 3,300), ngc-7635 (9,132 vs 8,000 ESA), rho-ophiuchi (417 vs 390 JPL, 430 caption), sn-1572 (9,230 vs 10,000 caption), wr-124 (20,801 vs 15,000 ESA).
- Captions to fix at integration: ngc-1300 "200,000-light-year bar" (no source; the galaxy is about 130,000 ly across per Wikipedia), ngc-5139 caption distance 17,000 vs data 17,710, ngc-1365 caption 56 Mly vs data 61 Mly, sn-1572 caption 10,000 vs data 9,230, ngc-3324 and ngc-3372 caption distances vs data.
- Source disagreements stated in the text: ngc-1300 (distance range), ngc-6302 (distance range), ngc-7635 (NASA vs ESA bubble size and star mass), wr-124 (ESA 15,000 ly).
- Duplicate entity: ngc-3372 and carina-nebula.
- Discoverer conflict: ngc-6302 (NASA Herschel 1826 vs Wikipedia NGC 1888): no discoverer named.

## Not sourced, left out

- NGC 1365: the "at least 84 per cent" spin figure (search summary only); the 2013 Nature paper itself.
- NGC 5139: any star count (Wikipedia 10 million, one source); the largest-globular superlative; the contesting analyses of the 2024 black-hole claim.
- NGC 6302: central-star details beyond Szyszka et al. (abstract not fetched); the crystalline-silicate and ice detections.
- NGC 7293: the 2024 to 2025 papers on a planet or accreted planetary remnants.
- Perseus Cluster: the 9.6-million-year ripple period, the X-ray brightness ranking, mass.
- SN 1572: Chandra results, expansion speed and distance papers.
- V838 Mon: luminosity and radius numbers, the B3V companion, the Bond 2003 paper.
- WR 124: nothing beyond ESA's release; no primary paper.
- All objects: magnitudes, months and "best seen" statements; cultural and naming history not in a fetched source.

## NOT VERIFIED

- Every number from a Wikipedia article is as the summarising fetch tool reported it; none was checked against the paper it cites unless named.
- Pages given as "search summary" were not fetched: NASA/STScI 2005 NGC 1300 release, Hubble heic0402 / heic0414 pdf (the Cat's Eye rings come from the ESA page and the IOP abstract, both fetched), Gaia-ESO CSI 2264, NASA 2016 Bubble release, the Webb Cosmic Cliffs NASA page (404), the Southern Ring Webb release page (404), the Szyszka paper, the Risaliti paper, the Bond paper.
- No source was fetched for "Webb chose Carina as one of five first targets" beyond Wikipedia, or IC 2599 as the Gabriela Mistral Nebula beyond Wikipedia.
- Whether hosts of the links are in `static/data/source-logos.json` was not checked; nssdc.gsfc.nasa.gov, iopscience and arxiv in particular may need entries.
