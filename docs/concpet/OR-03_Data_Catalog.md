# OR-03 · Orrery — Data Catalog
*April 2026 · v1.0 · Part of the Orrery Concept Package (OR-00 through OR-05)*

---

## Purpose

This document catalogs every data source, constant, schema, and API that Orrery uses. It is the primary reference for anyone adding a mission, correcting a number, or building on the codebase. Every value in the product traces back to something in this document.

---

## 1. Orbital mechanics

### 1.1 Physical constants

| Constant | Value | Source |
|---|---|---|
| Gravitational parameter (Sun) μ | 4π² AU³/yr² | Keplerian simplification; GM☉ = 1.327×10²⁰ m³/s² |
| AU to km | 149,597,870.7 km | IAU 2012 |
| AU to light-minutes | 8.3167 min | Derived from c = 299,792.458 km/s |
| AU/yr to km/s | 4.7404 km/s | Derived |
| Earth radius | 6,371 km | IAU |
| Moon radius | 1,737.4 km | IAU |
| Earth–Moon mean distance | 384,400 km | IAU |
| Earth–Sun mean distance | 1.000 AU (definition) | IAU |

### 1.2 Epoch

All orbital elements use the **J2000.0 epoch** (January 1.5, 2000, 12:00 TT = JD 2451545.0). Day offsets from J2000 are used throughout the mission trajectory computation.

### 1.3 Planetary orbital elements

Mean orbital radii and angular velocity used in Orrery's Keplerian model. These are mean values — Orrery does not model orbital eccentricity for planets in the explorer view, trading precision for visual clarity and performance. The mission configurator uses a Lambert solver for trajectory accuracy.

| Planet | Semi-major axis | Period | Mean angular velocity | J2000 mean longitude L₀ | Inclination to ecliptic |
|---|---|---|---|---|---|
| Mercury | 0.387 AU | 87.97 d | 2π / 87.97 d | Varies | 7.00° |
| Venus | 0.723 AU | 224.70 d | 2π / 224.70 d | Varies | 3.39° |
| Earth | 1.000 AU | 365.25 d | 2π / 365.25 d | 1.753 rad | 0.00° (reference) |
| Mars | 1.524 AU | 686.97 d | 2π / 686.97 d | 6.203 rad | 1.85° |
| Jupiter | 5.203 AU | 4332.59 d | 2π / 4332.59 d | — | 1.30° |
| Saturn | 9.537 AU | 10759.22 d | 2π / 10759.22 d | — | 2.49° |
| Uranus | 19.19 AU | 30688.50 d | 2π / 30688.50 d | — | 0.77° |
| Neptune | 30.07 AU | 60182.00 d | 2π / 60182.00 d | — | 1.77° |

**Source:** JPL Planetary Fact Sheets — https://nssdc.gsfc.nasa.gov/planetary/factsheet/

### 1.4 Mission orbital position computation

For the porkchop plot and mission arc, planetary positions are computed using:

```
angle(t) = L₀ + ω × t
x = r × cos(angle)
y = r × sin(angle) × cos(inclination)
z = r × sin(angle) × sin(inclination)
```

Where `t` is days from J2000, `ω` is angular velocity in rad/day, and `r` is the mean orbital radius in AU.

### 1.5 Lambert solver

The porkchop plot is computed using a bisection-based Lambert solver:

- **Method:** Lagrange-Gauss short-way formulation
- **Iterations:** 52 per cell (convergence to ≤10⁻⁸ tolerance)
- **Grid:** 140 × 80 = 11,200 trajectory solutions computed at startup
- **X axis:** Departure date (days from reference)
- **Y axis:** Time of flight (days)
- **Z / colour:** C3 launch energy (km²/s²), rendered as delta-v approximation
- **Reference:** Bate, Mueller & White, *Fundamentals of Astrodynamics* (1971), Chapter 5

### 1.6 Transfer orbit — Hohmann approximation

For the mission arc fly screen, spacecraft position is interpolated along a quadratic Bézier curve between Earth's departure position and Mars's arrival position. This is a visual approximation of the true Keplerian transfer ellipse, used for rendering only. Telemetry (velocity, distance) is computed from the vis-viva equation applied to the actual transfer orbit elements.

**Vis-viva:** `v = √(μ × (2/r − 1/a))`

Where:
- `μ` = 4π² AU³/yr² (solar gravitational parameter)
- `r` = current heliocentric distance (AU)
- `a` = semi-major axis of transfer orbit = (R_Earth + R_Mars) / 2 = 1.262 AU

### 1.7 Visual scale — solar system explorer

Planets are not shown at true scale — they would be invisible. The visual orbital radii used in the 2D and 3D explorer are:

| Body | True semi-major axis | Visual orbital radius (px) | Scale factor |
|---|---|---|---|
| Mercury | 0.387 AU | 52 px | — |
| Venus | 0.723 AU | 83 px | — |
| Earth | 1.000 AU | 113 px | Reference |
| Mars | 1.524 AU | 155 px | — |
| Asteroid belt | 2.2–3.2 AU | 192–237 px | — |
| Jupiter | 5.203 AU | 248 px | — |
| Saturn | 9.537 AU | 320 px | — |
| Uranus | 19.19 AU | 378 px | — |
| Neptune | 30.07 AU | 430 px | — |
| Kuiper Belt | 30–50 AU | 438–470 px | — |

The scale is manually compressed (not a pure power law) to keep all planets visible on a single screen while preserving relative ordering. The `auToPx()` function in OR-P01 implements a linear interpolation between these anchor points.

### 1.8 Visual scale — Earth orbit viewer

The Earth orbit viewer uses a logarithmic scale to accommodate the ISS-to-JWST range of 3,750×:

```
visual_r = EARTH_VIS_R + LOG_K × log₁₀(1 + alt_km / 100)
```

Where `EARTH_VIS_R = 38 px` (visual Earth radius) and `LOG_K = 54 px` (scale factor per decade of altitude). This maps ISS (408 km) to ~70 px and JWST (1,500,000 km) to ~244 px.

---

## 2. Mission data schema

Every mission in Orrery is defined by a JavaScript object conforming to this schema. This schema covers both Mars and Moon missions.

### 2.1 Required fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier, kebab-case. e.g. `"curiosity"`, `"apollo11m"` |
| `name` | string | Display name. e.g. `"Curiosity"`, `"Apollo 11"` |
| `agency` | string | Primary agency key. Must match `LOGOS` dict. e.g. `"NASA"`, `"CNSA"` |
| `agency_full` | string | Full display name. e.g. `"NASA / JPL"` |
| `sector` | string | `"gov"`, `"private"`, or `"mine"` |
| `dest` | string | `"MARS"` or `"MOON"` |
| `color` | string | Hex colour for agency. e.g. `"#0B3D91"` |
| `year` | number or string | Launch year. Use string for ranges: `"2026–28"` |
| `type` | string | Mission type description. e.g. `"ROVER · ACTIVE"` |
| `status` | string | `"FLOWN"`, `"ACTIVE"`, `"PLANNED"`, or `"MINE"` |
| `dep` | string | Departure date, human-readable. e.g. `"Nov 26, 2011"` |
| `arr` | string | Arrival date, human-readable. e.g. `"Aug 6, 2012"` |
| `tof` | number or null | Transit time in days. `null` for TBD planned missions |
| `vehicle` | string | Launch vehicle name |
| `description` | string | Editorial description, 2–4 sentences, Crimson Pro italic in UI |
| `data_quality` | string | `"good"`, `"partial"`, `"reconstructed"`, or `"planned"` |
| `credit` | string | Full image/data credit line |
| `links` | array | Array of `{l, u, t}` educational link objects (see 2.3) |
| `missionable` | boolean | `true` only for Mars — shows "Plan a mission" CTA |

### 2.2 Optional fields

| Field | Type | Description |
|---|---|---|
| `j2000` | number or null | Days from J2000 epoch at departure. Used for trajectory preview drawing. `null` for Moon missions and TBD planned missions |
| `collabs` | array | Array of collaborating agency keys. e.g. `["ESA", "CNES"]` |
| `first` | string | The mission's "first" — shown as a coloured badge in the card |
| `payload` | string | Payload mass description. e.g. `"899 kg"` |
| `dv` | string | Delta-v figure. e.g. `"~6.1 km/s"` |
| `data_note` | string | Explanation for non-"good" data quality. Shown as a left-border note in the panel |
| `gallery_query` | string | Search query string for NASA Images API. NASA missions only |
| `gallery_imgs` | array | Array of direct image URLs. For non-NASA missions. See section 4 |

### 2.3 Educational link object

```javascript
{ l: "Link label", u: "https://...", t: "intro" }
```

`t` (tier) must be one of:
- `"intro"` — Wikipedia, NASA fact pages, agency overview pages
- `"core"` — MIT OCW, detailed technical pages, mission science overviews
- `"deep"` — Peer-reviewed papers, JPL technical reports, primary sources

---

## 3. Data quality system

Every mission carries a `data_quality` field that is displayed honestly in the UI.

| Value | Badge | Meaning |
|---|---|---|
| `"good"` | *(none)* | Primary sources available. Orbital elements from published data. Images from official agency archives |
| `"partial"` | ⚠ PARTIAL DATA | Some data gaps. Orbital elements good; imagery sparse or selectively released. Must be explained in `data_note` |
| `"reconstructed"` | ◈ RECONSTRUCTED | Orbital elements computed from published launch parameters. No primary science data available. Surface imagery absent or unusable. Must be explained in `data_note` |
| `"planned"` | ◌ PLANNED | Mission not yet flown. Parameters from published mission design documents |

### Known reconstructed missions

| Mission | What is reconstructed | Source used |
|---|---|---|
| Mars 3 | Orbital elements computed from Proton-K launch date and published trajectory parameters | Siddiqi, *Beyond Earth* (NASA SP-4251, 2018) |
| Soviet Luna missions (pre-1970) | Partial orbital elements | Siddiqi, op. cit. |

### Known partial-data missions

| Mission | What is partial | Note |
|---|---|---|
| Mangalyaan | Imagery selectively released; telemetry reconstructed | Mission lost contact April 2022 |
| Tianwen-1 / Zhurong | Selected data via CNSA official channels only | Zhurong status uncertain as of 2023 |

---

## 4. Image sources

### 4.1 NASA Image and Video Library

**API:** `https://images-api.nasa.gov/search`

**Parameters:**
```
q=[search query]
media_type=image
page_size=9
```

**License:** U.S. Government works — not subject to copyright in the United States. Free for educational use. Must credit NASA and the relevant centre (JPL, GSFC, JSC, etc.).

**Credit format:** `© NASA/JPL-Caltech — U.S. Government work · Public domain`

**Used for:** All NASA mission gallery panels. Query strings are defined per mission in `gallery_query` field.

**Rate limiting:** No authentication required for basic search. No formal rate limit documented; use conservatively.

### 4.2 ESA Multimedia Archive

**URL:** `https://www.esa.int/ESA_Multimedia/`

**License:** CC BY-SA 3.0 IGO. May be used freely with attribution and share-alike. The IGO (Intergovernmental Organisation) variant is specifically designed for use by Wikipedia and similar projects.

**Credit format:** `© ESA — CC BY-SA 3.0 IGO — esa.int`

**Mars Express images:** 1,430+ images available. HRSC stereo camera images released under CC BY-SA IGO.

**Used for:** Mars Express gallery. ESA mission panels.

**Reference:** https://www.esa.int/About_Us/Digital_Agenda/Open_Access_and_Creative_Commons

### 4.3 ISRO

**URL:** `https://www.isro.gov.in`

**License:** Available for educational and informational use. No explicit CC license. Do not use for commercial purposes.

**Credit format:** `© ISRO — Educational use — isro.gov.in`

**Mangalyaan (MOM) images:** Mars Colour Camera (MCC) images released publicly. Mars Atlas (2015, 120 pages) available as PDF.

**Chandrayaan-3:** Post-landing images released publicly.

**Used for:** Mangalyaan and Chandrayaan gallery panels.

### 4.4 CNSA

**URL:** `https://www.cnsa.gov.cn`

**License:** Official releases. No explicit CC license. Use with attribution for educational context.

**Credit format:** `© CNSA/CLEP — Official release — cnsa.gov.cn`

**Tianwen-1 / Zhurong:** Selected images released through CNSA and CLEP (China Lunar Exploration Program). Some available via Wikimedia Commons.

**Chang'e missions:** Official surface imagery released post-landing.

**Used for:** CNSA mission gallery panels.

### 4.5 Wikimedia Commons — curated static images

For missions where a live API fetch is not available, gallery images are served from Wikimedia Commons via direct URL. These are stable thumbnail URLs following the pattern:

```
https://upload.wikimedia.org/wikipedia/commons/thumb/[a]/[ab]/[filename]/[width]px-[filename]
```

All Wikimedia Commons images carry their own license per file. Before adding an image, verify:
1. The image page license tag (must be compatible with educational use)
2. The original source (prefer agency-released over third-party photographs)
3. The attribution requirements

**Research task (OR-03 phase):** Curate and verify 3–5 Wikimedia Commons URLs per non-NASA mission for the gallery panels. Document source, license, and attribution per image.

### 4.6 Soviet/Russian archive — special case

Soviet-era imagery (Luna programme, Lunokhod) is patchy. Known accessible sources:

| Source | Content | Notes |
|---|---|---|
| Roscosmos press archive | Modern releases only | Limited Soviet-era content |
| TASS photo archive | Historical mission team photos | May require licensing for some uses |
| Wikimedia Commons — Soviet space | Community-uploaded, varies by file | Check each image individually |
| Siddiqi, *Beyond Earth* (NASA SP-4251) | Comprehensive mission reference | Public domain NASA publication |

**Strategy for sparse missions:** For missions where no usable imagery exists (e.g. Mars 3 surface transmission), the gallery panel shows an honest placeholder with a link to the best available secondary source, and the `data_quality` badge accurately reflects this.

---

## 5. Agency logos

All agency logos are used under **nominative use** — for identification and attribution purposes only, in a non-commercial educational context. Orrery does not claim endorsement by any agency.

| Agency | Wikimedia Commons URL | Background colour | License status |
|---|---|---|---|
| NASA | `https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/200px-NASA_logo.svg.png` | #0B3D91 | Trademark — nominative use |
| ESA | `https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/ESA_logo_simple.svg/200px-ESA_logo_simple.svg.png` | #1C3C8A | CC BY-SA 3.0 IGO |
| CNSA | `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/CNSA_logo.svg/200px-CNSA_logo.svg.png` | #DE2910 | Trademark — nominative use |
| ISRO | `https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Indian_Space_Research_Organisation_Logo.svg/200px-Indian_Space_Research_Organisation_Logo.svg.png` | #1a1a2e | Trademark — nominative use |
| Roscosmos | `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Roscosmos_logo_en.svg/200px-Roscosmos_logo_en.svg.png` | #0d0d1a | Trademark — nominative use |
| UAE/MBRSC | `https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Mohammed_Bin_Rashid_Space_Centre_Logo.png/200px-Mohammed_Bin_Rashid_Space_Centre_Logo.png` | #ffffff | Trademark — nominative use |
| JAXA | `https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/JAXA_logo_2020.svg/200px-JAXA_logo_2020.svg.png` | #0062AC | Trademark — nominative use |
| SpaceX | `https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/SpaceX-Logo.svg/200px-SpaceX-Logo.svg.png` | #000000 | Trademark — nominative use |

**Implementation:** The `logoHTML()` function renders the real logo image on top of an always-visible text abbreviation fallback. If the image fails to load (offline use, URL change), the fallback renders correctly. In production, logos should be hosted locally from official media kits.

**Trademark notices:** Every panel footer includes: *"Logos are trademarks of their respective agencies · used for educational identification only."*

---

## 6. Orbital data for small solar system bodies

### 6.1 Asteroid belt notable objects

| Body | Semi-major axis | Period | Inclination | Source |
|---|---|---|---|---|
| Ceres | 2.769 AU | 4.61 yr | 10.59° | JPL Small-Body Database |
| Vesta | 2.361 AU | 3.63 yr | 7.14° | JPL Small-Body Database |

**JPL Small-Body Database:** `https://ssd.jpl.nasa.gov/sbdb.cgi`

### 6.2 Kuiper Belt objects

| Body | Semi-major axis | Period | Inclination | Note |
|---|---|---|---|---|
| Pluto | 39.48 AU | 248.0 yr | 17.14° | IAU dwarf planet |
| Eris | 67.86 AU (mean) | 559 yr | 44.04° | Scattered disc object |
| Makemake | 45.79 AU | 309.9 yr | 28.96° | Classical KBO |
| Haumea | 43.13 AU | 284.1 yr | 28.19° | Classical KBO |

### 6.3 Notable comets

| Body | Perihelion q | Aphelion Q | Period | Inclination | Note |
|---|---|---|---|---|---|
| Halley's Comet | 0.586 AU | 35.1 AU | 75.3 yr | 162.3° | Retrograde orbit |
| 67P/C-G | 1.21 AU | 5.68 AU | 6.44 yr | 7.04° | Rosetta mission target |
| ʻOumuamua | 0.255 AU | — | — | 122.7° | Hyperbolic — interstellar |

**Source:** JPL Horizons — `https://ssd.jpl.nasa.gov/horizons/`

---

## 7. Earth orbit data

### 7.1 Orbital objects in OR-P05

All data from publicly available sources. Altitudes are mean values; actual orbits vary.

| Object | Regime | Altitude | Period | Inclination | Agency | Source |
|---|---|---|---|---|---|---|
| ISS | LEO | 408 km | 92.9 min | 51.6° | Multi-agency | NASA |
| Tiangong | LEO | 389 km | 91.5 min | 41.5° | CNSA | CNSA |
| Hubble | LEO | 547 km | 95.4 min | 28.5° | NASA/ESA | NASA |
| GPS constellation | MEO | 20,200 km | 717.9 min | 55.0° | USAF | GPS.gov |
| Galileo constellation | MEO | 23,222 km | 844.8 min | 56.0° | EU/ESA | ESA |
| GLONASS | MEO | 19,100 km | 675.7 min | 64.8° | Roscosmos | Roscosmos |
| BeiDou (MEO) | MEO | 21,528 km | 760 min | 55.0° | CNSA | CNSA |
| GOES (GEO) | GEO | 35,786 km | 1436 min | 0.0° | NOAA/NASA | NOAA |
| Chandra | HEO | 9,942–133,000 km | 3808 min | 76.7° | NASA | CXC |
| XMM-Newton | HEO | 7,365–113,946 km | 3168 min | 40.0° | ESA | ESA |
| LRO | Lunar orbit | 50 km (Moon) | 118 min | 90.0° | NASA | NASA |
| JWST | L2 | 1,500,000 km | — | — | NASA/ESA/CSA | NASA |
| Gaia | L2 | 1,500,000 km | — | — | ESA | ESA |

---

## 8. Mission trajectory data for the library panel

For the 2D trajectory preview in the mission library, trajectories are drawn using each mission's J2000 departure day and transit time. Planetary positions are computed at departure and arrival using the formulas in section 1.4.

Moon missions use a separate Earth-Moon diagram (not solar-system scale). The `dest` field controls which renderer is used.

### 8.1 Mars mission J2000 day offsets

| Mission | J2000 departure | Computed from |
|---|---|---|
| Mariner 4 | −12,820 | Nov 28, 1964 |
| Mars 3 | −10,445 | May 28, 1971 |
| Viking 1 | −8,899 | Aug 20, 1975 |
| Mars Pathfinder | −1,123 | Dec 4, 1996 |
| Mars Express | 1,248 | Jun 2, 2003 |
| Curiosity | 4,347 | Nov 26, 2011 |
| MAVEN | 4,969 | Nov 18, 2013 |
| Mangalyaan | 4,962 | Nov 5, 2013 |
| InSight | 6,699 | May 5, 2018 |
| Hope Probe | 7,500 | Jul 19, 2020 |
| Tianwen-1 | 7,508 | Jul 23, 2020 |
| Perseverance | 7,511 | Jul 30, 2020 |

---

## 9. Educational link system

Orrery uses a three-tier educational link system, colour-coded consistently across all screens:

| Tier | Colour | Purpose | Examples |
|---|---|---|---|
| **INTRO** | Teal `#4ecdc4` | Wikipedia, NASA fact pages, agency mission pages | Wikipedia articles, nasa.gov/mission/ |
| **CORE** | Blue `#7b9cff` | Technical explainers, MIT OCW, deeper mission science | MIT OpenCourseWare, JPL education pages |
| **DEEP** | Red `#ff9090` | Peer-reviewed papers, JPL technical reports, primary sources | Science, Nature, AJ, NTRS |

### Key curated links (reused across screens)

| Link | Tier | URL |
|---|---|---|
| Hohmann transfer orbit | INTRO | https://en.wikipedia.org/wiki/Hohmann_transfer_orbit |
| Tsiolkovsky rocket equation | INTRO | https://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation |
| Porkchop plot | CORE | https://en.wikipedia.org/wiki/Porkchop_plot |
| JPL launch windows lesson | CORE | https://www.jpl.nasa.gov/edu/resources/lesson-plan/lets-go-to-mars-calculating-launch-windows/ |
| NASA Glenn rocket equation | CORE | https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/ |
| Lagrange point | CORE | https://en.wikipedia.org/wiki/Lagrange_point |
| Lunar water ice (Science 2018) | DEEP | https://www.science.org/doi/10.1126/science.aap8637 |
| Batygin & Brown — Planet Nine (AJ 2016) | DEEP | https://iopscience.iop.org/article/10.3847/0004-6256/151/2/22 |

---

## 10. One-off research plan for sparse missions

The following missions require dedicated research sessions to fill gaps before OR-02 (formal project concept) is finalised. Each session produces: curated image URLs, verified orbital data, and updated `data_note` text.

| Mission | Gap | Research approach | Priority |
|---|---|---|---|
| Mars 3 | No usable surface imagery; team photos only | Wikimedia Commons excavation; TASS historical archive; Siddiqi NASA SP-4251 | HIGH |
| Luna programme (1966–1976) | Variable data quality across 24 missions | Siddiqi; Soviet Space Encyclopaedia; Wikimedia Commons | MEDIUM |
| Mangalyaan | Full imagery catalogue not publicly indexed | ISRO image gallery manual curation; Indian news archives | MEDIUM |
| Chang'e 4 / Zhurong | Current status uncertain 2023+ | CNSA official announcements; CLEP press releases | MEDIUM |
| Soviet Lunokhod missions | Routes and images partially documented | LROC spotting images (NASA); Wikimedia Commons | LOW |
| Beresheet (Israel, 2019) | Crashed — limited official imagery | SpaceIL press archive; Wikimedia Commons | LOW |

---

## 11. Credit format reference

Every image, logo, and data source in Orrery uses one of the following credit formats:

**NASA imagery:**
`© NASA/[Centre] — U.S. Government work · Public domain`

**ESA imagery:**
`© ESA — CC BY-SA 3.0 IGO — esa.int`

**ISRO imagery:**
`© ISRO — Educational use — isro.gov.in`

**CNSA imagery:**
`© CNSA/CLEP — Official release — cnsa.gov.cn`

**Roscosmos / Soviet:**
`© Roscosmos / Soviet Space Program — Historical archive`

**JAXA imagery:**
`© JAXA — jaxa.jp`

**Wikimedia Commons image:**
`[Author], [License], via Wikimedia Commons`

**Agency logos (all):**
`[Agency] logo is a trademark of [Agency] · Used for educational identification only`

---

*Orrery · OR-03 Data Catalog · April 2026 · Living document*
*Next: OR-04 Technical Architecture →*
