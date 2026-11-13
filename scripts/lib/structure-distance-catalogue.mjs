// Sources of the structure distances in the four outer-scale files (GitHub #658, galaxy-pages
// brief decision 6). Source: docs/wip/deep-text/batch-06.md and batch-06-review.md. Keyed by
// structure id; the same id in two files (local-group, virgo-supercluster, laniakea) is an anchor
// at distance 0 and has no entry.
//
// An id is listed only where the review read a paper that states the distance (or the redshift it
// is computed from). Not listed, so no source link: the anchors, m81-group, ngc-5846-group,
// canes-venatici-spur, virgo-ii-groups, antlia-cluster, hydra-centaurus, pavo-indus,
// fornax-eridanus, perseus-pisces, coma-great-wall and bootes-void, whose distances the review
// found unsourced, snippet-only or unverified. A bibcode is null where none was confirmed.
export const STRUCTURE_FILES = ['local-sheet', 'virgo-cluster', 'laniakea', 'cosmic-web'];

const arxiv = (id) => `https://arxiv.org/abs/${id}`;

export const STRUCTURE_DISTANCE_SOURCES = {
  'ic-342-group': {
    source:
      'Wu et al. 2014, infrared tip-of-the-red-giant-branch distance to IC 342, 3.45 ± 0.13 Mpc',
    record_url: arxiv('1404.2987'),
    note: 'IC 342: 3.45 ± 0.13 Mpc; the group value here is 3.3 Mpc, within 1.2 sigma',
  },
  'centaurus-a-group': {
    source: 'Karachentsev et al. 2007, Centaurus A group distance, Cen A 3.76 ± 0.05 Mpc',
    record_url: arxiv('astro-ph/0603091'),
    note: 'Cen A sub-group: 3.76 ± 0.05 Mpc; the M83 sub-group is at 4.79 ± 0.10 Mpc',
  },
  'sculptor-group': {
    source: 'Karachentsev et al. 2021, Sculptor group dwarf galaxies at 3.62 and 3.66 Mpc',
    record_url: arxiv('2102.11354'),
    note: 'two dwarfs at 3.62 and 3.66 Mpc; NGC 253 is at 3.94 Mpc (Karachentsev et al. 2003); the group value here is 3.7 Mpc',
  },
  'maffei-group': {
    source: 'Anand et al. 2019, tip-of-the-red-giant-branch distance to Maffei 2, 5.73 ± 0.40 Mpc',
    record_url: arxiv('1901.05981'),
  },
  'ngc-6946-group': {
    source: 'Anand, Rizzi and Tully 2018, distance to NGC 6946, 7.72 ± 0.32 Mpc',
    record_url: arxiv('1807.05229'),
  },
  'm101-group': {
    source: 'Müller et al. 2017, distance to M101, 7.0 Mpc',
    record_url: arxiv('1701.03681'),
    note: 'M101: 7.0 Mpc; an earlier value of 6.4 Mpc is superseded',
  },
  'canes-venatici-i': {
    source: 'Karachentsev et al. 2003, Canes Venatici I cloud, 4.1 ± 0.2 Mpc',
    record_url: arxiv('astro-ph/0210414'),
    note: 'cloud: 4.1 ± 0.2 Mpc; the value here is 4.0 Mpc, within the error',
  },
  'leo-i-cloud': {
    source: 'Lee and Jang 2013, distance moduli 30.12 (M66) and 30.15 (M96) in the Leo I group',
    record_url: arxiv('1306.2306'),
    note: 'moduli 30.12 and 30.15 are 10.6 and 10.7 Mpc (conversion by the batch reviewer)',
  },
  'ursa-major-cloud': {
    source: 'Trentham, Tully and Verheijen 2001, Ursa Major cloud, 18.6 Mpc',
    record_url: arxiv('astro-ph/0103039'),
    note: 'Tully and Verheijen 1997 adopted 15.5 Mpc',
  },
  'virgo-cluster': {
    source:
      'Mei et al. 2007, Virgo Cluster surface brightness fluctuation distance, 16.5 ± 0.1 ± 1.1 Mpc',
    record_url: arxiv('astro-ph/0702510'),
    note: '79 of 84 galaxies at 16.5 Mpc; M87 is at 16.7 ± 0.2 Mpc',
  },
  'great-attractor': {
    source: 'Woudt and Kraan-Korteweg 2000, Norma cluster redshift, cz = 4,844 km/s',
    record_url: arxiv('astro-ph/0006126'),
    note: 'Norma cluster, cz = 4,844 km/s is about 69 Mpc at H0 = 70 (conversion by the batch reviewer)',
  },
  'centaurus-cluster': {
    source: 'Dupke and Bregman 2006, Centaurus cluster redshift, z = 0.0114',
    record_url: arxiv('astro-ph/0512045'),
    note: 'cz = 3,418 km/s is 49 Mpc at H0 = 70 (conversion by the batch reviewer)',
  },
  'ophiuchus-supercluster': {
    source: 'Durret et al. 2015, Ophiuchus supercluster redshift, z = 0.0296',
    record_url: arxiv('1509.00986'),
    note: 'z = 0.0296 is 127 Mpc at H0 = 70 (conversion by the batch reviewer)',
  },
  'horologium-reticulum': {
    source:
      'Fleenor et al. 2005, Horologium-Reticulum supercluster redshifts, 17,000 to 22,500 km/s',
    record_url: arxiv('astro-ph/0505361'),
    note: '17,000 to 22,500 km/s is 243 to 321 Mpc at H0 = 70; the value here is the 285 Mpc of the mean',
  },
  'shapley-concentration': {
    source: 'Proust et al. 2006, Shapley supercluster, main plane at 14,500 km/s',
    record_url: arxiv('astro-ph/0509903'),
    note: '14,500 km/s is 207 Mpc at H0 = 70 (conversion by the batch reviewer); the value here is 200 Mpc',
  },
  'sloan-great-wall': {
    source: 'Gott et al. 2005, Sloan Great Wall median distance 310 Mpc',
    record_url: arxiv('astro-ph/0310571'),
    note: 'median distance 310 Mpc (z = 0.073); the value here is 300 Mpc',
  },
};

/**
 * Members with a `catalogue.dist_mpc` entry where the table has one, the entry's value being the
 * member's own `dist_mpc` (the validator needs the sourced number to equal the displayed one). A
 * member not in the table has its catalogue entry removed.
 */
export function applyStructureCatalogue(members, table = STRUCTURE_DISTANCE_SOURCES) {
  return members.map((m) => {
    const { catalogue: _c, ...rest } = m;
    const src = table[m.id];
    if (!src) return rest;
    const { source, record_url, note } = src;
    return {
      ...rest,
      catalogue: {
        dist_mpc: {
          value: m.dist_mpc,
          source,
          bibcode: null,
          record_url,
          ...(note ? { note } : {}),
        },
      },
    };
  });
}
