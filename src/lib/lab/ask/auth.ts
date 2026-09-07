/**
 * Ask-box auth core (F · #535 · pre-review items 1 + 3) — framework-free.
 *
 * OAuth 2.1 public-client (PKCE S256, no secret, ZERO cookies) against
 * lab-api's AS, plus the token lifecycle the D pre-review §C binds:
 *  - access token in MEMORY only (dies with the tab — XSS gets ≤1h);
 *  - refresh token in localStorage (survives reloads; rotation-managed);
 *  - silent refresh on load, single-flight, refresh-then-retry-once on 401.
 *
 * THE MULTI-TAB ROTATION TRAP (F pre-review risk 2): lab-api ROTATES the
 * refresh token on every grant and revokes the old one, so tab B refreshing
 * with a stale RT gets `invalid_grant` — indistinguishable from being
 * de-allowlisted. Protocol, in order: (a) serialize refreshes across tabs via
 * navigator.locks where available; (b) on invalid_grant re-read storage — if
 * the stored RT differs from the one we sent, another tab already rotated:
 * adopt it and retry ONCE; only an identical RT means the grant is truly dead
 * → clear tokens → signed-out. (c) rotation adoption happens by RE-READING
 * storage inside the refresh path (b); the `storage` listener handles only
 * the cross-tab LOGOUT case. Known no-lock-fallback window (holistic m-1):
 * without navigator.locks, tab B's invalid_grant can land before tab A's
 * success writes the new RT — B clears, A rewrites; transient signed-out UI
 * that self-heals. The locks path is immune.
 *
 * Deps are injected so unit tests run in plain node — no jsdom, no browser.
 */
import { ASK_RESOURCE, CLIENT_ID, LAB_API_BASE } from './config';

const RT_KEY = 'orrery.lab.rt';
const PKCE_PREFIX = 'orrery.lab.pkce.';

export interface AuthDeps {
  fetch: typeof fetch;
  /** localStorage-shaped: refresh token home. */
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  /** sessionStorage-shaped: PKCE verifier parking across the redirect. */
  session: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  /** navigator.locks.request when available; null degrades gracefully. */
  lock: ((name: string, cb: () => Promise<void>) => Promise<void>) | null;
  crypto: Crypto;
}

export function browserDeps(): AuthDeps {
  return {
    fetch: (...a) => fetch(...a),
    storage: localStorage,
    session: sessionStorage,
    lock: navigator.locks
      ? async (name, cb) => {
          await navigator.locks.request(name, cb);
        }
      : null,
    crypto,
  };
}

export type AuthPhase = 'signed-out' | 'signing-in' | 'signed-in' | 'denied';

export interface TokenExchangeResult {
  ok: boolean;
  /** `access_denied` on the callback means not-allowlisted — a distinct UX. */
  denied?: boolean;
  error?: string;
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class AskAuth {
  private accessToken: string | null = null;
  private refreshInFlight: Promise<boolean> | null = null;
  /** Bumped by logout(): an in-flight token exchange from before the bump
   *  must not resurrect tokens (holistic m-2). */
  private epoch = 0;

  constructor(
    private readonly deps: AuthDeps,
    private readonly redirectUri: string,
    private readonly onPhase: (p: AuthPhase) => void,
  ) {}

  /** Adopt cross-tab refresh-token rotations live (call once per page). */
  listenForRotation(win: Pick<Window, 'addEventListener'>): void {
    win.addEventListener('storage', (e) => {
      const ev = e as StorageEvent;
      if (ev.key === RT_KEY && ev.newValue === null && this.accessToken === null) {
        this.onPhase('signed-out'); // another tab logged out while we held nothing
      }
    });
  }

  hasSession(): boolean {
    return this.deps.storage.getItem(RT_KEY) !== null;
  }

  // ── Login redirect leg ───────────────────────────────────────────────────

  async beginLogin(): Promise<string> {
    const verifier = b64url(this.deps.crypto.getRandomValues(new Uint8Array(32)));
    const digest = await this.deps.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(verifier),
    );
    const challenge = b64url(new Uint8Array(digest));
    const state = b64url(this.deps.crypto.getRandomValues(new Uint8Array(16)));
    this.deps.session.setItem(PKCE_PREFIX + state, verifier);
    const url = new URL(`${LAB_API_BASE}/authorize`);
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('resource', ASK_RESOURCE);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async completeLogin(params: URLSearchParams): Promise<TokenExchangeResult> {
    if (params.get('error') === 'access_denied') {
      // Clear the parked verifier too (holistic m-4) — state rides the
      // error callback, so the sessionStorage entry needn't linger.
      const deniedState = params.get('state');
      if (deniedState) this.deps.session.removeItem(PKCE_PREFIX + deniedState);
      this.onPhase('denied');
      return { ok: false, denied: true };
    }
    const state = params.get('state') ?? '';
    const verifier = this.deps.session.getItem(PKCE_PREFIX + state);
    this.deps.session.removeItem(PKCE_PREFIX + state);
    const code = params.get('code');
    // RFC 9207: the AS advertises iss support and ALWAYS sends it, so a
    // callback WITHOUT iss is as suspect as a foreign one (holistic MINOR-5a).
    const iss = params.get('iss');
    if (!code || !verifier || iss !== ASK_RESOURCE) {
      this.onPhase('signed-out');
      return { ok: false, error: 'invalid callback' };
    }
    const res = await this.tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      code_verifier: verifier,
    });
    this.onPhase(res.ok ? 'signed-in' : 'signed-out');
    return res;
  }

  // ── Token lifecycle ──────────────────────────────────────────────────────

  private async tokenRequest(fields: Record<string, string>): Promise<TokenExchangeResult> {
    const epochAtStart = this.epoch;
    let resp: Response;
    try {
      resp = await this.deps.fetch(`${LAB_API_BASE}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, ...fields }),
      });
    } catch {
      return { ok: false, error: 'network' };
    }
    if (!resp.ok) {
      let error = `token endpoint ${resp.status}`;
      try {
        error = ((await resp.json()) as { error?: string }).error ?? error;
      } catch {
        /* body optional */
      }
      return { ok: false, error };
    }
    const body = (await resp.json()) as { access_token: string; refresh_token: string };
    if (epochAtStart !== this.epoch) return { ok: false, error: 'logged out' };
    this.accessToken = body.access_token;
    this.deps.storage.setItem(RT_KEY, body.refresh_token);
    return { ok: true };
  }

  /**
   * Single-flight, cross-tab-serialized refresh. Returns true when a valid
   * access token is in memory afterwards.
   */
  refresh(): Promise<boolean> {
    this.refreshInFlight ??= this.refreshInner().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async refreshInner(): Promise<boolean> {
    let result = false;
    const run = async (): Promise<void> => {
      result = await this.refreshOnce(true);
    };
    if (this.deps.lock) await this.deps.lock('orrery-lab-refresh', run);
    else await run();
    this.onPhase(result ? 'signed-in' : 'signed-out');
    return result;
  }

  private async refreshOnce(retryOnRace: boolean): Promise<boolean> {
    const rt = this.deps.storage.getItem(RT_KEY);
    if (!rt) return false;
    const res = await this.tokenRequest({ grant_type: 'refresh_token', refresh_token: rt });
    if (res.ok) return true;
    if (res.error === 'network') return false; // keep the RT — offline is not revocation
    if (res.error === 'invalid_grant') {
      // The rotation race (see header): only clear if OUR view was current.
      const stored = this.deps.storage.getItem(RT_KEY);
      if (retryOnRace && stored !== null && stored !== rt) return this.refreshOnce(false);
      this.accessToken = null;
      this.deps.storage.removeItem(RT_KEY);
      return false;
    }
    return false;
  }

  logout(): void {
    // Client-side only — lab-api has no revocation endpoint; the RT dies for
    // THIS browser, and the ≤1h access token ages out server-side.
    this.epoch += 1;
    this.accessToken = null;
    this.deps.storage.removeItem(RT_KEY);
    this.onPhase('signed-out');
  }

  // ── The authenticated /ask call ──────────────────────────────────────────

  /** Bearer fetch with one silent refresh-and-retry on 401. */
  async askFetch(body: unknown): Promise<Response> {
    if (!this.accessToken && !(await this.refresh())) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }
    const doPost = (): Promise<Response> =>
      this.deps.fetch(`${LAB_API_BASE}/ask`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(body),
      });
    let resp = await doPost();
    if (resp.status === 401 && (await this.refresh())) resp = await doPost();
    return resp;
  }
}
