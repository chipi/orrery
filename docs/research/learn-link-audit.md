# LEARN-link audit (May 2026)

Inventory of every external link reachable from a detail-panel **LEARN** tab in the
production app. The audit is the planning baseline for ADR-051 and the v0.5.0
LEARN-link stewardship rollout (epic [#51](https://github.com/chipi/orrery/issues/51)).

## Methodology

A walker over every JSON file under `static/data/` (excluding `schemas/`,
`porkchop/`, and the i18n overlay tree) collects every value of:

- the structured `links: [{ l, u, t }]` arrays (per `src/types/mission.ts`,
  `src/types/iss-module.ts`, `src/types/earth-object.ts`,
  `src/types/surface-site.ts`, `src/types/sun.ts`, `src/types/planet.ts`,
  `src/types/rocket.ts`)
- the single-string `wiki` field on `static/data/small-bodies.json`

Result: **340 outbound link references** that dedupe down to **296 unique
`(entity_id, url)` pairs** in the canonical manifest at
`static/data/link-provenance.json`.

## Distribution by host

| Rank | Host | Count |
|---:|---|---:|
| 1 | en.wikipedia.org | 182 |
| 2 | science.nasa.gov | 40 |
| 3 | www.nasa.gov | 34 |
| 4 | www.esa.int | 12 |
| 5 | nssdc.gsfc.nasa.gov | 11 |
| 6 | www.spacex.com | 6 |
| 7 | www.isro.gov.in | 5 |
| 8 | www.science.org | 5 |
| 9 | www.nature.com | 4 |
| 10 | www.mbrsc.ae | 2 |
| 11 | www.sciencedirect.com | 2 |
| 12 | mars.nasa.gov | 2 |
| 13 | www.lroc.asu.edu | 2 |
| 14 | global.jaxa.jp | 2 |
| 15 | voyager.jpl.nasa.gov | 2 |
| 16 | humans-in-space.jaxa.jp | 2 |
| 17 | www.cosmos.esa.int | 2 |
| 18 | various single-link hosts (× 25 hosts) | 25 |

NASA-domain hosts together (`*.nasa.gov`, `*.gsfc.nasa.gov`,
`*.jpl.nasa.gov`, `lroc.asu.edu` and `chandra.harvard.edu` operated under
NASA contract) account for ~28 % of all outbound links. Wikipedia
(`en.wikipedia.org`) accounts for 54 %. Together: ~82 % of every outbound
LEARN link points back to NASA or Wikipedia.

## Distribution by data category

| Category | Links |
|---|---:|
| `static/data/missions/**` (32 missions × ~2.7) | 86 |
| `static/data/mars-sites.json` (15 surface sites) | 50 |
| `static/data/i18n/en-US/planets/*.json` (8 planets × 5) | 40 |
| `static/data/earth-objects.json` (17 satellites/observatories) | 40 |
| `static/data/moon-sites.json` (24 surface sites) | 38 |
| `static/data/iss-modules.json` (17 modules) | 34 |
| `static/data/rockets.json` (10 launch vehicles) | 22 |
| `static/data/iss-visitors.json` (7 visiting craft) | 17 |
| `static/data/small-bodies.json` (`wiki` field × 8) | 8 |
| `static/data/i18n/en-US/sun.json` | 5 |

Per-mission links are the largest contributor (86 links across 32 missions,
~2.7 per mission). Editorial enrichment in Milestone L-C focuses on
non-US missions, the ISS Russian-segment modules, and lunar / Martian
landing sites.

## Distribution by tier

ADR-051 uses three tiers (`intro` for first-impression links, `core` for
top-tier reference, `deep` for archival reading). The author-time `t`
field on every link entry maps directly to the tier; the distribution
across the 296 unique entries is approximately:

| Tier | Approximate share |
|---|---:|
| `intro` | ~ 50 % |
| `core` | ~ 35 % |
| `deep` | ~ 15 % |

ADR-051 uses this distribution to set the build-fail policy: `intro` and
`core` 4xx/5xx fail validation; `deep` soft-warns.

## Non-US agency footprint

The total share of outbound links going to non-US agency hosts today:

| Host | Count |
|---|---:|
| esa.int | 12 |
| isro.gov.in | 5 |
| mbrsc.ae | 2 |
| cosmos.esa.int | 2 |
| humans-in-space.jaxa.jp | 2 |
| global.jaxa.jp | 2 |
| roscosmos.ru | 1 |
| asc-csa.gc.ca | 1 |
| mmx.jaxa.jp | 1 |
| exploration.esa.int | 1 |
| seis-insight.eu | 1 |

**Total: 30 of 296 = ~10 %.**

`roscosmos.ru` appears once across the entire data set (on `iss-visitors.json:soyuz_ms`).
`cnsa.gov.cn` appears zero times despite Chang'e and Tianwen-1 being in the
mission library. JAXA's mission-specific microsites (`mmx.jaxa.jp`,
`global.jaxa.jp`) each appear once for the JAXA-led missions but the agency root
is missing for several other entities.

## Non-English footprint

Today, ~99 % of outbound links resolve to English-language pages. The
single Russian-language outlier is `roscosmos.ru` (1 link). Zero links
go to native-language pages on CNSA, JAXA-jp, ISRO-hi, or any other
non-English operator portal despite obvious primary sources existing
for non-US missions.

ADR-051 corrects this with the locale fallback chain (UI locale →
operator native → English → multi-lingual) and the editorial L-C
backfill.

## Per-mission gap list (Wikipedia-only or operator-portal-missing)

The missions below either have only Wikipedia as a source or are missing the
operating-agency portal. ADR-051 / Milestone L-C must add the agency portal as
the *first* `intro` link.

| Mission | Operator | Today | Gap |
|---|---|---|---|
| `change5` | CNSA | en.wikipedia.org × 1 | No CNSA portal, no native-language link |
| `change6` | CNSA | en.wikipedia.org × 1 | No CNSA portal, no native-language link |
| `chandrayaan3` | ISRO | en.wikipedia.org × 1 | No ISRO portal, no native-language link |
| `tianwen1` | CNSA | en.wikipedia.org × 2 | No CNSA portal, no native-language link |
| `change4` | CNSA | en.wikipedia.org × 2 | No CNSA portal |
| `chandrayaan1` | ISRO | en.wikipedia.org, science.org | No ISRO portal |
| `mangalyaan` | ISRO | en.wikipedia.org, isro.gov.in | Missing Hindi-language ISRO equivalent |
| `slim` | JAXA | en.wikipedia.org, global.jaxa.jp | Missing Japanese-language JAXA equivalent |
| `mars-express` | ESA | en.wikipedia.org, esa.int | OK; consider adding national-language ESA pages |
| `hope-probe` | UAESA | en.wikipedia.org, mbrsc.ae | OK |
| `mmx` | JAXA | en.wikipedia.org, mmx.jaxa.jp, sciencedirect | OK |
| `luna9` / `luna17` / `luna24` | Roscosmos / Soviet | Wikipedia + NASA NSSDC + publishers | No Roscosmos portal, no Russian-language link |
| `mars3` | Soviet / Roscosmos | Wikipedia + NASA NSSDC + nasa.gov | No Roscosmos portal |
| `starship-demo` / `starship-mars-crew` | SpaceX | spacex.com + Wikipedia | OK |

## Per-entity gap list (earth-objects)

| Entity | Operator | Today | Gap |
|---|---|---|---|
| `beidou` | CNSA | en.wikipedia.org × 1 | No CNSA portal, no `en.beidou.gov.cn` |
| `glonass` | Roscosmos | en.wikipedia.org × 1 | No `glonass-iac.ru` |
| `tiangong` | CNSA | Wikipedia × 2 | No CNSA portal |
| `chandrayaan1` (orbiter view) | ISRO | en.wikipedia.org × 1 | No ISRO portal |
| `change1` / `change2` | CNSA | en.wikipedia.org × 1 each | No CNSA portal |
| `clementine` | NASA / DoD | en.wikipedia.org × 1 | OK |
| `lunar-prospector` | NASA | en.wikipedia.org × 1 | OK; add NASA mission page |
| `smart-1` | ESA | en.wikipedia.org × 1 | Add `sci.esa.int/web/smart-1/` |
| `gaia` | ESA | en.wikipedia.org, cosmos.esa.int | OK |
| `xmm` | ESA | en.wikipedia.org, cosmos.esa.int | OK |
| `galileo` | ESA | en.wikipedia.org, esa.int | OK |
| `hubble` | NASA / ESA | Wikipedia, hubblesite.org, nasa.gov | Add `esahubble.org` |
| `jwst` | NASA / ESA / CSA | Wikipedia, webbtelescope.org, stsci.edu | OK; consider adding CSA + ESA pages |
| `iss` | NASA et al. | Wikipedia, spotthestation, nasa.gov | OK |
| `chandra` | NASA | Wikipedia, chandra.harvard.edu | OK |
| `lro` | NASA | Wikipedia, lroc.asu.edu | OK |
| `geo` | NOAA | Wikipedia, goes.noaa.gov | OK |
| `gps` | US Space Force | Wikipedia, gps.gov | OK |
| `luna10` | Roscosmos / Soviet | en.wikipedia.org × 1 | No Roscosmos portal |

## ISS module + visitor gap list

ISS Russian-segment modules link to `roscosmos.ru` only on `soyuz_ms` today.
Other Russian-segment modules and visitors miss the operator portal:

| Module | Operator | Today | Gap |
|---|---|---|---|
| `zarya` | Roscosmos | Wikipedia, nasa.gov | Add `roscosmos.ru` and Energia builder page |
| `zvezda` | Roscosmos | Wikipedia, nasa.gov | Add `roscosmos.ru` |
| `nauka` | Roscosmos | Wikipedia, nasa.gov | Add `roscosmos.ru` |
| `pirs` | Roscosmos | Wikipedia, nasa.gov | Add `roscosmos.ru` |
| `prichal` | Roscosmos | Wikipedia, nasa.gov | Add `roscosmos.ru` |
| `rassvet` | Roscosmos | Wikipedia, nasa.gov | Add `roscosmos.ru` |
| `progress_ms` | Roscosmos | Wikipedia, nasa.gov | Add `roscosmos.ru` |
| `columbus` | ESA | Wikipedia, esa.int | OK |
| `kibo` | JAXA | Wikipedia, humans-in-space.jaxa.jp | OK; consider adding Japanese-language equivalent |
| `htv_x` | JAXA | Wikipedia, humans-in-space.jaxa.jp | OK |
| `canadarm2` | CSA | Wikipedia, asc-csa.gc.ca | OK |
| `crew_dragon` | NASA / SpaceX | Wikipedia, nasa.gov, spacex.com | OK |
| `starliner` | NASA / Boeing | Wikipedia, nasa.gov, boeing.com | OK |

## Site-level gap list

Lunar and Mars surface sites are mission landings — they should reference the
operating agency's mission page even when the rover is decades old:

| Site category | Gap |
|---|---|
| `moon-sites/luna-*` | Most have only Wikipedia; add Roscosmos / Lavochkin builder pages where extant |
| `moon-sites/change-*` | Add CNSA portal links (zh + en) for each landing |
| `moon-sites/chandrayaan-3` | Add ISRO mission page (en + hi if available) |
| `moon-sites/slim` | Add JAXA SLIM page (en + ja) |
| `moon-sites/hakuto-r` | Add ispace mission page (en + ja) |
| `moon-sites/smart-1` | Add ESA SMART-1 page |
| `mars-sites/*` for non-NASA landers | Apply the same agency-first rule when expanding the catalogue |

## What ADR-051 must lock

The audit motivates the contract:

1. **Source diversity targets** — non-US entities must have their operating
   agency portal as the *first* `intro` link; no entity may link only to
   Wikipedia.
2. **Per-link metadata** — every link gets a TASL-equivalent provenance row
   (URL, label, source, language, kind, last-verified, fair-use rationale,
   replaced-with).
3. **Locale fallback chain** — UI locale → operator native language → English.
4. **Rendering rules** — `rel="noopener noreferrer external"`, `hreflang`,
   tracker-stripping, no AMP variants.
5. **Public disclosure** — the `/library` page lists every outbound link
   grouped by source, newest-verified first.
6. **Build-fail policy** — broken `intro` / `core` links fail
   `validate-data`; `deep` soft-warns.

ADR-051 is the lock; Milestones L-B / L-C / L-D / L-E carry it into code,
data, UI, and tooling.
