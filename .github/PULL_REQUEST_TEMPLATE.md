<!--
Thanks for contributing! Read CONTRIBUTING.md if you haven't.
Branch protection on main: this PR needs a passing CI + e2e build
and one approving review before it can merge.
-->

## Summary

<!-- What does this PR change, and why? Two or three sentences. -->

## Type of change

<!-- Tick whichever applies. Multiple OK. -->

- [ ] Mission data (new mission / correction / status update)
- [ ] Translation (new locale / glossary fix / overlay refinement)
- [ ] Code (feature / fix / refactor / perf / a11y)
- [ ] Documentation (concept / ADR / RFC / PRD / UXS / user guide)
- [ ] Build / CI / tooling

## Verification

<!-- What did you run locally? At minimum, lint + check + test. -->

- [ ] `npm run lint` clean
- [ ] `npm run check` (svelte-check) clean
- [ ] `npm run test -- --run` green (current floor: 560 unit tests)
- [ ] `npm run validate-data` green (only if you touched JSON / docs gating)
- [ ] `npm run test:e2e` green (only if you touched routes / UI / trajectory math)
- [ ] Smoke-tested in a browser at desktop + 375 px mobile width (only if UI change)

## Screenshots

<!-- Required for any visible UI change. Drag-drop into the textarea. -->

## ADR / RFC reference

<!--
If this changes a locked decision in docs/adr/, you must include the
new ADR superseding the old one (or a draft RFC if the choice is
non-obvious). Otherwise just paste the relevant ADR / RFC number for
context: e.g. "Implements ADR-027" or "Closes RFC-008".
-->

Implements / closes:

## Notes for review

<!-- Anything reviewer should pay attention to. Edge cases, trade-offs,
open questions, deliberate scope cuts, things you'd like a second
opinion on. -->
