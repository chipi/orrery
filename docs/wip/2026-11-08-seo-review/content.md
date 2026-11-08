# Orrery content / keyword SEO review

Scope: read-only. Sources: prerendered pages in `build/` (4,417 HTML files, 3,892 sitemap URLs), English content in `i18n-src/en-US/**`, templates in `src/routes/**`. Date: 2026-11-08. WebSearch used: 22 of 30.

Proposed strings are written as `T: ...` (title, limit 60) and `D: ...` (description, limit 155). All proposed strings were length-checked with a script (176 strings, none over limit after fixes; the four multi-string lines were checked individually). The site appends " · Orrery" (and often " · Science" / " · The Long View") to every title in the templates, so the proposed titles below assume the suffix is shortened or dropped on those templates (see "Template findings"); with the current suffix a 50-char title becomes 70+ chars and gets truncated in results.

## 0. Findings that outrank any single title

1. **No indexable page exists for any of the 475 mission / fleet / site entries.** `/missions`, `/fleet`, `/moon`, `/mars` prerender as shells ("Loading fleet...", 46-49 words). The per-entry pages `/c/mission/apollo11`, `/c/fleet/saturn-v` etc. (523 files) carry `<meta name="robots" content="noindex">`, 37 words of body, and are not in the sitemap. The data behind them is rich: `i18n-src/en-US/missions/mars/curiosity.json` has a 95-word `dispatch` and a 75-word `description`; `fleet/launcher/saturn-v.json` has both. Counts: 126 missions, 294 fleet entries, 28 Moon sites, 27 Mars sites. So "Saturn V", "Curiosity rover", "Falcon 9", "Hubble", "Apollo 11 landing site", "Gale crater", "Ingenuity" have no landing page at all. Biggest single opportunity.
2. **Essay titles are literary phrases.** 13 of 13 essay `<title>`s are poetic ("The Wall", "Keep the Rocket"); the keywords live only in the description (and the descriptions run 190-330 chars, so Google cuts them at about 155).
3. **Every interactive tool has no meta description and a non-searchable title**: `/plan` "Mission Configurator", `/lab` "Physics Lab", `/fly` "Orrery", `/explore` "Orrery", `/venus` "Orrery", `/moon` "Moon Map", `/mars` "Mars Map", `/iss` "ISS Explorer", `/live`, `/catalog`, `/learn`, `/worlds`, `/earth`, `/tiangong`. 281 of 393 root-level HTML files have no description. The 14 `/science/<section>` index pages are titled "ORBITS · Science · Orrery" with no description.
4. **The staging host is indexed and outranks the real site for "porkchop plot calculator".** The WebSearch result list for that query includes `https://chipi.github.io/orrery/science/porkchop/what-is-a-porkchop` (not `www.orrerylearn.com`). `validate-staging.yml` uses `https://chipi.github.io/orrery` as `STAGING_URL`, and the README links to it as the "live" site. Two hosts serving the same content split ranking; the github.io copy should be `noindex` or redirect to www.
5. **No `og:title`, `og:description`, `og:image`, `twitter:*` and no JSON-LD on any page** (`grep ld+json build` = 0 files; `og:` on essay page = only `og:locale` x14). Not a keyword problem but it weakens click-through and rich results (Article, SoftwareApplication, FAQ).
6. **Raw markdown leaks into a meta description**: `essays/new-propulsion.html` description contains `[solar sail](/science/propulsion/solar-sail)s` and `[nuclear-thermal](...)`.
7. **Symbol-only titles**: `∆v as Mission Budget`, `∆v Heatmap`, `V∞`. People type "delta-v", not "∆v"; the symbol does not match.

## 1. Page-by-page review

Rating rule. GOOD: head term is in title and description. WEAK: head term in the page but missing from title or description, or title is a bare/ambiguous word. POOR: title is a clever phrase with no searchable words, or the page does not exist. Queries are my judgement of what a person types; volume was not measured (no keyword-volume tool was available). "p1" is the first paragraph on the page.

### 1a. Essays (13), ranked by opportunity

| # | Essay (slug) | Queries a person types | Current title / check | Rating | Proposed |
|---|---|---|---|---|---|
| 1 | delta-v | "what is delta-v", "delta-v explained", "delta-v budget" | "The Grammar of Delta-V". Slug yes, title has "Delta-V", description starts "Every spacecraft...budget" (no "delta-v" until the title), p1 "chequebook" metaphor | WEAK | T: What Is Delta-v? The Budget Behind Every Space Mission / D: Delta-v is the velocity budget every spacecraft spends. How the rocket equation sets it, why gravity is the only refill, and how to read a budget. |
| 2 | seven-minutes | "seven minutes of terror", "how do rovers land on Mars", "entry descent landing" | "The Seven Minutes". "terror" and "Mars" absent from title and description; essay text contains "terror" | WEAK | T: Seven Minutes of Terror: How Rovers Land on Mars / D: Cruise is easy, arrival is where missions die. Why Mars entry, descent and landing is the hardest part of spaceflight, from Viking to Perseverance. |
| 3 | going-to-mars | "how to get to Mars", "why is going to Mars so hard", "Mars mission challenges" | "The Wall". Description has Mars, time, mass, body; title nothing | POOR | T: Why Going to Mars Is So Hard: Time, Mass and the Body / D: Mars breaks every human mission plan on the same three things: travel time, mass and the human body. Why departure dates keep slipping. |
| 4 | comms | "deep space network", "how do spacecraft communicate with Earth", "how does NASA talk to Voyager" | "Running the Solar System on a Whisper". DSN absent from title and description (only in body) | POOR | T: How Spacecraft Talk to Earth: The Deep Space Network / D: Three Deep Space Network dish complexes carry every link beyond the Moon. How a 22-watt signal holds the whole solar system together. |
| 5 | reusable-launchers | "reusable rockets how they work", "Falcon 9 reusable booster", "SpaceX landing rocket" | "Keep the Rocket". Slug has reusable; title/description do not name "reusable", "Falcon 9" or "SpaceX" | POOR | T: Reusable Rockets: How Falcon 9 Changed Spaceflight / D: For sixty years rockets flew once and fell into the sea. How reusable boosters like Falcon 9 cut the cost of launch, the biggest shift since Apollo. |
| 6 | going-to-the-moon | "why go back to the Moon", "Artemis program why", "return to the Moon" | "The Practice Ground". Description: Moon yes, Artemis no | POOR | T: Why Go Back to the Moon? Artemis and Lunar Return / D: We went once, stopped for fifty years and lost the know-how. Why Artemis and its rivals are returning to the Moon, and what is different this time. |
| 7 | interstellar-exploration | "interstellar travel", "how long to reach the nearest star", "Alpha Centauri travel time" | "The Honest Arithmetic". "nearest star" in description, no "interstellar" | POOR | T: Interstellar Travel: The Math of Reaching Another Star / D: The nearest star is a different kind of far. The honest numbers on speed, energy and time for interstellar travel, and why proposals look doomed. |
| 8 | the-body-in-the-dark | "effects of spaceflight on the human body", "radiation Mars astronauts", "bone loss in space" | "The Body in the Dark". Description says "human body" only | POOR | T: What Space Does to the Human Body on Long Missions / D: Radiation, bone and muscle loss, isolation: why the human body, not the engine, is the hardest problem on a trip to Mars. |
| 9 | navigation | "how do spacecraft navigate", "deep space navigation" | "Finding Mars in the Dark". "navigate" absent; "steer" in description | POOR | T: How Spacecraft Navigate Deep Space to Mars / D: How do you steer to a moving planet 100 million km away with no map and a 20-minute delay? Seventy years of deep-space navigation. |
| 10 | asteroid-mining | "asteroid mining", "is asteroid mining worth it", "asteroid platinum value" | "The Wrong Treasure". Description names asteroids and gold/platinum, so keywords are in the snippet but not the title | WEAK | T: Asteroid Mining: Is It Really Worth Trillions? / D: Headlines say asteroids hold quadrillions in gold and platinum. The money argument is wrong; here is what asteroid mining is actually for. |
| 11 | new-propulsion | "future rocket propulsion", "ion drive", "nuclear thermal rocket", "solar sail" | "The Exits We've Always Known". Description has markdown leak | POOR | T: Beyond Chemical Rockets: Ion, Solar Sail, Nuclear / D: Ion drives, solar sails and nuclear-thermal engines were sketched before Sputnik flew. Why the roads beyond chemical rockets are only now being built. |
| 12 | generational-starships | "generation ship", "generation starship", "interstellar generation ship" | "The Ship Becomes a World". Description: "generation ship" appears in the 2nd sentence only | POOR | T: Generation Ships: Can a Crew Become a Lineage? / D: A generation ship trades speed for time, so the crew becomes a lineage. What a multi-century starship would need, and what it says about us. |
| 13 | space-comm-arrays | "deep space network upgrade", "laser communication in space", "interplanetary internet" | "Louder Than a Whisper". Description names DSN, arrays, laser links | WEAK | T: Deep Space Network: Arrays, Laser Links, Space Internet / D: The Deep Space Network was built for a few probes. How antenna arrays, laser links and a store-and-forward internet cope, and the limit none can beat. |

Also: the essays index (`/essays`) is titled "The Long View · Essays · Orrery" - POOR for any query; proposal `T: Space Exploration Essays: Mars, Moon, Propulsion, Comms` / `D: Thirteen long-form essays on how we reach into the solar system: delta-v, navigation, Mars, the Moon, propulsion, reusable rockets and the body.`

### 1b. Science encyclopedia (175 articles + 14 section pages)

Titles here are mostly plain topic names, so the section is the site's strongest keyword asset: 60+ of 175 are GOOD as they stand. Weaknesses are (i) the 14 section index pages, (ii) context-free single words, (iii) three porkchop sub-pages without "porkchop", (iv) `∆v`. Descriptions are present on all 175 articles and mostly explain the topic; where a proposed title is given, the existing description is kept unless a new one is shown.

**Section index pages (all POOR: upper-case title, no description)**

| Page | Query | Proposed |
|---|---|---|
| /science | "space science encyclopedia", "orbital mechanics explained" | T: Space Science Encyclopedia: Orbits, Rockets, Planets / D: 175 plain-language articles on orbital mechanics, transfers, propulsion, mission phases, exoplanets and life in space, with interactive diagrams. |
| /science/orbits | "orbital mechanics basics" | T: Orbital Mechanics: Orbits, Kepler, Lagrange Points / D: Kepler's laws, eccentricity, inclination, Lagrange points, escape velocity and orbit regimes (LEO, GEO, SSO) explained with interactive diagrams. |
| /science/transfers | "Hohmann transfer", "gravity assist" | T: Orbital Transfers: Hohmann, Lambert, Gravity Assist / D: How spacecraft change orbits: Hohmann transfers, transfer ellipses, patched conics, Lambert's problem, free-return trajectories and gravity assists. |
| /science/propulsion | "rocket propulsion types" | T: Rocket Propulsion: Engines, Delta-v, Rocket Equation / D: The rocket equation, specific impulse, engine cycles, staging, ion and nuclear drives, solar sails and the Oberth effect, explained simply. |
| /science/porkchop | "porkchop plot" | T: Porkchop Plots Explained: Launch Window Charts / D: How to read a porkchop plot: departure and flight-time axes, delta-v contours, viability, and what the cheap zone tells you about a launch window. |
| /science/mission-phases | "launch to landing phases" | T: Mission Phases: Launch, Orbit Insertion, Entry, Landing / D: Every phase of a spaceflight from max-Q and trans-lunar injection to orbit insertion, aerobraking and entry, descent and landing. |
| /science/life-in-space | "living in space" | T: Life in Space: Astronauts, Suits, Habitats, Health / D: How people live off Earth: microgravity effects, radiation, suits, life support, Moon and Mars habitats and crew psychology. |
| /science/exoplanets | "how are exoplanets found" | T: Exoplanets: How We Find and Study Other Worlds / D: Transit, radial velocity, direct imaging and microlensing; habitable zones, TRAPPIST-1, biosignatures and the search for life. |
| /science/planets | "solar system planets facts" | T: Solar System Planets, Moons and Belts / D: Planetary stats, tides, magnetic fields, regolith, lunar ice, the asteroid belt and Kuiper belt, plus a survey of active spacecraft. |
| /science/space-stations | "space station design" | T: Space Stations: Power, Volume, Modules, Crews / D: What limits a space station: solar power budget, habitable volume, node modules and crew rotation cadence, with ISS and Tiangong examples. |
| /science/observation | "how telescopes work" | T: Observing the Universe: Telescopes, Black Holes, Galaxies / D: Spectroscopy, interferometry, adaptive optics and coronagraphs, plus galaxies, the Local Group, black holes and the H-R diagram. |
| /science/cosmology | "cosmic distance ladder" | T: Cosmology: Distance Ladder, Cosmic Web, Laniakea / D: How astronomers measure cosmic distances and map the large-scale structure of the universe, from the cosmic web to Laniakea. |
| /science/history | "history of rocketry" | T: Spaceflight History: Kepler to Apollo 11 / D: Six turning points: Kepler's laws, Newton's Principia, Tsiolkovsky, Goddard's rocket, Sputnik 1 and Apollo 11. |
| /science/scales-time | "astronomical unit", "J2000" | T: Scales and Time in Space: AU, Light-Minutes, J2000 / D: The units and clocks of spaceflight: astronomical units, light-minutes and light-years, the ecliptic, J2000, reference frames and synodic periods. |

**Articles rated WEAK / POOR, by section** (everything not listed in a section is GOOD)

| Section | Page (slug) | Queries | Rating | Proposed title (existing description kept unless D shown) |
|---|---|---|---|---|
| propulsion | dv-budget "∆v as Mission Budget" | "delta-v budget", "delta-v explained" | WEAK (symbol) | T: Delta-v Budget: Total Velocity a Mission Must Spend / D: The single number that says whether a mission is possible: the total delta-v you must spend, summed over every burn, from launch to landing. |
| propulsion | tsiolkovsky | "rocket equation calculator" | GOOD title; description lacks "calculator" | T: Tsiolkovsky Rocket Equation (with Calculator) / D: How much delta-v a given engine and propellant load buys. The rocket equation makes spaceflight logarithmic; try the numbers in the Physics Lab. |
| propulsion | staged-combustion / gas-generator / expander-cycle | "rocket engine cycles" | WEAK (no "rocket engine") | T: Staged-Combustion Rocket Engine Cycle Explained / T: Gas-Generator Rocket Engine Cycle Explained / T: Expander Cycle Rocket Engine Explained |
| propulsion | fuels-and-oxidizers, ion-drive, throttling-and-gimbaling | fine | GOOD | - |
| porkchop | contour-reading "Reading the Contours" | "how to read a porkchop plot" | WEAK | T: How to Read a Porkchop Plot: the Contours |
| porkchop | departure-axis "Departure-Window Axis" | "porkchop plot launch window" | WEAK | T: Porkchop Plot Departure Axis: Picking a Launch Window |
| porkchop | dv-heatmap "∆v Heatmap" | "porkchop plot delta-v" | WEAK | T: Porkchop Plot Delta-v Heatmap: Reading the Colours |
| porkchop | tof-axis "Time-of-Flight Axis" | "porkchop plot time of flight" | WEAK | T: Porkchop Plot Time-of-Flight Axis: Trip Duration |
| porkchop | viability "Reading Viability" | "can my rocket reach Mars delta-v" | WEAK | T: Porkchop Plot Viability: Can Your Rocket Make the Trip? |
| porkchop | what-is-a-porkchop | "porkchop plot", "porkchop plot calculator" | GOOD; description opens with the definition, but never says Orrery draws one interactively | D: A porkchop plot maps trajectory cost for every launch date and flight time: the standard launch-window tool. Draw your own in Orrery's planner. |
| orbits | inclination | "orbital inclination" | WEAK (one word) | T: Orbital Inclination Explained |
| orbits | eccentricity | "orbital eccentricity" | WEAK | T: Orbital Eccentricity Explained: Circle to Escape |
| orbits | keplerian-orbit, semi-major-axis, true-anomaly | orbital elements | WEAK-OK | T: Keplerian Orbital Elements: Orbit Shape and Size, T: Semi-Major Axis of an Orbit, T: True Anomaly: Where a Body Is on Its Orbit |
| orbits | lagrange-points | "lagrange points", "L2 James Webb" | GOOD; description lacks L1-L5/JWST | D: Five points of gravitational balance (L1 to L5) where a spacecraft hovers on almost no fuel, and where the Webb telescope and other observatories sit. |
| transfers | coplanar-trajectories "Why mission trajectories look flat" | "why do spacecraft orbit in a plane" | POOR | T: Coplanar Trajectories: Why Mission Paths Look Flat |
| transfers | hohmann-transfer | "hohmann transfer", "hohmann transfer calculator" | GOOD; no "calculator" | D: The cheapest two-burn trip between two circular orbits, worked out by Walter Hohmann in 1925. See the ellipse and compute delta-v and flight time. |
| transfers | free-return | "free return trajectory Apollo 13" | GOOD | - |
| exoplanets | astrometry | "astrometry exoplanets" | WEAK | T: Astrometry: Finding Planets by a Star's Wobble |
| exoplanets | direct-imaging | "direct imaging exoplanets" | WEAK | T: Direct Imaging: Photographing Exoplanets |
| exoplanets | planet-formation "Formation & Migration" | "how do planets form" | POOR | T: How Planets Form and Migrate Around Young Stars |
| exoplanets | are-we-alone | "are we alone in the universe" | WEAK | T: Are We Alone? The Search for Life Beyond Earth |
| exoplanets | fifty-one-pegasi "51 Pegasi b: The First" | "first exoplanet discovered 51 Pegasi b" | WEAK | T: 51 Pegasi b: The First Exoplanet Around a Sun-Like Star |
| exoplanets | transit, radial-velocity | fine, but add "exoplanet" | WEAK-OK | T: The Transit Method: Finding Exoplanets by Starlight Dips, T: Radial-Velocity Method: Finding Exoplanets by Wobble |
| history | apollo-11-1969 "Apollo 11 · July 20, 1969" | "Apollo 11 moon landing", "Apollo 11 facts" | WEAK | T: Apollo 11 Moon Landing: July 20, 1969 / D: Three astronauts, a Saturn V and JFK's 1961 deadline: how Apollo 11 landed at Tranquility Base on 20 July 1969, eight years later. |
| history | sputnik-1957, tsiolkovsky-equation-1903 | fine | GOOD | - |
| life-in-space | bone-density-loss | "bone loss in space" | WEAK | T: Bone Loss in Space: Why Astronauts Lose Bone Density |
| life-in-space | muscle-atrophy | "muscle loss astronauts" | WEAK | T: Muscle Atrophy in Space: What Weightlessness Does |
| life-in-space | radiation-exposure | "space radiation astronauts Mars" | WEAK | T: Space Radiation: Astronaut Exposure on the Way to Mars |
| life-in-space | long-duration-effects | "long duration spaceflight effects" | WEAK | T: Long-Duration Spaceflight: Effects on the Body |
| life-in-space | vestibular-adaptation | "space motion sickness" | WEAK | T: Space Motion Sickness: How the Inner Ear Adapts |
| life-in-space | crew-selection, pre-flight-training | "how are astronauts selected" | WEAK-OK | T: How Astronauts Are Selected: The Funnel to the Corps |
| life-in-space | surface-dust-mitigation | "lunar dust problem" | GOOD | - |
| mission-phases | antenna-arrays "Arraying - many small ears..." | "antenna arraying deep space network" | POOR | T: Antenna Arraying: Combining Dishes for Deep Space |
| mission-phases | dead-reckoning | "dead reckoning spacecraft" | WEAK | T: Dead Reckoning in Space: Navigating by Accelerometer |
| mission-phases | launch "Launch + Ascent" | "rocket launch phases" | WEAK | T: Rocket Launch and Ascent: The Ten Violent Minutes |
| mission-phases | entry-footprint | "capsule re-entry landing footprint" | POOR | T: Capsule Re-entry: The Landing Footprint |
| mission-phases | terminal-velocity | generic, ambiguous | WEAK | T: Terminal Velocity for Spacecraft Landing |
| mission-phases | edl, skycrane, max-q, aerobraking, gravity-turn, dsn, nrho | fine | GOOD | - |
| observation | space-photography | "how are space telescope images made" | WEAK | T: How Space Telescope Images Are Made (Hubble, Webb) |
| observation | spectroscopy | "astronomical spectroscopy" | WEAK | T: Spectroscopy in Astronomy: Reading Starlight |
| observation | interferometry | "astronomical interferometry" | WEAK | T: Interferometry: How Telescopes Combine into One |
| observation | coronagraphs | "coronagraph exoplanets" | WEAK | T: Coronagraphs: Blocking Starlight to See Planets |
| planets | active-spacecraft-survey | "spacecraft active in the solar system" | POOR | T: Active Spacecraft in the Solar System: Who Is Where |
| planets | moons-of-the-system | "moons of the solar system" | WEAK | T: Moons of the Solar System |
| planets | tides | "how do tides work" | WEAK | T: How Tides Work: Moon, Sun and Orbital Mechanics |
| planets | magnetic-fields | "planetary magnetic fields" | WEAK | T: Planetary Magnetic Fields: Why Mars and Venus Have None |
| planets | planetary-stats | "planet facts comparison" | WEAK | T: Planet Facts: Size, Gravity, Day and Year Compared |
| planets | mars/moon/earth-surface-imagery "...how the layers work" | "Mars map imagery" | POOR | T: Mars Surface Imagery: How the Map Layers Work |
| space-stations | expedition-cadence | "ISS expedition crew rotation" | POOR | T: ISS Expeditions: How Six-Month Crew Rotations Work |
| space-stations | node-module | "ISS node module Harmony Unity" | POOR | T: Space Station Node Modules: Hubs With Docking Ports |
| space-stations | pressurized-volume | "ISS living space volume" | WEAK | T: Space Station Habitable Volume: How Much Room Crew Get |
| space-stations | solar-power-budget | "ISS solar arrays power" | WEAK | T: Space Station Solar Power Budget Explained |
| scales-time | frames | "heliocentric vs geocentric" | WEAK | T: Reference Frames: Heliocentric vs Geocentric |
| scales-time | long-duration | duplicate topic with life-in-space | WEAK | merge/disambiguate against life-in-space/long-duration-effects |
| cosmology | all 3 | "cosmic distance ladder", "Laniakea", "cosmic web" | GOOD | - |

Cannibalisation risk: `scales-time/long-duration` vs `life-in-space/long-duration-effects`; `scales-time/sidereal-synodic` vs `orbits/synodic-period`; `propulsion/tsiolkovsky` vs `history/tsiolkovsky-equation-1903` vs essay `delta-v` for "rocket equation" / "delta-v". Pick one canonical target per query and link the others to it.

Proposed T strings in this table are all under 60 characters (checked below); only the ones with a `D:` need a new description.

### 1c. Programs (42), the only indexable pages on missions today

Template: `<title>{name} · Programs · Orrery</title>`, `<meta description>` = poetic tagline. Result: every program is WEAK. Example current: "Voyager · Programs · Orrery" / "Two probes launched in 1977 to tour the outer planets - and never came back...". The name is present, but there is no "program", "mission", "spacecraft", "Voyager 1 and 2", "launch date" or fact in the title. Fix at the template: `{name} {kind-word}: {fact}` from a new `seo_title` field, and use `dek`-style descriptions with a fact. Samples (ranked by search interest):

| Program | Queries | Current | Rating | Proposed |
|---|---|---|---|---|
| Apollo | "apollo program", "apollo 11", "apollo missions list", "apollo moon landings" | "Apollo · Programs · Orrery" / "The Cold-War sprint that put twelve people on the Moon" | WEAK | T: Apollo Program: 1961-1972, All Moon Landings / D: How NASA put twelve people on the Moon between 1969 and 1972: Apollo 11 to 17, the Saturn V, and why the programme stopped. |
| Artemis | "artemis program", "artemis 2", "artemis moon landing date" | "Artemis · Programs · Orrery" | WEAK | T: Artemis Program: NASA's Return to the Moon / D: Artemis returns people to the Moon with SLS, Orion and a lunar Gateway, with international partners. Missions, hardware and timeline. |
| Voyager | "voyager 1", "voyager 2", "voyager 1 distance", "voyager golden record" | "Voyager · Programs · Orrery" | WEAK | T: Voyager 1 and 2: Humanity's Farthest Spacecraft / D: Launched in 1977, the two Voyager probes toured the outer planets and are still sending data from interstellar space. Their route and instruments. |
| James Webb Space Telescope | "james webb space telescope", "jwst orbit" | title includes full name | GOOD title; description "The successor to Hubble" | D: The James Webb Space Telescope: a gold 6.5 m mirror unfolded at the Sun-Earth L2 point, 1.5 million km away, seeing the first light in the universe. |
| Starship | "starship", "starship vs saturn v", "starship mars" | "Starship · Programs" | WEAK | T: SpaceX Starship: The Biggest Rocket Ever Built / D: Starship and Super Heavy: a fully reusable 120 m rocket meant to carry people to the Moon and Mars. Specs, flights and how it compares with Saturn V. |
| ISS | "international space station" | "International Space Station · Programs · Orrery" | GOOD title; WEAK description | D: Built over 25 years by five agencies, the ISS is the largest structure in orbit and the longest act of cooperation in space. Modules, crews and history. |
| Mars Rovers | "perseverance rover", "curiosity rover", "mars rovers list", "ingenuity helicopter" | "Mars Rovers · Programs · Orrery" | WEAK (rover names not in title) | T: Mars Rovers: Sojourner, Curiosity, Perseverance / D: Every NASA Mars rover from Sojourner to Perseverance and the Ingenuity helicopter: landing sites, discoveries and how each one got down. |
| Space Shuttle | "space shuttle program" | "Space Shuttle · Programs" | WEAK | T: Space Shuttle Program: 1981-2011, Missions and Legacy |
| SpaceX | "spacex falcon 9", "spacex dragon" | "SpaceX - Falcon & Dragon · Programs" | OK-WEAK | T: SpaceX Falcon 9 and Dragon: Reusable Rocket, Crew Capsule |
| Tiangong | "chinese space station", "tiangong" | "Tiangong · Programs" | WEAK | T: Tiangong: China's Space Station |
| Chandrayaan | "chandrayaan 3", "india moon landing" | "Chandrayaan · Programs" | WEAK | T: Chandrayaan: India's Moon Program, Chandrayaan-3 Landing |
| Cassini | "cassini saturn", "cassini grand finale" | "Cassini · Programs" | WEAK | T: Cassini-Huygens: 13 Years at Saturn |
| Sputnik | "sputnik 1", "first satellite" | "Sputnik · Programs" + science/history page | GOOD pair | - |
| Starlink | "starlink satellites" | "Starlink · Programs" | WEAK | T: Starlink: The First Megaconstellation |
| Others (Mir, Skylab, Gemini, Mercury, Viking, New Horizons, Hayabusa, Galileo, Pioneer, Buran, ...) | name + "program"/"mission" | same template | WEAK | apply the template fix; for ones with generic names ("Mercury", "Mir", "Galileo", "Gemini", "Viking") the title MUST add "NASA program"/"space station"/"Jupiter probe" to disambiguate from the planet, the language, the scientist, the zodiac sign. |

Missing "program" collisions worth noting: "Mercury", "Gemini", "Galileo", "Viking", "Mir" and "Pioneer" are ambiguous in all 14 locales; the programs index (`/programs`) is titled "Programs · Orrery", POOR (`T: Space Programs: Apollo, Artemis, ISS, Voyager and More` / `D: 42 spaceflight programmes from Sputnik and Apollo to Artemis, Starship, the ISS and China's Tiangong, with history, hardware and key missions.`).

### 1d. Notable missions, fleet, sites and concepts (22 entries)

"Page today" = best indexable page on orrerylearn.com for the query. "No page" means only a noindex `/c/` card stub (37 words) exists. Ranked by search interest.

| Rank | Entry | Queries | Best indexable page today | Rating | Proposed (new dedicated page unless noted) |
|---|---|---|---|---|---|
| 1 | Apollo 11 | "apollo 11", "apollo 11 landing site", "apollo 11 timeline" | /science/history/apollo-11-1969 (WEAK), /programs/apollo | WEAK | T: Apollo 11: First Moon Landing, 20 July 1969 / D: Armstrong and Aldrin landed at Tranquility Base on 20 July 1969. Mission timeline, landing site map and the Saturn V that launched it. |
| 2 | Starship | "starship", "starship vs saturn v" | /programs/starship | WEAK | see 1c |
| 3 | Voyager 1 / 2 | "voyager 1 distance", "voyager 2 jupiter flyby" | /programs/voyager | WEAK | see 1c; add `T: Voyager 1: Mission, Route and Current Distance` entry page |
| 4 | Saturn V | "saturn v", "saturn v specs", "saturn v height" | no page (only /science/propulsion/engine-clustering, /c/fleet/saturn-v noindex) | POOR (missing) | T: Saturn V: The Rocket That Went to the Moon / D: 110.6 m tall, 13 launches and no loss on ascent. Stages, engines and how Saturn V compares with Starship and SLS. |
| 5 | Artemis (II, III, SLS, Orion) | "artemis 2", "SLS rocket" | /programs/artemis | WEAK | see 1c; SLS and Orion have fleet entries but no page |
| 6 | James Webb Space Telescope | "james webb", "where is jwst" | /programs/jwst (GOOD title) | GOOD/WEAK desc | see 1c |
| 7 | Perseverance | "perseverance rover", "jezero crater" | /programs/mars-rovers only | POOR | T: Perseverance Rover: Mission, Jezero Landing, Samples / D: NASA's Mars 2020 rover landed in Jezero Crater on 18 Feb 2021 to cache rock for return to Earth. Timeline, instruments and landing site. |
| 8 | Curiosity | "curiosity rover", "gale crater" | /programs/mars-rovers only | POOR | T: Curiosity Rover: Mars Science Laboratory in Gale Crater / D: The car-sized, plutonium-powered rover landed by sky crane in 2012 and found that Mars once held a habitable lake. Timeline and route. |
| 9 | ISS | "iss tracker", "international space station" | /programs/iss (GOOD), /iss "ISS Explorer · Orrery", no description | WEAK for tracker intent | /iss: T: ISS Tracker and 3D Explorer: Modules and Crews / D: Explore the International Space Station in 3D: every module, who built it, who visited, and a live pass predictor. |
| 10 | Hohmann transfer | "hohmann transfer", "hohmann transfer orbit calculator" | /science/transfers/hohmann-transfer | GOOD | add "calculator" if the page has a live calculator (see section 3) |
| 11 | Delta-v | "delta-v", "delta-v map" | /essays/delta-v (WEAK), /science/propulsion/dv-budget (WEAK, symbol) | WEAK | see 1a/1b; no delta-v *map* page exists (a top query: "delta-v map solar system") |
| 12 | Lagrange points | "lagrange points", "L2" | /science/orbits/lagrange-points | GOOD | description tweak (1b) |
| 13 | Hubble | "hubble space telescope" | /programs/great-observatories, /gallery/deep-sky (27 mentions) | POOR | T: Hubble Space Telescope: Orbit, Instruments, Discoveries |
| 14 | Falcon 9 | "falcon 9", "falcon 9 booster landing" | essay reusable-launchers (17 mentions), /programs/spacex | POOR (missing) | new fleet page: T: Falcon 9: The First Reusable Orbital Rocket |
| 15 | Space Shuttle | "space shuttle" | /programs/space-shuttle | WEAK | see 1c |
| 16 | Tiangong | "tiangong space station" | /programs/tiangong, /tiangong "Tiangong Explorer", no description | WEAK | /tiangong: T: Tiangong Space Station 3D: Modules and Visitors / D: Explore China's Tiangong station module by module, with the crews and cargo ships that have visited. |
| 17 | Chandrayaan-3 | "chandrayaan 3 landing" | /programs/chandrayaan | WEAK | T: Chandrayaan-3: India's South Pole Moon Landing |
| 18 | Cassini | "cassini mission", "cassini grand finale" | /programs/cassini | WEAK | see 1c |
| 19 | New Horizons | "new horizons pluto" | /programs/new-horizons | WEAK | T: New Horizons: First Flyby of Pluto |
| 20 | Gagarin / Vostok 1 | "yuri gagarin first human in space" | /programs/vostok (5 mentions) | WEAK | T: Vostok 1: Yuri Gagarin, First Human in Space |
| 21 | Ingenuity | "ingenuity helicopter" | 3 mentions in /programs/mars-rovers | POOR (missing) | T: Ingenuity: The First Helicopter on Mars |
| 22 | Olympus Mons, Valles Marineris | "olympus mons height" | 0 pages mention them (`grep` over all prerendered pages) | POOR (missing) | new worlds/Mars feature pages |

Evidence for the "page today" column comes from `scratchpad/seo/terms.py` (counts of term mentions per prerendered English page). Examples: "Saturn V" appears in 40 pages but is a heading only in `science/propulsion/engine-clustering`; "Curiosity" in 38 pages, a heading in none; "Mars Sample Return" only 4 single mentions; "Olympus Mons" and "Valles Marineris" in zero pages.

## 2. WebSearch evidence (22 searches)

Search was US, standard mode. The tool returns result lists (titles and URLs, no ranks, no snippets, no volumes), so "what ranks" is the order and mix returned.

| Query | What the results show | Intent | Orrery angle |
|---|---|---|---|
| porkchop plot calculator | Wikipedia "Porkchop plot", MathWorks File Exchange scripts, degenerateconic.com, poliastro docs, tudat docs, **chipi.github.io/orrery/science/porkchop/what-is-a-porkchop (Orrery's staging host)**, Orbiter forum, KSP forum | tool + explainer; results are code libraries, not a browser tool | A browser porkchop planner is a clear gap in the results. `/plan` title/description should say "porkchop plot", "launch window", "Mars". Orrery appears via the wrong host. |
| hohmann transfer calculator | satnow, Omni Calculator, FIRGELLI, Pearson, calcbee, joteo, AgentCalc (animated canvas), Instructables, Wolfram | calculator (many thin calculator pages) | Orrery wins on 3D/visual ("transfer ellipse diagram + burn numbers"). Title must say "calculator". |
| delta-v map solar system | KSP forum/spacedock, Wikipedia (Delta-v budget), johndcook "Subway map of the solar system", reddit | image/map | No delta-v map page; Orrery has the data (propulsion/dv-budget, dv-heatmap, lab "Get to Mars" etc.). Query "delta-v map" is not targeted by any Orrery title. |
| delta-v calculator rocket | Omni Calculator, FIRGELLI, agentcalc, joteo, Wolfram Alpha, KSP calculators | calculator | Lab has a rocket-equation card with chart; page lacks "delta-v calculator" wording. |
| tsiolkovsky rocket equation calculator | Omni, joteo, FIRGELLI, formuladen, primecalcpro, 3D explorers | calculator | Same as above. |
| mars launch window 2026 2028 next | Starlust, SpaceNews, Musk 2028 articles, NASA. Time-sensitive: window opens Nov 2026, next late 2028/early 2029 | news + "when is the next window" | `/plan` computes windows; ~26-month synodic cycle is explained in `science/orbits/synodic-period`. A page "Mars launch windows 2026-2035" is an evergreen+seasonal target. |
| how long does it take to get to Mars | Space.com, HowStuffWorks, Universe Today, Scotsman. 6-9 months, 210-300 days | informational | essay going-to-mars + `/plan`; neither title says "how long". |
| interactive 3D solar system simulator real time | TheSkyLive 3D viewer, Celestia, Solar Kingdom, three.js demos, itch.io games, Planetaria | tool | `/explore` title is "Orrery" with no words. |
| lagrange points explained James Webb | lbscience, swarajya, Popular Mechanics, SciTechDaily, Polytechnique Insights | informational | science/orbits/lagrange-points GOOD but not seen in this list; description lacks "James Webb"/L2. |
| saturn v vs starship size comparison | many thin blog posts (cal poly host spam, impulso.space, apollo11space.com) | comparison | Orrery has both vehicles with specs and a 3D size scale; no comparison page exists. The SERP quality is low, so it is winnable. |
| apollo 11 landing site tranquility base map interactive | Universe Today, NASA, USGS maps, tranquility base wiki | map | Orrery's `/moon` globe has Apollo 11 and 6 other Apollo sites. No page names it. |
| how do spacecraft land on mars seven minutes of terror | JPL video, digitaltrends, Machine Design, CS Monitor, The Week, DLR | explainer | essay seven-minutes is on-topic but "The Seven Minutes" with no "Mars" or "terror" in title. |
| orbital mechanics simulator online free | HOMA, Apoapsis (itch), Orbitus ED, PhET, Orbiter, app-store apps | tool | Orrery's orbits + transfers explorers fit; no title says simulator. |
| voyager 1 current position distance from earth | TheSkyLive, news about the one-light-day milestone expected 18 Nov 2026 | live/news | Time-sensitive hook: Voyager 1 reaches one light-day from Earth on about 18 Nov 2026 (as reported in the results; I did not open the sources). /programs/voyager could carry a live "distance now" line. |
| gravity assist explained how slingshot works | Scientific American, AMS, TeachEngineering, Smithsonian | explainer | science/transfers/gravity-assist is GOOD title but needs "slingshot" in the description. |
| Mars landing sites map Curiosity Perseverance locations | NASA maps, DLR, JPL, Planetary Society | map | `/mars` map exists; page text says "select curiosity ..." only. |
| Hohmann-Transfer Rechner Raumfahrt Flugbahn (de) | Wikipedia en, MathWorks, kyleniemeyer, glama - no German results | German searchers get English | Orrery's German page is "Hohmann-Transfer · Wissenschaft · Orrery": a localized Hohmann/Rechner page could take an under-served query (test with more de queries; one search is thin). |
| ホーマン遷移軌道 計算 ポークチョップ (ja) | KSP wiki ja, kotobank "ホーマン軌道", weblio, innovation.world; **no Japanese porkchop result** | Japanese users say ホーマン軌道; "ポークチョップ" has no Japanese content | Orrery's ja page "ホーマン遷移" misses "ホーマン軌道/ホーマン遷移軌道". Low competition for ポークチョップ. |
| transferencia de Hohmann calculadora delta-v órbita (es) | calculover (es), KSP forum, generic calculator spam | calculator | Orrery es title "Transferencia de Hohmann" matches; no "calculadora". |
| ISS tracker live 3D where is the space station now | NASA, N2YO, ESA, odoo tool, github demos | tool | `/iss` title "ISS Explorer" has no "tracker". Does Orrery's page show a live position? `/live` and the lab "iss-pass" calculator exist; not checked on the page itself. |
| asteroid mining worth trillions is it real | The Week, Physics World "asteroid trillionaires", Slashgear, Earth.com | informational/skeptical | essay asteroid-mining takes exactly the contrarian angle ("the headline is wrong"); title should carry the question. |
| James Webb where is it now orbit L2 tracker | NASA Where is Webb, orbitalradar, Slashgear, SciAm | live | /programs/jwst could add "Where is Webb now: 1.5 million km at L2". |

## 3. Interactive tools

| Tool | Queries it could rank for | Title / description today | Text a crawler sees | Verdict |
|---|---|---|---|---|
| /plan | "porkchop plot calculator", "mars launch window", "launch window calculator", "earth to mars transfer window", "interplanetary trajectory planner", "when to launch to mars" | T: "Mission Configurator" / no description | 210 words: "DESTINATION Moon Mercury Venus Mars ... COMPUTING LAMBERT SOLUTIONS ... READING THE PORKCHOP Each cell asks: if I launch on date X..." (the explainer is there, but no H1 sentence says what the tool does) | POOR. Proposed T: Porkchop Plot Planner: Find Mars and Planet Launch Windows / D: Free browser porkchop plot calculator. Pick a destination, see departure dates versus flight time and delta-v, and find the cheapest launch window. |
| /lab | "delta-v calculator", "rocket equation calculator", "TWR calculator", "orbital velocity calculator", "escape velocity calculator", "launch azimuth", "ISS pass" | T: "Physics Lab" / none | 1,627 words of real calculator text (Newton, weight, momentum, thrust, TWR, rocket equation, launch-site boost...). 60+ calculators, all on ONE URL | WEAK. Proposed T: Rocket Science Calculators: Delta-v, TWR, Orbits / D: Free physics lab with 60+ rocket-science calculators: rocket equation (delta-v), thrust-to-weight, escape velocity, orbital speed, Hohmann transfers. |
| /fly | "mission simulator", "apollo 11 trajectory", "free return trajectory", "replay a space mission" | T: "Orrery" (bare) / none | 163 words: "ORRERY DEMO PRE-LAUNCH... HELIO DV 33.26 km/s" (HUD jargon) | POOR. Proposed T: Mission Simulator: Replay Real Spaceflight Trajectories / D: Fly historic and planned missions on a real solar-system model: Apollo, Voyager, Perseverance and more, with live delta-v, distance and light-delay. |
| /explore | "3d solar system simulator", "interactive solar system", "scale of the universe", "solar system model" | T: "Orrery" (bare) / none | 97 words ("Solar System Explorer, Cosmic Web, Laniakea, Virgo Supercluster... ICONIC MISSIONS") | POOR. Proposed T: Interactive 3D Solar System Explorer, Real Orbits / D: Explore the Sun, planets, dwarf planets, comets and spacecraft in a 3D solar system with real orbits, adjustable time and a zoom out to the cosmic web. |
| /moon | "moon map", "apollo landing sites map", "moon landing sites", "chang'e 4 landing site" | T: "Moon Map" / none | 109 words ("select apollo11 select apollo12 ...") | WEAK. Proposed T: Moon Map: Apollo, Chang'e and Every Lunar Landing Site / D: Interactive 3D Moon with every landing site from Luna 9 and Apollo 11 to Chandrayaan-3 and Chang'e 6, plus orbiters, traverses and the south pole. |
| /mars | "mars map", "mars landing sites", "where is curiosity" | T: "Mars Map" / none | 110 words | WEAK. Proposed T: Mars Map: Every Landing Site, Rover and Orbiter / D: Interactive 3D Mars with every landing site (Viking to Perseverance and Tianwen-1), rover traverses and orbiters, and maps of the layers. |
| /iss | "iss tracker", "iss 3d model" | T: "ISS Explorer" / none | not sampled | WEAK (see 1d row 9) |
| /tiangong | "tiangong space station" | T: "Tiangong Explorer" / none | not sampled | WEAK |
| /venus, /earth | "venus map", "earth orbit" | "Orrery" (venus) / "Earth Orbit" | not sampled | POOR/WEAK. T: Venus Landing Sites Map: Venera, Magellan, Akatsuki |
| /missions | "list of space missions", "mars missions list" | T: "Mission Catalog" / none | 49 words "Loading..." | POOR (client-rendered list, no crawlable content). Proposed T: Space Mission Catalog: 126 Missions, 1957-2035 / D: Browse 126 spaceflight missions from Sputnik to Artemis and Mars Sample Return, filterable by planet, agency and outcome. |
| /fleet | "list of rockets", "spacecraft database" | T: "Fleet - Spaceflight hardware" / has a description | 46 words "Loading fleet..." | WEAK (title/description ok; content not crawlable) |
| /missions/launches | "upcoming rocket launches" | T: "Launches - Orrery" / has description | not sampled | WEAK. T: Upcoming Rocket Launches and Launch History |
| / (home) | "interactive solar system", "orrery" | T: "Orrery · A solar system explorer for the browser" / desc OK | has `h1` "ORRERY" | GOOD-WEAK. "Orrery" is a branded query shared with the physical instrument (also a word searched by "orrery" watch/clock buyers); keep, add "interactive" |

Key point: Orrery has a real angle on every one of the highest-intent tool queries (porkchop planner, Hohmann/delta-v/TWR calculators, 3D solar system), where today's SERP is thin calculators (Omni, FIRGELLI, calcbee, AgentCalc) or Python libraries. The pages that hold those tools currently hide it behind titles like "Mission Configurator" and "Physics Lab". And the lab's 60+ calculators have no per-calculator URL (not checked whether `/lab?goal=` or a hash deep-link exists; if it does, it cannot be indexed since prerender is one page).

## 4. Non-English sample (de, es, ja; 10 pages each, plus home)

Home titles and descriptions are translated in all three and use native words ("Sonnensystem", "sistema solar", "太陽系"). The other pages:

| Page | de | es | ja |
|---|---|---|---|
| /plan | "Missionskonfigurator" (no desc) | "Configurador de misión" | "ミッション設定" |
| /lab | "Physik-Labor" | "Laboratorio de Física" | "物理実験室" |
| /fly, /explore | title "Orrery" only (the translated H1 "Missionsbogen" / "Sonnensystem-Explorer" is not in the title) | same ("Arco de misión") | same ("ミッションアーク") |
| essays/delta-v | "Die Grammatik des Delta-v · Weitblick" - description translated, good | "La gramática del delta-v · La perspectiva amplia" good | "デルタVの文法 · 長期的視点" - uses デルタV; searchers write デルタv or デルタV, both |
| essays/going-to-mars | "Die Wand" (poetic, same problem as en) | "La Pared" | "壁" |
| hohmann-transfer | "Hohmann-Transfer" fine | "Transferencia de Hohmann" fine | "ホーマン遷移": the entry shown for ホーマン軌道 on kotobank/Weblio; searchers use ホーマン軌道 or ホーマン遷移軌道 - suggest "ホーマン遷移軌道（ホーマン軌道）" |
| porkchop | "Porkchop-Plot" literal | "gráfica porkchop" literal | "ポークチョップ図": no Japanese results exist for the term (search above), so the English loan "porkchop plot" is probably typed as is; add "Porkchop Plot" in latin script |
| tsiolkovsky | "Ziolkowski-Raketengleichung": German searchers mostly use "Raketengrundgleichung" (Wikipedia de's title; I did not run a search for it) | "Ecuación del cohete de Tsiolkovski" OK | "ツィオルコフスキーのロケット方程式" OK |
| lagrange-points | "Lagrange Punkte" - missing hyphen; the standard spelling is "Lagrange-Punkte" or "Lagrangepunkte" | "Puntos de Lagrange" OK | ラグランジュ点, but the **description is a broken translation**: "...すべての2人のシステムに5つの重ね合わせバランスの取れたスポット" ("two-body system" became "two-person system", "balanced points" became "stacked balanced spots") |
| programs/apollo | "Apollo · Programme" (searchers: "Apollo-Programm", "Mondlandung") | "Apollo · Programas" (Spanish spells it "Apolo": "programa Apolo", "Apolo 11") | "Apollo · プログラム" (Japanese: アポロ計画) |
| programs/voyager, jwst, artemis, starship | name only | name only; jwst fully translated "Telescopio espacial James Webb" | Latin-script names (Voyager, Artemis, Starship, "James Webb宇宙望遠鏡"); Japanese users search ボイジャー, アルテミス計画, スターシップ, ジェイムズ・ウェッブ宇宙望遠鏡 |
| edl | "EDL — Eintritt, Abstieg, Landung" - German uses "EDL"/"Landung auf dem Mars" | OK | "EDL — 突入・降下・着陸" OK |

Observations:

* Descriptions and titles ARE translated in all 13 locales, not left in English. Literal translations dominate: "Weitblick" and "La perspectiva amplia" for "The Long View", "Missionsbogen"/"Arco de misión" for "Mission Arc".
* The word-for-word approach loses the native search term in three ways: (1) ja program names stay in Latin script (per the operator's "names: origin-language rule" in memory, this appears deliberate; the SEO cost is that no Japanese-script query term for Apollo/Voyager/Artemis/Starship/Webb is in any title; a decision for the operator: add the katakana in the description only, not the body); (2) es spells "Apollo" rather than "Apolo"; (3) de "Lagrange Punkte".
* Poetic essay titles are translated into poetic titles in all locales; the keyword fix for the English titles must be redone per locale, not machine-copied. Candidate native phrases (my knowledge, not verified by search): de "Was ist Delta-v?", es "¿Qué es el delta-v?", ja "デルタvとは".
* One broken description (ja lagrange-points) was found in a sample of 10 pages; I did not run a defect scan over all locales (the i18n-audit skill exists for that).

## 5. Topic gaps: data exists, no indexable page

Source directories (`i18n-src/en-US/<dir>`, JSON counts): missions 126, fleet 294, moon-sites 28, mars-sites 27, planets 20, small-bodies 24, universe 87, museums 38, observatories 34, earth-objects 31, site-stories 38, iss-modules 18, satellites 16, rockets 13, tiangong-modules 4, venus-sites 3. Prerendered pages that carry any of this: none. Ranked by estimated search interest:

1. **Missions** (126): Apollo 1-17, Voyager, Curiosity, Perseverance, Cassini, New Horizons, Chandrayaan-3, Mariner, Viking, Hayabusa, OSIRIS-REx, Artemis. One page per mission, using the existing `dispatch` + `description` + `events` timeline.
2. **Fleet** (294): launchers (Saturn V, Falcon 9, Falcon Heavy, SLS, Ariane 5/6, Soyuz, Long March 5, New Glenn, Starship), crewed/cargo spacecraft (Dragon, Orion, Soyuz, Shenzhou), observatories (Hubble, Webb), rovers, stations, engines (F-1, Raptor, RS-25, Merlin), space suits (A7L, EMU). Highest-volume entities: Saturn V, Falcon 9, Starship, Hubble.
3. **Moon sites** (28) and **Mars sites** (27): "Apollo 11 landing site", "Tranquility Base", "Gale crater", "Jezero crater", "Chang'e 4 landing site".
4. **Planets and small bodies** (20 + 24): "Mars facts", "Jupiter moons", "Pluto", "Bennu", "Ceres", "Arrokoth". Only `science/planets/planetary-stats` exists.
5. **Comparison and list pages synthesized from the data** (not present as pages): "Saturn V vs Starship", "list of Mars missions", "list of Moon landings", "Apollo missions list", "list of space stations", "Mars landing sites", "Mars launch windows 2026-2035" (the last uses `/plan` data).
6. **Museums (38), observatories (34)**: "space museums near me / in the world", "largest telescopes": the data exist, plus `culture-doors` (8). Lower volume, high local intent.
7. **Delta-v map**: the data behind lab "Get to Mars", propulsion/dv-budget and porkchop dv-heatmap can produce the "delta-v map of the solar system" page (a recurring SERP in the search above).
8. **Universe (87 items)**: "Andromeda Galaxy", "Laniakea", "Sagittarius A*" - partially covered by science/observation/* (14 pages), but the 87 universe entries have no pages.
9. **ISS modules (18) and Tiangong modules (4)**: "ISS modules list", "Zarya", "Destiny module", "Tianhe core module".
10. **Glossary**: one page with 2,669 words; individual terms (apsis, perigee, C3, TCM) cannot rank for their own queries; the per-term deep-dive already exists for most terms as science articles, so link, don't add.

## Template findings (code, for the implementer)

* `src/routes/essays/[slug]/+page.svelte:52` `<title>{essay.title} · {m.essays_title()} · Orrery</title>` and `:53` `<meta name="description" content={essay.dek}>`: add an optional `seo_title` / `seo_description` per essay JSON (en + each locale), fall back to the current values. Strip markdown from `dek` before using it as description.
* `src/routes/programs/[id]/+page.svelte:127-128` same pattern with `p.tagline`.
* `src/routes/science/[tab]/[section]/+page.svelte:96` and `[tab]/+page.svelte:41`: section pages use upper-case tab label and no description.
* `src/routes/{plan,lab,fly,explore,moon,mars,iss,tiangong,venus,earth,live,missions,catalog,worlds,learn}/+page.svelte`: add `<meta name="description">`; `fly`, `explore` and `venus` use titles with no keyword (only "Orrery").
* The 14-locale title suffix " · {section} · Orrery" costs 20-35 characters; move "Orrery" to the end only and drop the section for the title budget.
* `/c/[kind]/[id]`: `noindex` is deliberate for share cards. New indexable pages should be separate routes (for example `/missions/[id]`, `/fleet/[id]`), not removal of noindex from `/c/`.
* Staging/github.io: add `noindex` or a 301 on the `chipi.github.io/orrery` host.

## Top 10 opportunities (also in the final reply)

1. Create indexable pages for missions, fleet, and Moon/Mars sites (475 entries; Saturn V, Falcon 9, Curiosity, Perseverance, Apollo 11 site, Hubble have none).
2. Retitle `/plan` as a "porkchop plot planner / Mars launch window" tool with a description (currently "Mission Configurator", no description).
3. Retitle `/lab` as "rocket-science calculators: delta-v, TWR, escape velocity", and give the key calculators their own URLs.
4. Rewrite the 13 essay titles with search phrases (seven minutes of terror, what is delta-v, why Mars is hard, how spacecraft talk to Earth, reusable rockets...).
5. Fix the program template (`{name} · Programs`) so titles carry "program/mission" plus a fact and disambiguate Mercury/Gemini/Galileo/Viking/Mir.
6. De-index or redirect `chipi.github.io/orrery`, which currently ranks for "porkchop plot calculator" in place of www.orrerylearn.com.
7. Give `/explore`, `/fly`, `/moon`, `/mars`, `/iss`, `/tiangong`, `/venus` real titles and descriptions ("interactive 3D solar system", "mission simulator", "Moon map with every landing site").
8. Add descriptions and proper titles to the 14 `/science/<section>` index pages and replace `∆v` with "delta-v" in titles (dv-budget, dv-heatmap).
9. Add og:title/description/image, twitter:card and JSON-LD (Article, SoftwareApplication); fix the markdown leak in new-propulsion's description.
10. Localise keywords instead of literal translation: ja katakana names and ホーマン軌道, de "Lagrange-Punkte"/"Raketengrundgleichung", es "Apolo"; fix the broken ja Lagrange description.

## Not checked

* Search volumes, difficulty, CTR and actual ranking positions of any Orrery page: no keyword tool was available and WebSearch returns no ranks or volumes. All "queries a person types" are my judgement.
* Whether Google actually indexes the 3,892 sitemap URLs, canonical selection, crawl budget, Search Console data.
* Page speed / JS rendering of the client-side-only tools (the prerendered text is what I read; I did not render the pages in a browser).
* The remaining 10 locales (ar, fr, hi, it, ko, nl, pt-BR, ru, sr-Cyrl, zh-CN): only home titles were read in each; de, es, ja were sampled on 10 pages, so translation defects in the others (like the ja Lagrange description) are unmeasured.
* Native-language keyword research: one search each in de, ja, es, none for the other locales; the German "Raketengrundgleichung" and Japanese "ホーマン軌道" claims are supported by one kotobank result and my own knowledge, not by search volume.
* Body content of the science articles beyond titles and descriptions; the proposed descriptions for science pages are built from existing descriptions and article titles and were not checked against the full article text (essay descriptions were spot-checked with `grep` against the essay JSON).
* The 294 fleet and 126 mission entries individually: I rated ~22 notable ones, not every entry.
* Whether `/lab` supports deep links per calculator; whether `/iss` and `/live` show a live position (the text of those pages was not read).
* Image alt text, heading hierarchy (every page has one `<h1>`, but I did not audit H2/H3), internal link structure, structured data validity, hreflang correctness (20 hreflang tags per page were counted, not validated), the sitemap's lastmod.
* Voyager 1 "one light-day on about 18 Nov 2026" and Mars-window dates come from search snippets and were not opened.
* The `scripts/_archive` directory was not touched. The repo was not edited and no build was run.
