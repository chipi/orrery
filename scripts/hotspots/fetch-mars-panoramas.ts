/**
 * Orchestrator for Mars Tier 3 ground-view panoramas (PRD-014 /
 * RFC-017 #PD-mars, GH #249).
 *
 * For each of the 10 Mars sites with usable surface imagery:
 *   1. Download canonical NASA / CNSA panorama (curl, polite retry)
 *   2. Pad cylindrical / partial-360 → 4096×2048 equirectangular
 *      via `panorama-padder.ts`
 *   3. Write JPEG to
 *      `static/images/hotspots/mars/<site>/tier3-pan.jpg`
 *   4. Upsert `image-provenance.json` entry with per-mission credit
 *      chain + license tag
 *
 * Three Mars sites (mars3, beagle2, schiaparelli) are not in this
 * list — no usable surface imagery exists for them (Mars 3 only
 * transmitted 14.5 s of degraded greyscale; Beagle 2 + Schiaparelli
 * never produced surface data due to mission failures). Their
 * `hotspot_tier3_panorama` field is intentionally absent — the
 * "Stand at site" button is conditional on it.
 *
 * Source curation reference: docs/guides/mars-hotspot-imagery.md §Tier 3
 *
 * Usage:
 *   npm run images:hotspots -- --layer tier3 --dest mars
 *   npm run images:hotspots -- --site curiosity --layer tier3
 */

import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';

import { padToEquirectangular, type MarsColourPalette } from './panorama-padder.ts';
import { buildPanoramaProvenanceEntry, upsertProvenanceEntries } from './provenance.ts';

const PANORAMA_CACHE_DIR = '.image-cache/hotspots/panoramas';
const OUTPUT_BASE = 'static/images/hotspots/mars';

interface MarsPanoramaConfig {
  /** Mars site id matching `surface-hotspots.json` entries. */
  siteId: string;
  /** Source panorama URL (direct image, not the catalog page). */
  sourceUrl: string;
  /** Public NASA PIA / CNSA release ID for attribution. */
  sourceLabel: string;
  /** Per-mission credit chain — exact string used in provenance. */
  attribution: string;
  /** License-allowlist short tag. */
  license: 'PD-NASA' | 'CNSA-EDU' | 'CC-BY-4.0';
  /** Azimuth coverage of the source image (360 = full wrap; 342 =
   *  Viking-class partial). */
  srcAzimuthDeg: number;
  /** Elevation above horizon visible in the source image. */
  srcElevationTopDeg: number;
  /** Elevation below horizon visible in the source image. */
  srcElevationBottomDeg: number;
  /** Caption shown in provenance / credits. */
  caption: string;
  /** Optional sky/regolith palette override for landers whose
   *  imagery has a distinct colour balance. */
  palette?: Partial<MarsColourPalette>;
  /** Replace near-black pixels in the source with palette colour
   *  (default 30). Set higher for NASA cylindrical sources with
   *  visible rover-deck cutouts / edge bars (Curiosity Mt Mercou,
   *  Perseverance Van Zyl) — they pad missing data with black and
   *  the cutouts read as conspicuous holes if pasted as-is.
   *  Set to 0 to disable. */
  recolourBlackThreshold?: number;
  /** Override output equirectangular size for hi-res "showcase" sites
   *  (PRD-022 / ADR-074, #286 Phase 1A). Defaults to 4096×2048 when
   *  omitted. Marquee sites (Curiosity, Perseverance) ship at 8192×4096
   *  for the 4× pixel-density jump that closes the gap with NASA's
   *  interactive viewers. */
  outWidth?: number;
  outHeight?: number;
}

/**
 * Per-site source URL + metadata. Hand-curated from NASA Photojournal,
 * ASU Mastcam-Z collection, and CNSA / Planetary Society redistributions.
 * See docs/guides/mars-hotspot-imagery.md §Tier 3 for the research
 * trail.
 */
const PANORAMAS: MarsPanoramaConfig[] = [
  // URLs verified via science.nasa.gov on 2026-05-21. Two sites
  // (viking1-lander, zhurong) didn't have stable direct-image URLs
  // on NASA / Planetary Society and are punted to a follow-up
  // (#249 issue body). Their hotspot_tier3_panorama field stays
  // unset so the "Stand at site" button simply doesn't render —
  // same graceful-omission UX as mars3/beagle2/schiaparelli.
  // 2026-05-22 per-site elevation tuning. Earlier defaults (25-30° up,
  // 25° down) under-represented how far below horizon the source
  // panoramas actually sweep — for rover deck-mounted cameras the
  // ground is reached at -35° to -55° below horizon depending on
  // tripod height. Pulling srcElevationBottomDeg up extends the real
  // imagery further into the lower hemisphere of the output, shrinking
  // the flat regolith pad band the user found objectionable.
  {
    siteId: 'curiosity',
    sourceUrl:
      'https://assets.science.nasa.gov/content/dam/science/psd/mars/downloadable_items/4/6/46054_PIA24626-Curiositys_360-degree_View_Atop_Mont_Mercou.png',
    sourceLabel: 'PIA24626',
    attribution: 'NASA / JPL-Caltech / MSSS',
    license: 'PD-NASA',
    // 29163×7891 ≈ 3.69:1 — at 360° hAz the source covers ~98°
    // vFOV. Earlier 30+45=75° squished the rover deck + foreground
    // vertically; 35+58=93° matches the aspect ratio so the Mastcam
    // foreground (rover wheels, drill arm, immediate workspace)
    // renders at correct angular size instead of being crammed.
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 35,
    srcElevationBottomDeg: 58,
    caption: 'Curiosity at Mont Mercou, sol 3070 — Mastcam 360° panorama',
    // Marquee showcase site (#286 Phase 1A) — ship at 8K equirectangular
    // for the 4× pixel-density jump.
    outWidth: 8192,
    outHeight: 4096,
  },
  {
    siteId: 'perseverance',
    sourceUrl:
      'https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/deepzooms/2/5/25640_PIA2464-Perseverance_Sol3_Mastcam-Z_panorama.jpg',
    sourceLabel: 'PIA2464',
    attribution: 'NASA / JPL-Caltech / ASU / MSSS',
    license: 'PD-NASA',
    // 36952×11570 ≈ 3.19:1 — at 360° hAz the source covers ~113°
    // vFOV. Earlier 35+45=80° vertically compressed the Mastcam-Z
    // panorama by 1.4x and left dark shadow patches inside the
    // rover deck region reading as visible "black holes." 50+62=112°
    // matches the aspect ratio. Bumped recolourBlackThreshold to 85
    // so the deck-shadow patches recolour into Mars regolith tone
    // instead of staying near-black.
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 50,
    srcElevationBottomDeg: 62,
    recolourBlackThreshold: 85,
    caption: 'Perseverance Mastcam-Z first 360° panorama, Jezero Crater, sol 3 (Feb 21, 2021)',
    // Marquee showcase site (#286 Phase 1A) — ship at 8K equirectangular.
    outWidth: 8192,
    outHeight: 4096,
  },
  {
    siteId: 'spirit',
    sourceUrl:
      'https://assets.science.nasa.gov/content/dam/science/psd/mars/downloadable_items/3/6/36529_PIA16440_McMurdo_Merged_Cyl_L456atc_br2.jpg',
    sourceLabel: 'PIA16440',
    attribution: 'NASA / JPL-Caltech / Cornell',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 30,
    srcElevationBottomDeg: 45,
    caption: 'Spirit at Winter Haven, sols 814-980 — McMurdo Pancam panorama',
  },
  {
    siteId: 'opportunity',
    sourceUrl:
      'https://assets.science.nasa.gov/content/dam/science/psd/mars/downloadable_items/4/42560_PIA22908-LegacyPan-ANNOTATED.jpg',
    sourceLabel: 'PIA22908',
    attribution: 'NASA / JPL-Caltech / Cornell',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 30,
    srcElevationBottomDeg: 45,
    caption: 'Opportunity Legacy Pan, sols 5084-5111 — final mission panorama (May-Jun 2018)',
  },
  {
    siteId: 'phoenix',
    sourceUrl:
      'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/mars/downloadable_items/3/5/35317_phx20110310b_PIA13804_phoenix_msp_deck.jpg',
    sourceLabel: 'PIA13804',
    attribution: 'NASA / JPL-Caltech / U Arizona / Texas A&M',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 25,
    srcElevationBottomDeg: 50,
    caption: 'Phoenix lander deck + landing site, full-circle panorama (May 2008)',
    // Phoenix sat at 68°N during arctic summer — the sky carried a
    // distinctive pale-blue-toward-zenith tint visible in its SSI
    // panoramas, unlike the warm-tan default of lower-latitude
    // landers. The horizon stays warm-tan; the zenith blends cooler.
    palette: {
      skyHorizon: [195, 165, 140],
      skyZenith: [110, 110, 135],
    },
  },
  {
    siteId: 'insight',
    sourceUrl:
      'https://assets.science.nasa.gov/content/dam/science/psd/mars/downloadable_items/4/42655_PIA23136.png',
    sourceLabel: 'PIA23136',
    attribution: 'NASA / JPL-Caltech',
    license: 'PD-NASA',
    srcAzimuthDeg: 290,
    srcElevationTopDeg: 20,
    srcElevationBottomDeg: 40,
    caption: 'InSight Homestead Hollow, sol 14 — IDC arm-camera 290° panorama',
  },
  {
    siteId: 'mars-pathfinder',
    sourceUrl:
      'https://assets.science.nasa.gov/content/dam/science/psd/mars/downloadable_items/3/9/39960_PIA01005.jpg',
    sourceLabel: 'PIA01005',
    attribution: 'NASA / JPL',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 25,
    srcElevationBottomDeg: 45,
    caption: 'Mars Pathfinder IMP 360° colour panorama, Twin Peaks visible on horizon (sols 8-10)',
  },
  {
    siteId: 'viking2-lander',
    sourceUrl:
      'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00568/PIA00568.jpg',
    sourceLabel: 'PIA00568',
    attribution: 'NASA / JPL',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 15,
    srcElevationBottomDeg: 55,
    caption: 'Viking 2 lander, Utopia Planitia — first colour image of the site (Sept 1976)',
  },
  {
    siteId: 'viking1-lander',
    sourceUrl: 'https://archive.org/download/PIA03163/PIA03163.jpg',
    sourceLabel: 'PIA03163',
    attribution: 'NASA / JPL',
    license: 'PD-NASA',
    // Viking Lander 1 Camera 1 mosaic — "Morning on Chryse Planitia",
    // 342.5° azimuth (partial — leftmost 17.5° is the gap), 5° above
    // horizon to 60° below. The asymmetric elevation is real: Viking
    // landers' cameras were mounted ~1.3 m off the ground looking
    // mostly downward into the workspace. Mirrored via Internet
    // Archive since science.nasa.gov no longer hosts the original
    // photojournal page.
    srcAzimuthDeg: 342.5,
    srcElevationTopDeg: 5,
    srcElevationBottomDeg: 60,
    caption: 'Viking 1 lander, Chryse Planitia — "Morning on Chryse" Camera 1 mosaic (PIA03163)',
    // Viking 1's "pink sky" was the famous early-mission colour-
    // calibration story: the dusty Martian sky at Chryse appears
    // pinker / dustier than other landing sites in the Viking-era
    // colour-corrected mosaics. Bump the horizon toward salmon and
    // lift the regolith into the rusty range to match the
    // characteristic Viking-1 colour palette.
    palette: {
      skyHorizon: [210, 165, 145],
      skyZenith: [165, 105, 85],
      regolith: [140, 80, 55],
      azimuthGap: [120, 75, 55],
    },
  },
  {
    siteId: 'zhurong',
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/4/48/Mars_surface_by_Zhurong_rover.jpg',
    sourceLabel: 'Mars surface by Zhurong (He Zhu et al. 2024, doi:10.1093/nsr/nwae084)',
    attribution:
      'CNSA / Beijing Institute of Space Mechanics & Electricity (BISME), He Zhu et al. (2024)',
    license: 'CC-BY-4.0',
    // 2008×1141 wide-angle composite from a 2024 research publication
    // — not a true 360° pano, but the cleanest CC-licensed Zhurong
    // surface imagery we could find. ~120° azimuth coverage (rough
    // estimate from the framing); the remaining 240° is filled with
    // the regolith-tinted azimuth-gap fill, so the skybox shows a
    // bounded "looking forward" view rather than a full sphere. CC
    // BY 4.0 license inherited from the source paper.
    srcAzimuthDeg: 120,
    srcElevationTopDeg: 20,
    srcElevationBottomDeg: 40,
    caption: 'Zhurong rover surface view, Utopia Planitia — from He Zhu et al. 2024 (CC BY 4.0)',
  },
];

interface Args {
  site?: string;
  dryRun: boolean;
  missingOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false, missingOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--site') out.site = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--missing-only') out.missingOnly = true;
  }
  return out;
}

/**
 * Download a URL to a local cache path. Uses curl rather than Node
 * fetch because some hosts (CNSA mirrors, certain CDN edge nodes)
 * have TLS chains that Node's bundled trust store doesn't validate.
 */
async function downloadWithCurl(url: string, outPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'curl',
      [
        '-fsSL',
        '--retry',
        '3',
        '--retry-delay',
        '5',
        '--connect-timeout',
        '30',
        '--max-time',
        '300',
        '-o',
        outPath,
        url,
      ],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl exited ${code} for ${url}`));
    });
  });
}

async function ensureCachedSource(cfg: MarsPanoramaConfig): Promise<string> {
  const ext = path.extname(new URL(cfg.sourceUrl).pathname).toLowerCase() || '.jpg';
  const localPath = path.join(PANORAMA_CACHE_DIR, `${cfg.siteId}-source${ext}`);
  if (!existsSync(localPath)) {
    console.log(`  ↓ downloading ${cfg.sourceUrl}`);
    await downloadWithCurl(cfg.sourceUrl, localPath);
  }
  return localPath;
}

async function processOne(
  cfg: MarsPanoramaConfig,
  missingOnly: boolean,
): Promise<{ status: 'ok' | 'skipped' | 'failed'; reason?: string; outBytes?: number }> {
  const outPath = path.join(OUTPUT_BASE, cfg.siteId, 'tier3-pan.jpg');
  if (missingOnly && existsSync(outPath)) {
    return { status: 'skipped', reason: 'already exists (--missing-only)' };
  }
  try {
    const sourcePath = await ensureCachedSource(cfg);
    const sourceBytes = await fs.readFile(sourcePath);
    const padded = await padToEquirectangular({
      source: sourceBytes,
      srcAzimuthDeg: cfg.srcAzimuthDeg,
      srcElevationTopDeg: cfg.srcElevationTopDeg,
      srcElevationBottomDeg: cfg.srcElevationBottomDeg,
      palette: cfg.palette,
      // Default-on for all sites: NASA's cylindrical panoramas
      // routinely pad rover-deck cutouts + edge bars with black.
      // 60 picks up #000-#141414 — well below even Curiosity's
      // deepest natural shadows (~#3a2a20).
      recolourBlackThreshold: cfg.recolourBlackThreshold ?? 60,
      // Per-site output dimensions — marquee showcase sites ship at
      // 8K (PRD-022 / ADR-074, #286 Phase 1A); rest default to 4K.
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

export async function fetchMarsPanoramas(args: Args): Promise<void> {
  const targets = args.site ? PANORAMAS.filter((p) => p.siteId === args.site) : PANORAMAS;
  if (targets.length === 0) {
    console.error(`No matching panorama configs for --site ${args.site ?? '(none)'}`);
    process.exit(2);
  }

  console.log(`=== Mars Tier 3 (panoramas) === ${targets.length} site(s)`);
  if (args.dryRun) {
    for (const cfg of targets) {
      console.log(
        `  · ${cfg.siteId}: would fetch ${cfg.sourceUrl} → ${path.join(OUTPUT_BASE, cfg.siteId, 'tier3-pan.jpg')}`,
      );
    }
    return;
  }

  const provenanceEntries: ReturnType<typeof buildPanoramaProvenanceEntry>[] = [];
  let okCount = 0;
  let failCount = 0;
  let skipCount = 0;
  for (let i = 0; i < targets.length; i++) {
    const cfg = targets[i];
    const result = await processOne(cfg, args.missingOnly);
    if (result.status === 'ok') {
      okCount++;
      const sizeKb = Math.round((result.outBytes ?? 0) / 1024);
      console.log(`  ✓ ${cfg.siteId} ← ${cfg.sourceLabel} (${sizeKb} KB)`);
      provenanceEntries.push(
        buildPanoramaProvenanceEntry({
          siteId: cfg.siteId,
          publicPath: `/images/hotspots/mars/${cfg.siteId}/tier3-pan.jpg`,
          sourceLabel: cfg.sourceLabel,
          sourceUrl: cfg.sourceUrl,
          attribution: cfg.attribution,
          license: cfg.license,
          caption: cfg.caption,
          outWidth: cfg.outWidth,
          outHeight: cfg.outHeight,
        }),
      );
    } else if (result.status === 'skipped') {
      skipCount++;
      console.log(`  · ${cfg.siteId} skipped (${result.reason})`);
    } else {
      failCount++;
      console.log(`  ✗ ${cfg.siteId} FAILED — ${result.reason}`);
    }
    // Polite pause between downloads — NASA Photojournal is fine
    // with steady requests but we still keep it 5 s.
    if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 5000));
  }

  if (provenanceEntries.length > 0) {
    console.log(`  upserting ${provenanceEntries.length} provenance entries…`);
    await upsertProvenanceEntries(provenanceEntries);
  }
  console.log(`=== Done: ${okCount} ok / ${skipCount} skipped / ${failCount} failed ===`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  await fetchMarsPanoramas(args);
}
