# Space terminology glossary — pilot (2026-10-31)

Operator, 2026-10-31: the spot check showed *burn* rendered as braking, combustion
or ceramic firing; "are there more words like that?" There were.

## What the glossary had

`scripts/i18n-tools/native-terms.json` held 779 entries, all names (people,
stars, bodies, surface features, places, facilities, agencies). The style guide's
term tables (§3, §4: 25 terms) were filled in only for Spanish. For 12 of 13
locales no technical term had a binding form.

The English content (essays, science, missions, fleet, programs) uses 182 of 192
common space terms, 152 of them 5+ times and 72 of them 20+ times.

## Pilot: 20 terms × 13 locales

orbit, trajectory, inclination, rendezvous, docking, gravity assist, delta-v,
apogee, perigee, burn, stage, propellant, payload, thrust, booster, specific
impulse, flyby, orbit insertion, entry (atmospheric), descent.

- **Research:** four Sonnet agents, one per language group, each with at most
  10 web searches. Forms come from agency usage and terminology bodies
  (FranceTerme, CSTT, CNES, ISRO Hindi pages, …), the site's own majority usage,
  and textbook usage. 11 of 260 locale entries are low confidence (listed in
  `_confidence`).
- **Glossary:** new `term` section. Each entry has the binding form per locale,
  `_match` stems (inflections and accepted variants), the `_en` sense pattern
  and `_confidence`. Replace scripts do not read it; terms inflect.
- **Tools:**
  - `scripts/i18n-tools/term-contexts.mjs` prints aligned English/locale pairs
    for a term.
  - `scripts/i18n-tools/term-drift.mjs` gives the share of aligned fields that
    use the binding form, per term × locale, plus the list of misses.
- **Test:** `scripts/i18n-tools/term-glossary.test.ts` checks that every entry
  is complete, its stems compile, and its binding form matches its own stems.
  It caught two stems that could never match: JavaScript `\b` is ASCII-only.

## Baseline (after removing detector artifacts)

4,775 aligned fields do not use the binding form: science 1,317, essays ~450,
missions ~1,880, fleet ~775, programs ~330.

A miss is an upper bound, not an error count. Some misses are acceptable short
forms or rephrasings: Italian "carico" for payload, French "propulseurs …
accolés" for boosters. Each one needs a judgement.

Lowest cells, the drift the agents also saw in context:

- *burn*: 36–51 % in nl, ar, hi, fr, zh-CN. The renderings include braking,
  combustion, skin burn, a burner device, and ceramic firing (zh 烧制).
- *gravity assist*: 28–66 % in ko, zh-CN, ar, sr-Cyrl, fr, es, it, nl, pt-BR.
- *orbit insertion*: 29–58 % in ar, de, nl, hi.
- *payload*: 46–67 % in it, pt-BR, es, fr, ru.
- *booster*: 40–58 % in fr, sr-Cyrl, ar. French "booster" is left in English;
  Serbian uses "потисник", which means thruster.

## Next

1. A fix round on science: per locale, review each miss (keep or change to the
   binding form) and apply minimal edits through `apply-edits.mjs`, which checks
   quality. Then re-measure.
2. Second opinion on the 11 low-confidence entries. Serbian choices go to the
   operator.
3. Then essays, missions, fleet, programs; then the next ~130 terms.

## Later: a Glossary page

Operator idea, 2026-10-31: a `/glossary` page (terms, definitions, and a reverse
index of the pages that use each term), built from this section. It is the last
item of Phase 6, reassessed after the pilot.

## Round 1 result — science (2026-10-31)

- **Review:** 1,133 science fields reviewed per locale by five Sonnet reviewers
  (keep / minimal change). Each change list was read before applying.
- **Dropped edits:** edits that replaced correct standard usage were dropped and
  the glossary widened instead: nl "terugkeer" and "daaltrap", sr "повратак у
  атмосферу" and "прикључни прстен". 26 nl and 12 sr edits, plus a few added
  clauses in fr, pt-BR and ru.
- **Applied:** 565 field edits, 0 refused by the quality checks.
- **Retranslated:** seven machine-garbled pages, retranslated by hand
  (dead-reckoning, star-trackers and space-photography in fr/pt-BR;
  dead-reckoning in ru/ja; star-trackers and lagrange-points in zh-CN).
- **Small fixes:** a pt-BR number (thousands → hundreds of kN), ru and sr
  typos, an ar link.
- **zh-CN:** full-width punctuation, 1,600 marks.
- **New guard:** `scripts/i18n-tools/link-targets.test.ts` checks that
  translated fields keep the English link targets.
- **Stems:** made inflection-tolerant for Latin-script locales (plurals were
  counted as misses).

Science misses: **1,317 → 656**. Most remaining cells are 90–100 %. What is left:
reviewer "keep" decisions (pronouns, verbs of *orbit*, combustion senses of
*burn*, spacecraft parts such as "descent module"), the 113 low-confidence pairs
held back (nl burn 44 %, ko gravity assist 60 %, ar flyby 55 %, nl orbit
insertion 69 %), and stem gaps still to widen (ar re-entry "العودة", pt-BR
gravity assist 53 %).

## Round 2 result — science closed (2026-10-31)

- **Keeps are recorded.** `term-keeps.json` holds each reviewed miss with the hash of the
  text judged, and `term-drift.mjs` counts it as covered while the text is unchanged.
  An edit brings it back: this caught a Dutch field whose *orbit* keep went stale after
  a *burn* fix.
- **Keep reasons exposed stem gaps.** 149 of the 574 round-1 keeps meant "the
  binding form, inflected", so the stems were too narrow, not the text. Cases: ru
  перигее, ar indefinite and prefixed forms, ar vowel marks, ko particles, nl
  compounds, hyphenated charge-utile. The stems were widened (matching now ignores
  Arabic vowel marks). The fields that newly matched without a review were read: all
  correct. 425 + 49 keeps recorded.
- **Second opinion on the 11 low-confidence bindings:**
  - **Bindings changed:**
    - ar flyby → التحليق القريب: the site's majority form, used by ar.wikipedia and MBRSC.
    - es and pt-BR booster → propulsor: "propulsor de apoyo/auxiliar" is unattested and
      appears 0 times on the site.
    - zh-CN orbit insertion → 制动捕获: CNSA's 近火/近月制动. 轨道插入 stays accepted, unsettled.
    - es orbit insertion → inserción orbital, to agree with the style guide §4.
  - **Variants accepted:** the rest.
  - **One reviewer verdict overruled:** nl noun "brand"/"motorbrand" means a fire, so it
    is not accepted for a burn. Only the verb ("de motor brandt") is accepted.
- **Fixes:** 17 field edits: nl "brand" → ontsteking (9), ar الاقتراب/عبور → تحليق (5),
  ko 스윙바이 used for a flyby → 플라이바이 (3). Also the hand fixes for the fr Oberth
  intro (garbled, half missing) and "at real thrust" restored in ru/fr/pt-BR.

- **Widen check** (`term-widen-check.mjs`): 607 fields across all trees passed only under
  the widened stems and had never been reviewed. Grouped by matched word, almost all were
  correct (ru case endings, ko particles, nl aardbaan/maanbaan, pt plurals). The open nl
  compounds hid 9 real errors in missions, fleet and essays: "lanchbaan" for *launch pad*,
  "ontbaan", "polaairbaan", "haloaanbaan", "afdaalingstrap … hertoetrad", "INBAAN", and
  two fleet descriptions garbled throughout (Clementine, Lunar Prospector), retranslated
  from the English. The nl compounds are now an explicit list.

Science misses: **656 → 0 unreviewed**. The operator confirmed all 20 Serbian forms and
accepted «уз помоћ гравитације» next to «гравитациони маневар». Science is now gated:
`term-glossary.test.ts` fails on any new unreviewed miss.

All trees: 2,689 unreviewed (essays 380, missions 1,473, fleet 578, programs 257).

## Essays round (2026-10-31)

- **Detector fix first:** markdown link targets and image paths no longer count as text.
  That removed 46 false misses, and stops a translation passing on an English link target.
- **Review:** 379 misses, four Sonnet reviewers by language group, every change list read.
  - Applied: 154 field edits in 13 locales, 0 refused. Examples: ja デルタ・ブイ → デルタV (27);
    nl drijfgas → drijfstof (16); ar bare الوقود → الوقود الدافع (19) and دلتا-ف → دلتا-في;
    hi अवतरण → अवरोहण where the English is *descent*, since the glossary keeps अवतरण for
    landing; sr «гравитациони поспешитељ» → «гравитациони маневар»; engine-burn "combustion"
    and "Brand" in fr, it, de and nl → allumage, accensione, Zündung, ontsteking.
  - Dropped or changed:
    - "no chemical burn could reach" is combustion, so the change was dropped in de, es, nl,
      ar and sr.
    - zh-CN standard 轨道 compounds were kept (自由返回轨道, 轨道修正, 中止轨道, 双曲线轨道).
    - ko 탈출 궤도 was kept.
    - de "während der Zündung" became "während der Brennphase".
    - nl "het meeste drijfstof" became "de meeste".
    - Two sr grammar slips were fixed.
  - Keeps: 149 recorded. Plain orbit verbs and other recurring variants went into the stems
    instead (widen check: 48 fields, all reviewer-named forms).
- **Essays: 379 → 0 unreviewed, gated** next to science.

### zh-CN trajectory, settled

A second opinion found 轨道 to be the standard for a spacecraft trajectory, citing CNTERM
航天科学技术名词 (航天器轨道; 弹道 for launch-vehicle and ballistic paths), CNSA/CMSA and
journals (自由返回轨道, 地火转移轨道, 中途修正). 轨迹 is the locus sense. The binding is now 轨道.
轨迹 stays accepted for a computed or plotted path (43 existing fields, medium confidence).
A new `_avoid` list flags 自由返回轨迹, 轨迹修正 and 转移轨迹. Rounds 1 and essays had changed 29
fields 轨道 → 轨迹 under the old binding; all 29 were reversed and 6 more compounds fixed.

## Programs round (2026-10-31)

224 misses, four reviewers, every list read. 114 field edits in 13 locales, 0 refused:
- nl: dokken / aanmeren → koppeling; passage → flyby; "baaninsertieverbanding" (garbled) fixed.
- sr: «састајања» → «сусрети»; «помоћни ракетни мотор» → «ракетни појачивач».
- pt/it/es: bare carga / carico → carga útil / carico utile.
- hi: अवतरण → अवरोहण in EDL labels and for the descent module.
- ar: عابرة / عبور → التحليق القريب; ترسو (mooring) → تلتحم.

Adjusted: nl uses zwaartekrachtassist (the site majority, accepted) instead of a third
spelling; fr arrimer is kept (stem widened); ar verb agreement. Arabic «اللقاء المداري» was
aligned with the essays' «الالتقاء» (4 fields). 97 keeps. **Programs: 0 unreviewed, gated.**

## Fleet round (2026-10-31)

535 misses, five reviewers, every list read. 334 field edits in 13 locales, 0 refused, plus
170 keeps.
- nl: non-Dutch stage words (boventrip, kernfase, stadium …) → trap; zwaartekrachtsondersteuning
  → zwaartekrachtassist.
- it/es/pt: payload left in English, or as a bare carico / carga → carico utile / carga útil.
- fr/es: carburant / propulsor → propergol / propelente; es estadio → etapa.
- hi: transliterations (रेंडेज़्वस, एपोजी, इंक्लिनेशन, अपर स्टेज) → मिलन, अपभू, झुकाव, ऊपरी चरण.
- ar: bare الوقود → الوقود الدافع (22); reentry as bare العودة → العودة إلى الغلاف الجوي.
- ko/ja/zh: flyby as a generic pass → 플라이바이 / フライバイ / 飞掠; zh 引力助推 → 引力辅助 (the
  site majority, 78 vs 16).

Adjusted:
- fr "propulseur d'appoint" for the Atlas (a whole launcher) → "lanceur".
- hi सूर्य-स्थैतिक (sun-static) → सूर्य-तुल्यकालिक.
- An ar stem that matched «التقاط» (capture) was narrowed.

**Fleet: 0 unreviewed, gated.** The reviewers also reported a lot of garble outside the
terms, worst in nl fleet. It is collected in `2026-10-31-fleet-garble-findings.md` for a
separate pass.

All trees after essays: 2,142 unreviewed (missions 1,378, fleet 538, programs 226).
All trees after fleet: 1,350 unreviewed, all in missions.

## Missions round (2026-10-31) — the pilot is complete

1,350 misses in 1,292 fields, eight reviewers, every list read. 998 field edits in 13 locales,
0 refused (checked by `term-apply-check.mjs`), 231 keeps.
- Burn as combustion, a skin burn or a loanword (fr brûlure/combustion, it ustione/bruciatura,
  ar حرق, hi बर्न, ja バーン, ko 번/소각 (incineration), nl brand/verbranding, de Abbrand) →
  the engine-firing binding.
- Orbit insertion as "insertion of the orbit" (de Einfügung/Orbitalisierung, fr/pt "de l'orbite",
  ar إدراج المدار, hi सम्मिलन, ko 궤도 삽입) → the binding.
- Facts: zh-CN, ja, ko and ar notes had **perigee written for apogee** (OTV-1/2/3/4/6); hi had
  अपसौर (aphelion) for apogee.
- Flyby as a generic flight or pass, and English left in `type` labels, in ja/ko/zh/sr/pt/it.

Adjusted:
- hi burn noun → दहन (the site's form, 221×) instead of the reviewer's प्रज्वलन.
- nl gravity assist → zwaartekrachtassist, now also the binding (reviewers kept re-introducing
  the minority "slinger").
- ko 궤도 수정 / 자유복귀 궤도 kept as standard.
- sr ПАЛЕЊЕ → ПАЉЕЊЕ in the whole label.
- ar agreement after حرقة → إشعال.
- nl Schiaparelli label fully translated.

**All five trees: 0 unreviewed term misses, all gated** (`term-glossary.test.ts`).

Totals for the 20-term pilot: about 2,200 field edits and 1,122 recorded keeps; science
1,317 → 0, essays 380 → 0, programs 226 → 0, fleet 538 → 0, missions 1,350 → 0.

Found on the way, not part of the term work:
- English fact, fixed: Pioneer 10's RTG power read "25 W at launch"; it is ~155 W (NASA PDS Pioneer 10 spacecraft description). Corrected in all 14 locales and `static/data`.
- Garble and grammar slips outside the terms, collected in
  `2026-10-31-fleet-garble-findings.md`.

Next: missions with the `term-consistency` skill, then the next batch of
terms from `term-census.mjs`.
