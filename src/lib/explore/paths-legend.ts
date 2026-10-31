import * as m from '$lib/paraglide/messages';

// The interstellar-bound craft whose legend row / trajectory opens the
// MessagePanel rather than the MissionPanel (mirrors the host's category
// detection for the canvas Today-marker click).
export const INTERSTELLAR_CRAFT = new Set([
  'voyager-1',
  'voyager-2',
  'pioneer-10',
  'pioneer-11',
  'new-horizons',
]);

// Sorted oldest → newest by launch date. Entries are paired with the
// mission's primary agency so the legend renders the same logo
// affordance as /missions cards (via agencyToLogoPaths). Voyager 2
// (Aug 1977) shipped ~2 weeks before Voyager 1 (Sep 1977) — same
// year, ordered by actual launch date so the chronology reads
// cleanly top-to-bottom.
export const PATHS_LEGEND = [
  {
    mission_id: 'pioneer-10',
    color: '#f97583',
    name: 'Pioneer 10',
    launch_year: 1972,
    agency: 'NASA',
  },
  {
    mission_id: 'pioneer-11',
    color: '#ff7b72',
    name: 'Pioneer 11',
    launch_year: 1973,
    agency: 'NASA',
  },
  {
    mission_id: 'voyager-2',
    color: '#4ecdc4',
    name: 'Voyager 2',
    launch_year: 1977,
    agency: 'NASA',
  },
  {
    mission_id: 'voyager-1',
    color: '#ffa657',
    name: 'Voyager 1',
    launch_year: 1977,
    agency: 'NASA',
  },
  {
    mission_id: 'venera-13',
    color: '#da4453',
    name: 'Venera 13',
    launch_year: 1981,
    agency: 'Roscosmos',
  },
  {
    mission_id: 'vega-1',
    color: '#ed5565',
    name: 'Vega 1',
    launch_year: 1984,
    agency: 'Roscosmos / ESA',
  },
  {
    mission_id: 'vega-2',
    color: '#ec87c0',
    name: 'Vega 2',
    launch_year: 1984,
    agency: 'Roscosmos / ESA',
  },
  {
    mission_id: 'giotto',
    color: '#5d9cec',
    name: 'Giotto',
    launch_year: 1985,
    agency: 'ESA',
  },
  {
    mission_id: 'galileo',
    color: '#a5d6a7',
    name: 'Galileo',
    launch_year: 1989,
    agency: 'NASA',
  },
  {
    mission_id: 'ulysses',
    color: '#aab2bd',
    name: 'Ulysses',
    launch_year: 1990,
    agency: 'ESA / NASA',
  },
  {
    mission_id: 'cassini',
    color: '#d2a8ff',
    name: 'Cassini-Huygens',
    launch_year: 1997,
    agency: 'NASA / ESA',
  },
  {
    mission_id: 'rosetta',
    color: '#fc6e51',
    name: 'Rosetta',
    launch_year: 2004,
    agency: 'ESA',
  },
  {
    mission_id: 'new-horizons',
    color: '#ffd33d',
    name: 'New Horizons',
    launch_year: 2006,
    agency: 'NASA',
  },
  {
    mission_id: 'dawn',
    color: '#b392f0',
    name: 'Dawn',
    launch_year: 2007,
    agency: 'NASA',
  },
  {
    mission_id: 'juno',
    color: '#79c0ff',
    name: 'Juno',
    launch_year: 2011,
    agency: 'NASA',
  },
  {
    mission_id: 'hayabusa2',
    color: '#b2e066',
    name: 'Hayabusa2',
    launch_year: 2014,
    agency: 'JAXA',
  },
  {
    mission_id: 'bepicolombo',
    color: '#fcbb6d',
    name: 'BepiColombo',
    launch_year: 2018,
    agency: 'ESA / JAXA',
  },
  {
    mission_id: 'juice',
    color: '#967bdc',
    name: 'JUICE',
    launch_year: 2023,
    agency: 'ESA',
  },
];

// Iconic-mission tagline lookup — one-line "why it's iconic" copy
// surfaced as an italic subtitle under each legend row. Keys are in
// messages/*.json under `explore_iconic_tagline_<mission_id>`. The
// mapping is hand-rolled because Paraglide's tree-shake only sees
// statically-referenced message functions.
export function iconicTagline(missionId: string): string {
  switch (missionId) {
    case 'pioneer-10':
      return m.explore_iconic_tagline_pioneer_10();
    case 'pioneer-11':
      return m.explore_iconic_tagline_pioneer_11();
    case 'voyager-2':
      return m.explore_iconic_tagline_voyager_2();
    case 'voyager-1':
      return m.explore_iconic_tagline_voyager_1();
    case 'venera-13':
      return m.explore_iconic_tagline_venera_13();
    case 'vega-1':
      return m.explore_iconic_tagline_vega_1();
    case 'vega-2':
      return m.explore_iconic_tagline_vega_2();
    case 'giotto':
      return m.explore_iconic_tagline_giotto();
    case 'galileo':
      return m.explore_iconic_tagline_galileo();
    case 'ulysses':
      return m.explore_iconic_tagline_ulysses();
    case 'cassini':
      return m.explore_iconic_tagline_cassini();
    case 'rosetta':
      return m.explore_iconic_tagline_rosetta();
    case 'new-horizons':
      return m.explore_iconic_tagline_new_horizons();
    case 'dawn':
      return m.explore_iconic_tagline_dawn();
    case 'juno':
      return m.explore_iconic_tagline_juno();
    case 'hayabusa2':
      return m.explore_iconic_tagline_hayabusa2();
    case 'bepicolombo':
      return m.explore_iconic_tagline_bepicolombo();
    case 'juice':
      return m.explore_iconic_tagline_juice();
    default:
      return '';
  }
}
