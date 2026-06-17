// Agency-first image resolver — v2.
// Consumes static/data/agency-archives.json schema_version: 2.
//
// Resolver chain:
//   1. Tier 1 — agency primaries (multi-primary array per agency)
//   2. Tier 2 — institutional secondary (Smithsonian, NARA, USGS, ESO, ALSJ)
//   3. Tier 3 — Wikimedia Commons (failover only)
//
// Public API:
//   resolveAgencyImage({mission, slot, agency, query})
//     → { source_type, source_url, image_url, credit, license, metadata, tier }
//
// Tier-1 routing: for a `agency` string "ESA / NASA", split tokens, look
// up each, try all primaries of all agencies before tier 2.
//
// License gate: a primary marked `license` in the excluded list is
// silently skipped. An agency with `auto_fetch_disabled: true` (CNSA)
// has its primaries skipped entirely — that's a manual-permission flow.

import { readFileSync, existsSync } from 'fs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const REGISTRY_PATH = 'static/data/agency-archives.json';

let _registry = null;
const _curations = new Map();

function loadRegistry() {
  if (_registry) return _registry;
  _registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  return _registry;
}

function loadCuration(path) {
  if (_curations.has(path)) return _curations.get(path);
  if (!existsSync(path)) {
    _curations.set(path, null);
    return null;
  }
  _curations.set(path, JSON.parse(readFileSync(path, 'utf8')));
  return _curations.get(path);
}

function isLicenseAllowed(license, registry) {
  if (!license) return true; // unknown — permissive, let downstream decide
  const allowed = registry.license_compatibility?.allowed ?? [];
  const excluded = registry.license_compatibility?.excluded ?? [];
  if (excluded.includes(license)) return false;
  if (allowed.includes(license)) return true;
  // Anything else (see_per_source / see_per_photo / mixed / etc.) is
  // permissive — try it and let the actual fetch carry the license.
  return true;
}

// ── Primary dispatcher by `kind` ──────────────────────────────────

async function fetchPrimary(primary, { mission, slot, query }, registry) {
  // Skip auto-disabled or excluded-license primaries up-front.
  if (!isLicenseAllowed(primary.license, registry)) return null;

  switch (primary.kind) {
    case 'json-api':
      if (primary.url.includes('images-api.nasa.gov')) {
        return await nasaImagesApi(primary, query);
      }
      return null;
    case 'wikimedia-category':
      return await wikimediaCategoryLookup(primary, query);
    case 'flickr-album':
      // Real Flickr requires API auth or scraping. Stub: try curation
      // file fallback (per-mission verified URLs). Future: implement
      // Flickr photoset scraping.
      return await tryCuratedFallback(primary, { mission, slot });
    case 'scrape-mission-page':
    case 'scrape-press-release':
      // Generic scrape stub. Try curation fallback first; real HTML
      // scrape is future work.
      return await tryCuratedFallback(primary, { mission, slot });
    default:
      return null;
  }
}

// ── Tier 1 primary: NASA Image and Video Library ──────────────────

async function nasaImagesApi(primary, query) {
  const search = `${primary.url}?` + new URLSearchParams({
    q: query, media_type: 'image',
  });
  const res = await fetch(search, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const items = json?.collection?.items ?? [];
  const usable = items
    .map((it) => {
      const d = it?.data?.[0] ?? {};
      return { nasa_id: d.nasa_id, title: d.title, secondary_creator: d.secondary_creator, center: d.center };
    })
    .find((x) => x.nasa_id && x.title);
  if (!usable) return null;

  const assetRes = await fetch(
    `https://images-api.nasa.gov/asset/${encodeURIComponent(usable.nasa_id)}`,
    { headers: { 'User-Agent': UA } },
  );
  if (!assetRes.ok) return null;
  const assetJson = await assetRes.json();
  const links = (assetJson?.collection?.items ?? []).map((it) => it.href).filter(Boolean);
  const image_url =
    links.find((u) => /~orig\.(jpg|jpeg|png|tif)$/i.test(u)) ??
    links.find((u) => /~large\.(jpg|jpeg|png)$/i.test(u)) ??
    links.find((u) => /\.(jpg|jpeg|png)$/i.test(u));
  if (!image_url) return null;

  return {
    source_type: 'nasa-image-library',
    source_url: `https://images.nasa.gov/details/${encodeURIComponent(usable.nasa_id)}`,
    image_url,
    credit: (usable.secondary_creator || '').trim() || (usable.center ? `NASA / ${usable.center}` : 'NASA'),
    license: 'pd-nasa',
    metadata: { nasa_id: usable.nasa_id, nasa_title: usable.title },
    tier: 1,
  };
}

// ── Tier 1 primary: Wikimedia category (e.g. grandfathered SpaceX) ──

async function wikimediaCategoryLookup(primary, query) {
  // Search within a specific Commons category.
  const match = primary.url.match(/Category:([^?]+)/);
  if (!match) return null;
  const category = decodeURIComponent(match[1]);
  const params = new URLSearchParams({
    action: 'query', format: 'json', list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmtype: 'file', cmlimit: '50',
    origin: '*',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const files = (json?.query?.categorymembers ?? []).map((m) => m.title.replace(/^File:/, ''));
  // Score by query-token match in filename
  const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = files
    .map((f) => ({ f, score: queryTokens.reduce((s, t) => s + (f.toLowerCase().includes(t) ? 1 : 0), 0) }))
    .filter((x) => /\.(jpg|jpeg|png)$/i.test(x.f))
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0 || scored[0].score === 0) return null;
  const pick = scored[0].f;
  return {
    source_type: 'wikimedia-grandfathered-' + primary.license,
    source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(pick)}`,
    image_url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(pick)}?width=1600`,
    credit: 'agency original via Wikimedia Commons mirror',
    license: primary.license,
    metadata: { commons_file: pick, wikimedia_category: category },
    tier: 1,
  };
}

// ── Per-mission curated fallback (for scrape-kind primaries) ──────

async function tryCuratedFallback(primary, { mission, slot }) {
  // Look up curation file via canonical paths
  const curationCandidates = [
    `static/data/agency-archive-curations/${primary.url.includes('jaxa') ? 'jaxa' :
      primary.url.includes('esa.int') || primary.url.includes('esahubble') ? 'esa' :
      primary.url.includes('jhuapl') ? 'jhu-apl' :
      primary.url.includes('isro') || primary.url.includes('issdc') ? 'isro' :
      ''}.json`,
  ].filter((p) => !p.endsWith('/.json'));
  for (const path of curationCandidates) {
    const curation = loadCuration(path);
    if (!curation) continue;
    let entry = curation.missions?.[mission];
    while (entry?.alias_of && curation.missions[entry.alias_of]) {
      entry = curation.missions[entry.alias_of];
    }
    if (!entry || entry._verification_needed) continue;
    const slotEntry = entry.slots?.[slot];
    if (!slotEntry) continue;
    return {
      source_type: path.match(/curations\/([^.]+)\.json/)?.[1] ?? 'agency-curated',
      source_url: slotEntry.source_url ?? entry.primary_archive,
      image_url: slotEntry.image_url,
      credit: slotEntry.credit ?? entry.agency,
      license: slotEntry.license ?? primary.license ?? 'pd-other',
      metadata: { agency_archive: true, label: slotEntry.label },
      tier: 1,
    };
  }
  return null;
}

// ── Tier 2: institutional secondary ───────────────────────────────

async function tryTier2(registry, query) {
  for (const inst of registry.tier_2_institutional ?? []) {
    if (!isLicenseAllowed(inst.license, registry)) continue;
    if (inst.kind === 'json-api' && inst.id === 'smithsonian-openaccess') {
      const result = await smithsonianSearch(inst, query);
      if (result) return result;
    }
    // Other tier 2 sources (NARA / USGS / ESO / ALSJ) are scrape-kind
    // and require per-source scrapers. Stubs to be implemented as
    // practice-pass yield justifies.
  }
  return null;
}

async function smithsonianSearch(inst, query) {
  const params = new URLSearchParams({
    q: `${query} unit_code:NASM`, rows: '5',
  });
  const res = await fetch(`${inst.url}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const rows = json?.response?.rows ?? [];
  const usable = rows.find((r) => {
    const media = r?.content?.descriptiveNonRepeating?.online_media?.media?.[0];
    return media?.usage?.access === 'CC0' && media?.content;
  });
  if (!usable) return null;
  const media = usable.content.descriptiveNonRepeating.online_media.media[0];
  return {
    source_type: 'smithsonian-openaccess',
    source_url: usable.content?.descriptiveNonRepeating?.record_link,
    image_url: media.content,
    credit: usable.content?.descriptiveNonRepeating?.unit_code ?? 'Smithsonian / NASM',
    license: 'cc0',
    metadata: { smithsonian_id: usable.id, smithsonian_title: usable.title },
    tier: 2,
  };
}

// ── Tier 3: Wikimedia Commons failover ────────────────────────────

async function tier3CommonsFailover(registry, query) {
  const t3 = registry.tier_3_failover;
  const params = new URLSearchParams({
    action: 'query', format: 'json', list: 'search',
    srsearch: query + ' filetype:bitmap',
    srnamespace: '6', srlimit: '15',
    origin: '*',
  });
  const res = await fetch(`${t3.url}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const candidates = (json?.query?.search ?? []).map((r) => r.title.replace(/^File:/, ''));
  const pick = candidates.find((c) => /\.(jpg|jpeg)$/i.test(c)) ?? candidates.find((c) => /\.png$/i.test(c));
  if (!pick) return null;
  return {
    source_type: 'wikimedia-commons',
    source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(pick)}`,
    image_url: `${t3.filepath}/${encodeURIComponent(pick)}?width=1600`,
    credit: 'agency original via Wikimedia Commons mirror',
    license: 'cc-by-sa-or-pd',
    metadata: { commons_file: pick },
    tier: 3,
  };
}

// ── Agency token mapping ──────────────────────────────────────────

const AGENCY_ALIAS = {
  'NASA': 'NASA',
  'JPL': 'NASA',
  'NASA / JPL': 'NASA',
  'NASA-JPL': 'NASA',
  'JAXA': 'JAXA',
  'ESA': 'ESA',
  'JHU APL': 'JHU-APL',
  'Johns Hopkins APL': 'JHU-APL',
  'APL': 'JHU-APL',
  'ASI': 'ASI',
  'CNSA': 'CNSA',
  'Roscosmos': 'Roscosmos',
  'ROSCOSMOS': 'Roscosmos',
  'ISRO': 'ISRO',
  'SpaceX': 'SpaceX',
  'Blue Origin': 'Blue Origin',
};

function agencyTiersFor(agencyStr) {
  const tokens = (agencyStr || '').split(/[\/\,·&]/).map((s) => s.trim()).filter(Boolean);
  const ordered = [];
  for (const t of tokens) {
    const key = AGENCY_ALIAS[t];
    if (key && !ordered.includes(key)) ordered.push(key);
  }
  if (ordered.length === 0) ordered.push('NASA');
  return ordered;
}

// ── Public resolver ───────────────────────────────────────────────

/**
 * Resolve a single (mission, slot, agency, query) tuple. Tries tier 1
 * (per-agency primaries) → tier 2 (institutional) → tier 3 (Commons).
 * Returns the first successful resolution.
 */
export async function resolveAgencyImage({ mission, slot, agency, query }) {
  const registry = loadRegistry();
  const tiers = agencyTiersFor(agency);

  // TIER 1 — agency primaries
  for (const agencyKey of tiers) {
    const agencyEntry = registry.tier_1_agencies?.[agencyKey];
    if (!agencyEntry) continue;
    if (agencyEntry.auto_fetch_disabled) {
      console.error(`    [${agencyKey}] auto-fetch disabled (manual permission flow required)`);
      continue;
    }
    for (const primary of agencyEntry.primaries ?? []) {
      try {
        const result = await fetchPrimary(primary, { mission, slot, query }, registry);
        if (result) return result;
      } catch (e) {
        console.error(`    [${agencyKey}/${primary.kind}] ${e.message}`);
      }
    }
  }

  // TIER 2 — institutional secondary
  try {
    const result = await tryTier2(registry, query);
    if (result) return result;
  } catch (e) {
    console.error(`    [tier2] ${e.message}`);
  }

  // TIER 3 — Wikimedia Commons failover
  try {
    return await tier3CommonsFailover(registry, query);
  } catch (e) {
    console.error(`    [tier3] ${e.message}`);
    return null;
  }
}
