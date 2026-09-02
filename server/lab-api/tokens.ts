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
  refresh: Record<string, { sub: string; email: string; clientId: string; resource: string }>;
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
  ) {}

  static async load(statePath: string, issuer: string): Promise<TokenCore> {
    const core = new TokenCore(statePath, issuer);
    if (existsSync(statePath)) {
      core.state = JSON.parse(readFileSync(statePath, 'utf8')) as StateFile;
    } else {
      const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
      core.state = {
        privateJwk: await exportJWK(privateKey),
        publicJwk: await exportJWK(publicKey),
        refresh: {},
      };
      core.persist();
    }
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

  issueRefreshToken(record: {
    sub: string;
    email: string;
    clientId: string;
    resource: string;
  }): string {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    this.state.refresh[hashToken(token)] = record;
    this.persist();
    return token;
  }

  /** Look up a refresh token (constant-time on the hash) WITHOUT consuming it. */
  refreshRecord(token: string): StateFile['refresh'][string] | null {
    const key = hashToken(token);
    for (const [stored, record] of Object.entries(this.state.refresh)) {
      const a = Buffer.from(stored, 'hex');
      const b = Buffer.from(key, 'hex');
      if (a.length === b.length && timingSafeEqual(a, b)) return record;
    }
    return null;
  }

  revokeRefreshToken(token: string): void {
    delete this.state.refresh[hashToken(token)];
    this.persist();
  }
}
