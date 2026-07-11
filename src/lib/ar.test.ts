// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { classifyArPlatform, arAvailability, isArSessionSupported, type ArEnv } from './ar';

const base: ArEnv = { capacitorPlatform: 'web', isNative: false, hasWebXR: false };

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

describe('isArSessionSupported (capability gate)', () => {
  it('is false on an unsupported platform (jsdom desktop — no navigator.xr)', async () => {
    expect(await isArSessionSupported()).toBe(false);
  });
});
