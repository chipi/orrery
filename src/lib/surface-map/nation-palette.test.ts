import { describe, expect, it } from 'vitest';
import { NATION_COLORS, colorFor, nationChipFor, nationKey } from './nation-palette';

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
    expect(colorFor({ nation: 'Atlantis' })).toBe('#888');
  });
});

describe('nationChipFor', () => {
  it('matches USA via either nation or NASA agency', () => {
    expect(nationChipFor({ nation: 'USA', agency: '' })).toEqual({
      label: 'USA · NASA',
      color: '#3b82f6',
    });
    expect(nationChipFor({ nation: '', agency: 'NASA' })).toEqual({
      label: 'USA · NASA',
      color: '#3b82f6',
    });
  });

  it('matches USSR/Russia via either USSR, Russia, or ROSCOSMOS', () => {
    const ussr = nationChipFor({ nation: 'USSR', agency: '' });
    expect(ussr.label).toBe('USSR · Roscosmos');
    expect(nationChipFor({ nation: 'Russia', agency: '' }).label).toBe('USSR · Roscosmos');
    expect(nationChipFor({ nation: '', agency: 'ROSCOSMOS' }).label).toBe('USSR · Roscosmos');
  });

  it('falls back to raw nation/agency/dash when nothing matches', () => {
    expect(nationChipFor({ nation: 'Atlantis', agency: '' }).label).toBe('Atlantis');
    expect(nationChipFor({ nation: '', agency: 'AnyCorp' }).label).toBe('AnyCorp');
    expect(nationChipFor({ nation: '', agency: '' }).label).toBe('—');
  });
});
