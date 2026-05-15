# 00 · Orrery — Introduction & Reader's Guide
*April 2026 · v1.0 · Part of the Orrery Concept Package (00 through 05)*

> **Historical note (May 2026)** — this concept package describes Orrery as it was at the prototype stage (April 2026). The production app has since landed in v0.3 with **32 missions** (16 Mars + 16 Moon, including Artemis II and Inspiration Mars), Spanish localisation, the heliocentric Apollo / cislunar reframe, and the i18n architecture closure (ADR-031 / 032 / 033). For the current state, read [`../user-guide.md`](../guides/user-guide.md) and [`../adr/index.md`](../adr/index.md). The concept package is the founding narrative — preserved as a historical artefact.

---

## What this package is

This is the Orrery Concept Package — five documents and six working prototypes that together fully specify an open-source solar system explorer and Mars mission simulator.

It was built in the right order: prototypes first, documents second. Every design decision, every data choice, every architectural constraint in these documents is grounded in what the six prototype screens actually do. Nothing here is aspirational. The prototypes are the ground truth.

---

## How to read it

The package is designed to be read in any order depending on who you are. Here is the recommended path for each reader:

**If you want to understand what Orrery is and why it exists:**
Start with 02 Project Concept. It is the complete synthesis — what the product covers, what it looks like, what it is not, and what success means. If you read only one document, read that one.

**If you want to understand the vision and editorial position:**
Read 01 Vision. It covers the audience, the Moon-to-Mars narrative, the credit philosophy, and what Orrery is not. It is the founding document — shorter and more argumentative than 02.

**If you want to contribute a mission or correct a data point:**
Read 03 Data Catalog. It documents every source, every constant, every field in the mission JSON schema, and the exact credit format for every agency. It is the authoritative reference for anyone touching the data.

**If you want to build on or extend the product:**
Read 04 Technical Architecture. It covers the stack, the repo structure, the client-side router, the JSON data layer, and the Docker Compose deployment. It also enumerates what is explicitly out of scope for Phase 1 and why.

**If you want to design a new screen consistently:**
Read 05 Design System. It documents every colour token, every typeface rule, every component, every screen pattern, and every interaction convention established across the six prototypes. Screenshots of all six screens are embedded at each relevant section.

**If you want to see it working:**
Open any of the six HTML prototype files directly in a browser. No server required.

---

## The six prototypes

| File | Screen | What it demonstrates |
|---|---|---|
| `P01_solar-system-explorer.html` | Solar System Explorer | 3D/2D toggle, planet detail panels with OVERVIEW/TECHNICAL/LEARN/SIZES tabs, Kuiper Belt, comets, Planet Nine. Technical tab shows full Keplerian elements, live vis-viva velocity, axial tilt — per planet. |
| `P02_mission-configurator.html` | Mission Configurator | Real Lambert solver, 11,200-cell porkchop plot, window selection |
| `P03_mission-arc.html` | Mission Arc | Free-return Mars flyby trajectory (509 days, no landing). Real Keplerian arc — outbound and return legs. CAPCOM mode: mission event ticker, signal delay, anomaly monitor. Past/future arc distinction. Rocket icon. |
| `P04_mission-library.html` | Mission Library | 28 missions (Mars + Moon), filter system, gallery, educational links |
| `P05_earth-orbit.html` | Earth Orbit Viewer | Logarithmic scale, ISS to JWST, orbital regime legend |
| `P06_moon-map.html` | Moon Map | 16 landing sites, 3D sphere, 2D flat map, capability ladder context |

All prototypes run entirely in the browser. They load Three.js from CDN and Google Fonts from CDN — an internet connection is required for full fidelity. The production build (described in 04) self-hosts all dependencies for offline use.

---

## The five documents

| Document | Lines | Contents |
|---|---|---|
| 00 Introduction | 101 | This document — what the package is and how to read it |
| 01 Vision | 188 | Product vision, scope, the Moon-to-Mars narrative, credit philosophy |
| 02 Project Concept | 167 | Full synthesis — what Orrery is, does, and means |
| 03 Data Catalog | 462 | Every source, constant, schema, API, and credit format |
| 04 Technical Architecture | 826 | Stack, repo, router, JSON data layer, Docker Compose |
| 05 Design System | 603 | Colour, type, components, screen patterns, screenshots |

---

## How this package was made

The concept package was written after six prototype screens were built and validated — not before. This is not the conventional order. Conventional product documents specify what will be built. This package documents what was built, then synthesises it into something a developer, designer, or contributor can act on.

The prototypes took precedence over the documents at every decision point. When a design choice emerged from building P04 (mission library) that had implications for the architecture, that choice was captured in 05 section 10 and responded to in 04. When a data model decision that had seemed obvious turned out to be wrong (JS constants instead of JSON files), the architecture document was rewritten before any further work proceeded. The documents are honest about what they know and when they knew it.

This is why the package reads the way it does. 01 is a founding argument. 02 is a synthesis after the fact. 03 documents actual sources used in actual prototypes. 04 responds to actual design constraints, not hypothetical ones. 05 captures what was built, not what was planned.

---

## What is not in this package

**00 through 05 do not include:**

- A project timeline or delivery schedule
- A budget or resource estimate
- Team structure or contributor roles
- Marketing or go-to-market strategy
- A roadmap beyond Phase 1 scope

These are intentional omissions. Orrery is an open-source project. The people who build it will make those decisions. This package gives them everything they need to understand what they are building and why — and nothing that would constrain decisions that are not yet theirs to make.

Phase 2 scope is listed honestly in 04 section 8 — features implied by the current screens but not yet designed: mission sharing, mobile layout, accessibility, the Moon arc screen. They are listed so Phase 1 decisions do not accidentally block them. They are not listed as commitments.

---

## A note on the prototypes as source of truth

The six HTML prototype files are the authoritative reference for any ambiguity in the documents. If 05 says a panel is 330px wide and the prototype measures 314px, the prototype is correct. If 03 specifies a data field and the prototype uses a different field name, the prototype usage reflects the actual decision made during development.

The documents were written to capture those decisions accurately. Where they fall short, the prototypes resolve it.

---

*Orrery · 00 Introduction & Reader's Guide · April 2026*
*01 Vision →*
