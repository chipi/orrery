# Orrery translation strategy

*How Orrery is translated, why, and how to do the next round. v1 · 2026-10-17*

> Read this before any translation work: a new language (Hebrew next), a new
> content surface, or a clean-up pass. The [i18n style guide](i18n-style-guide.md)
> is the per-term brief for translators; this document is the thinking behind it,
> the decisions with their dates, the tools, the order of work and the mistakes
> already made so they are not made again.

---

## 1. What makes this project hard to translate

Orrery is physics, orbital mechanics, astronomy, space history and real hardware,
in 14 locales (`en-US` source + `es fr de pt-BR it nl zh-CN ja ko hi ar ru sr-Cyrl`).
A typical sentence mixes four kinds of words that each follow a different rule:

| Kind | Example | Rule (§3) |
|---|---|---|
| Ordinary prose | "the probe slowed down" | translate |
| Science, geography, astronomy terms | Mars, Hohmann transfer, Sea of Tranquility, Betelgeuse, LEO | native, as that country's universities write it |
| People | Kepler, Gagarin, Neil Armstrong | native form of the name in that language |
| Vehicles, missions, agencies, companies | Apollo 11, Soyuz MS-24, Chang'e 5, NASA | English everywhere, except the origin language uses its own name |

The volume is large (counted 2026-10-17): 992 overlay files per locale (13,966 across
all locales, `i18n-src/<locale>/**`) holding 10,047 non-empty string fields, plus 3,168
UI messages (`messages/<locale>.json`).

## 2. Where the text lives

- **UI strings** — `messages/<locale>.json`, Paraglide (`m.key()`), compiled by
  `npm run i18n:compile`. ADR-017, ADR-031.
- **Content overlays** — `i18n-src/<locale>/<surface>/…json`, shallow-merged over the
  language-neutral base data; bundled per locale into `static/data/i18n/<locale>.json`
  by `scripts/build-i18n-bundles.mjs` (ADR-079 D2). `validate-data` requires every
  en-US overlay file to exist in every locale.
- **Search** — `static/data/science-index.<locale>.json` per locale
  (`npm run build-science-index`); the English title stays in the haystack so English
  terms still find a section.
- **Per-locale data that code reads** — e.g. `getVenusSites(locale)`, rover traverse
  stop labels, galaxy labels (`galaxy_name_*` messages): where a scene draws text
  from data, the data needs a locale overlay and the loader a locale argument.

## 3. The rules (operator decisions)

### 3.1 Names of things people built — origin rule (2026-10-17)

Missions, spacecraft, rockets, upper stages, stations, modules, programs, systems,
agencies, companies, design bureaus: **English in every locale, except the locale
of the name's origin, which uses the original name.**

- Russian/Soviet in `ru`: «Союз МС-24», «Мир», «Протон-М», «Курс», НПО им. Лавочкина.
- Chinese in `zh-CN`: 神舟, 天宫, 嫦娥五号, 朱雀三号.
- Japanese in `ja`, Korean in `ko`, Indian in `hi` (श्रीहरिकोटा), Iranian names in
  Arabic script in `ar`, a Serbian name in `sr-Cyrl`, an Israeli name in `he`.
- Everywhere else: Soyuz MS-24, Mir, Shenzhou.
- Agencies stay as they are: "NASA should be NASA — this is not translation, it's
  replacing words" (operator, 2026-10-17).
- Russian running text puts vehicle names in «» quotes; headings don't.
- Code: `ORIGIN_NAMES`, `nativeName()`, `nativeCompound()` in
  `src/lib/name-origins.js`. Every origin name must be listed there, or the checker
  rejects the native form and the scan cannot find leftovers.

### 3.2 Science, geography, astronomy, people — native everywhere (2026-10-17)

"You don't go to a Russian university and use English words in science for planets,
orbits… The same is for any country." Terminology is written the way that country's
universities, schools and space agency write it:

- planets, moons, small bodies (Марс, 火星, बृहस्पति, यम);
- eponymous terms (законы Кеплера, сфера Хилла, эффект Оберта, пояс Койпера);
- term abbreviations (НОО / ГСО / ВКД for LEO / GEO / EVA);
- Moon and planet surface features (Море Спокойствия), stars, constellations,
  galaxies (Бетельгейзе, галактика Андромеды);
- geography (countries, cities, oceans, regions);
- **people**: every language has its own form (Кеплер, ケプラー, 开普勒; de "Juri
  Gagarin", fr "Iouri Gagarine").

Exceptions only where an international standard really sticks out in that language's
own sources (instrument acronyms like JWST; Latin IAU names where native sources use
them). **Open as of 2026-10-17:** whether ISS counts as a station name (stays ISS) or
a term (МКС).

### 3.3 One thing, one name per language (2026-10-17)

"We don't want to have in one language the same thing in three places, in three
different ways." Within a locale every vehicle, program, person, body or place is
written the same way everywhere it appears.

- **The canonical form is the one on its own page** — the gallery and entity pages:
  fleet (launchers, spacecraft, stations, landers, rovers, suits, engines), programs,
  missions, planets and small bodies, sites, assets. Their `name` / `short_name`
  fields in `i18n-src/<locale>/…` set it.
- **Pass 1 — the pages themselves**: make those name fields follow §3.1 / §3.2.
- **Pass 2 — the text around them**: every mention inside editorials, essays,
  science articles, program stories, descriptions, captions and notes (the body
  text, not just titles) uses the canonical form, inflected by grammar where the
  language needs it.
- Check (to build): for each entity, its canonical form per locale, then every
  other spelling of it in that locale's text — the English name where a native one
  exists, a transliteration, an older variant (ja ネプチューン next to 海王星).

### 3.4 Other standing rules

- Universal symbols stay as symbols (Δv, Isp, C₃, g, SI units) — style guide §1.
- No native-speaker review step; the operator reads the Serbian personally.
- No paid model run without a size + cost estimate and an explicit go.
- Fix what a pass finds in the same pass; hand-edit rather than re-run a model.

## 4. How to decide a form you are not sure of

**Search the term in the target language and read how native pages write it** —
the national space agency, universities and school textbooks, the national
Wikipedia. Use that form. It can differ per language; check each one.

Record the source in `scripts/i18n-tools/native-terms.json` → `sources`. Example
(Hindi, 2026-10-17): NCERT class 6 writes the outer planets अरुण, वरुण, यम (प्लूटो),
so the glossary uses those over the transliterations यूरेनस / नेपच्यून / प्लूटो
already in the text.

## 5. The glossary and the tools

- **Glossary** — `scripts/i18n-tools/native-terms.json`: native form per locale for
  each term or person, by class (`body` first; people, features, stars, abbreviations
  to follow). It is the single answer to "how is X written in language Y".
- **Checker** — `problems(locale, en, out)` in `scripts/lib/translate-quality.mjs`
  (also `NAME_POLICY`, appended to every model prompt). Every writer runs it on each
  new string; an edit that adds a failure is refused. `scripts/i18n-guard-replay.mjs`
  replays all checks over the whole corpus — run it before and after changing a check.
- **Coverage scan** — `scripts/i18n-coverage-scan.mjs`: missing files/keys, empty,
  identical to English (incl. Title-Case titles), placeholders, origin names left in
  English (`nativeNameMissing`). `SAME_OK` lists strings identical on purpose.
- **Editing kit** — `scripts/i18n-tools/` (README there): generate candidate edits,
  review them line by line (`showdiff.mjs`), apply with checks (`apply-edits.mjs`,
  `apply-literal.mjs`, `apply-keys.mjs`). Hand-written inputs and analysis results
  are versioned under `scripts/i18n-tools/maps/<date>-<arc>/` — reuse and extend
  them; never keep them only in a temp folder.

## 6. Order of work for a new language (e.g. Hebrew)

1. **Agree the outcome per data set first** with the operator, then execute one by
   one with progress reports.
2. Add the locale (Paraglide project settings, `LANGUAGE_NAMES`, `LOCALE_RULES` in
   `translate-quality.mjs`, RTL handling like `ar`).
3. **Glossary column first**: fill the new locale in `native-terms.json` for every
   class, checking unsure forms on native pages (§4). Add the language's origin names
   to `ORIGIN_NAMES` (Israeli missions and satellites: Beresheet → בראשית in `he`).
4. Size the run (field count × cost) and get a go before any paid translation; the
   prompt carries `NAME_POLICY` and the glossary.
5. Translate UI messages, then the gallery and entity pages (their names become the
   canonical forms, §3.3), then the editorial and article text, using those forms.
6. Gate: `validate-data`, guard replay (no new rejections), coverage scan
   (`sameAsEnglish`, `nativeNameMissing` both 0), `npm run test:coverage`, and look
   at the routes in a browser.

## 7. Mistakes already made (and the rule each one produced)

| What happened | Rule |
|---|---|
| A mechanical name swap in Russian left every converted name in the nominative ("с Байконур", "после Гагарин", "команда Королёв"); 82 fixes by hand. | In inflected languages (ru, sr-Cyrl, hi, ar) generate candidates, read every one, correct the case, then apply. |
| The first ru body-name candidate list converted vehicle names ("Mars Express" → "Марс Express"). | Protect vehicle names before replacing; review the diff for them. |
| Korean particles chosen for the English word (Mars를) were wrong after the swap (화성을). | Re-choose particles for the new word. |
| The scan's "untranslated" rule missed identical Title-Case English ("Vis-Viva Equation" in 13 locales). | Title fields are checked for any remaining 4+ letter word. |
| Planet names were left in English in running text in all non-Latin locales ("к Mars", "достиг Jupiter"). | The bodies glossary + `bodies.mjs` count; zero English bodies outside vehicle names. |
| Hand-written maps lived in a temp folder. | Version them under `scripts/i18n-tools/maps/`. |
| Bare "Saturn" / "Titan" / "Jupiter" were converted to the planet where they named the rocket or missile (ja 土星ロケット, "Titan's engines" → タイタン). | Rocket families are guarded by path and nearby rocket words (`glossary-apply.mjs`); audit with `rocket-body-audit.mjs`. |
| A glossary form that already carries the generic word landed before the text's own generic word (フラ・マウロ高地高地, "cráter cráter"). | Collapse doubles (`dedupe-descriptors.mjs`); skip a form that holds the English key. |
| Latin-script swaps dropped articles and agreement ("en cráter Gale", "du base", "dello Centro"). | Per-language article rules after the swap, then read every edit. |
| A "contains the English" test matched inside words ("Plutone" ⊃ "Pluto"). | Whole-word tests only. |
| Pass 1 copied wrong page names into the glossary (zh-CN Orus = 俄罗斯 "Russia"; "Donald Johnson"). | Read every page name before it becomes canonical. |
| A longer native place name pushed a tagline past the 140-char schema limit. | validate-data after every write; shorten by hand. |
| Tests that imported untested CLI scripts dropped the coverage gate. | Helpers go in small modules under `scripts/lib/` with their own tests. |

## 8. Status (2026-10-17)

Done: titles; origin names in ru/zh-CN/ja/hi/ar; Russian people, bureaus, systems
declined; bodies in ja/zh-CN/ko. In progress: bodies in ru, sr-Cyrl, hi, ar; then
people, features, stars, abbreviations per §3.2; the one-name consistency passes
(§3.3: gallery/entity pages, then article text); then the remaining content items
(videos, colophon, trajectories, deep-sky, site stories, alt text) in
`docs/wip/2026-10-17-post-v1-arc-plan.md`.
