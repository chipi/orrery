# 9b item 3 — review-and-fix brief for one batch

You review one batch of translated strings for Orrery (a space-science site) and fix the
ones that are wrong. You do **not** edit any repository file: you write one JSON file of
fixes, and the caller applies it through the repo's checker.

## Input

`<batch>.json`: `[{ "rel", "at", "en", "cur" }]` — `en` is the English source, `cur` the
current translation in `<LOCALE>`.

## What to fix

Leave a string alone when `cur` says what `en` says, reads naturally in `<LOCALE>`, and
follows the name rules. Fix it when any of these holds:

- meaning is wrong, missing or added; a fact, number, date or unit differs from `en`;
- English words left in running text that `<LOCALE>` translates (not names — see below);
- unnatural, word-for-word or ungrammatical phrasing; wrong register; mixed scripts;
- a name written against the rules below.

The English is the source of truth for content: translate what it says. Do not correct,
soften or add to facts, numbers or names in the English, even if you believe they are
wrong.

When you fix, write the whole string anew in good `<LOCALE>`. Keep Markdown, links
(`[text](path)` — the path unchanged), `{placeholders}`, `\n`, numbers, units and
formulas exactly. Keep the length close to `cur` (never more than 1.3× its length; some
fields have schema limits: a `tagline` is at most 140 characters).

## Name rules (binding — `docs/guides/i18n-style-guide.md` §2)

1. **Glossary first.** `scripts/i18n-tools/native-terms.json`: if the English text names
   any key of any class (body, feature, place, station, facility, person, star, agency),
   use that key's `<LOCALE>` form exactly. A key with no `<LOCALE>` form stays as in English.
2. **Things people built** (missions, spacecraft, rockets, stations, programmes,
   instruments, companies, design bureaus): the English name exactly, in Latin script —
   except a name from `<LOCALE>`'s own country, which takes its original form as listed for
   `<LOCALE>` in `src/lib/name-origins.js` (`ORIGIN_NAMES`). The table is not complete: a
   thing or company from `<LOCALE>`'s own country that the table lacks still keeps its
   native name (leave the native form `cur` has; never switch it to Latin) — and list it
   under `NAMES:` so the caller adds it to the table.
3. **Agencies**: the international acronym (NASA, ESA), except the agency of `<LOCALE>`'s
   own country, which uses its glossary (`agency` class) form.
4. **Science, astronomy, geography and people**: native, as `<LOCALE>`'s universities and
   its own Wikipedia write them (planets, stars, constellations, craters, countries,
   cities, people's names, term abbreviations like LEO/GEO where the language has its own).
5. **Publications and cited sources** (titles in link labels, papers, books): keep the
   title verbatim, but never output a string identical to the English (the checker refuses
   it) — a link label keeps its translated descriptive part around the verbatim title. If a
   label's only problem is that the title was translated, leave it alone.
6. **A name kept in Latin script never takes a case ending**, with or without a hyphen
   (no "NASA-ин", "Voyager-а"): a common noun before it carries the ending (агентства
   NASA, аппарата Voyager 2; агенције NASA, летелице Voyager 2), or reword. Fix every
   such form you meet.
7. **A person, place or star with no glossary entry: do not invent a form from memory.**
   Leave the name as `cur` has it (or as the English writes it), and list it in your
   reply under `NAMES:` with its English form, so the caller can look it up and add it to
   the glossary first.
8. One name per thing: if the batch writes the same thing two ways, use the glossary or
   the more common site form for both.

The grader's findings for this locale are examples of the errors to look for:
`scripts/i18n-tools/maps/2026-10-17-translation-cleanup/graded-2026-10-18/<LOCALE>.json`
(`findings`: `issue` and `fix`; the `fix` text is a suggestion, not a rule — the name
rules above win).

## Output

Write `<out>.json`: `[{ "rel", "at", "old", "new" }]` — only the strings you changed;
`old` is `cur` copied exactly. Valid JSON, UTF-8. Then reply with three lines: strings
reviewed, strings changed, and the three most common problems you fixed — plus a `NAMES:`
line listing every person/place/star you met that has no glossary entry (English form).
