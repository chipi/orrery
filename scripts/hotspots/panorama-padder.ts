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

/** Flat-colour fill of width × height pixels, raw RGB bytes. */
function buildFlatFill(width: number, height: number, rgb: [number, number, number]): Buffer {
  const buf = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    buf[i * 3 + 0] = rgb[0];
    buf[i * 3 + 1] = rgb[1];
    buf[i * 3 + 2] = rgb[2];
  }
  return buf;
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

  // Build the output canvas in raw RGB.
  const canvas = Buffer.alloc(outWidth * outHeight * 3);

  // 1. Fill sky region (rows 0 .. topRow - 1) with gradient.
  if (topRow > 0) {
    const sky = buildSkyGradient(outWidth, topRow, palette.skyZenith, palette.skyHorizon);
    sky.copy(canvas, 0, 0, sky.length);
  }

  // 2. Fill ground region (rows bottomRow .. outHeight - 1) with regolith.
  if (bottomRow < outHeight) {
    const ground = buildFlatFill(outWidth, outHeight - bottomRow, palette.regolith);
    ground.copy(canvas, bottomRow * outWidth * 3, 0, ground.length);
  }

  // 3. Fill azimuth gap on partial-360 sources.
  if (srcOutWidth < outWidth) {
    const gap = buildFlatFill(outWidth - srcOutWidth, srcOutHeight, palette.azimuthGap);
    for (let row = 0; row < srcOutHeight; row++) {
      const outRow = topRow + row;
      const gapSrcStart = row * (outWidth - srcOutWidth) * 3;
      const gapOutStart = outRow * outWidth * 3 + srcOutWidth * 3;
      gap.copy(canvas, gapOutStart, gapSrcStart, gapSrcStart + (outWidth - srcOutWidth) * 3);
    }
  }

  // 4. Copy the source image into its row band.
  const srcBuf = resizedSource.data;
  for (let row = 0; row < srcOutHeight; row++) {
    const outRow = topRow + row;
    const srcRowStart = row * srcOutWidth * 3;
    const outRowStart = outRow * outWidth * 3;
    srcBuf.copy(canvas, outRowStart, srcRowStart, srcRowStart + srcOutWidth * 3);
  }

  // 5. JPEG-encode.
  const out = await sharp(canvas, { raw: { width: outWidth, height: outHeight, channels: 3 } })
    .jpeg({ quality: jpegQuality, mozjpeg: true })
    .toBuffer();
  return out;
}
