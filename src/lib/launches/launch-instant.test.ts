import { describe, it, expect } from 'vitest';
import { resolveLaunchContext, resolveLaunchInstant } from './launch-instant';

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

describe('resolveLaunchContext (the pad the dossier names and the sun uses)', () => {
  const named = {
    ...files,
    'fleet/launch-site/vandenberg-slc-4e.json': {
      name: 'Vandenberg SLC-4E',
      lat: 34.632,
      lon: -120.611,
    },
    'fleet/launch-site/lc-39b.json': { name: 'Launch Complex 39B', lat: 28.6273, lon: -80.6208 },
  };
  const profileSite = { lat: 28.56, lon: -80.58, name: 'SLC-40 · Cape Canaveral' };

  it('DART names Vandenberg, not the profile site', async () => {
    const c = await resolveLaunchContext(
      { missionId: 'dart', departureDate: '2021-11-24', launcherId: 'falcon-9' },
      profileSite,
      fakeFetch(named),
    );
    expect(c.pad?.name).toBe('Vandenberg SLC-4E');
    expect(c.instant?.latDeg).toBeCloseTo(34.632, 3);
  });

  it("the mission's own launch-site fleet ref wins", async () => {
    const c = await resolveLaunchContext(
      {
        missionId: 'dart',
        departureDate: '2021-11-24',
        launcherId: 'falcon-9',
        launchSiteRef: 'lc-39b',
      },
      profileSite,
      fakeFetch(named),
    );
    expect(c.pad?.name).toBe('Launch Complex 39B');
  });

  it('a date-only entry still names its pad but gives no instant (seeded light)', async () => {
    const dayOnly = {
      orrery_mission_ref: 'dayonly',
      orrery_launcher_ref: 'falcon-9',
      orrery_launch_site_ref: 'vandenberg-slc-4e',
      net: '2021-01-01T00:00:00.000Z',
      net_precision: 'day',
    };
    const c = await resolveLaunchContext(
      { missionId: 'dayonly', departureDate: '2021-01-01', launcherId: 'falcon-9' },
      profileSite,
      fakeFetch({ ...named, 'launches-historic/2020-2026.json': { entries: { d: dayOnly } } }),
    );
    expect(c.pad?.name).toBe('Vandenberg SLC-4E');
    expect(c.instant).toBeNull();
  });

  it('a Plan flight, an unknown mission and a missing pad file use the profile site', async () => {
    const plan = await resolveLaunchContext({ missionId: 'plan-x' }, profileSite, fakeFetch(named));
    expect(plan.pad?.name).toBe('SLC-40 · Cape Canaveral');
    expect(plan.instant).toBeNull();
    const unknown = await resolveLaunchContext(
      { missionId: 'nope', departureDate: '2021-01-01' },
      profileSite,
      fakeFetch(named),
    );
    expect(unknown.pad?.name).toBe('SLC-40 · Cape Canaveral');
    const noFile = await resolveLaunchContext(
      { missionId: 'dart', departureDate: '2021-11-24', launcherId: 'falcon-9' },
      profileSite,
      fakeFetch({ 'launches-historic/2020-2026.json': { entries: { b: dart } } }),
    );
    expect(noFile.pad?.name).toBe('SLC-40 · Cape Canaveral');
  });
});

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
