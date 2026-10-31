import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TokenCore, ACCESS_TOKEN_TTL_S, REFRESH_TOKEN_TTL_MS } from './tokens';

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
    expect(core.refreshRecord(token)).toMatchObject(record);
    expect(core.refreshRecord(token)).toMatchObject(record);
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
    expect(reloaded.refreshRecord(token)).toMatchObject(record);
  });
});

describe('refresh token lifetime (#597)', () => {
  const record = { sub: 'g-1', email: 'a@b.c', clientId: 'claude', resource: AUD };

  it('a token unused for longer than the TTL is gone, and pruned from the file', async () => {
    let t = 1_000_000;
    const core = await TokenCore.load(statePath, ISSUER, () => t);
    const token = core.issueRefreshToken(record);
    t += REFRESH_TOKEN_TTL_MS - 1;
    expect(core.refreshRecord(token)).toMatchObject(record);
    t += 2;
    expect(core.refreshRecord(token)).toBeNull();
    const onDisk = JSON.parse(readFileSync(statePath, 'utf8')) as { refresh: object };
    expect(Object.keys(onDisk.refresh)).toHaveLength(0);
  });

  it('tokens from before the TTL get the full TTL from load, not instant expiry', async () => {
    const core = await TokenCore.load(statePath, ISSUER);
    const token = core.issueRefreshToken(record);
    // Strip issuedAt, as a state file written before the TTL would have it.
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    for (const r of Object.values(state.refresh) as { issuedAt?: number }[]) delete r.issuedAt;
    writeFileSync(statePath, JSON.stringify(state));
    let t = 5_000_000;
    const reloaded = await TokenCore.load(statePath, ISSUER, () => t);
    t += REFRESH_TOKEN_TTL_MS - 1;
    expect(reloaded.refreshRecord(token)).toMatchObject(record);
  });
});

describe('dynamic client eviction (#597)', () => {
  it('a /register flood never evicts a client holding a live refresh token', async () => {
    let t = 0;
    const core = await TokenCore.load(statePath, ISSUER, () => ++t);
    const keeper = core.registerClient(['https://claude.ai/cb'], [AUD])!;
    core.issueRefreshToken({ sub: 's', email: 'a@b.c', clientId: keeper, resource: AUD });
    for (let i = 0; i < 520; i++)
      expect(core.registerClient(['https://x.example/cb'], [AUD])).not.toBeNull();
    expect(core.dynamicClient(keeper)).not.toBeNull();
  });

  it('refuses registration when every stored client is in use', async () => {
    let t = 0;
    const core = await TokenCore.load(statePath, ISSUER, () => ++t);
    for (let i = 0; i < 500; i++) {
      const id = core.registerClient(['https://x.example/cb'], [AUD])!;
      core.issueRefreshToken({ sub: 's', email: 'a@b.c', clientId: id, resource: AUD });
    }
    expect(core.registerClient(['https://y.example/cb'], [AUD])).toBeNull();
  });
});

describe('corrupt state file', () => {
  it('moves it aside and starts with a fresh keypair instead of crashing', async () => {
    writeFileSync(statePath, '{"privateJwk": {"kty": "EC", ');
    const core = await TokenCore.load(statePath, ISSUER, () => 42);
    expect(core.jwks().keys).toHaveLength(1);
    expect(readdirSync(dir)).toContain('state.json.corrupt-42');
    expect(JSON.parse(readFileSync(statePath, 'utf8')).privateJwk).toBeDefined();
  });
});
