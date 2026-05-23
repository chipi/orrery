#!/usr/bin/env tsx
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { buildLrocProvenanceEntry, upsertProvenanceEntries } from './provenance.ts';

/**
 * Phase 2.5 — hand-curated LROC Featured Image fetch for the 11
 * non-Apollo Moon sites whose BDR NAC_ROI products don't cover the
 * actual landing coordinates.
 *
 * Source: LROC team's published Featured Images at lroc.im-ldi.com.
 * Each post embeds a high-resolution PNG centered on the landing
 * site, already curated by the LROC team (best lighting + framing).
 * We download, sharp-resize to 2048² square, save as JPEG, and
 * upsert provenance — bypassing the GDAL crop path entirely (these
 * images are pre-cropped to the landing site, no projection needed).
 *
 * Skip: luna9 — LROC team has not located it yet (early Soviet
 * landings lack precise coordinates; first soft landing 1966).
 *
 * Run: `npx tsx scripts/hotspots/fetch-moon-featured-images.ts`
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
    url: 'https://lroc.im-ldi.com/news/uploads/chang_e3_FI_opening.png',
    centerLat: 44.1214,
    centerLon: 340.4884,
    notes:
      "Chang'e 3 lander + Yutu rover in Mare Imbrium. LROC NAC M1142582775R, 25 Dec 2013, 150 cm/px. Published Featured Image opening view.",
  },
  {
    siteId: 'luna16',
    url: 'https://lroc.im-ldi.com/news/uploads/luna16_figure_900.png',
    centerLat: 0.5137,
    centerLon: 56.3638,
    notes:
      'Luna 16 descent stage in Mare Fecunditatis. First robotic sample-return (1970, USSR). LROC NAC M106511834L. Published Featured Image.',
  },
  {
    siteId: 'luna17',
    url: 'https://lroc.im-ldi.com/news/uploads/LROCiotw/lunokhod_1_big.png',
    centerLat: 38.315,
    centerLon: 324.992,
    notes:
      'Luna 17 lander + Lunokhod 1 rover and traverse tracks across northern Mare Imbrium. LROC NAC M175502049RE, low-altitude (33 km) pass.',
  },
  {
    siteId: 'luna21',
    url: 'https://lroc.im-ldi.com/news/uploads/M175070494LR_thumb.png',
    centerLat: 25.83,
    centerLon: 30.914,
    notes:
      'Lunokhod 2 rover parked at 25.830°N 30.914°E inside Le Monnier crater. Lander at 26.005°N 30.406°E. Record 39 km traverse across Mare Serenitatis floor.',
  },
  {
    siteId: 'luna24',
    url: 'https://lroc.im-ldi.com/news/uploads/LROCiotw/luna24_rev_fig.png',
    centerLat: 12.7141,
    centerLon: 62.213,
    notes:
      'Luna 24 lander on the northwestern rim of a 64 m diameter impact crater in Mare Crisium. Last Soviet lunar mission (1976, robotic sample return). LROC low-altitude NAC.',
  },
  {
    siteId: 'change4',
    url: 'https://lroc.im-ldi.com/ckeditor_assets/pictures/749/content_M1303619844LR_Close_crop_anot50m.png',
    centerLat: -45.4446,
    centerLon: 177.6048,
    notes:
      "Chang'e 4 lander + Yutu-2 rover in Von Kármán crater, South Pole-Aitken basin (lunar far side). First far-side landing (2019, CNSA). LROC NAC M1303619844LR, Feb 2019. Only LROC view of any far-side landing — no NASA equivalent.",
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

async function downloadAndCrop(spec: FeaturedSpec): Promise<{ outputPath: string; bytes: number }> {
  const outputPath = path.join(
    'static',
    'images',
    'hotspots',
    'moon',
    spec.siteId,
    'tier2-lroc.jpg',
  );
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

  const stat = await fs.stat(outputPath);
  return { outputPath, bytes: stat.size };
}

async function main(): Promise<void> {
  console.log(`Fetching ${FEATURED_IMAGES.length} LROC Featured Images (Phase 2.5 hand-curated)`);
  const results: Array<{ spec: FeaturedSpec; outputPath: string; bytes: number }> = [];
  for (let i = 0; i < FEATURED_IMAGES.length; i++) {
    const spec = FEATURED_IMAGES[i];
    try {
      const out = await downloadAndCrop(spec);
      console.log(`  ✓ ${spec.siteId} → ${out.outputPath} (${(out.bytes / 1024).toFixed(0)} KB)`);
      results.push({ spec, ...out });
    } catch (err) {
      console.error(`  ✗ ${spec.siteId} FAILED — ${(err as Error).message}`);
    }
    // Polite pause between successive downloads (1s; these are small).
    if (i < FEATURED_IMAGES.length - 1) await new Promise((r) => setTimeout(r, 1000));
  }

  if (results.length === 0) {
    console.log('No successful downloads — nothing to upsert.');
    return;
  }

  console.log(`\nUpserting ${results.length} provenance entries...`);
  const entries = results.map((r) =>
    buildLrocProvenanceEntry({
      outputPath: r.outputPath,
      sourceUrl: r.spec.url,
      productId: `LROC_FEATURED_${r.spec.siteId.toUpperCase()}`,
      siteId: r.spec.siteId,
      centerLat: r.spec.centerLat,
      centerLon: r.spec.centerLon,
    }),
  );
  await upsertProvenanceEntries(entries);
  console.log(`  Provenance: ${entries.length} entries upserted.`);
  console.log(`\nDone. ${results.length}/${FEATURED_IMAGES.length} sites covered.`);
}

main().catch((err) => {
  console.error('Fatal:', (err as Error).message);
  process.exit(1);
});
