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
| 5 | Local commits accumulate (from db2cd9c9264); nothing ships until the operator says the arc is ready (2026-10-17) | 2026-10-17 session | — | — |
| 6 | Skip-entry: 3 should-fix items, then `stamp-science-review -- skip-entry` | #610 | survivability overclaim, Chang'e 5 skip location, heat-load wording | science-reviewer |
| 7 | Dependabot `docker` ecosystem, base-image digest pins | #599 | config + pins | — |
| 8 | SSH host-key pin in the deploy workflows | #600 | repo variable + `StrictHostKeyChecking=yes` | prod session reads the key |
| 9 | SRI on the Umami script | #601 | integrity hash | — |
| 9b | **Translation quality audit, risk-tiered, by segment** (operator 2026-10-17: fix everything found; spend checks where the risk is) | this plan § Translation risk tiers | detectors on every locale, fix every hit; sr-Cyrl graded per segment (editorial vs short vs UI), re-translate failing segments on Sonnet | see § |
| 9c | **Hebrew (`he`) as a new locale** — a gap (operator 2026-10-17): Arabic ships, Hebrew doesn't, and Israel has a space programme (ISA, Beresheet, Ofeq, Amos). After 9b. Doubles as the end-to-end test of the corrected translation tooling (every `translate-*.mjs`, `retranslate-fields.mjs`, the checks, the names rule) | RFC-010 excluded Hebrew on priority×reach; ADR-031 needs a superseding ADR | ADR; locale config + paraglide; every overlay surface + UI bundle via the scripts; RTL pass (Arabic precedent); validate-data completeness; graded sample (Haiku by default, Sonnet if the sample says so); e2e locale smoke; audio decision | translations, reviewer |
| 9d | **Skills for this work** (advisor-recommended, operator-approved 2026-10-17): `long-job` (shared), `i18n-audit`, `i18n-fix-run`, `orrery-deploy-verify` (repo, `.claude/skills`), and the `skill-nudge` hook so skills trigger on prompts and Bash commands | advisor review | built + committed (homelab b38e20e, cae4486; orrery 601f221e4ed); hook wiring into `~/.claude/settings.json` waits on the operator | — |
| **Phase 2: text content — starts only after phase 1 and every translation issue are cleared (operator 2026-10-17)** |||||
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

## Translation risk tiers (item 9b)

Operator 2026-10-17: standardise which languages are risky, spend more spot checks
on risky ones and fewer on safe ones; fix everything found; sr-Cyrl is the top
problem language — keep checking and fixing it whatever it costs (but don't go
crazy; never "fixed 2 of 200").

Detector pass, 2026-10-17 (every i18n-src overlay + `messages/<loc>.json`, strings
≥ 25 chars; script `all-detect.mjs`, to be committed under `scripts/`):

| loc | strings | untranslated (== en) | English prose | foreign script | Cyrillic+Latin in one word | Russian letters | defect % |
|---|---|---|---|---|---|---|---|
| sr-Cyrl | 6602 | 160 | 1 | 18 | 297 | 183 | 10.0 |
| zh-CN | 5279 | 477 | 1 | 3 | — | — | 9.1 |
| ar | 6422 | 174 | 27 | 10 | — | — | 3.3 |
| ko | 5679 | 163 | 2 | 20 | — | — | 3.3 |
| ja | 5542 | 160 | 1 | 4 | — | — | 3.0 |
| hi | 6458 | 161 | 1 | 23 | — | — | 2.9 |
| es, de, fr, it, nl, pt-BR, ru | 6600–6800 | 160–186 | 1–12 | 3–10 | ru 18 | — | 2.7–2.8 |

What the hits are: a shared set of ~160 strings never translated in any locale
(fleet taglines/best_known_for, Apollo 1 event notes, …); half-translated
strings (English sentence + one translated word, e.g. de Falcon Heavy
"Rückkehr nach Start"); CJK leaking into hi/ko (`着陸`, `弹道`, `西昌衛星發射中心`);
Cyrillic letters inside Arabic words (`إنترепيد`); Hangul inside sr-Cyrl
(`trans-x-injection`, whole article); Russian words in Serbian (`Это`, `ничего`,
`один`). Detectors do not catch garbled-but-correct-script prose: the sr-Cyrl
skip-entry article had none of the above and was still unreadable.

Tiers:

- **Tier A — sr-Cyrl.** Detected defects 10% plus unreadable prose that no
  detector sees. Graded per segment (operator 2026-10-17: editorial pieces vs
  short descriptions vs UI strings differ): a seeded sample per segment (10 long
  editorial strings, 25 short) graded OK / MINOR / BROKEN by a Sonnet reviewer.
  BROKEN ≥ 20% or BROKEN+MINOR ≥ 50% → re-translate that segment from en-US;
  BROKEN 1–19% → fix the flagged strings + every detector hit in it. Model:
  Sonnet for sr-Cyrl (operator 2026-10-17: Haiku stays the default, Sonnet
  overrides problem languages — `scripts/lib/translate-model.mjs`).
- **Tier B — zh-CN, hi, ko, ar.** Fix every detector hit; reviewer spot-check
  60 random strings per locale across surfaces. A sample defect rate above 5%
  moves the locale to Tier A.
- **Tier C — de, es, fr, it, nl, pt-BR, ru, ja.** Fix every detector hit;
  reviewer spot-check 25 strings per locale. Above 5% → Tier B.
- **All locales:** the shared untranslated set gets translated; the detector
  script becomes a validate-data gate so new hits fail preflight.

## Out of this arc (reasons recorded)

- DCR consent screen + refresh-token TTL (#597): sign-in is allowlist-only, MCP tools are pure math.
- `script-src 'unsafe-inline'` → hashes (#266): low severity, a CSP project of its own.
- axe `serious` gate: its own branch after P2.
- Alt-text re-translation (#389): operator declined (paid run, one consumer).
- Google OAuth verification: dropped while the operator is the only Lab user.

## Open

- How translations are produced (in-session vs a paid pipeline) is not yet checked; it sets the real cost of 10–12 and 18.
- Shipping shape (one PR, per phase, or phase 1 to main) is not decided.
