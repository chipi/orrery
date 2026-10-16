import { createHash } from 'node:crypto';

/**
 * A sign-in email as it may appear in logs (#597): an 8-hex SHA-256 prefix
 * plus the domain. Repeat denials for one address still match each other in
 * the logs; the address itself never reaches them, or GlitchTip breadcrumbs
 * built from them.
 */
export function redactEmail(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  const domain = at >= 0 ? e.slice(at + 1) : '?';
  const hash = createHash('sha256').update(e).digest('hex').slice(0, 8);
  return `${hash}@${domain}`;
}
