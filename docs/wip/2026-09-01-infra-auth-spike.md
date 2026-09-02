# INFRA-auth-spike — MCP OAuth 2.1 + Google-IdP + lab-api authorization server

*2026-09-01 · feeds: D17 (D and E slices — INFRA-lab-api + MCP-auth)*

---

## TL;DR — recommended architecture (D17 decision input)

**Option Zero works. DCR is not required.**

The MCP spec (2025-11-25 stable) downgraded DCR from SHOULD to MAY and explicitly
deprecated it in favour of Client ID Metadata Documents (CIMD). Claude.ai custom
connectors support static pre-registered `client_id`/`client_secret` today.

Recommended architecture: **own minimal AS in `lab-api`, federating to Google OIDC,
with a statically pre-registered client for Claude.ai.** No DCR endpoint needed for
the ~6-account gated beta, nor for Claude.ai's CIMD path post-beta.

The AS is not large: five endpoints + two JSON metadata documents. `@modelcontextprotocol/sdk`
handles the resource-server side; the AS is plain Express/Hono middleware.

---

## 1 · Current MCP authorization spec

**Source:** modelcontextprotocol.io — spec version 2025-11-25 (stable) and draft
(accessed 2026-09-01). Both in agreement on the points below.

### What is required

| # | Requirement | Level |
|---|---|---|
| 1 | OAuth 2.1 (draft-ietf-oauth-v2-1-13) + PKCE S256 | MUST |
| 2 | RFC 9728 Protected Resource Metadata at `/.well-known/oauth-protected-resource` | MUST (MCP server) |
| 3 | RFC 8414 or OIDC Discovery at `/.well-known/oauth-authorization-server` or `/.well-known/openid-configuration` | MUST (AS, at least one) |
| 4 | RFC 8707 `resource` parameter in auth + token requests | MUST (client sends it; AS validates audience) |
| 5 | Bearer token on every HTTP request (`Authorization: Bearer …`) | MUST |
| 6 | Token audience validation — server rejects tokens not issued for it | MUST |
| 7 | HTTPS on all AS endpoints; redirect URIs HTTPS or localhost | MUST |
| 8 | PKCE (`code_challenge_methods_supported` in metadata) | MUST; client refuses if absent |
| 9 | `code_challenge_methods_supported` in OIDC metadata | MUST (for OIDC discovery path) |

### Client registration — DCR status

- **DCR (RFC 7591) — MAY, deprecated.** The 2025-11-25 spec carries a formal
  deprecation warning: *"retained for backwards compatibility … new implementations
  should use Client ID Metadata Documents instead."* The March 2025 spec said SHOULD;
  November 2025 dropped to MAY + deprecated it. Source:
  https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization

- **Client ID Metadata Documents (CIMD) — SHOULD.** AS and client SHOULD support it.
  Claude.ai advertises CIMD support via `client_id_metadata_document_supported: true`.
  The client uses a self-hosted HTTPS URL as `client_id`; AS fetches it to validate
  redirect URIs. No `/register` endpoint needed.

- **Pre-registration (static client_id) — SHOULD (client-side option).** Spec says:
  *"MCP clients SHOULD support an option for static client credentials such as those
  supplied by a pre-registration flow."* Priority order: pre-registered creds > CIMD >
  DCR > user-entered.

### RFC 9728 Protected Resource Metadata

MCP server (the resource server) MUST serve at
`/.well-known/oauth-protected-resource`:

```json
{
  "resource": "https://mcp.orrerylearn.com",
  "authorization_servers": ["https://lab-api.orrerylearn.com"],
  "bearer_methods_supported": ["header"],
  "scopes_supported": ["physics:read"]
}
```

And on 401 responses:
```
WWW-Authenticate: Bearer resource_metadata="https://mcp.orrerylearn.com/.well-known/oauth-protected-resource", scope="physics:read"
```

### RFC 8707 resource indicators

Client MUST send `resource=https://mcp.orrerylearn.com` in both the authorization
request and the token request. The AS MUST bind the issued token to that audience and
the MCP server MUST reject tokens whose audience doesn't match.

### What changed in 2025

- **Mar 2025 (2025-03-26):** DCR was SHOULD. No CIMD. RFC 9728 added.
- **Nov 2025 (2025-11-25):** DCR deprecated to MAY. CIMD added as the SHOULD path.
  RFC 9207 (`iss` in auth response) added as SHOULD (likely MUST in future). RFC 8707
  `resource` param made MUST for clients.

---

## 2 · Option Zero evaluation — own minimal AS, static client for Claude.ai

**Question:** does a statically pre-registered client for Claude.ai, with `lab-api`
acting as AS federating to Google, satisfy the current MCP spec + Claude.ai connector
flow WITHOUT DCR?

**Answer: Yes.**

### Claude.ai connector flow with static credentials

Claude.ai custom connectors (accessed via claude.ai admin settings → connectors →
"Add custom connector" → "Advanced settings") accept:

- OAuth Client ID (static, pre-registered with our AS)
- OAuth Client Secret (optional; our AS can issue one)

Source: https://claude.com/docs/connectors/building/authentication

The redirect URI Claude.ai uses for hosted surfaces (web, Desktop, mobile):
```
https://claude.ai/api/mcp/auth_callback
```

Our AS pre-registers exactly this URI. No DCR required.

### CIMD path (post-beta, for other clients)

For non-Claude.ai MCP clients, the AS advertises
`client_id_metadata_document_supported: true` and accepts URL-formatted `client_id`s.
The AS fetches the client's metadata document, validates redirect URIs, issues an
auth code. No `/register` endpoint needed.

### What `lab-api` must implement as the AS

Minimum viable authorization server:

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-authorization-server` | RFC 8414 AS metadata (issuer, endpoints, PKCE support) |
| `GET /.well-known/openid-configuration` | OIDC discovery alias (MCP client tries both) |
| `GET /authorize` | Authorization endpoint; redirects to Google, carries `state` with MCP client callback |
| `POST /token` | Token exchange (code→access+refresh) + refresh_token grant |
| `GET /jwks` | Public keys for token validation (if using JWT access tokens) |

The MCP server side (`mcp.orrerylearn.com`) adds:

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-protected-resource` | RFC 9728 PRM metadata |
| Any MCP endpoint | Validate bearer token + audience before serving |

The `@modelcontextprotocol/sdk` (`requireBearerAuth`, `mcpAuthMetadataRouter`)
handles the resource-server side. The AS is custom code in `lab-api`.

---

## 3 · If DCR is required by real clients (it won't be for Claude.ai beta)

DCR is deprecated in the current spec. Claude.ai supports static pre-registration and
CIMD. The only case DCR matters is other MCP clients that haven't updated to CIMD.

Options, in order of preference:

1. **Own AS with CIMD only** (recommended — no DCR endpoint). Covers Claude.ai
   (static creds) and any client supporting CIMD (the SHOULD path). Any client still
   requiring DCR is using a pre-Nov-2025 spec.

2. **Own AS with DCR added** if a real client demands it. DCR endpoint is a POST
   handler that issues a `client_id` and stores it. ~50 lines. Add only when a real
   client requires it.

3. **Auth0/Keycloak/Authentik** — full-featured, but adds external service dependency.
   Overkill for 6 accounts; federating Google through Auth0 → our AS adds two hops.
   Not recommended for beta.

4. **`@modelcontextprotocol/sdk` auth helpers** — the SDK ships `requireBearerAuth`
   and `mcpAuthMetadataRouter` for the resource-server side. It does NOT ship a full
   AS or a `ProxyOAuthServerProvider`. The AS must be written. Source: deepwiki
   inspection of typescript-sdk v2 auth module (2026-09-01).

---

## 4 · Google OIDC federation specifics

### Redirect URI constraints

- Exact match required against registered URIs in Google Cloud Console. No wildcards.
- HTTPS required (localhost exempt).
- Register exactly one URI: `https://lab-api.orrerylearn.com/auth/google/callback`
  (our AS's fixed callback, NOT Claude.ai's callback — that's the AS→Claude.ai leg).

### Refresh token behaviour

- Set `access_type=offline` + `prompt=consent` to force refresh token issuance.
  Google only returns a refresh token on first authorization without `prompt=consent`.
- Refresh token does not expire unless revoked by user or unused for 6 months.
- Store refresh token server-side in `lab-api` (never surface to client).
- Google access tokens expire in 3600s; AS refreshes transparently.

### Allowlist check

Server-side in `lab-api`, after Google returns the ID token:
1. Decode `id_token` → extract `email` (or `hd` for Google Workspace domain check).
2. Check `email` against the hardcoded ~6-account allowlist.
3. If not listed → return 403 to the MCP client, do NOT issue our AS token.
4. If listed → issue a short-lived JWT access token (audience = `https://mcp.orrerylearn.com`).

### Two-leg redirect chain

```
Claude.ai → /authorize (lab-api AS)
  → /auth/google/callback (Google redirects here)
    → verify allowlist
      → Claude.ai callback (https://claude.ai/api/mcp/auth_callback?code=…)
```

State parameter carries the Claude.ai redirect URI and PKCE verifier through the
Google hop. Lab-api never exposes the Google refresh token to Claude.ai.

### Risk: Google OAuth app verification

For production (public users), Google requires OAuth app verification. For a ~6-account
allowlist beta with `prompt=consent`, this is not required if all test accounts are
added to the Google Cloud project as "test users" (supports up to 100 test users in
unverified status). Source: Google OAuth developer policy.

---

## 5 · LiteLLM reachability (MINOR-8)

**Result: reachable.**

Probe run 2026-09-01 from this machine (on tailnet):

```bash
curl -s --max-time 8 http://homelab:4001/health
# → {"error":{"message":"Authentication Error, No api key passed in.",
#             "type":"auth_error","param":"None","code":"401"}}
# EXIT=0
```

LiteLLM listens on `homelab` (tailnet `100.87.33.61`), port `4001` (docker-compose
maps container :4000 → host :4001; :4000 is taken by Langfuse on the same host).
Source: `~/Projects/agentic-ai-homelab/infra/litellm/docker-compose.yml`.

`lab-api` on the VPS is on the same tailnet → `http://homelab:4001` is reachable
from there without any firewall changes. No credentials sent in probe.

The tailnet node named `litellm` (`100.103.118.8`) is a separate machine; all ports
probed timed out — not the LiteLLM proxy. The actual proxy is on `homelab`.

---

## Decision table — D17

| Path | DCR endpoint | CIMD support | Claude.ai beta | Post-beta clients | Complexity |
|---|---|---|---|---|---|
| **A — own AS, static + CIMD** | No | Yes | Yes (static creds) | Yes (CIMD) | Low |
| B — own AS, static + CIMD + DCR | Yes | Yes | Yes | Yes (all) | Medium |
| C — Auth0/Keycloak | Delegated | Delegated | Yes | Yes | High (external dep) |

**Recommendation: Path A.** DCR is deprecated in the current spec; Claude.ai supports
static pre-registration today; adding DCR later is incremental if a real client demands
it. Path A is the minimum viable AS for the beta; no external auth service dependency.

---

## Open risks

| Risk | Severity | Mitigation |
|---|---|---|
| Google OAuth app stays "unverified" for >100 test users | Medium | Stay under 100; verify app before public launch |
| Google refresh token revoked if unused 6 months | Low | Proactive re-auth prompt; short beta window |
| Claude.ai changes its redirect URI or flow | Low | Follow `claude.com/docs/connectors/building/authentication`; it's stable |
| `iss` validation will become MUST in a future spec revision | Low | Emit `iss` in auth response now (SHOULD → MUST is the expected path) |
| Token audience validation — forgetting to bind to `https://mcp.orrerylearn.com` | High | Enforce in AS token issuance + MCP server `requireBearerAuth` config |
| LiteLLM on `homelab:4001` — single point if homelab goes offline | Low for beta | OpenRouter is the fallback backend |

---

## Concrete endpoint list — what `lab-api` must implement

### AS endpoints (authorization server)

```
GET  /.well-known/oauth-authorization-server   RFC 8414 metadata JSON
GET  /.well-known/openid-configuration         OIDC discovery alias
GET  /authorize                                Auth endpoint → redirect to Google
POST /token                                    Code→token + refresh grant
GET  /jwks                                     Public JWKS (if JWT tokens)
GET  /auth/google/callback                     Google's redirect back to us
```

### Resource server endpoints (on `mcp.orrerylearn.com`, via SDK)

```
GET  /.well-known/oauth-protected-resource     RFC 9728 PRM JSON
*    /mcp                                      MCP Streamable HTTP (bearer-validated)
```

### RFC 8414 metadata must include

```json
{
  "issuer": "https://lab-api.orrerylearn.com",
  "authorization_endpoint": "https://lab-api.orrerylearn.com/authorize",
  "token_endpoint": "https://lab-api.orrerylearn.com/token",
  "jwks_uri": "https://lab-api.orrerylearn.com/jwks",
  "scopes_supported": ["physics:read"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "client_id_metadata_document_supported": true,
  "authorization_response_iss_parameter_supported": true
}
```

---

*Sources consulted:*
- MCP spec 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- MCP draft (client registration): https://modelcontextprotocol.io/specification/draft/basic/authorization/client-registration
- Claude connector auth docs: https://claude.com/docs/connectors/building/authentication
- den.dev Nov 2025 spec changes: https://den.dev/blog/mcp-november-authorization-spec/
- Google OAuth web-server flow: https://developers.google.com/identity/protocols/oauth2/web-server
- FastMCP OAuth proxy pattern: https://gofastmcp.com/servers/auth/oauth-proxy
- MCP TypeScript SDK auth overview: https://deepwiki.com/modelcontextprotocol/typescript-sdk/5-oauth-authentication
- LiteLLM infra: `~/Projects/agentic-ai-homelab/infra/litellm/docker-compose.yml` (local)
- Tailscale status probe (2026-09-01): `homelab:4001` returns HTTP 401
