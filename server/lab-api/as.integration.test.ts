/**
 * D's acceptance core (pre-review F1/F2): the FULL two-leg OAuth chain driven
 * with plain fetch against an ephemeral port, Google replaced by an in-process
 * stub IdP that issues locally-signed id_tokens. No real Google anywhere.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, generateKeyPair, exportJWK, importJWK, jwtVerify, type JWK } from 'jose';
import { buildLabApi, configFromEnv } from './index';

const GOOGLE_CLIENT_ID = 'test-google-client';
const CLAUDE_SECRET = 'claude-secret-for-tests';
const MCP_RESOURCE = 'https://mcp.test';
const ALLOWED_EMAIL = 'marko@example.com';

let dir: string;
let stubGoogle: Server;
let stubGoogleUrl: string;
let labApi: Server;
let base: string;
let issuer: string;
let allowlistPath: string;
let googleJwk: { privateKey: CryptoKey; publicJwk: JWK };

/** The stub encodes the email to assert into the Google code itself. */
function googleCodeFor(email: string): string {
  return Buffer.from(email).toString('base64url');
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'lab-api-as-'));
  allowlistPath = join(dir, 'allowlist.json');
  writeFileSync(allowlistPath, JSON.stringify({ emails: [ALLOWED_EMAIL] }));

  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  googleJwk = { privateKey: privateKey as CryptoKey, publicJwk: await exportJWK(publicKey) };
  googleJwk.publicJwk.alg = 'ES256';
  googleJwk.publicJwk.kid = 'stub-google-1';

  stubGoogle = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://stub');
      if (url.pathname === '/jwks') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ keys: [googleJwk.publicJwk] }));
        return;
      }
      if (url.pathname === '/token') {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const form = new URLSearchParams(Buffer.concat(chunks).toString());
        let email = Buffer.from(form.get('code') ?? '', 'base64url').toString();
        // `unverified:` prefix → the stub asserts the email WITHOUT
        // email_verified, modelling Google's unverified-account id_tokens.
        const verified = !email.startsWith('unverified:');
        if (!verified) email = email.slice('unverified:'.length);
        const idToken = await new SignJWT({ email, ...(verified ? { email_verified: true } : {}) })
          .setProtectedHeader({ alg: 'ES256', kid: 'stub-google-1' })
          .setIssuer(stubGoogleUrl)
          .setAudience(GOOGLE_CLIENT_ID)
          .setSubject(`google-sub-${email}`)
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(googleJwk.privateKey);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id_token: idToken }));
        return;
      }
      res.writeHead(404);
      res.end();
    })();
  });
  await new Promise<void>((r) => stubGoogle.listen(0, '127.0.0.1', r));
  const gAddr = stubGoogle.address() as { port: number };
  stubGoogleUrl = `http://127.0.0.1:${gAddr.port}`;

  process.env.LAB_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
  process.env.LAB_GOOGLE_CLIENT_SECRET = 'stub-secret';
  process.env.LAB_GOOGLE_AUTHORIZE_URL = `${stubGoogleUrl}/authorize`;
  process.env.LAB_GOOGLE_TOKEN_URL = `${stubGoogleUrl}/token`;
  process.env.LAB_GOOGLE_JWKS_URL = `${stubGoogleUrl}/jwks`;
  process.env.LAB_GOOGLE_ISSUER = stubGoogleUrl;
  process.env.LAB_CLAUDE_CLIENT_ID = 'claude-ai';
  process.env.LAB_CLAUDE_CLIENT_SECRET = CLAUDE_SECRET;
  process.env.LAB_STATE_PATH = join(dir, 'state.json');
  process.env.LAB_ALLOWLIST_PATH = allowlistPath;
  process.env.LAB_MCP_RESOURCE = MCP_RESOURCE;
  // The whole suite fires from one address in one window — keep the limiter
  // out of the way here; its behavior gets its own dedicated test below.
  process.env.LAB_RATE_LIMIT_PER_MIN = '100000';
  // Issuer must equal the reachable base (it's baked into metadata + iss), so
  // bind a throwaway server to learn the ephemeral port, then build for real.
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((r) => probe.close(() => r()));
  base = `http://127.0.0.1:${port}`;
  issuer = base;
  process.env.LAB_ISSUER = issuer;
  const built = await buildLabApi({ ...configFromEnv(), issuer });
  await new Promise<void>((r) => built.server.listen(port, '127.0.0.1', r));
  labApi = built.server;
});

afterAll(async () => {
  labApi?.close();
  stubGoogle?.close();
  rmSync(dir, { recursive: true, force: true });
});

interface FlowResult {
  authRedirect: URL;
  callbackRedirect: URL;
  ourCode: string | null;
}

/** Drive /authorize → (stub Google grants) → /auth/google/callback. */
async function runAuthLeg(opts: {
  email: string;
  verifier: string;
  clientId?: string;
  redirectUri?: string;
  resource?: string;
  state?: string;
}): Promise<FlowResult> {
  const challenge = createHash('sha256').update(opts.verifier).digest('base64url');
  const authUrl = new URL(`${base}/authorize`);
  authUrl.searchParams.set('client_id', opts.clientId ?? 'claude-ai');
  authUrl.searchParams.set(
    'redirect_uri',
    opts.redirectUri ?? 'https://claude.ai/api/mcp/auth_callback',
  );
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('resource', opts.resource ?? MCP_RESOURCE);
  if (opts.state) authUrl.searchParams.set('state', opts.state);

  const authResp = await fetch(authUrl, { redirect: 'manual' });
  expect(authResp.status).toBe(302);
  const authRedirect = new URL(authResp.headers.get('location') ?? '');
  const googleState = authRedirect.searchParams.get('state') ?? '';

  const cb = new URL(`${base}/auth/google/callback`);
  cb.searchParams.set('state', googleState);
  cb.searchParams.set('code', googleCodeFor(opts.email));
  const cbResp = await fetch(cb, { redirect: 'manual' });
  expect(cbResp.status).toBe(302);
  const callbackRedirect = new URL(cbResp.headers.get('location') ?? '');
  return { authRedirect, callbackRedirect, ourCode: callbackRedirect.searchParams.get('code') };
}

async function postToken(
  form: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const resp = await fetch(`${base}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  return { status: resp.status, body: (await resp.json()) as Record<string, unknown> };
}

describe('metadata + jwks', () => {
  it('serves RFC 8414 metadata on both well-known paths, PKCE advertised, no CIMD lie', async () => {
    for (const path of [
      '/.well-known/oauth-authorization-server',
      '/.well-known/openid-configuration',
    ]) {
      const meta = await (await fetch(`${base}${path}`)).json();
      expect(meta.issuer).toBe(issuer);
      expect(meta.authorization_endpoint).toBe(`${issuer}/authorize`);
      expect(meta.token_endpoint).toBe(`${issuer}/token`);
      expect(meta.jwks_uri).toBe(`${issuer}/jwks`);
      expect(meta.code_challenge_methods_supported).toEqual(['S256']);
      expect(meta.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
      // Deviation 2: unimplemented capability is NOT advertised.
      expect(meta.client_id_metadata_document_supported).toBeUndefined();
    }
  });

  it('/health is open; /jwks serves exactly one public EC key', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200);
    const jwks = await (await fetch(`${base}/jwks`)).json();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0].kty).toBe('EC');
    expect(jwks.keys[0].d).toBeUndefined();
  });
});

describe('happy path — full chain', () => {
  it('authorize → google → callback → token, with iss + client state echoed', async () => {
    const verifier = randomBytes(32).toString('base64url');
    const flow = await runAuthLeg({ email: ALLOWED_EMAIL, verifier, state: 'claude-opaque-state' });

    expect(flow.authRedirect.origin).toBe(stubGoogleUrl);
    expect(flow.callbackRedirect.origin + flow.callbackRedirect.pathname).toBe(
      'https://claude.ai/api/mcp/auth_callback',
    );
    expect(flow.callbackRedirect.searchParams.get('state')).toBe('claude-opaque-state');
    expect(flow.callbackRedirect.searchParams.get('iss')).toBe(issuer); // RFC 9207
    expect(flow.ourCode).toBeTruthy();

    const { status, body } = await postToken({
      grant_type: 'authorization_code',
      client_id: 'claude-ai',
      client_secret: CLAUDE_SECRET,
      code: flow.ourCode!,
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_verifier: verifier,
      resource: MCP_RESOURCE,
    });
    expect(status).toBe(200);
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBe(3600);
    expect(body.scope).toBe('physics:read');

    // What #534's resource server will do: verify against /jwks, check aud.
    const jwks = await (await fetch(`${base}/jwks`)).json();
    const key = await importJWK(jwks.keys[0] as JWK, 'ES256');
    const { payload } = await jwtVerify(body.access_token, key, {
      issuer,
      audience: MCP_RESOURCE,
    });
    expect(payload.email).toBe(ALLOWED_EMAIL);
    expect(payload.sub).toBe(`google-sub-${ALLOWED_EMAIL}`);
    expect(payload.scope).toBe('physics:read');

    // Refresh grant rotates: new tokens come back, the old refresh dies.
    const refresh1 = body.refresh_token as string;
    const r1 = await postToken({
      grant_type: 'refresh_token',
      client_id: 'claude-ai',
      client_secret: CLAUDE_SECRET,
      refresh_token: refresh1,
    });
    expect(r1.status).toBe(200);
    expect(r1.body.refresh_token).not.toBe(refresh1);
    const replay = await postToken({
      grant_type: 'refresh_token',
      client_id: 'claude-ai',
      client_secret: CLAUDE_SECRET,
      refresh_token: refresh1,
    });
    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe('invalid_grant');
  });

  it('public SPA client works without a secret (PKCE only)', async () => {
    const verifier = randomBytes(32).toString('base64url');
    const flow = await runAuthLeg({
      email: ALLOWED_EMAIL,
      verifier,
      clientId: 'orrery-lab-web',
      redirectUri: 'http://localhost:5373/lab/callback',
      resource: issuer,
    });
    const { status, body } = await postToken({
      grant_type: 'authorization_code',
      client_id: 'orrery-lab-web',
      code: flow.ourCode!,
      redirect_uri: 'http://localhost:5373/lab/callback',
      code_verifier: verifier,
    });
    expect(status).toBe(200);
    expect(body.scope).toBe('physics:ask');
  });
});

describe('negative paths', () => {
  it('non-allowlisted email → access_denied redirect, NO code', async () => {
    const flow = await runAuthLeg({
      email: 'intruder@example.com',
      verifier: randomBytes(32).toString('base64url'),
    });
    expect(flow.callbackRedirect.searchParams.get('error')).toBe('access_denied');
    expect(flow.ourCode).toBeNull();
  });

  it('unregistered redirect_uri → 400 page, never a redirect', async () => {
    const url = new URL(`${base}/authorize`);
    url.searchParams.set('client_id', 'claude-ai');
    url.searchParams.set('redirect_uri', 'https://evil.example/cb');
    url.searchParams.set('response_type', 'code');
    const resp = await fetch(url, { redirect: 'manual' });
    expect(resp.status).toBe(400);
  });

  it('wrong PKCE verifier → invalid_grant', async () => {
    const flow = await runAuthLeg({ email: ALLOWED_EMAIL, verifier: 'a'.repeat(43) });
    const { status, body } = await postToken({
      grant_type: 'authorization_code',
      client_id: 'claude-ai',
      client_secret: CLAUDE_SECRET,
      code: flow.ourCode!,
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_verifier: 'b'.repeat(43),
    });
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_grant');
  });

  it('auth code is single-use — replay fails', async () => {
    const verifier = randomBytes(32).toString('base64url');
    const flow = await runAuthLeg({ email: ALLOWED_EMAIL, verifier });
    const form = {
      grant_type: 'authorization_code',
      client_id: 'claude-ai',
      client_secret: CLAUDE_SECRET,
      code: flow.ourCode!,
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_verifier: verifier,
    };
    expect((await postToken(form)).status).toBe(200);
    const replay = await postToken(form);
    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe('invalid_grant');
  });

  it('replayed google state finds nothing (single-use pending record)', async () => {
    const verifier = randomBytes(32).toString('base64url');
    const flow = await runAuthLeg({ email: ALLOWED_EMAIL, verifier });
    const googleState = new URL(flow.authRedirect.toString()).searchParams.get('state') ?? '';
    const cb = new URL(`${base}/auth/google/callback`);
    cb.searchParams.set('state', googleState);
    cb.searchParams.set('code', googleCodeFor(ALLOWED_EMAIL));
    const resp = await fetch(cb, { redirect: 'manual' });
    expect(resp.status).toBe(400);
  });

  it('bad client_secret → invalid_client 401', async () => {
    const { status, body } = await postToken({
      grant_type: 'authorization_code',
      client_id: 'claude-ai',
      client_secret: 'wrong',
      code: 'irrelevant',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_verifier: 'c'.repeat(43),
    });
    expect(status).toBe(401);
    expect(body.error).toBe('invalid_client');
  });

  it('resource mismatch at /token → invalid_target', async () => {
    const verifier = randomBytes(32).toString('base64url');
    const flow = await runAuthLeg({ email: ALLOWED_EMAIL, verifier });
    const { status, body } = await postToken({
      grant_type: 'authorization_code',
      client_id: 'claude-ai',
      client_secret: CLAUDE_SECRET,
      code: flow.ourCode!,
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_verifier: verifier,
      resource: 'https://other.example',
    });
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_target');
  });

  it('unknown resource at /authorize → invalid_target redirect (RFC 8707)', async () => {
    const url = new URL(`${base}/authorize`);
    url.searchParams.set('client_id', 'claude-ai');
    url.searchParams.set('redirect_uri', 'https://claude.ai/api/mcp/auth_callback');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('code_challenge', 'd'.repeat(43));
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('resource', 'https://not-a-known-resource.example');
    const resp = await fetch(url, { redirect: 'manual' });
    expect(resp.status).toBe(302);
    const loc = new URL(resp.headers.get('location') ?? '');
    expect(loc.searchParams.get('error')).toBe('invalid_target');
  });

  it('per-client resource binding: the SPA cannot request an aud=mcp token', async () => {
    const url = new URL(`${base}/authorize`);
    url.searchParams.set('client_id', 'orrery-lab-web');
    url.searchParams.set('redirect_uri', 'http://localhost:5373/lab/callback');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('code_challenge', 'd'.repeat(43));
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('resource', MCP_RESOURCE); // claude-ai's resource, not the SPA's
    const resp = await fetch(url, { redirect: 'manual' });
    expect(resp.status).toBe(302);
    const loc = new URL(resp.headers.get('location') ?? '');
    expect(loc.searchParams.get('error')).toBe('invalid_target');
  });

  it('unverified Google email → access_denied, NO code (OIDC federation guard)', async () => {
    const flow = await runAuthLeg({
      email: `unverified:${ALLOWED_EMAIL}`,
      verifier: randomBytes(32).toString('base64url'),
    });
    expect(flow.callbackRedirect.searchParams.get('error')).toBe('access_denied');
    expect(flow.ourCode).toBeNull();
  });

  it('oversized request body → 413', async () => {
    const resp = await fetch(`${base}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'a'.repeat(70 * 1024),
    });
    expect(resp.status).toBe(413);
  });

  it('/ask gates: no bearer → 401; wrong-aud token → 401; de-allowlisted → 403', async () => {
    const post = (headers: Record<string, string>) =>
      fetch(`${base}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ question: 'hi' }),
      });
    expect((await post({})).status).toBe(401);

    // A Door-2 token (aud = MCP resource, scope physics:read) must NOT open Door 1.
    const verifier = randomBytes(32).toString('base64url');
    const mcpFlow = await runAuthLeg({ email: ALLOWED_EMAIL, verifier });
    const mcpToken = (
      await postToken({
        grant_type: 'authorization_code',
        client_id: 'claude-ai',
        client_secret: CLAUDE_SECRET,
        code: mcpFlow.ourCode!,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        code_verifier: verifier,
      })
    ).body.access_token as string;
    expect((await post({ authorization: `Bearer ${mcpToken}` })).status).toBe(401);

    // A proper Door-1 token whose account has since been de-allowlisted → 403.
    const v2 = randomBytes(32).toString('base64url');
    const webFlow = await runAuthLeg({
      email: ALLOWED_EMAIL,
      verifier: v2,
      clientId: 'orrery-lab-web',
      redirectUri: 'http://localhost:5373/lab/callback',
      resource: issuer,
    });
    const webToken = (
      await postToken({
        grant_type: 'authorization_code',
        client_id: 'orrery-lab-web',
        code: webFlow.ourCode!,
        redirect_uri: 'http://localhost:5373/lab/callback',
        code_verifier: v2,
      })
    ).body.access_token as string;
    writeFileSync(allowlistPath, JSON.stringify({ emails: [] }));
    try {
      expect((await post({ authorization: `Bearer ${webToken}` })).status).toBe(403);
    } finally {
      writeFileSync(allowlistPath, JSON.stringify({ emails: [ALLOWED_EMAIL] }));
    }
  });

  it('refresh after allowlist removal → revoked (the revocation lever)', async () => {
    const verifier = randomBytes(32).toString('base64url');
    const flow = await runAuthLeg({ email: ALLOWED_EMAIL, verifier });
    const { body } = await postToken({
      grant_type: 'authorization_code',
      client_id: 'claude-ai',
      client_secret: CLAUDE_SECRET,
      code: flow.ourCode!,
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_verifier: verifier,
    });
    writeFileSync(allowlistPath, JSON.stringify({ emails: [] }));
    try {
      const refresh = await postToken({
        grant_type: 'refresh_token',
        client_id: 'claude-ai',
        client_secret: CLAUDE_SECRET,
        refresh_token: body.refresh_token,
      });
      expect(refresh.status).toBe(400);
      expect(refresh.body.error).toBe('invalid_grant');
      // And the token is DEAD, not just denied once:
      const again = await postToken({
        grant_type: 'refresh_token',
        client_id: 'claude-ai',
        client_secret: CLAUDE_SECRET,
        refresh_token: body.refresh_token,
      });
      expect(again.status).toBe(400);
    } finally {
      writeFileSync(allowlistPath, JSON.stringify({ emails: [ALLOWED_EMAIL] }));
    }
  });
});
