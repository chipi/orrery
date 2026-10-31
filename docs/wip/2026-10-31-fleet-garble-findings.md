# Fleet and programs translations: garble found during the term rounds (2026-10-31)

The term reviewers (glossary pilot, `2026-10-31-space-terms-glossary-pilot.md`) read every
fleet and programs field that missed a term. They did not edit anything outside the term,
but they listed the other defects they saw. None of these is caught by the existing
detectors (`i18n-detect.mjs`, `problems()`): they are real words in the wrong place,
non-words that look like compounds, wrong gender or articles, or sentences cut short.

Fixed already, because the term edit touched them: nl Clementine and Lunar Prospector
(retranslated), nl "lanchbaan", "polaairbaan", "ontbaan", "haloaanbaan", "INBAAN", sr
reusable-launchers and seven-minutes grammar, hi Taiyuan सूर्य-स्थैतिक → सूर्य-तुल्यकालिक.

## Reported, not yet fixed

Only the fields the term reviewers happened to read are listed here (about 1 in 6 fleet fields).
The rate suggests the rest of these locales' fleet text has the same problems.

### nl (fleet) — the worst

- Non-words: suborbiale, cabineMaterialen, vlaggenschipbissies, kruisfoortdrijving,
  middeltauw-lanceervermogen, bemande-gekapte, humaan-gerateerde, Indiaś, vehiclebesturing.
- "Saturnus V" for the rocket (skylab).
- Wrong article or gender:
  - het stuwstof
  - een grotere mondstuk
  - een hoogfrequente werkpaard
  - het lanceerbasis
  - volledige en snelle hergebruik
  - een verfijnd opvolger
  - het tweede Halleyontmoeting
  - Zuurstofrijke getrapt verbranding
- "Het verbrand" (verbrandt).
- Garbled sentences:
  - saturn-v "nooit eenmaal niet in de ruimte bereikte"
  - mariner-4, after the opening line
  - "gereduceerd" for throttle
  - "deorbitale afbraak"

### hi (fleet)

- saturn-v:
  - "तीन-चरण वाली रॉकेट" (gender).
  - The dispatch is missing a "नहीं".
- r-7: the second sentence is garbled.
- molniya:
  - "Molniya कक्षा" needs "की".
  - "Molniya-1 ने … प्रक्षेपण किया" is wrong.
- orion: "अनुक्रमित उड़ान" is written for uncrewed.
- salyut-5: ergative error.
- soyuz: "भारे" (typo).
- soyuz-7k-ok: gender error.
- titan-ii: "संग्रहणीय" is written for storable.
- giotto:
  - The second half of the field is lost.
  - "Kevlar + aluminium" appears, which is not in the English.
- messenger: several English sentences are missing.

### ar (fleet)

- ulysses: "ثلاث مدارات قطبية" and "مدار هليوسنتري".
- messenger:
  - "رحلة الاقتراب" is written for cruise.
  - "الطاقة الشمسية" is written for heliocentric.
- rd-180: الأكسدة should be المؤكسد.
- soyuz: a sentence has no predicate.
- ariane-1: "يعلوها المرحلة العليا" (gender).
- psyche: "بتأثير Hall".
- chandrayaan-1: "مدار قمري" is missing ال.
- apollo-csm: the ablative rendering.
- salyut-4: "21 جي".

### fr (fleet)

- Wrong words for the meaning:
  - "tremplin" for launch pad (lc-34, 3 times).
  - "tricorps" for three-stage.
  - "trois étages" for three-core (falcon-heavy).
  - "tank externe".
  - "programme Europe".
  - "Maintenant redessiné".
- Grammar and word order:
  - "étage premier / étage troisième".
  - "la ISS".
  - "Ariane 2/3/4 plus puissants" (gender).
  - challenger relative clause.
  - "Lanceur polaire satellite quatre étages".
  - "a échoué l'amarrage" (missing à).
- osiris-rex: the subject and object are reversed.
- lro: "une H₂O".

### it (fleet)

- osiris-rex is badly garbled.
- rosetta:
  - "lavanda Philae" for lander.
  - "Comet".
  - "Risalito a".
- rd-180: "preblocco" for preburner.
- apollo-lm:
  - "barca a vita" for lifeboat.
  - "equipaggiato" for crewed.
- new-shepard: "Rinnovatore", and "Crewed" left in English.
- juice: the instrument list is truncated.
- mariner-4: "venose" for grainy.
- English left in: reentry, downmass, core.

### es (fleet)

- falcon-heavy tagline: "superligero" for super-heavy.
- chang'e-2: "Teutates" for Toutatis (2 fields).
- starlink: "cajas polares" for shells.
- new-glenn: "entregó … al Blue Ring".
- Small errors: "turbo bomba", "la Aerozine-50", "creído ser", "comisionamiento", "racks".
- Inconsistent heliosincrónicos / heliosíncronas.

### ja / ko / zh-CN (fleet)

- ja yf-77:
  - "可燃ハイパゴリック推進剤".
  - "困難なしではなく".
- ja mercury-redstone: the Gagarin sentence is reordered.
- zh-CN lc-34: "整条轨迹" is used for the story's arc.
- ko starbase: the style is mixed.
- ko mercury-redstone: "단일 단".

### ru / sr-Cyrl (fleet, programs)

- ru:
  - akatsuki: "dynamics" is dropped.
  - mir: «запечатленный» without ё.
  - mars-rovers: «подтвердил дело» is written for "made the case".
- sr-Cyrl pioneer-11: the observations sentence is stilted.
- de sputnik: "eine Sprengkopf".

## Proposed next step (not started)

A garble pass on the fleet tree, nl first: grade every fleet field per locale with the
`i18n-audit` graded sample (§3). Retranslate the BROKEN fields from the English by hand or
with in-session subagents (free route), with `problems()` and the term gate as checks.
