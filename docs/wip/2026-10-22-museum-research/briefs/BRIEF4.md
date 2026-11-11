# Museum research, pass 4 — geography (Orrery, PRD-027, 2026-11-09)

Read BRIEF.md (what counts, output shape) and BRIEF3.md (museum-first method, kinds, evidence,
`museums_checked`) in this folder. This file overrides them where they differ.

## Search tools
- WebSearch is allowed, up to the cap in your task (the session's 200 searches are shared by
  every agent). When a WebSearch call fails or your cap is reached, carry on with WebFetch
  only, through the site search APIs listed in BRIEF3.md. Do not stop because search ran out.
- Search in the region's own languages (zh, hi / English for India, ja, ko, es / pt, ar, th,
  vi, id, tr, fa, …). Pass 3 could not read most Chinese and Indian museum sites; try their
  mobile pages, WeChat-mirrored articles, the government / agency news pages, and Baidu Baike
  as a lead (cite it only with status "uncertain").

## Scope
- Your region only (given in the task). Operator's rule: if a museum has even a single real
  Orrery object, it goes on the list. Small museums, university museums, agency visitor
  centres and science centres count.
- Skip museum + object pairs already in `merged.json` `rows` (match on `museum` id and `ref`),
  unless you find they are wrong — then add a row with `"notes": "contradicts merged: …"`.
- Reuse the museum id from `merged.json` `museums` when the museum is already there.
- Objects: `all_objects.json` (252 refs). An exhibit that matches no ref is not recorded.

## Output
`raw/out4_<region>.json`, BRIEF3.md shape (`museums`, `rows`, `museums_checked`). Rows
without a museum page that names the unit stay `"status": "uncertain"`.
