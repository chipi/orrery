/**
 * The rovers' own photos along their traverses (#641): download, ladder, place
 * on the path, write the sidecar the scene pins them from.
 *
 * Input: scripts/hotspots/route-photos.json — the curated list, one entry per
 * photo: { rover, id, nasa_id | commons_file, url, sol, approx, sol_source, … }.
 * Each sol is quoted from the photo's own caption (sol_source); Zhurong's are
 * converted from dates (approx). Pick by place, spread along the drive.
 *
 * Per rover:
 *   1. masters/mars-sites/<rover>/route/<id>.jpg ← url (full resolution, LFS)
 *   2. build-display-ladder --only mars-sites/<rover>/route (WebP base + rungs),
 *      add-card-rungs --stems=… (320 / 640 for the hover card / Journey row)
 *   3. position = the traverse point reached on that sol (point_sols), so the
 *      pin sits on the drawn path
 *   4. static/data/mars-traverses/<rover>.route-photos.json + has_route_photos
 * Then: apply-provenance-nasa.mjs (NASA ids) / the Commons rows, alt text in
 * 14 locales, image-approved.
 *
 * Run: node --import tsx scripts/hotspots/fetch-route-photos.ts [--rover opportunity] [--skip-download]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

interface PhotoSpec {
  rover: string;
  id: string;
  url: string;
  sol: number;
  approx?: boolean;
}

const LIST = 'scripts/hotspots/route-photos.json';
const UA = 'Mozilla/5.0 (Orrery route-photos; +https://orrerylearn.com)';

async function download(url: string, out: string): Promise<void> {
  if (existsSync(out)) return;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) throw new Error(`${url}: not an image (${type})`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, Buffer.from(await res.arrayBuffer()));
}

/** Point index reached on `sol`: the last point whose sol is ≤ it. */
function pointAtSol(sols: number[], sol: number): number {
  let i = 0;
  while (i + 1 < sols.length && sols[i + 1] <= sol) i++;
  return i;
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--rover') ? args[args.indexOf('--rover') + 1] : undefined;
  const skipDownload = args.includes('--skip-download');
  const list = (JSON.parse(await fs.readFile(LIST, 'utf8')) as PhotoSpec[]).filter(
    (p) => !only || p.rover === only,
  );
  const rovers = [...new Set(list.map((p) => p.rover))];

  for (const rover of rovers) {
    const photos = list.filter((p) => p.rover === rover);
    const dir = `mars-sites/${rover}/route`;
    if (!skipDownload) {
      for (const p of photos) {
        await download(p.url, path.join('masters', dir, `${p.id}.jpg`));
        console.log(`  ↓ ${rover}/${p.id}`);
      }
    }
    execFileSync('node', ['scripts/vision/build-display-ladder.mjs', '--only', dir], {
      stdio: 'inherit',
    });
    execFileSync(
      'node',
      [
        'scripts/vision/add-card-rungs.mjs',
        `--stems=${photos.map((p) => `${dir}/${p.id}`).join(',')}`,
      ],
      { stdio: 'inherit' },
    );

    const trPath = path.join('static/data/mars-traverses', `${rover}.json`);
    const tr = JSON.parse(await fs.readFile(trPath, 'utf8'));
    const sols: number[] | undefined = tr.point_sols;
    if (!sols?.length) throw new Error(`${rover}: no point_sols to place photos on`);
    const out = photos
      .sort((a, b) => a.sol - b.sol)
      .map((p) => {
        const i = pointAtSol(sols, p.sol);
        const base = `/images/${dir}/${p.id}`;
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
      path.join('static/data/mars-traverses', `${rover}.route-photos.json`),
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
