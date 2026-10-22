# Museum research, pass 3 — museum-first, by region, WITHOUT the WebSearch tool (Orrery, PRD-027, 2026-10-22)

Read BRIEF.md in this folder for what counts and the output format, then this file, which overrides it where they differ.

## HARD RULE: do not call the WebSearch tool
This session's web-search budget is used up. Every WebSearch call fails. Use **WebFetch** (and nothing else for the web). Search through sites' own search APIs, which are ordinary pages you can fetch:

- Wikipedia full-text search, in any language (ru, zh, ja, hi, fr, de, it, es, nl, pl, cs, uk, kk, ko, pt, ar, he, en, ...):
  `https://<lang>.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=20&srsearch=<url-encoded words>`
  then read a page: `https://<lang>.wikipedia.org/wiki/<Title>`
- Wikimedia Commons categories (photos of objects in museums are filed by museum):
  `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=14&format=json&srlimit=30&srsearch=<words>`
  and category contents: `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmlimit=200&format=json&cmtitle=Category:<Name>`
- The museum's own website (collection / exhibits / "экспозиция" / "展品" / "展示" pages).
Budget: about 120 fetches. Spend them; finish your region.

## Method: museum-first
1. Build the list of museums in your region that display space hardware: start from Wikipedia lists and categories (e.g. "List of aerospace museums", ru "Категория:Музеи космонавтики", zh "航天博物馆", ja "宇宙博物館", Commons "Space museums in <country>"), national space agencies' visitor centres, science museums, technical museums, air museums with a space hall, university museums. **Small museums count: one real object is enough** (operator).
2. For each museum, find what real space hardware it shows (flown, flight backup/spare, unflown production unit, test article; never replicas/models/mock-ups — skip anything called a model, mock-up, replica, macht, макет, модель, 模型, 模型展示, レプリカ, 模型).
3. Match each exhibit to Orrery's objects in `all_objects.json` (252 objects: ref, name, category, country). An exhibit that matches no Orrery object is NOT recorded. A sub-type counts for its family (e.g. a Soyuz TMA descent module matches the Orrery Soyuz entry whose name fits best; say which unit in "item").
4. Skip pairs already in `known_rows.json` (pass 1 found them), unless you find they are wrong — then add a row with "notes": "contradicts pass 1: ...".

## Geography (operator's priority)
Diversity matters most: China, Japan, India and every country other than the US and Russia, and Europe broadly. Report museums from as many countries in your region as you can find.

## Kinds
flown, flown-part, backup, sister-unit, test-article (see BRIEF2.md if unsure: flown-part = a recovered piece; sister-unit = another unit of the type that never flew and was not that mission's backup). An unflown production engine or stage built to flight standard = backup.

## Evidence
Prefer the museum's own page; Wikipedia/Commons is acceptable as evidence only with status "uncertain" unless it names the specific unit and its current display. Open every page you cite.

## Output
JSON to the path in your task, same shape as BRIEF.md, with one extra top-level key: "museums_checked": [ { "id", "name", "city", "country", "result": "rows added N" | "no real Orrery hardware" | "could not read site" } ] — so the operator sees coverage, including museums with nothing. "none" is not needed in this pass.
Final reply: 4 lines max — museums checked, museums with ≥1 row, rows by kind, countries covered, output path.
