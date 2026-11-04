# Open items after 0.9.5 — the one list

Written 2026-11-04, when 0.9.5 went to PR #639. Built from an audit of every note in `docs/wip/`
against the code and git history (each claim below was checked there; "not verified" says so).
This note replaces the inventories, handovers and plans that used to live here; a note that was
deleted can be read with `git show d11a0df6db6:docs/wip/<name>` (the last commit that had all of
them). What stays in `docs/wip/` beside this note is listed at the end.

Rules that still hold: no paid LLM or translation runs (the Hebrew run is the one exception the
operator allowed); every translation fix round ends with a measurement; a new error class is the
stop rule; never list native-speaker review as a gap.

## 0.9.6 — proposed, translation first

The operator wants 0.9.6 to lead with translation gaps and the known issues in some sections.
Measured 2026-11-04 with the repo's own free tools (`scripts/i18n-coverage-scan.mjs`,
`i18n-detect.mjs`, `term-drift.mjs --gate`, `ui-label-audit.mjs`, `hardcoded-english.mjs`,
`term-census.mjs`): structure is complete — every locale has all 1,149 overlay files, 13,282 string
leaves and 3,620 message keys, 0 missing or empty; detector defects 0.0%; term drift 0 misses. What
the tools cannot measure is quality; the 4.3% BROKEN figure (2026-10-19, 741-string sample,
`6f30def577c`) came from in-session graders and needs graders again to re-measure.

**Step 1 — user-visible gaps the tools found (small, mechanical):**

- ~~6 surface sites show English annotation labels~~ — not a gap (checked 2026-11-04): the six
  launch pads have no annotations at all (`hotspot_annotations: []` in en-US and in
  `surface-hotspots.json`). `i18n-coverage-scan.mjs` counted the empty en-US list as missing;
  it now counts a missing list only when the English one holds text (missingKey 6 → 0 per locale).
- ~~Native names missing~~ — done 2026-11-04 (`c0c5e3c9ce5`): ru 52, zh-CN 22, hi 14, ja 13,
  ar 1 → 0 in every locale; `convert-native.mjs` fixed (it could not run) and taught three
  rules (`scripts/lib/native-skip.mjs`).
- ~~Same-as-English fields~~ — done 2026-11-04: of 64–130 per locale, all but a few are names the
  origin rule keeps. New `same-as-english-triage.mjs` separates them; 45 /colophon titles synced
  to their locale's /fleet name (`original-work-fleet-names.mjs --sync-english`), 2 fleet names
  fixed (it Spirit, ja Spektr-RG), Pale Blue Dot in es and sr-Cyrl. Triage: `translate: 0` in
  every locale.
- ~~Latin+Cyrillic hyphen hybrids~~ — read 2026-11-04: what is left is correct usage (decades
  `1970-их`, classes `C-типа`, acronym compounds `HD-кадры`, and Serbian declension of a Latin
  name, `Thor-а`, as the Pravopis prescribes). Fixed: ru `ЛМ`/`КСМ` → `LM`/`CSM` (9 + 1, the
  origin rule and the form used 54/71 times), `UV-камера` → `УФ-камера`.
- ~~Unit symbols~~ — done 2026-11-04 (operator's rules): sr-Cyrl SI symbols in Latin (38 fields,
  км → km, км/с → km/s); zh-CN a number takes km / km/s / km/h, prose 公里, 千米 → 公里 (299
  fields). `scripts/i18n-tools/unit-symbols.mjs`; re-run finds 0.
- ~~nl: 2 `englishProse` strings~~ — done 2026-11-04: two English inscriptions quoted in Dutch
  text (the LC-34 plaque, Duke's family photo) translated, as de/fr/es already had them;
  `i18n-detect.mjs` nl 0.

**Step 2 — read and fix the trees nobody has read in full.** How (operator, 2026-11-04): inline in
the main session, by hand, spending as few tokens as possible — no subagent fan-outs unless the
operator asks. One small cell per round; each round ends with a measurement, and what it taught
becomes a tool or a check before the next round:

1. **Science articles in 10 locales** (de, nl, es, it, pt-BR, ja, ko, hi, ar, sr-Cyrl), about
   14,330 fields. Full reads of ru, zh-CN and fr found 19%, 12% and 16% BROKEN — two to three
   times what samples showed. Start with **pt-BR**: 7 of 8 sampled science strings MINOR or
   BROKEN, and it is the only large locale with no science garble pass.
2. **Essays and programs, all locales.** Never read in full; spot checks: essays 1 BROKEN + 14
   MINOR of 104, programs 1 BROKEN + 28 MINOR of 104. Programs was never sampled for quality.
3. **Plain register in ja / ko** (である / 한다) — decided, not done: ja 710 + ko 948 fields in
   science, missions, fleet. Needs the `register-scan.mjs` tool first (it does not exist).
4. **The ~580 `name` / title fields**, read one by one; the ~35 science and 14 essay MINOR
   strings left from the spot checks.
5. **Guard:** a staleness lint — fail when the en-US overlay changed and a locale overlay did not.

**Step 3 — glossary:** 162 of 192 census terms not yet in the glossary (`term-census.mjs`); term
links from article text to `/science/glossary`.

**Step 4 — known issues in sections (user-visible):**

- **Nav overflows at tablet width (found 2026-11-04):** at 760 px the nav's right-hand button
  group (`div.right`, `Nav.svelte`) runs past the viewport — page scrollWidth 889–981 px on
  `/essays`, `/fleet`, en and ar alike; fine at 375 px. Measured with a Playwright scrollWidth check.
- **Mobile at 375 px — re-check, no evidence either way:** toggle-set parity on earth/moon/mars/
  venus; the 2D/3D toggle shows its target state; breadcrumb compaction and the right-edge label
  clamp; `/fly` "Eart" truncation; `/explore` zoom-out label overflow.
- **a11y, confirmed in code:** no skip link; no `<h1>` on `/missions`, `/fleet`, `/plan`,
  `/explore`, `/fly`; `--color-text-dim` at 0.35 alpha (`tokens.css:21`); `Panel.svelte:142`
  fly transition without a reduced-motion guard; no `aria-valuetext` on the `/fly` scrubber;
  KaTeX `output: 'html'` (no MathML); 59 `alt=""`; static canvas labels; no live region for layer
  or locale changes. axe gates only the overview tab and only serious/critical.
- **Fleet:** #635, #637, #638 (dev-environment errors; keys exist at HEAD — reproduce in a browser
  before calling them fixed).
- **Credits:** no CelesTrak credit on `/iss` and `/tiangong`; MCP SDK missing from
  `data-sources.json`; 380 placeholder gallery credits (ceiling, `validate-gallery-credits.ts`);
  `fleet-galleries/galileo/01` without a source; #550 (Chang'e 6, Voskhod 11A57 galleries).
- **Traverses:** Opportunity, Spirit and Zhurong are still hand-drawn (#362, partly fixed).
- **PWA:** the Cloudflare cache bypass for `/_app/env.js` and `sw.js` is not verified; without it
  stale config can last up to 4 h after a deploy (also #517, #518).

**Not in 0.9.6 unless the operator says so:** Hebrew (pilot only, `18dc87c2bff`; `he` not in
`native-terms.json`, `RTL_LOCALES` is `['ar']`); the /fly items below; mobile store publishing;
v1.0.

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

### a11y (beyond step 4)

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
