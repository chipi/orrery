// Multi-source badge finder for the entities the infobox/Wikidata pass
// missed. Web search for badges is authorized (see fetch-badges.ts header).
// Tries, in order, per entity:
//   1. NASA image library (images-api.nasa.gov) — PD, good for insignia.
//   2. Wikimedia Commons category members of the entity's article — the
//      emblem file is usually filed there under a "... logo/insignia" name.
// Emits candidates (title-filtered to real emblems + free licence) to
// /tmp/gap-multisource.json for human hand-pick.
//
//   node scripts/search-badge-multisource.mjs /tmp/gaps-remaining.json

import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'orrery-badge-fetch/1.0 (https://github.com/chipi/orrery; educational)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OK = /public domain|^pd|cc0|cc[ -]?by|creative commons|attribution|godl/i;
const BAD = /all rights reserved|fair use|non-free/i;
const EMBLEM = /insignia|patch|emblem|logo|mission mark|crest/i;
// reject obvious non-emblem graphics
const NOT_EMBLEM =
  /photo|photograph|selfie|rover on|surface|nebula|galaxy|map of|diagram|model|launch of|assembly/i;

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// NASA image library — returns {title,url,license:'Public domain'} candidates.
async function nasaSearch(name) {
  const j = await getJSON(
    'https://images-api.nasa.gov/search?media_type=image&q=' +
      encodeURIComponent(name + ' insignia patch logo'),
  );
  const items = (j?.collection?.items || []).slice(0, 8);
  const nameWords = new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const out = [];
  for (const it of items) {
    const d = it.data?.[0] || {};
    const title = d.title || '';
    if (!EMBLEM.test(title) || NOT_EMBLEM.test(title)) continue;
    // require a name-word in the title so "STS-71 insignia" doesn't match "Juno"
    const tw = title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/);
    if (![...tw].some((w) => nameWords.has(w))) continue;
    const nasaId = d.nasa_id;
    if (!nasaId) continue;
    // full-res asset lives in the item's collection.json
    let assetUrl = it.links?.[0]?.href || null;
    try {
      const coll = await getJSON(it.href);
      const orig =
        (coll || []).find((u) => /~orig\.(png|jpg|jpeg|tif)/i.test(u)) || (coll || [])[0];
      if (orig) assetUrl = orig;
    } catch {
      /* keep thumbnail */
    }
    if (assetUrl)
      out.push({
        src: 'nasa',
        title,
        license: 'Public domain',
        url: assetUrl,
        descriptionurl: `https://images.nasa.gov/details-${nasaId}`,
        author: d.center || 'NASA',
      });
    await sleep(200);
  }
  return out;
}

// Commons category members of an article-named category.
async function commonsCategory(article) {
  const j = await getJSON(
    'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' +
      encodeURIComponent('Category:' + article) +
      '&cmtype=file&cmlimit=200&format=json&origin=*',
  );
  const files = (j?.query?.categorymembers || [])
    .map((m) => m.title)
    .filter((t) => EMBLEM.test(t) && !NOT_EMBLEM.test(t));
  const out = [];
  for (const file of files.slice(0, 4)) {
    try {
      const info = await getJSON(
        'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
          encodeURIComponent(file) +
          '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=240&format=json&origin=*',
      );
      const ii = Object.values(info?.query?.pages || {})[0]?.imageinfo?.[0];
      if (!ii) continue;
      const lic = (ii.extmetadata?.LicenseShortName?.value || '').trim();
      if (!OK.test(lic) || BAD.test(lic)) continue;
      out.push({
        src: 'commons-cat',
        title: file.replace(/^File:/, ''),
        license: lic,
        url: ii.url,
        descriptionurl: ii.descriptionurl,
        author: (ii.extmetadata?.Artist?.value || '')
          .replace(/<[^>]+>/g, '')
          .trim()
          .slice(0, 50),
      });
      await sleep(200);
    } catch {
      /* skip */
    }
  }
  return out;
}

async function main() {
  const gaps = JSON.parse(readFileSync(process.argv[2] || '/tmp/gaps-remaining.json', 'utf8'));
  const results = [];
  let done = 0;
  for (const g of gaps) {
    const cands = [];
    try {
      cands.push(...(await nasaSearch(g.name)));
    } catch {
      /* */
    }
    await sleep(250);
    if (!cands.length) {
      try {
        cands.push(...(await commonsCategory(g.name)));
      } catch {
        /* */
      }
    }
    if (cands.length) {
      results.push({ ...g, candidates: cands });
      console.log(
        `${(g.kind + ':' + g.id).padEnd(24)} ${cands.length} — ${cands.map((c) => c.title.slice(0, 34) + ' [' + c.license + ']').join(' | ')}`,
      );
    }
    done++;
    if (done % 25 === 0) console.error(`  …${done}/${gaps.length} (${results.length} with hits)`);
    await sleep(250);
  }
  writeFileSync('/tmp/gap-multisource.json', JSON.stringify(results, null, 2));
  console.error(`\n${results.length}/${gaps.length} entities got a candidate.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
