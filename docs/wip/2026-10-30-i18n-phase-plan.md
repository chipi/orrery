# i18n phase — plan (2026-10-30)

Runs between tech-debt Phase 4 and Phase 5 (operator, 2026-10-29). Goal: no
user-facing English left in the UI chrome of any of the 14 locales, written
by hand (no paid runs), following one consolidated set of rules.

## Step 0 — one source of rules (before any translation)

Analysis: [2026-10-29-i18n-guidance-consolidation.md](2026-10-29-i18n-guidance-consolidation.md).
Every claim there is re-checked before acting on it.

1. Fix the verified contradictions so they are not copied forward:
   - AGENTS.md :366 says `claude-haiku-4-5`; the code uses `claude-haiku-5-5`,
     which the models endpoint lists for this account (checked 2026-10-30).
   - AGENTS.md :111 "names never translated" and :602 "never
     hand-translate" predate the origin rule and the hand-edit rulings.
   - Style guide header (v0.1, "~276 keys", overlay paths), CONTRIBUTING key
     counts and its "keep proper nouns in original".
   - Units: §1 calls AU a never-translated symbol, §3 lists UA / AE; de ships
     "(AU)" against the guide's AE. Resolve with the existing rule (science
     terms as each country's universities write them) into a per-locale
     units table; check each form on native pages.
   - The sr-Cyrl museum/city transliteration (operator decision 2026-10-22)
     is an exception to "never transliterate built things" that only the
     museum brief states; write it into the guide and `LOCALE_RULES`.
2. Rewrite `docs/guides/i18n-style-guide.md` as the only rules document
   (symbols + units table, names, science terms, UI labels, tone,
   authorities, per-locale notes, process rulings). The strategy doc keeps
   history; AGENTS.md, CONTRIBUTING, the skills and READMEs point at it.
3. UI vocabulary: a `ui` class in the glossary (status words, tab labels,
   buttons) so one English label has one form per locale.

## Step 1 — inventory

A Svelte-AST scan of text nodes + static `aria-label` / `title` /
`placeholder` / `alt` (2026-10-30): 353 hits in 74 files; 263 outside the
three debug panels. Plus TypeScript label maps the scan cannot see (era
names, fleet categories, HUD labels).

Also data values rendered raw: fleet `country` ("USA" in every locale —
geography is native per guide §2), epoch ids (fixed in batch 1 with
`epochLabel()`).

Left English on purpose (developer-only): DebugPanel, FlybyDebugViewer,
AscentCameraDebug, TargetEnvSwitcher (internal builds), the hidden
`aria-hidden` tour anchors, the "Orrery" brand.

## Step 2 — translate, by hand

Keys in `messages/en-US.json` + 13 locales, glossary first, the style guide's
UI-label rules (§4a). Units per §1a.

Also audit the short UI strings that already ship: a 2026-10-30 sample of
six command keys found wrong-sense machine translations (ja/ar/ko/hi "Close
panel", ru/ar "Play", ar "Close planet references"). Read every short
message (buttons, tabs, chips, aria-labels) per locale against its use, fix
by hand, and record the class in the guide if a new one turns up.

## Step 3 — guard

The scan becomes a unit test with an allowlist (developer-only files, brand,
symbols), so new hard-coded English fails CI. A UI-key parity gate: today a
key missing from a locale only warns in `build-i18n-bundles.mjs` and falls
back to English at runtime. Plus the 14-locale render check from Phase 4.

## Not in this phase

Content translation quality (ended 2026-10-19 at the stop rule), audio
narration (English-only by decision), bundle size (Phase 5).

Reading the translated essays and science pages (`i18n-src/<loc>/essays`,
`science`) the way the UI strings were read: an optional item at the end of
Phase 6 (operator, 2026-10-30), to be discussed again before it starts.
