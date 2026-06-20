#!/usr/bin/env node
/**
 * Smoke harness for the v3 vision-judge prompt + isShippable gate.
 *
 * Runs each fixture in scripts/__fixtures__/vision-known-bad.json through
 * judgeImage() and reports per-fixture verdict, confidence, and ship-decision.
 *
 * Pass condition: ≥ MIN_PASS_RATE of fixtures must be NOT shippable.
 * Default 0.8 — adjust if a flaky API call drops one fixture.
 *
 * Cost: ~$0.004 per run (10 fixtures × $0.0004 each via Claude Haiku 4.5).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=… node scripts/__smoke__/vision-judge-smoke.mjs
 *   node scripts/__smoke__/vision-judge-smoke.mjs --min-pass-rate=0.9
 */

import { readFileSync } from 'fs';
import { judgeImage, isShippable, MIN_SHIP_CONFIDENCE } from '../lib/vision-judge.mjs';

process.loadEnvFile?.();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), true];
  }),
);
const MIN_PASS_RATE = parseFloat(args['min-pass-rate'] ?? '0.8');
const THROTTLE_MS = parseInt(args.throttle ?? '200', 10);

const FIXTURES_PATH = 'scripts/__fixtures__/vision-known-bad.json';
const fx = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8'));

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('vision-judge-smoke: ANTHROPIC_API_KEY not set in env; refusing to fake a pass');
  process.exit(2);
}

console.log(
  `vision-judge-smoke: ${fx.fixtures.length} fixtures, ship gate = related + confidence ≥ ${MIN_SHIP_CONFIDENCE}`,
);
console.log(
  `vision-judge-smoke: target pass rate ≥ ${(MIN_PASS_RATE * 100).toFixed(0)}% of fixtures NOT shippable\n`,
);

const rows = [];
let blocked = 0;
let leaked = 0;

for (const f of fx.fixtures) {
  const v = await judgeImage({
    imageUrl: f.image_url,
    missionId: f.missionId,
    agency: f.agency,
    subjectDescription: f.subjectDescription,
  });
  const ships = isShippable(v);
  if (!ships) blocked++;
  else leaked++;
  const flag = ships ? '✗ LEAK' : '✓ block';
  const conf = (v.confidence ?? 0).toFixed(2);
  console.log(
    `  ${flag}  ${f.id.padEnd(36)}  v=${(v.verdict ?? '?').padEnd(9)}  c=${conf}   ${(v.reason ?? '').slice(0, 80)}`,
  );
  rows.push({
    fixture: f.id,
    mode: f.failure_mode,
    v2: `${f.v2_verdict}/${f.v2_confidence}`,
    v3_verdict: v.verdict,
    v3_confidence: v.confidence,
    ships,
    reason: v.reason,
  });
  await new Promise((r) => setTimeout(r, THROTTLE_MS));
}

const total = fx.fixtures.length;
const passRate = blocked / total;
console.log(
  `\nvision-judge-smoke: blocked ${blocked}/${total} (${(passRate * 100).toFixed(0)}%) — leaks ${leaked}`,
);

if (leaked > 0) {
  console.log('\nLeaked fixtures (the new gate let them through):');
  for (const r of rows.filter((x) => x.ships)) {
    console.log(`  - ${r.fixture}  v=${r.v3_verdict}  c=${r.v3_confidence}  — ${r.reason}`);
  }
}

if (passRate >= MIN_PASS_RATE) {
  console.log(
    `\nvision-judge-smoke: OK (pass rate ${(passRate * 100).toFixed(0)}% ≥ ${(MIN_PASS_RATE * 100).toFixed(0)}%)`,
  );
  process.exit(0);
}
console.error(
  `\nvision-judge-smoke: FAIL (pass rate ${(passRate * 100).toFixed(0)}% < ${(MIN_PASS_RATE * 100).toFixed(0)}%)`,
);
process.exit(1);
