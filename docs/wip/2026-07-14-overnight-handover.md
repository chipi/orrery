# Overnight handover — 2026-07-14

Two work blocks landed while you slept. Nothing pushed, nothing committed —
all changes sit in the working tree on `content` for your review.

## 1. /programs peer-review + fact-fixes (all 42)

Ran every program editorial through the `science-reviewer` agent (skeptical,
web-verifying), then applied all-tier corrections.

- **Findings**: `docs/wip/programs-factcheck-2026-07.md` (consolidated) +
  `docs/wip/programs-factcheck-fixspec.md` (exact quote→replacement spec).
- **Applied**: 37 programs edited (en-US prose overlays + base-data roster/notes).
  Clean, untouched: iss, spacex, starlink, esa-human. gemini = base-only (one number).
- **Headline fixes**: staleness reworks (Artemis II already flew Apr 2026 → III is
  now a demo, IV the first landing; Gaganyaan 2026→2027; ROS near-polar orbit +
  2027 module both reversed Dec 2025; Kuiper→"Amazon Leo"; Starship no longer sole
  Artemis lander; Tiangong/Shenzhou "since 2021"→2022); plain errors (Ariane: JWST
  wasn't the final flight, VA261/2023 was; Voyager "only two objects leaving the
  solar system"→five, only two in interstellar space; Chandrayaan water 2008→2009 +
  it was NASA's M3 instrument; Mangalyaan "no nation ever"→ESA beat it in 2003;
  Viking "first Mars surface photo"→Mars 3; Mariner date span; Mir design-life
  arithmetic; Apollo Saturn-V superlative; Cassini cruise distance; +~40 more).
- **Translations**: the 37 touched prose overlays were re-generated in all 13 locales
  via `scripts/translate-programs-i18n.mjs`. One call (`vostok → sr-Cyrl`) first hit an
  API usage limit; after Marko lifted it, that file was re-translated fresh — **all 14
  locales are now current**, nothing outstanding.
- **Preflight: GREEN** — `npm run i18n:compile` + `npm run preflight` both clean:
  3437 tests, build, 2732 prerendered HTML (all 13 locale roots present), precache
  26.8/50 MB, no broken internal links. Safe to push once you've reviewed.
- One test touched: `src/lib/image-ladder-contract.test.ts` — added `images/essays/`
  to the direct-referenced-art exclusion (same rationale as posters/badges), since
  essay art doesn't use the responsive ladder.

## 2. Navigation essay — visual pass (hero + diagrams)

The `navigation` essay ("Finding Mars in the Dark") now has full art.

- **Model extended**: added a `figure` block type (`photo` | `diagram`) + hero to
  `src/types/essay.ts`; the `/essays/[slug]` renderer now draws a hero, wide figure
  panels with captions/credits, and a faint plate behind diagrams.
- **4 diagrams** (the abstract beats): dead-reckoning, deep-space-network,
  reference-frame, gravity-assist. Method you chose: precise **SVG sketches**
  (`docs/wip/essay-diagram-sources/navigation/*.svg`) → **Higgsfield nano_banana_pro**
  restyle into the Wired / world-as-art look, geometry + labels preserved.
- **1 bespoke hero**: a lone craft taking a three-star fix (no text).
- **2 reused vetted photos** (concrete beats): Apollo 8, Perseverance — with honest
  mission-level captions + credits. (Reused rather than newly-sourced to stay inside
  the no-web-search-for-images rule; swap for fresh sources on your call.)
- Files: `static/images/essays/navigation/{hero,dead-reckoning,deep-space-network,reference-frame,gravity-assist}.webp`. Figures wired into `i18n-src/en-US/essays/navigation.json`; hero into `static/data/essays/navigation.json`.
- Verified: all 7 images load 200, renders clean at desktop + mobile widths.
- Higgsfield credits used: ~10 of 255.

### Open / next (your call)
- Essay captions are English-only (essays are still English-first exempt); translate
  once the essay shape is locked.
- Other essays (delta-v, reusable launchers, propulsion, comms) not yet written.
- Dev server left running on :5599 for your review (yours on :5373 untouched).
