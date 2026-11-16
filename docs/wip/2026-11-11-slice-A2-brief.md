# Slice A2 brief — one page shell (RP1, CR1, LI1, G1, G2, G5)

Read-only brief, written at HEAD `dd2812e1011` (A1 landed: `tokens.css` carries `--size-label/-meta/-body/-lead/-caption`
and `--color-text-label`; `git grep 'font-style: italic' -- src` finds only the 12 `a1-keep` lines, `fonts.css`
and the dev DebugPanel). Full baseline hit list: `2026-11-11-slice-A2-baseline-hits.txt` (191 lines). Method:
`python3`/`git grep` over the whole repo, not hand-scoped; every `file:line` below was read at that commit.

**Dependency.** A2 implements after A1 is signed off. A1 already set the lead size (`--size-lead`, upright Space
Mono) on credits, library, deep-sky, posters, science, hubs and essay dek; A2 does NOT redo that, it replaces the
per-page copies with one class. A3 (link and accent colour) runs after A2 and owns every colour change; A2 moves
colour values only where a page must adopt the one shell value, and keeps the label colour in ONE variable so A3 edits it once.

## The point list

| ID | Operator text (plan lines 82–119) | State at HEAD |
|---|---|---|
| RP1 | All pages share one style, vibe and standard approach. For fonts, Gallery is the best so far. | many private h1, lead and container recipes, see §1 |
| CR1 / LI1 | Opening text is italic and tiny; make it like colophon or other pages. | Already upright and `--size-lead` since A1 (`credits:957`, `library:322`). Colophon's lead is 15 px literal (`colophon:692`), so A2 must make credits, library AND colophon use the same class; "like colophon" has no stable meaning until then |
| G1 | Content starts further left, aligned with the page title, as on other pages. | Gallery hub: title x = container + 20 px; strip card x = same; strip TEXT x = card + `clamp(24px,5vw,56px)` (`gallery:194`) = 56 px at 1280 and up |
| G2 / G5 | Italic opening text for no reason. | Gone since A1 (`deepsky lede`/`posters lede` upright, `gallery/deep-sky:315`, `posters:142`); the viewer caption is a real caption and stays italic ≥ 14 px (UXD-009) |

## 1. Inventory — every non-scene page (32 routes, 27 files)

64 `+page.svelte` files: 15 dev (`src/routes/dev/*`, allow-listed), 17 other non-page (home, scenes, Lab index, browse tools, card stubs, see §6), **32 in scope**.
"Shares" = a class already common to more than one route. Values are the declared CSS (read at the cited line); `--lead` = `var(--size-lead)`.

| Route (file, A = container line) | Container: max-width · padding (top/side/bottom) | h1 | Lead | Section label / h2 | Shares |
|---|---|---|---|---|---|
| `/credits` (`credits/+page.svelte:936`) | 1080 · 24/16/96, color `#dde4ff` | Bebas 56 px, ls 4, mb 4 (`:942`) | `.intro` `--lead` 1.6 .8 (`:957`) | `.head h2` Space Mono 12 ls 3 upper 60 % (`:949`); `.src-meta h2` Bebas 28 ls 2 (`:1050`) | none (copy of library) |
| `/library` (`library:301`) | 1080 · 24/16/96, `#dde4ff` | Bebas 56 ls 4 (`:307`) | `.intro` `--lead` (`:322`) | `.head h2` as credits (`:314`); `.src-meta h2` 28 (`:449`) | none (copy of credits) |
| `/library/episodes` (`episodes:223`) | 920 · 24/18/80 | default h1 28 px, no family (`:232`) | `.ep-index-blurb` 14 px .7 (`:237`) | — | none |
| `/colophon` (`colophon:628`) | 1100 · **48**/20/96, .85 | Bebas **44** ls 3, mb 12 (`:685`) | `.intro` **15 px literal**, max 720 (`:692`) | `.block h2` Bebas 24 ls 2 (`:719`) | none |
| `/gallery` (`gallery:112`) | 1080 · **calc(nav+24)**/20/80 | Bebas `clamp(40,8vw,64)` ls 1, mb 10 (`:118`) | `.lede` **17 px** 1.5 .75, 60ch (`:124`) | `.strip-text h2` Bebas clamp 30–46 ls 2 (`:197`, card title) | none |
| `/gallery/deep-sky` (`deep-sky:285`) | **1400** · 32/24/64, header **centered** (`:291`) | Bebas **42 ls 10** (`:309`; 32/6 under 640 `:706`) | `.lede` `--lead` .75, 760 centered (`:315`) | `.lb-figure h2` Bebas 26 (lightbox) | duplicate of posters |
| `/posters` (`posters:112`) | 1400 · 32/24/64, centered (`:118`) | Bebas 42 ls 10 (`:136`; 32/6 `:220`) | `.lede` `--lead` .75, 760 (`:142`) | — | duplicate of deep-sky |
| `/patches` (`patches:144`) | 1040 · **calc(nav+24)**/20/80 | Bebas clamp(40,8vw,64) ls 1 (`:164`) | `.lede` 17 px 1.5 .75, 62ch (`:170`) | `.group h2` mono 12 ls 2 upper `#7fb0e0` + top rule (`:180`) | none |
| `/sourcing` (`sourcing:93`) | 760 · **calc(nav+24)**/20/80 | Bebas clamp(38,8vw,60) ls 1, mb 12 (`:99`) | `.lede` 16 px .72 (`:105`) | — | none |
| `/programs` (`programs:181`) | 1040 · 24/20/80 (nav offset already removed, `:185` comment) | Bebas clamp(40,8vw,64) ls 1 mb 8 (`:229`) | `.intro` **18 px** 1.62 .84 66ch (`:235`) + `.lede` hint 13 px .5 (`:246`) | `.group h2` mono 12 ls 2 `#7fb0e0` (`:281`) | none |
| `/programs/[id]` (`programs/[id]:363`) | 760 · **10**/20/80, **root font Crimson Pro** (`:367`) | Bebas clamp(40,9vw,72) lh 1 (`:404`) | `.tagline` 19 px 40ch (`:411`) | `.spine h2, …` mono 12 ls 3 `#7fb0e0` (`:452`) | none |
| `/privacy` (`privacy:148`) | 760 · 24/16/96 | **Space Mono** clamp(24,5vw,34) (`:154`) | `.intro` 15 px literal (`:160`) | `.card h2` (`:173`) | none |
| `/live` (`live:149`) | 900 · 24/16/64, `#dfe6f2` | UA default h1 (`:155`) | `.live-intro` UA size, `#aeb7c7`, 60ch (`:158`) | `.launches h2` 1.05 rem (`:247`) | none |
| `/essays` (`essays:96`) | 1000 · **14**/20/96 | in `LongViewHero` banner (`LongViewHero.svelte:140`, banner image) | `.intro` **Crimson 20 px** upright 64ch (`:102`) | `.movement h2` mono 13 ls 3 `#7fb0e0` (`:113`) | none |
| `/essays/[slug]` (`[slug]:147`) | 720 · **12**/20/96 | Bebas clamp(40,8vw,62) lh 1.02 (`:173`) | `.dek` `--lead` .72 (`:180`) | `.body h2` Bebas 26–32 (prose, `:248`) | none |
| `/science` (host `science/+layout.svelte:195` `.page`: 1440 · 32/16/48 with rails) | host | Bebas 32 ls 4 (`science/+page:127`) | `.lede` `--lead` .7, 560 (`:133`) | `.chapter h2` Bebas 20 ls 3 (`:147`) | host layout |
| `/science/[tab]` | host | Bebas 28 ls 4 (`[tab]:105`) | `.tab-intro` card (own box, `--lead`) | — | host layout |
| `/science/[tab]/[section]` | host + `.reading` 720 (`:248`) | Bebas 28 ls 4 mb 8 (`:283`) | `.lede` `--lead` .85 (`:289`) | `.see-in-app h2` Bebas 14 (`:397`) | host layout |
| `/science/glossary` (`glossary:72`) | 720 · 32/24/80 (inside host column) | Bebas **56 gold** ls 2 (`:78`) | `.lede` `--lead` .78 (`:85`) | — | host + copy of reading |
| `/science/reading-list` (`reading-list:328`) | 720 · 32/24/80 | Bebas 56 gold ls 2 (`:334`; 40 on phones `:475`) | `.lede` `--lead` .92 (`:341`; 17 `:478`) | `.block h2` Bebas 28 teal (`:350`) | with watch-list (copy) |
| `/science/watch-list` (`watch-list:367`) | 720 · 32/24/80 | as reading-list (`:373`) | as reading-list (`:380`) | `.block h2` (`:389`) | with reading-list (copy) |
| `/catalog`, `/learn`, `/worlds`, `/explore/hub` (one component `SectionHub.svelte:44`) | 720 ≥ 768, 880 ≥ 1024 · 16/16/32 (24/24/48 ≥ 768); head 60ch | Bebas 32 ls 4 → 44 ls 5 (`:53`, `:72`) | `.hub-intro` `--lead` → **18 px** ≥ 768 (`:60`, `:76`) .82 | — | **one component (4 routes)** |
| `/missions/[id]`, `/fleet/[id]`, `/explore/[id]`, `/lab/[id]`, `/moon|mars|venus/[id]` (`entity-page.css:6`; 7 routes) | 760 · **72**/20/64, lh 1.6 | **no family (Space Mono bold)** clamp(28,6vw,44) lh 1.1 (`:37`) | `.lede` **18 px** .78 (`:43`) | `.entity h2` mono 12 ls 1 label colour (`:85`) | **already one class: `.entity`** |

Already shared today: `.entity` (7 routes, `entity-page.css`), `SectionHub` (4 routes), `.entity-browse-page` (missions, fleet; filter chrome only, no container/title). Everything else is a private copy. Counts for RP1 (read from the table): h1 sizes 56, 44, 42, clamp 40–64, clamp 38–60, clamp 40–72, 32→44, 28, clamp 24–34, clamp 28–44; max-widths 720, 760, 880, 900, 920, 1000, 1040, 1080, 1100, 1400; lead sizes 14, 15, 16, 17, 18, 19, 20 plus the UA default on /live.

### The majority and the most correct values
- Gallery hub is the operator's reference font page (RP1). Its h1 is Bebas `clamp(40px, 8vw, 64px)` ls 1 px (`gallery:118`); the same recipe is on patches and programs (3 pages), sourcing and the essay are within 2 px of it.
- Top padding 24 px: credits, library, programs, episodes, privacy, live (6) + the three double-offset pages after the fix.
- Side padding 20 px: gallery, patches, sourcing, programs, colophon, essays, essay, program, entity (9) against 16 px (credits, library, privacy, live, hubs).
- Bottom padding 80 px (9 pages) against 96 px (6).
- Lead colour .75–.8 on 11 of 17 pages; median .78.
- Design system §5.8 and §3.2 state the section label as Space Mono **11 px, 700, ls 3 px, 60 % white** (`docs/concept/05_Design_System.md:302–309`, `:134`) = `--size-label` + `--color-text-label`. The code (12 px, ls 2–3, `#7fb0e0` on 5 pages, 60 % white on 2) matches neither the doc nor itself.

## 2. The double nav padding

The nav is `position: sticky; top: 0; height: var(--nav-height)` (`Nav.svelte:662–669`) inside the flow of `+layout.svelte` (`<Nav />` `:555`, `<main>` `:561`), so `<main>` already begins below the bar. A page that adds `calc(var(--nav-height, 64px) + 24px)` starts ~64 px lower than a page that adds 24 px:

| Hit | Line |
|---|---|
| `/gallery` `.gallery-hub` | `gallery/+page.svelte:115` |
| `/patches` `.patches` | `patches/+page.svelte:147` |
| `/sourcing` `.sourcing` | `sourcing/+page.svelte:96` |

`/programs` had the same defect and was fixed (`programs:185` comment). `programs/[id]:617` is a legitimate sticky offset (`top: calc(var(--nav-height) + 20px)`), kept (`a2-allow`; the checker only matches `padding`/`margin`). Related but different: top paddings that are not the standard 24: colophon 48, glossary/reading/watch 32, posters/deep-sky 32, entity 72, essays 14, essay 12, program 10, hub 16 (24 ≥ 768) — all become 24 except where the host layout owns it (science 32, `science/+layout.svelte:202`).

## 3. Italic / Crimson after A1

No `font-style: italic` outside the 12 `a1-keep` lines. Crimson Pro still sets TEXT on these pages (all upright):
- Lead: `essays/+page.svelte:103` `.intro` 20 px — CHANGE to the shell lead (Space Mono).
- Whole-page body: `programs/[id]/+page.svelte:367` `.program { font-family: Crimson }` — every paragraph of every program page is Crimson. A1 did not catch it (not italic, not a size). **CHANGE** to Space Mono (shell root); decision in §8 Q3.
- Long-form prose (reading text, not a lead): `essays/[slug]:187` `.body p` 19 px, `essays/+page:170` `.card-dek` 15.5, `science/+page:156` `.chapter p`, `science/[tab]/[section]:356,382`, `science/+layout:409` rail pill, `credits:831,864` data notes/descriptions (14 px), `credits:1232` is the italic `a1-keep` snippet. **Not A2** (reading voice, not shell); allow-listed with reason, raised as Q3 because `UXD-002`/design system say Crimson is only for quotes and captions.

## 4. Gallery hub: strip text vs title (G1)

Elements (`gallery/+page.svelte`): `<h1>` in `<header>` (`:55`), then `.strips > a.strip > .strip-text` (`:60–100`). At 1280 (desktop-chromium viewport; the 1440 laptop is one more shot): container content-box left = (1280−1080)/2+20 = **120 px**; h1 x = 120; `.strip` card x = 120 (rounded 14 px, full 1040 wide); `.strip-text` x = 120 + `clamp(24px,5vw,56px)` (`:194`) = **176 px**; text is also capped `max-width: min(560px,64%)` (`:195`). Phone 390: h1 x = 20; text x = 20+24 = 44. The cards themselves are aligned with the title; the TEXT is inset 56 px, which is what the operator sees as "starts further right".
Same inset pattern: none on other pages (patches/sourcing have no strips).

## 5. Proposed shell

### Where: one plain CSS file, not a component
`src/lib/styles/page-shell.css`, imported by `app.css` (`@import './page-shell.css';` next to `entity-browse-page.css`, `app.css:1–5`), global classes. Reasons:
1. Precedent: `entity-browse-page.css` (class-scoped shared page chrome, loaded once from `app.css`) and `entity-page.css` (class-scoped, imported per page). Both solve the identical problem and both are CSS, because every page's markup differs (header wrapper, crumb, totals rows).
2. A `PageShell.svelte` component would force a markup rewrite of 27 files, 3 of which are 1000+ line pages with `data-route-ready`, `aria-labelledby` and visual-test selectors on their root/`header.head` (`visual.spec.ts:47–198`, `credits.spec.ts`, `library.spec.ts`); the class approach adds a class to the existing element and keeps every hook.
3. `SectionHub.svelte` already is the component for the 4 hub routes; it adopts the classes in its own markup.
4. Svelte-scoped page rules beat a lower-specificity global (`.head h1` scoped = 0,2,1 against `.page-title` 0,1,0): the old per-page rules MUST be deleted, not overridden. The checker enforces that.

### Classes (independent of each other; `.page-shell` is only the container)
| Class | Element | Values (derivation in §1) |
|---|---|---|
| `.page-shell` | page root (`section`/`article`/`div`, keeps its own class for hooks) | `max-width: var(--page-width, 1080px); margin: 0 auto; padding: 24px 20px 80px; color: var(--color-text)` |
| `.page-shell--reading` | root modifier | `--page-width: 760px` (sourcing, privacy, program, entity, essay, glossary, reading/watch inside the science host) |
| `.page-shell--wide` | root modifier | `--page-width: 1400px` (posters, deep-sky) |
| `.page-shell--inset` | root modifier | no max-width/auto margin/padding: the host layout owns the container (science host `.content`) |
| `.page-crumb` | `<nav class="crumb">` | Space Mono `--size-label` ls 1 px `--color-text-label`, mb 14 px; links .7 white (today copied on deep-sky, posters, patches, entity, program) |
| `.page-title` | the visible `<h1>` | Bebas (`--font-display`), `font-size: var(--size-title)`, ls 1 px, `line-height: 1.05`, `margin: 0 0 10px`, color `var(--color-text)`; **font-weight not set** (today every page inherits the UA bold, so Gallery stays pixel-identical; see §8 NV7) |
| `.page-lead` | the opening paragraph(s) | `font-size: var(--size-lead); line-height: 1.55; color: rgba(255,255,255,.78); max-width: 64ch; margin: 0 0 12px`; upright Space Mono, inherits body family; `em` inside stays italic (A1 decision 3) |
| `.page-section-label` | small uppercase group/section heading (`h2`/`h3`) | Space Mono 700 `--size-label` ls 3 px uppercase, `color: var(--page-label-color, var(--color-text-label))`, `margin: 32px 0 16px` — the design system §5.8 value; `--rule` modifier adds the top rule `1px rgba(255,255,255,.1)` + `padding-top: 16px` (patches, programs, essays) |
| `.page-section-title` | large section heading (`h2`) | Bebas `28px` ls 2 px `--color-text`, `margin: 0 0 16px` (credits/library source blocks 28, reading/watch 28, colophon 24, science chapter 20 → majority 28) |

Tokens to add in `tokens.css` (type block, next to A1's): `--size-title: clamp(40px, 8vw, 64px);` and spacing `--page-width: 1080px` is NOT a global token (set per root by the modifier so the property is local). `--page-label-color` is defined once in `page-shell.css` (`var(--color-text-label)`); A3 changes colour semantics there if it must.

Wide viewport guarantee: `.page-title`'s clamp floors at 40 px, so at 390 px a 14-letter German title still fits in Bebas (condensed); check de/ar shots (§9).

### Gallery hub strip (G1) — proposal
Recommended: the strip text's left edge equals the title's left edge: `.strip-text` loses its inline inset (`padding-inline-start: 0`), and the strip becomes a frameless band whose dark scrim starts at the container edge (no left rounding), so the text sits exactly on the title's x. The rounded-card look stays on the right end. Fallback if the shot reads badly: keep cards, give strip text a fixed `20px` inset and align the page title/lead to the card text instead (then a gallery-only exception). Operator picks on the shot (§8 Q2). The e2e asserts `strip-text.left == h1.left (±1 px)` under the recommended option.

## 6. Hit list and allow-list

### CHANGE (27 files, 191 violations at baseline; per file, from `…-baseline-hits.txt`)
credits 10, colophon 7, library 10, library/episodes 7, gallery 9 (incl. `G1-STRIP-INSET` `:194` and `NAV-PAD` `:112`), gallery/deep-sky 10, posters 9, patches 9, sourcing 7, programs 10, programs/[id] 7, privacy 8, live 7, essays 5, essays/[slug] 8, science/+page 5, science/[tab] 2, science/[tab]/[section] 5, glossary 7, reading-list 10, watch-list 10, `SectionHub.svelte` 11, missions/[id] 3, fleet/[id] 3, explore/[id] 3, lab/[id] 2, `SiteEntityPage.svelte` 3, `entity-page.css` 4 (rules for root, h1, lede, h2 move to the shell). By kind: H1-MARKUP 26, LEAD-MARKUP 28, NO-SHELL 24, ROOT-CSS 32, H1-CSS 27, H2-CSS 20, LEAD-CSS 28, NAV-PAD 3, HEADER-CENTER 2, G1-STRIP-INSET 1. New files: `src/lib/styles/page-shell.css`, `tests/e2e/page-shell.spec.ts`.

Expected `a2-keep: <reason>` markers at the end (each justified; everything else must reach zero by conversion):
| Rule | Why kept |
|---|---|
| `gallery:197 .strip-text h2` | card title inside an image strip, not a page section heading |
| `deep-sky:547 .lb-figure h2` | lightbox figure title |
| `essays/[slug]:248,257 .body h2` (+`::after`) | essay prose headings (reading content) |
| `privacy:173 .card h2` | card titles inside the opt-out cards |
| `programs:246 .lede` (browse hint) and `programs:242 .intro em` | toolbar hint text; inline `<em>` emphasis (A1 decision 3) |
| `science/[tab]` `.tab-intro` card | boxed 101 intro card with its own tiers |
| `science/[tab]/[section]:248 .reading` | reading measure inside the host column |
| `essays/+page` h1 (inside `LongViewHero`) | banner image title (see allow-list) |

### Allow-list (not touched, with reason)
| Item | Reason |
|---|---|
| `/` (`routes/+page.svelte`) | H8: home styling belongs to the home slice (H1–H8); `.tagline`, `.prose h2` stay as A1 left them. A2 must not restyle home |
| Scene routes: `/explore`, `/fly`, `/earth`, `/moon`, `/mars`, `/venus`, `/iss`, `/tiangong`, `/plan` | full-bleed canvas, visually-hidden `<h1>` (`VisuallyHiddenH1`); no page container |
| `/missions`, `/missions/launches`, `/fleet` | browse tools, 1400 container, visually-hidden `<h1>` (`missions:411`, `launches:222`, `fleet:448`), `entity-browse-page` chrome; whether they should get a visible title is Q4, not decided here |
| `/lab`, `/lab/callback` | the Lab is its own app shell (`lab__*`, UXS-015) |
| `/cards/[kind]/[id]`, `/c/[kind]/[id]`, `routes/+error.svelte` | render stage / redirect stub / error screen, no page content |
| `src/routes/dev/*` (15 files) | not user-facing (A1 rule) |
| `LongViewHero` h1 on `/essays` | text drawn over the banner illustration; its `.intro` below the banner DOES adopt `.page-lead` |
| Long-form prose in Crimson (essay body, science narrative, credits data notes) | reading voice, Q3 |
| `science/+layout.svelte` `.page` container (1440, 32 px top) and rails | host of 6 science routes; pages take `.page-shell--inset` and the type classes only |

## 7. Tests, docs, locales

### Tests
- **New `tests/e2e/page-shell.spec.ts`**, 3 projects (desktop 1280x720, Pixel 5 393x851, Pixel 5 landscape 851x393). Routes: the 27 files above with one URL each (`/credits`, `/colophon`, `/library`, `/library/episodes`, `/gallery`, `/gallery/deep-sky`, `/posters`, `/patches`, `/sourcing`, `/programs`, `/programs/apollo`, `/privacy`, `/live`, `/essays`, one `/essays/<slug>`, `/science`, one tab, one section, `/science/glossary`, `/science/reading-list`, `/science/watch-list`, `/catalog`, `/learn`, `/worlds`, `/explore/hub`, `/missions/<id>`, `/fleet/<id>`, `/explore/<id>`, `/lab/<formula>`, `/moon/<site>`). Per page assert on computed styles: visible `h1.page-title` family starts `Bebas Neue`, font-size / letter-spacing / line-height equal one expected object per viewport (essays index skipped: banner h1); `.page-lead` upright, Space Mono, size `16`(≥601) or `15` (≤600, `--size-lead`), alpha ≥ .7; no italic on the lead; `.page-shell` `max-width` is one of {1080, 760, 1400}; for standalone pages `h1.getBoundingClientRect().top − nav.getBoundingClientRect().bottom` = 24 ±1 (catches a double nav offset); h1 left equals the root content-box left (no stray indent); gallery: `.strip-text` left = h1 left ±1 (G1). Science pages: type metrics only, top offset 32 asserted separately.
- Adjust `tests/e2e/type-floor.spec.ts`: no change expected (floor already guarded); re-run only.
- Keep root/hook classes (`section.credits`, `.head`, `article.gallery-hub`, `article.gallery`, `.programs-index`, `.longview`, `.ep-index-head`, `article.resources`) so `visual.spec.ts`, `credits.spec.ts`, `library.spec.ts`, `launches-citations.spec.ts`, `stale-chunks.spec.ts` selectors stay valid; the spec files themselves need no edit (verify by running them).
- **Visual baselines that change (54 of 75 PNGs, linux only; no darwin files exist):** 17 labels × 3 projects = 51: `catalog-hub-grid`, `colophon-head`, `credits-head`, `deep-sky-head`, `essays-head`, `explore-hub-grid`, `gallery-head`, `learn-hub-grid`, `library-episodes-head`, `library-title`, `patches-head`, `posters-head`, `programs-head`, `reading-list-head`, `sourcing-head`, `watch-list-head`, `worlds-hub-grid`; plus `science-tabs` × 3 (`visual.spec.ts:51` captures `main`). Regenerate with `npm run regen-visual-baselines-linux` (or the amd64 workflow), diff-review each; the other 21 must be byte-identical (any change there is a finding).
- Re-run (all 3 projects): `credits`, `library`, `posters`, `science`, `a11y`, `a11y-keyboard`, `mobile-invariants`, `mobile-layout`, `landing` (must NOT change: home is allow-listed), `smoke`, `i18n-all-routes`, `type-floor`, `visual`.

### Docs (rule says the new rule, links UXD-012)
- `docs/uxs/IA.md`: new `§page-shell` after `§shell-regions` (`:175–187`) with the class table; note the `nav-height` row of §spacing (`:233–242`, says 52 px, tokens say 60 px — pre-existing mismatch, log not fix).
- `docs/concept/05_Design_System.md`: new §4.6 "Page shell"; §3.2 add rows (Page title, Page lead); §3.3 `:146` says section labels are ALL CAPS by content, not CSS `text-transform`, while 12 pages use `text-transform: uppercase` (decision Q1 below: keep CSS, fix the doc); §5.8 add "also the page section label".
- `AGENTS.md` design block (`:715–745`): add the page-shell classes and "no page defines its own h1/lead/container; no `--nav-height` padding on a page".
- `docs/adr/TA.md`: the type-scale paragraph (`:311`) gets one sentence on the shell file; `:110` entity pages now layer on the shell.
- `src/lib/components/README.md:14` (`entity-page.css` entry) and a new line for `src/lib/styles/page-shell.css`; no README exists in `src/lib/styles` (propose one row in the components README instead of a new file).
- UXS: no spec covers these pages (UXS-000 §Next, UXD-009 context). `docs/uxs/CHANGE-INVENTORY.md:23` row A2: status, decision `UXD-012`, specs `IA §page-shell`. `docs/uxs/decisions/README.md` index row for UXD-012. `docs/uxs/UXS-000…` §Next list. Feedback plan answer line for A2.
- The comment in `programs/+page.svelte:181–187` and `entity-page.css` header comment get rewritten (rot).

### Locales
None: CSS and class names only. No `messages/*.json` key, no `paraglide` output, no text changes. `validate-data` untouched. The only locale risk is layout: shots in `de` (long words) and `ar` (RTL; the shell uses logical properties for the strip inset, `padding-inline-start`) on credits, gallery, library.

## 8. Decisions and open questions (operator)
- **UXD-012 `proposed`** (draft in the appendix): one page shell. The operator's go makes it `accepted`.
- **Q1** Section label: use the design-system value (11 px, 700, ls 3, 60 % white, uppercase via CSS) instead of today's 12 px `#7fb0e0`? Recommended yes (doc + A1 token); A3 may then re-colour. If no, say which.
- **Q2** G1: strip text flush with the title (frameless band, recommended) or fixed 20 px card inset (fallback)?
- **Q3** `/programs/[id]` page body is Crimson upright, and essay/science prose is Crimson upright: is Crimson allowed for long-form reading prose? Design system says quotes and captions only. A2 changes only the program page root (to Space Mono) and leaves essay/science prose; confirm.
- **Q4** `/missions`, `/missions/launches`, `/fleet` have no visible title: add one with the shell, or stay tools?
- **Q5** Shell colour: credits/library/live containers use bluish `#dde4ff`/`#dfe6f2` text; the shell uses `--color-text` white at the container with per-element alphas. Confirm the whiter look on credits/library/live.
- **Q6** Hubs (catalog, learn, worlds, explore/hub) currently 720/880 wide: take 1080 like the other index pages? Recommended yes (grid gets wider); shots decide.

## 9. Screenshots for the operator (small, via dev server per AGENTS "Iterating on UI"; not Docker)
Desktop 1440x900 and phone 390x844; before (this commit) and after, side by side, one sheet per viewport:
credits, library, colophon, gallery hub, deep-sky (grid, not viewer), posters, patches, programs, sourcing (the plan's nine) + privacy, glossary, `/missions/<id>`, `/worlds` (one per other family) = 13 screens × 2 viewports × 2 = 52 PNGs. Plus `de` and `ar` for credits, gallery hub, library at 390 (6 more). Landscape (851x393) only in the e2e spec, not in the sheet.

## 10. Check (re-run by the independent checker; must print `A2-CHECK violations: 0`)
Baseline run at `dd2812e1011`: **191 violations** (list in `…-baseline-hits.txt`). Run from the repo root as `bash a2-check.sh`; the script is kept here and in the scratchpad, not added to the repo. Allow marker: `a2-keep: <reason>` inside a CSS rule or in the 200 chars before a markup tag; `a2-allow` for sticky nav offsets. The checker also runs `grep -rn "calc(var(--nav-height" src/routes` and expects only `programs/[id]`.

```bash
#!/usr/bin/env bash
# A2-CHECK — run from the repo root. Prints every violation as KIND file:line text, then
# "A2-CHECK violations: N". Allow marker: put `a2-keep: <why>` (CSS rule or markup line) or
# `a2-allow` (nav-height sticky offsets) inside the rule / on the line.
set -u
cd "$(git rev-parse --show-toplevel)"
python3 - <<'PY'
import re, sys

# page file -> (expected container class on the root element, or None when the host layout owns the container)
PAGES = {
  'src/routes/credits/+page.svelte': 'credits',
  'src/routes/colophon/+page.svelte': 'colophon',
  'src/routes/library/+page.svelte': 'library',
  'src/routes/library/episodes/+page.svelte': 'ep-index',
  'src/routes/gallery/+page.svelte': 'gallery-hub',
  'src/routes/gallery/deep-sky/+page.svelte': 'gallery',
  'src/routes/posters/+page.svelte': 'gallery',
  'src/routes/patches/+page.svelte': 'patches',
  'src/routes/sourcing/+page.svelte': 'sourcing',
  'src/routes/programs/+page.svelte': 'programs-index',
  'src/routes/programs/[id]/+page.svelte': 'program',
  'src/routes/privacy/+page.svelte': 'privacy',
  'src/routes/live/+page.svelte': 'live',
  'src/routes/essays/+page.svelte': 'longview',
  'src/routes/essays/[slug]/+page.svelte': 'essay',
  'src/routes/science/+page.svelte': None,
  'src/routes/science/[tab]/+page.svelte': None,
  'src/routes/science/[tab]/[section]/+page.svelte': None,
  'src/routes/science/glossary/+page.svelte': 'glossary',
  'src/routes/science/reading-list/+page.svelte': 'resources',
  'src/routes/science/watch-list/+page.svelte': 'resources',
  'src/lib/components/SectionHub.svelte': 'section-hub',   # catalog, learn, worlds, explore/hub
  'src/routes/missions/[id]/+page.svelte': 'entity',
  'src/routes/fleet/[id]/+page.svelte': 'entity',
  'src/routes/explore/[id]/+page.svelte': 'entity',
  'src/routes/lab/[id]/+page.svelte': 'entity',
  'src/lib/components/SiteEntityPage.svelte': 'entity',    # moon|mars|venus/[id]
}
EXTRA_CSS = ['src/lib/components/entity-page.css']  # the shared entity layout: must hold no h1/lead/label/container rules
LEAD = r'(?<![\w-])(?:intro|lede|dek|hub-intro|tagline|live-intro|ep-index-blurb)(?![\w-])'
viol = []

def split(src):
    m = re.search(r'<style[^>]*>(.*?)</style>', src, re.S)
    if not m: return src, '', 0
    return src[:m.start()] + src[m.end():], m.group(1), src[:m.start(1)].count('\n') + 1

def rules(css, base):
    for rm in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = ' '.join(re.sub(r'/\*.*?\*/', '', rm.group(1), flags=re.S).split())
        raw = rm.group(0)
        line = base + css[:rm.start(2)].count('\n')
        yield sel, rm.group(2), raw, line

def css_checks(f, css, base, root):
    for sel, body, raw, line in rules(css, base):
        if sel.startswith('@') or 'a2-keep' in raw: continue
        low = sel.lower()
        if re.search(r'(^|[ ,>+~])h1\b', low):
            viol.append(('H1-CSS', f, line, sel))
        elif re.search(r'(^|[ ,>+~])h2\b', low):
            viol.append(('H2-CSS', f, line, sel))
        elif re.search(r'\.' + LEAD, low) and re.search(r'font-size|font-family|color|max-width|line-height|text-align', body):
            viol.append(('LEAD-CSS', f, line, sel))
        elif re.search(r'(^|[ ,>+~])header\s*$', low) and 'text-align' in body:
            viol.append(('HEADER-CENTER', f, line, sel))
        elif root and re.fullmatch(r'\.' + re.escape(root), low) and re.search(r'max-width|padding|margin\s*:\s*0 auto', body):
            viol.append(('ROOT-CSS', f, line, sel))
        if re.search(r'(padding|margin)[a-z-]*\s*:[^;]*calc\(var\(--nav-height', body) and 'a2-allow' not in raw:
            viol.append(('NAV-PAD', f, line, sel))

for f, root in PAGES.items():
    src = open(f).read()
    markup, css, base = split(src)
    mline = lambda pos: src[:pos].count('\n') + 1
    for m in re.finditer(r'<h1\b[^>]*>', markup):
        if 'page-title' not in m.group(0) and 'a2-keep' not in markup[max(0, m.start()-200):m.start()]:
            viol.append(('H1-MARKUP', f, mline(m.start()), m.group(0)))
    for m in re.finditer(r'<p\b[^>]*class="[^"]*' + LEAD + r'[^"]*"[^>]*>', markup):
        if 'page-lead' not in m.group(0) and 'a2-keep' not in markup[max(0, m.start()-200):m.end()]:
            viol.append(('LEAD-MARKUP', f, mline(m.start()), m.group(0)))
    if root and 'page-shell' not in markup:
        viol.append(('NO-SHELL', f, 1, 'root .' + root + ' has no page-shell class'))
    css_checks(f, css, base, root)

for f in EXTRA_CSS:
    css_checks(f, open(f).read(), 1, 'entity')

g = open('src/routes/gallery/+page.svelte').read()
for i, l in enumerate(g.splitlines(), 1):
    if re.search(r'padding:\s*0 clamp\(24px, 5vw, 56px\)', l) and 'a2-keep' not in l:
        viol.append(('G1-STRIP-INSET', 'src/routes/gallery/+page.svelte', i, l.strip()))

for k, f, l, t in viol:
    print(f'{k:14} {f}:{l}  {t[:110]}')
from collections import Counter
c = Counter(k for k, *_ in viol)
print('by kind:', dict(c))
print(f'A2-CHECK violations: {len(viol)}')
PY
```

Known limits of the check (so the checker does not over-trust it): it only reads the 27 listed files and `entity-page.css`; it matches class NAMES, so a page that renames its lead to a new class escapes the lead checks (the e2e spec is the second guard); `ROOT-CSS` also fires inside `@media` blocks (counted once per rule, intended); NO-SHELL on `SectionHub`/`SiteEntityPage` covers the 4 and 3 routes they render, not each route file.

## 11. Acceptance (definition of done, per the plan)
1. `bash a2-check.sh` prints `A2-CHECK violations: 0`; `git grep -n "calc(var(--nav-height" -- 'src/routes/**/+page.svelte'` lists only scene routes and `programs/[id]:617`.
2. Docs in §7 say the rule and link UXD-012; the A2 row in `CHANGE-INVENTORY.md` is updated; no doc still says section labels are not `text-transform`.
3. `page-shell.spec.ts` green on desktop-chromium, mobile-chromium, mobile-landscape-chromium; the 13 re-run specs green on all three; 54 PNGs regenerated and reviewed, the other 21 unchanged; nothing skipped or left red.
4. Locales: no key added or changed (`git diff --stat -- messages src/lib/paraglide` empty); `validate-data` green.
5. Home page diff empty (`git diff -- src/routes/+page.svelte` empty), scene routes untouched, `landing.spec.ts` snapshots unchanged.
6. The operator receives the §9 sheets and answers Q1–Q6.

### Appendix — draft `docs/uxs/decisions/UXD-012-one-page-shell.md` (proposed; written when the go comes, not now)
```markdown
# UXD-012 — One page shell: one container, h1, lead and section label for every text page

- **Status**: proposed
- **Date**: 2026-11-11 (proposed)
- **Decider**: the operator — pending. Inputs: RP1, CR1, LI1, G1, G2, G5 (`docs/wip/2026-11-11-ux-feedback-plan.md`
  lines 82–119), "For fonts, Gallery is the best so far"
- **Answers**: RP1, CR1, LI1, G1, G2, G5; slice A2 (page shell)
- **Changes**: `src/lib/styles/page-shell.css` (new), `tokens.css` (`--size-title`); IA §page-shell;
  `docs/concept/05_Design_System.md` §3.2, §3.3, §4.6, §5.8; AGENTS.md "Design system"; TA.md type-scale paragraph;
  `src/lib/components/README.md`

## Context
At `dd2812e1011` 27 files draw 32 text pages with 8 h1 sizes, 8 lead sizes, 4+ container widths and
three pages that add the nav height twice (`gallery:115`, `patches:147`, `sourcing:96`). Gallery is the
operator's reference. Full inventory: slice A2 brief §1.

## Options
1. One CSS file with five classes (container + 3 width modifiers, h1, lead, section label/title, crumb), values from Gallery and the
   design system. 2. A `PageShell.svelte` component. 3. Leave per-page CSS and add a test only.

## Decision
Option 1 (values in the brief §5): container 1080 / reading 760 / wide 1400, 24 px top, 20 px sides, 80 px bottom; h1 Bebas
`clamp(40px, 8vw, 64px)` ls 1 px; lead `--size-lead` upright Space Mono .78 white, 64ch; section label Space Mono 11 px 700
ls 3 px uppercase 60 % white; section title Bebas 28 px. No page adds the nav height. Allow-list: home (home slice), scenes, browse
tools, Lab, card stubs, dev, essays index banner h1.

## Consequences
27 files lose their private h1/lead/container rules; 54 visual baselines change; no locale change; A3 owns every later colour change.

## Verification
`tests/e2e/page-shell.spec.ts` on three projects; `a2-check.sh` prints `A2-CHECK violations: 0`.
```

## 12. NOT VERIFIED (what this brief did not check)
- NV1 No browser: no rendered measurement of any left offset, h1 size at a viewport or wrap of long titles at `clamp(40px…)`; the 1280 px arithmetic in §4 is from CSS only.
- NV2 Dev server and e2e were not run; the claim "the other 21 PNGs are unchanged" is a prediction from the selectors in `visual.spec.ts`, not a run.
- NV3 `--size-lead` 16 px at ≥ 601 and 15 px under comes from `tokens.css` (`@media (max-width: 600px)`); not read in a browser.
- NV4 Credits and library `.head h2` were classified "section label"; `credits_intro_heading` text content was not read, so whether it is a label or a subtitle is a judgement.
- NV5 Per-page measurements for pages with media-query overrides (credits 36/32 padding at `:1253`, library `:611`, deep-sky `:706–712`, reading-list `:472`) were read but only the base values are in the table.
- NV6 `lab/[id]` and `explore/[id]` h1/lead classes were taken from the same `entity-page.css`; their markup differences beyond `<h1>` (`lab/[id]:52` has no `.lede`) were not diffed.
- NV7 Bebas has only the 400 face (`fonts.css:4–22`); every page h1 has no `font-weight`, so the browser draws synthetic bold. Not verified in a browser that this is what Gallery shows, nor whether it is intended. The shell deliberately keeps it unchanged.
- NV8 Prerender/SEO effects (JSON-LD, `data-route-ready`) of adding classes are assumed none; not built.
- NV9 Science host layout: left offset of `.content` and whether glossary/reading/watch show the left rail was inferred from `science/+layout.svelte` and `+layout.ts` markup, not run.
- NV10 The check script ran once at baseline (191); it has no tests of its own and was not run against a fixed tree.
- NV11 `tests/e2e/mobile-invariants.spec.ts`/`mobile-layout.spec.ts` were not read for assertions that a 40 px h1 could break (horizontal overflow at 393 px).
- NV12 CR1's intent (italic AND tiny) is read from the plan text; it was verified that neither is true at HEAD, not whether the operator saw a cached or older build.
