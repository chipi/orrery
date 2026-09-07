/**
 * E's acceptance core (#534 · pre-review item 5): a CROSS-SLICE CONTRACT TEST.
 * The stub JWKS endpoint serves a real lab-api TokenCore's jwks() and the
 * tokens are minted by that same TokenCore — so this suite proves the MCP door
 * verifies exactly what D issues, same code both sides of the wire.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SignJWT, generateKeyPair, importJWK, type JWK } from 'jose';
import { TokenCore } from '../lab-api/tokens';
import { verifyRequestToken } from './auth';

const ISSUER = 'https://lab-api.orrerylearn.com';
const RESOURCE = 'https://mcp.orrerylearn.com';

let dir: string;
let core: TokenCore;
let stub: Server;
let stubUrl: string;
/** When false the stub answers 500 — the "lab-api down" case. */
let stubUp = true;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'mcp-auth-'));
  core = await TokenCore.load(join(dir, 'state.json'), ISSUER);
  stub = createServer((req, res) => {
    if (!stubUp) {
      res.writeHead(500);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(core.jwks()));
  });
  await new Promise<void>((r) => stub.listen(0, '127.0.0.1', r));
  const port = (stub.address() as { port: number }).port;
  stubUrl = `http://127.0.0.1:${port}`;
  process.env.MCP_JWKS_URL = `${stubUrl}/jwks`;
  process.env.MCP_AUTH_ISSUER = ISSUER;
  process.env.MCP_RESOURCE = RESOURCE;
});

afterAll(() => {
  stub?.close();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.MCP_JWKS_URL;
  delete process.env.MCP_AUTH_ISSUER;
  delete process.env.MCP_RESOURCE;
});

const mint = (over: Partial<{ scope: string; aud: string }> = {}) =>
  core.issueAccessToken({
    sub: 'google-sub-1',
    email: 'marko@example.com',
    scope: (over.scope ?? 'physics:read') as 'physics:read',
    aud: over.aud ?? RESOURCE,
  });

describe('verifyRequestToken · positive', () => {
  it('accepts a lab-api token with the ORIGIN-form audience', async () => {
    const v = await verifyRequestToken(await mint());
    expect(v).toEqual({ ok: true, sub: 'google-sub-1', email: 'marko@example.com' });
  });

  it('accepts the /mcp PATH-form audience (RFC 9728 identifier — pre-review F1)', async () => {
    const v = await verifyRequestToken(await mint({ aud: `${RESOURCE}/mcp` }));
    expect(v.ok).toBe(true);
  });
});

describe('verifyRequestToken · negative matrix (all fail-closed)', () => {
  it("rejects the SPA's Door-1 token (aud = lab-api itself) — the MINOR-1 regression guard", async () => {
    const v = await verifyRequestToken(await mint({ aud: ISSUER, scope: 'physics:ask' }));
    expect(v).toMatchObject({ ok: false, error: 'invalid_token' });
  });

  // Signs with lab-api's REAL private key (read from the state file the test
  // owns) so these rejections exercise the iss/exp checks themselves — a
  // foreign key would make them indistinguishable from signature failure
  // (holistic MINOR-1).
  const realKeySigner = async () => {
    const state = JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')) as {
      privateJwk: JWK;
    };
    return importJWK(state.privateJwk, 'ES256');
  };

  it('rejects a wrong issuer even with a VALID signature', async () => {
    const forged = await new SignJWT({ email: 'x@y', scope: 'physics:read' })
      .setProtectedHeader({ alg: 'ES256', kid: 'lab-api-1' })
      .setIssuer('https://evil.example')
      .setSubject('s')
      .setAudience(RESOURCE)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(await realKeySigner());
    expect((await verifyRequestToken(forged)).ok).toBe(false);
  });

  it('rejects an expired token even with a VALID signature', async () => {
    const expired = await new SignJWT({ email: 'x@y', scope: 'physics:read' })
      .setProtectedHeader({ alg: 'ES256', kid: 'lab-api-1' })
      .setIssuer(ISSUER)
      .setSubject('s')
      .setAudience(RESOURCE)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(await realKeySigner());
    expect((await verifyRequestToken(expired)).ok).toBe(false);
  });

  it('rejects a token signed by a DIFFERENT key carrying the same kid', async () => {
    const { privateKey } = await generateKeyPair('ES256');
    const forged = await new SignJWT({ email: 'x@y', scope: 'physics:read' })
      .setProtectedHeader({ alg: 'ES256', kid: 'lab-api-1' })
      .setIssuer(ISSUER)
      .setSubject('impostor')
      .setAudience(RESOURCE)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    expect((await verifyRequestToken(forged)).ok).toBe(false);
  });

  it('rejects an unknown kid (exercises the refetch/cooldown path)', async () => {
    const { privateKey } = await generateKeyPair('ES256');
    const unknownKid = await new SignJWT({ email: 'x@y', scope: 'physics:read' })
      .setProtectedHeader({ alg: 'ES256', kid: 'rogue-key-9' })
      .setIssuer(ISSUER)
      .setSubject('s')
      .setAudience(RESOURCE)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    expect((await verifyRequestToken(unknownKid)).ok).toBe(false);
  });

  it('rejects an HS256 token (algorithm pin)', async () => {
    const hs = await new SignJWT({ email: 'x@y', scope: 'physics:read' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setSubject('s')
      .setAudience(RESOURCE)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('shared-secret-32-bytes-long-padd'));
    expect((await verifyRequestToken(hs)).ok).toBe(false);
  });

  it('rejects garbage', async () => {
    expect((await verifyRequestToken('not-a-jwt')).ok).toBe(false);
    expect((await verifyRequestToken('')).ok).toBe(false);
  });

  it('wrong scope → insufficient_scope (403 class), not invalid_token', async () => {
    const v = await verifyRequestToken(await mint({ scope: 'physics:ask', aud: RESOURCE }));
    expect(v).toMatchObject({ ok: false, error: 'insufficient_scope' });
  });
});

describe('fail posture around a lab-api outage', () => {
  it('warm cache verifies THROUGH an outage; the grace is jose’s cache, by design', async () => {
    expect((await verifyRequestToken(await mint())).ok).toBe(true); // warms cache
    stubUp = false;
    try {
      expect((await verifyRequestToken(await mint())).ok).toBe(true);
    } finally {
      stubUp = true;
    }
  });
});
