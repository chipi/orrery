# UXD-003 — Home route-card titles are upright Space Mono; the 4.5 px icon text stays deleted

- **Status**: accepted
- **Date**: 2026-11-11 (proposed and decided)
- **Decider**: the operator — "A1 follow-up (operator 2026-11-11): home route-card titles stay
  upright Space Mono (option a; were Crimson italic)"
  (`docs/wip/2026-11-11-ux-feedback-plan.md` line 431)
- **Answers**: H8 (partly), X1; slice A1 (type scale); full home styling is slice F3
- **Changes**: IA §home-cards; UXS-013 (landing page typography). *Rules to be updated to link here
  (UXS-000 §Next).*

## Context

During the A1 type-scale slice the home route cards were the one place where the new rule
([UXD-002](UXD-002-type-scale-and-the-11px-floor.md): no italic outside quotes and captions) and
the existing look (card titles in Crimson italic) collided. The A1 brief had already ruled "Home
`.tagline`, `.prose p`, card titles: CHANGE now (no partial updates)"
(`docs/wip/2026-11-11-slice-A1-brief.md` line 26). The route-card icons also carried a 4.5 px
"T+254 d" text, far under the 11 px floor.

## Options

The source names "option a" (upright Space Mono) and says the titles "were Crimson italic". The
other options offered, and the review sheet that showed them, are not in the repository.

## Decision

Home route-card titles are **upright Space Mono** (option a), not Crimson. The 4.5 px "T+254 d"
text on the route-card icons **stays deleted** (plan line 431). All other home styling is **not**
settled here: it is decided in the home-page slice, covering "every aspect of the page" (plan line
431; point H8, "revisit with the rest of the page", plan line 134).

## Consequences

- The Home hero, tagline and the remaining typography stay open until the home slice (F3 in the
  slice plan: H1, H2, H3; and the operator decisions D1 to D3, which are open, see UXS-000 §Open).
- IA §home-cards and UXS-013 must say upright Space Mono for route-card titles, and must not
  describe the deleted icon text.

## Verification

Covered by the type-floor and italic rules of UXD-002 (`tests/e2e/type-floor.spec.ts`), which
checks size and the label colour on the landing; it does not assert the card-title face
specifically. Not verified by this document.
