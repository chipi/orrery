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
  // ISS visitors
  'crew_dragon',
  'cargo_dragon',
  'soyuz_ms',
  'progress_ms',
  'cygnus',
  'starliner',
  'htv_x',
  // Tiangong visitors
  'shenzhou',
  'tianzhou',
]);

export function spacecraftDiagramPath(id: string): string | null {
  if (!SPACECRAFT_DIAGRAMS.has(id)) return null;
  return `${base}/diagrams/spacecraft/${id}.svg`;
}
