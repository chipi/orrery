/**
 * McConnachie 2012 (J/AJ/144/4/catalog) distances for the Local Group files (GitHub #658).
 * Members are matched by an explicit id → catalogue-name table: no fuzzy matching, so a
 * renamed or missing member shows up as a skipped id instead of a wrong distance.
 */
import { LY_PER_PC, vizierRowUrl } from './catalogue-sources.mjs';

export const MCCONNACHIE_BIBCODE = '2012AJ....144....4M';
export const MCCONNACHIE_SOURCE =
  'McConnachie 2012, The observed properties of dwarf galaxies in and around the Local Group';

/** static/data/universe/local-group.json member id → McConnachie name. The Milky Way has none. */
export const SCHEMATIC_NAMES = {
  andromeda: 'Andromeda',
  triangulum: 'Triangulum',
  lmc: 'LMC',
  smc: 'SMC',
  'sagittarius-dsph': 'Sagittarius dSph',
  'ursa-minor-dwarf': 'Ursa Minor',
  'draco-dwarf': 'Draco',
  'sculptor-dwarf': 'Sculptor',
  'sextans-dwarf': 'Sextans (I)',
  'carina-dwarf': 'Carina',
  'fornax-dwarf': 'Fornax',
  'leo-i': 'Leo I',
  'leo-ii': 'Leo II',
  m32: 'M32',
  m110: 'NGC 205',
  'ngc-147': 'NGC 147',
  'ngc-185': 'NGC 185',
  'andromeda-i': 'Andromeda I',
  'andromeda-ii': 'Andromeda II',
  'andromeda-iii': 'Andromeda III',
  'pegasus-dsph': 'Andromeda VI',
  'ngc-6822': 'NGC 6822',
  'ic-1613': 'IC 1613',
  'ic-10': 'IC 10',
  wlm: 'WLM (Wolf-Lundmark-Melotte)',
  'leo-a': 'Leo A',
  'phoenix-dwarf': 'Phoenix',
  'sagittarius-dirr': 'Sagittarius dIrr',
  'aquarius-dwarf': 'Aquarius',
  'tucana-dwarf': 'Tucana',
  'cetus-dwarf': 'Cetus',
  'pegasus-dirr': 'Pegasus dIrr',
};

/** static/data/local-group-galaxies.json entry id → McConnachie name. */
export const SPRITE_NAMES = {
  andromeda: 'Andromeda',
  triangulum: 'Triangulum',
  lmc: 'LMC',
  smc: 'SMC',
  'sagittarius-dwarf': 'Sagittarius dSph',
  'sculptor-dwarf': 'Sculptor',
  'fornax-dwarf': 'Fornax',
  'draco-dwarf': 'Draco',
  'ursa-minor-dwarf': 'Ursa Minor',
  'leo-i': 'Leo I',
  'leo-ii': 'Leo II',
  'sextans-dwarf': 'Sextans (I)',
  'ngc-6822': 'NGC 6822',
  'ic-1613': 'IC 1613',
  wlm: 'WLM (Wolf-Lundmark-Melotte)',
};

const MLY_PER_KPC = (1000 * LY_PER_PC) / 1e6;

const entry = (value, name, kpc, uncertain) => ({
  value,
  source: MCCONNACHIE_SOURCE,
  bibcode: MCCONNACHIE_BIBCODE,
  record_url: vizierRowUrl('J/AJ/144/4/catalog', 'Name', name),
  note: `${name}: ${kpc} kpc${uncertain ? ', flagged uncertain in the catalogue' : ''}; the catalogue gives whole kpc`,
});

/**
 * Members with the catalogue distance: `dist_mly` (4 decimals) and a `catalogue.dist_mly` entry.
 * A member with no name in `names` or no row in the catalogue is returned untouched and listed
 * in `skipped`.
 */
export function applyToSchematic(members, mcc, names = SCHEMATIC_NAMES) {
  const skipped = [];
  const out = members.map((m) => {
    const name = names[m.id];
    const row = name ? mcc.get(name) : null;
    if (!row) {
      const { catalogue: _c, ...rest } = m;
      if (m.id !== 'milky-way') skipped.push(m.id);
      return rest;
    }
    const value = Number((row.dKpc * MLY_PER_KPC).toFixed(4));
    return {
      ...m,
      dist_mly: value,
      catalogue: { dist_mly: entry(value, name, row.dKpc, row.uncertain) },
    };
  });
  return { members: out, skipped };
}

/** Sprite entries with the catalogue distance: `distance_kpc` and a `catalogue.distance_kpc` entry. */
export function applyToSprites(entries, mcc, names = SPRITE_NAMES) {
  const skipped = [];
  const out = entries.map((e) => {
    const name = names[e.id];
    const row = name ? mcc.get(name) : null;
    if (!row) {
      const { catalogue: _c, ...rest } = e;
      skipped.push(e.id);
      return rest;
    }
    return {
      ...e,
      distance_kpc: row.dKpc,
      catalogue: { distance_kpc: entry(row.dKpc, name, row.dKpc, row.uncertain) },
    };
  });
  return { entries: out, skipped };
}
