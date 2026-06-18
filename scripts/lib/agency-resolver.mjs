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
import { scoreRelevance } from './relevance-gate.mjs';

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

// ──────────────────────────────────────────────────────────────────────
// Per-pick dedup (Slice A v3 / Stage 2 diversification)
//
// Tonight's v2 apply landed because the resolver returns top-1 per
// scraper — so 6 OTV missions all received the same Hubble photo, 3
// Vostok missions all received the same Vostok image, etc. The fix is
// to dedupe across slots AND across missions within a single dry-run
// pass: a candidate that's already been picked for ANY (mission, slot)
// is skipped, falling through to the next candidate or the next tier.
//
// Each scraper takes ctx.alreadyTaken (a Set) and skips candidates
// whose `takenKey(source_type, asset_id)` is already in it. The picker
// adds the chosen key to the set so subsequent calls see it. Reset by
// the caller per dry-run; the slice-a-dryrun.mjs script seeds an empty
// Set and reuses it across every (mission, slot) it resolves.
// ──────────────────────────────────────────────────────────────────────

export function takenKey(sourceType, assetId) {
  return `${sourceType}|${assetId}`;
}

/**
 * Walk a candidate list, return the first that passes the gate AND
 * isn't already taken. Updates `alreadyTaken` in place.
 *
 * @template T
 * @param {T[]} candidates  Pre-sorted by relevance/score (best first).
 * @param {(c: T) => boolean} gate
 * @param {(c: T) => string | null} keyOf   Returns null when the
 *   candidate has no stable id (skip dedup for that candidate).
 * @param {Set<string>} alreadyTaken
 * @returns {T | null}
 */
export function pickWithDedup(candidates, gate, keyOf, alreadyTaken) {
  for (const c of candidates) {
    const key = keyOf(c);
    if (key && alreadyTaken.has(key)) continue;
    if (!gate(c)) continue;
    if (key) alreadyTaken.add(key);
    return c;
  }
  return null;
}

async function fetchPrimary(primary, { mission, slot, query, alreadyTaken }, registry) {
  // Skip auto-disabled or excluded-license primaries up-front.
  if (!isLicenseAllowed(primary.license, registry)) return null;

  switch (primary.kind) {
    case 'json-api':
      if (primary.url.includes('images-api.nasa.gov')) {
        return await nasaImagesApi(primary, query, alreadyTaken);
      }
      return null;
    case 'wikimedia-category':
      return await wikimediaCategoryLookup(primary, query, alreadyTaken);
    case 'flickr-album':
      // Try the public Flickr search HTML scraper first; fall back to
      // a curation file if the scraper returns nothing (e.g. Russian-
      // only Roscosmos titles failing the English-token gate).
      return (
        (await flickrPublicScrape(primary, query, alreadyTaken)) ??
        (await tryCuratedFallback(primary, { mission, slot }))
      );
    case 'scrape-mission-page':
    case 'scrape-press-release':
      // Per-source dispatcher: try a known scraper, then fall back to
      // the curation file (or null) if not implemented.
      if (primary.url.includes('esahubble.org')) {
        return (
          (await esahubbleScrape(primary, query, alreadyTaken)) ??
          (await tryCuratedFallback(primary, { mission, slot }))
        );
      }
      if (primary.url.includes('esa.int/ESA_Multimedia')) {
        return (
          (await esaMultimediaScrape(primary, query, alreadyTaken)) ??
          (await tryCuratedFallback(primary, { mission, slot }))
        );
      }
      if (primary.url.includes('sci.esa.int/web/')) {
        return (
          (await sciEsaIntScrape(primary, { mission, query }, alreadyTaken)) ??
          (await tryCuratedFallback(primary, { mission, slot }))
        );
      }
      return await tryCuratedFallback(primary, { mission, slot });
    default:
      return null;
  }
}

// ── Tier 1 primary: NASA Image and Video Library ──────────────────

async function nasaImagesApi(primary, query, alreadyTaken = new Set()) {
  const search =
    `${primary.url}?` +
    new URLSearchParams({
      q: query,
      media_type: 'image',
    });
  const res = await fetch(search, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const items = json?.collection?.items ?? [];
  const candidates = items
    .map((it) => {
      const d = it?.data?.[0] ?? {};
      return {
        nasa_id: d.nasa_id,
        title: d.title,
        secondary_creator: d.secondary_creator,
        center: d.center,
      };
    })
    .filter((x) => x.nasa_id && x.title);
  // Apply relevance gate — pick first un-taken candidate that passes.
  // Per-source threshold from registry (NASA = 0.5 loose; default 0.66).
  const threshold = primary.relevance_threshold;
  const usable = pickWithDedup(
    candidates,
    (c) => scoreRelevance({ title: c.title }, query, { threshold }).accepted,
    (c) => takenKey('nasa-image-library', c.nasa_id),
    alreadyTaken,
  );
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
    credit:
      (usable.secondary_creator || '').trim() ||
      (usable.center ? `NASA / ${usable.center}` : 'NASA'),
    license: 'pd-nasa',
    metadata: { nasa_id: usable.nasa_id, nasa_title: usable.title },
    tier: 1,
  };
}

// ── Tier 1 primary: Wikimedia category (e.g. grandfathered SpaceX) ──

async function wikimediaCategoryLookup(primary, query, alreadyTaken = new Set()) {
  // Search within a specific Commons category.
  const match = primary.url.match(/Category:([^?]+)/);
  if (!match) return null;
  const category = decodeURIComponent(match[1]);
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'categorymembers',
    cmtitle: `Category:${category}`,
    cmtype: 'file',
    cmlimit: '50',
    origin: '*',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const files = (json?.query?.categorymembers ?? []).map((m) => m.title.replace(/^File:/, ''));
  // Score by query-token match in filename
  const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = files
    .map((f) => ({
      f,
      score: queryTokens.reduce((s, t) => s + (f.toLowerCase().includes(t) ? 1 : 0), 0),
    }))
    .filter((x) => /\.(jpg|jpeg|png)$/i.test(x.f))
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0 || scored[0].score === 0) return null;
  // Apply relevance gate using the filename as a title proxy.
  const pickEntry = pickWithDedup(
    scored,
    (x) => scoreRelevance({ title: x.f }, query).accepted,
    (x) => takenKey('wikimedia-grandfathered', x.f),
    alreadyTaken,
  );
  if (!pickEntry) return null;
  const pick = pickEntry.f;
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

// ── Tier 1: esahubble.org scraper (Hubble CC BY 4.0 archive) ───────
// Two-step scrape: search page → image IDs (heic\d+\w?); per-ID
// detail page → title. Apply relevance gate to title. Image URL
// follows the predictable cdn.esahubble.org/archives/images/large/
// <id>.jpg pattern (verified live 2026-06-17). 5,507 CC BY 4.0
// images across Galaxies / Nebulae / Stars / Cosmology / Exoplanets
// / Quasars / Black Holes — primary Tier 1 for /explore celestial
// bodies. Boundary-case agency: Hubble is NASA/ESA joint; we credit
// `ESA/Hubble` per their attribution policy (esahubble.org/copyright/).

async function esahubbleScrape(primary, query, alreadyTaken = new Set()) {
  const searchUrl = `https://esahubble.org/images/?search=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const html = await res.text();

  // Extract heic IDs from /images/<id>/ links in search results
  const idMatches = [...html.matchAll(/\/images\/(heic\d{4}[a-z]?)\//g)];
  const seenIds = new Set();
  const candidates = [];
  for (const m of idMatches) {
    if (seenIds.has(m[1])) continue;
    seenIds.add(m[1]);
    candidates.push(m[1]);
    if (candidates.length >= 5) break; // cap parallel detail fetches
  }
  if (candidates.length === 0) return null;

  // Resolve titles by fetching detail pages in parallel.
  const detailFetches = candidates.map(async (id) => {
    const dRes = await fetch(`https://esahubble.org/images/${id}/`, {
      headers: { 'User-Agent': UA },
    });
    if (!dRes.ok) return null;
    const dHtml = await dRes.text();
    const titleMatch = dHtml.match(/<title>([^<|]+?)(?:\s*\|\s*ESA\/Hubble)?<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim()
      : null;
    return { id, title };
  });
  const details = (await Promise.all(detailFetches)).filter(Boolean);

  // Gate per candidate; pick first that passes AND isn't already taken.
  const threshold = primary.relevance_threshold;
  const usable = pickWithDedup(
    details,
    (d) => !!d.title && scoreRelevance({ title: d.title }, query, { threshold }).accepted,
    (d) => takenKey('esahubble', d.id),
    alreadyTaken,
  );
  if (!usable) return null;

  return {
    source_type: 'esahubble',
    source_url: `https://esahubble.org/images/${usable.id}/`,
    image_url: `https://cdn.esahubble.org/archives/images/large/${usable.id}.jpg`,
    credit: 'ESA/Hubble',
    license: 'cc-by-4.0',
    metadata: { hubble_id: usable.id, hubble_title: usable.title },
    tier: 1,
  };
}

// ── Tier 1: esa.int/ESA_Multimedia scraper ─────────────────────────
// Search ESA's central multimedia archive. CC BY 4.0. URLs follow
// the pattern /ESA_Multimedia/Images/<year>/<month>/<slug-with-
// underscores>. The slug is the title — gate against it directly.
// On a hit, fetch the detail page to extract the full-res image URL
// (the first /var/esa/storage/.../<filename>.jpg WITHOUT _card_medium).

async function esaMultimediaScrape(primary, query, alreadyTaken = new Set()) {
  const searchUrl = `https://www.esa.int/ESA_Multimedia/Search?Type=I&q=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const html = await res.text();

  const matches = [
    ...html.matchAll(/href="(\/ESA_Multimedia\/Images\/(\d{4})\/(\d{2})\/([^"/]+))"/g),
  ];
  const seen = new Set();
  const candidates = [];
  for (const m of matches) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    const slug = m[4].replace(/_/g, ' ');
    candidates.push({ url: m[1], slug });
    if (candidates.length >= 8) break;
  }
  if (candidates.length === 0) return null;

  // Gate against the slug-as-title, skipping anything already taken.
  const threshold = primary.relevance_threshold;
  const matched = pickWithDedup(
    candidates,
    (c) => scoreRelevance({ title: c.slug }, query, { threshold }).accepted,
    (c) => takenKey('esa-multimedia', c.url),
    alreadyTaken,
  );
  if (!matched) return null;

  // Fetch detail page to extract the full-res image URL.
  const detailRes = await fetch(`https://www.esa.int${matched.url}`, {
    headers: { 'User-Agent': UA },
  });
  if (!detailRes.ok) return null;
  const detailHtml = await detailRes.text();
  // The first /var/esa/storage/.../<filename>.jpg without _card_medium
  // is the full-size image; the rest are thumbnails for related items.
  const imgMatch = detailHtml.match(
    /(?:href|src)="(\/var\/esa\/storage\/images\/esa_multimedia\/images\/[^"]+?\.(?:jpg|jpeg|png))"/i,
  );
  if (!imgMatch) return null;
  const imageUrl = imgMatch[1].startsWith('http')
    ? imgMatch[1]
    : `https://www.esa.int${imgMatch[1]}`;

  return {
    source_type: 'esa-multimedia',
    source_url: `https://www.esa.int${matched.url}`,
    image_url: imageUrl,
    credit: 'ESA',
    license: 'cc-by-4.0',
    metadata: { esa_slug: matched.slug, esa_detail_url: matched.url },
    tier: 1,
  };
}

// ── Tier 1: sci.esa.int per-mission gallery scraper ────────────────
// ESA's Science portal hosts per-mission multimedia galleries that the
// general ESA_Multimedia search can't reliably surface. Registry URL
// carries a {mission} placeholder substituted at fetch time. CC BY 4.0.
//
// Page structure: gallery listing → child detail pages → full-res
// image at <a href="...detailFigure"> or in <meta property="og:image">.
// We sample the listing for image URLs directly to keep the call count
// down (one HTTP request per attempted mission).

async function sciEsaIntScrape(primary, { mission, query }, alreadyTaken = new Set()) {
  // Substitute {mission} placeholder with the slug. The registry URL
  // template is e.g. `https://sci.esa.int/web/{mission}/multimedia-gallery`.
  const url = primary.url.replace('{mission}', encodeURIComponent(mission));
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const html = await res.text();

  // Extract images from the gallery listing. sci.esa.int gallery images
  // live at relative path /documents/<id>/<id>/<filename>_<size>.jpg
  // where <size> is 200|625|1280|1920 (largest available varies by entry).
  // They appear as CSS background-image URLs in style attributes
  // (background-image:url(/documents/...)) — NOT plain <img src=>.
  // The CSS in this DOM is malformed (no closing paren) so terminate
  // on quote, semicolon, or end-of-attr instead of `)`.
  const imgRegex = /background-image:\s*url\((\/documents\/[^?"';)\s]+?)\.(?:jpg|jpeg|png)/gi;
  const seen = new Set();
  const candidates = [];
  let m;
  // Skip site chrome — logos, icons, theme assets, banners. The
  // gallery image URLs live under /var/scientific/storage/images/ or
  // /var/esa/storage/ (per-mission directories), never under
  // /o/esa-science-legacy-theme/ (the sitewide CSS/JS bundle path).
  const isChrome = (u) =>
    /\/o\/[^/]+(?:-theme|-legacy)\//i.test(u) ||
    /(?:logo|favicon|icon|footer|header|banner|sprite|share|social)/i.test(u);
  while ((m = imgRegex.exec(html)) !== null) {
    // Replace _<size>.jpg with _1280.jpg to fetch the largest readily
    // available variant. If 1280 doesn't exist the request 404s and we
    // fall back to the next candidate.
    let imgUrl = m[1].replace(/_\d{2,4}$/, '_1280') + '.jpg';
    if (seen.has(imgUrl)) continue;
    seen.add(imgUrl);
    if (!imgUrl.startsWith('http')) imgUrl = `https://sci.esa.int${imgUrl}`;
    if (isChrome(imgUrl)) continue;
    candidates.push(imgUrl);
    if (candidates.length >= 10) break;
  }
  if (candidates.length === 0) return null;

  // Walk listing in order, take the first un-taken candidate. The listing
  // is mission-scoped already so gating-by-title is unnecessary (and
  // unreliable — many listing items share generic alt-text); per-mission
  // URL is the relevance signal. Dedup keeps slot N from picking the same
  // gallery image as slot N-1.
  const picked = pickWithDedup(
    candidates,
    () => true,
    (c) => takenKey('sci-esa-int', c),
    alreadyTaken,
  );
  if (!picked) return null;
  return {
    source_type: 'sci-esa-int',
    source_url: url,
    image_url: picked,
    credit: 'ESA',
    license: 'cc-by-4.0',
    metadata: { sci_esa_gallery: url, sci_esa_query: query },
    tier: 1,
  };
}

// ── Tier 1: Flickr public-page scraper ─────────────────────────────
// No API key required — Flickr's API moved to paid tiers, but the
// public user-photostream HTML still embeds JSON model data with
// titles + thumbnail URLs we can parse. Roscosmos / ESA / SpaceX
// (grandfathered CC0 era) all expose this surface.

async function flickrPublicScrape(primary, query, alreadyTaken = new Set()) {
  // Extract user-path from primary.url. flickr.com/photos/<userPath>/
  const userMatch = primary.url.match(/flickr\.com\/photos\/([^/?]+)/);
  if (!userMatch) return null;
  const userPath = userMatch[1];

  // Use flickr.com/search/?user_id=<NSID>&text=... when the registry
  // entry carries an NSID. The user-photostream URL (?text=) does NOT
  // filter — it returns the cover/recent photos regardless of query.
  const searchUrl = primary.flickr_nsid
    ? `https://www.flickr.com/search/?user_id=${encodeURIComponent(primary.flickr_nsid)}&text=${encodeURIComponent(query)}`
    : `https://www.flickr.com/photos/${userPath}/?text=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const html = await res.text();

  // Photo URL pattern in the HTML: live.staticflickr.com/<server>/
  // <photo_id>_<secret>(_<size>).jpg. Exclude UI sprites + cover photos.
  const photoUrlRegex = /live\.staticflickr\.com\/(\d+)\/(\d+)_([a-z0-9]+)(?:_([a-z]))?\.jpg/g;
  // Titles in JSON model: "title":"Some Photo Name"
  const titleRegex = /"title":"([^"]{3,200})"/g;

  const photos = [];
  const seen = new Set();
  let m;
  while ((m = photoUrlRegex.exec(html)) !== null) {
    const [, server, id, secret] = m;
    if (seen.has(id)) continue;
    if (server === 'ap' || server === '285') continue; // ap=sprites, 285=cover
    seen.add(id);
    photos.push({ server, id, secret });
  }
  const titles = [];
  while ((m = titleRegex.exec(html)) !== null) {
    titles.push(m[1]);
  }

  // Pair photos to titles by position (Flickr's HTML lists them in
  // matching order — both are interleaved in the JSON model).
  const candidates = photos.map((p, i) => ({ ...p, title: titles[i] ?? '' }));
  if (candidates.length === 0) return null;

  // Apply relevance gate. Skipping Cyrillic-titled photos is OK —
  // we fall back to Commons after the gate filters everything out.
  const threshold = primary.relevance_threshold;
  const userPath2 = userPath; // capture for closure below
  const usable = pickWithDedup(
    candidates,
    (c) => scoreRelevance({ title: c.title }, query, { threshold }).accepted,
    (c) => takenKey(`${userPath2.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-flickr`, c.id),
    alreadyTaken,
  );
  if (!usable) return null;

  // Build full-res URL (_b = 1024px max in Flickr API). Original (_o)
  // requires the photo's originalsecret which isn't in public HTML.
  const image_url = `https://live.staticflickr.com/${usable.server}/${usable.id}_${usable.secret}_b.jpg`;
  const source_url = `https://www.flickr.com/photos/${userPath}/${usable.id}/`;
  // source_type tag is agency-specific so audit-image-source-order
  // can distinguish primary-via-Flickr from Commons-failover.
  const agencyTag = userPath.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    source_type: `${agencyTag}-flickr`,
    source_url,
    image_url,
    credit: primary.credit_default,
    license: primary.license ?? 'see_per_photo',
    metadata: { flickr_id: usable.id, flickr_user: userPath, flickr_title: usable.title },
    tier: 1,
  };
}

// ── Per-mission curated fallback (for scrape-kind primaries) ──────

async function tryCuratedFallback(primary, { mission, slot }) {
  // Look up curation file via canonical paths
  const curationCandidates = [
    `static/data/agency-archive-curations/${
      primary.url.includes('jaxa')
        ? 'jaxa'
        : primary.url.includes('esa.int') || primary.url.includes('esahubble')
          ? 'esa'
          : primary.url.includes('jhuapl')
            ? 'jhu-apl'
            : primary.url.includes('isro') || primary.url.includes('issdc')
              ? 'isro'
              : ''
    }.json`,
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

async function tryTier2(registry, query, ctx = {}) {
  for (const inst of registry.tier_2_institutional ?? []) {
    if (!isLicenseAllowed(inst.license, registry)) continue;
    if (inst.auto_fetch_disabled) continue;
    if (inst.requires_env_key && !process.env[inst.requires_env_key]) continue;

    let result = null;
    if (inst.id === 'smithsonian-openaccess') {
      result = await smithsonianSearch(inst, query, ctx);
    } else if (inst.id === 'nara-rg-255') {
      result = await naraRG255Search(inst, query, ctx.alreadyTaken);
    }
    if (result) return result;
  }
  return null;
}

async function naraRG255Search(inst, query, alreadyTaken = new Set()) {
  // NARA Catalog API v2. Requires api_key obtainable for free by email
  // Catalog_API@nara.gov. Without the key, this function silently
  // returns null so the resolver falls through to tier 3 Commons.
  // RG 255 is the NASA record group with 1M+ photos 1903-2011 across
  // 103 series (255-MG Mercury/Gemini, 255-AMP Apollo Manned Photos,
  // 255-STS Shuttle, 255-LO Lunar Orbiter, etc.).
  const apiKey = process.env.NARA_API_KEY;
  if (!apiKey) return null;
  const params = new URLSearchParams({
    q: query,
    recordGroupNumber: '255',
    typeOfMaterials: 'Photographs and other Graphic Materials',
    limit: '10',
  });
  const res = await fetch(`${inst.url}api/v2/records/search?${params}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json', 'x-api-key': apiKey },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const items = json?.body?.hits?.hits ?? json?.opaResponse?.results?.result ?? [];
  const usable = pickWithDedup(
    items,
    (it) => {
      const dat = it._source ?? it.description ?? it;
      if (!(dat?.naId && (dat?.digitalObjects?.[0]?.objectUrl || dat?.objects?.[0]?.file?.url)))
        return false;
      return scoreRelevance({ title: dat.title }, query).accepted;
    },
    (it) => {
      const dat = it._source ?? it.description ?? it;
      return dat?.naId ? takenKey('nara-rg-255', dat.naId) : null;
    },
    alreadyTaken,
  );
  if (!usable) return null;
  const dat = usable._source ?? usable.description ?? usable;
  const image_url = dat?.digitalObjects?.[0]?.objectUrl ?? dat?.objects?.[0]?.file?.url;
  return {
    source_type: 'nara-rg-255',
    source_url: `https://catalog.archives.gov/id/${encodeURIComponent(dat.naId)}`,
    image_url,
    credit: 'NASA via NARA Still Picture Branch (RG 255)',
    license: 'pd-usgov',
    metadata: {
      nara_naid: dat.naId,
      nara_title: dat.title,
      nara_series: dat.localIdentifier ?? dat.series,
    },
    tier: 2,
  };
}

async function smithsonianSearch(inst, query, ctx = {}) {
  // Smithsonian Open Access API requires api_key from api.data.gov.
  // DEMO_KEY works for low-volume dev/CI; production must set SI_API_KEY
  // env var. The `unit_code:NASM` strict filter doesn't work reliably;
  // adding NASM to the free-text query biases results to NASM items
  // without false-negative dropping.
  const apiKey = process.env.SI_API_KEY ?? 'DEMO_KEY';
  const params = new URLSearchParams({
    api_key: apiKey,
    q: `${query} NASM`,
    rows: '10',
  });
  const res = await fetch(`${inst.url}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const rows = json?.response?.rows ?? [];
  // Prefer NASM-unit + CC0 + has-real-media. unitCode lives on the row.
  // Per-source threshold (Smithsonian = 1.0 strict per registry).
  // Per-call seenIds (kept for back-compat) AND the broader alreadyTaken
  // (Stage 2 cross-mission dedup) both block re-pick — either signal
  // skips the row.
  const threshold = inst.relevance_threshold;
  const seenIds = ctx?.seenIds ?? new Set();
  const alreadyTaken = ctx?.alreadyTaken ?? new Set();
  const usable = pickWithDedup(
    rows,
    (r) => {
      if (r?.unitCode !== 'NASM') return false;
      if (seenIds.has(r.id)) return false;
      const media = r?.content?.descriptiveNonRepeating?.online_media?.media?.[0];
      if (!(media?.usage?.access === 'CC0' && media?.content)) return false;
      return scoreRelevance({ title: r.title }, query, { threshold }).accepted;
    },
    (r) => (r?.id ? takenKey('smithsonian-openaccess', r.id) : null),
    alreadyTaken,
  );
  if (!usable) return null;
  const media = usable.content.descriptiveNonRepeating.online_media.media[0];
  // Prefer the high-res JPEG resource over the IDS delivery service URL
  // (which may serve a transformed/scaled version).
  const hiResJpeg = (media.resources ?? []).find(
    (r) => r.label === 'High-resolution JPEG' || /jpe?g$/i.test(r.url ?? ''),
  );
  const image_url = hiResJpeg?.url ?? media.content;
  return {
    source_type: 'smithsonian-openaccess',
    source_url:
      usable.content?.descriptiveNonRepeating?.record_link ??
      `https://www.si.edu/object/${encodeURIComponent(usable.id)}`,
    image_url,
    credit: 'Smithsonian National Air and Space Museum',
    license: 'cc0',
    metadata: {
      smithsonian_id: usable.id,
      smithsonian_title: usable.title,
      smithsonian_unit: usable.unitCode,
    },
    tier: 2,
  };
}

// ── Tier 3: Wikimedia Commons failover ────────────────────────────

// Categories that prove a Commons file is space-related. Fix E from
// iteration 2 spot-check — title-gate alone accepts geographic name-
// collisions; verifying category membership catches what anti-tokens
// miss.
const COMMONS_SPACE_CATEGORIES = [
  // Generic space-domain
  'spacecraft',
  'space exploration',
  'space stations',
  'space station',
  'astronauts',
  'cosmonauts',
  'space suits',
  'spacesuit',
  'launch vehicles',
  'rocket',
  'rockets',
  'satellites',
  'satellite',
  'space probes',
  'space probe',
  // Agency catalogs
  'nasa',
  'esa',
  'roscosmos',
  'jaxa',
  'isro',
  'cnsa',
  'asi',
  'spacex',
  'blue origin',
  'northrop grumman',
  // US programs
  'apollo program',
  'mercury program',
  'gemini program',
  'skylab',
  'shuttle',
  'sts ',
  'mariner program',
  'voyager program',
  'pioneer program',
  'viking program',
  'space shuttle program',
  'orion ',
  // Soviet/Russian programs
  'vostok program',
  'voskhod program',
  'soyuz program',
  'mir space station',
  'salyut',
  'luna program',
  'venera',
  'mars program of the soviet union',
  // Chinese programs (Fix H — UAESA/ISRO/CNSA recovery)
  'shenzhou program',
  "chang'e program",
  "chang'e",
  'tianwen',
  'tiangong',
  'long march',
  // Indian programs
  'chandrayaan',
  'mangalyaan',
  'mars orbiter mission',
  'gaganyaan',
  // UAE / smaller national programs
  'emirates mars mission',
  'united arab emirates space',
  'beresheet',
  'israeli space',
  // Japanese mission-name fallback (in addition to JAXA)
  'hayabusa',
  'akatsuki',
  'kaguya',
  'slim',
  'ikaros',
  // ESA mission-name fallback
  'rosetta mission',
  'mars express',
  'venus express',
  'bepicolombo',
  'juice ',
  'solar orbiter',
  'gaia mission',
  'cluster ',
  // Planet / body-family categories (catches "Astronomy of Mars",
  // "Photographs of Mars from spacecraft" etc.)
  'mars exploration',
  'astronomy of mars',
  'photographs of mars',
  'moon exploration',
  'lunar exploration',
  'photographs of the moon',
  'venus exploration',
  'photographs of venus',
  'mercury exploration',
  'photographs of mercury',
  'jupiter exploration',
  'saturn exploration',
  'pluto',
  'kuiper belt',
  'asteroid',
  'comet',
  // ISS + station ops
  'iss',
  'international space station',
  'iss expedition',
  // Observatory + astronomy
  'astronomy',
  'observatories',
  'observatory',
  'telescopes',
  'telescope',
  'hubble space telescope',
  'james webb',
  'chandra x-ray',
];

async function commonsFileHasSpaceCategory(filename) {
  // One extra API call per Tier 3 candidate. Verifies the file's actual
  // categories include a space-related domain — catches cases where
  // the relevance gate accepted a title that shares proper-noun tokens
  // with geographic / non-mission Commons files.
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'categories',
    titles: `File:${filename}`,
    cllimit: '50',
    clshow: '!hidden',
    origin: '*',
  });
  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const pages = json?.query?.pages ?? {};
    const cats = [];
    for (const p of Object.values(pages)) {
      for (const c of p.categories ?? []) {
        cats.push((c.title || '').replace(/^Category:/, '').toLowerCase());
      }
    }
    return cats.some((cat) =>
      COMMONS_SPACE_CATEGORIES.some((sc) => cat === sc || cat.includes(sc) || sc.includes(cat)),
    );
  } catch {
    return null; // network error — fail-open (don't block)
  }
}

async function tier3CommonsFailover(registry, query, alreadyTaken = new Set()) {
  const t3 = registry.tier_3_failover;
  // Fix D — enrich Commons query with "spacecraft OR mission OR NASA OR
  // space" so search results are biased toward space content even before
  // the gate runs. Keeps the original query intact but adds a positive
  // disjunctive hint that Commons's search ranks accordingly.
  //
  // Fix I (2026-06-17) — skip enrichment for short queries (≤3 tokens).
  // For terse mission names like "Hope" or "Hope (EMM)" the "space"
  // term biases Commons toward Hubble (rank-1 page is "Space Telescope
  // Hope Diamond" et al.) and never reaches the real Hope-Probe pages.
  // Long queries already carry mission-specific tokens that out-rank the
  // generic disjunction, so they keep the enrichment.
  const tokenCount = query.trim().split(/\s+/).filter(Boolean).length;
  const enrichedQuery = tokenCount <= 3 ? query : `${query} (spacecraft OR mission OR space)`;
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: enrichedQuery + ' filetype:bitmap',
    srnamespace: '6',
    srlimit: '15',
    origin: '*',
  });
  const res = await fetch(`${t3.url}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const candidates = (json?.query?.search ?? []).map((r) => r.title.replace(/^File:/, ''));
  // Apply relevance gate + category check. Walk candidates in order,
  // take the first that BOTH passes the title gate AND has at least
  // one space-related category on its Commons file page. Fail-open
  // on network errors (category check returns null → accept the gate
  // decision alone).
  const threshold = t3.relevance_threshold;
  const photos = candidates.filter((c) => /\.(jpg|jpeg|png)$/i.test(c));
  let pick = null;
  for (const candidate of photos) {
    const key = takenKey('wikimedia-commons', candidate);
    if (alreadyTaken.has(key)) continue;
    if (!scoreRelevance({ title: candidate }, query, { threshold }).accepted) continue;
    const isSpace = await commonsFileHasSpaceCategory(candidate);
    if (isSpace === false) continue; // category-verified non-space; reject
    pick = candidate;
    alreadyTaken.add(key);
    break;
  }
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
  NASA: 'NASA',
  JPL: 'NASA',
  'NASA / JPL': 'NASA',
  'NASA-JPL': 'NASA',
  JAXA: 'JAXA',
  ESA: 'ESA',
  'JHU APL': 'JHU-APL',
  'Johns Hopkins APL': 'JHU-APL',
  APL: 'JHU-APL',
  ASI: 'ASI',
  CNSA: 'CNSA',
  Roscosmos: 'Roscosmos',
  ROSCOSMOS: 'Roscosmos',
  ISRO: 'ISRO',
  SpaceX: 'SpaceX',
  'Blue Origin': 'Blue Origin',
};

function agencyTiersFor(agencyStr) {
  const tokens = (agencyStr || '')
    .split(/[/,·&]/)
    .map((s) => s.trim())
    .filter(Boolean);
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
 *
 * @param {object} opts
 * @param {string} opts.mission
 * @param {string} opts.slot
 * @param {string} opts.agency
 * @param {string} opts.query
 * @param {Set<string>} [opts.seenIds]       Legacy per-call Smithsonian dedup set.
 * @param {Set<string>} [opts.alreadyTaken]  Dry-run-scoped dedup set across
 *   ALL scrapers and ALL (mission, slot) tuples. Created/owned by the
 *   caller (slice-a-dryrun.mjs) and passed in here. Keyed by
 *   `${source_type}|${asset_id}`. Mutated in place — any scraper that
 *   picks a candidate adds its key. Pass an empty Set the first time;
 *   reuse the same Set for every subsequent resolveAgencyImage call in
 *   the same dry-run so no two missions share an asset.
 */
export async function resolveAgencyImage({ mission, slot, agency, query, seenIds, alreadyTaken }) {
  const registry = loadRegistry();
  const tiers = agencyTiersFor(agency);
  // ctx threads call-scoped state (seenIds for legacy Smithsonian dedup,
  // alreadyTaken for the broader Stage 2 cross-source / cross-mission
  // dedup) down to resolver functions that need it.
  const taken = alreadyTaken ?? new Set();
  const ctx = { seenIds: seenIds ?? new Set(), alreadyTaken: taken };

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
        const result = await fetchPrimary(
          primary,
          { mission, slot, query, alreadyTaken: taken },
          registry,
        );
        if (result) return result;
      } catch (e) {
        console.error(`    [${agencyKey}/${primary.kind}] ${e.message}`);
      }
    }
  }

  // TIER 2 — institutional secondary (pass ctx for Smithsonian dedup)
  try {
    const result = await tryTier2(registry, query, ctx);
    if (result) {
      if (result.metadata?.smithsonian_id) ctx.seenIds.add(result.metadata.smithsonian_id);
      return result;
    }
  } catch (e) {
    console.error(`    [tier2] ${e.message}`);
  }

  // TIER 3 — Wikimedia Commons failover
  try {
    return await tier3CommonsFailover(registry, query, taken);
  } catch (e) {
    console.error(`    [tier3] ${e.message}`);
    return null;
  }
}
