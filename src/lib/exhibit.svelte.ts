// Exhibit Mode state (#215 / RFC-021 §9). Turns any flat route into an
// unattended, chrome-less, looping museum/classroom kiosk: hides all chrome,
// auto-runs the Curator Full Tour on a loop (AudioOverlay owns the tour +
// per-route auto-navigation), shows a QR handoff, and locks out user input.
//
// Trigger: `?mode=exhibit` on load, or the in-app "Kiosk mode" button. Exit:
// Escape key or a hidden corner long-press. In-memory only (ADR-057).

import { browser } from '$app/environment';

const PARAM = 'mode';
const VALUE = 'exhibit';

class ExhibitState {
  active = $state(false);
  /** QR target — the current URL minus `?mode=exhibit`, or a `?qr=` override. */
  qrTarget = $state('');

  /** True when the current URL requests exhibit mode. */
  urlWantsExhibit(url: URL): boolean {
    return url.searchParams.get(PARAM) === VALUE;
  }

  activate(): void {
    if (!browser) return;
    if (!this.active) {
      this.active = true;
      document.body.classList.add('exhibit-mode');
    }
    // Recompute every activation/nav so the QR deep-links to the CURRENT scene.
    this.refreshQrTarget();
  }

  /** Recompute the QR target from the live URL (call on each navigation). */
  refreshQrTarget(): void {
    if (browser) this.#computeQrTarget();
  }

  deactivate(): void {
    if (!browser || !this.active) return;
    this.active = false;
    document.body.classList.remove('exhibit-mode');
  }

  /** Strip `mode`/`qr` from a URL — the target to navigate to on exit / for the QR. */
  exitHref(): string {
    const url = new URL(window.location.href);
    url.searchParams.delete(PARAM);
    url.searchParams.delete('qr');
    const qs = url.searchParams.toString();
    return url.pathname + (qs ? `?${qs}` : '') + url.hash;
  }

  #computeQrTarget(): void {
    const url = new URL(window.location.href);
    // Operator override: `?qr=<base64 url>` points the QR at a custom landing page.
    const override = url.searchParams.get('qr');
    if (override) {
      try {
        this.qrTarget = atob(override);
        return;
      } catch {
        /* malformed override — fall through to the default */
      }
    }
    url.searchParams.delete(PARAM);
    url.searchParams.delete('qr');
    this.qrTarget = url.toString();
  }
}

export const exhibit = new ExhibitState();
