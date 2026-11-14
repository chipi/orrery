import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

/**
 * Every image the /moon, /mars and /earth scenes can draw is credited: each file under their
 * image folders has a row in `static/data/image-provenance.json` (what /credits lists). A
 * folder-to-manifest check, run in `npm run test`; it cannot see an image fetched from outside the
 * repo, which `scripts/audit-scene-image-credits.mjs` covers in a browser. A row is not proof the
 * credit is right (the repo's own gate counts placeholder credits, `validate-gallery-credits`).
 *
 * A file is matched by stem, as /credits bundles rows (`credits-grouping.ts`): the aspect-crop
 * suffix and the extension drop (`01.16x9.jpg` → `01`). A width rung (`name-640.webp`) is a
 * derivative of `name`, and is told apart by the ladder file, not by a number pattern: a real
 * image can end in digits (`sol-1451.webp`).
 */
const FOLDERS = [
  'images/moon-sites',
  'images/mars-sites',
  'images/earth-objects',
  'images/observatories',
  'images/museums',
  'images/launch-ground',
  'images/satellites',
  'images/hotspots',
  'textures',
];

const IMAGE_EXT = /\.(jpe?g|png|webp|svg)$/i;
const STEM_RE = /(?:\.(?:16x9|1x1|4x3))?\.[a-z0-9]+$/i;

const ladder = JSON.parse(readFileSync('static/data/image-ladder.json', 'utf8')) as Record<
  string,
  number[]
>;
const provenance = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8')) as {
  entries: { path: string }[];
};
const credited = new Set(provenance.entries.map((e) => e.path.replace(STEM_RE, '')));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = `${dir}/${name}`;
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** `/images/x/y-640.webp` is a rung when the ladder lists `/images/x/y` with a 640 rung. */
function isRung(urlPath: string): boolean {
  const m = /^(.*)-(\d{3,4})\.webp$/.exec(urlPath);
  return !!m && (ladder[m[1]] ?? []).includes(Number(m[2]));
}

describe('Moon, Mars and Earth scene images are credited', () => {
  for (const folder of FOLDERS) {
    it(`${folder}: every image file has a provenance row`, () => {
      expect(existsSync(`static/${folder}`), `static/${folder} exists`).toBe(true);
      const missing: string[] = [];
      let seen = 0;
      for (const file of walk(`static/${folder}`)) {
        const url = file.slice('static'.length);
        if (!IMAGE_EXT.test(url) || isRung(url)) continue;
        seen++;
        if (!credited.has(url.replace(STEM_RE, ''))) missing.push(url);
      }
      expect(seen, `${folder} holds images`).toBeGreaterThan(0);
      expect(missing, `${folder}: files with no provenance row`).toEqual([]);
    });
  }

  it('reads a width rung from the ladder, not from the digits', () => {
    expect(isRung('/images/anatomy/akatsuki-640.webp')).toBe(true);
    expect(isRung('/images/anatomy/akatsuki-641.webp')).toBe(false);
    expect(isRung('/images/hotspots/mars/curiosity/sol-1451.webp')).toBe(false);
  });
});
