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
import { gallerySiteIdVariants } from '../src/lib/data/gallery-ids';

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

/**
 * The sites of the Worlds' INDEXes (/moon, /mars, /venus, /earth objects). A site's panel shows
 * the first image of the first folder its gallery ladder finds (galleries.ts), so its thumb is
 * the blessed slot of THAT folder, not necessarily of a folder named like the site.
 */
export interface SiteThumbs {
  /** site id -> `<dir>/<folder>/<slot>` of the 192 px thumb that exists. */
  slots: Record<string, string>;
  /** Sites whose ladder reaches no image, or whose blessed slot has no thumb. */
  none: string[];
}

export interface EntityThumbManifest {
  version: 1;
  surfaces: Record<string, SurfaceThumbs>;
  sites: Record<string, SiteThumbs>;
}

interface SiteBody {
  /** Key in the manifest and in `thumbOfSite(body, id)`. */
  key: string;
  /** static/data file listing the sites (ids, optional `mission_id`). */
  file: string;
  /** The body's own gallery folder: dir, count manifest and override surface. Venus has none. */
  own?: { dir: string; manifest: string; overrides: string };
  /** Probe the fleet galleries too (moon, mars) after the mission galleries. */
  fleet: boolean;
  /** Probe the mission gallery by the site's `mission_id` (earth objects use the id only). */
  byMissionId: boolean;
}

const SITE_BODIES: SiteBody[] = [
  {
    key: 'moon',
    file: 'moon-sites.json',
    own: { dir: 'moon-sites', manifest: 'moon-site-galleries.json', overrides: 'moon-sites' },
    fleet: true,
    byMissionId: true,
  },
  {
    key: 'mars',
    file: 'mars-sites.json',
    own: { dir: 'mars-sites', manifest: 'mars-site-galleries.json', overrides: 'mars-sites' },
    fleet: true,
    byMissionId: true,
  },
  { key: 'venus', file: 'venus-sites.json', fleet: false, byMissionId: true },
  {
    key: 'earth-objects',
    file: 'earth-objects.json',
    own: {
      dir: 'earth-objects',
      manifest: 'earth-object-galleries.json',
      overrides: 'earth-objects',
    },
    fleet: false,
    byMissionId: false,
  },
];

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
  return { manifest: { version: 1, surfaces, sites: buildSiteThumbs(root, missing) }, missing };
}

function overrideSlots(root: string, name: string): Record<string, number> {
  const file = join(root, 'static/data', `${name}-hero-overrides.json`);
  if (!existsSync(file)) return {};
  const o = readJson<{ overrides?: Record<string, { slot?: string }> }>(file).overrides ?? {};
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(o)) {
    const n = v.slot?.match(/^\d\d/)?.[0];
    if (n) out[id] = Number(n);
  }
  return out;
}

const readCounts = (root: string, file: string): Record<string, number> => {
  const p = join(root, 'static/data', file);
  return existsSync(p) ? readJson<Record<string, number>>(p) : {};
};

/** applyHeroOverride (image-hero.ts): the override's slot moves to the front when it is in the gallery. */
function firstSlot(count: number, ...overrides: (number | undefined)[]): number {
  let order = Array.from({ length: count }, (_, i) => i + 1);
  for (const n of overrides) {
    const i = n === undefined ? -1 : order.indexOf(n);
    if (i > 0) order = [order[i], ...order.slice(0, i), ...order.slice(i + 1)];
  }
  return order[0];
}

function buildSiteThumbs(root: string, missing: MissingInputs): Record<string, SiteThumbs> {
  const missionCounts = readCounts(root, 'mission-galleries.json');
  const fleetCounts = readCounts(root, 'fleet-galleries.json');
  const missionOv = overrideSlots(root, 'missions');
  const fleetOv = overrideSlots(root, 'fleet');
  const out: Record<string, SiteThumbs> = {};
  for (const body of SITE_BODIES) {
    const file = join(root, 'static/data', body.file);
    const sites = existsSync(file) ? readJson<{ id: string; mission_id?: string }[]>(file) : [];
    const ownCounts = body.own ? readCounts(root, body.own.manifest) : {};
    const ownOv = body.own ? overrideSlots(root, body.own.overrides) : {};
    const res: SiteThumbs = { slots: {}, none: [] };
    for (const site of sites) {
      // The ladder of getMoonSiteGallery / getMarsSiteGallery / getEarthObjectGallery, first hit wins;
      // each step applies its own folder's hero override, then the site surface's (as the loaders do).
      const steps: { dir: string; folder: string; count: number; slot: number }[] = [];
      const own = body.own;
      if (own) {
        const count = ownCounts[site.id] ?? 0;
        steps.push({
          dir: own.dir,
          folder: site.id,
          count,
          slot: firstSlot(count, ownOv[site.id]),
        });
      }
      const mission = (id: string) => {
        const count = missionCounts[id] ?? 0;
        steps.push({
          dir: 'missions',
          folder: id,
          count,
          slot: firstSlot(count, missionOv[id], ownOv[site.id]),
        });
      };
      const fleet = (id: string) => {
        for (const v of gallerySiteIdVariants(id)) {
          const count = fleetCounts[v] ?? 0;
          steps.push({
            dir: 'fleet-galleries',
            folder: v,
            count,
            slot: firstSlot(count, fleetOv[v], ownOv[site.id]),
          });
        }
      };
      if (body.byMissionId && site.mission_id) mission(site.mission_id);
      mission(site.id);
      if (body.fleet) {
        if (site.mission_id) fleet(site.mission_id);
        fleet(site.id);
      }
      const hit = steps.find((s) => s.count > 0);
      if (!hit) {
        res.none.push(site.id);
        continue;
      }
      const slot = String(hit.slot).padStart(2, '0');
      const rel = `${hit.dir}/${hit.folder}`;
      if (existsSync(join(root, 'static/credit-thumbs/images', rel, `${slot}.1x1.webp`))) {
        res.slots[site.id] = `${rel}/${slot}`;
        continue;
      }
      res.none.push(site.id);
      const crop = `/images/${rel}/${slot}.1x1.jpg`;
      const master = `masters/${rel}/${slot}.jpg`;
      if (existsSync(join(root, 'static', crop))) {
        if (!missing.needThumb.includes(crop)) missing.needThumb.push(crop);
      } else if (existsSync(join(root, master)) && !missing.need1x1.includes(master)) {
        missing.need1x1.push(master);
      }
    }
    out[body.key] = res;
  }
  return out;
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
