# UXD-005 — No staging: GitHub Pages serves only the docs, releases are verified on prod

- **Status**: accepted
- **Date**: 2026-11-10 (decided) · 2026-11-11 (gh-pages history and follow-ups decided)
- **Decider**: the operator — "Main work — no staging (operator, 2026-11-10): GitHub Pages serves
  only the project docs; every release goes straight to prod, validated there"
  (`docs/wip/2026-11-11-0.9.9-plan.md` lines 16–18); ADR-097 status line "Accepted · 2026-11-10
  (operator)"; "DECIDED (operator 2026-11-11): no history rewrite" (plan line 24)
- **Answers**: none from the feedback list; a process and release decision that changes what a
  reviewer looks at
- **Changes**: AGENTS.md (lines 91, 959), `CLAUDE.md` (line 89), `docs/ops/*`, `docs/guides/*` that
  named staging. The architecture is [ADR-097](../../adr/ADR-097.md); this record keeps only the
  consequence for UX review.

## Context

Staging was the app bundle on GitHub Pages, a different host from prod: no nginx headers or CSP, a
`/orrery/` base path, no `/data` overlay. Its smoke "could pass while prod broke" and the copy was a
divergent SEO-duplicate mirror (ADR-097 Context). Every release already needed `validate-prod` on the
real host.

## Options

ADR-097 records the alternatives. Not repeated here.

## Decision

There is **no staging tier**. The release flow is merge to `main`, the manual prod deploy
(`gh workflow run "Deploy to prod VPS (orrery)" --ref main`, for a commit whose CI and docker-e2e
are green), then validate-prod. **GitHub Pages serves only the docs.**

**For UX review this means** (operator, 2026-11-10, memory note `validate-staging-before-prod`,
modified 2026-11-11): after the prod deploy, each change in the release is driven on
`https://www.orrerylearn.com` and reported pass or fail with evidence per item; green validate-prod
alone does not prove the shipped changes work. The local release gate (full e2e on all three
Playwright projects, `preflight:coverage`, `build:mobile`) carries the weight staging used to.

## Consequences

- Done on the branch (git log of `tech-debt/0.9.9`: `5c1c30f5cd6`, `9a0a803c341`, `e910a6624cd`,
  `74b8206f154`): staging workflows deleted, `src/lib/target-env.ts` removed, docs updated.
  Remaining and tracked in the 0.9.9 plan, not UX: the `deploy-prod.yml` patch (the operator applies
  it, item 1.6) and the staging leftovers on the observability side after the 0.9.9 deploy (plan
  section 3).
- A bad commit is found on prod, not before it; the mitigation is the green-CI rule, validate-prod
  after the deploy, and the rollback in `docs/ops/deploy-prod-vps.md` (ADR-097 Consequences).

## Verification

`.github/workflows/staging.yml` and `src/lib/target-env.ts` are absent in the working tree at
`9fdf4cc4a6b`. The flow is not enforced by a test.
