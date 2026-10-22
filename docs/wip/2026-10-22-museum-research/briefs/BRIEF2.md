# Museum research, pass 2 (Orrery, PRD-027, 2026-10-22)

Pass 1 ran out of searches, so many objects were never properly searched. Read BRIEF.md in this folder first: its rules on what counts (flown / backup / test-article; NEVER replicas, mock-ups, models), evidence and output still apply. This file adds to it.

## Your budget
You have about 200 web searches. Spread them: at most ~10 searches per object, then move on. Do every object in your list.

## Search in the origin language first
- region "ru": Russian (e.g. "спускаемый аппарат Союз ТМ музей", "лётный образец", "дублёр", "скафандр Сокол экспонат"). Museums in Russia, Kazakhstan, Ukraine, and abroad.
- region "zh": Chinese ("返回舱 实物 展出 博物馆", "神舟 返回舱 真品"). Note many Chinese capsules toured temporary exhibitions; record only a permanent or current display, and say which in notes.
- region "ja": Japanese ("実機 展示", "予備機", "カプセル 展示").
- region "in": English and Hindi; ISRO museums, Visvesvaraya Industrial & Technological Museum Bengaluru, Nehru Science Centre, etc.
- region "eu": French, German, Italian, English (Cité de l'espace, Musée de l'Air et de l'Espace, Technik Museum Speyer, Deutsches Museum, Euro Space Center, ESA ESTEC Space Expo, Science Museum London, National Space Centre Leicester, etc.).
- region "us": English, plus the origin language for the non-US items in your list (e.g. Hebrew for Beresheet).
- Do not stop at the first museum. "Any museum in the world": e.g. flown Soyuz descent modules are in museums in Russia, Germany, the UK, the US, Kazakhstan and elsewhere.

## Evidence quality
- Prefer the museum's own page. Wikipedia is acceptable ONLY as a pointer; open the source it cites or the museum page and cite that. If you can only find Wikipedia, set status "uncertain" and say so in notes.
- A flown PART of the object (e.g. a recovered engine, a camera brought back from the Moon, a piece of Challenger shown in "Forever Remembered") counts as kind "flown-part" — use that kind for parts, and say which part in "item".
- A different unit of the same type that never flew (e.g. Lunokhod 3 for Lunokhod 1) is kind "sister-unit", not "backup", unless it was formally that mission's backup.

## Output
Same JSON shape as BRIEF.md, written to the output path in your task. Kinds allowed: flown, flown-part, backup, sister-unit, test-article. Every ref in your list goes in rows or in none. Use the museum ids from the list in BRIEF.md where they fit; new ids in kebab-case English.
Final reply: 4 lines max — objects, objects with ≥1 museum, rows by kind, uncertain count, output path.
