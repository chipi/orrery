// The Lab's ask box is the author's private test (lab-api allowlist = one email),
// so visitors never see it. `?ask=on` shows it in this browser and persists across
// reloads and the sign-in redirect; `?ask=off` hides it again. Hiding is not the
// lock — the allowlist is.
const STORAGE_KEY = 'orrery.ask';

/** The reactive flag. Read `askSwitch.on`. */
export const askSwitch = $state({ on: false });

/** Read the persisted flag, then apply `?ask=on|off` from the URL. Client-only. */
export function initAskSwitch(
  search: string = typeof window === 'undefined' ? '' : window.location.search,
): void {
  if (typeof window === 'undefined') return;
  let on = false;
  try {
    on = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    /* storage unavailable */
  }
  const param = new URLSearchParams(search).get('ask');
  if (param === 'on' || param === 'off') {
    on = param === 'on';
    try {
      if (on) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stays in-memory for this page */
    }
  }
  askSwitch.on = on;
}
