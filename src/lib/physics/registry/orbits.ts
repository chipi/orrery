/** Orbit and launch-site formulas: circular/vis-viva velocity, Hohmann transfer, launch-site rotation bonus, the reach-orbit verdict. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { circularVelocityKms, visVivaKms, hohmannTransfer } from '../mechanics/orbits';
import { locationModel, rotationVelocityKms } from '../util/location';
import { MOON_ORBIT_RADIUS_KM } from '../util/constants';
import { ORBIT_BODY_IDS } from './shared';

/**
 * Circular orbital velocity: v = √(µ/r). M2 rung 1 — "to stay up, go sideways fast
 * enough." Curve shows the 1/√r falloff with altitude.
 */
export const orbitalVelocity: FormulaDef<{ altitudeKm: number; body: string }> = {
  id: 'orbital-velocity',
  titleKey: 'lab.f.orbital-velocity.title',
  inWordsKey: 'lab.f.orbital-velocity.in-words',
  citationKey: 'orbits/keplerian-orbit',
  learnMore: {
    url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/orbv.html',
    source: 'hyperphysics',
  },
  domain: 'satellite',
  tier: 5,
  prereqs: [],
  latex: 'v = \\sqrt{\\dfrac{\\mu}{r}}',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.orbvel.altitude',
      units: 'km',
      kind: 'number',
      default: 200,
      min: 100,
      max: 40000,
    },
    {
      key: 'body',
      labelKey: 'lab.f.orbvel.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
  ],
  outputs: [{ key: 'vCirc', labelKey: 'lab.f.orbvel.vcirc', units: 'km/s' }],
  compute: ({ altitudeKm, body }) => {
    const b = locationModel(body);
    if (!b) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    const v = circularVelocityKms(b.rKm + altitudeKm, b.muKm3s2);
    const points: Vec2[] = [];
    for (let alt = 100; alt <= 40000.001; alt += 800) {
      points.push({ x: alt, y: circularVelocityKms(b.rKm + alt, b.muKm3s2) });
    }
    return {
      values: { vCirc: { value: v, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.ideal-no-losses'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.point-mass'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.speed', units: 'km/s' },
        series: [{ points }],
        marks: [{ at: { x: altitudeKm, y: v }, labelKey: 'lab.mark.you-are-here', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Vis-viva: v = √(µ(2/r − 1/a)) — the speed at any point of any orbit. M2 rung 2,
 * the tool the transfer is built from. Fail-honest when r isn't on the orbit (r ≥ 2a).
 */
export const visVivaFormula: FormulaDef<{ rKm: number; aKm: number; body: string }> = {
  id: 'vis-viva',
  titleKey: 'lab.f.vis-viva.title',
  inWordsKey: 'lab.f.vis-viva.in-words',
  citationKey: 'orbits/vis-viva',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Vis-viva_equation', source: 'wikipedia' },
  domain: 'satellite',
  tier: 6,
  prereqs: ['orbital-velocity'],
  latex: 'v = \\sqrt{\\mu\\left(\\dfrac{2}{r} - \\dfrac{1}{a}\\right)}',
  inputs: [
    {
      key: 'rKm',
      labelKey: 'lab.f.visviva.r',
      units: 'km',
      kind: 'number',
      default: 6571,
      min: 6471,
      max: 400000,
    },
    {
      key: 'aKm',
      labelKey: 'lab.f.visviva.a',
      units: 'km',
      kind: 'number',
      default: 24368,
      min: 6471,
      max: 400000,
    },
    {
      key: 'body',
      labelKey: 'lab.f.visviva.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
  ],
  outputs: [{ key: 'v', labelKey: 'lab.f.visviva.v', units: 'km/s' }],
  compute: ({ rKm, aKm, body }) => {
    const b = locationModel(body);
    if (!b) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    if (!(rKm > 0) || !(aKm > 0) || rKm >= 2 * aKm) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.vis-viva.err-off-orbit' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    const v = visVivaKms(rKm, aKm, b.muKm3s2);
    const points: Vec2[] = [];
    const rMax = 2 * aKm * 0.999;
    const rMin = Math.max(100, aKm * 0.05);
    for (let r = rMin; r <= rMax; r += (rMax - rMin) / 60) {
      points.push({ x: r, y: visVivaKms(r, aKm, b.muKm3s2) });
    }
    return {
      values: { v: { value: v, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.ideal-no-losses'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.point-mass'],
        x: { labelKey: 'lab.axis.radius', units: 'km' },
        y: { labelKey: 'lab.axis.speed', units: 'km/s' },
        series: [{ points }],
        marks: [{ at: { x: rKm, y: v }, labelKey: 'lab.mark.you-are-here', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Hohmann transfer: the two-burn ellipse between coplanar circular orbits. M2 rung 3
 * — LEO → lunar distance. Emits the geocentric transfer-ellipse figure (new renderer).
 * `total` wires into the verdict's `requiredKms` in the reach-the-Moon goal.
 */
export const hohmannFormula: FormulaDef<{ r1Km: number; r2Km: number; body: string }> = {
  id: 'hohmann-transfer',
  titleKey: 'lab.f.hohmann.title',
  inWordsKey: 'lab.f.hohmann.in-words',
  citationKey: 'transfers/hohmann-transfer',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Hohmann_transfer_orbit', source: 'wikipedia' },
  domain: 'transfer',
  tier: 7,
  prereqs: ['vis-viva'],
  latex: '\\Delta v = \\Delta v_1 + \\Delta v_2',
  inputs: [
    {
      key: 'r1Km',
      labelKey: 'lab.f.hohmann.r1',
      units: 'km',
      kind: 'number',
      default: 6571,
      min: 6471,
      max: 400000,
    },
    {
      key: 'r2Km',
      labelKey: 'lab.f.hohmann.r2',
      units: 'km',
      kind: 'number',
      default: MOON_ORBIT_RADIUS_KM,
      min: 6471,
      max: 400000,
    },
    {
      key: 'body',
      labelKey: 'lab.f.hohmann.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
  ],
  outputs: [
    { key: 'dv1', labelKey: 'lab.f.hohmann.dv1', units: 'km/s' },
    { key: 'dv2', labelKey: 'lab.f.hohmann.dv2', units: 'km/s' },
    { key: 'total', labelKey: 'lab.f.hohmann.total', units: 'km/s' },
    { key: 'tof', labelKey: 'lab.f.hohmann.tof', units: 'day' },
  ],
  compute: ({ r1Km, r2Km, body }) => {
    const b = locationModel(body);
    if (!b) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.coplanar'],
      } satisfies FormulaResult;
    }
    if (!(r1Km > 0) || !(r2Km > 0)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.hohmann.err-radius' },
        assumptions: ['lab.assume.coplanar'],
      } satisfies FormulaResult;
    }
    const h = hohmannTransfer(r1Km, r2Km, b.muKm3s2);
    // Geocentric transfer-ellipse: perigee at +x (θ=0), apogee at −x (θ=π), scaled to
    // the larger orbit. The two burn marks double as the start/target orbit radii, so
    // the renderer draws both circles without an extra spec field.
    const a = h.aTransferKm;
    const rp = Math.min(r1Km, r2Km);
    const ra = Math.max(r1Km, r2Km);
    const e = (ra - rp) / (ra + rp);
    const scale = 1 / ra;
    const arc: Vec2[] = [];
    for (let i = 0; i <= 48; i++) {
      const th = (Math.PI * i) / 48;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(th));
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
      assumptions: ['lab.assume.coplanar', 'lab.assume.ideal-no-losses', 'lab.assume.point-mass'],
      figure: {
        kind: 'transfer-ellipse',
        frame: 'geocentric',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.coplanar', 'lab.assume.ideal-no-losses'],
        bodies: [{ labelKey: 'lab.body.primary', at: { x: 0, y: 0 } }],
        arc,
        // Label by ROLE (departure at r1, arrival at r2), not by position — so a lowering
        // transfer (r1 > r2) still names the burns correctly (review M2 MINOR-2). Perigee is
        // at +x (rp), apogee at −x (ra); the departure orbit sits at whichever r1 is.
        marks: [
          {
            at: { x: (r1Km <= r2Km ? rp : -ra) * scale, y: 0 },
            labelKey: 'lab.mark.burn-depart',
            kind: 'point',
          },
          {
            at: { x: (r1Km <= r2Km ? -ra : rp) * scale, y: 0 },
            labelKey: 'lab.mark.burn-arrive',
            kind: 'point',
          },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Launch-site head-start: the free eastward speed a launch gets from the planet's
 * rotation, v = v_eq·cos(latitude). THE practical-impact lesson (operator 2026-08-30)
 * — choose a point on Earth and see what it's worth: near the equator (Kourou, a sea
 * platform) the planet hands you the most; near the poles, nothing. That saved Δv is
 * exponential in the rocket equation, so the site choice reaches all the way into the
 * rocket's size. Marks the famous pads so the "why launch from Guiana / from the sea"
 * is visible. Removes a slice of the "launch from rest" assumption.
 */
export const launchSite: FormulaDef<{ latitudeDeg: number; body: string }> = {
  id: 'launch-site',
  titleKey: 'lab.f.launch-site.title',
  inWordsKey: 'lab.f.launch-site.in-words',
  citationKey: 'mission-phases/launch',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Spaceport', source: 'wikipedia' },
  domain: 'ascent',
  tier: 3,
  prereqs: [],
  latex: 'v_{\\text{boost}} = v_{\\text{eq}}\\cos\\varphi',
  inputs: [
    {
      key: 'latitudeDeg',
      labelKey: 'lab.f.launchsite.lat',
      units: 'deg',
      kind: 'number',
      default: 5.2, // Kourou
      min: 0,
      max: 90,
    },
    {
      key: 'body',
      labelKey: 'lab.f.launchsite.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
  ],
  outputs: [{ key: 'boost', labelKey: 'lab.f.launchsite.boost', units: 'km/s' }],
  compute: ({ latitudeDeg, body }) => {
    const loc = locationModel(body);
    if (!loc) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.prograde-launch'],
      } satisfies FormulaResult;
    }
    if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.launchsite.err-latitude' },
        assumptions: ['lab.assume.prograde-launch'],
      } satisfies FormulaResult;
    }
    const boost = rotationVelocityKms(loc, latitudeDeg);
    const points: Vec2[] = [];
    for (let lat = 0; lat <= 90.001; lat += 2) {
      points.push({ x: lat, y: rotationVelocityKms(loc, lat) });
    }
    const marks = [
      {
        at: { x: latitudeDeg, y: boost },
        labelKey: 'lab.mark.you-are-here',
        kind: 'point' as const,
      },
    ];
    // Real pads make the lesson concrete — Earth only (their latitudes are Earth sites).
    if (body === 'earth') {
      for (const pad of [
        { lat: 0, key: 'lab.mark.sea-launch' },
        { lat: 5.2, key: 'lab.mark.kourou' },
        { lat: 28.5, key: 'lab.mark.canaveral' },
        { lat: 45.9, key: 'lab.mark.baikonur' },
      ]) {
        marks.push({
          at: { x: pad.lat, y: rotationVelocityKms(loc, pad.lat) },
          labelKey: pad.key,
          kind: 'point' as const,
        });
      }
    }
    return {
      values: { boost: { value: boost, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.rigid-body', 'lab.assume.prograde-launch'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'util/location' },
        assumptions: ['lab.assume.rigid-body', 'lab.assume.prograde-launch'],
        x: { labelKey: 'lab.axis.latitude', units: 'deg' },
        y: { labelKey: 'lab.axis.speed', units: 'km/s' },
        series: [{ points }],
        marks,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Reach-orbit verdict — the M1 payoff that CONNECTS the dots: your rocket's Δv plus
 * the launch-site head-start, against the Δv orbit demands. margin = capacity + boost
 * − required. `capacity` wires from Tsiolkovsky, `boost` from launch-site — so a
 * better site visibly buys margin (or lets the rocket shrink). Fail-honest if short.
 */
export const reachOrbitVerdict: FormulaDef<{
  capacityKms: number;
  boostKms: number;
  requiredKms: number;
}> = {
  id: 'reach-orbit-verdict',
  titleKey: 'lab.f.reach-orbit.title',
  inWordsKey: 'lab.f.reach-orbit.in-words',
  citationKey: 'mission-phases/orbit-insertion',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Orbital_spaceflight', source: 'wikipedia' },
  domain: 'ascent',
  tier: 5,
  prereqs: ['tsiolkovsky', 'launch-site'],
  latex: '\\text{margin} = v_{\\text{cap}} + v_{\\text{boost}} - v_{\\text{req}}',
  inputs: [
    {
      key: 'capacityKms',
      labelKey: 'lab.f.dvm.capacity',
      units: 'km/s',
      kind: 'number',
      default: 8.5,
      min: 0,
      max: 50,
    },
    {
      key: 'boostKms',
      labelKey: 'lab.f.reach-orbit.boost',
      units: 'km/s',
      kind: 'number',
      default: 0.46,
      min: 0,
      max: 1,
    },
    {
      key: 'requiredKms',
      labelKey: 'lab.f.dvm.required',
      units: 'km/s',
      kind: 'number',
      default: 9.4,
      min: 0,
      max: 50,
    },
  ],
  outputs: [{ key: 'margin', labelKey: 'lab.f.dvm.margin', units: 'km/s' }],
  compute: ({ capacityKms, boostKms, requiredKms }) => {
    const margin = capacityKms + boostKms - requiredKms;
    const base = {
      assumptions: ['lab.assume.ideal-no-losses', 'lab.assume.prograde-launch'],
      figure: {
        kind: 'dv-waterfall' as const,
        provenance: { fidelity: 'computed' as const, module: 'ascent/reach-orbit' },
        assumptions: ['lab.assume.ideal-no-losses', 'lab.assume.prograde-launch'],
        segments: [
          { labelKey: 'lab.f.dvm.capacity', dv: capacityKms, kind: 'gain' as const },
          { labelKey: 'lab.f.reach-orbit.boost', dv: boostKms, kind: 'gain' as const },
          { labelKey: 'lab.f.dvm.required', dv: requiredKms, kind: 'cost' as const },
        ],
      },
    };
    if (margin < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.dvm.err-insufficient' },
        ...base,
      } satisfies FormulaResult;
    }
    return {
      values: { margin: { value: margin, units: 'km/s' } },
      status: { ok: true },
      ...base,
    } satisfies FormulaResult;
  },
};
