import { describe, expect, it } from 'vitest';
import { localizeDeepSky, type DeepSkyImage } from './deep-sky';
import type { IconicTrajectoryData } from './three/iconic-trajectory';
import { localizeTrajectory } from './trajectory-overlay';
import { localizeVideos, type VideoProvenanceManifest } from './video-provenance';
import { localizeOriginalWork, originalWorkKey } from './original-work';

// Locale overlays for data sets whose English lives only in static/data
// (scripts/i18n-tools/build-en-overlays.mjs): each merge keeps keys and names,
// replaces only display text, and falls back to the English where a field is absent.

describe('localizeDeepSky', () => {
  const img = {
    key: 'jwst-carina',
    title: 'Cosmic Cliffs',
    caption: 'The edge of a stellar nursery.',
    subject: 'Nebula',
    type: 'Star-forming region',
    distance: '~7,600 light-years',
    taken: 'Released 12 Jul 2022',
    telescope: 'JWST',
    constellation: 'Carina',
  } as DeepSkyImage;
  it('replaces the translated fields and keeps names', () => {
    const [out] = localizeDeepSky([img], {
      'jwst-carina': { title: 'Kosmische Klippen', type: 'Sternentstehungsregion' },
    });
    expect(out.title).toBe('Kosmische Klippen');
    expect(out.type).toBe('Sternentstehungsregion');
    expect(out.caption).toBe(img.caption);
    expect(out.telescope).toBe('JWST');
    expect(out.constellation).toBe('Carina');
  });
  it('is a no-op without an overlay or an entry', () => {
    expect(localizeDeepSky([img], null)).toEqual([img]);
    expect(localizeDeepSky([img], { other: { title: 'x' } })).toEqual([img]);
  });
});

describe('localizeTrajectory', () => {
  const data = {
    id: 'voyager-1',
    name: 'Voyager 1',
    current_distance_label: '165 AU from the Sun',
    interstellar_since_label: 'Interstellar since 2012',
    waypoints: [
      { date: '1977-09-05', label: 'Launch', x: 0, y: 0, z: 0 },
      { date: '1979-03-05', x: 1, y: 0, z: 0 },
      { date: '2026-01-01', label: 'Today', x: 2, y: 0, z: 0 },
    ],
  } as unknown as IconicTrajectoryData;
  it('puts waypoint labels in display_label and keeps the English label', () => {
    const out = localizeTrajectory(data, {
      name: 'Вояджер-1',
      current_distance_label: '165 а. е. от Солнца',
      waypoints: [{ label: 'Запуск' }, null, { label: 'Сегодня' }],
    });
    expect(out.name).toBe('Вояджер-1');
    expect(out.current_distance_label).toBe('165 а. е. от Солнца');
    expect(out.interstellar_since_label).toBe('Interstellar since 2012');
    expect(out.waypoints[0].label).toBe('Launch');
    expect(out.waypoints[0].display_label).toBe('Запуск');
    expect(out.waypoints[1].display_label).toBeUndefined();
    expect(out.waypoints[2].label).toBe('Today');
  });
  it('is a no-op without an overlay', () => {
    expect(localizeTrajectory(data, null)).toBe(data);
  });
});

describe('localizeVideos', () => {
  const m = {
    schema_version: 1,
    generated_at: '',
    script_version: '',
    commit_sha: null,
    entries: [
      { id: 'vid-a', title: 'Apollo 11 — first steps', caption: 'One small step.' },
      { id: 'vid-b', title: 'Untranslated', caption: 'Stays.' },
    ],
  } as unknown as VideoProvenanceManifest;
  it('replaces title and caption by id', () => {
    const out = localizeVideos(m, { 'vid-a': { title: 'Apollo 11 — erste Schritte' } });
    expect(out.entries[0].title).toBe('Apollo 11 — erste Schritte');
    expect(out.entries[0].caption).toBe('One small step.');
    expect(out.entries[1]).toEqual(m.entries[1]);
    expect(localizeVideos(m, null)).toBe(m);
  });
});

describe('localizeOriginalWork', () => {
  const m = {
    generated_by: 'x',
    posters: [{ title: 'Solar System', file: '/images/posters/a.jpg', thumb: '/t.jpg' }],
    writing: [
      { title: 'Mission briefings', what: '114 narratives', where: 'Missions', route: '/m' },
    ],
  };
  it('keys entries by file, then thumbnail, then title', () => {
    expect(originalWorkKey(m.posters[0])).toBe('/images/posters/a_jpg');
    expect(originalWorkKey(m.writing[0])).toBe('Mission briefings');
  });
  it('merges per section and leaves non-array fields alone', () => {
    const out = localizeOriginalWork(m, {
      posters: { '/images/posters/a_jpg': { title: 'Sonnensystem' } },
      writing: { 'Mission briefings': { what: '114 Missionsberichte' } },
    });
    expect(out.posters[0].title).toBe('Sonnensystem');
    expect(out.writing[0].title).toBe('Mission briefings');
    expect(out.writing[0].what).toBe('114 Missionsberichte');
    expect(out.generated_by).toBe('x');
    expect(localizeOriginalWork(m, null)).toBe(m);
  });
});
