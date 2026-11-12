import { describe, it, expect } from 'vitest';
import { catalogueKind, chooseDistance, chooseMag, enrichObject } from './deep-sky-catalogues.mjs';

const empty = () => ({
  harris: new Map(),
  baumgardt: new Map(),
  hr: [] as Array<{ name: string; type: string; ra: number; dec: number; distPc: number }>,
  cg: [] as Array<{ name: string; type: string; ra: number; dec: number; distPc: number }>,
  lg: new Map(),
  simbad: new Map(),
  cf4: new Map(),
  ned: new Map(),
});

const obj = (o: Record<string, unknown>) => ({
  designation: 'M0',
  ra: 10,
  dec: 10,
  type: 'G',
  vmag: null,
  size: null,
  ...o,
});

describe('catalogueKind', () => {
  it('reads the OpenNGC type, an explicit kind winning', () => {
    expect(catalogueKind({ type: 'GCl' })).toBe('globular');
    expect(catalogueKind({ type: 'OCl' })).toBe('open-cluster');
    expect(catalogueKind({ type: 'GPair' })).toBe('galaxy');
    expect(catalogueKind({ type: 'PN' })).toBe('other');
    expect(catalogueKind({ type: 'GCl', kind: 'galaxy-cluster' })).toBe('galaxy-cluster');
  });
});

describe('chooseMag', () => {
  it('uses Harris V_t for a globular cluster, not the OpenNGC value', () => {
    const d = empty();
    d.harris.set('NGC6254', { rsunKpc: 4.4, vt: 6.6 });
    const m = chooseMag(obj({ type: 'GCl', ongc: 'NGC6254', vmag: 4.98 }), d)!;
    expect(m.value).toBe(6.6);
    expect(m.bibcode).toBe('1996AJ....112.1487H');
    expect(m.source).toMatch(/Harris/);
  });

  it('uses OpenNGC V-Mag, never B', () => {
    const m = chooseMag(obj({ vmag: 8.4 }), empty())!;
    expect(m.value).toBe(8.4);
    expect(m.source).toMatch(/V-Mag/);
    expect(chooseMag(obj({ vmag: null }), empty())).toBeNull();
  });

  it("takes SIMBAD's V for a galaxy but not for a planetary nebula (central star)", () => {
    const d = empty();
    d.simbad.set('M0', {
      mainId: 'M 0',
      ra: 0,
      dec: 0,
      distRows: [],
      vRows: [{ filter: 'V', flux: '14.1', bibcode: '' }],
    });
    expect(chooseMag(obj({ type: 'G' }), d)!.value).toBe(14.1);
    expect(chooseMag(obj({ type: 'PN' }), d)).toBeNull();
  });
});

describe('chooseDistance', () => {
  it('globular cluster: Baumgardt & Vasiliev, Harris in the note', () => {
    const d = empty();
    d.baumgardt.set('NGC5272', { rsunKpc: 10.18, errKpc: 0.08 });
    d.harris.set('NGC5272', { rsunKpc: 10.2, vt: 6.19 });
    const e = chooseDistance(obj({ type: 'GCl', ongc: 'NGC5272' }), d)!;
    expect(e.value).toBeCloseTo(10.18 * 3261.56, -1);
    expect(e.bibcode).toBe('2021MNRAS.505.5957B');
    expect(e.record_url).toContain('fits/ngc5272.html');
    expect(e.note).toContain('Harris 1996 (2010 edition): 10.2 kpc');
  });

  it('open cluster: Hunt & Reffert by name, Cantat-Gaudin in the note', () => {
    const d = empty();
    d.hr.push({ name: 'NGC_6405', type: 'o', ra: 265, dec: -32, distPc: 451.87 });
    d.cg.push({ name: 'NGC_6405', type: 'o', ra: 265, dec: -32, distPc: 459 });
    const e = chooseDistance(obj({ type: 'OCl', ongc: 'NGC6405' }), d)!;
    expect(e.bibcode).toBe('2023A&A...673A.114H');
    expect(e.value).toBeCloseTo(451.87 * 3.26156, -1);
    expect(e.note).toContain('matched NGC_6405 by name');
    expect(e.note).toContain('Cantat-Gaudin et al. 2020 (NGC_6405): 459 pc');
    expect(e.record_url).toContain('Name=NGC_6405');
  });

  it('open cluster with no name match: nearest Type o within 0.25 degree, and says so', () => {
    const d = empty();
    d.hr.push({ name: 'Theia_517', type: 'o', ra: 10.1, dec: 10, distPc: 300 });
    d.hr.push({ name: 'Moving_group', type: 'm', ra: 10.0, dec: 10, distPc: 100 });
    const e = chooseDistance(obj({ type: 'OCl', ongc: 'NGC9999' }), d)!;
    expect(e.note).toMatch(/matched Theia_517 by position/);
    // a nebula (not an open-cluster type) never position-matches
    expect(chooseDistance(obj({ type: 'HII', ongc: 'NGC9999' }), d)).toBeNull();
  });

  it('galaxy: Cosmicflows-4 distance modulus with its range; cross-check note when SIMBAD disagrees', () => {
    const d = empty();
    d.cf4.set('M0', { pgc: '41361', dm: 31.134, eDm: 0.04, sepArcsec: 0.5 });
    const e = chooseDistance(obj({ type: 'G' }), d)!;
    expect(e.value / 1e6).toBeCloseTo(55.0, 1);
    expect(e.bibcode).toBe('2023ApJ...944...94T');
    expect(e.record_url).toContain('PGC=41361');
    expect(e.note).toContain('DM 31.134 +/- 0.04');

    d.simbad.set('M0', {
      mainId: 'M 0',
      ra: 0,
      dec: 0,
      vRows: [],
      distRows: [
        { dist: '8', unit: 'Mpc', method: '', bibcode: '2000A&A...000..000X' },
        { dist: '9', unit: 'Mpc', method: '', bibcode: '2001A&A...000..000X' },
      ],
    });
    expect(chooseDistance(obj({ type: 'G' }), d)!.note).toMatch(
      /SIMBAD compiled distances disagree/,
    );
  });

  it('galaxy missing from Cosmicflows-4: median of at least three SIMBAD distances, no bibcode', () => {
    const d = empty();
    const rows = ['10', '11', '12'].map((x, i) => ({
      dist: x,
      unit: 'Mpc',
      method: 'T-F',
      bibcode: `200${i}A&A...000..000X`,
    }));
    d.simbad.set('M0', { mainId: 'M 0', ra: 0, dec: 0, vRows: [], distRows: rows });
    const e = chooseDistance(obj({ type: 'G' }), d)!;
    expect(e.value / 1e6).toBeCloseTo(11 * 3.26156, 1);
    expect(e.bibcode).toBeNull();
    expect(e.source).toMatch(/median/);
    d.simbad.get('M0').distRows = rows.slice(0, 2);
    expect(chooseDistance(obj({ type: 'G' }), d)).toBeNull();
  });

  it('Local Group member and host-galaxy objects take McConnachie', () => {
    const d = empty();
    d.lg.set('Andromeda', { dKpc: 783, uncertain: false });
    d.lg.set('LMC', { dKpc: 51, uncertain: false });
    expect(chooseDistance(obj({ lg: 'Andromeda' }), d)!.note).toBe('whole kpc');
    const host = chooseDistance(obj({ type: 'HII', lgHost: 'LMC' }), d)!;
    expect(host.value).toBeCloseTo(51000 * 3.26156, -1);
    expect(host.note).toContain('host galaxy (LMC)');
    expect(host.bibcode).toBe('2012AJ....144....4M');
  });

  it('other types: newest SIMBAD parallax; rows without parallax that disagree give none', () => {
    const d = empty();
    d.simbad.set('M0', {
      mainId: 'M 0',
      ra: 0,
      dec: 0,
      vRows: [],
      distRows: [
        { dist: '1.0', unit: 'kpc', method: 'plx', bibcode: '2020A&A...633A..51Z' },
        { dist: '2.0', unit: 'kpc', method: '', bibcode: '2022A&A...633A..51Z' },
      ],
    });
    const e = chooseDistance(obj({ type: 'PN' }), d)!;
    expect(e.bibcode).toBe('2020A&A...633A..51Z');
    d.simbad.get('M0').distRows = [
      { dist: '1.0', unit: 'kpc', method: '', bibcode: '2000A&A...633A..51Z' },
      { dist: '5.0', unit: 'kpc', method: '', bibcode: '2022A&A...633A..51Z' },
    ];
    expect(chooseDistance(obj({ type: 'PN' }), d)).toBeNull();
  });
});

describe('enrichObject', () => {
  it('returns the scalar and a catalogue map whose values equal the scalars', () => {
    const d = empty();
    d.cf4.set('M0', { pgc: '1', dm: 30, eDm: 0.1, sepArcsec: 1 });
    d.ned.set('M0', { name: 'Messier 000' });
    const e = enrichObject(obj({ vmag: 9.1, size: 3.2 }), d);
    expect(e.mag).toBe(9.1);
    expect(e.catalogue.mag!.value).toBe(9.1);
    expect(e.catalogue.size_arcmin!.value).toBe(3.2);
    expect(e.catalogue.position!.value).toEqual([10, 10]);
    expect(e.records.ned).toContain('objname=Messier%20000');
    expect(e.catalogue.dist_ly!.source).toMatch(/Cosmicflows-4/);
  });

  it('explicit objects take SIMBAD coordinates only when within 0.1 degree', () => {
    const d = empty();
    d.simbad.set('M0', { mainId: 'NAME Cas A', ra: 10.05, dec: 10.0, vRows: [], distRows: [] });
    const near = enrichObject(obj({ explicit: true }), d);
    expect(near.ra).toBe(10.05);
    expect(near.catalogue.position!.source).toMatch(/SIMBAD/);
    expect(near.records.simbad).toContain('NAME%20Cas%20A');

    d.simbad.get('M0').ra = 12;
    const far = enrichObject(obj({ explicit: true }), d);
    expect(far.ra).toBe(10);
    expect(far.catalogue.position).toBeUndefined();
  });
});
