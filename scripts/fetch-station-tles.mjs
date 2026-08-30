#!/usr/bin/env node
// Refresh the bundled station TLEs (#404) from Celestrak into
// src/lib/physics/satellite/station-tles.json. Run daily by the "Refresh station TLEs"
// workflow; the CI deploy chain picks up any diff. Keeps the bundled fallback
// (used when the runtime Celestrak fetch is blocked) at most ~a day stale.
//
// Fails soft: a fetch/parse error for one station leaves its previous entry
// intact rather than blanking it.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(
  new URL('../src/lib/physics/satellite/station-tles.json', import.meta.url),
);
const CATNR = { iss: 25544, tiangong: 48274 };

const data = JSON.parse(readFileSync(OUT, 'utf8'));
let updated = 0;

for (const [id, catnr] of Object.entries(CATNR)) {
  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=TLE`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const lines = (await res.text())
      .trim()
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''));
    if (lines.length < 3 || !/^1 \d{5}/.test(lines[1]) || !/^2 \d{5}/.test(lines[2])) {
      throw new Error('unexpected response shape');
    }
    data[id] = { name: lines[0].trim(), line1: lines[1], line2: lines[2] };
    updated++;
    console.log(`✓ ${id} (${catnr}) — ${lines[0].trim()}`);
  } catch (err) {
    console.warn(`⚠ ${id} (${catnr}) kept previous — ${err.message}`);
  }
}

writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
console.log(`station TLEs: ${updated}/${Object.keys(CATNR).length} refreshed`);
