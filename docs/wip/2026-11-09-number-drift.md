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
