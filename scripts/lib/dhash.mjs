/**
 * Perceptual difference hash for matching a shipped image to its source.
 * 64-bit dHash: grayscale, 9×8, one bit per horizontal neighbour comparison.
 * Distance ≤ 8 (of 64) is the credits plan's "same picture" threshold
 * (docs/wip/2026-10-31-tech-debt-open-inventory.md, gallery credits).
 */
import sharp from 'sharp';

/** @param {Buffer|string} input image bytes or a path @returns {Promise<bigint>} */
export async function dhash(input) {
  const px = await sharp(input)
    .flatten({ background: '#ffffff' })
    .grayscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer();
  let h = 0n;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) h = (h << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  return h;
}

/** Hamming distance of two 64-bit hashes. */
export function distance(a, b) {
  let v = a ^ b;
  let n = 0;
  while (v) {
    n += Number(v & 1n);
    v >>= 1n;
  }
  return n;
}

/** Aspect ratio (w/h) of an image. */
export async function aspect(input) {
  const m = await sharp(input).metadata();
  return m.width / m.height;
}
