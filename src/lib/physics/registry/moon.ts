/** "Moon phases" formulas: phase, distance, eclipse seasons, Moon altitude. */
import type { FormulaDef, FormulaResult, Vec2 } from '../spec';
import { invalidDate } from './shared';
import { moonPhase } from '../ephemeris/moon-observer';
import { geocentricMoon } from '../ephemeris/moon';
import { skyPosition } from '../ephemeris';
import { julianDay } from '../ephemeris/time';
import { MOON_ORBIT_RADIUS_KM, AU_TO_KM } from '../util/constants';

/** Mean synodic month (new moon → new moon), days — the age scale for G8. */
const SYNODIC_MONTH_DAYS = 29.530588;

// ─── Family B / G8 "Moon phases" — observe the sky ───────────────────────────

/**
 * Moon phase (Family B / G8) — the first "observe" goal. The GEOMETRY is first-principles:
 * the lit fraction is k = ½(1 + cos α), where α is the Sun–Moon–Earth phase angle (α = 0 is
 * full, 180° is new). The NUMBER is real: `moonPhase(date)` runs Orrery's geocentric ephemeris
 * for the chosen date, so the disc, the age since new moon, and the phase name match the actual
 * sky (hybrid precision, operator 2026-08-30). Introduces date inputs to the ladder.
 */
export const moonPhaseFormula: FormulaDef<{ dateIso: string }> = {
  id: 'moon-phase',
  titleKey: 'lab.f.moonphase.title',
  glossaryKey: 'lab.f.moonphase.glossary',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Lunar_phase', source: 'wikipedia' },
  domain: 'ephemeris',
  tier: 2,
  prereqs: [],
  latex: 'k = \\tfrac12\\,(1 + \\cos\\alpha)',
  inputs: [
    {
      key: 'dateIso',
      labelKey: 'lab.f.moonphase.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [
    { key: 'illuminatedPct', labelKey: 'lab.f.moonphase.illum', units: '' },
    { key: 'moonAgeDays', labelKey: 'lab.f.moonphase.age', units: 'day' },
  ],
  compute: ({ dateIso }) => {
    const d = new Date(String(dateIso));
    if (Number.isNaN(d.getTime())) {
      return invalidDate('lab.assume.geocentric-moon');
    }
    const ph = moonPhase(d);
    const ageDays = (ph.ageDeg / 360) * SYNODIC_MONTH_DAYS;
    return {
      values: {
        illuminatedPct: { value: ph.illuminatedFraction * 100, units: '' },
        moonAgeDays: { value: ageDays, units: 'day' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.geocentric-moon', 'lab.assume.optical-only'],
      figure: {
        kind: 'moon-phase',
        provenance: { fidelity: 'computed', module: 'ephemeris/moon-observer' },
        assumptions: ['lab.assume.geocentric-moon'],
        illuminatedFraction: ph.illuminatedFraction,
        waxing: ph.waxing,
        phaseLabelKey: `lab.moon.phase.${ph.phaseName}`,
      },
    } satisfies FormulaResult;
  },
};

/** Mean Earth–Moon distance (AU) — the "100%" apparent-size reference for G8's supermoon. */
const MOON_MEAN_DISTANCE_AU = MOON_ORBIT_RADIUS_KM / AU_TO_KM;

/**
 * Moon distance & apparent size (G8 — the "supermoon" rung). The Moon's orbit is an ellipse, so
 * its distance swings ~356,500 km (perigee) to ~406,700 km (apogee) each month, and apparent
 * size goes as 1/distance. A full moon at perigee — a "supermoon" — looks ~14% wider and ~30%
 * brighter than one at apogee. Real geocentric distance for the date.
 */
export const moonDistance: FormulaDef<{ dateIso: string }> = {
  id: 'moon-distance',
  titleKey: 'lab.f.moondist.title',
  glossaryKey: 'lab.f.moondist.glossary',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Lunar_distance_(astronomy)',
    source: 'wikipedia',
  },
  domain: 'ephemeris',
  tier: 2,
  prereqs: ['moon-phase'],
  latex: '\\text{size} \\propto 1/d',
  inputs: [
    {
      key: 'dateIso',
      labelKey: 'lab.f.moondist.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [
    { key: 'distanceKm', labelKey: 'lab.f.moondist.distance', units: 'km' },
    { key: 'apparentSizePct', labelKey: 'lab.f.moondist.size', units: '' },
  ],
  compute: ({ dateIso }) => {
    const d = new Date(String(dateIso));
    if (Number.isNaN(d.getTime())) {
      return invalidDate('lab.assume.geocentric-moon');
    }
    const jd0 = julianDay(d);
    const distAu = geocentricMoon(jd0).distanceAu;
    const sizePct = (MOON_MEAN_DISTANCE_AU / distAu) * 100;
    const points: Vec2[] = [];
    for (let day = 0; day <= 60; day += 1) {
      points.push({ x: day, y: geocentricMoon(jd0 + day).distanceAu * AU_TO_KM });
    }
    return {
      values: {
        distanceKm: { value: distAu * AU_TO_KM, units: 'km' },
        apparentSizePct: { value: sizePct, units: '' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.geocentric-moon', 'lab.assume.optical-only'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/moon' },
        assumptions: ['lab.assume.geocentric-moon'],
        x: { labelKey: 'lab.axis.days-ahead', units: 'day' },
        y: { labelKey: 'lab.axis.distance-km', units: 'km' },
        series: [{ points }],
        marks: [{ at: { x: 0, y: distAu * AU_TO_KM }, labelKey: 'lab.mark.today', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Eclipse seasons (G8 — why eclipses aren't monthly). An eclipse needs a syzygy (new moon for
 * solar, full for lunar) AND the Moon near a node — the two points where its 5.1°-tilted orbit
 * crosses the Sun's path. The Moon's ecliptic latitude β swings ±5.1° each month; only when a
 * syzygy lands inside the ~±1.5° eclipse limit can shadows line up. Since the Sun passes a node
 * only twice a year, eclipses cluster in two ~34-day "seasons" ~6 months apart, not every month.
 */
export const eclipseSeasons: FormulaDef<{ dateIso: string }> = {
  id: 'eclipse-seasons',
  titleKey: 'lab.f.eclipse.title',
  glossaryKey: 'lab.f.eclipse.glossary',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Eclipse_season', source: 'wikipedia' },
  domain: 'ephemeris',
  tier: 3,
  prereqs: ['moon-phase'],
  latex: '|\\beta| < 1.5° \\Rightarrow \\text{eclipse possible}',
  inputs: [
    {
      key: 'dateIso',
      labelKey: 'lab.f.eclipse.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [{ key: 'moonLatitudeDeg', labelKey: 'lab.f.eclipse.latitude', units: 'deg' }],
  compute: ({ dateIso }) => {
    const d = new Date(String(dateIso));
    if (Number.isNaN(d.getTime())) {
      return invalidDate('lab.assume.geocentric-moon');
    }
    const jd0 = julianDay(d);
    const betaAt = (j: number): number => {
      const m = geocentricMoon(j);
      return (Math.asin(Math.max(-1, Math.min(1, m.pos.z / m.distanceAu))) * 180) / Math.PI;
    };
    const beta = betaAt(jd0);
    const LIMIT = 1.5;
    const betaPts: Vec2[] = [];
    const hiPts: Vec2[] = [];
    const loPts: Vec2[] = [];
    for (let day = 0; day <= 70; day += 1) {
      betaPts.push({ x: day, y: betaAt(jd0 + day) });
      hiPts.push({ x: day, y: LIMIT });
      loPts.push({ x: day, y: -LIMIT });
    }
    return {
      values: { moonLatitudeDeg: { value: beta, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.geocentric-moon', 'lab.assume.eclipse-limit'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/moon' },
        assumptions: ['lab.assume.eclipse-limit'],
        x: { labelKey: 'lab.axis.days-ahead', units: 'day' },
        y: { labelKey: 'lab.axis.moon-latitude', units: 'deg' },
        series: [
          { labelKey: 'lab.series.moon-latitude', points: betaPts },
          { labelKey: 'lab.series.eclipse-limit', points: hiPts },
          { points: loPts },
        ],
        marks: [{ at: { x: 0, y: beta }, labelKey: 'lab.mark.today', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Moon altitude (G8 — the observer's payoff). Same as a planet: the Moon peaks as it crosses
 * the meridian at altitude 90° − |latitude − dec|, where dec is its declination that night. But
 * the Moon's declination swings ±(23.4° + 5.1°) ≈ ±28.5° over a month, so from mid-northern
 * latitudes a winter full moon rides high while a summer one skims low — the opposite of the Sun.
 */
export const moonAltitude: FormulaDef<{ dateIso: string; latitudeDeg: number }> = {
  id: 'moon-altitude',
  titleKey: 'lab.f.moonalt.title',
  glossaryKey: 'lab.f.moonalt.glossary',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Horizontal_coordinate_system',
    source: 'wikipedia',
  },
  domain: 'ephemeris',
  tier: 3,
  prereqs: ['moon-phase'],
  latex: 'h_{\\max} = 90° - |\\varphi - \\delta|',
  inputs: [
    {
      key: 'dateIso',
      labelKey: 'lab.f.moonalt.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
    {
      key: 'latitudeDeg',
      labelKey: 'lab.f.moonalt.latitude',
      units: 'deg',
      kind: 'number',
      default: 40,
      min: -90,
      max: 90,
    },
  ],
  outputs: [{ key: 'culminationAltitudeDeg', labelKey: 'lab.f.moonalt.altitude', units: 'deg' }],
  compute: ({ dateIso, latitudeDeg }) => {
    const d = new Date(String(dateIso));
    if (Number.isNaN(d.getTime()) || !Number.isFinite(latitudeDeg)) {
      return invalidDate('lab.assume.transit-altitude');
    }
    const dec = skyPosition('moon', d, 0, 0).decDeg;
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
        provenance: { fidelity: 'computed', module: 'ephemeris/moon-observer' },
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
