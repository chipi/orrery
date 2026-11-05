/**
 * Globe-matched tint for greyscale surface imagery (#641).
 *
 * CTX and HiRISE red-band patches are greyscale; lit by the warm sun they read
 * as a pale tan square on the orange Mars globe. A greyscale patch texture is
 * multiplied by the globe's own colour under it (divided by the patch's mean
 * grey), so the patch keeps its relief and takes the globe's hue. Colour
 * textures (HiRISE IRB route tiles, Earth photos) are left alone.
 */

type Img = CanvasImageSource & { width: number; height: number };

/** UV of a lat/lon on THREE.SphereGeometry's equirectangular map, in the frame
 *  latLonToUnitSphere uses (lon 0 → +x, lon 90 → −z). v = 0 is the top row. */
export function globeUv(latDeg: number, lonDeg: number): [number, number] {
  const u = (((0.5 + lonDeg / 360) % 1) + 1) % 1;
  return [u, (90 - latDeg) / 180];
}

/** Material colour that turns a grey of `mean` (0–1) into the globe colour. */
export function tintFromMean(
  globe: [number, number, number],
  mean: number,
): [number, number, number] {
  const m = Math.max(0.05, mean);
  return globe.map((c) => Math.min(2, c / m)) as [number, number, number];
}

/** Mean RGB (0–1) and greyness of a small downsample of an image. */
export function imageStats(
  img: Img,
  n = 16,
): { mean: [number, number, number]; grey: boolean; luma: number } | null {
  if (typeof document === 'undefined' || !img.width) return null;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, n, n);
  const d = ctx.getImageData(0, 0, n, n).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let chroma = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
    chroma += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
  }
  const px = d.length / 4;
  const mean: [number, number, number] = [r / px / 255, g / px / 255, b / px / 255];
  return { mean, grey: chroma / px < 8, luma: (mean[0] + mean[1] + mean[2]) / 3 };
}

/** Sampler for the globe's colour around a lat/lon (a ~3° window). */
export function globeSampler(
  img: Img,
): ((latDeg: number, lonDeg: number) => [number, number, number]) | null {
  if (typeof document === 'undefined' || !img.width) return null;
  const W = 512;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  return (latDeg, lonDeg) => {
    const [u, v] = globeUv(latDeg, lonDeg);
    const cx = Math.floor(u * W);
    const cy = Math.floor(v * H);
    let r = 0;
    let g = 0;
    let b = 0;
    let k = 0;
    for (let dy = -2; dy <= 2; dy++) {
      const y = Math.min(H - 1, Math.max(0, cy + dy));
      for (let dx = -2; dx <= 2; dx++) {
        const x = (((cx + dx) % W) + W) % W;
        const i = (y * W + x) * 4;
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        k++;
      }
    }
    return [r / k / 255, g / k / 255, b / k / 255];
  };
}

/**
 * A copy of `img` multiplied per channel by `tint` (0–2), for 2D-canvas views
 * (the flat patch). Canvas `multiply` stops at 1×, so the colour is applied at
 * tint/k and an additive pass of (k − 1) restores the gain k = max(tint).
 */
export function tintedCopy(img: Img, tint: [number, number, number]): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !img.width) return null;
  const k = Math.max(1, ...tint);
  const base = document.createElement('canvas');
  base.width = img.width;
  base.height = img.height;
  const b = base.getContext('2d');
  if (!b) return null;
  b.drawImage(img, 0, 0);
  b.globalCompositeOperation = 'multiply';
  b.fillStyle = `rgb(${tint.map((c) => Math.round((255 * c) / k)).join(',')})`;
  b.fillRect(0, 0, base.width, base.height);
  if (k <= 1) return base;
  const out = document.createElement('canvas');
  out.width = img.width;
  out.height = img.height;
  const o = out.getContext('2d');
  if (!o) return base;
  o.drawImage(base, 0, 0);
  o.globalCompositeOperation = 'lighter';
  o.globalAlpha = Math.min(1, k - 1);
  o.drawImage(base, 0, 0);
  return out;
}
