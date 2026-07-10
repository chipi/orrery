import { describe, it, expect } from 'vitest';
import { base } from '$app/paths';
import {
  AGENCIES,
  resolveAgency,
  splitAgencies,
  resolveAgencyCompound,
  agencyLogo,
  agencyShortName,
  agencyFullName,
  agencyColor,
} from './agencies';

describe('resolveAgency', () => {
  it('resolves a canonical slug alias', () => {
    expect(resolveAgency('nasa')?.short).toBe('NASA');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(resolveAgency('  NASA  ')?.short).toBe('NASA');
    expect(resolveAgency('European Space Agency')?.short).toBe('ESA');
  });

  it('resolves a spelled-out LL2 full name alias', () => {
    expect(resolveAgency('national aeronautics and space administration')?.short).toBe('NASA');
  });

  it('returns null for null / undefined / empty input', () => {
    expect(resolveAgency(null)).toBeNull();
    expect(resolveAgency(undefined)).toBeNull();
    expect(resolveAgency('')).toBeNull();
  });

  it('returns null for an unregistered agency', () => {
    expect(resolveAgency('acme rockets')).toBeNull();
  });
});

describe('splitAgencies', () => {
  it('returns [] for empty input', () => {
    expect(splitAgencies(null)).toEqual([]);
    expect(splitAgencies(undefined)).toEqual([]);
    expect(splitAgencies('')).toEqual([]);
  });

  it('returns a single-element array for a lone agency', () => {
    expect(splitAgencies('NASA')).toEqual(['NASA']);
  });

  it('splits on the three compound separators', () => {
    expect(splitAgencies('NASA / ESA')).toEqual(['NASA', 'ESA']);
    expect(splitAgencies('Northrop Grumman + Lockheed Martin')).toEqual([
      'Northrop Grumman',
      'Lockheed Martin',
    ]);
    expect(splitAgencies('NASA & JAXA')).toEqual(['NASA', 'JAXA']);
  });

  it('strips a "Multi (...)" wrapper then splits', () => {
    expect(splitAgencies('Multi (NASA / ESA / ASI)')).toEqual(['NASA', 'ESA', 'ASI']);
  });

  it('trims components and drops empties', () => {
    expect(splitAgencies('NASA /  / ESA')).toEqual(['NASA', 'ESA']);
  });
});

describe('resolveAgencyCompound', () => {
  it('resolves every component of a compound string, in order', () => {
    expect(resolveAgencyCompound('NASA / ESA').map((a) => a.short)).toEqual(['NASA', 'ESA']);
  });

  it('de-duplicates repeated components', () => {
    expect(resolveAgencyCompound('NASA / nasa / NASA').map((a) => a.short)).toEqual(['NASA']);
  });

  it('silently drops components that do not resolve', () => {
    expect(resolveAgencyCompound('NASA / Nobody Inc').map((a) => a.short)).toEqual(['NASA']);
  });

  it('returns [] when nothing resolves', () => {
    expect(resolveAgencyCompound('Nobody / Nothing')).toEqual([]);
  });
});

describe('agencyLogo', () => {
  it('returns the base-prefixed logo path for an agency that ships one', () => {
    expect(agencyLogo('nasa')).toBe(`${base}/logos/nasa.svg`);
  });

  it('returns null for an agency with no logo asset', () => {
    // ULA ships no SVG (logo: null).
    expect(agencyLogo('ula')).toBeNull();
  });

  it('uses the first resolved component for a compound string', () => {
    expect(agencyLogo('NASA / ESA')).toBe(`${base}/logos/nasa.svg`);
  });

  it('returns null when the string resolves to nothing', () => {
    expect(agencyLogo('Nobody Inc')).toBeNull();
    expect(agencyLogo(null)).toBeNull();
  });
});

describe('agencyShortName / agencyFullName', () => {
  it('returns the canonical short + full names for a registered agency', () => {
    expect(agencyShortName('esa')).toBe('ESA');
    expect(agencyFullName('esa')).toBe('European Space Agency');
  });

  it('falls back to the input string when unregistered', () => {
    expect(agencyShortName('Acme')).toBe('Acme');
    expect(agencyFullName('Acme')).toBe('Acme');
  });

  it('returns an empty string for null / undefined', () => {
    expect(agencyShortName(null)).toBe('');
    expect(agencyFullName(undefined)).toBe('');
  });
});

describe('agencyColor', () => {
  it('returns the brand color for a registered agency', () => {
    expect(agencyColor('nasa')).toBe('#0B3D91');
  });

  it('takes the first resolved component of a compound string', () => {
    expect(agencyColor('ESA / NASA')).toBe('#003247');
  });

  it('returns null when nothing resolves', () => {
    expect(agencyColor('Nobody')).toBeNull();
    expect(agencyColor(null)).toBeNull();
  });
});

describe('AGENCIES registry integrity', () => {
  it('has no duplicate aliases across entries', () => {
    const seen = new Map<string, string>();
    for (const a of AGENCIES) {
      for (const alias of a.aliases) {
        const key = alias.trim().toLowerCase();
        expect(seen.has(key), `alias "${key}" duplicated (${seen.get(key)} vs ${a.short})`).toBe(
          false,
        );
        seen.set(key, a.short);
      }
    }
  });

  it('every entry is resolvable by each of its aliases', () => {
    for (const a of AGENCIES) {
      for (const alias of a.aliases) {
        expect(resolveAgency(alias)).toBe(a);
      }
    }
  });
});
