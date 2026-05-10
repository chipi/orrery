# Orrery — Documentation

This directory contains the full documentation for Orrery, organised into five sections plus a user guide and translator guide.

## Read first

- **[`user-guide.md`](user-guide.md)** — read-this-first walk-through of the live app, screen by screen, with screenshots for all 10 primary nav routes (`/explore`, `/plan`, `/fly`, `/missions`, `/earth`, `/moon`, `/mars`, `/iss`, `/tiangong`, `/science`) plus the read-only provenance pages (`/credits`, `/library`). Start here if you want to use Orrery.
- **[`i18n-style-guide.md`](i18n-style-guide.md)** — binding glossary for translators (per [ADR-033](adr/ADR-033.md)).

## Concept package

`concept/` — the founding narrative documents (00–05). Read these to understand what Orrery is, why it was built, and what design and physics decisions were made during prototyping. Start with `02_Project_Concept.md`.

`prototypes/` — six working HTML prototype files (P01–P06). These are the ground truth for the original design and physics decisions. Open them directly in a browser.

## Phase 2 — Definition documents

Four folders, three planes:

**Product plane** (`prd/`) — what changes for the user. Start with `PA.md` (audiences, promises, principles). Each PRD-NNN describes one screen — PRDs 001–007 are the original six screens; PRDs 008–011 are the v0.4–v0.5 additions (`/science`, `/mars`, `/iss`, `/tiangong`); PRD-012 is the upcoming v0.6 work (`/fleet`).

**UX plane** (`uxs/`) — what does it look like. Start with `IA.md` (surfaces, navigation, shared tokens). Each UXS-NNN is the static visual contract for one screen, verified against the prototype.

**Tech plane — open questions** (`rfc/`) — technical questions with alternatives. RFCs close into ADRs when implementation evidence arrives at each release gate. See [`IMPLEMENTATION.md`](https://github.com/chipi/orrery/blob/main/IMPLEMENTATION.md) for release definitions (lives at the repo root, outside the VitePress build).

**Tech plane — locked decisions** (`adr/`) — committed decisions, append-only. Start with `TA.md` (components, contracts, constraints, stack, §map). Each ADR-NNN is a single locked decision. ADRs 001–051 cover stack choice, routing, data layer, i18n, accessibility, KaTeX rendering, diagram authoring, station geometry, agency-first imagery sourcing, and per-image / per-link provenance discipline.

## Quick reference

| I want to... | Read... |
|---|---|
| Use Orrery | `user-guide.md` |
| Understand what Orrery is | `concept/02_Project_Concept.md` |
| See the original concept | `prototypes/P01_solar-system-explorer.html` |
| Understand the audiences and promises | `prd/PA.md` |
| See the design system | `uxs/IA.md` + any `UXS-NNN.md` |
| Understand the tech stack | `adr/TA.md` |
| Find open technical questions | `rfc/index.md` |
| Find locked decisions | `adr/index.md` |
| Translate Orrery into a new language | `i18n-style-guide.md` |
| Add a mission | `concept/03_Data_Catalog.md` |
| Refresh the README + user-guide screenshots | `npm run screenshots` (drives the production build through every route + interaction state via Playwright) |
| Understand what to build next | `../IMPLEMENTATION.md` |
| See the release history | `../CHANGELOG.md` |
