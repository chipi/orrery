/**
 * lab-api allowlist (D · #533 · pre-review B).
 *
 * One JSON file on the bind-mounted state volume is the entire account model:
 * `{"emails": ["..."]}`. Re-read on EVERY check — no cache. Auth events are
 * rare (~6 accounts) and the freshness is the point: the operator edits the
 * file over SSH and the change is live on the next token refresh, no redeploy.
 *
 * Fail-closed: a missing or unparseable file denies everyone and logs loudly —
 * an allowlist that fails open is not an allowlist.
 */
import { readFileSync } from 'node:fs';

export function isAllowed(allowlistPath: string, email: string): boolean {
  let emails: unknown;
  try {
    emails = (JSON.parse(readFileSync(allowlistPath, 'utf8')) as { emails?: unknown }).emails;
  } catch (e) {
    console.error(`[lab-api] allowlist unreadable at ${allowlistPath} — DENYING ALL:`, e);
    return false;
  }
  if (!Array.isArray(emails) || !emails.every((e) => typeof e === 'string')) {
    console.error(`[lab-api] allowlist malformed at ${allowlistPath} — DENYING ALL`);
    return false;
  }
  const needle = email.trim().toLowerCase();
  return emails.some((e) => e.trim().toLowerCase() === needle);
}
