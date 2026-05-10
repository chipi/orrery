#!/usr/bin/env tsx
/**
 * Audit fleet heroes per the user's rules:
 *   - No text (logos, patches, infographics, PDFs, presentations, articles)
 *   - No people-only shots (portraits, crews-without-spacecraft)
 *   - No artist concepts/illustrations/schematics
 *   - Just the fleet asset itself (the spacecraft, rover, observatory etc.)
 *
 * For each entry:
 *   1. Score 01..05 against bad-keyword regex
 *   2. If 01 is bad and a clean slot exists, AUTO-SWAP
 *   3. If all 5 are bad/empty, FLAG as "needs human curation"
 *
 * Outputs: docs/provenance/fleet-hero-audit.md with the curation backlog.
 */
import { readFile, writeFile, copyFile, access, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SIDECAR = join(ROOT, 'static/data/fleet-image-sources.json');
const FLEET_IMG_DIR = join(ROOT, 'static/images/fleet-galleries');
const FLEET_INDEX = join(ROOT, 'static/data/fleet/index.json');
const REPORT = join(ROOT, 'docs/provenance/fleet-hero-audit.md');

// "No text" — logos / patches / infographics / PDFs / presentations / screenshots
const TEXT =
  /logo|patch|insignia|emblem|banner|wordmark|infographic|infograph|diagram|schematic|page1-|page-1|\.pdf|presentation|slides|chart|svg\.png|cropped\)\.svg/i;
// "No artist concepts / illustrations / models / scale-replicas"
const ARTWORK =
  /illustration|artist|artwork|concept|rendering|render|drawing|impression|painting|scale_model|scale-model|model_in_|model_at_|in_museum|in_planetarium|computer.{0,3}graphic/i;
// "No people-only" — flight suits, crew portraits, ceremonies
const PEOPLE =
  /flight_suit|astronaut_at|cosmonaut_at|crew_portrait|press_conference|ceremony|smiling|exhibition|stamp|coin|memorial/i;
// Wrong subject leakage (Hubble illustration in Gaia entry, etc.) — check explicitly per-entry below.
const SCREENSHOT = /\.webm\.jpg$|\.ogv\.jpg$|\.tiff\.jpg$|page1-960px|capture[_-]/i;

function badScore(url: string): number {
  let score = 0;
  if (TEXT.test(url)) score += 10;
  if (ARTWORK.test(url)) score += 5;
  if (PEOPLE.test(url)) score += 5;
  if (SCREENSHOT.test(url)) score += 8;
  return score;
}

interface SidecarEntry {
  agency: string;
  sourceUrl: string;
}

interface IndexEntry {
  id: string;
  name: string;
  category: string;
  agency: string;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const sources: Record<string, SidecarEntry> = JSON.parse(await readFile(SIDECAR, 'utf-8'));
  const indexEntries: IndexEntry[] = JSON.parse(await readFile(FLEET_INDEX, 'utf-8'));

  const byEntry = new Map<string, Array<{ slot: string; src?: SidecarEntry }>>();
  for (const idx of indexEntries) {
    const slots: Array<{ slot: string; src?: SidecarEntry }> = [];
    for (const slot of ['01.jpg', '02.jpg', '03.jpg', '04.jpg', '05.jpg', '06.jpg']) {
      const src = sources[`${idx.id}/${slot}`];
      const path = join(FLEET_IMG_DIR, idx.id, slot);
      if (await fileExists(path)) {
        slots.push({ slot, src });
      }
    }
    byEntry.set(idx.id, slots);
  }

  const swaps: Array<{ id: string; from: string; to: string }> = [];
  const flagged: Array<{ id: string; name: string; agency: string; reason: string }> = [];

  for (const idx of indexEntries) {
    const slots = byEntry.get(idx.id) ?? [];
    if (slots.length === 0) {
      flagged.push({ id: idx.id, name: idx.name, agency: idx.agency, reason: 'no images' });
      continue;
    }
    const scored = slots.map((s) => ({
      slot: s.slot,
      url: s.src?.sourceUrl ?? '',
      score: badScore(s.src?.sourceUrl ?? ''),
    }));
    const heroIdx = scored.findIndex((s) => s.slot === '01.jpg');
    const heroBad = heroIdx >= 0 && scored[heroIdx].score >= 5;
    if (!heroBad) continue;

    // Find best alternative (lowest score) in 02-06
    const alts = scored.filter((s) => s.slot !== '01.jpg').sort((a, b) => a.score - b.score);
    const bestAlt = alts[0];
    if (bestAlt && bestAlt.score < scored[heroIdx].score && bestAlt.score < 5) {
      swaps.push({ id: idx.id, from: '01.jpg', to: bestAlt.slot });
    } else {
      const reason = TEXT.test(scored[heroIdx].url)
        ? 'text/logo/PDF dominant — all alternates also bad'
        : ARTWORK.test(scored[heroIdx].url)
          ? 'artist concept / model / scale-replica only'
          : PEOPLE.test(scored[heroIdx].url)
            ? 'people-only — no spacecraft visible'
            : SCREENSHOT.test(scored[heroIdx].url)
              ? 'video screenshot or article preview'
              : 'low-quality match';
      flagged.push({ id: idx.id, name: idx.name, agency: idx.agency, reason });
    }
  }

  // Apply swaps
  for (const s of swaps) {
    const dir = join(FLEET_IMG_DIR, s.id);
    const from = join(dir, s.from);
    const to = join(dir, s.to);
    const tmp = join(dir, 'swap.tmp.jpg');
    await copyFile(from, tmp);
    await copyFile(to, from);
    await copyFile(tmp, to);
    await import('node:fs/promises').then((fs) => fs.unlink(tmp));
    const a = sources[`${s.id}/${s.from}`];
    const b = sources[`${s.id}/${s.to}`];
    if (a && b) {
      sources[`${s.id}/${s.from}`] = b;
      sources[`${s.id}/${s.to}`] = a;
    }
  }
  await writeFile(SIDECAR, JSON.stringify(sources, null, 2) + '\n');

  // Write report
  await mkdir(dirname(REPORT), { recursive: true });
  let md = `# Fleet hero audit — ${new Date().toISOString().slice(0, 10)}\n\n`;
  md += `Auto-audit per the "no text · no people · just the asset" rule.\n\n`;
  md += `## Auto-swapped (${swaps.length})\n\n`;
  if (swaps.length === 0) md += `_None._\n\n`;
  else {
    md += `Each entry's 01.jpg was replaced with the highest-scoring alternate (cleaner device-shot already in the gallery).\n\n`;
    md += `| Entry | 01 ↔ |\n|---|---|\n`;
    for (const s of swaps) md += `| ${s.id} | ${s.to} |\n`;
    md += `\n`;
  }
  md += `## Needs human curation (${flagged.length})\n\n`;
  if (flagged.length === 0) md += `_None._\n\n`;
  else {
    md += `These entries' galleries don't contain a clean device-shot. Either Commons / NASA coverage is genuinely thin, or every available file is a logo, infographic, artist concept, or people-only shot. Action needed: drop a curated direct image URL (agency archive or known-good Commons filename) per entry.\n\n`;
    md += `| Entry | Name | Agency | Reason |\n|---|---|---|---|\n`;
    for (const f of flagged) md += `| ${f.id} | ${f.name} | ${f.agency} | ${f.reason} |\n`;
  }
  await writeFile(REPORT, md);

  console.log(`\nAuto-swapped: ${swaps.length}`);
  console.log(`Flagged for human curation: ${flagged.length}`);
  console.log(`Report: docs/provenance/fleet-hero-audit.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
