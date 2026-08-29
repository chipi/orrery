import { describe, it, expect } from 'vitest';
import { equatorialXyzToSkyDir, loadDeepSky, sunRiseSetEvents } from './celestial-sky';

// The AR render frame is ENU: [East, Up, −North] (a unit vector). At the J2000
// epoch the equatorial precession is the identity, so a star at the catalogue
// pole (0,0,1) sits exactly on the rotation axis: due north at an altitude equal
// to the observer's latitude — the deterministic check used below. Away from
// J2000 that same J2000-pole star precesses off the true pole (M1), which the
// last test guards.
const DEG = Math.PI / 180;
const JD = 2451545; // J2000 — precession is identity here, so (0,0,1) is the true pole.

describe('equatorialXyzToSkyDir — data direction → observer sky', () => {
  it('returns a unit vector', () => {
    const [e, u, n] = equatorialXyzToSkyDir(0.3, -0.8, 0.5, JD, 40 * DEG, -74 * DEG);
    expect(Math.hypot(e, u, n)).toBeCloseTo(1, 6);
  });

  it('the North Celestial Pole sits due north at altitude = latitude', () => {
    for (const latDeg of [0, 30, 45, 60, 90]) {
      const [east, up, negNorth] = equatorialXyzToSkyDir(0, 0, 1, JD, latDeg * DEG, 0);
      // alt = latitude  →  up = sin(lat)
      expect(up).toBeCloseTo(Math.sin(latDeg * DEG), 5);
      // due north  →  no east component; −north = −cos(lat)
      expect(east).toBeCloseTo(0, 5);
      expect(negNorth).toBeCloseTo(-Math.cos(latDeg * DEG), 5);
    }
  });

  it('the pole magnitude/frame the data was baked at is irrelevant (normalised)', () => {
    // Same direction scaled by the ~700 pc display radius the figures use.
    const unit = equatorialXyzToSkyDir(0, 0, 1, JD, 45 * DEG, 0);
    const scaled = equatorialXyzToSkyDir(0, 0, 700, JD, 45 * DEG, 0);
    for (let i = 0; i < 3; i++) expect(scaled[i]).toBeCloseTo(unit[i], 6);
  });

  it('the South Celestial Pole is below the horizon for a northern observer', () => {
    const [, up] = equatorialXyzToSkyDir(0, 0, -1, JD, 45 * DEG, 0); // dec = −90
    expect(up).toBeCloseTo(-Math.sin(45 * DEG), 5); // alt = −latitude
    expect(up).toBeLessThan(0);
  });

  it('the J2000 pole star precesses off true north away from J2000 (M1)', () => {
    // At J2000 (0,0,1) is exactly the pole; ~24 yr later precession has carried
    // it ≈0.3° away, so its horizon direction is no longer identical across
    // epochs (real: pole stars drift). Longitude is varied too to confirm the
    // shift is precession, not sidereal rotation (the pole is ~invariant to lon).
    const a = equatorialXyzToSkyDir(0, 0, 1, 2451545, 50 * DEG, 10 * DEG);
    const b = equatorialXyzToSkyDir(0, 0, 1, 2460000, 50 * DEG, -120 * DEG);
    const sepDeg =
      (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) /
      Math.PI;
    expect(sepDeg).toBeGreaterThan(0.05); // moved — precession is active (was ~0 pre-M1)
    expect(sepDeg).toBeLessThan(0.4); // but still near the pole (~0.13° in the horizon frame)
  });
});

describe('loadDeepSky — deep-sky filtering (#488)', () => {
  const fetchWith = (objects: unknown[]): typeof fetch =>
    (async () => ({ json: async () => ({ objects }) })) as unknown as typeof fetch;

  it('drops the star category (the bright-star layer already covers those)', async () => {
    const out = await loadDeepSky(
      '',
      fetchWith([
        { id: 'a', name: 'Sirius', category: 'star', x: 1, y: 0, z: 0, mag: -1.4 },
        { id: 'b', name: 'M31', category: 'galaxy', x: 0, y: 1, z: 0, mag: 3.4 },
      ]),
    );
    expect(out.map((o) => o.id)).toEqual(['b']);
  });

  it('drops entries without a usable position', async () => {
    const out = await loadDeepSky(
      '',
      fetchWith([
        { id: 'ok', name: 'M42', category: 'nebula', x: 0.1, y: 0.2, z: 0.9, mag: 4 },
        { id: 'no-xyz', name: 'M13', category: 'cluster', mag: 5.8 },
        { id: 'partial', name: 'M57', category: 'planetary', x: 0.3, y: 0.4, mag: 8.8 },
      ]),
    );
    expect(out.map((o) => o.id)).toEqual(['ok']);
  });

  it('defaults a missing magnitude to 6 and resolves [] on fetch failure', async () => {
    const [obj] = await loadDeepSky(
      '',
      fetchWith([{ id: 'x', name: 'X', category: 'galaxy', x: 1, y: 0, z: 0 }]),
    );
    expect(obj.mag).toBe(6);
    const failed = await loadDeepSky('', (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch);
    expect(failed).toEqual([]);
  });
});

describe('sunRiseSetEvents — horizon crossings (#488)', () => {
  const deg = (r: number) => ((r * 180) / Math.PI + 360) % 360;

  it('near the equinox on the equator, the Sun rises ~due east and sets ~due west', () => {
    // Equinox: sunrise ≈ 90° az, sunset ≈ 270° az, independent of longitude.
    const events = sunRiseSetEvents(new Date('2026-03-20T06:00:00Z'), 0, 0);
    const rise = events.find((e) => e.kind === 'sunrise');
    const set = events.find((e) => e.kind === 'sunset');
    expect(rise).toBeDefined();
    expect(set).toBeDefined();
    expect(deg(rise!.azRad)).toBeGreaterThan(80);
    expect(deg(rise!.azRad)).toBeLessThan(100);
    expect(deg(set!.azRad)).toBeGreaterThan(260);
    expect(deg(set!.azRad)).toBeLessThan(280);
  });

  it('each event direction sits on the horizon (up-component ≈ 0)', () => {
    for (const e of sunRiseSetEvents(new Date('2026-08-27T12:00:00Z'), -17.53, -149.57)) {
      expect(Math.abs(e.dir[1])).toBeLessThan(1e-3);
      expect(Math.hypot(...e.dir)).toBeCloseTo(1, 6);
    }
  });

  it('returns at most one sunrise and one sunset', () => {
    const events = sunRiseSetEvents(new Date('2026-08-27T00:00:00Z'), 40, -74);
    expect(events.filter((e) => e.kind === 'sunrise').length).toBeLessThanOrEqual(1);
    expect(events.filter((e) => e.kind === 'sunset').length).toBeLessThanOrEqual(1);
  });
});
