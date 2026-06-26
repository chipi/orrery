#!/usr/bin/env tsx
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  buildLrocProvenanceEntry,
  buildKaguyaTcProvenanceEntry,
  upsertProvenanceEntries,
  type ProvenanceEntry,
} from './provenance.ts';

/**
 * Moon Tier-2 DETAIL layer for the 11 non-Apollo landers (#361).
 *
 * WHY this is the source: LROC NAC has imaged every landing site at ~0.5 m/px,
 * but for these sites that data exists ONLY as raw camera-geometry frames
 * (ODE EDRNAC4) — there is no pre-map-projected NAC product (verified: SDPPHO
 * returns 0 here vs 99 at Apollo). Map-projecting raw NAC needs ISIS, which
 * isn't installed. So the realistic sharp source is the LROC team's published
 * **Featured Images** — pre-cropped, well-lit, georeferenced-by-eye PNGs at
 * lroc.im-ldi.com. We download, sharp-resize to 2048² square, JPEG, upsert.
 *
 * CLEAN vs ANNOTATED (2026-06-25): Marko wants NON-annotated crops. LROC's
 * Featured-Image *blog* PNGs bake in scale bars / boxes / arrows / labels.
 * The /data/support/featured_sites/<Mission>/<n>/<NACframe>.jpg tree behind
 * lroc.im-ldi.com/featured_sites serves the SAME NAC frames with NO annotation
 * (the clean "before/after" base frames). For the 6 sites that have an entry
 * there (change3/4, luna16/17/21/24) we now point at the clean frame. change5
 * + beresheet aren't in that tree, so they keep their sharp annotated blog PNG.
 *
 * ROBUSTNESS (the part that bit us — luna17 once pointed at a rover *photo*):
 *  - **Orbital-surface guard** — reject any crop that's >40% near-black
 *    (a hardware/studio photo has a black background; orbital terrain doesn't).
 *  - **Kaguya failover** — a guard rejection, a download failure, or a site
 *    with no Featured Image at all (luna9) falls back to that site's already-
 *    fetched Kaguya TC regional crop. Lower-res but real, georegistered, and
 *    can never be the wrong subject.
 *
 * Run: `npx tsx scripts/hotspots/fetch-moon-featured-images.ts`
 *
 * ⚠️ MANDATORY POST-STEP — REGENERATE VARIANTS. This script writes ONLY the
 * 2048² base `tier2-lroc.jpg`. The /moon deep-zoom DETAIL patch consumes
 * `image-vision.json`'s `variants['1x1']` (pickVariant 'thumbnail'), so a
 * re-fetched base whose `.1x1.jpg` wasn't regenerated leaves the manifest
 * pointing at a stale/missing variant → the loader 404s → an EMPTY tile at
 * deepest zoom (the 2026-06-26 bug on change3/4, luna16/17/21/24). After ANY
 * url change here, run:
 *   node scripts/hotspots/regenerate-tier3-variants.mjs \
 *     static/images/hotspots/moon/<site>/tier2-lroc.jpg [...]
 * `validate-data` now gates this — a missing consumed variant fails preflight.
 * See AGENTS.md §"Image pipeline — gotchas".
 */

interface FeaturedSpec {
  siteId: string;
  url: string;
  centerLat: number;
  centerLon: number;
  notes: string;
}

const FEATURED_IMAGES: FeaturedSpec[] = [
  {
    siteId: 'change3',
    url: 'https://lroc.im-ldi.com/data/support/featured_sites/Change/3/M1142596997R.jpg',
    centerLat: 44.1214,
    centerLon: 340.4884,
    notes:
      "Chang'e 3 lander + Yutu rover in Mare Imbrium. Clean (un-annotated) LROC NAC frame M1142596997R from the featured_sites tree.",
  },
  {
    siteId: 'luna16',
    url: 'https://lroc.im-ldi.com/data/support/featured_sites/Luna/16/M141899500L.jpg',
    centerLat: 0.5137,
    centerLon: 56.3638,
    notes:
      'Luna 16 descent stage in Mare Fecunditatis. First robotic sample-return (1970, USSR). Clean (un-annotated) LROC NAC frame M141899500L from the featured_sites tree.',
  },
  {
    siteId: 'luna17',
    // FIX (#361): was `lunokhod_1_big.png` — that's the *rover hardware* photo,
    // not the orbital view. Then the annotated M175502049R_L17_thumb.png (scale
    // bar + inset). Now the clean featured_sites NAC frame M173144480R — the
    // Luna 17 lander + Lunokhod 1 site from above, un-annotated.
    url: 'https://lroc.im-ldi.com/data/support/featured_sites/Luna/17/M173144480R.jpg',
    centerLat: 38.315,
    centerLon: 324.992,
    notes:
      'Luna 17 lander + Lunokhod 1 rover and traverse tracks across northern Mare Imbrium. LROC NAC M175502049RE, low-altitude (33 km) pass.',
  },
  {
    siteId: 'luna21',
    url: 'https://lroc.im-ldi.com/data/support/featured_sites/Luna/21/M122007650L.jpg',
    centerLat: 25.83,
    centerLon: 30.914,
    notes:
      'Lunokhod 2 rover parked at 25.830°N 30.914°E inside Le Monnier crater. Lander at 26.005°N 30.406°E. Record 39 km traverse across Mare Serenitatis floor. Clean (un-annotated) LROC NAC frame M122007650L from the featured_sites tree.',
  },
  {
    siteId: 'luna24',
    url: 'https://lroc.im-ldi.com/data/support/featured_sites/Luna/24/M137136039R.jpg',
    centerLat: 12.7141,
    centerLon: 62.213,
    notes:
      'Luna 24 lander on the northwestern rim of a 64 m diameter impact crater in Mare Crisium. Last Soviet lunar mission (1976, robotic sample return). Clean (un-annotated) LROC NAC frame M137136039R from the featured_sites tree.',
  },
  {
    siteId: 'change4',
    url: 'https://lroc.im-ldi.com/data/support/featured_sites/Change/4/M1370616052.jpg',
    centerLat: -45.4446,
    centerLon: 177.6048,
    notes:
      "Chang'e 4 lander + Yutu-2 rover in Von Kármán crater, South Pole-Aitken basin (lunar far side). First far-side landing (2019, CNSA). Clean (un-annotated) LROC NAC frame M1370616052 from the featured_sites tree. Only LROC view of any far-side landing — no NASA equivalent.",
  },
  {
    siteId: 'change5',
    url: 'https://lroc.im-ldi.com/ckeditor_assets/pictures/974/content_CE5_1100p_Image_version2.png',
    centerLat: 43.0576,
    centerLon: 308.0839,
    notes:
      "Chang'e 5 lander in Oceanus Procellarum, returning ~1.7 kg of youngest dated lunar samples (Dec 2020). LROC NAC M1361560086R, 1210 m wide, 13° off-nadir.",
  },
  {
    siteId: 'change6',
    url: 'https://lroc.im-ldi.com/ckeditor_assets/pictures/1457/content_CE6_FI_Header_425mmpp.png',
    centerLat: -41.6385,
    centerLon: 206.0148,
    notes:
      "Chang'e 6 lander on the rim of an eroded ~50 m crater in the Apollo basin (lunar far side South Pole-Aitken). First sample return from far side (2024, CNSA). LROC NAC M1472410644L, 7 Jun 2024.",
  },
  {
    siteId: 'chandrayaan3',
    url: 'https://lroc.im-ldi.com/ckeditor_assets/pictures/1348/content_M1447750764_LRmos.warp.1100px1100p.clean.png',
    centerLat: -69.3741,
    centerLon: 32.32,
    notes:
      "Chandrayaan-3 Vikram lander + Pragyan rover at 69.3741°S 32.32°E, near Manzinus crater (~600 km from south pole). ISRO's first lunar landing (Aug 2023). LROC NAC M1447750764, oblique view, 1738 m wide, bright regolith halo from rocket plume.",
  },
  {
    siteId: 'slim',
    url: 'https://lroc.im-ldi.com/ckeditor_assets/pictures/1418/content_ALIGN_aligned_M1460739214L.1100x1100.png',
    centerLat: -13.316,
    centerLon: 25.251,
    notes:
      'JAXA SLIM lander near Shioli crater. Famously landed on its side (Jan 2024). LROC NAC M1460739214L, 24 Jan 2024, 880 m wide, 80 cm/px. Engine-exhaust reflectance change visible around the lander.',
  },
  {
    siteId: 'beresheet',
    url: 'https://lroc.im-ldi.com/ckeditor_assets/pictures/768/content_BeresheetImpact_after_box.png',
    centerLat: 32.5956,
    centerLon: 19.3496,
    notes:
      'SpaceIL Beresheet crash site at 32.5956°N 19.3496°E in Mare Serenitatis. Dark elongated "smudge" from ~1 km/s low-angle impact (Apr 2019). First non-government / non-profit lunar lander attempt.',
  },
];

const detailPath = (siteId: string) =>
  path.join('static', 'images', 'hotspots', 'moon', siteId, 'tier2-lroc.jpg');
const regionalPath = (siteId: string) =>
  path.join('static', 'images', 'hotspots', 'moon', siteId, 'tier2-regional.jpg');

/**
 * Orbital-surface guard. A real LROC orbital NAC crop is mid-gray regolith
 * with fine texture and very few near-black pixels. A hardware/studio photo
 * (a rover or lander on a stand) has a large black "space" background → a high
 * near-black fraction. luna17's bad file measured 54.8 % dark; every correct
 * orbital image measured ≤ 21.8 % (apollo17, valley shadows) and most < 3 %.
 * Reject above 40 % so a wrong file can't silently ship — it falls over to
 * Kaguya instead. (#361)
 */
const DARK_THRESHOLD = 24; // pixel value considered "near-black"
const MAX_DARK_FRACTION = 0.4;
async function darkFraction(jpgPath: string): Promise<number> {
  const { data } = await sharp(jpgPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < data.length; i++) if (data[i] <= DARK_THRESHOLD) dark++;
  return dark / data.length;
}

class GuardError extends Error {}

async function downloadAndCrop(spec: FeaturedSpec): Promise<{ outputPath: string; bytes: number }> {
  const outputPath = detailPath(spec.siteId);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  console.log(`  downloading ${spec.url}`);
  const res = await fetch(spec.url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${spec.url}`);
  const buf = Buffer.from(await res.arrayBuffer());

  // Read source dimensions and pick the best square crop.
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) throw new Error(`No dimensions parsed from ${spec.url}`);
  // Centre-crop to square, then resize to 2048².
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - side) / 2);
  const top = Math.floor((meta.height - side) / 2);
  await sharp(buf)
    .extract({ left, top, width: side, height: side })
    .resize(2048, 2048, { fit: 'fill' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outputPath);

  // Guard: reject non-orbital imagery (the luna17 rover-photo failure mode).
  const dark = await darkFraction(outputPath);
  if (dark > MAX_DARK_FRACTION) {
    throw new GuardError(
      `${spec.siteId}: ${(dark * 100).toFixed(0)}% near-black — looks like a hardware/studio photo, not orbital surface`,
    );
  }

  const stat = await fs.stat(outputPath);
  return { outputPath, bytes: stat.size };
}

/**
 * Failover (#361, option C): when a site has no usable Featured Image (no
 * spec, or the guard rejected it), use its already-fetched Kaguya TC regional
 * crop as the detail layer. Lower resolution than LROC NAC but real,
 * georegistered, no curation — and it can't be the wrong subject.
 */
async function kaguyaFailover(
  siteId: string,
  lat: number,
  lon: number,
): Promise<ProvenanceEntry | null> {
  const reg = regionalPath(siteId);
  if (!existsSync(reg)) {
    console.log(`  ✗ ${siteId}: no Kaguya regional on disk — cannot fail over`);
    return null;
  }
  const out = detailPath(siteId);
  await fs.copyFile(reg, out);
  console.log(`  ⤵ ${siteId}: failed over to Kaguya TC detail`);
  return buildKaguyaTcProvenanceEntry({
    outputPath: out,
    // Bare archive root — must be a valid URI for the image-provenance
    // schema. The "Kaguya TC detail (failover from the regional crop)"
    // note lives in the entry's `title`, not glued onto the URL.
    sourceUrl: 'https://stac.astrogeology.usgs.gov/',
    productId: `KAGUYA_TC_DETAIL_${siteId.toUpperCase()}`,
    siteId,
    centerLat: lat,
    centerLon: lon,
    cropSize: 2560,
  });
}

/** Sites with no LROC Featured Image at all — go straight to Kaguya failover. */
const FAILOVER_ONLY: Array<{ siteId: string; centerLat: number; centerLon: number }> = [
  // Luna 9 (1966, first soft landing) — LROC has never precisely located it.
  { siteId: 'luna9', centerLat: 7.08, centerLon: -64.37 },
];

async function main(): Promise<void> {
  console.log(`Moon detail layer: ${FEATURED_IMAGES.length} Featured Images + Kaguya failover`);
  const entries: ProvenanceEntry[] = [];
  let lroc = 0;
  let failover = 0;

  for (let i = 0; i < FEATURED_IMAGES.length; i++) {
    const spec = FEATURED_IMAGES[i];
    try {
      const out = await downloadAndCrop(spec);
      console.log(`  ✓ ${spec.siteId} → LROC NAC (${(out.bytes / 1024).toFixed(0)} KB)`);
      entries.push(
        buildLrocProvenanceEntry({
          outputPath: out.outputPath,
          sourceUrl: spec.url,
          productId: `LROC_FEATURED_${spec.siteId.toUpperCase()}`,
          siteId: spec.siteId,
          centerLat: spec.centerLat,
          centerLon: spec.centerLon,
        }),
      );
      lroc++;
    } catch (err) {
      // Guard rejection OR download failure → fall over to Kaguya.
      const why = err instanceof GuardError ? `guard: ${err.message}` : (err as Error).message;
      console.warn(`  ! ${spec.siteId} — ${why}`);
      const prov = await kaguyaFailover(spec.siteId, spec.centerLat, spec.centerLon);
      if (prov) {
        entries.push(prov);
        failover++;
      }
    }
    if (i < FEATURED_IMAGES.length - 1) await new Promise((r) => setTimeout(r, 1000));
  }

  // Sites with no Featured Image at all → Kaguya failover.
  for (const f of FAILOVER_ONLY) {
    const prov = await kaguyaFailover(f.siteId, f.centerLat, f.centerLon);
    if (prov) {
      entries.push(prov);
      failover++;
    }
  }

  if (entries.length === 0) {
    console.log('Nothing to upsert.');
    return;
  }
  await upsertProvenanceEntries(entries);
  console.log(
    `\nDone. ${lroc} LROC NAC + ${failover} Kaguya-failover = ${entries.length} detail layers, provenance upserted.`,
  );
}

main().catch((err) => {
  console.error('Fatal:', (err as Error).message);
  process.exit(1);
});
