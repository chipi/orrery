# Brief: binding translations for technical space terms

Template for adding glossary terms (skill `term-consistency` §A). The table below is the
pilot's 20 terms: replace it with the new batch, each with its sense on this site, and name
the locales and output file in the task.

Orrery (a space-science education site, 14 locales) is building a glossary of
technical space terms. Each term needs ONE binding form per locale — the form that
country's space agency, universities and textbooks use — so every page says it the
same way. You research the locales named in your task. Read-only on the repo: do not
edit any repo file; write ONLY your output file.

## The terms and their sense on this site (pilot batch shown)

| term | sense here |
| --- | --- |
| orbit | the path of a body around another; also the verb (to orbit) |
| trajectory | a flight path (often interplanetary) |
| inclination | orbital inclination (angle of the orbit plane) |
| rendezvous | two spacecraft meeting in orbit (before docking) |
| docking | two spacecraft joining mechanically |
| gravity assist | using a planet's gravity to change speed/direction (slingshot) |
| delta-v | change in velocity (Δv); a budget of manoeuvre capability |
| apogee | highest point of an Earth orbit |
| perigee | lowest point of an Earth orbit |
| burn | an ENGINE FIRING (a period of rocket thrust: "perigee burn", "braking burn", "TLI burn"). NOT combustion of fuel, NOT braking. The verb sense "to burn (fire) the engine" too. |
| stage | a ROCKET stage (first stage, upper stage) |
| propellant | rocket propellant (fuel + oxidizer together) |
| payload | the cargo a rocket carries to space |
| thrust | engine thrust (force) |
| booster | a booster rocket / side booster / first-stage booster |
| specific impulse | Isp, engine efficiency (seconds) |
| flyby | a close pass of a planet/moon without stopping |
| orbit insertion | the manoeuvre that puts a spacecraft into orbit around a body |
| entry | ATMOSPHERIC entry (as in entry, descent and landing) |
| descent | descent to a surface (powered descent, descent stage) |

## How to decide each form

1. See how the site writes it now: from the repo root run
   `node scripts/i18n-tools/term-contexts.mjs "<term>" <loc> 12`
   (it prints how many aligned fields use the term and 12 English/translation pairs).
   Note every distinct rendering you see, correct or not.
2. Decide the binding form from authority, in this order: the national space
   agency's own usage (Roscosmos, CNSA/CMSA, JAXA, KARI/KASA, ISRO, DLR, CNES, ASI,
   ESA national pages), official terminology bodies (FranceTerme for fr; CSTT for hi;
   Arab academies / ALECSO for ar; Russian GOST/textbooks for ru; Serbian
   university/astronomy-society usage for sr-Cyrl), university textbooks, then the
   language's Wikipedia article. Use your own knowledge where you are sure; web
   search only where unsure — **at most 10 web searches in total** (shared budget).
3. Prefer the form the site already uses most when it is correct.
4. Serbian is Cyrillic (sr-Cyrl), ekavian, no Russian forms. Hindi: standard
   scientific Hindi (CSTT), not transliterated English where a Hindi term is in use.
   Arabic: Modern Standard Arabic. zh-CN simplified. ja/ko: the form JAXA / KASA and
   textbooks use (katakana loanwords are fine where that IS the standard).
5. For acronym-like terms (delta-v) say whether the locale writes delta-v, Δv or a
   native word.

## Output — write JSON to the file path given in your task

```json
{
  "<term>": {
    "<loc>": {
      "form": "binding dictionary form (noun, singular)",
      "verb": "verb form if the term is also used as a verb, else null",
      "match": ["regex stems that recognise the binding form and its inflections, e.g. 'орбит'"],
      "also_ok": ["other renderings that are correct and acceptable in context"],
      "wrong_seen": [{"text": "rendering seen on the site", "why": "short reason", "where": "path :: key"}],
      "aligned_fields": 0,
      "source": "where the binding form comes from (URL or 'agency usage' / 'standard textbook term')",
      "confidence": "high | medium | low"
    }
  }
}
```

Then reply with a SHORT summary: per locale, the terms where the site's current
usage is inconsistent or wrong (with counts if you have them), and any term you are
not sure about. Keep the reply under 400 words; the detail goes in the file.
