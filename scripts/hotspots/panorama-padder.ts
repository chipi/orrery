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
        if (r + g + b < recolourThreshold) {
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

  // 5. JPEG-encode.
  const out = await sharp(canvas, { raw: { width: outWidth, height: outHeight, channels: 3 } })
    .jpeg({ quality: jpegQuality, mozjpeg: true })
    .toBuffer();
  return out;
}
