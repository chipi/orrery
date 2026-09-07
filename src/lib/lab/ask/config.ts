/**
 * Ask-box client config (F · #535 · pre-review item 1).
 *
 * The lab-api base is env-swappable: local dev talks to a locally-run lab-api
 * (`npm run lab-api:dev`, which itself targets the homelab gateway — the dev
 * path); every deployed build talks to the prod lab-api. The redirect URI is
 * DERIVED from origin + base so the same build works on orrerylearn.com
 * (`/lab/callback`), GH Pages (`/orrery/lab/callback`) and localhost — all
 * three exact strings are registered in lab-api's static client.
 */
import { base } from '$app/paths';

export const LAB_API_BASE: string =
  import.meta.env.VITE_LAB_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8093' : 'https://lab-api.orrerylearn.com');

export const CLIENT_ID = 'orrery-lab-web';

/**
 * RFC 8707 resource = the AS issuer = the API base, ONE value (F holistic
 * MINOR-5b): lab-api registers the SPA client with resource = its own issuer,
 * so any base override (dev, custom) must move all three together.
 */
export const ASK_RESOURCE = LAB_API_BASE;

export function redirectUri(): string {
  return `${location.origin}${base}/lab/callback`;
}
