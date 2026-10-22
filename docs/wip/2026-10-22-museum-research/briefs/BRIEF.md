# Museum research brief (Orrery, PRD-027, 2026-10-22)

Goal: for each object in your input list, find museums ANYWHERE in the world where a REAL unit of that object is on PUBLIC display NOW.

## What counts
- kind "flown": the actual unit that flew (e.g. Apollo 11 CM Columbia; Soyuz TMA-xx descent module; a flown space suit worn on a mission).
- kind "backup": a real flight backup / flight spare / unflown flight article built to flight standard (e.g. Vostok backup capsule, Skylab backup, an unflown production F-1 engine, a production rocket stage that never flew).
- kind "test-article": a real engineering / qualification / test article (e.g. Galileo engineering model, structural test article, a ground-test Buran OK-GLI). Record it as test-article; the operator decides later whether these count.
- NEVER record replicas, mock-ups, scale models, "full-size models", reproductions. If a source says replica/model/mock-up, skip it.
- If the source does not make clear whether it is real, skip it (do not guess).
- The object type is a CLASS for many entries (e.g. "Apollo CSM Block II", "Soyuz"): any real unit of that class counts; name the unit in "item".
- For the 4 /science/history/<slug> pages: the real historic artefact of that event (e.g. Apollo 11 CM, a Sputnik flight backup, Goddard's rocket, Tsiolkovsky's own instruments/workshop) — same rules.

## Evidence
- Each row needs a URL that shows the item is on display at that museum, preferably the museum's own collection/exhibit page; otherwise a reliable recent source. Search in the object's origin language too (Russian for Soviet/Russian hardware, Chinese for Chinese, Japanese, Hindi/English for Indian, etc.).
- Prefer evidence that says it is on display NOW (objects move: loans, tours, storage). If the only evidence is old (before ~2018) or says "in storage", put it in "notes" with status "uncertain".
- Open the evidence page (WebFetch) to confirm what it says; do not cite a page you have not read.

## Limits
- At most 8 museums per object; if more exist, add a note "more exist (N+)".
- Budget: aim for breadth; ~2-4 searches per object. Many objects will have NO museum (still flying, lost, destroyed, on another world). That is a normal result: record them with an empty list.

## Output
Write ONE JSON file (path given in your task) with this shape, and nothing else in it:
{
  "museums": { "<museum-id kebab-case>": { "name": "...", "city": "...", "country": "ISO-2", "website": "https://official-site" } },
  "rows": [
    { "ref": "<object ref from input>", "museum": "<museum-id>", "item": "which unit, e.g. 'Command module Columbia (Apollo 11)'", "kind": "flown|backup|test-article", "evidence": "https://...", "status": "confirmed|uncertain", "notes": "" }
  ],
  "none": ["<refs with no qualifying museum found>"]
}
Every input ref must appear either in rows or in none. Use stable museum ids so different agents can merge (e.g. "nasm-washington", "udvar-hazy", "kennedy-space-center-visitor-complex", "space-center-houston", "memorial-museum-of-cosmonautics-moscow", "tsiolkovsky-museum-kaluga", "technik-museum-speyer", "musee-air-espace-le-bourget", "deutsches-museum-munich", "science-museum-london", "national-space-centre-leicester", "cite-de-l-espace-toulouse", "us-space-and-rocket-center", "california-science-center", "intrepid-museum", "china-science-and-technology-museum", "rkk-energia-museum-korolev", "central-air-force-museum-monino").

Final reply to your caller: 5 lines max: counts (objects, objects with ≥1 museum, rows, flown/backup/test-article split, uncertain), and the output path. No other prose.
