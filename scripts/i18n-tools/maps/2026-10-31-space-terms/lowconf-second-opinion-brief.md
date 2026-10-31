# Second opinion: 11 low-confidence space-term bindings (Orrery glossary)

Orrery (an astronomy/spaceflight education site, repo /work/orrery/main) translates its
editorial content into 13 locales. A glossary fixes ONE binding form per technical term per
language, plus accepted variants (regex stems). A detector (`node scripts/i18n-tools/term-drift.mjs`)
flags every translated field whose English uses the term but whose translation uses neither.

Glossary: `scripts/i18n-tools/native-terms.json`, section `term` (fields: `<loc>` binding,
`_match.<loc>` regex stems, `_confidence.<loc>`, `_sense`). Sources: `sources["term:<term>:<loc>"]`.
Open misses (all trees): `/tmp/claude-1000/-work-orrery-main/d7d0bd49-90bf-49bb-93a1-b2db4e87e888/scratchpad/all-open.json`
(array of {term, loc, where, en, tr}). Translated text: `i18n-src/<loc>/{science,essays,missions,fleet,programs}/**.json`.

The rule (operator): terms as each country's space agency, universities and serious science
press write them. Unsure → search native-language pages (agency sites, university course
pages, national terminology bodies, Wikipedia in that language as a weaker signal). When two
forms are both correct, prefer the one the site already uses most, so fewer edits are needed.

## The 11 entries

| term | loc | current binding | why low |
|---|---|---|---|
| burn (engine firing) | nl | ontsteking | site mixes motorbrand, brand(en), stoot, remstoot; 131 open misses |
| flyby | ar | المرور القريب | no agency page found; 113 open misses |
| flyby | ko | 플라이바이 | site 플라이바이 55, 근접 통과 37, bare 통과 61 |
| flyby | nl | flyby | ESA NL uses flyby; site prefers voorbijvlucht |
| gravity assist | ko | 중력 도움 | not verified against KARI; 67 open misses |
| gravity assist | hi | गुरुत्व-सहायता | no CSTT/ISRO term found |
| burn | ko | 연소 | KARI 엔진 연소; site split 연소 135 vs 분사 78 |
| booster | es | propulsor de apoyo | site mostly "propulsor" |
| booster | pt-BR | propulsor auxiliar | site mostly "propulsor", "booster" 13 |
| orbit insertion | zh-CN | 轨道捕获 | CNSA 火星捕获/近火制动; 入轨 = launch to orbit |
| orbit insertion | nl | baaninsertie | ESA NL uses English "orbit insertion"; site "insertie" 33 |

## What to do (read-only — do NOT edit any file)

For each entry:
1. Count what the site actually uses (grep the locale's i18n-src trees for the candidate forms;
   read ~10 open misses for that term/locale in all-open.json to see what the misses use).
2. Search for native usage. Budget: at most 40 WebSearch calls in total for all 11. Prefer agency
   pages (ESA member-state pages, KARI, ISRO, CNSA/CMSA, AEB/INPE, ESA España), universities, and
   national terminology bodies (CSTT for Hindi, 全国科学技术名词审定委员会 for Chinese, TermCat/Fundéu for Spanish).
3. Verdict, one of:
   - KEEP binding (+ any variants that are also correct and should be accepted stems)
   - CHANGE binding to X (X must be attested; say how many site fields would then need editing)
   - Accept-several: name the forms that are all correct, and which is binding.
   Also say which forms the site uses that are WRONG (e.g. a calque, a wrong sense), with examples.
4. Confidence after your check: high / medium / low, and the source URLs.

Watch for: the burn noun vs combustion (a "burn" here is an engine firing / manoeuvre);
"orbit insertion" (arrival capture burn) vs "insertion into orbit at launch"; flyby as a
mission type vs the act of passing.

## Return

A table: term | loc | verdict | binding | extra accepted forms (as plain words) | wrong forms seen
| confidence | sources. Then 2–4 lines per entry of reasoning. Keep it under 900 words.
