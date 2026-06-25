import fs from 'node:fs';
import path from 'node:path';

/**
 * Build V1 Moon rover-traverse polylines (#361 follow-on), mirroring the
 * Mars `mars-traverses/<rover>.json` shape. These are SIMPLIFIED, procedurally
 * generated approximations anchored at each rover's real landing coordinate
 * and following the documented general shape + total drive distance — NOT
 * surveyed per-waypoint tracks (those live in the LROC traverse-cartography
 * papers; a high-fidelity upgrade is the equivalent of Mars #362). Honest V1,
 * same status as the Mars "hand-vendored V1 stub" polylines.
 *
 * Run: node scripts/hotspots/build-moon-traverses.mjs
 */

const MOON_RADIUS_M = 1737400;
const M_PER_DEG_LAT = (Math.PI / 180) * MOON_RADIUS_M; // ~30326 m/deg

// Each rover: real landing anchor + a list of cumulative [east_m, north_m]
// offsets from it (the route shape), distances scaled to the documented
// total drive. lon convention matches moon-sites.json (-180..180).
const ROVERS = [
  {
    rover_id: 'luna17', // Lunokhod 1
    agency: 'Roscosmos',
    status: 'ENDED',
    snapshot_date: '1971-09-14',
    lat: 38.2378,
    lon: -34.9983, // 325.0017E
    credit:
      '© Roscosmos / Lavochkin — Lunokhod 1 traverse (Luna 17, Mare Imbrium, Nov 1970–Sep 1971; ~9.9 km). V1 simplified polyline anchored at the LRO-located rover position; documented per-sol track is a high-fidelity follow-up.',
    // Lunokhod 1 looped repeatedly around the lander; net displacement small.
    offsets: [
      [0, 0], [-120, 90], [-260, 40], [-330, 180], [-200, 300], [-40, 230],
      [80, 360], [240, 300], [180, 120], [40, -40], [-90, -120], [-260, -60],
      [-360, 80], [-220, 240], [-30, 180], [120, 60],
    ],
  },
  {
    rover_id: 'luna21', // Lunokhod 2
    agency: 'Roscosmos',
    status: 'ENDED',
    snapshot_date: '1973-06-03',
    lat: 25.8323,
    lon: 30.9221,
    credit:
      '© Roscosmos / Lavochkin — Lunokhod 2 traverse (Luna 21, Le Monnier crater, Jan–Jun 1973; ~39 km, the longest off-world drive until 2014). V1 simplified polyline; documented per-sol track is a high-fidelity follow-up.',
    // Net path: south from the lander, then a long run east along the rille.
    offsets: [
      [0, 0], [120, -400], [80, -900], [260, -1300], [600, -1500], [1100, -1450],
      [1700, -1300], [2400, -1250], [3100, -1400], [3700, -1700], [4100, -2100],
      [4300, -2600], [4250, -3100],
    ],
  },
  {
    rover_id: 'change3', // Yutu
    agency: 'CNSA',
    status: 'ENDED',
    snapshot_date: '2014-01-25',
    lat: 44.1214,
    lon: -19.5116,
    credit:
      "© CNSA — Yutu rover traverse (Chang'e 3, Mare Imbrium, Dec 2013–Jan 2014; ~114 m before immobilisation). V1 simplified polyline anchored at the lander.",
    offsets: [
      [0, 0], [-8, -14], [-22, -20], [-30, -8], [-26, 8], [-12, 18],
      [4, 14], [10, -2], [2, -16],
    ],
  },
  {
    rover_id: 'change4', // Yutu-2
    agency: 'CNSA',
    status: 'ENDED',
    snapshot_date: '2024-01-01',
    lat: -45.4561,
    lon: 177.5992,
    credit:
      "© CNSA — Yutu-2 rover traverse (Chang'e 4, Von Kármán crater, lunar far side, Jan 2019 onward; >1.6 km, the longest-lived lunar rover). V1 simplified polyline; the far side has no NASA equivalent.",
    // Net westward meander away from the lander.
    offsets: [
      [0, 0], [-40, 20], [-110, -10], [-180, 40], [-280, 20], [-360, 70],
      [-470, 50], [-560, 110], [-680, 90], [-790, 150], [-900, 120], [-1010, 180],
    ],
  },
  {
    rover_id: 'chandrayaan3', // Pragyan
    agency: 'ISRO',
    status: 'ENDED',
    snapshot_date: '2023-09-03',
    lat: -69.373,
    lon: 32.319,
    credit:
      '© ISRO — Pragyan rover traverse (Chandrayaan-3, ~600 km from the south pole, Aug–Sep 2023; ~101 m, the southernmost surface drive). V1 simplified polyline anchored at the Vikram lander.',
    offsets: [
      [0, 0], [6, -10], [16, -16], [30, -14], [44, -20], [58, -16],
      [72, -24], [86, -20], [96, -28],
    ],
  },
];

function offsetToLatLon(lat, lon, eastM, northM) {
  const dLat = northM / M_PER_DEG_LAT;
  const dLon = eastM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return [Number((lat + dLat).toFixed(5)), Number((lon + dLon).toFixed(5))];
}

const outDir = path.join('static', 'data', 'moon-traverses');
fs.mkdirSync(outDir, { recursive: true });

for (const r of ROVERS) {
  const points = r.offsets.map(([e, n]) => offsetToLatLon(r.lat, r.lon, e, n));
  const doc = {
    rover_id: r.rover_id,
    agency: r.agency,
    status: r.status,
    snapshot_date: r.snapshot_date,
    credit: r.credit,
    points,
  };
  const out = path.join(outDir, `${r.rover_id}.json`);
  fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
  console.log(`  ${r.rover_id.padEnd(13)} ${points.length} pts → ${out}`);
}
console.log(`\nWrote ${ROVERS.length} Moon rover traverses.`);
