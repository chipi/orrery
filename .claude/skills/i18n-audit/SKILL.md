---
name: i18n-audit
description: Measure translation quality across Orrery's locales — run the defect detectors on every overlay and UI bundle, place each locale in a risk tier, draw a seeded sample per content segment for a Sonnet reviewer to grade, and write the manifest of fields to fix. Read-only; the fixing is i18n-fix-run.
when_to_use: Use when asked to "check translation quality", "audit locale X", "are the translations OK", "how bad is <language>", before adding a new locale (Hebrew, plan item 9c), after any large translation run, or when a user reports garbled text in a language.
---

# i18n-audit

Built from the 2026-10-17 audit (`docs/wip/2026-10-17-post-v1-arc-plan.md`, item 9b and
§ "Translation risk tiers"). Detectors find mechanical defects; a graded sample finds
what they can't (the sr-Cyrl skip-entry article had zero detector hits and was unreadable).

## 1. Detectors — every locale, free

```bash
node scripts/i18n-detect.mjs --out=/tmp/hits.json            # table + all hits
node scripts/i18n-detect.mjs --locales=sr-Cyrl --out=…        # one locale
```

Kinds: untranslated, englishProse, foreignScript, mixedWord, russianInSr, placeholder,
phoneticEnglish, latinSerbian, truncated. Read the examples before believing a count —
detectors have false positives (check with `node scripts/i18n-guard-replay.mjs`).

## 2. Tier each locale

| Tier | Rule (2026-10-17) | Spot check |
|---|---|---|
| A | detected defects ≥ 8%, or a sample shows unreadable prose | grade every segment; re-translate failing segments |
| B | 3–8%, or foreign-script leaks | fix every hit + 60-string sample |
| C | < 3% | fix every hit + 25-string sample |

A sample defect rate above 5% moves a locale up a tier. sr-Cyrl started at A (11.6%).

## 3. Graded sample per segment

```bash
LOC=<loc> [N_LONG=10 N_SHORT=25 SEED=17] node scripts/i18n-segment-sample.mjs > /tmp/<loc>-sample.md
```

Segments: long editorial (essays, programs, science), mission descriptions, mission event
notes, fleet, planets & sites, universe, other short entries, UI short, UI long. Grade
with a **Sonnet** subagent (`model: sonnet`), read-only, OK / MINOR / BROKEN per item,
counts per segment, verdict per segment: BROKEN ≥ 20% or BROKEN+MINOR ≥ 50% →
re-translate segment; BROKEN 1–19% → fix flagged strings; else fine. (The prompt that
worked is in the 2026-10-17 session: "professional <language> translation reviewer …
grade EVERY item …".)

## 4. Output → i18n-fix-run

```bash
node scripts/i18n-manifest.mjs --from-hits=/tmp/hits.json [--locales=…] [--kinds=…] > /tmp/fix.json
node scripts/i18n-manifest.mjs --loc=<loc> --trees=essays,science > /tmp/segment.json   # whole segments
```

## Report

Per locale: tier, detector counts, sample verdict per segment, and what you did NOT
check (segments not sampled, locales skipped) — as much detail as what you did.
