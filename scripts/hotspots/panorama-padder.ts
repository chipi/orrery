/**
 * Pad a cylindrical or partial-360 panorama into a full-sphere
 * equirectangular image (360° × 180°, 2:1 aspect) suitable for the
 * inside-out skybox renderer.
 *
 * NASA panoramas are typically published as cylindrical projections —
 * 360° horizontal but only 50°-90° vertical (the camera tilt range).
 * Viking lander panoramas are partial-360 (~342° azimuth, ~95°
 * vertical). The skybox expects an equirectangular sphere; padding
 * the missing sky / ground / azimuth gap bridges the formats.
 *
 * Mars sky has NO blue. The sky-colour gradient defaults to a warm
 * tan dimming to deep salmon (rgb(200, 165, 130) at horizon →
 * rgb(120, 80, 55) at zenith). Per-site override available for
 * landers with unusual colour balance (Viking 1's pink-ish sky,
 * Curiosity's higher-altitude blue tint, etc.).
 *
 * Output: 4096×2048 JPEG q=88.
 *
 * @see RFC-017 §OQ-7 (panorama composition)
 * @see docs/guides/mars-hotspot-imagery.md §Tier 3
 */
import sharp from 'sharp';

/** Mars sky / regolith colour palette. Overridable per-site for
 *  landers whose published imagery has a distinct colour calibration. */
export interface MarsColourPalette {
  /** Sky colour at the horizon line — warm tan default. */
  skyHorizon: [number, number, number];
  /** Sky colour at the zenith — deep salmon default. */
  skyZenith: [number, number, number];
  /** Ground / regolith colour for the bottom pad. */
  regolith: [number, number, number];
  /** Colour for the azimuth gap on partial-360 panoramas. */
  azimuthGap: [number, number, number];
}

export const DEFAULT_MARS_PALETTE: MarsColourPalette = {
  skyHorizon: [200, 165, 130],
  skyZenith: [120, 80, 55],
  regolith: [120, 70, 50],
  azimuthGap: [100, 75, 60],
};

/**
 * Lunar palette — Moon has NO atmosphere so sky is BLACK at every
 * elevation. Surface regolith is mid-grey. Same MarsColourPalette
 * shape; just different RGB values. Default for Moon panoramas
 * (caller can per-site override).
 */
export const DEFAULT_MOON_PALETTE: MarsColourPalette = {
  skyHorizon: [0, 0, 0],
  skyZenith: [0, 0, 0],
  regolith: [120, 120, 120],
  azimuthGap: [70, 70, 70],
};

export interface PadInput {
  /** Source image bytes. */
  source: Buffer;
  /** Azimuth coverage of the source in degrees (360 for full wrap,
   *  342 for Viking, etc.). */
  srcAzimuthDeg: number;
  /** Elevation coverage above the horizon in degrees. The horizon
   *  itself is the 0° line at the equator of the equirectangular
   *  output (row = height/2). */
  srcElevationTopDeg: number;
  /** Elevation coverage below the horizon in degrees (positive
   *  number = how far down the camera sees). */
  srcElevationBottomDeg: number;
  /** Output dimensions. */
  outWidth?: number;
  outHeight?: number;
  /** Colour overrides. */
  palette?: Partial<MarsColourPalette>;
  /** JPEG quality. */
  jpegQuality?: number;
  /** Replace near-black pixels in the source with palette colour
   *  (sky above horizon row, regolith below). NASA cylindrical
   *  panoramas pad missing data (rover-deck cutouts, edge bars where
   *  the camera didn't sweep) with black; pasting those into our
   *  output preserves the holes verbatim. Recolouring them blends
   *  the cutouts into the surrounding palette so the user sees a
   *  continuous landscape instead of black wedges at mid-image.
   *  Threshold defaults to 30 (sum of R+G+B) — picks up #000-#0a0a0a
   *  but spares deep-shadow imagery (Curiosity sol-3070 shadows are
   *  ~#3a2a20). */
  recolourBlackThreshold?: number;
  /** Fill the source's gaps below the horizon (transparent pixels,
   *  near-black ones under `recolourBlackThreshold`, the azimuth gap) and
   *  a margin under the band from the surrounding pixels — real ground and
   *  the regolith palette alike — instead of one flat palette colour.
   *  Gaps open to the sky (connected through gaps to the band's top edge)
   *  keep the sky palette — filled from the terrain they turned the sky
   *  brown; match `palette.sky*` to the photo's real sky so stepped frame
   *  edges up there blend in. Holes inside the image are filled at any
   *  height. A mosaic's jagged
   *  outline otherwise left flat stair-step blocks (#641: Curiosity). */
  inpaintGaps?: boolean;
}

/**
 * Pull-push fill: every `unknown` pixel of the RGB `canvas` takes a smooth
 * blend of the known pixels around it (near ones weigh most). Runs on a
 * 1/`factor` grid — the fill is soft by nature — and writes the upscaled
 * result into the unknown pixels only.
 */
export async function pullPushFill(
  canvas: Buffer,
  unknown: Uint8Array,
  width: number,
  height: number,
  factor = 4,
): Promise<void> {
  const lw = Math.ceil(width / factor);
  const lh = Math.ceil(height / factor);
  // Level 0: block averages of the known pixels (premultiplied by coverage).
  const P0 = new Float32Array(lw * lh * 3);
  const A0 = new Float32Array(lw * lh);
  const N0 = new Float32Array(lw * lh);
  for (let y = 0; y < height; y++) {
    const ly = Math.floor(y / factor);
    for (let x = 0; x < width; x++) {
      const li = ly * lw + Math.floor(x / factor);
      N0[li]++;
      const i = y * width + x;
      if (unknown[i]) continue;
      A0[li]++;
      P0[li * 3] += canvas[i * 3];
      P0[li * 3 + 1] += canvas[i * 3 + 1];
      P0[li * 3 + 2] += canvas[i * 3 + 2];
    }
  }
  for (let li = 0; li < lw * lh; li++) {
    const n = N0[li] || 1;
    A0[li] /= n;
    P0[li * 3] /= n;
    P0[li * 3 + 1] /= n;
    P0[li * 3 + 2] /= n;
  }
  // Pull: halve until 1×1.
  const levels: Array<{ w: number; h: number; P: Float32Array; A: Float32Array }> = [
    { w: lw, h: lh, P: P0, A: A0 },
  ];
  while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
    const { w, h, P, A } = levels[levels.length - 1];
    const w2 = Math.ceil(w / 2);
    const h2 = Math.ceil(h / 2);
    const P2 = new Float32Array(w2 * h2 * 3);
    const A2 = new Float32Array(w2 * h2);
    const N2 = new Float32Array(w2 * h2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const j = (y >> 1) * w2 + (x >> 1);
        N2[j]++;
        A2[j] += A[i];
        P2[j * 3] += P[i * 3];
        P2[j * 3 + 1] += P[i * 3 + 1];
        P2[j * 3 + 2] += P[i * 3 + 2];
      }
    }
    for (let j = 0; j < w2 * h2; j++) {
      const n = N2[j] || 1;
      A2[j] /= n;
      P2[j * 3] /= n;
      P2[j * 3 + 1] /= n;
      P2[j * 3 + 2] /= n;
    }
    levels.push({ w: w2, h: h2, P: P2, A: A2 });
  }
  // Push: from the coarsest level down, C = P + (1 − A) · upsampled coarser C.
  const top = levels[levels.length - 1];
  let C = new Float32Array(3);
  for (let c = 0; c < 3; c++) C[c] = top.A[0] > 0 ? top.P[c] / top.A[0] : 0;
  let cw = 1;
  let ch = 1;
  for (let k = levels.length - 2; k >= 0; k--) {
    const { w, h, P, A } = levels[k];
    const next = new Float32Array(w * h * 3);
    for (let y = 0; y < h; y++) {
      const sy = Math.min(ch - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const y0 = Math.floor(sy);
      const y1 = Math.min(ch - 1, y0 + 1);
      const fy = sy - y0;
      for (let x = 0; x < w; x++) {
        const sx = Math.min(cw - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const x0 = Math.floor(sx);
        const x1 = Math.min(cw - 1, x0 + 1);
        const fx = sx - x0;
        const i = y * w + x;
        const a = Math.min(1, A[i]);
        for (let c = 0; c < 3; c++) {
          const up =
            (C[(y0 * cw + x0) * 3 + c] * (1 - fx) + C[(y0 * cw + x1) * 3 + c] * fx) * (1 - fy) +
            (C[(y1 * cw + x0) * 3 + c] * (1 - fx) + C[(y1 * cw + x1) * 3 + c] * fx) * fy;
          next[i * 3 + c] = P[i * 3 + c] + (1 - a) * up;
        }
      }
    }
    C = next;
    cw = w;
    ch = h;
  }
  const low = Buffer.alloc(lw * lh * 3);
  for (let i = 0; i < low.length; i++) low[i] = Math.max(0, Math.min(255, Math.round(C[i])));
  const fill = await sharp(low, { raw: { width: lw, height: lh, channels: 3 } })
    .resize(width, height, { fit: 'fill', kernel: 'cubic' })
    .raw()
    .toBuffer();
  for (let i = 0; i < width * height; i++) {
    if (!unknown[i]) continue;
    canvas[i * 3] = fill[i * 3];
    canvas[i * 3 + 1] = fill[i * 3 + 1];
    canvas[i * 3 + 2] = fill[i * 3 + 2];
  }
}

/**
 * Generate a vertical gradient strip of `height` rows × `width` cols
 * for the sky pad (top of the equirectangular output). Top row =
 * zenith colour, bottom row = horizon colour. Returns raw RGB bytes.
 */
function buildSkyGradient(
  width: number,
  height: number,
  zenith: [number, number, number],
  horizon: [number, number, number],
): Buffer {
  const buf = Buffer.alloc(width * height * 3);
  for (let row = 0; row < height; row++) {
    const t = row / Math.max(1, height - 1); // 0 (top) → 1 (bottom)
    const r = Math.round(zenith[0] + (horizon[0] - zenith[0]) * t);
    const g = Math.round(zenith[1] + (horizon[1] - zenith[1]) * t);
    const b = Math.round(zenith[2] + (horizon[2] - zenith[2]) * t);
    const rowStart = row * width * 3;
    for (let col = 0; col < width; col++) {
      buf[rowStart + col * 3 + 0] = r;
      buf[rowStart + col * 3 + 1] = g;
      buf[rowStart + col * 3 + 2] = b;
    }
  }
  return buf;
}

/**
 * Ground (nadir) colour for a given output row. The real source data
 * ends at `bottomRow`; everything below it is the unavoidable nadir gap
 * (the camera never imaged straight down). Rather than a flat grey slab
 * we fade the regolith into shadow: full `regolith` at `bottomRow`,
 * darkening toward the nadir (bottom edge). Reads as ground falling into
 * shadow below the imaged strip instead of a dead grey void
 * (2026-06-28 user direction). Rows in the real-data band (above
 * bottomRow) clamp to full regolith so partial-360 azimuth-gap fills +
 * black-recolour there still match the surrounding ground.
 */
const NADIR_DARKEN = 0.84; // brightness drops to ~16% at the nadir
function groundColourAtRow(
  outRow: number,
  bottomRow: number,
  outHeight: number,
  regolith: [number, number, number],
): [number, number, number] {
  const span = Math.max(1, outHeight - 1 - bottomRow);
  const t = Math.min(1, Math.max(0, (outRow - bottomRow) / span)); // 0 at bottomRow → 1 at nadir
  const k = 1 - NADIR_DARKEN * Math.pow(t, 0.85);
  return [Math.round(regolith[0] * k), Math.round(regolith[1] * k), Math.round(regolith[2] * k)];
}

/**
 * Per-row palette lookup. Above horizon (outRow < halfH): interpolate
 * sky zenith → sky horizon over the topRow rows. Below horizon
 * (outRow >= halfH): regolith. Used by both the azimuth-gap fill and
 * the recolour-black pass so every "synthetic" pixel in the output
 * follows the same colour ramp — no visible seams between sources
 * of fill.
 */
function paletteAtRow(
  outRow: number,
  halfH: number,
  topRow: number,
  bottomRow: number,
  outHeight: number,
  palette: MarsColourPalette,
): [number, number, number] {
  if (outRow < halfH) {
    const t = topRow > 0 ? Math.min(1, outRow / topRow) : 1;
    const r = Math.round(palette.skyZenith[0] + (palette.skyHorizon[0] - palette.skyZenith[0]) * t);
    const g = Math.round(palette.skyZenith[1] + (palette.skyHorizon[1] - palette.skyZenith[1]) * t);
    const b = Math.round(palette.skyZenith[2] + (palette.skyHorizon[2] - palette.skyZenith[2]) * t);
    return [r, g, b];
  }
  return groundColourAtRow(outRow, bottomRow, outHeight, palette.regolith);
}

/**
 * Pad a cylindrical / partial-360 input into 4096×2048
 * equirectangular. The source is placed at the correct row range
 * based on its elevation coverage; sky / ground / azimuth-gap fills
 * occupy the remainder.
 */
export async function padToEquirectangular(input: PadInput): Promise<Buffer> {
  const outWidth = input.outWidth ?? 4096;
  const outHeight = input.outHeight ?? 2048;
  const jpegQuality = input.jpegQuality ?? 88;
  const palette: MarsColourPalette = { ...DEFAULT_MARS_PALETTE, ...(input.palette ?? {}) };

  // Resize source to match the azimuth coverage at the output width.
  // For 360° source: source fills outWidth horizontally.
  // For 342° source (Viking): source fills (342/360) × outWidth, gap on right.
  const srcAzimuthFrac = Math.min(1, input.srcAzimuthDeg / 360);
  const srcOutWidth = Math.round(outWidth * srcAzimuthFrac);

  // Source row span in the output: from row "top" to row "top + N".
  // The horizon line is at row outHeight / 2. Elevation top is above
  // that, bottom is below.
  const halfH = outHeight / 2;
  const topRow = Math.max(0, Math.round(halfH - (input.srcElevationTopDeg / 90) * halfH));
  const bottomRow = Math.min(
    outHeight,
    Math.round(halfH + (input.srcElevationBottomDeg / 90) * halfH),
  );
  const srcOutHeight = bottomRow - topRow;
  if (srcOutHeight <= 0) throw new Error('Source elevation coverage collapses to zero rows');

  // Resize the source to (srcOutWidth × srcOutHeight). sharp's
  // default 'cover' fit would crop; we want 'fill' (stretch) since
  // the source's projection is already cylindrical — squishing or
  // stretching by a small fraction is acceptable and expected.
  // limitInputPixels disabled: NASA panoramas can be very large (the
  // Perseverance Mastcam-Z first 360 is 36952×11570 = 428 MP,
  // exceeding sharp's 268 MP default).
  const resizedSource = await sharp(input.source, { limitInputPixels: false })
    .resize(srcOutWidth, srcOutHeight, { fit: 'fill' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Transparent source pixels (a mosaic's outline), for inpaintGaps.
  const srcAlpha = input.inpaintGaps
    ? await sharp(input.source, { limitInputPixels: false })
        .resize(srcOutWidth, srcOutHeight, { fit: 'fill' })
        .ensureAlpha()
        .extractChannel(3)
        .raw()
        .toBuffer()
    : null;
  const unknown = input.inpaintGaps ? new Uint8Array(outWidth * outHeight) : null;

  // Build the output canvas in raw RGB.
  const canvas = Buffer.alloc(outWidth * outHeight * 3);

  // 1. Fill sky region (rows 0 .. topRow - 1) with gradient.
  if (topRow > 0) {
    const sky = buildSkyGradient(outWidth, topRow, palette.skyZenith, palette.skyHorizon);
    sky.copy(canvas, 0, 0, sky.length);
  }

  // 2. Fill ground region (rows bottomRow .. outHeight - 1) — regolith at
  //    the source's lower edge fading into shadow toward the nadir, so the
  //    unavoidable straight-down gap reads as shadowed ground, not a flat
  //    grey slab.
  for (let outRow = bottomRow; outRow < outHeight; outRow++) {
    const [gr, gg, gb] = groundColourAtRow(outRow, bottomRow, outHeight, palette.regolith);
    const rowStart = outRow * outWidth * 3;
    for (let col = 0; col < outWidth; col++) {
      const i = rowStart + col * 3;
      canvas[i] = gr;
      canvas[i + 1] = gg;
      canvas[i + 2] = gb;
    }
  }

  // 3. Fill azimuth gap on partial-360 sources. Use the SAME per-row
  //    sky-gradient-above-horizon / regolith-below-horizon palette as
  //    the recolour-black pass below. Earlier behaviour used a flat
  //    `azimuthGap` colour that left a conspicuous rectangle straddling
  //    the horizon row on InSight (290°), Viking 1 (342.5°), Zhurong
  //    (120°). Now the gap fades into the surrounding sky + regolith
  //    pads with no visible seam at the source/gap boundary.
  if (srcOutWidth < outWidth) {
    const gapWidth = outWidth - srcOutWidth;
    for (let row = 0; row < srcOutHeight; row++) {
      const outRow = topRow + row;
      const [fillR, fillG, fillB] = paletteAtRow(
        outRow,
        halfH,
        topRow,
        bottomRow,
        outHeight,
        palette,
      );
      const gapOutStart = outRow * outWidth * 3 + srcOutWidth * 3;
      for (let col = 0; col < gapWidth; col++) {
        const oIdx = gapOutStart + col * 3;
        canvas[oIdx] = fillR;
        canvas[oIdx + 1] = fillG;
        canvas[oIdx + 2] = fillB;
      }
    }
  }

  // 4. Copy the source image into its row band, optionally recolouring
  //    near-black pixels to blend rover-deck cutouts / edge-bars into
  //    the surrounding sky / regolith using the same paletteAtRow()
  //    that fills the azimuth-gap.
  const srcBuf = resizedSource.data;
  const recolourThreshold = input.recolourBlackThreshold ?? 0;
  for (let row = 0; row < srcOutHeight; row++) {
    const outRow = topRow + row;
    if (recolourThreshold > 0) {
      const [fillR, fillG, fillB] = paletteAtRow(
        outRow,
        halfH,
        topRow,
        bottomRow,
        outHeight,
        palette,
      );
      const srcRowStart = row * srcOutWidth * 3;
      const outRowStart = outRow * outWidth * 3;
      for (let col = 0; col < srcOutWidth; col++) {
        const sIdx = srcRowStart + col * 3;
        const r = srcBuf[sIdx];
        const g = srcBuf[sIdx + 1];
        const b = srcBuf[sIdx + 2];
        const oIdx = outRowStart + col * 3;
        const transparent = srcAlpha != null && srcAlpha[row * srcOutWidth + col] < 128;
        if (transparent || r + g + b < recolourThreshold) {
          if (unknown) unknown[outRow * outWidth + col] = 1;
          canvas[oIdx] = fillR;
          canvas[oIdx + 1] = fillG;
          canvas[oIdx + 2] = fillB;
        } else {
          canvas[oIdx] = r;
          canvas[oIdx + 1] = g;
          canvas[oIdx + 2] = b;
        }
      }
    } else {
      const srcRowStart = row * srcOutWidth * 3;
      const outRowStart = outRow * outWidth * 3;
      srcBuf.copy(canvas, outRowStart, srcRowStart, srcRowStart + srcOutWidth * 3);
    }
  }

  // 4b. inpaintGaps: the gaps, the azimuth gap and a margin of padding on
  //     each side of the band's top and bottom edges are filled from
  //     everything around them.
  if (unknown) {
    if (recolourThreshold <= 0 && srcAlpha) {
      for (let row = 0; row < srcOutHeight; row++) {
        for (let col = 0; col < srcOutWidth; col++) {
          if (srcAlpha[row * srcOutWidth + col] < 128) unknown[(topRow + row) * outWidth + col] = 1;
        }
      }
    }
    for (let row = Math.max(topRow, Math.ceil(halfH)); row < bottomRow; row++) {
      for (let col = srcOutWidth; col < outWidth; col++) unknown[row * outWidth + col] = 1;
    }
    // Gaps reachable from the band's top edge through other gaps are open
    // sky, above the horizon only: they keep the sky palette (4-connected
    // flood fill, wrapping in azimuth on a full circle). Below the horizon a
    // gap is ground and is always filled.
    const wrap = srcOutWidth === outWidth;
    const queue = new Int32Array(outWidth * Math.max(1, bottomRow - topRow));
    let qh = 0;
    let qt = 0;
    const open = (row: number, col: number) => {
      const i = row * outWidth + col;
      if (unknown[i] !== 1) return;
      unknown[i] = 2;
      queue[qt++] = i;
    };
    if (topRow < halfH) for (let col = 0; col < outWidth; col++) open(topRow, col);
    while (qh < qt) {
      const i = queue[qh++];
      const row = Math.floor(i / outWidth);
      const col = i - row * outWidth;
      if (row > topRow) open(row - 1, col);
      if (row + 1 < Math.min(bottomRow, Math.ceil(halfH))) open(row + 1, col);
      if (col > 0) open(row, col - 1);
      else if (wrap) open(row, outWidth - 1);
      if (col + 1 < outWidth) open(row, col + 1);
      else if (wrap) open(row, 0);
    }
    for (let i = 0; i < unknown.length; i++) if (unknown[i] === 2) unknown[i] = 0;
    // Under the band the fill fades into the shadowed-ground pad.
    const margin = Math.round(outHeight * 0.06);
    for (let row = bottomRow; row < Math.min(outHeight, bottomRow + margin); row++) {
      unknown.fill(1, row * outWidth, (row + 1) * outWidth);
    }
    await pullPushFill(canvas, unknown, outWidth, outHeight);
  }

  // 5. JPEG-encode.
  const out = await sharp(canvas, { raw: { width: outWidth, height: outHeight, channels: 3 } })
    .jpeg({ quality: jpegQuality, mozjpeg: true })
    .toBuffer();
  return out;
}

/**
 * Turn the white no-data margin around a hand-assembled mosaic into black, so
 * `recolourBlackThreshold` fills it with the palette like any other gap
 * (#641: the ALSJ / Commons Apollo pans leave white where no frame reached).
 * Only near-white connected to the image edge is touched — a flood fill from
 * the border — so bright regolith and sun flare inside the mosaic stay.
 */
export async function whiteBorderToBlack(source: Buffer, minChannel = 245): Promise<Buffer> {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const white = (p: number) =>
    data[p * 3] >= minChannel && data[p * 3 + 1] >= minChannel && data[p * 3 + 2] >= minChannel;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (p: number) => {
    if (!seen[p] && white(p)) {
      seen[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop()!;
    data[p * 3] = data[p * 3 + 1] = data[p * 3 + 2] = 0;
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < (h - 1) * w) push(p + w);
  }
  return sharp(data, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Black out rectangles of a source image — agency logos, watermarks and
 * caption strips baked into a release (#641: CNSA / CLEP logos on the
 * Chang'e 5 and 6 panoramas). Rects are [x0, y0, x1, y1] as fractions of
 * the width and height. Black then reads as a gap: the sky on the Moon,
 * `recolourBlackThreshold` fills the rest.
 */
export async function blackOutRects(
  source: Buffer,
  rects: ReadonlyArray<readonly [number, number, number, number]>,
): Promise<Buffer> {
  const meta = await sharp(source, { limitInputPixels: false }).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const svg = `<svg width="${w}" height="${h}">${rects
    .map(
      ([x0, y0, x1, y1]) =>
        `<rect x="${Math.floor(x0 * w)}" y="${Math.floor(y0 * h)}" width="${Math.ceil((x1 - x0) * w)}" height="${Math.ceil((y1 - y0) * h)}" fill="#000"/>`,
    )
    .join('')}</svg>`;
  return sharp(source, { limitInputPixels: false })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
}
