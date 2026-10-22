# Museum overlays, round 2 (2026-10-22)

Same rules as TRANSLATE.md (read it first). This round only ADDS:
- 9 new museums: write `i18n-src/<locale>/museums/<id>.json` for each id that has an en-US file but no file in your locale.
- New item lines in existing museums: where your locale's file lacks an `items` key that en-US has, add that line. Do NOT rewrite lines that already exist.
- New kinds of objects appear in item lines: "test article" (a real unit built for ground or flight tests that never flew as a mission), "flown part" (pieces of a flown object), engineering model. Translate these terms the way that language's space-history writing does; keep the meaning exact (never say "replica" or "model" where English says test article, and keep "model" where English says model).
- Mars 3 line: keep the caveat ("sources do not say whether it is a ground-test unit or a full-size model") exactly in meaning.
- Name hints for the new museums: `museum-names.json` has none for most; use the form that language's sources use if you are sure, else keep the museum's own name. Native-origin names: Shaoshan museum in zh-CN 韶山毛泽东同志纪念馆; Korolev museum in uk/ru forms (ru: Музей космонавтики имени С. П. Королёва); Baikonur museum ru: Музей истории космодрома «Байконур»; Kaluga museum ru: Государственный музей истории космонавтики имени К. Э. Циолковского; Bucharest museum keeps the Romanian name in Latin-script locales if no established form (Muzeul Militar Național).

**sr-Cyrl only (operator decision 2026-10-22):** Serbian transliterates foreign museum names into Cyrillic, in EVERY sr-Cyrl museum file (all 38), e.g. "Technik Museum Speyer" → "Технички музеј Шпајер" where a Serbian form exists, otherwise phonetic Serbian transliteration ("Кејп Канаверал", "Спејс експо", "Космосфера", "Фернбенк сајенс центар"). City names likewise in Cyrillic. Item lines keep vehicle designations as the checker requires.

Finish by running `node docs/wip/2026-10-22-museum-research/tools/check-overlays.mjs <your locales>` until CHECK PASS.
