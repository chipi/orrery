/** "Observe the sky" formulas: planet elongation, max elongation, retrograde motion, planet altitude. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { invalidDate } from './shared';
import { HELIO_ORBIT_AU } from '../util/heliocentric';
import { geocentricPlanet, geocentricSun, type PlanetId } from '../ephemeris/planets';
import { skyPosition } from '../ephemeris';
import { julianDay } from '../ephemeris/time';

// ─── Family B / G7 "Observe the sky" — planet visibility ─────────────────────
/** Planets a naked-eye observer chases (skip the ice giants — telescope-only). */
const OBSERVE_PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;

/** Orbital eccentricities (J2000) — Mercury's 0.21 is why its elongations swing so widely. */
const PLANET_ECCENTRICITY: Record<string, number> = {
  mercury: 0.2056,
  venus: 0.0068,
  mars: 0.0934,
  jupiter: 0.0489,
  saturn: 0.0565,
};

/** Wrap a longitude difference to (−180, 180]. */
const norm180 = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * Planet elongation (G7 rung 1) — where a planet is relative to the Sun, which is the whole
 * game in "when can I see it". Elongation ε = λ_planet − λ_Sun (their ecliptic-longitude gap):
 * near 0° the planet is lost in the glare (conjunction); east of the Sun (ε > 0) it sets after
 * it in the evening sky; west (ε < 0) it rises before it at dawn; near ±180° an outer planet is
 * opposite the Sun, up all night (opposition). Real geocentric ephemeris for the chosen date.
 */
export const planetElongation: FormulaDef<{ planet: string; dateIso: string }> = {
  id: 'planet-elongation',
  titleKey: 'lab.f.elong.title',
  plainKey: 'lab.f.elong.plain',
  citationKey: 'orbits/synodic-period',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Elongation_(astronomy)', source: 'wikipedia' },
  domain: 'ephemeris',
  tier: 3,
  prereqs: [],
  latex: '\\varepsilon = \\lambda_{\\text{planet}} - \\lambda_\\odot',
  inputs: [
    {
      key: 'planet',
      labelKey: 'lab.f.elong.planet',
      units: '',
      kind: 'enum',
      default: 'venus',
      enumValues: OBSERVE_PLANETS.map((pl) => ({ value: pl, labelKey: `lab.body.${pl}` })),
    },
    {
      key: 'dateIso',
      labelKey: 'lab.f.elong.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [{ key: 'elongationDeg', labelKey: 'lab.f.elong.elongation', units: 'deg' }],
  compute: ({ planet, dateIso }) => {
    const d = new Date(String(dateIso));
    if (!HELIO_ORBIT_AU[planet] || Number.isNaN(d.getTime())) {
      return invalidDate('lab.assume.ecliptic-longitude');
    }
    const id = planet as Exclude<PlanetId, 'earth'>;
    const jd = julianDay(d);
    const elongAt = (j: number): number => {
      const p = geocentricPlanet(id, j);
      const s = geocentricSun(j);
      const lamP = (Math.atan2(p.y, p.x) * 180) / Math.PI;
      const lamS = (Math.atan2(s.y, s.x) * 180) / Math.PI;
      return norm180(lamP - lamS);
    };
    const elong = elongAt(jd);
    const a = HELIO_ORBIT_AU[planet];
    return {
      values: { elongationDeg: { value: elong, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.ecliptic-longitude', 'lab.assume.point-mass'],
      figure: {
        kind: 'sky-chart',
        provenance: { fidelity: 'computed', module: 'ephemeris/planets' },
        assumptions: ['lab.assume.ecliptic-longitude'],
        elongationDeg: Math.abs(elong),
        eastern: elong >= 0, // planet east of the Sun → sets after it → evening star
        planetLabelKey: `lab.body.${planet}`,
        // inner planets (a < 1 AU) cap their elongation; use the SAME eccentric limit the
        // max-elongation rung teaches — arcsin(a(1+e)) at aphelion (Mercury ~27.8°, not the
        // circular 22.8°) — so the drawn wall never contradicts rung 2. Outer planets: no cap.
        maxElongationDeg:
          a < 1
            ? (Math.asin(Math.min(1, a * (1 + (PLANET_ECCENTRICITY[planet] ?? 0)))) * 180) / Math.PI
            : undefined,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Maximum elongation (G7 rung 2) — why Mercury and Venus never stray far from the Sun. A planet
 * inside Earth's orbit (a < 1 AU) can only reach ε_max = arcsin(a(1+e)/a⊕) at aphelion: Venus
 * tops out at ~47°, Mercury at ~28°, so they are always a morning or evening object, never overhead at
 * midnight. A planet OUTSIDE Earth's orbit has no such limit — it can swing all the way to 180°,
 * opposition, and ride the sky all night. That one inequality sorts the naked-eye planets in two.
 */
export const maxElongation: FormulaDef<{ planet: string }> = {
  id: 'max-elongation',
  titleKey: 'lab.f.maxelong.title',
  plainKey: 'lab.f.maxelong.plain',
  citationKey: 'orbits/synodic-period',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Elongation_(astronomy)', source: 'wikipedia' },
  domain: 'ephemeris',
  tier: 3,
  prereqs: ['planet-elongation'],
  latex: '\\varepsilon_{\\max} = \\arcsin\\!\\big(a(1+e)\\big)\\ \\ (a<1)',
  inputs: [
    {
      key: 'planet',
      labelKey: 'lab.f.maxelong.planet',
      units: '',
      kind: 'enum',
      default: 'venus',
      enumValues: OBSERVE_PLANETS.map((pl) => ({ value: pl, labelKey: `lab.body.${pl}` })),
    },
  ],
  outputs: [
    { key: 'greatestElongationDeg', labelKey: 'lab.f.maxelong.greatest', units: 'deg' },
    { key: 'leastElongationDeg', labelKey: 'lab.f.maxelong.least', units: 'deg' },
  ],
  compute: ({ planet }) => {
    const a = HELIO_ORBIT_AU[planet];
    if (!a) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.elliptical-orbit'],
      } satisfies FormulaResult;
    }
    const e = PLANET_ECCENTRICITY[planet] ?? 0;
    // An inner planet's greatest elongation happens at APHELION (a(1+e)), the least at
    // perihelion (a(1−e)) — Mercury's e=0.21 spreads it 18°→28°, not one arcsin(a). An
    // outer planet reaches opposition either way (180°).
    const asinDeg = (x: number): number => (Math.asin(Math.min(1, x)) * 180) / Math.PI;
    const greatest = a < 1 ? asinDeg(a * (1 + e)) : 180;
    const least = a < 1 ? asinDeg(a * (1 - e)) : 180;
    const points: Vec2[] = [];
    for (let r = 0.1; r <= 5.001; r += 0.1) points.push({ x: r, y: r < 1 ? asinDeg(r) : 180 });
    const marks =
      a < 1
        ? [
            {
              at: { x: a * (1 + e), y: greatest },
              labelKey: 'lab.mark.aphelion',
              kind: 'point' as const,
            },
            {
              at: { x: a * (1 - e), y: least },
              labelKey: 'lab.mark.perihelion',
              kind: 'point' as const,
            },
          ]
        : [{ at: { x: a, y: 180 }, labelKey: 'lab.mark.opposition', kind: 'point' as const }];
    return {
      values: {
        greatestElongationDeg: { value: greatest, units: 'deg' },
        leastElongationDeg: { value: least, units: 'deg' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.elliptical-orbit', 'lab.assume.coplanar'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/planets' },
        assumptions: ['lab.assume.elliptical-orbit'],
        x: { labelKey: 'lab.axis.orbit-radius', units: 'AU' },
        y: { labelKey: 'lab.axis.max-elongation', units: 'deg' },
        series: [{ points }],
        marks,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Retrograde motion (G7 rung 3) — the phenomenon that broke the geocentric model, falling
 * straight out of the geometry above. Track a planet's apparent longitude in our sky and most
 * of the time it drifts eastward (prograde, dλ/dt > 0). But for a few months around opposition
 * an outer planet appears to REVERSE, looping westward (dλ/dt < 0) — not because it slows, but
 * because faster Earth OVERTAKES it on the inside track. Inner planets do the same near inferior
 * conjunction. The rate crossing zero marks the "stationary" points that bracket the loop.
 */
export const retrogradeMotion: FormulaDef<{ planet: string; dateIso: string }> = {
  id: 'retrograde-motion',
  // Own key family — 'lab.f.retro.*' belongs to retro-descent; sharing it clobbered
  // the descent card's title across 14 locales (fixed in the same pass as FB2).
  titleKey: 'lab.f.retrograde.title',
  plainKey: 'lab.f.retrograde.plain',
  citationKey: 'orbits/synodic-period',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Apparent_retrograde_motion',
    source: 'wikipedia',
  },
  domain: 'ephemeris',
  tier: 3,
  prereqs: ['planet-elongation'],
  latex: '\\dot\\lambda < 0 \\Rightarrow \\text{retrograde}',
  inputs: [
    {
      key: 'planet',
      labelKey: 'lab.f.retrograde.planet',
      units: '',
      kind: 'enum',
      default: 'mars',
      enumValues: OBSERVE_PLANETS.map((pl) => ({ value: pl, labelKey: `lab.body.${pl}` })),
    },
    {
      key: 'dateIso',
      labelKey: 'lab.f.retrograde.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [{ key: 'apparentRateDegPerDay', labelKey: 'lab.f.retrograde.rate', units: 'deg' }],
  compute: ({ planet, dateIso }) => {
    const d = new Date(String(dateIso));
    if (!HELIO_ORBIT_AU[planet] || Number.isNaN(d.getTime())) {
      return invalidDate('lab.assume.ecliptic-longitude');
    }
    const id = planet as Exclude<PlanetId, 'earth'>;
    const jd0 = julianDay(d);
    // Apparent geocentric longitude rate (°/day) via a central difference; norm180 the step so a
    // 0°/360° wrap doesn't fake a huge rate.
    const rateAt = (j: number): number => {
      const before = geocentricPlanet(id, j - 1);
      const after = geocentricPlanet(id, j + 1);
      const lamB = (Math.atan2(before.y, before.x) * 180) / Math.PI;
      const lamA = (Math.atan2(after.y, after.x) * 180) / Math.PI;
      return norm180(lamA - lamB) / 2;
    };
    const rate = rateAt(jd0);
    const points: Vec2[] = [];
    for (let day = 0; day <= 780; day += 6) points.push({ x: day, y: rateAt(jd0 + day) });
    return {
      values: { apparentRateDegPerDay: { value: rate, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.ecliptic-longitude', 'lab.assume.point-mass'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/planets' },
        assumptions: ['lab.assume.ecliptic-longitude'],
        x: { labelKey: 'lab.axis.days-ahead', units: 'day' },
        y: { labelKey: 'lab.axis.apparent-rate', units: 'deg' },
        series: [{ points }],
        marks: [{ at: { x: 0, y: rate }, labelKey: 'lab.mark.today', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Sky altitude (G7 rung 4) — the practical payoff: from YOUR latitude, how high does a planet
 * climb? At its best (crossing the meridian) a body reaches altitude 90° − |latitude − dec|,
 * where dec is its declination that night. A planet whose declination matches your latitude
 * passes overhead; one far to the other side barely clears the horizon (or never rises, a
 * negative answer). It's why the same planet is a glorious high target from one hemisphere and
 * a low, murky one from the other.
 */
export const planetAltitude: FormulaDef<{ planet: string; dateIso: string; latitudeDeg: number }> =
  {
    id: 'planet-altitude',
    titleKey: 'lab.f.skyalt.title',
    plainKey: 'lab.f.skyalt.plain',
    learnMore: {
      url: 'https://en.wikipedia.org/wiki/Horizontal_coordinate_system',
      source: 'wikipedia',
    },
    domain: 'ephemeris',
    tier: 3,
    prereqs: ['planet-elongation'],
    latex: 'h_{\\max} = 90° - |\\varphi - \\delta|',
    inputs: [
      {
        key: 'planet',
        labelKey: 'lab.f.skyalt.planet',
        units: '',
        kind: 'enum',
        default: 'jupiter',
        enumValues: OBSERVE_PLANETS.map((pl) => ({ value: pl, labelKey: `lab.body.${pl}` })),
      },
      {
        key: 'dateIso',
        labelKey: 'lab.f.skyalt.date',
        units: '',
        kind: 'date',
        default: '2026-08-30',
      },
      {
        key: 'latitudeDeg',
        labelKey: 'lab.f.skyalt.latitude',
        units: 'deg',
        kind: 'number',
        default: 40,
        min: -90,
        max: 90,
      },
    ],
    outputs: [{ key: 'culminationAltitudeDeg', labelKey: 'lab.f.skyalt.altitude', units: 'deg' }],
    compute: ({ planet, dateIso, latitudeDeg }) => {
      const d = new Date(String(dateIso));
      if (!HELIO_ORBIT_AU[planet] || Number.isNaN(d.getTime()) || !Number.isFinite(latitudeDeg)) {
        return invalidDate('lab.assume.transit-altitude');
      }
      const dec = skyPosition(planet as Exclude<PlanetId, 'earth'>, d, 0, 0).decDeg;
      const alt = 90 - Math.abs(latitudeDeg - dec);
      const points: Vec2[] = [];
      for (let lat = -90; lat <= 90.001; lat += 5)
        points.push({ x: lat, y: 90 - Math.abs(lat - dec) });
      return {
        values: { culminationAltitudeDeg: { value: alt, units: 'deg' } },
        status: { ok: true },
        assumptions: ['lab.assume.transit-altitude', 'lab.assume.point-observer'],
        figure: {
          kind: 'curve',
          provenance: { fidelity: 'computed', module: 'ephemeris/planets' },
          assumptions: ['lab.assume.transit-altitude'],
          x: { labelKey: 'lab.axis.latitude', units: 'deg' },
          y: { labelKey: 'lab.axis.altitude', units: 'deg' },
          series: [{ points }],
          marks: [
            { at: { x: latitudeDeg, y: alt }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
          ],
        },
      } satisfies FormulaResult;
    },
  };
