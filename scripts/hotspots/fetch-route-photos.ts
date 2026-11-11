/**
 * The rovers' own photos along their traverses (#641): download, ladder, place
 * on the path, write the sidecar the scene pins them from.
 *
 * Input: scripts/hotspots/route-photos.json — the curated list, one entry per
 * photo: { rover, id, nasa_id | commons_file, url, sol, approx, sol_source, … }.
 * Each sol is quoted from the photo's own caption (sol_source); Zhurong's are
 * converted from dates (approx). Pick by place, spread along the drive.
 *
 * Per rover (a route photo is a slot of the rover's place gallery: missions/<rover>, else
 * mars-sites/<rover>; a photo keeps the slot its sidecar row names, a new one takes the next free one):
 *   1. masters/<gallery>/NN.jpg ← url (full resolution, LFS)
 *   2. build-display-ladder --only <gallery> (WebP base + rungs),
 *      add-card-rungs --stems=… (320 / 640 for the hover card / Journey row)
 *   3. position = the traverse point reached on that sol (point_sols), so the
 *      pin sits on the drawn path
 *   4. static/data/mars-traverses/<rover>.route-photos.json + has_route_photos
 * Then, as for any new gallery slot: the 1x1 crop, provenance (apply-provenance-nasa.mjs / the
 * Commons rows), alt text in 14 locales, image-approved and the counts (rebuild-gallery-manifests.ts).
 *
 * Run: node --import tsx scripts/hotspots/fetch-route-photos.ts [--rover opportunity] [--skip-download]
 *      node --import tsx scripts/hotspots/fetch-route-photos.ts --annotations   (Apollo ring photos)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, promises as fs, readdirSync } from 'node:fs';
import path from 'node:path';

interface PhotoSpec {
  rover: string;
  id: string;
  url: string;
  sol: number;
  approx?: boolean;
}

const LIST = 'scripts/hotspots/route-photos.json';
const UA = 'Mozilla/5.0 (Orrery route-photos; +https://github.com/chipi/orrery)';

async function download(url: string, out: string): Promise<void> {
  await fs.mkdir(path.dirname(out), { recursive: true });
  let fh: fs.FileHandle;
  try {
    fh = await fs.open(out, 'wx');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') return;
    throw e;
  }
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) throw new Error(`${url}: not an image (${type})`);
    await fh.writeFile(Buffer.from(await res.arrayBuffer()));
  } catch (e) {
    await fh.close();
    await fs.rm(out, { force: true });
    throw e;
  }
  await fh.close();
}

/** Point index reached on `sol`: the last point whose sol is ≤ it. */
function pointAtSol(sols: number[], sol: number): number {
  let i = 0;
  while (i + 1 < sols.length && sols[i + 1] <= sol) i++;
  return i;
}

interface AnnotationFrame {
  id: string;
  slot: string;
  url: string;
  nasa_id?: string;
  crop?: { left: number; top: number; width: number; height: number };
}
interface AnnotationRef {
  frame?: string;
  image?: string;
  nasa_id?: string;
}

const ANNOTATION_LIST = 'scripts/hotspots/annotation-photos.json';
const ANNOTATION_SIDECAR = 'static/data/moon-annotation-photos.json';

/**
 * Apollo hardware rings: one photo per annotation, shown when the ring is tapped.
 * Input scripts/hotspots/annotation-photos.json: `frames` (NASA/Commons downloads →
 * masters/<slot>.jpg, the next free numbered slot of the place's own gallery, optional crop for a
 * film border; the 1x1 crop, provenance, alt text and counts follow the gallery tools, as for any
 * new slot) and
 * `annotations` (site → ring id → a frame above, or an already-served gallery image
 * reused as is). Writes static/data/moon-annotation-photos.json.
 */
async function annotations(skipDownload: boolean) {
  const list = JSON.parse(await fs.readFile(ANNOTATION_LIST, 'utf8')) as {
    frames: AnnotationFrame[];
    annotations: Record<string, Record<string, AnnotationRef>>;
  };
  const dirs = [...new Set(list.frames.map((f) => path.dirname(f.slot)))];
  if (!skipDownload) {
    const { default: sharp } = await import('sharp');
    for (const f of list.frames) {
      const out = path.join('masters', `${f.slot}.jpg`);
      if (existsSync(out)) continue;
      const tmp = `${out}.part`;
      await download(f.url, tmp);
      if (f.crop) await sharp(tmp).extract(f.crop).jpeg({ quality: 95 }).toFile(out);
      else await fs.copyFile(tmp, out);
      await fs.rm(tmp);
      console.log(`  ↓ ${f.id}`);
    }
  }
  execFileSync('node', ['scripts/vision/build-display-ladder.mjs', '--only', dirs.join(',')], {
    stdio: 'inherit',
  });
  execFileSync(
    'node',
    ['scripts/vision/add-card-rungs.mjs', `--stems=${list.frames.map((f) => f.slot).join(',')}`],
    { stdio: 'inherit' },
  );

  const frames = new Map(list.frames.map((f) => [f.id, f]));
  const out: Record<
    string,
    Record<string, { image: string; thumb: string; nasa_id?: string }>
  > = {};
  for (const [site, rings] of Object.entries(list.annotations)) {
    out[site] = {};
    for (const [ring, ref] of Object.entries(rings)) {
      const frame = ref.frame ? frames.get(ref.frame) : undefined;
      if (ref.frame && !frame) throw new Error(`${site}/${ring}: unknown frame ${ref.frame}`);
      const image = frame ? `/images/${frame.slot}.webp` : ref.image;
      if (!image) throw new Error(`${site}/${ring}: needs frame or image`);
      if (!existsSync(`static${image}`)) throw new Error(`${image} not built`);
      const base = image.replace(/\.webp$/, '');
      const thumb = [320, 640]
        .map((w) => `${base}-${w}.webp`)
        .find((t) => existsSync(`static${t}`));
      const nasaId = frame?.nasa_id ?? ref.nasa_id;
      out[site][ring] = { image, thumb: thumb ?? image, ...(nasaId ? { nasa_id: nasaId } : {}) };
    }
  }
  await fs.writeFile(ANNOTATION_SIDECAR, JSON.stringify(out, null, 2) + '\n');
  console.log(`annotations: ${Object.keys(out).length} sites → ${ANNOTATION_SIDECAR}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--annotations')) return annotations(args.includes('--skip-download'));
  const only = args.includes('--rover') ? args[args.indexOf('--rover') + 1] : undefined;
  const skipDownload = args.includes('--skip-download');
  const list = (JSON.parse(await fs.readFile(LIST, 'utf8')) as PhotoSpec[]).filter(
    (p) => !only || p.rover === only,
  );
  const rovers = [...new Set(list.map((p) => p.rover))];

  const missionCounts = JSON.parse(await fs.readFile('static/data/mission-galleries.json', 'utf8'));
  const slotCount = (dir: string, root: string, ext: string) =>
    existsSync(`${root}/${dir}`)
      ? readdirSync(`${root}/${dir}`).filter((f) => new RegExp(`^\\d\\d\\.${ext}$`).test(f)).length
      : 0;

  for (const rover of rovers) {
    const photos = list.filter((p) => p.rover === rover).sort((a, b) => a.sol - b.sol);
    // The rover's place gallery, as the loaders resolve it: the mission gallery, else the site's own.
    const gallery = missionCounts[rover] > 0 ? `missions/${rover}` : `mars-sites/${rover}`;
    const sidecarPath = path.join('static/data/mars-traverses', `${rover}.route-photos.json`);
    const prev: { id: string; image: string }[] = await fs.readFile(sidecarPath, 'utf8').then(
      (t) => JSON.parse(t).photos,
      (e) => {
        if (e.code === 'ENOENT') return [];
        throw e;
      },
    );
    // A photo keeps the slot it already has (it may be an older gallery photo); new ones take the
    // next free numbers. The 1x1 crop, provenance, alt text and counts follow the gallery tools.
    const slotOf = new Map(prev.map((p) => [p.id, p.image.replace(/^\/images\/|\.webp$/g, '')]));
    let next =
      Math.max(slotCount(gallery, 'static/images', 'webp'), slotCount(gallery, 'masters', 'jpg')) +
      1;
    for (const p of photos)
      if (!slotOf.has(p.id)) slotOf.set(p.id, `${gallery}/${String(next++).padStart(2, '0')}`);
    if (!skipDownload) {
      for (const p of photos) {
        await download(p.url, path.join('masters', `${slotOf.get(p.id)}.jpg`));
        console.log(`  ↓ ${rover}/${p.id}`);
      }
    }
    execFileSync('node', ['scripts/vision/build-display-ladder.mjs', '--only', gallery], {
      stdio: 'inherit',
    });
    execFileSync(
      'node',
      [
        'scripts/vision/add-card-rungs.mjs',
        `--stems=${photos.map((p) => slotOf.get(p.id)).join(',')}`,
      ],
      { stdio: 'inherit' },
    );

    const trPath = path.join('static/data/mars-traverses', `${rover}.json`);
    const tr = JSON.parse(await fs.readFile(trPath, 'utf8'));
    const sols: number[] | undefined = tr.point_sols;
    if (!sols?.length) throw new Error(`${rover}: no point_sols to place photos on`);
    const out = photos.map((p) => {
      const i = pointAtSol(sols, p.sol);
      const base = `/images/${slotOf.get(p.id)}`;
      const thumb = [320, 640]
        .map((w) => `${base}-${w}.webp`)
        .find((t) => existsSync(`static${t}`));
      if (!existsSync(`static${base}.webp`)) throw new Error(`${base}.webp not built`);
      return {
        id: p.id,
        sol: p.sol,
        ...(p.approx ? { sol_approx: true } : {}),
        lat: tr.points[i][0],
        lon: tr.points[i][1],
        image: `${base}.webp`,
        thumb: thumb ?? `${base}.webp`,
      };
    });
    await fs.writeFile(
      sidecarPath,
      JSON.stringify({ rover_id: rover, photos: out }, null, 2) + '\n',
    );
    if (!tr.has_route_photos) {
      tr.has_route_photos = true;
      await fs.writeFile(trPath, JSON.stringify(tr, null, 2) + '\n');
    }
    console.log(`${rover}: ${out.length} photos → ${rover}.route-photos.json`);
  }
}

main();
