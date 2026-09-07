# Slice I — Attribution / credits backfill (v0.9 arc) — plan

*2026-09-07 · operator-flagged gap: "everything we integrate with / base upon →
references & credits; all our original work → the colophon." Audit (Explore,
2026-09-07) found 10 gaps. This slice closes them BEFORE the epic-close so v0.9
ships fully attributed.*

## The two existing patterns (the templates to follow)

- **External integrations → `static/data/data-sources.json`** (structured
  entry: id/name/catalog/category/description/source_url/license_short/
  license_url/used_on) rendered by `src/routes/credits/+page.svelte` (§
  `#src-data-catalogues`, ~L560). Gold standard = launches (GCAT/LL2): entry
  in data-sources.json AND an inline footer credit on the feature page
  (`/missions/launches` L391–402). Follow both surfaces for the big ones.
- **Original work → `static/data/original-work.json`** (built by
  `scripts/build-original-work.mjs`) rendered by
  `src/routes/colophon/+page.svelte`.

## Gaps → fixes (grouped)

### Clear-cut (just do)
1. **CelesTrak** (TLE data for iss-pass / ISS + Tiangong) → data-sources.json
   entry (`used_on:["iss","tiangong","lab"]`) + inline footer credit on
   /iss + /tiangong. License: free-use-with-attribution (celestrak.org/faq).
2. **MCP / @modelcontextprotocol/sdk (Anthropic)** → data-sources.json entry
   (category `protocol`, `used_on:["lab"]`).
3. **tech-bom.json regen** — stale at v0.8; missing `jose` + the MCP SDK.
   Re-run `npm run build-tech-bom`.
4. **Colophon `lab_illustrations` render** — the key exists in original-work.json
   + build script but colophon's `Manifest` type omits it and no section
   renders it (G-arc gap). Add type + section; block-note names the platform.
5. **Lab original work in the colophon `writing` array** — the 64 formulas,
   25 goals, and the ×14 Lab i18n corpus are unlisted. Add entries in
   build-original-work.mjs + re-run.
6. **TLE-propagation citationKey** — iss-pass has no `citationKey`; add one
   (`orbits/keplerian-orbit` or a new tle-propagation article) so the Card's
   `?` affordance links a science explainer (the format/J2 model is
   documented in propagate.ts but not surfaced).

### Editorial calls (operator lean = credit them, per your "everything we base upon")
7. **LLM stack (LiteLLM · OpenRouter · DeepSeek v4 Flash)** — the ask box
   narrates via it; only the model string shows per-answer. Add an "AI / LLM
   services" block to /credits naming the gateway + provider + model.
8. **Google Identity (OAuth IdP)** — sign-in uses Google; only the button
   text credits it. Add a services line on /credits.
9. **IAU / JPL Standish / EGM96 / IUGG constants** — the kernel's authoritative
   constants are cited in code comments only. Elevate the catalogue-grade ones
   (JPL Standish planetary tables, IAU constants) to data-sources.json
   `used_on:["lab"]`, matching how GRAVITY/EHT papers are already credited.
10. **Higgsfield naming for EXISTING AI art** (posters, anatomy) — currently
    "AI-generated" with no platform. Optional consistency fix while we're here.

## Sequencing

Runs as its own slice **I, after H, before epic-close** — cleanly separable
(H = MCP/kernel exit; I = attribution), and credits must be complete for the
v0.9 exit. Same protocol: build → Fable-5 review (science-reviewer for the
license/attribution accuracy) → gates (data-sources + tech-bom have their own
validators; ×14 for any new credit strings) → checkpoint push. Small slice;
no new deps, no runtime code beyond one citationKey + colophon render.

Exit: every arc integration in data-sources.json, tech-bom current, all Lab
original work in the colophon, license accuracy peer-reviewed.
