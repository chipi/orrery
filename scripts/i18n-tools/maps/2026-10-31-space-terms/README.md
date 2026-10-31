# 2026-10-31 — space-terms glossary pilot

The record of the 20-term pilot on the science tree (runbook: skill
`term-consistency`; write-up: `docs/wip/2026-10-31-space-terms-glossary-pilot.md`).

| Path | What it is |
|---|---|
| `round1-decisions/<loc>.json` | Round 1 reviewer output per locale: `{rel, at, term, decision: change\|keep, find, replace, why}`. The `change` rows were read and then applied with `term-apply.mjs`, minus the dropped ones (nl terugkeer/daaltrap, sr повратак у атмосферу / прикључни прстен, and added clauses). Keep rows still missing after the stem widening are in `term-keeps.json`. |
| `round1-decisions/science-tail-keeps.json` | Hand keeps for the science misses left after round 1. |
| `round2-science-tail.mjs` | Round 2: the last 66 science misses after the second opinion. Its edits, keeps and stem additions sit in one script. |
| `lowconf-second-opinion-brief.md` | The brief for the second opinion on the 11 low-confidence bindings. The verdicts were applied to `native-terms.json` with the sources recorded. |
| `glossary-steps/1-inflection-stems.mjs` | Latin-script stems made tolerant of plural/gender endings. |
| `glossary-steps/2-stem-gaps-from-keeps.mjs` | Stems for the inflected or variant forms that round-1 keep reasons revealed (ru case endings, Arabic article/prefix forms, Korean particles, nl compounds, hyphenated charge-utile). |
| `glossary-steps/3-stem-gaps-science-tail.mjs` | Further stems from the science tail (ru работа/включение двигателя, sr пали мотор, …). |
| `glossary-steps/3b-second-opinion-bindings.mjs` | The second opinion's verdicts: ar flyby, es/pt-BR booster, zh-CN orbit insertion bindings changed; variants accepted; sources and confidence recorded. |
| `glossary-steps/3c-es-orbit-insertion.mjs` | es orbit insertion binding aligned with the style guide §4 (inserción orbital). |
| `glossary-steps/4-nl-explicit-compounds.mjs` | nl -baan / -trap / -stoot compounds as an explicit list: the open stems hid garbled words (found by `term-widen-check.mjs`). |
| `hand-edits/nl-widen-garbles.mjs` | The 9 nl strings those open stems hid: typos, "lanchbaan" for launch pad, and two fleet descriptions retranslated from the English. |
| `hand-edits/` | Apply-edits files for fields fixed by hand: retranslated garbled pages (`retr-*`), small fixes, escaped quotes, the zh-CN full-width punctuation pass (`zh-punct.mjs` writes `zh-punct.json`), shortened intros, and the nuclear-thermal / Oberth intros (`sci-hand2.mjs`, `hand3-ru.mjs`). |

The scripts carry absolute paths from the session that ran them. They are the record
of what was done, not tools to rerun. The reusable tools are in `scripts/i18n-tools/term-*.mjs`.
