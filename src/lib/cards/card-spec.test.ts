import { describe, expect, it } from 'vitest';
import {
  cardForFleet,
  cardForMission,
  cardForSite,
  fleetAliasesMission,
  siteAliasMissionId,
} from './card-spec';
import type { Mission, MissionIndex } from '$types/mission';
import type { FleetEntry, FleetIndexEntry } from '$types/fleet';
import type { SurfaceSite } from '$types/surface-site';

const INDEX: MissionIndex[] = [
  { id: 'sputnik1', agency: 'USSR', dest: 'EARTH', status: 'FLOWN', year: 1957 },
  { id: 'apollo11', agency: 'NASA', dest: 'MOON', status: 'FLOWN', year: 1969 },
] as MissionIndex[];

const APOLLO: Mission = {
  id: 'apollo11',
  agency: 'NASA',
  agency_full: 'NASA',
  dest: 'MOON',
  status: 'FLOWN',
  year: 1969,
  sector: 'GOV',
  color: '#fff',
  departure_date: '1969-07-16',
  arrival_date: '1969-07-20',
  transit_days: 4,
  vehicle: 'Saturn V (AS-506)',
  payload: '46782 kg launched (CSM Columbia + LM Eagle)',
  delta_v: '~6 km/s (round trip)',
  data_quality: 'GOOD',
  credit: 'NASA',
  links: [],
  name: 'Apollo 11',
  type: 'CREWED LANDER · FLOWN',
  first: 'First humans on another celestial body',
  description:
    'The mission that fulfilled the promise. Two crew walked the surface for hours and returned safely with samples.',
} as unknown as Mission;

describe('cardForMission', () => {
  const spec = cardForMission(APOLLO, INDEX, '/images/missions/apollo11/01.webp');

  it('numbers the card from its index position', () => {
    expect(spec.number).toBe('002/2');
    expect(spec.collection).toBe('MISSIONS');
  });

  it('dedupes STATUS out of the kicker (the stat grid carries it)', () => {
    expect(spec.kicker).toBe('NASA · CREWED LANDER · 1969');
    expect(spec.stats.find((s) => s.label === 'STATUS')?.value).toBe('FLOWN');
  });

  it('formats dates into the card register', () => {
    expect(spec.stats.find((s) => s.label === 'LAUNCH')?.value).toBe('JUL 16 1969');
  });

  it('leads payload chips with the formatted quantity', () => {
    expect(spec.stats.find((s) => s.label === 'PAYLOAD')?.value).toBe('46,782 KG');
  });

  it('strips parentheticals from the vehicle chip', () => {
    expect(spec.stats.find((s) => s.label === 'VEHICLE')?.value).toBe('Saturn V');
  });

  it('carries the FIRST register + share artifacts', () => {
    expect(spec.factLabel).toBe('FIRST');
    expect(spec.fact).toMatch(/^First humans/);
    expect(spec.slug).toBe('orrery.day/c/mission/apollo11');
    expect(spec.imagePath).toBe('/images/cards/mission/apollo11.jpg');
    expect(spec.shareHref).toBe('/c/mission/apollo11');
    expect(spec.figureUrl).toBe('/images/missions/thumbnails/apollo11.webp');
  });

  it('caps the story to the lead sentences', () => {
    expect(spec.story).toBe(
      'The mission that fulfilled the promise. Two crew walked the surface for hours and returned safely with samples.',
    );
  });

  it('degrades cleanly when the mission is missing from the index', () => {
    const orphan = cardForMission({ ...APOLLO, id: 'ghost' } as Mission, INDEX);
    expect(orphan.number).toBe('—/2');
    expect(orphan.heroUrl).toBeUndefined();
  });
});

const FLEET_INDEX: FleetIndexEntry[] = [
  { id: 'saturn-v', category: 'launcher' },
  { id: 'f-1', category: 'engine' },
  { id: 'perseverance', category: 'rover' },
] as FleetIndexEntry[];

const SATURN_V: FleetEntry = {
  id: 'saturn-v',
  name: 'Saturn V',
  category: 'launcher',
  agency: 'NASA',
  country: 'USA',
  manufacturer: 'Boeing / North American Aviation / Douglas',
  first_flight: '1967-11-09',
  status: 'RETIRED',
  era: '1969-1981',
  epoch: 'lunar-era',
  best_known_for: 'Sent humans to the Moon',
  linked_missions: ['apollo8', 'apollo11'],
  credit: 'Skeleton entry for /fleet (PRD-012 v0.2 / Phase A scaffold).',
  links: [],
  description:
    'The largest machine that had ever flown. Five F-1 engines at its base threw 45 tonnes toward the Moon.',
} as unknown as FleetEntry;

describe('cardForFleet', () => {
  const spec = cardForFleet(SATURN_V, FLEET_INDEX, '/images/fleet/saturn-v/01.webp');

  it('numbers against the fleet index and carries the FLEET collection', () => {
    expect(spec.collection).toBe('FLEET');
    expect(spec.number).toBe('001/3');
  });

  it('builds the kicker from agency · category · first-flight year', () => {
    expect(spec.kicker).toBe('NASA · LAUNCHER · 1967');
  });

  it('maps the hardware stats (first flight, builder, missions count)', () => {
    expect(spec.stats.find((s) => s.label === 'FIRST FLIGHT')?.value).toBe('NOV 9 1967');
    expect(spec.stats.find((s) => s.label === 'BUILDER')?.value).toBe('Boeing');
    expect(spec.stats.find((s) => s.label === 'MISSIONS')?.value).toBe('2');
    expect(spec.stats.find((s) => s.label === 'STATUS')?.value).toBe('RETIRED');
  });

  it('uses best_known_for as the KNOWN FOR fact + fleet share artifacts', () => {
    expect(spec.factLabel).toBe('KNOWN FOR');
    expect(spec.fact).toBe('Sent humans to the Moon');
    expect(spec.slug).toBe('orrery.day/c/fleet/saturn-v');
    expect(spec.imagePath).toBe('/images/cards/fleet/saturn-v.jpg');
    expect(spec.shareHref).toBe('/c/fleet/saturn-v');
  });

  it('captions the figure ANATOMY only when a figure is passed', () => {
    expect(spec.figureCaption).toBeUndefined();
    const withFig = cardForFleet(SATURN_V, FLEET_INDEX, undefined, '/images/anatomy/saturn-v.webp');
    expect(withFig.figureCaption).toBe('ANATOMY');
  });

  it('falls back to the tagline when a skeleton entry has no description', () => {
    const skeleton = cardForFleet(
      { ...SATURN_V, description: undefined, tagline: 'Sent humans to the Moon' } as FleetEntry,
      FLEET_INDEX,
    );
    expect(skeleton.story).toBe('Sent humans to the Moon');
  });
});

describe('fleetAliasesMission', () => {
  it('flags fleet ids that exist in the mission index', () => {
    expect(fleetAliasesMission('apollo11', INDEX)).toBe(true);
    expect(fleetAliasesMission('saturn-v', INDEX)).toBe(false);
  });
});

const VIKING2: SurfaceSite = {
  id: 'viking2-lander',
  kind: 'surface',
  agency: 'NASA',
  nation: 'USA',
  year: 1976,
  landing_date: '1976-09-03',
  lat: 47.673,
  lon: 134.3,
  crewed: false,
  status: 'ENDED',
  surface_status: 'completed',
  surface_duration_days: 1281,
  samples_kg: 0,
  data_quality: 'good',
  credit: '© NASA / Viking Project — Utopia Planitia landing site.',
  links: [],
  name: 'Viking 2 lander',
  mission_type: 'Uncrewed Lander · Mission Complete',
  site_name: 'Utopia Planitia',
  fact: 'Operated 1,281 days at 48°N. Detected the first frost on Mars.',
} as SurfaceSite;

const SITES: SurfaceSite[] = [{ id: 'other' } as SurfaceSite, VIKING2];

describe('cardForSite', () => {
  const spec = cardForSite(VIKING2, SITES, 'mars', '/images/mars-sites/viking2-lander/01.webp');

  it('numbers against the body site list + carries the body collection', () => {
    expect(spec.collection).toBe('MARS SITES');
    expect(spec.number).toBe('002/2');
  });

  it('takes the vehicle class into the kicker, status stays in the grid', () => {
    expect(spec.kicker).toBe('NASA · UNCREWED LANDER · 1976');
    expect(spec.stats.find((s) => s.label === 'STATUS')?.value).toBe('ENDED');
  });

  it('formats surface stats — landed date, coords, surface days', () => {
    expect(spec.stats.find((s) => s.label === 'LANDED')?.value).toBe('SEP 3 1976');
    expect(spec.stats.find((s) => s.label === 'COORDS')?.value).toBe('47.7°N 134.3°E');
    expect(spec.stats.find((s) => s.label === 'SURFACE')?.value).toBe('1,281 D');
    expect(spec.stats.find((s) => s.label === 'SAMPLES')).toBeUndefined();
  });

  it('uses the site name as the SITE fact + site share artifacts', () => {
    expect(spec.factLabel).toBe('SITE');
    expect(spec.fact).toBe('Utopia Planitia');
    expect(spec.slug).toBe('orrery.day/c/mars-site/viking2-lander');
    expect(spec.imagePath).toBe('/images/cards/mars-site/viking2-lander.jpg');
    expect(spec.shareHref).toBe('/c/mars-site/viking2-lander');
  });

  it('strips the © prefix from the credit line', () => {
    expect(spec.creditLine.startsWith('SOURCES: NASA / Viking Project')).toBe(true);
  });

  it('maps orbiter sites to orbit stats', () => {
    const orbiter = cardForSite(
      {
        ...VIKING2,
        id: 'mro',
        kind: 'orbiter',
        altitude_km: 300,
        inclination_deg: 92.6,
        mission_type: 'Uncrewed Orbiter · Active',
      } as SurfaceSite,
      SITES,
      'mars',
    );
    expect(orbiter.stats.find((s) => s.label === 'ORBIT')?.value).toBe('300 KM');
    expect(orbiter.stats.find((s) => s.label === 'INCLINATION')?.value).toBe('92.6°');
    expect(orbiter.stats.find((s) => s.label === 'LANDED')).toBeUndefined();
  });
});

describe('siteAliasMissionId', () => {
  it('prefers mission_id, falls back to id parity, else null', () => {
    expect(siteAliasMissionId({ id: 'site-x', mission_id: 'apollo11' }, INDEX)).toBe('apollo11');
    expect(siteAliasMissionId({ id: 'sputnik1' }, INDEX)).toBe('sputnik1');
    expect(siteAliasMissionId({ id: 'viking2-lander' }, INDEX)).toBeNull();
    expect(siteAliasMissionId({ id: 'site-x', mission_id: 'not-a-mission' }, INDEX)).toBeNull();
  });
});
