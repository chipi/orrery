# Tech-debt arc — open items after v0.9.2

The arc ran from 2026-10-29 to 2026-10-31 on branch `tech-debt/phases` and was released as
0.9.2: squash-merged to main as `d28002f3639` (PR #624), tagged `v0.9.2`, deployed to prod on
2026-11-01 at `a5d740bd2b8` (Deploy to prod VPS run 41298755798, deploy + validate green). The
branch commits are not ancestors of main; look up a branch sha with `git show <sha>`, and check
that its change is on main by content, not with `merge-base`. Start-here for the next session:
[`NEXT_STEPS.md`](NEXT_STEPS.md).

This inventory lists what is still open for the next arc. An item counts as done only when a
commit or the code in the tree shows it. Anything else is "open" or "partly done", with what
remains.

Sources: the arc plan (operator memory note), the phase plans (now in `_archive/`:
`2026-10-30-i18n-phase-plan.md`, `2026-10-30-phase5-bundle-size-plan.md` = "Phase 5 doc",
`2026-10-31-phase6-robustness-plan.md` = "Phase 6 doc"), `2026-10-31-garble-pass.md`,
`2026-10-31-essays-science-spot-check.md`, `2026-10-31-space-terms-glossary-pilot.md`, and the
branch's `git log`.

Not determined from the repo: the "23 missing site stories" count (`static/data/site-stories/`
holds 55 files; no list of missing ones was found), and whether the 14-locale render sweep
(`tests/e2e/i18n-all-routes.spec.ts`) was re-run on this branch (the spec predates the arc; no
commit on the branch touches it).

## Phase 4 — code surgeries, tiny fixes, i18n phase

| Item | Status | What remains | Evidence |
| --- | --- | --- | --- |
| ~240 unused message keys | done | 175 keys removed from all 14 locales; "~240" was a rougher name count (the commit says so). Re-checked 2026-11-01 with the commit's rules (name in src/server/static/tests/scripts, minus translation work files, `scripts/_archive/` and the generated paraglide map; Lab dotted keys; built prefixes): 0 of 3,542 en-US keys unused. Control: the same check flags 171 of the 175 removed keys (2 came back in `639307ca613` with new uses, 2 pass via a broad prefix). The check was a session script. | `daa0cd6ff6d` |
| Unjustified `{@html}` | done on `tech-debt/0.9.3` | Every `{@html}` site carries a reason on its eslint-disable line (22 in `src`). A bare `{@html}` already failed lint (`svelte/no-at-html-tags` is `error` in the recommended config); the gap was a disable with no reason, which passed. `orrery/html-disable-needs-reason` in `eslint.config.js` now fails that, in templates and scripts (probe snippets checked both ways). | `e50eb1da7ca` |
| Hard-coded English: TypeScript label maps | partly done | The scan guard reads `.svelte` markup only; `<script>` code and `.ts` label maps (era names, fleet categories, HUD labels) are "by review", not gated. Whether all of them were translated was not audited. | `scripts/i18n-tools/hardcoded-english.mjs` header; `cea21263071` |
| Hard-coded English: allowlist | partly done | 60-line allowlist in place (developer panels, brand, symbols). Entries not re-audited. | `scripts/i18n-tools/hardcoded-english-allowlist.json` |
| 14-locale render check | open | Phase plan step 3 asks for it as part of the guard. The spec `i18n-all-routes.spec.ts` exists but no commit on the branch runs or changes it; no result is recorded. | `docs/wip/_archive/2026-10-30-i18n-phase-plan.md` step 3 |
| Unit symbols: sr-Cyrl and zh-CN | open | sr-Cyrl writes SI symbols in both scripts (km/s 39 uses, км/с 36) where style guide 1a says Latin; zh-CN writes 公里 where 1a says km. Deferred by the operator on 2026-10-30. | `2026-10-30-i18n-phase-plan.md` last section |
| Per-locale unit forms for AU | partly done | `au` applied in fr, es, it, pt-BR (517 strings). Other locales keep their 1a forms; the style guide's unit table vs. shipped forms (e.g. de "(AU)" vs AE) not re-verified. | `db988ce0771` |
| `i18n-src` en-US key parity | done on `tech-debt/0.9.3` | The six launch-site `hotspot-metadata` files (Baikonur 1/5 and 31/6, Jiuquan SLC-43, Sriharikota SLP, Vandenberg SLC-4E, Wenchang LC-101) now have en-US stubs like the other 31 (`{"hotspot_annotations": []}`; the English stays in `surface-hotspots.json`). `build-i18n-bundles.mjs`: 1,144 keys in every locale, no WARN. | Phase 5 doc, section 3 "Not covered" |
| iOS App Store privacy answers | partly done | Answers committed as `app_privacy_details.json` plus a `fastlane privacy` lane; not uploaded (no Apple ID or ASC key on the workstation). | `b5ec8da4ffd` |

Other Phase 4 items are done; see "Done in this arc".

## Phase 5 — what users get

| Item | Status | What remains | Evidence |
| --- | --- | --- | --- |
| /lab still ships 2.35 MB chunk | partly done | The Lab's own 1,099 messages are compiled with all 14 locales inline. Paraglide 2.21 has no per-locale option for a prerendered site. Decision deferred to the per-locale bundle item. | Phase 5 doc section 1 |
| Offline alt text before first online load | open | A web visitor who goes offline before any page needed alt text has none until one online load. | Phase 5 doc section 2 "Not covered" |
| Route budget: dynamic imports and CSS | open | The budget counts static import closures only; lazy scenes, workers and CSS are not counted. | Phase 5 doc section 4 "Not counted" |
| GlitchTip ORRERY-PROD-20 | done | Fix deployed 2026-11-01 (`FleetEntryPanel.svelte:532` keys rows by `row.key` at `a5d740bd2b8`); issue 694 resolved via the agents' issue token, read back `resolved`. No new orrery / orrery-prod issue seen in the first minutes after the deploy. | `d5260e2076c`, `1037e07190b` |
| GitHub issue #616 | done | Fix on main (`af5db703f75`); the issue is CLOSED (checked 2026-11-01). | Phase 5 doc section 5 |

## Phase 6 — robustness

| Item | Status | What remains | Evidence |
| --- | --- | --- | --- |
| Launch-data retry and log trim | partly done | Deployed 2026-11-01; the deploy log shows the crontab line `17 1-23/6 * * * … refresh-prod-data.sh`. Not yet checked: that a refresh after the deploy ran, retried a 5xx, and the log trim works. | `e4b0b99dcf2`, `32dd6371004`; deploy run 41298755798 |
| lab-api DCR consent page / redirect-host allowlist | open | Not done from #597. MCP tools are pure math today. | Phase 6 doc section 2 "Not done" |
| axe: dynamic routes | open | `/missions?id=`, `/programs/[id]`, `/essays/[slug]`, science sections, cards and panel states opened by interaction are not gated. Minor and moderate findings are logged, not gated. | Phase 6 doc section 4 "Not covered"; `571828d0c91` |
| iOS build and Swift changes | open | Not built locally (no Xcode on Linux); the CI `ios` job builds it. No device test of the iCloud exclusion flag. | Phase 6 doc section 5 "Not verified locally"; `0bcfa889ee2` |
| Observability leftovers | partly done | Sampler set on `tech-debt/0.9.3`: lab-api and mcp use `AlwaysOnSampler`, so a caller's `traceparent` with flag 00 no longer turns off its spans (the default was parent-based; v3 reads no `OTEL_TRACES_SAMPLER`). Umami `search` / `cmdk-search-hit` still carry the first 40 characters of the query: that is ADR-092's design, promised on /privacy (`privacy_collect_search`, 14 locales) and declared in the App Store answers, and the operator decided on 2026-11-01 to keep it as is. Live checks (Umami ingestion, source-map resolution, outage drill on prod) were not run. | Phase 6 doc section 6 "Not changed"; `6d80fc1a28c` |
| /privacy page | open | Says no account or email is ever needed; does not mention the Lab sign-in or that /ask questions go to an LLM. Needs a section in all 14 locales. | Phase 6 doc section 5a "Open" |
| Apply App Store privacy answers | open | `APPLE_ID=… bundle exec fastlane privacy` from `ios/App`, and a check that answers match the manifest. Operator action. | `b5ec8da4ffd`, `a23cde8a326` |
| Glossary: term links from article text | open | PRD-038 section 5; ordered last of the planned work. | `docs/prd/PRD-038.md`, Phase 6 doc section 7 |
| Glossary: visual per term | open | PRD-038 section 5b; Higgsfield pipeline, credits to be sized and approved first. | `588bf97962a` |
| Glossary: next term batch (~130 terms) | open | Plan from `term-census.mjs`; the 20-term pilot is complete and gated. | `2026-10-31-space-terms-glossary-pilot.md` "Next" |
| Lab "plain" internal name | open | Reconsider the rename (`plainKey`, `lab_f_*_plain`, `card__plain`). Code-only. | `e6ba857fc83` |
| "Language spirit" audit | open | Search the site for English- or Latin-only assumptions: sorting (Intl.Collator), search normalization, initial-letter UI, separators and quotes, number/date/unit formats, truncation, RTL icon mirroring, keyboard assumptions. | Phase 6 doc section 7 |
| Separate `/glossary` page idea | open | Low-profile page built from the glossary `term` section, optional reverse index; to be reassessed after the pilot. `/science/glossary` exists. | Phase 6 doc last paragraph |
| Hand read of translated essays and science | partly done | Spot check done (208 items) and the science reads in ru/zh-CN/fr done; the rest is under "Translation quality". | `e522e5f4535` |
| `/fly` probes `data/trajectories/<id>.json` for every mission | done on `tech-debt/0.9.3` | `TRAJECTORY_IDS` in `src/lib/data/interstellar.ts` (the 18 ids `/explore` already listed) is shared by `/explore` and `/fly`; `/fly` fetches only listed ids. `interstellar.test.ts` keeps the list equal to the files and checks each id is a mission. Not yet seen in an e2e run (the 404 count). `MissionPanel.svelte`'s "see on /explore" link now reads the same list (it had kept the first 9 since `54fc84fe795` added 9 paths to /explore). | `src/routes/fly/+page.svelte` ~2197 |
| `data/offline-manifest.json` version is stale | open | The committed mobile offline manifest still says `"version":"0.9.1"` on the 0.9.2 staging and prod deploys (prod checked 2026-11-01); the release bump did not regenerate it. Regenerate it in the release bump (or derive the version at build time) and add a check that it matches `package.json`. | staging `data/offline-manifest.json` after `95c792f2f60` |
| docker-e2e publish skipped on main | done | `cron-gate` (`0569ca8bbf2`) made the implicit `success()` of `publish-platforms` / `publish-manifest` false on every non-schedule run; `sha-d28002f` / `sha-95c792f` were never published and deploy-prod run 41292320853 refused. Fixed in `a5d740bd2b8`. On `tech-debt/0.9.3` a `publish-check` job fails a green main-push run whose `publish-manifest` is not `success` (step tested locally for success / skipped / failure / cancelled; the job's `if` is seen only on the first main push). A red run also holds staging, which deploys only after a successful run. | docker-e2e run 41289168121 |

## Phase 7 — content

| Item | Status | What remains | Evidence |
| --- | --- | --- | --- |
| Write the 23 missing site stories | open | No commit on the branch adds a site story. The list of 23 was not found in a doc; `static/data/site-stories/` has 55 files. Runbook: `docs/guides/site-story-addition-runbook.md`. | `git log origin/main..HEAD` (no site-story commit) |
| Review the Galileo gallery credits | partly done | Reviewed 2026-11-01: the 20 images in `missions/galileo`, `fleet-galleries/galileo`, `fleet-galleries/galileo-gnss`, `earth-objects/galileo`. Fixed: `earth-objects/galileo` 04 (DLR photo of a Galileo launch) and 05 (a user's ground-station photo) said agency NASA; now ESA, as other rows picturing ESA hardware. Open: `fleet-galleries/galileo` (the Jupiter orbiter) 01, 02, 04, 05 are still the "NASA Images search result" placeholder (no nasa_id), and `fleet-galleries/galileo-gnss` 02 is "uncurated" with an assumed ESA licence; each needs the real source found (image match, as in `e6fc1740a36`). Also: the 21 Oct credit fixes were made in `image-provenance.json` directly, so a full `build-image-provenance` rebuild would rewrite them. | `git log origin/main..HEAD`; `docs/wip/*.md` (only unrelated Galileo "eight years" fact fix) |

## Done in this arc

| Item | Evidence |
| --- | --- |
| Akatsuki status ACTIVE to FLOWN, Blue Moon year 2025 to 2027, Apollo 1 CANCELLED status (index matches mission files, enforced by validate-data) | `2d969a2353f`, `c8de242a853` |
| Hard-coded mission count in specs replaced by `MISSION_COUNT` helper | `tests/e2e/missions.spec.ts` (imports `_helpers/mission-index`) |
| Android ACCESS_FINE_LOCATION on API 24-30; native app versions follow package.json; CI asserts both | `2432d9da2a1`, `68912a7c22f` |
| Panels onto shared PanelTabRow, PanelHeroImage, PanelLightbox, gallery grid and LEARN link tiers | `8c075dfb7aa`, `31984613513`, `83f08aba25f`, `61d5e1c3923`, `c3a90d0fbb7` |
| /explore page split (11 steps) | `c4548930160` to `cd7dfd52826`, `166aca604eb` |
| Also split: SurfaceScene, /fly page, physics registry (13 files), station routes | `7027bcc4f6d`, `0d0190038cd`, `86f421e86a4`, `b3417125d86` |
| Unit-suite speed 11.5 s to 6.7 s | `29e32ebd70d` |
| Typed window test hooks; reasons on every `{@html}` | `e50eb1da7ca` |
| Orphan-script triage (documented) | `576d27587fc`, `b582764cbea` |
| #24 /dev routes stripped from production builds | `dd290077b1f` |
| #21 e2e on tech-debt/** branches | `d83d01b339b` |
| i18n step 0: guidance consolidated, style guide v1 | `fd65ed99c08`, `36b612edf31` |
| UI strings full read, all 13 locales (1,979 keys each), label checks and ratchet gate | `8a032b9cb03` to `f43cb6daae9`, `9162f8bb7aa` |
| Hard-coded English batches 1-3 and the scan guard in CI; message parity gate | `639307ca613`, `e5f81c90940`, `548ced5b271`, `cea21263071`, `23141d54951` |
| BeltPanel "AU" now a message (`unit_au_value`) | `src/lib/components/BeltPanel.svelte` line 179 |
| 3 MB messages chunk, alt-text map out of root layout, per-locale bundle split, per-route budget | `7220ede2109`, `f2e582181bb`, `e82459a0599`, `0234f68eb3a` |
| Launch-data retry, lab-api limits and TTL, MCP 503, axe on 34 routes, iOS privacy manifest and backup rules, breadcrumb scrub | `e4b0b99dcf2`, `5ad053d53ba`, `0e52cb8ab27`, `d65587d0da3`, `571828d0c91`, `0bcfa889ee2`, `6d80fc1a28c` |
| `/science/glossary` page (PRD-038) and the 20-term pilot, all trees gated | `768f3ecba39`, `3d0f01cd640`, `a1edd3f7d7a`, `96c417d7fc2` |
| Garble pass: fleet and missions rounds 1-3, catalogue/places/universe in 12 cells, science ru/zh-CN/fr, pattern scans, orbit-regime names | `49b9fb29c1f`, `75f25bcab0a`, `771ba507907`, `46b37bd63b9`, `cf239c13972`, `28710d52ed3` |
| Translators no longer cut or drop content; they receive term bindings | `918deb1285f` |

## Translation quality — still open

Numbers are from `2026-10-31-garble-pass.md` (section in parentheses) and the spot-check doc.

| Item | Size | What is known | Next step |
| --- | --- | --- | --- |
| Science in the other 10 locales (de, nl, es, it, pt-BR, ja, ko, hi, ar, sr-Cyrl) | 1,433 fields each, about 14,330 | Full reads of ru, zh-CN, fr found 19 %, 12 % and 16 % BROKEN, far above their samples (5 to 10 %), so sampling under-reads this tree (9). Spot check of 8 science paragraphs per locale: pt-BR 1 / 6 / 1 and fr 3 / 2 / 3 (OK / MINOR / BROKEN); the i18n-audit rule says re-translate both. Other locales had MINOR 1 to 5 of 8. | Full read per locale, starting with pt-BR, then nl, ru-style term problems in the rest. |
| Essays, all locales | 104 sampled paragraphs | Spot check: 1 BROKEN (sr-Cyrl `essays/space-comm-arrays.json` body.12) and 14 MINOR of 104. Not read in full. The BROKEN string was fixed in `3d8948f8a4d` ("тек десетак метара" → "свега неколико десетина метара", EN "just tens of metres"), which also removed the visible `\"` from 12 strings in 7 locales (0 left, checked 2026-11-01). Whether the 14 MINOR were fixed was not checked. | Decide on a full read. |
| Programs, all locales | not sampled | Not measured in the garble pass or spot check (4, 6). Term round covered it, which reads for terms, not garble. | Sample, then decide. |
| Catalogue / places / universe cells not flagged | the sweep's 65 cells (5 buckets x 13 locales) had 15 flagged; 12 non-science cells were read in full (8). The rest, 26 cells in round 2 and 14 with 0 BROKEN in 60, were not read in full | Each unread cell can still hold up to about 5 % BROKEN (95 % bound, 0 in 60) (6). Step D check: 0 BROKEN in 300 fresh fields across the 12 fixed cells, bound about 1 % together and 12 % per cell (9). | Full read of any cell where the next sample shows 1 or more BROKEN. |
| MINOR fields kept | about 10 % of fields in round 2 (6); 11 graded MINOR but kept in step B (8) | Style, agreement and wording slips left where the reviewer kept the field. | Optional polish pass. |
| `name` / title fields | 580 name/title cells that some locales keep in English | Not in the garble work files, so reviewers never saw them. Orbit-regime names (113 fields, 13 locales) were fixed after being found by accident. The 580 are mostly proper names kept on purpose, but were not read one by one (8). | Read the list once; split intended keeps from misses. |
| Fleet cells with no BROKEN in the sample | de, es, pt-BR (both trees), ar, fr, nl, ru, sr-Cyrl fleet | Round 2 and the round-3 check bound the fixed cells at about 0.6 % together; unfixed cells keep the 12 % per-cell bound. es fleet showed 6 / 60 BROKEN in round 2 after 0 / 25 in round 1, so a 0 in 25 is weak evidence (6). | Include in any wider sample. |
| Hard-edge limits of the measurements | n/a | One grader per locale in round 1; no second checker in round 2; the 449 label changes had no second checker; "Binary primary / secondary" and "Contact binary" are new coinages in every locale (7). | Second read if the cells are revisited. |
| Pattern scan blind spots | n/a | Scan finds only error classes it names; scale words written as digits or without the English scale word nearby; "Rocket Lab Launch Complex 1" stays English in de (facility-code check refuses a change) (7). | Add classes as new ones turn up. |
| Zh-CN ASCII punctuation in essays and science | 1,472 marks in 96 of 199 files at spot-check time | Done (re-counted 2026-11-01): 0 ASCII `,` `:` `;` after a Chinese character in the 199 zh-CN essay and science files. The same count on the tree before `33887920c68` finds 1,599 in 95 files (1,446 with Chinese on both sides), so the counter works. No detector is committed; the count was a session script. | None. |
| "burn" (engine firing) term | all locales | Done (checked 2026-11-01): `native-terms.json` `term.burn` binds a form in all 13 locales (fr allumage, zh-CN 点火, nl ontsteking, hi दहन, ar إشعال, …), each with a `sources` entry; `term-drift.mjs` checks it. Confidence: sr-Cyrl and it high, nl low, the rest medium. | None; nl is the weakest form if the term is revisited. |
| Register mixes in science text | ja です/ます vs である, ko 합니다 vs 한다 | Reported in the spot check; no fix recorded. | Decide on a register per locale. |
| Remaining term drift | science misses 1,317 to 656 after the first rounds; later rounds closed to 0 unreviewed (gated) | The gate passes; some cells were 90 to 100 % bound. | None unless the gate fails. |

## Translation handover — what the next arc should know

Lessons from the 2026-10-31 garble pass (doc `2026-10-31-garble-pass.md` §1–9 has the numbers).

**Method that worked**

- Work file: `garble-sample.mjs --per=all --before=any [--merge=<bucket> --trees=…]`. Split into
  ~130-field parts, one Sonnet reviewer per part on `fix-brief.md`, then `garble-check.mjs`, a
  hand read of a random sample, and `garble-cell-commit.sh` (it takes a bucket,
  `<name>:<tree,…>`).
- Cost: about 130–200k tokens per 130-field part. A long-prose cell (science, 1,433 fields) is
  about 2M tokens; a catalogue cell (825 fields) about 900k.
- Guard refusals go to one fixer agent that tests its own patches with
  `apply-edits.mjs <loc> <file> --check`, which writes nothing and lists every refusal. Without
  `--check`, apply-edits prints only the first 30.
- Verify each round with a fresh grade-only sample that excludes fields graded before.

**Measurement**

- Samples under-read long prose. The science samples said 3–10 % BROKEN, and the full reads
  found 12–19 %. For essays, programs and the other science cells, plan a full read, not a
  sample-then-decide.
- A clean sample of 25 only bounds the error rate at about 12 %. A clean 60 bounds it at about
  5 %.

**Gates the reviewers overrun (shorten, then read every shortened text against the English;
the shorteners drop facts)**

- Science `intro_sentence` 240 characters and tab `headline` 160 (schemas in
  `static/data/schemas/`); fleet `tagline` 140; mission milestone `label` 80.
- ru and fr run 10–40 % longer than the English, so 30–40 intros per science cell need
  shortening.

**Guard behaviour worth knowing (`scripts/lib/translate-quality.mjs`)**

- The name guard reads a facility name as a name: "X Space Center" stayed English in de/nl
  until five `GAZETTEER_SKIP` entries were added. Add more there (with a guard replay before and
  after) rather than keeping English.
- It cannot tell Hubble the telescope from Hubble the astronomer. Convention used: the telescope
  in Latin; terms named for the astronomer in the native form, with the Latin name once in
  parentheses («закон Хаббла (Hubble)», 哈勃（Hubble）定律).
- pt-BR constellation names Gemini and Cygnus are demanded in Latin; written as «Gêmeos
  (Gemini)», «Cygnus, o Cisne».
- Left as is because the guard refuses the native form: zh-CN "Sun–Earth L2" (orbit-regime
  name), de "Rocket Lab Launch Complex 1", ru «Сокол-КВ2» carries "(Sokol KV-2)".
- Term keeps are hashed on the text. After a field changes, re-record the keep on the new text
  while it is applied (apply, `term-drift --misses`, `miss2keeps`, `term-keep`, revert, commit).

**Locale conventions confirmed**

- Thousands separator: space in fr/ru/es (es four-digit numbers take none); dot in
  de/it/nl/pt-BR/sr-Cyrl; ar writes Western digits with a comma (the locale's own majority,
  not an error); zh/ja/ko use 万/亿, 万/億, 만/억 (number checks must read these, not regex them).
- Porkchop plot (operator 2026-10-31): ru «диаграмма «свиная отбивная»», zh-CN 猪排图,
  fr «diagramme porkchop». Moon-landing words (allunaggio, alunizaje, alunissage) only for the
  Moon.
- Serbian: the operator reads it and has the final say. «Готово праволинијска» is correct
  ("готово" = almost).

**Tools from this pass (now in `scripts/i18n-tools/`, README rows)**

- `garble-cell-prep.sh` / `garble-round-commit.sh` (bucket cell prep and commit), `schema-caps.mjs`
  (caps read from the schemas), `number-loss.mjs` (lost numbers, 万/亿/만/억 aware),
  `edit-fixes.mjs` (refusals → fixer file → merge back, drop), `show-edits.mjs`,
  `split-work.mjs`, `term-misses.mjs`, `garble-flags.mjs`, `term-forms.mjs`, `garble-tally.mjs`,
  `grade-pack.mjs`; shared `garble-lib.mjs`; tests in `garble-helpers.test.ts`. Each was checked
  against the session's Python original on its real data. The two `.sh` ports have not yet run
  end to end — run them on the next cell and watch the first run.
- `garble-check.mjs` number flags are noisy (99 flags in ru science, all separator or word
  forms); `number-loss.mjs` cuts that to the real reads (3). Use it after garble-check.
- JSON notes written by hand must go through `npx prettier --write`. An `echo`-written note
  failed the pre-push lint once.
