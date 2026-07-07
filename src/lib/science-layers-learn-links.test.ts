/**
 * Drift-catcher: every Science Lens layer's `learn: {tab, section}`
 * deeplink points to a real /science article file. PRD-024 Slice 1.
 *
 * The `metaFor()` switch in `ScienceLayersPanel.svelte` returns optional
 * `learn` objects that get rendered as `→ science` links in the lens
 * panel. If the article tab or section doesn't exist, the link 404s
 * silently (the click goes to a non-existent route — SvelteKit returns
 * its error page).
 *
 * This test maintains a manual mirror of the lens-key → article
 * mapping. When you add a new `learn` entry to ScienceLayersPanel,
 * add it here too. The test then walks the mapping + asserts each
 * article file exists on disk under static/data/science/<tab>/<id>.json.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const LENS_LEARN_LINKS: Record<string, { tab: string; section: string }> = {
  'hill-sphere': { tab: 'orbits', section: 'hill-sphere' },
  'lagrange-points': { tab: 'orbits', section: 'lagrange-points' },
  magnetosphere: { tab: 'planets', section: 'magnetic-fields' },
  'sub-solar': { tab: 'planets', section: 'sub-solar-and-terminator' },
  'planet-stats': { tab: 'planets', section: 'planetary-stats' },
};

describe('Science Lens deeplinks → /science articles', () => {
  for (const [layer, { tab, section }] of Object.entries(LENS_LEARN_LINKS)) {
    it(`${layer} → /science/${tab}/${section} (article file exists)`, () => {
      const articlePath = join('static/data/science', tab, `${section}.json`);
      expect(
        existsSync(articlePath),
        `lens layer "${layer}" → /science/${tab}/${section} but ${articlePath} doesn't exist`,
      ).toBe(true);
    });

    it(`${layer} → /science/${tab}/${section} (en-US overlay exists)`, () => {
      const overlayPath = join('i18n-src/en-US/science', tab, `${section}.json`);
      expect(
        existsSync(overlayPath),
        `lens layer "${layer}" → /science/${tab}/${section} but en-US overlay ${overlayPath} doesn't exist`,
      ).toBe(true);
    });
  }
});
