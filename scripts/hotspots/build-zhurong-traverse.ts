/**
 * Zhurong's traverse, traced from its own wheel tracks on HiRISE
 * ESP_073225_2055 (11 March 2022; NASA/JPL/UArizona), replacing the
 * hand-drawn "due south" V1 stub — the tracks run south past the parachute
 * and backshell, then turn east-south-east.
 *
 * No team-published per-waypoint table was found (searched 2026-11-05: the
 * Nature Geoscience supplement, the JDSE localization paper, the JSTARS
 * visual-localization paper report lengths and maps, not coordinates). So
 * this is our reconstruction, credited as such. Points were read off
 * traverse-overlay.ts crops at 0.14–0.36 m/px; overlapping crops agree to
 * ~20 m, which is the stated accuracy. The frame's own georeferencing is what
 * the route patches use, so the path and the patches agree.
 *
 * After 11 March 2022 it drove ~0.4 km more (2 009 m in all) with no tracks
 * visible on later frames; the trace ends with a straight segment to where
 * it parked for good, seen on ESP_077511_2055 (7 Feb 2023; absent from that
 * spot in March 2022). That frame sits ~62 m east of ESP_073225_2055, so the
 * position is moved into the trace's frame by the shift of a shared crater.
 *
 * Stops are placed by the odometry the mission reported (450 m at sol 60,
 * 1 064 m at sol 97, 30 Aug 2021) times the published slip ratio; the last stop is
 * the end of the trace.
 *
 * Run: node --import tsx scripts/hotspots/build-zhurong-traverse.ts
 * Then: fetch-mars-traverse.ts --rover zhurong.
 */
import { promises as fs } from 'node:fs';

const IAU_MARS_RADIUS_M = 3396190;
const DEG = 180 / Math.PI;
const PRODUCT = 'ESP_073225_2055';

/** One traced crop: its centre, its m/px, and track pixels in order. */
interface Crop {
  at: [number, number];
  mPerPx: number;
  px: [number, number][];
}

// 1400 px renders of traverse-overlay.ts crops (pixel 700,700 = centre).
const CROPS: Crop[] = [
  // --at 25.0640,109.9255 --size-m 500: lander blast zone, track leaving south.
  {
    at: [25.064, 109.9255],
    mPerPx: 500 / 1400,
    px: [
      [820, 700],
      [790, 880],
      [770, 1000],
      [740, 1100],
      [690, 1170],
      [680, 1300],
    ],
  },
  // --at 25.0570,109.9255 --size-m 500: west past the parachute/backshell.
  {
    at: [25.057, 109.9255],
    mPerPx: 500 / 1400,
    px: [
      [680, 170],
      [630, 270],
      [575, 350],
      [560, 450],
      [570, 520],
      [545, 600],
      [540, 690],
      [575, 770],
      [545, 850],
      [540, 960],
      [580, 1040],
      [650, 1120],
      [700, 1170],
      [690, 1230],
      [655, 1265],
    ],
  },
  // --at 25.0500,109.9255 --size-m 500: around the mound, then east-south-east.
  {
    at: [25.05, 109.9255],
    mPerPx: 500 / 1400,
    px: [
      [610, 250],
      [570, 350],
      [535, 420],
      [530, 500],
      [510, 560],
      [460, 580],
      [400, 590],
      [330, 600],
      [295, 650],
      [310, 720],
      [370, 770],
      [450, 780],
      [520, 860],
      [600, 950],
      [650, 990],
      [665, 1080],
      [750, 1100],
      [840, 1078],
      [905, 1105],
      [1000, 1105],
      [1065, 1130],
      [1100, 1180],
      [1200, 1240],
      [1225, 1310],
    ],
  },
  // --at 25.0440,109.9293 --size-m 200: last loop and the rover itself.
  {
    at: [25.044, 109.9293],
    mPerPx: 200 / 1400,
    px: [
      [655, 200],
      [620, 350],
      [530, 400],
      [480, 500],
      [490, 650],
      [560, 770],
      [700, 820],
      [860, 910],
    ],
  },
];

// Parked rover, ESP_077511_2055, in ESP_073225_2055's georeferencing.
const PARKED: [number, number] = [25.04116, 109.93026];

// Mission-reported odometry: 1 921 m at hibernation (18 May 2022); the
// visual-localization traverse is 2 009 m (JSTARS) — wheel slip on the
// downslope. Ground distance at a stop = odometry × that ratio.
const ODOMETER_TOTAL_M = 1921;
const GROUND_PER_ODOMETER = 2009 / ODOMETER_TOTAL_M;
const STOPS: { id: string; sol: number; odometerM: number; kind: string; label?: string }[] = [
  { id: 'sol-60', sol: 60, odometerM: 450, kind: 'feature' },
  // 100 Earth days after egress (30 Aug 2021): 1 064 m; CNSA marked it with new panoramas.
  { id: 'sol-97', sol: 97, odometerM: 1064, kind: 'panorama', label: '100 days on Mars' },
  { id: 'sol-347', sol: 347, odometerM: ODOMETER_TOTAL_M, kind: 'feature' },
];

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

function pxToLatLon(c: Crop, [x, y]: [number, number]): [number, number] {
  const dN = (700 - y) * c.mPerPx;
  const dE = (x - 700) * c.mPerPx;
  return [
    c.at[0] + (dN / IAU_MARS_RADIUS_M) * DEG,
    c.at[1] + (dE / (IAU_MARS_RADIUS_M * Math.cos(c.at[0] / DEG))) * DEG,
  ];
}

function metres(a: [number, number], b: [number, number]): number {
  const dN = ((b[0] - a[0]) / DEG) * IAU_MARS_RADIUS_M;
  const dE = ((b[1] - a[1]) / DEG) * IAU_MARS_RADIUS_M * Math.cos(a[0] / DEG);
  return Math.hypot(dN, dE);
}

function pointAt(points: [number, number][], targetM: number): [number, number] {
  let cum = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = metres(points[i - 1], points[i]);
    if (cum + seg >= targetM) {
      const t = (targetM - cum) / seg;
      const [a, b] = [points[i - 1], points[i]];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    cum += seg;
  }
  return points[points.length - 1];
}

async function main() {
  const points = [...CROPS.flatMap((c) => c.px.map((p) => pxToLatLon(c, p))), PARKED].map(
    ([la, lo]) => [round6(la), round6(lo)] as [number, number],
  );
  let lengthM = 0;
  for (let i = 1; i < points.length; i++) lengthM += metres(points[i - 1], points[i]);

  const outPath = 'static/data/mars-traverses/zhurong.json';
  const prev = JSON.parse(await fs.readFile(outPath, 'utf8'));
  const labels = new Map<string, string>(
    prev.stops.map((s: { id: string; label: string }) => [s.id, s.label]),
  );
  const stops = STOPS.map((s) => {
    // The last stop is the end of the trace (the parked rover), whatever the scaling says.
    const ground = s.odometerM === ODOMETER_TOTAL_M ? lengthM : s.odometerM * GROUND_PER_ODOMETER;
    const [lat, lon] = pointAt(points, ground);
    const label = s.label ?? labels.get(s.id);
    if (!label) throw new Error(`no label for ${s.id}`);
    return { sol: s.sol, lat: round6(lat), lon: round6(lon), label, kind: s.kind, id: s.id };
  });
  // Approximate sol per point: linear in distance between dated milestones —
  // egress (sol 1), the sol-60 and 100-day odometry, the end of the tracks on
  // the 11 March 2022 image (sol 285 by date), the parked rover (sol 347).
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + metres(points[i - 1], points[i]));
  const tracedEndM = cum[cum.length - 2];
  const milestones: [number, number][] = [
    [0, 1],
    [450 * GROUND_PER_ODOMETER, 60],
    [1064 * GROUND_PER_ODOMETER, 97],
    [tracedEndM, 285],
    [lengthM, 347],
  ];
  const solAt = (m: number) => {
    const i = Math.max(
      1,
      milestones.findIndex(([d]) => d >= m),
    );
    const [[d0, s0], [d1, s1]] = [milestones[i - 1], milestones[i]];
    return Math.round(s0 + ((s1 - s0) * (m - d0)) / (d1 - d0 || 1));
  };
  const pointSols = cum.map(solAt);
  const credit = `© CNSA/PEC — Zhurong rover traverse, Utopia Planitia landing site (15 May 2021) to winter dormancy (18 May 2022): traced by Orrery from the rover's wheel tracks on HiRISE ${PRODUCT} (NASA/JPL/University of Arizona, 11 March 2022), ~20 m accuracy; its drives after that date left no visible tracks and are drawn as a straight line to where it parked, seen on HiRISE ESP_077511_2055 (7 February 2023). China's first Mars rover, and the first non-NASA rover to drive on Mars.`;
  // CNSA odometry at hibernation: 1 921 m; active 347 sols.
  const out = {
    ...prev,
    credit,
    length_km: ODOMETER_TOTAL_M / 1000,
    last_sol: 347,
    landing_sol: 1,
    points,
    point_sols: pointSols,
    point_sols_approx: true,
    stops,
  };
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`zhurong: ${points.length} points, ${lengthM.toFixed(0)} m traced → ${outPath}`);
  for (const s of stops)
    console.log(`  ${s.id.padEnd(8)} ${s.lat.toFixed(5)} ${s.lon.toFixed(5)}  ${s.label}`);
}

main();
