/**
 * The published values behind the three real black holes (GitHub #658). There is no service to
 * fetch these from (VizieR has no table for them), so the papers' values are entered here once,
 * each with its bibcode; scripts/refresh-black-hole-catalogue.mjs cross-checks the distances
 * against SIMBAD and writes static/data/universe/black-holes.json.
 *
 * Gargantua is fiction (Kip Thorne's Interstellar model): no entry, no catalogue values.
 */
import { LY_PER_PC, adsUrl, simbadRecordUrl } from './catalogue-sources.mjs';

/** 2 G M_sun / c^2, kilometres. */
export const SCHWARZSCHILD_KM_PER_SOLAR_MASS = 2.953250077;

export const PAPERS = {
  gravity2022: {
    bibcode: '2022A&A...657L..12G',
    source: 'GRAVITY Collaboration 2022, Mass of Sgr A* and distance to the Galactic Centre',
  },
  eht2019: {
    bibcode: '2019ApJ...875L...6E',
    source: 'Event Horizon Telescope Collaboration 2019 (paper VI), M87* shadow, mass and distance',
  },
  millerJones2021: {
    bibcode: '2021Sci...371.1046M',
    source: 'Miller-Jones et al. 2021, Cygnus X-1 contains a 21-solar mass black hole',
  },
};

/** Per hole: the paper values, the SIMBAD identifier for the object page and the cross-check. */
export const REAL_HOLES = {
  'sagittarius-a-star': {
    simbadId: 'Sgr A*',
    mass: {
      value: 4_297_000,
      paper: 'gravity2022',
      note: '4.297 +/- 0.012 (stat) +/- 0.040 (sys) million solar masses',
    },
    dist: {
      pc: 8277,
      paper: 'gravity2022',
      note: '8.277 +/- 0.009 (stat) +/- 0.033 (sys) kpc to the Galactic Centre',
    },
  },
  'm87-star': {
    simbadId: 'M 87',
    mass: {
      value: 6_500_000_000,
      paper: 'eht2019',
      note: '6.5 +/- 0.7 billion solar masses (gas and stellar dynamics put it near 6.6 billion: Kormendy & Ho 2013, 2013ARA&A..51..511K)',
    },
    dist: {
      mpc: 16.8,
      paper: 'eht2019',
      note: 'adopted distance to M87, 16.8 +/- 0.8 Mpc',
    },
  },
  'cygnus-x-1': {
    simbadId: 'HD 226868',
    mass: {
      value: 21.2,
      paper: 'millerJones2021',
      note: '21.2 +/- 2.2 solar masses',
    },
    dist: {
      pc: 2220,
      paper: 'millerJones2021',
      note: '2.22 +0.18/-0.17 kpc from radio parallax',
    },
  },
};

const round = (n, d = 0) => Number(n.toFixed(d));

const entry = (value, paperKey, recordPaperUrl, note) => ({
  value,
  source: PAPERS[paperKey].source,
  bibcode: PAPERS[paperKey].bibcode,
  record_url: recordPaperUrl,
  ...(note ? { note } : {}),
});

/** The distance in light-years for a paper's entry (parsecs or megaparsecs). */
export function holeDistanceLy(d) {
  const pc = d.pc ?? d.mpc * 1e6;
  return round(pc * LY_PER_PC);
}

/**
 * The real hole with its sourced values: mass and distance replaced by the paper's, the
 * Schwarzschild radius recomputed from the mass (2GM/c^2, so it cannot drift from it), the
 * `catalogue` map and `records` added. `extraNotes` adds a per-field note (alternatives
 * found by the refresh: SIMBAD's range, the site's own Cosmicflows-4 value).
 */
export function buildRealHole(hole, spec, extraNotes = {}) {
  const joinNote = (a, b) => [a, b].filter(Boolean).join('; ');
  const massLink = adsUrl(PAPERS[spec.mass.paper].bibcode);
  const distLink = adsUrl(PAPERS[spec.dist.paper].bibcode);
  const distLy = holeDistanceLy(spec.dist);
  return {
    ...hole,
    mass_solar: spec.mass.value,
    dist_ly: distLy,
    rs_km: round(spec.mass.value * SCHWARZSCHILD_KM_PER_SOLAR_MASS),
    records: { simbad: simbadRecordUrl(spec.simbadId) },
    catalogue: {
      mass_solar: entry(
        spec.mass.value,
        spec.mass.paper,
        massLink,
        joinNote(spec.mass.note, extraNotes.mass_solar),
      ),
      dist_ly: entry(
        distLy,
        spec.dist.paper,
        distLink,
        joinNote(spec.dist.note, extraNotes.dist_ly),
      ),
    },
  };
}

/** Whether a distance lies within the spread of SIMBAD's compiled values, with 10 per cent of slack. */
export function withinSimbadRange(ly, rangeLy) {
  if (!rangeLy) return null;
  return ly >= rangeLy[0] * 0.9 && ly <= rangeLy[1] * 1.1;
}
