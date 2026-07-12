// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Exhibit's activate/deactivate/QR paths gate on `browser` — force it on so the
// DOM + QR-target branches actually run (mirrors the animate-loop test pattern).
vi.mock('$app/environment', () => ({ browser: true }));

import { exhibit } from './exhibit.svelte';

const ORIGIN = window.location.origin;

/** Point the live URL at `path` (jsdom same-origin) so exitHref/QR read it. */
function setUrl(path: string): void {
  window.history.replaceState({}, '', path);
}

beforeEach(() => {
  setUrl('/explore');
  exhibit.deactivate();
  document.body.classList.remove('exhibit-mode');
});

afterEach(() => {
  setUrl('/');
  exhibit.deactivate();
});

describe('urlWantsExhibit', () => {
  it('true only when ?mode=exhibit is present', () => {
    expect(exhibit.urlWantsExhibit(new URL(`${ORIGIN}/explore?mode=exhibit`))).toBe(true);
    expect(exhibit.urlWantsExhibit(new URL(`${ORIGIN}/explore`))).toBe(false);
    expect(exhibit.urlWantsExhibit(new URL(`${ORIGIN}/explore?mode=kiosk`))).toBe(false);
  });
});

describe('exitHref', () => {
  it('strips mode + qr but keeps path, other params, and hash', () => {
    setUrl('/mars?mode=exhibit&qr=abc&site=jezero#gallery');
    expect(exhibit.exitHref()).toBe('/mars?site=jezero#gallery');
  });

  it('returns a bare path when no params remain', () => {
    setUrl('/moon?mode=exhibit');
    expect(exhibit.exitHref()).toBe('/moon');
  });
});

describe('activate / deactivate', () => {
  it('activate flips active + stamps the body class; deactivate reverses it', () => {
    expect(exhibit.active).toBe(false);
    exhibit.activate();
    expect(exhibit.active).toBe(true);
    expect(document.body.classList.contains('exhibit-mode')).toBe(true);

    exhibit.deactivate();
    expect(exhibit.active).toBe(false);
    expect(document.body.classList.contains('exhibit-mode')).toBe(false);
  });

  it('deactivate is a no-op when not active', () => {
    exhibit.deactivate();
    expect(exhibit.active).toBe(false);
  });
});

describe('qrTarget (#computeQrTarget)', () => {
  it('defaults to the current URL minus mode/qr', () => {
    setUrl('/earth?mode=exhibit&layer=aurora');
    exhibit.activate();
    expect(exhibit.qrTarget).toBe(`${ORIGIN}/earth?layer=aurora`);
  });

  it('honours a ?qr=<base64> override', () => {
    const target = 'https://orrery.example/kiosk-landing';
    setUrl(`/explore?mode=exhibit&qr=${btoa(target)}`);
    exhibit.activate();
    expect(exhibit.qrTarget).toBe(target);
  });

  it('falls through to the default when the ?qr override is malformed base64', () => {
    setUrl('/explore?mode=exhibit&qr=!!!not-base64!!!');
    exhibit.activate();
    expect(exhibit.qrTarget).toBe(`${ORIGIN}/explore`);
  });
});
