/**
 * CI JWT minter (E · #534 · pre-review item 7) — gives the mcp-image round-trip
 * a real ES256 keypair + tokens without any lab-api container. jose only, no
 * hand-rolled crypto.
 *
 * Usage: node scripts/mint-ci-jwt.mjs <outdir> <issuer> <resource>
 * Writes <outdir>/jwks.json and prints two lines: a VALID token, then a
 * WRONG-AUDIENCE token (the negative probe).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SignJWT, generateKeyPair, exportJWK } from 'jose';

const [outdir, issuer, resource] = process.argv.slice(2);
if (!outdir || !issuer || !resource) {
  console.error('usage: mint-ci-jwt.mjs <outdir> <issuer> <resource>');
  process.exit(1);
}

const { privateKey, publicKey } = await generateKeyPair('ES256');
const publicJwk = await exportJWK(publicKey);
publicJwk.alg = 'ES256';
publicJwk.use = 'sig';
publicJwk.kid = 'ci-key-1';
mkdirSync(outdir, { recursive: true });
writeFileSync(join(outdir, 'jwks.json'), JSON.stringify({ keys: [publicJwk] }));

const mint = (aud) =>
  new SignJWT({ email: 'ci@example.com', scope: 'physics:read' })
    .setProtectedHeader({ alg: 'ES256', kid: 'ci-key-1' })
    .setIssuer(issuer)
    .setSubject('ci-subject')
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey);

console.log(await mint(resource));
console.log(await mint('https://wrong-audience.example'));
