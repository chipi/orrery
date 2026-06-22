import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import {
  SPACECRAFT_ANATOMY_IMG,
  SPACECRAFT_DIAGRAMS,
  spacecraftDiagramPath,
} from './spacecraft-diagrams';

// Guards the anatomy manifest against drift: every registered raster id must
// have its display webp on disk, and every webp on disk must be registered —
// so an added/removed illustration can never silently 404 the ANATOMY tab or
// the /colophon showcase (#367).
describe('spacecraft anatomy manifest ↔ assets', () => {
  const ANATOMY_DIR = 'static/images/anatomy';

  it('every SPACECRAFT_ANATOMY_IMG id has a {id}.webp display asset', () => {
    const missing = [...SPACECRAFT_ANATOMY_IMG].filter(
      (id) => !existsSync(`${ANATOMY_DIR}/${id}.webp`),
    );
    expect(missing, `missing webp for: ${missing.join(', ')}`).toEqual([]);
  });

  it('every {id}.webp on disk is registered in SPACECRAFT_ANATOMY_IMG', () => {
    const orphans = readdirSync(ANATOMY_DIR)
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.replace(/\.webp$/, ''))
      .filter((id) => !SPACECRAFT_ANATOMY_IMG.has(id));
    expect(orphans, `unregistered webp: ${orphans.join(', ')}`).toEqual([]);
  });

  it('raster ids resolve to their webp; legacy SVG ids to an svg; unknown → null', () => {
    const someRaster = [...SPACECRAFT_ANATOMY_IMG][0];
    expect(spacecraftDiagramPath(someRaster)).toMatch(/\/images\/anatomy\/.+\.webp$/);

    // An SVG-only id (in SPACECRAFT_DIAGRAMS but not the raster set) → .svg.
    const svgOnly = [...SPACECRAFT_DIAGRAMS].find((id) => !SPACECRAFT_ANATOMY_IMG.has(id));
    if (svgOnly) expect(spacecraftDiagramPath(svgOnly)).toMatch(/\/diagrams\/spacecraft\/.+\.svg$/);

    expect(spacecraftDiagramPath('totally-not-a-spacecraft')).toBeNull();
  });
});
