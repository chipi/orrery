/**
 * Co-registration review contact sheet (#309 / #15). For each Mars site
 * with a HiRISE detail crop + CTX regional crop, builds a 3-panel row:
 *
 *   [ HiRISE detail (≈512 m) ] [ CTX central 512 m ] [ CTX 15.4 km + red box ]
 *
 * stacked into one tall sheet. This is the HUMAN review surface for the
 * per-image approval gate — NCC is unreliable across HiRISE-vs-CTX (sun
 * angle / acquisition-time shadow flips, see #309), so co-registration
 * is confirmed by (a) the proven crop transform centring on site coords
 * and (b) a human eyeballing that the detail terrain sits where the red
 * box marks on the wider CTX context.
 *
 * Run (Node 20 for sharp):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/hotspots/coreg-contact-sheet.mjs [site ...]
 * With no args, processes every Mars site that has both crops on disk.
 * Output: /tmp/coreg-contact-sheet.jpg
 */
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = process.cwd();
const MARS_DIR = path.join(ROOT, 'static/images/hotspots/mars');
const P = 360; // panel size
const CTX_RES = 5; // Murray Lab Global CTX Mosaic m/px
const HIRISE_GROUND_M = 512; // 2048 px × 0.25 m/px (binned 0.5 m/px products read ~1024; box is indicative)
const OUT = '/tmp/coreg-contact-sheet.jpg';

function labelSvg(text, w, color = 'white') {
  return Buffer.from(
    `<svg width="${w}" height="26"><rect width="${w}" height="26" fill="black" opacity="0.6"/><text x="8" y="19" fill="${color}" font-size="15" font-family="sans-serif">${text}</text></svg>`,
  );
}

async function row(site) {
  const H = path.join(MARS_DIR, site, 'tier2-hirise.jpg');
  const C = path.join(MARS_DIR, site, 'tier2-ctx.jpg');
  if (!fs.existsSync(H) || !fs.existsSync(C)) return null;
  const cm = await sharp(C).metadata();
  const win = Math.max(8, Math.round((HIRISE_GROUND_M / (cm.width * CTX_RES)) * cm.width));
  const left = Math.round((cm.width - win) / 2);
  const top = Math.round((cm.height - win) / 2);

  const hi = await sharp(H).resize(P, P, { fit: 'cover' }).toBuffer();
  const ctxWin = await sharp(C)
    .extract({ left, top, width: win, height: win })
    .resize(P, P, { kernel: 'cubic' })
    .toBuffer();
  const bw = (P * win) / cm.width;
  const box = Buffer.from(
    `<svg width="${P}" height="${P}"><rect x="${(P - bw) / 2}" y="${(P - bw) / 2}" width="${bw}" height="${bw}" fill="none" stroke="red" stroke-width="2"/></svg>`,
  );
  const ctxFull = await sharp(C)
    .resize(P, P, { fit: 'cover' })
    .composite([{ input: box }])
    .toBuffer();

  async function lbl(buf, t) {
    return sharp(buf)
      .composite([{ input: labelSvg(t, P), top: 0, left: 0 }])
      .toBuffer();
  }
  const panels = [
    await lbl(hi, `${site} · HiRISE 512 m`),
    await lbl(ctxWin, 'CTX central 512 m'),
    await lbl(ctxFull, 'CTX 15.4 km'),
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
  let sites = process.argv.slice(2);
  if (sites.length === 0) {
    sites = fs
      .readdirSync(MARS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((s) => fs.existsSync(path.join(MARS_DIR, s, 'tier2-hirise.jpg')))
      .sort();
  }
  const rows = [];
  for (const s of sites) {
    const r = await row(s);
    if (r) rows.push(r);
    else console.warn(`skip ${s} (missing crop)`);
  }
  if (!rows.length) {
    console.error('no rows');
    process.exit(1);
  }
  const W = P * 3 + 16;
  const composite = rows.map((buf, i) => ({ input: buf, left: 0, top: i * (P + 6) }));
  await sharp({
    create: { width: W, height: rows.length * (P + 6) - 6, channels: 3, background: '#000' },
  })
    .composite(composite)
    .jpeg({ quality: 88 })
    .toFile(OUT);
  console.log(`${OUT}  (${rows.length} sites)`);
}

main();
