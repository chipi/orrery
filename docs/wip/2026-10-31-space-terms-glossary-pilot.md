# Space terminology glossary — pilot (2026-10-31)

Operator, 2026-10-31: the spot check showed *burn* rendered as braking, combustion
or ceramic firing; "are there more words like that?" There were.

## What the glossary had

`scripts/i18n-tools/native-terms.json` held 779 entries, all names (people,
stars, bodies, surface features, places, facilities, agencies). The style guide's
term tables (§3, §4: 25 terms) were filled in only for Spanish. For 12 of 13
locales no technical term had a binding form.

The English content (essays, science, missions, fleet, programs) uses 182 of 192
common space terms, 152 of them 5+ times and 72 of them 20+ times.

## Pilot: 20 terms × 13 locales

orbit, trajectory, inclination, rendezvous, docking, gravity assist, delta-v,
apogee, perigee, burn, stage, propellant, payload, thrust, booster, specific
impulse, flyby, orbit insertion, entry (atmospheric), descent.

- **Research:** four Sonnet agents, one per language group, each with at most
  10 web searches. Forms come from agency usage and terminology bodies
  (FranceTerme, CSTT, CNES, ISRO Hindi pages, …), the site's own majority usage,
  and textbook usage. 11 of 260 locale entries are low confidence (listed in
  `_confidence`).
- **Glossary:** new `term` section. Each entry has the binding form per locale,
  `_match` stems (inflections and accepted variants), the `_en` sense pattern
  and `_confidence`. Replace scripts do not read it; terms inflect.
- **Tools:**
  - `scripts/i18n-tools/term-contexts.mjs` prints aligned English/locale pairs
    for a term.
  - `scripts/i18n-tools/term-drift.mjs` gives the share of aligned fields that
    use the binding form, per term × locale, plus the list of misses.
- **Test:** `scripts/i18n-tools/term-glossary.test.ts` checks that every entry
  is complete, its stems compile, and its binding form matches its own stems.
  It caught two stems that could never match: JavaScript `\b` is ASCII-only.

## Baseline (after removing detector artifacts)

4,775 aligned fields do not use the binding form: science 1,317, essays ~450,
missions ~1,880, fleet ~775, programs ~330.

A miss is an upper bound, not an error count. Some misses are acceptable short
forms or rephrasings: Italian "carico" for payload, French "propulseurs …
accolés" for boosters. Each one needs a judgement.

Lowest cells, the drift the agents also saw in context:

- *burn*: 36–51 % in nl, ar, hi, fr, zh-CN. The renderings include braking,
  combustion, skin burn, a burner device, and ceramic firing (zh 烧制).
- *gravity assist*: 28–66 % in ko, zh-CN, ar, sr-Cyrl, fr, es, it, nl, pt-BR.
- *orbit insertion*: 29–58 % in ar, de, nl, hi.
- *payload*: 46–67 % in it, pt-BR, es, fr, ru.
- *booster*: 40–58 % in fr, sr-Cyrl, ar. French "booster" is left in English;
  Serbian uses "потисник", which means thruster.

## Next

1. A fix round on science: per locale, review each miss (keep or change to the
   binding form) and apply minimal edits through `apply-edits.mjs`, which checks
   quality. Then re-measure.
2. Second opinion on the 11 low-confidence entries. Serbian choices go to the
   operator.
3. Then essays, missions, fleet, programs; then the next ~130 terms.

## Later: a Glossary page

Operator idea, 2026-10-31: a `/glossary` page (terms, definitions, and a reverse
index of the pages that use each term), built from this section. It is the last
item of Phase 6, reassessed after the pilot.
