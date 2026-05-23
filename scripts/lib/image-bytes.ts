/**
 * Shared image-byte helpers for the fetch pipeline.
 *
 * Background (GH #251): 110 fleet-gallery files were written with `.jpg`
 * extension but PNG bytes — the downloader pasted source URL bodies
 * verbatim without re-encoding. Browsers + sharp sniff and render
 * fine, so the mismatch stayed hidden until Anthropic's vision API
 * (which strict-checks the declared mime) rejected them.
 *
 * Rule: every byte that lands at a `.jpg` path passes through
 * `coerceToJpeg()` first. No exceptions. `audit-image-mime.ts`
 * enforces this in CI.
 */

import sharp from 'sharp';

const JPEG_QUALITY = 85;
const JPEG_MAGIC: ReadonlyArray<number> = [0xff, 0xd8, 0xff];

/** Returns true iff `buf` starts with the JPEG SOI marker (`ff d8 ff`). */
export function isJpegBytes(buf: Buffer): boolean {
  if (buf.length < JPEG_MAGIC.length) return false;
  for (let i = 0; i < JPEG_MAGIC.length; i++) {
    if (buf[i] !== JPEG_MAGIC[i]) return false;
  }
  return true;
}

/**
 * Round-trip arbitrary image bytes through `sharp().jpeg()` so the
 * output is guaranteed-valid JPEG regardless of source mime (PNG,
 * WebP, AVIF, TIFF, GIF, even mislabelled JPEG — sharp sniffs).
 *
 * The `limitInputPixels: false` mirrors `panorama-padder.ts` —
 * source panoramas can be 30000+ px wide; the default 268 MP cap
 * rejects them.
 */
export async function coerceToJpeg(srcBuf: Buffer): Promise<Buffer> {
  return sharp(srcBuf, { limitInputPixels: false })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}
