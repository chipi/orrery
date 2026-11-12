# Deep text, batch 6 (drafts): the 30 structures

Drafts only. Nothing here is in `i18n-src/` or `static/` yet. 2026-11-13, branch `tech-debt/0.9.9`. Not yet science-reviewed.

## Shape and selection

- Same shape as batches 4 and 5: new overlay `i18n-src/en-US/universe/structures/<id>.json` with `fact` and `bio` plus one or two `links` (host, label, `t`: intro or core), per the galaxy-pages brief (2026-11-12, decisions of 2026-11-13). Counts are `fact` + `bio` characters, with spaces, measured with a script file (`b6-count.mjs` in the session scratchpad).
- Selection: the 30 structures of `local-sheet.json` (9), `virgo-cluster.json` (7, `local-group` shared), `laniakea.json` (8) and `cosmic-web.json` (7, `laniakea` shared): 9 groups, 5 clouds, 3 clusters, 7 superclusters, 1 attractor, 1 concentration, 3 walls, 1 void. Ids are as written in the data files.
- Each text says what the structure is and what is measured; key members are named as the site names them so the page's Related list connects them (Milky Way, Andromeda Galaxy, Triangulum Galaxy, Large and Small Magellanic Cloud, Bode's Galaxy, Cigar Galaxy, Southern Pinwheel Galaxy, Virgo Galaxy, Perseus Cluster, M95, M96, M101, M105, M108, M109, IC 342, NGC 1365, and the other structures).
- Never named in reader-facing text: Wikipedia. Source tags: S-WP-x = the Wikipedia article was fetched and used as a pointer; where a number or a claim rests on it alone, the Sources line says so and the claim is also in NOT VERIFIED. "Search summary" = a WebSearch result summary of a page that was not itself fetched. Link URLs are pages that were fetched.
- Sizes are "about" or "extends about". Distances are "about". Conversions from megaparsecs use 3.26 million light-years per megaparsec and are rounded. Conversions from redshift (cz) to Mpc, where marked "my conversion", use H0 = 70 km/s/Mpc and are not from a source.
- Several of the 30 have thin literature or a single-source claim: Canes Venatici Spur, Virgo II Groups, NGC 5846 Group, Centaurus Cluster, Antlia Cluster, Pavo-Indus, Ophiuchus, Ursa Major Cloud, Leo I Cloud. They are marked SHORT in the table when under 400 and say in Sources what the single source is. Nothing is padded.

## Structures

### local-group (group, Local Sheet and Virgo)
Target: `universe/structures/local-group.json`
- fact: The Local Group is the set of galaxies bound together by gravity that contains the Milky Way, about 10 million light-years across.
- bio: McConnachie's 2012 catalogue lists over 100 galaxies within 3 megaparsecs of the Sun, among them satellites of the Milky Way and the Andromeda Galaxy and isolated dwarfs. The Milky Way, the Andromeda Galaxy and the Triangulum Galaxy are its three large spirals, and the Large and Small Magellanic Clouds orbit the Milky Way. McCall (2014) finds that a sphere 3.75 megaparsecs across marks the upper limit of its realm of influence.
- links: arXiv, McConnachie 2012 (https://arxiv.org/abs/1204.1562, core); arXiv, McCall 2014 (https://arxiv.org/abs/1403.3667, core)
- Sources: arXiv 1204.1562 (fetched: over 100 nearby galaxies within 3 Mpc, satellites and isolated dwarfs), arXiv 1403.3667 (fetched: Council of Giants 3.75 Mpc, upper limit of the group's realm of influence, Local Sheet). Spiral count and kinds from `local-group.json`. "Satellites of the Milky Way" for the Magellanic Clouds is general knowledge, McConnachie's abstract names satellite systems without naming them.

### ic-342-group (group, Local Sheet)
Target: `universe/structures/ic-342-group.json`
- fact: A small group of galaxies around the spiral IC 342, about 11 million light-years away, seen through the dust of the Milky Way's disc.
- bio: IC 342 lies at low Galactic latitude, where dust makes distances hard to measure. An infrared tip-of-the-red-giant-branch measurement by Wu and colleagues (2014) gives 3.45 ± 0.13 megaparsecs. The group was long paired with Maffei 1 and 2 as one IC 342/Maffei group. Anand and colleagues (2019) put Maffei 2 at 5.73 ± 0.40 megaparsecs, 2.5 megaparsecs behind the IC 342 Group, so the two are now treated as separate groups.
- links: arXiv, Wu 2014 (https://arxiv.org/abs/1404.2987, core); arXiv, Anand 2019 (https://arxiv.org/abs/1901.05981, core)
- Sources: arXiv 1404.2987 (fetched: IC 342 3.45 ± 0.13 Mpc, method suited to obscured low-latitude galaxies), arXiv 1901.05981 (fetched: Maffei 2 5.73 ± 0.40 Mpc, 2.5 Mpc behind the IC 342 Group). Data 3.3 Mpc; Huchtmeier 1999 (astro-ph/9907344, fetched) gave 2.2 ± 0.5 Mpc, superseded; a search summary quotes 3.28 ± 0.15 for the dwarf members, source not opened.

### m81-group (group, Local Sheet)
Target: `universe/structures/m81-group.json`
- fact: A group of galaxies around Bode's Galaxy (M81), about 12 million light-years away, among the nearest groups to the Local Group.
- bio: M81, the Cigar Galaxy (M82) and NGC 3077 are its three main galaxies, and neutral hydrogen forms bridges between them, a sign of past close encounters. These tides are thought to have stripped gas from the galaxies and to drive the intense star formation in M82 and NGC 3077. Karachentsev and colleagues (2002) measured Hubble distances to 13 late-type galaxies of the M81 and NGC 2403 complex, about 50 galaxies in all. Their group distance is about 3.6 megaparsecs.
- links: arXiv, Karachentsev 2005 (https://arxiv.org/abs/astro-ph/0410065, core); Wikipedia (https://en.wikipedia.org/wiki/M81_Group, intro)
- Sources: arXiv astro-ph/0410065 (fetched: the M81 group is one of six nearby groups with about 10% distances from red giant branch stars), a search summary of Karachentsev et al. 2002, A&A 383, 125 (about 50 galaxies, 13 HST distances; the aanda.org page returned 403, the paper was not read). S-WP-M81Group (3.6 Mpc, H I bridges, starbursts in M82 and NGC 3077, "one of the nearest groups"): the distance and the tidal claims rest on this pointer only. The arXiv id of the 2002 paper was not confirmed (astro-ph/0210414 turned out to be the CVn I paper).

### centaurus-a-group (group, Local Sheet)
Target: `universe/structures/centaurus-a-group.json`
- fact: A complex of galaxies around Centaurus A and Messier 83, about 12 to 15 million light-years away, made of two sub-groups.
- bio: Karachentsev and colleagues (2007) measured 24 nearby galaxies with Hubble. Centaurus A lies at 3.76 ± 0.05 megaparsecs and the M83 sub-group at 4.79 ± 0.10, about a megaparsec farther. The Centaurus A sub-group is the more massive, with an orbital mass of 6 to 8 trillion Suns against about 1 trillion for M83's. Both sub-groups move with small peculiar velocities relative to the smooth cosmic expansion. The Southern Pinwheel Galaxy (M83) is its second large spiral.
- links: arXiv, Karachentsev 2007 (https://arxiv.org/abs/astro-ph/0603091, core)
- Sources: arXiv astro-ph/0603091 (fetched: 24 galaxies, Cen A 3.76 ± 0.05 Mpc, M83 group 4.79 ± 0.10 Mpc, masses (6.4-8.1) and (0.8-0.9) x 10^12, small peculiar velocities). The fact line gives a range because the data file's single 3.7 Mpc fits only the Cen A sub-group. Data conflict, see below.

### sculptor-group (group, Local Sheet)
Target: `universe/structures/sculptor-group.json`
- fact: A loose filament of galaxies around the spiral NGC 253, about 12 million light-years away, not a tight, bound group.
- bio: Karachentsev and colleagues (2003) measured Hubble distances to nine galaxies of the region, from 3.34 to 4.92 megaparsecs, with NGC 253 at 3.94. The galaxies lie in several loose groups around NGC 253, NGC 300 and NGC 7793, and with the Canes Venatici I Cloud and the Local Group they form a 10-megaparsec filament driven by the free cosmic expansion. In 2021 two dwarfs at about 3.6 megaparsecs were confirmed as members of the NGC 253 group, with a mass of about 8 × 10^11 Suns.
- links: arXiv, Karachentsev 2003 (https://arxiv.org/abs/astro-ph/0302045, core); arXiv, Karachentsev 2021 (https://arxiv.org/abs/2102.11354, core)
- Sources: arXiv astro-ph/0302045 (fetched abstract and ar5iv text: nine distances 3.34-4.92 Mpc, NGC 253 3.94, 10 Mpc amorphous filament driven by free Hubble flow, loose groups around NGC 300, 253, 7793, "loose filament rather than a bound system" extending about 6 Mpc), arXiv 2102.11354 (fetched: 3.62 ± 0.18 and 3.66 ± 0.18 Mpc, mass (8.1 ± 2.6) x 10^11). Data conflict: data 3.7 Mpc, NGC 253 3.94 Mpc (2003) but the 2021 dwarfs at 3.6; the text follows the data in the fact line.

### maffei-group (group, Local Sheet)
Target: `universe/structures/maffei-group.json`
- fact: A group of galaxies around Maffei 1 and 2, about 19 million light-years away, seen through the dust of the Milky Way's disc.
- bio: Maffei 1 and 2 lie near the plane of the Milky Way, where dust makes distances uncertain. An infrared measurement in 2014 placed them at about 3.4 to 3.5 megaparsecs, beside IC 342. Anand and colleagues (2019) put Maffei 2 at 5.73 ± 0.40 megaparsecs, which places the Maffei Group 2.5 megaparsecs behind the IC 342 Group. They find it moving toward the Local Group at 128 ± 33 kilometres per second, which they attribute to void expansion from the direction of Perseus-Pisces.
- links: arXiv, Anand 2019 (https://arxiv.org/abs/1901.05981, core); arXiv, Wu 2014 (https://arxiv.org/abs/1404.2987, core)
- Sources: arXiv 1901.05981 (fetched: 5.73 ± 0.40 Mpc, 2.5 Mpc behind IC 342, -128 ± 33 km/s, void expansion from Perseus-Pisces), arXiv 1404.2987 (fetched: Maffei 1 3.37 +0.32/-0.23, Maffei 2 3.52 +0.32/-0.30 Mpc). "Near the plane" is from S-WP-IC342/Maffei (pointer) and the Wu abstract's remark on low-latitude obscured galaxies. Data 5.7 Mpc agrees with Anand 2019.

### ngc-6946-group (group, Local Sheet)
Target: `universe/structures/ngc-6946-group.json`
- fact: A small group of dwarf galaxies around the spiral NGC 6946, the Fireworks Galaxy, about 25 million light-years away.
- bio: Karachentsev, Sharina and Huchtmeier (2000) found eight late-type galaxies in it, about 420 kiloparsecs across in projection, and set its distance at 5.9 megaparsecs from the brightest blue stars. Anand, Rizzi and Tully (2018) measured NGC 6946 with the tip of the red giant branch and got 7.72 ± 0.32 megaparsecs, higher than most earlier values. At that distance the supernovae seen in NGC 6946 are about 2.3 times more luminous than the older distance implied.
- links: arXiv, Anand 2018 (https://arxiv.org/abs/1807.05229, core); arXiv, Karachentsev 2000 (https://arxiv.org/abs/astro-ph/0010148, core)
- Sources: arXiv 1807.05229 (fetched: 7.72 ± 0.32 Mpc, "higher than most values", supernovae about 2.3 times more luminous, coherent motion toward the Local Sheet plane), arXiv astro-ph/0010148 (fetched: eight late-type members, 5.9 ± 0.4 Mpc, 420 kpc). The data's 7.7 follows Anand 2018. "Fireworks Galaxy" as the popular name of NGC 6946 is from the title of the Anand paper.

### m101-group (group, Local Sheet)
Target: `universe/structures/m101-group.json`
- fact: A loose group of galaxies around the Pinwheel Galaxy (M101), about 21 to 23 million light-years away.
- bio: Müller and colleagues (2017) searched 330 square degrees of Sloan Digital Sky Survey images around M101, M51 and M63 and found 15 new dwarf-galaxy candidates. The spirals lie at 7.0, 8.6 and 9.0 megaparsecs on a thin filament about 3 megaparsecs long, which the authors tie to the expansion of the Local Void. Tikhonov and colleagues (2015) used the tip of the red giant branch to find four dwarf companions of M101: NGC 5474, NGC 5477, UGC 8837 and UGC 9405.
- links: arXiv, Müller 2017 (https://arxiv.org/abs/1701.03681, core); Wikipedia (https://en.wikipedia.org/wiki/M101_Group, intro)
- Sources: arXiv 1701.03681 (fetched: 330 sq deg SDSS, 15 candidates, 7.0 / 8.6 / 9.0 Mpc, thin filament about 3 Mpc, rms thickness 67 kpc, Local Void), a search summary for Tikhonov et al. 2015 (four dwarf companions; paper not fetched), S-WP-M101Group (member list). Data conflict: data 6.4 Mpc (20.9 Mly), Müller 7.0 Mpc (22.8 Mly); the fact gives the range. "Group" membership counts differ widely between sources (7 to 15) and are not stated.

### ngc-5846-group (group, Virgo Supercluster)
Target: `universe/structures/ngc-5846-group.json`
- fact: A group of galaxies centred on the elliptical NGC 5846, about 85 million light-years away, part of the string of groups called Virgo III.
- bio: Tully's Nearby Galaxies Catalog of 1987 sorts the nearby galaxies into groups. The Virgo III Groups are at least 13 of them, in a structure about 27 megaparsecs away that is elongated toward the Virgo Cluster, as the Leo Cloud is. Each group is named for its brightest galaxy: NGC 5846 leads one, and NGC 5746 and NGC 5566 lead others.
- links: Wikipedia (https://en.wikipedia.org/wiki/NGC_5846_Group, intro)
- Sources: S-WP-VirgoIII (87 Mly / 27 Mpc, at least 13 groups, 41-1 NGC 5846, 41-2 NGC 5746, 41-3 NGC 5566, elongated toward Virgo like the Leo Cloud, refs Tully 1987, Tully 1982, Kim 2016), the only source for every claim here. No primary paper fetched. Data 26 Mpc (about 85 Mly) vs the pointer's 27 Mpc: consistent.

### canes-venatici-i (cloud, Local Sheet)
Target: `universe/structures/canes-venatici-i.json`
- fact: A cloud of about 18 galaxies in Canes Venatici, roughly 13 million light-years away, expanding with the universe rather than collapsing.
- bio: Karachentsev and colleagues (2003) measured 18 of its galaxies with Hubble: a mean distance of 4.1 ± 0.2 megaparsecs, a mean velocity of 286 ± 9 kilometres per second and a velocity dispersion of 50. Its crossing time of about 15 billion years means it is far from equilibrium: the cloud is driven by the free cosmic expansion, not by galaxy interactions. With the Sculptor complex and the Local Group it lies on a 10-megaparsec filament.
- links: arXiv, Karachentsev 2003 (https://arxiv.org/abs/astro-ph/0210414, core)
- Sources: arXiv astro-ph/0210414 (fetched: 18 galaxies, 4.1 ± 0.2 Mpc, 286 ± 9 km/s, 50 km/s, 2.2 x 10^10 L_sun blue, "transient dynamical state", crossing time 15 Gyr), arXiv astro-ph/0302045 (fetched: 10 Mpc filament). Data 4.0 Mpc agrees within the error.

### canes-venatici-spur (cloud, Virgo Supercluster)
Target: `universe/structures/canes-venatici-spur.json`
- fact: A thin filament of galaxies in Canes Venatici, about 8 megaparsecs (26 million light-years) away, that links a larger cloud to the Virgo Cluster.
- bio: Tully's Nearby Galaxies Catalog (1988) lists it as structure 43. It runs from the NGC 5353/54 Group toward the Virgo Cluster, linking the Canes Venatici-Camelopardalis Cloud to Virgo, and so offers a shortcut to the cluster.
- links: Wikipedia (https://en.wikipedia.org/wiki/Canes_II_Group, intro)
- Sources: a search summary (extended search) of the Wikipedia articles M94 Group and NGC 5353/4 Group: "filament running from near the NGC 5353/54 Group to the Virgo Cluster ... structure 43 in the Nearby Galaxies Catalog (Tully 1988)". Those two articles were not fetched. arXiv 0802.1737 (Tully and Trentham 2008, fetched) does not mention the spur in its abstract. The Wikipedia article for Canes Venatici Spur returned 404. UNSOURCED beyond that: the 8 Mpc distance (26 Mly, from the data file only), the 7 Mly size, the member list. The "shortcut" wording is from the same search summary. SHORT (369). The whole text rests on one search summary. The link is a fetched page (Canes II Group) that does not itself describe the spur: replace it when a better page is found.

### leo-i-cloud (cloud, Virgo Supercluster)
Target: `universe/structures/leo-i-cloud.json`
- fact: The Leo I Cloud, a string of galaxy groups in Leo that includes the M96 Group, about 36 million light-years away.
- bio: Karachentsev, Nasonova and Karachentseva (2015) measured distances and peculiar velocities for 290 galaxies in Leo and Cancer, identifying 23 groups. They report that the Leo I group around NGC 3379, with NGC 3627 and the Local Group, moves away from the Local Void toward the Leo cloud at about 400 kilometres per second. M95, M96 and M105 are its brightest galaxies.
- links: arXiv, Karachentsev 2015 (https://arxiv.org/abs/1502.04253, core); Wikipedia (https://en.wikipedia.org/wiki/Leo_I_Group, intro)
- Sources: arXiv 1502.04253 (fetched: 290 galaxies, 23 groups, 20 pairs, 400 km/s toward the Leo cloud). S-WP-M96Group (M96, M95, M105 as brightest; 37 Mly). The "Leo cloud" the paper means is the more distant Leo Cloud (about 26 Mpc in the pointer and about 22 Mpc in a search summary), not this entity: the text says "toward the Leo cloud" and does not say it is the same. SHORT risk: borderline.

### ursa-major-cloud (cloud, Virgo Supercluster)
Target: `universe/structures/ursa-major-cloud.json`
- fact: A cloud of galaxies in Ursa Major that contains the spiral-rich Ursa Major Cluster, about 60 million light-years away.
- bio: The Ursa Major Cluster is a loose, spiral-rich system whose members include M108 and M109; it holds about 30 per cent of the light but only about 5 per cent of the mass of the Virgo Cluster. Tully and Verheijen (1997) adopted a distance of 15.5 megaparsecs for it, and later work puts its galaxies at about 18.6 megaparsecs, the value used here. Tully's catalogue gives about 580 galaxies in the surrounding cloud.
- links: Wikipedia (https://en.wikipedia.org/wiki/Ursa_Major_Cluster, intro)
- Sources: S-WP-UrsaMajorCluster (18.6 Mpc, spiral-rich, 30% of the light and 5% of the mass of Virgo, M108 and M109 as members, about 580 galaxies in the cloud; refs Tully and Fisher 1987, Tully et al. 1996, Courtois 2013), a search summary of Tully and Verheijen 1997 (15.5 Mpc adopted; arXiv astro-ph/9703029 per the search, not fetched; "later studies 18.6"). Every number here is pointer or search-summary level. The 580 count is attributed to Tully's catalogue by the writer, not by the pointer, and should be checked or cut. Data conflict: 18.6 vs the original 15.5.

### virgo-ii-groups (cloud, Virgo Supercluster)
Target: `universe/structures/virgo-ii-groups.json`
- fact: The Virgo II Groups, a set of galaxy groups in the Virgo Supercluster, roughly 55 to 80 million light-years away.
- bio: They form the upper branch of the supercluster, with the Leo Cloud as the lower branch. The structure is made of at least 100 galaxies and clusters, collected into groups named for a bright member: the M61 Group and the NGC 4030, 4179, 4697, 4699, 4753, 4856 and 5084 Groups.
- links: Wikipedia (https://en.wikipedia.org/wiki/Virgo_II_Groups, intro)
- Sources: S-WP-VirgoII (55-80 Mly, at least 100 galaxies and clusters, the eight named groups, ref Powell 2006 "An Atlas of the Universe"), S-WP-LeoCloud (Virgo II = upper branch, Leo Cloud = lower branch of the Virgo Supercluster), a search summary of Tully 1982 (clouds including Virgo II). No primary paper fetched. SHORT. Data 18 Mpc (59 Mly) is inside the quoted range.

### virgo-cluster (cluster, Virgo Supercluster)
Target: `universe/structures/virgo-cluster.json`
- fact: A cluster of galaxies in Virgo centred on the giant elliptical M87, about 54 million light-years away, the heart of the Virgo Supercluster.
- bio: Mei and colleagues (2007) used Hubble surface-brightness fluctuations for 84 galaxies: 79 give a mean distance of 16.5 ± 0.1 (random) ± 1.1 (systematic) megaparsecs, and five lie at about 23 in the W' cloud behind. The cluster is slightly triaxial and about 2.4 megaparsecs deep, with subclusters around the Virgo Galaxy (M87), at 16.7, and M49, at 16.4. Shaya and colleagues (2017) model its mass as 6.3 × 10^14 Suns.
- links: arXiv, Mei 2007 (https://arxiv.org/abs/astro-ph/0702510, core); arXiv, Shaya 2017 (https://arxiv.org/abs/1710.08935, core)
- Sources: arXiv astro-ph/0702510 (fetched: 84 SBF distances, 79 at 16.5 ± 0.1 ± 1.1 Mpc, 5 at about 23 Mpc, depth 2.4 ± 0.4, M87 16.7 ± 0.2 and M49 16.4 ± 0.2), arXiv 1710.08935 (fetched: Virgo mass 6.3 ± 0.8 x 10^14, turnaround radius 7.3 ± 0.3 Mpc). Data 16.5 Mpc agrees.

### centaurus-cluster (cluster, Laniakea)
Target: `universe/structures/centaurus-cluster.json`
- fact: A rich cluster of galaxies in Centaurus, about 170 million light-years away, in the Hydra-Centaurus Supercluster.
- bio: Catalogued as Abell 3526 (A3526), it has the giant elliptical NGC 4696 as its brightest member and a redshift of 0.0114. It is made of two parts: the main group Cen 30 and a subgroup, Cen 45, centred on NGC 4709, which moves at about 1,500 kilometres per second relative to Cen 30 and is merging with it. The hot gas between its galaxies has been mapped in X-rays with the Chandra Observatory.
- links: Wikipedia (https://en.wikipedia.org/wiki/Centaurus_Cluster, intro)
- Sources: S-WP-CentaurusCluster (170 Mly, about 100 galaxies, A3526, NGC 4696, Cen 30 and Cen 45, 1,500 km/s, z = 0.01140, Chandra X-ray studies), the only source for every claim; no primary paper fetched. Data 52 Mpc = 170 Mly, consistent. SHORT risk.

### antlia-cluster (cluster, Laniakea)
Target: `universe/structures/antlia-cluster.json`
- fact: A cluster of galaxies in Antlia, about 130 million light-years away, in the Hydra-Centaurus Supercluster.
- bio: Abell S0636 has about 234 galaxies in two subgroups, a northern one around NGC 3268 and a southern one around NGC 3258, two massive ellipticals. It has no single dominant central galaxy and is rich in early-type and dwarf elliptical galaxies. Its X-ray gas is nearly isothermal at about 2 keV, and its binding mass is about 3.3 × 10^14 Suns. Dirsch, Richtler and Bassino (2003) studied the globular clusters of NGC 3258 and NGC 3268.
- links: Wikipedia (https://en.wikipedia.org/wiki/Antlia_Cluster, intro)
- Sources: S-WP-AntliaCluster (40.7 Mpc, 234 galaxies, NGC 3268 and NGC 3258, Bautz-Morgan III, 2.0 keV, 3.3 x 10^14, Dirsch et al. 2003), S-WP-HydraCentaurus (Antlia Wall, Hydra-Centaurus). Every claim rests on the pointers; no primary paper fetched. The "third-nearest cluster" superlative is left out. Data 40 Mpc, pointer 40.7 Mpc.

### virgo-supercluster (supercluster, Laniakea and Cosmic web)
Target: `universe/structures/virgo-supercluster.json`
- fact: The Virgo Supercluster, or Local Supercluster, holds the Local Group and the Virgo Cluster and spans about 110 to 150 million light-years.
- bio: Tully (1982) described the Local Supercluster as an overdensity of galaxies on the northern sky that holds the Virgo Cluster and several tens of small groups. It is not the largest unit our galaxy belongs to: Tully and colleagues (2014) found it is one lobe of Laniakea, a region defined by galaxy flows, not density. The Virgo Cluster is its dominant concentration; the Local Group lies on its outskirts.
- links: arXiv, Tully 2014 (https://arxiv.org/abs/1409.0880, core); Wikipedia (https://en.wikipedia.org/wiki/Virgo_Supercluster, intro)
- Sources: arXiv 1409.0880 (fetched: flows diverge as at watershed divides; the supercluster is the volume within the surface), a search summary of the Tully 1982 ApJ 257, 389 abstract (disc 60% / halo 40% of luminous galaxies, extends over 90 degrees, Virgo and several tens of small groups; the ADS page returned 405 and was not opened), S-WP-VirgoSupercluster (147 Mly major axis, at least 100 groups and clusters, 1.48 x 10^15 Msun, "Virgo Extension", refs Tully 1982, Klypin 2003, Einasto 2007). Data conflict: diam 110 Mly (the file's note says about 33 Mpc), pointer 147 Mly; the fact states the range. The disc-halo split and the clouds list were cut for length.

### great-attractor (attractor, Laniakea)
Target: `universe/structures/great-attractor.json`
- fact: The Great Attractor is a region toward Norma, about 220 million light-years away, that galaxies including ours flow toward.
- bio: It was found in the 1980s from the motions of elliptical galaxies and lies behind the dust of the Milky Way's disc. Woudt and Kraan-Korteweg (2000) found the Norma cluster (Abell 3627) at 4,844 kilometres per second, comparable in size and mass to Coma, and argue it marks the centre of the Great Attractor, where the Centaurus Wall meets the Norma supercluster. The Shapley Concentration also pulls on us (Hoffman and colleagues, 2017).
- links: arXiv, Woudt 2000 (https://arxiv.org/abs/astro-ph/0006126, core); Wikipedia (https://en.wikipedia.org/wiki/Great_Attractor, intro)
- Sources: arXiv astro-ph/0006126 (fetched: Norma cluster ACO 3627 at 4,844 km/s, comparable to Coma, marks the GA centre, Centaurus Wall and Norma supercluster, extinction 3-5 mag), arXiv 1702.02483 (fetched: Shapley the main attractor within 7,000 km/s, Dipole Repeller). S-WP-GreatAttractor (150-250 Mly, the 1980s, about 400 ellipticals, zone of avoidance, moving toward Shapley): "found in the 1980s", "elliptical galaxies" and "behind the disc" rest on this pointer. The Laniakea-centred-on-it clause was cut; the Dipole Repeller and Tully-focus claims are not in the text. Data conflict: dist_mpc 68 (222 Mly); Norma cz 4,844 km/s = 69 Mpc (my conversion).

### hydra-centaurus (supercluster, Laniakea)
Target: `universe/structures/hydra-centaurus.json`
- fact: A supercluster of galaxy clusters toward Hydra and Centaurus, about 130 to 150 million light-years away, and a lobe of Laniakea.
- bio: It has two parts: the Centaurus part, with a filament of four Abell clusters (A3537, A3565, A3574 and AS753) and the Centaurus Cluster itself, and the Hydra part, the Antlia or Hydra Wall, which contains the Hydra Cluster (A1060) and the Antlia Cluster. Tully and colleagues (2014) showed it is only a lobe of a greater structure, Laniakea. Its Great Attractor end is dominated by the Norma Cluster (Abell 3627).
- links: Wikipedia (https://en.wikipedia.org/wiki/Hydra%E2%80%93Centaurus_Supercluster, intro)
- Sources: S-WP-HydraCentaurus (centre 39 Mpc, out to 69 Mpc, four-cluster filament, Antlia Wall with Hydra and Antlia clusters, Norma Cluster, refs Tully 2014, Courtois 2013 AJ 146, 69, Pomarede 2017 ApJ 845, 55, Plionis and Valdarnini 1991), the only source for the member list; arXiv 1306.0091 (Courtois 2013, fetched: abstract has no Hydra-Centaurus numbers). Data conflict: data 45 Mpc (147 Mly); pointer centre 39 Mpc (127 Mly). The 600 km/s bulk flow toward Norma was cut. SHORT risk.

### pavo-indus (supercluster, Laniakea)
Target: `universe/structures/pavo-indus.json`
- fact: A supercluster toward Pavo and Indus, about 200 to 230 million light-years away, in the southern sky, and a lobe of Laniakea.
- bio: It is a wall or filament about 66 megaparsecs, 215 million light-years, long. Three main clusters make it up, Abell 3656, Abell 3698 and Abell 3742, with the NGC 6769 Group and others. Fairall (1988) linked it to the Centaurus supercluster, and Tully and colleagues (2014) place it as a lobe of Laniakea, centred on the Great Attractor.
- links: Wikipedia (https://en.wikipedia.org/wiki/Pavo%E2%80%93Indus_Supercluster, intro)
- Sources: S-WP-PavoIndus (60-70 Mpc = 196-228 Mly, wall or filament 66 Mpc, A3656, A3698, A3742, NGC 6769 Group, Fairall 1988, Tully 2014); the only source. "In the southern sky" is the writer's reading of the constellation names, not from the pointer. Data 70 Mpc is at the top of the quoted range. SHORT.

### ophiuchus-supercluster (supercluster, Laniakea)
Target: `universe/structures/ophiuchus-supercluster.json`
- fact: A supercluster centred on the Ophiuchus Cluster, about 390 to 450 million light-years away, and a part of Laniakea.
- bio: The Ophiuchus Cluster, a rich cluster with a central cD galaxy, was found in 1981 on Palomar plates by Ken-ichi Wakamatsu and Matthew Malkan. It has at least two more clusters, four groups and several field galaxies as members, over a major axis of about 300 million light-years, at a redshift of 0.028. Tully and colleagues (2014) found it lies inside Laniakea, and a 2023 study with Cosmicflows-4 proposed that Laniakea is a cocoon holding smaller superclusters.
- links: Wikipedia (https://en.wikipedia.org/wiki/Ophiuchus_Supercluster, intro)
- Sources: S-WP-Ophiuchus (455 ± 32 Mly, z = 0.028, 303 Mly major axis, discovery 1981 by Wakamatsu and Malkan, in Laniakea per Tully 2014, Valade 2024), S-WP-Laniakea ("supercluster cocoon", Dupuy and Courtois 2023, possible association with the Ophiuchus Cluster basin). arXiv 2305.02339 (fetched) does not mention Ophiuchus in its abstract. The only source for every claim. Data conflict: dist_mpc 119 (388 Mly); pointer 139.6 Mpc (455 Mly). z = 0.028 is cz 8,400 km/s = 120 Mpc at H0 = 70 (my conversion), so the pointer's 455 Mly uses a lower H0. The fact states the range. SHORT risk.

### fornax-eridanus (supercluster, Laniakea)
Target: `universe/structures/fornax-eridanus.json`
- fact: A complex of galaxy groups around the Fornax Cluster, about 65 million light-years away, which this site files under the southern part of Laniakea.
- bio: Nasonova, de Freitas Pacheco and Karachentsev (2011) used 109 galaxies within 20 megaparsecs of the Fornax centre to map the Hubble flow around it. Their infall method gives a mass of 0.4 to 3.3 × 10^14 Suns for the Fornax Cluster, and 1.3 to 3.9 × 10^14 for the whole Fornax-Eridanus complex. Fornax is at about 18.6 megaparsecs, the complex's barycentre at 21.1, according to papers it cites. NGC 1365 is its best-known spiral.
- links: arXiv, Nasonova 2011 (https://arxiv.org/abs/1106.1291, core)
- Sources: arXiv 1106.1291 (fetched abstract: 109 galaxies within 20 Mpc, spherical infall masses 0.40-3.32 and 1.30-3.93 x 10^14); a search summary for 18.6 ± 0.3 Mpc (modulus 31.35) and 21.1 Mpc (complex barycentre, 19.6 for the NGC 1399 gravity centre), both quoted from search snippets of the A&A papers whose pages were not fetched. "Southern part of Laniakea": the data file name "(Southern)" and S-WP-Laniakea (the Southern Supercluster is one of Laniakea's components); whether the Fornax-Eridanus complex is what Tully calls the Southern Supercluster was not verified. NGC 1365 as "best-known spiral" is the writer's wording; batch 4 describes it as a barred spiral in the Fornax Cluster. Data 20 Mpc inside the 19.6-21.1 range.

### laniakea (supercluster, Cosmic web)
Target: `universe/structures/laniakea.json`
- fact: Laniakea is the basin of gravitational attraction that contains the Milky Way, about 400 to 520 million light-years across.
- bio: Tully, Courtois, Hoffman and Pomarède (2014) traced where peculiar-velocity flows diverge, as water does at watershed divides, and defined a supercluster as the volume within that surface. Laniakea takes in the Virgo Supercluster, the Hydra-Centaurus and Pavo-Indus Superclusters and the Great Attractor. Dupuy and Courtois (2023) redrew the watersheds with Cosmicflows-4 and defined five more superclusters the same way: Apus, Hercules, Lepus, Perseus-Pisces and Shapley.
- links: arXiv, Tully 2014 (https://arxiv.org/abs/1409.0880, core); arXiv, Dupuy 2023 (https://arxiv.org/abs/2305.02339, core)
- Sources: arXiv 1409.0880 (fetched: definition by flow divergence; the abstract gives no size, galaxy count or mass), arXiv 2305.02339 (fetched: 2 x 10^6 (Mpc/h)^3, Apus, Hercules, Lepus, Perseus-Pisces, Shapley, A&A 678, A176), S-WP-Laniakea (about 120 Mpc / 400 Mly across, 100,000 to 150,000 galaxies, about 10^17 Msun, components, Hawaiian name). Data conflict: diam_mly 520 and extent 160 Mpc; pointer 400 Mly; S-WP-GreatAttractor 500 Mly; none of these is in the Nature abstract (the Hawaii press release that gives 500 Mly was not fetched). The fact states the range 400 to 520.

### horologium-reticulum (supercluster, Cosmic web)
Target: `universe/structures/horologium-reticulum.json`
- fact: A supercluster of galaxy clusters toward Horologium and Reticulum, about 0.7 to 1 billion light-years away.
- bio: Fleenor and colleagues (2005) measured 547 redshifts with the 6dF spectrograph across a field more than 12 by 12 degrees wide. The galaxies span 17,000 to 22,500 kilometres per second, with an overdensity of about 2.4 between the clusters. The supercluster splits into two redshift peaks about 2,500 kilometres per second (35 megaparsecs) apart, each with a systematic trend across the field. The authors found properties like those of the Shapley Concentration.
- links: arXiv, Fleenor 2005 (https://arxiv.org/abs/astro-ph/0505361, core)
- Sources: arXiv astro-ph/0505361 (fetched: 547 redshifts, 12 x 12 degrees centred 03h19m -50d02m, 17,000-22,500 km/s, overdensity 2.4, bimodal with 2,500 km/s (35 Mpc), trend over 1,500 km/s, similar to Shapley, AJ 130, 957). Data conflict: dist_mpc 210 (685 Mly) and diam 550 Mly; Fleenor's 17,000-22,500 km/s is 243-321 Mpc (0.8 to 1.05 billion light-years, my conversion at H0 = 70). S-WP-Horologium gives nearest part 700 Mly and far end 1.2 Gly and size 550 Mly with refs Fleenor 2005, Chow-Martinez 2011, Einasto 2001; the 210 Mpc data matches that nearest edge, not the mean. The fact states 0.7 to 1 billion. Cosmic-web.json is science-review pending: this one needs the reviewer.

### shapley-concentration (concentration, Cosmic web)
Target: `universe/structures/shapley-concentration.json`
- fact: The Shapley Concentration is a dense knot of galaxy clusters about 650 million light-years away, which Hoffman and colleagues (2017) call the main attractor of the local flow.
- bio: Proust and colleagues (2006) gathered 10,529 velocities for 8,632 galaxies across 285 square degrees. Its main plane lies near 14,500 kilometres per second and spans their whole 12 by 30 degree field, with a galaxy overdensity of about 5.4 in the centre; 48 per cent of the galaxies lie between the rich clusters. Raychaudhury and, independently, Scaramella and colleagues named it in 1989.
- links: arXiv, Proust 2006 (https://arxiv.org/abs/astro-ph/0509903, core); arXiv, Hoffman 2017 (https://arxiv.org/abs/1702.02483, core)
- Sources: arXiv astro-ph/0509903 (fetched: 8,632 galaxies, 10,529 velocities, 285 sq deg, 14,500 km/s, 12 x 30 degrees, overdensity about 5.4, 48 per cent intercluster), arXiv 1702.02483 (fetched: primary attractor within 7,000 km/s, Dipole Repeller about 16,000 km/s away "in the northern hemisphere"; the Dipole Repeller sentence was cut for length), S-WP-Shapley (650 Mly, z = 0.046, Raychaudhury 1989 and Scaramella 1989 in Nature). 14,500 km/s is 207 Mpc at H0 = 70 (my conversion). Data 200 Mpc agrees; data diam 260 Mly is below the pointer's 625 to 978 Mly major axis, which is not stated in the text. The "largest concentration" claim is left out. Strict note: the survey footprint (30 by 75 Mpc/h) is not the structure's extent.

### perseus-pisces (wall, Cosmic web)
Target: `universe/structures/perseus-pisces.json`
- fact: A chain of galaxy clusters, strongest toward Perseus and Pisces, about 230 million light-years away and called a supercluster.
- bio: Haynes and Giovanelli (1986) mapped it with an H I redshift survey. Its main ridge extends at least 50 megaparsecs per h and runs into the Milky Way's zone of avoidance east of Perseus. The Perseus Cluster (Abell 426) is one of its richest clusters, with Abell 262. Dupuy and Courtois (2023) include it among six watershed superclusters, and Anand and colleagues (2019) attribute the motion of the Maffei Group to void expansion from its direction.
- links: Wikipedia (https://en.wikipedia.org/wiki/Perseus%E2%80%93Pisces_Supercluster, intro)
- Sources: a search summary of Haynes and Giovanelli 1986 (ApJ 306, L55 not opened; main ridge at least 50 h^-1 Mpc, disappears into the zone of avoidance east of Perseus, about 5,000 km/s); S-WP-PerseusPisces (250 Mly, main members A262, A347, A426), arXiv 2305.02339 and arXiv 1901.05981 (both fetched). 5,000 km/s is 71 Mpc at H0 = 70 (my conversion): data 70 Mpc agrees. The data file lists it with kind "wall" and the name "Supercluster"; the pointer calls it a supercluster that is part of a filament. Data diam 300 Mly vs "at least 50 Mpc/h". SHORT risk.

### coma-great-wall (wall, Cosmic web)
Target: `universe/structures/coma-great-wall.json`
- fact: The CfA2 Great Wall, a sheet of galaxies around the Coma Cluster found by Geller and Huchra in 1989, about 330 million light-years away.
- bio: It showed up in the second Center for Astrophysics redshift survey, and the clusters Coma, Hercules and Leo lie in it. Its true extent is unknown because the dust of the Milky Way hides what lies beyond. Gott and colleagues (2005) give its length as 240 megaparsecs in comoving coordinates, against 450 for the Sloan Great Wall. Geller and Huchra wrote that the extent of the largest features is limited only by the size of the survey.
- links: Wikipedia (https://en.wikipedia.org/wiki/CfA2_Great_Wall, intro); arXiv, Gott 2005 (https://arxiv.org/abs/astro-ph/0310571, core)
- Sources: S-WP-CfA2GreatWall (1989, Geller and Huchra, CfA2 survey, Hercules, Coma and Leo clusters, zone of avoidance limits the extent; the pointer's size figures, "300 Mly wide, 15 Mly thick, at least 500 Mly long" from Chown 2024, are left out), ar5iv astro-ph/0310571 (fetched: 240 Mpc comoving vs 450 Mpc for the SGW), a search summary of the Geller and Huchra 1989 Science abstract (246, 897; the Science page returned 403): "The extent of the largest features is limited only by the size of the survey". The wall's distance of 100 Mpc is not sourced beyond the Coma Cluster's. Data diam 750 Mly vs Gott's 240 Mpc comoving (782 Mly). The name in the data mixes the Coma Supercluster and the Great Wall.

### sloan-great-wall (wall, Cosmic web)
Target: `universe/structures/sloan-great-wall.json`
- fact: The Sloan Great Wall is a wall of galaxies mapped with the Sloan Digital Sky Survey, about a billion light-years away and about 1.4 billion light-years long.
- bio: Gott and colleagues (2005) reported it as a structure at redshift 0.073, at a median distance of about 310 megaparsecs, with an observed length of 419 megaparsecs, 1.37 billion light-years. They said it was 80 per cent longer than the Great Wall of Geller and Huchra and so, at that date, the largest observed structure. Its length in comoving coordinates is 450 megaparsecs, against 240 for the older wall.
- links: arXiv, Gott 2005 (https://arxiv.org/abs/astro-ph/0310571, core)
- Sources: arXiv astro-ph/0310571 (abstract fetched: 1.37 billion light-years, 80% longer, "largest observed structure in the universe"; the ar5iv text fetched: z = 0.073, median distance about 310 Mpc, 419 Mpc observed, 450 Mpc comoving, ApJ 624, 463). Data 300 Mpc and 1,400 Mly agree (310 vs 300; 1.37 vs 1.4). The 2011 papers that questioned whether it is one structure were seen only on a Wikipedia pointer and are not stated. The page's wording "at that date" is the writer's attribution; the review should check whether a newer claim of a longer structure needs naming.

### bootes-void (void, Cosmic web)
Target: `universe/structures/bootes-void.json`
- fact: The Boötes Void is a region toward Boötes with far fewer galaxies than usual, about 700 million light-years away, found in 1981.
- bio: Kirshner, Oemler, Schechter and Shectman (1981) measured 133 redshifts in three narrow fields in Boötes and found identical gaps of about 6,000 kilometres per second, between 12,000 and 18,000, in each. They speculated that the region between the fields was a void of about a million cubic megaparsecs. A larger survey in 1987 mapped it in detail. Dupuy and Courtois (2023) find a central repeller in the Boötes void, using the Cosmicflows-4 velocity field.
- links: arXiv, Dupuy 2023 (https://arxiv.org/abs/2305.02339, core); Wikipedia (https://en.wikipedia.org/wiki/Bo%C3%B6tes_Void, intro)
- Sources: a search summary of Kirshner et al. 1981 ApJ 248, L57 (the ADS page appeared in the search results but was not opened: 133 redshifts, three fields about 35 degrees apart, gaps of 6,000 km/s between 12,000 and 18,000 km/s, "million cubic megaparsec void"); S-WP-BootesVoid (700 Mly, radius 62 Mpc, 60 galaxies against about 2,000 expected, Kirshner 1987 survey; the 60 and 2,000 figures and the radius are left out, one pointer); arXiv 2305.02339 (fetched: repellers in the Boötes and Sculptor voids). 15,000 km/s is 214 Mpc at H0 = 70 (my conversion): data 210 Mpc agrees. Data conflict: data diam 330 Mly (about 101 Mpc); pointer radius 62 Mpc, so a diameter of about 124 Mpc or 400 Mly.

## Catalogue entries (decision 6)

For the later step that adds `catalogue.dist_mpc` entries to `local-sheet.json`, `virgo-cluster.json`, `laniakea.json` and `cosmic-web.json`. Bibcodes: none. No ADS or journal page was opened (ui.adsabs returned 405, A&A and Science 403), so no bibcode is given or invented; the journal reference is as the arXiv abstract page prints it. "Agrees" compares the data file's `dist_mpc` with the source value.

| id | data `dist_mpc` | catalogue source | arXiv | source value | data agrees? |
|---|---|---|---|---|---|
| local-group | 0 | anchor of the scale; McConnachie 2012, AJ 144, 4 for membership | 1204.1562 | no distance (anchor) | yes, by definition |
| ic-342-group | 3.3 | Wu et al. 2014 (IR TRGB); Karachentsev 2013 | 1404.2987; 1303.5328 | IC 342 3.45 ± 0.13 Mpc | yes, within 1.2 sigma (3.3 vs 3.45) |
| m81-group | 3.6 | Karachentsev et al. 2002, A&A 383, 125 | not confirmed | none opened (pointer 3.6) | NOT VERIFIED: no fetched source gives the value |
| centaurus-a-group | 3.7 | Karachentsev et al. 2007, AJ 133, 504 | astro-ph/0603091 | Cen A 3.76 ± 0.05; M83 group 4.79 ± 0.10 | for the Cen A part only; no for the M83 sub-group (1.1 Mpc farther) |
| sculptor-group | 3.7 | Karachentsev et al. 2003, A&A 404, 93; Karachentsev et al. 2021 | astro-ph/0302045; 2102.11354 | NGC 253 3.94; two dwarfs 3.62 and 3.66 | partly: 3.7 vs 3.94 (6 per cent), inside the group's depth |
| maffei-group | 5.7 | Anand et al. 2019, ApJL | 1901.05981 | Maffei 2 5.73 ± 0.40 | yes |
| ngc-6946-group | 7.7 | Anand, Rizzi, Tully 2018, AJ 156 | 1807.05229 | NGC 6946 7.72 ± 0.32 | yes |
| m101-group | 6.4 | Müller et al. 2017, A&A 602, A119 | 1701.03681 | M101 7.0 Mpc | no: 6.4 vs 7.0 (9 per cent) |
| ngc-5846-group | 26 | NED (not opened); Tully 1987 | none | pointer 27 for the Virgo III Cloud | NOT VERIFIED: no primary source |
| canes-venatici-i | 4.0 | Karachentsev et al. 2003, A&A 398, 467 | astro-ph/0210414 | 4.1 ± 0.2 | yes |
| canes-venatici-spur | 8 | Tully 1988 Nearby Galaxies Catalog, via a search summary | none | none found | NOT VERIFIED: no source states a distance |
| leo-i-cloud | 11 | Karachentsev et al. 2015 for the region; NED | 1502.04253 | no distance for this entity; search summary: M105 10.7 ± 0.3, M96 11.6 ± 0.9 | consistent with the search summary; not verified |
| ursa-major-cloud | 18.6 | Tully and Verheijen 1997, AJ 113, 2471 (first adopted 15.5) | astro-ph/9703029 (per a search summary) | 15.5 (1997); 18.6 (later, pointer) | data uses the later value; source of the later value not found |
| virgo-ii-groups | 18 | NED; Tully 1982 | none | pointer 55-80 Mly (17-25 Mpc) | inside the range; NOT VERIFIED with a primary source |
| virgo-cluster | 16.5 | Mei et al. 2007, ApJ 655, 144 | astro-ph/0702510 | 16.5 ± 0.1 ± 1.1 | yes |
| centaurus-cluster | 52 | NED | none | pointer z = 0.0114, 170 Mly = 52 Mpc | consistent; NOT VERIFIED with a primary source |
| antlia-cluster | 40 | NED; Dirsch et al. 2003 | none | pointer 40.7 | consistent; NOT VERIFIED with a primary source |
| virgo-supercluster | 0 | Tully 1982, ApJ 257, 389 | none | anchor | yes, by definition |
| great-attractor | 68 | Woudt and Kraan-Korteweg 2000 (Norma cluster) | astro-ph/0006126 | cz = 4,844 km/s (about 69 Mpc, my conversion) | yes |
| hydra-centaurus | 45 | Courtois et al. 2013, AJ 146, 69 (per the pointer) | 1306.0091 | pointer centre 39 Mpc, extent to 69 | inside the extent; NOT VERIFIED (the abstract has no number) |
| pavo-indus | 70 | Courtois et al. 2013 (per the pointer) | 1306.0091 | pointer 60-70 Mpc | at the top of the range; NOT VERIFIED |
| ophiuchus-supercluster | 119 | NED; Tully 2014 | none | pointer 139.6 ± 9.8 Mpc, z = 0.028 | no: 119 vs 139.6; cz 8,400 km/s = 120 Mpc at H0 = 70 (my conversion), so the pointer used a lower H0 |
| fornax-eridanus | 20 | Nasonova et al. 2011, A&A | 1106.1291 | search summary: complex barycentre 21.1; Fornax cluster 18.6 ± 0.3 | yes, inside 19.6-21.1 |
| laniakea | 0 | Tully et al. 2014, Nature 513, 71 | 1409.0880 | anchor (the Virgo Supercluster is in it) | yes, by definition |
| horologium-reticulum | 210 | Fleenor et al. 2005, AJ 130, 957 | astro-ph/0505361 | 17,000-22,500 km/s (243-321 Mpc at H0 = 70, my conversion), mean about 20,000 | NO: 210 Mpc is below the whole redshift range |
| shapley-concentration | 200 | Proust et al. 2006, A&A 447, 133 | astro-ph/0509903 | main plane at 14,500 km/s (207 Mpc, my conversion) | yes |
| perseus-pisces | 70 | Haynes and Giovanelli 1986, ApJ 306, L55 | none | about 5,000 km/s (71 Mpc, my conversion), search summary | yes; NOT VERIFIED (paper not opened) |
| coma-great-wall | 100 | Geller and Huchra 1989, Science 246, 897 | none | no distance in the abstract; Coma Cluster distance | NOT VERIFIED |
| sloan-great-wall | 300 | Gott et al. 2005, ApJ 624, 463 | astro-ph/0310571 | median 310 Mpc, z = 0.073 | yes |
| bootes-void | 210 | Kirshner et al. 1981, ApJ 248, L57 | none | gap 12,000-18,000 km/s (214 Mpc at the centre, my conversion), search summary | yes; NOT VERIFIED (paper not opened) |

## Data conflicts

- Disagreements between the data file and a source (distance, `dist_mpc`): centaurus-a-group (3.7 vs the M83 sub-group at 4.79 Mpc), sculptor-group (3.7 vs NGC 253 at 3.94), m101-group (6.4 vs 7.0, Müller 2017), ophiuchus-supercluster (119 vs 139.6 on the pointer; the H0 reading is in the table), horologium-reticulum (210 vs 243-321 from Fleenor's redshifts). ursa-major-cloud: the data's 18.6 follows a later value, but the first adopted value was 15.5. cosmic-web.json is "Science-review pending", so horologium-reticulum, ophiuchus-supercluster (laniakea.json) and the diameters below need the reviewer.
- Disagreements in size (`diam_mly`): virgo-supercluster (110 vs 147 on the pointer), laniakea (520 vs 400 pointer vs 500 on another pointer vs the 2023 volume), shapley-concentration (260 vs 625 to 978 on the pointer, and a survey footprint that is not an extent), bootes-void (330 vs a diameter of 400 from the radius on the pointer), coma-great-wall (750 vs 782 from Gott 2005, consistent), perseus-pisces (300 vs "at least 50 Mpc/h").
- Names and kinds: `perseus-pisces` is named a supercluster but has kind "wall"; `coma-great-wall` is named "Coma Supercluster (CfA2 Great Wall)" and merges two entries in the literature; `fornax-eridanus` is named "(Southern)" and the link between the Fornax-Eridanus complex and the Southern Supercluster was not verified; `centaurus-a-group` is named a "Complex" but filed as kind group; `leo-i-cloud` is the Leo I group at about 10-11 Mpc in the literature, not the Leo Cloud at about 22-26 Mpc, and the Karachentsev 2015 paper's "Leo cloud" is the latter.
- Text kept to the data: m101-group (21 to 23 million light-years in the fact line), centaurus-a-group (12 to 15), virgo-supercluster (110 to 150), laniakea (400 to 520), ophiuchus-supercluster (390 to 450), horologium-reticulum (0.7 to 1 billion) state the range.

## Names (glossary and `native-terms.json`)

Checked in `scripts/i18n-tools/native-terms.json` (exact key match, case-insensitive, a name under another key is missed) and the keys of `i18n-src/en-US/glossary/terms.json`. Not edited.

- Present as terms in both: galaxy group, galaxy cluster, dwarf galaxy (native-terms and glossary), light-year, tidal tail, intracluster light (native-terms; tidal tail and intracluster light not used here).
- Present as exact names in native-terms only (no glossary term needed): Local Group, Local Sheet, Virgo Supercluster, Hydra-Centaurus Supercluster, Pavo-Indus Supercluster, Great Attractor, Sloan Great Wall, CfA2 Great Wall, Coma Supercluster (CfA2 Great Wall), Boötes Void, Large Magellanic Cloud, Small Magellanic Cloud, Shapley Concentration, Laniakea (per the brief; spot-check at integration).
- Missing in both (new terms this batch uses): supercluster, void, great wall / wall, filament, galaxy cloud (cloud of galaxies), redshift, peculiar velocity, basin of attraction, zone of avoidance, cosmic web, comoving (coordinates), megaparsec (unit), kilometres per second (not a term), tip of the red giant branch, surface brightness fluctuations, Local Void, Cosmicflows (a survey name: keep as written).
- Per the README step 5: a new `term` entry needs a definition in all 14 `i18n-src/<locale>/glossary/terms.json`, and the glossary step must be run, not only `validate-data`.
- Names present as exact keys only for some locales were not tested here (the brief counts 11 partial).

## Not sourced, left out

- All 30: member counts of groups (they differ by source: 7 to 15 for the M101 group), masses beyond the ones quoted, discovery dates beyond those stated.
- m81-group: the 34-member count and the mass (Wikipedia only).
- centaurus-a-group: the 44-galaxy count, HIPASS and DECam dwarf discoveries (Wikipedia only), the Local-Group-analogue 2026 paper (a search summary).
- sculptor-group: NGC 55 and NGC 300 as foreground objects (Wikipedia only).
- Sloan Great Wall: the 2011 challenge that it is a chance alignment (Wikipedia only), and whether a longer structure has been claimed since 2005.
- Shapley: the core mass 1.3 x 10^16 and radius 12.4 Mpc (Wikipedia only), the "largest" claims.
- Great Attractor: the "Seven Samurai" and the 10^16 solar-mass estimates (Wikipedia only).
- Laniakea: the Hawaiian name's origin (Wikipedia only), the Nature paper's size and galaxy count (not in the abstract).
- Boötes Void: 60 galaxies against 2,000 expected, the supervoid label (Wikipedia only).
- Hydra-Centaurus: the 600 km/s flow toward Norma.

## NOT VERIFIED

- No source was opened for these claims beyond a Wikipedia article (fetched as a pointer, whose own citations were not opened): all of ngc-5846-group, virgo-ii-groups, centaurus-cluster, antlia-cluster, hydra-centaurus, pavo-indus, ophiuchus-supercluster; the tidal and starburst claims and the 3.6 Mpc distance of m81-group; the H I-bridge sentence; the M101 member list; the member lists of perseus-pisces; the 580-galaxy count and the 30 per cent / 5 per cent figures of ursa-major-cloud; the three-cluster membership of the CfA2 Great Wall; the Southern Supercluster, Norma wall and Hawaiian-name statements on laniakea.
- Search summaries only, the pages not opened: Karachentsev 2002 (M81), Tikhonov 2015 (M101), Tully and Verheijen 1997, Tully 1982 (disc and halo fractions), Haynes and Giovanelli 1986, Kirshner 1981, Geller and Huchra 1989 (abstract sentence), the Fornax distances 18.6 and 21.1 Mpc, the IC 342 mean 3.28 Mpc, the M96 and M105 Cepheid and SBF distances.
- Bibcodes: none opened.
- Not fetched: Karachentsev 2013 (the abstract only; its group tables were not read), Courtois 2013 (abstract only), Valade 2024 (ADS 405), the Tully 2014 Nature article text and the Hawaii press release.
- The `h` in "megaparsecs per h" (perseus-pisces, laniakea) is quoted as the sources use it; no value of h was checked.
- All conversions from cz and from megaparsecs to light-years are mine and use H0 = 70 and 3.26 Mly/Mpc.
- Whether the links' hosts (arxiv.org, en.wikipedia.org) are in `static/data/source-logos.json` was not checked.
- Characters are fact + bio with spaces; the page's check-seo count (whitespace removed) was not measured.
- No science review yet: the strict reading of cosmic-web.json is the writer's, not a reviewer's.
