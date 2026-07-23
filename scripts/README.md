# scripts — family map

Operational scripts, named by verb prefix; the prefix tells you the contract
before you open the file:

- **`validate-*`** — invariant guards over data/assets (allowlist discipline,
  credits bundling, …). Read-only; fail loudly. Run these before trusting a
  data change.
- **`build-*`** — derive artifacts from sources (i18n bundles, anatomy webp,
  constellation lines, audit report). Outputs are generated files; never
  hand-edit what a `build-*` script owns.
- **`audit-*`** — rule-based read-only reports (hero imagery, image MIME,
  usage). Produce findings; change nothing.
- **`fetch-*`** — pull external assets/data at build time (ADR-016).
- **`translate-*` / `check-*`** — the i18n pipeline and its verifiers
  (binding rules: docs/guides/i18n-style-guide.md, ADR-033).
- **`migrate-* / backfill-* / fill-* / prune-*`** — one-shot data surgeries
  on `static/data`. These mutate; read their header before running.
- **`__fixtures__/`** — shared test fixtures. **`__smoke__/`** — LLM/vision
  smoke probes. **`_archive/`** — retired scripts kept for reference; do not
  extend anything in there.

Conventions: tsx or .mjs, colocated `*.test.ts` where logic warrants it;
script headers cite the ADR/PRD/RFC that governs them — keep that up.
