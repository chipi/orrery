/**
 * Co-registration SEAM TEST (#309 / #15) — the convincing visual proof.
 *
 * The contact-sheet's "CTX central 512 m" panel was useless (only ~102 px
 * of real CTX upscaled). This instead downsamples the HiRISE detail crop
 * to CTX resolution and composites it INTO the CTX context at the HiRISE's
 * exact ground footprint. If the terrain (craters, dunes, ridges) flows
 * continuously across the inset boundary, the two are the same ground →
 * co-registered. A visible step/offset at the seam = misaligned.
 *
 * Layout per site, three panels:
 *   [ CTX context (window) ] [ HiRISE@CTX-res dropped in (seam test) ] [ HiRISE full-res ]
 *
 * Run (Node 20 for sharp):
 *   node scripts/hotspots/coreg-seam-test.mjs <site> [site ...]
 * Output: /tmp/coreg-seam-<first-site>.jpg
 */
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = process.cwd();
const MARS = path.join(ROOT, 'static/images/hotspots/mars');
const CTX_RES = 5;
const HIRISE_GROUND_M = 512;
const WINDOW_M = 1536; // 3× the HiRISE footprint → inset fills the central 1/3
const P = 520;

async function panelLabel(buf, t) {
  const lab = Buffer.from(
    `<svg width="${P}" height="26"><rect width="${P}" height="26" fill="black" opacity="0.6"/><text x="8" y="19" fill="white" font-size="15" font-family="sans-serif">${t}</text></svg>`,
  );
  return sharp(buf)
    .composite([{ input: lab, top: 0, left: 0 }])
    .toBuffer();
}

async function site(name) {
  const H = path.join(MARS, name, 'tier2-hirise.jpg');
  const C = path.join(MARS, name, 'tier2-ctx.jpg');
  if (!fs.existsSync(H) || !fs.existsSync(C)) return null;
  const cm = await sharp(C).metadata();
  const winPx = Math.round((WINDOW_M / (cm.width * CTX_RES)) * cm.width);
  const left = Math.round((cm.width - winPx) / 2);
  const top = Math.round((cm.height - winPx) / 2);

  // CTX context window upscaled to P.
  const ctxWin = await sharp(C)
    .extract({ left, top, width: winPx, height: winPx })
    .resize(P, P, { kernel: 'cubic' })
    .toBuffer();

  // HiRISE downsampled to CTX resolution then placed into the centre 1/3.
  // Tone-match the inset to the local CTX (mean/std) so the only thing the
  // eye can judge at the seam is GEOMETRIC continuity, not the sensors'
  // different brightness/stretch — otherwise a tonal step masks alignment.
  const insetPx = Math.round((HIRISE_GROUND_M / WINDOW_M) * P);
  const ctxCenter = await sharp(C)
    .extract({
      left: Math.round((cm.width - winPx / 3) / 2),
      top: Math.round((cm.height - winPx / 3) / 2),
      width: Math.round(winPx / 3),
      height: Math.round(winPx / 3),
    })
    .greyscale()
    .toBuffer();
  const ctxStats = (await sharp(ctxCenter).stats()).channels[0];
  const hiRes = await sharp(H)
    .resize(Math.round(HIRISE_GROUND_M / CTX_RES), Math.round(HIRISE_GROUND_M / CTX_RES), {
      fit: 'fill',
    })
    .greyscale()
    .toBuffer();
  const hiStats = (await sharp(hiRes).stats()).channels[0];
  const a = (ctxStats.stdev || 1) / (hiStats.stdev || 1);
  const b = ctxStats.mean - a * hiStats.mean;
  const hiLow = await sharp(hiRes)
    .linear(a, b) // remap HiRISE tone → local CTX mean/std
    .resize(insetPx, insetPx, { kernel: 'nearest' })
    .toBuffer();
  const off = Math.round((P - insetPx) / 2);
  const seamBox = Buffer.from(
    `<svg width="${P}" height="${P}"><rect x="${off}" y="${off}" width="${insetPx}" height="${insetPx}" fill="none" stroke="yellow" stroke-width="1" stroke-dasharray="4 4"/></svg>`,
  );
  const seam = await sharp(ctxWin)
    .composite([{ input: hiLow, top: off, left: off }, { input: seamBox }])
    .toBuffer();

  const hiFull = await sharp(H).resize(P, P, { fit: 'cover' }).toBuffer();

  const panels = [
    await panelLabel(ctxWin, `${name} · CTX ${(WINDOW_M / 1000).toFixed(1)} km`),
    await panelLabel(seam, 'HiRISE@CTX-res dropped in (seam test)'),
    await panelLabel(hiFull, 'HiRISE full-res 512 m'),
  ];
  return sharp({ create: { width: P * 3 + 16, height: P, channels: 3, background: '#111' } })
    .composite([
      { input: panels[0], left: 0, top: 0 },
      { input: panels[1], left: P + 8, top: 0 },
      { input: panels[2], left: P * 2 + 16, top: 0 },
    ])
    .jpeg()
    .toBuffer();
}

async function main() {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.error('usage: coreg-seam-test.mjs <site> [site ...]');
    process.exit(1);
  }
  const rows = [];
  for (const n of names) {
    const r = await site(n);
    if (r) rows.push(r);
    else console.warn(`skip ${n}`);
  }
  const W = P * 3 + 16;
  const out = `/tmp/coreg-seam-${names[0]}.jpg`;
  await sharp({
    create: { width: W, height: rows.length * (P + 6) - 6, channels: 3, background: '#000' },
  })
    .composite(rows.map((b, i) => ({ input: b, left: 0, top: i * (P + 6) })))
    .jpeg({ quality: 90 })
    .toFile(out);
  console.log(out);
}

main();
