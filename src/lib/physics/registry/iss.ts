/** "Catch the ISS" formulas: ground-track shift, visibility window, ISS pass. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { julianDay } from '../ephemeris/time';
import { parseTleBlock } from '../satellite/tle';
import { nextPassForTle } from '../satellite';
import { R_EARTH_KM } from '../util/constants';
import { SIDEREAL_DAY_MIN } from './shared';

// ─── Family B / G9 "Catch the ISS" — track a satellite ───────────────────────

/**
 * Ground-track shift (G9 rung 1) — why the ISS never passes over the same place two orbits
 * running. In one orbital period the Earth turns beneath the orbit, so the ground track slides
 * west by Δλ = 360°·T/T⊕ — about 23° (≈2,500 km at the equator) for the ISS's ~92-min orbit. The
 * track itself is a sine: latitude swings between ±the inclination (±51.6° for the ISS), which is
 * why it reaches the latitudes it does and no further.
 */
export const groundTrackShift: FormulaDef<{ periodMin: number; inclinationDeg: number }> = {
  id: 'ground-track-shift',
  titleKey: 'lab.f.gtrack.title',
  inWordsKey: 'lab.f.gtrack.in-words',
  citationKey: 'orbits/orbit-regimes',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Ground_track', source: 'wikipedia' },
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: '\\Delta\\lambda = 360°\\,T / T_\\oplus',
  inputs: [
    {
      key: 'periodMin',
      labelKey: 'lab.f.gtrack.period',
      units: '',
      kind: 'number',
      default: 92,
      min: 60,
      max: 1500,
    },
    {
      key: 'inclinationDeg',
      labelKey: 'lab.f.gtrack.incl',
      units: 'deg',
      kind: 'number',
      default: 51.6,
      min: 0,
      max: 90,
    },
  ],
  outputs: [{ key: 'shiftDeg', labelKey: 'lab.f.gtrack.shift', units: 'deg' }],
  compute: ({ periodMin, inclinationDeg }) => {
    if (
      !Number.isFinite(periodMin) ||
      !Number.isFinite(inclinationDeg) ||
      periodMin <= 0 ||
      inclinationDeg < 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.spherical-earth'],
      } satisfies FormulaResult;
    }
    const shift = (360 * periodMin) / SIDEREAL_DAY_MIN;
    const incl = Math.min(90, inclinationDeg);
    // Three successive orbits, each a sine capped at ±inclination and shifted WEST by the drift —
    // so the same latitudes reappear further west each lap (review G9: draw the march, not just
    // the shape). Orbit 0 spans 0–360°; orbit k is offset left by k·shift.
    const orbit = (k: number): { points: Vec2[] } => {
      const points: Vec2[] = [];
      for (let deg = 0; deg <= 360.001; deg += 5) {
        points.push({ x: deg - k * shift, y: incl * Math.sin((deg * Math.PI) / 180) });
      }
      return { points };
    };
    return {
      values: { shiftDeg: { value: shift, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.spherical-earth', 'lab.assume.circular-orbits'],
      figure: {
        kind: 'ground-track',
        provenance: { fidelity: 'computed', module: 'satellite/ground-track' },
        assumptions: ['lab.assume.spherical-earth'],
        tracks: [orbit(0).points, orbit(1).points, orbit(2).points],
        inclinationDeg: incl,
        shiftDeg: shift,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Visibility window (G9 rung 2) — when you can actually catch it. You see the ISS only when it
 * is still in sunlight while your own sky has gone dark. A satellite at altitude h stays sunlit
 * until the Sun drops θ = arccos(R/(R+h)) below the SUB-SATELLITE horizon (≈ yours when the pass
 * is near overhead) — about 20° for the ISS, a bit past the end of astronomical twilight. So the
 * ISS is a naked-eye object for a couple of hours after dusk and before dawn, gliding over while
 * the ground below is already night. (Refraction, penumbra, and low-pass geometry are ignored.)
 */
export const visibilityWindow: FormulaDef<{ altitudeKm: number }> = {
  id: 'visibility-window',
  titleKey: 'lab.f.viswin.title',
  inWordsKey: 'lab.f.viswin.in-words',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Satellite_pass', source: 'wikipedia' },
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: '\\theta = \\arccos\\!\\big(R/(R+h)\\big)',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.viswin.altitude',
      units: 'km',
      kind: 'number',
      default: 420,
      min: 100,
      max: 40000,
    },
  ],
  outputs: [{ key: 'maxSunDepressionDeg', labelKey: 'lab.f.viswin.depression', units: 'deg' }],
  compute: ({ altitudeKm }) => {
    if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.spherical-earth'],
      } satisfies FormulaResult;
    }
    const theta = Math.acos(R_EARTH_KM / (R_EARTH_KM + altitudeKm)) * (180 / Math.PI);
    const points: Vec2[] = [];
    for (let alt = 100; alt <= 2000.001; alt += 50) {
      points.push({ x: alt, y: Math.acos(R_EARTH_KM / (R_EARTH_KM + alt)) * (180 / Math.PI) });
    }
    return {
      values: { maxSunDepressionDeg: { value: theta, units: 'deg' } },
      status: { ok: true },
      assumptions: [
        'lab.assume.spherical-earth',
        'lab.assume.point-observer',
        'lab.assume.satellite-overhead',
      ],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/visibility' },
        assumptions: ['lab.assume.spherical-earth'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.depression', units: 'deg' },
        series: [{ points }],
        marks: [
          { at: { x: altitudeKm, y: theta }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Next ISS pass (G9 finale) — the payoff the goal is named for: from YOUR latitude/longitude,
 * when does the station next fly over, how high, and from which direction? This one is NOT a
 * closed form — it propagates a real published two-line element set (Kepler + secular J2) and
 * scans for the next pass clearing 10°. Honest cost: the bundled element set has a FIXED epoch
 * (~2026-07-20), so accuracy is good only for a few days around it — for tonight's real pass, a
 * live tracker (or NASA's "Spot the Station") pulls a fresh TLE. Here it's the mechanism, live.
 */
export const issPass: FormulaDef<{
  latitudeDeg: number;
  longitudeDeg: number;
  dateIso: string;
  tle: string;
}> = {
  id: 'iss-pass',
  titleKey: 'lab.f.isspass.title',
  inWordsKey: 'lab.f.isspass.in-words',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Satellite_pass', source: 'wikipedia' },
  domain: 'satellite',
  tier: 5,
  prereqs: ['visibility-window'],
  // Surfaces the TLE-propagation source (Kepler + secular J2, from a NORAD
  // element set) as a science-explainer link on the card (slice I attribution).
  citationKey: 'orbits/keplerian-orbit',
  // TLE accuracy degrades over days from its epoch; past this the result emits
  // an epochAgeDays disclosure ("element set N days old — approximate"). H5/#464.
  staleAfterDays: 14,
  latex: '\\text{propagate TLE} \\rightarrow \\text{next pass} > 10°',
  inputs: [
    {
      key: 'latitudeDeg',
      labelKey: 'lab.f.isspass.latitude',
      units: 'deg',
      kind: 'number',
      default: 40,
      min: -80,
      max: 80,
    },
    {
      key: 'longitudeDeg',
      labelKey: 'lab.f.isspass.longitude',
      units: 'deg',
      kind: 'number',
      default: -74,
      min: -180,
      max: 180,
    },
    {
      key: 'dateIso',
      labelKey: 'lab.f.isspass.date',
      units: '',
      kind: 'date',
      default: '2026-07-21',
    },
    {
      // Adapter-owned element set: the app's tle-source (H4c) or the MCP TLE
      // adapter supplies the current TLE at compute time. NEVER a user or
      // share-link input — excluded from the palette render, defaultInputs, the
      // MCP schema, and the codec (R1 · #464). kind:'number' is defense-in-depth:
      // if a codec skip is ever missed, a hostile string coerces to NaN→default
      // instead of reaching parseTleBlock.
      key: 'tle',
      labelKey: 'lab.f.isspass.tle',
      units: '',
      kind: 'number',
      default: '',
      injected: true,
    },
  ],
  outputs: [
    { key: 'minutesUntilPass', labelKey: 'lab.f.isspass.minutes', units: '' },
    { key: 'maxAltitudeDeg', labelKey: 'lab.f.isspass.maxalt', units: 'deg' },
    { key: 'startAzimuthDeg', labelKey: 'lab.f.isspass.azimuth', units: 'deg' },
  ],
  compute: ({ latitudeDeg, longitudeDeg, dateIso, tle }) => {
    const from = new Date(String(dateIso));
    if (
      !Number.isFinite(latitudeDeg) ||
      !Number.isFinite(longitudeDeg) ||
      Number.isNaN(from.getTime())
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.isspass.err-input' },
        assumptions: ['lab.assume.snapshot-tle'],
      } satisfies FormulaResult;
    }
    // The element set is injected (app tle-source / MCP adapter), never a user
    // input. Absent or malformed → fail honest, never a NaN-propagating pass.
    const block = String(tle ?? '').trim();
    let parsedTle;
    try {
      if (!block) throw new Error('no injected TLE');
      parsedTle = parseTleBlock(block);
    } catch {
      return {
        values: {},
        status: { ok: false, reasonKey: 'lab.f.isspass.err-input' },
        assumptions: ['lab.assume.snapshot-tle'],
      } satisfies FormulaResult;
    }
    // How far the propagation reaches from the element set's epoch — the honesty
    // number the Lab surfaces against staleAfterDays (compute-time, vs the
    // requested date, so a container that hasn't redeployed still discloses age).
    const epochAgeDays = Math.abs(julianDay(from) - parsedTle.epochJd);
    const pass = nextPassForTle(parsedTle, from, latitudeDeg, longitudeDeg, {
      hoursAhead: 48,
      minMaxAltDeg: 10,
    });
    if (!pass) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.isspass.err-none' },
        assumptions: ['lab.assume.snapshot-tle', 'lab.assume.kepler-j2'],
        epochAgeDays,
      } satisfies FormulaResult;
    }
    const minutes = (pass.start.getTime() - from.getTime()) / 60000;
    return {
      values: {
        minutesUntilPass: { value: minutes, units: '' },
        maxAltitudeDeg: { value: pass.maxAltitudeDeg, units: 'deg' },
        startAzimuthDeg: { value: pass.startAzimuthDeg, units: 'deg' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.snapshot-tle', 'lab.assume.kepler-j2'],
      epochAgeDays,
    } satisfies FormulaResult;
  },
};
