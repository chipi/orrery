/**
 * fetch-badges — the sanctioned sourcing path for program / mission / fleet
 * BADGES (insignia + patches). PRD-029.
 *
 * Badges are a distinct artifact from gallery imagery: the image-vision pass
 * deliberately rejects mission patches as tangential content, so galleries
 * never carry them. This tool sources them from a curated, web-sourced
 * manifest (per Marko 2026-07-11, web search is authorized for badges),
 * downloads each into static/images/badges/{programs|missions|fleet}/{id}.<ext>,
 * writes provenance (badge-provenance.json), and a lookup map (badges.json)
 * the /programs pages consume. Marko reviews the fetched set and prunes.
 *
 * Manifest:  static/data/badge-sources.json
 * Run:       npx tsx scripts/fetch-badges.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Wikimedia requires a descriptive User-Agent + polite rate (they 429 fast).
const UA = 'orrery-badge-fetch/1.0 (https://github.com/chipi/orrery; marko.dragoljevic@gmail.com)';
const THROTTLE_MS = 1800;
const BADGE_PX = 256; // badges render as small icons; 256px is ample
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MANIFEST = 'static/data/badge-sources.json';
const MASTERS_ROOT = 'masters/badges'; // LFS — full-res originals, never discarded
const IMG_ROOT = 'static/images/badges'; // derived display webp
const PROV = 'static/data/badge-provenance.json';
const MAP = 'static/data/badges.json';

const DIR_BY_KIND: Record<string, string> = {
  program: 'programs',
  mission: 'missions',
  fleet: 'fleet',
};

interface BadgeSource {
  kind: 'program' | 'mission' | 'fleet';
  id: string;
  name: string;
  image_url: string;
  source_url: string;
  author: string;
  license_short: string;
  license_url: string | null;
}

async function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`[badges] no manifest at ${MANIFEST}`);
    process.exit(1);
  }
  const sources: BadgeSource[] = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const prov: unknown[] = [];
  const map: Record<string, string> = {};
  let ok = 0;
  let fail = 0;

  for (const s of sources) {
    const dir = DIR_BY_KIND[s.kind];
    if (!dir) {
      console.error(`[badges] unknown kind '${s.kind}' for ${s.id}`);
      fail++;
      continue;
    }
    // Everything normalizes to a small webp icon regardless of source format.
    const rel = `badges/${dir}/${s.id}.webp`;
    const outPath = path.join(IMG_ROOT, dir, `${s.id}.webp`);
    try {
      const res = await fetch(s.image_url, { headers: { 'User-Agent': UA } });
      if (!res.ok) {
        console.error(`[badges] FAIL ${s.id}: HTTP ${res.status}`);
        fail++;
        await sleep(THROTTLE_MS);
        continue;
      }
      const raw = Buffer.from(await res.arrayBuffer());
      // Preserve the full-res original in masters/ (LFS) — same masters→derived
      // pattern as the rest of the image pipeline; the display webp is resized
      // from it, the master is never discarded.
      const origExt = (s.image_url.match(/\.(png|svg|jpg|jpeg|webp)(?:\?|$)/i)?.[1] ?? 'png').toLowerCase();
      const masterPath = path.join(MASTERS_ROOT, dir, `${s.id}.${origExt}`);
      fs.mkdirSync(path.dirname(masterPath), { recursive: true });
      fs.writeFileSync(masterPath, raw);
      const buf = await sharp(raw)
        .resize(BADGE_PX, BADGE_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      map[`${s.kind}:${s.id}`] = `/images/${rel}`;
      prov.push({
        path: `/images/${rel}`,
        source_type: 'wikimedia-commons',
        title: `${s.name} insignia`,
        author: s.author,
        agency: 'NASA',
        source_url: s.source_url,
        image_url: s.image_url,
        license_short: s.license_short,
        license_url: s.license_url,
        artifact: 'badge',
      });
      console.log(`[badges] OK  ${s.kind}:${s.id} -> ${outPath} (${buf.length} bytes)`);
      ok++;
    } catch (err) {
      console.error(`[badges] FAIL ${s.id}: ${(err as Error).message}`);
      fail++;
    }
    await sleep(THROTTLE_MS);
  }

  fs.writeFileSync(PROV, JSON.stringify(prov, null, 2) + '\n');
  fs.writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n');
  console.log(`[badges] done — ${ok} ok, ${fail} failed. Provenance -> ${PROV}, map -> ${MAP}`);
  if (fail > 0) process.exitCode = 1;
}

main();
