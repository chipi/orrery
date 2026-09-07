/**
 * Auth-core state machine (F · #535) — pure node, injected deps, no browser.
 * The rotation-race protocol is the load-bearing part: a wrong branch either
 * logs users out spuriously (tab race) or never logs them out (revocation).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';
import { AskAuth, type AuthDeps, type AuthPhase } from './auth';
import { LAB_API_BASE, CLIENT_ID, ASK_RESOURCE } from './config';

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

type FetchScript = (url: string, init?: RequestInit) => Response | Promise<Response>;

let storage: MemStorage;
let session: MemStorage;
let phases: AuthPhase[];
let script: FetchScript;

function makeAuth(lock: AuthDeps['lock'] = null): AskAuth {
  const deps: AuthDeps = {
    fetch: (async (url: RequestInfo | URL, init?: RequestInit) =>
      script(String(url), init)) as typeof fetch,
    storage,
    session,
    lock,
    crypto: webcrypto as Crypto,
  };
  return new AskAuth(deps, 'http://localhost:5373/lab/callback', (p) => phases.push(p));
}

const tokenResponse = (access: string, refresh: string): Response =>
  new Response(JSON.stringify({ access_token: access, refresh_token: refresh }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const oauthError = (error: string, status = 400): Response =>
  new Response(JSON.stringify({ error }), { status });

beforeEach(() => {
  storage = new MemStorage();
  session = new MemStorage();
  phases = [];
  script = () => {
    throw new Error('unexpected fetch');
  };
});

describe('PKCE + login leg', () => {
  it('beginLogin builds a spec-correct /authorize URL and parks the verifier', async () => {
    const auth = makeAuth();
    const url = new URL(await auth.beginLogin());
    expect(url.origin + url.pathname).toBe(`${LAB_API_BASE}/authorize`);
    expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('resource')).toBe(ASK_RESOURCE);
    // 43-char base64url challenge — exactly what lab-api's shape check demands.
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const state = url.searchParams.get('state')!;
    expect(session.getItem(`orrery.lab.pkce.${state}`)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('the challenge is REALLY S256(verifier) — same math as the AS', async () => {
    const auth = makeAuth();
    const url = new URL(await auth.beginLogin());
    const state = url.searchParams.get('state')!;
    const verifier = session.getItem(`orrery.lab.pkce.${state}`)!;
    const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const expected = Buffer.from(digest).toString('base64url');
    expect(url.searchParams.get('code_challenge')).toBe(expected);
  });

  it('completeLogin exchanges the code with the parked verifier and stores tokens', async () => {
    const auth = makeAuth();
    const authorizeUrl = new URL(await auth.beginLogin());
    const state = authorizeUrl.searchParams.get('state')!;
    const verifier = session.getItem(`orrery.lab.pkce.${state}`)!;
    let sawVerifier = '';
    script = (url, init) => {
      expect(url).toBe(`${LAB_API_BASE}/token`);
      const form = new URLSearchParams(String(init?.body));
      sawVerifier = form.get('code_verifier') ?? '';
      expect(form.get('grant_type')).toBe('authorization_code');
      return tokenResponse('at-1', 'rt-1');
    };
    const res = await auth.completeLogin(
      new URLSearchParams({ code: 'c1', state, iss: ASK_RESOURCE }),
    );
    expect(res.ok).toBe(true);
    expect(sawVerifier).toBe(verifier);
    expect(storage.getItem('orrery.lab.rt')).toBe('rt-1');
    expect(phases.at(-1)).toBe('signed-in');
    // Verifier is single-use.
    expect(session.getItem(`orrery.lab.pkce.${state}`)).toBeNull();
  });

  it('access_denied → the distinct not-allowlisted phase, no token call', async () => {
    const auth = makeAuth();
    const res = await auth.completeLogin(new URLSearchParams({ error: 'access_denied' }));
    expect(res.denied).toBe(true);
    expect(phases.at(-1)).toBe('denied');
  });

  it('a foreign iss on the callback hard-fails (RFC 9207 mix-up guard)', async () => {
    const auth = makeAuth();
    const authorizeUrl = new URL(await auth.beginLogin());
    const state = authorizeUrl.searchParams.get('state')!;
    const res = await auth.completeLogin(
      new URLSearchParams({ code: 'c1', state, iss: 'https://evil.example' }),
    );
    expect(res.ok).toBe(false);
    expect(phases.at(-1)).toBe('signed-out');
  });
});

describe('refresh + the rotation race', () => {
  it('silent refresh single-flights concurrent callers', async () => {
    storage.setItem('orrery.lab.rt', 'rt-1');
    let calls = 0;
    script = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return tokenResponse('at-2', 'rt-2');
    };
    const auth = makeAuth();
    const [a, b] = await Promise.all([auth.refresh(), auth.refresh()]);
    expect(a && b).toBe(true);
    expect(calls).toBe(1);
    expect(storage.getItem('orrery.lab.rt')).toBe('rt-2');
  });

  it('invalid_grant + a DIFFERENT stored RT = another tab rotated → adopt and retry once', async () => {
    storage.setItem('orrery.lab.rt', 'rt-stale');
    const auth = makeAuth();
    let attempt = 0;
    script = (_url, init) => {
      attempt += 1;
      const sent = new URLSearchParams(String(init?.body)).get('refresh_token');
      if (attempt === 1) {
        expect(sent).toBe('rt-stale');
        // Simulate tab B winning the race between our read and our request.
        storage.setItem('orrery.lab.rt', 'rt-fresh');
        return oauthError('invalid_grant');
      }
      expect(sent).toBe('rt-fresh');
      return tokenResponse('at-3', 'rt-next');
    };
    expect(await auth.refresh()).toBe(true);
    expect(storage.getItem('orrery.lab.rt')).toBe('rt-next');
    expect(phases.at(-1)).toBe('signed-in');
  });

  it('invalid_grant + the SAME stored RT = genuinely revoked → clear + signed-out', async () => {
    storage.setItem('orrery.lab.rt', 'rt-dead');
    script = () => oauthError('invalid_grant');
    const auth = makeAuth();
    expect(await auth.refresh()).toBe(false);
    expect(storage.getItem('orrery.lab.rt')).toBeNull();
    expect(phases.at(-1)).toBe('signed-out');
  });

  it('a NETWORK failure keeps the refresh token — offline is not revocation', async () => {
    storage.setItem('orrery.lab.rt', 'rt-keep');
    script = () => {
      throw new TypeError('fetch failed');
    };
    const auth = makeAuth();
    expect(await auth.refresh()).toBe(false);
    expect(storage.getItem('orrery.lab.rt')).toBe('rt-keep');
  });

  it('refresh serializes through the injected cross-tab lock when present', async () => {
    storage.setItem('orrery.lab.rt', 'rt-1');
    const order: string[] = [];
    const lock: AuthDeps['lock'] = async (_n, cb) => {
      order.push('acquire');
      await cb();
      order.push('release');
    };
    script = () => tokenResponse('at', 'rt-2');
    const auth = makeAuth(lock);
    await auth.refresh();
    expect(order).toEqual(['acquire', 'release']);
  });
});

describe('askFetch', () => {
  it('attaches the bearer and retries ONCE through a refresh on 401', async () => {
    storage.setItem('orrery.lab.rt', 'rt-1');
    const seq: string[] = [];
    script = (url, init) => {
      if (url.endsWith('/token')) {
        seq.push('refresh');
        return tokenResponse(`at-${seq.length}`, `rt-${seq.length}`);
      }
      seq.push(`ask:${(init?.headers as Record<string, string>).authorization}`);
      // First access token is stale → 401 once, then succeed.
      return seq.filter((s) => s.startsWith('ask')).length === 1
        ? oauthError('unauthorized', 401)
        : new Response(JSON.stringify({ answer: 'ok' }), { status: 200 });
    };
    const auth = makeAuth();
    const resp = await auth.askFetch({ question: 'q' });
    expect(resp.status).toBe(200);
    expect(seq.filter((s) => s === 'refresh')).toHaveLength(2); // initial + post-401
  });

  it('no session at all → immediate synthetic 401, no network', async () => {
    const auth = makeAuth();
    const resp = await auth.askFetch({ question: 'q' });
    expect(resp.status).toBe(401);
  });
});
