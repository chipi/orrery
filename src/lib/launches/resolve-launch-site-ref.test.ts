import { describe, expect, it } from 'vitest';
import { resolveLaunchSiteRef, type PadMappingFile } from './resolve-launch-site-ref';

const mapping: PadMappingFile = {
  version: 1,
  sites: {
    'baikonur-1-5': {
      pad_name: ['1/5', 'Site 1/5', "Gagarin's Start", 'LC1/5', 'LC1'],
      pad_location_includes: ['Baikonur', 'niip-5', 'gik-5'],
    },
    'lc-39a': {
      pad_name: ['LC39A', 'LC-39A', 'Launch Complex 39A', 'Pad 39A'],
      pad_location_includes: ['Kennedy'],
    },
  },
};

describe('resolveLaunchSiteRef', () => {
  it('matches an exact pad name, case-insensitively', () => {
    expect(resolveLaunchSiteRef('lc1/5', 'NIIP-5', mapping)).toBe('baikonur-1-5');
  });

  it('falls back to a partial pad name inside a matching location', () => {
    expect(
      resolveLaunchSiteRef('Launch Complex 39A (historic)', 'Kennedy Space Center', mapping),
    ).toBe('lc-39a');
  });

  it('does not take a Plesetsk pad (NIIP-53) for Baikonur (NIIP-5)', () => {
    // "niip-5" is a prefix of "niip-53" and "lc1" of "lc132/2": only whole tokens may match.
    expect(resolveLaunchSiteRef('LC132/2', 'NIIP-53', mapping)).toBeNull();
    expect(resolveLaunchSiteRef('LC16/2', 'NIIP-53', mapping)).toBeNull();
  });

  it('a location anchor matches only the whole designation (NIIP-5 is not NIIP-53)', () => {
    expect(resolveLaunchSiteRef('LC1 (north)', 'NIIP-53', mapping)).toBeNull();
    expect(resolveLaunchSiteRef('LC1 (north)', 'NIIP-5', mapping)).toBe('baikonur-1-5');
  });

  it('does not take Baikonur pad 133 for pad 1', () => {
    expect(resolveLaunchSiteRef('LC133/3', 'NIIP-5', mapping)).toBeNull();
  });

  it('an exact pad name at another site is not this site (LC1 at Naro is not Baikonur 1/5)', () => {
    // Pad codes repeat between cosmodromes; the GCAT feed credited Naro, Sohae
    // and Hainan launches from their own "LC1" to Gagarin's Start.
    expect(resolveLaunchSiteRef('LC1', 'NARO', mapping)).toBeNull();
    expect(resolveLaunchSiteRef('LC1', 'SOHAE', mapping)).toBeNull();
    expect(resolveLaunchSiteRef('LC1', 'GIK-5', mapping)).toBe('baikonur-1-5');
    // No location given: the name alone still decides.
    expect(resolveLaunchSiteRef('LC1', '', mapping)).toBe('baikonur-1-5');
  });

  it('returns null without a pad name', () => {
    expect(resolveLaunchSiteRef(null, 'Baikonur', mapping)).toBeNull();
  });
});
