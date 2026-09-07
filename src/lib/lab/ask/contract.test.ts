/**
 * F's cross-slice CONTRACT test (#535 · pre-review item 7): the REAL AskAuth
 * client driven through the REAL lab-api server (buildLabApi on 127.0.0.1:8093
 * — the client's baked dev base), with the stub Google IdP from D's suite and
 * a stubbed LiteLLM. Catches every client↔AS contract drift a mocked-fetch
 * test would hide: PKCE shape, resource param, iss echo, rotation, /ask
 * bearer semantics.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';
import { SignJWT, generateKeyPair, exportJWK, type JWK } from 'jose';
import { buildLabApi, configFromEnv } from '../../../../server/lab-api/index';
import { AskAuth, type AuthDeps, type AuthPhase } from './auth';

const BASE = 'http://localhost:8093'; // = the client config's DEV base
const EMAIL = 'marko.dragoljevic@gmail.com';
const REDIRECT = 'http://localhost:5373/lab/callback';

let dir: string;
let allowlistPath: string;
let labApi: Server;
let stubGoogle: Server;
let stubLlm: Server;
let googleKey: { privateKey: CryptoKey; publicJwk: JWK };
let stubGoogleUrl: string;

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

let phases: AuthPhase[];
let storage: MemStorage;

function makeClient(): AskAuth {
  const deps: AuthDeps = {
    fetch: (...a) => fetch(...a),
    storage,
    session: new MemStorage(),
    lock: null,
    crypto: webcrypto as Crypto,
  };
  return new AskAuth(deps, REDIRECT, (p) => phases.push(p));
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'ask-contract-'));
  allowlistPath = join(dir, 'allowlist.json');
  writeFileSync(allowlistPath, JSON.stringify({ emails: [EMAIL] }));

  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  googleKey = { privateKey: privateKey as CryptoKey, publicJwk: await exportJWK(publicKey) };
  googleKey.publicJwk.alg = 'ES256';
  googleKey.publicJwk.kid = 'stub-g';

  stubGoogle = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://stub');
      if (url.pathname === '/jwks') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ keys: [googleKey.publicJwk] }));
        return;
      }
      if (url.pathname === '/token') {
        const idToken = await new SignJWT({ email: EMAIL, email_verified: true })
          .setProtectedHeader({ alg: 'ES256', kid: 'stub-g' })
          .setIssuer(stubGoogleUrl)
          .setAudience('g-client')
          .setSubject('g-sub-1')
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(googleKey.privateKey);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id_token: idToken }));
        return;
      }
      res.writeHead(404);
      res.end();
    })();
  });
  await new Promise<void>((r) => stubGoogle.listen(0, '127.0.0.1', r));
  stubGoogleUrl = `http://127.0.0.1:${(stubGoogle.address() as { port: number }).port}`;

  // Stub LiteLLM: one tool round (interplanetary-transfer), then narration.
  let llmTurn = 0;
  stubLlm = createServer((req, res) => {
    void (async () => {
      for await (const c of req) void c;
      llmTurn += 1;
      const msg =
        llmTurn % 2 === 1
          ? {
              role: 'assistant',
              content: null,
              tool_calls: [
                { id: 'c1', function: { name: 'interplanetary-transfer', arguments: '{}' } },
              ],
            }
          : { role: 'assistant', content: 'Narrated: see kernel numbers above.' };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: msg }] }));
    })();
  });
  await new Promise<void>((r) => stubLlm.listen(0, '127.0.0.1', r));

  process.env.LAB_ISSUER = BASE;
  process.env.LAB_STATE_PATH = join(dir, 'state.json');
  process.env.LAB_ALLOWLIST_PATH = allowlistPath;
  process.env.LAB_GOOGLE_CLIENT_ID = 'g-client';
  process.env.LAB_GOOGLE_CLIENT_SECRET = 'g-secret';
  process.env.LAB_GOOGLE_AUTHORIZE_URL = `${stubGoogleUrl}/authorize`;
  process.env.LAB_GOOGLE_TOKEN_URL = `${stubGoogleUrl}/token`;
  process.env.LAB_GOOGLE_JWKS_URL = `${stubGoogleUrl}/jwks`;
  process.env.LAB_GOOGLE_ISSUER = stubGoogleUrl;
  process.env.LAB_CLAUDE_CLIENT_SECRET = 'c-secret';
  process.env.LAB_RATE_LIMIT_PER_MIN = '100000';
  process.env.LITELLM_BASE_URL = `http://127.0.0.1:${(stubLlm.address() as { port: number }).port}`;
  process.env.LITELLM_API_KEY = 'stub';

  const built = await buildLabApi({ ...configFromEnv(), issuer: BASE });
  labApi = built.server;
  await new Promise<void>((r) => labApi.listen(8093, '127.0.0.1', r));
});

const savedEnv = { ...process.env };

afterAll(() => {
  // m-3: this suite mutates a dozen LAB_* vars — restore for suite isolation.
  for (const k of Object.keys(process.env)) if (!(k in savedEnv)) delete process.env[k];
  Object.assign(process.env, savedEnv);
  labApi?.close();
  stubGoogle?.close();
  stubLlm?.close();
  rmSync(dir, { recursive: true, force: true });
});

/** Drive the login redirect leg exactly as the browser would. */
async function login(client: AskAuth): Promise<void> {
  const authorizeUrl = await client.beginLogin();
  const hop1 = await fetch(authorizeUrl, { redirect: 'manual' });
  expect(hop1.status).toBe(302); // → stub Google
  const googleState = new URL(hop1.headers.get('location')!).searchParams.get('state')!;
  const cb = new URL(`${BASE}/auth/google/callback`);
  cb.searchParams.set('state', googleState);
  cb.searchParams.set('code', 'g-code');
  const hop2 = await fetch(cb, { redirect: 'manual' });
  expect(hop2.status).toBe(302); // → our SPA callback
  const landing = new URL(hop2.headers.get('location')!);
  expect(landing.origin + landing.pathname).toBe(REDIRECT);
  const result = await client.completeLogin(landing.searchParams);
  expect(result.ok).toBe(true);
}

describe('F contract · real client ↔ real lab-api', () => {
  it('full PKCE login → /ask with kernel toolCalls → rotation-refresh → de-allowlist death', async () => {
    phases = [];
    storage = new MemStorage();
    const client = makeClient();

    await login(client);
    expect(phases.at(-1)).toBe('signed-in');
    const firstRt = storage.getItem('orrery.lab.rt')!;
    expect(firstRt).toBeTruthy();

    // /ask end-to-end: stubbed LLM narrates, the REAL kernel computes.
    const resp = await client.askFetch({ question: 'transfer to mars?', locale: 'en-US' });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      answer: string;
      toolCalls: { tool: string; result: { values: Record<string, { value: number }> } }[];
    };
    expect(body.toolCalls[0].tool).toBe('interplanetary-transfer');
    expect(body.toolCalls[0].result.values.tof.value).toBeGreaterThan(200);
    expect(body.answer).toContain('Narrated');

    // Refresh rotates the RT through the real AS.
    expect(await client.refresh()).toBe(true);
    const secondRt = storage.getItem('orrery.lab.rt')!;
    expect(secondRt).not.toBe(firstRt);

    // De-allowlist → the real revocation lever kills the session.
    writeFileSync(allowlistPath, JSON.stringify({ emails: [] }));
    try {
      expect(await client.refresh()).toBe(false);
      expect(storage.getItem('orrery.lab.rt')).toBeNull();
      expect(phases.at(-1)).toBe('signed-out');
    } finally {
      writeFileSync(allowlistPath, JSON.stringify({ emails: [EMAIL] }));
    }
  }, 20_000);

  it('a non-allowlisted login lands on the callback as denied — no token ever minted', async () => {
    phases = [];
    storage = new MemStorage();
    writeFileSync(allowlistPath, JSON.stringify({ emails: ['someone-else@example.com'] }));
    try {
      const client = makeClient();
      const authorizeUrl = await client.beginLogin();
      const hop1 = await fetch(authorizeUrl, { redirect: 'manual' });
      const googleState = new URL(hop1.headers.get('location')!).searchParams.get('state')!;
      const cb = new URL(`${BASE}/auth/google/callback`);
      cb.searchParams.set('state', googleState);
      cb.searchParams.set('code', 'g-code');
      const hop2 = await fetch(cb, { redirect: 'manual' });
      const landing = new URL(hop2.headers.get('location')!);
      const result = await client.completeLogin(landing.searchParams);
      expect(result.denied).toBe(true);
      expect(phases.at(-1)).toBe('denied');
      expect(storage.getItem('orrery.lab.rt')).toBeNull();
    } finally {
      writeFileSync(allowlistPath, JSON.stringify({ emails: [EMAIL] }));
    }
  }, 20_000);
});
