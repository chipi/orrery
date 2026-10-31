# Garble pass — origin, measurement, fix (2026-10-31)

Operator, 2026-10-31: "we need to understand the garble before we go fix it", and the fix must
not undo the term work of the past days. Findings that started this:
[2026-10-31-fleet-garble-findings.md](2026-10-31-fleet-garble-findings.md).

## 1 · Origin

**Method:** `git log -S` on 36 garbled strings the term reviewers reported, to find the commit
that introduced each one (traced past the 2026-07-07 file move from `static/` to `i18n-src/`).

| When | Run | Share of the 36 | What it did |
|---|---|---|---|
| 2026-05 | first translations: wave-2 locales, fleet overlays (`067d1d06b5b`, `5a6dedebd78`, `71216ee8b53`) | ~25 % | Early machine output: it "lavanda Philae" for the lander, "barca a vita"; ja 十万吨 |
| **2026-07-14** | **fact-check pass** (`7d295341b42` fleet + sites, `d13c1ee992b` programs/missions/science/essays): English corrected, then whole fields re-translated into 13 locales by `translate-i18n-gaps.mjs` | **~45 %** | **Haiku 4.5, no quality checks, and a length rule: "drop a clause or a non-essential detail", then `out.slice(0, limit)` as a hard cut.** Nearly all the nl non-words (kruisfoortdrijving, vlaggenschipbissies, suborbiale), cut sentences, "Saturnus V" |
| 2026-10-17 | our own cleanup: the names passes and the audit (`6c5230936b4`, `39f8c99b3d4`, `808082a7452`, `8e81618bfc5`) | ~15 % | Wrong name forms (es Teutates, zh 梅西尔德星 for Mathilde, 戈尔登·库勃 for Gordon Cooper) and a few garbles (nl humaan-gerateerde, ru внекосмическим) |
| other content waves | programs, engines, Artemis | ~15 % | scattered |

**How much text is still from the unchecked runs**, measured with a line-level `git blame` of
fleet and missions:

- **nl, fr, it, es fleet:** about 60 % still dates from May–Jul 14.
- **ru, ja, zh, ko, sr fleet:** about 20–25 %. Those locales were largely rewritten in the October
  cleanup (sr was retranslated in full as tier A).
- **Missions, all locales:** about 50–55 %.

**Still live on 2026-10-31, fixed in `1af0088bb1e`:**

1. The gap translator's "drop a clause" rule and hard cut. A field over its cap is now refused,
   and the English gets shortened instead.
2. No translator received the technical-term bindings. `termNotes()` now adds them to every
   prompt, and the CI term gate checks the result.

## 2 · Measurement

`scripts/i18n-tools/garble-sample.mjs` draws, per locale × tree, only fields whose text was last
written on or before 2026-07-14 (≥ 40 characters of English), 25 per cell, seeded.

Pool sizes (fleet + missions):

| Locales | Pool |
|---|---|
| nl, fr, es, it | ~770–890 each |
| pt-BR | 582 |
| de | 540 |
| ru, ja, zh-CN, ko, hi, ar | ~280–385 each |
| sr-Cyrl | 13 |

Total about 6,500 fields.

Four Sonnet reviewers grade the sample OK / MINOR / BROKEN with a defect kind
([brief](../../scripts/i18n-tools/maps/2026-10-31-garble-pass/grade-brief.md)). Results below.

### Results (613 fields graded, 2026-10-31)

OK / MINOR / BROKEN per 25-field cell (sr-Cyrl: the whole pool, 6 + 7). "Est. BROKEN" is
the BROKEN rate times the cell's pool, rounded.

| Locale | Fleet | Pool | Missions | Pool | Est. BROKEN |
|---|---|---|---|---|---|
| **nl** | **8 / 10 / 7** | 445 | 13 / 11 / 1 | 388 | **~140** |
| **it** | **16 / 4 / 5** | 424 | 20 / 5 / 0 | 468 | **~85** |
| **hi** | 15 / 7 / 3 | 230 | 14 / 7 / 4 | 155 | ~50 |
| **ko** | **20 / 0 / 5** | 104 | 19 / 6 / 0 | 183 | ~20 |
| fr | 17 / 8 / 0 | 429 | 20 / 4 / 1 | 436 | ~17 |
| ar | 16 / 9 / 0 | 140 | 18 / 5 / 2 | 164 | ~13 |
| ru | 25 / 0 / 0 | 94 | 22 / 2 / 1 | 279 | ~11 |
| ja | 18 / 5 / 2 | 116 | 21 / 4 / 0 | 205 | ~9 |
| zh-CN | 18 / 6 / 1 | 120 | 21 / 4 / 0 | 159 | ~5 |
| sr-Cyrl | 3 / 3 / 0 | 6 | 6 / 0 / 1 | 7 | 1 (exact) |
| de | 25 / 0 / 0 | 123 | 15 / 10 / 0 | 417 | 0 seen |
| es | 22 / 3 / 0 | 391 | 22 / 3 / 0 | 375 | 0 seen |
| pt-BR | 25 / 0 / 0 | 128 | 19 / 6 / 0 | 454 | 0 seen |

Total: about 350 BROKEN fields among the ~6,500 unchecked ones (~5 %).

What the numbers say:

- **Three fleet cells reach the `i18n-audit` re-translate bar** (BROKEN ≥ 20 %): nl (28 %, and
  68 % BROKEN + MINOR), it (20 %), ko (20 %).
- **Defects sit in short fleet fields**: taglines, `best_known_for`, short descriptions.
  Long mission notes are mostly clean.
- **The kinds**:
  - English left in: it "roam", nl "Carryed the Pioneer geplaqueerd".
  - Non-words: nl "mesochaotische", ru "периовий", sr "определјивање".
  - Wrong-sense terms: ko 잠수함 (submarine) for suborbital, nl "maandag" for lunar day, hi
    "वसूली" for recovery, ar "حيود" (diffraction) for fluorescence.
  - Cut sentences.
- **The term reviewers' findings overstated the problem in some locales and understated it in
  others.** They saw only fields that already failed a term check. On a random draw, de, es and
  pt-BR show no BROKEN items at all, and ko fleet is as bad as it fleet.

What the numbers do not say:

- **A 0 in 25 is not a 0.** The 95 % upper bound for 0 / 25 is about 12 %. de, es and pt-BR
  could each still hold a few dozen BROKEN fields.
- **The pool covers only fields untouched since 2026-07-14.** Fields rewritten later (the
  October cleanups, the term rounds) were not sampled. The term rounds read those fields for
  terms, not for garble.
- **Not measured:** science, essays, programs and the other trees.
- **One grader per locale**, with no second opinion. Borderline hi and ar term choices were
  graded OK.

## 3 · Fix method (agreed with the operator)

1. **Retranslate whole broken fields from the English**, never patch them, with the term
   bindings, the names glossary and the term-consistency `lessons.md`. Free route (in-session
   reviewers), no paid run.
2. **Guards before every commit:**
   - the term gate (0 unreviewed misses), the name-drift scan, `link-targets.test.ts`,
     `problems()`, the validate-data length caps and `term-apply-check`;
   - fields touched by the term rounds are retranslated only if graded BROKEN, and keeps whose
     text changes come back for review automatically;
   - every change list is read side by side.
3. **One commit per locale × tree**, so any of it can be reverted cleanly.
4. **Pilot:** nl fleet, measured before and after, then a decision with the operator on how wide
   to go.

## 4 · Pilot: nl fleet (2026-10-31)

**The round:**

1. **Work file.** `garble-sample.mjs <dir> --per=all --locales=nl --trees=fleet` gave 445 fields,
   128 of them with term bindings.
2. **Fix reviewers.** Three Sonnet reviewers worked through the file with
   [fix-brief.md](../../scripts/i18n-tools/maps/2026-10-31-garble-pass/fix-brief.md), about 150
   fields each, writing every retranslation by hand.
3. **Check.** `garble-check.mjs` checked the decisions and wrote the edits.
4. **Read.** I read all 323 changes against the English.
5. **Apply.** `apply-edits.mjs` applied them.

Inputs and decisions: `scripts/i18n-tools/maps/2026-10-31-garble-pass/nl-fleet/`.

| | Fields |
|---|---|
| Kept (graded OK) | 122 |
| Retranslated | 323 (193 MINOR, 130 BROKEN; the sample predicted 28 % BROKEN, the full read found 29 %) |
| Applied | 322; 1 refused by `problems()` (Venera 7 description: the English template "Venera 7-class", left for the English fix below) |
| Flagged by `garble-check` | 10, all fine on reading: decades written out ("jaren 80"), "burn" or "payload" used in another sense, and Chang'e-5's "1,731 kg", which is right because the English 1.731 kg is a decimal |
| Hand-fixed after reading | 18 in 16 fields: "comsats" left in English, two gender slips, "Chinas", dates switched from ISO to dd-mm-yyyy, "Almaz-militairstation", "Saturnus" for the Saturn rocket, "ooit" for "at all" |
| New term keeps | 4 ("methane-burning", "hydrogen-burning", "burning propellant", "hosted payload" → gastlading) |

**Gates:**

- `term-drift --gate`: 0 unreviewed misses.
- `name-drift-scan nl`: 0.
- `link-targets` and `term-glossary` tests: 25 passed.
- `validate-data`: 12,524 files passed. Two taglines first came out over 140 characters because
  of my hand fixes; I shortened them.

**Before / after** on the same 25 sampled fields, graded by a fresh Sonnet grader:

| | OK | MINOR | BROKEN |
|---|---|---|---|
| Before | 8 | 10 | 7 |
| After | 25 | 0 | 0 |

This is not an independent sample. The fix reviewers handled those 25 fields too.

**English source errors the reviewers found** (fixed in `49b9fb29c1f` in all 14 locales, after a science-reviewer check; "Venera 7-class" kept as the site name; record and per-locale check in `maps/2026-10-31-garble-pass/en-fix/` and `en-fix-facts-check.mjs`):

- The template sentence "Retired after first flight in YYYY" is wrong on about 11 entries:
  Titan II GLV flew 12 times, and Spirit ran until 2010.
- "Built … in Multi (Europe)" appears on Ariane 6, XMM-Newton, Mars Express and ATV.
- "Venera 7-class" is template text.
- Vikram CY-3 says "two years after" the Chandrayaan-2 crash; the gap is four years.
- The Sriharikota SLP tagline lists Mangalyaan under GSLV Mk III / LVM3. It launched on a PSLV-XL
  from the First Launch Pad.

**Cost:** four Sonnet reviewer runs, about 640k subagent tokens, and no paid API calls.

## 5 · Every cell with a BROKEN (operator, 2026-10-31)

The operator chose "every cell with a BROKEN": 11 more cells, about 2,400 fields.

**Changes from the pilot:**

1. **A second reader for every change.** An independent Sonnet checker read every retranslation
   against the English
   ([check-brief.md](../../scripts/i18n-tools/maps/2026-10-31-garble-pass/check-brief.md)), and its
   fixes were applied with `patch-edits.mjs`.
2. **What I read.** Every `garble-check` flag, every checker fix, and a sample of every third
   change. Small cells I read in full: zh-CN, ko, sr-Cyrl.
3. **The fix brief gained the pilot's lessons:**
   - names follow the origin-language rule: ru «Союз», zh 神舟, hi चंद्रयान; LVM3 stays Latin on the hi
     site;
   - ISO dates stay ISO;
   - no English left in;
   - the 80-character milestone `label` cap.
4. **One commit per cell** through `garble-cell-commit.sh`, which applies the edits, runs every gate
   and stops on a failure.

| Cell | Fields read | Kept | Retranslated (BROKEN) | Checker fixes | Before (OK / MINOR / BROKEN) | After |
|---|---|---|---|---|---|---|
| nl fleet (pilot) | 445 | 122 | 323 (130) | 18 by me | 8 / 10 / 7 | 25 / 0 / 0 |
| it fleet | 408 | 189 | 219 (70) | 14 | 16 / 4 / 5 | 22 / 2 / 1¹ |
| ko fleet | 101 | 76 | 25 (15) | 0 | 20 / 0 / 5 | 25 / 0 / 0 |
| ja fleet | 112 | 63 | 49 (14) | 1 | 18 / 5 / 2 | 22 / 3 / 0 |
| zh-CN fleet | 119 | 84 | 35 (14) | 0 | 18 / 6 / 1 | 25 / 0 / 0 |
| hi fleet | 226 | 81 | 145 (55) | 10 | 15 / 7 / 3 | 23 / 2¹ / 0 |
| hi missions | 155 | 78 | 77 (27) | 0 (+1 by me) | 14 / 7 / 4 | 24 / 1 / 0 |
| nl missions | 388 | 181 | 207 (39) | 3 | 13 / 11 / 1 | 21 / 4 / 0 |
| fr missions | 436 | 281 | 155 (30) | 15 | 20 / 4 / 1 | 22 / 3 / 0 |
| ar missions | 164 | 88 | 76 (17) | 1 | 18 / 5 / 2 | 25 / 0 / 0 |
| ru missions | 279 | 162 | 117 (21) | 3 | 22 / 2 / 1 | 24 / 1 / 0 |
| sr-Cyrl missions | 7 | 5 | 2 (1) | — | 6 / 0 / 1 | 5 / 1 / 1² |

**Before and after** are the same sampled fields, graded by fresh Sonnet graders.

**Footnotes:**

- ¹ The it BROKEN (Magellan "Il 98% della superficie di Venere.", no verb) and the hi MINOR (Venera 7
  "पहली मिशन") sit in the 21 fields the English fixes rewrote on 2026-10-31. Those fields fell outside
  the pool's date filter, so no reviewer saw them. A second round covered those 21 fields plus the
  Mars 3 description for the six fleet locales in scope. It retranslated 35 fields: it 11, hi 10,
  nl 4, ko 4, zh-CN 4 and ja 2. I read every change (commits `1aed2aa2d52` … `e69a81dc71a`).
  **Lesson:** a date-filtered pool misses fields rewritten by a same-day English fix, so run those
  fields through the brief as well.
- ² The sr-Cyrl after-grade ran before the cell was committed. The cell had been skipped by a
  broken command chain of mine and was committed later (`19e6316af61`). The BROKEN is the old
  Luna 10 text, which is now retranslated.

**Gates on every cell:**

- apply refused 0;
- term gate 0 (12 new keeps: propellant-sense "burn", ru виток counts);
- name drift 0;
- validate-data passed. Taglines that came out over 140 were shortened by hand in it, and two in
  nl.

**Not covered:**

- cells where the sample found no BROKEN: de, es and pt-BR in both trees, and ar, fr, nl, ru and
  sr-Cyrl fleet;
- other trees (science, essays, programs);
- fields rewritten after 2026-07-14, other than the en-fix fields above.

The after-samples are 25 fields per cell, so the 95 % upper bound for a 0 is still about 12 %.

## 6 · Round 2: a fresh, wider sample (operator, 2026-10-31)

The operator asked whether 0 in 25 was enough to call a cell clean. It is not: it only rules out
rates above about 12 %.

**Round-2 measurement:**

- 60 fresh fields per locale × tree, all 26 cells, 1,560 fields.
- Drawn from all current text (`garble-sample --before=any`), excluding every field graded before
  (`--exclude`).
- Graded by 7 Sonnet graders. Grades are in `maps/2026-10-31-garble-pass/round2-graded/`.

**Result: 28 BROKEN (1.8 %).**

- None in fields round 1 retranslated (0 / 68) or kept (0 / 84).
- 11 in fixed cells, in text written after 2026-07-14 that round 1's date filter never showed to a
  reviewer.
- 17 in cells round 1 had not fixed. Examples: es fleet 6 / 60 (round 1 had seen 0 / 25), it, fr,
  ja and ar.

**Lesson:** garble is not limited to the July runs. The October rewrites have it too. A fix round
must read every field of the cell, not a date-filtered pool.

**Rule set beforehand:** 2 or more BROKEN in 60 means a fix round.

- 8 cells qualified. The operator chose reviewer-only, because our retranslations measured 0 BROKEN
  in 68.
- 4 cells had exactly 1 BROKEN. Those fields were fixed by hand.

| Cell | Fields read | Retranslated (BROKEN) | Round-3 check, 60 fresh (OK / MINOR / BROKEN) |
|---|---|---|---|
| es fleet | 780 (all) | 264 (49) | 55 / 5 / 0 |
| es missions | 946 (all) | 258 (52) | 59 / 1 / 0 |
| fr fleet | 780 (all) | 400 (118) | 58 / 2 / 0 |
| it fleet | 372 (not seen in round 1) | 158 (44) | 59 / 1 / 0 |
| it missions | 946 (all) | 342 (79) | 58 / 2 / 0 |
| ja missions | 946 (all) | 368 (80) | 56 / 4 / 0 |
| hi fleet | 554 (not seen in round 1) | 316 (100) | 57 / 3 / 0 |
| ar missions | 782 (not seen in round 1) | 286 (43) | 57 / 3 / 0 |

**Round 2 in numbers:**

- 6,106 fields read, 2,392 retranslated (565 BROKEN), by 40 Sonnet reviewers.
- I read every flag and a sample of every 9th to 30th change.

**Fixes applied by hand before commit:**

- Names the guard requires kept as in English: Space Shuttle, CubeSats, Apollo 15, EVA-2,
  Uchinoura Space Center.
- 21 ISO dates restored: 5 by hand in es, 16 in ja with the new `iso-restore.mjs`.
- 27 new term keeps, all for real variant forms:
  - propellant-sense "burn";
  - "premier étage" for a whole-stage booster;
  - 周 / виток revolution counts.

**Round-3 check:** 0 BROKEN in 480 fresh fields across the 8 cells. That puts the 95 % upper bound at
about 5 % per cell and about 0.6 % for the 8 cells together.

**Also fixed:**

- The four 1-BROKEN fields, by hand:
  - de: "Kleingestirn";
  - nl: "Lunar orbit insertion." left in English;
  - pt-BR: "primeira-ever … cislunare";
  - zh-CN: 太阳系外 for "outer solar system".
- The garbled English rd-253 tagline ("built every Proton mission"), corrected in all 14 locales.
- `garble-check.mjs` now flags dropped ISO dates.

**Not covered:**

- The 14 cells with 0 BROKEN in 60 were not read in full. Each could still hold up to about 5 %
  BROKEN.
- MINOR wording, about 10 % of fields: style and agreement slips, left where a reviewer kept the
  field.
- Science, essays and programs.
- No second, independent checker in round 2, by the operator's choice.

## 7 · Pattern scans across every tree (close-out step A, 2026-10-31)

The close-out sweep (3,900 fields, 5 buckets × 13 locales) found the same few error classes again
and again, so `pattern-scan.mjs` looks for them in every tree, every locale. Record:
`scripts/i18n-tools/maps/2026-10-31-garble-pass/pattern-scan/`.

**Found and fixed:**

- 32 numbers with the English thousands comma in comma-decimal locales (1,578 km reads as 1.578):
  es 10, ru 7, fr 5, it 5, pt-BR 3, de 1, sr-Cyrl 1. Applied mechanically (Spanish 4-digit
  numbers take no separator, RAE).
- 120 flagged fields judged by a reviewer: 63 fixed, 57 correct as written.
  - 44 Moon-landing words for landings that are not on the Moon (it allunaggio 27, fr alunissage
    13, es alunizaje 4): Mars, Titan, Eros, Itokawa, comets, Earth.
  - 10 long-scale errors: fr/it "trillion" for 10^12, sr квинтилион for 10^18, hi खरब for trillion.
  - 12 false friends: nl maandag (Monday) for lunar day, maremoto (tsunami) for marsquake,
    ru Водолей (Aquarius) for Aquila, hi चंद्र ग्रहण (eclipse) for lunar orbit insertion.
  - 7 fields left in English. Two more nl "maandag" forms the regex missed (maandageraad,
    maanddag) were fixed by hand, and the rule now catches them.
- 449 planet/rocket labels in 13 locales, mostly untranslated or inconsistent:
  - asteroid `type` lines ("Asteroid · Jupiter Trojan · L4 · C-type") were English in every locale;
  - rocket classes were English in 6 locales and wrong in ja (超重搬送) and nl (heavy-lift given as
    medium or light);
  - "Home" was rendered in the website sense (de Startseite, fr Accueil, sr Почетна);
  - mission link labels ("Lucy mission (NASA)").
  Each locale's glossary is in `struct-glossary.json`. Cited paper titles stay in English.
- 11 launch-site names left in English in de and nl ("Naro Space Center", "Uchinoura Space Center", …;
  fr, es, ru and the rest translate them). The cause was the name guard: it read the whole facility
  name as a name to keep, so round 2 had kept "Uchinoura Space Center" in English. These five
  names are now `GAZETTEER_SKIP` entries. Guard replay before and after: identical rejection
  counts in all 13 locales. Widening `GENERIC_TAIL` instead was tried and reverted: it demanded
  "Alcântara" in Latin script inside ru/ja/ko/ar prose.

**After:** the rerun lists 90 items, every one judged correct: site-rule names (Venera 7-class,
ALMA, Mons Rümker), the Artemis Moon landing, and scale words right for their locale.

**Not covered:**

- Error classes the regexes do not describe: the scan finds only what it names.
- Scale words written as digits or in prose without the English scale word nearby.
- The 449 label changes and the glossaries were written by one reviewer and read by me in a
  list of distinct changes; there was no second checker.
- "Binary primary / secondary" and "Contact binary" wording is a new coinage in every
  locale.
- "Rocket Lab Launch Complex 1" stays English in de: the facility-code check refuses a
  change.

## 8 · Flagged cells read in full (close-out step B, 2026-10-31)

The 12 non-science cells the sweep flagged (2 or more BROKEN in 60) were read in full, field by
field, by Sonnet reviewers on `fix-brief.md`: 54 work files of about 135 fields, three waves.
Each cell went through `garble-check.mjs`, hand fixes, a read of a random sample, and
`garble-cell-commit.sh` (now takes a bucket, `<name>:<tree,…>`). Records:
`maps/2026-10-31-garble-pass/<loc>-<bucket>/`.

| Cell | Fields read | Retranslated | BROKEN found | MINOR found |
| --- | ---: | ---: | ---: | ---: |
| ru catalogue | 825 | 215 | 43 | 181 |
| ar catalogue | 825 | 249 | 76 | 173 |
| sr-Cyrl catalogue | 825 | 127 | 27 | 102 |
| de catalogue | 825 | 236 | 38 | 198 |
| fr catalogue | 825 | 174 | 32 | 142 |
| it catalogue | 825 | 184 | 39 | 145 |
| nl catalogue | 825 | 297 | 74 | 223 |
| ar places | 402 | 94 | 20 | 76 |
| it places | 402 | 97 | 5 | 92 |
| ja universe | 236 | 82 | 19 | 63 |
| de universe | 236 | 50 | 14 | 36 |
| pt-BR universe | 236 | 43 | 4 | 39 |
| **Total** | **7,287** | **1,848** | **391** | **1,470** |

The catalogue bucket is 21 trees: observatories, museums, satellites, planets, rockets,
earth-objects, small-bodies, belts, trajectories, scenarios, sourcing, culture-doors, glossary,
ISS and Tiangong modules and visitors, and the four orbit-regime trees.

**Hand fixes on top of the reviewers' output (25 patches, 2 dropped edits):**

- Names the guard keeps that a reviewer had translated or dropped: Apollo, CubeSat(s),
  Space Shuttle, Viking 1/2, Voyager 2, DeKalb, James Webb; and the Latin constellation names
  Cygnus and Gemini in pt-BR, kept beside Cisne and Gêmeos.
- ISO dates spelled out again (hayabusa2 in ru and it).
- An added clause removed (ja Achernar "not the Milky Way").
- BTA's real name (ru); a Latin "o" inside a Cyrillic word (sr).
- Two sr `sourcing` edits dropped: they replaced Serbian forms with Russian letters.
- nl's "Sojoez" kept to "Soyuz" in the new text. Separately, every Soyouz (fr, 7 fields) and
  Sojus (de, 11 fields) was brought to the site form Soyuz.

**Not covered:**

- Science in ru, zh-CN and fr (step C), and the verification sample (step D): to be agreed.
- `name` fields are not in the work file, so the reviewers never saw them. The orbit-regime
  names (panel titles) were found left in English this way: 113 fixed in 13 locales
  (`maps/…/regime-names/`). Not changed: zh-CN "Sun–Earth L2" (the name guard keeps it), and
  sr "Готово праволинијска хало орбита" (correct as written).
- The other 580 name/title cells that some locales keep in English are mostly proper names
  kept on purpose (launch pads, Latin feature names); they were not read one by one.
- 11 fields graded MINOR but kept by their reviewer were left as they are (no BROKEN field was
  kept). 1,850 retranslations were decided; 1,848 applied after the 2 dropped sr edits.
- Each field had one reviewer, plus my sample read of about 10 per cell.

## 9 · Steps C and D (operator: "yes on C and D, keep conservative spending")

**D, verification of step B:** a fresh 25-field sample from each of the 12 fixed cells, excluding
fields graded before: 300 fields, **0 BROKEN**, 20 MINOR. That puts the 95 % upper bound at about
1 % for the 12 cells together (about 12 % for any one cell). Two MINOR slips fixed by hand
(de Goldstone pronouns, de "Sirrah" for Alpheratz); one more (ar Satish Dhawan spelt "ستيش دون").
One MINOR was not taken: pt-BR writes Sirius 19 times and Sírio never.

**C, science in ru, zh-CN, fr:**

- ru (6 BROKEN in the sweep's 60): read in full, as in step B.
- zh-CN and fr: a second fresh 60-field sample each, before deciding on a full read.
  - zh-CN: 4 BROKEN in 60 (6 in 120 with the sweep). Wrong terms: 死后应变 for dead reckoning,
    注册 for image registration, 踏板车 for treadmill; wrong dwarf-galaxy names.
  - fr: 2 BROKEN in 60 (4 in 120): "a d'abord roulé une fusée", "rester mis".
  - The 6 BROKEN fields were fixed by hand. A full read of each cell is about 1,433 fields.

Record: `maps/2026-10-31-garble-pass/step-d-check/`.

**C, full reads (operator: both zh-CN and fr after the second samples):**

| Cell | Fields read | Retranslated | BROKEN found | MINOR found |
| --- | ---: | ---: | ---: | ---: |
| ru science | 1,433 | 840 | 267 | 578 |
| zh-CN science | 1,433 | 795 | 176 | 621 |
| fr science | 1,433 | 778 | 228 | 551 |

- The full reads found far more than the samples predicted: ru 19 % BROKEN (sample 10 %), zh-CN
  12 % (samples 5 %), fr 16 % (samples 3 %). The samples under-read this tree, or the full-read
  reviewers graded harder; the two cannot be told apart from here. Either way, sampling alone would
  have left most of these errors in place.
- The errors are mostly technical terms read in a wrong everyday sense, so the sentence is nonsense:
  ru «Лунный марсоход», zh 坦克 for a propellant tank, fr «vortex» for a wormhole. There are also
  dropped clauses and reversed facts.
- Guard refusals fixed by a Sonnet fixer against `apply-edits.mjs --check` (new flag): ru 40, zh-CN
  39, fr 10. Hubble the telescope keeps the Latin name. Terms named for the astronomer use the
  native form plus the Latin once: «закон Хаббла (Hubble)», 哈勃（Hubble）定律.
- The schema caps `intro_sentence` at 240 characters. 30 ru and 40 fr intros were shortened, and I
  read every one against the English: 9 restored or reworded (a dropped "chemically", "several
  billion", "at real thrust", a gender error).
- Numbers: all fields where a number seemed to disappear were read. All were correct (万/亿
  forms, centuries, unit conversions).
- An error in the English source, fixed in all 14 locales: hill-sphere said Earth's mass is
  "80× smaller" than the Sun's; it is ~333,000×.

**Not covered:**

- Low-cost follow-ups the operator approved (2026-10-31), all done:
  - porkchop plot, one form per language: ru «диаграмма «свиная отбивная»» (canvas title «СВИНАЯ
    ОТБИВНАЯ»), zh-CN 猪排图; 40 ru and 5 zh-CN fields, UI included. Record:
    `maps/…/porkchop-term/`.
  - lunar-suits said twelve moonwalkers wore "eight suits"; each suit was made to measure for one
    astronaut, so it was twelve. Fixed in all 14 locales.
  - Check after C: 25 fresh fields per locale, 75 in all, **0 BROKEN** (5 MINOR; ru Sokol KV-2
    now «Сокол-КВ2»). That puts the 95 % upper bound at about 12 % per locale.
