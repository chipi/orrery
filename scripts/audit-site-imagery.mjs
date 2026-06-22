#!/usr/bin/env node
/**
 * audit-site-imagery — Phase B audit for /earth /moon /mars detail
 * panels. Walks every site across moon-sites, mars-sites, earth-objects.
 * For each site, checks own per-site imagery vs the mission and fleet
 * fallbacks the data loader already implements (getMoonSiteGallery,
 * getMarsSiteGallery, getEarthObjectGallery — all chain own → mission
 * → fleet today).
 *
 * Produces a single audit JSON at /tmp/site-image-audit.json with one
 * row per site, categorising each into:
 *   - KEEP_OWN          own slot 01 ≥ 100KB — leave it
 *   - KEEP_OWN_LOWQ     own 30–100KB — medium, leave for Marko's eye
 *   - DELETE_OWN_USE_MISSION  own < 30KB AND mission ≥ 100KB
 *   - DELETE_OWN_USE_FLEET    own < 30KB AND no mission AND fleet ≥ 100KB
 *   - FALLBACK_OK       no own, mission or fleet has imagery — no action
 *   - HAND_SOURCE       no good option anywhere — Marko sources
 *
 * Does NOT mutate disk. Read-only audit.
 *
 * Run: node scripts/audit-site-imagery.mjs
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';

const STRONG_BYTES = 100_000;
const WEAK_BYTES = 30_000;
const IMG_ROOT = 'static/images';

function siteOwnHero(surface, id) {
  const p = `${IMG_ROOT}/${surface}/${id}/01.jpg`;
  if (!existsSync(p)) return { exists: false, size: 0 };
  return { exists: true, size: statSync(p).size };
}

function missionHero(missionId) {
  const p = `${IMG_ROOT}/missions/${missionId}/01.jpg`;
  if (!existsSync(p)) return { exists: false, size: 0 };
  return { exists: true, size: statSync(p).size };
}

function fleetHero(id) {
  const variants = [id, id.replace(/-/g, ''), id.replace(/-/g, '_')];
  for (const v of [...new Set(variants)]) {
    const p = `${IMG_ROOT}/fleet-galleries/${v}/01.jpg`;
    if (existsSync(p)) {
      return { exists: true, size: statSync(p).size, id: v };
    }
  }
  return { exists: false, size: 0 };
}

function ownSlotCount(surface, id) {
  const dir = `${IMG_ROOT}/${surface}/${id}`;
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(
    (f) => f.endsWith('.jpg') && !/\.(1x1|4x3|16x9)\.jpg$/.test(f),
  ).length;
}

function categorise(own, mission, fleet) {
  const ownStrong = own.exists && own.size >= STRONG_BYTES;
  const ownWeak = own.exists && own.size < WEAK_BYTES;
  const missionStrong = mission.exists && mission.size >= STRONG_BYTES;
  const fleetStrong = fleet.exists && fleet.size >= STRONG_BYTES;
  if (ownStrong) return 'KEEP_OWN';
  if (!own.exists) {
    if (missionStrong || fleetStrong) return 'FALLBACK_OK';
    return 'HAND_SOURCE';
  }
  if (ownWeak && missionStrong) return 'DELETE_OWN_USE_MISSION';
  if (ownWeak && !mission.exists && fleetStrong) return 'DELETE_OWN_USE_FLEET';
  if (ownWeak) return 'HAND_SOURCE';
  return 'KEEP_OWN_LOWQ';
}

function processSurface(surface, sites, missionIdField = 'mission_id') {
  return sites.map((s) => {
    const missionId = s[missionIdField] ?? s.id;
    const own = siteOwnHero(surface, s.id);
    const mission = missionHero(missionId);
    const fleet = fleetHero(s.id);
    const cat = categorise(own, mission, fleet);
    return {
      surface,
      id: s.id,
      name: s.name ?? s.id,
      mission_id: missionId,
      own_exists: own.exists,
      own_size_kb: own.exists ? Math.round(own.size / 1024) : null,
      own_slot_count: ownSlotCount(surface, s.id),
      mission_exists: mission.exists,
      mission_size_kb: mission.exists ? Math.round(mission.size / 1024) : null,
      fleet_exists: fleet.exists,
      fleet_size_kb: fleet.exists ? Math.round(fleet.size / 1024) : null,
      fleet_match_id: fleet.id ?? null,
      category: cat,
    };
  });
}

const moonSites = JSON.parse(readFileSync('static/data/moon-sites.json', 'utf8'));
const marsSites = JSON.parse(readFileSync('static/data/mars-sites.json', 'utf8'));
const earthObjs = JSON.parse(readFileSync('static/data/earth-objects.json', 'utf8'));

const audit = [
  ...processSurface('moon-sites', moonSites),
  ...processSurface('mars-sites', marsSites),
  ...processSurface('earth-objects', earthObjs),
];

const byCategory = {};
for (const row of audit) {
  byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
}
const summary = {
  total: audit.length,
  by_category: byCategory,
  by_surface_x_category: {},
};
for (const row of audit) {
  const k = `${row.surface}/${row.category}`;
  summary.by_surface_x_category[k] = (summary.by_surface_x_category[k] ?? 0) + 1;
}

writeFileSync('/tmp/site-image-audit.json', JSON.stringify({ summary, audit }, null, 2));
console.log('Summary:');
console.log(' total sites:', summary.total);
console.log(' by category:');
for (const [cat, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${cat.padEnd(28)} ${n}`);
}
console.log('\n by surface × category:');
for (const [k, n] of Object.entries(summary.by_surface_x_category).sort()) {
  console.log(`   ${k.padEnd(40)} ${n}`);
}
console.log('\n→ full audit at /tmp/site-image-audit.json');
