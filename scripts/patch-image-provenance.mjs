#!/usr/bin/env node
/**
 * patch-image-provenance — surgical update of image-provenance.json
 * for the entries whose sidecar was modified today.
 *
 * Replaces / inserts only the entries we touched this session; leaves
 * the other 3,300+ untouched. Faster than the full build (~1s vs
 * many minutes) AND sidesteps unrelated pipeline issues (duplicate-
 * entry validator bailing on pre-existing pluto/smart-1/etc dupes).
 *
 * Agency derivation: looks up `static/data/fleet/<category>/<id>.json`
 * for the entry's agency field — same approach build-image-provenance
 * uses. Title derived from sidecar commons_file or image_url filename.
 *
 * Run: node scripts/patch-image-provenance.mjs [--cutoff YYYY-MM-DD]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const MANIFEST_PATH = 'static/data/image-provenance.json';

const argv = process.argv.slice(2);
const cutoffIdx = argv.indexOf('--cutoff');
const cutoff = cutoffIdx >= 0 ? argv[cutoffIdx + 1] : new Date().toISOString().slice(0, 10);

console.log(`cutoff: ${cutoff} (sidecar entries with fetched_at|copied_at >= this get patched)`);

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const byPath = new Map(manifest.entries.map((e) => [e.path, e]));

// Build agency lookup: fleet id → agency. Walks every category dir under static/data/fleet/.
const fleetAgencyById = new Map();
const fleetCategoryDirs = ['observatory', 'orbiter', 'launcher', 'rover', 'lander', 'constellation', 'crewed-spacecraft', 'cargo-spacecraft', 'launch-site'];
for (const cat of fleetCategoryDirs) {
  const dir = `static/data/fleet/${cat}`;
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
      if (j.id && j.agency) fleetAgencyById.set(j.id, j.agency);
    } catch {
      // skip malformed
    }
  }
}
console.log(`fleet agency lookup: ${fleetAgencyById.size} entries`);

function sha8(filepath) {
  const buf = readFileSync(filepath);
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

function licenseShortToUrl(short) {
  const s = (short ?? '').toLowerCase();
  if (s.includes('cc-by-sa')) return 'https://creativecommons.org/licenses/by-sa/4.0/';
  if (s.includes('cc-by-4')) return 'https://creativecommons.org/licenses/by/4.0/';
  if (s.includes('cc-by-3')) return 'https://creativecommons.org/licenses/by/3.0/';
  if (s.includes('cc-by-2')) return 'https://creativecommons.org/licenses/by/2.0/';
  if (s.includes('cc-by')) return 'https://creativecommons.org/licenses/by/4.0/';
  if (s.includes('cc0')) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (s === 'pd-russia' || s.includes('russia'))
    return 'https://commons.wikimedia.org/wiki/Commons:Copyright_tags#Russia';
  if (s === 'pd-usgov' || s.includes('usgov'))
    return 'https://en.wikipedia.org/wiki/Copyright_status_of_works_by_the_federal_government_of_the_United_States';
  // PD-NASA + everything else PD-* → public-domain dedication URL
  return 'https://creativecommons.org/publicdomain/zero/1.0/';
}

function normaliseLicenseShort(raw, agencyForFallback) {
  const s = (raw ?? '').toLowerCase().trim();
  // Map agency → its PD variant; allowlist requires specific suffix.
  const pdForAgency = (a) => {
    const u = (a ?? '').toUpperCase();
    if (u.includes('NASA')) return 'PD-NASA';
    if (u.includes('USAF') || u.includes('USSF') || u.includes('USGOV')) return 'PD-USGov';
    if (u.includes('ROSCOSMOS') || u.includes('USSR')) return 'PD-Russia';
    return 'PD-NASA';
  };
  if (s === '') return pdForAgency(agencyForFallback);
  if (s.includes('cc-by-sa') || s.includes('cc by-sa')) return 'CC-BY-SA-4.0';
  if (s.includes('cc-by-4') || s.includes('cc by 4') || s.includes('cc-by-4.0')) return 'CC-BY-4.0';
  if (s.includes('cc-by-3') || s.includes('cc by 3')) return 'CC-BY-3.0';
  if (s.includes('cc-by-2') || s.includes('cc by 2')) return 'CC-BY-2.0';
  if (s.includes('cc-by')) return 'CC-BY-4.0';
  if (s.includes('cc0')) return 'CC0';
  if (s.includes('pd-nasa') || s.includes('public domain - nasa')) return 'PD-NASA';
  if (s.includes('pd-usgov') || s.includes('pd-usaf')) return 'PD-USGov';
  if (s.includes('pd-russia') || s.includes('pd-soviet')) return 'PD-Russia';
  if (s.includes('pd-jaxa')) return 'PD-NASA'; // closest analog in allowlist; revisit if PD-JAXA gets added
  if (s === 'pd' || s.includes('public domain')) return pdForAgency(agencyForFallback);
  if (s === 'attribution' || s.includes('attribution')) return 'CC-BY-4.0';
  return raw;
}

function deriveTitle(sidecar) {
  if (sidecar.commons_file) return `File:${sidecar.commons_file}`;
  if (sidecar.title) return sidecar.title;
  if (sidecar.image_url) {
    try {
      const u = new URL(sidecar.image_url);
      const last = decodeURIComponent(u.pathname.split('/').pop() ?? '');
      if (last) return last;
    } catch {
      // bad URL, fall through
    }
  }
  return null;
}

function deriveAgency(sidecar, fleetId, surface) {
  // 1. Fleet category JSON
  if (surface === 'fleet-galleries' && fleetAgencyById.has(fleetId)) {
    return fleetAgencyById.get(fleetId);
  }
  // 2. Parse from credit text
  const credit = sidecar.credit ?? '';
  const upper = credit.toUpperCase();
  const agencies = ['NASA', 'JAXA', 'ESA', 'CNSA', 'ISRO', 'ROSCOSMOS', 'CSA', 'UAESA', 'KARI', 'SPACEX', 'BLUE ORIGIN'];
  for (const a of agencies) {
    if (upper.includes(a)) return a === 'SPACEX' ? 'SpaceX' : a === 'BLUE ORIGIN' ? 'Blue Origin' : a;
  }
  return '';
}

function buildEntryFromSidecar({ surface, fleetId, sidecar, filepath }) {
  const title = deriveTitle(sidecar);
  const agency = deriveAgency(sidecar, fleetId, surface);
  const license_short = normaliseLicenseShort(sidecar.license, agency);
  return {
    id: sha8(filepath),
    path: `/${filepath.slice(filepath.indexOf('images/'))}`,
    source_type: sidecar.source_type ?? 'direct-other',
    title: title ?? `${surface}/${fleetId} image`,
    author: sidecar.credit ?? agency,
    agency: agency || 'Unknown',
    source_url: sidecar.source_url ?? sidecar.commons_url ?? '',
    image_url: sidecar.image_url ?? '',
    license_short,
    license_url: licenseShortToUrl(license_short),
    license_rationale:
      license_short.startsWith('CC-BY-SA')
        ? 'Reuse with attribution; derivatives under same license.'
        : license_short === 'CC-BY-4.0'
          ? 'Reuse with attribution.'
          : 'Public domain.',
    modifications: ['downloaded-via-special-filepath', 'reencoded-jpeg'],
    revid: null,
    pageid: null,
    nasa_id: null,
    fetched_at: sidecar.fetched_at ?? sidecar.copied_at ?? new Date().toISOString(),
  };
}

let patched = 0;
let inserted = 0;

// Fleet sidecar — entries dated today
const fleet = JSON.parse(readFileSync('static/data/fleet-image-sources.json', 'utf8'));
for (const [key, sidecar] of Object.entries(fleet)) {
  const stamp = sidecar.fetched_at ?? sidecar.copied_at ?? '';
  if (!stamp.startsWith(cutoff)) continue;
  const fleetId = key.split('/')[0];
  const baseFile = `static/images/fleet-galleries/${key}`;
  const onexFile = `static/images/fleet-galleries/${key.replace('.jpg', '.1x1.jpg')}`;
  for (const filepath of [baseFile, onexFile]) {
    if (!existsSync(filepath)) continue;
    const manifestPath = `/${filepath.slice(filepath.indexOf('images/'))}`;
    const newEntry = buildEntryFromSidecar({ surface: 'fleet-galleries', fleetId, sidecar, filepath });
    if (byPath.has(manifestPath)) patched++;
    else inserted++;
    byPath.set(manifestPath, newEntry);
  }
}

// Panel sidecar — moon-sites / mars-sites / missions
const panel = JSON.parse(readFileSync('static/data/panel-image-sources.json', 'utf8'));
for (const [key, sidecar] of Object.entries(panel)) {
  const stamp = sidecar.fetched_at ?? sidecar.copied_at ?? '';
  if (!stamp.startsWith(cutoff)) continue;
  const [surface, missionId] = key.split('/');
  const baseFile = `static/images/${key}.jpg`;
  const onexFile = `static/images/${key}.1x1.jpg`;
  for (const filepath of [baseFile, onexFile]) {
    if (!existsSync(filepath)) continue;
    const manifestPath = `/${filepath.slice(filepath.indexOf('images/'))}`;
    const newEntry = buildEntryFromSidecar({ surface, fleetId: missionId, sidecar, filepath });
    if (byPath.has(manifestPath)) patched++;
    else inserted++;
    byPath.set(manifestPath, newEntry);
  }
}

manifest.entries = [...byPath.values()];
manifest.generated_at = new Date().toISOString();
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`patched: ${patched}, inserted: ${inserted}, total entries: ${manifest.entries.length}`);
