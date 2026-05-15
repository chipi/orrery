# Orrery i18n Style Guide
*Translator brief — applies to every language. v0.1 · May 2026*

> Required reading before translating any locale. Authority for terminology decisions; updates here trigger re-translation of affected files (per ADR-033 §implementation-notes).

---

## How to use this guide

You are translating Orrery into a new language. Before you start:

1. Read **§1 Universal symbols** — these are never translated. Use the symbol literally in every language.
2. Read **§2 Proper nouns** — transliterate per local convention only; do not translate.
3. Use **§3 + §4** as a binding glossary. The accepted-convention column for your language is the source of truth; pick from the column rather than translating the English literally.
4. If your language column is empty (you're the first translator for it), populate it as you go and submit those decisions for review with the translation pass.
5. **Citation column** points at the source authority for the term (ESA glossary, NASA Spanish-language style guide, JAXA glossary, etc.). Cite where possible; defer to authoritative sources over LLM judgement.

Files you will be touching:
- `messages/<code>.json` — Paraglide UI strings (~276 keys; informal register where the en-US source uses a friendly tone).
- `static/data/i18n/<code>/missions/{mars,moon}/*.json` — 36 mission overlay files. Translate `name` (display name), `description`, `first` (claim-to-fame), `type` (e.g. `LANDER · FLOWN`), `events[].label`, `events[].note`. Keep mission `id` and proper nouns intact.
- `static/data/i18n/<code>/{planets,rockets,sun,scenarios,earth-objects,moon-sites}/*.json` — same overlay pattern, smaller files.

Per ADR-017's fallback chain, any key you omit will fall back to en-US — broken translation is bounded, not user-blocking.

---

## §1 Universal symbols (NEVER translated)

These render as the symbol in every language. A native-language gloss is allowed *on first use only* if helpful for non-technical readers.

| Symbol | What it means | Notes |
|--------|---------------|-------|
| `Δv` (delta-v) | Change in velocity, the standard mission-energy budget | Universal across every space agency's literature |
| `Isp` | Specific impulse (rocket engine efficiency) | Universal abbreviation; spelled out as needed in editorial prose |
| `C₃` | Characteristic energy (escape-trajectory energy) | Universal symbol |
| `AU` | Astronomical Unit | English / Japanese / Mandarin use `AU`; Spanish / French / Portuguese / Italian use `UA`; document per-language column below |
| `g` | Earth surface gravity (9.81 m/s²) | Universal |

Numeric units (km, s, kg, N, K, etc.) are **never translated** — they are SI. Number *formatting* (1,000.5 vs 1.000,5) is handled by `Intl.NumberFormat` and is automatic per locale; translators never format numbers in strings.

---

## §2 Proper nouns (TRANSLITERATE only — never translate)

### Scientist surnames (transliterate per language convention)
| English | Notes |
|---------|-------|
| Hohmann (transfer) | Walter Hohmann |
| Tsiolkovsky (equation) | Konstantin Tsiolkovsky |
| Lagrange (point, L1–L5) | Joseph-Louis Lagrange |
| Lambert (problem, solver) | Johann Heinrich Lambert |
| Kepler (laws, orbit) | Johannes Kepler |
| Oberth (effect) | Hermann Oberth |
| Newton (laws, units) | Isaac Newton |

### Mission proper nouns (KEEP IN ORIGINAL — do not translate or transliterate)
Rationale: missions are real-world objects with single canonical names. A user searching for "Curiosity" in Spanish documentation should still find "Curiosity", not "Curiosidad".

| Mission | Original |
|---------|----------|
| All NASA Mars rovers | Curiosity, Perseverance, Sojourner, Spirit, Opportunity (English; keep) |
| Apollo programme | Apollo 11, Apollo 17, Artemis II, Artemis III (keep numerals + name) |
| ISRO | Chandrayaan-1, Chandrayaan-3, Mangalyaan / Mars Orbiter Mission (keep both names where dual-named) |
| CNSA | Tianwen-1, Chang'e 4 / 5 / 6 (keep apostrophes + numerals) |
| JAXA | Hayabusa, SLIM (keep romanisation) |
| Roscosmos | Luna 9 / 17 / 24, Mars 3 (keep) |
| ESA | Mars Express (keep) |
| MBRSC (UAE) | Hope Probe (keep English; "مسبار الأمل" is acceptable in Arabic editorial prose only) |
| SpaceX | Starship (keep) |
| Blue Origin | Blue Moon MK1 (keep) |
| Tito concept | Inspiration Mars (keep) |

### Agency proper nouns (KEEP IN ORIGINAL acronym)
NASA, ESA, JAXA, ISRO, CNSA, ROSCOSMOS, UAESA, AEB, KARI, CSA, UKSA, ASI, DLR, CNES, MBRSC. Do **not** expand or translate the acronyms.

---

## §3 Translatable astronomy + orbital-mechanics terms

The English column is the source. The accepted-convention column for your target language is the **binding** translation. Cite source where given.

| English | `es` (Spanish) | `fr` | `de` | `pt-BR` | `it` | `sr-Latn` | `sr-Cyrl` | Source |
|---------|----------------|------|------|---------|------|-----------|-----------|--------|
| aphelion | afelio | — | — | — | — | — | — | RAE |
| perihelion | perihelio | — | — | — | — | — | — | RAE |
| apogee | apogeo | — | — | — | — | — | — | RAE |
| perigee | perigeo | — | — | — | — | — | — | RAE |
| eccentricity | excentricidad | — | — | — | — | — | — | RAE |
| true anomaly | anomalía verdadera | — | — | — | — | — | — | ESA Spanish glossary |
| line of apsides | línea de los ápsides | — | — | — | — | — | — | ESA Spanish glossary |
| free-return (trajectory) | trayectoria de retorno libre | — | — | — | — | — | — | NASA-MSFC Spanish |
| sphere of influence (SOI) | esfera de influencia | — | — | — | — | — | — | ESA Spanish glossary |
| porkchop plot | diagrama porkchop *(no Spanish equivalent in wide use)* | — | — | — | — | — | — | ESA Spanish glossary uses English |
| Astronomical Unit (AU / UA) | UA (unidad astronómica) | UA | AE (Astronomische Einheit) | UA | UA | — | — | IAU |

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

## §5 Tone + register guidance

- **Educational, friendly, precise.** Orrery is for the curious learner first; physics accuracy second. Translations should match that register.
- **Informal "you" where the language distinguishes** (Spanish `tú`, French `tu`, German `du`). The English source uses friendly direct address.
- **Active voice** preferred over passive where the language allows naturally.
- **Concise** — Spanish runs ~30% longer than English; tighten where possible to avoid layout overflow at 375px.
- **Date formatting** is handled by `Intl.DateTimeFormat` (locale-aware). Do not translate dates in strings.
- **Number formatting** handled by `Intl.NumberFormat`. Do not translate numbers in strings.

---

## §6 Source authorities

When a term is contested, defer in this order:

1. **The space agency's own glossary** in the target language (ESA Spanish, NASA-JPL Spanish, JAXA Japanese, CNSA Mandarin, etc.).
2. **The country's national language academy** for general scientific vocabulary (RAE for Spanish, Académie française for French, Duden for German, Crusca for Italian, Academia Brasileira de Letras for pt-BR).
3. **Wikipedia in the target language** as a tertiary tie-breaker — useful for confirming widespread usage but not authoritative.
4. **LLM judgement** as final fallback when no authority exists. Document the choice in a comment and surface for review.

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
