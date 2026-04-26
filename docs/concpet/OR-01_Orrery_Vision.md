# OR-01 · Orrery — Product Vision & Positioning
*April 2026 · v1.0 · Part of the Orrery Concept Package (OR-00 through OR-05)*

---

## The one-line vision

Orrery is what happens when you take the orbital mechanics, rocket science, and mission planning logic that space agencies use to reach other worlds — and rebuild it as a beautiful open-source simulator that a curious person can run in a browser.

The result is not a game. It is not a toy. It is a physically grounded mission planning environment, driven by real orbital mechanics, real rocket specifications, and real launch window constraints — expressed with the visual quality of a WIRED magazine spread and the scientific rigour of a NASA trajectory diagram.

---

## The reference: NASA mission planning tools

The tools that planned Curiosity, Perseverance, and every Mars mission exist. They are called GMAT, STK, and JPL's Monte. They compute Hohmann transfer orbits, porkchop plots, delta-v budgets, and launch window analyses with extraordinary precision. They are what gets spacecraft to Mars.

But they are built for aerospace engineers with PhDs. The interfaces are scientific. The outputs are data tables and trajectory plots readable only to specialists. The tools that sent rovers to Mars are essentially invisible to the curious public that watched those rovers land.

Orrery is the version of those tools that was never built for everyone else.

The physics is the same. The Tsiolkovsky rocket equation is the same. The launch window that opens every 26 months is the same. Orrery takes that science, understands it deeply, and expresses it in a way that is beautiful, interactive, and emotionally engaging — without dumbing it down.

---

## What Orrery is and is not

| | NASA / aerospace tools | Orrery |
|---|---|---|
| **Audience** | Aerospace engineers, mission planners | Curious people, students, space enthusiasts, developers |
| **Physics fidelity** | Full n-body, relativistic corrections | Keplerian + patched conics — correct enough to teach, fast enough for a browser |
| **Rocket data** | Classified or proprietary | Real published specs: Starship, SLS, Falcon Heavy — plus custom vehicles |
| **Output** | Trajectory data files, delta-v tables | Animated mission arc, mission report card |
| **Launch windows** | Computed from full ephemeris | Porkchop plot logic — real 26-month Mars cycle |
| **Entry point** | Deep domain knowledge required | Pick a rocket. Pick a window. Launch. |
| **End state** | Mission plan submitted to review board | A mission you planned, understood, and could explain |

---

## Scope: Mars-first, solar-system-wide

Mars is Orrery's primary destination — the place where the mission configurator, the porkchop plot, and the fly screen are all aimed. But Mars does not exist in isolation. Understanding why it is hard to reach requires understanding the solar system around it, the history of missions that preceded it, and the Earth-orbital infrastructure that makes it possible.

Orrery's scope extends in three directions from Mars:

**Outward** — the full solar system, from Mercury to the Kuiper Belt, with notable small bodies, comet orbits, and the hypothetical Planet Nine. The explorer screen makes the geometry of the solar system tangible before a mission is planned.

**Inward** — the Earth orbital neighbourhood, from the ISS at 408 km to JWST at 1.5 million km. The log-scale view of what humanity has already placed around Earth is the context that makes interplanetary ambition legible.

**Historical** — the Moon and Mars, documented completely. Twenty-eight missions across both destinations. Fourteen Moon missions from Luna 9 (1966) to Artemis III (planned). Fourteen Mars missions from Mariner 4 (1964) to the next launch window. Every agency. Every outcome. Every capability unlocked. The full record of how humanity learned to leave Earth.

---

## The Moon: the road to Mars

No mission to Mars was designed in isolation from everything that came before it. Every technology that enables a Mars mission was first demonstrated, failed, refined, and proved somewhere closer. That somewhere is the Moon.

The Moon is not a detour from the Mars story. It is the only reason the Mars story is possible.

### The capability ladder

Each step on the Moon unlocked a capability without which Mars cannot be attempted. Orrery documents all of them — not as a list of historical footnotes, but as a coherent arc of human ambition.

| Moon capability | Mission | Year | Mars equivalent |
|---|---|---|---|
| Soft landing | Luna 9 | 1966 | Viking (1976) — proved we could land without crashing |
| Remote roving | Lunokhod 1 | 1970 | Sojourner, Curiosity, Perseverance |
| Sample return | Luna 16, 24 | 1970, 1976 | Mars Sample Return — in progress, the hardest thing never done |
| Water ice confirmed | Chandrayaan-1 | 2009 | In-situ resource utilisation — making propellant on Mars |
| South pole landing | Chandrayaan-3 | 2023 | Sustained base location — energy, water, shielding |
| Precision landing | SLIM | 2024 | Targeting specific resource deposits on Mars |
| Far side operations | Chang'e 4 | 2019 | Mars operations with communication delay and relay infrastructure |
| Crewed surface ops | Apollo 11–17 | 1969–72 | The template for everything crewed on Mars |
| Sustained human presence | Artemis (planned) | 2026+ | The dress rehearsal |

None of these capabilities were invented for Mars. They were invented for the Moon and inherited by Mars. Orrery makes that lineage visible.

### What the Moon map shows

Orrery's Moon map displays 16 landing sites across 5 nations on a real 3D lunar sphere, with a 2D flat-map view for geographic context. Every site is clickable — crew, surface time, samples returned, and distinctly, what was left behind: the descent stages, the rovers, the laser retroreflectors that still return pulses from Earth today, Cernan's plaque, Duke's family photo, Shepard's golf balls.

The south pole region is highlighted: the ice-bearing craters that are the most strategically important terrain on any body other than Earth. Chandrayaan-3 landed near there in 2023. Artemis III is aimed there next. The same water ice that makes the south pole valuable for a lunar base also makes it the logical refuelling depot for missions going further out.

The far side missions — Chang'e 4 and Chang'e 6 — require rotating the 3D Moon to see them. This is itself the lesson: the far side has no direct radio contact with Earth, requiring a relay satellite at L2. The same communication architecture problem, at smaller scale, that Mars missions face across 400 million kilometres.

---

## Four acts, one journey

Orrery is structured as a coherent progression — four acts that build on each other. Each is independently valuable, but the sequence is the product.

### Act 0 — Where we have been
The Moon map. Seventeen landing sites from Luna 9's first grainy surface photographs in 1966 to SLIM's precision landing in 2024. Each site is clickable with full mission details, gallery, and educational links. The retroreflectors Apollo astronauts placed still receive laser pulses from Earth. Cernan's plaque is still there. This is not nostalgia — it is the foundation on which everything else is built.

### Act 1 — The solar system
The orrery itself: a real-time 3D solar system rendered with physical accuracy — correct orbital periods, inclinations, relative distances. Not a diagram. A working mechanical model, navigable in three dimensions. Planets, dwarf planets, the asteroid and Kuiper belts, notable comets, the Earth orbital neighbourhood — all clickable, all educational. This is where you see the problem. Earth and Mars are not always in the same place. You feel why launch windows exist before you compute them.

### Act 2 — The mission configurator
The configurator is where the science becomes interactive. A real porkchop plot — a full-canvas heatmap of delta-v cost across departure and arrival dates, computed from a real Lambert solver across thousands of trajectory solutions. You select a launch vehicle from a catalogue of real systems. You configure your payload. The rocket equation solves in real time. You can fail — running out of delta-v is a legitimate outcome that teaches more than automatic success.

### Act 3 — The mission arc
If your mission is viable, it flies. The 3D solar system shows your spacecraft's transfer orbit as a luminous Keplerian arc. The mission clock runs. A dashboard shows heliocentric velocity, distance from Earth and Mars in light-minutes, fuel remaining, and ETA. The arc is not decorative — it is the solution to the equations you just set up. The beauty is the physics working.

---

## The mission library

Orrery documents every significant Moon and Mars mission — and makes each one replayable. Thirty missions total across both destinations.

**On the Mars side:** Mariner 4 to Mars Sample Return. Every agency, every outcome. Curiosity's 253-day transit in 2011. Mars 3's 14.5 seconds of surface transmission before silence. The Hope Probe's first complete Mars climate portrait. Tianwen-1's triple achievement of orbiting, landing, and roving on a single first attempt.

**On the Moon side:** Luna 9 to Artemis III. The Soviet programme that first proved soft landing and remote roving. The Apollo programme that put 12 humans on another world and left them there, in a sense, forever. The 37-year gap between Luna 24 and Chang'e 3. The modern renaissance — China, India, Japan, and NASA all landing within two years of each other. The south pole as the new contested frontier.

The two destinations are not separate catalogues. They are one story. The filter lets you view Mars missions, Moon missions, or the full arc together — because together is how it actually happened.

Private sector missions sit alongside government ones. SpaceX's planned Starship cargo missions are listed alongside NASA and ESA — because they might get to Mars first. The mission library does not take sides on who should go. It records who is trying.

Data quality is stated honestly. Missions with sparse records carry a RECONSTRUCTED or PARTIAL DATA badge, with notes explaining what is known versus inferred. Mars 3's orbital elements are computed from published launch data. The gap is part of the story.

---

## Who Orrery is for

| Audience | Why they are here |
|---|---|
| The space-curious person | Watched a Mars landing. Wants to understand why getting there is hard — through doing, not reading. |
| The student | Taking physics or astronomy. Wants to see orbital mechanics working in a real context, not a textbook diagram. |
| The developer | Wants to understand how orbital mechanics code works. Forks the repo. Adds a rocket profile or a new destination. |
| The educator | Needs an interactive tool that makes delta-v and launch windows tangible. Runs in a classroom browser. |
| The space professional | Works in aerospace. Curious what a beautiful version of their tools looks like. Might file a physics correction. |
| The historian | Wants to understand how 60 years of spaceflight built toward Mars — mission by mission, capability by capability. |

---

## The credit philosophy

Orrery is a curator, not a creator, of the underlying science and imagery.

Every number in Orrery comes from a real formula or a published source. Every image comes from the agency or institution that made it — NASA's public domain image library, ESA's CC BY-SA IGO archive, ISRO's educational releases, CNSA's official releases, Wikimedia Commons. Every agency logo is used for identification and attribution only, in the spirit of nominative use, in an explicitly non-commercial educational context.

This is not a legal footnote. It is a design principle.

Orrery takes pride in assembly — in finding the right sources, attributing them correctly, and presenting them in a way that serves learners. The science belongs to the scientists. The images belong to the agencies that built the missions. Orrery's contribution is the curation, the interaction design, and the editorial voice that makes the whole comprehensible.

In practice: every image displayed carries a credit. Every data source is documented in OR-03. Every agency logo has a trademark notice. Any future monetisation of Orrery will not include advertising. The product is a space to think, not a space to sell.

---

## What success looks like

The measure of Orrery is not technical. It is whether the education works.

- A first-time user picks Starship, loads too much payload, runs out of delta-v, and immediately understands what they did wrong — without reading a word of explanation.
- A physics teacher uses Orrery instead of a whiteboard diagram to show why the Hohmann transfer is the minimum-energy path between two orbits.
- A student clicks on Chandrayaan-3's landing site, reads about south pole water ice, and for the first time understands why the Moon matters for Mars.
- A developer forks the repo and adds a Venus mission profile — because the architecture made it easy.
- Someone shares a screenshot of their mission arc without explaining what it is, and people ask what the app is.
- A space journalist uses Orrery to illustrate a story about a real Mars mission — because the output looks good enough to publish and the physics is correct enough to trust.
- A history teacher uses the mission library chronologically — Luna 9 to Artemis — to show a class sixty years of spaceflight in one session.
- A student clicks on Lunokhod 1, then clicks on Curiosity, and without being told, understands that one is the ancestor of the other.

---

## What Orrery is not

**Not a full n-body simulator.**
Orrery uses Keplerian orbital mechanics and patched conics. Correct enough to teach, fast enough to run in a browser. Not GMAT.

**Not a game.**
No points, no levels, no achievements. The only win condition is a mission that reaches its destination. The satisfaction comes from the physics.

**Not a real mission planner.**
Orrery does not account for gravity assists, course corrections, or communications windows. It teaches the fundamentals that make that complexity comprehensible.

**Not science pretending to be simple.**
Every number comes from a real formula or published source. The 26-month Mars window is real. The Tsiolkovsky rocket equation is the rocket equation. The porkchop plot is a real porkchop plot, computed from a real Lambert solver.

**Not an advertisement.**
No agency, no launch provider, and no company has paid to appear in Orrery. SpaceX appears because it is attempting to go to Mars. ESA's Hope Probe appears because it is in Mars orbit. The mission library reflects what is real, not what is sponsored.

---

*Orrery is an open-source solar system explorer and mission simulator that documents humanity's path from the Moon to Mars — making sixty years of spaceflight and the orbital mechanics behind it beautiful, interactive, and genuinely educational.*

---

*Orrery · OR-01 Product Vision & Positioning · April 2026 · Living document*
*Next: OR-03 Data Catalog →*
