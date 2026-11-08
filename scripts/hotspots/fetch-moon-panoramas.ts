#!/usr/bin/env tsx
/**
 * Moon Tier 3 ground-view panorama orchestrator (PRD-014 / RFC-017
 * §S8, v0.7.x #PC). Mirror of fetch-mars-panoramas.ts.
 *
 * Per-site: download the canonical surface panorama, pad cylindrical /
 * partial-360 → 4096×2048 equirectangular via panorama-padder.ts,
 * write JPEG to static/images/hotspots/moon/<site>/tier3-pan.jpg,
 * upsert image-provenance.json entry with per-mission credit chain.
 *
 * Default palette is DEFAULT_MOON_PALETTE (black sky, mid-grey regolith)
 * — Moon has no atmosphere so the sky stays solid black at every
 * elevation. Per-site overrides available for Soviet-era monochrome
 * panoramas (warmer tone) or polar-region long-shadow imagery.
 *
 * Starter batch (this slice): Apollo 11 + Apollo 17 — the two sites
 * already pre-wired with hotspot_tier3_panorama in surface-hotspots.json.
 * Follow-up commits will add Chang'e 3/4/5, Chandrayaan-3, SLIM, Luna
 * 9, Lunokhod 1/2 as per-site panorama URLs land.
 *
 * Sites without a ground-level panorama get no Tier 3: Luna 16 / Luna 24
 * (no panoramic camera; an LRO orbital frame stood in) and Beresheet (crashed;
 * its last descent frame stood in) — removed 2026-11-05, #641. With
 * hotspot_tier3_panorama unset the "Stand here" button does not render, as on
 * mars3 / beagle2 / schiaparelli.
 *
 * Usage:
 *   npm run images:hotspots -- --dest moon --layer tier3
 *   npm run images:hotspots -- --site apollo11 --layer tier3
 */

import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';

import {
  blackOutRects,
  whiteBorderToBlack,
  padToEquirectangular,
  DEFAULT_MOON_PALETTE,
  type MarsColourPalette,
} from './panorama-padder.ts';
import { buildPanoramaProvenanceEntry, upsertProvenanceEntries } from './provenance.ts';

const PANORAMA_CACHE_DIR = '.image-cache/hotspots/panoramas';
const OUTPUT_BASE = 'static/images/hotspots/moon';

interface MoonPanoramaConfig {
  siteId: string;
  sourceUrl: string;
  sourceLabel: string;
  attribution: string;
  license:
    'PD-NASA' | 'CNSA-EDU' | 'CC-BY-4.0' | 'ISRO-EDU' | 'JAXA-OPEN' | 'PD-Russia' | 'SpaceIL-EDU';
  srcAzimuthDeg: number;
  srcElevationTopDeg: number;
  srcElevationBottomDeg: number;
  caption: string;
  palette?: Partial<MarsColourPalette>;
  recolourBlackThreshold?: number;
  /** The mosaic sits in a white no-data margin (ALSJ / Commons Apollo pans):
   *  blacken the edge-connected white first so the padding fills it. */
  whiteBorder?: boolean;
  /** Logos / watermarks / caption strips baked into the release, blacked out
   *  before padding: [x0, y0, x1, y1] fractions of the source. */
  maskRects?: Array<[number, number, number, number]>;
  /** Output size; default 4096×2048. Large full-circle sources ship at 8K. */
  outWidth?: number;
  outHeight?: number;
}

const PANORAMAS: MoonPanoramaConfig[] = [
  {
    siteId: 'apollo12',
    // 2026-11-05 (#641 review) — Pete's full-circle 12 O'clock LM pan (EVA-1)
    // replaces the ~220° ALSEP Site strip: Intrepid, the flag, Al Bean, Pete's
    // shadow. 7727×1049 at 360° → 49° tall, horizon 42 % from the top; the
    // white no-data margin is blackened, then padded.
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/e/e6/' +
      'Apollo_12_-_Pete%27s_12_O%27clock_LM_Pan.webp',
    sourceLabel: "Apollo 12 Pete's 12 O'clock LM Pan",
    attribution: 'NASA / Pete Conrad / Alan Bean · assembled by Dave Byrne · via Wikimedia Commons',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 20.5,
    srcElevationBottomDeg: 28.5,
    whiteBorder: true,
    // Off: a fill of black would also grey out the deep crater shadows.
    recolourBlackThreshold: 0,
    caption:
      "Apollo 12 full-circle panorama from the 12 o'clock side of Intrepid, EVA-1 " +
      "(19 Nov 1969): the LM, the flag, Al Bean and Pete Conrad's shadow, Ocean of Storms.",
  },
  {
    siteId: 'apollo14',
    // 2026-11-05 (#641 review) — NASA's seamless 360° landing-site panorama
    // replaces the 180° LM 12 O'clock pan: Antares, the flag, the
    // photographer's shadow, the Sun. 15000×1800 at 360° → 43° tall, horizon
    // 42 % from the top.
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/a1/Apollo_14_landing_site_panorama.jpg',
    sourceLabel: 'Apollo 14 landing site panorama (NASA)',
    attribution: 'NASA / Alan Shepard / Edgar Mitchell · via Wikimedia Commons',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 18,
    srcElevationBottomDeg: 25,
    recolourBlackThreshold: 0,
    outWidth: 8192,
    outHeight: 4096,
    caption:
      'Apollo 14 landing site at Fra Mauro, full-circle (Feb 1971): Antares LM, the flag, ' +
      "the photographer's shadow, the Sun low over the plain. NASA / Shepard / Mitchell.",
  },
  {
    siteId: 'change4',
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/1/1b/' +
      'The_first_panorama_from_the_far_side_of_the_moon.jpg',
    sourceLabel: "Chang'e 4 first farside panorama (CNSA, Feb 2019)",
    attribution: 'CNSA / Chinese Academy of Sciences · CC-BY-4.0',
    license: 'CC-BY-4.0',
    // 10000×1229 (8.1:1) — assembled from 80 frames by CNSA. 360° wrap;
    // isotropic vFOV = (1229/10000)*360 ≈ 44°. Horizon sits ~20% down the
    // source (sky/regolith boundary), so 9° above + 36° below maps the
    // frame 1:1 with no vertical squish and carries the real lander deck +
    // foreground regolith down to −36° (was 11/11, which squished the
    // source 2× and cropped the ground at the horizon). #C gap recovery.
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 9,
    srcElevationBottomDeg: 36,
    caption:
      "Chang'e 4 lander 360° panorama from Von Kármán crater, South Pole-Aitken basin — the first " +
      'surface panorama from the lunar far side (Feb 2019). Yutu-2 rover visible at left with its ' +
      'tracks. CNSA released image, assembled from 80 Lander Topographic Camera frames.',
  },
  {
    siteId: 'apollo11',
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/8/8a/' +
      'Apollo_11_Tranquility_Base_panoramic_%28JSC2007-E-045375%29.jpg',
    sourceLabel: 'JSC2007-E-045375',
    attribution: 'NASA / JSC / Apollo Lunar Surface Journal (mosaic by JSC, 2007)',
    license: 'PD-NASA',
    // 32454×2554 → 12.7:1 aspect. LM Eagle is tall in the source —
    // bumped elevationTop 14→26 so the LM ascent stage + flag don't
    // crop at the upper edge.
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 26,
    srcElevationBottomDeg: 14,
    caption:
      'Tranquillity Base panoramic mosaic — Apollo 11 LM Eagle, deployed flag, EASEP instrument, ' +
      'lunar regolith and crater field. 32454×2554 px Hasselblad composite (NASA JSC, 2007).',
  },
  {
    siteId: 'apollo15',
    // 2026-11-05 (#641 review) — the full-circle VIP Site pan (AS15-88-11895
    // to 11925, Dave Scott, end of EVA-3) replaces Jim's 200° ALSEP strip
    // (4167×605). 33982×5964 at 360° → 63° tall; the flat horizon sits 31 %
    // from the top. USGS Astrogeology: "Apollo 15 Panorama - VIP Site".
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/6/6f/' +
      'Apollo_15_-_As15-88-11895-11925_Panorama.jpg',
    sourceLabel: 'AS15-88-11895-11925 (VIP Site pan)',
    attribution: 'NASA / Dave Scott / Jim Irwin · assembled by Kev Holmes · via Wikimedia Commons',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 20,
    srcElevationBottomDeg: 43,
    outWidth: 8192,
    outHeight: 4096,
    caption:
      'Apollo 15 VIP Site panorama, the Lunar Roving Vehicle at its last parking spot, end of ' +
      'EVA-3 (2 Aug 1971): Mount Hadley, the Apennine Front, the Falcon LM in the distance ' +
      'with Jim Irwin. NASA / Scott / Irwin, assembled by Kev Holmes.',
  },
  {
    siteId: 'apollo16',
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/f/f4/' +
      'Apollo_16_-_ALSEP_Pan_HR_2_panorama.jpg',
    sourceLabel: 'Apollo 16 ALSEP Pan HR 2',
    attribution: 'NASA / John Young / Charlie Duke · assembled by Eric Jones · via ALSJ',
    license: 'PD-NASA',
    // 17660×3797 ≈ 4.6:1 — wide cylindrical, ~270° × ~60°.
    srcAzimuthDeg: 270,
    srcElevationTopDeg: 30,
    srcElevationBottomDeg: 30,
    caption:
      'Descartes Highlands ALSEP panorama. Orion LM + ALSEP central station + LRV; ' +
      'Stone Mountain on the horizon. Apollo 16, April 21 1972. ' +
      'NASA / Young / Duke via Apollo Lunar Surface Journal (Eric Jones composite).',
  },
  {
    siteId: 'luna9',
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/7/78/' +
      'First_Photo_from_the_Surface_of_the_Moon.jpg',
    sourceLabel: 'Luna 9 first surface photo (1966)',
    attribution:
      'Soviet Academy of Sciences · public domain (Russian copyright law: no creative agency)',
    license: 'PD-NASA', // PD-equivalent; license_rationale captures the Soviet provenance
    // 789×550 — the highest-quality version of the historic 1966
    // radiofax transmission on Wikimedia. There IS no high-res
    // version; the image is intrinsically low-res because of how
    // it was originally transmitted. Narrow azimuth (60°) keeps
    // the source pixels visually larger in the skybox rather than
    // stretching them across a wider sweep.
    srcAzimuthDeg: 60,
    srcElevationTopDeg: 20,
    srcElevationBottomDeg: 25,
    caption:
      'Luna 9 — the first photograph from the lunar surface, transmitted Feb 4 1966 ' +
      'from Oceanus Procellarum via Soviet radiofax. Intercepted + decoded by Jodrell Bank ' +
      'Observatory + Daily Express. The visible noise + low resolution are intrinsic to ' +
      'the 1966 transmission tech, not the rendering — this IS the best surviving copy of ' +
      'the historic first-ever photograph from another world. Soviet Academy of Sciences, PD.',
    recolourBlackThreshold: 20, // gentle — preserve historic transmission texture
  },
  {
    siteId: 'apollo17',
    // 2026-11-05 (#641 review) — the north half of the same ALSEP pan at full
    // resolution (12412×4308) replaces the 3249×651 USGS composite. Width from
    // the frames: one 60 mm Hasselblad frame (~49°) is ~20 % of the strip →
    // ~240°; 85° tall, horizon at 50 %. The south half is not stitched in.
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/6/63/' +
      '020_Jack%27s_Color_ALSEP_Pan_North.jpg',
    sourceLabel: "Jack's Color ALSEP Pan North",
    attribution: 'NASA / Gene Cernan / Jack Schmitt · via Wikimedia Commons',
    license: 'PD-NASA',
    srcAzimuthDeg: 240,
    srcElevationTopDeg: 42,
    srcElevationBottomDeg: 43,
    recolourBlackThreshold: 0,
    outWidth: 8192,
    outHeight: 4096,
    caption:
      'Taurus-Littrow Valley ALSEP panorama, EVA-1. Jack Schmitt assembled colour pan, ' +
      'Lunar Roving Vehicle and Lunar Module Challenger visible. ' +
      'Captured Dec 12 1972; USGS-prepared composite via NASA Apollo Lunar Surface Journal.',
  },

  // ── v0.7 #PC Phase 2 ship-all-10: agency-direct (not Wikimedia where
  // a true agency source exists). Sites without a published surface
  // panorama (Luna 16/24 telephotometer-only; Lunokhod 2 only museum
  // model on Commons; Beresheet crashed pre-imaging) ship with the
  // best-available editorial substitute + honest caption — same
  // pattern as /mars's mars3 / beagle2 / schiaparelli.

  {
    siteId: 'change3',
    // The release carries its title and mosaic credit in a strip under the image (#641).
    maskRects: [[0, 0.915, 1, 1]],
    sourceUrl: 'https://cdn.mos.cms.futurecdn.net/2UmRx9rkjZfauYdoQi8aAT.jpg',
    sourceLabel: "Chang'e 3 1st Color Panorama (CNSA, Dec 2013)",
    attribution: "CNSA / Chinanews / Ken Kremer / Marco Di Lorenzo · Chang'e 3 lander PCAM",
    license: 'CNSA-EDU',
    // 5084×744 ≈ 6.83:1 wide colour panorama. Treat as full 360° wrap
    // — Yutu rover tracks visible across the frame.
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 26,
    srcElevationBottomDeg: 27,
    caption:
      "Chang'e 3 first colour panorama, Mare Imbrium / Bay of Rainbows. Yutu rover tracks " +
      'cross the foreground; lander solar panels visible at edges. Captured Dec 15 2013, ' +
      'PCAM stereo pair stitched by Marco Di Lorenzo. CNSA / Chang’e 3 mission team.',
  },
  {
    siteId: 'change5',
    // CNSA + CLEP logos top right and a Weibo watermark at the bottom (#641).
    maskRects: [
      [0.775, 0.05, 0.985, 0.235],
      [0.42, 0.95, 0.57, 1],
    ],
    sourceUrl:
      'https://planetary.s3.amazonaws.com/web/assets/pictures/lunar-surface-pano-from-change-5.jpg',
    sourceLabel: "Chang'e 5 lunar surface panorama (CNSA, Dec 2020)",
    attribution: "CNSA / CLEP · Chang'e 5 lander panoramic camera",
    license: 'CNSA-EDU',
    // 15000×7947 ≈ 1.89:1. Forward-facing fan view (~200° azimuth)
    // showing lander deck, Mons Rümker terrain, and the gold-foil
    // thermal blanket. vFOV math: 200/1.89 ≈ 106° → 53+53.
    srcAzimuthDeg: 200,
    srcElevationTopDeg: 53,
    srcElevationBottomDeg: 53,
    caption:
      "Chang'e 5 lander forward panorama, Oceanus Procellarum / Mons Rümker. Lander " +
      'solar-cell deck + sample-drill foreground; nearer terrain shows fresh-impact ' +
      'ejecta. Captured Dec 1 2020. CNSA / CLEP.',
  },
  {
    siteId: 'change6',
    // CNSA + CLEP logos top right (#641).
    maskRects: [[0.855, 0.025, 0.995, 0.175]],
    sourceUrl:
      'https://news.cgtn.com/news/2024-06-04/China-s-Chang-e-6-sends-back-images-from-the-far-side-of-the-moon-1u9v8l9xdUk/img/52549cd8b951460bb6fe186a2495c8fb/52549cd8b951460bb6fe186a2495c8fb.jpeg',
    sourceLabel: "Chang'e 6 first surface panorama (CNSA, June 2024)",
    attribution: "CNSA / CLEP · Chang'e 6 lander panoramic camera · via CGTN",
    license: 'CNSA-EDU',
    // 1600×841 ≈ 1.9:1 fan-shaped forward view, first far-side
    // sample-return surface frame ever. Transmitted via Queqiao-2 relay.
    srcAzimuthDeg: 180,
    srcElevationTopDeg: 45,
    srcElevationBottomDeg: 50,
    caption:
      "Chang'e 6 first surface image — Apollo crater, lunar far side (the first surface " +
      'panorama ever transmitted from the far side of any planetary body, via the Queqiao-2 ' +
      'relay satellite). Captured June 2 2024. CNSA / CLEP / China Lunar Exploration Program.',
  },
  {
    siteId: 'chandrayaan3',
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/aa/Chandrayaan-3_%E2%80%93_Image_of_Vikram_lander_on_lunar_surface_taken_by_Pragyan_rover_navcam_at_1104_IST%2C_30_August_2023_from_15_meters_away_%28with_text%29.webp',
    sourceLabel: 'Chandrayaan-3 Vikram lander by Pragyan rover navcam (ISRO, Aug 2023)',
    attribution: 'ISRO · Pragyan rover NavCam (LEOS/ISRO) · SAC/ISRO processing',
    license: 'ISRO-EDU',
    // 1125×1125 ≈ 1:1. Single Navcam frame of Vikram lander on lunar
    // surface from 15 m away. Not a full panorama — Pragyan navcam was
    // a stereo pair, not a 360° system. Treat as narrow forward view.
    srcAzimuthDeg: 50,
    srcElevationTopDeg: 25,
    srcElevationBottomDeg: 25,
    caption:
      'Chandrayaan-3 Vikram lander photographed by Pragyan rover NavCam from 15 m away — ' +
      'Shiv Shakti Point, 69.37°S 32.32°E (highest-latitude soft landing of any mission). ' +
      'Captured 11:04 IST Aug 30 2023, six days after touchdown. ISRO. No 360° panorama ' +
      'exists; Pragyan carried a stereo NavCam pair, not a panoramic camera.',
  },
  {
    siteId: 'slim',
    sourceUrl: 'https://global.jaxa.jp/press/2024/01/images/20240125-4_e_01.jpg',
    sourceLabel: 'SLIM imaged by Sora-Q LEV-2 (JAXA, Jan 2024)',
    attribution: 'JAXA / TOMY / Sony Group / Doshisha University · Sora-Q (LEV-2) MBC',
    license: 'JAXA-OPEN',
    // 640×480 ≈ 1.33:1. Single frame from Sora-Q hopper showing SLIM
    // lander on its nose at Shioli crater. Sora-Q is an 8 cm hopper,
    // not a pan camera; ship the iconic single frame.
    srcAzimuthDeg: 50,
    srcElevationTopDeg: 19,
    srcElevationBottomDeg: 19,
    caption:
      'SLIM lander photographed by Sora-Q (LEV-2) micro-hopper after touchdown — ' +
      'Shioli crater. SLIM came down on its nose (engine fault during the final descent) ' +
      'but survived to operate for three days. Captured Jan 25 2024 by the 8 cm Sora-Q ' +
      'transformable hopper (TOMY / Sony / Doshisha co-development). No surface panorama ' +
      'system on SLIM; the Sora-Q stereo MBC frame is the canonical surface view. JAXA.',
  },
  {
    siteId: 'luna17',
    sourceUrl: 'https://upload.wikimedia.org/wikipedia/en/8/86/Lk101.jpg',
    sourceLabel: 'Lunokhod 1 surface panorama (USSR, 1970)',
    attribution: 'Soviet Academy of Sciences · Lunokhod 1 vidicon TV camera',
    license: 'PD-Russia',
    // 651×153 ≈ 4.25:1 wide horizon view — rover deck + tracks across
    // Mare Imbrium. Real surface panorama from Lunokhod 1's vidicon
    // panoramic scanner. Soviet pre-1973 work, PD-Russia.
    srcAzimuthDeg: 240,
    srcElevationTopDeg: 28,
    srcElevationBottomDeg: 28,
    caption:
      'Lunokhod 1 surface panorama — Mare Imbrium, Nov 1970. Rover deck + wheel tracks ' +
      'visible across the foreground. Lunokhod 1 returned 206 panoramas over its 322 Earth-day ' +
      'operation, all monochrome via the vidicon panoramic scanner. The first wheeled rover ' +
      'on another world. Soviet Academy of Sciences (PD-Russia).',
    palette: {
      regolith: [110, 110, 110],
    },
    recolourBlackThreshold: 20, // preserve historic transmission texture
  },
  // luna21 dropped 2026-06-01 from the panorama config. The previous
  // source was a museum-replica photo of Lunokhod 2 (blue curtain
  // visible in the background) — not a lunar surface image at all.
  // The 86 actual Lunokhod 2 surface panoramas live at planetology.ru
  // / Vernadsky Institute and aren't redistributed in Western archives;
  // LROC NAC orbital views show only a few-pixel rover dot. Per the
  // Mars 3 precedent (PRD-022 honest-historical-artifact): no Tier-3
  // panorama is the right answer when no usable surface source exists,
  // rather than a misleading museum-replica stand-in. Stand-at-site
  // button hides; user sees Tier-2 LROC + the surface-site panel.
];

interface FetchResult {
  status: 'ok' | 'skipped' | 'failed';
  outBytes?: number;
  reason?: string;
}

async function curl(url: string, outPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const p = spawn('curl', ['-fsSL', '--retry', '3', '--retry-delay', '5', '-o', outPath, url], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`curl exit ${code}`))));
    p.on('error', reject);
  });
}

async function ensureCachedSource(cfg: MoonPanoramaConfig): Promise<string> {
  const ext = path.extname(new URL(cfg.sourceUrl).pathname).toLowerCase() || '.jpg';
  const cached = path.join(PANORAMA_CACHE_DIR, `moon-${cfg.siteId}${ext}`);
  if (existsSync(cached)) return cached;
  console.log(`  downloading ${cfg.sourceUrl}`);
  await curl(cfg.sourceUrl, cached);
  const stat = await fs.stat(cached);
  console.log(`  cached ${cached} (${(stat.size / 1024).toFixed(0)} KB)`);
  return cached;
}

async function processOne(cfg: MoonPanoramaConfig, missingOnly: boolean): Promise<FetchResult> {
  const outPath = path.join(OUTPUT_BASE, cfg.siteId, 'tier3-pan.jpg');
  if (missingOnly && existsSync(outPath)) {
    return { status: 'skipped', reason: 'already exists (--missing-only)' };
  }
  try {
    const sourcePath = await ensureCachedSource(cfg);
    const raw = await fs.readFile(sourcePath);
    const unbordered = cfg.whiteBorder ? await whiteBorderToBlack(raw) : raw;
    const sourceBytes = cfg.maskRects?.length
      ? await blackOutRects(unbordered, cfg.maskRects)
      : unbordered;
    const padded = await padToEquirectangular({
      source: sourceBytes,
      srcAzimuthDeg: cfg.srcAzimuthDeg,
      srcElevationTopDeg: cfg.srcElevationTopDeg,
      srcElevationBottomDeg: cfg.srcElevationBottomDeg,
      palette: { ...DEFAULT_MOON_PALETTE, ...(cfg.palette ?? {}) },
      // NASA Apollo panoramas often have rover-deck cutouts padded
      // with black; recolour to lunar grey so they blend.
      recolourBlackThreshold: cfg.recolourBlackThreshold ?? 60,
      outWidth: cfg.outWidth,
      outHeight: cfg.outHeight,
    });
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, padded);
    return { status: 'ok', outBytes: padded.length };
  } catch (e) {
    return { status: 'failed', reason: (e as Error).message };
  }
}

interface Args {
  site?: string;
  dryRun: boolean;
  missingOnly: boolean;
}

export async function fetchMoonPanoramas(args: Args): Promise<void> {
  const targets = args.site ? PANORAMAS.filter((p) => p.siteId === args.site) : PANORAMAS;
  if (targets.length === 0) {
    console.log(`\n=== Moon Tier 3 (panoramas) === no targets`);
    return;
  }
  console.log(`\n=== Moon Tier 3 (panoramas) ===`);
  const results: Array<{ cfg: MoonPanoramaConfig; result: FetchResult }> = [];
  for (const cfg of targets) {
    if (args.dryRun) {
      console.log(`  · ${cfg.siteId} dry-run: would fetch ${cfg.sourceUrl}`);
      continue;
    }
    const result = await processOne(cfg, args.missingOnly);
    if (result.status === 'ok') {
      console.log(`  ✓ ${cfg.siteId} → tier3-pan.jpg (${(result.outBytes! / 1024).toFixed(0)} KB)`);
    } else if (result.status === 'skipped') {
      console.log(`  · ${cfg.siteId} skipped — ${result.reason}`);
    } else {
      console.log(`  ✗ ${cfg.siteId} FAILED — ${result.reason}`);
    }
    results.push({ cfg, result });
  }

  // Provenance upsert for newly-fetched panoramas.
  const fresh = results.filter((r) => r.result.status === 'ok');
  if (fresh.length > 0) {
    const entries = fresh.map((r) =>
      buildPanoramaProvenanceEntry({
        siteId: r.cfg.siteId,
        publicPath: `/images/hotspots/moon/${r.cfg.siteId}/tier3-pan.jpg`,
        sourceLabel: r.cfg.sourceLabel,
        sourceUrl: r.cfg.sourceUrl,
        attribution: r.cfg.attribution,
        license: r.cfg.license,
        caption: r.cfg.caption,
        outWidth: r.cfg.outWidth,
        outHeight: r.cfg.outHeight,
      }),
    );
    await upsertProvenanceEntries(entries);
    console.log(`  Provenance: ${entries.length} panorama entries upserted`);
  }
}

// Allow running directly: npx tsx scripts/hotspots/fetch-moon-panoramas.ts
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('fetch-moon-panoramas.ts');
if (isDirectRun) {
  const args = process.argv.slice(2);
  const siteArg = args[args.indexOf('--site') + 1];
  const opts: Args = {
    site: args.includes('--site') ? siteArg : undefined,
    dryRun: args.includes('--dry-run'),
    missingOnly: args.includes('--missing-only'),
  };
  fetchMoonPanoramas(opts).catch((err) => {
    console.error('Fatal:', (err as Error).message);
    process.exit(1);
  });
}
