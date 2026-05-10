#!/usr/bin/env tsx
/**
 * Hero override pass — replaces bad/empty 01.jpg files for fleet
 * entries the user flagged. Per ADR-046 Wikimedia Commons hosts
 * agency-uploaded files with proper provenance metadata; this layer
 * picks the canonical agency-archive image for each entry rather
 * than relying on Commons SEARCH ranking.
 *
 * Lesson learned (2026-05-09): Commons SEARCH is noisy ("Cygnus" returns
 * swans, "Salyut" returns paper models). Wikipedia article infoboxes are
 * already hand-curated by editors who pick the cleanest device-shot from
 * Commons. Use Wikipedia's `pageimages` API to extract the canonical
 * Commons filename per article, then download from Commons. For agencies
 * whose Wikipedia leads to logos/diagrams (Soviet hardware especially),
 * try the native-language Wikipedia (ru / zh / ja). For the long tail
 * (SLIM), agency mission catalogue pages host clean device shots
 * directly — supported here via optional directUrl field.
 *
 * For each entry:
 *   - Downloads HERO_OVERRIDES[id] (Commons filename or directUrl) to
 *     entry/01.jpg
 *   - Existing 01.jpg shifts to a free higher slot to keep alternates
 *   - Sidecar manifest updated so build-image-provenance attributes
 *     the new hero correctly
 *
 * Run:
 *   tsx scripts/fix-fleet-heroes.ts
 */
import { readFile, writeFile, access, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLEET_IMG_DIR = join(ROOT, 'static/images/fleet-galleries');
const SIDECAR = join(ROOT, 'static/data/fleet-image-sources.json');
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';

/**
 * Curated Commons filenames per entry. Verified against Wikipedia
 * article infoboxes for the corresponding hardware. URLs resolve via
 * Commons Special:FilePath which serves the underlying Commons file
 * (uploader = agency, license = per-file metadata).
 */
interface HeroOverride {
  filename?: string;
  directUrl?: string;
  agency: string;
}

const HERO_OVERRIDES: Record<string, HeroOverride> = {
  // === Wave 2 (2026-05-09) — derived from Wikipedia pageimages API ===
  // For each entry below, the Commons filename is the canonical lead
  // image of the corresponding Wikipedia article. Editors curate these
  // for clean device-shots; bypassing Commons SEARCH ranking.
  'cygnus-standard': {
    filename: 'Cygnus_Enhanced_spacecraft.jpg',
    agency: 'NORTHROP_GRUMMAN',
  },
  'tiangong-2': {
    filename: 'Tianzhou-1_and_Tiangong-2_rendering.jpg',
    agency: 'CMSA',
  },
  energia: {
    filename: 'Energia_Render_3_corrected.png',
    agency: 'ROSCOSMOS',
  },
  'long-march-5': {
    filename: 'Launching_Tianhe_Core_Module.jpg',
    agency: 'CMSA',
  },
  tianzhou: {
    filename: 'Tianzhou_Cargo_Spaceship.jpg',
    agency: 'CMSA',
  },
  // ru.wikipedia.org infobox lead — museum exhibit, real device, not insignia
  'salyut-6': {
    filename: 'Moscow_Polytechnical_Museum,_Salut_space_station.jpg',
    agency: 'ROSCOSMOS',
  },
  // ru.wikipedia.org Прогресс infobox lead — clean ISS-era Progress
  'progress-7k-tg': {
    filename: 'ISS_Progress_cargo_spacecraft.jpg',
    agency: 'ROSCOSMOS',
  },
  // JAXA mission catalogue page hero — Wikipedia returns half-scale model only
  slim: {
    directUrl: 'https://www.isas.jaxa.jp/en/missions/files/slim_main3.jpg',
    agency: 'JAXA',
  },
  // Wave 2.5 (2026-05-10) — for these two, no clean orbital photo of the
  // hardware exists in Commons (Salyut-7 was uncrewed mostly + tumbled into
  // Argentina; Soyuz 7K-OK ended in Komarov's death). User confirmed
  // canonical drawings are an acceptable hero. ru.wiki picked these as the
  // article infobox image — agency-curated even if not photographic.
  'salyut-7': {
    filename: 'Salyut_7_drawing.png',
    agency: 'ROSCOSMOS',
  },
  'soyuz-7k-ok': {
    filename: 'Soyuz_7K-OK(A)_drawing.png',
    agency: 'ROSCOSMOS',
  },
  // === Wave 1 retried via Wikipedia pageimages API (2026-05-09) ===
  // The original wave-1 filenames were guesses that 404'd. These come
  // from the same Wikipedia-pageimages-API approach as wave 2.
  gaganyaan: {
    filename: 'Gaganyaan_vehicle_used_for_TVD1_mission.webp',
    agency: 'ISRO',
  },
  'vikram-cy3': {
    filename: 'Vikram_Lander.jpg',
    agency: 'ISRO',
  },
  zhurong: {
    filename: 'Zhurong-with-lander-selfie.png',
    agency: 'CMSA',
  },
  'yutu-2': {
    filename: 'Yutu-2.jpg',
    agency: 'CMSA',
  },
  'change-5': {
    filename: 'Chang-e-5-assembly-CG-1-Cropped.jpg',
    agency: 'CMSA',
  },
  gaia: {
    filename: 'Gaia_observes_the_Milky_Way_ESA24305955.jpeg',
    agency: 'ESA',
  },
  'cygnus-enhanced': {
    filename: 'ISS-64_The_Cygnus_space_freighter_moments_before_its_capture.jpg',
    agency: 'NORTHROP_GRUMMAN',
  },
  'cargo-dragon-v1': {
    filename: 'SpaceX_CRS-1_approaches_ISS-cropped.jpg',
    agency: 'SPACEX',
  },
  'long-march-7': {
    filename: 'Long_March_7_Y6.jpg',
    agency: 'CMSA',
  },
  h3: {
    filename: 'H3_rocket_launch.jpg',
    agency: 'JAXA',
  },
};

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadUrl(url: string, dest: string, label: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'orrery-hero-fix (https://github.com/chipi/orrery)' },
    });
    if (!res.ok) {
      console.warn(`  ⚠ HTTP ${res.status} for ${label}`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠ ${label}: ${msg}`);
    return false;
  }
}

async function downloadCommons(filename: string, dest: string): Promise<boolean> {
  const url = `${COMMONS_FILEPATH}/${encodeURIComponent(filename)}?width=1024`;
  return downloadUrl(url, dest, filename);
}

async function nextFreeSlot(dir: string): Promise<string | null> {
  for (const slot of ['02.jpg', '03.jpg', '04.jpg', '05.jpg', '06.jpg']) {
    if (!(await fileExists(join(dir, slot)))) return slot;
  }
  return null;
}

async function main() {
  let sidecar: Record<string, { agency: string; sourceUrl: string }> = {};
  try {
    sidecar = JSON.parse(await readFile(SIDECAR, 'utf8'));
  } catch {
    /* fresh start */
  }

  let fixed = 0;
  for (const [entry, override] of Object.entries(HERO_OVERRIDES)) {
    const dir = join(FLEET_IMG_DIR, entry);
    await mkdir(dir, { recursive: true });
    const label = override.filename ?? override.directUrl ?? '?';
    process.stdout.write(`  ${entry} ← ${label}…`);

    // Move existing 01.jpg to free slot if we have one
    const existing01 = join(dir, '01.jpg');
    const sourceUrl = override.filename
      ? `${COMMONS_FILEPATH}/${encodeURIComponent(override.filename)}`
      : (override.directUrl as string);
    if (await fileExists(existing01)) {
      const free = await nextFreeSlot(dir);
      if (free) {
        await copyFile(existing01, join(dir, free));
        const oldSrc = sidecar[`${entry}/01.jpg`];
        if (oldSrc) sidecar[`${entry}/${free}`] = oldSrc;
      }
    }

    // Download new hero
    const ok = override.filename
      ? await downloadCommons(override.filename, existing01)
      : await downloadUrl(override.directUrl as string, existing01, label);
    if (ok) {
      sidecar[`${entry}/01.jpg`] = { agency: override.agency, sourceUrl };
      process.stdout.write(' ✓\n');
      fixed += 1;
    } else {
      process.stdout.write(' FAILED\n');
    }
  }

  await writeFile(SIDECAR, JSON.stringify(sidecar, null, 2) + '\n');
  console.log(`\nFixed heroes: ${fixed}/${Object.keys(HERO_OVERRIDES).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
