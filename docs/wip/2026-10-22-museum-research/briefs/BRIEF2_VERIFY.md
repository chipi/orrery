# Museum research, pass 2: verify rows (Orrery, PRD-027, 2026-10-22)

Read BRIEF.md and BRIEF2.md in this folder first (rules on what counts, kinds incl. flown-part and sister-unit, evidence). Your input file has "rows" found in pass 1 that need checking: they are uncertain, cite only Wikipedia, or are engines/launch vehicles labelled test-article.

For EACH row:
1. Open the evidence. Find the museum's own page for that object if one exists and cite it instead of Wikipedia.
2. Settle the kind: for engines and rocket stages, an unflown PRODUCTION unit built to flight standard is "backup"; a ground-test / development engine is "test-article"; a recovered flown engine or stage is "flown" (or "flown-part" if only part of it).
3. Is it on display NOW? If the only evidence is old or says storage / loan ended, status "uncertain" with a note; if it is gone, drop it.
4. If it turns out to be a replica / mock-up / model, drop it.
5. Check the museum's "website" is the museum's official site.

Output JSON (to the path in your task):
{ "museums": { ...as BRIEF.md, only ids used below... },
  "rows": [ { ...same fields as BRIEF.md..., "action": "keep|fixed|dropped", "why": "short reason" } ] }
Every input row must appear once (dropped rows too, with action "dropped").
Budget about 200 web searches/fetches in total. Final reply: 4 lines max — rows in, kept, fixed, dropped, still uncertain, output path.
