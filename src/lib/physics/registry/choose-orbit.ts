/** "Choose an orbit" formulas: regimes, geostationary altitude, signal latency, sun-synchronous, frozen orbit, coverage, launch azimuth. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { circularVelocityKms, orbitalPeriodS } from '../mechanics/orbits';
import { locationModel } from '../util/location';
import { MU_EARTH_KM3_S2, R_EARTH_KM } from '../util/constants';
import { ORBIT_BODY_IDS, SIDEREAL_DAY_MIN } from './shared';

/** Earth's second zonal harmonic (oblateness) and its reference equatorial radius (km). */
const J2_EARTH = 0.00108263;

const R_EARTH_EQ_KM = 6378.137;

/** Node-precession target for a sun-synchronous orbit: 360° per tropical year (rad/s). */
const SOLAR_NODE_RATE_RAD_S = (2 * Math.PI) / (365.2422 * 86400);

// ─── Family B / G10 "Choose an orbit" — regimes, geostationary, latency ───────
/** Bodies with a real "stationary" orbit worth teaching (fast rotators). */
const GEO_BODY_IDS = ['earth', 'mars'] as const;

/** Speed of light (km/s) — for signal-latency. */
const SPEED_OF_LIGHT_KMS = 299792.458;

/**
 * Orbit regime (G10 rung 1) — the altitude ⇄ speed ⇄ period trade every satellite designer
 * starts from. Circular speed v = √(µ/r) FALLS with altitude, and the period T = 2π√(r³/µ)
 * RISES: a 550 km Starlink laps the Earth in ~96 min, a 20 200 km GPS bird in ~12 h. Higher
 * means slower and longer — the reason low orbits give short passes and high orbits linger.
 */
export const orbitRegime: FormulaDef<{ body: string; altitudeKm: number }> = {
  id: 'orbit-regime',
  titleKey: 'lab.f.regime.title',
  glossaryKey: 'lab.f.regime.glossary',
  citationKey: 'orbits/orbit-regimes',
  learnMore: { url: 'https://en.wikipedia.org/wiki/List_of_orbits', source: 'wikipedia' },
  domain: 'satellite',
  tier: 3,
  prereqs: ['orbital-velocity'],
  latex: 'v = \\sqrt{\\mu/r},\\quad T = 2\\pi\\sqrt{r^3/\\mu}',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.regime.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.regime.altitude',
      units: 'km',
      kind: 'number',
      default: 550,
      min: 100,
      max: 50000,
    },
  ],
  outputs: [
    { key: 'speedKms', labelKey: 'lab.f.regime.speed', units: 'km/s' },
    { key: 'periodMin', labelKey: 'lab.f.regime.period', units: '' },
  ],
  compute: ({ body, altitudeKm }) => {
    const loc = locationModel(body);
    if (!loc) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.circular-orbits'],
      } satisfies FormulaResult;
    }
    if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.circular-orbits'],
      } satisfies FormulaResult;
    }
    const r = loc.rKm + altitudeKm;
    const v = circularVelocityKms(r, loc.muKm3s2);
    const periodMin = orbitalPeriodS(r, loc.muKm3s2) / 60;
    // Reference ring = the body's stationary orbit (period = sidereal day) — geostationary
    // for Earth, areostationary for Mars. Drawn faint so LEO/MEO read against it.
    const sidT = body === 'earth' ? SIDEREAL_DAY_MIN * 60 : Math.abs(loc.rotationHours) * 3600;
    const refAlt =
      sidT > 0 ? Math.cbrt((loc.muKm3s2 * sidT * sidT) / (4 * Math.PI * Math.PI)) - loc.rKm : 0;
    return {
      values: {
        speedKms: { value: v, units: 'km/s' },
        // minutes, but there's no 'min' Unit — carry '' (matching the output spec + the
        // ground-track wire partner), with "(min)" in the label (review G9 MINOR-1 fix).
        periodMin: { value: periodMin, units: '' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.circular-orbits', 'lab.assume.point-mass'],
      figure: {
        kind: 'orbit',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.circular-orbits'],
        bodyRadiusKm: loc.rKm,
        altitudeKm,
        refAltitudeKm: refAlt > 0 ? refAlt : undefined,
        periodMin,
        speedKms: v,
        bodyLabelKey: `lab.body.${body}`,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Geostationary altitude (G10 rung 2) — the one altitude where the period equals the planet's
 * SIDEREAL day, so the satellite hangs over a fixed spot: a = ∛(µT²/4π²), altitude = a − R. For
 * Earth (T = 23.93 h) that's ~35 786 km; Mars's areostationary orbit sits at ~17 000 km. It's
 * why every TV/weather satellite lives at one ring in the sky — point the dish once, done.
 */
export const geostationaryAltitude: FormulaDef<{ body: string }> = {
  id: 'geostationary-altitude',
  titleKey: 'lab.f.geo.title',
  glossaryKey: 'lab.f.geo.glossary',
  citationKey: 'orbits/special-orbits',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Geostationary_orbit', source: 'wikipedia' },
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: 'a = \\sqrt[3]{\\mu T^2 / 4\\pi^2}',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.geo.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...GEO_BODY_IDS],
    },
  ],
  outputs: [{ key: 'altitudeKm', labelKey: 'lab.f.geo.altitude', units: 'km' }],
  compute: ({ body }) => {
    const loc = locationModel(body);
    if (!loc || loc.rotationHours === 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.circular-orbits'],
      } satisfies FormulaResult;
    }
    // Sidereal day, seconds. Earth reads the canonical 23.9345 h (SIDEREAL_DAY_MIN, the same
    // day the ground-track formula uses) rather than the 2-dp 23.93 in the kinematics table, so
    // the two formulas agree to the km (review G10 MINOR-2).
    const T = body === 'earth' ? SIDEREAL_DAY_MIN * 60 : Math.abs(loc.rotationHours) * 3600;
    const a = Math.cbrt((loc.muKm3s2 * T * T) / (4 * Math.PI * Math.PI));
    const altitudeKm = a - loc.rKm;
    // curve: stationary altitude vs day length (faster spin → lower ring).
    const points: Vec2[] = [];
    for (let h = 6; h <= 48.001; h += 1) {
      const Th = h * 3600;
      points.push({
        x: h,
        y: Math.cbrt((loc.muKm3s2 * Th * Th) / (4 * Math.PI * Math.PI)) - loc.rKm,
      });
    }
    return {
      values: { altitudeKm: { value: altitudeKm, units: 'km' } },
      status: { ok: true },
      assumptions: ['lab.assume.circular-orbits', 'lab.assume.equatorial-orbit'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.circular-orbits'],
        x: { labelKey: 'lab.axis.day-length', units: '' },
        y: { labelKey: 'lab.axis.altitude', units: 'km' },
        series: [{ points }],
        marks: [
          {
            at: { x: Math.abs(loc.rotationHours), y: altitudeKm },
            labelKey: 'lab.mark.you-are-here',
            kind: 'point',
          },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Signal latency (G10 rung 3) — the price of altitude, in time. A radio signal to a satellite
 * and back covers twice the altitude at the speed of light: geostationary's ~35 786 km means a
 * ~0.24 s round trip (the lag on an old satellite phone call), while a 550 km Starlink shell is
 * under ~4 ms. Wire the geostationary altitude in and see why the megaconstellations went LOW.
 */
export const signalLatency: FormulaDef<{ altitudeKm: number }> = {
  id: 'signal-latency',
  titleKey: 'lab.f.latency.title',
  glossaryKey: 'lab.f.latency.glossary',
  citationKey: 'scales-time/light-minute',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Speed_of_light', source: 'wikipedia' },
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: '\\Delta t = 2h / c',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.latency.altitude',
      units: 'km',
      kind: 'number',
      default: 35786,
      min: 100,
      max: 40000,
    },
  ],
  outputs: [{ key: 'roundTripMs', labelKey: 'lab.f.latency.rt', units: '' }],
  compute: ({ altitudeKm }) => {
    if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.straight-line-path'],
      } satisfies FormulaResult;
    }
    const rtMs = ((2 * altitudeKm) / SPEED_OF_LIGHT_KMS) * 1000;
    const points: Vec2[] = [];
    for (let alt = 200; alt <= 40000.001; alt += 1000) {
      points.push({ x: alt, y: ((2 * alt) / SPEED_OF_LIGHT_KMS) * 1000 });
    }
    return {
      values: { roundTripMs: { value: rtMs, units: '' } },
      status: { ok: true },
      assumptions: ['lab.assume.straight-line-path', 'lab.assume.vacuum-speed'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/latency' },
        assumptions: ['lab.assume.straight-line-path'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.latency-ms', units: '' },
        series: [{ points }],
        marks: [
          { at: { x: altitudeKm, y: rtMs }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Sun-synchronous orbit (G10 — the J2 gem). Earth's equatorial bulge tugs an orbit's plane so
 * its ascending node drifts (Ω̇ = −(3/2)J2(R⊕/a)²n·cos i). Choose the inclination so that drift
 * exactly matches Earth's march around the Sun — 360° a year — and the orbit plane stays fixed
 * relative to the Sun, crossing every spot at the same LOCAL time forever. It works out to a
 * retrograde ~98° near-polar orbit, which is why nearly every imaging, weather and spy satellite
 * flies one. The nuisance that wrecks Kepler, turned into a tool.
 */
export const sunSynchronous: FormulaDef<{ altitudeKm: number }> = {
  id: 'sun-synchronous',
  titleKey: 'lab.f.sso.title',
  glossaryKey: 'lab.f.sso.glossary',
  citationKey: 'orbits/sun-synchronous',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Sun-synchronous_orbit', source: 'wikipedia' },
  domain: 'satellite',
  tier: 5,
  prereqs: ['orbit-regime'],
  latex: '\\cos i = \\dfrac{-\\dot\\Omega_\\odot}{\\tfrac32 J_2 (R_\\oplus/a)^2\\,n}',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.sso.altitude',
      units: 'km',
      kind: 'number',
      default: 700,
      min: 200,
      max: 2000,
    },
  ],
  outputs: [{ key: 'inclinationDeg', labelKey: 'lab.f.sso.inclination', units: 'deg' }],
  compute: ({ altitudeKm }) => {
    const inclAt = (alt: number): number | null => {
      const a = R_EARTH_EQ_KM + alt;
      const n = Math.sqrt(MU_EARTH_KM3_S2 / (a * a * a)); // rad/s
      const factor = 1.5 * J2_EARTH * (R_EARTH_EQ_KM / a) ** 2 * n;
      const cosI = -SOLAR_NODE_RATE_RAD_S / factor;
      return Math.abs(cosI) > 1 ? null : (Math.acos(cosI) * 180) / Math.PI;
    };
    const incl = Number.isFinite(altitudeKm) && altitudeKm > 0 ? inclAt(altitudeKm) : null;
    if (incl === null) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.sso.err-altitude' },
        assumptions: ['lab.assume.j2-secular'],
      } satisfies FormulaResult;
    }
    const points: Vec2[] = [];
    for (let alt = 200; alt <= 2000.001; alt += 50) {
      const i = inclAt(alt);
      if (i !== null) points.push({ x: alt, y: i });
    }
    return {
      values: { inclinationDeg: { value: incl, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.j2-secular', 'lab.assume.circular-orbits'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/j2' },
        assumptions: ['lab.assume.j2-secular'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.inclination', units: 'deg' },
        series: [{ points }],
        marks: [
          { at: { x: altitudeKm, y: incl }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Frozen orbit / critical inclination (G10 — the OTHER J2 gem). The same bulge also swivels an
 * orbit's perigee (ω̇ ∝ 5cos²i − 1). At the "critical inclination" i = 63.4° that term vanishes,
 * so the perigee — and the apogee opposite it — stay put. That's the trick behind the Molniya
 * orbit: a steep, stretched ellipse whose apogee hovers for hours over the far north (Kepler's
 * 2nd law), where a geostationary satellite sits uselessly low. It's how the USSR — and Sirius
 * radio — served high latitudes a geostationary belt can't reach.
 */
export const frozenOrbit: FormulaDef<{ inclinationDeg: number }> = {
  id: 'frozen-orbit',
  titleKey: 'lab.f.frozen.title',
  glossaryKey: 'lab.f.frozen.glossary',
  citationKey: 'orbits/inclination',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Frozen_orbit', source: 'wikipedia' },
  domain: 'satellite',
  tier: 5,
  prereqs: ['orbit-regime'],
  latex: '\\dot\\omega \\propto 5\\cos^2 i - 1 = 0 \\Rightarrow i = 63.4°',
  inputs: [
    {
      key: 'inclinationDeg',
      labelKey: 'lab.f.frozen.inclination',
      units: 'deg',
      kind: 'number',
      default: 63.4,
      min: 0,
      max: 180,
    },
  ],
  outputs: [{ key: 'perigeeDriftDegPerDay', labelKey: 'lab.f.frozen.drift', units: 'deg' }],
  compute: ({ inclinationDeg }) => {
    if (!Number.isFinite(inclinationDeg)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.j2-secular'],
      } satisfies FormulaResult;
    }
    // A Molniya reference orbit (a≈26,600 km, e≈0.74): ω̇ = (3/4)·n·J2·(R⊕/p)²·(5cos²i−1).
    const a = 26600;
    const e = 0.74;
    const p = a * (1 - e * e);
    const n = Math.sqrt(MU_EARTH_KM3_S2 / (a * a * a));
    const driftAt = (iDeg: number): number => {
      const i = (iDeg * Math.PI) / 180;
      const rateRadS = 0.75 * n * J2_EARTH * (R_EARTH_EQ_KM / p) ** 2 * (5 * Math.cos(i) ** 2 - 1);
      return rateRadS * (180 / Math.PI) * 86400; // deg/day
    };
    const drift = driftAt(inclinationDeg);
    const points: Vec2[] = [];
    for (let iDeg = 0; iDeg <= 180.001; iDeg += 5) points.push({ x: iDeg, y: driftAt(iDeg) });
    return {
      values: { perigeeDriftDegPerDay: { value: drift, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.j2-secular', 'lab.assume.molniya-reference'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/j2' },
        assumptions: ['lab.assume.j2-secular'],
        x: { labelKey: 'lab.axis.inclination', units: 'deg' },
        y: { labelKey: 'lab.axis.perigee-drift', units: 'deg' },
        series: [{ points }],
        marks: [
          { at: { x: 63.4, y: 0 }, labelKey: 'lab.mark.critical-incl', kind: 'point' },
          { at: { x: inclinationDeg, y: drift }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Constellation coverage (G10 — Starlink's thousands vs Clarke's three). A satellite at altitude
 * h sees the ground out to an Earth-central half-angle λ = arccos(R cos ε /(R+h)) − ε, for a min
 * usable elevation ε. Higher = a bigger footprint, so it takes FEWER satellites: three at
 * geostationary blanket the populated globe (Arthur C. Clarke's 1945 result), while a 550 km LEO
 * shell sees so little that global coverage needs thousands (Starlink, OneWeb). The equator-ring
 * count is a lower bound (≈ 180°/λ); full 3-D global coverage needs many such rings.
 */
export const constellationCoverage: FormulaDef<{ altitudeKm: number; minElevationDeg: number }> = {
  id: 'constellation-coverage',
  titleKey: 'lab.f.coverage.title',
  glossaryKey: 'lab.f.coverage.glossary',
  citationKey: 'orbits/orbit-regimes',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Satellite_constellation', source: 'wikipedia' },
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: '\\lambda = \\arccos\\!\\Big(\\tfrac{R\\cos\\varepsilon}{R+h}\\Big) - \\varepsilon',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.coverage.altitude',
      units: 'km',
      kind: 'number',
      default: 550,
      min: 200,
      max: 40000,
    },
    {
      key: 'minElevationDeg',
      labelKey: 'lab.f.coverage.elevation',
      units: 'deg',
      kind: 'number',
      default: 25,
      min: 0,
      max: 60,
      step: 5,
    },
  ],
  outputs: [
    { key: 'coverageHalfAngleDeg', labelKey: 'lab.f.coverage.halfangle', units: 'deg' },
    { key: 'equatorRingSatellites', labelKey: 'lab.f.coverage.count', units: '' },
  ],
  compute: ({ altitudeKm, minElevationDeg }) => {
    if (
      !Number.isFinite(altitudeKm) ||
      !Number.isFinite(minElevationDeg) ||
      altitudeKm <= 0 ||
      minElevationDeg < 0 ||
      minElevationDeg >= 90
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.spherical-earth'],
      } satisfies FormulaResult;
    }
    const lambdaAt = (h: number): number => {
      const eps = (minElevationDeg * Math.PI) / 180;
      const inner = (R_EARTH_KM * Math.cos(eps)) / (R_EARTH_KM + h);
      return (Math.acos(Math.min(1, inner)) * 180) / Math.PI - minElevationDeg;
    };
    const lambda = lambdaAt(altitudeKm);
    const ring = Math.max(1, Math.ceil(180 / lambda));
    const points: Vec2[] = [];
    for (let h = 300; h <= 40000.001; h += 500) {
      points.push({ x: h, y: Math.max(1, Math.ceil(180 / lambdaAt(h))) });
    }
    return {
      values: {
        coverageHalfAngleDeg: { value: lambda, units: 'deg' },
        equatorRingSatellites: { value: ring, units: '' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.spherical-earth', 'lab.assume.equatorial-ring'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/coverage' },
        assumptions: ['lab.assume.equatorial-ring'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.ring-count', units: '' },
        series: [{ points }],
        marks: [
          { at: { x: altitudeKm, y: ring }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Launch azimuth (G10 — the bridge back to Family A). You can't reach just any orbit from just
 * any pad: the inclination can't be lower than your launch latitude, and the compass heading is
 * fixed by cos(azimuth) = cos i / cos φ. Launch due east (azimuth 90°) and you get an inclination
 * equal to your latitude — the cheapest orbit, which is why the ISS (51.6°) is served from
 * Baikonur's 46° and Cape's 28°. A sun-synchronous orbit is retrograde (i > 90°), so its azimuth
 * points SOUTH — which is exactly why SSO missions launch southward down the California coast.
 */
export const launchAzimuth: FormulaDef<{
  launchLatitudeDeg: number;
  targetInclinationDeg: number;
}> = {
  id: 'launch-azimuth',
  titleKey: 'lab.f.azimuth.title',
  glossaryKey: 'lab.f.azimuth.glossary',
  citationKey: 'orbits/inclination',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Launch_window',
    source: 'wikipedia',
  },
  domain: 'ascent',
  tier: 4,
  prereqs: ['launch-site'],
  latex: '\\cos A = \\cos i / \\cos\\varphi',
  inputs: [
    {
      key: 'launchLatitudeDeg',
      labelKey: 'lab.f.azimuth.latitude',
      units: 'deg',
      kind: 'number',
      default: 28.5,
      min: 0,
      max: 90,
    },
    {
      key: 'targetInclinationDeg',
      labelKey: 'lab.f.azimuth.inclination',
      units: 'deg',
      kind: 'number',
      default: 51.6,
      min: 0,
      max: 145,
    },
  ],
  outputs: [{ key: 'azimuthDeg', labelKey: 'lab.f.azimuth.azimuth', units: 'deg' }],
  compute: ({ launchLatitudeDeg, targetInclinationDeg }) => {
    if (!Number.isFinite(launchLatitudeDeg) || !Number.isFinite(targetInclinationDeg)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.non-rotating-launch'],
      } satisfies FormulaResult;
    }
    const phi = (launchLatitudeDeg * Math.PI) / 180;
    const cosA = Math.cos((targetInclinationDeg * Math.PI) / 180) / Math.cos(phi);
    if (Math.abs(cosA) > 1) {
      // inclination below the launch latitude — unreachable without a costly plane change.
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.azimuth.err-unreachable' },
        assumptions: ['lab.assume.non-rotating-launch'],
      } satisfies FormulaResult;
    }
    const azimuth = (Math.acos(cosA) * 180) / Math.PI;
    const points: Vec2[] = [];
    for (let iDeg = Math.ceil(launchLatitudeDeg); iDeg <= 145.001; iDeg += 2) {
      const c = Math.cos((iDeg * Math.PI) / 180) / Math.cos(phi);
      if (Math.abs(c) <= 1) points.push({ x: iDeg, y: (Math.acos(c) * 180) / Math.PI });
    }
    return {
      values: { azimuthDeg: { value: azimuth, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.non-rotating-launch', 'lab.assume.spherical-earth'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ascent/azimuth' },
        assumptions: ['lab.assume.non-rotating-launch'],
        x: { labelKey: 'lab.axis.inclination', units: 'deg' },
        y: { labelKey: 'lab.axis.azimuth', units: 'deg' },
        series: [{ points }],
        marks: [
          {
            at: { x: targetInclinationDeg, y: azimuth },
            labelKey: 'lab.mark.you-are-here',
            kind: 'point',
          },
        ],
      },
    } satisfies FormulaResult;
  },
};
