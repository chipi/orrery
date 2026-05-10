/**
 * Manifest of which station-module / visiting-spacecraft IDs have a
 * hand-drawn anatomy SVG under `/diagrams/spacecraft/{id}.svg`.
 *
 * The StationModulePanel renders an "ANATOMY" tab only for entities
 * whose ID appears here. As more diagrams are authored they get added
 * to the set; if a diagram is missing the tab simply doesn't appear.
 */
import { base } from '$app/paths';

export const SPACECRAFT_DIAGRAMS = new Set<string>([
  // /iss + /tiangong visitor diagrams (legacy underscore-naming because
  // the iss-visitors / tiangong-visitors json IDs use underscores).
  'crew_dragon',
  'cargo_dragon',
  'soyuz_ms',
  'progress_ms',
  'cygnus',
  'starliner',
  'htv_x',
  'shenzhou',
  'tianzhou',
  // Fleet entry IDs (kebab-case, matching fleet/index.json). Some map
  // to the underscore-named files above via FLEET_TO_FILE; new ones
  // shipped under F.2 marquee tier resolve directly.
  'crew-dragon',
  'cargo-dragon-2',
  'soyuz-ms',
  'progress-ms',
  'cygnus-enhanced',
  'cygnus-standard',
  'htv-x',
  // F.2 marquee tier (PRD-012 v0.2 / RFC-016 v0.2 OQ-13)
  'saturn-v',
  'apollo-csm-block-ii',
  'apollo-lm',
  'hubble',
  'jwst',
  'curiosity',
  'perseverance',
]);

/**
 * Map fleet IDs whose canonical anatomy diagram lives at the legacy
 * underscore-named file. Lets new /fleet entries reuse the 9 visitor
 * SVGs already shipped for /iss + /tiangong without duplicating them
 * to kebab-case filenames.
 */
const FLEET_TO_FILE: Record<string, string> = {
  'crew-dragon': 'crew_dragon',
  'cargo-dragon-2': 'cargo_dragon',
  'soyuz-ms': 'soyuz_ms',
  'progress-ms': 'progress_ms',
  'cygnus-enhanced': 'cygnus',
  'cygnus-standard': 'cygnus',
  'htv-x': 'htv_x',
};

export function spacecraftDiagramPath(id: string): string | null {
  if (!SPACECRAFT_DIAGRAMS.has(id)) return null;
  const file = FLEET_TO_FILE[id] ?? id;
  return `${base}/diagrams/spacecraft/${file}.svg`;
}
