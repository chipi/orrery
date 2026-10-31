# src/lib/lab — module map

The `/lab` Physics Lab UI (`routes/lab`, `routes/lab/callback`, `routes/dev/lab-illustrations`): a prerendered SPA over the pure kernel. One *card* model (formula id + inputs + wires + `FigureSpec`), three views. Formulas, goals and the `FigureSpec` contract live in `$lib/physics/` (`spec.ts`, `registry/`), not here.

- **State owner** — `lab-state.svelte.ts`: the one `$state` cell list Notebook and Canvas both render, so switching views cannot lose an edit.
- **Notebook** — `Notebook.svelte` (owns one goal's cells) + `Card.svelte` (presentational, never computes wiring) + `notebook.ts` (pure recompute engine; wires are earlier-cell indices).
- **Canvas** — `Canvas.svelte` (free-form wiring), `graph.ts` (topo-sort, then delegates to `notebook.ts`), `promote.ts` (subgraph to linear Notebook).
- **Serialization** — `codec.ts`: one codec for `?nb=1.<base64url>`, localStorage and `.orrlab.json`; `decode` clamps untrusted input.
- **Figures** — `FigureRenderer.svelte` dispatches a `FigureSpec` by `kind` to the `*Canvas.svelte` heroes; `hero-canvas.ts` is their shared chrome, `figure-style.ts` the fidelity-register styling.
- **Ask** — `ask/`: LLM ask-box client (`Ask.svelte`, `ask-state.svelte.ts`, `auth.ts` OAuth 2.1 PKCE client, `config.ts`, `ask-switch.svelte.ts`). `ask-scenario.ts` (root) is the contract shared with `server/lab-api/`.
- **Other** — `t.ts` (dotted-key to paraglide resolver), `report-card.ts` (PNG share card), `ConnRocketStats.svelte` (rockets.json rows linking to /plan).

## Look-alikes and conventions

- `FlightMapCanvas` + `flight-maps.ts` (whole-mission schematic per goal) vs the per-formula heroes `FigureRenderer` picks from a card's own `FigureSpec`.
- `IllustrationFigure` + `illustration.ts` (generated art in the goal header) is a separate artifact from `FigureSpec`: it takes a `LabIllustration`, imports nothing from `figure-style.ts`, and never mounts in a card's figure slot.
- Engines are fail-honest: invalid-wire, upstream-failed, unit-mismatch and cycles surface as such, never as a fake green result. Renderers keep `provenance.fidelity` registers visually distinct. User-facing strings are paraglide keys; canvas hero text is English by Lab convention.

Pointers: TA.md §"Physics Lab (v0.9)" · PRD-033 · RFC-037 · UXS-015 · ADR-090.
