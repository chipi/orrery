// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import {
  classifyArPlatform,
  arAvailability,
  skyAvailability,
  isMobileSkyCapable,
  isArSessionSupported,
  detectArPlatform,
  isIosWeb,
  getArBackend,
  type ArEnv,
} from './ar';

const base: ArEnv = { capacitorPlatform: 'web', isNative: false, hasWebXR: false };

const origUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');

/** Stub `navigator.xr` (WebXR presence) — Capacitor reports 'web' in jsdom, so a
 *  truthy xr makes detectArPlatform resolve to the android-web branch. */
function stubWebXR(present: boolean): void {
  if (present) Object.defineProperty(navigator, 'xr', { configurable: true, value: {} });
  else delete (navigator as Navigator & { xr?: unknown }).xr;
}

function stubUserAgent(ua: string): void {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ua });
}

afterEach(() => {
  stubWebXR(false);
  if (origUserAgent) Object.defineProperty(navigator, 'userAgent', origUserAgent);
});

describe('classifyArPlatform (RFC-021 §3)', () => {
  it('wrapped iPhone → ARKit', () => {
    expect(classifyArPlatform({ ...base, capacitorPlatform: 'ios', isNative: true })).toBe(
      'iphone-wrapped',
    );
  });

  it('wrapped Android → WebXR (android-wrapped)', () => {
    expect(classifyArPlatform({ ...base, capacitorPlatform: 'android', isNative: true })).toBe(
      'android-wrapped',
    );
  });

  it('Android web with WebXR → android-web', () => {
    expect(classifyArPlatform({ ...base, hasWebXR: true })).toBe('android-web');
  });

  it('Android web WITHOUT WebXR → unsupported', () => {
    expect(classifyArPlatform({ ...base, hasWebXR: false })).toBe('unsupported');
  });

  it('desktop / iOS Safari (web, no WebXR) → unsupported', () => {
    expect(classifyArPlatform(base)).toBe('unsupported');
  });

  it('treats any web+WebXR as Android (iOS Safari never exposes navigator.xr)', () => {
    // The web-with-WebXR branch only fires on Android Chrome in practice —
    // Apple ships no WebXR, so `hasWebXR` is never true on iOS Safari.
    expect(classifyArPlatform({ capacitorPlatform: 'web', isNative: false, hasWebXR: true })).toBe(
      'android-web',
    );
  });
});

describe('arAvailability (#213)', () => {
  it('enabled on any supported AR platform', () => {
    expect(arAvailability('android-web', false)).toBe('enabled');
    expect(arAvailability('iphone-wrapped', false)).toBe('enabled');
  });
  it('ios-fallback on iOS Safari (unsupported + iosWeb)', () => {
    expect(arAvailability('unsupported', true)).toBe('ios-fallback');
  });
  it('hidden on desktop / unsupported non-iOS', () => {
    expect(arAvailability('unsupported', false)).toBe('hidden');
  });
});

describe('skyAvailability (#393 — XR or magic-window)', () => {
  it('enabled when a real immersive-AR session is supported', () => {
    expect(skyAvailability(true, false)).toBe('enabled'); // ARKit / WebXR
  });
  it('enabled via the magic window when XR is absent but the device is mobile', () => {
    expect(skyAvailability(false, true)).toBe('enabled'); // non-ARCore Android, iOS Safari
  });
  it('hidden only when neither substrate is available (desktop / no sensors)', () => {
    expect(skyAvailability(false, false)).toBe('hidden');
  });
});

describe('isMobileSkyCapable (magic-window gate)', () => {
  const orig = {
    doe: (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent,
    md: Object.getOwnPropertyDescriptor(navigator, 'mediaDevices'),
    mtp: Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints'),
    mm: Object.getOwnPropertyDescriptor(window, 'matchMedia'),
  };
  function setMobile(): void {
    (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = function () {};
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.resolve({}) },
    });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });
  }
  afterEach(() => {
    (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = orig.doe;
    if (orig.md) Object.defineProperty(navigator, 'mediaDevices', orig.md);
    else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
    if (orig.mtp) Object.defineProperty(navigator, 'maxTouchPoints', orig.mtp);
    if (orig.mm) Object.defineProperty(window, 'matchMedia', orig.mm);
    else delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('true on a touch device exposing DeviceOrientation + getUserMedia', () => {
    setMobile();
    expect(isMobileSkyCapable()).toBe(true);
  });
  it('true on a touch device with DeviceOrientation but NO getUserMedia (iOS PWA planetarium)', () => {
    // iOS Safari home-screen PWAs don't expose getUserMedia. The camera is only
    // an optional backdrop — the gyro sky must still be offered (regression guard
    // for the "PWA sky looks basic" gap; the substrate degrades to a dark-sky
    // planetarium when no camera).
    setMobile();
    delete (navigator as { mediaDevices?: unknown }).mediaDevices;
    expect(isMobileSkyCapable()).toBe(true);
  });
  it('false without the DeviceOrientation API', () => {
    setMobile();
    (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = undefined;
    expect(isMobileSkyCapable()).toBe(false);
  });
  it('false on desktop (no touch / coarse pointer) even with a webcam', () => {
    setMobile();
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    });
    expect(isMobileSkyCapable()).toBe(false);
  });
});

describe('isArSessionSupported (capability gate)', () => {
  it('is false on an unsupported platform (jsdom desktop — no navigator.xr)', async () => {
    expect(await isArSessionSupported()).toBe(false);
  });
});

describe('detectArPlatform (live env)', () => {
  it('unsupported on a jsdom desktop (web, no WebXR)', () => {
    expect(detectArPlatform()).toBe('unsupported');
  });

  it('android-web once navigator.xr is present', () => {
    stubWebXR(true);
    expect(detectArPlatform()).toBe('android-web');
  });
});

describe('isIosWeb', () => {
  it('false on a non-iOS user agent', () => {
    expect(isIosWeb()).toBe(false);
  });

  it('true on an iPhone Safari user agent (web, not wrapped)', () => {
    stubUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    );
    expect(isIosWeb()).toBe(true);
  });
});

describe('getArBackend (lazy backend load)', () => {
  it('returns null when AR is unsupported (jsdom desktop)', async () => {
    expect(await getArBackend()).toBeNull();
  });

  it('loads the WebXR backend when navigator.xr is present', async () => {
    stubWebXR(true);
    const backend = await getArBackend();
    expect(backend?.name).toBe('webxr');
  });
});
