# D · INFRA-lab-api (#533) — Fable-5 design pre-review + build record

*2026-09-02 · consumes: docs/wip/2026-09-01-infra-auth-spike.md (option zero) ·
RFC-037 A01.7/A01.8 · feeds slices E (#534) and F (#535)*

The Fable-5 design pre-review ran 2026-09-02 before any code (standing
protocol step 0). This doc records its binding decisions and the build's
conformance. Operator decisions (AskUserQuestion, 2026-09-02): allowlist
bootstrap = marko.dragoljevic@gmail.com; port 8093 + ADR-114 amendment
prepared for review; `jose` promoted to a direct dep (approved); both spike
deviations approved.

## Pre-review decisions (binding) → what shipped

| # | Decision | Shipped |
|---|---|---|
| 1 | **Port 8093**, not the plan's 8092 — ADR-114 (podcast repo) shows 8092 = podcast player's own OAuth AS; 8093 was the reserved slot. 8091 has a doc conflict (orrery mcp vs "gi/kg viewer"). | Compose + Dockerfile + vhost all on 8093. ADR-114 table amendment PREPARED as an uncommitted working-tree edit in `~/Projects/podcast_scraper-infra` — operator reviews + pushes. Live `ss -tlnp` verify = deploy-day step (SSH probe from here was correctly permission-blocked). |
| 2 | Hand-rolled endpoints on `node:http` (mirror `server/mcp/index.ts`), no Express/Hono. JWT/JWKS via `jose` (already vendored by the MCP SDK), never hand-rolled crypto. | `as.ts` + `index.ts` raw-http; `tokens.ts` on jose. `jose@^6.2.10` direct dep landed earlier (commit 0eb2dfd06a) with operator approval. |
| 3 | ES256 access JWTs (1 h, aud = RFC 8707 resource, iss from `LAB_ISSUER` env — never Host header). Opaque rotating refresh tokens, stored hashed; **refresh grant re-checks the allowlist every use** (the revocation lever). | `tokens.ts` + `as.ts` refreshGrant. Tested incl. rotation, replay, de-allowlist revocation. |
| 4 | Storage: NO SQLite. Pending auths (10 min) + auth codes (60 s, single-use) in-memory; keypair + refresh tokens in a JSON state file on the bind-mounted volume, atomic tmp+rename. | `tokens.ts` state file; `as.ts` in-memory maps with GC. /jwks stable across restarts (tested). |
| 5 | PKCE via server-side pending record keyed by our high-entropy `state` nonce — the verifier never transits the Google hop. `/token` checks S256(verifier), exact redirect_uri, resource→aud. | `as.ts` authorize/googleCallback/codeGrant. |
| 6 | Spike deviation 1 (operator-approved): no `access_type=offline`, no Google refresh-token custody. | `google.ts` requests `scope=openid email` only. |
| 7 | Spike deviation 2 (operator-approved): do NOT advertise `client_id_metadata_document_supported` until CIMD exists. | Metadata omits it; integration test asserts the absence. |
| 8 | Google id_token VERIFIED against Google's JWKS (`createRemoteJWKSet`), not just decoded. | `google.ts` exchangeGoogleCode. |
| 9 | Allowlist = JSON file, re-read every check, case-folded, **fail-closed** (missing/malformed → deny all + loud log). No admin endpoint (scope trap). | `allowlist.ts`. |
| 10 | Zero cookies anywhere → CSRF dissolves. Two static clients: `claude-ai` (confidential, redirect `https://claude.ai/api/mcp/auth_callback`, scope physics:read) and `orrery-lab-web` (public, PKCE-only, scope physics:ask). CORS exact-origin, no Allow-Credentials. | `index.ts` staticClients + `cors.ts`. |
| 11 | /ask = direct kernel import (NOT MCP loopback): `deriveTools` schemas double as the LLM function-calling schema; kernel computes, LLM narrates; validate-REJECT errors go back to the LLM verbatim. NOT gated to the transfer domain (that's an MCP-surface staging gate). | `ask.ts`. Contract: `{question, locale?}` → `{answer, toolCalls[], model, requestId}`; 401/403/429/502 `llm_unavailable`. Non-streaming (SSE = F option). |
| 12 | Ops clones the mcp pattern file-for-file. | `scripts/build-lab-api-server.mjs`, `Dockerfile.lab-api`, compose `lab-api` service (127.0.0.1:8093, state volume), `ops/caddy/orrery-lab-api.caddy`, ci.yml `lab-api-image` job (`needs: ci`, cold build + curl round-trip + GHCR publish on main). |
| 13 | Fail-closed prod startup: refuse to boot without `LAB_GOOGLE_CLIENT_ID/SECRET` + `LAB_CLAUDE_CLIENT_SECRET`. | `index.ts` assertProductionConfig, called from `main.ts`. |

## Acceptance evidence (2026-09-02)

- `npx vitest run server/lab-api/` → **30 passed (30)**: tokens 11 (keypair
  persistence, aud binding, foreign-key rejection, TTL, hashed refresh,
  restart survival) · integration 14 (full mock-IdP chain: /authorize →
  stub-Google → callback → /token; PKCE-wrong-verifier, code replay, state
  replay, unregistered redirect_uri → 400-not-redirect, bad client_secret,
  invalid_target, non-allowlisted → access_denied with NO code,
  refresh-after-de-allowlist revoked, /ask 401/wrong-aud-401/403, RFC 9207
  `iss` echo, metadata shape both well-known paths) · ask 5 (kernel result ==
  direct `callTool` output, REJECT fed back to LLM, no-tool answer, LLM-down
  → 502 class, round-budget honesty).
- `npm run lab-api:build` → dist-lab-api/server.mjs 310.9 kB; bundle smoked
  live on :18093 — /health ok, RFC 8414 metadata correct, bad client_id → 400,
  /ask no-bearer → 401, /jwks serves the EC key (the exact CI round-trip).
- `npx tsc -p tsconfig.scripts.json` clean; `npx eslint --no-cache
  server/lab-api/` clean.

## Fable-5 holistic review (post-build, 2026-09-02) — findings + resolutions

All fixed in-slice unless noted; suite grew 30 → 40 tests.

- **MAJOR-1** `email_verified` never checked on the Google id_token — the
  OIDC-federation account-takeover class (unverified non-Gmail accounts).
  FIXED: `google.ts` requires `email_verified === true`, fail-closed; stub-IdP
  negative test added.
- **MAJOR-2** rate limiter keyed on `remoteAddress` = one global bucket behind
  loopback Caddy; `windows` map unbounded; healthcheck shared the bucket.
  FIXED: keyed on first X-Forwarded-For hop (trusted — only loopback Caddy
  reaches the port), map pruned past 10k keys, `/health` exempt; dedicated
  limiter tests (XFF bucketing, 429, health exemption).
- **MAJOR-3** no request-body size cap (edge Caddyfile has none either).
  FIXED: 64 KB hard cap in `readBody` → 413; tested.
- **MINOR-1** resources were AS-global — the SPA could mint aud=mcp tokens
  that would pass an iss+aud-only check in #534. FIXED: per-client `resources`
  on StaticClient (claude-ai → mcp only, SPA → lab-api only); tested.
- **MINOR-2** refresh rotation has no theft-detection family revocation
  (replay of a rotated token ≠ revoke successors). **ACCEPTED TRADE-OFF** for
  the 6-account beta: the allowlist lever + 1 h aud-bound tokens bound the
  damage; revisit in E's threat review if wanted (~15 lines).
- **MINOR-3** no LLM timeout/concurrency cap. FIXED: 60 s AbortSignal +
  LAB_ASK_MAX_CONCURRENT (default 4) → 503 busy.
- **MINOR-4** first-boot EACCES crash-loop on root-owned state dir; state file
  0644 with the private key. FIXED: compose deploy note (chown before first
  boot) + state written 0600.
- **MINOR-5** localhost redirect URIs + CORS origins shipped in prod defaults;
  compose had no override path. FIXED: localhost gated on
  NODE_ENV !== production; LAB_WEB_REDIRECT_URIS / LAB_CORS_ORIGINS /
  LAB_RATE_LIMIT_PER_MIN / LAB_ASK_MAX_CONCURRENT wired through compose.
- **MINOR-6** cors/assertProductionConfig untested; coverage gate not yet run.
  FIXED: http.test.ts (CORS allow/deny/preflight, prod-gate throw/no-throw);
  coverage gate run pre-push (evidence below).
- **MINOR-7** integration suite shared the limiter bucket → latent 429 flake.
  FIXED: suite raises LAB_RATE_LIMIT_PER_MIN; limiter got its own tests.
- Nits m-1..m-6 all taken: JSON content-types on 429/500/413, `invalid_target`
  per RFC 8707 (both /authorize + /token), OIDC-required metadata keys
  (`subject_types_supported`, `id_token_signing_alg_values_supported`), 10 s
  Google-fetch timeout, LITELLM_API_KEY deploy note, CI container cleanup
  traps (lab-api AND the sibling mcp job — adjacent-issue sweep).

## NOT covered / NOT verified (D exit honesty)

- **Real Google OAuth**: nothing here touched accounts.google.com. Google
  Cloud console client + redirect URI + test users = operator action at E
  start (tracked on #534).
- **Live VPS port table** (`ss -tlnp`) — SSH from this session is
  permission-gated; deploy-day check.
- **Container→LiteLLM tailnet reach** — spike proved host-level reach only;
  compose carries the IP-form default + the deploy note.
- **Claude.ai connector end-to-end** — explicitly E's acceptance, not D's.
- **Deployment itself** — image publishes to GHCR on main-push; `up -d
  lab-api` + secrets staging + DNS + caddy drop-in are operator/deploy-day
  actions (fail-closed notes in compose).
- **CIMD, DCR, allowlist admin UI, SSE streaming, key rotation** — scope
  traps, deliberately out (pre-review G).
