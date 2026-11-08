# Open items after 0.9.7 — the one list

Rewritten 2026-11-08 after 0.9.7 merged (PR #649, squash `908ca0d9465`; release commit
`8248a6b4043`, being deployed and tagged `v0.9.7`). First commit on `tech-debt/0.9.8`. It keeps
only what is open now. Older notes that were
folded into this list: `git show d11a0df6db6:docs/wip/<name>`. The 0.9.6 plan and record:
`git show 73aaccec30c:docs/wip/2026-11-04-open-items.md`. What else stays in `docs/wip/` is listed
at the end. The file keeps its 2026-11-04 name because ADR-047, ADR-051, RFC-015,
`.claude/skills/term-consistency/SKILL.md` and `scripts/lib/dhash.mjs` link to it by that name.

**0.9.7 done.** Rover traverses and the zoom review of every landing site, the panorama review,
screen-space site tags, landing story sheets and exploded cutaways, mission-gallery provenance fixes,
the audio-tour re-listen (all 32 episodes), the deploy gaps (route budget measured with prod's
sourcemap build, collectible card on demand on `/missions` and `/fleet`, MCP trace probe), the
CodeQL triage (175 alerts) and the fact-check re-verification (793 findings, 14 locales). The
release notes are in `CHANGELOG.md` `[0.9.7]`; the full plan and step-by-step record, with commit
ids, is `git show 908ca0d9465:docs/wip/2026-11-04-open-items.md`.

Rules that still hold: no paid LLM or translation runs (the Hebrew run is the one exception the
operator allowed); every translation fix round ends with a measurement; a new error class is the
stop rule; never list native-speaker review as a gap; work inline by hand, fewest tokens, and evolve
the tooling every round.

## 0.9.8 — plan (operator, 2026-11-08)

Branch `tech-debt/0.9.8`, cut from main after PR #649 (0.9.7) merges. Out of scope for 0.9.8:
the mobile apps (#442, #490, #621, AR, crash reporting on a device) and TV / D-pad (#375).

**Must close in 0.9.8:**

0. **SEO, in-repo (first work item).** From the 2026-11-08 technical audit of the build
   (`docs/wip/<date>-seo-review.md`): one URL set per language, English slugs, each locale page
   canonical to itself with full hreflang (already correct for hub pages). Work, in order:
   - **Entity pages** — `/missions/<id>`, `/fleet/<id>`, `/moon/<id>`, `/mars/<id>`, planets…, in
     all 14 locales (`/de/missions/apollo-11`) — first of all: noindex / redirect the staging host
   (`chipi.github.io/orrery` ranks for "porkchop plot calculator" instead of orrerylearn.com).
   Entity pages: self-canonical, hreflang, title / H1 /
     description from the locale overlay, content in the prerendered HTML; the `?id=` panels stay
     as the in-app view and link to the page. Today no entity has an indexable URL (shells
     canonicalise to `/fleet`, `/missions`; the 523 `/c/*` stubs are noindex, en-US only).
   - Open Graph + Twitter tags on every indexable page (none today besides `og:locale`).
   - JSON-LD: Article + BreadcrumbList (essays, science, programs), WebSite + Organization (home),
     entity types for the new pages.
   - Titles: `/explore`, `/fly`, `/venus` are just "Orrery" in 14 locales; ≤60 chars, consistent
     "<page> · Orrery" style, no ALL-CAPS; 476 pages without a meta description; descriptions
     ≤160 chars; titles/descriptions with the words people search for, in each language
     (content review).
   - H1 on `/earth`, `/iss`, `/mars`, `/moon`, `/tiangong`, `/venus`, `/missions/launches`.
   - `lab/callback` noindex; sitemap with `lastmod`, split per locale; inbound links to
     `/catalog`, `/learn`, `/worlds`, `/explore/hub`.
   - Tools say what they are: `/plan` is the porkchop / launch-window planner (titled "Mission
     Configurator", no description); `/lab` calculators get one indexable page each (delta-v,
     TWR, escape velocity, Hohmann … today 60+ share one URL).
   - SEO `<title>` + description beside the poetic H1s (13 essays, 42 programs, ~45 science
     articles; proposals in the content review) — operator approves each; `∆v` titles also say
     "delta-v".
   - Description bugs: raw markdown in `essays/new-propulsion`; ja Lagrange description
     ("two-person system"); de "Lagrange-Punkte".
   - **SEO gate** in validate / CI: every indexable built page has title, description,
     self-canonical, complete hreflang, OG tags, valid JSON-LD and one H1; length limits; no
     noindex leaks; sitemap = indexable pages.
   - From the live-site review: HTML not cached at the edge (`cf-cache-status: DYNAMIC`, no
     `cache-control` / `etag`) — set a cache policy; find the link that produces `/'` (35 views,
     404); sitemap 7.1 MB → per-locale files; PageSpeed numbers still unmeasured (API key or a
     local Lighthouse run — operator decides). Baiduspider: allowed (operator, 2026-11-08) —
     Cloudflare dashboard, AI Crawl Control → Crawlers → Allow; confirm in the live robots.txt.
   Long-term SEO (Search Console, keyword research, monitoring) is a separate agent's work:
   `docs/wip/<date>-seo-brief.md`.
1. **#550** — gallery sourcing: the three galleries below the hero bar (Chang'e 6, Sokol-M,
   Voskhod 11A57), plus the placeholder credits behind them (`validate-gallery-credits.ts`).
2. **#597** — lab-api / MCP OAuth hardening (DCR, `/register`, rate-limit key, token headers).
3. **#257** — caption / alt-text i18n pipeline (every picture's caption in every locale).
4. **#291** — higher-resolution tier-2 surface patches (HiRISE / LROC at ~2 m/px).
5. **#289** — panorama: synthetic-azimuth wedge rendering + microcopy for partial-azimuth sites.

**Then:** the missing site stories. All moon, Mars and Venus sites have one except Chang'e 7
(planned), so this means writing it as a planned-mission story (14 locales).

**Then, all of it in scope (the goal, however long it takes):** robustness (deploy rollback `build.prev`, LL2 5xx
retry proof, observability outage drill), performance (`/lab` chunk; card on demand on the
remaining panels), the rest of the credits backlog (20 placeholders with no identified file, 100
agency-only authors), translation tooling gates (length ratio, coverage scan, source hash),
content (six science diagrams — Higgsfield credits needed; museums pass 4).

Closed 2026-11-08 on the operator's decision: #635, #637, #638 (did not reproduce at HEAD).

## Left over from 0.9.7

- **Audio-tour hooks.** Four things the narration names have no `data-audio-stage` hook to show:
  the mission panel's explore button (guide-missions 89 s), Queqiao itself (queqiao-magpie
  23–44 s), the home "?" chips (guide-home 110 s) and Tianhe's docking ports (guide-tiangong 79 s).
  Needs a decision per item or a new hook.
- **Collectible card loads on demand only on `MissionPanel` and `FleetEntryPanel`**
  (`src/lib/cards/lazy-card.ts`). `PlanetPanel`, `SatellitePanel`, `SmallBodyPanel`,
  `EarthObjectPanel` and `SurfaceScene` still import `card-spec` and `CardOverlay` statically
  (about 13 KB br in total on any route that loads them); move them to `loadCardModules()` the same way.
- **CodeQL.** `.github/codeql/codeql-config.yml` excludes `js/file-access-to-http` and
  `js/http-to-file-access` for the whole repository, not for `scripts/` only (the comment says the
  flows are data pipelines; the rule would also be silent for a real leak in `src/` or the
  services). Either scope the exclusion to the pipeline paths or record why repo-wide is safe. Open
  alerts on main: 168 on 2026-11-08 (175 minus the 7 dismissed); the config and the 52 code fixes
  are on this branch, so the count drops only after the merge and the next scan of main. Check the
  list after the merge and after each release (a PR over 300 files gets no PR-only diff).
- **Gallery credits.** `scripts/validate-gallery-credits.ts` allows 311 placeholder credits
  (ceiling 311; was 411 on 2026-11-01), the NASA search-page and "Uncurated / Curated panel
  image" rows. The 2026-11-08 release review reports 20 of them with no identified file at all and
  100 credits whose author is only an agency name; those two counts were not re-derived in this
  pass. Lower the ceiling as they are sourced (`scripts/credit-placeholders-find.mjs`).
- **Fleet galleries.** Provenance hygiene for the 1x1 crops and the webp files (a crop gets its
  source only when re-cropping the matched image reproduces it) is open from the release review;
  not re-measured in this pass.
- **`#641`** (rover traverses) is still open on GitHub although its work is in 0.9.7; close it with
  the merge.
- Left as they are: Apollo 15 / 16 panorama frames' pale sky above the horizon (photo content);
  Curiosity's ground under the rover deck (no imagery). Luna 9 keeps its regional image only (no
  map-projected LRO close-up; landing spot unconfirmed).

**Waiting on the operator:** #550 picture choices (in the 0.9.8 plan; per-image approval, removes
slots); widening the axe
gate beyond the overview tab and serious/critical (`tests/e2e/a11y.spec.ts` gates 0 critical or
serious); Hebrew (pilot only, `18dc87c2bff`; `he` not in `scripts/i18n-tools/native-terms.json`,
`RTL_LOCALES` is `['ar']` in `src/lib/locale.ts:77`); mobile store publishing (#442); v1.0.

Decided, not open: Earth has no 2D view (`ecbbf98f183`); no sky view on Venus (operator,
2026-11-04).

## Everything else open, by area

### Translations — tooling and smaller items

- `NAME_POLICY` / `BASE_RULES` / `LOCALE_RULES` are hand-written copies, not generated from the
  style guide.
- Not built: length-ratio check in `problems()` (`scripts/lib/translate-quality.mjs`), a
  coverage-scan gate in validate-data (`scripts/i18n-coverage-scan.mjs` is not called from
  `validate-data.ts` or CI), an English-hash-per-string gate, a two-model pilot.
- TS label maps only partly translated.
- Image captions per locale (#257); Curator tour audio (#156, #152).
- Source-language links: `link-provenance.json` has ru 60, zh 21, hi 2 (checked 2026-11-08);
  `overlay_locale` notes and translation-reviewer ids unset.
- UI label variants per locale (8 hi … 31 ru) kept as an allowed baseline (`ui-label-audit.mjs`).

### Content and accuracy

- Science: the six 2026-09 articles still use interim SVG diagrams (no commit touched the six
  webps after `3ae23d6ff73`, 2026-09-01; Higgsfield restyle not done; prompts in
  `2026-09-01-higgsfield-diagram-prompts.md`). Their `ORPHAN_ALLOWLIST` entries
  (`src/lib/science-orphan-detector.test.ts`, the six `BROWSE` rows, about lines 175–199) may be
  stale: five of the six ids are now named as `citationKey` in `src/lib/physics/registry/*.ts`
  (`skip-entry` is not); whether the detector counts that as an inbound link was not tested.
- Essays: two essays from the long-view roadmap not written ("Power in the dark", the capstone
  "The whole journey so far"; no text with those titles in `static/data` or `i18n-src/en-US`). All
  13 shipped essays were fact-checked on 2026-07-14 (`factcheck/review-essays-1..5.md`) and their
  findings re-verified on 2026-11-08.
- Site stories: 57 of the 58 Moon, Mars and Venus sites in `moon-sites.json` / `mars-sites.json` /
  `venus-sites.json` have a story in `static/data/site-stories/`; the one without is `change7`
  (Chang'e 7, planned, no landing yet). The 42 fleet launch sites have none; the loader hides the
  STORY tab for them (`src/lib/data/site-stories.ts`).
- Museums: geography pass 4 never ran — 38 live museums (`static/data/museums.json`: 22 US, 2 JP,
  2 GB, 2 CN, 1 each in UA, RU, RO, NL, KZ, FR, DK, DE, BG, AU; 0 India) against 79 researched in
  19 countries (36 US, 12 RU, 5 JP, 5 CN, 1 IN, …; `2026-10-22-museum-research/merged.json`; no
  `raw/out4_*.json`). Russia is 1 live of 12 researched. Each added museum needs 13 overlays.
- Lab: 3D re-entry corridor (2D shipped first, deliberate); four lesson items unverified
  (reach-orbit result cells, per-goal capstones, two diagrams); not re-checked in this pass.
- Issues, all open on 2026-11-08: #368, #313, #130, #486, #414.
- Library and credits backlog (the old list: `git show d11a0df6db6:docs/wip/learn-link-backlog.md`,
  21 items, none fully shipped): CODEOWNERS (no file in the repo) and a PR-template provenance box
  (`.github/PULL_REQUEST_TEMPLATE.md` has none), a `link-provenance` drift-check script, search and
  `?source=` deep links on `/library` and `/credits`, JSON-LD `sameAs` (none in `src`), a "report a
  broken link" button, `/library` virtualisation if render time passes ~250 ms (RFC-015 points
  here for this); `text-sources.json` has 19 entries (the "against ~100 entities" comparison was not
  re-derived); the weekly link check (`.github/workflows/link-check.yml`) reports but files nothing
  and commits no report.

### /fly (detail: `git show d11a0df6db6:docs/wip/2026-11-03-0.9.5-fly-handover.md`)

Carried from the 2026-11-05 list; not re-verified in this pass.

- Earth capsules: Apollo 8 lunar-return entry, Gemini 7/12 peaks (parked on #522); Skylab 2–4,
  Gemini 3, Soyuz 11, Shenzhou 1 have no usable sourced values.
- No orbit-insertion plume in the cislunar frame (LRO, Chandrayaan-1, Clementine); Clementine TCM
  days unsourced.
- Event timing: the 86 flyby and 137 TCM events not all checked against mission records.
- Smaller profile limits: SLIM hover; hours of approach for Hayabusa / OSIRIS-REx / NEAR / Philae;
  Beresheet, Mars 3, Tianwen-1, Galileo probe mass, Venera 13 / Vega entry values, Luna 17/21
  durations.
- Paths: resonant and ion cruises keep the coasting estimate; ecliptic only; Dawn, Voyager 2,
  Juno, DART, Hayabusa heliocentric waypoints not fixable by the generator; MMX returns on the 2×
  transit ellipse; no photo card for Psyche and the Trojans.
- EDL model accuracy and flyby beats not checked in a browser; the "launch looks horizontal"
  camera is for a final look with the operator (`408828ab675`).
- Decided not to do: Vega balloons, Starship Mars events, return flights.

### Surfaces

- #291 (higher-resolution tier-2 patches), #289 (panorama wedge, partly), #49 (ISS GLB); all open.
- Artemis 4 has no site-anatomy drawing (37 of 38 sites have one, 0.9.7).

### Mobile and devices

- AR: Android WebXR pass not done; `APP_STORE_URL` is `null` (`EnterArButton.svelte:40`; #217 is
  closed, so the URL is a decision for the store listing, #442).
- #490 (AR retest), #442 (store publishing), #621 (CocoaPods → SPM; `ios/App/Podfile` still
  there); App Store privacy answers not applied; iOS build and the iCloud flag untested on a
  device. #216 and #195 are closed (2026-08-05) and no longer open questions.
- Crash reporting: a forced native crash, dSYM upload and the Play mapping upload need a device;
  the old runbook (`git show d11a0df6db6:docs/wip/2026-07-23-mobile-crash-observability.md`)
  drifted from the code (`platform` tag, Sentry 10.69.0) — fix the doc when the device steps are
  done.

### a11y

- #375 (TV / D-pad); no `lang` spans on proper nouns; screen-reader narration (`role="log"`) on
  `/fly` (neither found in `src`); dimensions 2, 9, 10, 14, 15, 17 of the 2026-05-15 audit not
  re-verified. The 0.9.7 site tags are an `aria-hidden` HTML layer (`SurfaceScene.svelte:457`);
  not checked with a screen reader.

### Performance

- `/lab` is the largest route: 725 KB br of 795 KB (`scripts/check-route-budget.mjs --report`,
  on the build output of 2026-11-08 17:40, which is older than HEAD; whether later commits moved /lab was not checked).
  The earlier list gave "/lab chunk 2.35 MB" without naming the chunk. The largest raw chunk in
  that build is the shared `auth` chunk, 2,411,663 bytes raw / 622 KB br. Measured on a build
  with source maps; the numbers move with the next build.

### Infra, tooling, tests

- No deploy rollback (`build.prev` nowhere); observability outage drill not run; launch-data retry
  unproven on a real LL2 5xx; lab-api DCR consent page (#597); git-history PNG purge (needs the
  operator's approval); launch webcasts, image-source adapters' leftovers, LROC TODOs.
- Tests that hard-code counts (all still there): `tests/e2e/missions.spec.ts:59,70,76,96,103`
  (MARS 20, MOON 32, JUPITER 5 cards), `launches-timeline.spec.ts:48` (7 decade pills; becomes 8
  when 2027–36 opens), `landing.spec.ts:28,66` (22 cards, 9 footer links). Non-unique `{#each}` keys, latent only:
  `src/routes/library/episodes/+page.svelte:185` (`src.label`; `audio/episode-sources.json` has no
  episodes today, so it never renders) and `src/lib/components/LaunchTelemetry.svelte:174`
  (`st.name`; no duplicate stage names in `static/data/launch-profiles` today).
- Umami: analytics opt-out and historical cleanup are operator actions (`docs/ops/umami-setup.md`);
  `behavioral-analytics-log.md` has had no weekly entry since 2026-08-31.

### v1.0

- No 1.0.0 version, tag or Release until the operator has tested; device checklist (#490);
  analytics opt-out. Product tracks: #489, #156, #152, #257, #46, #417, #411, #522 (all open on
  2026-11-08).

## What else stays in `docs/wip/`

Only open work and the material it needs:

- `factcheck/` — the 2026-07-14 fact-check findings (54 detail files) and their 2026-11-08
  re-verification (`2026-11-08-reverify.json`); 242 rows are recorded as unchanged by reason (see
  `INDEX.md`).
- `2026-10-22-museum-research/` — the research for museum pass 4 (open).
- `2026-09-01-higgsfield-diagram-prompts.md` — prompts for the open diagram restyle.
- `a11y-gap-2026-05-15.md` — the a11y backlog; its status line says what is still open.
- `2026-07-21-latent-bug-class-sweep.md` — the watch list AGENTS.md links to (WATCH items open).
- `behavioral-analytics-log.md` — the analytics review log (no entry since 2026-08-31).
- `essay-diagram-sources/` — sketch sources the diagram scripts write into.
- `2026-07-16-launch-mockups/` — locked reference frames for the launch view (images, kept).

Moved out 2026-11-05: `docs/ops/prod-validator.md`, `docs/ops/umami-setup.md` (runbooks);
`docs/reference/pwa-shipping-guide.md`, `docs/reference/sensory-cue-vocabulary.md` (references).
Deleted 2026-11-05 (finished; read with `git show 5cf9491e398:docs/wip/<name>`):
`2026-10-31-garble-pass.md`, `2026-10-31-space-terms-glossary-pilot.md`.
