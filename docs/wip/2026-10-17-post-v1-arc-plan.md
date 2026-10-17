# Arc after v1.0 readiness: everything skipped from P0/P1

Operator-approved plan, 2026-10-17. Work top to bottom. It replaces the ordering in
`2026-10-16-next-pr-content-scope.md`; that doc keeps the decisions it records.
Source of each item: `2026-10-16-v1.0-readiness.md`, issues #384 #490 #588 #596
#597 #599 #600 #601 #608 #610, and `2026-09-09-lab-feedback-triage.md`.

Ordering rule: easier before harder, free before costly. Cost means operator time,
another agent or a device, or a paid run.

| # | Item | Source | What's left | Cost |
|---|---|---|---|---|
| **Phase 0: checks after the deploy** |||||
| 1 | Verify #590, #579, #588 on prod | readiness | MCP 400 reason, a `tool-call` Umami event, a week of no SW/preload escalations (to about 10-23) | operator: one connector call, one old-tab reload |
| 2 | Source maps, last check | #595 | a real prod error resolves to source in GlitchTip project 18 | wait |
| 3 | 183 localhost pageviews in prod Umami (2026-08-19 to 09-10) | telemetry audit | delete or keep | operator decision |
| 4 | Operator's own visits out of analytics | readiness #38 | opt-out cookie on the operator's devices | operator |
| **Phase 1: small code** |||||
| 5 | Ship the local commits (db2cd9c9264 … 6e2a1cf0869) | 2026-10-17 session | push | CI |
| 6 | Skip-entry: 3 should-fix items, then `stamp-science-review -- skip-entry` | #610 | survivability overclaim, Chang'e 5 skip location, heat-load wording | science-reviewer |
| 7 | Dependabot `docker` ecosystem, base-image digest pins | #599 | config + pins | — |
| 8 | SSH host-key pin in the deploy workflows | #600 | repo variable + `StrictHostKeyChecking=yes` | prod session reads the key |
| 9 | SRI on the Umami script | #601 | integrity hash | — |
| **Phase 2: text content** |||||
| 10 | Program-page fact-checks: Artemis page, Apollo 13 distance, Gemini 11 apogee, Mangalyaan, Starship framing, SLIM | #610 | fix, ×14 | science-reviewer, translations |
| 10b | **Fact-check every essay in English** (operator amendment 2026-10-17); fix in English **before** any translation | #608 | review + fixes | science-reviewer |
| 11 | `/privacy` and `/credits` describe Lab Ask | #601 | operator approves the English wording, then ×14 | operator, translations |
| 12 | Essays English-only: decide from Umami /essays traffic per locale, then translate or stay English-first | #608 | after 10b | translation is the largest text job |
| **Phase 3: medium infra and assets** |||||
| 13 | Rollback under 5 minutes (`build.prev/` + swap workflow) | #600 | | prod review, one test rollback (approval) |
| 14 | `npm ci` lifecycle scripts in deploy/bot jobs, per job | #600 | | — |
| 15 | `read_only` + memory/pids limits on mcp and lab-api, from measured `docker stats` | #599 | | prod |
| 16 | pipeline-runner: only the keys it needs, not root | #599 | | prod |
| 17 | Texture re-encode, same size (31.2 → 14.2 MB measured) | #596 | | operator approves side-by-side crops |
| **Phase 4: heavy** |||||
| 18 | Lab feedback FB1–FB6, one worked example threaded through every goal | lab-feedback triage | | operator review per goal, translations |
| 19 | Distinct photos for 33 cards with same-card duplicates | #384 | | operator approves each image |
| **Phase 5: device (parallel, when the Apple agent is ready)** |||||
| 20 | 9-item mobile checklist, AR sky retest #490, AR overlay in one non-English locale | `mobile-testing.md:128-136` | | macOS agent + phone |
| **Last** |||||
| 21 | 1.0.0 version, tag, GitHub Release | readiness #17 | after the operator's testing days | — |

## Out of this arc (reasons recorded)

- DCR consent screen + refresh-token TTL (#597): sign-in is allowlist-only, MCP tools are pure math.
- `script-src 'unsafe-inline'` → hashes (#266): low severity, a CSP project of its own.
- axe `serious` gate: its own branch after P2.
- Alt-text re-translation (#389): operator declined (paid run, one consumer).
- Google OAuth verification: dropped while the operator is the only Lab user.

## Open

- How translations are produced (in-session vs a paid pipeline) is not yet checked; it sets the real cost of 10–12 and 18.
- Shipping shape (one PR, per phase, or phase 1 to main) is not decided.
