/**
 * The type of an INDEX row as a small glyph (UXD-045): one drawing per kind of object, 14 in all,
 * so the name keeps the row's width. The glyph never carries the meaning alone: the exact
 * localized type is its tooltip and its accessible text (ScaleIndex.svelte).
 */

export type IndexKindGlyph =
  | 'star'
  | 'galaxy'
  | 'cluster'
  | 'globular'
  | 'nebula'
  | 'shell'
  | 'group'
  | 'network'
  | 'wall'
  | 'void'
  | 'attractor'
  | 'black-hole'
  | 'arm'
  | 'other';

export const INDEX_KIND_GLYPHS: readonly IndexKindGlyph[] = [
  'star',
  'galaxy',
  'cluster',
  'globular',
  'nebula',
  'shell',
  'group',
  'network',
  'wall',
  'void',
  'attractor',
  'black-hole',
  'arm',
  'other',
];

/** A row's data kind (`globular-cluster`, `supercluster`, `supermassive` …) to its glyph. */
const BY_KIND: Record<string, IndexKindGlyph> = {
  star: 'star',
  sun: 'star',
  galaxy: 'galaxy',
  'satellite-galaxy': 'galaxy',
  spiral: 'galaxy',
  irregular: 'galaxy',
  'dwarf-elliptical': 'galaxy',
  'dwarf-spheroidal': 'galaxy',
  'dwarf-irregular': 'galaxy',
  'star-cluster': 'cluster',
  'galaxy-cluster': 'cluster',
  cluster: 'cluster',
  concentration: 'cluster',
  'globular-cluster': 'globular',
  nebula: 'nebula',
  'star-forming-region': 'nebula',
  'dark-nebula': 'nebula',
  cloud: 'nebula',
  'planetary-nebula': 'shell',
  'supernova-remnant': 'shell',
  group: 'group',
  supercluster: 'network',
  wall: 'wall',
  void: 'void',
  attractor: 'attractor',
  'spiral-arm': 'arm',
  other: 'other',
};

const BLACK_HOLE_KINDS = new Set([
  'supermassive',
  'stellar',
  'fictional',
  'supermassive-black-hole',
  'stellar-black-hole',
]);

/** The glyph of a row's kind; `blackHole` rows use the black-hole kinds (`supermassive` …). */
export function indexKindGlyph(kind: string, blackHole = false): IndexKindGlyph {
  if (blackHole || BLACK_HOLE_KINDS.has(kind)) return 'black-hole';
  return BY_KIND[kind] ?? 'other';
}
