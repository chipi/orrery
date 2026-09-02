import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TokenCore, ACCESS_TOKEN_TTL_S } from './tokens';

const ISSUER = 'https://lab-api.test';
const AUD = 'https://mcp.test';

let dir: string;
let statePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lab-api-tokens-'));
  statePath = join(dir, 'state.json');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('TokenCore keypair persistence', () => {
  it('generates a keypair on first load and persists it', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    expect(state.privateJwk.kty).toBe('EC');
    expect(state.publicJwk.kty).toBe('EC');
    expect(state.refresh).toEqual({});
    expect(core.jwks().keys).toHaveLength(1);
  });

  it('reloads the SAME key — /jwks stable across restarts', async () => {
    const a = await TokenCore.load(statePath, ISSUER);
    const b = await TokenCore.load(statePath, ISSUER);
    expect(b.jwks().keys[0].x).toBe(a.jwks().keys[0].x);
    expect(b.jwks().keys[0].y).toBe(a.jwks().keys[0].y);
  });

  it('jwks exposes ONLY the public key, with alg/use/kid set', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const [key] = core.jwks().keys;
    expect(key.d).toBeUndefined();
    expect(key.alg).toBe('ES256');
    expect(key.use).toBe('sig');
    expect(key.kid).toBe('lab-api-1');
  });

  it('leaves no tmp files behind after persist', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    core.issueRefreshToken({ sub: 's', email: 'e@x', clientId: 'c', resource: AUD });
    expect(readdirSync(dir).filter((f) => f.includes('.tmp'))).toEqual([]);
  });
});

describe('access tokens', () => {
  it('round-trips claims through issue → verify', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const token = await core.issueAccessToken({
      sub: 'google-123',
      email: 'marko@example.com',
      scope: 'physics:read',
      aud: AUD,
    });
    const claims = await core.verifyAccessToken(token, AUD);
    expect(claims).toEqual({
      sub: 'google-123',
      email: 'marko@example.com',
      scope: 'physics:read',
      aud: AUD,
    });
  });

  it('REJECTS a token presented to the wrong audience (RFC 8707 binding)', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const token = await core.issueAccessToken({
      sub: 's',
      email: 'e@x',
      scope: 'physics:read',
      aud: AUD,
    });
    expect(await core.verifyAccessToken(token, 'https://other.test')).toBeNull();
  });

  it('rejects garbage and tokens signed by a DIFFERENT keypair', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const other = await TokenCore.load(join(dir, 'other.json'), ISSUER);
    const foreign = await other.issueAccessToken({
      sub: 's',
      email: 'e@x',
      scope: 'physics:read',
      aud: AUD,
    });
    expect(await core.verifyAccessToken('not-a-jwt', AUD)).toBeNull();
    expect(await core.verifyAccessToken(foreign, AUD)).toBeNull();
  });

  it('carries iss/exp with the 1h TTL', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const token = await core.issueAccessToken({
      sub: 's',
      email: 'e@x',
      scope: 'physics:ask',
      aud: AUD,
    });
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.iss).toBe(ISSUER);
    expect(payload.exp - payload.iat).toBe(ACCESS_TOKEN_TTL_S);
  });
});

describe('refresh tokens', () => {
  const record = { sub: 'g-1', email: 'a@b.c', clientId: 'claude', resource: AUD };

  it('issues an opaque token, stores only the hash, looks up without consuming', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const token = core.issueRefreshToken(record);
    expect(readFileSync(statePath, 'utf8')).not.toContain(token);
    expect(core.refreshRecord(token)).toEqual(record);
    expect(core.refreshRecord(token)).toEqual(record);
  });

  it('unknown token → null; revoked token → null', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const token = core.issueRefreshToken(record);
    expect(core.refreshRecord('deadbeef'.repeat(8))).toBeNull();
    core.revokeRefreshToken(token);
    expect(core.refreshRecord(token)).toBeNull();
  });

  it('refresh tokens survive a restart (persisted hashed)', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const token = core.issueRefreshToken(record);
    const reloaded = await TokenCore.load(statePath, ISSUER);
    expect(reloaded.refreshRecord(token)).toEqual(record);
  });
});
