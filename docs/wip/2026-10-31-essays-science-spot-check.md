# Essays + science translations — spot check (2026-10-31)

**Status 2026-11-04:** 4 of the 5 confirmed BROKEN strings and the escaped quotes were fixed in 3d8948f8a4d (2026-10-31); the fr oberth-effect "freinage" is gone too (0 grep hits; most likely the fr science garble pass 65febd95c76, not confirmed); zh-CN ASCII punctuation now 0 hits (grep, commit not identified); glossary term for "burn" added in a1edd3f7d7a. OPEN: re-translation of pt-BR science (verdict 7/8 MINOR+BROKEN) — no pt-BR science garble-pass commit found (fr 65febd95c76, ru 6a39098ca60, zh-CN dfc1c43f377 exist); the ~35 MINOR science strings and 14 MINOR essay strings were not fixed; register mixes (ja, ko) and pt-BR/ru decimal points not verified; Programs still not sampled.

The optional end-of-Phase-6 item (operator, 2026-10-31: "let's do some spot checks
and assess"). Read-only; nothing was fixed. Method: `i18n-audit` — detectors on
every locale, then a seeded sample (`i18n-segment-sample.mjs`, seed 31,
8 essay + 8 science paragraphs per locale, 208 items) graded OK / MINOR / BROKEN
against the English by four Sonnet reviewers (one per language group). Every
BROKEN finding was re-read against the files before it went in here.

## Detectors

0.0–0.2 % defects in every locale (tier C): the mechanical checks see almost
nothing in this content.

## Graded sample

| Locale | Essays OK/MINOR/BROKEN | Science OK/MINOR/BROKEN |
| --- | --- | --- |
| es | 8 / 0 / 0 | 8 / 0 / 0 |
| fr | 8 / 0 / 0 | 3 / 2 / 3 |
| pt-BR | 7 / 1 / 0 | 1 / 6 / 1 |
| it | 6 / 2 / 0 | 7 / 1 / 0 |
| de | 8 / 0 / 0 | 5 / 3 / 0 |
| nl | 7 / 1 / 0 | 4 / 4 / 0 |
| ru | 7 / 1 / 0 | 3 / 5 / 0 |
| sr-Cyrl | 5 / 2 / 1 | 7 / 1 / 0 |
| zh-CN | 7 / 1 / 0 | 4 / 4 / 0 |
| ja | 7 / 1 / 0 | 6 / 2 / 0 |
| ko | 7 / 1 / 0 | 7 / 1 / 0 |
| hi | 6 / 2 / 0 | 6 / 2 / 0 |
| ar | 6 / 2 / 0 | 4 / 4 / 0 |

Essays are good everywhere: 1 BROKEN (sr-Cyrl) and 14 MINOR of 104, at most 2
MINOR per locale. Science is the weak segment: 4 BROKEN and 35 MINOR of 104.

BROKEN, confirmed against the files:

- ~~fr `science/history/keplers-laws-1609.json` body_paragraphs.3 — "infrarcseconde"~~ — done in 3d8948f8a4d
  (non-word) for *sub-arcminute*.
- fr `science/propulsion/oberth-effect.json` narrative_101.1 — every *burn* is
  "freinage" (braking): the meaning is inverted.
- fr `science/life-in-space/suit-lineage.json` intro_sentence — last sentence
  dropped.
- ~~pt-BR `science/life-in-space/suit-lineage.json` intro_sentence — "American~~ — done in 3d8948f8a4d
  Apollo-derivado, Soviet/Russian …, Chinese Feitian" left in English.
- ~~sr-Cyrl `essays/space-comm-arrays.json` body.12 — "тек десетак метара" (about~~ — done in 3d8948f8a4d
  ten metres) for *tens of metres*.

## Patterns (more than one locale)

- **"burn" (an engine firing) has no settled term**: fr "freinage"/"combustions",
  zh 燃烧/烧制 (烧制 = firing ceramics), nl "ontsteking"/"stoot", hi बर्न
  transliterated, ar three different words. It is not in the glossary
  (`scripts/i18n-tools/native-terms.json`).
- **zh-CN ASCII punctuation**: 1,472 `,` `:` `;` between Chinese characters in 96
  of 199 essay/science files (Chinese prose uses ，：；). Mechanical.
- **Escaped quotes shown on the page** (`\"…\"`): ar, pt-BR, sr-Cyrl, one file
  each (6 occurrences). Mechanical.
- Register mixes within a locale's science text (ja です/ます vs である; ko
  합니다 vs 한다); decimal points instead of commas in a few pt-BR / ru strings.
- Mission names left in Latin script in ru / sr-Cyrl prose follow the
  origin-language rule (English form outside the origin locale); not a defect.

## Verdict per the i18n-audit rule

- fr science: 3/8 BROKEN (≥ 20 %) → the rule says re-translate the segment.
- pt-BR science: 7/8 MINOR+BROKEN (≥ 50 %) → re-translate the segment.
- Every other locale/segment: fix the flagged strings; essays are fine.

Eight items per segment is a small sample: the fr and pt-BR science verdicts are
a strong signal, not a measured rate.

## Not checked

- Programs (the third long-editorial tree) — not sampled.
- Figure captions and alt text beyond what the sample drew.
- Science segments other than the drawn eight items per locale (the science tree
  has ~190 files per locale).
- No locale was read in full; no fixes were made.
