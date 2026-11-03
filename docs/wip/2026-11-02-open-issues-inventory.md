# Open GitHub issues — inventory (2026-11-02, after v0.9.3)

Every open issue on `chipi/orrery` was checked against the code on `main` (`e49ed164c95`, v0.9.3)
on 2026-11-02. Each kept issue got a status comment with the evidence. Closed the same day as
done: #612, #617, #320, #319, #607, #538, #622, #620, #632.

38 issues were open at the time of the check. After the operator's review: 25 stay open, 13 were
closed (stale, duplicated, superseded or not actionable).

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
| 362 | Rover traverses: per-sol coordinates | all 5 still "simplified hand-vendored" |
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
