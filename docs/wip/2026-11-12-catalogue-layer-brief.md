# Authoritative catalogue layer — brief (GitHub #658)

Operator 2026-11-12: every catalogue-derived value on a panel or entity page comes from an
authoritative catalogue, names it, links to the object's record, and /credits carries each
catalogue's acknowledgement. Plan: `docs/wip/2026-11-11-ux-feedback-plan.md` ("Authoritative
catalogues" and its "Timing" sub-bullet). Run by hand, committed output, never at runtime.

## Services — what answers from this machine (probed 2026-11-12, curl from script files)

| Service | Endpoint | Result |
|---|---|---|
| CDS Strasbourg (SIMBAD, VizieR, tapvizier, vizier.u-strasbg.fr) | `simbad.cds.unistra.fr/simbad/sim-tap/sync`, `tapvizier.cds.unistra.fr/TAPVizieR/tap/sync`, `vizier.cds.unistra.fr/...` | every path returns a 404 "Page unavailable — CDS" page (POST and GET, with and without a User-Agent): the host is not usable from here, not a wrong path |
| SIMBAD TAP, CfA mirror | `https://simbad.cfa.harvard.edu/simbad/sim-tap/sync` (POST `REQUEST=doQuery&LANG=ADQL&FORMAT=text`) | 200; tables `basic`, `ident`, `flux`, `mesdistance` queried |
| VizieR ASU, CfA mirror | `https://vizier.cfa.harvard.edu/viz-bin/asu-tsv?-source=<table>&…` | 200; the VizieR TAP path does not exist on the mirror (404), ASU is used |
| NED ObjectLookup | `POST https://ned.ipac.caltech.edu/srs/ObjectLookup` body `{"name":{"v":"M87"}}` | 200, JSON with `Preferred.Name`, position, `RefCode` |
| NED TAP | `https://ned.ipac.caltech.edu/tap/sync` | 200 but only `NEDTAP.objdir` exists: no distance table, so NED-D is not reachable by TAP |
| Baumgardt globular-cluster table | `https://people.smp.uq.edu.au/HolgerBaumgardt/globular/orbits_table.txt` | 200, 168 clusters, columns `Rsun`, `Delta_R` (kpc) |
| Harris catalogue (2010 edition) | `https://physics.mcmaster.ca/~harris/mwgc.dat` (the `physwww` host 301-redirects) | 200 with `-L`; Part I positions, Part II `V_t` |
| OpenNGC | `https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv` | 200 (already used) |
| ADS | `ui.adsabs.harvard.edu/abs/<bibcode>/abstract` | 405 to curl (bot guard); used only as the link target |

Record URLs are stored with the canonical CDS hosts (what a reader's browser reaches); the same
paths were checked 200 on the CfA mirrors (`sim-id?Ident=M+87`, `VizieR-4?-source=…&Name=…`,
`byname?objname=M87`, the exoplanet archive `overview/<host>`, the Baumgardt `fits/ngc5272.html`).

## Stored shape

Scalar fields stay as they are (no consumer changes); each sourced scalar gets a sibling entry in
a `catalogue` map keyed by field:

```json
"catalogue": {
  "dist_ly": { "value": 28000000, "source": "Cosmicflows-4 (Tully et al. 2023)",
               "bibcode": "2023ApJ...944...94T", "record_url": "https://…", "note": "…" }
}
```

`value` equals the scalar; `note` records the alternative where catalogues disagree. Object-level
`records: { simbad, ned }` hold the object pages. validate-data fails when a `catalogue` entry has
no `source` / `record_url`, when `value` differs from its scalar, or when a magnitude is not
V-band.

## Per type

### Deep-sky objects (141) — `scripts/refresh-messier-catalog.mjs` → `scripts/data-snapshots/messier-catalog.json` → `scripts/build-universe-deep-sky.ts`

- **Position / size / type**: OpenNGC (NED coordinates), record = SIMBAD page. The 12 hand-entered
  objects resolve through SIMBAD `basic` by identifier and take SIMBAD's coordinates.
- **Magnitude**: single V band, never `V-Mag || B-Mag`. Globular clusters: Harris 1996 (2010
  edition) `V_t` (OpenNGC's value is wrong for some, M10 is 4.98 against Harris 6.60). Others:
  OpenNGC `V-Mag`, else SIMBAD `flux` V (bibcode when it has one), else null.
- **Distance**: globular clusters Baumgardt & Vasiliev 2021 (`2021MNRAS.505.5957B`; Harris `R_sun`
  in the note). Open clusters and cluster-nebulae: Hunt & Reffert 2023 `dist50`
  (`J/A+A/673/A114/clusters`, `2023A&A...673A.114H`), Cantat-Gaudin 2020 (`J/A+A/640/A1/table1`
  `DistPc`, `2020A&A...640A...1C`) as the note / fallback. Galaxies: Cosmicflows-4 table2
  (`J/ApJ/944/94`, `2023ApJ...944...94T`, distance modulus `DM`) matched by cone on the OpenNGC
  position (nearest, within 30 arcsec), record also linked to NED. Other types (planetary nebula,
  remnant, nebula, cluster of galaxies, star): SIMBAD `mesdistance`, rule: newest bibcode among the
  parallax-method rows, else newest row; the other rows are summarised in the note.
- Where none answers the object keeps the gallery's editorial distance with no `catalogue` entry
  and the panel shows no catalogue link for it.
- **Name / category corrections** (deep-text reviews): m11 Wild Duck Cluster, m17 Omega Nebula, m76
  Little Dumbbell Nebula, gum-29 star-cluster; `Se1` / `Se2` constellation codes map to Ser.
  Categories the enum lacks (star-cloud, asterism, reflection-nebula, open-cluster) are not added:
  the enum drives colour and label tables in the scene, so that stays a separate decision.

### Black holes (4) — new `scripts/refresh-black-hole-catalogue.mjs` → `static/data/universe/black-holes.json`

There is no builder today: the file is hand-authored. The script holds the paper values and checks
each distance against SIMBAD `mesdistance` (the paper's bibcode must be in the list, the value
within 2 per cent), then rewrites the file.

- Sagittarius A*: mass and distance GRAVITY Collaboration 2022 (`2022A&A...657L..12G`), image EHT 2022.
- M87*: mass and distance EHT Collaboration 2019 paper VI (`2019ApJ...875L...6E`); the alternative
  Kormendy & Ho 2013 (`2013ARA&A..51..511K`) mass and the Cosmicflows-4 distance in the note.
- Cygnus X-1: mass and distance Miller-Jones et al. 2021 (`2021Sci...371.1046M`).
- Gargantua stays fiction: no `catalogue` entries. Spin stays unsourced and off the pages.
- Not on VizieR (probed `J/ARA+A/51/511`, `J/A+A/657/L12`, `J/ApJ/875/L6`: not found), so masses are
  entered from the papers and not machine-fetched.

### Local Group (`static/data/universe/local-group.json`, 33 members; `static/data/local-group-galaxies.json`, 15) — new `scripts/refresh-local-group-catalogue.mjs`

McConnachie 2012 (`J/AJ/144/4/catalog`, `2012AJ....144....4M`): `D` (kpc), `Vmag`. Members matched
by an explicit id → catalogue-name table (no fuzzy match). Members McConnachie does not list keep
their value with no `catalogue` entry. Schematic xyz layout is unchanged (it is not catalogue data).

### Stars — `scripts/build-named-stars.ts` (HYG values kept)

`catalogue.record` per star: SIMBAD page by HIP number; source "HYG Database v4.1 (Hipparcos,
Yale Bright Star and Gliese compilation)". Host stars: NASA Exoplanet Archive overview page.

## Licences / acknowledgements (go into `static/data/data-sources.json`, shown on /credits)

- SIMBAD / VizieR (CDS): "This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France" (Wenger et al. 2000, `2000A&AS..143....9W`) and "the VizieR catalogue access tool, CDS, Strasbourg, France" (Ochsenbein et al. 2000, `2000A&AS..143...23O`; DOI 10.26093/cds/vizier). CDS data: no licence fee, acknowledgement required.
- NED: "This research has made use of the NASA/IPAC Extragalactic Database (NED), which is operated by the Jet Propulsion Laboratory, California Institute of Technology, under contract with the National Aeronautics and Space Administration."
- NASA Exoplanet Archive: already registered; acknowledgement per its acknowledge page.
- Gaia (via the catalogues above): "This work has made use of data from the European Space Agency (ESA) mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC)." (Gaia archive terms; CC BY-SA 3.0 IGO.)
- Hunt & Reffert 2023, Cantat-Gaudin 2020, Cosmicflows-4, McConnachie 2012: VizieR tables, cited by bibcode; the papers' own terms, values only.
- Baumgardt & Vasiliev 2021: the database page asks to cite the paper (`2021MNRAS.505.5957B`).
- Harris 1996 (2010 edition): the file asks users to acknowledge the catalogue and cite Harris 1996, AJ 112, 1487; third parties may supply it free of charge only. Values only, source named.
- OpenNGC CC-BY-SA-4.0 already registered. EHT / GRAVITY entries exist and are extended with the bibcodes.

`data-sources.schema.json` gains an optional `acknowledgement` string and `bibcodes` list per
entry; /credits shows them under the entry.

## Scripts that change

| Script | Change |
|---|---|
| `scripts/refresh-messier-catalog.mjs` | fetch Harris, Baumgardt, H&R, CG20, CF4, SIMBAD, NED; V-only magnitudes; write `catalogue` per object into the snapshot |
| `scripts/build-universe-deep-sky.ts` | read snapshot `catalogue`; dist from catalogue, gallery distance as labelled fallback; names |
| `scripts/refresh-black-hole-catalogue.mjs` (new) | paper values, SIMBAD cross-check, rewrite `black-holes.json` |
| `scripts/refresh-local-group-catalogue.mjs` (new) | McConnachie distances into both Local Group files |
| `scripts/build-named-stars.ts` | add record links only |
| `scripts/lib/catalogue-sources.mjs` (new) | URL builders, ASU / TAP parsers, picks, unit conversions; unit-tested |
| `scripts/validate-data.ts` + schemas | the checks above |

## Presentation

- DeepSkyPanel: next to Distance (and a Magnitude cell where present) the catalogue name as a link
  to the record; a "Data sources" line listing the catalogues.
- BlackHolePanel: catalogue name + bibcode link by mass and distance.
- Entity pages `/explore/stars/<id>`, `/explore/black-holes/<id>`: each row with a catalogue value
  carries the source name linked to the record; a "Data sources" section lists the catalogues with
  their papers (ADS links by bibcode) and the SIMBAD / NED / archive object links.
- New labels in all 14 `messages/*.json` by hand, glossary-first; compiled with the repo scripts.
- /credits: data-sources entries (English registry, as for the existing ones).

## Out of scope / open

- Hunt & Reffert / CF4 per-row VizieR URLs use the canonical CDS host and could not be opened from
  here (CDS 404s); the identical query was verified on the CfA mirror.
- Deep-sky pages themselves (batch 4 onward) are a later slice; this one adds the data and the
  panel.
