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
| `glossary-steps/5-sr-operator-confirmed.mjs` | Operator: all 20 Serbian forms confirmed (high), «уз помоћ гравитације» accepted for gravity assist. |
| `essays-round1-decisions/<loc>.json`, `essays-round1-adjust.mjs` | Essays round: the four reviewers' lists as applied (after the adjustments in the script: combustion-sense changes dropped in 5 locales, zh-CN standard 轨道 compounds and ko 탈출 궤도 kept, de Brennphase, nl de-word), the brief, and the stems their keep reasons showed. |
| `glossary-steps/6-orbit-and-burn-verbs.mjs` | Plain orbit verbs (umkreist, gravitent, cirkelt, обращается, кружи, 도는, 周回, 公转, 绕…运行) and nl ontstoken / pt acender os motores; sr маневри, ru полезная … нагрузка. |
| `glossary-steps/7-zh-trajectory-guidao.mjs`, `hand-edits/zh-trajectory-revert.mjs`, `hand-edits/zh-trajectory-compounds.mjs` | zh-CN trajectory: binding 轨道 (second opinion: CNTERM, CNSA, journals), 轨迹 still accepted for a computed/plotted path, `_avoid` for 自由返回轨迹 / 轨迹修正 / 转移轨迹; the 29 earlier 轨道 → 轨迹 edits reversed; 6 remaining compounds fixed. |
| `programs-round1-decisions/<loc>.json`, `programs-round1-adjust.mjs`, `hand-edits/ar-rendezvous-programs.mjs` | Programs round as applied, with the adjustments (nl zwaartekrachtassist, fr arrimer kept, ar verb agreement) and ar «الالتقاء المداري» aligned with the essays. |
| `fleet-round1-decisions/<loc>.json`, `fleet-round1-adjust.mjs`, `fleet-round1-keeps-tail.json`, `glossary-steps/8-fleet-tail.mjs` | Fleet round as applied: fr Atlas = lanceur (not a strap-on), hi सूर्य-तुल्यकालिक, the booster keeps for first stages, and the stems from the keep reasons and the tail. |
| `missions-round1-decisions/<loc>.json`, `missions-round1-adjust.mjs`, `missions-round1-keeps-tail.json`, `hand-edits/ar-akatsuki-burn.json` | Missions round as applied: hi दहन for the burn noun, nl binding zwaartekrachtassist, ko standard 궤도 compounds kept, sr/ar label and agreement fixes, the stems from the keep reasons. |
| `hand-edits/nl-widen-garbles.mjs` | The 9 nl strings those open stems hid: typos, "lanchbaan" for launch pad, and two fleet descriptions retranslated from the English. |
| `hand-edits/` | Apply-edits files for fields fixed by hand: retranslated garbled pages (`retr-*`), small fixes, escaped quotes, the zh-CN full-width punctuation pass (`zh-punct.mjs` writes `zh-punct.json`), shortened intros, and the nuclear-thermal / Oberth intros (`sci-hand2.mjs`, `hand3-ru.mjs`). |

The scripts carry absolute paths from the session that ran them. They are the record
of what was done, not tools to rerun. The reusable tools are in `scripts/i18n-tools/term-*.mjs`.
