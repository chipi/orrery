# Stale translation fields, 2026-11-09

Source: `node scripts/i18n-tools/stale-overlays.mjs --since=2026-10-20 --fields` (full rows in `2026-11-09-stale-fields.json`).
Each flagged locale file is compared leaf by leaf: en-US as of the locale file's newest commit vs en-US now.

## Counts (locale: flagged files = changed leaves; new 0, missing 0 everywhere)

| locale | files | changed | new | missing |
|---|---|---|---|---|
| de | 9 | 9 | 0 | 0 |
| hi | 36 | 36 | 0 | 0 |
| pt-BR | 41 | 41 | 0 | 0 |
| ru | 43 | 43 | 0 | 0 |
| sr-Cyrl | 40 | 40 | 0 | 0 |
| ar | 8 | 8 | 0 | 0 |
| es | 8 | 8 | 0 | 0 |
| fr | 5 | 5 | 0 | 0 |
| it | 2 | 2 | 0 | 0 |
| nl | 8 | 8 | 0 | 0 |
| ja | 9 | 9 | 0 | 0 |
| ko | 8 | 8 | 0 | 0 |
| zh-CN | 9 | 9 | 0 | 0 |
| total | 226 | 226 | 0 | 0 |

Every flagged file has exactly one changed leaf. The 226 rows come from 46 distinct English leaves.

## Classification of the 226 changed leaves

Method: compared en_then with en_now by eye over all 46 distinct leaves, then confirmed each class with a script
that tests the exact edit (not a fuzzy match), and checked the locale's current text for the changed span.

(a) English-only cosmetic, translation needs no change: 225 rows
- 131 rows, 34 science `seo_title` leaves: trailing ` |||` removed from the English. No locale value contains `|||` (checked: 0).
- 87 rows, 8 launcher `description` leaves: "is a orbital launcher" to "is an orbital launcher" (grammar).
- 4 rows: "built by X in Multi (Europe)" to "in Europe" (atv ru; xmm-newton ru, zh-CN, es). The locale text already says Europe (checked: no locale value still says Multi).
- 3 rows: ariane-6 description (zh-CN, ja, es) carrying both the a/an fix and the Multi (Europe) fix; the locale text already says Europe.
- Total 131 + 87 + 4 + 3 = 225.

(b) Meaning, number or name changed, translation must be updated: 1 row
- de | essays/asteroid-mining.json | seo_title | English "Worth Trillions?" became "Worth Quadrillions?". The de value ("Asteroidenbergbau: Lohnt er sich wirklich?") carries no number, so it is still correct as written; update only if the title should state the figure.

(b) count per locale: de 1, all others 0.
