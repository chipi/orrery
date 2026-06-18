#!/usr/bin/env node
// Vision-judge pass — runs Claude Haiku on the proposals JSON from an
// already-completed slice-a-dryrun. Decouples resolver work (slow,
// ~5 min) from vision work (slow, ~10 min for 350 calls) so each can
// be re-run independently.
//
// Usage:
//   node scripts/slice-a-vision-pass.mjs --input=static/data/slice-a-nasa-dryrun.json
//   node scripts/slice-a-vision-pass.mjs --agency=NASA   # canonical path
//   node scripts/slice-a-vision-pass.mjs --agency=Roscosmos
//
// Reads input JSON, appends `vision: {verdict, confidence, reason}`
// per proposal where `proposed.image_url` exists. Writes back to the
// same file. Skipped proposals (no image url) get vision=null.
//
// Idempotent: re-running re-judges every proposal (so call counts go
// up). Use --skip-judged to only judge entries that don't have a
// vision verdict yet (resume after interrupt).

import { readFileSync, writeFileSync } from 'fs';
import { judgeImage, isShippable } from './lib/vision-judge.mjs';

process.loadEnvFile?.();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), true];
  }),
);

const inputPath =
  args.input ??
  (args.agency
    ? `static/data/slice-a-${args.agency.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-dryrun.json`
    : null);
if (!inputPath) {
  console.error(
    'usage: slice-a-vision-pass.mjs --agency=NASA  (or --input=<path>) [--skip-judged] [--throttle=150] [--limit=N]',
  );
  process.exit(2);
}
const skipJudged = !!args['skip-judged'];
const THROTTLE = args.throttle ? parseInt(args.throttle, 10) : 150;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;

const data = JSON.parse(readFileSync(inputPath, 'utf8'));
const proposals = data.proposals;
console.log(`Vision pass — ${inputPath}`);
console.log(`Proposals: ${proposals.length} | skip-judged=${skipJudged} throttle=${THROTTLE}ms\n`);

const stats = { passed: 0, flagged: 0, unsure: 0, skipped: 0 };
let judgedCount = 0;

for (let i = 0; i < proposals.length; i++) {
  const p = proposals[i];
  if (!p.proposed?.image_url) {
    p.vision = null;
    stats.skipped++;
    continue;
  }
  if (skipJudged && p.vision?.verdict) {
    stats.skipped++;
    continue;
  }
  if (judgedCount >= LIMIT) break;

  const result = await judgeImage({
    imageUrl: p.proposed.image_url,
    missionId: p.missionId,
    agency: p.agency,
    subjectDescription: p.query,
  });
  p.vision = result;
  // Requires 'related' + confidence ≥ MIN_SHIP_CONFIDENCE (see vision-judge.mjs).
  // 'unsure' and sub-0.9 'related' both block apply but stay visible to the
  // human approval UI for manual override.
  p.ship_at_apply = isShippable(result);

  if (result.verdict === 'related') stats.passed++;
  else if (result.verdict === 'unrelated') stats.flagged++;
  else stats.unsure++;

  judgedCount++;
  if (judgedCount % 25 === 0) {
    console.log(`  …${judgedCount} judged  (✓${stats.passed} ✗${stats.flagged} ?${stats.unsure})`);
  }
  await new Promise((r) => setTimeout(r, THROTTLE));
}

// Update top-level totals
data.totals = data.totals ?? {};
data.totals.vision_passed = stats.passed;
data.totals.vision_flagged = stats.flagged;
data.totals.vision_unsure = stats.unsure;

writeFileSync(inputPath, JSON.stringify(data, null, 2) + '\n');

console.log('\n── vision pass result ──');
console.log(`  Passed (related):    ${stats.passed}`);
console.log(`  Flagged (unrelated): ${stats.flagged}`);
console.log(`  Unsure:              ${stats.unsure}`);
console.log(`  Skipped:             ${stats.skipped}`);
console.log(`  Total judged:        ${judgedCount}`);
console.log(`\nUpdated: ${inputPath}`);
const shipCount = proposals.filter((p) => p.ship_at_apply).length;
console.log(
  `Will ship at apply:    ${shipCount} (${((shipCount / proposals.length) * 100).toFixed(0)}%)`,
);
console.log(`Held by vision flag:   ${stats.flagged}`);
