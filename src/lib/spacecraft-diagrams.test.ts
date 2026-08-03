import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { SPACECRAFT_ANATOMY_IMG, spacecraftDiagramPath } from './spacecraft-diagrams';

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

  it('every {id}.webp on disk is registered (or is a known ladder rung)', () => {
    // Responsive-ladder rungs (`{id}-{width}.webp`) live alongside the base
    // `{id}.webp` in the same dir but are NOT manifest ids — only the base
    // (largest width) is registered. A file is a legit rung when
    // image-ladder.json lists that non-base width for a registered id; anything
    // else on disk is still a genuine orphan and must fail.
    const ladder: Record<string, number[]> = JSON.parse(
      readFileSync('static/data/image-ladder.json', 'utf8'),
    );
    const isLadderRung = (name: string): boolean => {
      const m = name.match(/^(.+)-(\d+)$/);
      if (!m) return false;
      const [, base, width] = m;
      const widths = ladder[`/images/anatomy/${base}`];
      return (
        SPACECRAFT_ANATOMY_IMG.has(base) &&
        Array.isArray(widths) &&
        widths.includes(Number(width)) &&
        Number(width) !== Math.max(...widths)
      );
    };
    const orphans = readdirSync(ANATOMY_DIR)
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.replace(/\.webp$/, ''))
      .filter((id) => !SPACECRAFT_ANATOMY_IMG.has(id) && !isLadderRung(id));
    expect(orphans, `unregistered webp: ${orphans.join(', ')}`).toEqual([]);
  });

  it('raster ids resolve to webp; station-visitor underscore ids alias; unknown → null', () => {
    const someRaster = [...SPACECRAFT_ANATOMY_IMG][0];
    expect(spacecraftDiagramPath(someRaster)).toMatch(/\/images\/anatomy\/.+\.webp$/);

    // Underscore visitor ids (e.g. crew_dragon) alias onto the kebab webp.
    expect(spacecraftDiagramPath('crew_dragon')).toMatch(/\/images\/anatomy\/crew-dragon\.webp$/);

    expect(spacecraftDiagramPath('totally-not-a-spacecraft')).toBeNull();
  });
});
