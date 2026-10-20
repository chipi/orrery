# Security Review Playbook

Reusable runbook for the periodic security review of Orrery. First produced for GH #96 (v0.7.0 cycle, 2026-05-29). Run end-of-cycle, before major releases, or any time the surface area materially changes (new server route, new external data source, new third-party script, new deploy target).

## Threat model (recompute each review)

Orrery is a **public-facing educational web app**: a static SvelteKit bundle (nginx), plus since v0.9 two Node servers behind Caddy on the VPS — **lab-api** (an OAuth 2.1 authorization server with Google sign-in, an allowlist, refresh tokens, and the Ask route that spends LLM budget through LiteLLM) and the **MCP server** (JWT-gated tools at mcp.orrerylearn.com). No payments. The only accounts are allowlisted Lab users (the operator during the beta), so sign-in emails and refresh tokens are now PII/credentials in scope. The audit must re-check these facts before applying this playbook — if any of them change, expand the threat model accordingly.

Server surfaces (added in the 2026-10-16 review, #593): OAuth/DCR flows and redirect handling, the allowlist on every spending route, rate limiting and its client key, request/compute bounds, LLM tool use and output rendering, container exposure (published ports, user, capabilities), and server-side telemetry (logs, GlitchTip, Langfuse, Umami server events). The shared Caddy `hardened` snippet and the edge config live in the podcast_scraper repo — review them there or list them under "not checked".

Default-applicable threat surfaces:
- **Supply chain** — npm deps + GH Actions third-party actions
- **Build-time data ingress** — agency/CDN URLs fetched during build
- **Client XSS** — `{@html}`, dynamic SVG, image src from JSON
- **Telemetry leak** — Sentry / RUM accidentally capturing PII
- **Deploy pipeline** — secrets handling, SSH/Tailnet config, container env
- **CSP / headers** — defense-in-depth posture at nginx
- **Pre-commit / pre-push gates** — secret scanners, data validation

## How to run the review

### Step 0 — Establish trust baseline
1. Confirm `main` is clean: `git status`, `git log --oneline -10`.
2. Confirm milestone scope (e.g. v0.7.0 milestone open issues).
3. Re-read the threat-model assumptions above. Any of them now false? If yes, expand scope before continuing.

### Step 1 — Empirical scan (parallel)

Run these in parallel — they are independent and each takes minutes:

```bash
# A. Dependency vulnerabilities — what's currently shipping
npm audit --json > /tmp/orrery-npm-audit.json
jq '{summary: .metadata.vulnerabilities, advisories: [.vulnerabilities | to_entries[] | {pkg: .key, severity: .value.severity, via: (.value.via | if type=="array" then map(if type=="object" then .title else . end) else [.] end), range: .value.range, fixAvailable: .value.fixAvailable}]}' /tmp/orrery-npm-audit.json

# B. Committed secrets / hardcoded credentials
find . -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*"
grep -rEn "sk_live|pk_live|AKIA|ghp_[A-Za-z0-9]{36}|glpat-|xoxb-|Bearer [A-Za-z0-9]{20,}" \
  --include="*.ts" --include="*.js" --include="*.svelte" --include="*.json" \
  --include="*.yaml" --include="*.yml" --include="*.toml" \
  --exclude-dir=node_modules --exclude-dir=.git .

# C. Unpinned third-party GH Actions
grep -nE "uses: [^@]+@(main|master|v[0-9]+(\.[0-9]+)?|[a-z]+)$" .github/workflows/*.yml

# D. pull_request_target footguns
grep -l "pull_request_target" .github/workflows/*.yml
```

Then dispatch an Explore agent for the structured 12-area sweep below. The agent must cite `file:line` for every claim — no "appears to" / "looks like".

### Step 2 — The 12 areas (Explore agent prompt template)

For each area: gather evidence, then grade `✓ safe | ⚠ partial | ✗ broken | N/A`.

1. **Server-side runtime surface** — which adapter (`svelte.config.js`)? Any `+server.ts`, `+page.server.ts`, `+layout.server.ts`, `hooks.server.ts`? Any form `actions = {}` handlers?
2. **XSS surface** — every `{@html}` in `src/**/*.svelte`: where does the HTML come from (static i18n / build-time JSON / external feed / user input)? Any `innerHTML =`, `document.write`, dynamic SVG construction, externally-sourced `<img src>`?
3. **Dependencies** — `package.json` + lock committed? Any postinstall scripts in deps (`npm ls --long | grep postinstall` or scan `node_modules/*/package.json`)? Cross-check installed versions against `npm audit` advisories from Step 1.
4. **CSP and security headers** — `app.html` meta CSP? `hooks.server.ts` setting headers? `svelte.config.js` `csp:` block? Reverse-proxy config (nginx in `docs/ops/`)? Sub-resource Integrity on third-party `<script>` / `<link>`?
5. **Secrets and env handling** — every `process.env.X`, `$env/static/private`, `$env/dynamic/private`, `$env/static/public`, `$env/dynamic/public`. Private vars must not leak into the browser bundle. `PUBLIC_*` vars are baked at build time.
6. **GitHub Actions** — for each workflow: triggers (esp. `pull_request_target`, and `workflow_run` — its `branches:` filter matches the triggering run's head_branch, which for a fork PR is the fork's branch name; guard on `workflow_run.event == 'push'` + `head_repository`), `permissions:` block scope, interpolation of `github.event.*` fields (issue title, PR body, branch name) inside `run:` scripts via the GHA template syntax (workflow injection risk), third-party actions pinned to SHA vs tag, secrets accessed in jobs that also check out PR-controlled code.
7. **Service worker** — registered scope, what's precached (`globPatterns`, `globIgnores`), `maximumFileSizeToCacheInBytes`, runtime caching strategy per route, `registerType` (`autoUpdate` vs `prompt`), update-check cadence. Does it intercept POSTs?
8. **Deploy pipeline** — Hetzner deploy workflow + script. SSH key written at mode 600? Host key in `known_hosts`? `.env` staged atomically (mktemp → scp → mv)? Container env passed only via env file (no `--env` on cmdline that ends up in `ps`)? Tailscale ACL tag scope? Rollback story?
9. **Telemetry / privacy** — Sentry: `beforeSend` scrubs URLs/headers/cookies? `sendDefaultPii: false`? Replay disabled? Analytics: production-only host check? Cookies: enumerate every `Set-Cookie` / `document.cookie`. localStorage / sessionStorage usage (project rule: forbidden — verify).
10. **Data integrity** — image / data fetch scripts: live fetch at build time vs pinned. Image-provenance manifest signed or checksum-only? `validate-data` gate covering all data classes? `check-no-secrets` gate covering all credential patterns?
11. **Authentication / authorization** — confirm no `/login`, no `/admin`, no `auth`, no `password`, no `session`, no `jwt` matches in `src/`. Confirm no user accounts in any data file.
12. **Existing security testing** — Dependabot config? CodeQL? Snyk? axe-core gate? Per-PR `npm audit` step?

### Step 3 — Reconcile agent output with `npm audit`

The agent reads `package.json` versions, not the actually-resolved tree. **Always reconcile**:
- A pinned-old SvelteKit / Vite / esbuild can still have outstanding advisories even when the project is static.
- A "static site" doesn't immunize against client-side reactive patterns (e.g. `searchParams` XSS advisories apply to client-side subscribers, not only to server routes).
- Transitive deps (e.g. `tar` under `gdal-async`) won't show in top-level `package.json`.

If `npm audit` reports anything `high` or `critical`, treat as a finding regardless of the agent's verdict.

### Step 4 — Rank findings

Per-finding scoring: `priority = likelihood × impact_in_orrery_context`. Bucket into:

- **Critical** — exploitable now, ship before next deploy
- **High** — meaningful vuln, ship within the current milestone
- **Medium** — defense-in-depth or moderate-severity, schedule for next cycle
- **Low** — hardening, opportunistic
- **Defer** — known, accepted, documented

Be honest: a `high`-severity npm advisory that requires a server runtime Orrery doesn't have is NOT `high` in our context — re-classify with rationale.

### Step 5 — Action plan

For each Critical/High item:
- File path or workflow to edit
- Specific change ("bump @sveltejs/kit ^2.10.1 → ^2.61.1, run `npm run preflight`, run full e2e on both projects")
- Verification step
- Test gate that proves it shipped

For Medium/Low: a one-line TODO under `docs/wip/security-followups.md` (create if missing).

### Step 6 — Document outcome

Comment on the security-review GH issue with:
- Date of review
- Scope (which commit SHA reviewed)
- Top findings (Critical/High)
- Resolution path (PR refs / commit refs)

Do not close the umbrella issue automatically; security review is a recurring milestone activity.

## Per-review checklist (copy-paste)

```
- [ ] Threat-model assumptions still true (no auth, no PII, no payments)
- [ ] npm audit run + reconciled with package.json versions
- [ ] All 12 areas swept with file:line evidence
- [ ] Workflow injection (github.event.*) audited
- [ ] Pinned-action audit (sha vs tag) audited
- [ ] Secrets-handling sample sanity-check on the latest deploy workflow run
- [ ] Top-risk list ranked Critical → Defer
- [ ] Action plan filed (PR or follow-up issues)
- [ ] GH issue commented with review record
```

## Limits of this playbook

- **Not a pen-test.** No live probing of deployed surface (Hetzner / GH Pages). Code-and-config only.
- **No legal/compliance review.** GDPR / CCPA text and policy live elsewhere.
- **No human-process audit.** Insider risk, credential rotation cadence, off-boarding — separate review.
- **Snapshot in time.** Catches latent issues in the reviewed SHA; doesn't catch what lands after.

## Trigger cadence

- End of every minor version cycle (v0.X.0 → v0.X+1.0)
- Before cutting a major release
- After landing any of: new server adapter, new third-party script, new deploy target, new external data source, new secret class

## Accepted dependency risks

`npm audit` on 2026-10-20 (#591), after the `replace` → `minimatch@3.1.5` override: 2 critical,
16 high. Every remaining critical/high finding is in build or authoring tooling, none in the
shipped app or the API servers. Re-check each release; remove a row when its fix lands.

| Package (path) | Advisories | Why accepted | Revisit when |
|---|---|---|---|
| `tar` 6.2.1 (`@capacitor/assets` → its bundled `@capacitor/cli@5.7.8`) | GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97 (path traversal / overwrite on extraction) | Dev-only icon/splash generator. That old CLI uses `tar` only in `add` / `update` / `migrate` template extraction, which `@capacitor/assets` never calls. No archive we extract comes from outside. | `@capacitor/assets` ships with `@capacitor/cli` ≥ 8.0.2 |
| `tar` 7.5.9 (bundled inside `gdal-async`) | same | A bundled copy can't be overridden. `gdal-async` runs only in local raster-processing scripts on files we produce. | a `gdal-async` release with `tar` ≥ 7.5.21 |
| `vite` 5.4.21 (`vitepress@1.6.4`) | path traversal in optimized-deps `.map`, `launch-editor` UNC (Windows) | The docs site builder: runs locally and in CI, never serves users. The app itself is on vite 8. | vitepress 2 stable |
| `sharp` < 0.35 (`@capacitor/assets`, image scripts) | inherited libvips / libheif CVEs | Build-time image processing of our own masters. The fix needs sharp 0.35, which is tracked in the licence-gate issue. | sharp 0.35 adopted |

Resolved since the 2026-10-16 audit: the `@sveltejs/kit` Accept-header ReDoS (GHSA-29g2-3rmr-qm68)
no longer reports at 2.70.3, and `handlebars` no longer appears.

---

*docs/ops/security-review-playbook.md — born from GH #96 review on 2026-05-29. Update each cycle with what worked / what missed.*
