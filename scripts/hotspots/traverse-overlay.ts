/**
 * Draw a rover traverse (polyline + stops) over a HiRISE crop, to check a
 * path against the ground it claims: rims, craters, the lander, wheel tracks.
 * Read-only: writes one PNG outside the repo, touches no data.
 *
 * The crop is north-up and centred on --at (cropRemoteRasterToLatLon with
 * requireCentered), so a point goes to pixel by metres from the centre at the
 * crop's own m/px. --shift N,E (metres) draws the path moved, to measure an
 * offset before tying it in a converter (fetch-mer-traverse.ts `ties`).
 *
 * Run (repo Node 22 via mise, for gdal-async):
 *   node --import tsx scripts/hotspots/traverse-overlay.ts --rover opportunity \
 *     --product PSP_001414_1780 --at -2.0535,-5.5040 [--size-m 1100] \
 *     [--shift -213,-62] [--out /tmp/overlay.png]
 * The HiRISE JP2 is downloaded once into .image-cache/hotspots/raw (0.3–1.2 GB).
 */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { cropRemoteRasterToLatLon } from './gdal-crop.ts';
import { hiriseProductIdToJP2Url } from './hirise-catalog.ts';

const IAU_MARS_RADIUS_M = 3396190;
const DEG = 180 / Math.PI;
const OUT_PX = 1400;

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined =>
    args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const pair = (v: string) => v.split(',').map(Number) as [number, number];
  const rover = flag('--rover');
  const product = flag('--product');
  const at = flag('--at');
  if (!rover || !product || !at)
    throw new Error('--rover, --product and --at lat,lon are required');
  const [lat, lon] = pair(at);
  const sizeM = Number(flag('--size-m') ?? '1000');
  const [dN, dE] = pair(flag('--shift') ?? '0,0');
  const out = flag('--out') ?? path.join(os.tmpdir(), `overlay-${rover}-${product}.png`);

  const tr = JSON.parse(
    await fs.readFile(path.join('static/data/mars-traverses', `${rover}.json`), 'utf8'),
  ) as {
    points: [number, number][];
    stops?: { id: string; lat: number; lon: number }[];
  };

  const cropJpg = out.replace(/\.png$/, '') + '.crop.jpg';
  const cropPx = Math.round(sizeM / 0.25);
  const crop = await cropRemoteRasterToLatLon({
    sourceUrl: hiriseProductIdToJP2Url(product),
    targetLat: lat,
    targetLon: lon,
    outputPath: cropJpg,
    cropSize: cropPx,
    requireCentered: true,
    maxBlackFrac: 0.9,
  });
  const res = crop.resolutionMPerPx;
  const k = OUT_PX / cropPx;
  const toPx = (pLat: number, pLon: number): [number, number] => {
    const la = pLat + (dN / IAU_MARS_RADIUS_M) * DEG;
    const lo = pLon + (dE / (IAU_MARS_RADIUS_M * Math.cos(pLat / DEG))) * DEG;
    return [
      (cropPx / 2 + (((lo - lon) / DEG) * IAU_MARS_RADIUS_M * Math.cos(lat / DEG)) / res) * k,
      (cropPx / 2 - (((la - lat) / DEG) * IAU_MARS_RADIUS_M) / res) * k,
    ];
  };

  const line = tr.points
    .map(([a, b]) =>
      toPx(a, b)
        .map((v) => v.toFixed(1))
        .join(','),
    )
    .join(' ');
  const stops = (tr.stops ?? [])
    .map((s) => {
      const [x, y] = toPx(s.lat, s.lon);
      return `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#ff0" stroke-width="3"/><text x="${x + 12}" y="${y - 10}" fill="#ff0" font-size="26" font-family="sans-serif">${s.id}</text>`;
    })
    .join('');
  const bar = (100 / res) * k;
  const svg = `<svg width="${OUT_PX}" height="${OUT_PX}" xmlns="http://www.w3.org/2000/svg">
<polyline points="${line}" fill="none" stroke="#f0f" stroke-width="2" opacity="0.8"/>${stops}
<rect x="20" y="${OUT_PX - 40}" width="${bar}" height="8" fill="#0ff"/>
<text x="20" y="${OUT_PX - 50}" fill="#0ff" font-size="24" font-family="sans-serif">100 m · ${product} · ${res.toFixed(2)} m/px${dN || dE ? ` · shift ${dN} N ${dE} E` : ''}</text></svg>`;
  await sharp(cropJpg)
    .resize(OUT_PX, OUT_PX)
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toFile(out);
  await fs.unlink(cropJpg);
  console.log(`${out} — ${(cropPx * res).toFixed(0)} m at ${res.toFixed(3)} m/px`);
}

main();
