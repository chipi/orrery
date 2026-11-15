import { describe, it, expect } from 'vitest';
import { horizonsUrl, parseHorizonsCsv } from './horizons.mjs';

describe('horizonsUrl', () => {
  it('wraps every value in single quotes and encodes them, but not the format', () => {
    const url = horizonsUrl({ COMMAND: '10', START_TIME: '2026-01-01 12:00', CENTER: '500@399' });
    expect(url).toBe(
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='10'&START_TIME='2026-01-01%2012%3A00'&CENTER='500%40399'",
    );
  });
});

describe('parseHorizonsCsv', () => {
  const reply = [
    'header',
    ' Date__(UT)__HR:MN, , ,R.A._(a-app), DEC_(a-app),',
    '$$SOE',
    ' 2026-Jan-01 00:00, , ,   281.49470,   -23.01725,',
    ' 2026-Jan-02 00:00, , ,   282.59753,   -22.93267,',
    '$$EOE',
    'footer',
  ].join('\n');

  it('returns the trimmed cells of each row between the markers', () => {
    const rows = parseHorizonsCsv(reply);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('2026-Jan-01 00:00');
    expect(Number(rows[1][3])).toBeCloseTo(282.59753, 5);
    expect(Number(rows[1][4])).toBeCloseTo(-22.93267, 5);
  });

  it('throws on a reply without an ephemeris block, naming the start of it', () => {
    expect(() => parseHorizonsCsv('No ephemeris for target "x"')).toThrow(/no ephemeris block/);
  });
});
