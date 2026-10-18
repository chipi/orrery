# Why the translations needed so many fix rounds

*Evidence analysis, 2026-10-18. Read-only research: no repository file other than this one was changed. Every number below was computed with a command on the repo at HEAD (`98d7ef597cc`) unless a commit is cited. "Not found" means I searched and did not find it, not that it does not exist.*

Scope searched: 494 commits touching `i18n-src/`, `messages/`, `scripts/i18n*`, `scripts/lib/translate-*.mjs`, `scripts/translate-*.mjs`, `scripts/_archive/i18n/`, `docs/guides/i18n-*.md` (2026-04-28 to 2026-10-18; 172 have "i18n" or "translat" in the subject; 74 of the 494 are dated 2026-10-16 or later, 71 of those on 2026-10-17/18).

Short answer, in one paragraph. Four causes stack. (1) The first five months of translation had no glossary, no name rules and no content check beyond "file exists"; the glossary (`native-terms.json`, 674 terms) was created on 2026-10-17, 166 days after the first locale commit. (2) The operator's name and terminology rules changed several times on 2026-10-17/18, and each change re-opened strings that were already marked done. (3) The automatic gates measure script, placeholders and name spelling; they read ~0% defects on a corpus that Sonnet reviewers (no human reader was involved) then marked 8.5% BROKEN and 29.7% BROKEN+MINOR. (4) Model choice matters for long editorial and for script integrity in low-resource languages, but it explains less than the rules and the missing glossary: the all-Sonnet-5.5 locale (sr-Cyrl) has the highest BROKEN rate of the 13.

---

## 1. Timeline of rounds

Rounds are grouped by date and topic from the commit log. "Not checked" is what the round's own commit message or tooling does not cover.

| # | Dates | Trigger | What it fixed / produced | Not checked |
|---|---|---|---|---|
| 0 | 2026-05-04 to 05-23 | Feature build (RFC-010 closed). `7f1ccd72009` glossary + es; `067d1d06b5b` 12 locales added "Co-authored-by: Cursor"; `ddab7986e5a`, `6ef19d859e7`, `17e65ddd5f6` (Opus 4.7 session) 95+59 keys x 12 locales, "100% locale parity"; `e18442fcb6a` nl; `a6b28fc0c98` "588 translations ... hand-authored" | Key parity (684 keys per locale) | Meaning, terminology, names. "Parity" meant keys present. No glossary except the Spanish column (style guide lines 96-131: Spanish filled, other columns "—"). |
| 1 | 05-11 to 05-13 | `0451f4cd894` "fixes to serbian translation"; `68c7406433f` untranslated chrome, 180 keys; `1d71573e835` English loans -> native in EU locales | UI chrome gaps | Overlays (content) not touched. |
| 2 | 06-04 to 06-22 | Gap fills. `3ca646e411e` 19 chip keys via Sonnet 4.6; `3b8e1c90c91` "1037 leaked English strings across 11 locales" (11 parallel agents); `7b31c670194` release prep, 749 + 234 translations | Strings identical to English | hi and ar excluded ("sample-only locales", `3b8e1c90c91`). Quality of the existing text. |
| 3 | 06-27 to 06-29 | `8ba3255849f` to `46887d1a047` (7a-7h, 137 keys x 14 locales) and areas A-H (`57d83f20e3c` to `99b59d2d1e5`, Opus 4.8 session) | 201 English UI keys; dropped `{placeholders}` (area D); garbled "Why?" bodies in ar/hi/ja/ko/ru/zh-CN (area H: "how squashed the ellipse is" -> "how the fabric was destroyed") | Only the symptoms found by an audit. |
| 4 | 07-10 to 07-18 | Programs, dispatches, essays, alt text. `402113a75cb` gate "every en-US overlay has a non-empty sibling in all 13 locales"; `ddb12ca70d1` 15 programs (Sonnet 4.5); `d39fe950988` essays (Haiku 4.5, one call per essay and locale); `af7750f3eaf` alt text (Haiku) | Coverage of the new surfaces | The gate tests file presence. Inside present files the 10-17 scan later found 1,618 English event labels and 269 English event notes (`cdb13f7378e`). |
| 5 | 08-02, 08-05 | English fact-check. `bab97e3b2db` ~55 factual errors "propagate into all 13 translated locales", `31dad68c31a`, `b3ee7406353` | Facts, then re-translation of the touched strings | Translation quality. The English Challenger text named Sally Ride among the dead until `228060dfb8c` (10-18). |
| 6 | 08-28 | `5b26a92547e` de sweep; `af350e425c2` "repair MT-corrupted locales" (~1,800 keys: ar Jupiter->"Japan", zh-CN NEPTUNE->"France", ko labels "seeded from an unrelated company-website template") | Label tier | Prose: "Long-form prose ... was largely intact" (same commit). Graded 10-18, essays are the worst segment (section 2.4). |
| 7 | 09-07 to 09-12 | Lab/privacy/cards key fills (`88aef24c82e`, `db22cd98dfc`, `7d6b56a71f2`); `1de55058398` "haiku-only translation policy" | Seven leaked English Lab keys in de/fr/it/nl/pt-BR | No quality pass. |
| 8 | 10-16 | `63f7421e567`, `4f1cd076c4c`, `04d46d229ab` (#608) | Two Hindi strings left English; ar overlay -> 14 locales | - |
| 9 | 10-17 (52 commits) | Operator audit. `cae1be941cc` 8,105 files, detector 11.6% -> 0.0% (sr-Cyrl); `0a635cbc685` first graded sample; `8342404b5c4`, `56cc7c1a8bb` names; `d764b4950f1` to `36d99016273` "93 of 93" paragraph arrays restored; `f019615c003` origin names; `6385199ed42` bodies native; `40e8cdcf71c` glossary; pass 1 and pass 2 per locale; `e9bb59980fd` catch-up | Script/defect rate, names, truncated paragraphs, English leftovers | The graded sample of the result (n about 27 per locale) found ja 22.2%, zh-CN 20.4% BROKEN afterwards (`0a635cbc685`). Meaning and fluency of whole text. |
| 10 | 10-18 (19 commits) | `228060dfb8c` 2,990-string graded sample; `0f300807f7f` 820 graded strings fixed; ISS (`b20bc703b90`), agencies (`e462bd27426`), ISRO (`6b0410bc48f`) rulings; `e7f1fdb0707`, `42304e95f58`, `98d7ef597cc` item 3 full review | 253 BROKEN + 636 MINOR graded strings; item 3 started | Item 3 covers 859 committed strings plus 947 drafted (ru, uncommitted) of 28,332 staged in 201 batches (3.0% committed, 6.4% with the ru draft). Latin-script locales: no item 3 fixes yet (not found). |

Fix commits per locale (git log on `i18n-src/<loc>` + `messages/<loc>.json`): ru 317, sr-Cyrl 313, zh-CN 320, de 315, ja 318; 32 to 41 of each on 2026-10-17/18 alone.

---

## 2. Why each round found new problems

### 2.1 Models: a mix of tiers, with policy flips

Evidence of what translated what (script model strings, `git show 1de55058398^:scripts/<f>`; commit trailers):

| Surface | Model | Source |
|---|---|---|
| Archive one-shots (34 files, 15 name a model) | Sonnet 4.5 x14 occurrences, Haiku 4.5 x3 | `grep -ho claude-... scripts/_archive/i18n/*` |
| programs, exoplanets, named stars, culture doors | Sonnet 4.5 | `translate-*-i18n.mjs` at `1de55058398^` |
| essays, dispatch, alt text | Haiku 4.5 | `translate-essays-i18n.mjs:61` (at `d39fe950988`) |
| gaps, science-fields, v07-ui | Haiku 4.5 default, Sonnet 4.5/4.6 and Opus 4.8 fallbacks | same |
| UI keys 05-09 to 06-29, areas A-H | session agents, trailers Opus 4.7 / 4.8 | `17e65ddd5f6`, `57d83f20e3c` |
| 10-17 sr-Cyrl, all overlays | Sonnet 5.5 | `cae1be941cc` |
| 10-17 other 12 locales names pass | Haiku | `cae1be941cc` |

Policy changes: `d13c1ee992b` (07-14) AGENTS.md "Sonnet for essays and /programs"; the essays script written 07-18 used Haiku anyway; `1de55058398` (09-09) "ALL ... Haiku, hardcoded"; `a664281ecad` (10-17) Haiku default, Sonnet for sr-Cyrl; `0a635cbc685` (10-17) Sonnet for editorial in every locale. In 6 weeks the written model rule changed four times.

I could not find which model produced the ko "company-website template" labels or the ar "Jupiter -> Japan" labels (`af350e425c2` says "machine-translation", no model named).

### 2.2 Strings were translated without page context or terminology

- `translate-i18n-gaps.mjs` (at `1de55058398^`, line 396): `// Translate one string in isolation`. `translate-v07-ui.mjs` sent a JSON object of 20 keys per call (line 15, 157-159) with no page, no neighbours.
- The prompts told the model the opposite of later rules: `SYSTEM_BASE` line 97 "Keep proper nouns: ... person, place names"; v07-ui line 90 "use the target language's STANDARD name for planets ... else keep the Latin name".
- No glossary in the prompt, then or now. `systemAddendum()` is `[BASE_RULES, NAME_POLICY, LOCALE_RULES[locale]]` (`translate-quality.mjs:75-77`); `grep glossar scripts/retranslate-fields.mjs scripts/lib/translate-model.mjs` returns nothing. The glossary is only used after the answer, in `glossaryRendered()` (`translate-quality.mjs:331`). The strategy guide claims otherwise: "the prompt carries NAME_POLICY and the glossary" (`i18n-translation-strategy.md:183`). Doc and code diverge.
- Context arrived only on 2026-10-17: `retranslate-fields.mjs:180` sends the page title, field path and earlier translations of the same file (`34c8b999012`).
- Consequence in the data: one name, many spellings. Strategy §7 line 221-228 lists them (ja ネプチューン next to 海王星; zh Sojourner as 大师 "master"; about 115 old vehicle-name drifts found by `name-drift-scan.mjs`). The 10-18 data-set round still had "Woomera, Houston, Florida ... still English in mission and science pages" (strategy line 276-278).

### 2.3 Rules arrived after the translations, and changed

`native-terms.json` was first committed in `6385199ed42` (2026-10-17). The first locale commit is `ef20c2f8728` (2026-05-04). Order of the 10-17/10-18 rulings, each applied to text that already existed:

1. `34c8b999012`: "Names are never translated ... people, places, sky features stay exactly as the English writes them" (supersedes "transliterate surnames").
2. `f019615c003`: origin rule (Союз МС in ru, 神舟 in zh-CN).
3. `6385199ed42`: planets/moons native in ja/zh-CN/ko (837 strings, 355 files).
4. `40e8cdcf71c`, `a66b7050ff4`: people, stars, features native via Wikidata.
5. `b20bc703b90`, `e462bd27426`, `6b0410bc48f` (10-18): ISS is a term; agencies use their local name; ISRO is इसरो in hi.

Concrete cost: `i18n-src/ru/planets/mars.json` was edited three times on 2026-10-17 by three different rules (`cae1be941cc` names to English, `f019615c003` origin names, `d799c50eeaa` bodies native). The model prompt itself was stale for part of the period: `228060dfb8c` records that `NAME_POLICY` "still said people, stars, surface features and eponymous terms stay in Latin, the opposite of the operator rule", and the Hebrew pilot ran under the old text.

The conflict is still in the code at HEAD: `translate-quality.mjs:64` (sr-Cyrl) says names stay in Latin, "Oceanus Procellarum" included, and "never transliterate a name into Cyrillic"; line 68 (ru) "names follow the NAMES rule (Latin, as in English)"; line 72 (he) "Latin, as in English, except Israeli names". `NAME_POLICY` line 37 says people, features and cities are native. The checker enforces the Latin side: line 446 rejects any Latin word in a non-Latin locale that is not copied from the source.

### 2.4 What the gates verify versus what only a reader sees

| Layer | Verifies | Cannot verify (my reading of `translate-quality.mjs`) |
|---|---|---|
| `problems()` (`:351`) | placeholders, U+FFFD, designations kept (Apollo 12, NG-19), known names kept, Latin words not from source, sr/ru letter sets (`:81-93`), foreign script, English stop-words, "returned the English" | meaning, grammar, case and gender agreement, register, fluency, omitted sentences (no length-ratio check; `grep ratio` finds none), correct term choice |
| `i18n-detect.mjs` | untranslated, mixedWord, russianInSr, truncated (post-hoc), corrupted | same as above |
| `validate-data` file gate (`402113a75cb`) | file exists and non-empty | content |
| coverage scan (`cdb13f7378e`) | missing/empty/identical to English/placeholders | quality |

Numbers: detector rate for sr-Cyrl fell 11.6% -> 0.0% and others 2.7-4.6% -> 0.0-0.1% (`cae1be941cc`). Graded the same day: ja 22.2%, zh-CN 20.4%, hi 16.7%, ar 16.7%, ko 14.8%, de 14.8% BROKEN, and the commit states "Detectors read ~0% throughout: the defects are translated names and garbled long prose, which no regex sees" (`0a635cbc685`). `translate-quality.mjs` has no Hebrew niqqud check (CHECKS has only sr-Cyrl and ru, lines 80-94), and 15 of 3,168 strings in `he-pilot-messages.json` contain niqqud/cantillation marks against the rule at line 72.

Paragraph loss was invisible to every gate until 10-17: 93 of 93 sampled arrays had fewer or duplicated paragraphs than en-US (`36d99016273`).

### 2.5 Sampling versus full review

The first graded sample (`0a635cbc685`) used about 27 strings per locale (the reported rates are 3.7, 7.4, 11.1, 14.8, 22.2: multiples of 1/27; this is my inference from the numbers). The second used 230 per locale (2,990 total). One BROKEN string in a 10-string editorial cell is 10%.

Samples understate what a full pass finds. Same cell, sample flagged (MINOR+BROKEN) versus full-review change rate:

| Cell | Sample flagged | Full review changed | Source |
|---|---|---|---|
| zh-CN universe | 16/25 = 64% | 177/233 = 76.0% | `e7f1fdb0707` |
| sr-Cyrl universe | 8/25 = 32% | 132/236 = 55.9% | `42304e95f58` |
| sr-Cyrl planets and sites | 9/25 = 36% | 185/390 = 47.4% | `98d7ef597cc` |
| ru UI long | 8/25 = 32% | 476/947 = 50.3% (drafted, not committed) | `item3/fixes/ru-ui-long-0[123].json` |

Across the four cells: 970 changed of 1,806 reviewed = 53.7%. Caveat: "changed" counts any improvement the reviewer made, "flagged" counts the grader's MINOR+BROKEN; the two bars differ. The direction is the same in all four cells.

A classified sample of the 973 item 3 fixes (60 random, 28 read by me): word-level meaning/term fixes, Latin name -> native form (Bayer names, Orion, Lyra, Iliad/Ajax), case and gender agreement, hyphen-glued Latin names reworded, full-width punctuation, revert-to-English for cited titles. The scripted heuristic over all 973: 41 differ only in punctuation/space, 277 reduce the count of Latin words in a non-ASCII string (names/terms moved to native script), 655 other.

### 2.6 Rules that themselves produced errors

- Hyphen-inflected Latin names. The sr-Cyrl rule (`translate-quality.mjs:64`) told the model "Inflect with a hyphen when a case ending is needed (NASA-ин, Voyager-а)". Count at HEAD (`grep -rohE '[A-Za-z]+-[а-яёђјљњћџ]+' i18n-src/<loc> messages/<loc>.json`): sr-Cyrl 1,449 occurrences in 438 files (NASA-ин 79, Shuttle-а 43, NASA-ина 40, ESA-ина 27, Hohmann-ов 21, Soyuz-а 18); ru 120 in 55 files. Some are legitimate compounds (D-модели). The sr-Cyrl planets/sites review fixed Latin names "inflected with a hyphen (NASA-ин, Kuiper-овог)" in 185 strings (`98d7ef597cc`). Strategy line 207 and 269-270 record that Serbian vehicle and agency names still carry hyphenated endings by decision.
- Nominative names after mechanical swaps: ru "с Байконур", "после Гагарин", "команда Королёв" (82 hand fixes, `5c86c9d7f51`).
- The checker rejected correct fixes: 28 graded fixes refused (Orion and Kepler collide with spacecraft names), 37 grader fixes rejected for putting a native name back into Latin (`0f300807f7f`); Gemini and Cygnus needed an allowlist (`42304e95f58`).
- Graders and rules disagreed: in the 10-18 sample the graders marked a Latin name in a Cyrillic text BROKEN, which is the rule `translate-quality.mjs:64` told the translator to follow.

Share of the 889 graded findings whose issue text matches a name/Latin/native/untranslated/hyphen keyword: 250 (28.1%); among the 253 BROKEN: 120 (47.4%). Keyword matches, not a hand classification; categories overlap.

### 2.7 English source churn

~55 factual errors in English propagated to 13 locales (`bab97e3b2db`); 22 findings across 24 documents (`f2c9e6b8314`); CNSA vs CMSA (`b7ad228c4eb`, `08dd3e7b524`); the false Sally Ride line stayed in ja and zh-CN after a nine-locale fix because the English was still wrong (`228060dfb8c`). Each English change requires re-translation in 13 places; no gate ties a translated string to the English revision it was made from (not found).

---

## 3. "Did we just use cheap models and pay the price?"

**Partial.** Model tier is a documented cause for long editorial and for script integrity in sr-Cyrl. It is not the main cause of the volume of fixes.

For the model hypothesis:
- `translate-model.mjs:28-31`: graded samples "showed Haiku failing 8 of 12 locales (7-22% broken), worst on long editorial".
- `translate-model.mjs:23-24`: Haiku sr-Cyrl detector pass 11.6% of strings vs 2.7-4.6% elsewhere; Haiku output had "ушће" for "entry" and an English "the" mid-word; the Sonnet 5.5 pilot had correct grammar where "the 4.5 pilot had степен gender/case errors" (`34c8b999012`).
- Essays (Haiku 4.5, long output, one call per essay and locale) are the worst graded segment: 44 BROKEN of 130 = 33.8%, 68.5% BROKEN+MINOR. Programs, built "like the /programs translator" on the same extraction method but run on Sonnet 4.5: 3 of 130 = 2.3% BROKEN. Confound: the essays segment also contains some of the ~4,000 editorial fields the stopped Sonnet 5.5 run wrote on 10-17 (`f9b48278071`); I cannot separate them (not found), and the two content types differ.

Against the model hypothesis:
- sr-Cyrl was re-translated in full on Sonnet 5.5 (`cae1be941cc`) and has the highest BROKEN rate: 30 of 230 = 13.0%. 20 of its 30 BROKEN findings match the name/Latin/untranslated keywords (66.7%); the rule that produced them is in section 2.6.
- Sessions that wrote translations by hand were Opus (trailers on `17e65ddd5f6`, `57d83f20e3c`, `99b59d2d1e5`) and still left ar "Jupiter -> Japan"-class errors that `af350e425c2` later repaired; the producing model of those strings is not named (not found).
- Of the 253 BROKEN graded strings, keyword split: names/script/untranslated only 94 (37.2%), meaning/grammar/garble only 104 (41.1%), both 26, neither 29. Only the second group is a model-capability signal; a stronger model following the 10-17 morning rule would reproduce the first.
- The fix pass itself is not free of rule errors: 37 grader fixes violated the rules (`0f300807f7f`).

### 3.1 Latin-script versus non-Latin locales (graded sample, 2,990 strings)

Groups: Latin = de fr es it nl pt-BR; non-Latin = ru ja zh-CN ko hi ar sr-Cyrl. Cells = locale x segment (11 segments); a cell fails when BROKEN >= 20% or BROKEN+MINOR >= 50% (the plan's re-translate threshold, `docs/wip/2026-10-17-post-v1-arc-plan.md:80`). Numbers from `graded-2026-10-18/<loc>.json`.

| | Latin (6) | Non-Latin (7) |
|---|---|---|
| Strings sampled | 1,380 | 1,610 |
| BROKEN | 84 = 6.1% | 169 = 10.5% |
| BROKEN+MINOR | 27.3% | 31.8% |
| Failing cells | 11 of 66 (6 by BROKEN, 10 by BROKEN+MINOR) | 27 of 77 (19, 18) |
| Findings with a name keyword | 80 of 377 = 21.2% | 170 of 512 = 33.2% |
| BROKEN: names-only / meaning-only / both / neither | 23 / 37 / 10 / 14 | 71 / 67 / 16 / 15 |
| BROKEN names-only per sampled string | 1.7% | 4.4% |
| BROKEN with a meaning keyword (meaning-only + both) per sampled string | 3.4% | 5.2% |

Per locale BROKEN / BROKEN+MINOR: Latin de 7.0/30.0, fr 7.0/24.8, es 4.3/22.6, it 4.3/24.3, nl 9.1/33.5, pt-BR 4.8/28.7. Non-Latin ru 10.0/27.8, ja 9.6/26.5, zh-CN 11.7/42.2, ko 11.7/32.2, hi 12.2/40.0, ar 5.2/27.0, sr-Cyrl 13.0/27.0. The groups overlap: nl (Latin) 9.1% is above ar 5.2%.

Per segment BROKEN / BROKEN+MINOR, Latin vs non-Latin: essays 23.3/66.7 vs 42.9/70.0; UI long 2.7/24.7 vs 12.6/42.3; fleet 12.7/40.7 vs 14.9/42.3; mission descriptions 7.3/31.3 vs 16.0/44.0; science 5.0/50.0 vs 11.4/34.3; programs 0.0/10.0 vs 4.3/28.6; short UI 1.3/8.0 vs 4.6/12.6; universe 1.3/14.0 vs 8.6/30.3.

Item 3 change rate per locale, where available: zh-CN 76.0% (universe), sr-Cyrl 55.9% and 47.4%, ru 50.3% (drafted). All four are non-Latin; Latin locales have no item 3 fixes (not found), so no change-rate comparison exists.

**Should non-Latin languages run on a stronger model? Partial.**

- Model effect (supported): script integrity. Haiku wrote Russian words, Hangul and Latin-in-Cyrillic into Serbian (`34c8b999012`, `translate-model.mjs:24`); Sonnet 5.5 plus checks took the detector rate to 0.0% (`cae1be941cc`), though the checks and the model changed together. Long editorial in non-Latin locales is where BROKEN is highest (essays 42.9%, UI long 12.6%).
- Rules/glossary effect (supported, larger share of the gap): the non-Latin excess BROKEN is 4.4 points (10.5 vs 6.1); the names-only share is 2.7 of those points (4.4% vs 1.7% of sampled strings) and the meaning-keyword share 1.8 points. Non-Latin locales carry what Latin ones mostly do not: native forms for people, bodies and stars (glossary), origin-language names, case endings on names, and the hyphen rule.
- Not measured: a controlled comparison (same strings, two models, blind grading). Not found in the repo. The best-model locale (sr-Cyrl, Sonnet 5.5) still has the worst rate, so a stronger model without the rule fixes would not have closed the gap.
- Latin-script locales also fail: 11 failing cells, led by essays (23.3% BROKEN) and fleet descriptions (12.7%).

---

## 4. Method gaps and the change that closes each

| # | Gap (evidence) | Change in the pipeline | Cost / requirement |
|---|---|---|---|
| 1 | Glossary created after the text (`6385199ed42`, 166 days after first locale) | `native-terms.json` column for the new locale, filled and read before the first model call | Free; reading 674 terms plus ~20 abbreviations. Hand time. |
| 2 | Glossary not in the prompt (`translate-quality.mjs:75-77`; strategy line 183 claims it is) | Inject the glossary entries whose English key occurs in the field, with their target-language form, into each call; make the strategy text true or delete the claim | Code in `translate-model.mjs`/`retranslate-fields.mjs` + a test; no run cost. |
| 3 | Contradicting rules in code (`translate-quality.mjs:64, 68, 72` vs `:37`) | Delete the per-locale name sentences; keep one `NAME_POLICY`; add a test that no `LOCALE_RULES` entry mentions names | Small code change. Operator ruling needed for the Latin-name inflection rule (gap 4). |
| 4 | Latin names with glued/hyphen endings (sr-Cyrl 1,449, ru 120) | Rule decided per language before translating: reword to avoid a case ending, or use the native form; checker `:446` follows that rule | Operator decision per language. |
| 5 | No per-locale style sheet (de/fr "Sie/vous" -> "du/tu": `5b26a92547e`, `af350e425c2`; style guide §3-4 filled for es only) | One page per locale: address form, button mood, quotes, numerals, abbreviations, plural/gender policy; injected in the prompt | Hand time per locale; free. |
| 6 | One string, no page context (`translate-i18n-gaps.mjs:396`, v07-ui batches of 20 keys) | Always use `retranslate-fields.mjs --batch` (page title, earlier fields, consistent names) | Already exists (`:180`, `:296`); retire the older scripts. |
| 7 | Gates do not read meaning (2.4) | Add a length-ratio check to `problems()` (omissions), per-locale script checks (he: no niqqud, no Arabic letters), and a full reader pass in the pipeline (gap 8) | Code; the reader pass costs tokens. |
| 8 | Sampling understates (2.5: 32-64% flagged in sample vs 47-76% changed in full review) | Full review of every string by a second model/session before ship, not a sample; batch size as in `item3/BRIEF.md` | Item 3: 28,332 staged strings, ~53.7% changed in the first 1,806. A paid Sonnet pass is a run to size (`size-paid-runs-before-launch`). The free route is an in-session subagent (strategy line 120). |
| 9 | Rules changed after text existed (2.3) | Freeze the rule set in `NAME_POLICY` + glossary before the run; any later ruling triggers one scripted catch-up per locale, not a new hand pass | Process rule; the tools exist (`glossary-apply.mjs`, catch-up in `e9bb59980fd`). |
| 10 | Parity gate tests presence (`402113a75cb`) | Gate on `i18n-coverage-scan` (identical-to-English, array length, placeholders) | Exists; wire as `validate-data` gate for the new locale. |
| 11 | English edits do not invalidate translations (2.7) | Record the English hash per translated string; fail validate-data when it differs | New code; a manifest per locale. |
| 12 | Model chosen by successive rulings, flipped four times (2.1) | Pilot 100 strings x 2 models, blind-graded, choose by the numbers; record in `translate-model.mjs` as the code already does for sr-Cyrl | Two small paid runs (the he UI pilot cost ~$2.65 for 3,143 strings, `228060dfb8c`). |

---

## 5. Hebrew from the start (he, Modern Hebrew, RTL, non-Latin)

**Sequencing (operator, 2026-10-18):** Hebrew (9c) is phase 3. Phase 2 comes first: the
item-3 backlog (glossary names, Cyrillic case endings, unit and separator sweeps, the
English source errors) plus the review passes those fixes need, so the 13 existing
locales are stable before a new one is translated against them.

What exists for `he` (grep results):

- `translate-quality.mjs:21` language name, `:72` rules (no niqqud; names Latin "except Israeli names"), `:97` script test; `NAME_POLICY` line 35 names Israeli names.
- `maps/2026-10-17-translation-cleanup/he-pilot-messages.json`: 3,168 keys (3,143 translated per `228060dfb8c`), not wired (no `messages/he.json`). It ran under the stale `NAME_POLICY`: 23 strings keep Andromeda/Kepler/Gagarin/Armstrong in Latin; 15 contain niqqud/cantillation; 100 are identical to English; `nav_essays` reads "הנקודת המבט הרחוקה" (definite article on a construct noun; my reading, no Hebrew reviewer has read it, and the operator rule says no native-speaker review step). The pilot has not been graded (not found).
- Not present: `he` column in `native-terms.json` (`grep -c '"he"'` = 0); `ORIGIN_NAMES.he` (`src/lib/name-origins.js:10-215` has ru, ja, ko, hi, ar); `he` in `project.inlang/settings.json`; RTL: `locale.ts:76` `RTL_LOCALES = new Set(['ar'])` and `hooks.server.ts:25` `locale === 'ar'`; a superseding ADR (ADR-031 line 41 excludes Hebrew); style guide terms for he; any `i18n-src/he`.

Plan, in order. Each step has an exit check; no paid run before step 6.

1. **ADR and registration.** Superseding ADR for ADR-031; add `he` to `project.inlang/settings.json`, `LANGUAGE_NAMES` (done), RTL set in `locale.ts:76` and `hooks.server.ts:25`. Exit: `npm run i18n:compile` and a locale-config test pass. Free.
2. **Fix the rules first (gap 3).** Remove the name sentence from `LOCALE_RULES.he` and from lines 64/68; add the test. Decide the Hebrew prefix rule with the operator: Hebrew attaches prefixes (ב, ל, מ, ה, ו, ש) to words, and to a Latin name with a maqaf (ב־NASA). That is the same problem as the sr-Cyrl hyphen, so the checker at `:446` and `restKept` need the decision before any run. This is language knowledge, not repo evidence; confirm with the operator.
3. **Glossary column (gap 1).** Fill `he` for every class in `native-terms.json` (body 82, feature 89, place 20, station 2, facility 14, person 227, star 235, agency 5) from `he.wikipedia` titles with `scripts/i18n-tools/wikidata-labels.mjs` (whether it accepts `he`: not checked); record unverified cells in `sources`. Add `ORIGIN_NAMES.he`: Beresheet -> בראשית, ISA/Israel Space Agency, Ofeq, Amos, the Israel Space Agency local name per strategy §3.1. Exit: `i18n-coverage-scan` reports no missing `he` key for any term used in en-US text. Free; hand time.
4. **Style sheet (gap 5).** One page: address form (the pilot used "אתם כאן"; decide plural versus masculine singular), button mood (imperative vs infinitive), quote marks (gershayim/quotes), digits (Western), no niqqud, bidi handling of Latin names inside RTL strings (decide whether to insert direction marks; strategy line 217 shows direction marks already caused defects in Wikidata labels), unit and symbol placement, plural policy. Put it in the prompt through `LOCALE_RULES.he`.
5. **Pipeline changes (gaps 2, 6, 7).** Glossary injection per field; `retranslate-fields.mjs --batch` only; add `he` checks to `CHECKS`: no niqqud/cantillation, no Arabic/Cyrillic letters, Latin people/places not in the glossary exemption. Exit: unit tests; guard replay over the 3,168 pilot strings shows the known 15 niqqud, 23 Latin-name strings rejected.
6. **Model pilot (gap 12).** 100 stratified strings (short UI, long UI, mission description, essay paragraph, science paragraph) translated by Haiku 4.5 and by Sonnet 5.5, blind-graded OK/MINOR/BROKEN by a Sonnet reviewer, then read by the operator for the same 20. Measure per model and per segment: BROKEN%, BROKEN+MINOR%, name-rule violations, niqqud/script defects, retry count and tokens per string. Decision rule from this analysis: editorial and long UI on Sonnet, short strings on Haiku unless the pilot shows otherwise (the 10-17 ruling in `translate-model.mjs:28-31`); all-Sonnet only if Sonnet's short-string BROKEN% is lower than Haiku's by more than the pilot's noise (n=20 per segment: one string is 5 points). Cost: two runs of 100 strings; size from the measured usage (`translationClient().usage`).
7. **Run in the right order, review built in.** UI -> gallery and entity pages (their names become canonical, strategy §3.3) -> editorial. After each surface, before the next: full read of every string by an in-session reviewer (free route, `item3/BRIEF.md` format), not a sample; apply through `apply-edits.mjs` with the checker. Reference rate to plan for: 53.7% of strings changed in the first 1,806 reviewed (non-Latin locales). Budget the reviewer time on that rate for he until the pilot gives a he-specific one.
8. **Gates before ship.** `validate-data`; guard replay (no new rejections); coverage scan (`sameAsEnglish`, `nativeNameMissing` 0, array lengths); `name-drift-scan`; `npm run test:coverage`; browser check at 375 px in RTL on `/explore`, `/fly`, `/plan`, `/science`, `/missions` (the Arabic precedent: `locale.ts`, `hooks.server.ts`). Graded sample of 230 strings in the same 11 segments as `graded-2026-10-18`, with the acceptance line stated before the run: every cell below BROKEN 20% and BROKEN+MINOR 50% is the repo's existing threshold; for a new locale set it lower in advance (the operator's call).
9. **What this plan does not close.** Fluency of long editorial in Hebrew without a Hebrew reader: the reviewer is a model, and the repo has no Hebrew-reading owner (operator reads Serbian, not Hebrew: memory `operator-reads-serbian`; Hebrew reading ability not found). Sampling remains the only human check unless the operator names a reader.
