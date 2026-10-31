# i18n guidance — inventory and consolidation plan (2026-10-29)

Step 0 of the i18n phase that follows tech-debt Phase 4 (operator, 2026-10-29):
before hand-translating the remaining hard-coded UI text, consolidate all
translation guidance into one authoritative source. This note is the
read-only analysis behind that step. It was produced by an Explore subagent;
two of its claims were spot-checked (marked **checked**); the rest cite
file:line and still need reading before acting.

## Where guidance lives today

| Source | Holds | Audience |
|---|---|---|
| `docs/guides/i18n-style-guide.md` | names (§2 origin rule, Cyrillic case rule, mission/agency tables), terms (§3–4, mostly es only), symbols + units (§1, AU/UA), tone (§5), authorities (§6), stuck (§7) | human + LLM brief; "binding" per ADR-033, AGENTS.md:21 |
| `docs/guides/i18n-translation-strategy.md` | names (§3.1–3.3, §3.5 glossary-first), process (§5–6), 36 mistakes (§7), status log (§8), spend/review rulings (§3.4) | human + agent |
| `scripts/lib/translate-quality.mjs` | `NAME_POLICY` (:34–38), `BASE_RULES` (:40–57), `LOCALE_RULES` (:59–73: sr-Cyrl, ru, hi, ko, ar, he), regex checks | LLM prompt + checker |
| `scripts/lib/translate-model.mjs` | model tier per locale | code |
| `src/lib/name-origins.js` | `ORIGIN_NAMES` — code form of the origin rule | code |
| `scripts/i18n-tools/native-terms.json` | glossary, ~775 entries: body 82, feature 89, place 24, station 2, facility 33, person 303, star 235, agency 7; no `ui`/`term`/unit classes; no `he` | tools + every brief |
| `scripts/i18n-tools/README.md`, `scripts/README.md`:26–86 | tooling, which script when | human + agent |
| `.claude/skills/i18n-audit`, `.claude/skills/i18n-fix-run` | process | agent skills |
| `AGENTS.md`:21–22, :111, :362–389, :602, :959 | pointers, Paraglide rules, model policy | agents |
| `CONTRIBUTING.md`:18–36, :117 | adding a locale | contributors |
| ADR-017/031/033/057/069/079, `TA.md`:294–306 | architecture/process (no name rules) | human |
| `docs/guides/mission-trajectories.md`:113 | `fly_event_*` labels stay English | human |
| museum briefs `docs/wip/2026-10-22-museum-research/briefs/TRANSLATE*.md`, `scripts/i18n-tools/maps/…/item3/BRIEF.md` | per-batch restatements of name rules | LLM prompts |
| agent memory (operator rulings) | names-origin, glossary-first, science-terms-native, one-name-per-language, operator-reads-serbian, no-native-speaker-review, no-paid-translation-runs, numbers-in-all-locales, i18n-cleanup stop rule | agent only |

## Same rule, several copies (must be kept in step by hand today)

Origin rule for built things (style guide :45–53, strategy :47–75, NAME_POLICY
pt 1, item3 BRIEF, memory, `ORIGIN_NAMES`); agency local names (style guide
:50–52 + :92, strategy :61–64, NAME_POLICY, glossary `agency`); no case endings
on Latin names in ru/sr (style guide :55–57, strategy :67–72, NAME_POLICY :38,
sr LOCALE_RULES :64, BRIEF 6); native science/places/people; one name per
language; glossary first; no native-speaker review; model tier (AGENTS.md,
translate-model.mjs, scripts/README, i18n-fix-run); units; spaceflight term
lists (BASE_RULES, sr rules, style guide §3–4); post-change gate list (handover,
strategy, two skills).

## Contradictions and drift

1. **AU / UA / AE** — style guide :36 says en/ja/zh `AU`, es/fr/pt/it `UA`;
   :112 says de `AE`. **Checked**: `lab_axis_distance_au` ships de "(AU)",
   nl "(AE)", ru "(а. е.)", es "(UA)", sr-Cyrl "(AU)". BeltPanel hard-codes
   "AU" for every locale.
2. Style guide mission table (:79–89) still has superseded rows ("Luna 9 …
   (keep)" at :84) under the newer origin rule (:45–48, :70).
3. Stale numbers/framing: style guide header "v0.1 · May 2026", "~276 keys"
   (:19); CONTRIBUTING "~786 keys" (:24, :36) and "keep mission ID + agency
   proper nouns in original" (:26, contradicts the origin rule); strategy
   "3,168 UI messages" (:28; en-US now 3,245); style guide :20 overlay path.
4. **Model name** — **checked**: AGENTS.md:366 `claude-haiku-4-5`,
   translate-model.mjs:15 `claude-haiku-5-5`; AGENTS.md omits editorial →
   Sonnet.
5. AGENTS.md:602 "never hand-translate" vs the operator ruling that fixes are
   hand edits (strategy :126–129, memory); AGENTS.md:644 one-off
   transliteration recipe that bypasses glossary-first.
6. sr-Cyrl museum names transliterated (TRANSLATE2.md) vs LOCALE_RULES :64
   "never transliterate built things" — museums may be intended as an
   exception, but nothing states it.
7. In code only: NAME_POLICY pt 2 (publications stay English); `fly_event_*`
   stays English (test-enforced) appears in no i18n guide.
8. Tone: style guide informal "you" never reaches the LLM prompt;
   `LANGUAGE_NAMES` "European Spanish" stated only in code.
9. Hebrew half-wired (in LANGUAGE_NAMES/LOCALE_RULES/strategy, no
   `messages/he.json`, not in glossary).
10. Glossary size drift ("674 terms" in i18n-fix-rounds-analysis vs ~775).
11. Rulings only in agent memory: don't list native-speaker review as a gap;
    operator's word is final for sr-Cyrl; numbers/facts changed in all 14
    locales; cleanup stop rule (in handover, not in skills).

## Gaps for hand-translating UI labels (nothing found)

UI vocabulary table (status words, tab labels, buttons — no `ui` glossary
class); per-locale units/abbreviations (AU, ly, pc, km/s); casing of uppercase
labels per script (CSS `text-transform` vs caseless scripts, ß); gender/number
agreement of short labels (today's status labels needed per-thing keys:
mission / vehicle / programme); plurals and word order around `{count}`
(ru/ar plural categories); button register (imperative vs infinitive, ja/ko
politeness); which labels may stay identical to English (`SAME_OK`);
label form = running-text form for reused words (Flight, Launch, Orbit);
authority order for UI text.

## Proposed structure

- **Rules — one document:** rewrite `docs/guides/i18n-style-guide.md` as the
  only rules source: §1 symbols + units (per-locale table), §2 names (origin
  rule, agencies, publications, Cyrillic case, museums/observatories),
  §3 science terms + people (→ glossary), §4 UI labels (new), §5 tone,
  §6 authorities, §7 per-locale notes, §8 process rulings (from memory).
- **Data — one glossary:** `native-terms.json` gains `ui` and `term` classes
  (or a sibling `ui-terms.json` with the same locale order); `ORIGIN_NAMES`
  stays the code source; the style guide's mission/agency tables become a
  pointer.
- **Derived:** `NAME_POLICY`, `BASE_RULES`, `LOCALE_RULES` generated from (or a
  test checks them against) the style guide; the batch briefs reference the
  guide + glossary classes instead of restating rules.
- **Pointers only:** AGENTS.md (fix the model name), CONTRIBUTING.md, the two
  skills, scripts/README and the i18n-tools README.
- **History, dated:** strategy §7–8, i18n-fix-rounds-analysis, the handover.
- **Fix the cheap contradictions first** (1, 2, 4, 5, 6) so they are not copied
  into the new document.

## Not read by the analysis

ADR bodies beyond ADR-033; memory free-route-first and
size-paid-runs-before-launch; `src/lib/name-origins.js` contents;
`i18n-coverage-scan.mjs`; `translate-quality.mjs` below :260; the individual
`scripts/translate-*.mjs`. "Not found" above means not found in the listed
files plus repo-wide keyword searches — not proof of absence.
