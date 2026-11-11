# number-drift: date-aware finder, before and after

Date: 2026-11-09. Scope: the finder only (`scripts/i18n-tools/number-drift.mjs`). Nothing in `i18n-src` or `messages` was changed.

## What changed in the finder

- Dates are reduced to a token before numbers are compared: `md:MM-DD` for a day and month, the year as the plain number it is. "February 12", "12.02.", "12 февраля", "2月12日", "12 de febrero", "12 فبراير" are all `md:02-12`. A month with no day is not compared ("в октябре 1995" is just 1995), because ru and sr decline it and the tool has no business reading grammar.
- Month names come from `Intl.DateTimeFormat` (long, day+month genitive, short). Added by hand only where Intl does not give what the repo's translations write: ar Levantine months, hi `अक्तूबर`/`सितम्बर`/`नवम्बर`/`दिसम्बर`, ru `мая`/`мае`. ru and sr-Cyrl match on the first three letters of the long name because the month is declined after a day (sr `децембра` drops a vowel of `децембар`; Intl gives sr only the nominative).
- Forms read: English month-first and day-first (ordinals, "of", ranges `5/6`, `13–14`), ISO `yyyy-mm-dd` and `yyyy-mm`, `dd.mm.yyyy` / `dd/mm/yyyy`, sr `24. 9. 2023`, `dd.mm.` mid-sentence, ko `1997. 2. 12.`, CJK `年月日` / `년월일` with ranges `～ 〜 ~`.
- Things that look like dates and are not: "Long March 5" (English month-first is English-only and skips "Long "), fr "Mars 1,52" (planet; month-first off for non-English), "Apollo 11月面" (a bare N月 is left alone), "MS-15 in September" (a day is not read from behind a hyphen or a Latin letter), "M5.5." and "3.6." at a sentence end (decimal; caseless locales need a two-digit month).
- A date the translation writes with a month name Intl does not know still passes on its day number, and "Soyuz 14 jul 1974" read as a date on the translation side still leaves its 14 for the English "14". That is the old behaviour (the day number was always enough) kept, not loosened: a month changed to another month, and a day or year changed, are still reported.
- `tree=all` walks every tree under `i18n-src/en-US`, including the four single-file trees (`deep-sky`, `original-work`, `sun`, `videos`) which the old script crashed on (`ENOENT … en-US/sun`). `--json` prints `{trees: {tree: {locale: {fields, withMissing}}}, totals: {locale: n, all: n}}`. No machine-readable mode existed. `--no-dates` is the old count (identical to the previous script on the directory trees: science 467, missions 481, fleet 313).
- Tests: `scripts/i18n-tools/number-drift.test.ts` (53 tests: date pairs in de fr es it pt-BR nl ru sr-Cyrl zh-CN ja ko ar hi, true positives, look-alikes, unchanged number semantics, `--json` shape).

## Measurement

Fields with a missing number, all 38 trees, 13 locales. "before" is `--no-dates` (the old semantics, now also covering the single-file trees); "after" is the default.

| tree | before | after |
|---|---:|---:|
| belts | 8 | 8 |
| culture-doors | 5 | 5 |
| deep-sky | 36 | 36 |
| earth-objects | 20 | 20 |
| essays | 135 | 135 |
| fleet | 313 | 279 |
| glossary | 5 | 5 |
| hotspot-metadata | 0 | 0 |
| iss-modules | 0 | 0 |
| iss-visitors | 7 | 7 |
| mars-sites | 16 | 16 |
| mars-traverses | 2 | 2 |
| missions | 481 | 316 |
| moon-sites | 34 | 34 |
| moon-traverses | 0 | 0 |
| museums | 3 | 3 |
| observatories | 13 | 13 |
| orbit-regimes | 8 | 8 |
| orbit-regimes-explore | 7 | 7 |
| orbit-regimes-mars | 12 | 12 |
| orbit-regimes-moon | 13 | 13 |
| original-work | 32 | 32 |
| planets | 31 | 22 |
| programs | 106 | 106 |
| rockets | 13 | 13 |
| satellites | 43 | 43 |
| scenarios | 1 | 1 |
| science | 467 | 466 |
| site-stories | 173 | 175 |
| small-bodies | 5 | 5 |
| sourcing | 0 | 0 |
| sun | 7 | 7 |
| tiangong-modules | 0 | 0 |
| tiangong-visitors | 2 | 2 |
| trajectories | 15 | 8 |
| universe | 44 | 44 |
| venus-sites | 0 | 0 |
| videos | 13 | 13 |
| **all trees** | **2070** | **1856** |

| locale | before | after |
|---|---:|---:|
| de | 169 | 85 |
| es | 126 | 111 |
| fr | 64 | 56 |
| it | 148 | 145 |
| pt-BR | 52 | 40 |
| nl | 133 | 123 |
| ru | 162 | 133 |
| sr-Cyrl | 223 | 175 |
| ja | 66 | 66 |
| ko | 71 | 70 |
| zh-CN | 379 | 381 |
| hi | 96 | 95 |
| ar | 381 | 376 |

`--changed` (a different number appears instead; the shape of a changed fact): before 666, after 529. de goes from 86 to 9.

## What the residue is

The brief expected most of the ~1,990 to be date-format false positives. Measured, dates were 214 of 2,070 (10%): the date-aware finder removes mostly de (169 to 85, dd.mm.yyyy), ru, sr-Cyrl and the missions and fleet trees. The other 1,856 are not dates. Of the 9 fields that still print an `md:` token: es dawn (day dropped), ja voskhod-2 (`1965-03-1807時`, the space lost), nl lc-34 (dates dropped, 2 fields) and ja mmx (19 vs 20 October, 2 fields, probably a time-zone choice) are real or a judgement call; sr essays/seven-minutes and site-stories/mars2 write the day as a word ("Двадесет седмог новембра"); ja buran-ok-gli reworded the range.

Sample of 20 remaining findings, drawn with a fixed shuffle seed (12 from de es fr ja ko ru nl sr-Cyrl hi pt-BR, the rest from the full list). Classes: W = number written as a word or a different counting form, S = scale or unit the finder does not read, D = duplicate count.

| # | locale | tree / field | finder says | classification |
|---|---|---|---|---|
| 1 | ar | fleet/launch-site/sohae description | missing 1990 | False positive (W): "early 1990s" → "أوائل التسعينيات", decade written as a word |
| 2 | it | fleet/launch-site/plesetsk-43 description | missing 1950 | False positive (W): "late 1950s" → "anni Cinquanta" |
| 3 | ar | kuiper outcome.0.md | missing 2020 | False positive (W): "mid-2020s" → "عشرينيات" |
| 4 | sr-Cyrl | small-bodies/bennu science_sections.1.why | missing 2100, extra 22 | False positive (W): "the 2100s" → "22. веку" (22nd century, same fact) |
| 5 | zh-CN | site-stories/zhurong chapters.1.subtitle | missing 5 | False positive (W): "Long March 5" → 长征五号, hanzi numeral |
| 6 | zh-CN | videos vid-c19061eec526.title | missing 5 | False positive (W): "Chang'e-5" → 嫦娥五号 |
| 7 | it | fleet/space-suit/orlan-mks tagline | missing 50 | False positive (W): "50-year" → "cinquantennale" |
| 8 | it | missions/earth/vostok-1 dispatch | missing 27 | False positive (W): "27-year-old" → "ventisettenne" |
| 9 | sr-Cyrl | missions/earth/gemini7 description | missing 14 | False positive (W): "14-day" → "четрнаестодневну" |
| 10 | de | science/_landing chapters.6.paragraphs.2 | missing 6 | False positive (W): "6-hour" → "sechsstündig" |
| 11 | nl | missions/comet/rosetta events.0.note | missing 10 | False positive (W): "10-year" → "tienjarige" |
| 12 | de | science/life-in-space/eva-operations body_paragraphs.0 | missing 4 | False positive (W): "T-minus 4 hours" → "Vier Stunden" |
| 13 | de | science/life-in-space/eva-physiology body_paragraphs.3 | missing 1 | False positive (W): "per 1 hour" → "pro Stunde" |
| 14 | ar | science/observation/dwarf-spheroidals body_paragraphs.3 (de has the same) | missing 3 | False positive (W): "3-D" → "ثلاثية الأبعاد" / "dreidimensionalen" |
| 15 | es | missions/moon/luna10 events.3.note | missing 23 | False positive (W): "23rd Congress" → "XXIII Congreso", Roman numeral |
| 16 | ar | satellites/oberon description | missing 4, extra 4000000000 | False positive (S): "~4 Gyr" → "4 مليار سنة"; the finder has no Gyr/Myr unit (the same unit is in ar local-group, 4 missing there) |
| 17 | hi | deep-sky jwst-stephans.distance | missing 290000000, extra 290 | False positive (S): "290 million" → "290 मिलियन"; मिलियन is not in the hi scale words |
| 18 | ja | science/orbits/hill-sphere narrative_101.1 | missing 384000, extra 380000, 4000 | False positive (S): "384,000 km" → "38万4,000km"; a 万 value followed directly by digits is one number |
| 19 | de | fleet/launch-site/cape-canaveral-lc-17 name | missing 17 | False positive (D): "Cape Canaveral Launch Complex 17 (LC-17)" → "Cape Canaveral LC-17"; 17 appears once, English counted it twice. The long name was dropped |
| 20 | es | trajectories/dawn current_distance_label | missing md:10-31 | Real: "EOM 2018-10-31" → "fin de octubre de 2018", the day was dropped |

0 of the 20 sampled are real errors except #20 (and #19 is a dropped name, a judgement call). Beyond the sample: the ja/zh-CN/ko/hi/ar columns are dominated by class W and S; `--changed` (which needs a different number to appear) is the nearer measure of changed facts: 529 fields.

## Not done / not verified

- Class W is the bulk of what is left and is not date handling: spelled-out numbers in 13 languages (hanzi 五, "sechsstündig", "ventisettenne", decade words, Roman numerals). This is not fixed. A hard gate needs either a word-number reader per locale or an allow-list of accepted fields; the finder cannot get to zero without one of them. I did not choose.
- Class S (Gyr/Myr/Gpc, `$100M`, hi/ko scale words such as मिलियन, 万 followed by digits, scale applied to the first number of a range "0.7–1.3 billion") is cheap to fix and was not, since the brief was dates only.
- The 20-row classification is a sample of the full list, not a count by class. The per-class totals were not measured, so "the bulk" is a reading of the sample, not a number.
- Month names the repo's translations use that Intl does not give are covered only for ar, hi, ru, sr-Cyrl. Other locales were not audited for alternate spellings beyond what the full run surfaced (9 `md:` residue fields remain).
- No hard gate was added; `--json` output is the interface for one. No CI wiring, no threshold file.
- The "after" run was done once at the end; `npm run preflight` was not run (not asked, and only these files changed).

---

# Part 2 (2026-11-09): to zero, and a hard gate

Operator decision: reach zero and gate it. Three steps: teach the finder its false-positive classes, fix the translation errors the finder then shows, record the rest in a small reviewed list.

## Step 1: what the finder learned

`scripts/i18n-tools/number-words.mjs` (new, table-driven per locale) and `number-drift.mjs`. Each class has unit tests (`number-drift-words.test.ts`, 111 tests, true positives included).

- **Number words**, de nl fr es it pt-BR ru sr-Cyrl ar hi: units, teens, tens, hundreds, thousand, million/billion words, compounds (`sechsstündig`, `ventisettenne`, `четрнаестодневну`, `десетомилијарданског`), case forms (ru `двух`), ordinals, "one" words only where they cannot be articles, doubles (`втрое`, `doble`), Arabic duals (`مركبتَي`). A one-word or an article beside a tens word is not joined (`Sessanta e un ritardo` is 60, not 61).
- **CJK and Korean numerals** with scales: `38万4,000`, `1億5000万`, `9.46万亿`, `一千亿亿`, `三十〜四十億`, ko `1억 4,000만`, `7천 4백만`, `9조 4,600억`, `4,500~6,500만` (scale shared across a range), 京/경, kanji decimal `一・七三一`, ko native numerals before a counter (`두 번째`, `두 곳`). Not numbers: ko `2만이` ("only 2"), `구경`, `조차`, `천문`; zh `千克` `兆瓦` (SI prefixes).
- **Roman numerals** of two or more capitals on the translation side (`XXI`, `XXᵉ`, Cyrillic `ХХ`); a single letter is not read, and the English side never reads `Saturn V` (both sides agree: a name, not a number).
- **Decades, short years, centuries**: `1960s` = `années 60` = `anni Sessanta` = `шестидесятые` = `ستينيات`, `1946-47` = `1946–1947`, `the 2100s` = `22. веку`, ar `العقد الثاني من القرن الحادي والعشرين` = 2010s, it `settecentesco` = 18th.
- **Scales and units**: million/billion in every locale (`Mio.`, `Mrd.`, `млн`, `मिलियन`, `مليون`, ru `миллиардов`/`-миллиардолетний`, es `trillones`, fr `mille milliards`), `Gyr` `Myr` `Mpc` `Ga` `bn` `Mal` (fr only) `Mlj` (nl only), `$100M`, `36k`, `6.1 M km`, `0.7–1.3 billion` and `from 10 to 20 million` (scale shared), Indian grouping `3,33,000`, `10 prochains Ga`.
- **Equivalences read from the English**: `3.2-gigapixel` = 32億画素 (SI prefix word), 10 ft = 3 m / 1.7 mi = 2.7 km / 4.4 lb = 2 kg (within 5 %), `23 and a half` = 23,5, `1/6` (the 1 is a word), `1-year` (an adjective), `24/7` (idiom), `1P/Halley` (a name), `10:00` = 10 h.
- **Notation**: subscript digits on the translation side (`N₂O₄` = `N2O4`), a plain space after a Latin name is not thousands grouping (`Yutu-2 140 кг`, `Ariane 4 116회`), a scale is not carried from a name-number (`L2 a 1,5 milioni`).
- **A value is present or it is not.** How often a number is said is no longer compared: `Launch Complex 17 (LC-17)` becomes `LC-17` in ten locales. Cost, measured below.

### Before and after (all 38 trees, 13 locales)

"before" is the previous part's "after" column (1,856); "after" is the finder as it stands, before the reviewed list is subtracted. The 27 left are all in the reviewed list.

| tree | before | after |
|---|---:|---:|
| belts | 8 | 0 |
| culture-doors | 5 | 0 |
| deep-sky | 36 | 0 |
| earth-objects | 20 | 1 |
| essays | 135 | 1 |
| fleet | 279 | 3 |
| glossary | 5 | 0 |
| hotspot-metadata | 0 | 0 |
| iss-modules | 0 | 0 |
| iss-visitors | 7 | 0 |
| mars-sites | 16 | 0 |
| mars-traverses | 2 | 2 |
| missions | 316 | 3 |
| moon-sites | 34 | 0 |
| moon-traverses | 0 | 0 |
| museums | 3 | 0 |
| observatories | 13 | 0 |
| orbit-regimes | 8 | 0 |
| orbit-regimes-explore | 7 | 0 |
| orbit-regimes-mars | 12 | 0 |
| orbit-regimes-moon | 13 | 0 |
| original-work | 32 | 0 |
| planets | 22 | 0 |
| programs | 106 | 0 |
| rockets | 13 | 0 |
| satellites | 43 | 0 |
| scenarios | 1 | 0 |
| science | 466 | 16 |
| site-stories | 175 | 0 |
| small-bodies | 5 | 0 |
| sourcing | 0 | 0 |
| sun | 7 | 0 |
| tiangong-modules | 0 | 0 |
| tiangong-visitors | 2 | 0 |
| trajectories | 8 | 1 |
| universe | 44 | 0 |
| venus-sites | 0 | 0 |
| videos | 13 | 0 |
| **all trees** | **1856** | **27** |

| locale | before | after |
|---|---:|---:|
| de | 85 | 1 |
| es | 111 | 1 |
| fr | 56 | 3 |
| it | 145 | 1 |
| pt-BR | 40 | 1 |
| nl | 123 | 1 |
| ru | 133 | 0 |
| sr-Cyrl | 175 | 1 |
| ja | 66 | 5 |
| ko | 70 | 5 |
| zh-CN | 381 | 4 |
| hi | 95 | 0 |
| ar | 376 | 4 |

Milestones, the same run on all trees as classes were added: 1,856 → 503 (number words, CJK numerals, Roman numerals, decades, scale words) → 266 (value-present semantics, range scales, name-number spacing, Korean/Hindi/Arabic specifics) → 127 (conversions, idioms, `1/6`, subscripts, native Korean numerals) → 43 (27 reviewed below plus the 16 fields fixed) → 27 after the translation fixes.

## Step 2: the last 43 were read one by one

The remainder was far under the ~300 stop line, so every field was read against its English (127 at the point I started reading, 43 after the last finder tweaks).

**Real errors, fixed in `i18n-src` (15 files, 16 fields):**

| locale | field | error |
|---|---|---|
| ja | essays/comms `body.6.text` | "22 watts" written 23ワット (all 6 other locales say 22) |
| ja | missions/earth/voskhod-2 `events.0.note` | `1965-03-1807時00分UTC`: the space between the date and the time was lost, so the 18th and the 07 ran together |
| ja | fleet/crewed-spacecraft/buran-ok-gli `description` | the flight-control software and the 1988-11-15 orbital flight dropped |
| ja | fleet/station/mir `description` | "almost 10 years" dropped |
| ja | planets/saturn `bio` | 282,000 km rounded to 約 28 万; now 約 28.2 万 |
| zh-CN | fleet/launch-site/baikonur-31-6 `description` | "Site 1/5" written 1号 |
| zh-CN | programs/gemini `seo_title` | "1961-1966" dropped |
| fr | programs/change `seo_title` | "Since 2007" dropped |
| ru | programs/mangalyaan `seo_title` | "2013-2022" dropped |
| nl | fleet/launch-site/lc-34 `best_known_for`, `tagline` | Apollo 7 launch date 1968-10-11 dropped (2 fields) |
| nl | fleet/orbiter/messenger `description` | "mapped the planet for 4 years" and the 16 m crater dropped |
| es, it, nl | programs/sputnik `seo_description` | "Sputnik 2 and 3 followed." dropped (rewritten inside the 160-character cap) |
| ko | fleet/crewed-spacecraft/endeavour `description` | "Node 1 Unity" written "Unity" |

**Reviewed exceptions, 27** (`number-drift-reviewed.json`, each with a reason and a hash of the English and the translation; any edit to either brings the finding back):

- the English figure is written another way the finder does not read (14): "other 3 billion" as « 3 autres milliards » (fr ×2), "~10 selectees" as "une dizaine", "15 minutes" as "quarto d'ora", "24-hour day" as "etmaal", "at #1" as "no topo", "#1 problem" as "가장 큰 문제" / "首要问题", "100% oxygen" as "純酸素" / "纯氧" / "كله أكسجين" (3), "Flight 1" as "初飛行" / "首飞", "over 1 day" as "하루 만에", "1-2 m" as "متر إلى مترين", "~50 and ~62 kpc" with one unit (ar);
- a rounded or approximate figure (3): "~333,000×" as 33万 (ja, ko, zh-CN);
- a name or designation rendered natively (4): Naro-1 as 나로호 (ko ×2), Hartley 2 as 103P (ar), "2nd stage expendable" as "Einweg-Oberstufe" (de);
- a date or day in another form (4): 19 October UTC as 20 October JST (ja ×2), "EOM 2018-10-31" as "fin de octubre" (es), "July 4" as an ordinal word (sr-Cyrl).

## Step 3: the gates

- `node scripts/i18n-tools/number-drift.mjs tree=all --gate` (every tree, every locale; exit 1 on any unreviewed finding or any exception that matches nothing) is the task `check-i18n-number-drift` in `scripts/validate-data-runner.ts`, so `npm run validate-data` and the build run it.
- `scripts/i18n-tools/dropped-sentences.mjs` was brought to the same shape (`tree=all`, `--unreviewed`, `--gate`, `--accept`, hashed exceptions in `dropped-sentences-reviewed.json`) and is the task `check-i18n-dropped-sentences`. The 26 fields of `2026-11-09-dropped-sentences-review.md` became 20 reviewed entries (same reasons); the other 6 had been restored and are no longer flagged. Gate at zero: 0 unreviewed, 20 reviewed.
- `scripts/i18n-tools/reviewed-gates.test.ts` guards both: every exception has a locale, existing files, a reason and two hashes, and each `--gate` run reports 0 unreviewed.
- Recording a finding: `node scripts/i18n-tools/number-drift.mjs --accept='<locale|file|field>' --why='<reason>'` (same flags on `dropped-sentences.mjs`).
- A new class of false positive is taught to the finder with a unit test, not recorded.

## Cost of the finder change, measured

Sensitivity check (not part of the gate): 6,000 random digit mutations in translations that pass (the last digit of one number +1, seed fixed): the finder before this part caught 98.2 %, now 91.4 %. In a second sample of 6,000 (image-path strings left out), 389 mutations only the old finder caught: 291 are a number the translation also says elsewhere in the same field (value-present semantics), 50 are matched by a number word, 21 by the short-year/decade rule, 24 by idioms and conversions, 3 by Roman numerals. Counting how often a number is said instead (95.8 % caught) shows 55 more fields; all 55 were read and every one was the translation saying a repeated number once ("Apollo 13 … the 13 explosion", "Merlin 1D throttles 40-100%, Raptor 2 throttles 40-100%" → "also"), none an error, so that counting is not enforced.

## Not done / not verified

- Detection stayed behind the old 98.2 % (above). A changed number that the English says twice and the translation says once, rightly or wrongly, is not reported.
- Word readers are generous on purpose (any matching stem anywhere in the field counts): an unrelated word that starts with a number stem (ru `семинар`, de `Dreieck`, it `settembre`) reads as that number and can hide a dropped one. Measured only by the mutation sample above (50 of 6,000), not audited per locale.
- Arabic duals are a list of nouns (`مترين` `ليلتين` …): a new dual noun will show up as a finding to accept or add.
- The translation fixes were made by me in the same pass; no native-language review, and no science-reviewer pass on the seo_title and description rewrites.
- `npm run preflight`, the full test suite, e2e and the build were not run; run here: `npm run validate-data` (all green, 21 tasks), the vitest files `number-drift*.test.ts` and `reviewed-gates.test.ts`, prettier and eslint on the touched files.
- `static/data/i18n/*.json` bundles (gitignored) still hold the old text until `npm run build-i18n-bundles`.
