// Reviewed distances that replace the McConnachie 2012 value in the Local Group files.
// Source: docs/wip/deep-text/batch-05-review.md. refresh-local-group-catalogue.mjs applies this
// after applyToSchematic / applyToSprites, so a refresh does not undo a reviewed value.
// Keyed by member / sprite id (the same ids in static/data/universe/local-group.json and
// static/data/local-group-galaxies.json). A bibcode that could not be confirmed is null.
import { LY_PER_PC } from './catalogue-sources.mjs';

const MLY_PER_KPC = (1000 * LY_PER_PC) / 1e6;

export const LOCAL_GROUP_OVERRIDES = {
  lmc: {
    kpc: 49.59,
    source: 'Pietrzyński et al. 2019, eclipsing-binary distance to the LMC, 49.59 ± 0.54 kpc',
    bibcode: '2019Natur.567..200P',
    record_url: 'https://ui.adsabs.harvard.edu/abs/2019Natur.567..200P/abstract',
    note: 'LMC: 49.59 kpc (arXiv 1903.08096); replaces the McConnachie 2012 value of 51 kpc',
  },
  smc: {
    kpc: 62.44,
    source:
      'Graczyk et al. 2020, eclipsing-binary distance to the SMC, 62.44 ± 0.47 (stat.) ± 0.81 (syst.) kpc',
    bibcode: null,
    record_url: 'https://arxiv.org/abs/2010.08754',
    note: 'SMC: 62.44 kpc (arXiv 2010.08754); ADS bibcode not confirmed; replaces the McConnachie 2012 value of 64 kpc',
  },
};

const meta = ({ kpc: _k, ...rest }, value) => ({ value, ...rest });

/** Schematic members: `dist_mly` (4 decimals) and `catalogue.dist_mly` of the overridden ids. */
export function overrideSchematic(members, table = LOCAL_GROUP_OVERRIDES) {
  return members.map((m) => {
    const ov = table[m.id];
    if (!ov) return m;
    const value = Number((ov.kpc * MLY_PER_KPC).toFixed(4));
    return { ...m, dist_mly: value, catalogue: { dist_mly: meta(ov, value) } };
  });
}

/** Sprite entries: `distance_kpc` and `catalogue.distance_kpc` of the overridden ids. */
export function overrideSprites(entries, table = LOCAL_GROUP_OVERRIDES) {
  return entries.map((e) => {
    const ov = table[e.id];
    if (!ov) return e;
    return { ...e, distance_kpc: ov.kpc, catalogue: { distance_kpc: meta(ov, ov.kpc) } };
  });
}
