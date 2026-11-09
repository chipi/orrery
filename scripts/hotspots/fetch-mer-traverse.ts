/**
 * Spirit / Opportunity traverses from the MER science team's localized
 * drive path, replacing the hand-drawn V1 stubs.
 *
 * Source: the PDS Geosciences Node's interpolated traverse tables behind the
 * MER Analyst's Notebook (https://an.rsl.wustl.edu/mera/AN/pages/mer/mer_traverse.htm).
 * Tim Parker (science team) corrected the onboard odometry against orbital
 * images; PDS interpolated the drives between his corrected points. One row
 * per drive: SITE, DRIVE, START_SOL, END_SOL, RAW_X/Y/Z, CORRECTED_X/Y.
 *
 * The two files use different frames for CORRECTED_X/Y:
 *   MERA (Spirit)      — metres, Mars equirectangular centred on 175.5°E, 0°N
 *                        (stated in MERA_traverse.lbl).
 *   MERB (Opportunity) — metres east / north of the landing site. The label
 *                        says only "Corrected x position"; the frame was read
 *                        off the landmarks (sol 95 Endurance +708 E, sol 952
 *                        Duck Bay −6180 N) and checked on HiRISE.
 * Both resolve on the IAU 2000 sphere (3 396 190 m): with it Spirit's sol-1
 * row lands within ~0.2 km of the published landing site; the 3 389 500 m
 * radius used elsewhere in scripts/hotspots puts it 1.7 km off.
 *
 * Neither frame lines up with HiRISE as delivered: shape and scale do, the
 * origin does not (Opportunity ~220 m, Spirit ~440 m). The route patches and
 * the scene sit on HiRISE georeferencing, so each path is tied to HiRISE at
 * places where the rover's position is visible (`ties`: lander, crater rim
 * stops). The offset at a tie is applied at its sol and interpolated linearly
 * in distance driven between ties (odometry drift grows with metres, not
 * sols) — our alignment, credited as such. Checked by drawing
 * the result on the frames: Opportunity's sol 95 on Endurance's west rim,
 * sol 952 in Duck Bay and the Victoria rim circuit on the promontories, with
 * the Eagle tie alone; Spirit's sol 66 on Bonneville's rim and the Home Plate
 * loops on the plateau's edge, 3 km from its one tie. Separate HiRISE frames
 * of the same ground differ by up to ~50 m, so that is the floor here.
 *
 * Stops are pinned to the traverse at their sol (the position after the last
 * drive that started on or before it); labels are kept from the existing
 * file by id, or by the old id in STOPS.renamedFrom.
 *
 * Run: node --import tsx scripts/hotspots/fetch-mer-traverse.ts --rover opportunity|spirit
 * Then re-cut the route patches: fetch-mars-traverse.ts --rover <rover>.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const IAU_MARS_RADIUS_M = 3396190;
const DEG = 180 / Math.PI;
const SIMPLIFY_TOLERANCE_M = 4;
const AN_BASE = 'https://an.rsl.wustl.edu/mera/AN/meri/MER/traverse';

interface StopSpec {
  sol: number;
  kind: string;
  renamedFrom?: string;
  /** English label for a stop the file did not have before. */
  label?: string;
}

interface RoverSpec {
  /** Distance driven (mission figure) and last sol with contact, both sourced. */
  lengthKm: number;
  lastSol: number;
  file: string;
  toLatLon: (x: number, y: number) => [number, number];
  /** Rover positions measured on HiRISE, by sol (ascending). */
  ties: { sol: number; lat: number; lon: number }[];
  credit: (km: string, n: number, url: string) => string;
  stops: StopSpec[];
}

// Opportunity landing site, Eagle crater (1.9462°S 354.4734°E).
const OPP_LAT0 = -1.9462;
const OPP_LON0 = 354.4734 - 360;

const ROVERS: Record<string, RoverSpec> = {
  spirit: {
    file: 'MERA_traverse.csv',
    // JPL, "NASA's Spirit rover completes mission on Mars" (2011): 7.73 km; last contact sol 2210.
    lengthKm: 7.73,
    lastSol: 2210,
    toLatLon: (x, y) => [(y / IAU_MARS_RADIUS_M) * DEG, 175.5 + (x / IAU_MARS_RADIUS_M) * DEG],
    // The lander beside Sleepy Hollow on PSP_001513_1655, the frame of the site patch and its
    // ring (surface-hotspots spirit.lander). On PSP_003689_1650 the same lander sits 44 m
    // east; the route tiles are cut from that frame and are moved by the same offset in
    // spirit.route-patches.json / spirit.route-photos.json (images unchanged).
    ties: [{ sol: 1, lat: -14.57326, lon: 175.47687 }],
    credit: (km, n, url) =>
      `© NASA/JPL-Caltech — Spirit rover traverse, Gusev Crater landing site (Jan 2004) across the Columbia Hills to Troy beside Home Plate (last contact March 2010): the science team's localized drive path (T. Parker, corrected against orbital images; interpolated by the PDS Geosciences Node, ${url}), ${km} km, simplified to ${n} points (Douglas–Peucker, ${SIMPLIFY_TOLERANCE_M} m).`,
    stops: [
      { sol: 66, kind: 'feature', renamedFrom: 'sol-90' },
      { sol: 159, kind: 'feature', renamedFrom: 'sol-590' },
      { sol: 581, kind: 'panorama', renamedFrom: 'sol-1000' },
      { sol: 744, kind: 'feature', renamedFrom: 'sol-1500' },
      { sol: 2210, kind: 'feature' },
    ],
  },
  opportunity: {
    file: 'MERB_traverse_5130.csv',
    // PIA23178 (final traverse map): 45.16 km; last contact sol 5111 (10 June 2018).
    lengthKm: 45.16,
    lastSol: 5111,
    toLatLon: (x, y) => [
      OPP_LAT0 + (y / IAU_MARS_RADIUS_M) * DEG,
      OPP_LON0 + (x / (IAU_MARS_RADIUS_M * Math.cos(OPP_LAT0 / DEG))) * DEG,
    ],
    ties: [
      // The lander in Eagle crater on ESP_050177_1780, the frame of the site patch and its ring
      // (surface-hotspots opportunity.lander-eagle-crater). On PSP_001414_1780 it sits 93 m west
      // (-1.94979, -5.52765, where this tie was); the offset tapers to zero at the next tie, and
      // the route tiles and photos move by the same tapering offset (images unchanged).
      { sol: 1, lat: -1.94979, lon: -5.52608 },
      // Duck Bay on Victoria's rim, PSP_001414_1780 (the Eagle tie alone puts
      // it there; kept so the Cape York tie does not pull it off).
      { sol: 952, lat: -2.05421, lon: -5.50873 },
      // Spirit Point: Odyssey crater at Cape York's south tip, PSP_010486_1775.
      { sol: 2681, lat: -2.23749, lon: -5.36007 },
    ],
    credit: (km, n, url) =>
      `© NASA/JPL-Caltech — Opportunity rover traverse, Eagle Crater (Jan 2004) across Meridiani Planum to Perseverance Valley on Endeavour Crater's rim (June 2018): the science team's localized drive path (T. Parker, corrected against orbital images; interpolated by the PDS Geosciences Node, ${url}), ${km} km, simplified to ${n} points (Douglas–Peucker, ${SIMPLIFY_TOLERANCE_M} m).`,
    stops: [
      // PIA05783, the panorama from inside Eagle crater, was taken on sol 56.
      { sol: 56, kind: 'panorama', label: 'Eagle Crater' },
      { sol: 95, kind: 'feature', renamedFrom: 'sol-56' },
      { sol: 652, kind: 'feature', renamedFrom: 'sol-1232' },
      { sol: 952, kind: 'panorama', renamedFrom: 'sol-1820' },
      { sol: 2681, kind: 'feature', renamedFrom: 'sol-3010' },
      { sol: 4081, kind: 'feature', renamedFrom: 'sol-4500' },
    ],
  },
};

interface Row {
  startSol: number;
  lat: number;
  lon: number;
  /** Metres driven from sol 1 along the corrected path. */
  distM: number;
}

function parseRows(csv: string, spec: RoverSpec): Row[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`${spec.file}: no ${name} column`);
    return i;
  };
  const [iSol, iX, iY] = [col('START_SOL'), col('CORRECTED_X'), col('CORRECTED_Y')];
  return lines.slice(1).map((line) => {
    const f = line.split(',');
    const [lat, lon] = spec.toLatLon(Number(f[iX]), Number(f[iY]));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error(`bad row: ${line}`);
    return { startSol: Number(f[iSol]), lat, lon, distM: 0 };
  });
}

/** Position after the last drive that started on or before `sol`. */
function rowAtSol(rows: Row[], sol: number): Row {
  const at = rows.filter((r) => r.startSol <= sol).at(-1);
  if (!at) throw new Error(`no traverse row on or before sol ${sol}`);
  return at;
}

type Offset = { distM: number; dLat: number; dLon: number };

function offsetAt(offsets: Offset[], distM: number): Offset {
  if (distM <= offsets[0].distM) return offsets[0];
  const last = offsets[offsets.length - 1];
  if (distM >= last.distM) return last;
  const i = offsets.findIndex((o) => o.distM > distM);
  const [a, b] = [offsets[i - 1], offsets[i]];
  const t = (distM - a.distM) / (b.distM - a.distM);
  return { distM, dLat: a.dLat + (b.dLat - a.dLat) * t, dLon: a.dLon + (b.dLon - a.dLon) * t };
}

/** Local metres around a reference latitude — fine over a rover's ~40 km. */
function toMetres(p: [number, number], lat0: number): [number, number] {
  return [
    (p[1] / DEG) * IAU_MARS_RADIUS_M * Math.cos(lat0 / DEG),
    (p[0] / DEG) * IAU_MARS_RADIUS_M,
  ];
}

/** Douglas–Peucker; returns the indices kept. */
function simplify(points: [number, number][], tolM: number): number[] {
  const lat0 = points[0][0];
  const m = points.map((p) => toMetres(p, lat0));
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const [ax, ay] = m[a];
    const [bx, by] = m[b];
    const len = Math.hypot(bx - ax, by - ay);
    let worst = -1;
    let worstD = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = m[i];
      const d =
        len === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst >= 0 && worstD > tolM) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return points.flatMap((_, i) => (keep[i] ? [i] : []));
}

function lengthKm(points: [number, number][]): number {
  const lat0 = points[0][0];
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = toMetres(points[i - 1], lat0);
    const [bx, by] = toMetres(points[i], lat0);
    sum += Math.hypot(bx - ax, by - ay);
  }
  return sum / 1000;
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

async function main() {
  const args = process.argv.slice(2);
  const rover = args.includes('--rover') ? args[args.indexOf('--rover') + 1] : undefined;
  const spec = rover ? ROVERS[rover] : undefined;
  if (!rover || !spec) throw new Error(`--rover ${Object.keys(ROVERS).join('|')}`);

  const url = `${AN_BASE}/${spec.file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const rows = parseRows(await res.text(), spec);
  for (let i = 1; i < rows.length; i++) {
    const [ax, ay] = toMetres([rows[i - 1].lat, rows[i - 1].lon], rows[0].lat);
    const [bx, by] = toMetres([rows[i].lat, rows[i].lon], rows[0].lat);
    rows[i].distM = rows[i - 1].distM + Math.hypot(bx - ax, by - ay);
  }
  const offsets = spec.ties.map((t) => {
    const at = rowAtSol(rows, t.sol);
    return { distM: at.distM, dLat: t.lat - at.lat, dLon: t.lon - at.lon };
  });
  for (const r of rows) {
    const o = offsetAt(offsets, r.distM);
    r.lat += o.dLat;
    r.lon += o.dLon;
  }

  const full: [number, number][] = [];
  const fullSols: number[] = [];
  for (const r of rows) {
    const last = full.at(-1);
    if (!last || last[0] !== r.lat || last[1] !== r.lon) {
      full.push([r.lat, r.lon]);
      fullSols.push(r.startSol);
    }
  }
  const kept = simplify(full, SIMPLIFY_TOLERANCE_M);
  const points = kept.map((i) => [round6(full[i][0]), round6(full[i][1])] as [number, number]);
  // The sol each point's drive started on, one per point.
  const pointSols = kept.map((i) => fullSols[i]);
  const km = lengthKm(full).toFixed(1);

  const outPath = path.join('static/data/mars-traverses', `${rover}.json`);
  const prev = JSON.parse(await fs.readFile(outPath, 'utf8'));
  const prevLabels = new Map<string, string>(
    (prev.stops ?? []).map((s: { id: string; label: string }) => [s.id, s.label]),
  );
  const stops = spec.stops.map((s) => {
    const at = rowAtSol(rows, s.sol);
    const id = `sol-${s.sol}`;
    const label = s.label ?? prevLabels.get(id) ?? prevLabels.get(s.renamedFrom ?? '');
    if (!label) throw new Error(`no label for ${id}`);
    return { sol: s.sol, lat: round6(at.lat), lon: round6(at.lon), label, kind: s.kind, id };
  });

  const out = {
    ...prev,
    credit: spec.credit(km, points.length, url),
    length_km: spec.lengthKm,
    last_sol: spec.lastSol,
    // MER sols count from 1 on landing day.
    landing_sol: 1,
    points,
    point_sols: pointSols,
    stops,
  };
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(
    `${rover}: ${rows.length} drives → ${full.length} positions, ${km} km → ${points.length} points; ${stops.length} stops → ${outPath}`,
  );
  for (const s of stops)
    console.log(`  ${s.id.padEnd(9)} ${s.lat.toFixed(5)} ${s.lon.toFixed(5)}  ${s.label}`);
}

main();
