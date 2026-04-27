# OR-02 · Orrery — Project Concept
*April 2026 · v1.0 · Part of the Orrery Concept Package (OR-00 through OR-05)*

---

## What Orrery is

Orrery is an open-source solar system explorer and mission simulator that makes orbital mechanics beautiful, interactive, and genuinely educational — from the Moon's first landing sites to the next launch window to Mars.

It is a browser-based application. It runs offline. It deploys with a single command. It is grounded in real physics, real mission data, and real agency imagery — curated with full attribution, presented without advertising, and built to be contributed to by anyone who cares about getting the science right.

The name comes from a mechanical model of the solar system — a clockwork device that lets you hold the solar system in your hands and see how it moves. That is exactly what Orrery does, at the scale of a screen.

---

## The problem it solves

The tools that planned every Mars mission exist. They are called GMAT, STK, and JPL's Monte. They compute porkchop plots, Hohmann transfer orbits, delta-v budgets, and launch window analyses with extraordinary precision. They are what gets spacecraft to Mars.

They are also completely invisible to the public. The interfaces are scientific. The outputs are data tables and trajectory plots readable only to specialists. The curious person who watched Perseverance land, who wanted to understand why getting there took seven months, who wondered why we can only go every 26 months — that person has nowhere to go.

Orrery is the version of those tools that was never built for everyone else.

---

## What it covers

Orrery covers three nested scales of space exploration, each building on the last.

**The Moon — where we have already been.** Sixteen landing sites across five nations, from Luna 9's first grainy surface photographs in 1966 to Chandrayaan-3's south pole touchdown in 2023. Every site is clickable: crew, surface time, samples returned, what was left behind. The south pole's water ice deposits are highlighted — the same reason Artemis III is aimed there, and the same reason the Moon matters for what comes after. The far side missions require rotating the 3D lunar sphere to see — because the far side is literally hidden from Earth, and that is the lesson.

**The solar system — where we are going.** A real-time 3D orrery with correct orbital periods, inclinations, and relative distances. Eight planets, the asteroid and Kuiper belts, notable dwarf planets and comets, and the hypothetical Planet Nine at the edge. The Earth orbital neighbourhood on a separate logarithmic scale, from the ISS at 408 km to JWST at 1.5 million km. All of it clickable, all of it educational. The geometry of the problem — why launch windows exist, why Mars is not always in the same place — made tangible before a trajectory is computed.

**The mission — what you can plan.** A real Lambert solver computing 11,200 trajectory solutions at startup. A full porkchop plot showing delta-v cost across four years of departure and arrival dates. A launch vehicle catalogue with real published specs. The Tsiolkovsky rocket equation solving in real time. If the mission is viable, it flies — a 3D transfer arc with live telemetry showing heliocentric velocity, light-minutes to Earth and Mars, fuel remaining, and ETA. You can fail. Running out of delta-v is a legitimate outcome that teaches more than automatic success.

---

## The mission library

Twenty-eight missions, two destinations, six decades of spaceflight.

On the Mars side: every significant mission from Mariner 4 (1964) to the proposed Starship cargo flights. Every agency. Every outcome. Mars 3's 14.5 seconds of surface transmission before silence. The Hope Probe's first complete Mars climate portrait. Tianwen-1's triple achievement of orbiting, landing, and roving on a single first attempt. Each mission is replayable: the same fly screen that runs a planned mission runs Curiosity's 253-day transit.

On the Moon side: the capability ladder that made Mars reachable. Luna 9 proved soft landing. Lunokhod 1 proved remote roving. The Apollo programme put 12 humans on another world. Chandrayaan-1 confirmed water ice at the poles. Chandrayaan-3 landed near them. Chang'e 4 demonstrated far side operations — the same communication relay architecture that Mars missions require. Chang'e 5 demonstrated sample return — the hardest thing that still needs to be done for Mars. Every one of these missions unlocked a capability that Mars requires. Orrery makes that lineage visible.

The two destinations are not separate catalogues. They are one story. The filter lets you see Mars missions, Moon missions, or the full arc together — because together is how it actually happened.

Data quality is stated honestly. Missions with sparse records carry a RECONSTRUCTED or PARTIAL DATA badge. Mars 3's orbital elements are computed from published launch parameters. The gap is part of the story.

---

## The design position

The visual language is WIRED magazine spread meets NASA trajectory diagram. Neither dominates. Both are present.

Three typefaces only. Bebas Neue for mission names and screen titles — bold, spatial, poster-scale. Space Mono for all data — monospace precision, numbers that align. Crimson Pro italic for editorial descriptions and facts — the historian's voice, humanist and precise in the same stroke.

Background: `#04040c` — near-black with a blue undertone. Space, not void.

Agency colours are used consistently across every screen. NASA blue. CNSA red. ISRO orange. Roscosmos dark crimson. The colour of a mission card is the colour of the agency that flew it.

The detail panel that slides in from the right is the heart of the interface. Every planet, every orbital object, every landing site, every historical mission has one. It contains the same structure every time: identity, data, a left-border "still on the surface" or "road to Mars" contextual block, an editorial description in Crimson Pro italic, and educational links in three tiers — INTRO (Wikipedia, agency pages), CORE (MIT OpenCourseWare, technical overviews), DEEP (peer-reviewed papers, primary sources). The tier system is colour-coded consistently across all six screens.

---

## Six screens, one product

Orrery is not a collection of visualisations. It is a coherent experience with a narrative arc.

**OR-P06 Moon Map** is the prologue. The road to Mars starts here — with humanity's first steps on another world, the capabilities they proved, and the resources they found.

**OR-P01 Solar System Explorer** is Act 1. You see the geometry. You understand the problem. Earth and Mars are not always in the same place. The 26-month window is not arbitrary. Click any planet and the TECHNICAL tab shows the full Keplerian mechanics — eccentricity, inclination, axial tilt, live orbital velocity from the vis-viva equation. A SIZES tab shows all planets to true relative scale. The Sun is clickable, with a panel explaining our position in the galaxy.

**OR-P02 Mission Configurator** is Act 2. The porkchop plot. 11,200 trajectories computed from a real Lambert solver. You select a launch vehicle. The rocket equation solves. You can fail — not enough delta-v is a real outcome.

**OR-P03 Mission Arc** is Act 3. The spacecraft flies a real free-return trajectory — Earth departure, Mars flyby at 300 km altitude, return to Earth. 509 days total. No landing. Real Keplerian arc, not a Bezier approximation. CAPCOM mode shows a mission event ticker, signal delay in light-minutes, and an anomaly monitor. The spacecraft icon is a rocket oriented along its velocity vector. Past trajectory is solid; future is dashed.

**OR-P04 Mission Library** is the archive. Every mission replayable. Every agency. Every outcome. Sixty years of spaceflight in one catalogue, filtered any way you want.

**OR-P05 Earth Orbit** is the context. What humanity has already placed around Earth — from the ISS to JWST — shown on a logarithmic scale that makes the 3,750× range of distances legible on a single screen.

---

## What was built beyond the original six screens

Two features originally planned as standalone Phase 2 screens were merged into existing prototypes during development — a better outcome than separate files.

**Planet Technical Mode** is now a TECHNICAL tab inside OR-P01's planet detail panel. Every planet shows its full Keplerian element set, live vis-viva orbital velocity, eccentricity visualiser, and per-planet axial tilt explanation. A SIZES tab shows all planets at true relative scale. The Sun is clickable with a panel covering solar physics and our position in the Milky Way.

**CAPCOM Mission Arc** is now a toggle in OR-P03's nav bar. The mission scenario was updated to a **free-return Mars flyby** — 509 days, no landing — an Artemis II analogue at interplanetary scale. The Keplerian arc is real on both legs. CAPCOM mode adds a 13-event mission ticker, signal delay, and anomaly monitor.

## Deferred to Phase 2

**Launch Sequence (OR-P09)** — the 12 minutes from pad to orbit insertion — is designed but not yet built. A schematic version (ascent profile, stage separation callouts, CAPCOM events) is achievable within the current Three.js stack. A cinematic version requires cloud rendering infrastructure. The full spec is in OR-04 section 8.

---

## What the product is not

**Not a full n-body simulator.** Orrery uses Keplerian orbital mechanics and patched conics. Correct enough to teach, fast enough for a browser. Not GMAT.

**Not a game.** No points, no levels, no achievements. The only win condition is a mission that reaches its destination. The satisfaction comes from the physics.

**Not science pretending to be simple.** Every number comes from a real formula or a published source — IAU constants, JPL planetary fact sheets, Bate-Mueller-White Lambert formulation. The 26-month Mars window is real. The rocket equation is the rocket equation.

**Not an advertisement.** No agency, no launch provider, and no company has paid to appear in Orrery. SpaceX appears because it is attempting to go to Mars. The mission library reflects what is real, not what is sponsored.

---

## The data model

Mission data lives in plain JSON files — one file per mission — served statically alongside the application. There is no database. There is no backend. A contributor who wants to add a mission edits a JSON file and adds one line to the index. They do not touch JavaScript. A pull request for a new mission is a diff of two files, reviewable by anyone who knows the mission.

The same principle applies to orbital elements, rocket specifications, and Earth orbit objects — all plain JSON, all human-readable, all version-controlled alongside the code.

Images come from the sources that made them. NASA's public domain image library, fetched live via the Images API. ESA's CC BY-SA IGO archive. ISRO's educational releases. CNSA's official publications. Wikimedia Commons for historical Soviet imagery. Every image carries a credit. Every credit is accurate. The product is a curator, not a creator, of the underlying science and imagery.

---

## The technical position

Orrery is a static web application. It runs in any modern browser. It has no server-side logic. It deploys to Docker Compose as a single nginx container serving static files and JSON data.

The build stack is intentionally minimal: Vite for bundling, Three.js r128 for 3D rendering, vanilla JavaScript throughout. No framework. The primary rendering targets — Three.js and Canvas 2D — are imperative APIs that do not benefit from declarative component abstractions.

All external dependencies are bundled locally: Three.js, Google Fonts (self-hosted), agency logos, planet textures. The application works offline. The NASA Images API is the one intentional live dependency, and it degrades gracefully to a placeholder when unavailable.

The Lambert solver — the most computationally expensive operation, computing 11,200 trajectory solutions at startup — runs in a Web Worker in the production build, off the main thread, so the interface remains responsive during computation.

---

## The credit philosophy

Orrery is a curator, not a creator, of the underlying science and imagery.

Every number comes from a real formula or a published source. Every image comes from the agency or institution that made it. Every agency logo is used for identification and attribution only, in the spirit of nominative use, in an explicitly non-commercial educational context.

This is not a legal footnote. It is a design principle.

The product takes pride in assembly — in finding the right sources, attributing them correctly, and presenting them in a way that serves learners. The science belongs to the scientists. The images belong to the agencies that built the missions. Orrery's contribution is the curation, the interaction design, and the editorial voice that makes the whole comprehensible.

---

## What success looks like

A first-time user picks Starship, loads too much payload, runs out of delta-v, and immediately understands what they did wrong — without reading a word of explanation.

A physics teacher uses Orrery instead of a whiteboard diagram to show why the Hohmann transfer is the minimum-energy path between two orbits.

A student clicks on Chandrayaan-3's landing site, reads about south pole water ice, and for the first time understands why the Moon matters for Mars.

A student clicks on Lunokhod 1, then clicks on Curiosity, and without being told understands that one is the ancestor of the other.

A developer forks the repo and adds a Venus mission profile — because the architecture made it easy.

A history teacher uses the mission library chronologically — Luna 9 to Artemis — to show a class sixty years of spaceflight in one session.

Someone shares a screenshot of their mission arc without explaining what it is, and people ask what the app is.

A space journalist uses Orrery to illustrate a story about a real Mars mission — because the output looks good enough to publish and the physics is correct enough to trust.

---

## The concept package

This document is part of a five-document concept package that fully specifies Orrery:

| Document | Contents |
|---|---|
| **OR-01 Vision** | Product vision, scope, audience, credit philosophy |
| **OR-02 Project Concept** | This document — full synthesis of what Orrery is |
| **OR-03 Data Catalog** | Every data source, constant, schema, and API |
| **OR-04 Technical Architecture** | Stack, repo structure, router, data layer, deployment |
| **OR-05 Design System** | Colour, typography, components, screen patterns, screenshots |

Six working prototypes accompany the package: OR-P01 through OR-P06, one per screen. Every design decision in OR-05 and every data decision in OR-03 is grounded in what those prototypes actually do. The package was written after the prototypes, not before.

---

*Orrery · OR-02 Project Concept · April 2026*
*← OR-01 Vision · OR-03 Data Catalog →*
