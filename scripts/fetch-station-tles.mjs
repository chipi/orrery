#!/usr/bin/env node
// Refresh the station TLEs (#404) from Celestrak into the served /data overlay
// static/data/station-tles.json. This is the ONLY code that fetches Celestrak;
// the browser never does (H4c · #464). Run server-side in two places, the same
// pipeline launches use: daily on main by .github/workflows/refresh-station-tles.yml
// (bot-commit) and every 6h on the prod VPS by ops/refresh-prod-data.sh (live
// overlay, no redeploy). The app prefers the fresh served copy at runtime; the
// build-baked import (stations.ts) is the offline/MCP fallback, whose age
// iss-pass discloses via epochAgeDays (H5).
//
// Fails soft: a fetch/parse error for one station leaves its previous entry
// intact rather than blanking it.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../static/data/station-tles.json', import.meta.url));
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
