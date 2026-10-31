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
