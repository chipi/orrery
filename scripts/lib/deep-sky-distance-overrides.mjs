// Reviewed distances that replace what the automatic catalogue choice (chooseDistance) picks.
// Source: docs/wip/deep-text/batch-04-review.md "Data corrections". refresh-messier-catalog.mjs
// applies this table after enrichObject, so a refresh does not undo a reviewed value. `pc`/`kpc`/
// `mpc` is the published distance; the stored value is light-years (1 pc = 3.26156 ly).
// A bibcode that could not be confirmed against ADS is null, never guessed.

const LY_PER_PC = 3.26156;

const ADS = (b) => `https://ui.adsabs.harvard.edu/abs/${b}/abstract`;
const ARXIV = (id) => `https://arxiv.org/abs/${id}`;

const LMC = {
  pc: 49590,
  source: 'Pietrzyński et al. 2019, eclipsing-binary distance to the LMC, 49.59 ± 0.54 kpc',
  bibcode: '2019Natur.567..200P',
  record_url: ADS('2019Natur.567..200P'),
  note: 'distance of the host galaxy (LMC); replaces the McConnachie 2012 value of 51 kpc',
};

/** designation (as in the snapshot) → { pc, source, bibcode, record_url, note } or { note } only. */
export const DISTANCE_OVERRIDES = {
  'NGC 1300': {
    pc: 18.99e6,
    source: 'PHANGS adopted distance, Anand et al. 2021 (numerical action methods)',
    bibcode: '2021MNRAS.501.3621A',
    record_url: ARXIV('2012.00757'),
    note: '18.99 ± 2.85 Mpc, method NAM; replaces the Cosmicflows-4 value of 13.9 Mpc',
  },
  '30 Doradus': LMC,
  'NGC 2014 / 2020': LMC,
  'NGC 3372': {
    pc: 2350,
    source:
      'Shull, Darling & Danforth 2021, Gaia EDR3 parallaxes of the Carina O stars, 2.35 ± 0.08 kpc',
    bibcode: '2021ApJ...914...18S',
    record_url: ARXIV('2103.07922'),
    note: 'method parallax',
  },
  'Carina Nebula': {
    pc: 2350,
    source:
      'Shull, Darling & Danforth 2021, Gaia EDR3 parallaxes of the Carina O stars, 2.35 ± 0.08 kpc',
    bibcode: '2021ApJ...914...18S',
    record_url: ARXIV('2103.07922'),
    note: 'method parallax',
  },
  'NGC 6302': {
    pc: 1170,
    source: 'Meaburn et al. 2008, expansion proper motions of the lobes, 1.17 ± 0.14 kpc',
    bibcode: null,
    record_url: ARXIV('0711.4359'),
    note: 'MNRAS 385, 269 (doi 10.1111/j.1365-2966.2007.12782.x); ADS bibcode not confirmed',
  },
  'Rho Ophiuchi': {
    pc: 137.3,
    source: 'Ortiz-León et al. 2017 (GOBELINS), VLBA parallax of Lynds 1688, 137.3 ± 1.2 pc',
    bibcode: null,
    record_url: ARXIV('1611.06466'),
    note: 'ApJ 834, 141 (doi 10.3847/1538-4357/834/2/141); ADS bibcode not confirmed; Zucker et al. 2020 gives 136 pc',
  },
  M17: {
    pc: 1675,
    source: 'Stoop et al. 2024, Gaia distance to the cluster NGC 6618 in M17, 1675 pc',
    bibcode: null,
    record_url: ARXIV('2311.04174'),
    note: 'A&A, kinematic history of NGC 6618 / M 17; ADS bibcode not confirmed; replaces a wrong Hunt & Reffert 2023 name match (606 pc)',
  },
  'Hen 2-104': {
    pc: 3300,
    source: 'Santander-García et al. 2008, 3.3 ± 0.9 kpc',
    bibcode: null,
    record_url: ARXIV('0803.0448'),
    note: 'A&A 485, 117 (doi 10.1051/0004-6361:20079212); ADS bibcode not confirmed',
  },
  'IC 342': {
    pc: 3.45e6,
    source:
      'PHANGS adopted distance, Anand et al. 2021 (tip of the red giant branch), 3.45 ± 0.13 Mpc',
    bibcode: '2021MNRAS.501.3621A',
    record_url: ARXIV('2012.00757'),
    note: 'TRGB; replaces the Cosmicflows-4 value of 2.24 Mpc; Saha et al. 2002 Cepheids give 3.3 Mpc',
  },
  'NGC 3324': {
    note: 'matched NGC_3324 by name (Hunt & Reffert 2023, 2419 pc); Cantat-Gaudin et al. 2020 gives 2389 pc (7,792 ly), a different fit that is not used here',
  },
  'NGC 2392': {
    note: 'method paral; SIMBAD lists other distances from 4,100 to 6,800 ly',
  },
};

/** Apply a reviewed override to one object's catalogue map; returns the same map when none applies. */
export function applyDistanceOverride(designation, catalogue) {
  const ov = DISTANCE_OVERRIDES[designation];
  const cur = catalogue?.dist_ly;
  if (!ov || !cur) return catalogue;
  if (ov.pc === undefined) return { ...catalogue, dist_ly: { ...cur, note: ov.note } };
  const { pc, ...rest } = ov;
  return { ...catalogue, dist_ly: { value: Math.round(pc * LY_PER_PC), ...rest } };
}
