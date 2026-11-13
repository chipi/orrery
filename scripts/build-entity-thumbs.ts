/**
 * Manifest of the round list thumbnails (L45, UXD-025): for every gallery entity, which slot is
 * its picture and whether that slot has a 192 px WebP in static/credit-thumbs.
 *
 * The slot is the blessed hero: static/data/<surface>-hero-overrides.json when the operator's hero
 * review picked one, else 01 (what entityHero() resolves). An entity is listed in `slots` only when
 * `static/credit-thumbs/images/<dir>/<id>/<slot>.1x1.webp` is on disk; otherwise it is in `none`
 * and its row keeps the dot. src/lib/entity-thumb.ts reads the result.
 *
 * Usage:
 *   npx tsx scripts/build-entity-thumbs.ts                 write static/data/entity-thumbs.json
 *   npx tsx scripts/build-entity-thumbs.ts --check         exit 1 when the file is stale (validate-data)
 *   npx tsx scripts/build-entity-thumbs.ts --missing F     also write the generator inputs to F:
 *       { needThumb: [/images/...1x1.jpg], need1x1: [masters/...jpg] }
 *     needThumb -> node scripts/vision/build-credit-thumbs.mjs --paths F
 *     need1x1   -> npx tsx scripts/hotspots/regenerate-tier3-variants.mjs --slots <master> ...
 *                  (then needThumb again)
 *
 * Rerun after anything that changes a gallery slot, a hero override or a credit thumb.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SurfaceSpec {
  /** Key in the manifest and in `thumbOf(surface, id)`. */
  key: string;
  /** Folder under static/images. */
  dir: string;
  /** `<surface>-hero-overrides.json` prefix; null when the surface has no override file. */
  overrides: string | null;
  /** The images sit directly in `dir` (the Sun), not in `dir/<id>/`. */
  flat?: boolean;
}

export const SURFACES: SurfaceSpec[] = [
  { key: 'missions', dir: 'missions', overrides: 'missions' },
  { key: 'fleet', dir: 'fleet-galleries', overrides: 'fleet' },
  { key: 'planets', dir: 'planets', overrides: 'planets' },
  { key: 'small-bodies', dir: 'small-bodies', overrides: 'small-bodies' },
  { key: 'satellites', dir: 'satellites', overrides: 'satellites' },
  { key: 'belts', dir: 'belts', overrides: 'belts' },
  { key: 'earth-objects', dir: 'earth-objects', overrides: 'earth-objects' },
  { key: 'moon-sites', dir: 'moon-sites', overrides: 'moon-sites' },
  { key: 'mars-sites', dir: 'mars-sites', overrides: 'mars-sites' },
  { key: 'iss-modules', dir: 'iss-modules', overrides: 'iss-modules' },
  { key: 'tiangong-modules', dir: 'tiangong-modules', overrides: 'tiangong-modules' },
  { key: 'sun', dir: 'sun', overrides: null, flat: true },
];

export interface SurfaceThumbs {
  dir: string;
  flat?: true;
  /** id -> the two-digit slot whose `.1x1.webp` thumb exists. */
  slots: Record<string, string>;
  /** Entities with a gallery folder and no thumb for the blessed slot. */
  none: string[];
}

export interface EntityThumbManifest {
  version: 1;
  surfaces: Record<string, SurfaceThumbs>;
}

export interface MissingInputs {
  /** `/images/<dir>/<id>/NN.1x1.jpg` of a blessed slot whose 192 px thumb is not built. */
  needThumb: string[];
  /** `masters/<dir>/<id>/NN.jpg` of a blessed slot with no 1x1 crop yet. */
  need1x1: string[];
}

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

function blessedSlot(root: string, spec: SurfaceSpec, id: string): string {
  if (!spec.overrides) return '01';
  const file = join(root, 'static/data', `${spec.overrides}-hero-overrides.json`);
  if (!existsSync(file)) return '01';
  const o = readJson<{ overrides?: Record<string, { slot?: string }> }>(file).overrides?.[id];
  return o?.slot?.match(/^\d\d/)?.[0] ?? '01';
}

export function buildEntityThumbs(root = '.'): {
  manifest: EntityThumbManifest;
  missing: MissingInputs;
} {
  const surfaces: Record<string, SurfaceThumbs> = {};
  const missing: MissingInputs = { needThumb: [], need1x1: [] };
  for (const spec of SURFACES) {
    const base = join(root, 'static/images', spec.dir);
    const ids = spec.flat
      ? [spec.key]
      : readdirSync(base, { withFileTypes: true })
          .filter(
            (d) =>
              d.isDirectory() && readdirSync(join(base, d.name)).some((f) => /^\d\d\./.test(f)),
          )
          .map((d) => d.name)
          .sort();
    const out: SurfaceThumbs = { dir: spec.dir, slots: {}, none: [] };
    if (spec.flat) out.flat = true;
    for (const id of ids) {
      const slot = blessedSlot(root, spec, id);
      const rel = spec.flat ? spec.dir : `${spec.dir}/${id}`;
      const crop = `/images/${rel}/${slot}.1x1.jpg`;
      if (existsSync(join(root, 'static/credit-thumbs/images', rel, `${slot}.1x1.webp`))) {
        out.slots[id] = slot;
        continue;
      }
      out.none.push(id);
      if (existsSync(join(root, 'static', crop))) missing.needThumb.push(crop);
      else if (existsSync(join(root, 'masters', rel, `${slot}.jpg`)))
        missing.need1x1.push(`masters/${rel}/${slot}.jpg`);
    }
    surfaces[spec.key] = out;
  }
  return { manifest: { version: 1, surfaces }, missing };
}

export const MANIFEST_PATH = 'static/data/entity-thumbs.json';
export const serialize = (m: EntityThumbManifest): string => JSON.stringify(m, null, 1) + '\n';

if (process.argv[1]?.endsWith('build-entity-thumbs.ts')) {
  const args = process.argv.slice(2);
  const { manifest, missing } = buildEntityThumbs();
  const text = serialize(manifest);
  const n = Object.values(manifest.surfaces);
  const have = n.reduce((a, s) => a + Object.keys(s.slots).length, 0);
  const none = n.reduce((a, s) => a + s.none.length, 0);
  const mi = args.indexOf('--missing');
  if (mi >= 0) writeFileSync(args[mi + 1], JSON.stringify(missing, null, 1) + '\n');
  if (args.includes('--check')) {
    const stale = !existsSync(MANIFEST_PATH) || readFileSync(MANIFEST_PATH, 'utf8') !== text;
    console.log(
      stale
        ? `[entity-thumbs] ${MANIFEST_PATH} is stale: run npx tsx scripts/build-entity-thumbs.ts`
        : `[entity-thumbs] current: ${have} thumbs, ${none} entities without`,
    );
    process.exit(stale ? 1 : 0);
  }
  writeFileSync(MANIFEST_PATH, text);
  console.log(
    `[entity-thumbs] ${have} thumbs, ${none} entities without ` +
      `(${missing.needThumb.length} need a 192 px thumb, ${missing.need1x1.length} need a 1x1 crop first)`,
  );
}
