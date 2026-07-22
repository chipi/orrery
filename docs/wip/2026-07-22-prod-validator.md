# Prod deployment validator — `scripts/validate-prod.mjs`

`npm run validate-prod` — a detailed, repeatable, browser-based validator for a
live Orrery deployment. Elevated from the ad-hoc post-deploy spot-checks used to
verify the 2026-07-22 prod fixes; those one-off Playwright snippets are now a
tracked tool with structured pass/fail output, a machine-readable report, and a
non-zero exit on failure.

## Run it

```sh
npm run validate-prod                                   # → https://www.orrerylearn.com
VALIDATE_URL=http://127.0.0.1:4173 npm run validate-prod # local vite preview
VALIDATE_URL=https://<staging> npm run validate-prod     # any target
VALIDATE_JSON=/tmp/report.json npm run validate-prod     # + machine report
```

Exit code: **0** when every non-warn check passes, **1** on any FAIL. WARN checks
(environment-conditional — e.g. error-monitoring off on a DSN-less build) are
surfaced but never fail the run.

## Why a real browser (not curl)

The load-bearing checks only exist in a page context: console/page errors, CSP
**violations**, the service-worker navigate-fallback, locale-switch **rendered
content** (not just the URL), and a **real error POSTing** to the telemetry edge.
A curl/header check would have passed while the site was actually broken — which
is exactly how three of the 2026-07-22 bugs hid (edge/CORS tests green, page
context broken).

## What it asserts (8 suites, ~60 checks)

1. **headers** — reachable; HSTS / X-Content-Type-Options / X-Frame-Options /
   Referrer-Policy / CSP present; and the exact CSP directives the fixes need
   (`frame-src` youtube, `connect-src` telemetry.orrerylearn.com, `media-src`).
2. **pwa** — `/sw.js` served; **`navigateFallback = /404.html`** (not home);
   `/_app/env.js` served.
3. **routes** — every top-level route (mirrors `svelte.config.js` SEED_ROUTES) →
   2xx, no page errors, no unexpected 4xx.
4. **deep-routes** — `/programs/<id>`, a `/science/<tab>/<section>`, `?id=` and
   `?site=` query routes.
5. **i18n-routes** — a locale × route sample (de/ja/fr/ru/zh-CN) serves its OWN
   page, not the home fallback.
6. **data** — `/data/i18n/*.json` bundles served (the VPS `/data`-overlay seed).
7. **regression-guards** — one guard per prod bug fixed 2026-07-22, so they can't
   silently return:
   - programs page renders real content (VPS `/data` overlay).
   - gallery video mounts a YouTube iframe (CSP `frame-src`).
   - locale switch stays on the route with its content (PWA neutral shell).
   - error monitoring: DSN valid + connect allowed + a **real error POSTs 200**
     to GlitchTip project 4 (CSP `connect-src` + the dashless-key DSN).
   - `/moon` fires **no** route-patches 404 (the `has_route_patches` fetch gate).
8. **interactions** — mobile home+nav, mobile `/explore` 3D canvas, missions
   `?q=` search filters.

## Extending

Add a `record(name, ok, detail, {warn})` call inside the relevant `suite(...)`
block. Keep the route inventory (`TOP_ROUTES`) in sync with `svelte.config.js`
SEED_ROUTES when routes are added. Every new prod-fix should land its own
regression guard here in the same change.

## Relationship to the other gates

- `npm run preflight` / CI — typecheck/lint/unit/build; never touches a live URL.
- `docker-e2e` — Playwright against a `vite preview` of the built bundle
  (localhost), on amd64 software-GL; the pre-merge correctness gate.
- **`validate-prod`** — the only gate that exercises the **live deployment** end
  to end (VPS serving layer: nginx CSP + headers, the `/data` overlay, the
  service worker, real telemetry). Run it **after every prod deploy**. Candidate
  follow-up: wire it as a post-`deploy-prod` smoke step (currently manual).
