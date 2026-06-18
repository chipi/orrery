#!/usr/bin/env node
// Vision-pass on slice-explore-dryrun.json — same pattern as
// slice-a-vision-pass.mjs but on the /explore proposal format.

import { readFileSync, writeFileSync } from 'fs';
import { judgeImage, isShippable } from './lib/vision-judge.mjs';

process.loadEnvFile?.();

const PATH = 'static/data/slice-explore-dryrun.json';
const data = JSON.parse(readFileSync(PATH, 'utf8'));

let passed = 0,
  flagged = 0,
  unsure = 0,
  skipped = 0;
for (const p of data.proposals) {
  if (!p.proposed) {
    skipped++;
    continue;
  }
  if (p.vision) {
    // already judged
    continue;
  }
  process.stderr.write(`  → ${p.surface}/${p.bodyId} (${p.proposed.metadata?.hubble_id ?? '?'})… `);
  try {
    const v = await judgeImage({
      imageUrl: p.proposed.image_url,
      missionId: p.bodyId,
      agency: 'ESA/Hubble',
      subjectDescription: p.query,
    });
    p.vision = v;
    p.ship_at_apply = isShippable(v);
    if (v.verdict === 'related') {
      passed++;
      process.stderr.write(`✓ related\n`);
    } else if (v.verdict === 'unrelated') {
      flagged++;
      process.stderr.write(`✗ unrelated — ${v.reason?.slice(0, 60)}\n`);
    } else {
      unsure++;
      process.stderr.write(`? unsure\n`);
    }
  } catch (e) {
    process.stderr.write(`✗ ${e.message}\n`);
    p.vision = { verdict: 'unsure', confidence: 0, reason: `error: ${e.message}` };
    // Fail closed on vision errors — caller can override via approval UI if needed.
    p.ship_at_apply = false;
    unsure++;
  }
  await new Promise((r) => setTimeout(r, 200));
}

writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`\n── vision pass ──`);
console.log(`  related:    ${passed}`);
console.log(`  unrelated:  ${flagged}`);
console.log(`  unsure:     ${unsure}`);
console.log(`  skipped:    ${skipped}`);
const willShip = data.proposals.filter((p) => p.ship_at_apply).length;
console.log(`  Will ship:  ${willShip}/${data.proposals.length} (requires related + confidence ≥ ${'0.9'})`);
