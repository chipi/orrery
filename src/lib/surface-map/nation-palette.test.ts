import { describe, expect, it } from 'vitest';
import {
  NATION_COLORS,
  agencyNationKey,
  colorFor,
  nationChipFor,
  nationKey,
  objectNationKey,
} from './nation-palette';

describe('nationKey', () => {
  it('collapses USSR + Russia to USSR/Russia', () => {
    expect(nationKey('USSR')).toBe('USSR/Russia');
    expect(nationKey('Russia')).toBe('USSR/Russia');
  });

  it('passes other nation strings through unchanged', () => {
    expect(nationKey('USA')).toBe('USA');
    expect(nationKey('China')).toBe('China');
    expect(nationKey('UAE')).toBe('UAE');
  });
});

describe('colorFor', () => {
  it('returns the palette entry for known nations', () => {
    expect(colorFor({ nation: 'USA' })).toBe(NATION_COLORS.USA);
    expect(colorFor({ nation: 'China' })).toBe(NATION_COLORS.China);
  });

  it('routes USSR + Russia to the merged USSR/Russia color', () => {
    expect(colorFor({ nation: 'USSR' })).toBe(NATION_COLORS['USSR/Russia']);
    expect(colorFor({ nation: 'Russia' })).toBe(NATION_COLORS['USSR/Russia']);
  });

  it('falls back to neutral grey for unknown nations', () => {
    // Unhappy-path cast — `SurfaceNation` is a strict union, but the
    // helper is responsible for graceful handling of out-of-bounds
    // values the data layer could plausibly emit (data drift, dirty
    // sidecar entries).
    expect(colorFor({ nation: 'Atlantis' as never })).toBe('#888');
  });
});

describe('nationChipFor', () => {
  it('matches USA via either nation or NASA agency', () => {
    expect(nationChipFor({ nation: 'USA', agency: '' as never })).toEqual({
      label: 'USA · NASA',
      color: '#3b82f6',
    });
    expect(nationChipFor({ nation: '' as never, agency: 'NASA' })).toEqual({
      label: 'USA · NASA',
      color: '#3b82f6',
    });
  });

  it('matches USSR/Russia via either USSR, Russia, or ROSCOSMOS', () => {
    const ussr = nationChipFor({ nation: 'USSR', agency: '' as never });
    expect(ussr.label).toBe('USSR · Roscosmos');
    expect(nationChipFor({ nation: 'Russia', agency: '' as never }).label).toBe('USSR · Roscosmos');
    expect(nationChipFor({ nation: '' as never, agency: 'ROSCOSMOS' }).label).toBe(
      'USSR · Roscosmos',
    );
  });

  it('falls back to raw nation/agency/dash when nothing matches', () => {
    // Same unhappy-path cast as colorFor — graceful handling of
    // values outside the strict SurfaceNation/SurfaceAgency unions.
    expect(nationChipFor({ nation: 'Atlantis' as never, agency: '' as never }).label).toBe(
      'Atlantis',
    );
    expect(nationChipFor({ nation: '' as never, agency: 'AnyCorp' as never }).label).toBe(
      'AnyCorp',
    );
    expect(nationChipFor({ nation: '' as never, agency: '' as never }).label).toBe('—');
  });
});

describe('agencyNationKey', () => {
  it('maps each space agency to its NATION_COLORS key', () => {
    expect(agencyNationKey('NASA')).toBe('USA');
    expect(agencyNationKey('Roscosmos')).toBe('USSR/Russia');
    expect(agencyNationKey('CNSA')).toBe('China');
    expect(agencyNationKey('ISRO')).toBe('India');
    expect(agencyNationKey('JAXA')).toBe('Japan');
    expect(agencyNationKey('UAESA')).toBe('UAE');
    expect(agencyNationKey('ESA')).toBe('Europe');
  });

  it('buckets commercial + civil operators to their home nation', () => {
    expect(agencyNationKey('SpaceX')).toBe('USA');
    expect(agencyNationKey('Amazon')).toBe('USA');
    expect(agencyNationKey('NOAA')).toBe('USA');
    expect(agencyNationKey('USSF')).toBe('USA');
    expect(agencyNationKey('Eutelsat OneWeb')).toBe('Europe');
    expect(agencyNationKey('SES')).toBe('Europe');
    expect(agencyNationKey('European Commission')).toBe('Europe');
  });

  it('returns the same key returned must exist in NATION_COLORS', () => {
    for (const agency of ['NASA', 'ESA', 'CNSA', 'ISRO', 'JAXA', 'UAESA', 'Roscosmos']) {
      const key = agencyNationKey(agency)!;
      expect(Object.keys(NATION_COLORS)).toContain(key);
    }
  });

  it('returns null for agencies with no legend nation', () => {
    expect(agencyNationKey('CSA')).toBeNull(); // Canada — no palette entry
    expect(agencyNationKey('Unknownia Corp')).toBeNull();
    expect(agencyNationKey('')).toBeNull();
    expect(agencyNationKey(undefined)).toBeNull();
  });
});

describe('objectNationKey', () => {
  it('buckets by the first agency that resolves to a nation (primary attribution)', () => {
    expect(objectNationKey({ agencies: ['NASA', 'ESA'] })).toBe('USA');
    expect(objectNationKey({ agencies: ['ESA', 'NASA'] })).toBe('Europe');
  });

  it('skips leading unattributed agencies', () => {
    expect(objectNationKey({ agencies: ['CSA', 'JAXA'] })).toBe('Japan');
  });

  it('returns null when no agency resolves or list is empty', () => {
    expect(objectNationKey({ agencies: ['CSA'] })).toBeNull();
    expect(objectNationKey({ agencies: [] })).toBeNull();
    expect(objectNationKey({})).toBeNull();
  });
});
