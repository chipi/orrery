/** Transfer formulas: interplanetary Lambert transfer, launch window, porkchop grid, cislunar transfer. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { hohmannTransfer } from '../mechanics/orbits';
import { helioModel, synodicPeriodS } from '../util/heliocentric';
import { computePorkchopGrid, DV_FAILED } from '../transfer/lambert-grid';
import type { DestinationId } from '../transfer/lambert-grid.constants';
import { geoTransferDv } from '../transfer/lambert-geocentric';
import { EPOCH_JD, moonEclipticXYKm, R_LEO } from '../transfer/lambert-geocentric-grid.constants';
import {
  MOON_ORBIT_RADIUS_KM,
  MU_SUN_KM3_S2,
  MU_EARTH_KM3_S2,
  R_EARTH_KM,
} from '../util/constants';

/** Planets on a tabulated heliocentric orbit — the interplanetary transfer set (M4). */
const HELIO_PLANET_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;

/**
 * Interplanetary Hohmann transfer (M4 "get to Mars") — the SAME two-burn transfer as
 * M2, one frame out: everything orbits the Sun. Reuses `hohmannTransfer(r1, r2, µ)`
 * with the Sun's µ + the planets' heliocentric orbit radii (the kernel's frame-
 * independence is the point). Δv is HELIOCENTRIC — from the departure planet's solar
 * orbit, NOT from its surface (that's the launch + escape, earlier rungs).
 */
export const interplanetaryTransfer: FormulaDef<{ depart: string; arrive: string }> = {
  id: 'interplanetary-transfer',
  titleKey: 'lab.f.interplanetary.title',
  plainKey: 'lab.f.interplanetary.plain',
  citationKey: 'transfers/patched-conics',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Interplanetary_Transport_Network',
    source: 'wikipedia',
  },
  domain: 'transfer',
  tier: 9,
  prereqs: ['hohmann-transfer'],
  latex: '\\Delta v = \\Delta v_1 + \\Delta v_2',
  inputs: [
    {
      key: 'depart',
      labelKey: 'lab.f.interplanetary.depart',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...HELIO_PLANET_IDS],
    },
    {
      key: 'arrive',
      labelKey: 'lab.f.interplanetary.arrive',
      units: '',
      kind: 'body',
      default: 'mars',
      bodyIds: [...HELIO_PLANET_IDS],
    },
  ],
  outputs: [
    { key: 'dv1', labelKey: 'lab.f.interplanetary.dv1', units: 'km/s' },
    { key: 'dv2', labelKey: 'lab.f.interplanetary.dv2', units: 'km/s' },
    { key: 'total', labelKey: 'lab.f.interplanetary.total', units: 'km/s' },
    { key: 'tof', labelKey: 'lab.f.interplanetary.tof', units: 'day' },
  ],
  compute: ({ depart, arrive }) => {
    const d = helioModel(depart);
    const a = helioModel(arrive);
    if (!d || !a) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.interplanetary.err-planet' },
        assumptions: ['lab.assume.coplanar'],
      } satisfies FormulaResult;
    }
    if (depart === arrive) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.interplanetary.err-same' },
        assumptions: ['lab.assume.coplanar'],
      } satisfies FormulaResult;
    }
    const h = hohmannTransfer(d.orbitRadiusKm, a.orbitRadiusKm, MU_SUN_KM3_S2);
    const aTr = h.aTransferKm;
    const rp = Math.min(d.orbitRadiusKm, a.orbitRadiusKm);
    const ra = Math.max(d.orbitRadiusKm, a.orbitRadiusKm);
    const e = (ra - rp) / (ra + rp);
    const scale = 1 / ra;
    const arc: Vec2[] = [];
    for (let i = 0; i <= 48; i++) {
      const th = (Math.PI * i) / 48;
      const r = (aTr * (1 - e * e)) / (1 + e * Math.cos(th));
      arc.push({ x: r * Math.cos(th) * scale, y: r * Math.sin(th) * scale });
    }
    return {
      values: {
        dv1: { value: h.dv1Kms, units: 'km/s' },
        dv2: { value: h.dv2Kms, units: 'km/s' },
        total: { value: h.totalKms, units: 'km/s' },
        tof: { value: h.tofS / 86400, units: 'day' },
      },
      status: { ok: true },
      assumptions: [
        'lab.assume.coplanar',
        'lab.assume.circular-orbits',
        'lab.assume.from-planet-orbit',
      ],
      figure: {
        kind: 'transfer-ellipse',
        frame: 'heliocentric',
        provenance: { fidelity: 'computed', module: 'util/heliocentric' },
        assumptions: ['lab.assume.coplanar', 'lab.assume.circular-orbits'],
        bodies: [{ labelKey: 'lab.body.sun', at: { x: 0, y: 0 } }],
        arc,
        // Role-based burn labels (departure = the planet you leave, arrival = the target),
        // correct for an inward transfer (e.g. Earth→Venus) too (review M2 MINOR-2).
        marks: [
          {
            at: { x: (d.orbitRadiusKm <= a.orbitRadiusKm ? rp : -ra) * scale, y: 0 },
            labelKey: 'lab.mark.burn-depart',
            kind: 'point',
          },
          {
            at: { x: (d.orbitRadiusKm <= a.orbitRadiusKm ? -ra : rp) * scale, y: 0 },
            labelKey: 'lab.mark.burn-arrive',
            kind: 'point',
          },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Launch window — the synodic period, how often two planets realign for a transfer.
 * 1/S = |1/T₁ − 1/T₂|. Earth↔Mars ≈ 780 days (~26 months) — the ~2-year wait.
 */
export const launchWindow: FormulaDef<{ depart: string; arrive: string }> = {
  id: 'launch-window',
  titleKey: 'lab.f.synodic.title',
  plainKey: 'lab.f.synodic.plain',
  citationKey: 'porkchop/what-is-a-porkchop',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Launch_window', source: 'wikipedia' },
  domain: 'transfer',
  tier: 9,
  prereqs: [],
  latex: '\\dfrac{1}{S} = \\left|\\dfrac{1}{T_1} - \\dfrac{1}{T_2}\\right|',
  inputs: [
    {
      key: 'depart',
      labelKey: 'lab.f.synodic.depart',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...HELIO_PLANET_IDS],
    },
    {
      key: 'arrive',
      labelKey: 'lab.f.synodic.arrive',
      units: '',
      kind: 'body',
      default: 'mars',
      bodyIds: [...HELIO_PLANET_IDS],
    },
  ],
  outputs: [{ key: 'synodic', labelKey: 'lab.f.synodic.period', units: 'day' }],
  compute: ({ depart, arrive }) => {
    const d = helioModel(depart);
    const a = helioModel(arrive);
    if (!d || !a || depart === arrive) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: {
          ok: false,
          reasonKey:
            depart === arrive ? 'lab.f.interplanetary.err-same' : 'lab.f.interplanetary.err-planet',
        },
        assumptions: ['lab.assume.circular-orbits'],
      } satisfies FormulaResult;
    }
    const synodicDays = synodicPeriodS(d.orbitalPeriodS, a.orbitalPeriodS) / 86400;
    // Relative semi-major axes from the periods (Kepler III: a ∝ T^(2/3)); the ratio is all the
    // geometry needs. The required lead angle is the classic Hohmann phasing: the target must be
    // ahead by 180° minus how far it travels during the transfer half-ellipse.
    const T1 = d.orbitalPeriodS;
    const T2 = a.orbitalPeriodS;
    const a1 = Math.cbrt(T1 * T1);
    const a2 = Math.cbrt(T2 * T2);
    const at = (a1 + a2) / 2;
    const departInner = a1 <= a2;
    const aOuter = Math.max(a1, a2);
    const aInner = Math.min(a1, a2);
    const transferS = 0.5 * (aInner === a1 ? T1 : T2) * Math.pow(at / aInner, 1.5);
    const transferDays = transferS / 86400;
    const requiredPhaseDeg = 180 - 360 * (transferS / T2);
    const outerDrawR = 120;
    const innerDrawR = 120 * (aInner / aOuter);
    return {
      values: { synodic: { value: synodicDays, units: 'day' } },
      status: { ok: true },
      assumptions: ['lab.assume.circular-orbits', 'lab.assume.coplanar'],
      figure: {
        kind: 'launch-window',
        provenance: { fidelity: 'computed', module: 'transfer/orbital' },
        assumptions: ['lab.assume.circular-orbits', 'lab.assume.coplanar'],
        innerDrawR,
        outerDrawR,
        departInner,
        requiredPhaseDeg,
        synodicDays,
        transferDays,
        departLabelKey: `lab.body.${depart}`,
        arriveLabelKey: `lab.body.${arrive}`,
      },
    } satisfies FormulaResult;
  },
};

/** Per-destination porkchop windows: a departure span (~1.5 synodic periods) and the
 *  time-of-flight band that brackets the real transfer, so the grid frames a full window. */
const PORKCHOP_WINDOWS: Record<
  string,
  { depSpanDays: number; tofMinDays: number; tofMaxDays: number }
> = {
  venus: { depSpanDays: 584, tofMinDays: 80, tofMaxDays: 300 },
  mars: { depSpanDays: 780, tofMinDays: 120, tofMaxDays: 400 },
  jupiter: { depSpanDays: 400, tofMinDays: 700, tofMaxDays: 1400 },
};

const PORKCHOP_DEST_IDS = ['venus', 'mars', 'jupiter'] as const;

/**
 * Porkchop plot (mission-design launch-window optimizer) — the chart every interplanetary
 * mission is planned from. It runs the kernel's REAL Lambert solver (`computePorkchopGrid`,
 * the same one that drives /explore) over a grid of departure dates × times-of-flight, solving
 * the two-body boundary-value problem for each cell and shading it by the total Δv (departure
 * C3 + arrival v∞). The valleys are the launch windows; the single lowest cell is the cheapest
 * date-and-duration to leave. This is why launches have a window: miss the valley and the Δv —
 * the fuel — climbs a wall. Surfaces a kernel capability the Lab had modelled only as a single
 * Hohmann transfer before.
 */
export const porkchop: FormulaDef<{ destination: string }> = {
  id: 'porkchop',
  titleKey: 'lab.f.porkchop.title',
  plainKey: 'lab.f.porkchop.plain',
  citationKey: 'porkchop/what-is-a-porkchop',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Porkchop_plot', source: 'wikipedia' },
  domain: 'transfer',
  tier: 8,
  prereqs: ['interplanetary-transfer', 'launch-window'],
  latex:
    '\\Delta v(t_{\\text{dep}}, t_{\\text{of}}) = \\lVert \\vec v_1 - \\vec v_\\oplus \\rVert + v_\\infty^{\\text{arr}}',
  inputs: [
    {
      key: 'destination',
      labelKey: 'lab.f.porkchop.destination',
      units: '',
      kind: 'enum',
      default: 'mars',
      enumValues: PORKCHOP_DEST_IDS.map((d) => ({ value: d, labelKey: `lab.body.${d}` })),
    },
  ],
  outputs: [
    { key: 'minDvKms', labelKey: 'lab.f.porkchop.mindv', units: 'km/s' },
    { key: 'bestDepartureDay', labelKey: 'lab.f.porkchop.bestdep', units: 'day' },
    { key: 'bestTofDay', labelKey: 'lab.f.porkchop.besttof', units: 'day' },
  ],
  compute: ({ destination }) => {
    const win = PORKCHOP_WINDOWS[destination] ?? PORKCHOP_WINDOWS.mars;
    const res = computePorkchopGrid(
      {
        id: 0,
        depRange: [0, win.depSpanDays],
        arrRange: [win.tofMinDays, win.tofMaxDays],
        steps: [48, 40],
        destinationId: destination as DestinationId,
      },
      () => {},
      () => false,
    );
    if (!res) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.interplanetary.err-planet' },
        assumptions: ['lab.assume.lambert-two-body'],
      } satisfies FormulaResult;
    }
    // Find the cheapest (feasible) cell — the best date + duration to leave.
    let min = Infinity;
    let mi = 0;
    let mj = 0;
    res.grid.forEach((row, j) =>
      row.forEach((dv, i) => {
        if (dv < min && dv < DV_FAILED - 0.01) {
          min = dv;
          mi = i;
          mj = j;
        }
      }),
    );
    if (!Number.isFinite(min)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.porkchop.err-no-window' },
        assumptions: ['lab.assume.lambert-two-body'],
      } satisfies FormulaResult;
    }
    return {
      values: {
        minDvKms: { value: min, units: 'km/s' },
        bestDepartureDay: { value: res.depDays[mi], units: 'day' },
        bestTofDay: { value: res.arrDays[mj], units: 'day' },
      },
      status: { ok: true },
      assumptions: [
        'lab.assume.lambert-two-body',
        'lab.assume.coplanar',
        'lab.assume.patched-conic',
      ],
      figure: {
        kind: 'porkchop',
        provenance: { fidelity: 'computed', module: 'transfer/lambert-grid' },
        assumptions: ['lab.assume.lambert-two-body', 'lab.assume.coplanar'],
        depDays: res.depDays,
        tofDays: res.arrDays,
        grid: res.grid,
        units: 'km/s',
      },
    } satisfies FormulaResult;
  },
};

/**
 * Cislunar transfer (Earth→Moon, ECI frame) — how you actually get to the Moon, drawn in the
 * Earth-centred-inertial frame. The minimum-energy trans-lunar coast is a Hohmann half-ellipse
 * from a ~200 km LEO parking orbit (perigee) out to the Moon's distance (apogee): semi-major
 * a = (r_LEO + r_Moon)/2, time of flight t = π√(a³/µ⊕) ≈ 5 days. The TLI (trans-lunar injection)
 * and LOI (lunar-orbit insertion) Δv are the kernel's REAL geocentric-Lambert patched-conic
 * values (`geoTransferDv`). The Moon moves ~62° along its orbit during the coast, so you aim
 * where it WILL be — the lead the figure shows. Surfaces the geocentric-Lambert kernel the Lab
 * had never exposed.
 */
export const cislunarTransfer: FormulaDef<Record<string, never>> = {
  id: 'cislunar-transfer',
  titleKey: 'lab.f.cislunar.title',
  plainKey: 'lab.f.cislunar.plain',
  citationKey: 'orbits/cislunar-orbits',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Trans-lunar_injection', source: 'wikipedia' },
  domain: 'transfer',
  tier: 5,
  prereqs: ['hohmann-transfer'],
  latex: 'a = \\tfrac12(r_{LEO}+r_{Moon}),\\quad t_{of} = \\pi\\sqrt{a^3/\\mu_\\oplus}',
  inputs: [],
  outputs: [
    { key: 'tliKms', labelKey: 'lab.f.cislunar.tli', units: 'km/s' },
    { key: 'loiKms', labelKey: 'lab.f.cislunar.loi', units: 'km/s' },
    { key: 'tofDays', labelKey: 'lab.f.cislunar.tof', units: 'day' },
  ],
  compute: () => {
    const rLeo = R_LEO; // the geo-Lambert module's LEO parking radius (6578 km) — same one geoTransferDv uses
    // Self-consistent Hohmann TOF + Moon distance: the arrival distance depends on the flight
    // time (elliptical lunar orbit), and the flight time depends on the distance. Iterate to
    // convergence against the SAME ephemeris geoTransferDv solves against, so the drawn ellipse's
    // apogee, the TOF, and the reported Δv are one transfer (review A1).
    let moonDist = MOON_ORBIT_RADIUS_KM;
    let tofDays = 0;
    for (let i = 0; i < 4; i += 1) {
      const a = (rLeo + moonDist) / 2;
      tofDays = (Math.PI * Math.sqrt((a * a * a) / MU_EARTH_KM3_S2)) / 86400;
      const r2 = moonEclipticXYKm(EPOCH_JD + tofDays);
      moonDist = Math.hypot(r2[0], r2[1]);
    }
    const gt = geoTransferDv(0, tofDays);
    if (!gt.feasible) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.porkchop.err-no-window' },
        assumptions: ['lab.assume.patched-conic'],
      } satisfies FormulaResult;
    }
    const SIDEREAL_MONTH_DAYS = 27.32166;
    const moonTravelDeg = (tofDays / SIDEREAL_MONTH_DAYS) * 360;
    return {
      values: {
        tliKms: { value: gt.tli, units: 'km/s' },
        loiKms: { value: gt.loi, units: 'km/s' },
        tofDays: { value: tofDays, units: 'day' },
      },
      status: { ok: true },
      assumptions: [
        'lab.assume.patched-conic-insertion',
        'lab.assume.hohmann-translunar',
        'lab.assume.coplanar',
      ],
      figure: {
        kind: 'cislunar-eci',
        provenance: { fidelity: 'computed', module: 'transfer/lambert-geocentric' },
        assumptions: ['lab.assume.patched-conic-insertion', 'lab.assume.hohmann-translunar'],
        earthRadiusKm: R_EARTH_KM,
        leoRadiusKm: rLeo,
        moonDistanceKm: moonDist,
        moonTravelDeg,
        tofDays,
        tliKms: gt.tli,
        loiKms: gt.loi,
      },
    } satisfies FormulaResult;
  },
};
