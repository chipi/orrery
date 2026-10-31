/**
 * MCP resource-server auth (E · #534 · pre-review item 1).
 *
 * Verifies lab-api's ES256 access tokens against its /jwks — asymmetric on
 * purpose (D16): this server holds NO signing material and can only VERIFY.
 * All expected values come from env constants, never the Host header; they
 * are read lazily so the test suite can point MCP_JWKS_URL at a stub.
 *
 * The audience is a TWO-element set (pre-review F1): RFC 9728 clients that
 * treat the connector URL `https://mcp.orrerylearn.com/mcp` as the resource
 * identifier send the path form; origin-form clients send the bare host. Both
 * name this server, so both are accepted — at issuance (lab-api registers
 * both) and here at verification.
 *
 * Fail posture: fail-closed, but honest about why. jose's createRemoteJWKSet keeps
 * a warm cache (10 min default, 30 s unknown-kid cooldown), which IS the outage
 * grace. With a cold cache and lab-api unreachable the token could not be checked
 * at all: that is 503 + Retry-After, not 401 — a 401 tells the client its token is
 * bad, so it throws it away and makes the user sign in again for a blip.
 */
import { createRemoteJWKSet, errors, jwtVerify } from 'jose';

export function mcpResource(): string {
  return process.env.MCP_RESOURCE ?? 'https://mcp.orrerylearn.com';
}

export function mcpAuthIssuer(): string {
  return process.env.MCP_AUTH_ISSUER ?? 'https://lab-api.orrerylearn.com';
}

/** Fetch URL is decoupled from `iss` so compose can use the internal DNS name. */
export function mcpJwksUrl(): string {
  return process.env.MCP_JWKS_URL ?? `${mcpAuthIssuer()}/jwks`;
}

export const REQUIRED_SCOPE = 'physics:read';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksUrl: string | null = null;

function remoteJwks(): ReturnType<typeof createRemoteJWKSet> {
  const url = mcpJwksUrl();
  if (!jwks || jwksUrl !== url) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksUrl = url;
  }
  return jwks;
}

export type AuthResult =
  | { ok: true; sub: string; email: string }
  | {
      ok: false;
      error: 'invalid_token' | 'insufficient_scope' | 'issuer_unavailable';
      description: string;
    };

/** The JWKS could not be fetched (network, timeout, non-200, unparseable set), as
 *  opposed to a token that fails verification. Classes checked against jose 6. */
function jwksUnavailable(e: unknown): boolean {
  if (e instanceof TypeError) return true; // fetch failed: refused, DNS, reset
  if (e instanceof errors.JWKSTimeout || e instanceof errors.JWKSInvalid) return true;
  // A non-200 /jwks response is a bare JOSEError with the generic code.
  return (
    e instanceof errors.JOSEError &&
    e.constructor === errors.JOSEError &&
    e.code === 'ERR_JOSE_GENERIC'
  );
}

/**
 * Verify a bearer token for this resource server. RFC 6750 failure classes:
 * `invalid_token` → 401, `insufficient_scope` → 403.
 */
export async function verifyRequestToken(token: string): Promise<AuthResult> {
  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(token, remoteJwks(), {
      issuer: mcpAuthIssuer(),
      audience: [mcpResource(), `${mcpResource()}/mcp`],
      algorithms: ['ES256'],
    }));
  } catch (e) {
    if (jwksUnavailable(e)) {
      return {
        ok: false,
        error: 'issuer_unavailable',
        description: 'cannot reach the token issuer',
      };
    }
    return { ok: false, error: 'invalid_token', description: 'token verification failed' };
  }
  // Space-delimited-list treatment future-proofs multi-scope tokens; lab-api
  // mints a single value today.
  const scopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : [];
  if (!scopes.includes(REQUIRED_SCOPE)) {
    return {
      ok: false,
      error: 'insufficient_scope',
      description: `token lacks required scope '${REQUIRED_SCOPE}'`,
    };
  }
  return { ok: true, sub: String(payload.sub), email: String(payload.email ?? '') };
}
