/**
 * Science links (UXD-022): the cap of five, curated lists, no repeated list inside a type, no repeated
 * card inside a ruler, and the section pairs identical in every locale. Reads the data like
 * `science-orphan-detector.test.ts` does; the ranking runs the real `rankMissionScience`.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  MISSION_SCIENCE_CLASSES,
  MISSION_SCIENCE_PINS,
  SCIENCE_LINK_MAX,
  classifyMission,
  pickScienceLinks,
  rankMissionScience,
  refsFromSlugs,
  type MissionScienceInput,
  type ScienceRef,
} from './science-links';

const rj = <T = unknown>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const key = (e: { tab: string; section: string }) => `${e.tab}/${e.section}`;
const LOCALES = readdirSync('i18n-src').filter((l) => existsSync(join('i18n-src', l, 'sun.json')));
const BODY_DIRS = ['planets', 'satellites', 'small-bodies', 'belts'];
const RULER_DIRS = [
  'orbit-regimes',
  'orbit-regimes-explore',
  'orbit-regimes-mars',
  'orbit-regimes-moon',
];

function jsonFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return jsonFiles(p);
    return f.endsWith('.json') ? [p] : [];
  });
}
const realSection = (tab: string, section: string) =>
  existsSync(join('static/data/science', tab, `${section}.json`));

type Overlay = { science_sections?: { tab: string; section: string; why?: string }[] };
const overlay = (loc: string, dir: string, id: string): Overlay =>
  rj<Overlay>(join('i18n-src', loc, dir, `${id}.json`));
const listOf = (o: Overlay) => (o.science_sections ?? []).map(key);

// The bodies each panel really draws: Pluto is a small body (explore/+page.svelte), not a planet.
const planetIds = rj<{ planets: { name: string }[] }>('static/data/planets.json')
  .planets.map((p) => p.name.toLowerCase())
  .filter((n) => n !== 'pluto');
const smallBodyIds = rj<{ bodies: { id: string }[] }>('static/data/small-bodies.json').bodies.map(
  (b) => b.id,
);
const idsIn = (dir: string) =>
  readdirSync(join('i18n-src/en-US', dir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
const BODIES: Record<string, string[]> = {
  planets: planetIds,
  satellites: idsIn('satellites'),
  'small-bodies': smallBodyIds,
  belts: idsIn('belts'),
};

// Missions: base file + the index's `crewed`, which is how MissionPanel builds its input.
const crewedById = new Map(
  rj<{ id: string; crewed?: boolean }[]>('static/data/missions/index.json').map((e) => [
    e.id,
    e.crewed,
  ]),
);
const missions: MissionScienceInput[] = jsonFiles('static/data/missions')
  .filter((p) => !p.endsWith('index.json'))
  .map((p) => {
    const m = rj<MissionScienceInput>(p);
    return { ...m, crewed: crewedById.get(m.id ?? '') };
  });

type SlugRow = { id: string; science?: string[] };
const modules = [
  ...rj<SlugRow[]>('static/data/iss-modules.json'),
  ...rj<SlugRow[]>('static/data/tiangong-modules.json'),
];
const earthObjects = rj<SlugRow[]>('static/data/earth-objects.json');

/** Size of the largest group of rows that carry the same set of sections. */
function largestIdenticalGroup(lists: string[][]): number {
  const n = new Map<string, number>();
  for (const l of lists) {
    const k = [...l].sort().join('|');
    n.set(k, (n.get(k) ?? 0) + 1);
  }
  return Math.max(...n.values());
}

describe('pickScienceLinks (T7)', () => {
  const r = (tab: string, section: string, why?: string): ScienceRef => ({ tab, section, why });

  it('dedupes by tab/section, first wins, keeps order', () => {
    const out = pickScienceLinks([r('a', 'x', 'first'), r('b', 'y'), r('a', 'x', 'second')]);
    expect(out.map(key)).toEqual(['a/x', 'b/y']);
    expect(out[0]!.why).toBe('first');
  });
  it('cuts at the cap and honours a smaller max', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => r('t', s));
    expect(pickScienceLinks(six)).toHaveLength(SCIENCE_LINK_MAX);
    expect(pickScienceLinks(six, 2).map((e) => e.section)).toEqual(['a', 'b']);
  });
  it('takes the cap from distinct entries, not from the raw length', () => {
    const dup = [r('t', 'a'), r('t', 'a'), r('t', 'a'), r('t', 'b'), r('t', 'c'), r('t', 'd')];
    expect(pickScienceLinks(dup).map((e) => e.section)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('handles undefined, null and empty input', () => {
    expect(pickScienceLinks(undefined)).toEqual([]);
    expect(pickScienceLinks(null)).toEqual([]);
    expect(pickScienceLinks([])).toEqual([]);
  });
  it('keeps an entry with a why intact', () => {
    const e = { tab: 'orbits', section: 'apsides', why: 'because' };
    expect(pickScienceLinks([e])[0]).toBe(e);
  });
  it('refsFromSlugs drops malformed slugs and keeps the rest', () => {
    expect(refsFromSlugs(['orbits/apsides', '', 'noslash', 'a/b/c', 'x/y']).map(key)).toEqual([
      'orbits/apsides',
      'x/y',
    ]);
    expect(refsFromSlugs(undefined)).toEqual([]);
  });
});

describe('rankMissionScience (T1, T7)', () => {
  const base: MissionScienceInput = { dest: 'EARTH' };
  it('is deterministic', () => {
    for (const m of missions.slice(0, 20)) {
      expect(rankMissionScience(m)).toEqual(rankMissionScience(m));
    }
  });
  it('classifies by dest, crew and entry data, never by the translated type', () => {
    expect(classifyMission({ dest: 'EARTH', crewed: true, year: 1961 })).toBe('crewed-early');
    expect(classifyMission({ dest: 'EARTH', crewed: true, year: 1973 })).toBe('crewed-earth-orbit');
    expect(classifyMission(base)).toBe('earth-uncrewed');
    expect(classifyMission({ dest: 'MOON', crewed: true })).toBe('crewed-lunar');
    expect(classifyMission({ dest: 'MOON' })).toBe('lunar-orbiter');
    const entry = { arrival: { entry_velocity_km_s: 2 } };
    expect(classifyMission({ dest: 'MOON', flight: entry })).toBe('lunar-lander');
    expect(classifyMission({ dest: 'MARS', flight: entry })).toBe('mars-lander');
    expect(classifyMission({ dest: 'MARS' })).toBe('mars-orbiter');
    expect(classifyMission({ dest: 'SATURN' })).toBe('outer-planet');
    expect(classifyMission({ dest: 'VENUS' })).toBe('inner-system');
    expect(classifyMission({ dest: 'BENNU' })).toBe('small-body');
  });
  it('leads with the defining phase the flight data has', () => {
    const first = (m: MissionScienceInput) => key(rankMissionScience(m)[0]!);
    expect(first({ dest: 'MARS', flight: { arrival: { entry_velocity_km_s: 5 } } })).toBe(
      'mission-phases/edl',
    );
    expect(first({ dest: 'MARS', flight: { arrival: { orbit_insertion_dv_km_s: 1 } } })).toBe(
      'mission-phases/orbit-insertion',
    );
    expect(first({ dest: 'SATURN', flight: { cruise: { tcm_count: 4 } } })).toBe(
      'mission-phases/tcm',
    );
    expect(first({ dest: 'SATURN', flight: { launch: {} } })).toBe(
      'mission-phases/trans-x-injection',
    );
    expect(first({ dest: 'SATURN' })).toBe('mission-phases/launch');
  });
  it('gates a section on the flight field that backs it, but only when there is a flight block', () => {
    const outer = (flight: MissionScienceInput['flight']) =>
      rankMissionScience({ dest: 'SATURN', flight }).map(key);
    expect(outer(null)).toContain('propulsion/c3');
    expect(outer({ launch: {} })).not.toContain('propulsion/c3');
    expect(outer({ launch: { c3_km2_s2: 30 } })).toContain('propulsion/c3');
  });
  it('puts the picks pinned to a mission right after the defining phase', () => {
    const out = rankMissionScience({ id: 'apollo11', dest: 'MOON', crewed: true }).map(key);
    expect(out[1]).toBe('history/apollo-11-1969');
    const sky = rankMissionScience({ id: 'curiosity', dest: 'MARS' }).map(key);
    expect(sky).toContain('mission-phases/skycrane');
    expect(rankMissionScience({ id: 'viking1', dest: 'MARS' }).map(key)).not.toContain(
      'mission-phases/skycrane',
    );
  });
  it('takes at most three per tab', () => {
    for (const m of missions) {
      const perTab = new Map<string, number>();
      for (const e of rankMissionScience(m)) perTab.set(e.tab, (perTab.get(e.tab) ?? 0) + 1);
      expect(Math.max(...perTab.values())).toBeLessThanOrEqual(3);
    }
  });
});

describe('the cap (T1)', () => {
  it('ranks at most five for every one of the 126 missions', () => {
    expect(missions).toHaveLength(126);
    const over = missions.filter((m) => rankMissionScience(m).length > SCIENCE_LINK_MAX);
    expect(over.map((m) => m.id)).toEqual([]);
    expect(missions.every((m) => rankMissionScience(m).length >= 3)).toBe(true);
  });
  it('holds in the data of every body, in every locale', () => {
    const over: string[] = [];
    for (const loc of LOCALES) {
      for (const d of BODY_DIRS)
        for (const id of idsIn(d)) {
          const f = join('i18n-src', loc, d, `${id}.json`);
          if (existsSync(f) && listOf(rj<Overlay>(f)).length > SCIENCE_LINK_MAX) over.push(f);
        }
      if (listOf(rj<Overlay>(join('i18n-src', loc, 'sun.json'))).length > SCIENCE_LINK_MAX)
        over.push(`${loc}/sun.json`);
    }
    expect(over).toEqual([]);
  });
  it('holds for fleet entries, station modules and Earth objects', () => {
    const over: string[] = [];
    for (const f of jsonFiles('static/data/fleet')) {
      const s = rj<{ science?: string[] }>(f).science;
      if (s && s.length > SCIENCE_LINK_MAX) over.push(f);
    }
    for (const row of [...modules, ...earthObjects])
      if ((row.science ?? []).length > SCIENCE_LINK_MAX) over.push(row.id);
    expect(over).toEqual([]);
  });
  it('gives every module and Earth object a list, with no repeated section inside it', () => {
    for (const row of [...modules, ...earthObjects]) {
      const s = row.science ?? [];
      expect(s.length, row.id).toBeGreaterThanOrEqual(2);
      expect(new Set(s).size, row.id).toBe(s.length);
    }
  });
  it('keeps the station banner to three science links', () => {
    const src = readFileSync('src/lib/components/StationOrbitBanner.svelte', 'utf8');
    expect((src.match(/localHref\(`\/science\//g) ?? []).length).toBeLessThanOrEqual(3);
  });
});

describe('real sections (T2)', () => {
  it('every referenced tab/section exists under static/data/science', () => {
    const missing: string[] = [];
    const check = (where: string, tab: string, section: string) => {
      if (!realSection(tab, section)) missing.push(`${where}: ${tab}/${section}`);
    };
    for (const [cls, list] of Object.entries(MISSION_SCIENCE_CLASSES))
      for (const e of list) check(`class ${cls}`, e.tab, e.section);
    for (const [id, es] of Object.entries(MISSION_SCIENCE_PINS))
      for (const e of es) check(`pin ${id}`, e.tab, e.section);
    for (const row of [...modules, ...earthObjects])
      for (const e of refsFromSlugs(row.science)) check(row.id, e.tab, e.section);
    for (const loc of LOCALES) {
      for (const d of BODY_DIRS)
        for (const id of idsIn(d)) {
          const f = join('i18n-src', loc, d, `${id}.json`);
          if (existsSync(f))
            for (const e of rj<Overlay>(f).science_sections ?? []) check(f, e.tab, e.section);
        }
      for (const e of overlayOf(join('i18n-src', loc, 'sun.json')))
        check(`${loc}/sun`, e.tab, e.section);
    }
    expect(missing).toEqual([]);
  });
});

function overlayOf(file: string) {
  return rj<Overlay>(file).science_sections ?? [];
}

describe('variety inside a body type (T3)', () => {
  for (const [dir, ids] of Object.entries(BODIES)) {
    describe(dir, () => {
      const lists = ids.map((id) => ({ id, list: listOf(overlay('en-US', dir, id)) }));
      it('every body has a curated list (there is no default)', () => {
        expect(lists.filter((l) => l.list.length === 0).map((l) => l.id)).toEqual([]);
      });
      it('no two bodies have the same set of sections', () => {
        const seen = new Map<string, string>();
        const same: string[] = [];
        for (const { id, list } of lists) {
          const k = [...list].sort().join('|');
          if (seen.has(k)) same.push(`${id} = ${seen.get(k)}`);
          else seen.set(k, id);
        }
        expect(same).toEqual([]);
      });
      if (dir !== 'belts')
        it('no section is on more than half of the panels of the type', () => {
          const n = new Map<string, number>();
          for (const { list } of lists)
            for (const s of new Set(list)) n.set(s, (n.get(s) ?? 0) + 1);
          const heavy = [...n].filter(([, c]) => c > lists.length / 2).map(([s, c]) => `${s} ${c}`);
          expect(heavy).toEqual([]);
        });
    });
  }
  it('the Sun has a curated list', () => {
    expect(overlayOf('i18n-src/en-US/sun.json').length).toBeGreaterThan(0);
  });
});

describe('rulers (T4)', () => {
  for (const dir of RULER_DIRS) {
    it(`${dir}: every pane has its own card, none repeats inside the ruler`, () => {
      const seen = new Map<string, string>();
      const problems: string[] = [];
      for (const f of readdirSync(join('i18n-src/en-US', dir)).filter((x) => x.endsWith('.json'))) {
        const link = rj<{ science_link?: { tab: string; section: string } }>(
          join('i18n-src/en-US', dir, f),
        ).science_link;
        if (!link) {
          problems.push(`${f}: no science_link`);
          continue;
        }
        const k = key(link);
        if (!realSection(link.tab, link.section)) problems.push(`${f}: ${k} does not exist`);
        if (seen.has(k)) problems.push(`${f}: ${k} also on ${seen.get(k)}`);
        else seen.set(k, f);
      }
      expect(problems).toEqual([]);
    });
  }
});

describe('families (T5)', () => {
  // A literal "no two alike" would need 126 hand-written lists; the rule is that no one list
  // covers more than a quarter of the family. Fleet engines and suits are excluded on purpose:
  // every engine illustrates the same two primers.
  const quarter = (n: number) => Math.floor(n * 0.25);
  it('missions: the largest group of identical lists is at most 25 %', () => {
    const lists = missions.map((m) => rankMissionScience(m).map(key));
    const distinct = new Set(lists.map((l) => [...l].sort().join('|'))).size;
    expect(distinct).toBeGreaterThan(15);
    expect(largestIdenticalGroup(lists)).toBeLessThanOrEqual(quarter(missions.length));
  });
  it('station modules: at most 25 %', () => {
    expect(largestIdenticalGroup(modules.map((m) => m.science ?? []))).toBeLessThanOrEqual(
      quarter(modules.length),
    );
  });
  it('Earth objects: at most 25 %', () => {
    expect(largestIdenticalGroup(earthObjects.map((m) => m.science ?? []))).toBeLessThanOrEqual(
      quarter(earthObjects.length),
    );
  });
});

describe('the section pair is the same in every locale (T6)', () => {
  const stripWhy = (o: Overlay) => listOf(o).join(',');
  it('science_sections tab/section equal en-US in every locale', () => {
    const drift: string[] = [];
    for (const loc of LOCALES) {
      if (loc === 'en-US') continue;
      const files: [string, string][] = BODY_DIRS.flatMap((d) =>
        readdirSync(join('i18n-src/en-US', d))
          .filter((f) => f.endsWith('.json'))
          .map((f): [string, string] => [
            join('i18n-src/en-US', d, f),
            join('i18n-src', loc, d, f),
          ]),
      );
      files.push(['i18n-src/en-US/sun.json', join('i18n-src', loc, 'sun.json')]);
      for (const [en, other] of files) {
        if (existsSync(other) && stripWhy(rj<Overlay>(en)) !== stripWhy(rj<Overlay>(other)))
          drift.push(other);
      }
    }
    expect(drift).toEqual([]);
  });
  it('every regime science_link equals en-US in every locale', () => {
    const drift: string[] = [];
    for (const loc of LOCALES) {
      if (loc === 'en-US') continue;
      for (const dir of RULER_DIRS)
        for (const f of readdirSync(join('i18n-src/en-US', dir)).filter((x) =>
          x.endsWith('.json'),
        )) {
          const other = join('i18n-src', loc, dir, f);
          if (!existsSync(other)) continue;
          const en = rj<{ science_link?: object }>(join('i18n-src/en-US', dir, f)).science_link;
          if (
            JSON.stringify(en) !== JSON.stringify(rj<{ science_link?: object }>(other).science_link)
          )
            drift.push(other);
        }
    }
    expect(drift).toEqual([]);
  });
});

describe('reach (T8)', () => {
  it('the module lists still carry every section of the old eleven-link cluster', () => {
    const old = [
      'space-stations/pressurized-volume',
      'space-stations/node-module',
      'life-in-space/crewed-station-design',
      'life-in-space/eclss-life-support',
      'life-in-space/crew-selection',
      'life-in-space/pre-flight-training',
      'life-in-space/crew-dynamics-psychology',
      'life-in-space/sleep-nutrition-circadian',
      'life-in-space/suit-lineage',
      'mission-phases/eva',
      'life-in-space/eva-physiology',
    ];
    const union = new Set(modules.flatMap((m) => m.science ?? []));
    expect(old.filter((s) => !union.has(s))).toEqual([]);
  });
  it('the mission classes and pins keep the sections the old push-chain was the only link to', () => {
    const union = new Set(
      [
        ...Object.values(MISSION_SCIENCE_CLASSES).flat(),
        ...Object.values(MISSION_SCIENCE_PINS).flat(),
      ].map(key),
    );
    for (const s of [
      'history/goddard-liquid-rocket-1926',
      'history/tsiolkovsky-equation-1903',
      'mission-phases/star-trackers',
      'orbits/true-anomaly',
      'scales-time/sidereal-synodic',
      'propulsion/throttling-and-gimbaling',
    ])
      expect(union.has(s), s).toBe(true);
  });
});
