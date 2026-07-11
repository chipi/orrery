import { describe, it, expect } from 'vitest';
import { capabilities, anyCapability, type SensoryEnv } from './capabilities';

// One case per row of RFC-020 §7.3.
const base: SensoryEnv = {
  form: 'desktop',
  native: false,
  reducedMotion: false,
  hasVibrate: false,
};

describe('capabilities — RFC-020 §7.3 table', () => {
  it('desktop → AUDIO only', () => {
    expect(capabilities(base)).toEqual({ audio: true, gyro: false, haptic: false });
  });

  it('desktop Chrome exposing navigator.vibrate still hides HAPTIC (no hardware)', () => {
    expect(capabilities({ ...base, hasVibrate: true })).toEqual({
      audio: true,
      gyro: false,
      haptic: false,
    });
  });

  it('mobile Android web → all three (vibrate present)', () => {
    expect(capabilities({ ...base, form: 'phone', hasVibrate: true })).toEqual({
      audio: true,
      gyro: true,
      haptic: true,
    });
  });

  it('mobile iOS web → GYRO + AUDIO, no HAPTIC (no vibrate API)', () => {
    expect(capabilities({ ...base, form: 'phone', hasVibrate: false })).toEqual({
      audio: true,
      gyro: true,
      haptic: false,
    });
  });

  it('Capacitor (native) → all three regardless of web vibrate', () => {
    expect(capabilities({ ...base, form: 'phone', native: true })).toEqual({
      audio: true,
      gyro: true,
      haptic: true,
    });
  });

  it('reduced-motion on any device → AUDIO only', () => {
    expect(
      capabilities({ form: 'phone', native: true, reducedMotion: true, hasVibrate: true }),
    ).toEqual({ audio: true, gyro: false, haptic: false });
  });

  it('tablet behaves like a touch device (non-desktop)', () => {
    expect(capabilities({ ...base, form: 'tablet', hasVibrate: true }).gyro).toBe(true);
  });
});

describe('anyCapability', () => {
  it('is always true because AUDIO is universal', () => {
    expect(anyCapability(capabilities(base))).toBe(true);
  });
});
