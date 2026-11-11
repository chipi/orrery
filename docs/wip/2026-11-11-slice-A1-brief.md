# Slice A1 brief — type scale (decision Q2, 2026-11-11)

Baseline `9dda8b6813f` (before A1). Read with `git grep` / `git show` at that commit. Full baseline
violation list (516 lines, from the check below): `2026-11-11-slice-A1-baseline-hits.txt`.

## Rule (Q2)
Nothing below 11 px. Labels 11 px at ~60 % white. Body 14 px. Panel overview and page lead 15–16 px,
upright, Space Mono. Italic only for real quotes and captions, ≥ 14 px. Root is 16 px (no html/:root
font-size), so 11 px = 0.6875rem.

## Tokens (tokens.css)
`--size-label: 11px` (today 10px, unused) + `--color-text-label: rgba(255,255,255,.6)`; `--size-meta: 12px`;
`--size-body: 14px`; `--size-lead: 16px` (15px on phones); `--size-caption: 14px` (only italic Crimson).

## Scope at the baseline (exact)
- Literal font-size < 11 px: **734** hits → CHANGE **414** (121 files), ALLOW 277 static science diagrams + 1 logo, 35 dev-only, 8 in-SVG figure text.
- Plus CHANGE: `LongViewHero.svelte:183` clamp min 10px; `tokens.css:44` token; `PanoramaCompassRose.svelte:77–80` SVG letters 9 → 11. VERIFY (computed style): 9 `em` sizes, `site-tags.ts:527` and `:513` (scale-driven, clamp to ≥ 11).
- `font-style: italic`: **99** in src → CHANGE 82 (38 → upright lead, 28 → upright meta, 16 → upright body), KEEP 12 (quotes/captions, raise to ≥ 14 px, mark `a1-keep`), ALLOW 5 (@font-face, dev).
- 12 panel `.editorial` rules (+4 `.empty` variants) → upright lead; 5 Crimson upright panel lead rules (`.dispatch` ×2, `.story-text`, `SiteStoryPanel .intro`, `.site-dispatch`) → Space Mono lead.
- Label colours: `.cell-label`/`.stat-label` at 0.25–0.55 alpha and `var(--muted)` → `--color-text-label`.

## Lead decisions on the brief's open points
1. Dev-only tools (35 hits): ALLOW — not user-facing; listed by path in the check.
2. Figure and illustration captions (anatomy, blueprint, site illustration, program figure, belt caption): captions → KEEP italic at ≥ 14 px.
3. Inline `<em>` emphasis in essays and the programs intro: KEEP.
4. Home `.tagline`, `.prose p`, card titles: CHANGE now (no partial updates).
5. Collectible card story: CHANGE (upright lead).
6. Canvas text: 3D scene sprite labels are slice C2; science charts and Lab canvases keep their own (end-check list). The HUD-like 2D canvases — `plan/+page.svelte` (5), `SurfaceFlatPatch.svelte` (2), `surface-2d-map.ts` (3) — are UI text and are IN A1.

## Docs to change in A1
AGENTS.md design-system block (`:715–731`: Crimson "always italic" line is wrong after A1; add the
scale and the floor); `docs/concept/05_Design_System.md` (`:122–148`, `:215`, `:248–333` 6–7 px rules);
`docs/uxs/IA.md:218–231` (typography tokens — home of the 5 tokens); `docs/uxs/UXS-002/003/004/005/006/013/015`
size and italic lines; `docs/concept/03_Data_Catalog.md:137`; PRD-008/010/011/013 italic lines.

## Tests
No test asserts sizes today. Add `tests/e2e/type-floor.spec.ts`: crawl every route in
`scripts/site-routes.mjs` plus one open panel per panel type; every visible text node ≥ 11 px; label
alpha ≥ 0.58; overview paragraph upright, Space Mono, ≥ 15 px. Visual baselines: most of the 75 PNGs
in `tests/e2e/visual.spec.ts-snapshots/` change — regenerate (`npm run regen-visual-baselines-linux`
plus darwin) and review. Re-run: a11y, footer-dock, landing, mobile-invariants, surface-selected-site-zoom, fleet.
Shots in `de` and `ar` for label overflow.

## Locales
None (CSS only).

## Check (re-run by the independent checker; must print `A1-CHECK violations: 0`)
Kept in the scratchpad for the checker (not added to the repo): `a1-check.sh` — literal font-size < 11
(px/rem/pt, clamp minimum), the label token, SVG `font-size` attrs in src UI, and every `font-style:
italic` without an `a1-keep` marker; allow-list = `static/`, `src/routes/dev/`, the three debug tools,
`lab/FigureRenderer.svelte`, and lines marked `a1-allow`. Baseline run: 516 violations (417 FLOOR, 94
ITALIC, 4 SVGATTR, 1 TOKEN).
