# Deep text, batch 3 (drafts)

Drafts only. Nothing here is in `i18n-src/` or `static/` yet. 2026-11-12, branch `tech-debt/0.9.9`.

## Shape and selection

- Same shape as batches 1 and 2: new overlay `i18n-src/en-US/universe/deep-sky/<id>.json` with `fact` (one line) and `bio` (the rest). Counts are `fact` + `bio` characters, whitespace included (measured with a script file: all 50 are between 400 and 600).
- Selection: the objects of `static/data/universe/deep-sky-objects.json` that are in neither batch 1 nor batch 2 number 71. Taken: all 27 without a photo (m81 to m110, the end of the Messier run, in file order), then the first 23 with a photo and a short caption in file order (30-doradus to ngc-604). The 21 photo objects after that (ngc-1300 to wr-124) are left for batch 4; the deep-sky list is not yet used up, so no Local Group members were needed.
- For the 23 photo objects the existing caption (`i18n-src/en-US/deep-sky.json`) was read first; the text adds what the caption does not say (history, structure, numbers) and does not repeat it.
- Source tags: S-NASA-Mn = `https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-n/` (fetched through a summarising fetch tool, not read line by line); NASA pages returned 404 for M93, M97, M103. S-WP-name = the Wikipedia article (fetched, used as a pointer to the papers it cites; the papers were not fetched unless named). S-CG20 = Cantat-Gaudin et al. 2020, VizieR J/A+A/640/A1 table1 (fetched). S-BAU = Baumgardt's globular-cluster table, https://people.smp.uq.edu.au/HolgerBaumgardt/globular/parameter.html (fetched; kpc x 3,262 = light-years). S-SRCH = a web search result summary (named in the object's sources).
- Virgo Cluster members use one convention: the cluster centre is 53.8 +/- 0.3 million light-years away (Mei et al. 2007, via S-WP-Virgo); members are "about 55 million" unless a source gives a different value for that galaxy.
- No text states a magnitude, a month or a "best seen" time. Every NASA superlative is either attributed to NASA, backed by a second source, or left out. Black-hole masses carry a source or are left without a number.

## Deep-sky objects

### m81 (spiral galaxy, Ursa Major)
Target: `universe/deep-sky/m81.json`
- fact: A large spiral galaxy in Ursa Major, about 12 million light-years away, the main member of the M81 Group.
- bio: Johann Elert Bode found it in 1774, and Pierre Méchain and Charles Messier identified it again in 1779. Cepheid variable stars measured with Hubble place it near 12 million light-years. Its close passes by M82 and NGC 3077 have pulled hydrogen gas out of all three galaxies into long filaments. NASA gives its central black hole as about 70 million solar masses. In binoculars it is a faint patch in the same field as M82.
- Sources: S-NASA-M81 (Bode 1774, black hole, binoculars); S-WP-M81 (Cepheid distance 11.99 +/- 0.16 Mly; Méchain / Messier 1779; gas filaments; group of 34).

### m82 (starburst galaxy, Ursa Major)
Target: `universe/deep-sky/m82.json`
- fact: The Cigar Galaxy, a starburst galaxy in Ursa Major about 12 million light-years away, next to M81.
- bio: Bode found it in 1774 together with M81. Stars are forming in its centre about ten times faster than in the whole Milky Way, a burst NASA links to encounters with M81. Radiation and supernova explosions from the young stars drive a flow of gas out of the disc, a galactic wind. NASA expects the burst to fade, probably within a few tens of millions of years. Chandra has seen a variable X-ray source that may be an intermediate-mass black hole.
- Sources: S-NASA-M82 (all but the last sentence); S-WP-M82 (Karachentsev 2006 distance 11.4-12.4 Mly; Barker 2008 wind; Patruno 2006: 200 to 5,000 solar masses, a candidate). Papers not fetched.

### m83 (barred spiral galaxy, Hydra)
Target: `universe/deep-sky/m83.json`
- fact: The Southern Pinwheel, a barred spiral galaxy in Hydra about 15 million light-years away.
- bio: Nicolas-Louis de Lacaille found it from the Cape of Good Hope in 1752, and Charles Messier added it to his catalogue in 1781. Six supernovae have been recorded in it. Hubble images resolve hundreds of thousands of its stars and thousands of its star clusters, and show bubbles blown by about 300 supernova remnants, which help astronomers study how exploding stars spread new elements. The small galaxy NGC 5253 probably passed close to it within the past billion years.
- Sources: S-NASA-M83 (Lacaille 1752, 15 Mly, Hubble counts, about 300 remnants); S-WP-M83 (Messier 1781; six supernovae; NGC 5253 "likely" interaction). Papers not fetched.

### m84 (elliptical galaxy, Virgo)
Target: `universe/deep-sky/m84.json`
- fact: An elliptical galaxy in the Virgo Cluster, about 55 million light-years away, with a supermassive black hole at its centre.
- bio: Charles Messier found it in 1781, one of nine objects (M84 to M92) he added to his catalogue in one night. Hubble spectra show gas circling the centre at about 1.4 million kilometres an hour, which points to a black hole; estimates of its mass range from about 0.9 to 1.5 billion Suns. Radio jets run out of the core. Dust lanes cross the nucleus, and supernovae seen there include ones in 1957 and 1991.
- Sources: S-NASA-M84 (Messier 1781, 880,000 mph gas, warped dust lanes, supernovae 1957 and 1991; night of nine objects from S-NASA-M91); S-WP-M84 (jets); Walsh et al. 2010 (https://arxiv.org/pdf/1008.0005); Maciejewski & Binney 2001.

### m85 (lenticular galaxy, Coma Berenices)
Target: `universe/deep-sky/m85.json`
- fact: A lenticular galaxy in Coma Berenices, on the edge of the Virgo Cluster, about 55 million light-years away.
- bio: Pierre Méchain discovered it in 1781. Astronomers class it as lenticular, a type between spiral and elliptical, though some authors call it elliptical. Shells and ripples in its outer parts are attributed to a merger four to seven billion years ago, and its centre holds younger stars than the rest. It is interacting with the spiral NGC 4394 and the small elliptical MCG 3-32-38. Hubble's image combines infrared, visible and ultraviolet light.
- Sources: S-NASA-M85 (Méchain 1781, 60 Mly, interaction, merger 4-7 Gyr ago, young centre, Hubble bands); S-WP-M85 (shells and ripples, "outskirts of the Virgo Cluster"). NASA's 2006 supernova line left out (not confirmed in S-WP-M85).

### m86 (lenticular galaxy, Virgo)
Target: `universe/deep-sky/m86.json`
- fact: A lenticular or elliptical galaxy in the Virgo Cluster, about 55 million light-years away, moving toward us.
- bio: Charles Messier found it in 1781. Its light is blueshifted: it approaches the Milky Way at about 244 kilometres a second, a rarity among galaxies, because both are falling toward the centre of the Virgo Cluster; part of the blueshift is the Milky Way's own motion toward Virgo. As it moves through the cluster's hot gas, Chandra sees a long trail of X-ray emitting gas stripped from it. Filaments of ionised gas link it to the spiral NGC 4438, which suggests a past encounter. It has about 3,800 globular clusters.
- Sources: S-NASA-M86 (Messier 1781, 3,800 clusters); S-WP-M86 (52 +/- 3 Mly; -244 +/- 5 km/s; ram-pressure stripping; filaments to NGC 4438, "may have stripped"). Papers not fetched.

### m87 (elliptical galaxy, Virgo)
Target: `universe/deep-sky/m87.json`
- fact: A giant elliptical galaxy in the Virgo Cluster, about 54 million light-years away, whose black hole was imaged in 2019.
- bio: Charles Messier listed it in 1781 as a nebula. In 1918 Heber Curtis noticed a straight ray reaching out from its core, the jet of a black hole. In 2019 the Event Horizon Telescope produced the first image of a black hole's shadow and measured its mass at about 6.5 billion Suns. An estimated 12,000 globular clusters surround M87, against 150 to 200 for the Milky Way.
- Sources: S-NASA-M87 (Messier 1781, 54 Mly, jet); S-WP-M87 (16.4 +/- 0.5 Mpc, 53.5 Mly; EHT 6.5 +/- 0.2 +/- 0.7 billion, April 2019; Curtis 1918; 2006 survey 12,000 +/- 800 clusters). Papers not fetched. "First image" is the EHT collaboration's own description.

### m88 (spiral galaxy, Coma Berenices)
Target: `universe/deep-sky/m88.json`
- fact: A spiral galaxy in Coma Berenices, in the Virgo Cluster, about 55 million light-years away.
- bio: Charles Messier found it in 1781, on the same night as M84 to M92. Its spiral arms are regular and tightly wound, and the arms can be followed all the way down to the core. The nucleus is active, with a supermassive black hole at its centre. M88 will make its closest approach to M87 in about 200 to 300 million years. It is tilted about 64 degrees to our line of sight.
- Sources: S-NASA-M88 (Messier 1781, night of nine, 63 Mly, active nucleus); S-WP-M88 ("50 to 60 million", Seyfert 2, arms followed to the core, tilt 64 degrees). NASA's 100 million and Wikipedia's 80 million solar masses disagree, so no mass is given.

### m89 (elliptical galaxy, Virgo)
Target: `universe/deep-sky/m89.json`
- fact: An almost round elliptical galaxy in the Virgo Cluster, about 55 million light-years away, with faint shells and plumes.
- bio: Charles Messier found it in 1781. Its outer parts show shells and plumes of stars, traces of past mergers. Chandra images show two ring-like structures of hot gas in its nucleus, which suggest an outburst there one to two million years ago. A supermassive black hole sits at the centre, and a 2006 survey estimated around 2,000 globular clusters. In Hubble's image a separate edge-on spiral galaxy appears below M89's core.
- Sources: S-NASA-M89 (Messier 1781, 50 Mly, "almost exactly circular", black hole, edge-on spiral in the image); S-WP-M89 (shells and plumes; Chandra rings; 2,000 +/- 700 clusters). NASA's "first galaxy with an extended envelope" and the black-hole masses (NASA 1 billion, Wikipedia 480 million) left out.

### m90 (spiral galaxy, Virgo)
Target: `universe/deep-sky/m90.json`
- fact: A spiral galaxy in the Virgo Cluster, about 55 million light-years away, moving toward us.
- bio: Charles Messier found it in 1781. Its light is blueshifted by about 235 kilometres a second, so M90 is approaching us, one of a handful of Virgo Cluster galaxies that do. As it moves through the cluster's gas, much of its own interstellar gas has been stripped away, so star formation is cut back: it is called an anemic spiral, with smooth arms that lack the knots of active star formation. NASA's Hubble image shows its bright core and dusty disc.
- Sources: S-NASA-M90 (Messier 1781, 59 Mly, blueshift, gas stripping about 300 Myr ago, core and dusty disc); S-WP-M90 (-235 +/- 4 km/s, "anemic", ram-pressure stripping, blueshifts mostly near the Virgo Cluster). Papers not fetched.

### m91 (barred spiral galaxy, Coma Berenices)
Target: `universe/deep-sky/m91.json`
- fact: A barred spiral galaxy in the Virgo Cluster, about 55 million light-years away, that was lost for nearly two centuries.
- bio: Charles Messier listed it in 1781, one of nine objects (M84 to M92) from one night, but gave its position relative to the wrong object, so astronomers could not find it again. In 1969 the amateur William C. Williams matched it with NGC 4548. It has a conspicuous bar and little star formation for a spiral, which makes it an anemic galaxy. NASA lists it among the fainter objects of Messier's catalogue.
- Sources: S-NASA-M91 (Messier 1781, one of nine from one night, 60 Mly, anemic, faint); S-WP-M91 (position error, Williams 1969, 63 Mly).

### m92 (globular cluster, Hercules)
Target: `universe/deep-sky/m92.json`
- fact: A very old, metal-poor globular cluster in Hercules, about 27,700 light-years away.
- bio: Johann Elert Bode discovered it in 1777, and Charles Messier found it again independently in 1781. Baumgardt's catalogue puts its mass near 270,000 Suns. Its iron content is only about half a percent of the Sun's, the mark of stars that formed early in the Galaxy's history, and the stars are very old. In very dark skies it can be seen with the naked eye, and small telescopes resolve it into stars.
- Sources: S-BAU (8.50 +/- 0.07 kpc, 27,700 ly; mass 2.73 x 10^5); S-WP-M92 (Bode 1777, Messier 1781, [Fe/H] -2.32, naked eye); S-NASA-M92 (metal-poor, old). No age given: NASA says "almost the age of the Universe", Wikipedia 11 +/- 1.5 billion years.

### m93 (open cluster, Puppis)
Target: `universe/deep-sky/m93.json`
- fact: An open cluster in Puppis, about 3,300 light-years away and roughly 400 to 600 million years old.
- bio: Charles Messier discovered it in 1781, and Caroline Herschel found it again independently in 1783. The cluster is about 20 light-years across. Some observers have likened its outline to a starfish, others to an arrowhead. Astronomers have found dozens of variable stars in it, including delta Scuti and gamma Doradus stars, whose pulsations reveal their interiors. It is easy to see in binoculars.
- Sources: S-CG20 (NGC 2447: 1018 pc, 3,320 ly; logt 8.76, 575 Myr); S-WP-M93 (Messier 1781, Herschel 1783, radius 10 ly, age 387 Myr, shapes, 54 variables).

### m94 (spiral galaxy, Canes Venatici)
Target: `universe/deep-sky/m94.json`
- fact: A spiral galaxy in Canes Venatici, about 16 million light-years away, with a bright ring of star formation around its centre.
- bio: Pierre Méchain discovered it in 1781, and Charles Messier catalogued it two days later. A ring about 5,400 light-years across around its core forms stars at a high rate. Beyond it, faint outer arms stretch far out, and NASA says they have tripled the galaxy's known diameter. A 2008 study argued that M94 has little or no dark matter, a result that remains debated.
- Sources: S-NASA-M94 (Méchain 1781, 16 Mly, starburst ring, faint arms); S-WP-M94 (Messier two days later; ring 5,400 ly; 2008 study "somewhat controversial"). Outer-ring structure, 2009 study: Wikipedia only.

### m95 (barred spiral galaxy, Leo)
Target: `universe/deep-sky/m95.json`
- fact: A barred spiral galaxy in Leo, about 33 million light-years away, with a ring of star formation around its bar.
- bio: Pierre Méchain discovered it in 1781, and Charles Messier catalogued it four days later. Hubble shows its arms wound tightly around the core, almost into a circle, and a ring packed with young blue stars. A reddish band of dust crosses the barred centre and reaches into the arms. M95 belongs to the M96 Group with M96 and M105, and a supernova, SN 2012aw, exploded in it in 2012.
- Sources: S-NASA-M95 (Méchain 1781, 33 Mly, tight arms, dust band, group); S-WP-M95 (Messier four days later, SB(r)b, SN 2012aw). Progenitor-mass figure in Wikipedia (12.5 solar masses) left out (other studies give different values; not checked).

### m96 (spiral galaxy, Leo)
Target: `universe/deep-sky/m96.json`
- fact: A spiral galaxy in Leo, about 31 to 35 million light-years away, one of the brightest members of the M96 Group.
- bio: Pierre Méchain discovered it in 1781, and Charles Messier confirmed it four days later. M96 is about as large and massive as the Milky Way, but lopsided: its dust and gas are spread unevenly, and its core sits off the midpoint. NASA says the pull of its neighbours in the group is thought to have shaped it. A ring of pink hydrogen gas surrounds young massive stars in its outer parts. A supernova, SN 1998bu, exploded in it in 1998.
- Sources: S-NASA-M96 (Méchain 1781, Messier four days later, 35 Mly, offset core, ring of pink hydrogen, group); S-WP-M96 (31 Mly, 78,000 ly, SN 1998bu).

### m97 (planetary nebula, Ursa Major)
Target: `universe/deep-sky/m97.json`
- fact: The Owl Nebula, a planetary nebula in Ursa Major, about 2,000 to 2,800 light-years away.
- bio: Pierre Méchain discovered it in 1781, and Charles Messier added it to his catalogue weeks later. In 1848 William Parsons, Earl of Rosse, drew it with two dark patches like an owl's eyes, and the name stuck. The nebula is about 8,000 years old and has three nested shells; the inner one is a barrel tilted roughly 45 degrees to our line of sight. Its central star is condensing into a white dwarf of about 0.55 to 0.6 solar masses.
- Sources: S-WP-M97 (all: Méchain and Messier dates, Stanghellini 2008 2,030 ly vs Frew 2016 2,800 ly, 8,000 years, shells, central star 55-60% of a solar mass, Rosse 1848). NASA page: 404. Papers not fetched.

### m98 (spiral galaxy, Coma Berenices)
Target: `universe/deep-sky/m98.json`
- fact: A spiral galaxy in Coma Berenices, in the Virgo Cluster, about 44 million light-years away, moving toward us.
- bio: Pierre Méchain discovered it in 1781, and Charles Messier catalogued it about a month later. Its light is blueshifted, so it approaches us at roughly 140 kilometres a second. We see it tilted by about 74 degrees, nearly edge-on. It holds about 4.3 billion solar masses of neutral hydrogen, and its nucleus is of a transition kind, between a low-ionisation galactic nucleus and a region of star formation.
- Sources: S-NASA-M98 (Méchain 1781, 44 Mly, approaching, active nucleus); S-WP-M98 (a month later, 140 km/s, 74 degrees, 4.3 billion solar masses of hydrogen, transition nucleus). NASA's "one trillion stars" left out.

### m99 (spiral galaxy, Coma Berenices)
Target: `universe/deep-sky/m99.json`
- fact: The Coma Pinwheel, a grand-design spiral in the Virgo Cluster, about 50 to 55 million light-years away.
- bio: Pierre Méchain discovered it in 1781, and Charles Messier catalogued it soon after. In 2010 a transient called PTF 10fqs flared there, brighter than a nova but fainter than a supernova; it is classed as a luminous red nova, a kind of eruption whose origin is debated; a stellar merger is a leading explanation. Its arms are lopsided: one is more extended and less tightly wound. A hydrogen bridge to VIRGOHI21 was once read as a dark galaxy, but it may be debris from an encounter with NGC 4262.
- Sources: S-NASA-M99 (Méchain 1781, 55 Mly, grand-design, PTF 10fqs in 2010); S-WP-M99 (49 Mly; luminous red nova; VIRGOHI21 may be tidal debris from NGC 4262 280 Myr ago; lopsided arms).

### m100 (spiral galaxy, Coma Berenices)
Target: `universe/deep-sky/m100.json`
- fact: A grand-design spiral in the Virgo Cluster, about 55 million light-years away, whose Cepheid stars gave Hubble a distance to the Virgo Cluster.
- bio: Pierre Méchain discovered it in 1781. Hubble's Key Project resolved Cepheid variables in its arms; their pulsation periods reveal their true brightness, so they act as distance markers, and the result gave a distance of about 55 million light-years to a galaxy in the Virgo Cluster. Its centre is a starburst inside a small bar, where stars have been forming for at least 500 million years. Seven supernovae have been recorded in M100 since 1901.
- Sources: S-NASA-M100 (Méchain 1781, 56 Mly); S-WP-M100 (55 Mly from Hubble Key Project Cepheids; starburst for at least 500 Myr; seven supernovae, SN 1901B to SN 2020oi).

### m103 (open cluster, Cassiopeia)
Target: `universe/deep-sky/m103.json`
- fact: A young open cluster in Cassiopeia, about 8,000 light-years away and tens of millions of years old.
- bio: Pierre Méchain discovered it in 1781, and Charles Messier added it to his catalogue. The cluster is about 15 light-years across and has roughly 170 member stars. Its age is put between about 12 and 30 million years, depending on the study. A bright red giant lies near its centre, and the bright double star Struve 131 beside it is only a chance alignment, not a member.
- Sources: S-CG20 (NGC 581: 2502 pc, 8,160 ly; logt 7.44, 27.5 Myr); S-WP-M103 (Méchain 1781, 15 ly, 172 members, 12.6 Myr, red giant, Struve 131 not a member, 9,400 ly). NASA page: 404.

### m105 (elliptical galaxy, Leo)
Target: `universe/deep-sky/m105.json`
- fact: An elliptical galaxy in Leo, about 32 to 37 million light-years away, in the M96 Group.
- bio: Pierre Méchain discovered it in 1781, days after M95 and M96, but Charles Messier did not list it; it joined the catalogue in 1947, when Helen Sawyer Hogg found Méchain's letter describing it. Fast-moving stars at its centre, seen by Hubble, show a supermassive black hole, estimated at roughly 140 to 200 million solar masses. Though it looks dead, Hubble found young stars in it, and a huge ring of hydrogen gas surrounds it and its neighbour NGC 3384.
- Sources: S-NASA-M105 (Méchain, Hogg 1947, 32 Mly, black hole 200 million, young stars); S-WP-M105 (36.6 Mly; 1.4-2 x 10^8; hydrogen ring 650,000 ly radius around M105 and NGC 3384, star formation detected). Black-hole papers not fetched, so the mass is a range.

### m106 (spiral galaxy, Canes Venatici)
Target: `universe/deep-sky/m106.json`
- fact: A spiral galaxy in Canes Venatici, about 24 million light-years away, whose water masers give a direct distance.
- bio: Pierre Méchain discovered it in 1781. The galaxy hosts a water maser, a natural microwave beacon, in a disc orbiting its central black hole. The motions of these masers give the black hole's mass, about 40 million Suns, and a distance measured geometrically instead of from brightness. M106 also has two extra arms of hot gas, not stars, which NASA ascribes to the churning of matter around the black hole.
- Sources: S-NASA-M106 (Méchain 1781, 24 Mly, extra arms of hot gas); S-WP-M106 (23.7 +/- 1.5 Mly; 3.9 x 10^7 solar masses, Graham 2008; masers gave a direct distance). The maser-disc and "from the motions" wording is the writer's knowledge of Herrnstein et al. 1999, not fetched: reviewer to check. Wikipedia says the extra arms show in X-rays; NASA does not say wavelengths.

### m107 (globular cluster, Ophiuchus)
Target: `universe/deep-sky/m107.json`
- fact: A loosely packed globular cluster in Ophiuchus, about 18,000 light-years away.
- bio: Pierre Méchain found it in 1782, and William Herschel independently found it later. Charles Messier never listed it; Helen Sawyer Hogg added it to the catalogue in 1947. Baumgardt's catalogue gives it about 60,000 solar masses, well below the big globulars, and a loose structure that lets its stars show up one by one. At least 22 RR Lyrae variable stars are known in it, which astronomers use as distance markers.
- Sources: S-BAU (5.63 +/- 0.08 kpc, 18,400 ly; mass 6.12 x 10^4); S-NASA-M107 (Méchain 1782, Hogg 1947, not dense); S-WP-M107 (Herschel 1793, 22 RR Lyrae). Both "last object" claims (NASA, Wikipedia) left out: M108 to M110 were added later.

### m108 (barred spiral galaxy, Ursa Major)
Target: `universe/deep-sky/m108.json`
- fact: The Surfboard Galaxy, a barred spiral in Ursa Major seen almost edge-on, about 46 million light-years away.
- bio: Pierre Méchain found it in 1781. Charles Messier never catalogued it; Owen Gingerich added it to the list in the 20th century. Young star clusters and gas shells driven by star formation and supernovae appear in Hubble's view. A supermassive black hole is thought to sit at its centre, and Chandra found 83 X-ray sources, one of them suspected to be an intermediate-mass black hole feeding on gas.
- Sources: S-NASA-M108 (Méchain 1781 or 1782, 46 Mly, supershells, Chandra source); S-WP-M108 (83 X-ray sources; "Surfboard"). Papers not fetched.

### m109 (barred spiral galaxy, Ursa Major)
Target: `universe/deep-sky/m109.json`
- fact: A barred spiral galaxy in Ursa Major, roughly 60 to 80 million light-years away, the brightest member of its group.
- bio: Pierre Méchain discovered it in 1781, and it was added to the Messier list only in the 20th century. It has a bright core with a bar and a faint halo, and is dim enough that light-polluted skies hide it. Three small satellite galaxies, UGC 6923, UGC 6940 and UGC 6969, may shape its structure. A Type Ia supernova, SN 1956A, was seen in it in 1956. It leads a group of 50 or more galaxies, the M109 Group.
- Sources: S-NASA-M109 (Méchain 1781, 60 Mly, bar, faint, group of about 80, three satellites); S-WP-M109 (67 +/- 23 Mly; satellites by name; SN 1956A; group "may number over 50").

### m110 (dwarf elliptical galaxy, Andromeda)
Target: `universe/deep-sky/m110.json`
- fact: A dwarf elliptical galaxy and satellite of Andromeda, about 2.7 million light-years away.
- bio: Charles Messier drew it around 1773 but never listed it. Caroline Herschel found it independently in 1783, and in 1967 Kenneth Glyn Jones proposed adding it to the Messier list. It is about 17,000 light-years across and has at least eight globular clusters. Dark patches of dust and young blue stars near its centre are unusual for a dwarf elliptical, and astronomers have no settled explanation. Unlike its neighbour M32, it shows no sign of a central black hole.
- Sources: S-WP-M110 (Messier c. 1773 drawing, Herschel 1783, Jones 1967, 2.69 Mly, 17,050 ly, dust and young stars unexplained, no evidence of a black hole); S-NASA-M110 (2.7 Mly, at least eight globular clusters). NASA says Messier "discovered" it in 1773; Wikipedia says he drew it and never listed it. Text follows Wikipedia.

### 30-doradus (star-forming region, Dorado)
Target: `universe/deep-sky/30-doradus.json`
- fact: The Tarantula Nebula, a vast star-forming region in the Large Magellanic Cloud, about 160,000 light-years away.
- bio: Nicolas-Louis de Lacaille recorded it from the Cape of Good Hope in the early 1750s as a nebulous patch. Estimates of its width run from about 650 to 1,860 light-years, depending on how its edge is drawn. At its heart lies the star cluster R136, put at about 450,000 solar masses and possibly the seed of a future globular cluster. In 1987 supernova 1987A exploded near its edge, the closest seen since Kepler's supernova of 1604.
- Sources: S-WP-Tarantula (all numbers: 160,000 ly, 200 to 570 pc, 450,000 solar masses "likely", SN 1987A). Papers not fetched. The caption's "most active starburst region known in the neighbourhood" was not repeated (Wikipedia states it, one source). Data: dist_ly 161,000, Wikipedia about 160,000.

### barnard-33 (dark nebula, Orion)
Target: `universe/deep-sky/barnard-33.json`
- fact: The Horsehead Nebula, a dark cloud of dust in Orion, about 1,375 light-years away.
- bio: Williamina Fleming spotted it in 1888 on a photographic plate at Harvard College Observatory. Thick dust blocks the light of the stars behind it, which is what draws the horse-head outline. The red glow behind it is hydrogen gas lit by the nearby star Sigma Orionis, at the edge of the nebula IC 434. The cloud is about 3.5 light-years in radius, and magnetic fields help channel the gas around it. It belongs to the larger Orion molecular cloud complex, where stars are forming.
- Sources: S-WP-Horsehead (Fleming 1888, 1,375 ly, radius 3.5 ly, dust, Sigma Orionis, IC 434, magnetic fields). Distance not checked against Gaia.

### carina-nebula (star-forming region, Carina)
Target: `universe/deep-sky/carina-nebula.json`
- fact: A vast star-forming nebula in the southern sky, about 7,500 light-years away, home of Eta Carinae.
- bio: Nicolas-Louis de Lacaille found it in 1752 from the Cape of Good Hope. Its most famous star, Eta Carinae, is a pair of massive stars; the larger is about 100 times the Sun's mass and about five million times its luminosity. The clusters Trumpler 14 and Trumpler 16 power the nebula, and Trumpler 14 is only about half a million years old. At the tip of the Mystic Mountain pillar, young stars fire jets of gas out of the dust.
- Sources: S-WP-Carina (Lacaille 1752, 8,500 ly, Eta Carinae, Trumpler 14 and 16, pillar jets). The repo has a second entry for the same nebula, `ngc-3372`.

### cas-a (supernova remnant, Cassiopeia)
Target: `universe/deep-sky/cas-a.json`
- fact: The remains of a massive star that exploded in the Milky Way, about 11,000 light-years away in Cassiopeia.
- bio: Tracing its expansion backwards puts the explosion in the late 1600s, yet no firm report of it survives. John Flamsteed may have logged it in 1680 as a faint star, though that reading is disputed. The shell is about 10 light-years across, with gas moving at 4,000 to 6,000 kilometres a second and a temperature near 30 million kelvin. Light echoes point to a star that had lost most of its hydrogen. Chandra found its neutron star in 1999.
- Sources: S-WP-CasA (all: 1667-1680, Flamsteed "possibly", shell size, speeds, Type IIb, Chandra 1999). "Light echoes" is the writer's addition from background knowledge (Krause et al. 2008), not fetched: reviewer to check or drop. Neutron-star cooling claim left out (contested).

### cygnus-loop (supernova remnant, Cygnus)
Target: `universe/deep-sky/cygnus-loop.json`
- fact: A huge ring of gas from an ancient supernova in Cygnus, about 2,400 light-years away; the Veil Nebula is its brightest part.
- bio: The ring spans about 3 degrees of sky, six Full Moons across, and about 120 light-years. A recent Gaia-based study puts its age at about 20,000 years. The star that exploded had perhaps 12 to 15 times the Sun's mass. Its arcs have their own names: NGC 6960 is the Witch's Broom, and Williamina Fleming found Pickering's Triangle on a photograph in 1904. Only some arcs shine in visible light; radio, infrared and X-ray images show the whole loop.
- Sources: S-WP-CygnusLoop (Gaia 725 +/- 15 pc; 120 ly; 20,000 years; 12-15 solar masses; names; Fleming 1904; wavelengths).

### eso-350-40 (ring galaxy, Sculptor)
Target: `universe/deep-sky/eso-350-40.json`
- fact: The Cartwheel Galaxy, a ring galaxy in Sculptor about 500 million light-years away and roughly 150,000 light-years across.
- bio: Fritz Zwicky identified it in 1941 and called it one of the most complicated structures awaiting an explanation. The Cartwheel was probably an ordinary spiral until a smaller galaxy plunged through its disc roughly 200 to 300 million years ago. A trail of neutral hydrogen gas points to the companion known as G3 as the likely intruder, rather than G1 or G2. The collision compressed gas and set off intense star formation in the outer ring.
- Sources: S-WP-Cartwheel (500 Mly; 188,200 ly; Zwicky 1941 and quote; 200-300 Myr; G3 "likely" intruder; starburst). Paper not fetched.

### gum-29 (star-forming region, Carina)
Target: `universe/deep-sky/gum-29.json`
- fact: Westerlund 2, a young star cluster in the nebula RCW 49, whose distance has been debated.
- bio: Bengt Westerlund discovered the cluster in the 1960s. Published distances run from roughly 9,000 to 26,000 light-years; NASA uses about 20,000, while a spectroscopic and Hubble study found about 13,500. The cluster is no more than a couple of million years old. It contains at least a dozen hot early O-type stars, three of them eclipsing binaries, and WR 20a, a pair of Wolf-Rayet stars that orbit each other. The dust-shrouded stellar nursery around it is seen best in infrared light.
- Sources: S-WP-Westerlund2 (Westerlund 1960s, 1-2 Myr, 20,000 ly, a dozen O stars, WR 20a); S-SRCH (distance range estimates; not fetched). Data: dist_ly 20,000. No firm Gaia-era distance fetched.

### hcg-92 (compact galaxy group, Pegasus)
Target: `universe/deep-sky/hcg-92.json`
- fact: Stephan's Quintet, a compact group of galaxies in Pegasus, about 290 million light-years away.
- bio: Édouard Stephan discovered it in 1877 with the 80 cm reflector at Marseille Observatory. Only four of the five galaxies are close together in space: NGC 7317, 7318A, 7318B and 7319. NGC 7320 is a foreground galaxy about 39 million light-years away. Radio astronomers found a filament of emission between the galaxies in the late 1970s, later identified as a shock wave made when the intruder NGC 7318B ploughs into the group's gas. Webb has seen an outflow from the black hole in NGC 7319.
- Sources: S-WP-Stephan (Stephan 1877; 90.25 +/- 6.33 Mpc; NGC 7320 foreground at about 39 Mly; shock front 850-1,000 km/s; Webb 2022 outflow in NGC 7319). Paper not fetched.

### hen-2-104 (planetary nebula, Centaurus)
Target: `universe/deep-sky/hen-2-104.json`
- fact: The Southern Crab Nebula in Centaurus, a bipolar nebula around a pair of stars, about 7,000 light-years away.
- bio: Karl Henize listed it in his 1967 survey of southern planetary nebulae, which catalogued 459 objects. Despite that label, Wikipedia describes it as a symbiotic system: a red giant and a white dwarf orbiting each other, whose gas is thought to be shed by the red giant and shaped by the white dwarf. The name comes from a likeness to the Crab Nebula in the north. Hubble imaged it in 1999 and again in 2019, when its stair-step structure was clearer.
- Sources: S-WP-SouthernCrab (7,000 ly; Henize 1967, 459 objects; symbiotic red giant and white dwarf; Hubble 1999 and 2019). Classification is ambiguous in sources (planetary vs symbiotic): flagged.

### ic-342 (spiral galaxy, Camelopardalis)
Target: `universe/deep-sky/ic-342.json`
- fact: A large spiral galaxy in Camelopardalis, about 10 to 11 million light-years away, partly hidden by the dust of our own.
- bio: William Frederick Denning discovered it in 1892. It lies close to the plane of the Milky Way, so dust in our galaxy dims it, which gives it the name Hidden Galaxy. Edwin Hubble first thought it belonged to the Local Group, a view later disproved. It is one of the brightest members of the IC 342 / Maffei Group, one of the nearest galaxy groups, and in 2020 the dwarf galaxy KKH 32 was identified as its first known dwarf spheroidal satellite.
- Sources: S-WP-IC342 (10.7 +/- 0.9 Mly, estimates 7 to 11 Mly; Denning 1892; dust; Hubble's mistaken Local Group idea; group; KKH 32 in 2020).

### m1 (supernova remnant, Taurus)
Target: `universe/deep-sky/m1.json`
- fact: The Crab Nebula, a supernova remnant in Taurus, about 6,500 light-years away, with a pulsar at its heart.
- bio: John Bevis found it in 1731. Charles Messier saw it later and mistook it for a comet, an episode that, in NASA's telling, led him to begin his catalogue. The nebula is the debris of the star seen by Chinese astronomers in 1054, bright enough to be seen in daylight. It is about 11 light-years across, and the pulsar at its centre spins about 30 times a second, sweeping twin beams like a lighthouse.
- Sources: S-NASA-M1 (Bevis 1731, Messier and Halley's Comet, 6,500 ly, 1054, 30 times per second); Wikipedia Crab Nebula (3.4 pc).

### m8 (emission nebula, Sagittarius)
Target: `universe/deep-sky/m8.json`
- fact: The Lagoon Nebula, a star-forming region in Sagittarius, about 4,300 light-years away.
- bio: Giovanni Battista Hodierna discovered it in 1654. It can be seen with the naked eye in a dark sky. Its young cluster NGC 6530 is only a few million years old, and Gaia measurements put it at about 4,300 light-years. A study of those measurements suggests that the cloud's collision with the plane of the Galaxy, about 4 million years ago, may have set off most of the star formation. The Hourglass region holds twisting funnels half a light-year long.
- Sources: S-NASA-M8 (Hodierna 1654, naked eye, NGC 6530, Hourglass funnels, Herschel 36); S-SRCH (Gaia: NGC 6530 at 1,325 pc, 4,320 ly; age 0.5 to 5 Myr; collision with the Galactic plane about 4 Myr ago; arXiv 1812.11402, 1901.09589; not fetched). NASA says 5,200 ly; repo 4,000.

### m16 (emission nebula and open cluster, Serpens)
Target: `universe/deep-sky/m16.json`
- fact: The Eagle Nebula, a star-forming region in Serpens, about 5,600 to 5,700 light-years away.
- bio: Jean-Philippe Loys de Chéseaux discovered it in 1745. M16 is really two objects: the nebula IC 4703 and the open cluster NGC 6611 inside it. The cluster is about two million years old, and Gaia puts it near 5,700 light-years. The nebula spans about 70 by 55 light-years, and NASA notes that the pillars, 4 to 5 light-years tall, are a small part of it. Ultraviolet light from the cluster's stars erodes them.
- Sources: S-NASA-M16 (Chéseaux 1745, two objects, 7,000 ly, 70 x 55 ly, pillars 4-5 ly, erosion); S-SRCH (Kuhn et al. 2019, Gaia DR2: 1,740 +/- 130 pc, 5,700 ly; cluster about 2 Myr). Papers not fetched. Data: dist_ly 6,500.

### m31 (spiral galaxy, Andromeda)
Target: `universe/deep-sky/m31.json`
- fact: The Andromeda Galaxy, the nearest large spiral, about 2.5 million light-years away.
- bio: The Persian astronomer al-Sufi described it in his Book of Fixed Stars in 964, the earliest written account NASA knows of. On the sky it spans about six Full Moons, and it is visible to the naked eye from dark places. M32 and M110 are its companions, and M32 may be the leftover core of a galaxy that collided with it. A black hole at its centre is orbited by a disc of blue stars. The Milky Way and M31 are approaching, but a 2025 study found about even odds of no collision in the next 10 billion years.
- Sources: S-NASA-M31 (al-Sufi 964, 2.5 Mly, six Moons, M32 "may", disc of blue stars); S-SRCH (Sawala et al. 2025, Nature Astronomy: about 50% chance of no collision within 10 Gyr; not fetched). NASA's "earliest known written account" is attributed to NASA.

### m42 (emission nebula, Orion)
Target: `universe/deep-sky/m42.json`
- fact: The Orion Nebula, the nearest region of massive-star formation, about 1,350 light-years away.
- bio: Many cultures have known it; Charles Messier catalogued it in the 18th century. Four massive young stars in a trapezoid, the Trapezium, light the nebula, and their ultraviolet radiation carves a cavity and disrupts the growth of hundreds of smaller stars. Hubble images show dark discs around newborn stars, seeds of possible planetary systems, and brown dwarfs. Its largest Hubble mosaic used 520 exposures and more than a billion pixels.
- Sources: S-NASA-M42. Data: dist_ly 1,350 (Gaia-era); NASA 1,500. Distance in text follows the repo, which matches batch 2's M43 and M78 note.

### m51 (spiral galaxy, Canes Venatici)
Target: `universe/deep-sky/m51.json`
- fact: The Whirlpool Galaxy, the first nebula seen to have a spiral form, about 28 to 31 million light-years away.
- bio: Charles Messier found it in 1773. In 1845 William Parsons, Earl of Rosse, saw its spiral form through his large telescope in Ireland and sketched it, the first galaxy shown to be a spiral. A smaller companion, NGC 5195, sits at the end of one arm. NASA says its tidal pull has acted for hundreds of millions of years and may trigger star formation. Tip-of-the-red-giant-branch work puts M51 near 28 million light-years.
- Sources: S-NASA-M51 (Messier 1773, 31 Mly, NGC 5195, tidal forces); S-SRCH (McQuinn et al. 2016: 8.58 +/- 0.10 Mpc, about 28 Mly; Rosse 1845, "first object identified as a spiral"; arXiv 1606.04120; Frontiers, Armagh pages; not fetched).

### m57 (planetary nebula, Lyra)
Target: `universe/deep-sky/m57.json`
- fact: The Ring Nebula, a planetary nebula in Lyra, about 2,600 light-years away.
- bio: Antoine Darquier de Pellepoix and Charles Messier found it independently in 1779. The Gaia parallax of the white dwarf at its centre gives about 790 parsecs. Hubble showed that the blue gas in the middle is a football-shaped structure seen end-on, piercing the red doughnut of material around it. In the ring itself, dark knots of dense gas that stellar winds have not yet blown away look like bicycle spokes.
- Sources: S-NASA-M57 (Darquier 1779, football-shaped structure, knots; NASA distance 2,000 ly); S-SRCH (Gaia parallax 1.2696 +/- 0.0438 mas, 790 +/- 30 pc, about 2,570 ly; from the Wikipedia Ring Nebula page via a search summary). Data: dist_ly 2,600 matches Gaia.

### m74 (spiral galaxy, Pisces)
Target: `universe/deep-sky/m74.json`
- fact: The Phantom Galaxy, a face-on spiral in Pisces about 32 million light-years away.
- bio: Pierre Méchain discovered it in 1780. M74 is a grand-design spiral: symmetrical arms reach out from its nucleus, traced by winding dust lanes. Seen face-on, its whole pattern can be followed, with young blue star clusters strung along the arms and pink glowing hydrogen where stars are being born. Its light is spread so thinly across the sky that NASA counts it among the harder Messier objects to find.
- Sources: S-NASA-M74 (Méchain 1780, 32 Mly, grand-design, clusters and H II regions, "among the most difficult Messier objects"). Only NASA read; no second source for the distance (not checked against a TRGB or Cepheid paper).

### m101 (spiral galaxy, Ursa Major)
Target: `universe/deep-sky/m101.json`
- fact: The Pinwheel Galaxy, a large face-on spiral in Ursa Major, about 21 million light-years away.
- bio: Pierre Méchain discovered it in 1781. NASA gives its bright disc as about 170,000 light-years across, wider than the Milky Way's. Distance measurements from Cepheid stars and the tip of the red giant branch converge near 21 million light-years, not NASA's 25 million. Supernova SN 2011fe, a Type Ia, went off in it in 2011 and is among the nearest of its kind. Hubble's 2006 view used 51 exposures.
- Sources: S-NASA-M101 (Méchain 1781, 170,000 ly, 51 exposures); S-SRCH (6.4 Mpc, 21 Mly; TRGB and Cepheid distances; SN 2011fe, "one of the nearest among known Type Ia hosts"; arXiv 1210.6040, 1908.06120, 1112.0439; not fetched).

### m104 (spiral galaxy, Virgo)
Target: `universe/deep-sky/m104.json`
- fact: The Sombrero Galaxy, a spiral galaxy in Virgo seen almost edge-on, about 28 to 31 million light-years away.
- bio: Pierre Méchain discovered it in 1781. NASA counts about 2,000 globular clusters around it, roughly ten times as many as the Milky Way has, with ages of 10 to 13 billion years. A black hole is thought to sit in its bright white core, where X-rays show material falling in. NASA gives the whole galaxy a mass of about 800 billion Suns. A thick dust ring around the core is where stars form, and a wide halo of stars surrounds it.
- Sources: S-NASA-M104 (Méchain 1781, 28 Mly, 2,000 clusters, black hole "thought to", 800 billion, halo); S-SRCH (McQuinn et al. 2016 "The Distance to M104", arXiv 1610.03857, title seen in search results; value about 9.55 Mpc, 31 Mly, is from memory, NOT fetched: reviewer to check).

### ngc-346 (star cluster, Tucana)
Target: `universe/deep-sky/ngc-346.json`
- fact: A young star cluster and nebula in the Small Magellanic Cloud, about 200,000 light-years away.
- bio: The Scottish astronomer James Dunlop discovered it in 1826. The cluster holds about 230 massive O and B stars, 33 of them of O type, and its youngest stars are under two million years old. It is still forming massive stars, at a rate near 0.004 solar masses a year. It lies in N66, the brightest region of ionised hydrogen in the Small Magellanic Cloud, and the multiple star HD 5980 sits on its outskirts.
- Sources: S-WP-NGC346 (Dunlop 1826; 210,000 ly; 230 OB stars, 33 O; under 2 Myr; (4 +/- 1) x 10^-3 solar masses a year; N66; HD 5980). Papers not fetched. "Brightest" is Wikipedia's wording for N66.

### ngc-602 (star cluster, Hydrus)
Target: `universe/deep-sky/ngc-602.json`
- fact: A young star cluster in the Small Magellanic Cloud, about 200,000 light-years away, set in a nebula of its own.
- bio: James Dunlop discovered it in 1826. The cluster is about five million years old and 90 light-years in radius. Radiation from its stars pushes gas and dust outward into elephant-trunk ridges, where new stars are forming. A hot O-type star, Sk 183, dominates the light that ionises the nebula N90. Hubble found many hot young stars and Spitzer found dust-wrapped younger ones. A 2024 study reported candidate brown dwarfs there.
- Sources: S-WP-NGC602 (Dunlop 1826; 196,000 ly; radius 90 ly; about 5 Myr; ridges; Sk 183; Hubble 2007, Spitzer; brown dwarfs 2024). Papers not fetched.

### ngc-604 (star-forming region, Triangulum)
Target: `universe/deep-sky/ngc-604.json`
- fact: A giant region of glowing hydrogen in the Triangulum Galaxy, about 2.7 million light-years away.
- bio: William Herschel found it in 1784. It is about 1,500 light-years across, over 40 times the width of the visible part of the Orion Nebula. Its massive stars, O-type and Wolf-Rayet, have a combined mass near 100,000 Suns and are about 3.5 million years old. It is more than 6,000 times as luminous as the Orion Nebula and ranks among the largest regions of ionised hydrogen in the Local Group.
- Sources: S-WP-NGC604 (Herschel 1784; 1,520 ly; "over 40 times"; 10^5 solar masses; 3.5 Myr; "over 6,300 times more luminous"; "ranks among the largest"). Papers not fetched. The caption already says "more than 200 hot young stars"; the count is left out of the text.

## Data conflicts

- Recommended `dist_ly` values (null in the file) for the no-photo objects: m81 11,990,000 (Cepheids, S-WP-M81; NASA 11.6 Mly); m82 12,000,000 (Karachentsev 2006, 11.4-12.4); m83 15,000,000; m84 55,000,000; m85 60,000,000; m86 52,000,000; m87 54,000,000 (16.4 Mpc = 53.5 Mly, S-WP-M87); m88 55,000,000 (50-60); m89 50,000,000; m90 59,000,000; m91 60,000,000 (NASA 60, Wikipedia 63); m92 27,700 (S-BAU); m93 3,320 (S-CG20); m94 16,000,000; m95 33,000,000; m96 33,000,000 (NASA 35, Wikipedia 31); m97 2,400 (Stanghellini 2,030 vs Frew 2,800: midpoint is the writer's pick, not a source); m98 44,000,000; m99 52,000,000 (NASA 55, Wikipedia 49); m100 55,000,000; m103 8,160 (S-CG20); m105 34,000,000 (NASA 32, Wikipedia 36.6); m106 24,000,000; m107 18,400 (S-BAU; NASA 20,000, Wikipedia 20,900); m108 46,000,000; m109 60,000,000 (Wikipedia 67 +/- 23); m110 2,700,000. Virgo-cluster members could instead all take 53,800,000 (Mei 2007).
- Photo objects: gum-29 `dist_ly` 20,000 is NASA's figure; published values span about 6,500 to 26,000 (S-SRCH), so the label "~20,000" should say "roughly 20,000 (estimates vary)". m16 6,500 vs Gaia cluster 5,700 (Kuhn 2019); recommended "~6,000". m8 4,000 vs Gaia 4,320; recommended 4,300. m51 31,000,000 vs 28 Mly (McQuinn 2016); recommended 28,000,000. m104 28,000,000 vs about 31 Mly (McQuinn 2016, unverified); recommended after reviewer's check. m101 21,000,000 matches TRGB. m57 2,600 matches Gaia. m42 1,350 vs NASA 1,500. carina-nebula 7,500 vs Wikipedia 8,500 vs Gaia 7,700 (memory). ic-342 11,000,000 vs 10.7 +/- 0.9 Mly: fine with "~11". hen-2-104 7,000 matches. cas-a 11,000 matches. cygnus-loop 2,400 matches Gaia 725 pc.
- `category`: gum-29 "star-forming-region" but the text and caption treat Westerlund 2 as a star cluster (the caption's own `type` says "Star cluster (Gum 29)"); recommended "star-cluster". hen-2-104 "planetary-nebula": sources call it a symbiotic star with a nebula; keep the category, flag the ambiguity. ngc-346 / ngc-602 "star-cluster": both are clusters with an associated nebula; fine. m8 "nebula" and m16 "star-forming-region" are inconsistent with each other (M16 is nebula plus cluster); no change needed. m93, m103 "star-cluster": use "open-cluster" if the enum allows. m92, m107 "globular-cluster": fine. m110 "galaxy": text says dwarf elliptical.
- Ages: m1 (caption "1054 AD") and m1 text agree. cygnus-loop caption "10,000 years" vs Wikipedia 20,000: the text gives a range, but the caption should be changed at integration.
- Duplicate entity: `carina-nebula` and `ngc-3372` describe the same nebula, in two entries with different photos; the text for `ngc-3372` (a later batch) must not repeat this one.
- Discoverer conflicts: m107 Herschel 1783 (NASA) vs 1793 (Wikipedia); m110 "discovered 1773" (NASA) vs "drew it, never listed" (Wikipedia); m91 discovery error wording differs; m109 catalogue addition 1953 (NASA) vs Wikipedia "Messier catalogued it two years later as an appended object".
- Black holes: m87 6.5 billion (EHT, with the stellar-dynamics range 3.5 to 6.6 billion, S-WP-M87); m84 1.5 billion (Bower 1998, via Wikipedia); m81 about 70 million (NASA, Wikipedia agrees); m105 140 to 200 million (NASA 200); m106 about 40 million (maser, Wikipedia 3.9 x 10^7); m108 24 million (Spitzer). m88 (NASA 100 million, Wikipedia 80 million) and m89 (NASA 1 billion, Wikipedia 480 million) disagree, so no number is printed.
- Magnitudes: not in any text. NASA's values differ from older ones in the file in places (m92 6.3, m93 6.0, m97 9.9, m105 10.2); the data file for these ids has `mag: null` anyway.

## Not sourced, left out

- Cultural or mythological claims (Maya "cosmic fire of creation" for M42, the Crab Nebula's Chinese observations beyond the one-line NASA statement).
- All magnitudes, months and "best seen" statements (NASA gives one per page).
- Star counts from NASA that no second source confirms (M90 one trillion, M98 one trillion, M85 400 billion, M88 400 billion, M95 40 billion, M109 a trillion, M110 10 billion): left out.
- NASA superlatives with one source: M86 "moving the fastest in our direction", M89 "first galaxy with an extended envelope", M96 "nearest group with both bright spirals and a bright elliptical", M100 "youngest black hole ever observed", M107 "last Messier object to be found", M82 "most detailed view of M82's core", M84 "supernovae in 1957 and 1991 only" (Wikipedia lists three), M105 "largest elliptical not in Virgo" (Wikipedia agrees, but left out), M92 "almost the age of the Universe".
- m83: the April 2025 report of a possible central black hole (one Wikipedia sentence; paper not fetched).
- m100: no black-hole statement; m99: NASA's planet-collision idea for PTF 10fqs; m95: supernova progenitor mass.
- 30-doradus: R136's individual stars (not fetched); the VFTS 243 black-hole binary.
- ngc-346 / ngc-602: Webb and Hubble findings on young-star discs and accretion (not fetched).
- m31: the Milky Way collision beyond the single hedged sentence; any size (NASA's 61,000 light-years disc conflicts with other measurements).
- Not checked against a primary paper: every NASA and Wikipedia number above, apart from the three VizieR / Baumgardt values (m92, m93, m103, m107) and what the three search summaries gave (Gaia distances for m8, m16, m57; McQuinn for m51; the 2025 Andromeda study; M101 distances).
- Not fetched at all: Hunt and Reffert 2023, Gaia-era distances for the Virgo Cluster galaxies, TRGB distances for M81 to M110 galaxies other than those named, the maser paper for M106, Kasliwal et al. 2011 for M99, Krause et al. 2008 for Cas A.

## Science review (2026-11-12) — fixes applied

1. **m84** — black hole mass estimate: replaced "Bower and colleagues put it near 1.5 billion solar masses in 1998" with "estimates of its mass range from about 0.9 to 1.5 billion Suns" (Walsh et al. 2010, Maciejewski & Binney 2001).
2. **ic-342** — added dwarf satellite: "KKH 32 was identified as its first known dwarf spheroidal satellite" in 2020; revised group membership text to "one of the brightest members".
3. **m1** — size correction: "about 11 light-years across" (3.4 pc, Wikipedia Crab Nebula).
4. **m104** — mass phrasing: "NASA gives the whole galaxy a mass of about 800 billion Suns".
5. **m99** — luminous red nova origin and arms: "a kind of eruption whose origin is debated; a stellar merger is a leading explanation"; arms are lopsided.
6. **m100** — Cepheid calibration: fact line and distance sentence revised; "the result gave a distance of about 55 million light-years to a galaxy in the Virgo Cluster".
7. **m94** — dark matter: added "A 2008 study argued that M94 has little or no dark matter, a result that remains debated".
8. **m108** — black hole and discoverer: "A supermassive black hole is thought to sit at its centre, and Chandra found 83 X-ray sources, one of them suspected to be an intermediate-mass black hole feeding on gas"; "Owen Gingerich added it to the list in the 20th century".
9. **m109** — catalogue addition and distance: "added to the Messier list only in the 20th century"; fact line distance "roughly 60 to 80 million light-years away".
10. **m91** — position error and distance: "listed it in 1781, one of nine objects (M84 to M92) from one night, but gave its position relative to the wrong object"; distance set to "about 55 million" (Virgo standard).
11. **Virgo Cluster distances** (m85, m86, m88, m89, m90, m91) — all set to "about 55 million light-years away".
12. **m96** — group membership: "one of the brightest members of the M96 Group"; "NASA says the pull of its neighbours in the group is thought to have shaped it".
13. **hen-2-104** — symbiotic system: "Its central pair is not one dying star but a symbiotic system: a red giant and a white dwarf orbiting each other, whose gas is thought to be shed by the red giant and shaped by the white dwarf".
14. **ngc-602** — brown dwarfs: "A 2024 study reported candidate brown dwarfs there".
15. **gum-29** — distance range: "Published distances run from roughly 9,000 to 26,000 light-years; NASA uses about 20,000, while a spectroscopic and Hubble study found about 13,500".
16. **carina-nebula** — Eta Carinae description and distance: fact line "about 7,500 light-years away"; "Eta Carinae, is a pair of massive stars; the larger is about 100 times the Sun's mass and about five million times its luminosity".
17. **cygnus-loop** — age: "A recent Gaia-based study puts its age at about 20,000 years".
18. **eso-350-40** — diameter: "roughly 150,000 light-years across".
19. **m101** — diameter and star count: "NASA gives its bright disc as about 170,000 light-years across, wider than the Milky Way's"; dropped "trillion stars".
20. **m42** — fact line: "The Orion Nebula, the nearest region of massive-star formation, about 1,350 light-years away".
21. **m107** — Herschel: "and William Herschel independently found it later" (omitting date conflict).
22–31. **MINOR/NIT fixes**: m57 "found it independently in 1779"; m74 dropped "despite its size"; m82 "NASA expects the burst to fade, probably within a few tens of millions of years"; m86 added "part of the blueshift is the Milky Way's own motion toward Virgo"; m88 "will make its closest approach to M87"; m93 dropped "from southern and tropical latitudes"; m87 "an estimated 12,000 globular clusters"; m51 fact line "the first nebula seen to have a spiral form"; 30-doradus "the closest seen since Kepler's supernova of 1604"; m16 distance "about 5,600 to 5,700 light-years".

**Not applied:** "Existing captions to fix at integration" and "Data-file corrections" sections in `batch-03-review.md` — those are for a later integration step.
- Wikipedia fetches were summarised by the fetch tool, not read line by line; NASA pages for M93, M97, M103 returned 404.
