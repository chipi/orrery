// Agency-first image resolver — single source of truth for the
// source-resolution order codified in scripts/IMAGE-PIPELINE.md
// §"Source-resolution order".
//
// Public API:
//   resolveAgencyImage({mission, slot, agency, query})
//     → { source_type, source_url, image_url, credit, license, metadata }
//
// Resolver order (registry/agency-archives.json):
//   1. NASA Image and Video Library     (json-api)
//   2. NASA / JPL Photojournal           (scrape, future)
//   3. JAXA                              (hybrid scrape + curated)
//   4. ESA                               (hybrid scrape + curated)
//   5. JHU APL                           (hybrid scrape + curated)
//   6. ASI / CNSA / Roscosmos / ISRO / SpaceIL  (curated-only)
//   7. Wikimedia Commons                 (failover — json-api)
//
// `agency` selects which tiers are EVEN TRIED. A JAXA-tagged mission
// goes: JAXA curated → JAXA scrape → Commons. It does NOT try NASA
// because the mission's primary is JAXA. A NASA mission goes: NASA
// images-api → Commons. A multi-agency mission (DART = NASA+JHU APL)
// tries both NASA and JHU APL before Commons.

import { readFileSync, existsSync } from 'fs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const REGISTRY_PATH = 'static/data/agency-archives.json';

// Lazy-loaded singletons.
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
  const data = JSON.parse(readFileSync(path, 'utf8'));
  _curations.set(path, data);
  return data;
}

// ── Tier 1: NASA Image and Video Library ──────────────────────────

async function nasaResolve(query) {
  const reg = loadRegistry().agencies['NASA'];
  const searchUrl = `${reg.endpoints.search}?` + new URLSearchParams({
    q: query, media_type: 'image',
  });
  const res = await fetch(searchUrl, { headers: { 'User-Agent': UA } });
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
    `${reg.endpoints.asset}/${encodeURIComponent(usable.nasa_id)}`,
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
    credit: (usable.secondary_creator || '').trim() ||
            (usable.center ? `NASA / ${usable.center}` : reg.credit_default),
    license: reg.license_default,
    metadata: { nasa_id: usable.nasa_id, nasa_title: usable.title },
  };
}

// ── Tiers 3-6: hybrid scrape + curated (per agency) ───────────────

async function curatedLookup(agency, mission, slot) {
  const reg = loadRegistry().agencies[agency];
  if (!reg?.curation_file) return null;
  const curation = loadCuration(reg.curation_file);
  if (!curation) return null;
  let entry = curation.missions?.[mission];
  // Follow alias_of pointer (e.g. hayabusa1 → hayabusa)
  while (entry?.alias_of && curation.missions[entry.alias_of]) {
    entry = curation.missions[entry.alias_of];
  }
  if (!entry || entry._verification_needed) return null;
  const slotEntry = entry.slots?.[slot];
  if (!slotEntry) return null;
  return {
    source_type: agency.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    source_url: slotEntry.source_url ?? entry.primary_archive,
    image_url: slotEntry.image_url,
    credit: slotEntry.credit ?? reg.credit_default,
    license: slotEntry.license ?? reg.license_default,
    metadata: { agency_archive: true, label: slotEntry.label },
  };
}

// Scrape kind is reserved for future implementation. Each agency
// site needs its own selector hint; until that lands, hybrid agencies
// fall through to the curated tier.
async function scrapeLookup(agency, mission, slot, query) {
  // Reserved. Returns null today; future implementation will fetch
  // the agency mission gallery, parse <img src>, score by query/slot
  // label match.
  return null;
}

// ── Tier 7: Wikimedia Commons failover ────────────────────────────

async function commonsResolve(query) {
  const reg = loadRegistry().agencies['WIKIMEDIA_COMMONS_FAILOVER'];
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: query + ' filetype:bitmap',
    srnamespace: '6',
    srlimit: '15',
    origin: '*',
  });
  const res = await fetch(`${reg.endpoints.search}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const candidates = (json?.query?.search ?? []).map((r) => r.title.replace(/^File:/, ''));
  const pick =
    candidates.find((c) => /\.(jpg|jpeg)$/i.test(c)) ??
    candidates.find((c) => /\.png$/i.test(c));
  if (!pick) return null;
  return {
    source_type: 'wikimedia-commons',
    source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(pick)}`,
    image_url: `${reg.endpoints.filepath}/${encodeURIComponent(pick)}?width=1600`,
    credit: reg.credit_default,
    license: reg.license_default,
    metadata: { commons_file: pick },
  };
}

// ── Public resolver ───────────────────────────────────────────────

/**
 * Resolve a single (mission, slot, agency, query) tuple to an image
 * source descriptor. Tries tiers in agency-appropriate order, stops
 * at the first hit.
 *
 * @param {{mission: string, slot: string, agency: string, query: string}} opts
 * @returns {Promise<{source_type, source_url, image_url, credit, license, metadata} | null>}
 */
export async function resolveAgencyImage({ mission, slot, agency, query }) {
  const reg = loadRegistry();
  // Normalise agency string ("NASA / JPL" → tries "NASA" first if /JPL fails)
  const tiersForAgency = agencyTiers(agency, reg);

  for (const tier of tiersForAgency) {
    try {
      let result;
      if (tier === 'NASA') {
        result = await nasaResolve(query);
      } else if (tier === 'WIKIMEDIA_COMMONS_FAILOVER') {
        result = await commonsResolve(query);
      } else if (reg.agencies[tier]) {
        // Hybrid agencies: scrape first (if implemented), curated fallback.
        result = (await scrapeLookup(tier, mission, slot, query))
              ?? (await curatedLookup(tier, mission, slot));
      }
      if (result) return result;
    } catch (e) {
      console.error(`    [${tier}] ${e.message}`);
    }
  }
  return null;
}

/**
 * Decide which agency tiers to consult for a given mission's agency
 * attribution. Multi-agency missions (e.g. DART = NASA + JHU APL) try
 * BOTH primary agencies before falling to Commons.
 */
function agencyTiers(agencyStr, reg) {
  const tokens = (agencyStr || '').split(/[\/\,&]/).map((s) => s.trim()).filter(Boolean);
  const ordered = [];
  // Map common aliases to canonical registry keys
  const ALIAS = {
    'NASA': 'NASA',
    'JPL': 'NASA / JPL',
    'NASA / JPL': 'NASA / JPL',
    'NASA-JPL': 'NASA / JPL',
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
    'SpaceIL': 'SpaceIL',
  };
  for (const t of tokens) {
    const key = ALIAS[t];
    if (key && reg.agencies[key] && !ordered.includes(key)) {
      ordered.push(key);
    }
  }
  // Default to NASA if no recognised tokens (legacy mission catalogs)
  if (ordered.length === 0) ordered.push('NASA');
  // Commons is always the last failover
  ordered.push('WIKIMEDIA_COMMONS_FAILOVER');
  return ordered;
}
