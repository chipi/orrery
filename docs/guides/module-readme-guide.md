# Module README guide — small tactical docs next to code

How to write a **module map**: a short README that sits next to the code it
describes and carries the local knowledge the code alone cannot state. It
serves everyone the same way — humans and agents, feature work and
maintenance. This guide is for anyone (especially agents) adding or
extending one.

Live examples in this repo: [`src/lib/ar/README.md`](../../src/lib/ar/README.md) ·
[`scripts/README.md`](../../scripts/README.md) ·
[`tests/e2e/README.md`](../../tests/e2e/README.md).

## When to write one

Any one trigger is enough:

- The area has **two or more look-alike implementations** (same concept,
  different consumers) and nothing states which serves what.
- A **convention** exists that code doesn't declare: units, coordinate
  frames, physical models, naming/taxonomy rules, generated-vs-source
  boundaries.
- A fix or review **went to the wrong file or layer** in this area — that
  miss is the signal that local knowledge is undocumented.
- A folder has grown enough files that "what lives where" needs answering.

## Where it lives

`README.md` inside the module's folder; for a single top-level file,
`<name>.README.md` next to it. Always adjacent to the code so it moves,
versions, and gets reviewed together with what it describes.

## What goes in (10–25 lines, whichever of these apply)

1. **One line: what this area is** and which route/feature consumes it.
2. **Ownership map** — file/function → responsibility → consumer.
3. **Disambiguation** — name the look-alikes and when to use which.
4. **Local conventions & invariants** — units, frames, models, taxonomy
   rules, "generated — don't hand-edit" boundaries.
5. **Contracts callers rely on.**
6. **Pointers up** — one line each to the ADR / PRD / RFC / TA.md section
   that holds the *why*. Link, never summarize: the README carries the
   *what / which / who-owns*; the big docs carry the *why*. If the why
   isn't written anywhere, flag the gap — don't invent it here.

## What stays out

- Bug/ticket/PR references and history ("added for #123" rots).
- API reference — signatures and types live in the code.
- Roadmap/strategy — belongs in the docs you link to.
- Anything the code already says clearly. Non-obvious only.
- More than ~25 lines. Longer means the area needs splitting, or the
  content is really an ADR.

Voice: a maintainer leaving notes for the next person; present tense. The
README states the module's *intended* conventions — if code contradicts the
doc, that divergence is a bug to raise and fix (same anti-drift rule as
TA.md), never something to paper over.

## Validating a module README

- **Review checklist (2 min).** Someone who has never seen the area must be
  able to answer from the README alone: *which file/function do I touch for
  a symptom here? which of the look-alikes, and why not the other? what
  invariant must my change respect?* Plus: ≤25 lines, zero bug references,
  links to big docs rather than copies. Any miss → rewrite.
- **Localization quiz (empirical).** Give an agent a vague-but-honest bug
  description for the area and ask "which file/function would you change,
  and what must the fix respect?" — once without the README, once with it.
  The doc is load-bearing iff the with-doc answer names the right target
  and constraints when the without-doc answer did not.

Hindsight caveat: a README written by someone who knows a specific bug can
smuggle the answer. Stick to module-intent facts (ownership, conventions,
contracts) a maintainer would write regardless; never describe any bug's
symptom or fix.
