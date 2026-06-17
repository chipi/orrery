#!/usr/bin/env node
// Slice /explore — esahubble.org dry-run on planets, small-bodies, sun.
// Hubble OPAL imagery is iconic for outer-planet weather + Saturn rings,
// and the Hubble archive carries 30y of solar / small-body coverage.
//
// Calls the existing agency-resolver with agency='ESA' (triggers
// esahubble.org as Tier 1 primary) for each celestial body id. Output
// is a per-slot proposal JSON consumed by slice-explore-vision.mjs +
// slice-explore-apply.mjs.

import { readFileSync, writeFileSync } from 'fs';
import { resolveAgencyImage } from './lib/agency-resolver.mjs';

process.loadEnvFile?.();

// Per-surface query map. Body ids are the directory names under
// static/images/<surface>/. Query is what gets sent to esahubble.
// Hubble's sweet spot: outer planets (OPAL programme), bright comets,
// Pluto, Ceres, Ganymede/Europa close-passes. Inner planets less so.
const TARGETS = [
  { surface: 'planets', id: 'mercury', query: 'Mercury planet' },
  { surface: 'planets', id: 'venus', query: 'Venus planet' },
  { surface: 'planets', id: 'mars', query: 'Mars planet' },
  { surface: 'planets', id: 'jupiter', query: 'Jupiter Great Red Spot' },
  { surface: 'planets', id: 'saturn', query: 'Saturn rings' },
  { surface: 'planets', id: 'uranus', query: 'Uranus rings' },
  { surface: 'planets', id: 'neptune', query: 'Neptune storm' },
  { surface: 'planets', id: 'pluto', query: 'Pluto dwarf planet' },
  { surface: 'planets', id: 'earth', query: 'Earth from space' },
  { surface: 'small-bodies', id: '67p', query: '67P Churyumov-Gerasimenko comet' },
  { surface: 'small-bodies', id: 'halley', query: 'Halley comet' },
  { surface: 'small-bodies', id: 'ceres', query: 'Ceres dwarf planet' },
  { surface: 'small-bodies', id: 'eris', query: 'Eris dwarf planet' },
  { surface: 'small-bodies', id: 'haumea', query: 'Haumea dwarf planet' },
  { surface: 'small-bodies', id: 'makemake', query: 'Makemake dwarf planet' },
  { surface: 'small-bodies', id: 'oumuamua', query: 'Oumuamua interstellar' },
  { surface: 'small-bodies', id: 'pluto', query: 'Pluto dwarf planet' },
  { surface: 'sun', id: 'sun', query: 'Sun corona' },
];

const out = {
  agency: 'ESA-Hubble',
  surface: '/explore',
  generated_at: new Date().toISOString(),
  proposals: [],
};

for (const t of TARGETS) {
  process.stderr.write(`  → ${t.surface}/${t.id} q="${t.query}"… `);
  try {
    const result = await resolveAgencyImage({
      mission: t.id,
      slot: '01',
      agency: 'ESA',
      query: t.query,
      seenIds: new Set(),
    });
    if (result && result.source_type === 'esahubble') {
      out.proposals.push({
        surface: t.surface,
        bodyId: t.id,
        slot: '01',
        query: t.query,
        proposed: result,
      });
      process.stderr.write(`✓ ${result.metadata?.hubble_id ?? '?'}\n`);
    } else if (result) {
      process.stderr.write(`✗ resolver returned ${result.source_type} (not esahubble) — skip\n`);
      out.proposals.push({
        surface: t.surface,
        bodyId: t.id,
        slot: '01',
        query: t.query,
        proposed: null,
        reason: `non-esahubble: ${result.source_type}`,
      });
    } else {
      process.stderr.write(`✗ no esahubble hit\n`);
      out.proposals.push({
        surface: t.surface,
        bodyId: t.id,
        slot: '01',
        query: t.query,
        proposed: null,
        reason: 'no hit',
      });
    }
  } catch (e) {
    process.stderr.write(`✗ ${e.message}\n`);
    out.proposals.push({
      surface: t.surface,
      bodyId: t.id,
      slot: '01',
      query: t.query,
      proposed: null,
      reason: e.message,
    });
  }
  await new Promise((r) => setTimeout(r, 300));
}

writeFileSync('static/data/slice-explore-dryrun.json', JSON.stringify(out, null, 2) + '\n');
const hits = out.proposals.filter((p) => p.proposed).length;
console.log(`\n── /explore esahubble dry-run ──`);
console.log(`  ${hits}/${TARGETS.length} esahubble candidates`);
console.log(`  Next: scripts/slice-explore-vision.mjs → scripts/slice-explore-apply.mjs`);
