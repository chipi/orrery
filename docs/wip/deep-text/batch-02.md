# Deep text, batch 2 (drafts)

Drafts only. Nothing here is in `i18n-src/` or `static/` yet. 2026-11-12, branch `tech-debt/0.9.9`.

## Shape and selection

- Same shape as batch 1: new overlay `i18n-src/en-US/universe/deep-sky/<id>.json` with `fact` (one line) and `bio` (the rest). Counts are `fact` + `bio` characters, whitespace included (measured with a script: all 50 are between 400 and 600).
- Selection: the next 50 objects after batch 1 (m2-m23) in `static/data/universe/deep-sky-objects.json` order with `photoKey: null`: m24, m25, m26, m27, m28, m29, m30, m32, m33, m34, m35, m36, m37, m38, m39, m41, m43, m44, m46, m47, m48, m49, m50, m52, m53, m54, m55, m56, m58, m59, m60, m61, m62, m63, m64, m65, m66, m67, m68, m69, m70, m71, m72, m73, m75, m76, m77, m78, m79, m80. Objects with a `photoKey` (m1, m8, m16, m31, m42, m51, m57, m74, m101, m104) and ids absent from the file are skipped. Exactly 50 objects were taken; objects from m81 onward are left for batch 3.
- Source tags: S-NASA-Mn = `https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-n/` (fetched through a summarising fetch tool, not read line by line). S-WP-Mn = `https://en.wikipedia.org/wiki/Messier_n` (fetched, used as a pointer to the papers it cites; the papers were not fetched). S-BAU = Baumgardt & Vasiliev globular-cluster catalogue, https://people.smp.uq.edu.au/HolgerBaumgardt/globular/parameter.html (fetched), used for every globular-cluster distance (Gaia-era; kpc x 3,262 = light-years, rounded).
- Messier's NASA pages do not exist (404) for M25, M26, M29, M34, M36, M37, M38, M39, M41, M47, M50, M52, M73; those use Wikipedia and are marked WEAK. Open-cluster distances and ages from Wikipedia are mostly pre-Gaia (Kharchenko 2005, Wu 2009) and are rounded and hedged; reviewer should check them against Cantat-Gaudin 2020 / Hunt & Reffert 2023.
- No text states a magnitude. No month is named. Where a NASA superlative is used it is attributed to NASA.

## Deep-sky objects

### m24 (star cloud, Sagittarius)
Target: `universe/deep-sky/m24.json`
- fact: A bright patch of the Milky Way in Sagittarius, a gap in the dust that opens a window toward distant stars.
- bio: Charles Messier listed it in 1764. It is not a true cluster: it is a clear space between dust clouds that gives a tunnel-like view along the Sagittarius spiral arm. NASA puts the window at about 600 light-years wide and the stars seen through it at roughly 10,000 to 16,000 light-years away. It looks like a hazy patch to the naked eye, and binoculars resolve it into stars, with several clusters and nebulae scattered through it.
- Sources: S-NASA-M24 (all of it).

### m25 (open cluster, Sagittarius) - WEAK sourcing
Target: `universe/deep-sky/m25.json`
- fact: A loose open cluster in Sagittarius, about 2,000 light-years away, that contains a Cepheid variable star.
- bio: Philippe Loys de Chéseaux made the first recorded observation in 1745, and Charles Messier added it to his catalogue in 1764. The cluster is about 13 light-years across and some tens of millions of years old. Among its members is U Sagittarii, a Cepheid, a star that pulsates with a regular period, and a dark lane of dust passes near its centre.
- Sources: S-WP-M25 (distance and age: Kharchenko et al. 2005; size: Tadross et al. 2002; U Sagittarii). Papers not fetched. NASA page: 404.

### m26 (open cluster, Scutum) - WEAK sourcing
Target: `universe/deep-sky/m26.json`
- fact: A small open cluster in Scutum, about 5,000 light-years away, with an unexplained thin zone near its centre.
- bio: Charles Messier discovered it in 1764. The cluster spans about 22 light-years and is roughly 85 million years old. In 1940 J. Cuffey showed that the sparse region near its centre is a real shell of low star density, not dust hiding the stars behind it. The astronomer Michael Merrifield noted in 2015 that there is still no clear explanation. About 25 of its stars can be seen in a small telescope.
- Sources: S-WP-M26 (Kharchenko et al. 2005 distance 5,160 ly; Wu et al. 2009 age 85 Myr; Cuffey 1940; Merrifield 2015 remark). Papers not fetched. NASA page: 404.

### m27 (planetary nebula, Vulpecula)
Target: `universe/deep-sky/m27.json`
- fact: The Dumbbell Nebula, a planetary nebula in Vulpecula about 1,200 light-years away.
- bio: Charles Messier discovered it in 1764, and NASA calls it the first planetary nebula ever found. It is the glowing shell of an old star that has shed its outer layers. Hubble images show knots of gas with finger-like tails, each tens of billions of kilometres across and holding about three Earth masses of material. Small backyard telescopes show two bright lobes, which give the nebula its name.
- Sources: S-NASA-M27.

### m28 (globular cluster, Sagittarius)
Target: `universe/deep-sky/m28.json`
- fact: A globular cluster in Sagittarius, about 17,500 light-years away, that hosts a millisecond pulsar.
- bio: Charles Messier discovered it in 1764. In the 1980s radio astronomers using the Lovell Telescope in England found PSR B1821-24 in it, a neutron star that spins about once every three milliseconds; NASA describes it as the first millisecond pulsar found in a globular cluster. In binoculars M28 is a faint patch of light, and a larger telescope is needed to resolve individual stars.
- Sources: S-NASA-M28 (discoverer, pulsar, binoculars); S-BAU (5.37 kpc, about 17,500 ly; NASA says 18,000).

### m29 (open cluster, Cygnus) - WEAK sourcing
Target: `universe/deep-sky/m29.json`
- fact: A compact open cluster in Cygnus, about 5,000 light-years away, nicknamed the Cooling Tower.
- bio: Charles Messier discovered it in 1764. It is a small, young group, about 11 light-years across and roughly 13 million years old, whose brightest stars form a squat quadrilateral. Dust dims it, so its distance was long uncertain, with estimates between about 4,000 and 7,200 light-years; Gaia data put it near 5,200. It belongs to the Cygnus OB1 association of young stars.
- Sources: S-WP-M29 (Gaia EDR3 distance, Poggio et al. 2021; age Kharchenko et al. 2005; association; nickname). Papers not fetched. NASA page: 404.

### m30 (globular cluster, Capricornus)
Target: `universe/deep-sky/m30.json`
- fact: A globular cluster in Capricornus, about 27,500 light-years away and roughly 13 billion years old.
- bio: Charles Messier discovered it in 1764. The cluster is about 90 light-years across and holds several hundred thousand stars. Hubble studies found two kinds of blue stragglers in it, stars that look younger than their neighbours: one kind thought to form from direct collisions, the other in binary systems where one star feeds mass to its companion. Binoculars show it.
- Sources: S-NASA-M30 (all); S-BAU (8.46 kpc, about 27,600 ly, agrees).

### m32 (compact elliptical galaxy, Andromeda)
Target: `universe/deep-sky/m32.json`
- fact: A compact elliptical galaxy about 2.5 million light-years away, a satellite of the Andromeda Galaxy.
- bio: Guillaume Le Gentil discovered it in 1749. M32 orbits the Andromeda Galaxy, M31, and is one of two companions of M31 in Messier's catalogue, the other being M110. Its stars are packed densely at the centre and thin out toward the edge. Astronomers have used it to study gravitational microlensing and variable stars that serve as distance markers. It shares a field of view with M31, but a large telescope is needed to see more than a spot of light.
- Sources: S-NASA-M32.

### m33 (spiral galaxy, Triangulum)
Target: `universe/deep-sky/m33.json`
- fact: The Triangulum Galaxy, a spiral galaxy about 3 million light-years away, a member of the Local Group.
- bio: Charles Messier catalogued it in 1764. NASA calls it the third-largest member of the Local Group, after the Milky Way and Andromeda. It holds NGC 604, a stellar nursery almost 1,500 light-years across, and a Hubble mosaic of its centre resolves about 25 million stars. NASA notes it is one of the most distant objects the unaided eye can see, under exceptionally dark skies.
- Sources: S-NASA-M33. ("after the Milky Way and Andromeda" is the reviewer's check: NASA's text names only "third-largest".)

### m34 (open cluster, Perseus) - WEAK sourcing
Target: `universe/deep-sky/m34.json`
- fact: An open cluster in Perseus, about 1,500 light-years away, with around 400 stars.
- bio: Giovanni Battista Hodierna probably recorded it before 1654, and Charles Messier catalogued it in 1764. Its age is put at 200 to 250 million years, between the Pleiades and the Hyades, and at least 19 white dwarfs have been identified among its members. Under very dark skies it can just be seen with the naked eye, and binoculars show it more easily.
- Sources: S-WP-M34 (Jones & Prosser 1996, AJ: distance, age, membership; white dwarfs). Paper not fetched. NASA page: 404.

### m35 (open cluster, Gemini)
Target: `universe/deep-sky/m35.json`
- fact: An open cluster in Gemini, about 2,800 light-years away, with around 400 stars.
- bio: Philippe Loys de Chéseaux discovered it in 1745, and Charles Messier catalogued it in 1764. The cluster is about 30 light-years across and about 150 million years old, a mix of hot blue stars and cooler orange and red giants. On very dark nights it can be seen as a fuzzy patch with the naked eye, binoculars show a haze with some stars, and a telescope shows a group of bright stars. The smaller cluster NGC 2158 lies beside it in the same field.
- Sources: S-NASA-M35.

### m36 (open cluster, Auriga) - WEAK sourcing
Target: `universe/deep-sky/m36.json`
- fact: The Pinwheel Cluster, a young open cluster in Auriga, roughly 4,000 light-years away.
- bio: Giovanni Battista Hodierna described it as a nebulous patch before 1654, and Charles Messier catalogued it in 1764. It is made mostly of bright blue B-type stars and is young, about 25 million years old: photometry gives 25 to 26 million, and measurements of lithium depletion give about 22 million. Distance estimates run from about 3,800 to 4,300 light-years.
- Sources: S-WP-M36 (Wu et al. 2009; Bell et al. 2013; Jeffries et al. 2013 lithium depletion; Joshi et al. 2020 distance). Papers not fetched. NASA page: 404.

### m37 (open cluster, Auriga) - WEAK sourcing
Target: `universe/deep-sky/m37.json`
- fact: A rich open cluster in Auriga, about 4,500 light-years away, with more than 500 known stars.
- bio: Giovanni Battista Hodierna found it before 1654, and Charles Messier independently rediscovered it in 1764. Age estimates run from about 350 to 550 million years. The cluster holds at least a dozen red giants and about 1,500 times the Sun's mass, and it spans some 20 to 25 light-years. Its hottest main-sequence stars are of spectral type B9, and its metal content is close to the Sun's.
- Sources: S-WP-M37 (Wu et al. 2009 distance and age; Hartman et al. 2009 age). Papers not fetched. NASA page: 404. A reported planetary nebula in M37 was left out (one-line Wikipedia claim, not checked).

### m38 (open cluster, Auriga) - WEAK sourcing
Target: `universe/deep-sky/m38.json`
- fact: An open cluster in Auriga, about 3,500 light-years away, with about 100 stars.
- bio: Giovanni Battista Hodierna recorded it before 1654, and Guillaume Le Gentil found it again in 1749. The cluster is about 290 million years old and spans roughly 13 light-years. The observer Walter Scott Houston noted that photographs show it departing from a circle, and older reports often describe a cross shape. Its brightest member is a yellow giant.
- Sources: S-WP-M38 (WEBDA 2018 data: distance 3,480 ly, age 290 Myr; Houston quote). Not fetched further. NASA page: 404.

### m39 (open cluster, Cygnus)
Target: `universe/deep-sky/m39.json`
- fact: A scattered open cluster in Cygnus, about 1,000 light-years away, as wide on the sky as the full Moon.
- bio: Guillaume Le Gentil discovered it in 1749, and Charles Messier added it to his catalogue in 1764. Its age is estimated at about 280 million years, and its total mass at about 230 Suns. In a small telescope at low magnification it shows around two dozen stars, though more belong to it. Among its 15 brightest members are six binary systems.
- Sources: S-WP-M39 (Kharchenko et al. 2005 distance; Wu et al. 2009 age; Piskunov et al. 2008 mass). Papers not fetched. NASA page: 404. WEAK like the other Wikipedia-only open clusters.

### m41 (open cluster, Canis Major) - WEAK sourcing
Target: `universe/deep-sky/m41.json`
- fact: An open cluster in Canis Major, about 2,300 light-years away and four degrees south of Sirius.
- bio: Giovanni Battista Hodierna recorded it before 1654. About 100 stars belong to it, including several red giants and white dwarfs, and it is roughly 190 to 200 million years old. It spans about 25 light-years, an area of sky comparable to the full Moon. In binoculars it forms a rough equilateral triangle with Sirius and Nu2 Canis Majoris, and it is sometimes called the Little Beehive Cluster.
- Sources: S-WP-M41 (distance Harris 1993; age Harris 1993 and Stoyan 2008). Papers not fetched. NASA page: 404. A claim that Aristotle may have seen it was left out.

### m43 (nebula, Orion)
Target: `universe/deep-sky/m43.json`
- fact: A small star-forming nebula in Orion, separated from the Orion Nebula by a dark lane of dust.
- bio: Jean-Jacques d'Ortous de Mairan discovered it in 1731, and the nebula is also called Mairan's Nebula. It is part of the Orion Molecular Cloud Complex, the same cloud as M42. NASA calls it a miniature Orion Nebula: it is small and is shaped by the radiation of a single massive young star, where the Orion Nebula is lit by four. A small telescope shows it.
- Sources: S-NASA-M43. "Also called Mairan's Nebula" is the repo's `name` field, not checked at a source. NASA's distance (1,600 ly) is left out, see Data conflicts.

### m44 (open cluster, Cancer)
Target: `universe/deep-sky/m44.json`
- fact: The Beehive Cluster, or Praesepe, an open cluster in Cancer about 600 light-years away.
- bio: Galileo resolved about 40 of its stars with his telescope, showing that it was a crowd of stars and not a nebula. NASA counts around 1,000 stars, formed from the same collapsing gas cloud and now about 600 to 700 million years old, mostly blue-white. It covers about three full Moons of sky, so binoculars suit it, resolving around 20 stars. NASA lists it among the clusters closest to Earth.
- Sources: S-NASA-M44.

### m46 (open cluster, Puppis)
Target: `universe/deep-sky/m46.json`
- fact: An open cluster in Puppis, more than 5,000 light-years away, with a planetary nebula in front of it.
- bio: The planetary nebula NGC 2438 appears at the cluster's northern edge, but NASA explains it lies in front of M46, about 2,400 light-years nearer, so the two only line up by chance. William Herschel discovered the nebula in the late 18th century. It formed when a Sun-like star shed its outer layers, and its central white dwarf is what remains of that star. A light-pollution filter on a telescope helps to show it.
- Sources: S-NASA-M46 (re-fetched to check the foreground wording: "located in front of the open star cluster M46 ... roughly 5,400 light-years away, 2,400 light years behind the nebula").

### m47 (open cluster, Puppis) - WEAK sourcing
Target: `universe/deep-sky/m47.json`
- fact: A bright open cluster in Puppis, about 1,600 light-years away, with around 500 members.
- bio: Giovanni Battista Hodierna found it before 1654. Charles Messier recorded it in 1771 with a position that matched no cluster; in 1959 T. F. Morris showed that swapping the signs of his coordinate offsets gives the right place. M47 is about 78 million years old and is dominated by hot blue stars, with a few red giants adding colour. It lies about a degree from M46, which is much older and much farther away.
- Sources: S-WP-M47. Paper behind the age not named by the article; not fetched. NASA page: 404.

### m48 (open cluster, Hydra)
Target: `universe/deep-sky/m48.json`
- fact: An open cluster in Hydra, about 2,500 light-years away, with a tangled discovery history.
- bio: Charles Messier logged it in 1771 but gave a position that did not match the cluster. Johann Elert Bode, around 1782, and Caroline Herschel, in 1783, each found it independently. How many stars it has depends on the count: NASA gives from 100 to 200 core stars up to as many as 1,000 members. It is relatively easy to see with the naked eye under good, dark-sky conditions.
- Sources: S-NASA-M48 ("Bode ~1782" is NASA's approximate date).

### m49 (elliptical galaxy, Virgo)
Target: `universe/deep-sky/m49.json`
- fact: A giant elliptical galaxy in Virgo, about 60 million light-years away, with nearly 6,000 globular clusters.
- bio: Charles Messier discovered it in 1771, and NASA notes it was the first member of the Virgo Cluster to be found. It holds about 200 billion stars. An X-ray source at its core points to a supermassive black hole, estimated at roughly 565 million times the Sun's mass. Binoculars show it as a faint glow.
- Sources: S-NASA-M49 (black-hole mass, star count and globular-cluster count are NASA figures; the underlying papers were not fetched).

### m50 (open cluster, Monoceros) - WEAK sourcing
Target: `universe/deep-sky/m50.json`
- fact: A heart-shaped open cluster in Monoceros, about 3,000 light-years away, with several hundred members.
- bio: Giovanni Domenico Cassini recorded it before 1711, and Charles Messier found it independently in 1772 while watching Biela's Comet. A 1998 study counted 508 confirmed and 109 probable members, with a combined mass above 285 Suns. The cluster spans about 18 light-years and is roughly 150 million years old, and a 2025 study proposes that it is made of two sub-clusters.
- Sources: S-WP-M50 (Kharchenko et al. 2005 distance; Claria et al. 1998 members; Qin et al. 2025 age and sub-clusters). Papers not fetched. NASA page: 404.

### m52 (open cluster, Cassiopeia) - WEAK sourcing
Target: `universe/deep-sky/m52.json`
- fact: A rich open cluster in Cassiopeia, roughly 5,000 light-years away, whose core is short of gas.
- bio: Charles Messier discovered it in 1774. By one estimate its stars are about 150 million years old, and the cluster has about 1,200 times the Sun's mass. Its core shows a lack of interstellar matter, which Pandey and colleagues suggested in 2001 could have been swept away by early supernova explosions. Its members include slowly pulsating B stars and delta Scuti variables.
- Sources: S-WP-M52 (Wu et al. 2009: 4.6 kly, 158.5 Myr; Bonatto & Bica 2006 mass; Pandey et al. 2001; Luo et al. 2012). Papers not fetched. NASA page: 404.

### m53 (globular cluster, Coma Berenices)
Target: `universe/deep-sky/m53.json`
- fact: A globular cluster in Coma Berenices, about 60,000 light-years away, rich in blue stragglers.
- bio: Johann Elert Bode discovered it in 1775. The cluster is roughly spherical and grows denser toward its centre. NASA notes an unusual abundance of blue stragglers, stars that look brighter and younger than the rest, and calls it one of the more distant globular clusters in Messier's catalogue. A small telescope shows it, and larger ones resolve its individual stars.
- Sources: S-NASA-M53; S-BAU (18.50 kpc, about 60,000 ly; NASA says 59,700).

### m54 (globular cluster, Sagittarius)
Target: `universe/deep-sky/m54.json`
- fact: A globular cluster in Sagittarius, about 85,000 light-years away, that belongs to another galaxy.
- bio: Charles Messier discovered it in 1778. M54 is not a native of the Milky Way: it belongs to the Sagittarius Dwarf Elliptical Galaxy, which the Milky Way is gradually absorbing, and the cluster will eventually merge with it. It holds about 1.6 million times the Sun's mass. Binoculars show only a small patch of light, and larger telescopes are needed to resolve its stars.
- Sources: S-NASA-M54; S-BAU (26.28 kpc, about 85,700 ly; mass 1.59 million Suns). NASA says 90,000 ly.

### m55 (globular cluster, Sagittarius)
Target: `universe/deep-sky/m55.json`
- fact: A loosely packed globular cluster in Sagittarius, about 17,500 light-years away, low in the sky for northern observers.
- bio: The French astronomer Nicolas-Louis de Lacaille first saw it in 1752 from South Africa, and Charles Messier catalogued it in 1778. It spans about 100 light-years and holds roughly 100,000 stars, with no dense core and dozens of known variable stars. Because it sits in southern Sagittarius, it is low for northern observers, who look through thicker air and more light pollution.
- Sources: S-NASA-M55 ("a French astronomer in South Africa", 1752; the name Lacaille is not on the NASA page, it is known history: reviewer to confirm); S-BAU (5.35 kpc, about 17,450 ly; NASA says 20,000). NASA's count of 55 variables was written "dozens" because the number looked suspect.

### m56 (globular cluster, Lyra)
Target: `universe/deep-sky/m56.json`
- fact: A globular cluster in Lyra, about 34,000 light-years away, poor in elements heavier than helium.
- bio: Charles Messier discovered it in 1779. Its stars hold relatively little of any element heavier than hydrogen and helium, a sign that they formed early in cosmic history. NASA notes research suggesting that such clusters may have been captured from a satellite galaxy rather than being among the oldest members of the Milky Way's own cluster system. A small telescope shows it.
- Sources: S-NASA-M56; S-BAU (10.43 kpc, about 34,000 ly; NASA says 33,000).

### m58 (barred spiral galaxy, Virgo)
Target: `universe/deep-sky/m58.json`
- fact: A barred spiral galaxy in Virgo, about 60 million light-years away, with a starburst ring around its core.
- bio: Charles Messier discovered it in 1779. NASA reports a central supermassive black hole of about 70 million solar masses and a compact nuclear ring with intense star formation, while its arms form few stars because they are short of hydrogen. Two supernovae were seen in it, in 1988 and 1989. It is a member of the Virgo Cluster, and a telescope of 8 inches or more shows it well.
- Sources: S-NASA-M58 (62 Mly there; "about 60" used). NASA's line that it is the "most distant Messier object" was left out: it conflicts with other Messier galaxies at larger distances (reviewer to confirm).

### m59 (elliptical galaxy, Virgo)
Target: `universe/deep-sky/m59.json`
- fact: An elliptical galaxy in Virgo, about 60 million light-years away, with around 2,200 globular clusters.
- bio: Johann Gottfried Koehler discovered it in 1779, and Charles Messier observed and catalogued it too. A supermassive black hole of roughly 270 million Suns sits at its centre, and the inner 200 light-years rotate in the opposite direction to the rest of the galaxy. Small telescopes show an oval shape with a bright centre, but even larger ones reveal little more detail.
- Sources: S-NASA-M59. NASA's claim that this is the "smallest region in a galaxy known" to counter-rotate was left out as an unchecked superlative.

### m60 (elliptical galaxy, Virgo)
Target: `universe/deep-sky/m60.json`
- fact: A giant elliptical galaxy in Virgo, about 54 million light-years away, paired with the spiral NGC 4647.
- bio: Johann Gottfried Koehler discovered it in 1779. Its central black hole, about 4.5 billion times the Sun's mass, is one of the more massive measured. A tiny companion, M60-UCD1, is a dense dwarf galaxy only 300 light-years across that holds about 140 million stars. M60 and NGC 4647 are listed together as the pair Arp 116.
- Sources: S-NASA-M60 (diameter of 120,000 ly also there, not used).

### m61 (barred spiral galaxy, Virgo)
Target: `universe/deep-sky/m61.json`
- fact: A barred spiral galaxy in Virgo, about 55 million light-years away, with a vigorous burst of star formation.
- bio: Barnaba Oriani discovered it in 1779. Charles Messier saw it independently and at first took it for a comet. NASA classes it as a starburst galaxy, with a suspected supermassive black hole at its core, signalled by an X-ray source. Seven supernovae have been observed in it. It belongs to the Virgo Cluster, and a moderately sized telescope is needed to see it well.
- Sources: S-NASA-M61 (NASA's "most of any galaxy in the Messier catalog" for the supernovae left out as a superlative).

### m62 (globular cluster, Ophiuchus)
Target: `universe/deep-sky/m62.json`
- fact: A lopsided globular cluster in Ophiuchus, about 20,000 light-years away, rich in X-ray binaries.
- bio: Charles Messier discovered it in 1771. Tidal forces from the galactic centre displace its stars toward the southeast, giving it one of the more irregular shapes among the Milky Way's globular clusters, and NASA gives its age as almost 12 billion years. Many X-ray binaries are known in it, and radio observations in 2013 identified a candidate stellar-mass black hole. It is easy to find near the bright star Antares.
- Sources: S-NASA-M62 (NASA says 22,200 ly and 150,000 stars; both left out); S-BAU (6.03 kpc, about 19,700 ly). "candidate" is a hedge on NASA's "contains a stellar-mass black hole" (Chomiuk et al. 2013 not fetched).

### m63 (spiral galaxy, Canes Venatici)
Target: `universe/deep-sky/m63.json`
- fact: The Sunflower Galaxy, a spiral galaxy in Canes Venatici about 27 million light-years away.
- bio: Pierre Méchain discovered it in 1779, and it became the 63rd entry in Messier's catalogue in 1781, the first of 24 objects Méchain contributed. Its pattern looks like the centre of a sunflower: two main arms and many short, broken ones, lit by young blue-white giant stars. It is a flocculent spiral and a member of the M51 Group of galaxies. In a small telescope it shows as a faint patch.
- Sources: S-NASA-M63.

### m64 (spiral galaxy, Coma Berenices)
Target: `universe/deep-sky/m64.json`
- fact: The Black Eye Galaxy, a spiral galaxy in Coma Berenices about 17 million light-years away.
- bio: Edward Pigott found it in 1779, Johann Elert Bode saw it 12 days later, and Charles Messier found it independently in 1780. A broad band of dark dust hides part of its bright core, which gives it its name. The gas in its outer regions rotates in the opposite direction to the gas and stars in its inner regions, which NASA suggests came from a merger with a satellite galaxy more than a billion years ago.
- Sources: S-NASA-M64 (the fetch tool printed Pigott's year as 1719; the 12-day and 1780 sequence only fits 1779 - listed under Data conflicts for the reviewer).

### m65 (spiral galaxy, Leo) - WEAK sourcing
Target: `universe/deep-sky/m65.json`
- fact: A spiral galaxy in Leo, roughly 35 million light-years away, one of the three galaxies of the Leo Triplet.
- bio: Charles Messier discovered it in 1780. It forms the Leo Triplet with M66 and NGC 3628. It shows little star formation, since it is short of dust and gas, and it has a high ratio of old to young stars. Its neighbours appear to have interacted about 800 million years ago, and M65 shows less sign of such an encounter. A Type II supernova, SN 2013am, was found in it in 2013. A small telescope shows it.
- Sources: S-NASA-M65 (discoverer, 35 Mly, Leo Triplet, small telescopes); S-WP-M65 (star-formation, interaction timing, SN 2013am; Wikipedia gives 35-42 Mly). Papers not fetched.

### m66 (spiral galaxy, Leo)
Target: `universe/deep-sky/m66.json`
- fact: A spiral galaxy in Leo, roughly 31 to 35 million light-years away, with lopsided arms.
- bio: Charles Messier identified it on 1 March 1780, describing it as "very long and very faint". Its asymmetric arms and off-centre core are thought to come from gravitational encounters with its neighbour NGC 3628 in the Leo Triplet, which also pulled a clump of hydrogen gas from one arm. Five supernovae have been recorded in it since 1973. A small telescope shows it.
- Sources: S-NASA-M66 (35 Mly, asymmetry); S-WP-M66 (31 Mly, date and quote, clump of H I, five supernovae). Papers not fetched.

### m67 (open cluster, Cancer)
Target: `universe/deep-sky/m67.json`
- fact: An old open cluster in Cancer, about 2,800 light-years away, with many stars much like the Sun.
- bio: Johann Gottfried Koehler recorded it in 1779, and Charles Messier identified it a year later. NASA gives its age as about 4 billion years and calls it the oldest open cluster in Messier's catalogue. It holds over 500 stars, including about 100 that resemble the Sun, many red giants and white dwarfs, and around 30 blue stragglers. It lies nearly 1,500 light-years above the plane of the Milky Way.
- Sources: S-NASA-M67. Distance is the NASA value; not checked against Gaia-era values.

### m68 (globular cluster, Hydra) - WEAK sourcing
Target: `universe/deep-sky/m68.json`
- fact: A globular cluster in Hydra, about 34,000 light-years away, with very few heavy elements.
- bio: Charles Messier discovered it in 1780. Its stars are among the poorest in elements heavier than hydrogen and helium of any globular cluster. It is rich in variable stars: Harlow Shapley found the first 28 in 1919-20, and by 2015 the count had reached 50, most of them RR Lyrae stars. Binoculars show it as a small patch of light.
- Sources: S-WP-M68 (Kains et al. 2015, A&A 578; Boyles et al. 2011); S-NASA-M68 (distance 33,000 ly, binoculars); S-BAU (10.40 kpc, about 33,900 ly). "among the poorest" rests on a single Wikipedia metallicity ([Fe/H] -2.2); reviewer to check.

### m69 (globular cluster, Sagittarius)
Target: `universe/deep-sky/m69.json`
- fact: A globular cluster in Sagittarius, about 29,000 light-years away, unusually rich in heavy elements.
- bio: Charles Messier discovered it in 1780. For a globular cluster M69 is metal-rich: NASA says its stars contain over ten times more iron than stars in other globular clusters of the same age. Astronomers use that composition to understand how stars evolved as the Galaxy's chemistry changed over cosmic history. The Hubble image of it combines visible and infrared light, and binoculars show the cluster.
- Sources: S-NASA-M69 (the "ten times more iron" and the significance are NASA's words); S-BAU (8.90 kpc, about 29,000 ly; NASA says 29,700).

### m70 (globular cluster, Sagittarius)
Target: `universe/deep-sky/m70.json`
- fact: A globular cluster in Sagittarius, about 30,000 light-years away, whose core has collapsed.
- bio: Charles Messier discovered it in 1780. NASA describes its core as collapsed, so its centre is unusually dense, with more stars packed in than in a typical globular cluster, and it holds hundreds of thousands of stars in all. About one in five of the Milky Way's roughly 150 globular clusters shows this. A small telescope shows it.
- Sources: S-NASA-M70; S-BAU (9.36 kpc, about 30,500 ly).

### m71 (globular cluster, Sagitta)
Target: `universe/deep-sky/m71.json`
- fact: A small, sparse globular cluster in Sagitta, about 13,000 light-years away.
- bio: Jean-Philippe Loys de Chéseaux discovered it in the mid-18th century. The cluster is only about 27 light-years across and 9 to 10 billion years old, with stars poor in heavy elements. It is so loose that astronomers argued until the 1970s over whether it was a globular cluster or a dense open cluster. Binoculars show it as a faint patch of light.
- Sources: S-NASA-M71 (all); S-BAU (4.00 kpc, about 13,000 ly).

### m72 (globular cluster, Aquarius)
Target: `universe/deep-sky/m72.json`
- fact: A globular cluster in Aquarius, about 54,000 light-years away, one of the remoter clusters in Messier's catalogue.
- bio: Pierre Méchain discovered it in 1780, the first of five star clusters he found while working with Messier. It has about 80,000 times the Sun's mass, a light cluster as globulars go. Hubble's image shows thousands of stars, hot blue ones and cooler red giants. In small telescopes it appears as a faint patch of light.
- Sources: S-NASA-M72 (remote, five clusters, colours); S-BAU (16.66 kpc, about 54,300 ly; mass 8.1e4 Suns). NASA says 50,000 ly.

### m73 (asterism, Aquarius)
Target: `universe/deep-sky/m73.json`
- fact: A group of four stars in Aquarius that looks like a cluster but is not one.
- bio: Charles Messier discovered it in 1780 and described it as a cluster of four stars with some nebulosity. Astronomers disagreed about it: in 2000 Bassino and colleagues argued it was an old open cluster, while G. Carraro found the stars unrelated. In 2002 M. Odenkirchen and C. Soubiran measured the six brightest stars nearby and found very different distances and motions, showing that the group is a chance alignment, an asterism.
- Sources: S-WP-M73 (Bassino et al. 2000; Carraro 2000; Odenkirchen & Soubiran 2002); search result confirming the 2002 paper, A&A 383, 163, "NGC 6994 - clearly not a physical stellar ensemble", https://arxiv.org/abs/astro-ph/0111601 (listed by the search; not fetched). NASA page: 404.

### m75 (globular cluster, Sagittarius)
Target: `universe/deep-sky/m75.json`
- fact: A tightly concentrated globular cluster in Sagittarius, about 67,000 light-years away, with some 400,000 stars.
- bio: Pierre Méchain discovered it in August 1780, and Charles Messier observed it that October and added it to his catalogue. NASA calls it the most centrally concentrated globular cluster in Messier's catalogue, so dense at the middle that in binoculars it looks like a star, and gives its age as about 13 billion years. A telescope of 10 inches or more is needed to resolve its individual stars.
- Sources: S-NASA-M75; S-BAU (20.52 kpc, about 66,900 ly; NASA says 67,500).

### m76 (planetary nebula, Perseus)
Target: `universe/deep-sky/m76.json`
- fact: The Little Dumbbell Nebula, a planetary nebula in Perseus a few thousand light-years away.
- bio: Pierre Méchain discovered it in 1780. It is one of only four planetary nebulae in Messier's catalogue. Its two lobes make a shell like a balloon pinched at the waist, with nitrogen glowing red and oxygen blue in Hubble's image. It is faint and one of the harder Messier objects to see: large binoculars at a dark site can show it, but a telescope of 8 inches or more is needed to show the two lobes.
- Sources: S-NASA-M76 (all). NASA's distance, 3,400 ly, is not stated in the text because Gaia-era values were not checked, see Data conflicts.

### m77 (spiral galaxy, Cetus)
Target: `universe/deep-sky/m77.json`
- fact: A spiral galaxy in Cetus, about 45 million light-years away, with a brilliant active nucleus.
- bio: Pierre Méchain discovered it in 1780. M77, also known as NGC 1068, is a Seyfert galaxy: its centre is intensely bright, powered by a supermassive black hole. In 1985 Robert Antonucci and Joseph Miller found broad emission lines hidden in its polarised light and argued that a dusty torus hides the central engine from some viewing angles, a finding that supported the unified model of active galaxies. A small telescope shows it.
- Sources: S-NASA-M77 (discoverer, 45 Mly, Seyfert, small telescope); Antonucci & Miller 1985 via search summaries (https://arxiv.org/abs/astro-ph/0210262 and the NED review https://ned.ipac.caltech.edu/level5/Sept04/Shields/Shields4_7.html; listed by search, not fetched). First names Robert Antonucci and Joseph Miller are from memory: reviewer to confirm. "some viewing angles" is a hedge on the unified model.

### m78 (reflection nebula, Orion)
Target: `universe/deep-sky/m78.json`
- fact: A reflection nebula in Orion, about 1,600 light-years away, that looks like a comet.
- bio: Pierre Méchain discovered it in 1780. Dust in the nebula scatters the light of nearby young stars, and one side flares away like a comet's tail, a shape that NASA says has fooled comet hunters into thinking they had found a new object. Hubble observed it in infrared light to study protostars, the earliest stages of a star's life. Binoculars and small telescopes show it, and larger ones show more detail.
- Sources: S-NASA-M78. NASA's 1,600 ly is kept in the text; see Data conflicts (Orion distance).

### m79 (globular cluster, Lepus)
Target: `universe/deep-sky/m79.json`
- fact: A globular cluster in Lepus, about 42,000 light-years away, on the far side of the Galaxy from its centre.
- bio: Pierre Méchain discovered it in 1780. M79 lies roughly 60,000 light-years from the centre of the Milky Way, in the opposite direction from it as seen from Earth, and holds many aging red giants and blue stragglers. It may have been captured from the Canis Major Dwarf Galaxy, NASA says, one of only two clusters in Messier's catalogue that the Milky Way might have taken from other galaxies. Binoculars show its dense heart as a small fuzzy patch.
- Sources: S-NASA-M79 ("might have" is NASA's hedge); S-BAU (13.08 kpc, about 42,700 ly; NASA says 41,000). The other of the two clusters is M54 (above).

### m80 (globular cluster, Scorpius)
Target: `universe/deep-sky/m80.json`
- fact: A dense globular cluster in Scorpius, about 33,000 light-years away, that once hosted a nova.
- bio: Charles Messier discovered it in 1781. In 1860 a nova, an outburst from a white dwarf, flared in the cluster, and Hubble's ultraviolet observations later helped astronomers find the hot, faint remnant. NASA says M80 has more than twice as many blue stragglers as other globular clusters Hubble surveyed, and describes it as one of the densest of the roughly 150 known in the Milky Way. Binoculars or a small telescope show it.
- Sources: S-NASA-M80; S-BAU (10.34 kpc, about 33,700 ly; NASA says 28,000).

## Data conflicts

- Magnitudes: not stated in any text. `deep-sky-objects.json` `mag` mixes V and B bands (batch 1 review); NASA values differ, e.g. m30 repo 7.1 vs NASA 7.7, m55 6.49 vs 6.3, m66 8.92 vs 8.9, m76 10.1 vs 12.0, m27 7.4 vs 7.5, m43 9 vs 9.0, m70 9.06 vs 9.1, m77 9.29 vs 9.6, m46 6.1 vs NASA 10.0, m59 9.56 vs 9.8.
- Distances for globular clusters: NASA vs Baumgardt (Gaia-era, used in the text): m28 18,000 / 17,500; m55 20,000 / 17,450; m62 22,200 / 19,700; m80 28,000 / 33,700; m54 90,000 / 85,700; m72 50,000 / 54,300; m53 59,700 / 60,300; m69 29,700 / 29,000. Text uses Baumgardt's. The repo has no distance for these.
- m43: NASA 1,600 ly; the repo gives m42 1,350 ly (same cloud). Text states no distance. m78 NASA 1,600 ly, kept; the same Orion-region question applies.
- m64: the NASA fetch printed Pigott's date as "March 1719"; text says 1779 (Pigott 12 days before Bode, then Messier 1780). The reviewer should check NASA's page and the original Pigott date.
- m58: NASA's line "most distant Messier object" left out; other Messier galaxies are farther.
- m65 distance: NASA 35 Mly, Wikipedia 35-42 Mly; text uses "roughly 35 million". m66: NASA 35 Mly, Wikipedia 31 Mly; text says "31 to 35 million".
- m36 distance: 4,340 ly (Wu 2009) vs 3,800 ly (Joshi 2020); text gives the range. m29: Gaia EDR3 5,240 ly vs earlier 4,000-7,200.
- m76 distance: NASA 3,400 ly, not checked against Gaia-based planetary-nebula distances; text says "a few thousand".
- m28 pulsar: NASA says it was found in 1986; the discovery paper is usually dated 1987 (Lyne et al., Nature); text says "in the 1980s".
- `deep-sky-objects.json` `type` is null for every object in this batch. m24 is a star cloud, m43 and m78 are nebulae and m73 is an asterism (Odenkirchen & Soubiran 2002): fill `type` before the pages label them.

## Not sourced, left out

- Cultural or mythological claims (Ptolemy / Aristotle / Hodierna as earliest observer beyond the one-line Wikipedia attributions kept above).
- Any magnitude, month of year, or "best seen" statement.
- Black-hole masses beyond NASA's popular figures for m49 (565 million), m58 (70 million), m59 (270 million), m60 (4.5 billion) are NASA-only; the underlying papers were not fetched.
- M37 planetary nebula, M41 Aristotle claim, M58 "most distant", M59 and M49 superlatives, M61 "most supernovae", M77 "one of the largest": all left out.
- Ages of the globular clusters (except those NASA gives) and the pre-Gaia open-cluster ages: not checked against recent literature.
- Wikipedia-only pages (m25, m26, m29, m34, m36, m37, m38, m39, m41, m47, m50, m52, m65, m66, m68, m73): papers behind each number were not fetched; every NASA page was read through a summarising fetch tool, not line by line, so the reviewer should re-fetch the weak items.
- Distances for open clusters were not compared with Gaia-era catalogues (Cantat-Gaudin 2020, Hunt & Reffert 2023) except m29 (Gaia EDR3, as quoted by Wikipedia).
