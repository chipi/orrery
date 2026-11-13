/**
 * Orbit-ruler data (C4/C5): the founding-mission links and the "who lives here" thumbnails.
 * `mission_id` lives in the per-locale overlays, so the guard walks all 14 locales: the same
 * (bundle, regime, position, year, id) tuples everywhere, every id a real mission page, and no
 * trailing country or agency tag on a label.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const rj = <T = unknown>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const BUNDLES = [
  'orbit-regimes',
  'orbit-regimes-moon',
  'orbit-regimes-mars',
  'orbit-regimes-explore',
] as const;
const LOCALES = readdirSync('i18n-src').filter((l) =>
  existsSync(join('i18n-src', l, 'orbit-regimes')),
);

type First = { year: number; label: string; mission_id?: string };
type Resident = { id: string; label: string; agency: string };
type Overlay = { firsts?: First[]; residents?: Resident[] };
const ids = (loc: string, b: string) =>
  readdirSync(join('i18n-src', loc, b))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
const overlay = (loc: string, b: string, id: string) =>
  rj<Overlay>(join('i18n-src', loc, b, `${id}.json`));

const tuples = (loc: string) =>
  BUNDLES.flatMap((b) =>
    ids(loc, b).flatMap((id) =>
      (overlay(loc, b, id).firsts ?? []).map(
        (f, i) => `${b}/${id}#${i} ${f.year} ${f.mission_id ?? '-'}`,
      ),
    ),
  );

// The firsts a founding-mission list links: every one whose mission has a page.
const EXPECTED_LINKS = [
  'orbit-regimes/LEO#0 sputnik1',
  'orbit-regimes/LEO#1 vostok-1',
  'orbit-regimes/MOON#1 apollo8',
  'orbit-regimes-moon/LLO#0 luna10',
  'orbit-regimes-moon/LLO#1 apollo8',
  'orbit-regimes-moon/HLO#0 luna10',
  'orbit-regimes-mars/LMO#0 mariner9',
  'orbit-regimes-mars/LMO#1 mars-express',
  'orbit-regimes-mars/HMO#0 mariner9',
  'orbit-regimes-mars/DMO#0 hope-probe',
  'orbit-regimes-explore/HELIOPAUSE#0 voyager-1',
  'orbit-regimes-explore/HELIOPAUSE#1 voyager-2',
  'orbit-regimes-explore/KUIPER#1 new-horizons',
  'orbit-regimes-explore/KUIPER#2 new-horizons',
  'orbit-regimes-explore/GIANTS#0 pioneer-10',
  'orbit-regimes-explore/GIANTS#1 voyager-2',
  'orbit-regimes-explore/GIANTS#2 voyager-2',
  'orbit-regimes-explore/GIANTS#3 galileo',
  'orbit-regimes-explore/BELT#1 dawn',
  'orbit-regimes-explore/TERRESTRIAL#1 mariner4',
  'orbit-regimes-explore/TERRESTRIAL#2 mariner10',
  'orbit-regimes-explore/SUN#0 parker-solar-probe',
  'orbit-regimes-explore/SUN#1 solar-orbiter',
].sort();

// A trailing parenthetical that is only a country or agency (a "person, country" tail keeps the person).
const COUNTRY_TAILS = [
  'USA',
  'USSR',
  'China',
  'Netherlands',
  'ESA',
  'UdSSR',
  'Niederlande',
  'États-Unis',
  'URSS',
  'Chine',
  'Pays-Bas',
  'EE. UU.',
  'EE.UU.',
  'Países Bajos',
  'Cina',
  'Paesi Bassi',
  'VS',
  'Sovjet-Unie',
  'Nederland',
  'EUA',
  'Holanda',
  'США',
  'СССР',
  'Китай',
  'Нидерланды',
  'САД',
  'Кина',
  'Холандија',
  'الولايات المتحدة',
  'الاتحاد السوفييتي',
  'الاتحاد السوفيتي',
  'الصين',
  'هولندا',
  'अमेरिका',
  'सोवियत संघ',
  'चीन',
  'アメリカ',
  'ソ連',
  '中国',
  '미국',
  '소련',
  '중국',
  '美国',
  '苏联',
];
const tailOf = (label: string) => label.match(/[(（]([^()（）]*)[)）]\s*$/)?.[1]?.trim();

describe('orbit ruler: founding missions (C5)', () => {
  const missionIds = new Set(
    rj<{ id: string }[]>('static/data/missions/index.json').map((m) => m.id),
  );
  const reference = tuples('en-US');

  it('walks all 14 locales', () => {
    expect(LOCALES).toHaveLength(14);
  });

  it('en-US links exactly the 23 expected firsts', () => {
    const linked = reference
      .filter((t) => !t.endsWith(' -'))
      .map((t) => {
        const [pos, , id] = t.split(' ');
        return `${pos} ${id}`;
      })
      .sort();
    expect(linked).toEqual(EXPECTED_LINKS);
  });

  it.each(LOCALES)('%s carries the same (regime, position, year, mission_id) tuples', (loc) => {
    expect(tuples(loc)).toEqual(reference);
  });

  it.each(LOCALES)('%s: every mission_id is a real mission page', (loc) => {
    const bad = BUNDLES.flatMap((b) =>
      ids(loc, b).flatMap((id) =>
        (overlay(loc, b, id).firsts ?? [])
          .filter((f) => f.mission_id && !missionIds.has(f.mission_id))
          .map((f) => `${b}/${id}: ${f.mission_id}`),
      ),
    );
    expect(bad).toEqual([]);
  });

  it.each(LOCALES)('%s: no firsts label ends in a country or agency tag', (loc) => {
    const bad = BUNDLES.flatMap((b) =>
      ids(loc, b).flatMap((id) =>
        (overlay(loc, b, id).firsts ?? [])
          .filter((f) => COUNTRY_TAILS.includes(tailOf(f.label) ?? ''))
          .map((f) => `${b}/${id}: ${f.label}`),
      ),
    );
    expect(bad).toEqual([]);
  });
});

describe('orbit ruler: resident thumbnails (C4)', () => {
  const thumbs = rj<Record<string, string>>('static/data/orbit-regime-thumbs.json');
  // Residents with no image folder yet: image sourcing is a content task. A new resident must be
  // mapped or listed here, so the decision is never silent.
  const NO_THUMB = [
    'orbit-regimes/meteosat',
    'orbit-regimes/fengyun',
    'orbit-regimes/tundra',
    'orbit-regimes/ibex',
    'orbit-regimes/chandrayaan-2',
    'orbit-regimes/queqiao',
    'orbit-regimes-moon/queqiao',
    'orbit-regimes-moon/queqiao-2',
    'orbit-regimes-moon/capstone',
    'orbit-regimes-moon/gateway',
    'orbit-regimes-explore/pallas',
    'orbit-regimes-explore/hygiea',
    'orbit-regimes-explore/quaoar',
    'orbit-regimes-explore/arrokoth',
    'orbit-regimes-explore/sedna',
  ];
  const residents = BUNDLES.flatMap((b) =>
    ids('en-US', b).flatMap((id) =>
      (overlay('en-US', b, id).residents ?? []).map((r) => `${b}/${r.id}`),
    ),
  );

  it('every mapped file is on disk and is the 1x1 variant', () => {
    for (const [k, p] of Object.entries(thumbs)) {
      expect(p, k).toMatch(/^\/images\/.+\/01\.1x1\.jpg$/);
      expect(existsSync(join('static', p)), `${k} -> ${p}`).toBe(true);
    }
  });

  it('every resident is mapped or listed in NO_THUMB, never both', () => {
    for (const r of residents) {
      expect(r in thumbs || NO_THUMB.includes(r), `${r} has no decision`).toBe(true);
      expect(r in thumbs && NO_THUMB.includes(r), `${r} is in both`).toBe(false);
    }
  });

  it('has no stale keys', () => {
    for (const k of [...Object.keys(thumbs), ...NO_THUMB]) {
      expect(residents, `${k} is not a resident any more`).toContain(k);
    }
  });

  it('maps 49 residents and leaves 15 on the dot', () => {
    expect(Object.keys(thumbs)).toHaveLength(49);
    expect(NO_THUMB).toHaveLength(15);
  });
});
