// Badge-candidate finder — for every mission + fleet asset without a badge,
// resolve its Wikipedia article and read the infobox `insignia`/`logo`
// field (the official mission patch / emblem), then look that file up on
// Wikimedia Commons for its direct URL + licence. Emits a review file; a
// human hand-picks/verifies before it lands in badge-sources.json.
//
// The Wikipedia infobox `insignia=` parameter IS the canonical mission
// patch — far more reliable than Commons full-text search (which surfaces
// hardware photos and false "patch" matches). This is the sanctioned way
// to discover badge URLs; never web-search or guess.
//
//   node scripts/search-badge-candidates.mjs            # missions + fleet
//   node scripts/search-badge-candidates.mjs fleet
//   node scripts/search-badge-candidates.mjs missions
//
// Writes /tmp/badge-candidates.json and prints a compact table.

import { readFileSync, writeFileSync } from 'node:fs';

const WP = 'https://en.wikipedia.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const UA = 'OrreryBadgeSourcer/1.0 (https://github.com/chipi/orrery; educational)';
const THROTTLE_MS = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OK_LICENSE = /public domain|^pd|cc0|cc[ -]?by|creative commons|attribution/i;
const BAD_LICENSE = /all rights reserved|fair use|non-free/i;

async function getJSON(base, params) {
  const url = base + '?' + new URLSearchParams({ ...params, format: 'json', origin: '*' });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// Best Wikipedia article title for a name (+agency hint), following the
// spaceflight sense.
async function resolveArticle(name, agency) {
  const j = await getJSON(WP, {
    action: 'query',
    list: 'search',
    srsearch: `${name} ${agency} spacecraft mission`,
    srlimit: '1',
  });
  return j?.query?.search?.[0]?.title || name;
}

function cleanFile(raw) {
  if (!raw) return null;
  let v = raw.trim();
  v = v.replace(/^\[\[/, '').replace(/\]\]$/, '');
  v = v.split('|')[0].trim();
  v = v.replace(/^(File|Image):/i, '').trim();
  if (!/\.(svg|png|jpe?g|webp)$/i.test(v)) return null;
  return v;
}

// Pull insignia/logo file from the article infobox.
async function insigniaFromArticle(title) {
  const j = await getJSON(WP, {
    action: 'parse',
    page: title,
    prop: 'wikitext',
    redirects: '1',
  });
  const wt = j?.parse?.wikitext || j?.parse?.wikitext?.['*'] || '';
  const text = typeof wt === 'string' ? wt : wt['*'] || '';
  for (const field of ['insignia', 'logo', 'mission_logo', 'patch']) {
    const m = text.match(new RegExp('\\|\\s*' + field + '\\s*=\\s*([^\\n|]+)', 'i'));
    const f = m && cleanFile(m[1]);
    if (f) return { file: f, field };
  }
  return null;
}

// Commons imageinfo + licence for a File name.
async function commonsInfo(file) {
  const j = await getJSON(COMMONS, {
    action: 'query',
    titles: 'File:' + file,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '240',
  });
  const pages = j?.query?.pages ? Object.values(j.query.pages) : [];
  const ii = pages[0]?.imageinfo?.[0];
  if (!ii) return null;
  const meta = ii.extmetadata || {};
  const license = (meta.LicenseShortName?.value || meta.License?.value || '').trim();
  const artist = (meta.Artist?.value || '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 50);
  return {
    file,
    license: license || '(unknown)',
    usable: OK_LICENSE.test(license) && !BAD_LICENSE.test(license),
    artist,
    descriptionurl: ii.descriptionurl,
    url: ii.url,
    thumburl: ii.thumburl,
  };
}

async function findFor(entity) {
  try {
    const title = await resolveArticle(entity.name, entity.agency);
    await sleep(THROTTLE_MS);
    const ins = await insigniaFromArticle(title);
    if (!ins) return { article: title, hit: null };
    await sleep(THROTTLE_MS);
    const info = await commonsInfo(ins.file);
    return { article: title, hit: info ? { ...info, field: ins.field } : null };
  } catch {
    return { article: null, hit: null };
  }
}

async function main() {
  const which = process.argv[2] || 'both';
  const badges = JSON.parse(readFileSync('static/data/badges.json', 'utf8'));
  const have = new Set(Object.keys(badges));

  const targets = [];
  if (which === 'missions' || which === 'both') {
    const idx = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'));
    const names = JSON.parse(readFileSync('/tmp/mission-names.json', 'utf8'));
    for (const m of idx) {
      if (have.has(`mission:${m.id}`)) continue;
      targets.push({
        kind: 'mission',
        id: m.id,
        name: names[m.id] || m.id,
        agency: m.agency || '',
      });
    }
  }
  if (which === 'fleet' || which === 'both') {
    const flt = JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8'));
    const CATS = new Set([
      'observatory',
      'station',
      'rover',
      'crewed-spacecraft',
      'cargo-spacecraft',
      'orbiter',
      'lander',
      'launcher',
    ]);
    for (const f of flt) {
      if (have.has(`fleet:${f.id}`)) continue;
      if (!CATS.has(f.category)) continue;
      targets.push({
        kind: 'fleet',
        id: f.id,
        name: f.name || f.id,
        agency: f.agency || '',
        category: f.category,
      });
    }
  }

  console.error(`Resolving insignia for ${targets.length} entities (${which})…`);
  const results = [];
  let done = 0;
  for (const t of targets) {
    const r = await findFor(t);
    if (r.hit) results.push({ ...t, ...r });
    done++;
    if (done % 15 === 0) console.error(`  …${done}/${targets.length} (${results.length} hits)`);
    await sleep(THROTTLE_MS);
  }

  writeFileSync('/tmp/badge-candidates.json', JSON.stringify(results, null, 2));
  const usable = results.filter((r) => r.hit.usable);
  console.error(
    `\n${results.length}/${targets.length} have an infobox insignia; ${usable.length} with a usable (PD/CC) licence.`,
  );
  console.log('\n=== USABLE (PD/CC) ===');
  for (const r of results.filter((r) => r.hit.usable))
    console.log(`${(r.kind + ':' + r.id).padEnd(26)} ${r.hit.file.padEnd(42)} [${r.hit.license}]`);
  console.log('\n=== FOUND but licence needs a manual check ===');
  for (const r of results.filter((r) => !r.hit.usable))
    console.log(`${(r.kind + ':' + r.id).padEnd(26)} ${r.hit.file.padEnd(42)} [${r.hit.license}]`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
