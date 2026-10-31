---
name: term-consistency
description: Keep technical space terms (burn, flyby, orbit insertion, payload …) consistent in all 13 translated locales — one binding form per term and language in the glossary, a detector that finds every field not using it, reviewed fix rounds, recorded keeps, and a gate. Also how to add the next batch of terms.
when_to_use: Use when asked about "terminology", "space terms", "the glossary", "term drift", "is burn/flyby/… translated the same everywhere", "add terms to the glossary", "fix the term misses", or before running term-drift.mjs, term-apply.mjs or term-keep.mjs.
---

# term-consistency

Built in the 2026-10-31 pilot (`docs/wip/2026-10-31-space-terms-glossary-pilot.md`):
20 terms × 13 locales, science first. Science went from 1,317 misses to 1 open
question in two rounds. Every rule below comes from a mistake made in those rounds.

## Pieces

| File | Role |
| --- | --- |
| `scripts/i18n-tools/native-terms.json` → `term` | per term: `_sense`, `_en` (English sense regex), `<loc>` binding form, `_match.<loc>` accepted stems (regex), `_confidence.<loc>`; `sources["term:<term>:<loc>"]` says where the form comes from |
| `scripts/i18n-tools/term-match.mjs` | matching rules (Arabic vowel marks ignored), keep keys and text hashes |
| `scripts/i18n-tools/term-drift.mjs` | term × locale table; `--misses=` writes the unreviewed misses; `--gate` exits 1 if any |
| `scripts/i18n-tools/term-keeps.json` | reviewed misses that are right as they are; each holds the hash of the text judged, so an edit to the field brings it back ("stale keep") |
| `scripts/i18n-tools/term-workfile.mjs` | misses → per-locale review files for a fix round |
| `scripts/i18n-tools/term-apply.mjs` | applies `change` decisions (exact find/replace, through `apply-edits.mjs` and `problems()`) |
| `scripts/i18n-tools/term-keep.mjs` | records `keep` decisions; prunes keeps whose field is gone |
| `scripts/i18n-tools/term-contexts.mjs` | how the site writes a term now (counts + sample pairs) |
| `scripts/i18n-tools/term-widen-check.mjs <old-glossary>` | after widening stems: every field that passes only under the new stems and nobody reviewed, grouped by the matched word |
| `scripts/i18n-tools/term-census.mjs` | which candidate terms the English uses most and which are covered (✓) |
| `scripts/i18n-tools/term-glossary.test.ts` | every entry complete, stems compile, binding matches its own stems; keeps well-formed |
| `research-brief.md`, `fix-brief.md` (this folder) | subagent briefs for the two kinds of round |
| `scripts/i18n-tools/maps/2026-10-31-space-terms/` | the pilot's decisions, hand edits and glossary steps |

## A. Add terms (the next batch)

1. `node scripts/i18n-tools/term-census.mjs`. Take the most used uncovered terms. Extend
   `CANDIDATES` if the content has grown. Skip words that are not technical
   (launch, landing) unless the site renders them inconsistently: check with
   `term-contexts.mjs`.
2. Research with `research-brief.md`, one subagent per locale group (Romance;
   Germanic + Slavic; hi + ar; CJK). Model: Sonnet. Budget: ~10 web searches per group,
   counted against the session's 200.
3. Merge into `term` with the agent's `match` stems, then **check every binding against
   the site's own text before any fix round**:
   - The stems must accept inflections: plural/gender for Latin scripts, case endings for
     ru/sr (use a stem, e.g. `периге` not `перигей`), Korean particles, Arabic article
     and prefixes (`ل`, `ال`), compounds (nl `-baan`, `-trap`).
   - Never put JavaScript `\b` next to a non-ASCII letter: it is ASCII-only.
   - Run `term-drift.mjs --terms=<new>` and read ~10 misses per cell. A cell under ~70%
     means either real drift or a too-narrow entry. Widen the entry first. In round 1,
     narrow entries made reviewers "fix" correct Dutch and Serbian.
4. Low-confidence cells get a second opinion before they drive edits (a fresh agent with the
   brief in `maps/2026-10-31-space-terms/lowconf-second-opinion-brief.md`). Serbian forms are
   the operator's call: list them; don't decide alone.
5. `npx prettier --write scripts/i18n-tools/native-terms.json` (edit scripts write plain
   JSON), then `npx vitest run scripts/i18n-tools/term-glossary.test.ts`.

## B. Fix round (one tree at a time)

```bash
node scripts/i18n-tools/term-drift.mjs --trees=essays --misses=$W/misses.json
node scripts/i18n-tools/term-workfile.mjs $W/misses.json $W/work        # <loc>.json, ≤150 fields each
# subagents: fix-brief.md, one per work file (Sonnet), write <loc>-edits.json
node scripts/i18n-tools/term-apply.mjs <loc> $W/work/<loc>-edits.json --dry   # READ the list
node scripts/i18n-tools/term-apply.mjs <loc> $W/work/<loc>-edits.json
node scripts/i18n-tools/term-keep.mjs $W/work/<loc>-edits.json <loc>          # after apply
node scripts/i18n-tools/term-drift.mjs --trees=essays                         # measure
```

- **Read every change list before applying.** Drop edits that "fix" a correct form and
  widen the entry instead. Drop clauses a reviewer added that the English does not need,
  e.g. "poussée réelle" or "Brûle profond".
- **Read the keep reasons too.** A keep like "binding form, inflected" or "accepted variant"
  is a stem gap: widen `_match`, don't record a keep. A keep that only holds for one field
  needs a real sense difference, a proper name or a natural omission.
- After widening, run the widen check and read every matched word it lists:
  `git show HEAD:scripts/i18n-tools/native-terms.json > $W/old.json && node scripts/i18n-tools/term-widen-check.mjs $W/old.json`.
  A pattern that is too wide hides real misses. On 2026-10-31 an open nl `\p{L}*baan` let
  "lanchbaan" (for *launch pad*), "polaairbaan" and "ontbaan" pass. **List compounds
  explicitly** (`(?<!\p{L})(?:aarde?|maan|halo|…)baan`); never use an open prefix.
- Apply first, keep second: a keep hashes the text as it is now.
- A field changed for one term makes another term's keep stale. Re-review it; don't
  re-record it blind.
- Garbled text found along the way (broken links, nonsense) gets retranslated from the
  English, by hand or by the fix agent, not patched term by term.
- Length limits (`npm run validate-data`: intro_sentence ≤ 240) apply to every edit.
- Save the round's decisions and scripts under `scripts/i18n-tools/maps/<date>-<arc>/`
  (translation strategy §5). The scratchpad is not a record.

## C. Gate

When a tree reaches zero unreviewed misses, add it to the gate test
(`term-glossary.test.ts`, `term-drift … --gate`) so a new translation that drifts fails CI.

## Not covered

- UI strings (`messages/<loc>.json`): `ui-label-audit.mjs` checks those.
- The English itself: the detector assumes the en-US sense regex (`_en`) picks the right
  fields. A term used loosely in English, e.g. "trajectory" for an orbit, shows up as a miss
  and is a keep.
- Names (missions, people, bodies) belong to the other glossary classes and
  `glossary-apply.mjs`.
