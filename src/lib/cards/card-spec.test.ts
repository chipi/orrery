import { describe, expect, it } from 'vitest';
import { cardForMission } from './card-spec';
import type { Mission, MissionIndex } from '$types/mission';

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
    expect(spec.imagePath).toBe('/images/cards/mission/apollo11.png');
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
