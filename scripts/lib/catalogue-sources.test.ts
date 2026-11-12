import { describe, it, expect } from 'vitest';
import {
  adsUrl,
  angSepDeg,
  baumgardtRecordUrl,
  distanceLabel,
  dmToLy,
  huntReffertName,
  nearest,
  nedRecordUrl,
  ongcToDesignation,
  parseAsuTsv,
  parseBaumgardt,
  parseCsv,
  parseHarris,
  parseNedLookup,
  pickSimbadDistance,
  pickSimbadV,
  roundSig,
  simbadDistToLy,
  simbadIdentCandidates,
  simbadRecordUrl,
  vizierRowUrl,
} from './catalogue-sources.mjs';

describe('record URLs', () => {
  it('builds the canonical CDS / NED / ADS / Baumgardt pages', () => {
    expect(simbadRecordUrl('M 87')).toBe(
      'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=M%2087',
    );
    expect(nedRecordUrl('Messier 087')).toBe(
      'https://ned.ipac.caltech.edu/byname?objname=Messier%20087',
    );
    expect(adsUrl('2023A&A...673A.114H')).toBe(
      'https://ui.adsabs.harvard.edu/abs/2023A%26A...673A.114H/abstract',
    );
    expect(vizierRowUrl('J/A+A/673/A114/clusters', 'Name', 'NGC_6405')).toBe(
      'https://vizier.cds.unistra.fr/viz-bin/VizieR-4?-source=J%2FA%2BA%2F673%2FA114%2Fclusters&Name=NGC_6405',
    );
    expect(baumgardtRecordUrl('NGC5272')).toBe(
      'https://people.smp.uq.edu.au/HolgerBaumgardt/globular/fits/ngc5272.html',
    );
  });
});

describe('parsers', () => {
  it('parses quoted CSV from SIMBAD TAP', () => {
    expect(parseCsv('id,oidref\r\n"M  87",1937204\r\n"NAME Sgr A*",2419046\r\n')).toEqual([
      { id: 'M  87', oidref: '1937204' },
      { id: 'NAME Sgr A*', oidref: '2419046' },
    ]);
    expect(parseCsv('a,b\n"x ""q"" y",2\n')).toEqual([{ a: 'x "q" y', b: '2' }]);
    expect(parseCsv('')).toEqual([]);
  });

  it('parses VizieR asu-tsv (comments, header, units, dashes, rows)', () => {
    const tsv = [
      '#   VizieR',
      '#INFO	x=y',
      '',
      'Name\tType\tdist50',
      ' \t \tpc',
      '--------------------\t-\t---------------',
      'NGC_6405            \to\t   451.86978010',
    ].join('\n');
    expect(parseAsuTsv(tsv)).toEqual({
      columns: ['Name', 'Type', 'dist50'],
      rows: [{ Name: 'NGC_6405', Type: 'o', dist50: '451.86978010' }],
    });
    expect(parseAsuTsv('#only comments\n')).toEqual({ columns: [], rows: [] });
  });

  it('parses the NED ObjectLookup answer and rejects an unknown name', () => {
    expect(
      parseNedLookup({
        StatusCode: 100,
        Preferred: { Name: 'Messier 087', Position: { RA: 187.7, Dec: 12.39 } },
        ObjType: { Value: 'G' },
      }),
    ).toEqual({ name: 'Messier 087', ra: 187.7, dec: 12.39, type: 'G' });
    expect(parseNedLookup({ StatusCode: -100 })).toBeNull();
  });

  it('parses Baumgardt rows keyed like OpenNGC', () => {
    const text = [
      '#Cluster RA DEC l b Rsun Delta_R R_GC',
      'NGC_104           6.023792 -72.081306 305.895 -44.889    4.52   0.03    7.52  -17.45  0.16',
      'Pal_5            229.0 -0.1 0 0 21.9 0.2 18',
    ].join('\n');
    const m = parseBaumgardt(text);
    expect(m.get('NGC0104')).toMatchObject({ rsunKpc: 4.52, errKpc: 0.03 });
    expect(m.size).toBe(1);
  });

  it('parses Harris Part I (R_sun) and Part II (V_t, fixed width)', () => {
    const text = [
      '            Part I:  Identifications and Positional Data',
      ' NGC 6254   M 10         16 57 09.05  -04 06 01.1    15.14   23.08    4.4   4.6   3.9   1.1   1.7',
      ' NGC 5139   omega Cen    13 26 47.28  -47 28 46.5   309.10   14.97    5.2   6.4   4.8  -3.4  -1.6',
      '            Part II:  Metallicity and Photometry',
      ' NGC 6254    -1.56  4   0.28 14.65 14.08  6.60  -7.48   0.23  0.90  0.53  1.21  F3    0.00',
      ' NGC 5139    -1.53  4   0.12 14.52 14.10  3.54 -10.29   0.09  0.76  0.49  0.89  F7    0.00',
      '            Part III:  Velocities and Structural Parameters',
      ' NGC 6254    75.2   0.7    88.5     6.6   0.8   1.38      0.77  1.95   17.70   3.54   8.21  8.90',
    ].join('\n');
    const m = parseHarris(text);
    expect(m.get('NGC6254')).toEqual({ rsunKpc: 4.4, vt: 6.6 });
    expect(m.get('NGC5139')).toEqual({ rsunKpc: 5.2, vt: 3.54 });
  });
});

describe('transforms', () => {
  it('converts a distance modulus (Cosmicflows-4 M87 DM 31.134 is 55.0 Mly)', () => {
    expect(dmToLy(31.134) / 1e6).toBeCloseTo(55.0, 1);
  });

  it('converts SIMBAD distance units and refuses unknown ones', () => {
    expect(simbadDistToLy('2.22', 'kpc ')).toBeCloseTo(7240, -1);
    expect(simbadDistToLy('16.8', 'Mpc ')! / 1e6).toBeCloseTo(54.8, 1);
    expect(simbadDistToLy('458', 'pc  ')).toBeCloseTo(1493.9, 0);
    expect(simbadDistToLy('3', 'AU')).toBeNull();
    expect(simbadDistToLy('', 'pc')).toBeNull();
  });

  it('picks the newest parallax distance, else the newest row, and reports the spread', () => {
    const rows = [
      { dist: '0.5', unit: 'kpc ', method: 'kin', bibcode: '2006ApJ...653.1226Q' },
      { dist: '458.0', unit: 'pc  ', method: '', bibcode: '2018MNRAS.473..849D' },
      { dist: '433.0', unit: 'pc  ', method: 'plx', bibcode: '2020A&A...633A..51Z' },
      { dist: '400.0', unit: 'pc  ', method: 'paral', bibcode: '2019A&A...000A...1X' },
    ];
    const p = pickSimbadDistance(rows)!;
    expect(p.bibcode).toBe('2020A&A...633A..51Z');
    expect(p.ly).toBeCloseTo(433 * 3.2616, 0);
    expect(p.others).toBe(3);
    const noPlx = pickSimbadDistance(rows.slice(0, 2))!;
    expect(noPlx.bibcode).toBe('2018MNRAS.473..849D');
    expect(pickSimbadDistance([{ dist: '1', unit: 'pc', method: '', bibcode: '' }])).toBeNull();
    expect(pickSimbadDistance([])).toBeNull();
  });

  it('picks a V flux, preferring a cited newest row, ignoring other bands', () => {
    expect(
      pickSimbadV([
        { filter: 'B', flux: '9.59', bibcode: '2007ApJS..173..185G' },
        { filter: 'V', flux: '8.63', bibcode: '2007ApJS..173..185G' },
        { filter: 'V', flux: '8.9', bibcode: '' },
      ]),
    ).toEqual({ mag: 8.63, bibcode: '2007ApJS..173..185G' });
    expect(pickSimbadV([{ filter: 'V', flux: '5.8', bibcode: '' }])).toEqual({
      mag: 5.8,
      bibcode: null,
    });
    expect(pickSimbadV([{ filter: 'B', flux: '9', bibcode: '' }])).toBeNull();
  });

  it('formats distance labels with honest rounding', () => {
    expect(roundSig(27696, 2)).toBe(28000);
    expect(distanceLabel(1349.7)).toBe('~1,350 light-years');
    expect(distanceLabel(27696)).toBe('~28,000 light-years');
    expect(distanceLabel(2_540_000)).toBe('~2.5 million light-years');
    expect(distanceLabel(55_100_000)).toBe('~55 million light-years');
    expect(distanceLabel(1.2e9)).toBe('~1.2 billion light-years');
  });

  it('measures and matches on the sky', () => {
    expect(angSepDeg(10, 0, 11, 0)).toBeCloseTo(1, 6);
    expect(angSepDeg(359.5, 0, 0.5, 0)).toBeCloseTo(1, 6);
    const rows = [
      { ra: 10, dec: 10, id: 'far' },
      { ra: 10.1, dec: 10, id: 'near' },
    ];
    expect(nearest(rows, 10.09, 10, 0.5)!.row.id).toBe('near');
    expect(nearest(rows, 50, 50, 0.5)).toBeNull();
  });

  it('maps names between OpenNGC, SIMBAD and Hunt & Reffert', () => {
    expect(ongcToDesignation('NGC1976')).toBe('NGC 1976');
    expect(ongcToDesignation('IC0342')).toBe('IC 342');
    expect(ongcToDesignation('Cartwheel')).toBe('Cartwheel');
    expect(huntReffertName('NGC6405')).toBe('NGC_6405');
    expect(huntReffertName('IC0342')).toBe('IC_342');
    expect(huntReffertName('Mel022')).toBeNull();
    expect(simbadIdentCandidates('M87')).toContain('M  87');
    expect(simbadIdentCandidates('M1')).toContain('M   1');
    expect(simbadIdentCandidates('NGC 1976')).toContain('NGC  1976');
    expect(simbadIdentCandidates('Cas A')).toEqual(['Cas A']);
  });
});
