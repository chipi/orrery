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
- Free route first (operator 2026-10-18): fixes are proposed as hand edits, the local
  scripts, or in-session subagents. A paid API run is mentioned only when asked for,
  or when no free route can do the job, with the reason.
- Fix what a pass finds in the same pass; hand-edit rather than re-run a model.

### 3.5 Names go through the glossary, never straight into text (operator 2026-10-18)

Hand-writing a native name into one string, without the glossary, creates drift: the
next pass, the next locale and the next page do not know it. So:

1. **Glossary first.** Every proper name (person, place, feature, body, star,
   facility) that gets a native form goes into `scripts/i18n-tools/native-terms.json`
   in all thirteen locales before any text uses it. Text is then written by
   `glossary-apply.mjs` (read and corrected per locale), not typed into one file.
2. **The site's existing form wins.** Before choosing a form, list how every locale
   already writes the name everywhere (overlays and `messages/`). The entity page's
   form is canonical (§3.3); with no page, the form most of the site already uses.
   A new spelling is chosen only where the site has none.
3. **Prove it after every pass.** For each name touched: no English key left in a
   non-Latin locale's text, and no second spelling in any locale. A pass is not
   done until that check is clean.
4. **No extra spend for self-made problems.** Repairs to an agent's own drift are
   done in session by hand or by the scripts, never with a new paid run.

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
| Serbian glues endings to Latin names after a hyphen; the swap read a possessive ending as a case ending and dropped it ("Phobos-ова разлика" → "Фобос разлика"). | Possessive endings make a possessive adjective (Фобосова, Бенуов); names that do not fit are left for a hand fix. |
| `\b` in a JavaScript regex without the `u` flag never matches next to Cyrillic, so a clean-up rule silently did nothing. | Use `(?![а-я])` / `(?<![а-я])` around Cyrillic words; check that every rule fired. |
| A markdown link put "[" between the preposition and the name (`до [Плутон](…)`), so no case was guessed. | Strip the bracket before guessing the case. |
| "комете Халејева комета": a glossary form that holds its own generic word landed after the text's generic word, with the head word last. | A per-language post-step merges them into the declined form (Халејеве комете). |
| Wikidata gave a star's designation as an abbreviation or a whole catalogue list in one alias ("α UMi", "β Ориона", "α Tauri, 87 Tauri, HD 29139, …"), and some labels were the star system or a catalogue number (hi "…तारा तंत्र", ru "Глизе 411", "34 Возничего"). | `name-forms.mjs` takes only a spelled-out designation and never a list; every star-page name is read, and a wrong one gets an override in `name-forms-overrides.tsv`. |
| Where the source had left a name in Latin, the generator had no case to keep and guessed; in ru and sr-Cyrl it guessed wrong in about one string in three ("полёт Алан Шепард", "Подножје брдо Хазбанд"). | Read every edit in an inflected language; the corrections are versioned per locale (`names-pass-corrections-<loc>.tsv`). |
| A star's name became the same as its alternate name ("Deneb Kaitos …, also called Deneb Kaitos"; "Becrux …, also known as Becrux"). | The "also called" clause takes the other name; check every star bio's first sentence. |
| Latin-script swaps put a bare constellation name where the language needs an article ("in Grote Beer", "di Croce del Sud", "Stella di Barnard è"). | Article and preposition fixes per language after the swap. |
| The swap reached inside an acronym or a product name ("MOXIE (Марс OXygen …)", the Vega rocket's adapter → "Вега"), and into a sentence about the name itself ("'Gemma' derives from the Arabic …"). | Read every edit; etymology sentences keep the name they explain. |
| A Russian pass found a false fact in a translation (Sally Ride listed among the Challenger dead). | A wrong fact found while editing is fixed in the same pass, against the English — and checked in every locale (it was in nine more). |
| Wikidata labels in a non-Latin language were sometimes the English name copied in ("michael collins", "John Glenn" as Hindi labels), or carried a zero-width space or a direction mark. | `name-forms.mjs` drops a Latin-script label in a non-Latin locale and strips those characters; a lowercase English name in the text is the tell. |
| A bare surname key hit a facility, a company or a first name ("NASA Glenn AEPS", "Glenn Visitor Center", "Collins Aerospace", "Scott Kelly"). | GUARD rows take `before` as well as `after`; a bare surname followed by a capitalised Latin name is a first name and is left alone. |
| Keys added to the glossary after a locale's pass never reached that locale. | A catch-up run per locale after the glossary grows, read like any pass; a catch-up that would undo a hand correction is not applied. |
| A paid run went on for about two hours after the API account hit its usage limit: every call failed, the retries counted as quality failures, and nothing was written. | `retranslate-fields.mjs` stops on the first quota or billing error (exit 3). Watch a run for API errors and for files written, not only for its end. |
| The batch runs left whole groups in English in one locale while the others translated them (all 23 ru colophon goal titles, 24 de and 25 nl diagram titles, 17 sr-Cyrl deep-sky titles), because the checker accepts a field kept as English. | After every run, list the fields one locale left identical to the English while most locales changed them; fill them from that locale's own translation of the same string where one exists, else by hand. |
| Overlay keys made from file paths kept their dots, so the dotted field paths broke (8,931 "not a string" fields). | Overlay keys are dot-free (`originalWorkKey` in `src/lib/original-work.ts`). |
| The glossary swap hit names that only look like a body or a star: the Antares rocket, the Vega probes, the "Snow White" trench, the "Moon" inside SLIM's English expansion, a quoted English title. | Read every edit; drop these by hand (`datasets-glossary-review.json`). |
| A glossary key spelled differently from the text ("Tranquillity Base" vs "Tranquility Base") silently matched nothing. | After a pass, list the Latin-script runs left in each non-Latin locale and check them against the glossary by hand. |
| A translation carried a wrong number (ar: Hubble's "50th" anniversary for the 25th). | Read dates and ordinals in `taken`-style fields against the English. |
| The names tool never read the UI bundle, so pages and interface named the same thing two ways (ru pages МКС, Lab button "Поймай ISS"); 973 UI strings across 13 locales. | `glossary-apply.mjs` reads `messages/<loc>.json` too (rel `messages`); `apply-edits.mjs` writes it back. |
| The checker only judged new strings; vehicle names translated long ago were never re-checked (zh Sojourner as 大师 "master", 毅力号, ko 화성 익스프레스, ja/ko Tiangong, ar ناسا …, about 115). | `name-drift-scan.mjs` runs the same name tests over every existing string; it is a `validate-data` gate. |
| A name containing a glossary term passed once the term was native ("Mars Express" → 화성 익스프레스, because Mars → 화성 is allowed). | The rest of the name must survive (`restKept` in `translate-quality.mjs`), with a regression test. |
| The shared skip list ignored every `links.*` field, so visible link labels were never checked, and an sr-Cyrl placeholder (`__АЦР0__`) and letter-by-letter garble (Цассини) shipped on eight planet pages. | `SKIP_KEY` skips link URLs (`u`) only; the defect gate now reads the labels. |
| Proposals rejected in review came back on every glossary run, ready to be applied by the next agent. | Every rejection becomes a `GUARD` row; a full run proposes nothing. |

## 8. Status (2026-10-17)

Done: titles; origin names in ru/zh-CN/ja/hi/ar; Russian people, bureaus, systems
declined; pass 1 (gallery/entity pages set one name per language); pass 2 (bodies,
features, places, facilities and the ISS in article text) for ja, zh-CN, ko, de, fr,
es, it, nl, pt-BR, ru and sr-Cyrl; the names glossary (celestial names, stars and
people from Wikidata, with small bodies and the Uranian moons) applied to the same
eleven locales, read and corrected by hand.

The names pass and pass 2 now cover all thirteen locales (hi and ar included), with a
catch-up run for ru, sr-Cyrl, ja, zh-CN and ko after the glossary gained surname keys.

Not done: eponyms and term abbreviations (§3.2: Kepler, Hohmann, Oberth stay as in
English where the glossary does not key them); crew names the glossary has no entry for
(Kerwin, Weitz, Garriott, Lousma, Brand, Slayton …) are written by hand only in the
strings these passes touched; hi people and stars without a Wikidata label carry
overrides written for this pass (name-forms-overrides.tsv), not checked against a
Hindi source; the star
index and sky labels still show the English proper name (needs a UI change); sr-Cyrl
star bios keep Latin designations ("Alpha Orionis"), because Wikidata has no
Cyrillic ones for Serbian; Venus and some Mars and Moon features without a native
form (Aphrodite Terra, Aeolis Palus, Le Monnier).

**Data sets (2026-10-18).** Site stories, deep-sky captions, trajectory labels, video
titles and captions, and the colophon's original-work entries are now translated in all
thirteen locales. Their English lives in `static/data`; `build-en-overlays.mjs` writes it
as en-US overlays, and each loader merges the locale's overlay (`src/lib/deep-sky.ts`,
`iconic-trajectory.ts`, `video-provenance.ts`, `original-work.ts`; site stories through
the existing overlay path). The paid run used `retranslate-fields.mjs --batch` (one call
per chunk returns an array; a field that fails the checks falls back to the per-field
path) and a cached system prompt, about $17 at list prices. After it: the names glossary
over the new files, read per locale; propagation of each locale's own translation to the
fields it left English; hand fixes; and the crew, places and small bodies the glossary
did not key, written by hand in the non-Latin locales (maps `datasets-*`).

Not done for the data sets: alt text (declined); vehicle and mission names stay as the
origin rule says, so Latin script remains in every locale; Serbian keeps Latin
vehicle and agency names with hyphenated endings ("NASA-ин", "Hubble-а"), and the
checker refused two Cyrillic forms ("Galileo-в тест", "Cygnus Loop-а"), which stay Latin;
informal rover target names (Yogi, Home Plate, Burns Cliff) stay in English.

The names first written by hand in this pass were then moved into the glossary (§3.5):
31 keys and 10 filled slots (`datasets-native-terms.json`), forms taken from the existing
glossary, the site's own usage, then each language's Wikipedia. Running the glossary
over every locale with them fixed the same names across the rest of the site (Woomera,
Houston, Florida, Inner Mongolia, Satish Dhawan Space Centre, Tranquility Base, still
English in mission and science pages and in one UI message), and a variant sweep put
the older spellings on the glossary form (Stuart Roosa: ru Рооса, ja ロオサ, zh 罗莎;
zh 休斯敦 → 休斯顿). Check after it: a glossary run gives zero edits for these keys in all
thirteen locales, and the site-wide audit finds no second spelling. Houston stays
English in "Space Center Houston" and inside the English Apollo 13 quote (a guard in
`glossary-apply.mjs`). Found on the way and fixed: pt-BR named Gene Cernan as the
Apollo 17 geologist.
