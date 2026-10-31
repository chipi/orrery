/**
 * lab-api token core (D · #533 · spike doc + Fable-5 pre-review A).
 *
 * The one identity layer both doors consume (D16): ES256 JWT access tokens —
 * asymmetric so the MCP resource server (#534) verifies via /jwks with no
 * shared secret — plus opaque server-side refresh tokens whose grant RE-CHECKS
 * the allowlist on every use (the revocation lever: remove an email from the
 * file and their access dies within the access-token lifetime).
 *
 * Persistence: a JSON state file on the bind-mounted volume holds the signing
 * keypair (stable /jwks across restarts) and refresh tokens (a redeploy never
 * forces every connector to re-auth). Written atomically (tmp + rename).
 * Pending-auth records and auth codes are deliberately IN-MEMORY: 10-minute /
 * 60-second TTLs — a restart mid-handshake fails one login, nothing more.
 *
 * All absolute URLs derive from the ISSUER constant (env), never from a Host
 * header — header-derived issuers are how AS mix-up attacks start.
 */
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify, generateKeyPair, exportJWK, importJWK, type JWK } from 'jose';

export const ACCESS_TOKEN_TTL_S = 3600; // 1 h — the allowlist-revocation ceiling
const REFRESH_TOKEN_BYTES = 32;
// Refresh tokens rotate on every use, so this is an idle timeout: a connector unused
// for 30 days signs in again, and abandoned tokens stop piling up in state.json (#597).
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;
// DCR (#464): bound the dynamic-client store so open registration can't bloat
// state.json / DoS the box. When full, the least recently used client WITHOUT a live
// refresh token is evicted, so a /register flood (whose clients never sign in) can only
// evict itself, never a connector in use (#597). All in use → registration refused.
const MAX_DYNAMIC_CLIENTS = 500;

/** A dynamically-registered (DCR) client — always PUBLIC (PKCE, no secret). */
export interface DynamicClientRecord {
  redirectUris: string[];
  resources: string[];
  createdAt: number;
  /** Last token issued to this client (eviction order). */
  lastUsedAt?: number;
}

export interface AccessClaims {
  sub: string; // Google's stable subject id
  email: string;
  scope: 'physics:read' | 'physics:ask';
  aud: string; // the RFC 8707 resource this token is FOR
}

interface StateFile {
  privateJwk: JWK;
  publicJwk: JWK;
  /** sha256(token-hex) → record. Tokens are never stored in the clear. */
  refresh: Record<string, RefreshRecord>;
  /** DCR (#464): client_id → registered public client. Survives redeploys so a
   *  friend's connector keeps working across restarts. */
  clients?: Record<string, DynamicClientRecord>;
}

interface RefreshRecord {
  sub: string;
  email: string;
  clientId: string;
  resource: string;
  /** Absent in state files written before the TTL; back-filled to load time. */
  issuedAt?: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class TokenCore {
  private state!: StateFile;
  private privateKey!: CryptoKey;
  private publicKey!: CryptoKey;

  private constructor(
    private readonly statePath: string,
    private readonly issuer: string,
    private readonly now: () => number,
  ) {}

  static async load(
    statePath: string,
    issuer: string,
    now: () => number = Date.now,
  ): Promise<TokenCore> {
    const core = new TokenCore(statePath, issuer, now);
    let loaded: StateFile | null = null;
    if (existsSync(statePath)) {
      try {
        loaded = JSON.parse(readFileSync(statePath, 'utf8')) as StateFile;
        if (!loaded?.privateJwk || !loaded.publicJwk || typeof loaded.refresh !== 'object') {
          throw new Error('missing keys or refresh map');
        }
      } catch (e) {
        // A corrupt file used to throw here and crash-loop the container. Keep it for
        // inspection and start over: new keys, so every client signs in again.
        const aside = `${statePath}.corrupt-${now()}`;
        renameSync(statePath, aside);
        console.error(
          `[lab-api] state file unreadable (${String(e)}); moved to ${aside}, starting fresh`,
        );
        loaded = null;
      }
    }
    if (loaded) {
      core.state = loaded;
    } else {
      const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
      core.state = {
        privateJwk: await exportJWK(privateKey),
        publicJwk: await exportJWK(publicKey),
        refresh: {},
        clients: {},
      };
      core.persist();
    }
    core.state.clients ??= {}; // back-fill for state files predating DCR (#464)
    const t = now();
    for (const r of Object.values(core.state.refresh)) r.issuedAt ??= t;
    core.pruneExpiredRefresh();
    core.state.publicJwk.alg = 'ES256';
    core.state.publicJwk.use = 'sig';
    core.state.publicJwk.kid ??= 'lab-api-1';
    core.privateKey = (await importJWK(core.state.privateJwk, 'ES256')) as CryptoKey;
    core.publicKey = (await importJWK(core.state.publicJwk, 'ES256')) as CryptoKey;
    return core;
  }

  private persist(): void {
    mkdirSync(dirname(this.statePath), { recursive: true });
    const tmp = join(dirname(this.statePath), `.state-${process.pid}.tmp`);
    // 0600 — the file holds the private signing key (holistic MINOR-4).
    writeFileSync(tmp, JSON.stringify(this.state), { mode: 0o600 });
    renameSync(tmp, this.statePath);
  }

  /** The /jwks document (public key only). */
  jwks(): { keys: JWK[] } {
    return { keys: [this.state.publicJwk] };
  }

  async issueAccessToken(claims: AccessClaims): Promise<string> {
    return new SignJWT({ email: claims.email, scope: claims.scope })
      .setProtectedHeader({ alg: 'ES256', kid: this.state.publicJwk.kid })
      .setIssuer(this.issuer)
      .setSubject(claims.sub)
      .setAudience(claims.aud)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_S}s`)
      .sign(this.privateKey);
  }

  /** Verify a token THIS issuer minted for THIS resource (Door-1's own check). */
  async verifyAccessToken(token: string, audience: string): Promise<AccessClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.publicKey, {
        issuer: this.issuer,
        audience,
      });
      return {
        sub: String(payload.sub),
        email: String(payload.email),
        scope: payload.scope as AccessClaims['scope'],
        aud: audience,
      };
    } catch {
      return null;
    }
  }

  private pruneExpiredRefresh(): boolean {
    const cutoff = this.now() - REFRESH_TOKEN_TTL_MS;
    let pruned = false;
    for (const [k, r] of Object.entries(this.state.refresh)) {
      if ((r.issuedAt ?? 0) < cutoff) {
        delete this.state.refresh[k];
        pruned = true;
      }
    }
    return pruned;
  }

  issueRefreshToken(record: {
    sub: string;
    email: string;
    clientId: string;
    resource: string;
  }): string {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    this.pruneExpiredRefresh();
    this.state.refresh[hashToken(token)] = { ...record, issuedAt: this.now() };
    const dyn = this.state.clients?.[record.clientId];
    if (dyn) dyn.lastUsedAt = this.now();
    this.persist();
    return token;
  }

  /** Look up a live refresh token (constant-time on the hash) WITHOUT consuming it. */
  refreshRecord(token: string): RefreshRecord | null {
    const key = hashToken(token);
    for (const [stored, record] of Object.entries(this.state.refresh)) {
      const a = Buffer.from(stored, 'hex');
      const b = Buffer.from(key, 'hex');
      if (a.length === b.length && timingSafeEqual(a, b)) {
        if ((record.issuedAt ?? 0) < this.now() - REFRESH_TOKEN_TTL_MS) {
          delete this.state.refresh[stored];
          this.persist();
          return null;
        }
        return record;
      }
    }
    return null;
  }

  revokeRefreshToken(token: string): void {
    delete this.state.refresh[hashToken(token)];
    this.persist();
  }

  // ── Dynamic client registration (DCR · RFC 7591 · #464) ───────────────────

  /** Register a PUBLIC DCR client; returns its generated client_id, or null when the
   *  store is full of clients that all hold a live refresh token. */
  registerClient(redirectUris: string[], resources: string[]): string | null {
    const clients = (this.state.clients ??= {});
    const ids = Object.keys(clients);
    if (ids.length >= MAX_DYNAMIC_CLIENTS) {
      this.pruneExpiredRefresh();
      const inUse = new Set(Object.values(this.state.refresh).map((r) => r.clientId));
      const idle = ids.filter((id) => !inUse.has(id));
      if (idle.length === 0) return null;
      const used = (id: string) => clients[id].lastUsedAt ?? clients[id].createdAt;
      const lru = idle.reduce((a, b) => (used(a) <= used(b) ? a : b));
      delete clients[lru];
    }
    const clientId = `dcr-${randomBytes(16).toString('hex')}`;
    clients[clientId] = { redirectUris, resources, createdAt: this.now() };
    this.persist();
    return clientId;
  }

  /** Look up a dynamically-registered client, or null. */
  dynamicClient(clientId: string): DynamicClientRecord | null {
    return this.state.clients?.[clientId] ?? null;
  }
}
