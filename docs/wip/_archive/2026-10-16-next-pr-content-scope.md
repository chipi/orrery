# Next PR (after the v1.0 readiness PR #611): content changes

Operator decision 2026-10-16: the v1.0 readiness PR is **code only**. Every
content change below goes in the next PR, which focuses on content. None of it is
started. The 1.0.0 version, tag and GitHub Release come after the operator has
tested the #611 deploy for a few days, not with either PR.

| Item | Decision | Issue |
|---|---|---|
| Program-page fact-check residuals: Artemis page (Artemis II flew; Artemis III is no longer the landing), Apollo 13 distance, Gemini 11 apogee, Mangalyaan note, Starship framing, SLIM note | fix all; ×14 translations | #610 |
| `/science` skip-entry: 3 should-fix (survivability overclaim, Chang'e 5 skip location, heat-load wording), then `npm run stamp-science-review -- skip-entry` | fix all | #610 |
| Textures: same-size re-encode of all (31.2 → 14.2 MB measured) | do all, with side-by-side crops for approval | #596 |
| Same-card duplicate photos (33 cards) | replace with distinct photos, per-image approval | #384 |
| Essays English-only | open: keep English-first, or translate (check Umami per-locale /essays traffic first) | #608 |
| `/privacy` and `/credits` don't describe Lab Ask (what the question goes to: the LiteLLM gateway, the model, retention). Sign-in is an allowlist beta today (the operator only) | write the section; ×14 | #601 |
| Lab feedback FB1–FB6 (`2026-09-09-lab-feedback-triage.md`): figure legibility, formula pedagogy, consistent example, per-goal fixes, gravity label, goal ordering | do all; clarifications 1–4 answered 2026-09-09; clarification 5 answered 2026-10-16: **one worked example threaded through every goal's formula cards** (not per-goal) | #539 |

**Apple-side checks (operator 2026-10-16: an agent running on macOS, during the next PR):**
the 9-item mobile device checklist (`docs/guides/mobile-testing.md:128-136`), the AR sky
on-device retest (#490), and the translated AR overlay (#608) in one non-English locale.
The iOS Simulator covers the non-AR checks; AR placement and AR sky need a real device
(the Simulator has no camera or ARKit).

Not doing: image alt-text re-translation (paid run; one consumer) — #389.
