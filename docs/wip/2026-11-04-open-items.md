# Open items after 0.9.6 — the one list, and the 0.9.7 plan

Rewritten 2026-11-05, after 0.9.6 shipped (PR #640, prod `e2d8acc17c1`, tag `v0.9.6`). It keeps only
what is open now. The 0.9.6 plan and its step-by-step record (glossary chunks, the translation
samples, step 4) are done; read them with `git show 73aaccec30c:docs/wip/2026-11-04-open-items.md`.
Older notes that were folded into this list: `git show d11a0df6db6:docs/wip/<name>`. What else
stays in `docs/wip/` is listed at the end.

Rules that still hold: no paid LLM or translation runs (the Hebrew run is the one exception the
operator allowed); every translation fix round ends with a measurement; a new error class is the
stop rule; never list native-speaker review as a gap; work inline by hand, fewest tokens, and evolve
the tooling every round.

## 0.9.7 — tentative plan

Branch `tech-debt/0.9.7`. Order proposed 2026-11-05; the operator picks what goes in.

**1. Rover traverses — done (#641, 2026-11-05).** Spirit / Opportunity on the science team's
localized paths, Zhurong traced on HiRISE, every Mars rover with sols, photos, Journey tab, replay and
elevation; then a zoom review of every landing site on Mars (16), Venus (3), the Moon (19) and Earth
(42) with `scripts/hotspots/zoom-sweep.mjs`, fixing each defect found (TA.md § Scene 6, "Zoom bands").
Luna 9 keeps its regional image only: no map-projected LRO close-up exists and its landing spot is
unconfirmed (option B, operator 2026-11-05).

**Next, in the operator's order (2026-11-05):**

- **1b. Panorama review — done (2026-11-05/06).** Better sources for Opportunity, Apollo 12 / 14 / 15 /
  17, Sriharikota SLP, Baikonur 1/5; Luna 16 / 24 and Beresheet lost their "Stand here" (no ground
  view). Mosaic gaps are now filled from the image (`panorama-padder` `inpaintGaps`) on Curiosity,
  Opportunity, Perseverance, Spirit, Viking 1 / 2, InSight; CNSA logos, a watermark and a caption strip
  removed from the Chang'e 3 / 5 / 6 pans (`maskRects`). Left as they are: Apollo 15 / 16 frames' pale
  sky above the horizon (photo content); Curiosity's ground under the rover deck has no imagery.
- **Left from the zoom review:** Artemis 4 (89.5°S, planned) has no imagery and the globe texture
  pinches into radial streaks at the pole at every close zoom — needs a polar image (LRO WAC / NAC
  polar mosaic, south-polar stereographic) as its context or regional layer. Chandrayaan-3 (69°S)
  looks stretched north–south at 100 km; the context crop's geometry checks out (4096×1443 for a
  13.2° × 37.5° box), so it may be the terrain — not confirmed either way.
  **Artemis 4 done 2026-11-08:** a 400 km polar-stereographic WAC square centred on the pole
  (`polar_half_km`), real terrain at every zoom, no pinch. From ~1 Mm altitude it reads as a dark
  square on the bright globe: the pole really is mostly in shadow, the globe texture is not.
  **Chandrayaan-3 settled 2026-11-08: not stretched.** The WAC source and the shipped context
  master warped onto the same site-centred stereographic grid put every crater in the same place
  and shape. What reads as a stretch at the 87 km zoom is the long low-sun shadows plus a real
  defect of the colour transfer: zero (shadowed) pixels take the globe's flat colour, so shadows
  become flat grey blobs with dark outlines and the lit ground washes out. Fix, done: Moon crops
  past `HIGH_LAT` = 60° get the grey, brightness-capped treatment the polar crop uses (`polarGrey`
  in fetch-context-layer.ts). Only Chandrayaan-3 (69°S) is past it, and it was re-fetched
  (`5e52c98eb03`); Chang'e 6 (~41°S) does not need it.
- **1c. Markers and pins — done (2026-11-06).** Screen-space site tags (`site-tags.ts`): icons by zoom
  stage from the first view (bare), cards later, focus near the view centre, grouping, the nation
  legend with the first icons; every route opens over its sites (TA.md § Scene 6, "Zoom bands").
- **1d. Landing story — done** (operator 2026-11-06). The STORY tab opens with the anatomy drawings of
  what is on the surface (`site-anatomy.ts`; 37 of 38 sites; Artemis 4 has none). Every landing site
  has a landing-sequence sheet and landers and rovers have exploded cutaways (`d72ccdb8da1`; 4K
  masters in `4d4723f5733`; listed as `landing_art` / `exploded_art` in
  `static/data/original-work.json`).
- **Mission-gallery provenance that names another picture — done** (found 2026-11-06): `venera-13/01`
  and `vega-1/01` now credit the stamp files they are (`4fa4b24a3d0`); `mars2/01` and `mars2/04` were
  replaced with a PrOP-M render and a museum model of the Mars 3 descent module, and `mars6/03` (a
  sunset Mars 6 never sent) was dropped (`421c139995d`). The last three misattributed images were
  traced in `fcaa95bddb1`, and `scripts/gallery-credit-shape-check.mjs` checks every credited
  Commons file against its image's shape.
- **Audio tours: re-listen to every episode and adjust its cue points** (operator 2026-11-06). The
  0.9.7 changes moved what is on screen under the narration (first view bare, tags by zoom stage,
  new panoramas, Apollo 17's tour removed from the Cernan episode); tour-coverage only proves the
  targets exist, not that they land on the right words.
  **Done 2026-11-08** with `scripts/audio/stage-review.ts` (screen after each stage + the VTT words
  around it), all 32 episodes. Fixed: /moon and /mars openings zoom to the markers the narration
  names; three drag/zoom stages targeted the HUD (no listener) and never moved the camera; flashes
  scroll off-screen targets into view and the /fleet roll-call glow was clipped by
  content-visibility; /fly's DEMO overlay is dismissed; the Voyager 2 panel closes; /plan switches
  to Jupiter and Mercury; jwst-l2-halo, voyager-grand-tour, saturn-v-anchor, signal-delay,
  tianhe-core, zarya-first-module and guide-missions re-timed (their audio was re-rendered after
  authoring, 3–13 s). Left, each needing a decision or a new hook:
  - guide-missions 38–46 s says "Filter status equals failed… Mars 2, Schiaparelli, Beresheet…".
    Done (`98b5355afc5`): `outcome: "failure"` in the mission index and a FAILED pill on /missions.
  - The mission panel's explore button (guide-missions 89 s), Queqiao itself (queqiao-magpie
    23–44 s), the home "?" chips (guide-home 110 s) and Tianhe's docking ports (guide-tiangong 79 s)
    are named but have no `data-audio-stage` hook to show.

**2. The deploy gaps 0.9.6 hit** (small; they stop the same failures):

- The route budget runs without the prod build env locally and in preflight, so `/fleet` passed at
  ~99 KB locally and failed the prod deploy at 105.45 KB (Sentry debug ids add ~6 KB across
  /fleet's chunks). Measure the budget with the prod env (preflight, or a CI job before deploy).
- Headroom: `/fleet` 101.9 / 105 KB, `/missions` 128.5 / 130 KB (prod env). Click-only code still
  loads up front: `CollectibleCard` + `card-spec` 12.7 KB on /fleet.
- Keep the per-route chunk report (which sources fill a route's JS, brotli KB) as a repo tool —
  it lived in the session scratchpad as `.route-chunks.mjs`.
  **Done 2026-11-08 (first three):** preflight and CI's `ci` build now set SENTRY_SOURCEMAPS=1, so
  the budget measures prod's bytes — it immediately caught /missions at 133 / 130 KB. The
  collectible card now loads on demand (`src/lib/cards/lazy-card.ts`): /missions 133 → 112 KB,
  /fleet 104 → 89 KB (lazy budgets 35 / 45 for the moved bytes). Chunk report:
  `node scripts/check-route-budget.mjs --chunks /fleet`.
- `deploy-verify` cannot prove MCP tracing without a client: `mcp.orrerylearn.com` needs an OAuth
  bearer and there is no probe credential. Decide on a probe path (an internal token, or a trace on
  `/health`).
- CodeQL on a PR touching more than 300 files reports "Cannot retrieve the full diff": its PR-only
  filter may miss alerts in big release PRs. Check the open alert list on main after each release.
  **Triaged 2026-11-08 (175 open on main):** `.github/codeql/codeql-config.yml` drops the archive,
  the frozen i18n map records and the HTML prototypes (78) and the fetch/upload-by-design rules
  `js/file-access-to-http` / `js/http-to-file-access` (39); 52 fixed in code; 7 dismissed on
  GitHub with reasons (MCP empty-token guard, dedicated worker, operator-typed CLI regex, three
  test inputs, the atomic lock dir). The rest are expected to close when the next scan of main runs the config; not verified yet.
  MCP trace probe: deploy-verify sends a traceparent to `/mcp` (401) and finds that trace
  (homelab 97662e7).

**3. One content track** — chosen: re-verify the fact-check findings (`factcheck/`, 55 files),
since they are about the correctness of what is live. Alternatives are in "Content and accuracy"
below.
**Done 2026-11-08:**

- 793 findings re-checked against the live text, then the remaining errors fixed in all 14
  locales. Results are in `factcheck/2026-11-08-reverify.json`, the summary at the top of
  `factcheck/INDEX.md`.
- English fleet cards showed 101 stale taglines: `fleet/index.json` had drifted from the overlays.
  validate-data now checks that the index's name and tagline equal the en-US overlay.

**Waiting on the operator:** #550 gallery sourcing (later; per-image approval, removes slots);
#635 / #637 / #638 do not reproduce at HEAD (dev server, 0 page errors on `/fly`, `/moon`, both
line-ups in en and de) — close them or keep them open; widening the axe gate beyond the overview tab
and serious/critical; Hebrew (pilot only, `18dc87c2bff`; `he` not in `native-terms.json`,
`RTL_LOCALES` is `['ar']`); mobile store publishing; v1.0.

Decided, not open: Earth has no 2D view (`ecbbf98f183`); no sky view on Venus (operator,
2026-11-04).

## Everything else open, by area

### Translations — tooling and smaller items

- `NAME_POLICY` / `BASE_RULES` / `LOCALE_RULES` are hand-written copies, not generated from the
  style guide.
- Not built: length-ratio check in `problems()`, a coverage-scan gate in validate-data, an
  English-hash-per-string gate, a two-model pilot.
- TS label maps only partly translated.
- Image captions per locale (#257); Curator tour audio (#156, #152).
- Source-language links: `link-provenance.json` has ru 60, zh 21, hi 2; `overlay_locale` notes and
  translation-reviewer ids unset.
- UI label variants per locale (8 hi … 31 ru) kept as an allowed baseline (`ui-label-audit.mjs`).

### Content and accuracy

- Science: the six 2026-09 articles still use interim SVG diagrams (Higgsfield restyle not done;
  prompts in `2026-09-01-higgsfield-diagram-prompts.md`); their `ORPHAN_ALLOWLIST` entries
  (`src/lib/science-orphan-detector.test.ts:176-198`) may be stale.
- Essays: no fact-check; two essays from the long-view roadmap not written ("Power in the dark",
  the capstone "The whole journey so far").
- 23 site stories not written.
- Museums: geography pass 4 never ran — 38 live museums (22 US, 0 India) against 79 researched
  (`2026-10-22-museum-research/`); each added museum needs 13 overlays.
- Lab: 3D re-entry corridor (2D shipped first, deliberate); four lesson items unverified
  (reach-orbit result cells, per-goal capstones, two diagrams).
- Issues: #368, #313, #130, #486, #414.
- Library and credits backlog: CODEOWNERS and a PR-template provenance box, drift-check scripts,
  search and `?source=` deep links on `/library` and `/credits`, JSON-LD `sameAs`, a "report a
  broken link" button; `text-sources.json` has 19 ids against ~100 entities; the weekly link check
  reports but files nothing.
- Learn-more links: about 20 backlog items (none closed).

### /fly (detail: `git show d11a0df6db6:docs/wip/2026-11-03-0.9.5-fly-handover.md`)

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

- #291 (higher-resolution tier-2 patches), #289 (panorama wedge, partly), #49 (ISS GLB).

### Mobile and devices

- AR: Android WebXR pass not done; `APP_STORE_URL` is `null` (`EnterArButton.svelte:40`, #217);
  #216, #195 undecided.
- #490 (AR retest), #442 (store publishing), #621 (CocoaPods → SPM; `ios/App/Podfile` still
  there); App Store privacy answers not applied; iOS build and the iCloud flag untested on a
  device.
- Crash reporting: a forced native crash, dSYM upload and the Play mapping upload need a device;
  the old runbook (`git show d11a0df6db6:docs/wip/2026-07-23-mobile-crash-observability.md`) drifted from the code (`platform` tag, Sentry 10.69.0)
  — fix the doc when the device steps are done.

### a11y

- #375 (TV / D-pad); no `lang` spans on proper nouns; screen-reader narration (`role="log"`) on
  `/fly`; dimensions 2, 9, 10, 14, 15, 17 of the 2026-05-15 audit not re-verified.

### Performance

- `/lab` chunk 2.35 MB.

### Infra, tooling, tests

- No deploy rollback (`build.prev` nowhere); observability outage drill not run; launch-data retry
  unproven on a real LL2 5xx; lab-api DCR consent page (#597); git-history PNG purge (needs the
  operator's approval); launch webcasts, image-source adapters' leftovers, LROC TODOs.
- Tests that hard-code counts: `missions.spec.ts:59,70,96`, `launches-timeline.spec.ts:48`,
  `landing.spec.ts:28`; non-unique `{#each}` keys in `library/episodes/+page.svelte:185` and
  `LaunchTelemetry.svelte:174`.
- Umami: analytics opt-out and historical cleanup are operator actions (`docs/ops/umami-setup.md`);
  `behavioral-analytics-log.md` has had no weekly entry since 2026-08-31.

### v1.0

- No 1.0.0 version, tag or Release until the operator has tested; device checklist (#490);
  analytics opt-out. Product tracks: #489, #156, #152, #257, #46, #417, #411, #522.

## What else stays in `docs/wip/`

Only open work and the material it needs:

- `factcheck/` — the fact-check findings (open, see above).
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
