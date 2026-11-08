import { describe, it, expect } from 'vitest';
import { latLonForTimeZone } from './viewer-location';

describe('latLonForTimeZone', () => {
  it('anchors a known zone to its city', () => {
    expect(latLonForTimeZone('Europe/Belgrade')).toEqual({ latDeg: 44.8, lonDeg: 20.47 });
  });
  it('resolves the legacy names Chromium reports', () => {
    expect(latLonForTimeZone('Asia/Calcutta')).toEqual(latLonForTimeZone('Asia/Kolkata'));
    expect(latLonForTimeZone('Europe/Kiev')).toEqual(latLonForTimeZone('Europe/Kyiv'));
    expect(latLonForTimeZone('Asia/Calcutta')).not.toBeNull();
  });
  it('returns null for an unknown zone', () => {
    expect(latLonForTimeZone('Etc/UTC')).toBeNull();
  });
});
