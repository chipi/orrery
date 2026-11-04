# Open GitHub issues — inventory (2026-11-02, after v0.9.3)

Every open issue on `chipi/orrery` was checked against the code on `main` (`e49ed164c95`, v0.9.3)
on 2026-11-02. Each kept issue got a status comment with the evidence. Closed the same day as
done: #612, #617, #320, #319, #607, #538, #622, #620, #632.

38 issues were open at the time of the check. After the operator's review: 25 stay open, 13 were
closed (stale, duplicated, superseded or not actionable).

**Status 2026-11-04:** checked against `tech-debt/0.9.5` (PR #639) and `gh issue list` (28 open). Of the 25 below, 24 are still open; 1 is partly fixed: #362 (rover traverses) — Curiosity and Perseverance now on the rover teams' tracks (`2914e8d5cc3`), Opportunity, Spirit and Zhurong still say "simplified hand-vendored polyline" in `static/data/mars-traverses/*.json`. Opened since this inventory by the triage fleet (all three events are `environment=dev`, filed 2026-11-02/03): #635 `hud_spacecraft_sep` is not a function on /fly, #637 `LANDMARK_NAME[...]` is not a function in FleetLineup, #638 `surface_tier_scale_note` is not a function on /moon. The keys exist at HEAD (`messages/en-US.json` has both message keys; `FleetLineup.svelte:70` defines `LANDMARK_NAME` as a map of functions); not reproduced in a browser, so not verified fixed. 0.9.5 fully fixes none of the 25; the `/fly`, surface-imagery and line-up work has no issue in this list. #289 got a related fix only (`fe6c6ee0dba`: partial Moon panoramas open on their photograph; the synthetic wedge is not built).

## Open (25)

### Needs the operator, a device or a decision

| # | What | Why still open (checked) | Blocked on |
| --- | --- | --- | --- |
| 621 | iOS: CocoaPods → Swift Package Manager | Podfile still there, `@sentry/capacitor` pinned 4.3.0 | a Mac |
| 442 | Publish to Google Play + App Store | code shipped; store steps are manual | operator |
| 490 | AR sky: on-device retest | needs a physical phone | operator + device |
| 618 | Links to airandspacehistory.com galleries | site rework first | operator's site |
| 597 | lab-api / MCP: consent screen for open DCR | everything else done | product decision |
| 46 | Permission letters to Roscosmos / CNSA | manual outreach; the operator plans it | operator |
| 375 | Android TV / D-pad navigation | after store publishing (#442); roving focus exists in `src/lib/a11y/`; the operator plans it | #442 |
| 156 | Curator tour in 12 locales | audio is English-only for now; the operator will pick it up | operator |
| 152 | Audio translation pipeline (SSML) | needed for #156 | #156 |

### Content

| # | What | Why still open (checked) |
| --- | --- | --- |
| 550 | Gallery sourcing: Chang'e 6, Voskhod 11A57 | no normal-aspect photo yet (Sokol-M done) |
| 313 | Forward-roadmap content (planned missions + fleet) | 7 + 5 planned entries vs ~55–70 target |
| 368 | Per-mission science content (objectives, instruments) | 0 of 126 missions have it |
| 130 | Mission patches + crew portraits on crewed flights | 139 flights, 0 patches, 0 portraits |
| 489 | Audio tour: /programs, AR sky, deep /explore, /fly ascent | 0 tour references to them |
| 486 | Moon phases as a feature (calendar, observation, tides) | no phase prediction code, no article |
| 257 | Visible image captions per locale | alt text done (all 13 locales); visible captions not |

### Engineering

| # | What | Why still open (checked) |
| --- | --- | --- |
| 522 | Predictor-corrector entry guidance | fixed-bank residual still documented (ADR-088/089) |
| 414 | Launchers missing from /fleet: Delta IV, Titan III/IV, M-V, Athena | none of the 5 exist |
| 417 | Video follow-ups: webcast embed, ISS liveness, LM-10B | webcasts still link out; no long-march-10 entry |
| 411 | /explore grand-tour narration | not started |
| 362 | Rover traverses: per-sol coordinates | all 5 still "simplified hand-vendored" — 2026-11-04: Curiosity and Perseverance done (`2914e8d5cc3`, MMGIS tracks, stops at their sols); Opportunity, Spirit, Zhurong still open. Moon rovers (Apollo 15/16, Lunokhod, Yutu-2) also got LROC tracks in `6c78030f575` (not part of this issue) |
| 291 | Higher-resolution tier-2 surface patches | still 2048² crops |
| 289 | Panorama: synthetic-wedge rendering | still flat fill |
| 262 | Published state vectors (`tier_2_published`) | tier unused in data |
| 49 | ISS: NASA GLB model instead of the code-built proxy | proxy still in use |

## Closed in this review (13)

| # | What | Reason |
| --- | --- | --- |
| 606 | Test debt for 1.0 | 3 of 4 items done; the last (device checks) is #490 |
| 605 | Docs hygiene for 1.0 | 5 of 6 done; the last was ticking ~200 boxes in shipped PRDs/UXSs |
| 544 | "Unable to preload CSS" escalation | benign: about one event per deploy; the reload guard works as designed |
| 539 | Lab Ask: conversational scenario assistant (epic) | all four slices shipped (#540–#543) |
| 333 | AGENTS.md dedup against the "global" | premise wrong (the named global is the homelab repo's own file) |
| 376 | KTX2 compressed textures | trigger-based; trigger not met (136 files / 62 MB) |
| 124 | 3D markers fidelity path | a design note, not an action |
| 89 | Measure 3D browser performance | empty body, from May 2026 |
| 79 | Better 2D sketches for fleet details | empty body, from May 2026 |
| 71 | /fleet: airandspacehistory.com photo curation | superseded by #618 |
| 348 | Image relevance gate v2 | pipeline untouched since 2026-06-18; image fixes are by hand now |
| 349 | Flickr scraper v2 | same pipeline |
| 350 | Image pipeline v3 reframe | same pipeline |
