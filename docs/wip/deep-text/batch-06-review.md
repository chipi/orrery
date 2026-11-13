Status: review of batch-06.md (commit 6b6ec389aa5); fixes not yet applied

# Deep text batch 6: science review

Verdict FIX THEN SHIP: 3 BLOCKER (ophiuchus-supercluster, canes-venatici-spur, virgo-ii-groups), 22 FIX, 5 OK. Findings: 11 ERROR, 17 OVERREACH, 22 UNSUPPORTED, 14 NIT.

Budget used: WebSearch 15 (the 45 spent earlier are not counted). WebFetch about 34 (4 failed or redirected). Fetches were arXiv abstract pages plus three ADS/arXiv PDFs read as images: Tully 2014 (arXiv 1409.0880 PDF, p.1-4), Kirshner 1987 (ADS scan, p.1), Tully 1982 (ADS scan, p.1), plus Durret 2015 (arXiv 1509.00986 PDF, p.1-2). Primary claims below marked "read" were read on the page, not from a search snippet.

## Cross-cutting

- C1, no "Wikipedia" in reader-facing text. 17 `links` entries are Wikipedia: m81-group, m101-group, ngc-5846-group, canes-venatici-spur, leo-i-cloud, ursa-major-cloud, virgo-ii-groups, centaurus-cluster, antlia-cluster, virgo-supercluster, great-attractor, hydra-centaurus, pavo-indus, ophiuchus-supercluster, perseus-pisces, coma-great-wall, bootes-void. If a link's host renders as a label, the label says "Wikipedia". I did not check how `links[]` render or whether `source-logos.json` shows a host name. Replace each with a primary link from this review. Where none exists the entry has no link (it does not keep a Wikipedia one).
- C2, Wikipedia-only claims. The writer's own list is right (7 texts). They are rewritten or cut below. Two items the writer thought were sourced are not: the "Tully (1982) described... several tens of small groups" attribution (that is de Vaucouleurs's 1953/56 definition, quoted in Tully's introduction), and the "Dupuy and Courtois 2023... cocoon" claim (not in the abstract).
- C3, superlatives. No unqualified "largest/first/only" is left in the texts. Sloan Great Wall "at that date, the largest observed structure" is correct as dated (Gott 2005 abstract: "largest observed structure in the universe"). Keep "at that date", and do not add anything about later structures without a source.
- C4, summary and body must give the same number. Mismatches: sculptor-group (fact 12 Mly vs bio 3.94 Mpc = 12.8 Mly), sloan-great-wall (fact 1.4 vs bio 1.37 billion), centaurus-a-group (fact "12 to 15" vs M83 sub-group 4.79 Mpc = 15.6 Mly), centaurus-cluster (fact 170 Mly vs z = 0.0114). The fix for each is under the object.
- C5, "extends about" for sizes. Use it in local-group, virgo-supercluster, laniakea, pavo-indus, sloan-great-wall, coma-great-wall ("spans", "across" and "long" appear instead).
- C6, H0 conversions. The sources use different H0 values.
  - Tully 2014: 160 Mpc = 12,000 km/s, so H0 = 75.
  - Fleenor 2005: 2,500 km/s = 35 Mpc, so H0 about 71.
  - The "455 Mly" Ophiuchus pointer: cz 8,400 over 139.6 Mpc gives H0 about 60.
  - The batch uses 70, which is fine for "about" statements.
  - Do not quote two values converted at different H0 on the same page. Say once in the README that redshift distances use H0 = 70. Never write "per h" or "h^-1 Mpc" in reader text (perseus-pisces, shapley): convert, or cut.

## Per-object findings

### local-group: FIX
- ERROR. "a sphere 3.75 megaparsecs across marks the upper limit of its realm of influence". McCall 2014 (arXiv 1403.3667, abstract read): "A 'Council of Giants' with a radius of 3.75 Mpc encompasses the Local Group". It is a radius. Across it would be 7.5 Mpc (about 24 Mly), which also contradicts the fact line's "about 10 million light-years across". Replacement: "McCall (2014) finds that a sphere with a radius of 3.75 megaparsecs, the Council of Giants, encloses the Local Group and sets an upper limit to its realm of influence."
- UNSUPPORTED. "about 10 million light-years across" (fact). No fetched source gives the Local Group's diameter, and the boundary is a definition (McCall's radius is an upper limit). Replacement: "...about 10 million light-years across by the usual convention" with a source, or cut the number. Needs a source for the number. Karachentsev's zero-velocity radius is in the group papers (e.g. astro-ph/0410065, body not read).
- NIT. "McConnachie's 2012 catalogue lists over 100 galaxies within 3 megaparsecs of the Sun": the catalogue spans the Local Group and its near neighbours, not only members. Add "and its neighbours".

### ic-342-group: OK
No findings above NIT. Data 3.3 Mpc against Wu 3.45 ± 0.13 is within 1.2 sigma. Fact "11 million" (3.37 Mpc) is fine.

### m81-group: FIX
- UNSUPPORTED. "Their group distance is about 3.6 megaparsecs." The 3.6 is the Wikipedia pointer's number, and it is attributed to Karachentsev 2002. The only line I found on the 2002 paper (an A&A search summary, page not readable) says "a distance of 3.5 Mpc from TRGB". The arXiv id of the 2002 paper is still unknown: astro-ph/0211011 is "Local galaxy flows within 5 Mpc" (fetched), and astro-ph/0210414 is CVn I. Replacement: "...distances of about 3.5 to 3.6 megaparsecs" with no name attached, or cut and keep only the fact line's 12 million light-years (3.7 Mpc).
- UNSUPPORTED. "neutral hydrogen forms bridges... These tides are thought to have stripped gas... drive the intense star formation in M82 and NGC 3077". The claim is mainstream, but it is Wikipedia-only here. Source it to Yun, Ho and Lo 1994, Nature 372, 530 (from memory, not opened), or cut the starburst clause.
- UNSUPPORTED. "among the nearest groups to the Local Group". Karachentsev 2005 (astro-ph/0410065, abstract read) lists M81 among the nearest groups; this is OK to keep with that link.
- Replace the Wikipedia link with Karachentsev 2005 only.

### centaurus-a-group: FIX
- NIT. "about 12 to 15 million light-years away". Cen A at 3.76 Mpc is 12.3 Mly and M83 at 4.79 Mpc is 15.6 Mly. Say "12 to 16".
- NIT. "orbital mass of 6 to 8 trillion Suns against about 1 trillion for M83's". Source: (6.4-8.1) and (0.8-0.9) x 10^12. Say "less than 1 trillion" or "about 0.8 to 0.9 trillion".
- Data: not an error. dist_mpc 3.7 is the Cen A sub-group (3.76). Set 3.8 and let the page carry the M83 sub-group at 4.79 (Karachentsev 2007, astro-ph/0603091, abstract read).

### sculptor-group: FIX
- NIT. The data does not conflict. 3.7 Mpc agrees with the 2021 dwarfs (3.62, 3.66). The 3.94 for NGC 253 is the 2003 value and the group is a filament with depth 3.34 to 4.92 Mpc. Keep the data. Drop "NGC 253 at 3.94" or write "NGC 253 at 3.94 in 2003".
- NIT. C4 mismatch: fact 12 Mly, bio 3.94 Mpc = 12.8 Mly. Say "about 12 to 13 million".
- OVERREACH, mild. "a loose filament... not a tight, bound group". The 2003 paper reads "loose filament rather than a bound system". Keep, and attribute it to Karachentsev 2003 in the bio.

### maffei-group: OK
- NIT. "which they attribute to void expansion". The abstract says "likely the manifestation of void expansion from the direction of Perseus-Pisces", about both groups. Replacement: "which they think is likely void expansion from the direction of Perseus-Pisces".
- NIT. Anand 2019 measures Maffei 2 only. The bio says "put Maffei 2 at 5.73" (correct) and the fact says "Maffei 1 and 2". Fine, but do not say Maffei 1 moved.

### ngc-6946-group: OK
Anand 2018 and Karachentsev 2000 were fetched by the writer; I did not re-fetch them. Data 7.7 agrees. The page quotes both 5.9 and 7.72, and the fact line 25 Mly follows 7.7. Good.

### m101-group: FIX
- UNSUPPORTED. The Wikipedia link and the Tikhonov 2015 member list. NGC 5474, NGC 5477, UGC 8837 and UGC 9405 are a search-summary item only. Cut the list or name the paper (arXiv id not found).
- OVERREACH. The distance of M101 is contested. The text gives 7.0 (Müller 2017, arXiv 1701.03681, abstract read: 3 Mpc filament, 67 kpc thickness, Local Void) while the data holds 6.4. I did not open a source for 6.4; from memory it is the Cepheid value (Shappee and Stanek 2011), unverified. Replacement for the fact: "A loose group of galaxies around the Pinwheel Galaxy (M101), about 23 million light-years away." Keep one number, 7.0 Mpc, and add "TRGB-based".
- Data: set dist_mpc 7.0 (22.8 Mly), the value the page cites. Confidence: medium, because 6.4 may have an independent source.

### ngc-5846-group: FIX (rewrite from primary)
The whole text rests on a Wikipedia pointer ("Virgo III Groups", "at least 13", "27 Mpc"). Replace with Mahdavi, Trentham and Tully 2005 (arXiv astro-ph/0506737, abstract read) and the Chandra papers (arXiv 1108.5229, search summary only).
- UNSUPPORTED. "part of the string of groups called Virgo III... at least 13 of them... about 27 megaparsecs away". Cut, or source it to a Tully group catalogue (Kourkchi and Tully 2017, arXiv 1705.08068, abstract not fetched).
- Replacement fact: "A group of galaxies around the giant elliptical NGC 5846, about 80 million light-years away, in the Virgo Supercluster."
- Replacement bio: "Mahdavi, Trentham and Tully (2005) found two giant ellipticals, NGC 5846 and NGC 5813, about 600 kiloparsecs apart in projection, inside a dark-matter halo about 1.6 megaparsecs across, with a velocity dispersion of 322 kilometres per second. The group is dominated by dwarf elliptical galaxies, as the Virgo Cluster is."
- Data 26 Mpc: the search summary of the Chandra work gives 24.9 Mpc (81 Mly), so 26 (85 Mly) is 4 percent high. Keep or set to 25 (confidence low, snippet).
- The "251 members" in the paper summary and the "80 percent dwarf ellipticals" in a search snippet were not checked. Do not use them.

### canes-venatici-i: OK
Karachentsev 2003 (astro-ph/0210414) as the writer fetched it. Fact 13 Mly for 4.0 Mpc is correct.

### canes-venatici-spur: BLOCKER (SHORT: nothing sourced)
- UNSUPPORTED. The whole text. Quotes: "Tully's Nearby Galaxies Catalog (1988) lists it as structure 43. It runs from the NGC 5353/54 Group toward the Virgo Cluster, linking the Canes Venatici-Camelopardalis Cloud to Virgo, and so offers a shortcut". The source is a search summary of Wikipedia articles that were not fetched. The link (Canes II Group) does not describe the spur.
- UNSUPPORTED. The 8 Mpc distance and the "shortcut" wording. "Shortcut" is not astrophysical language, so cut it.
- Found: Kim et al. 2016 (arXiv 1611.00437, abstract read) maps filaments around Virgo and confirms the NGC 5353/4 filament, but does not name a CVn Spur. A search snippet puts "the CVn Spur between the Arrowhead and the Virgo Cluster" (source not opened, id unknown).
- Proposal for the short page (decision: all 30 get pages). Use only what the data holds and say so: fact "A filament of galaxies in Canes Venatici, in the Virgo Supercluster, listed as a structure in Tully's Nearby Galaxies Atlas." Drop the 8 Mpc and the member list until Tully 1988 or Kourkchi and Tully 2017 (arXiv 1705.08068) is read. Bio: one sentence, "Few studies describe it on its own; the filaments around the Virgo Cluster that it belongs to are mapped by Kim and colleagues (2016)." Link: Kim 2016 only. If the operator wants numbers, hold this page.

### leo-i-cloud: FIX
- ERROR in kind and name. In the literature "Leo I" is the Leo I Group (the M96 Group around NGC 3379 and NGC 3627), at about 10.5 to 10.7 Mpc: TRGB (m-M)0 = 30.12 (M66) and 30.15 (M96) by Lee and Jang (arXiv 1306.2306, abstract read), and 30.10 ± 0.05 for the group mean (Harris and colleagues 2007, arXiv 0706.1995, search summary). It is not the Leo Cloud (about 22 to 26 Mpc by the writer's pointers). The page text is consistent with the group; the name and kind "cloud" are not. Decision needed: keep the site name, but say in the fact "the Leo I Group (the M96 Group)" and do not call it a string of groups.
- OVERREACH. Fact: "a string of galaxy groups in Leo that includes the M96 Group". The M96 Group is Leo I. Replacement fact: "The Leo I Group, also called the M96 Group, a group of galaxies in Leo about 35 million light-years away."
- ERROR, minor. "about 36 million light-years" is 11.0 Mpc. At 10.7 Mpc it is 34.9 Mly. Say "about 35 million".
- OVERREACH. "identifying 23 groups. They report that the Leo I group around NGC 3379, with NGC 3627 and the Local Group, moves away from the Local Void toward the Leo cloud at about 400 kilometres per second." The abstract (read via summary) names the Leo I group "around NGC 3379 = Leo I and NGC 3627" moving away from the Local Void toward the Leo cloud at about 400 km/s. "Leo cloud" there is the paper's term and is not defined in the abstract, so the page's own "Leo I Cloud" may or may not be it. Replacement: "Karachentsev, Nasonova and Karachentseva (2015) measured distances and peculiar velocities for 290 galaxies in Leo and Cancer, in 23 groups and 20 pairs, and found the Leo I group moving away from the Local Void at about 400 kilometres per second." Drop "with the Local Group" (not in the summary I read) unless the abstract text is checked.
- Data: dist_mpc 11 to 10.7.
- UNSUPPORTED. "M95, M96 and M105 are its brightest galaxies" (Wikipedia pointer). Keep as "M96 and M105"? Source: the TRGB and group papers show M66, M96 and NGC 3379 as members. Say "includes".

### ursa-major-cloud: FIX
- UNSUPPORTED. "it holds about 30 per cent of the light but only about 5 per cent of the mass of the Virgo Cluster". Wikipedia-only. Cut or source (Tully and colleagues 1996 is from the pointer, id not found).
- UNSUPPORTED. "about 580 galaxies in the surrounding cloud". The writer already flags the attribution as the writer's own, not the pointer's. Cut.
- UNSUPPORTED. "Tully and Verheijen (1997) adopted a distance of 15.5 megaparsecs". arXiv astro-ph/9703029 (abstract read) is "The Ursa Major Cluster of Galaxies. II. Bimodality of the Distribution of Central Surface Brightnesses". The abstract states no distance. Cut the 15.5 or verify in the body.
- Source found for 18.6: Trentham, Tully and Verheijen 2001 (arXiv astro-ph/0103039, "The Ursa Major Cluster of Galaxies. III...", abstract read: "approximately 18.6 megaparsecs"). Replacement bio sentence: "Trentham, Tully and Verheijen (2001) put the cluster at 18.6 megaparsecs and found about two dozen dwarf galaxies in it, far fewer than a Virgo-like cluster would give (about a thousand)." Link that paper.
- UNSUPPORTED. "contains the spiral-rich Ursa Major Cluster... members include M108 and M109". Tully and Verheijen's first sentence: "unevolved and made up of HI-rich spiral galaxies" supports "spiral-rich". The M108/M109 membership is Wikipedia-only, not opened here.
- Fact "about 60 million light-years" is 18.6 Mpc (60.6): consistent. Keep.

### virgo-ii-groups: BLOCKER (SHORT: nothing sourced)
- UNSUPPORTED. Every claim. Quotes: "They form the upper branch of the supercluster, with the Leo Cloud as the lower branch", "at least 100 galaxies and clusters", the eight named groups, "roughly 55 to 80 million light-years". All Wikipedia pointers (Powell's "An Atlas of the Universe" is a popular atlas and not a primary source).
- OVERREACH. "55 to 80 million light-years" (17 to 25 Mpc) is a width that Wikipedia does not source to a measurement. Data 18 Mpc sits at the near end.
- Related primary: Kim and colleagues 2016 (arXiv 1611.00437) confirm "Leo II A and B" filaments and others behind and beside the Virgo Cluster at 4 to 16 h^-1 Mpc in SGY. The mapping to "Virgo II" is not in the abstract; do not assume it. Tully 1982 (read) says the halo clouds are prolate, with long axes toward Virgo, but does not use "Virgo II" in the abstract.
- Proposal for the short page: one fact, no bio numbers. "The Virgo II Groups are a set of galaxy groups in the Virgo Supercluster, named for a bright member each, such as the M61 Group." Then: "They belong to the elongated clouds of galaxies around the Virgo Cluster that Tully (1982) described, prolate structures with their long axes toward Virgo." (Both claims are sourced to Tully 1982 only if "Virgo II" is among those clouds, which was not verified; otherwise cut the second sentence.) Or hold the page until Kourkchi and Tully 2017 (arXiv 1705.08068) or NED is opened. Cut "at least 100 galaxies" and the other seven group names.

### virgo-cluster: OK
Mei 2007 (astro-ph/0702510) and Shaya 2017 (arXiv 1710.08935) as the writer fetched them. 54 Mly for 16.5 Mpc is correct.

### centaurus-cluster: FIX
- ERROR, internal. Fact "about 170 million light-years" (52 Mpc) against the bio's "redshift of 0.0114". 0.0114 is cz = 3,418 km/s, which is 48.8 Mpc, or 159 Mly, at H0 = 70. The 170 is the pointer's value at a lower H0. Replacement: "about 160 million light-years" and data dist_mpc 49, or keep 52 with a source (NED not opened).
- OVERREACH. "a subgroup, Cen 45, centred on NGC 4709, which moves at about 1,500 kilometres per second relative to Cen 30 and is merging with it." It is a line-of-sight velocity offset (mean velocities 3,397 and 4,746 km/s, so about 1,350), not a motion, and the infall is an interpretation. Dupke and Bregman 2006 (arXiv astro-ph/0512045, abstract read) says "the incoming sub-group Cen45". Replacement: "a subgroup, Cen 45, centred on NGC 4709, whose galaxies are about 1,500 kilometres per second higher in redshift velocity than Cen 30 and which is thought to be falling into it."
- UNSUPPORTED. "about 100 galaxies" is not in the text (good), but "Catalogued as Abell 3526" and "z = 0.0114" are pointer-only. Cen 30 mean 3,397 ± 139 km/s is z = 0.0113 in the search snippet, so 0.0114 is plausible. Keep, mark NED check.
- OK once sourced: "The hot gas... has been mapped in X-rays with Chandra": Dupke and Bregman 2006. Add the link.
- Replace the Wikipedia link with arXiv astro-ph/0512045.

### antlia-cluster: FIX
- UNSUPPORTED. "Abell S0636 has about 234 galaxies", "nearly isothermal at about 2 keV", "binding mass is about 3.3 x 10^14 Suns", "no single dominant central galaxy", "rich in early-type and dwarf elliptical galaxies". Wikipedia-only. The 2 keV figure and the mass are not in anything I fetched. A search snippet attributes the ASCA gas result to Pedersen and colleagues 1997 (A&A, id not found). Cut the keV and the mass unless that paper is opened.
- Supported: Dirsch, Richtler and Bassino 2003 (arXiv astro-ph/0307200, abstract read): "NGC 3258 and NGC 3268 each contain several thousand clusters; NGC 3258 more than NGC 3268" (globular clusters). Smith Castelli and colleagues 2008 (arXiv 0803.1630, abstract read) is the right primary for early-type galaxies and the colour-magnitude relation in Antlia; it also notes Antlia's dynamics differ from Fornax, Virgo and others. It does not give 234 or 2 keV.
- Replacement bio: "Antlia is dominated by two massive ellipticals, NGC 3268 and NGC 3258, each at the centre of a subgroup. Dirsch, Richtler and Bassino (2003) found several thousand globular clusters around each, more around NGC 3258. Smith Castelli and colleagues (2008) measured the colours of its early-type galaxies and found the same colour-magnitude relation as Fornax, Virgo, Perseus and Coma."
- Data 40 Mpc and "about 130 million light-years" (40.7 Mpc) are consistent; the distance is unsourced.

### virgo-supercluster: FIX
- ERROR. "an overdensity of galaxies on the northern sky". Tully 1982 (abstract read): "an evident overdensity of galaxies in the north galactic hemisphere". Replacement: "in the northern Galactic hemisphere".
- OVERREACH. "Tully (1982) described the Local Supercluster as an overdensity... that holds the Virgo Cluster and several tens of small groups". That is de Vaucouleurs's definition (1953, 1956), as quoted in Tully's introduction. Tully's own result: a disc with 60 percent of the luminous galaxies and a halo with 40 percent; the disc is about six times longer than thick. Replacement: "De Vaucouleurs coined the name Local Supercluster in 1953. Tully (1982) mapped it as a thin disc holding about 60 per cent of its luminous galaxies, inside a roughly spherical halo holding the other 40 per cent."
- UNSUPPORTED. "spans about 110 to 150 million light-years" (fact). No primary gives it. Tully 1982's abstract gives no diameter; 110 (33 Mpc) and 147 are Wikipedia values. Replacement: "spans tens of megaparsecs" or no number. If kept, say once and attribute. Keep data diam 110 as a schematic value and mark it unsourced in the data file.
- OVERREACH. "Tully and colleagues (2014) found it is one lobe of Laniakea". The Nature text (read) says Laniakea "includes the historical Local and Southern superclusters". No "lobe". Replacement: "Tully and colleagues (2014) found that it lies inside Laniakea, together with the historical Southern Supercluster."
- OVERREACH. "The Local Group lies on its outskirts": McCall (2014) and Tully 1982 do not say this, so cite or cut.
- Replace the Wikipedia link with Tully 1982 (ADS bibcode 1982ApJ...257..389T).

### great-attractor: FIX
- OVERREACH. "argue it marks the centre of the Great Attractor". Woudt and Kraan-Korteweg 2000 (arXiv astro-ph/0006126): "most likely marks the bottom of the potential well of the Great Attractor". Keep the hedge: "argue that it most likely marks the bottom of the potential well of the Great Attractor".
- UNSUPPORTED, now sourced. "found in the 1980s from the motions of elliptical galaxies": supported by Dressler and colleagues 1987, "A large-scale streaming motion in the local universe" (the title in Tully 2014 ref 17, read). Add "(Dressler and colleagues 1987)".
- OVERREACH. The Great Attractor is a region, not an object. Tully 2014 (read): flows "converge toward the Norma and Centaurus clusters in good approximation to the location of what has been called the Great Attractor". Replacement fact: "The Great Attractor is the region toward Norma, about 220 million light-years away, where flows of galaxies, including ours, converge."
- Data: dist_mpc 68 against Norma cz 4,844 km/s = 69 Mpc: agrees. diam_mly 90 unsourced.
- Replace the Wikipedia link.

### hydra-centaurus: FIX (SHORT risk)
- ERROR/OVERREACH. "Tully and colleagues (2014) showed it is only a lobe of a greater structure, Laniakea." The Nature text names the "historical Local and Southern superclusters, the important Pavo-Indus filament, an extension to the Ophiuchus Cluster" and Norma and Centaurus clusters; it does not name Hydra-Centaurus. Replacement: "Tully and colleagues (2014) found flows converging near the Norma and Centaurus clusters inside Laniakea."
- UNSUPPORTED. "filament of four Abell clusters (A3537, A3565, A3574 and AS753)", "Antlia or Hydra Wall", Hydra Cluster A1060. Wikipedia-only (the Courtois 2013 abstract has none of it). Cut or source.
- UNSUPPORTED. Fact "130 to 150 million light-years". The Centaurus Cluster's own z (0.0114) puts it at 159 Mly and A1060 (Hydra) is further, so the range does not agree with its own members. Replacement: "about 150 million light-years" (45 Mpc), or cut the number.
- The Courtois 2013 id 1306.0091 is "Cosmography of the Local Universe" (abstract read, no Hydra-Centaurus numbers).
- Replace the Wikipedia link.

### pavo-indus: FIX (SHORT)
- ERROR in kind. Fact and bio call it a supercluster that is "a lobe of Laniakea... centred on the Great Attractor". Tully 2014 (read) writes "the important Pavo-Indus filament" and says flows converge "toward the Norma and Centaurus clusters", not toward Pavo-Indus. Replacement fact: "A filament and supercluster of galaxy clusters toward Pavo and Indus, in the southern sky, in Laniakea." Replacement sentence: "Tully and colleagues (2014) call it the important Pavo-Indus filament and include it in Laniakea."
- UNSUPPORTED. "wall or filament about 66 megaparsecs, 215 million light-years, long", "Abell 3656, Abell 3698 and Abell 3742", "Fairall (1988)", "60-70 Mpc". All Wikipedia-only. From memory, A3656 and A3698 are at cz about 5,000 to 5,800 km/s (about 70 to 83 Mpc), which would be above the 70 Mpc top of the pointer range; I did not open NED, so this is unverified.
- The text's sizes use "long": use "extends about".
- Data 70: unverified. Keep.
- "In the southern sky": the constellations are Pavo and Indus, so the statement is fine.
- Replace the Wikipedia link with Tully 2014 (arXiv 1409.0880).

### ophiuchus-supercluster: BLOCKER
- ERROR. Fact "about 390 to 450 million light-years away". The 450 end is the pointer's 455 Mly = 139.6 Mpc, with an implied H0 of about 60; the page's own redshift z = 0.028 is cz 8,394 km/s, or 120 Mpc (391 Mly), at H0 = 70. The cluster's own redshift is z = 0.0296 (Durret and colleagues 2015, arXiv 1509.00986, abstract read), which is 127 Mpc (413 Mly) at H0 = 70. Replacement fact: "A supercluster centred on the Ophiuchus Cluster, about 400 million light-years away, in the direction of the Milky Way's centre." Data: dist_mpc 119 to 127.
- ERROR/OVERREACH. "was found in 1981 on Palomar plates by Ken-ichi Wakamatsu and Matthew Malkan". Durret 2015 (read, p.1-2): the cluster "was discovered in X-rays by Johnston et al. (1981), who identified the 4U 1708-23 X-ray source with a cluster of galaxies, and more or less simultaneously at optical wavelengths by Wakamatsu & Malkan (1981) during a search for highly absorbed Galactic globular clusters." "Palomar plates" is not in that page. Replacement: "was identified in 1981 as the X-ray source 4U 1708-23 and, almost simultaneously, in optical images taken in a search for globular clusters hidden by the Milky Way."
- OVERREACH. "Tully and colleagues (2014) found it lies inside Laniakea". Tully 2014 (read): Laniakea includes "an extension to the Ophiuchus Cluster". Replacement: "Tully and colleagues (2014) describe Laniakea as extending toward the Ophiuchus Cluster."
- UNSUPPORTED/ERROR. "a 2023 study with Cosmicflows-4 proposed that Laniakea is a cocoon holding smaller superclusters". Dupuy and Courtois 2023 (arXiv 2305.02339, abstract read) say Laniakea's size is "confirmed" and they define five more superclusters by the same watershed method; the abstract does not mention a cocoon or Ophiuchus. Cut.
- UNSUPPORTED. "at least two more clusters, four groups and several field galaxies as members, over a major axis of about 300 million light-years". Wikipedia-only. The primary: Durret 2015 p.2 reports Wakamatsu and colleagues 2005: "several groups or clusters are located within 8 degrees of the cluster, thus forming a structure comparable to a supercluster, close to the Great Attractor". At 127 Mpc, 8 degrees is about 18 Mpc radius, or 36 Mpc (about 115 Mly) across (my geometry). The data's diam_mly 60 and the page's 300 Mly disagree; use the primary or cut both.
- Supported: "a rich cluster": Durret 2015 abstract: "one of the most massive nearby clusters", mass 1.1 x 10^15 Suns, relaxed. Add as the bio's first sentence.
- Proposed rewrite of the whole bio: "The Ophiuchus Cluster, at a redshift of 0.0296, is one of the most massive nearby clusters. Durret and colleagues (2015) estimate its mass at 1.1 x 10^15 Suns. It lies behind the Milky Way's disc, so its galaxies are hard to see. Wakamatsu and colleagues (2005) found several more groups or clusters within 8 degrees, a structure comparable to a supercluster. Tully and colleagues (2014) describe Laniakea as extending toward it." Link Durret 2015.
- Data: dist_mpc 119 to 127, diam_mly 60 to cut or 115 (low confidence).

### fornax-eridanus: FIX
- UNSUPPORTED. "Fornax is at about 18.6 megaparsecs, the complex's barycentre at 21.1, according to papers it cites." Search-snippet numbers. The 18.6 ± 0.3 (modulus 31.35) is identical to the Ursa Major value and modulus that I found for UMa (18.6 Mpc, 31.35) in a search result, which raises a contamination risk. From memory, ACS Fornax Cluster SBF work (Blakeslee and colleagues 2009) gives about 20 Mpc; not opened. Cut both numbers, or name a fetched paper.
- UNSUPPORTED. "which this site files under the southern part of Laniakea". The Southern Supercluster of de Vaucouleurs is named in Tully 2014 (read): "the historical Local and Southern superclusters". A search summary describes the Fornax-Eridanus complex as part of it, and the 2024 paper arXiv 2407.03225 (abstract read) maps the complex and its "Fornax Wall". The equivalence is not in a primary I read. Replacement fact: "A complex of galaxy groups around the Fornax Cluster, about 65 million light-years away, in the region that Tully and colleagues (2014) include in Laniakea as the Southern Supercluster." Safer: "associated with the historical Southern Supercluster", and mark the name "(Southern)" for review.
- NIT. "NGC 1365 is its best-known spiral": unsupported superlative-flavoured claim. Replacement: "NGC 1365, a barred spiral, lies in the Fornax Cluster."
- OK: Nasonova, de Freitas Pacheco and Karachentsev 2011 (arXiv 1106.1291): 109 galaxies within 20 Mpc, masses 0.4-3.3 and 1.3-3.9 x 10^14 as the writer reads the abstract.

### laniakea: FIX
- ERROR. Fact "about 400 to 520 million light-years across". Tully 2014 (read, main text p.4): "The region, if approximated as round, has a diameter 12,000 km/s or 160 Mpc and encompasses ~1 x 10^17 Msun." 160 Mpc is 522 Mly; the 400 Mly is Wikipedia's and has no primary. Replacement: "about 500 million light-years across", or "about 520 million light-years (160 megaparsecs) across, if approximated as round". Use "extends about".
- OVERREACH. "Laniakea takes in the Virgo Supercluster, the Hydra-Centaurus and Pavo-Indus Superclusters and the Great Attractor." The paper names "the historical Local and Southern superclusters, the important Pavo-Indus filament, an extension to the Ophiuchus Cluster, the Local Void, and the Sculptor and other bounding voids", with flows converging near the Norma and Centaurus clusters, close to the Great Attractor. Replacement: "It takes in the Local, or Virgo, Supercluster, the historical Southern Supercluster and the Pavo-Indus filament, and its flows converge near the Norma and Centaurus clusters, close to the Great Attractor."
- NIT. "defined a supercluster as the volume within that surface" is correct, as is "where peculiar-velocity flows diverge" (abstract read).
- NIT. Dupuy and Courtois 2023 give the volume as 2 x 10^6 (Mpc/h)^3. With h = 0.7 that is 5.8 x 10^6 Mpc^3, a sphere of about 220 Mpc, which does not match 160 Mpc; Laniakea is not round, and h = 1 gives about 156 Mpc. Do not quote both on one page.
- Add the mass: "encompasses about 10^17 Suns (Tully and colleagues 2014)", sourced and read.
- "Dupuy and Courtois (2023) redrew the watersheds... five more superclusters: Apus, Hercules, Lepus, Perseus-Pisces and Shapley": verified (abstract read).
- Data diam_mly 520: correct. extent_mpc 160: correct (Tully 2014).

### horologium-reticulum: FIX
- ERROR in data. dist_mpc 210 is below Fleenor's whole redshift range. 17,000 to 22,500 km/s at H0 = 70 is 243 to 321 Mpc (792 Mly to 1.05 Gly); at Fleenor's own 2,500 km/s = 35 Mpc it is 238 to 315 Mpc. Mean cz of about 20,000 is 285 Mpc. dist_mpc 210 equals Shapley (14,500 to 15,000 km/s). Set dist_mpc 285 (range 240 to 320). Schematic extent_mpc 320 still holds.
- ERROR. Fact "about 0.7 to 1 billion light-years away". Replacement: "about 0.8 to 1 billion light-years away".
- NIT. "measured 547 redshifts with the 6dF spectrograph across a field more than 12 by 12 degrees wide": the abstract says the HRS "covers an area of more than 12 deg x 12 deg"; the 547 redshifts were concentrated in the inter-cluster regions. Replacement: "...measured 547 redshifts, mostly between the clusters, across a supercluster that covers more than 12 by 12 degrees of sky."
- UNSUPPORTED. Data diam_mly 550 and the pointer's "1.2 Gly far end" are Wikipedia/unsourced. Fleenor's redshift range alone gives a depth of 5,500 km/s (about 77 Mpc) and a sky width of 12 degrees (about 60 Mpc at 285 Mpc). Mark the diameter as unsourced.
- OK: "overdensity of about 2.4", "two redshift peaks about 2,500 kilometres per second (35 megaparsecs) apart", "each with a systematic trend across the field" (abstract: "increases by more than 1500 km/s from SE to NW"), "properties like those of the Shapley Concentration".

### shapley-concentration: FIX
- OVERREACH. "Raychaudhury and, independently, Scaramella and colleagues named it in 1989." No source gives a naming. The structure is named for Harlow Shapley (1930 observation of a cloud in Centaurus; from memory, not opened). Tully 2014 ref 12 is Raychaudhury 1989, "The distribution of galaxies in the direction of the Great Attractor", Nature 342, 251. Replacement: "Raychaudhury (1989) and, independently, Scaramella and colleagues (1989) identified it as a concentration of rich clusters." (the second paper's title is not verified).
- UNSUPPORTED. "which Hoffman and colleagues (2017) call the main attractor of the local flow" (fact). The Hoffman abstract read via the fetch summary does not say this; it describes the Dipole Repeller "about 16,000 km/s away" and "two dominant structures". The writer's note reads "primary attractor within 7,000 km/s". Replacement: "which Hoffman and colleagues (2017) identify as the dominant attractor within about 7,000 km/s". Check the wording in the paper before shipping.
- ERROR in data (size). diam_mly 260 is below the lower bound. Proust 2006 (arXiv astro-ph/0509903, abstract read): "the main plane of the SSC (v~14500 km/s) extends further than previous estimates", spanning the full 12 x 30 degree survey region (30 x 75 h^-1 Mpc). At h = 0.7 that is 43 x 107 Mpc, so the plane is at least 107 Mpc (about 350 Mly) long. 260 Mly is h = 1. Set diam_mly 350 as a lower bound and say "extends at least about 350 million light-years" on the page. Confidence: medium (the h convention is the author's, h = 0.7 assumed). The pointer's 625 to 978 Mly is not sourced.
- NIT. "Its main plane lies near 14,500 kilometres per second": fine, but say "at about 14,500 kilometres per second, about 650 million light-years".
- OK: 8,632 galaxies, 10,529 velocities, 285 square degrees, 12 x 30 degrees, overdensity about 5.4, 48 per cent intercluster (abstract read).
- Fact "about 650 million light-years" (200 Mpc) vs cz 14,500 at H0 70 = 207 Mpc (675 Mly): within "about".

### perseus-pisces: FIX
- ERROR in kind. The data lists kind "wall" for an entity the name calls a supercluster. Dupuy and Courtois 2023 (abstract read) call it a supercluster, and Haynes and Giovanelli's own title uses "supercluster". Set kind "supercluster" (check that the kind does not change rendering).
- OVERREACH. "Its main ridge extends at least 50 megaparsecs per h": reader text must not carry the "per h". At h = 0.7 it is at least 71 Mpc (about 233 Mly). Replacement: "Its main ridge extends at least about 70 megaparsecs (about 230 million light-years) and runs into the Milky Way's zone of avoidance east of Perseus." (From a search summary of the 1986 paper; the paper was not opened.)
- UNSUPPORTED. "The Perseus Cluster (Abell 426) is one of its richest clusters, with Abell 262": Wikipedia pointer, unverified.
- NIT. Data diam_mly 300 is not in any fetched source. The 230 Mly lower bound above is. Keep 300 as schematic with "at least".
- OK: Dupuy 2023 "six watershed superclusters" (Laniakea plus five). Anand 2019 (arXiv 1901.05981, abstract read): "likely... void expansion from the direction of Perseus-Pisces" (see maffei-group).
- NIT. Distance: Abell 426 is at z = 0.0179, about 77 Mpc (250 Mly) at H0 = 70; the data's 70 Mpc (228 Mly) is a rough centre. Fact "about 230 million light-years" is fine; say "about 230 to 250".
- Replace the Wikipedia link with Haynes and Giovanelli 1986 (ApJ 306, L55, not opened) or Dupuy 2023.

### coma-great-wall: FIX
- UNSUPPORTED/ERROR risk. "the clusters Coma, Hercules and Leo lie in it". Wikipedia says three superclusters: Hercules, Coma and Leo. A search summary of the same article repeats that. The Hercules Supercluster is a separate structure, which Dupuy and Courtois 2023 define on their own. Cut "Hercules" and say "the Coma Cluster and the cluster Abell 1367 lie in it" only after checking a primary, for example Geller and Huchra 1989 (Science 246, 897, page 403, not opened).
- OVERREACH. "Its true extent is unknown because the dust of the Milky Way hides what lies beyond." Contradicts the next sentence ("limited only by the size of the survey"). The survey boundary and the zone of avoidance both limit it. Replacement: "Its full extent is unknown: the survey ends before the wall does, and the Milky Way's dust hides part of the sky."
- NIT/data. The data name "Coma Supercluster (CfA2 Great Wall)" conflates two entries; the Coma Supercluster of the older literature is smaller. The page text uses "The CfA2 Great Wall", which is right. Do not change the id. Native-terms and the glossary hold the exact name, so changing the name is a glossary job. Leave the name and say so in the fact line.
- OK: "length as 240 megaparsecs in comoving coordinates, against 450 for the Sloan Great Wall" (Gott 2005 ar5iv, writer-fetched; I did not re-read the body); the SGW 1.37 Gly and "80 percent longer" are in the abstract (read via the fetch summary, only 1.37 Gly confirmed). 240 Mpc = 782 Mly; data 750 Mly is within 5 percent. The distance 100 Mpc matches the Coma Cluster at z = 0.0231 (99 Mpc).
- NIT. "found by Geller and Huchra in 1989": say "described by", since the name and the 1989 paper are the Science paper; the 1986 "A slice of the universe" (cited in Tully 2014, read) is the first map.

### sloan-great-wall: FIX
- NIT. C4: fact "about 1.4 billion light-years long" against bio "1.37 billion"; use 1.4 in both or write 1.37 in both. Same for "a billion light-years away" (310 Mpc = 1.01 Gly: fine).
- NIT. The bio gives 419 Mpc (observed, 1.37 Gly) and 450 Mpc (comoving, 1.47 Gly) without telling the reader that these are two different lengths of the same wall. Replacement: "Gott and colleagues (2005) give its length as 419 megaparsecs as observed, or 450 in comoving coordinates."
- OVERREACH, small. "at that date, the largest observed structure": Gott's abstract says "largest observed structure in the universe". Keep "at that date". I did not verify later claims of longer structures; from memory, several have been proposed since, not opened here, so keep the page's date qualifier and say nothing more.
- UNSUPPORTED (not in text, so no action): the writer's "2011 challenge that it is a chance alignment" is not what Sheth and Diaferio 2011 (arXiv 1105.3378, "How unusual are the Shapley Supercluster and the Sloan Great Wall?", search summary) is about; it asks whether such structures are unusual in LCDM. Leave it out.
- Gott 2005 id astro-ph/0310571 is "A Map of the Universe"; the abstract states 1.37 Gly and "largest observed structure". Verified.

### bootes-void: FIX
- ERROR in data. diam_mly 330. Kirshner and colleagues 1987 (ADS scan p.1, read): "we confirm the existence of a large, roughly spherical void, of radius 62 Mpc, centred at alpha = 14h50, delta = +46, v = 15,500 km/s." A radius of 62 Mpc is a diameter of 124 Mpc, about 400 Mly (the abstract does not state H0, so the Mpc are the paper's). 330 Mly corresponds to a radius of about 50 Mpc. Set diam_mly 400 and write "about 62 megaparsecs in radius".
- UNSUPPORTED. "Kirshner, Oemler, Schechter and Shectman (1981) measured 133 redshifts in three narrow fields". The 133 is a search-summary figure. The 1987 paper says (read): "the redshift distributions in each of the three northern fields showed an identical 6000 km/s gap (Kirshner et al. 1981)". The "12,000 and 18,000" bounds are also snippet-only. Replacement: "found an identical gap of about 6,000 kilometres per second in the galaxy redshifts of each of three small fields, about 35 degrees apart" (the 1987 text says "angles of about 35 degrees"; read).
- ERROR, minor. "A larger survey in 1987 mapped it in detail." It was 283 small fields and 239 redshifts, a test of the earlier hypothesis. Replacement: "A 1987 survey with 239 redshifts in 283 small fields confirmed a roughly spherical void with a radius of 62 megaparsecs, centred near 15,500 kilometres per second."
- OK: "about a million cubic megaparsecs" (1987 abstract: "the existence of a 10^6 Mpc^3 void"). Fact "about 700 million light-years": v = 15,500 km/s at H0 = 70 is 221 Mpc (722 Mly): OK.
- OK: Dupuy 2023 "central repellers of the Bootes and Sculptor voids": abstract read.
- NIT. The distances here stay "about"; the 60 galaxies against about 2,000 expected is rightly cut.
- Replace the Wikipedia link with Kirshner 1987 (ADS 1987ApJ...314..493K; the ADS pdf is fetchable).

## Data-corrections table

| file | id | field | now | should hold | source (arXiv / bibcode) | confidence |
|---|---|---|---|---|---|---|
| cosmic-web.json | horologium-reticulum | dist_mpc | 210 | 285 (range 240-320) | Fleenor 2005, astro-ph/0505361: 17,000-22,500 km/s; abstract's own 2,500 km/s = 35 Mpc, so H0 about 71 | high (arithmetic from the abstract) |
| cosmic-web.json | horologium-reticulum | diam_mly | 550 | unsourced; keep as schematic and mark | none found (Fleenor gives depth about 77 Mpc, width about 60 Mpc) | medium |
| cosmic-web.json | shapley-concentration | diam_mly | 260 | 350, as a lower bound ("at least") | Proust 2006, astro-ph/0509903: plane of 75 h^-1 Mpc, h = 0.7 assumed | medium |
| cosmic-web.json | bootes-void | diam_mly | 330 | 400 (radius 62 Mpc) | Kirshner 1987, ApJ 314, 493 (bibcode 1987ApJ...314..493K), abstract read | high for the radius; H0 not stated |
| cosmic-web.json | perseus-pisces | kind | "wall" | "supercluster" | Dupuy and Courtois 2023, arXiv 2305.02339 (abstract) | high |
| cosmic-web.json | perseus-pisces | diam_mly | 300 | keep as schematic; page says "at least about 230" | Haynes and Giovanelli 1986 (search summary: at least 50 h^-1 Mpc; paper not opened) | low-medium |
| cosmic-web.json | coma-great-wall | diam_mly | 750 | keep (Gott 240 Mpc comoving = 782 Mly) | Gott 2005, astro-ph/0310571 | medium |
| cosmic-web.json | sloan-great-wall | dist_mpc, diam_mly | 300, 1400 | keep (310 Mpc, 1.37 Gly) | Gott 2005, astro-ph/0310571 | high |
| cosmic-web.json | laniakea | diam_mly | 520 | keep (Tully 2014: 160 Mpc = 12,000 km/s, H0 = 75) | Tully 2014, arXiv 1409.0880, main text p.4, read | high |
| laniakea.json | virgo-supercluster | diam_mly | 110 | no primary: keep as schematic, mark "unsourced"; page says "tens of megaparsecs" | Tully 1982 abstract has no diameter | high (that no source was found) |
| laniakea.json | ophiuchus-supercluster | dist_mpc | 119 | 127 (z = 0.0296, H0 = 70) | Durret 2015, arXiv 1509.00986 (abstract read) | high for z; the conversion is mine |
| laniakea.json | ophiuchus-supercluster | diam_mly | 60 | cut, or 115 (8 degrees radius at 127 Mpc; my geometry) | Durret 2015 p.2, citing Wakamatsu 2005 | low |
| laniakea.json | centaurus-cluster | dist_mpc | 52 | 49 (z = 0.0114 at H0 = 70) | Cen 30 mean 3,397 km/s (search snippet of Dupke and Bregman, astro-ph/0512045) | medium |
| laniakea.json | great-attractor | dist_mpc | 68 | keep (Norma cz 4,844 km/s = 69 Mpc) | Woudt and Kraan-Korteweg 2000, astro-ph/0006126 | medium |
| laniakea.json | hydra-centaurus | dist_mpc | 45 | keep; unsourced | none read; Centaurus Cluster 49, Hydra about 54 from z (memory) | low |
| laniakea.json | pavo-indus | dist_mpc | 70 | keep; unverified (A3656, A3698 may be 70-83 Mpc, from memory) | NED not opened | low |
| laniakea.json | fornax-eridanus | dist_mpc | 20 | keep; the 18.6 and 21.1 in the text are snippet-only | none read | low |
| local-group.json | (Local Sheet) m101-group | dist_mpc | 6.4 | 7.0 | Müller 2017, arXiv 1701.03681 | medium (6.4 may be a Cepheid value) |
| local-group.json | (Local Sheet) leo-i-cloud | dist_mpc | 11 | 10.7 | Lee and Jang 2013, arXiv 1306.2306 (30.12, 30.15) | high |
| local-group.json | (Local Sheet) centaurus-a-group | dist_mpc | 3.7 | 3.8 | Karachentsev 2007, astro-ph/0603091: 3.76 ± 0.05; M83 sub-group 4.79 ± 0.10 | high |
| local-group.json | (Local Sheet) sculptor-group | dist_mpc | 3.7 | keep | Karachentsev 2021, arXiv 2102.11354 (3.62, 3.66); 2003 NGC 253 3.94 | medium |
| local-group.json | (Local Sheet) ngc-5846-group | dist_mpc | 26 | 25 | Chandra papers (search summary: 24.9 Mpc) | low |
| local-group.json | (Local Sheet) ursa-major-cloud | dist_mpc | 18.6 | keep | Trentham, Tully and Verheijen 2001, astro-ph/0103039 | high |
| local-group.json | (Local Sheet) maffei-group | dist_mpc | 5.7 | keep (5.73 ± 0.40) | Anand 2019, arXiv 1901.05981 | high |
| local-group.json | (Local Sheet) ngc-6946-group | dist_mpc | 7.7 | keep | Anand 2018, arXiv 1807.05229 | high |
| local-group.json | (Local Sheet) m81-group | dist_mpc | 3.6 | keep; 3.5-3.6 in the sources I found (snippets) | Karachentsev 2002, A&A 383, 125 (id not found) | low |

The first column names the file that holds each id, per the batch's own grouping: local-sheet.json holds the Local Sheet groups and clouds listed (the task named local-sheet.json, virgo-cluster.json, laniakea.json and cosmic-web.json); I did not open local-sheet.json or virgo-cluster.json, so the "now" values for those rows are the batch's table, not the file. Check them against the files.

## Names and kinds

- perseus-pisces: kind "wall" to "supercluster" (see above). Check whether the kind drives rendering.
- coma-great-wall: the page says "CfA2 Great Wall", the data name is "Coma Supercluster (CfA2 Great Wall)". Keep the data name (it is a glossary key); the CfA2 Great Wall is the right reader-facing name. Wikipedia also calls it the "Coma Wall".
- fornax-eridanus "(Southern)": plausible, since Tully 2014 (read) names a Southern Supercluster and a search summary puts the Fornax-Eridanus complex in it, but no primary I read states the equivalence. Keep the name, and say "the historical Southern Supercluster" with a hedge. NOT VERIFIED.
- leo-i-cloud: the literature "Leo I" is a group at about 10.7 Mpc (see above). The "Leo Cloud" of the Virgo-Supercluster papers is a different, more distant structure. Rename the page "Leo I Group (M96 Group)" in the fact line, or change the name and id.
- centaurus-a-group (a "Complex" filed as kind group): fine, but the fact says "two sub-groups" and the text says so. Keep.

## Hedges and conversions (priority 5)

- No "largest/first/only" claims left except the dated SGW one (OK).
- False precision: "5.73 ± 0.40", "3.45 ± 0.13" and similar are the papers' own numbers and are quoted with errors; OK. "over a major axis of about 300 million light-years" (ophiuchus) and "about 580 galaxies" (ursa-major-cloud) are false precision without sources: cut.
- H0 and redshift conversions: every cz-to-Mpc conversion in the texts and the table is the writer's at H0 = 70. They are reasonable, but I found two that do not agree with their own page (centaurus-cluster 170 Mly, ophiuchus 450 Mly) and one data value that is below a source's range (horologium-reticulum).

## NOT VERIFIED (reviewer)

- Not opened: Karachentsev 2002 (M81, A&A 383, 125; aanda.org 403; arXiv id not found), Haynes and Giovanelli 1986, Geller and Huchra 1989 (Science 403), Pedersen and colleagues 1997 (Antlia ASCA), Tikhonov 2015 (M101), Courtois 2013 body, Dressler 1987 body, Shappee and Stanek 2011 (M101 Cepheid, from memory), Blakeslee 2009 (Fornax, from memory), Yun, Ho and Lo 1994 (M81 H I, from memory), Harris 2007 (search summary), NED for every cluster and group distance, and any Abell redshift (A3656, A3698, A3742, A1060).
- Not re-fetched, accepted from the writer's own fetches: Wu 2014, Anand 2018, Karachentsev 2000, 2003 and 2021, Müller 2017 (re-fetched, matches), Mei 2007, Shaya 2017, McConnachie 2012, Nasonova 2011, Gott 2005 body text, Kim 2016 body.
- Hoffman 2017 wording "primary attractor within 7,000 km/s" was not confirmed from the abstract (only a fetch summary read).
- The claim that Hydra-Centaurus, Fornax-Eridanus (as "Southern") and Ophiuchus are components of Laniakea beyond the Nature text's wording (Tully 2014 main text read only; the supplementary material and the Hawaii press release were not).
- Whether any structure longer than the Sloan Great Wall has since been claimed: not checked; the page is dated "at that date" and need not say more.
- local-sheet.json and virgo-cluster.json were not opened (only laniakea.json and cosmic-web.json were read directly); the "now" values for Local Sheet and Virgo rows come from the batch's own table.
- The page's check-seo count and the `links[]` host-label rendering (C1) were not checked.

## Sources used (primary, fetched)

- Tully 2014 PDF: https://arxiv.org/pdf/1409.0880 (abs https://arxiv.org/abs/1409.0880)
- Dupuy and Courtois 2023: https://arxiv.org/abs/2305.02339
- Fleenor 2005: https://arxiv.org/abs/astro-ph/0505361
- Proust 2006: https://arxiv.org/abs/astro-ph/0509903
- Kirshner 1987: https://articles.adsabs.harvard.edu/pdf/1987ApJ...314..493K
- Tully 1982: https://adsabs.harvard.edu/pdf/1982ApJ...257..389T
- Durret 2015 (Ophiuchus): https://arxiv.org/abs/1509.00986
- Dupke and Bregman 2006 (Centaurus): https://arxiv.org/abs/astro-ph/0512045
- Mahdavi, Trentham, Tully 2005 (NGC 5846): https://arxiv.org/abs/astro-ph/0506737
- Dirsch 2003: https://arxiv.org/abs/astro-ph/0307200; Smith Castelli 2008: https://arxiv.org/abs/0803.1630
- Trentham, Tully, Verheijen 2001 (UMa): https://arxiv.org/abs/astro-ph/0103039; Tully and Verheijen 1997: https://arxiv.org/abs/astro-ph/9703029
- Lee and Jang 2013 (Leo I): https://arxiv.org/abs/1306.2306; Karachentsev 2015: https://arxiv.org/abs/1502.04253
- McCall 2014: https://arxiv.org/abs/1403.3667; Woudt and Kraan-Korteweg 2000: https://arxiv.org/abs/astro-ph/0006126
- Karachentsev 2007 (Cen A/M83): https://arxiv.org/abs/astro-ph/0603091; Kim 2016: https://arxiv.org/abs/1611.00437
- Anand 2019: https://arxiv.org/abs/1901.05981; Müller 2017: https://arxiv.org/abs/1701.03681; Hoffman 2017: https://arxiv.org/abs/1702.02483; Gott 2005: https://arxiv.org/abs/astro-ph/0310571
