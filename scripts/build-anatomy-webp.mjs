/**
 * build-anatomy-webp.mjs — derive web-sized .webp display versions of the
 * generated spacecraft anatomy art (#367). The full-res .png originals are
 * kept alongside; the app + /colophon reference the .webp (≈10× smaller).
 *
 *   node scripts/build-anatomy-webp.mjs
 */
import { readdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

// Full-res .png originals are kept in original-assets/ (committed as the
// archival backup); the resized ~5 MB webp display set lives under static/
// and is what the app + build actually serve.
const SRC = 'original-assets/anatomy';
const OUT = 'static/images/anatomy';
const MAX = 1100; // longest edge — crisp at any panel/thumbnail size, small bytes

const pngs = readdirSync(SRC).filter((f) => f.endsWith('.png'));
let done = 0;
for (const f of pngs) {
  const src = `${SRC}/${f}`;
  const out = `${OUT}/${f.replace(/\.png$/, '.webp')}`;
  await sharp(src)
    .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  const kb = (statSync(out).size / 1024).toFixed(0);
  console.log(`${f.replace(/\.png$/, '')} → webp ${kb} KB`);
  done++;
}
console.log(`\n${done} anatomy webp derivatives written.`);
