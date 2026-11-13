# Deep text, batch 5b (drafts): 47 Tucanae and NGC 6752

Drafts only. Nothing here is in `i18n-src/`, `static/` or `scripts/` yet. 2026-11-13, branch `tech-debt/0.9.9`. Plan row L40; decision 3 of `docs/wip/2026-11-12-galaxy-pages-brief.md`. Not yet science-reviewed: the "Claims to verify" table is the input for the science-reviewer.

## Shape

- Same shape as batch 4: overlay `i18n-src/en-US/universe/deep-sky/<id>.json` with `fact`, `bio`, and one or two `links` (`l`, `u`, `t`: intro or core). `fact` + `bio` counted with spaces, no joining space (scratch script `b5b-count.mjs`): 47 Tucanae 539, NGC 6752 502.
- Ids: the pipeline slugs the designation, so the records are `ngc-104` and `ngc-6752` (like `ngc-5139` for Omega Centauri). The Milky Way scale's row is `47-tucanae`; `ngc-6752` already matches. `47-tucanae` needs an alias to `ngc-104` in `scripts/site-routes.mjs` (the table that holds `'omega-centauri': 'ngc-5139'`, line 215) and in `scripts/site-routes.test.ts` (line 170 pattern); `src/lib/explore/scale-index.test.ts:192,297` holds the omega-centauri precedent.
- Sources actually read this session: Baumgardt's per-cluster pages (ngc0104, ngc6752), the cached Baumgardt orbits table, Harris `mwgc.dat` (2010 edition), OpenNGC `NGC.csv` (all three from `~/.cache/orrery`, the refresh script's own cache), Chandra photo page for 47 Tuc, NASA APOD 2012-02-10 (NGC 6752), arXiv abstract pages 0912.2055, 1109.0900, 1709.01807, 1308.2257, the SEDS MWGC page for NGC 104, Freire's globular-cluster pulsar page. 5 WebSearch calls and 11 WebFetch calls used (limit 15 searches). No Wikipedia page was fetched or linked.
- Cluster ages are not given: no fetched source states a specific age for 47 Tuc; NGC 6752's "over 10 billion years" is NASA's wording.

## 47 Tucanae

Target: `i18n-src/en-US/universe/deep-sky/ngc-104.json`

- fact: The globular cluster 47 Tucanae lies in the southern constellation Tucana, about 14,700 light-years away.
- bio: Nicolas-Louis de Lacaille found it from the Cape of Good Hope on 14 September 1751 and listed it as a nebula. N-body fits give it about 850,000 solar masses (Baumgardt and Vasiliev, 2021). More than 40 radio pulsars are known in it. Hubble photometry splits its main sequence into two branches, one with primordial chemistry and one with enhanced nitrogen and helium, so its stars did not all form alike (Milone and colleagues, 2012).
- links: Baumgardt (https://people.smp.uq.edu.au/HolgerBaumgardt/globular/fits/ngc0104.html, core); arXiv, Milone 2012 (https://arxiv.org/abs/1109.0900, intro)
- Length: fact 105 + bio 434 = 539 characters.
- Sources:
  - 14,700 ly: Baumgardt orbits table R_sun 4.52 kpc, error 0.03; the per-cluster page reads "4520 +/- 30 pc"; 4.52 kpc x 3261.56 = 14,742 ly. Harris 2010 gives 4.5 kpc, Chandra's page "about 15,000 light years", SEDS 14.7 thousand ly.
  - Lacaille, 14 September 1751, Cape of Good Hope, taken for a star then recognised as nebulous, Lac I.1: SEDS MWGC page for NGC 104 (fetched).
  - 850,000 solar masses: Baumgardt page "8.53 x 10^5 Msun" (N-body fits; Baumgardt and Vasiliev 2021).
  - More than 40 pulsars: Freire's globular-cluster pulsar page (fetched, "42 pulsars, more than 28 binaries"); SEDS page also says approximately 42. The page is a continuously updated list, not a paper: the wording is "more than 40".
  - Two branches, one primordial and one with enhanced nitrogen and a small helium enhancement, depleted C and O: Milone et al. 2012, ApJ 744, 58 (arXiv 1109.0900 abstract page fetched). The text's "enhanced nitrogen and helium" shortens "a small helium enhancement": the reviewer may want "a small helium enhancement".

## NGC 6752

Target: `i18n-src/en-US/universe/deep-sky/ngc-6752.json`

- fact: NGC 6752 is a globular cluster in the southern constellation Pavo, about 13,400 light-years away.
- bio: N-body fits give it about 260,000 solar masses (Baumgardt and Vasiliev, 2021). NASA describes it as over 10 billion years old; a Hubble view of its core shows blue stragglers, stars that look younger and more massive than the cluster, possibly made by collisions and mergers. Hubble photometry and red-giant sodium and oxygen abundances show more than one stellar population (Milone and colleagues, 2010).
- links: NASA APOD, Hubble view of the core (https://science.nasa.gov/image-article/apod-2012-february-10-at-the-core-of-ngc-6752/, intro); Baumgardt (https://people.smp.uq.edu.au/HolgerBaumgardt/globular/fits/ngc6752.html, core)
- Length: fact 97 + bio 405 = 502 characters.
- Sources:
  - 13,400 ly: Baumgardt orbits table R_sun 4.12 kpc (error 0.04), x 3261.56 = 13,438 ly. The per-cluster page reads "4130 +/- 40 pc" (13,470 ly): see Data conflicts. NASA APOD "approximately 13,000 light-years"; Harris 4.0 kpc.
  - 260,000 solar masses: Baumgardt page "2.61 x 10^5 Msun".
  - Over 10 billion years, blue stragglers "younger and more massive than expected", a remarkable fraction of near-core stars in multiple systems supporting mergers and collisions: NASA APOD 2012-02-10, credit ESA/Hubble and NASA (fetched). "Possibly made by collisions and mergers" is the APOD's "supporting arguments".
  - Broadened main sequence, red-giant branch colour spread correlated with Na and O: Milone et al. 2010, ApJ 709, 1183 (arXiv 0912.2055 abstract page fetched).
- Left out: the 9 known pulsars (Freire's page: 9, 1 binary) and any age beyond NASA's "over 10 billion years".

## Proposed deep-sky records and catalogue entries

Pipeline: `scripts/refresh-messier-catalog.mjs` builds `scripts/data-snapshots/messier-catalog.json`; `scripts/build-universe-deep-sky.ts` joins it into `static/data/universe/deep-sky-objects.json`. Neither object is in the snapshot today (grep of both files for `NGC 104`, `NGC 6752`, `47 Tuc`: no hits; both are in OpenNGC as `NGC0104`, `NGC6752`, type GCl).

Proposed edits (not made):

1. `NGC_ALIAS` in `refresh-messier-catalog.mjs` (line 196): add `'NGC 104': 'NGC0104'` and `'NGC 6752': 'NGC6752'` (the existing precedent for objects not in the photo gallery; step 3 of the script only reads gallery rows). The ongc field is set from the OpenNGC name, so Harris and Baumgardt are keyed.
2. `NAME_OVERRIDE` in `build-universe-deep-sky.ts` (line ~149): `'NGC 104': '47 Tucanae'` (OpenNGC's common name is "47 Tuc Cluster") and `'NGC 6752': 'NGC 6752'` (no common name: the fallback would be `NGC6752`).
3. Run `node scripts/refresh-messier-catalog.mjs` then `tsx scripts/build-universe-deep-sky.ts`. The Harris, Baumgardt and OpenNGC tables are in `~/.cache/orrery`, so only SIMBAD (`records.simbad`) needs the network. The values below were produced with the repo's own `enrichObject` over those cached tables (scratch `b5b-records.mjs`), SIMBAD left out.
4. `47-tucanae` alias to `ngc-104` in `site-routes.mjs` / its test, plus `route-lastmod` for the two routes (README step 4).

Snapshot / catalogue entries as `enrichObject` returns them (positions are OpenNGC's, from NED; `records.simbad` follows the existing pattern `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=NGC%20104`, to be filled by the refresh):

```json
{
  "designation": "NGC 104", "ra": 6.02233, "dec": -72.08144, "type": "GCl", "con": "Tuc",
  "size": 31.8, "common": "47 Tuc Cluster", "ongc": "NGC0104", "mag": 3.95,
  "catalogue": {
    "position":    { "value": [6.02233, -72.08144], "source": "OpenNGC, coordinates from NED" },
    "size_arcmin": { "value": 31.8, "source": "OpenNGC, major axis (LEDA, SIMBAD, HEASARC)" },
    "mag":         { "value": 3.95, "source": "Harris ... (1996, 2010 edition), integrated V", "bibcode": "1996AJ....112.1487H", "record_url": "https://physics.mcmaster.ca/~harris/mwgc.dat" },
    "dist_ly":     { "value": 14742, "source": "Baumgardt & Vasiliev 2021, Galactic globular cluster distances (Gaia EDR3, HST, N-body fits)", "bibcode": "2021MNRAS.505.5957B", "record_url": "https://people.smp.uq.edu.au/HolgerBaumgardt/globular/fits/ngc0104.html", "note": "+/- 0.03 kpc; Harris 1996 (2010 edition): 4.5 kpc" }
  }
}
{
  "designation": "NGC 6752", "ra": 287.71575, "dec": -59.98186, "type": "GCl", "con": "Pav",
  "size": 13.2, "common": "", "ongc": "NGC6752", "mag": 5.4,
  "catalogue": {
    "position":    { "value": [287.71575, -59.98186] },
    "size_arcmin": { "value": 13.2 },
    "mag":         { "value": 5.4, "source": "Harris ... integrated V", "bibcode": "1996AJ....112.1487H" },
    "dist_ly":     { "value": 13438, "bibcode": "2021MNRAS.505.5957B", "record_url": "https://people.smp.uq.edu.au/HolgerBaumgardt/globular/fits/ngc6752.html", "note": "+/- 0.04 kpc; Harris 1996 (2010 edition): 4 kpc" }
  }
}
```

Resulting `deep-sky-objects.json` records (the build computes `id`, `category`, unit vector, `dist_label` via `distanceLabel`):

| id | designation | name | category | ra | dec | x | y | z | mag | size_arcmin | con | dist_ly | dist_label | photoKey |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ngc-104` | NGC 104 | 47 Tucanae | globular-cluster | 6.02233 | -72.08144 | 0.305967 | -0.951495 | 0.032279 | 3.95 | 31.8 | Tuc | 14742 | ~15,000 light-years | null |
| `ngc-6752` | NGC 6752 | NGC 6752 | globular-cluster | 287.71575 | -59.98186 | 0.152231 | -0.865867 | -0.47655 | 5.4 | 13.2 | Pav | 13438 | ~13,000 light-years | null |

`distanceLabel` rounds to two significant digits above 10,000 ly, so the panel label reads ~15,000 for 47 Tucanae while the text says 14,700 (14,742); the same is true of Omega Centauri (17,710 shown as ~18,000, text "about 18,000"). The text follows the catalogue value, not the label. Decision for the lead: write the text as "about 15,000" to match the label, or keep 14,700.

`static/data/text-sources.json`: extend the existing entry `deep-sky.overlays.baumgardt-vasiliev` snippet (currently "M54, M72, M92, M107, NGC 5139") with NGC 104 and NGC 6752, and add entries for the NASA APOD (NGC 6752), arXiv 1109.0900 and the Freire pulsar page (not linked; cite as source only if kept). Hosts for outbound links: `people.smp.uq.edu.au` (used by `ngc-5139.json`), `arxiv.org` and `science.nasa.gov`: the lead checks that each is in `static/data/source-logos.json` (NASA and arXiv entries exist there; I did not confirm the Baumgardt host entry).

Glossary terms to check in `scripts/i18n-tools/native-terms.json` before translation (README step 5): globular cluster, blue straggler, pulsar, main sequence, red giant, solar mass, N-body, nebula. Not looked up by me.

## Data conflicts

- NGC 6752 distance: Baumgardt orbits table 4.12 kpc (what the pipeline reads, 13,438 ly) against the Baumgardt per-cluster page 4130 +/- 40 pc (13,470 ly). Same group, different file version. Both round to about 13,400 to 13,500; the text says 13,400, the pipeline value. Harris 4.0 kpc, NASA 13,000.
- 47 Tucanae: page and table agree (4.52 kpc). V magnitude: Harris V_t 3.95 (what the catalogue stores), Baumgardt 4.08, OpenNGC 4.09. Text gives no magnitude.
- `milky-way-schematic.json` has 47 Tucanae at 14,500 ly and NGC 6752 at 13,000 ly (rows `47-tucanae`, `ngc-6752`): differ from 14,742 and 13,438. The scene's rows are schematic positions; the lead decides whether the schematic distances should follow the catalogue (batch 4's reviewed values were applied to the catalogue layer, not this file).
- Baumgardt record URL: the pipeline builds `.../fits/ngc0104.html` (zero-padded, from the OpenNGC name); I fetched that URL and it resolves.

## Claims to verify (for the science-reviewer)

| # | Object | Claim in the text | Source I read | Level of my check |
|---|---|---|---|---|
| 1 | 47 Tuc | In Tucana, a globular cluster, about 14,700 ly away | Baumgardt page 4520 +/- 30 pc, table 4.52 kpc; SEDS 14.7 kly | read |
| 2 | 47 Tuc | Lacaille found it from the Cape of Good Hope on 14 September 1751 and listed it as a nebula | SEDS MWGC page (secondary compilation) | read the SEDS page only; no Lacaille original; the date is the SEDS date |
| 3 | 47 Tuc | About 850,000 solar masses from N-body fits | Baumgardt page 8.53e5 | read |
| 4 | 47 Tuc | "More than 40 radio pulsars are known in it" | Freire page 42; SEDS about 42 | read; neither is a paper; confirm the count and that "radio" is right (Chandra page says millisecond pulsars; the Freire list is radio-discovered) |
| 5 | 47 Tuc | Hubble photometry splits the main sequence into two branches, one primordial, one with enhanced nitrogen and helium | Milone et al. 2012 abstract page | read abstract only; "enhanced nitrogen and a small helium enhancement": is "enhanced ... helium" too strong? |
| 6 | 47 Tuc | "so its stars did not all form alike" (inference from claim 5) | Milone abstract | my wording; check it is not stronger than the paper |
| 7 | NGC 6752 | Pavo, southern constellation, about 13,400 ly | Baumgardt table 4.12 kpc (page 4.13); NASA "13,000" | read; see Data conflicts |
| 8 | NGC 6752 | About 260,000 solar masses from N-body fits | Baumgardt page 2.61e5 | read |
| 9 | NGC 6752 | NASA describes it as over 10 billion years old | NASA APOD 2012-02-10 | read (via WebFetch summary); a recent paper on the age was not read: does the reviewer want a measured age from the literature instead? |
| 10 | NGC 6752 | A Hubble view of its core shows blue stragglers, stars that look younger and more massive than the cluster | NASA APOD | read; the APOD says the Hubble frame covers the central 10 ly |
| 11 | NGC 6752 | Blue stragglers "possibly made by collisions and mergers" | NASA APOD ("supporting arguments that star mergers and collisions can create") | read; the APOD ties it to a high fraction of multiple systems near the core, which the shortened text no longer states |
| 12 | NGC 6752 | Hubble photometry and red-giant sodium and oxygen abundances show more than one stellar population | Milone et al. 2010 abstract page | read abstract only; the main-sequence broadening had "some indication of a split" |
| 13 | both | "(Baumgardt and Vasiliev, 2021)" for the masses | Baumgardt pages, bibcode 2021MNRAS.505.5957B from the repo | the pages are Baumgardt's; the attribution to the 2021 paper rests on the repo's catalogue note and the site's own citation; confirm the mass values come from that paper's version of the fits |
| 14 | both | Both are Milky Way globular clusters | Harris, Baumgardt | read |

## NOT VERIFIED

- Lacaille's discovery date and "listed as a nebula": only the SEDS compilation was read; the other searched sources are search snippets.
- That 47 Tucanae "appears beside the Small Magellanic Cloud": I considered a sentence on it and cut it because no fetched page supports it. It is not in the text.
- Pulsar counts (claim 4) come from one maintained list, not a paper; no dated source.
- Cluster ages: no measured age for either cluster was read; NGC 6752's rests on NASA's popular wording.
- Mass-to-paper attribution (claim 13).
- Whether `people.smp.uq.edu.au` and `science.nasa.gov` have `source-logos.json` host entries; whether `route-lastmod` or `validate-data` need further entries for the two new routes; whether the glossary has the terms listed above.
- `records.simbad` for the two objects: the refresh needs the network and was not run; the snapshot, `deep-sky-objects.json` and the alias tables are unchanged.
- Not touched: i18n-src, static/data, scripts, translations, glossary, any run of `validate-data` or `build`.

## Counts

| id | fact | bio | total |
|---|---|---|---|
| ngc-104 | 105 | 434 | 539 |
| ngc-6752 | 97 | 405 | 502 |

