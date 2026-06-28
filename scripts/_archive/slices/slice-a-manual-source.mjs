#!/usr/bin/env node
/**
 * Slice A v3 manual-source helper. Two operations:
 *
 *   1. PROMOTIONS — apply an existing gallery slot's image to the hero
 *      slot (or another target slot). No new sourcing; just route the
 *      already-trusted upstream URL to a new disk path. Vision skipped.
 *
 *   2. SOURCING — resolveAgencyImage() with the current slot's identity
 *      seeded in alreadyTaken so the resolver returns a DIFFERENT
 *      candidate. Vision-judge each (v4.1 prompt). Survivors land in
 *      the dev UI for human approval.
 *
 * Output:
 *   - static/data/slice-a-manual-source-dryrun.json (apply.mjs picks up
 *     via its dryrun glob)
 *   - merged into static/data/slice-a-salvage-result.json so the dev UI
 *     surfaces them with manual_source_pass: true
 *
 * Proposal IDs use a stable `manual-<surface>-<mission>-<slot>` prefix
 * so they don't collide with existing salvage proposal_ids and any
 * decisions stay correctly attributed in slice-a-approvals.json.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... node scripts/slice-a-manual-source.mjs
 *   node scripts/slice-a-manual-source.mjs --skip-vision
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolveAgencyImage } from './lib/agency-resolver.mjs';
import { judgeImage, isShippable } from './lib/vision-judge.mjs';

process.loadEnvFile?.();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), 'true'];
  }),
);
const SKIP_VISION = args['skip-vision'] === 'true';

// ── PROMOTIONS ─────────────────────────────────────────────────────────
// Apply an already-trusted gallery slot's image URL to a new target slot
// (typically promoting to hero). No vision pass — the image is already
// approved for the source slot.
const PROMOTIONS = [
  { mission: 'juno', surface: 'missions', fromSlot: '02', toSlot: '01' },
  { mission: 'akatsuki', surface: 'fleet-galleries', fromSlot: '02', toSlot: '01' },
  { mission: 'lro', surface: 'fleet-galleries', fromSlot: '03', toSlot: '01' },
  { mission: 'dawn', surface: 'missions', fromSlot: '02', toSlot: '01' },
  { mission: 'phoenix', surface: 'missions', fromSlot: '03', toSlot: '01' },
  { mission: 'new-horizons', surface: 'missions', fromSlot: '02', toSlot: '01' },
  { mission: 'vostok-5', surface: 'missions', fromSlot: '02', toSlot: '01' },
  { mission: 'vostok-6', surface: 'missions', fromSlot: '02', toSlot: '01' },
];

// ── SOURCING ───────────────────────────────────────────────────────────
// Resolver finds a distinct candidate for each (mission, slot). Within
// a mission, alreadyTaken accumulates so all slots get different images.
const BACKLOG = [
  // Round-4 backlog dupe-fixes (slot 0X dupes slot 01)
  { mission: 'lunar-prospector', slot: '04', surface: 'fleet-galleries', agency: 'NASA' },
  { mission: 'maven', slot: '04', surface: 'fleet-galleries', agency: 'NASA' },
  { mission: 'dart', slot: '05', surface: 'missions', agency: 'NASA' },
  { mission: 'friendship-7', slot: '02', surface: 'missions', agency: 'NASA' },
  { mission: 'mercury-redstone-3', slot: '04', surface: 'missions', agency: 'NASA' },
  { mission: 'spirit', slot: '02', surface: 'missions', agency: 'NASA' },

  // Marko's bad-hero list (each gets a fresh hero candidate)
  { mission: 'slim', slot: '01', surface: 'missions', agency: 'JAXA' },
  { mission: 'dart', slot: '01', surface: 'missions', agency: 'NASA' },
  { mission: 'beresheet', slot: '01', surface: 'missions', agency: 'SpaceIL' },
  { mission: 'schiaparelli', slot: '01', surface: 'missions', agency: 'ESA' },
  { mission: 'change-3', slot: '01', surface: 'missions', agency: 'CNSA' },
  { mission: 'change-1', slot: '01', surface: 'missions', agency: 'CNSA' },
  { mission: 'messenger', slot: '01', surface: 'missions', agency: 'NASA' },
  { mission: 'vostok-2', slot: '01', surface: 'missions', agency: 'Roscosmos' },

  // Specific slot fixes (Marko called out particular gallery slots)
  { mission: 'clementine', slot: '05', surface: 'missions', agency: 'NASA' },
  { mission: 'giotto', slot: '05', surface: 'fleet-galleries', agency: 'ESA' },

  // smart-1 — "all gallery images are cars": slots 02-05
  { mission: 'smart-1', slot: '02', surface: 'fleet-galleries', agency: 'ESA' },
  { mission: 'smart-1', slot: '03', surface: 'fleet-galleries', agency: 'ESA' },
  { mission: 'smart-1', slot: '04', surface: 'fleet-galleries', agency: 'ESA' },
  { mission: 'smart-1', slot: '05', surface: 'fleet-galleries', agency: 'ESA' },

  // opportunity — bad hero AND bad gallery, all 5 slots
  { mission: 'opportunity', slot: '01', surface: 'missions', agency: 'NASA' },
  { mission: 'opportunity', slot: '02', surface: 'missions', agency: 'NASA' },
  { mission: 'opportunity', slot: '03', surface: 'missions', agency: 'NASA' },
  { mission: 'opportunity', slot: '04', surface: 'missions', agency: 'NASA' },
  { mission: 'opportunity', slot: '05', surface: 'missions', agency: 'NASA' },
];

const MISSION_SIDECAR = 'static/data/mission-image-sources.json';
const FLEET_SIDECAR = 'static/data/fleet-image-sources.json';
const SALVAGE_PATH = 'static/data/slice-a-salvage-result.json';
const MANUAL_DRYRUN_PATH = 'static/data/slice-a-manual-source-dryrun.json';

const missionSources = JSON.parse(readFileSync(MISSION_SIDECAR, 'utf8'));
const fleetSources = JSON.parse(readFileSync(FLEET_SIDECAR, 'utf8'));

function sidecarFor(surface) {
  return surface === 'fleet-galleries' ? fleetSources : missionSources;
}
function sidecarKeyFor(surface, mission, slot) {
  return surface === 'fleet-galleries' ? `${mission}/${slot}.jpg` : `${mission}/${slot}`;
}
function deriveQuery(missionId) {
  return missionId.replace(/-/g, ' ');
}

function identityFromSidecarEntry(entry) {
  if (!entry) return new Set();
  const out = new Set();
  if (entry.commons_file) out.add(`wikimedia-commons|${String(entry.commons_file).toLowerCase()}`);
  if (entry.nasa_id) out.add(`nasa-image-library|${entry.nasa_id}`);
  if (entry.image_url) {
    const m1 = entry.image_url.match(/images-assets\.nasa\.gov\/image\/([^/~]+)/);
    if (m1) out.add(`nasa-image-library|${m1[1]}`);
    const m2 = entry.image_url.match(/Special:FilePath\/([^?]+)/);
    if (m2) out.add(`wikimedia-commons|${decodeURIComponent(m2[1]).toLowerCase()}`);
  }
  return out;
}

const proposals = [];
const dryrunProposals = [];

// ── PROMOTIONS ────────────────────────────────────────────────────────
console.log(`\n── PROMOTIONS (${PROMOTIONS.length}) ──`);
for (const item of PROMOTIONS) {
  const sidecar = sidecarFor(item.surface);
  const fromKey = sidecarKeyFor(item.surface, item.mission, item.fromSlot);
  const fromEntry = sidecar[fromKey];
  const id = `manual-${item.surface}-${item.mission}-${item.toSlot}`;

  if (!fromEntry || !fromEntry.image_url) {
    console.log(`  ${item.mission}/${item.toSlot}: no source entry at ${fromKey} — SKIP`);
    proposals.push({
      proposal_id: id,
      agency: 'Manual',
      surface: item.surface,
      missionId: item.mission,
      slot: item.toSlot,
      query: deriveQuery(item.mission),
      currentSource: null,
      proposed: null,
      vision_v2: null,
      vision_v3: null,
      size_bytes: null,
      survivor: false,
      drop_reasons: [`manual-source: no source-slot sidecar entry at ${fromKey}`],
      notes: [
        `promotion: from ${item.surface}/${item.mission}/${item.fromSlot} → ${item.toSlot}, but source missing`,
      ],
      manual_source_pass: true,
      promotion: { from: item.fromSlot, to: item.toSlot },
    });
    continue;
  }

  const proposed = {
    source_type: fromEntry.source_type ?? 'wikimedia-commons',
    source_url: fromEntry.source_url ?? fromEntry.commons_url ?? fromEntry.image_url,
    image_url: fromEntry.image_url,
    credit: fromEntry.credit ?? 'Unknown',
    license: fromEntry.license ?? 'see_per_entry',
    metadata: {
      promotion_from: `${item.surface}/${item.mission}/${item.fromSlot}`,
      ...(fromEntry.commons_file ? { commons_file: fromEntry.commons_file } : {}),
      ...(fromEntry.nasa_id ? { nasa_id: fromEntry.nasa_id } : {}),
    },
    tier: 1,
  };

  console.log(
    `  ${item.mission}/${item.toSlot} ← promoted from ${item.fromSlot}: ${proposed.source_type}`,
  );

  const proposalShared = {
    proposal_id: id,
    agency: 'Manual-Promotion',
    surface: item.surface,
    missionId: item.mission,
    slot: item.toSlot,
    query: deriveQuery(item.mission),
    currentSource:
      sidecar[sidecarKeyFor(item.surface, item.mission, item.toSlot)]?.source_type ?? null,
    proposed,
    vision: null,
    ship_at_apply: true,
    manual_source_pass: true,
    promotion: { from: item.fromSlot, to: item.toSlot },
  };
  dryrunProposals.push(proposalShared);
  proposals.push({
    ...proposalShared,
    vision_v2: null,
    vision_v3: null,
    size_bytes: null,
    survivor: true,
    drop_reasons: [],
    notes: [`manual-source-pass: promotion from slot ${item.fromSlot}`],
  });
}

// ── SOURCING ──────────────────────────────────────────────────────────
console.log(`\n── SOURCING (${BACKLOG.length}) ──`);
// One alreadyTaken Set per mission so multi-slot sources within a mission
// pick distinct candidates.
const takenByMission = new Map();
function takenFor(mission, surface) {
  const k = `${surface}/${mission}`;
  let s = takenByMission.get(k);
  if (s) return s;
  s = new Set();
  // Seed with the mission's hero (slot 01) so resolver picks something else.
  const sc = sidecarFor(surface);
  const heroEntry = sc[sidecarKeyFor(surface, mission, '01')];
  for (const id of identityFromSidecarEntry(heroEntry)) s.add(id);
  takenByMission.set(k, s);
  return s;
}

for (const item of BACKLOG) {
  const id = `manual-${item.surface}-${item.mission}-${item.slot}`;
  const sidecar = sidecarFor(item.surface);
  const currentEntry = sidecar[sidecarKeyFor(item.surface, item.mission, item.slot)];
  // Seed with the slot's CURRENT identity so we get a different image.
  const alreadyTaken = takenFor(item.mission, item.surface);
  for (const eid of identityFromSidecarEntry(currentEntry)) alreadyTaken.add(eid);

  const query = deriveQuery(item.mission);
  console.log(`\n  ${item.mission}/${item.slot} (${item.surface}, ${item.agency})`);

  let result;
  try {
    result = await resolveAgencyImage({
      mission: item.mission,
      slot: item.slot,
      agency: item.agency,
      query,
      alreadyTaken,
    });
  } catch (e) {
    console.log(`    resolver: ${e.message}`);
    proposals.push({
      proposal_id: id,
      agency: item.agency,
      surface: item.surface,
      missionId: item.mission,
      slot: item.slot,
      query,
      currentSource: currentEntry?.source_type ?? null,
      proposed: null,
      vision_v2: null,
      vision_v3: null,
      size_bytes: null,
      survivor: false,
      drop_reasons: [`resolver-error: ${e.message}`],
      notes: ['manual-source-pass: resolver failed'],
      manual_source_pass: true,
    });
    continue;
  }

  if (!result) {
    console.log(`    resolver: no alternative found`);
    proposals.push({
      proposal_id: id,
      agency: item.agency,
      surface: item.surface,
      missionId: item.mission,
      slot: item.slot,
      query,
      currentSource: currentEntry?.source_type ?? null,
      proposed: null,
      vision_v2: null,
      vision_v3: null,
      size_bytes: null,
      survivor: false,
      drop_reasons: [`manual-source: no alternative via resolver`],
      notes: ['manual-source-pass: needs true hand sourcing'],
      manual_source_pass: true,
    });
    continue;
  }

  console.log(`    proposed: ${result.source_type} ← ${(result.image_url ?? '').slice(0, 80)}`);

  let vision = null;
  if (!SKIP_VISION) {
    vision = await judgeImage({
      imageUrl: result.image_url,
      missionId: item.mission,
      agency: item.agency,
      subjectDescription: query,
    });
    console.log(
      `    vision v4.1: ${vision.verdict} @ ${(vision.confidence ?? 0).toFixed(2)} — ${(vision.reason ?? '').slice(0, 80)}`,
    );
  }

  const survivor = !vision || isShippable(vision);
  const proposalShared = {
    proposal_id: id,
    agency: item.agency,
    surface: item.surface,
    missionId: item.mission,
    slot: item.slot,
    query,
    currentSource: currentEntry?.source_type ?? null,
    proposed: result,
    vision,
    ship_at_apply: !!vision && isShippable(vision),
    manual_source_pass: true,
  };
  dryrunProposals.push(proposalShared);
  proposals.push({
    ...proposalShared,
    vision_v2: vision,
    vision_v3: vision,
    size_bytes: null,
    survivor,
    drop_reasons: survivor
      ? []
      : [`vision: v=${vision?.verdict} c=${vision?.confidence?.toFixed(2)}`],
    notes: ['manual-source-pass: generated 2026-06-19'],
  });

  if (!SKIP_VISION) await new Promise((r) => setTimeout(r, 200));
}

// ── EMIT ─────────────────────────────────────────────────────────────
writeFileSync(
  MANUAL_DRYRUN_PATH,
  JSON.stringify(
    {
      agency: 'Manual-Source',
      surface: 'manual-source',
      generated_at: new Date().toISOString(),
      proposals: dryrunProposals,
    },
    null,
    2,
  ) + '\n',
);
console.log(`\nWrote ${MANUAL_DRYRUN_PATH} (${dryrunProposals.length} dryrun proposals)`);

const salvage = JSON.parse(readFileSync(SALVAGE_PATH, 'utf8'));
salvage.proposals = (salvage.proposals ?? []).filter((p) => !p.proposal_id?.startsWith('manual-'));
salvage.proposals.push(...proposals);
salvage.last_manual_source_pass_at = new Date().toISOString();
writeFileSync(SALVAGE_PATH, JSON.stringify(salvage, null, 2) + '\n');
console.log(`Merged ${proposals.length} manual-source proposals into ${SALVAGE_PATH}`);

const survivors = proposals.filter((p) => p.survivor).length;
console.log(`\nResult:`);
console.log(`  total proposals:    ${proposals.length}`);
console.log(`  vision-survived:    ${survivors}`);
console.log(`  promotions:         ${proposals.filter((p) => p.promotion).length}`);
console.log(`  refresh /dev/slice-a-review to label them`);
