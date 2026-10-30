# Orrery i18n Style Guide
*The rules for every language, UI and content. v1 · 2026-10-30*

> Required reading before translating any locale, by hand or by model. This is the
> one rules document: the [translation strategy](i18n-translation-strategy.md) keeps
> the reasoning, dates and history behind each rule (§3 there is the full text of the
> name rulings summarised in §2 here); code copies of the rules (`NAME_POLICY`,
> `BASE_RULES`, `LOCALE_RULES` in `scripts/lib/translate-quality.mjs`) must agree with
> this file. Updates here trigger re-translation of affected files (ADR-033).

---

## How to use this guide

You are translating Orrery into a new language. Before you start:

1. Read **§1 Universal symbols** — these are never translated. Use the symbol literally in every language.
2. Read **§2 Names and terms** — vehicles and missions by the origin rule; science terms, places and people native in your language; one name per thing.
3. Use **§3 + §4** as a binding glossary. The accepted-convention column for your language is the source of truth; pick from the column rather than translating the English literally.
4. If your language column is empty (you're the first translator for it), populate it as you go and submit those decisions for review with the translation pass.
5. **Citation column** points at the source authority for the term (ESA glossary, NASA Spanish-language style guide, JAXA glossary, etc.). Cite where possible; defer to authoritative sources over LLM judgement.

Files you will be touching:
- `messages/<code>.json` — Paraglide UI strings (informal register where the en-US source uses a friendly tone; UI labels follow §4a).
- `i18n-src/<code>/<surface>/…json` — per-entity content overlays mirroring `i18n-src/en-US/` (missions, fleet, programs, science, sites, …), bundled at build into `static/data/i18n/<code>.json`. Keep every `id`; names follow §2.
- `scripts/i18n-tools/native-terms.json` — the glossary: native forms of names and terms per locale. A name goes there before it goes into any text (strategy §3.5).

Per ADR-017's fallback chain, any key you omit will fall back to en-US — broken translation is bounded, not user-blocking.

---

## §1 Universal symbols (NEVER translated)

These render as the symbol in every language. A native-language gloss is allowed *on first use only* if helpful for non-technical readers.

| Symbol | What it means | Notes |
|--------|---------------|-------|
| `Δv` (delta-v) | Change in velocity, the standard mission-energy budget | Universal across every space agency's literature |
| `Isp` | Specific impulse (rocket engine efficiency) | Universal abbreviation; spelled out as needed in editorial prose |
| `C₃` | Characteristic energy (escape-trajectory energy) | Universal symbol |
| `g` | Earth surface gravity (9.81 m/s²) | Universal |

SI unit symbols (km, s, kg, N, K, km/s …) stay in Latin script in every locale
except where the language writes them in its own script (ru км/с, км; ar كم/ث).
Number *formatting* (1,000.5 vs 1.000,5) is handled by `Intl.NumberFormat` and is
automatic per locale; translators never format numbers in strings.

### §1a Astronomy units per locale

Astronomy units are **not** universal symbols: each language writes the
abbreviation its own sources use (checked against each language's Wikipedia
article, 2026-10-30). Where that language has no settled short form, write the
word (light-year → Lichtjahr, 光年). The IAU symbol since 2012 is `au`; several
languages kept a national abbreviation.

| Locale | astronomical unit | light-year (short) | parsec | km/s | Evidence (that language's Wikipedia) |
|---|---|---|---|---|---|
| en-US | AU | ly | pc | km/s | — |
| es | au | the word (año luz) | pc | km/s | "abreviada au, ua, AU o UA"; ly / al split evenly |
| fr | au | al | pc | km/s | au 40× vs ua 6×; "année-lumière (symbole al)" |
| de | AE | the word (Lichtjahr) | pc | km/s | "abgekürzt AE, international au"; no Lj in the article |
| pt-BR | au | the word (ano-luz) | pc | km/s | "símbolo: au" |
| it | au | the word (anno luce) | pc | km/s | "simbolo ufficiale: au"; "ly o al" |
| nl | AE | the word (lichtjaar) | pc | km/s | "astronomische eenheid (AE, internationaal au of ua)" |
| zh-CN | AU | 光年 | pc | km/s | "缩写的标准符号为AU" |
| ja | au | 光年 | pc | km/s | "記号: au" |
| ko | AU | 광년 | pc | km/s | AU used in the parsec article |
| hi | AU | the word (प्रकाश-वर्ष) | pc | km/s | "AU या au …" |
| ar | و.ف | the word (سنة ضوئية) | pc | كم/ث | "يرمز لها «و.ف»"; the m/s article writes م\ث (slash form normalised here) |
| ru | а. е. | св. год | пк | км/с | "русское обозначение: а. е.", "св. год", "пк", "м/с" |
| sr-Cyrl | АЈ | the word (светлосна година) | pc | km/s | "Астрономска јединица (АЈ)"; SI symbols in Latin |

Light-time shorthand (`l-min`, light-minutes) follows the light-year column: the
language's own short form where it has one (zh-CN/ja 光分, ko 광분 — the forms
already shipping, not separately sourced), otherwise the word. Code that prints a unit next to a number takes the form from a
message, never a hard-coded English abbreviation.

---

## §2 Names and terms (operator rulings 2026-10-17 — see the [translation strategy](i18n-translation-strategy.md) §3)

**Things people built — origin rule.** Missions, spacecraft, rockets, stations, modules,
programs, agencies, companies, design bureaus: English in every language, **except the
language of the name's origin**, which uses the original name (ru «Союз МС-24», «Мир»,
«Протон-М»; zh-CN 神舟, 嫦娥五号; Iranian names in Arabic script in `ar`). Agencies keep
their international acronym (NASA stays NASA), except in the agency's own language, which
uses the local name its own Wikipedia uses: hi इसरो, ru Роскосмос, zh-CN 国家航天局, ar
مركز محمد بن راشد للفضاء; ja keeps JAXA (ja sources write JAXA). When unsure: इसरो (ISRO).
Code: `ORIGIN_NAMES` in `src/lib/name-origins.js`; glossary class `agency` in
`scripts/i18n-tools/native-terms.json`.

**Latin names never take a case ending in Cyrillic text** (ru, sr-Cyrl): no
"NASA-ин", "Voyager-а". A common noun before the name carries the ending (ru агентства
NASA, аппарата Voyager 2; sr агенције NASA, летелице Voyager 2), or reword.

**Science, geography, astronomy and people — native in every language,** written the
way that country's universities, schools and space agency write them: planets and moons,
eponymous terms (законы Кеплера, сфера Хилла, эффект Оберта), term abbreviations (НОО for
LEO), Moon/planet features, stars, constellations, galaxies, places, and people's names
(Кеплер, ケプラー, 开普勒; fr Iouri Gagarine). Unsure → search the term in that language
and use the form native pages use. The per-locale forms are in
`scripts/i18n-tools/native-terms.json`.

**One thing, one name per language.** The form on the thing's own page (fleet, program,
mission, body, site) is canonical; every mention in articles and editorials uses it.

**Exceptions and edge cases** (each stated once, here):

- **Publications and sources** (journals, websites, reports, societies cited as a
  source — Nature, Icarus, NASA Solar System Exploration) stay exactly as in
  English (`NAME_POLICY` point 2).
- **The International Space Station is a term, not a name**: each language's own
  abbreviation (ru МКС, sr-Cyrl МСС, es/pt-BR EEI, it SSI; ISS where its sources
  write ISS). Strategy §3.2 has the full list.
- **Museums and observatories are institutions, not built things**: native form
  in every locale, like the facility glossary (`translate-quality.mjs` surface
  list). sr-Cyrl goes further (operator decision 2026-10-22): a museum or
  observatory with no Serbian form is transliterated phonetically into Cyrillic
  ("Космосфера"), cities likewise; the Serbian form wins where one exists
  ("Технички музеј Шпајер"). Vehicle designations inside them stay as §2.
- **Russian running text** puts vehicle names in «» quotes; headings don't.

This supersedes the 2026-10-17-morning ruling that kept every name in Latin script. The
rules ship in code as `NAME_POLICY` and `problems()` (`scripts/lib/translate-quality.mjs`).

### Mission names
Rationale: missions are real-world objects with single canonical names. A user searching for "Curiosity" in Spanish documentation should still find "Curiosity", not "Curiosidad".
(The origin language uses the original name instead — §2 above: ru «Луна-9», zh-CN 嫦娥四号.)

The form below is the one used **outside the origin language**; "keep" means keep
it as written here, not translate it.

| Mission | Form outside the origin language |
|---------|----------|
| All NASA Mars rovers | Curiosity, Perseverance, Sojourner, Spirit, Opportunity (English; keep) |
| Apollo programme | Apollo 11, Apollo 17, Artemis II, Artemis III (keep numerals + name) |
| ISRO | Chandrayaan-1, Chandrayaan-3, Mangalyaan / Mars Orbiter Mission (keep both names where dual-named) |
| CNSA | Tianwen-1, Chang'e 4 / 5 / 6 (keep apostrophes + numerals) |
| JAXA | Hayabusa, SLIM (keep romanisation) |
| Roscosmos | Luna 9 / 17 / 24, Mars 3 (keep) |
| ESA | Mars Express (keep) |
| MBRSC (UAE) | Hope Probe (keep English) |
| SpaceX | Starship (keep) |
| Blue Origin | Blue Moon MK1 (keep) |
| Tito concept | Inspiration Mars (keep) |

### Agency proper nouns (international acronym; local name in the agency's own language)
NASA, ESA, JAXA, ISRO, CNSA, ROSCOSMOS, UAESA, AEB, KARI, CSA, UKSA, ASI, DLR, CNES, MBRSC. Do **not** expand or translate the acronyms — except in the agency's own language, which writes its local name (hi इसरो, ru Роскосмос, zh-CN 国家航天局, ar مركز محمد بن راشد للفضاء; see §2). Check that language's Wikipedia before adding another: ja.wikipedia writes JAXA, so ja keeps JAXA.

---

## §3 Translatable astronomy + orbital-mechanics terms

The English column is the source. The accepted-convention column for your target language is the **binding** translation. Cite source where given.

| English | `es` (Spanish) | `fr` | `de` | `pt-BR` | `it` | `sr-Cyrl` | Source |
|---------|----------------|------|------|---------|------|-----------|--------|
| aphelion | afelio | — | — | — | — | — | RAE |
| perihelion | perihelio | — | — | — | — | — | RAE |
| apogee | apogeo | — | — | — | — | — | RAE |
| perigee | perigeo | — | — | — | — | — | RAE |
| eccentricity | excentricidad | — | — | — | — | — | RAE |
| true anomaly | anomalía verdadera | — | — | — | — | — | ESA Spanish glossary |
| line of apsides | línea de los ápsides | — | — | — | — | — | ESA Spanish glossary |
| free-return (trajectory) | trayectoria de retorno libre | — | — | — | — | — | NASA-MSFC Spanish |
| sphere of influence (SOI) | esfera de influencia | — | — | — | — | — | ESA Spanish glossary |
| porkchop plot | diagrama porkchop *(no Spanish equivalent in wide use)* | — | — | — | — | — | ESA Spanish glossary uses English |
| Astronomical Unit | unidad astronómica (au) | unité astronomique (au) | Astronomische Einheit (AE) | unidade astronômica (au) | unità astronomica (au) | астрономска јединица (АЈ) | §1a |

Empty cells are populated by the translator for that language ticket.

---

## §4 Translatable mission-domain terms

| English | `es` | `fr` | `de` | `pt-BR` | `it` | Source |
|---------|------|------|------|---------|------|--------|
| launch window | ventana de lanzamiento | — | — | — | — | NASA-JPL Spanish |
| transit (cruise phase) | tránsito | — | — | — | — | ESA Spanish |
| flyby | sobrevuelo | — | — | — | — | ESA Spanish |
| orbit insertion | inserción orbital | — | — | — | — | ESA Spanish |
| LOI (lunar orbit insertion) | inserción en órbita lunar (IOL) | — | — | — | — | NASA-MSFC Spanish |
| MOI (Mars orbit insertion) | inserción en órbita marciana (IOM) | — | — | — | — | ESA Spanish |
| EDL (entry, descent, landing) | EDA (entrada, descenso, aterrizaje) | — | — | — | — | NASA-JPL Spanish |
| TLI (trans-lunar injection) | inyección translunar (ITL) | — | — | — | — | NASA-MSFC Spanish |
| TMI (trans-Mars injection) | inyección transmarciana (ITM) | — | — | — | — | ESA Spanish |
| TCM (trajectory correction manoeuvre) | maniobra de corrección de trayectoria (MCT) | — | — | — | — | NASA-JPL Spanish |
| splashdown | amerizaje | — | — | — | — | RAE |
| rendezvous | acoplamiento *(when docking)* / encuentro *(when proximity)* | — | — | — | — | ESA Spanish |
| heliocentric | heliocéntrico | — | — | — | — | RAE |
| cislunar | cislunar | — | — | — | — | NASA-MSFC Spanish |

---

## §4a UI labels (buttons, tabs, chips, status words, aria-labels)

Short UI strings fail differently from prose: there is no sentence to carry the
meaning, so a literal or transliterated word slips through (shipped examples
found 2026-10-30: ja "クローズパネル" and ar "حلقة مغلقة" "closed loop" for
"Close panel"; ru "Играть" "play a game" for media Play; ko "닫기 패널" in the
wrong order).

- **Translate the action in context.** Read the key name and where it is used
  (`grep` the key in `src/`) before writing it. Play = start playback; Close =
  close this panel; Reset = return to the default.
- **Never transliterate an English word** into the script (no katakana
  "クローズ", no Cyrillic "ресетуј" where the language has its own verb —
  except where that language's own UI convention uses the loan word).
- **Command form**, taken from the correct shipped strings (the ja / ko / hi / ar
  "Close panel" examples are corrections of the defects above, not shipped yet):

  | Locale | Form | Example (Close panel / Reset view) |
  |---|---|---|
  | es, fr, de, pt-BR, nl, ru | infinitive | Cerrar panel · Fermer le panneau · Panel schließen · Fechar painel · Paneel sluiten · Закрыть панель |
  | it, sr-Cyrl | imperative | Chiudi pannello · Затвори панел |
  | zh-CN | verb + object | 关闭面板 · 重置视图 |
  | ja | object を + verb (dictionary form) | パネルを閉じる · ビューをリセット |
  | ko | object + verbal noun | 패널 닫기 · 보기 초기화 |
  | hi | object + polite imperative (-ें) | पैनल बंद करें · व्यू रीसेट करें |
  | ar | verbal noun (maṣdar) | إغلاق اللوحة · إعادة تعيين العرض |

- **Case.** When the English label is UPPERCASE, Latin and Cyrillic locales
  write it uppercase too; caseless scripts (zh-CN, ja, ko, hi, ar) write it
  normally.
- **Agreement.** A label that qualifies different nouns gets one key per noun
  (`mission_status_active` ACTIVA vs `fleet_status_active` ACTIVO), never one
  shared key.
- **Same as English** is allowed only for symbols (§1), units as §1a gives them,
  the "Orrery" brand, and acronyms the language's own sources use.
- **Units next to numbers** come from a message per §1a, never a hard-coded
  English abbreviation in a component.

---

## §5 Tone + register guidance

- **Educational, friendly, precise.** Orrery is for the curious learner first; physics accuracy second. Translations should match that register.
- **Informal "you" where the language distinguishes** (Spanish `tú`, French `tu`, German `du`). The English source uses friendly direct address.
- **Active voice** preferred over passive where the language allows naturally.
- **Concise** — Spanish runs ~30% longer than English; tighten where possible to avoid layout overflow at 375px.
- **Date formatting** is handled by `Intl.DateTimeFormat` (locale-aware). Do not translate dates in strings.
- **Number formatting** handled by `Intl.NumberFormat`. Do not translate numbers in strings.

---

## §6 Source authorities

**Names** (people, places, bodies, features, stars, agencies' local names): the form
that language's own Wikipedia uses, recorded in the glossary first (operator rulings
2026-10-17/18, strategy §3.5). **The site's existing form wins** when the site
already uses one consistently.

**Terms and units**, when contested, defer in this order:

1. **The space agency's own glossary** in the target language (ESA Spanish, NASA-JPL Spanish, JAXA Japanese, CNSA Mandarin, etc.).
2. **The country's national language academy** for general scientific vocabulary (RAE for Spanish, Académie française for French, Duden for German, Crusca for Italian, Academia Brasileira de Letras for pt-BR).
3. **Wikipedia in the target language** — what the language's own sources write (§1a was settled this way).
4. **Model judgement** only when none of these has the term: record the choice and the reason next to it (glossary entry or a note here).

Cited source links (populate per language as glossaries are consulted):
- ESA Spanish glossary: `https://www.esa.int/Space_in_Member_States/Spain` (general portal; search for "glosario")
- NASA-MSFC Spanish technical reports: NTRS search by `language:Spanish`
- NASA-JPL Spanish-language editorial guidelines: internal; cite via the specific PDF when quoted
- IAU resolutions on astronomical unit: `https://www.iau.org/static/resolutions/IAU2012_English.pdf`
- RAE diccionario: `https://dle.rae.es/`

---

## §7 What to do when stuck

- **Term not in this glossary.** Translate per language convention; add a row to §3 or §4 with the chosen term and a citation.
- **Conflicting conventions across sources.** Pick the agency glossary over the language academy; document the conflict in a one-line note.
- **English term has no equivalent.** Keep the English term and add an inline gloss on first use (e.g. `porkchop plot` in Spanish editorial prose).
- **Mission name conflict** (e.g. agency uses one romanisation, Wikipedia uses another). Defer to the agency's official romanisation.
