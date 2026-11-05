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

**1. Rover traverses — Opportunity, Spirit, Zhurong** (operator, 2026-11-04). Start in a fresh
session: the WebSearch budget was raised to 400 in `/work/orrery/main/.claude/settings.local.json`
and only applies to a new session. Operator's order of methods:

1. find the team-localized paths by web search (MER: the localized traverses behind the Analyst's
   Notebook; Zhurong: the published per-sol localization);
2. else the PDS drive logs pinned to landmarks located on HiRISE, credited as our reconstruction;
3. last resort, fix only the clear errors.

Found so far (2026-11-04):

- NASA MMGIS has MSL/M2020 traverse JSON only; the MER paths there answer 403.
- PDS `pds-geosciences.wustl.edu/mer/mer{1,2}-m-eng-6-rmc-ops-v1/mer?rm_0xxx/data/` holds
  `mer?_master.svf` (site offsets, x north / y east metres, chained from the landing site) and
  per-site `.rvf` drive positions. Every solution is `telemetry` (onboard odometry, uncorrected):
  Opportunity's chain is ~2.3 km off Victoria and ends ~2.9 km inside Endeavour.
- The V1 stubs are wrong too: Opportunity ends near Endeavour's centre (354.77°E), the Marathon
  Valley stop sits inside the crater, Victoria is at 5.41°W against 5.50°W.
- Write the converter as a kept tool with a README row (the MSL/M2020 MMGIS converter used for
  0.9.5 was never committed). Then re-cut the route HiRISE patches along the new paths
  (`fetch-mars-traverse.ts`), alt text in 14 locales, credits, and drop the "V1 stub" caveat.

**2. The deploy gaps 0.9.6 hit** (small; they stop the same failures):

- The route budget runs without the prod build env locally and in preflight, so `/fleet` passed at
  ~99 KB locally and failed the prod deploy at 105.45 KB (Sentry debug ids add ~6 KB across
  /fleet's chunks). Measure the budget with the prod env (preflight, or a CI job before deploy).
- Headroom: `/fleet` 101.9 / 105 KB, `/missions` 128.5 / 130 KB (prod env). Click-only code still
  loads up front: `CollectibleCard` + `card-spec` 12.7 KB on /fleet.
- Keep the per-route chunk report (which sources fill a route's JS, brotli KB) as a repo tool —
  it lived in the session scratchpad as `.route-chunks.mjs`.
- `deploy-verify` cannot prove MCP tracing without a client: `mcp.orrerylearn.com` needs an OAuth
  bearer and there is no probe credential. Decide on a probe path (an internal token, or a trace on
  `/health`).
- CodeQL on a PR touching more than 300 files reports "Cannot retrieve the full diff": its PR-only
  filter may miss alerts in big release PRs. Check the open alert list on main after each release.

**3. One content track** — proposed: re-verify the fact-check findings (`factcheck/`, 55 files,
~250 findings), since they are about the correctness of what is live. Alternatives are in "Content
and accuracy" below.

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
- Fact-check findings in `factcheck/` (55 files, ~250 findings) not re-verified one by one.
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
- Umami: analytics opt-out and historical cleanup are operator actions (`umami-setup.md`);
  `behavioral-analytics-log.md` has had no weekly entry since 2026-08-31.

### v1.0

- No 1.0.0 version, tag or Release until the operator has tested; device checklist (#490);
  analytics opt-out. Product tracks: #489, #156, #152, #257, #46, #417, #411, #522.

## What else stays in `docs/wip/`

Working material and references, not open-item lists:

- `essay-diagram-sources/` — sketch sources for the science and essay diagrams (scripts write here).
- `factcheck/` — the fact-check findings (open, see above).
- `2026-10-22-museum-research/` — the research for museum pass 4.
- `2026-07-16-launch-mockups/` — locked reference frames for the launch view.
- `2026-09-01-higgsfield-diagram-prompts.md` — prompts for the open diagram restyle.
- `a11y-gap-2026-05-15.md` — the 18-dimension a11y audit the a11y items above come from.
- `2026-10-31-space-terms-glossary-pilot.md`, `2026-10-31-garble-pass.md` — the glossary and
  garble-pass methods the translation steps reuse (linked from skills and guides).
- `2026-07-21-latent-bug-class-sweep.md` — watch-list.
- `sensory-cue-vocabulary.md`, `pwa-shipping-guide.md`, `umami-setup.md`,
  `2026-07-22-prod-validator.md` — references and runbooks.
- `behavioral-analytics-log.md` — the analytics review log.
