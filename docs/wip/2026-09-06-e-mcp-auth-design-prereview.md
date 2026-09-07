# E · MCP-auth (#534) — Fable-5 design pre-review + build record

*2026-09-06 · consumes: docs/wip/2026-09-01-infra-auth-spike.md +
docs/wip/2026-09-02-d-lab-api-design-prereview.md · feeds: F (#535), H (#464)*

The Fable-5 design pre-review ran before code (standing protocol step 0) and
returned a binding 8-item build order with four headline findings. This doc
records them and the build's conformance.

## Pre-review findings → what shipped

| # | Finding / decision | Shipped |
|---|---|---|
| F1 | **Resource-identifier dual-form** is the top acceptance risk: an RFC 9728 client derives the identifier from the connector URL (`…/mcp` path form); origin-form is also plausible. Accept BOTH end-to-end. | lab-api registers `[mcp, mcp/mcp]` for claude-ai; PRM served at BOTH well-known paths with exactly-matching `resource` values; verification accepts a 2-element aud set. Tested at every layer. |
| F2 | Bind-mounting lab-api's state file for JWKS **rejected on security grounds** — it contains the private signing key; the resource server must only VERIFY. | Network JWKS fetch only (`server/mcp/auth.ts`, jose `createRemoteJWKSet`, default 10-min cache / 30-s kid-miss cooldown, no extra caching). |
| F3 | The two containers share the compose default bridge — service DNS works. | `MCP_JWKS_URL=http://lab-api:8093/jwks` in compose; fetch URL deliberately decoupled from the public `iss`. |
| F4 | Dev bearer: **non-prod-only + production refuses to start if it IS set** (inverting the S4 gate). No prod dual-accept — nothing is deployed, no one holds the bearer, a backdoor would have zero legitimate users. | `bearerMatches` dead in production; startup throws on a set `MCP_DEV_BEARER` under production; compose no longer passes it; guards.test proves both the throw and the clean no-bearer production boot. |

Build order conformance: (1) `server/mcp/auth.ts` verifier (ES256 pin, iss +
dual-aud + scope-as-list, RFC 6750 invalid_token/insufficient_scope split,
fail-closed cold / jose-cache grace warm); (2) `index.ts` gate swap + PRM
routes (public, GET) + WWW-Authenticate builder (error attr omitted when no
token per RFC 6750 §3, `scope=` on 403) + rate limiter rekeyed to JWT `sub`
(bounded by allowlist cardinality); (3) lab-api dual resources; (4) compose
env swap + `depends_on` + deploy notes rewritten for the inverted gate;
(5) tests below; (7) mcp-image CI job now mints real ES256 JWTs
(`scripts/mint-ci-jwt.mjs`, jose only) against a runner-local JWKS and
asserts PRM both forms + 401-with-pointer + wrong-aud 401 + valid-JWT
initialize — NODE_ENV=production in the image means the dev bearer CANNOT
pass this job (the inverted gate is itself under test).

## Acceptance evidence (2026-09-06)

- `npx vitest run server/` → **83 passed** before the lab-api path-form test,
  84 after: auth.test.ts (11 — cross-slice contract: stub JWKS serves a REAL
  `TokenCore.jwks()` and tokens are minted by that same core; negative matrix
  = SPA-token aud, wrong iss, expired, foreign-key-same-kid, unknown-kid,
  HS256 alg-confusion, garbage, wrong scope → insufficient_scope; warm-cache
  outage grace asserted as intended behavior), server.test.ts E block (PRM
  exact documents both forms, 401-no-error-attr, 401-invalid_token,
  403-insufficient_scope with scope named, real-JWT full SDK round-trip,
  path-form aud opens the door), guards.test.ts (production throws WITH
  bearer; boots clean without; dev bearer dead at request level).
- Bundled-artifact smoke (`npm run mcp:build` → `NODE_ENV=production node
  dist-mcp/server.mjs` + minted JWTs): health ok, PRM correct, no-token 401,
  wrong-aud 401, valid JWT → `initialize` → `"orrery-physics"` — the exact CI
  assertions, locally green.

## Protocol step 5 — full e2e both projects (recorded 2026-09-06, with the
full-arc-review fix batch on the tree): `npx playwright test --workers=1`
desktop-chromium **670 passed / 1 flaky-retried-green (36.2m)**,
mobile-chromium **525 passed / 1 flaky-retried-green (16.6m)**, EXIT=0.

## Operator-decision log

- Dev-bearer posture: pre-review recommendation adopted (non-prod-only +
  prod-refuses-if-set).
- MINOR-2 (refresh-token family revocation): stays the accepted D trade-off —
  E's threat review re-examined; the dual-aud does not widen it.
- LiteLLM key: struck from E's operator checklist (operator question
  2026-09-06) — it serves only /ask (slice F); lab-api boots green without it
  and /ask 502s honestly.

## Operator checklist state

- Google OAuth client ✓ (web client, exact redirect URI verified in
  ~/secrets JSON) · DNS both subdomains ✓ (Cloudflare-proxied like the apex)
  · ADR-114 amendment pushed ✓ (podcast repo cb5d231e6) · Claude connector
  secret generated ✓ (~/secrets/orrery-lab-claude-client.json, 0600).
- Remaining = deploy-day: stage `ORRERY_LAB_*` in /srv/orrery/.env, chown
  ./lab-api-state, seed allowlist.json, caddy drop-ins both vhosts,
  `up -d lab-api mcp`, container→LiteLLM curl (F), WWW-Authenticate-through-
  Caddy check, then the REAL acceptance: claude.ai custom connector →
  `https://mcp.orrerylearn.com/mcp` + client `claude-ai` + the staged secret.

## Fable-5 holistic review (post-build, 2026-09-06) — findings + resolutions

**0 MAJOR.** The reviewer hunted every bypass class (transport reachability,
WWW-Authenticate injection, dev/JWT coexistence, aud widening, limiter
unboundedness, JWKS fetch amplification — read jose's remote.js directly:
unknown-kid spam caps at 2 fetches/min vs the 120/min bucket) and each closed.

- **MINOR-1** two negative tests were vacuous (foreign key made wrong-iss and
  expired indistinguishable from signature failure). FIXED: both now sign with
  lab-api's REAL private key read from the test-owned state file — iss/exp are
  genuinely the rejecting checks.
- **MINOR-2** the request-level production kill-switch branch was untested.
  FIXED: a guards test boots with the bearer under test env, proves it works,
  flips NODE_ENV=production (read per-request), and proves the same bearer
  dies.
- **MINOR-3** lab-api's XFF-first-hop rate-limit key is safe only if the Caddy
  edge strips/replaces client XFF (Caddy ≥2.5 default; `hardened` snippet
  unread). PROMOTED to the deploy-day checklist: curl with a forged
  X-Forwarded-For through the vhost and confirm lab-api sees the real client.
- Nits: Dockerfile.mcp run example de-beaered (m-1); RFC 7235 case-insensitive
  bearer scheme both doors (m-2); `typ: at+jwt` noted-not-taken (m-3 — D mint
  untouched by design); setup-node pins converged (m-4); /health tool-count
  leak + unmetered invalid-token spam accepted with the deploy note that Caddy
  `hardened` is the only pre-auth throttle (m-5/m-6).

## NOT covered / NOT verified (E exit honesty)

- **Real Google + real Claude.ai**: nothing here touched either. The
  connector end-to-end IS E's acceptance and remains open until deploy day.
- **Which resource form Claude.ai actually sends** — unverified; the
  dual-form design makes both work, and the first live attempt will surface
  the actual string in lab-api logs.
- **Caddy edge passthrough of WWW-Authenticate** — deploy-day check (the
  `hardened` snippet lives in the podcast repo; unread by E).
- **Key rotation, token introspection, CIMD, DCR** — scope traps, out by
  design (pre-review).
- The live deploy itself: images publish to GHCR on main-push; `up -d` is
  operator-gated deploy-day work.
