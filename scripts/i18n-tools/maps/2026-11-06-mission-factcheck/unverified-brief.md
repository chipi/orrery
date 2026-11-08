# Fact-check round 2 — the "could not verify" items (2026-11-07)

The first round (README.md) left items its reviewers could not settle. Settle each one now.
Repo root: `/work/orrery/worktrees/0.9.5`. Read-only: do not edit files.

## Where the text lives

- Missions: `static/data/missions/<body>/<id>.json` (base, English: `flight.events[].description`,
  `credit`, `payload`, `delta_v`) and `i18n-src/en-US/missions/<body>/<id>.json` (displayed text:
  `description`, `dispatch`, `first`, `events[].note`).
- Fleet: `static/data/fleet/<type>/<id>.json` and `i18n-src/en-US/fleet/<type>/<id>.json`.
- Find our exact wording with Grep before judging it. Quote it verbatim in your report.

## How to judge

- Prefer primary sources: the agency (NASA, NSSDCA, ESA, JAXA, ISRO, CNSA/CMSA, Roscosmos/IKI),
  mission reports, then peer-reviewed papers, then Wikipedia (only with its cited source).
- Verdict per item: **correct** (source agrees), **wrong** (give the correct value and the source
  quote), **unsupported** (no source either way: propose a softer wording that drops the unsourced
  detail, never a new guessed number), or **different definition** (both figures are right for
  different definitions: say which ours is and propose wording that names it).
- Budget: at most 15 web searches. Spend them on the items most likely wrong.

## Report (one block per item, nothing else)

```
- item: <the item, short>
  file: <path> · field: <json path>
  ours: "<verbatim, short>"
  verdict: correct | wrong | unsupported | different definition
  fix: "<replacement text in English, minimal>"   (omit when correct)
  source: <URL> — "<short verbatim quote>"
```

End with one line: `N items: a correct, b wrong, c unsupported, d different definition`.
