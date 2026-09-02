/**
 * lab-api authorization server (D · #533 · spike "option zero" + pre-review A/C).
 *
 * Minimal OAuth 2.1 AS: two STATIC clients (Claude.ai connector + the /lab
 * SPA), PKCE S256 mandatory, RFC 8707 resource→aud binding, Google OIDC as the
 * only IdP. No DCR, no CIMD (not advertised until implemented), no cookies.
 *
 * PKCE through the two-leg chain (pre-review): the verifier never transits the
 * Google hop — /authorize stores the CHALLENGE in a pending record keyed by our
 * own high-entropy state nonce; the Google callback mints our auth code bound
 * to that record; /token verifies S256(verifier) against the stored challenge
 * plus exact redirect_uri and resource→aud.
 *
 * Pending records (10 min) and auth codes (60 s, single-use) are deliberately
 * IN-MEMORY — a restart mid-handshake fails one login, nothing more.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { isAllowed } from './allowlist';
import { exchangeGoogleCode, googleAuthUrl, type GoogleConfig } from './google';
import { TokenCore, type AccessClaims } from './tokens';

const PENDING_TTL_MS = 10 * 60_000;
const CODE_TTL_MS = 60_000;

export interface StaticClient {
  clientId: string;
  /** Absent for public clients (the SPA) — PKCE is their only proof. */
  clientSecret?: string;
  redirectUris: string[];
  scope: AccessClaims['scope'];
  /**
   * The audiences THIS client may request tokens for (RFC 8707), per-client
   * (holistic MINOR-1): the SPA must never mint aud=mcp tokens even though
   * both audiences exist on the AS — fail-closed at issuance, not a contract
   * note for #534.
   */
  resources: string[];
}

export interface AsConfig {
  issuer: string;
  clients: StaticClient[];
  allowlistPath: string;
  google: GoogleConfig;
}

interface PendingAuth {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  clientState: string | null;
  createdAt: number;
}

interface AuthCode {
  pending: PendingAuth;
  sub: string;
  email: string;
  createdAt: number;
}

function secretMatches(supplied: string, expected: string): boolean {
  const a = createHash('sha256').update(supplied).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function s256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export type AuthorizeResult =
  { kind: 'redirect'; location: string } | { kind: 'error'; status: number; body: string };

export type TokenResult =
  | { kind: 'ok'; body: Record<string, unknown> }
  | { kind: 'error'; status: number; error: string; description: string };

export class AuthServer {
  private readonly pending = new Map<string, PendingAuth>();
  private readonly codes = new Map<string, AuthCode>();

  constructor(
    private readonly cfg: AsConfig,
    private readonly tokens: TokenCore,
  ) {}

  // ── Metadata documents ──────────────────────────────────────────────────

  /** RFC 8414 (also served as the OIDC-discovery alias). */
  metadata(): Record<string, unknown> {
    return {
      issuer: this.cfg.issuer,
      authorization_endpoint: `${this.cfg.issuer}/authorize`,
      token_endpoint: `${this.cfg.issuer}/token`,
      jwks_uri: `${this.cfg.issuer}/jwks`,
      scopes_supported: ['physics:read', 'physics:ask'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
      authorization_response_iss_parameter_supported: true,
      // OIDC-discovery-required keys (holistic m-3) — strict clients reading
      // the /openid-configuration alias reject metadata without these.
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['ES256'],
    };
  }

  // ── /authorize ──────────────────────────────────────────────────────────

  authorize(params: URLSearchParams): AuthorizeResult {
    const clientId = params.get('client_id') ?? '';
    const client = this.cfg.clients.find((c) => c.clientId === clientId);
    if (!client) return { kind: 'error', status: 400, body: 'unknown client_id' };

    // Open-redirect guard (pre-review risk 3): exact-match against the static
    // registry BEFORE any redirect is issued. An unregistered redirect_uri gets
    // a 400 page, never a redirect carrying an error code.
    const redirectUri = params.get('redirect_uri') ?? '';
    if (!client.redirectUris.includes(redirectUri)) {
      return { kind: 'error', status: 400, body: 'unregistered redirect_uri' };
    }

    const fail = (desc: string, error = 'invalid_request'): AuthorizeResult => {
      const url = new URL(redirectUri);
      url.searchParams.set('error', error);
      url.searchParams.set('error_description', desc);
      const clientState = params.get('state');
      if (clientState !== null) url.searchParams.set('state', clientState);
      url.searchParams.set('iss', this.cfg.issuer);
      return { kind: 'redirect', location: url.toString() };
    };

    if (params.get('response_type') !== 'code') return fail('response_type must be code');
    if (params.get('code_challenge_method') !== 'S256') {
      return fail('code_challenge_method must be S256 (PKCE is mandatory)');
    }
    const codeChallenge = params.get('code_challenge') ?? '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) return fail('malformed code_challenge');
    const resource = params.get('resource') ?? '';
    if (!client.resources.includes(resource)) {
      // RFC 8707's own error code (holistic m-2) so spec-literate clients branch.
      return fail(`resource must be one of: ${client.resources.join(', ')}`, 'invalid_target');
    }

    this.gcPending();
    const state = randomBytes(24).toString('base64url');
    this.pending.set(state, {
      clientId,
      redirectUri,
      codeChallenge,
      resource,
      clientState: params.get('state'),
      createdAt: Date.now(),
    });
    return { kind: 'redirect', location: googleAuthUrl(this.cfg.google, state) };
  }

  // ── /auth/google/callback ───────────────────────────────────────────────

  async googleCallback(params: URLSearchParams): Promise<AuthorizeResult> {
    const state = params.get('state') ?? '';
    const pending = this.pending.get(state);
    // Single-use regardless of outcome — a replayed state must find nothing.
    this.pending.delete(state);
    if (!pending || Date.now() - pending.createdAt > PENDING_TTL_MS) {
      return { kind: 'error', status: 400, body: 'unknown or expired authorization state' };
    }

    const redirect = (params2: Record<string, string>): AuthorizeResult => {
      const url = new URL(pending.redirectUri);
      for (const [k, v] of Object.entries(params2)) url.searchParams.set(k, v);
      if (pending.clientState !== null) url.searchParams.set('state', pending.clientState);
      url.searchParams.set('iss', this.cfg.issuer);
      return { kind: 'redirect', location: url.toString() };
    };

    const googleCode = params.get('code');
    if (!googleCode) {
      return redirect({ error: 'access_denied', error_description: 'google sign-in failed' });
    }
    const identity = await exchangeGoogleCode(this.cfg.google, googleCode);
    if (!identity) {
      return redirect({ error: 'access_denied', error_description: 'google sign-in failed' });
    }
    // THE gate (spike §4): non-allowlisted → error to the client, no token, and
    // the reason stays server-side (403 semantics carried as access_denied).
    if (!isAllowed(this.cfg.allowlistPath, identity.email)) {
      console.error(`[lab-api] allowlist DENIED ${identity.email}`);
      return redirect({ error: 'access_denied', error_description: 'account not allowlisted' });
    }

    this.gcCodes();
    const code = randomBytes(32).toString('base64url');
    this.codes.set(code, {
      pending,
      sub: identity.sub,
      email: identity.email,
      createdAt: Date.now(),
    });
    return redirect({ code });
  }

  // ── /token ──────────────────────────────────────────────────────────────

  async token(form: URLSearchParams): Promise<TokenResult> {
    const clientId = form.get('client_id') ?? '';
    const client = this.cfg.clients.find((c) => c.clientId === clientId);
    if (!client) return err(401, 'invalid_client', 'unknown client_id');
    if (client.clientSecret !== undefined) {
      const supplied = form.get('client_secret') ?? '';
      if (!secretMatches(supplied, client.clientSecret)) {
        return err(401, 'invalid_client', 'bad client_secret');
      }
    }

    const grantType = form.get('grant_type');
    if (grantType === 'authorization_code') return this.codeGrant(client, form);
    if (grantType === 'refresh_token') return this.refreshGrant(client, form);
    return err(400, 'unsupported_grant_type', 'use authorization_code or refresh_token');
  }

  private async codeGrant(client: StaticClient, form: URLSearchParams): Promise<TokenResult> {
    const code = form.get('code') ?? '';
    const record = this.codes.get(code);
    // Single-use: delete BEFORE validation so a replay can never succeed.
    this.codes.delete(code);
    if (!record || Date.now() - record.createdAt > CODE_TTL_MS) {
      return err(400, 'invalid_grant', 'unknown or expired code');
    }
    if (record.pending.clientId !== client.clientId) {
      return err(400, 'invalid_grant', 'code was issued to a different client');
    }
    if (form.get('redirect_uri') !== record.pending.redirectUri) {
      return err(400, 'invalid_grant', 'redirect_uri mismatch');
    }
    const verifier = form.get('code_verifier') ?? '';
    if (s256(verifier) !== record.pending.codeChallenge) {
      return err(400, 'invalid_grant', 'PKCE verification failed');
    }
    // RFC 8707: if the token request names a resource it must match the one
    // authorized; the token is bound to the AUTHORIZED resource either way.
    const requested = form.get('resource');
    if (requested !== null && requested !== record.pending.resource) {
      return err(400, 'invalid_target', 'resource differs from the authorized resource');
    }
    return this.mint(client, record.sub, record.email, record.pending.resource);
  }

  private async refreshGrant(client: StaticClient, form: URLSearchParams): Promise<TokenResult> {
    const token = form.get('refresh_token') ?? '';
    const record = this.tokens.refreshRecord(token);
    if (!record || record.clientId !== client.clientId) {
      return err(400, 'invalid_grant', 'unknown refresh_token');
    }
    // The revocation lever (pre-review A): re-check the allowlist on EVERY
    // refresh — removing an email kills access within the access-token TTL.
    if (!isAllowed(this.cfg.allowlistPath, record.email)) {
      this.tokens.revokeRefreshToken(token);
      console.error(`[lab-api] refresh DENIED for de-allowlisted ${record.email}`);
      return err(400, 'invalid_grant', 'account no longer allowlisted');
    }
    // Rotation: old token dies, response carries a successor.
    this.tokens.revokeRefreshToken(token);
    return this.mint(client, record.sub, record.email, record.resource);
  }

  private async mint(
    client: StaticClient,
    sub: string,
    email: string,
    resource: string,
  ): Promise<TokenResult> {
    const accessToken = await this.tokens.issueAccessToken({
      sub,
      email,
      scope: client.scope,
      aud: resource,
    });
    const refreshToken = this.tokens.issueRefreshToken({
      sub,
      email,
      clientId: client.clientId,
      resource,
    });
    return {
      kind: 'ok',
      body: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refreshToken,
        scope: client.scope,
      },
    };
  }

  private gcPending(): void {
    const now = Date.now();
    for (const [k, v] of this.pending)
      if (now - v.createdAt > PENDING_TTL_MS) this.pending.delete(k);
  }

  private gcCodes(): void {
    const now = Date.now();
    for (const [k, v] of this.codes) if (now - v.createdAt > CODE_TTL_MS) this.codes.delete(k);
  }
}

function err(status: number, error: string, description: string): TokenResult {
  return { kind: 'error', status, error, description };
}
