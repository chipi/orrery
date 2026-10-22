# Translating observatories + the alien-life article (PRD-028, 2026-10-22)

Read TRANSLATE.md first (house rules, including the **script rule** at its end). This round:

1. `i18n-src/en-US/observatories/<id>.json` (34 files) → `i18n-src/<locale>/observatories/<id>.json`, same keys: `name`, `place`, `description`, `highlights` (SAME number of items, same order), `film` only where en-US has it.
   - **name:** the form that language's sources use for the observatory (zh-CN: 500米口径球面射电望远镜 for FAST, 阿雷西博天文台, 甚大阵 for the VLA, 阿塔卡马大型毫米波/亚毫米波阵列 for ALMA where established; ja/ko likewise). Acronyms/designations stay verbatim and in Latin in every locale (FAST, VLA, ALMA, LOFAR, GMRT, SKA-Low, SKA-Mid, LMT, BTA-6, RATAN-600, LAMOST, SALT, HARPS, VLT, ELT, DSN, NASA, ESO, JPL, CSIRO). A Cyrillic/Chinese original is written in the target script for non-Latin locales (script rule).
   - **place:** places in each language's form; the glossary (`scripts/i18n-tools/native-terms.json`, `place`/`facility`) first.
   - **highlights / description / film:** exact meaning, plain; numbers, dates and units exact; people's names in that language's usual form (glossary `person` first); film titles as released in that country if well established, else the original title.
2. `i18n-src/en-US/science/exoplanets/detecting-extraterrestrial-life.json` (new article) → same path in your locale: `title`, `intro_sentence` (≤ 240 characters), `narrative_101` (3 items), `body_paragraphs` (5 items). Science terms as that language's universities write them (SETI, technosignature, biosignature, narrowband, hydrogen line); the Wow! signal keeps "Wow!" in quotes as the transcribed word; Contact as the title released in that country.

Run `node docs/wip/2026-10-22-museum-research/tools/check-obs.mjs <your locales>` until CHECK PASS. Do not edit other files.
