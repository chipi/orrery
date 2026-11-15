import { describe, it, expect } from 'vitest';
import { resolveLaunchInstant } from './launch-instant';

const sts34 = {
  orrery_mission_ref: null,
  orrery_launcher_ref: 'space-shuttle-stack',
  orrery_launch_site_ref: 'lc-39b',
  net: '1989-10-18T16:53:40.000Z',
  net_precision: 'second',
};
const dart = {
  orrery_mission_ref: 'dart',
  orrery_launcher_ref: 'falcon-9',
  orrery_launch_site_ref: 'vandenberg-slc-4e',
  net: '2021-11-24T06:21:02.000Z',
  net_precision: 'minute',
};

function fakeFetch(files: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    const hit = Object.entries(files).find(([k]) => String(url).endsWith(k));
    return hit
      ? ({ ok: true, json: async () => hit[1] } as Response)
      : ({ ok: false, json: async () => ({}) } as Response);
  }) as unknown as typeof fetch;
}

const files = {
  'launches-historic/1980-1989.json': { entries: { a: sts34 } },
  'launches-historic/2020-2026.json': { entries: { b: dart } },
  'fleet/launch-site/lc-39b.json': { lat: 28.6273, lon: -80.6208 },
  'fleet/launch-site/vandenberg-slc-4e.json': { lat: 34.632, lon: -120.611 },
};
const cape = { lat: 28.56, lon: -80.58 };

describe('resolveLaunchInstant', () => {
  it("Shuttle (no mission ref): the date + launcher entry, at the entry's pad", async () => {
    const r = await resolveLaunchInstant(
      { missionId: 'galileo', departureDate: '1989-10-18', launcherId: 'space-shuttle-stack' },
      cape,
      fakeFetch(files),
    );
    expect(r).toEqual({
      utcMs: Date.UTC(1989, 9, 18, 16, 53, 40),
      latDeg: 28.6273,
      lonDeg: -80.6208,
    });
  });

  it('takes the pad from the entry, not the profile (a Vandenberg launch is not on the Cape)', async () => {
    const r = await resolveLaunchInstant(
      { missionId: 'dart', departureDate: '2021-11-24', launcherId: 'falcon-9' },
      cape,
      fakeFetch(files),
    );
    expect(r!.latDeg).toBeCloseTo(34.632, 3);
    expect(r!.lonDeg).toBeCloseTo(-120.611, 3);
  });

  it("the mission's own launch-site fleet ref wins over the entry's", async () => {
    const r = await resolveLaunchInstant(
      {
        missionId: 'dart',
        departureDate: '2021-11-24',
        launcherId: 'falcon-9',
        launchSiteRef: 'lc-39b',
      },
      cape,
      fakeFetch(files),
    );
    expect(r!.latDeg).toBeCloseTo(28.6273, 3);
  });

  it('falls back to the profile site when the pad file is missing', async () => {
    const r = await resolveLaunchInstant(
      { missionId: 'dart', departureDate: '2021-11-24', launcherId: 'falcon-9' },
      cape,
      fakeFetch({ 'launches-historic/2020-2026.json': { entries: { b: dart } } }),
    );
    expect(r).toEqual({ utcMs: Date.parse(dart.net), latDeg: cape.lat, lonDeg: cape.lon });
  });

  it('null for a Plan flight, a mission with no entry and a failed fetch: the light is seeded', async () => {
    expect(await resolveLaunchInstant({ missionId: 'plan-x' }, cape, fakeFetch(files))).toBeNull();
    expect(
      await resolveLaunchInstant(
        { missionId: 'nope', departureDate: '2021-01-01' },
        cape,
        fakeFetch(files),
      ),
    ).toBeNull();
    expect(await resolveLaunchInstant({ missionId: 'dart' }, cape, fakeFetch({}))).toBeNull();
  });
});
