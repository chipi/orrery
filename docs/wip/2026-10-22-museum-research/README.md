# Museum research for PRD-027 / #617 — state on 2026-10-22

Where the "See it in a museum" research stands, so the next session can pick it up cold.
The plan and rules are in [PRD-027](../../prd/PRD-027.md) (accepted 2026-10-22, option A:
museums become a fleet category `museum`).

## Where things are

- **Review page (operator ticks Yes/No per row):**
  <https://claude.ai/artifact/VxPpzuU4gvv9tVvwMWibs6> (private to the operator, version 2).
  Decisions are stored in that artifact's database, collection `decisions`, one document per
  row: id = the row's `id` (below), body `{ d: "yes" | "no", at: ISO time }`. Read them with
  the `ArtifactData` tool, `action: "list"`, `collection: "decisions"`.
- **Data in this folder:**
  - `merged.json`: the master table. `museums` (id → name, city, country, website) and
    `rows` (ref, museum, item, kind, status, evidence, notes). 198 rows, 73 objects,
    79 museums, 19 countries. Hand fixes go here (the Endeavour rows were edited after the
    merge, see below).
  - `all_objects.json`: the 252 Orrery objects researched (fleet entries minus launch sites,
    plus the 4 `/science/history` pages).
  - `raw/`: every agent output as written (`out_g*` pass 1, `out3_*` pass 3, `pass1.json`),
    for audit. `raw/out3_*.json` also carry `museums_checked` (the museums checked that gave
    no row).
  - `briefs/`: the research rules the agents followed (`BRIEF.md` what counts, `BRIEF2.md`
    kinds and languages, `BRIEF3.md` museum-first without WebSearch, `BRIEF2_VERIFY.md`).
  - `tools/`: rebuild the review page from `merged.json`:
    `node tools/pagedata.mjs <this folder> <outdir>` then `node tools/build.mjs <outdir>`,
    then publish `<outdir>/museum-review.html` to the same artifact URL. Row ids are a hash of
    ref + museum + item, so editing a row's `item` gives it a new id (its tick is lost).

## What was done

| Pass | How | Result |
| --- | --- | --- |
| 1 | 6 Sonnet agents, WebSearch, by object category | 129 rows; used the session's whole search budget |
| 2 | 16 agents | failed: WebSearch budget exhausted; stopped |
| 3 | 10 agents, museum-first by region, WebFetch only (Wikipedia/Commons search APIs, museum sites) | 73 new rows; 85 pass-1 rows verified (49 kept, 33 fixed, 3 dropped) |
| fix | operator, 2026-10-22 | Endeavour: Samuel Oschin Air and Space Center, California Science Center, Los Angeles; grand opening 13 Nov 2026 (status `opens 2026-11-13`) |

Kinds: flown, backup, flown-part, test-article, sister-unit. Status: 87 confirmed, 109
uncertain (mostly Wikipedia or a photo only, because the museum's own site blocked the
fetch), 2 `opens 2026-11-13`.

## What is left

1. **Operator ticks the review page**, and answers its five questions: do test articles,
   flown parts and sister units get a button; where the Soyuz 7K-T capsules go (no Orrery
   entry; agents mapped them to `soyuz-t` or `soyuz-7k-ok`); the Mars-3 / Venera-4 (Moscow,
   Kaluga) and Buran OK-ML1 source conflicts.
2. **Pass 4, geography (operator's priority: "if a museum has even a single thing, put it
   on the list").** Coverage is thin outside the US: 36 of 79 museums are American; China 5,
   Japan 5, India 1, nothing in Latin America, Africa or most of Southeast Asia. Pass 3 could
   not read most Chinese and Indian museum sites. A fresh session has a fresh WebSearch budget
   of 200. Plan: spend it on the main thread (subagents share the same budget), about
   China 60, India 50, Japan + Korea 30, rest of Asia / Latin America / Africa 40,
   uncertain rows 20. Write results as `raw/out4_<region>.json` in the `BRIEF.md` shape,
   append to `merged.json`, rebuild and republish the page.
3. Then PRD-027 step 3 (build) for the ticked rows.

## Gotchas found this session

- **WebSearch has a budget of 200 calls per Claude Code session, shared by all subagents.**
  Pass 1's six agents each reported "200/200"; it was one shared budget. Plan fan-outs
  around it. A setting `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` was named by an agent; it
  is unverified.
- **Many museum sites return 403 to automated fetches** (California Science Center,
  Ingenium, Cité de l'espace, most Chinese and Indian sites). Wikipedia/Commons via their API
  works; record such rows as `uncertain`.
- **Wikidata** (`P195` collection / `P276` location on spacecraft, rockets, engines, suits)
  gives only ~90 objects, many "located" on the Moon or Mars; useful for a few leads only.
- Agents mis-state their own counts; check every output file with a script before trusting
  a report.

## Observatories (PRD-028), 2026-10-22

Same method, same session. `observatories/` holds the brief, the science-article list the
agents chose links from, and the three agent outputs (`out_radio_seti.json`,
`out_arrays_dsn.json`, `out_optical.json`). They were merged into
`static/data/observatories.json` + `i18n-src/en-US/observatories/` with hand corrections
(Arecibo's firsts, Paranal's first direct image = 2M1207b in 2004, La Silla's Proxima b,
Haute-Provence 1995, links to the new `detecting-extraterrestrial-life` article; the Rubin "survey began
July 2026" claim removed as unconfirmed). 34 observatories, 15 countries.

Not verified from here: the official sites of SALT and ESO (no response / 503 at the time),
Arecibo's naic.edu (expired TLS certificate; kept as the official site), and the LMT's own
site (TLS failure; the operator INAOE's site is linked instead). Translation brief:
`briefs/TRANSLATE3.md`; checker: `tools/check-obs.mjs`.
