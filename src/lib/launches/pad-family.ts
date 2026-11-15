/**
 * Which launch-pad model a launch gets (G4): the launch-site fleet record id picks the pad
 * family, the launch date picks the era variant (a Saturn V stands at 39A with a Launch
 * Umbilical Tower, a Shuttle with the Fixed and Rotating Service Structures, a Falcon 9 with
 * a transporter-erector). A site with no entry, or a date before the pad existed in a form we
 * model, resolves to null: the scene keeps its generic lattice tower.
 *
 * Every launch-site fleet record has a row in {@link PAD_SITE_FAMILY} (a test lists the
 * directory), `null` where the pad is deliberately generic.
 */

export type PadFamily = 'apollo-shuttle' | 'soviet' | 'spacex' | 'ula' | 'service-tower';

export type PadVariant =
  | 'apollo-lut'
  | 'shuttle'
  | 'sls'
  | 'soyuz'
  | 'proton'
  | 'f9-39a'
  | 'f9-cat'
  | 'f9-te'
  | 'starbase'
  | 'atlas-v'
  | 'cape-classic'
  | 'kourou-a5'
  | 'kourou-a6'
  | 'chinese-fst'
  | 'tanegashima'
  | 'sriharikota';

export interface PadSpec {
  family: PadFamily;
  variant: PadVariant;
  siteId: string;
}

export const VARIANT_FAMILY: Record<PadVariant, PadFamily> = {
  'apollo-lut': 'apollo-shuttle',
  shuttle: 'apollo-shuttle',
  sls: 'apollo-shuttle',
  soyuz: 'soviet',
  proton: 'soviet',
  'f9-39a': 'spacex',
  'f9-cat': 'spacex',
  'f9-te': 'spacex',
  starbase: 'spacex',
  'atlas-v': 'ula',
  'cape-classic': 'service-tower',
  'kourou-a5': 'service-tower',
  'kourou-a6': 'service-tower',
  'chinese-fst': 'service-tower',
  tanegashima: 'service-tower',
  sriharikota: 'service-tower',
};

type EraRule = (year: number) => PadVariant | null;
const always =
  (v: PadVariant): EraRule =>
  () =>
    v;

/** Year as a fraction is not needed: whole years decide every era boundary below. */
export const PAD_SITE_FAMILY: Record<string, EraRule | null> = {
  // Apollo / Shuttle
  'lc-39a': (y) => (y < 1976 ? 'apollo-lut' : y < 2012 ? 'shuttle' : 'f9-39a'),
  'lc-39b': (y) => (y < 1976 ? 'apollo-lut' : y < 2012 ? 'shuttle' : 'sls'),
  // Soviet / Russian, and Kourou's Soyuz pad (the Baikonur support arms)
  'baikonur-1-5': always('soyuz'),
  'baikonur-31-6': always('soyuz'),
  'baikonur-81': always('proton'),
  'baikonur-200': always('proton'),
  'plesetsk-41-1': always('soyuz'),
  'plesetsk-43': always('soyuz'),
  'vostochny-1s': always('soyuz'),
  'kourou-els': always('soyuz'),
  // SpaceX
  'cape-canaveral-slc-40': (y) => (y < 2010 ? 'cape-classic' : y < 2023 ? 'f9-te' : 'f9-cat'),
  'vandenberg-slc-4e': (y) => (y < 2013 ? 'cape-classic' : 'f9-te'),
  'starbase-orbital-a': always('starbase'),
  // ULA
  'cape-canaveral-slc-41': (y) => (y < 2002 ? 'cape-classic' : 'atlas-v'),
  // The Cape's mobile-service-tower pads
  'cape-canaveral-lc-17': always('cape-classic'),
  'cape-canaveral-lc-36b': always('cape-classic'),
  'lc-14': always('cape-classic'),
  'lc-34': always('cape-classic'),
  'lc-5': always('cape-classic'),
  // Kourou ELA
  'kourou-ela-2': always('kourou-a5'),
  'kourou-ela-3': always('kourou-a5'),
  'kourou-ela-4': always('kourou-a6'),
  // Chinese pads, Tanegashima, Sriharikota
  'jiuquan-slc-43': always('chinese-fst'),
  'xichang-lc-2': always('chinese-fst'),
  'xichang-lc-3': always('chinese-fst'),
  'wenchang-lc-101': always('chinese-fst'),
  'wenchang-lc-201': always('chinese-fst'),
  'taiyuan-lc-9': always('chinese-fst'),
  'tanegashima-yoshinobu': always('tanegashima'),
  'sriharikota-slp': always('sriharikota'),
  // Deliberately generic: no pad reference worth a family
  alcantara: null,
  hammaguir: null,
  'kourou-zlv': null,
  'naro-space-center': null,
  palmachim: null,
  'rocket-lab-lc-1': null,
  'san-marco': null,
  'semnan-imam-khomeini': null,
  sohae: null,
  uchinoura: null,
  'wallops-lc-0': null,
  woomera: null,
};

/** The pad model of a fleet launch-site record at a launch year (null = keep the generic tower). */
export function resolvePadSpec(
  siteId: string | null | undefined,
  year: number | null | undefined,
): PadSpec | null {
  if (!siteId) return null;
  const rule = PAD_SITE_FAMILY[siteId];
  if (!rule) return null;
  const variant = rule(year != null && Number.isFinite(year) ? year : new Date().getFullYear());
  return variant ? { family: VARIANT_FAMILY[variant], variant, siteId } : null;
}

/**
 * The fleet id of a launch profile's site name ("LC-39A · Kennedy Space Center"), for a launch
 * whose mission carries no launch-site fleet ref. Order matters: first hit wins.
 */
const PROFILE_SITE_HINTS: [RegExp, string][] = [
  [/LC-?39A/i, 'lc-39a'],
  [/LC-?39B?\b/i, 'lc-39b'],
  [/SLC-?40\b/i, 'cape-canaveral-slc-40'],
  [/\bSLC-?41\b|\bLC-?41\b/i, 'cape-canaveral-slc-41'],
  [/SLC-?4[EW]/i, 'vandenberg-slc-4e'],
  [/LC-?36B?\b/i, 'cape-canaveral-lc-36b'],
  [/LC-?17/i, 'cape-canaveral-lc-17'],
  [/LC-?14\b/i, 'lc-14'],
  [/LC-?34\b/i, 'lc-34'],
  [/LC-?5\b/i, 'lc-5'],
  [/Site 31/i, 'baikonur-31-6'],
  [/Site 1\/5/i, 'baikonur-1-5'],
  [/Site 81|Site 200/i, 'baikonur-81'],
  [/Plesetsk/i, 'plesetsk-43'],
  [/Vostochny/i, 'vostochny-1s'],
  [/ELA-?4/i, 'kourou-ela-4'],
  [/ELA-?3/i, 'kourou-ela-3'],
  [/ELA-?2/i, 'kourou-ela-2'],
  [/Starbase/i, 'starbase-orbital-a'],
  [/Jiuquan/i, 'jiuquan-slc-43'],
  [/LC-?3\b.*Xichang/i, 'xichang-lc-3'],
  [/LC-?2\b.*Xichang/i, 'xichang-lc-2'],
  [/Wenchang/i, 'wenchang-lc-101'],
  [/Tanegashima/i, 'tanegashima-yoshinobu'],
  [/Sriharikota/i, 'sriharikota-slp'],
];

export function padSiteFromProfileName(name: string | null | undefined): string | null {
  if (!name) return null;
  for (const [re, id] of PROFILE_SITE_HINTS) if (re.test(name)) return id;
  return null;
}
