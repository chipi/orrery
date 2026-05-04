# Contributing to Orrery

Thanks for your interest. Three areas welcome contributions, in roughly increasing complexity.

## 1. Mission data — no JavaScript required

Add a mission, correct a date, fix a payload mass. Mission data lives as plain JSON files:

- **Base file** (language-neutral facts): `static/data/missions/<dest>/<id>.json`
- **English overlay** (editorial copy): `static/data/i18n/en-US/missions/<dest>/<id>.json`
- **Index entry**: append to `static/data/missions/index.json`
- **Schema**: `static/data/schemas/mission.schema.json` — your file is validated by `npm run validate-data` and rejected if any required field is missing

A new mission is a 4-file diff. See [`docs/concept/03_Data_Catalog.md`](docs/concept/03_Data_Catalog.md) for the full schema and credit format.

**Honesty rule.** Every mission carries `data_quality: good | partial | reconstructed` and (optionally) `flight_data_quality: measured | reconstructed | sparse | unknown`. We never invent flight data; if a number isn't in a public report, the field stays absent and the UI shows `—` plus a caveat banner. Better to admit a gap than fabricate.

## 2. Translation

Adding a new locale is content-only — the i18n architecture (Paraglide-js + locale-overlay JSON) is locked in [ADR-017](docs/adr/ADR-017.md) and you don't need to touch any code.

What you'll add:

- **`messages/<code>.json`** — UI strings (~280 keys). Copy `messages/en-US.json` as a starting point, translate keys preserving `{placeholder}` syntax.
- **`static/data/i18n/<code>/`** — editorial overlays mirroring `static/data/i18n/en-US/`:
  - `missions/{mars,moon}/<id>.json` — translate `name`, `description`, `first`, `type`, `events[].label`, `events[].note`. **Keep mission ID + agency proper nouns in original.**
  - `planets/<id>.json`, `rockets/<id>.json`, `sun.json`, `scenarios/<id>.json`, `earth-objects/<id>.json`, `moon-sites/<id>.json` — same overlay pattern.
- **`project.inlang/settings.json`** — add your locale code to `languageTags`.
- **`src/lib/locale.ts`** — add an entry to `SUPPORTED_LOCALES`.

**Binding glossary.** [`docs/i18n-style-guide.md`](docs/i18n-style-guide.md) is the authority for physics + space-domain terminology in each language. Use it. If a term you need isn't in the glossary, add it (with a citation if you can) and submit the change as part of your locale PR.

**Workflow.** Per [ADR-033](docs/adr/ADR-033.md), the v0.3.x workflow is LLM-only first-pass with no native-speaker review gate. If you're a native speaker offering review for a specific language, that's high value — open an issue.

Per [ADR-031](docs/adr/ADR-031.md), language priority is: Spanish (shipped) · Mandarin · French · Japanese · German · Hindi · Portuguese-BR · Arabic · Korean · Russian · Italian. Wave 1 (Latin script) needs no font work; Wave 2 (CJK) and Wave 3 (RTL / Devanagari / Cyrillic) are gated on follow-up ADRs.

## 3. Code

Read these before opening a PR:

- [`CLAUDE.md`](CLAUDE.md) — engineering constraints + locked decisions (TypeScript strict, no `localStorage`, no `console.log` in prod, mobile-first 375 px design floor, comment policy, etc.).
- [`docs/concept/04_Technical_Architecture.md`](docs/concept/04_Technical_Architecture.md) — original architectural narrative.
- [`docs/adr/`](docs/adr/) — the locked decisions. ADR-001 through ADR-033 cover stack choice, routing, data layer, i18n, accessibility, etc.
- [`docs/uxs/`](docs/uxs/) — UX specs per screen.

### Local setup

Requirements: Node 20+, npm 10+.

```bash
git clone https://github.com/<your-fork>/orrery
cd orrery
npm install
npm run dev              # http://localhost:5273
```

### Pre-commit checks

```bash
npm run lint             # prettier + eslint
npm run check            # i18n compile + svelte-check
npm run test -- --run    # vitest unit suite (must be 560/560 green or higher)
npm run validate-data    # ajv schema + doc-system + flight-data consistency
```

Run all four before pushing — CI runs the same set on every PR. The README has a `npm run ci` shortcut that chains them.

For trajectory or arc-related work, also run:
```bash
npm run test:e2e         # Playwright e2e suite (~8 min — heavier; runs on push to main only)
```

### Commit style

Follow conventional commits with one-line scope: `feat(fly):`, `fix(missions):`, `docs(i18n):`, `ci:`, `refactor(data):`, etc. Keep the subject under 70 chars; the body explains *why*.

### Branch workflow

`main` is protected. To contribute:

1. Fork the repo.
2. Create a branch off your fork's `main`: `git checkout -b feat/my-thing`.
3. Make changes, commit, push to your fork.
4. Open a PR against `chipi/orrery:main`.
5. CI + e2e must pass; one approving review required before merge.

**The repo owner can push directly to `main`** (admin bypass on branch protection — see `.github/workflows/`); other contributors go through PR.

### What to expect from review

- Physics corrections take precedence over everything else. If a number is wrong, the fix lands fast.
- Style nits land via prettier — don't argue them; run `npm run lint -- --write`.
- Architectural changes need an ADR. If you're touching the locked decisions in [`docs/adr/`](docs/adr/), the PR should include a new ADR superseding the old one (or a draft RFC if the choice is non-obvious).
- Mobile + accessibility regressions block merge. The 375 px viewport + 44 px touch targets + ARIA labels are non-negotiable per ADR-018 + ADR-025.

## Reporting bugs

Open a GitHub issue. Include:

- Browser + OS + URL (or screenshot of `?lang=...&mission=...` query params)
- Steps to reproduce
- What you saw vs what you expected
- Console output if any errors

Translation issues are bugs — if a Spanish term reads wrong, that's a glossary fix. File it.

## Code of conduct

Be kind. The project is small enough that there's no formal CoC document; the implicit one is "behave like an adult and assume good faith". If something feels wrong, email the maintainer (see commit log).

## License

By contributing, you agree your contributions are licensed under the MIT License (see [`LICENSE`](LICENSE)). Mission imagery, agency logos, and scientific data remain the property of their respective owners.
