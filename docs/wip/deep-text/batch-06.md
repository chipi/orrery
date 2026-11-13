# Deep text, batch 6 (drafts): the 30 structures

Drafts with the science review applied (`batch-06-review.md`). Nothing here is in `i18n-src/` yet. 2026-11-13, branch `tech-debt/0.9.9`. The per-object `Sources` lines below are the post-review notes; the sections from `Catalogue entries` on are the writer's pre-review record and are superseded where the `Science review` section says so.

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
- fact: The Local Group is the set of galaxies bound together by gravity that contains the Milky Way.
- bio: McConnachie's 2012 catalogue lists over 100 galaxies within 3 megaparsecs of the Sun, the Local Group and its near neighbours, among them satellites of the Milky Way and the Andromeda Galaxy and isolated dwarfs. The Milky Way, the Andromeda Galaxy and the Triangulum Galaxy are its three large spirals, and the Large and Small Magellanic Clouds orbit the Milky Way. McCall (2014) finds that a sphere with a radius of 3.75 megaparsecs, the Council of Giants, encloses the Local Group and sets an upper limit to its realm of influence.
- links: arXiv, McConnachie 2012 (https://arxiv.org/abs/1204.1562, core); arXiv, McCall 2014 (https://arxiv.org/abs/1403.3667, core)
- Sources (after review): Review fixes: radius not diameter (McCall 2014), 'and its near neighbours' added, the unsourced 10-million-light-year size cut.

### ic-342-group (group, Local Sheet)
Target: `universe/structures/ic-342-group.json`
- fact: A small group of galaxies around the spiral IC 342, about 11 million light-years away, seen through the dust of the Milky Way's disc.
- bio: IC 342 lies at low Galactic latitude, where dust makes distances hard to measure. An infrared tip-of-the-red-giant-branch measurement by Wu and colleagues (2014) gives 3.45 ± 0.13 megaparsecs. The group was long paired with Maffei 1 and 2 as one IC 342/Maffei group. Anand and colleagues (2019) put Maffei 2 at 5.73 ± 0.40 megaparsecs, 2.5 megaparsecs behind the IC 342 Group, so the two are now treated as separate groups.
- links: arXiv, Wu 2014 (https://arxiv.org/abs/1404.2987, core); arXiv, Anand 2019 (https://arxiv.org/abs/1901.05981, core)
- Sources: arXiv 1404.2987 (fetched: IC 342 3.45 ± 0.13 Mpc, method suited to obscured low-latitude galaxies), arXiv 1901.05981 (fetched: Maffei 2 5.73 ± 0.40 Mpc, 2.5 Mpc behind the IC 342 Group). Data 3.3 Mpc; Huchtmeier 1999 (astro-ph/9907344, fetched) gave 2.2 ± 0.5 Mpc, superseded; a search summary quotes 3.28 ± 0.15 for the dwarf members, source not opened.

### m81-group (group, Local Sheet)
Target: `universe/structures/m81-group.json`
- fact: A group of galaxies around Bode's Galaxy (M81), about 11 to 12 million light-years away, among the nearest groups to the Local Group.
- bio: M81, the Cigar Galaxy (M82) and NGC 3077 are its three main galaxies. Karachentsev and colleagues (2002) measured Hubble distances to 13 late-type galaxies of the M81 and NGC 2403 complex, about 50 galaxies in all. Distances to the group fall at about 3.5 to 3.6 megaparsecs.
- links: arXiv, Karachentsev 2005 (https://arxiv.org/abs/astro-ph/0410065, core)
- Sources (after review): Review fixes: Wikipedia link and the H I-bridge and starburst sentences cut (Wikipedia-only, the Yun, Ho and Lo 1994 source not opened); 3.6 no longer attributed to a paper. 'Among the nearest groups' is in Karachentsev 2005 (abstract read).

### centaurus-a-group (group, Local Sheet)
Target: `universe/structures/centaurus-a-group.json`
- fact: A complex of galaxies around Centaurus A and Messier 83, about 12 to 16 million light-years away, made of two sub-groups.
- bio: Karachentsev and colleagues (2007) measured 24 nearby galaxies with Hubble. Centaurus A lies at 3.76 ± 0.05 megaparsecs and the M83 sub-group at 4.79 ± 0.10, about a megaparsec farther. The Centaurus A sub-group is the more massive, with an orbital mass of 6 to 8 trillion Suns against about 0.8 to 0.9 trillion for M83's. Both sub-groups move with small peculiar velocities relative to the smooth cosmic expansion. The Southern Pinwheel Galaxy (M83) is its second large spiral.
- links: arXiv, Karachentsev 2007 (https://arxiv.org/abs/astro-ph/0603091, core)
- Sources (after review): Review fixes: '12 to 16' (12.3 and 15.6 million light-years), M83 mass 0.8 to 0.9 trillion. Data dist_mpc 3.7 to 3.8 (Cen A sub-group 3.76).

### sculptor-group (group, Local Sheet)
Target: `universe/structures/sculptor-group.json`
- fact: A loose filament of galaxies around the spiral NGC 253, about 12 to 13 million light-years away, rather than a bound group.
- bio: Karachentsev and colleagues (2003) measured Hubble distances to nine galaxies of the region, from 3.34 to 4.92 megaparsecs, with NGC 253 at 3.94, and describe it as a loose filament rather than a bound system. The galaxies lie in several loose groups around NGC 253, NGC 300 and NGC 7793, and with the Canes Venatici I Cloud and the Local Group they form a 10-megaparsec filament driven by the free cosmic expansion. In 2021 two dwarfs at about 3.6 megaparsecs were confirmed as members of the NGC 253 group, with a mass of about 8 × 10^11 Suns.
- links: arXiv, Karachentsev 2003 (https://arxiv.org/abs/astro-ph/0302045, core); arXiv, Karachentsev 2021 (https://arxiv.org/abs/2102.11354, core)
- Sources (after review): Review fixes: fact and bio agree (12 to 13 million light-years, 3.94 Mpc = 12.8), the 'loose filament' wording attributed to Karachentsev 2003. Data kept (3.7).

### maffei-group (group, Local Sheet)
Target: `universe/structures/maffei-group.json`
- fact: A group of galaxies around Maffei 1 and 2, about 19 million light-years away, seen through the dust of the Milky Way's disc.
- bio: Maffei 1 and 2 lie near the plane of the Milky Way, where dust makes distances uncertain. An infrared measurement in 2014 placed them at about 3.4 to 3.5 megaparsecs, beside IC 342. Anand and colleagues (2019) put Maffei 2 at 5.73 ± 0.40 megaparsecs, which places the Maffei Group 2.5 megaparsecs behind the IC 342 Group. They find it moving toward the Local Group at 128 ± 33 kilometres per second, which they think is likely void expansion from the direction of Perseus-Pisces.
- links: arXiv, Anand 2019 (https://arxiv.org/abs/1901.05981, core); arXiv, Wu 2014 (https://arxiv.org/abs/1404.2987, core)
- Sources (after review): Review fix: the void-expansion attribution is hedged as the abstract words it. Anand 2019 measures Maffei 2 only; the text does not say Maffei 1 moved.

### ngc-6946-group (group, Local Sheet)
Target: `universe/structures/ngc-6946-group.json`
- fact: A small group of dwarf galaxies around the spiral NGC 6946, the Fireworks Galaxy, about 25 million light-years away.
- bio: Karachentsev, Sharina and Huchtmeier (2000) found eight late-type galaxies in it, about 420 kiloparsecs across in projection, and set its distance at 5.9 megaparsecs from the brightest blue stars. Anand, Rizzi and Tully (2018) measured NGC 6946 with the tip of the red giant branch and got 7.72 ± 0.32 megaparsecs, higher than most earlier values. At that distance the supernovae seen in NGC 6946 are about 2.3 times more luminous than the older distance implied.
- links: arXiv, Anand 2018 (https://arxiv.org/abs/1807.05229, core); arXiv, Karachentsev 2000 (https://arxiv.org/abs/astro-ph/0010148, core)
- Sources: arXiv 1807.05229 (fetched: 7.72 ± 0.32 Mpc, "higher than most values", supernovae about 2.3 times more luminous, coherent motion toward the Local Sheet plane), arXiv astro-ph/0010148 (fetched: eight late-type members, 5.9 ± 0.4 Mpc, 420 kpc). The data's 7.7 follows Anand 2018. "Fireworks Galaxy" as the popular name of NGC 6946 is from the title of the Anand paper.

### m101-group (group, Local Sheet)
Target: `universe/structures/m101-group.json`
- fact: A loose group of galaxies around the Pinwheel Galaxy (M101), about 23 million light-years away.
- bio: Müller and colleagues (2017) searched 330 square degrees of Sloan Digital Sky Survey images around M101, M51 and M63 and found 15 new dwarf-galaxy candidates. The spirals lie at tip-of-the-red-giant-branch distances of 7.0, 8.6 and 9.0 megaparsecs on a thin filament about 3 megaparsecs long, which the authors tie to the expansion of the Local Void.
- links: arXiv, Müller 2017 (https://arxiv.org/abs/1701.03681, core)
- Sources (after review): Review fixes: Wikipedia link and the Tikhonov 2015 member list cut (search-summary only); one distance, 7.0 Mpc (22.8 million light-years). Data dist_mpc 6.4 to 7.0 (medium confidence: 6.4 may be a Cepheid value).

### ngc-5846-group (group, Virgo Supercluster)
Target: `universe/structures/ngc-5846-group.json`
- fact: A group of galaxies around the giant elliptical NGC 5846, about 80 million light-years away, in the Virgo Supercluster.
- bio: Mahdavi, Trentham and Tully (2005) found two giant ellipticals, NGC 5846 and NGC 5813, about 600 kiloparsecs apart in projection, inside a dark-matter halo about 1.6 megaparsecs across, with a velocity dispersion of 322 kilometres per second. The group is dominated by dwarf elliptical galaxies, as the Virgo Cluster is.
- links: arXiv, Mahdavi, Trentham and Tully 2005 (https://arxiv.org/abs/astro-ph/0506737, core)
- Sources (after review): Review rewrite from the primary (astro-ph/0506737, abstract read); the Wikipedia Virgo III claims (13 groups, 27 Mpc, member names) cut. Data 26 Mpc kept: the review's 25 is low confidence (search snippet, 24.9 Mpc), so the fact's 80 million light-years (24.5 Mpc) and the data's 85 differ by 6 per cent.

### canes-venatici-i (cloud, Local Sheet)
Target: `universe/structures/canes-venatici-i.json`
- fact: A cloud of about 18 galaxies in Canes Venatici, roughly 13 million light-years away, expanding with the universe rather than collapsing.
- bio: Karachentsev and colleagues (2003) measured 18 of its galaxies with Hubble: a mean distance of 4.1 ± 0.2 megaparsecs, a mean velocity of 286 ± 9 kilometres per second and a velocity dispersion of 50. Its crossing time of about 15 billion years means it is far from equilibrium: the cloud is driven by the free cosmic expansion, not by galaxy interactions. With the Sculptor complex and the Local Group it lies on a 10-megaparsec filament.
- links: arXiv, Karachentsev 2003 (https://arxiv.org/abs/astro-ph/0210414, core)
- Sources: arXiv astro-ph/0210414 (fetched: 18 galaxies, 4.1 ± 0.2 Mpc, 286 ± 9 km/s, 50 km/s, 2.2 x 10^10 L_sun blue, "transient dynamical state", crossing time 15 Gyr), arXiv astro-ph/0302045 (fetched: 10 Mpc filament). Data 4.0 Mpc agrees within the error.

### canes-venatici-spur (cloud, Virgo Supercluster)
Target: `universe/structures/canes-venatici-spur.json`
- fact: A filament of galaxies in Canes Venatici, in the Virgo Supercluster, listed as a structure in Tully's Nearby Galaxies Atlas.
- bio: Few studies describe it on its own; the filaments around the Virgo Cluster that it belongs to are mapped by Kim and colleagues (2016).
- links: arXiv, Kim 2016 (https://arxiv.org/abs/1611.00437, core)
- Sources (after review): SHORT by the reviewer's proposal: nothing else is sourced. The 8 Mpc distance, the member list and the 'shortcut' wording are cut; the Wikipedia link is replaced. The Atlas listing is the reviewer's own proposed wording, resting on a search summary (Tully 1988, structure 43): NOT VERIFIED. Data 8 Mpc unchanged and unsourced.

### leo-i-cloud (cloud, Virgo Supercluster)
Target: `universe/structures/leo-i-cloud.json`
- fact: The Leo I Group, also called the M96 Group, a group of galaxies in Leo about 35 million light-years away.
- bio: Karachentsev, Nasonova and Karachentseva (2015) measured distances and peculiar velocities for 290 galaxies in Leo and Cancer, in 23 groups and 20 pairs, and found the Leo I group moving away from the Local Void at about 400 kilometres per second. It includes M66, M96 and the elliptical M105 (NGC 3379). Lee and Jang (2013) measured tip-of-the-red-giant-branch distances of 10.6 megaparsecs to M66 and 10.7 to M96.
- links: arXiv, Karachentsev 2015 (https://arxiv.org/abs/1502.04253, core); arXiv, Lee and Jang 2013 (https://arxiv.org/abs/1306.2306, core)
- Sources (after review): Id and data name kept (glossary keys); the fact says what the literature calls it. Fixes: 'string of groups' cut, 36 to 35 million light-years (10.7 Mpc), 'with the Local Group' dropped, Wikipedia link and 'brightest galaxies' cut. Lee and Jang 2013: (m-M)0 = 30.12 (M66) and 30.15 (M96) = 10.6 and 10.7 Mpc, my conversion. Data dist_mpc 11 to 10.7.

### ursa-major-cloud (cloud, Virgo Supercluster)
Target: `universe/structures/ursa-major-cloud.json`
- fact: A cloud of galaxies in Ursa Major that contains the spiral-rich Ursa Major Cluster, about 60 million light-years away.
- bio: Tully and Verheijen (1997) describe the Ursa Major Cluster as unevolved and made up of spiral galaxies rich in neutral hydrogen. Trentham, Tully and Verheijen (2001) put the cluster at 18.6 megaparsecs and found about two dozen dwarf galaxies in it, far fewer than a Virgo-like cluster would give (about a thousand).
- links: arXiv, Trentham, Tully and Verheijen 2001 (https://arxiv.org/abs/astro-ph/0103039, core); arXiv, Tully and Verheijen 1997 (https://arxiv.org/abs/astro-ph/9703029, core)
- Sources (after review): Review fixes: the 30 per cent / 5 per cent figures, the 580 count, the 15.5 Mpc attribution and the M108 / M109 membership cut (Wikipedia-only or unsupported); 18.6 Mpc sourced to Trentham 2001. The fact (60 million light-years = 18.6 Mpc) is unchanged.

### virgo-ii-groups (cloud, Virgo Supercluster)
Target: `universe/structures/virgo-ii-groups.json`
- fact: The Virgo II Groups are a set of galaxy groups in the Virgo Supercluster, named for a bright member each, such as the M61 Group.
- bio: Few studies describe these groups as one structure. Kim and colleagues (2016) map the filaments of galaxies behind and beside the Virgo Cluster.
- links: arXiv, Kim 2016 (https://arxiv.org/abs/1611.00437, core)
- Sources (after review): SHORT by the reviewer's proposal. Cut: the 55 to 80 million light-years, the 100 galaxies, the eight group names, the upper-branch claim. The second proposed sentence (Tully 1982 prolate clouds) is dropped because the link between Tully 1982 and 'Virgo II' is not verified; Kim 2016 does not name Virgo II either, so the bio does not say which filaments they are. 'Named for a bright member each, such as the M61 Group' is the reviewer's own proposed wording: NOT VERIFIED beyond that. Data 18 Mpc unchanged.

### virgo-cluster (cluster, Virgo Supercluster)
Target: `universe/structures/virgo-cluster.json`
- fact: A cluster of galaxies in Virgo centred on the giant elliptical M87, about 54 million light-years away, the heart of the Virgo Supercluster.
- bio: Mei and colleagues (2007) used Hubble surface-brightness fluctuations for 84 galaxies: 79 give a mean distance of 16.5 ± 0.1 (random) ± 1.1 (systematic) megaparsecs, and five lie at about 23 in the W' cloud behind. The cluster is slightly triaxial and about 2.4 megaparsecs deep, with subclusters around the Virgo Galaxy (M87), at 16.7, and M49, at 16.4. Shaya and colleagues (2017) model its mass as 6.3 × 10^14 Suns.
- links: arXiv, Mei 2007 (https://arxiv.org/abs/astro-ph/0702510, core); arXiv, Shaya 2017 (https://arxiv.org/abs/1710.08935, core)
- Sources: arXiv astro-ph/0702510 (fetched: 84 SBF distances, 79 at 16.5 ± 0.1 ± 1.1 Mpc, 5 at about 23 Mpc, depth 2.4 ± 0.4, M87 16.7 ± 0.2 and M49 16.4 ± 0.2), arXiv 1710.08935 (fetched: Virgo mass 6.3 ± 0.8 x 10^14, turnaround radius 7.3 ± 0.3 Mpc). Data 16.5 Mpc agrees.

### centaurus-cluster (cluster, Laniakea)
Target: `universe/structures/centaurus-cluster.json`
- fact: A rich cluster of galaxies in Centaurus, about 160 million light-years away, in the Hydra-Centaurus Supercluster.
- bio: Catalogued as Abell 3526 (A3526), it has the giant elliptical NGC 4696 as its brightest member and a redshift of 0.0114. It is made of two parts: the main group Cen 30 and a subgroup, Cen 45, centred on NGC 4709, whose galaxies are about 1,500 kilometres per second higher in redshift velocity than Cen 30 and which is thought to be falling into it. Dupke and Bregman (2006) mapped the hot gas between its galaxies in X-rays with the Chandra Observatory.
- links: arXiv, Dupke and Bregman 2006 (https://arxiv.org/abs/astro-ph/0512045, core)
- Sources (after review): Review fixes: 160 million light-years (z = 0.0114, cz = 3,418 km/s = 49 Mpc at H0 = 70), Cen 45 redshift offset not 'moves', Chandra mapping attributed. Abell 3526, NGC 4696 and z = 0.0114 remain pointer-level: NED check NOT DONE. The 1,500 km/s is the reviewer's replacement number; the reviewer's own arithmetic from the mean velocities (3,397 and 4,746) gives about 1,350: NOT VERIFIED. Data dist_mpc 52 to 49.

### antlia-cluster (cluster, Laniakea)
Target: `universe/structures/antlia-cluster.json`
- fact: A cluster of galaxies in Antlia, about 130 million light-years away, in the Hydra-Centaurus Supercluster.
- bio: Antlia is dominated by two massive ellipticals, NGC 3268 and NGC 3258, each at the centre of a subgroup. Dirsch, Richtler and Bassino (2003) found several thousand globular clusters around each, more around NGC 3258. Smith Castelli and colleagues (2008) measured the colours of its early-type galaxies and found the same colour-magnitude relation as Fornax, Virgo, Perseus and Coma.
- links: arXiv, Dirsch, Richtler and Bassino 2003 (https://arxiv.org/abs/astro-ph/0307200, core); arXiv, Smith Castelli 2008 (https://arxiv.org/abs/0803.1630, core)
- Sources (after review): Review rewrite from the two primaries (abstracts read); 234 galaxies, 2 keV, 3.3 × 10^14 Suns, 'no dominant central galaxy' cut (Wikipedia-only). Distance 40 Mpc / 130 million light-years is consistent and unsourced.

### virgo-supercluster (supercluster, Laniakea and Cosmic web)
Target: `universe/structures/virgo-supercluster.json`
- fact: The Virgo Supercluster, or Local Supercluster, holds the Local Group and the Virgo Cluster and extends over tens of megaparsecs.
- bio: De Vaucouleurs coined the name Local Supercluster in 1953. Tully (1982) mapped an overdensity of galaxies in the northern Galactic hemisphere as a thin disc holding about 60 per cent of its luminous galaxies, inside a roughly spherical halo holding the other 40 per cent. It is not the largest unit our galaxy belongs to: Tully and colleagues (2014) found that it lies inside Laniakea, together with the historical Southern Supercluster. The Virgo Cluster is its dominant concentration.
- links: ADS, Tully 1982 (https://adsabs.harvard.edu/pdf/1982ApJ...257..389T, core); arXiv, Tully 2014 (https://arxiv.org/abs/1409.0880, core)
- Sources (after review): Review fixes: northern Galactic hemisphere, de Vaucouleurs credited with the definition, disc and halo fractions from Tully 1982 (read), 'lobe' replaced by the Nature wording, 'Local Group on its outskirts' cut, the 110 to 150 million light-year size cut (no primary; data diam 110 kept as schematic and unsourced).

### great-attractor (attractor, Laniakea)
Target: `universe/structures/great-attractor.json`
- fact: The Great Attractor is the region toward Norma, about 220 million light-years away, where flows of galaxies, including ours, converge.
- bio: It was found in the 1980s from the motions of elliptical galaxies (Dressler and colleagues, 1987) and lies behind the dust of the Milky Way's disc. Woudt and Kraan-Korteweg (2000) found the Norma cluster (Abell 3627) at 4,844 kilometres per second, comparable in size and mass to Coma, and argue that it most likely marks the bottom of the potential well of the Great Attractor, where the Centaurus Wall meets the Norma supercluster. The Shapley Concentration also pulls on us (Hoffman and colleagues, 2017).
- links: arXiv, Woudt 2000 (https://arxiv.org/abs/astro-ph/0006126, core); arXiv, Tully 2014 (https://arxiv.org/abs/1409.0880, core)
- Sources (after review): Review fixes: region not object (Tully 2014: flows converge toward the Norma and Centaurus clusters), the hedge 'most likely marks the bottom of the potential well', Dressler 1987 credited, Wikipedia link replaced. Data 68 Mpc kept (Norma 4,844 km/s = 69 Mpc); the Hoffman 2017 clause is as in the draft and its wording was not re-checked in the paper (see shapley-concentration).

### hydra-centaurus (supercluster, Laniakea)
Target: `universe/structures/hydra-centaurus.json`
- fact: A supercluster of galaxy clusters toward Hydra and Centaurus, about 150 million light-years away.
- bio: Tully and colleagues (2014) found flows converging near the Norma and Centaurus clusters inside Laniakea.
- links: arXiv, Tully 2014 (https://arxiv.org/abs/1409.0880, core)
- Sources (after review): SHORT after the review. Cut (Wikipedia-only): the four Abell clusters, the Antlia or Hydra Wall, the Hydra Cluster A1060, the 'lobe' wording, the 130 to 150 range. 150 million light-years = data 45 Mpc (147), unsourced.

### pavo-indus (supercluster, Laniakea)
Target: `universe/structures/pavo-indus.json`
- fact: A filament and supercluster of galaxy clusters toward Pavo and Indus, in the southern sky, in Laniakea.
- bio: Tully and colleagues (2014) call it the important Pavo-Indus filament and include it in Laniakea, whose flows converge toward the Norma and Centaurus clusters.
- links: arXiv, Tully 2014 (https://arxiv.org/abs/1409.0880, core)
- Sources (after review): SHORT after the review. The 66 Mpc length, Abell 3656 / 3698 / 3742, Fairall 1988 and the 'lobe centred on the Great Attractor' claim cut (Wikipedia-only or contradicted by Tully 2014). No distance in the text. Data 70 Mpc unverified (NED not opened) and unchanged.

### ophiuchus-supercluster (supercluster, Laniakea)
Target: `universe/structures/ophiuchus-supercluster.json`
- fact: A supercluster centred on the Ophiuchus Cluster, about 400 million light-years away, in the direction of the Milky Way's centre.
- bio: The Ophiuchus Cluster, at a redshift of 0.0296, is one of the most massive nearby clusters. Durret and colleagues (2015) estimate its mass at 1.1 × 10^15 Suns. It lies behind the Milky Way's disc, so its galaxies are hard to see. Wakamatsu and colleagues (2005) found several more groups or clusters within 8 degrees, a structure comparable to a supercluster. Tully and colleagues (2014) describe Laniakea as extending toward it.
- links: arXiv, Durret 2015 (https://arxiv.org/abs/1509.00986, core)
- Sources (after review): Reviewer's full rewrite (Durret 2015 read). Cut: the 1981 Palomar discovery, the 300 million light-year axis, the 'cocoon' claim. z = 0.0296 is cz 8,900 km/s = 127 Mpc = 413 million light-years at H0 = 70 (my conversion). Data dist_mpc 119 to 127; diam_mly 60 unchanged (the review's 115 is low confidence).

### fornax-eridanus (supercluster, Laniakea)
Target: `universe/structures/fornax-eridanus.json`
- fact: A complex of galaxy groups around the Fornax Cluster, about 65 million light-years away, associated with the historical Southern Supercluster.
- bio: Nasonova, de Freitas Pacheco and Karachentsev (2011) used 109 galaxies within 20 megaparsecs of the Fornax centre to map the Hubble flow around it. Their infall method gives a mass of 0.4 to 3.3 × 10^14 Suns for the Fornax Cluster, and 1.3 to 3.9 × 10^14 for the whole Fornax-Eridanus complex. NGC 1365, a barred spiral, lies in the Fornax Cluster.
- links: arXiv, Nasonova 2011 (https://arxiv.org/abs/1106.1291, core)
- Sources (after review): Review fixes: the snippet-only 18.6 and 21.1 Mpc cut; 'associated with the historical Southern Supercluster' (the equivalence is not in a primary: NOT VERIFIED); NGC 1365 wording. Data 20 Mpc kept.

### laniakea (supercluster, Cosmic web)
Target: `universe/structures/laniakea.json`
- fact: Laniakea is the basin of gravitational attraction that contains the Milky Way. It extends about 520 million light-years (160 megaparsecs) across, if approximated as round.
- bio: Tully, Courtois, Hoffman and Pomarède (2014) traced where peculiar-velocity flows diverge, as water does at watershed divides, and defined a supercluster as the volume within that surface. Laniakea encompasses about 10^17 Suns. It takes in the Local, or Virgo, Supercluster, the historical Southern Supercluster and the Pavo-Indus filament, and its flows converge near the Norma and Centaurus clusters, close to the Great Attractor. Dupuy and Courtois (2023) redrew the watersheds with Cosmicflows-4 and defined five more superclusters the same way: Apus, Hercules, Lepus, Perseus-Pisces and Shapley.
- links: arXiv, Tully 2014 (https://arxiv.org/abs/1409.0880, core); arXiv, Dupuy 2023 (https://arxiv.org/abs/2305.02339, core)
- Sources (after review): Review fixes: 160 Mpc = 520 million light-years from Tully 2014 (read), the component list in the Nature wording, mass 10^17 Suns added, the 2 × 10^6 (Mpc/h)^3 volume not quoted. Data diam 520 and extent 160 correct.

### horologium-reticulum (supercluster, Cosmic web)
Target: `universe/structures/horologium-reticulum.json`
- fact: A supercluster of galaxy clusters toward Horologium and Reticulum, about 0.8 to 1 billion light-years away.
- bio: Fleenor and colleagues (2005) measured 547 redshifts, mostly between the clusters, across a supercluster that covers more than 12 by 12 degrees of sky. The galaxies span 17,000 to 22,500 kilometres per second, with an overdensity of about 2.4 between the clusters. The supercluster splits into two redshift peaks about 2,500 kilometres per second (35 megaparsecs) apart, each with a systematic trend across the field. The authors found properties like those of the Shapley Concentration.
- links: arXiv, Fleenor 2005 (https://arxiv.org/abs/astro-ph/0505361, core)
- Sources (after review): Review fixes: 0.8 to 1 billion light-years (243 to 321 Mpc at H0 = 70, my conversion), the 547 redshifts and field wording. Data dist_mpc 210 to 285. Data diam 550 has no source; unchanged.

### shapley-concentration (concentration, Cosmic web)
Target: `universe/structures/shapley-concentration.json`
- fact: The Shapley Concentration is a dense knot of galaxy clusters about 650 million light-years away, which Hoffman and colleagues (2017) identify as the dominant attractor within about 7,000 kilometres per second.
- bio: Proust and colleagues (2006) gathered 10,529 velocities for 8,632 galaxies across 285 square degrees. Its main plane, at about 14,500 kilometres per second or about 650 million light-years, fills their whole 12 by 30 degree field, so it extends at least about 350 million light-years, with a galaxy overdensity of about 5.4 in the centre; 48 per cent of the galaxies lie between the rich clusters. Raychaudhury (1989) and, independently, Scaramella and colleagues (1989) identified it as a concentration of rich clusters.
- links: arXiv, Proust 2006 (https://arxiv.org/abs/astro-ph/0509903, core); arXiv, Hoffman 2017 (https://arxiv.org/abs/1702.02483, core)
- Sources (after review): Review fixes: the 'named it in 1989' claim reworded, size lower bound (plane 75 h^-1 Mpc at h = 0.7 is 107 Mpc, 350 million light-years; medium), the Hoffman clause is the reviewer's replacement and its wording was NOT confirmed from the paper. Data diam 260 to 350.

### perseus-pisces (wall, Cosmic web)
Target: `universe/structures/perseus-pisces.json`
- fact: A supercluster, a chain of galaxy clusters strongest toward Perseus and Pisces, about 230 to 250 million light-years away.
- bio: Haynes and Giovanelli (1986) mapped it with an H I redshift survey. Its main ridge extends at least about 70 megaparsecs (about 230 million light-years) and runs into the Milky Way's zone of avoidance east of Perseus. Dupuy and Courtois (2023) include it among six watershed superclusters, and Anand and colleagues (2019) think the motion of the Maffei Group is likely void expansion from its direction.
- links: arXiv, Dupuy and Courtois 2023 (https://arxiv.org/abs/2305.02339, core); arXiv, Anand 2019 (https://arxiv.org/abs/1901.05981, core)
- Sources (after review): Review fixes: no 'per h' (50 h^-1 Mpc at h = 0.7 is 71 Mpc), the Perseus Cluster / Abell 262 sentence cut, Wikipedia link replaced (Haynes and Giovanelli 1986 was not opened, so it is not linked), kind wall to supercluster in the data. Haynes and Giovanelli figures are from a search summary: NOT VERIFIED. Data diam 300 kept as schematic.

### coma-great-wall (wall, Cosmic web)
Target: `universe/structures/coma-great-wall.json`
- fact: The CfA2 Great Wall, a sheet of galaxies around the Coma Cluster described by Geller and Huchra in 1989 and filed on this site under the name Coma Supercluster, about 330 million light-years away.
- bio: It showed up in the second Center for Astrophysics redshift survey. Its full extent is unknown: the survey ends before the wall does, and the Milky Way's dust hides part of the sky. Gott and colleagues (2005) give its length as 240 megaparsecs in comoving coordinates, about 780 million light-years, against 450 for the Sloan Great Wall. Geller and Huchra wrote that the extent of the largest features is limited only by the size of the survey.
- links: arXiv, Gott 2005 (https://arxiv.org/abs/astro-ph/0310571, core)
- Sources (after review): Review fixes: Hercules and Leo membership cut (a separate structure), the extent sentence no longer contradicts itself, 'described by', Wikipedia link cut (no replacement). Data name 'Coma Supercluster (CfA2 Great Wall)' kept (glossary key). Geller and Huchra 1989 sentence is from a search summary: NOT VERIFIED.

### sloan-great-wall (wall, Cosmic web)
Target: `universe/structures/sloan-great-wall.json`
- fact: The Sloan Great Wall is a wall of galaxies mapped with the Sloan Digital Sky Survey, about a billion light-years away and extending about 1.4 billion light-years.
- bio: Gott and colleagues (2005) reported it as a structure at redshift 0.073, at a median distance of about 310 megaparsecs. They give its length as 419 megaparsecs as observed, about 1.4 billion light-years, or 450 in comoving coordinates, against 240 for the older Great Wall of Geller and Huchra. They said it was 80 per cent longer than that wall and so, at that date, the largest observed structure.
- links: arXiv, Gott 2005 (https://arxiv.org/abs/astro-ph/0310571, core)
- Sources (after review): Review fixes: 1.4 in both lines (1.37 billion), the observed and comoving lengths labelled. 'At that date' kept; later claims of longer structures NOT checked.

### bootes-void (void, Cosmic web)
Target: `universe/structures/bootes-void.json`
- fact: The Boötes Void is a region toward Boötes with far fewer galaxies than usual, about 700 million light-years away, found in 1981.
- bio: Kirshner, Oemler, Schechter and Shectman (1981) found an identical gap of about 6,000 kilometres per second in the galaxy redshifts of each of three small fields, about 35 degrees apart. A 1987 survey with 239 redshifts in 283 small fields confirmed a roughly spherical void of about a million cubic megaparsecs, with a radius of about 62 megaparsecs, centred near 15,500 kilometres per second. Dupuy and Courtois (2023) find a central repeller in the Boötes void, using the Cosmicflows-4 velocity field.
- links: ADS, Kirshner 1987 (https://articles.adsabs.harvard.edu/pdf/1987ApJ...314..493K, core); arXiv, Dupuy 2023 (https://arxiv.org/abs/2305.02339, core)
- Sources (after review): Review fixes: the 133 redshifts and the 12,000 / 18,000 bounds (snippet-only) cut, the 1987 survey described as the review words it, radius 62 Mpc. Data diam 330 to 400 (radius 62 Mpc = 124 Mpc diameter).

## Science review (applied 2026-11-13)

Review: `batch-06-review.md` (11 ERROR, 17 OVERREACH, 22 UNSUPPORTED, 14 NIT; verdict FIX THEN SHIP). Applied: every finding above NIT in the 25 objects that had one, plus the NITs; the 5 OK objects (ic-342-group, ngc-6946-group, canes-venatici-i, virgo-cluster, and maffei-group apart from its hedge) are unchanged.

- Reader text: no Wikipedia link remains; each former Wikipedia link is replaced by the primary the review names, and an entry with no primary has no link (coma-great-wall keeps Gott 2005 only; fornax-eridanus, laniakea, horologium-reticulum, shapley-concentration, sloan-great-wall and the others keep the arXiv links they had). No "per h" or "h^-1" in reader text.
- Redshift distances use H0 = 70 (see README). Fact and bio agree on every number (C4): sculptor 12 to 13, m81 11 to 12, centaurus-a 12 to 16, centaurus-cluster 160, sloan 1.4, laniakea 520.
- SHORT after the review: canes-venatici-spur, virgo-ii-groups (reviewer's minimal proposals), hydra-centaurus, pavo-indus (one sourced sentence each), local-group and virgo-supercluster (size cut). Nothing is padded.
- Wording that is the reviewer's own and rests on a search summary (NOT VERIFIED): the Atlas listing of canes-venatici-spur, "named for a bright member each, such as the M61 Group" (virgo-ii-groups), the 1,500 km/s of centaurus-cluster (the review's own arithmetic gives about 1,350), the Hoffman 2017 clause (shapley-concentration, great-attractor), the Haynes and Giovanelli 1986 ridge (perseus-pisces), the Geller and Huchra 1989 sentence (coma-great-wall), "associated with the historical Southern Supercluster" (fornax-eridanus).
- Data corrections applied in `static/data/universe/`: horologium-reticulum dist_mpc 210 to 285; shapley-concentration diam_mly 260 to 350; bootes-void diam_mly 330 to 400; perseus-pisces kind wall to supercluster; ophiuchus-supercluster dist_mpc 119 to 127; centaurus-cluster dist_mpc 52 to 49; m101-group dist_mpc 6.4 to 7.0; centaurus-a-group dist_mpc 3.7 to 3.8; leo-i-cloud dist_mpc 11 to 10.7. Not changed (review says keep or low confidence): ngc-5846-group 26 (review 25, low), ophiuchus diam_mly 60 (low), horologium diam_mly 550, virgo-supercluster diam_mly 110, perseus-pisces diam_mly 300, pavo-indus 70, hydra-centaurus 45, fornax-eridanus 20, m81-group 3.6, sculptor-group 3.7, and the rows marked keep.
- Names: leo-i-cloud and coma-great-wall keep id and data name (glossary keys); the fact line carries the literature name. fornax-eridanus "(Southern)" is not verified.

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
