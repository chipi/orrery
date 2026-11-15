import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAD_SITE_FAMILY, padSiteFromProfileName, resolvePadSpec } from './pad-family';

const sites = readdirSync(resolve(__dirname, '../../../static/data/fleet/launch-site'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

describe('pad family per launch-site fleet record (G4)', () => {
  it('has a row for every launch-site fleet record, and none for a record that is gone', () => {
    expect(sites.length).toBeGreaterThan(30);
    expect(sites.filter((s) => !(s in PAD_SITE_FAMILY))).toEqual([]);
    expect(Object.keys(PAD_SITE_FAMILY).filter((s) => !sites.includes(s))).toEqual([]);
  });

  it('gives each of the five families at least one site', () => {
    const fams = new Set(
      sites.flatMap((s) => [1960, 1985, 2005, 2015, 2025].map((y) => resolvePadSpec(s, y)?.family)),
    );
    for (const f of ['apollo-shuttle', 'soviet', 'spacex', 'ula', 'service-tower'])
      expect(fams.has(f as never)).toBe(true);
  });

  it('picks the LC-39A era from the launch year', () => {
    expect(resolvePadSpec('lc-39a', 1969)?.variant).toBe('apollo-lut');
    expect(resolvePadSpec('lc-39a', 1989)?.variant).toBe('shuttle');
    expect(resolvePadSpec('lc-39a', 2011)?.variant).toBe('shuttle');
    expect(resolvePadSpec('lc-39a', 2020)?.variant).toBe('f9-39a');
    expect(resolvePadSpec('lc-39b', 1970)?.variant).toBe('apollo-lut');
    expect(resolvePadSpec('lc-39b', 1989)?.variant).toBe('shuttle');
    expect(resolvePadSpec('lc-39b', 2022)?.variant).toBe('sls');
  });

  it('picks the SpaceX and ULA pads by date', () => {
    expect(resolvePadSpec('cape-canaveral-slc-40', 1997)?.variant).toBe('cape-classic');
    expect(resolvePadSpec('cape-canaveral-slc-40', 2015)?.variant).toBe('f9-te');
    expect(resolvePadSpec('cape-canaveral-slc-40', 2024)?.variant).toBe('f9-cat');
    expect(resolvePadSpec('vandenberg-slc-4e', 2019)?.variant).toBe('f9-te');
    expect(resolvePadSpec('cape-canaveral-slc-41', 2012)?.variant).toBe('atlas-v');
    expect(resolvePadSpec('cape-canaveral-slc-41', 1999)?.variant).toBe('cape-classic');
  });

  it('maps the Soviet and Russian pads, and Kourou Soyuz, to the support-arm family', () => {
    for (const s of ['baikonur-1-5', 'baikonur-31-6', 'plesetsk-43', 'vostochny-1s', 'kourou-els'])
      expect(resolvePadSpec(s, 2000)?.family).toBe('soviet');
    expect(resolvePadSpec('baikonur-81', 2000)?.variant).toBe('proton');
  });

  it('keeps the generic tower for a generic site, an unknown id and no id', () => {
    expect(resolvePadSpec('woomera', 1970)).toBeNull();
    expect(resolvePadSpec('nowhere', 1970)).toBeNull();
    expect(resolvePadSpec(null, 1970)).toBeNull();
  });

  it('with no year uses the pad as it is today', () => {
    expect(resolvePadSpec('lc-39a', null)?.variant).toBe('f9-39a');
  });

  it('finds the fleet id of a launch profile site name', () => {
    expect(padSiteFromProfileName('LC-39A · Kennedy Space Center')).toBe('lc-39a');
    expect(padSiteFromProfileName('LC-39B · Kennedy Space Center')).toBe('lc-39b');
    expect(padSiteFromProfileName('SLC-40 · Cape Canaveral')).toBe('cape-canaveral-slc-40');
    expect(padSiteFromProfileName('SLC-41 · Cape Canaveral')).toBe('cape-canaveral-slc-41');
    expect(padSiteFromProfileName('Site 31/6 · Baikonur Cosmodrome')).toBe('baikonur-31-6');
    expect(padSiteFromProfileName('LC-3 · Xichang')).toBe('xichang-lc-3');
    expect(padSiteFromProfileName('LC-101 · Wenchang')).toBe('wenchang-lc-101');
    expect(padSiteFromProfileName('ELA-3 · Kourou')).toBe('kourou-ela-3');
    expect(padSiteFromProfileName('Somewhere')).toBeNull();
  });
});
