/**
 * Perceptual hash (DCT-based pHash) for image dedup at sourcing-time
 * and at preflight.
 *
 * Algorithm — the canonical DCT pHash that astronomy + media-archive
 * dedup pipelines use:
 *
 *   1. Resize to 32×32 grayscale (sharp; throws away colour + high-
 *      frequency noise — the dedup signal lives in low-frequency
 *      shape, not pixel-level detail).
 *   2. Apply 2D DCT-II. Only the top-left 8×8 sub-matrix matters —
 *      those 64 coefficients describe "what does this image look like
 *      at a glance".
 *   3. Median of those 64 → threshold. Each coefficient becomes
 *      1 bit (above median = 1, below = 0). Result: 64-bit hash
 *      rendered as a 16-char hex string.
 *
 * Similarity = Hamming distance between two hashes (count of bits
 * that differ). Tuned thresholds for this corpus:
 *
 *   ≤ 4   identical / re-encoded / minor crop
 *   5-10  same subject, different angle or lighting (the
 *         chandra/hubble/iss/jwst pattern Marko flagged)
 *   11-20 same scene category
 *   > 20  unrelated
 *
 * Performance: ~10K float ops per image on a 32×32 input via the
 * separable 1D-DCT decomposition + a precomputed cosine table; the
 * sharp resize is the real cost. ~2000-image corpus computes the
 * full cache in ~10-15 s wall-clock.
 */
import sharp from 'sharp';

/** Output dimension of the DCT block we read coefficients out of. */
const BLOCK = 8;
/** Resize target before DCT. Higher = more precision, slower. 32 is
 *  standard for pHash. */
const N = 32;

/** Precomputed cosine table — cos((2i+1)·u·π / 2N) for i in 0..N-1,
 *  u in 0..BLOCK-1. We only need the top BLOCK frequencies on each
 *  axis since the 8×8 sub-matrix discards anything past u=7. */
const COSINE: Float64Array = (() => {
  const t = new Float64Array(N * BLOCK);
  for (let i = 0; i < N; i++) {
    for (let u = 0; u < BLOCK; u++) {
      t[i * BLOCK + u] = Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N));
    }
  }
  return t;
})();

/** DCT-II normalisation coefficient α(k). */
function alpha(k: number): number {
  return k === 0 ? Math.SQRT1_2 : 1; // common shape; the constant
  // factor doesn't affect relative ordering against the median, which
  // is what the bit-encoding cares about, so we skip the global
  // 1/sqrt(N) scaling for speed.
}

/**
 * Compute the perceptual hash of a buffer + return as a 16-char hex
 * string (64 bits). Accepts anything sharp can decode (jpeg / png /
 * webp / etc.). Same hash for visually-similar inputs even when
 * re-encoded, crop-shifted by a few pixels, or hue-shifted.
 */
export async function computePhash(input: Buffer | string): Promise<string> {
  // sharp: resize to N×N grayscale, get the raw byte buffer
  const { data } = await sharp(input)
    .resize(N, N, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Stage 1: 1D DCT-II over rows. For each row, project onto the top
  // BLOCK row-frequencies. row[u] = α(u) · Σ_i pixel[i] · cos(...).
  // Output shape: N rows × BLOCK row-frequencies.
  const rowDct = new Float64Array(N * BLOCK);
  for (let i = 0; i < N; i++) {
    const rowBase = i * N;
    const outBase = i * BLOCK;
    for (let u = 0; u < BLOCK; u++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += data[rowBase + j] * COSINE[j * BLOCK + u];
      }
      rowDct[outBase + u] = alpha(u) * sum;
    }
  }

  // Stage 2: 1D DCT-II over columns of the row-DCT. col[u,v] = α(v) ·
  // Σ_i row[i,u] · cos(...). Output: BLOCK × BLOCK = 64 coefficients.
  const block = new Float64Array(BLOCK * BLOCK);
  for (let u = 0; u < BLOCK; u++) {
    for (let v = 0; v < BLOCK; v++) {
      let sum = 0;
      for (let i = 0; i < N; i++) {
        sum += rowDct[i * BLOCK + u] * COSINE[i * BLOCK + v];
      }
      block[v * BLOCK + u] = alpha(v) * sum;
    }
  }

  // Median of the 64 coefficients. The DC component (block[0]) is
  // included; some pHash variants exclude it, but for our corpus
  // (re-encoded photos that share subject + framing) the inclusion
  // doesn't move the dedup signal noticeably and keeps the bit-1
  // count balanced.
  const sorted = Array.from(block).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Bit-encode: 1 if coefficient > median, 0 otherwise. Pack into a
  // 64-bit BigInt + render as 16-char hex.
  let bits = 0n;
  for (let k = 0; k < 64; k++) {
    if (block[k] > median) bits |= 1n << BigInt(k);
  }
  return bits.toString(16).padStart(16, '0');
}

/** Hamming distance between two 16-char hex hashes. Lower = more
 *  similar. 0 = identical. 64 = maximally different. */
export function hammingDistance(hexA: string, hexB: string): number {
  const a = BigInt('0x' + hexA);
  const b = BigInt('0x' + hexB);
  let xor = a ^ b;
  let count = 0;
  while (xor !== 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}
