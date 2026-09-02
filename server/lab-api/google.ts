/**
 * lab-api Google OIDC client (D · #533 · pre-review A).
 *
 * The upstream-IdP leg of the two-leg chain. Endpoint URLs are injectable via
 * env so the mock-IdP integration test drives the FULL flow in-process against
 * a stub http server — D's acceptance needs no real Google.
 *
 * Deviation 1 (operator-approved): no `access_type=offline`, no Google
 * refresh-token custody. We need the id_token email exactly once per
 * authorization; our own refresh grant re-checks the allowlist from the file.
 *
 * The id_token signature is VERIFIED against the IdP's JWKS (not just
 * decoded) — over TLS-to-Google decode is technically permitted, but verify
 * costs five lines and closes the token-substitution class.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  /** Our fixed callback: `${issuer}/auth/google/callback`. */
  redirectUri: string;
  authorizeUrl: string; // real: https://accounts.google.com/o/oauth2/v2/auth
  tokenUrl: string; // real: https://oauth2.googleapis.com/token
  jwksUrl: string; // real: https://www.googleapis.com/oauth2/v3/certs
  /** Expected `iss` in the id_token (real: https://accounts.google.com). */
  issuer: string;
}

export function googleConfigFromEnv(labIssuer: string): GoogleConfig {
  return {
    clientId: process.env.LAB_GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.LAB_GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: `${labIssuer}/auth/google/callback`,
    authorizeUrl:
      process.env.LAB_GOOGLE_AUTHORIZE_URL ?? 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: process.env.LAB_GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token',
    jwksUrl: process.env.LAB_GOOGLE_JWKS_URL ?? 'https://www.googleapis.com/oauth2/v3/certs',
    issuer: process.env.LAB_GOOGLE_ISSUER ?? 'https://accounts.google.com',
  };
}

/** The /authorize redirect to Google. `state` is OUR high-entropy pending-record key. */
export function googleAuthUrl(cfg: GoogleConfig, state: string): string {
  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email');
  url.searchParams.set('state', state);
  return url.toString();
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/**
 * Exchange Google's code and return the VERIFIED identity, or null on any
 * failure (callers treat null as a failed login, never a 500).
 */
export async function exchangeGoogleCode(
  cfg: GoogleConfig,
  code: string,
): Promise<{ sub: string; email: string } | null> {
  try {
    const resp = await fetch(cfg.tokenUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!resp.ok) {
      console.error(`[lab-api] google token exchange failed: ${resp.status}`);
      return null;
    }
    const { id_token: idToken } = (await resp.json()) as { id_token?: string };
    if (!idToken) return null;
    let jwks = jwksCache.get(cfg.jwksUrl);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(cfg.jwksUrl));
      jwksCache.set(cfg.jwksUrl, jwks);
    }
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: cfg.issuer,
      audience: cfg.clientId,
    });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    // The OIDC-federation account-takeover class (holistic MAJOR-1): Google
    // issues id_tokens for UNVERIFIED non-Gmail addresses with
    // email_verified:false — trusting the email claim alone lets anyone
    // impersonate an allowlisted non-Gmail address. Fail-closed: absent = deny.
    if (payload.email_verified !== true) {
      console.error(`[lab-api] rejected unverified email ${payload.email}`);
      return null;
    }
    return { sub: payload.sub, email: payload.email };
  } catch (e) {
    console.error('[lab-api] google code exchange failed:', e);
    return null;
  }
}
