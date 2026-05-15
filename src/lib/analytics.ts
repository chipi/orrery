/**
 * Umami analytics — production-only loader + thin event API.
 *
 * The Umami `script.js` is intentionally NOT in `src/app.html` because
 * that loads it on every host (localhost, vite preview, CI smoke
 * tests, GitHub Pages). We only want production traffic from
 * `chipi.github.io` counted; local dev + preview should be silent.
 *
 * Privacy stance: Umami is cookieless, PII-free, GDPR-friendly. Even
 * so, we restrict loading to the public host so the analytics dataset
 * is "real visitors" and not "engineer reloads".
 *
 * Event API: pass-through to `window.umami.track(name, props?)`.
 * Safe to call before the script loads (Umami queues internally) and
 * safe to call outside production (no-op).
 *
 * Suggested events to wire (see issue tracker — out-of-scope for this
 * file):
 *  - `mission-load` { id, dest, view } when a mission is loaded on /fly
 *  - `lens-toggle` { on } when the Science Lens flips
 *  - `layer-toggle` { layer, on } when a science layer flips
 *  - `science-section-view` { tab, section } on /science section page mount
 *  - `panel-tab-open` { entity, tab } on the mission/planet/etc panel tabs
 *  - `locale-switch` { from, to } when the user picks a locale chip
 *  - `cmdk-search` { query } when /science Cmd-K search lands a hit
 */

const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';
const UMAMI_WEBSITE_ID = 'fb07dfd6-1186-4a09-8e3b-524e6b5ac145';

/** Hostnames where Umami should actually load. Add staging hosts here
 *  if/when we have any; explicitly do NOT include localhost. */
const PRODUCTION_HOSTNAMES = new Set<string>(['chipi.github.io']);

/** Inject the Umami `<script>` exactly once, only on production hosts.
 *  Safe to call multiple times (idempotent). Call from the root
 *  +layout's onMount so it lands AFTER the route mounts but before
 *  most user interactions. */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!PRODUCTION_HOSTNAMES.has(window.location.hostname)) return;
  if (document.querySelector('script[data-umami-installed]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI_SCRIPT_URL;
  s.dataset.websiteId = UMAMI_WEBSITE_ID;
  s.setAttribute('data-umami-installed', '1');
  document.head.appendChild(s);
}

type UmamiGlobal = {
  track?: (name: string, props?: Record<string, unknown>) => void;
};

/** Track a custom event. Safe to call before the Umami script loads
 *  (it queues internally), and a no-op on non-production hosts. */
export function track(name: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const u = (window as unknown as { umami?: UmamiGlobal }).umami;
  if (u?.track) {
    u.track(name, props);
  }
}
