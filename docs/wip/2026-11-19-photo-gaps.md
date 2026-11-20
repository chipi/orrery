# Photo gaps in the universe INDEXes (2026-11-19)

The rows that still show a plain dot instead of a photo, after search-backlog rows S5 and S6 were
closed (operator 2026-11-19: ship 8, document the rest for a later release). Every row below was
searched at least once; what was tried is listed so a later pass starts from here, not from zero.

Sources searched for each (2026-11-15 L46 pass and the 2026-11-19 S5/S6 pass): Wikimedia Commons
(API, licence read from each file page), esahubble.org, eso.org, noirlab.edu, the NASA Images API,
the Chandra album, ESA/Gaia pages, Legacy Surveys cutouts. Candidates and their records:
`static/images/_staging/l46b/` (gitignored) and the L46 table in
[`2026-11-15-L46-candidates.md`](2026-11-15-L46-candidates.md).

Shipped on 2026-11-19: m18, m36, m62, leo-ii, and, as "pictured" member photos,
horologium-reticulum (Abell 3266), virgo-ii-groups (NGC 4753), ophiuchus-supercluster (the Ophiuchus
Cluster, Chandra composite) and fornax-eridanus (the Fornax Cluster).

## 1. Only survey maps exist (keep the dot)

Real data, free licence (Richard Powell's *An Atlas of the Universe*, CC BY-SA 2.5), but diagrams
with English labels (one Boötes Void map Turkish) that read as noise at thumbnail size.

| Row | Scale | Map staged |
|---|---|---|
| local-group | Local Group | `Localgrpgalax.gif` |
| virgo-supercluster | Virgo / Laniakea | `Virgosupercluster_atlasoftheuniverse.gif`, `Fornax_Wall.gif` |
| pavo-indus | Laniakea | `Pavind.gif` |
| ursa-major-cloud | Virgo | `Ursa_major_cluster_maps.gif` |
| hydra-centaurus | Laniakea | `Hya.gif`, `Hyamap.gif` |
| bootes-void | Cosmic Web | `Boovoid2-tr.gif` (CC BY 2.5), `Boovoid.png` |

A later option: render the structure from Orrery's own 3D scene data (no licence, labels in the
reader's language).

## 2. Real photos, too faint to read (keep the dot)

The operator dropped these as too weak in L46 (2026-11-15); the 2026-11-19 pass found nothing better.
Dwarf spheroidals look like this in every image.

| Row | Best candidate | Licence |
|---|---|---|
| sextans-dwarf | Donatiello "LG Sextans I" (has a text label burnt in) | CC0 |
| m25 | `M025.jpg` (Starhopper), a sparse clump | CC BY-SA 4.0 |
| m67 | NOIRLab, faint and sparse | CC BY 4.0 |
| draco-dwarf | NASA/ESA opo2417a, frame seam | CC BY 4.0 |
| carina-dwarf | ESO potw1126a (the L46 pick again) | CC BY 4.0 |
| tucana-dwarf, cetus-dwarf | Legacy Surveys cutouts, faint smudges | CC BY 4.0 |
| great-attractor | ESO eso9954c, a field towards it, not the object | CC BY 4.0 |
| ursa-minor-dwarf | the L46 Donatiello image; no better Commons hit | CC0 |

## 3. No photograph can exist (keep the dot)

A spiral arm cannot be photographed from inside the Galaxy, nor a supercluster or wall as one object.
Only artist's concepts exist (the operator's rule: an artist's impression is not a photo).

| Row | Note |
|---|---|
| perseus, scutum-centaurus, sagittarius, norma, orion-spur (Milky Way arms) | Gaia "artist's impression based on Gaia data" and PIA19341 (WISE points over an artist's illustration): rejected |
| laniakea | Commons renderings are flow maps; not checked for being data-based |
| sloan-great-wall | the staged `sloan-great-wall-sdss.jpg` has no establishable source |
| canes-venatici-spur | no image and no verified member found |
| sagittarius-dsph | not searched on 2026-11-19 (time-box); the L46 stand-in M54 stays dropped |

A later option with no new images: a photo Orrery already ships of a well-known member, captioned
"pictured: …" (the Tarantula-for-LMC precedent): Orion Spur — M42; Sagittarius arm — M8;
Perseus arm — the Double Cluster; Canes Venatici Spur — M94 or M106; Laniakea — the Centaurus
Cluster. Each needs a check that the member belongs to the structure.

## Also out of scope here

- The three faint exoplanet hosts (TRAPPIST-1, TOI-700, Kepler-16): artist's impressions only.
- Files in the staging folder that must not be used: `s5/sloan-great-wall-sdss.jpg`,
  `s5/bootes-void-gal.jpg`, `s6/m25-a.jpg` (no establishable source), and the four `arms/` files
  (artist's concepts).
