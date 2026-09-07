# G · T3 generative media layer (#536) — Fable-5 design pre-review + build record

*2026-09-07 · the last content slice before H · generation itself is
OPERATOR-EXECUTED and pending (G-3); everything else ships now, credit-free.*

## Operator decisions

- **All 25 goals** in the first campaign · **locked "sketched Wired" style** ·
  **PDF + PNG share card** (both report artifacts) · **minimal/no text in the
  art** (×14-clean; the register badge carries the semantics).
- Approval surface: **/dev/lab-illustrations** review route (approve/reject
  per image — the per-image-approval rule made executable).
- **Operator correction (recorded):** my no-sketch deviation was wrong — the
  sketch discipline also anchors GEOMETRY, not just labels. Resolution: the
  12 geometry-bearing goals carry deterministic SVG references
  (build-lab-goal-sketches.mjs → docs/wip/essay-diagram-sources/lab-goals/);
  the 13 painterly scene goals run freestyle. Spot-checked get-to-mars
  (Hohmann tangency correct) and apollo-round-trip (free-return teardrop
  correct) by eye.

## Pre-review decisions (binding) → shipped

| # | Decision | Shipped |
|---|---|---|
| D-G1 | Register OUTSIDE FigureSpec — `Fidelity` stays 3-membered; adding 'illustration' would make the lie expressible. spec.ts untouched (frozen). | `src/lib/lab/illustration.ts` (LabIllustration type + manifest loader) + `IllustrationFigure.svelte` (the ONLY consumer; imports nothing from figure-style). Leak-proof gates: a `@ts-expect-error` type lock on the union, source-level checks that FigureRenderer and codec never reference illustration. |
| D-G2 | Attach to GOALS (narrative chrome), never cards; never serialized into ?nb=/.orrlab. | Notebook goal-header mount, goal-seeded notebooks only (restored/custom never show art — e2e-proven). Codec untouched (test-enforced). |
| D-G3 | Lab report = print-grade Notebook (+ operator-added PNG card). | `@media print` block (fidelity captions + assumptions + badge survive; chrome hidden; cards never split) + window.print() affordance; `report-card.ts` composes a 1200×630 PNG client-side ON CLICK (kernel numbers formatted-not-computed; the illustration drawn WITH its dashed badge — the honesty line survives compositing). |
| D-G4 | Assets at `static/images/lab/goals/` → precache-excluded, `orrery-images` runtime bucket, mobile-pruned wholesale, `assetUrl()` streaming — all existing mechanics, zero new rules. | Manifest-driven; `_staging/` gitignored. Mobile budget measured before AND after: **72.3 MB of 73** both times (G consumes 0 bytes by construction). |
| G-3 | Generation is structurally operator-gated: the Higgsfield MCP cannot auth in the CLI — credits are physically unspendable by the agent. | Brief: `docs/wip/2026-09-07-lab-goal-illustration-prompts.md` (25 subjects, style prefix, 12 [REF] rows + attach/geometry instruction, the full handoff loop). |

Provenance: `static/data/lab-illustration-provenance.json` (fail-closed
manifest↔provenance parity test; approving via /dev writes the record with
the operator_approved timestamp) + colophon integration
(`build-original-work.mjs` → `lab_illustrations` section, verified count 0).

## Acceptance evidence (2026-09-07)

- vitest full: **5451/5451**; coverage EXIT=0 (91.76 / 80.1 / 89.95 / 93.6 vs
  91/78/88/93 floors). svelte-check 0 errors.
- e2e both projects on the built tree: desktop 3/3 illustration + lab suites,
  mobile 13/13 (zero-asset state, PNG download with kernel numbers, custom
  notebooks art-free). One spec fix recorded honestly: my locators matched
  aria-labels, not visible text — fixed in-spec, app was correct (screenshot
  verified all affordances rendering, incl. v0.9-wip footer).
- 12 geometry sketches generated + spot-checked.

## Fable-5 holistic (post-build) — findings + resolutions

- **MAJOR-1** the per-asset alt-key ×14 chain the docs CLAIMED did not exist
  (parity gate never read the manifest — the exact #525 hole). FIXED: the
  gate now derives `allIllustrations()` altKeys, so an approved asset demands
  en-US + ×13 before it can ship.
- **MAJOR-2 — OPERATOR/DEPLOY-DAY ITEM, open:** prod-target mobile builds
  load share-card art cross-origin from `www.orrerylearn.com`, which sends NO
  `Access-Control-Allow-Origin` (verified live by the reviewer) — the
  CORS-mode load fails and cards silently compose without art on prod-target
  Capacitor builds. Web builds unaffected; taint structurally impossible.
  Fix = one nginx header on `/images/` (add to the deploy-day list).
- **MINOR-1** the reach-orbit reference sketch's insertion point floated
  OUTSIDE the orbit — the one job the sketch has. FIXED: arc now ends
  tangent ON the circle; sketch regenerated.
- **MINOR-2/3** /dev approval race + duplicate records: all buttons now
  disable during any in-flight POST; approve replaces-not-duplicates; a NEW
  reverse fail-closed test reds the build on any orphan `goals/*.webp`.
- **MINOR-4** page-level chrome (goal picker, view tablist) now print-hidden.
- **MINOR-5** download hardened for Safari (appended anchor, delayed revoke).
- m-1/m-3: report-card + illustrationFor now under the ratchet (jsdom+canvas
  unit tests — which surfaced and fixed a real never-fires-events hang:
  loadImage gains a 4s graceful-absent timeout). m-2: server-side GOALS check
  before any file move. m-4: original-work.json reverted — regenerating it
  had scooped a parallel session's uncommitted diagram entries; G ships the
  script change only, the JSON regenerates on their commit or the next build.
- Reviewer verified the leak-proof mechanism precisely: vitest strips types,
  so the @ts-expect-error union lock fires at svelte-check/tsc — which
  preflight and CI run. The gate is real.

## NOT covered / NOT verified (G exit honesty)

- **No generated art exists yet** — G-3 (your web-app Higgsfield session) and
  G-4 (staging, per-image approval, 25 alt texts ×14) are pending; the
  fail-closed gates make un-approved/un-translated art unshippable.
- Print fidelity across browsers (canvas heroes in print preview) — checked
  in Chrome-family via e2e only; Safari print is a deploy-era eyeball.
- The share-card rendering was verified by download-event e2e, not
  pixel-inspected — first real inspection happens with real art.
- Scope traps deliberately out: margin-notes prose, per-card art, OG-image
  server generation, video, new caching buckets, codec changes.
