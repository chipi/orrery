# Observatory research (PRD-028, 2026-10-22)

For each site in your list, produce one entry. HARD RULE: do not call WebSearch (budget exhausted); use WebFetch only:
- Wikipedia API (any language): `https://<lang>.wikipedia.org/w/api.php?action=query&prop=coordinates|extracts&explaintext=1&exintro=1&redirects=1&format=json&titles=<Title>` and search `...&list=search&srsearch=<words>`.
- Wikidata: `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=<name>&language=en&format=json`, then `action=wbgetentities&ids=<Q>&props=claims` (P856 official website, P625 coordinates, P1619 date of official opening / P606 first light if present).
- The observatory's own website.
Open every page you cite.

Per site:
- `id` (kebab-case, given in your list), `name` (English, as the observatory names itself), `place` (site/mountain + region, e.g. "Socorro, New Mexico"), `country` (ISO-2), `lat`, `lon` (4 decimals; the telescope site, not the city), `website` (official, https; check it is the operator's real site), `kind` (radio | optical | deep-space | seti), `status` (active | historic | building), `first_light` (YYYY or YYYY-MM-DD, if known), `description` (1–2 plain sentences: what it is and what it observes), `highlights` (2–3 short sentences: famous firsts / discoveries / roles, each a fact you saw in a source), `science` (1–4 paths from science-articles.txt in this folder that this site genuinely illustrates — e.g. interferometry for arrays, spectroscopy, radial-velocity/fifty-one-pegasi for Haute-Provence, black-holes for EHT stations (ALMA, LMT…), are-we-alone for SETI; only paths that exist in that file), `films` (only "contact" for the VLA and Arecibo, only "the-dish" for Parkes; nothing else — no action films), `film` (one sentence if films is set, e.g. "Parkes is the dish in The Dish (2000), the story of how it relayed the Apollo 11 moonwalk television."), `evidence` (the main source URL).
- Facts only from sources; no superlatives you did not see in a source; dates and numbers exact.

Write JSON to the path in your task: `{ "observatories": [ ...entries... ], "notes": "anything unsure" }`. Final reply: 3 lines max — count, any site you could not confirm, output path.
