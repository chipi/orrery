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
