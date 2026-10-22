# Translating museum overlays (PRD-027)

Source: `i18n-src/en-US/museums/<id>.json` = `{ name, city, description, items: { <ref>: line } }`.
Write `i18n-src/<locale>/museums/<id>.json` with the SAME keys (the same `items` refs, nothing added or dropped), 2-space JSON, trailing newline.

Rules (the site's house rules):
- **name**: the form that language's own sources use for this museum. Use the hint from `museum-names.json` (Wikipedia interlanguage title) when given; zh-CN in SIMPLIFIED characters (convert any traditional hint); sr-Cyrl in Serbian Cyrillic. With no hint and no established form, keep the museum's own name as in English (do not invent a translation).
- **city**: the city as that language writes it (native form; e.g. ru "Вашингтон", ja "ワシントン", sr-Cyrl "Вашингтон"); keep a US state after a comma, translated ("Хантсвилл, Алабама").
- **description, items**: natural, plain, factual; translate meaning, add nothing. Keep verbatim: spacecraft, mission and vehicle names and designations (Apollo 11, Columbia, Friendship 7, CM-111, LM-2, Gemini IV, Soyuz TMA-19M, S-IC-15, B1023, CRS-6, Merlin 1D, Dove, Sirius FM-4), except where the site's origin-language rule gives a native form in the origin locale (ru: "Союз ТМА-19М", "Восток", "Спутник-1"; zh-CN: "神舟一号"; ja: "はやぶさ", "はやぶさ2"). People's names in that language's usual form (ru "Тим Пик", ja "ティム・ピーク"). Dates and numbers in the locale's normal format.
- No added quotes, no English left untranslated in descriptions/items except the kept names, no markdown.

After writing, run `node docs/wip/2026-10-22-museum-research/tools/check-overlays.mjs <locales>` and fix every problem it lists.

**Script rule (validate-data `check-i18n-defects`):** a locale's text may not be in another non-Latin script. "Keep the museum's own name" means Latin only; a Cyrillic, Chinese or other non-Latin original is translated or transliterated into the target locale's script (ar/hi/ja/ko/zh-CN), using the glossary's forms for people and places (`scripts/i18n-tools/native-terms.json`). Acronyms the checker keeps verbatim (JAXA, NASA, ESA, ISS) stay in Latin in every locale, sr-Cyrl included.
