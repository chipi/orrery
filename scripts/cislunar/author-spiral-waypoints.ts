#!/usr/bin/env tsx
/**
 * Author the cislunar waypoints of Earth-orbit-raising Moon missions from published orbit tables.
 *
 *   npx tsx scripts/cislunar/author-spiral-waypoints.ts            # every mission below
 *   npx tsx scripts/cislunar/author-spiral-waypoints.ts chandrayaan3
 *
 * The earlier waypoints were resampled from the Tier 1 spiral model (generate-hybrid-waypoints.ts),
 * which ignores the flight's own event times and parked Chandrayaan-1 and -3 at 760,000 km (twice the
 * Moon's distance) for 8 and 40 days. These are built from the published figures instead (the figures
 * and their source are in MISSIONS below and are written to `cislunar_profile.waypoints_source`).
 *
 * MET days are measured from launch. Orbits are drawn in the ecliptic plane (inclination is not
 * drawn). All Earth orbits share one apse line, so each burn happens at the same perigee and the
 * trans-lunar leg runs out along that line to where the Moon is at lunar arrival. Orbit phase between
 * burns is schematic (whole revolutions fitted to the published burn dates). The stay at the Moon is
 * authored as Moon-centred offsets around the arrival-day Moon (the convention buildFromWaypoints
 * turns into a Moon-riding lunar phase); the angle step per sample is capped so consecutive samples
 * stay within its 5,000 km hold tolerance.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  MU_EARTH_KM3_S2,
  R_EARTH_KM,
  R_MOON_KM,
  moonEciPos,
} from '../../src/lib/orbital/cislunar/cislunar-geometry.ts';

interface Config {
  file: string;
  source: string;
  /** [perigee alt km, apogee alt km, MET of the burn that starts this orbit]; the last is the TLI orbit. */
  raising: Array<[number, number, number]>;
  /** Perigee altitude of the transfer when there are no raising orbits (milestone-only missions). */
  perigeeAlt: number;
  /** MET the last raising orbit's perigee departs for the Moon. */
  tli: number;
  /** MET of lunar arrival (the Moon's position then is where the craft goes). */
  arrival: number;
  /** [MET the orbit starts, perilune alt, apolune alt]. */
  lunar: Array<[number, number, number]>;
  /** MET of the last waypoint. */
  end: number;
  /** Landing: finish with a descent to the surface at `end`. */
  landing: boolean;
}

const MISSIONS: Record<string, Config> = {
  chandrayaan3: {
    file: 'static/data/missions/moon/chandrayaan3.json',
    source:
      'ISRO Chandrayaan-3 mission updates (isro.gov.in/Chandrayaan3_Details.html), 2023-07/08: Earth-bound orbit raising 170x36,500 to 236x127,609 km in 5 burns, TLI 2023-08-01, LOI 2023-08-05 (164x18,074 km), reductions to 153x163 km, landing 2023-08-23. Drawn in the ecliptic plane; orbit phase is schematic.',
    perigeeAlt: 0,
    raising: [
      [170, 36500, 0],
      [173, 41762, 1],
      [226, 41603, 3],
      [228, 51400, 4],
      [233, 71351, 6],
      [236, 127609, 11],
    ],
    tli: 17.8,
    arrival: 22.2,
    lunar: [
      [22.2, 164, 18074],
      [23.35, 170, 4313],
      [26.2, 174, 1437],
      [31.2, 150, 177],
      [33.1, 153, 163],
      [35, 113, 157],
      [36.5, 30, 100],
    ],
    end: 40,
    landing: true,
  },
  slim: {
    file: 'static/data/missions/moon/slim.json',
    source:
      'JAXA SLIM milestones only: launch 2023-09-06, lunar orbit insertion 2023-12-25, landing 2024-01-19 (no orbit table published). The path is one schematic transfer ellipse from a 250 km perigee to the Moon between those dates, then a 600 km lunar orbit; the real months-long low-energy trajectory is not drawn.',
    perigeeAlt: 250,
    raising: [],
    tli: 0,
    arrival: 110,
    lunar: [[110, 600, 600]],
    end: 135,
    landing: true,
  },
  chandrayaan1: {
    file: 'static/data/missions/moon/chandrayaan1.json',
    source:
      'ISRO Chandrayaan-1 mission updates (isro.gov.in), 2008-10/11: PSLV-C11 injection 255x22,860 km 2008-10-22, apogee raised in five burns to 37,900 (10-23), 74,715 (10-25), 164,600 (10-26), 267,000 and 380,000 km (10-29), lunar orbit insertion 2008-11-08. Drawn in the ecliptic plane; orbit phase is schematic.',
    perigeeAlt: 0,
    raising: [
      [255, 22860, 0],
      [305, 37900, 1],
      [336, 74715, 3],
      [348, 164600, 4],
      [465, 380000, 7],
    ],
    tli: 7,
    arrival: 17,
    lunar: [[17, 504, 7502]],
    end: 17.8,
    landing: false,
  },
};

const kepler = (e: number, E: number) => E - e * Math.sin(E);

function author(cfg: Config): void {
  const rows: Array<[number, number, number, number]> = [];
  const push = (met: number, x: number, z: number) =>
    rows.push([Math.round(met * 10000) / 10000, Math.round(x), 0, Math.round(z)]);

  const moonArr = moonEciPos(cfg.arrival);
  const phiPerigee = Math.atan2(moonArr.z, moonArr.x) + Math.PI;
  const at = (r: number, E: number, e: number) => {
    const nu =
      2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    return { x: Math.cos(phiPerigee + nu) * r, z: Math.sin(phiPerigee + nu) * r };
  };

  cfg.raising.forEach(([rpAlt, raAlt, t0], i) => {
    const t1 = i + 1 < cfg.raising.length ? cfg.raising[i + 1][2] : cfg.tli;
    if (t1 <= t0) return;
    const rp = R_EARTH_KM + rpAlt;
    const ra = R_EARTH_KM + raAlt;
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);
    const period = (2 * Math.PI * Math.sqrt((a * a * a) / MU_EARTH_KM3_S2)) / 86400;
    const revs = Math.max(1, Math.round((t1 - t0) / period));
    const scale = (t1 - t0) / (revs * period);
    const perRev = 6;
    for (let k = 0; k < revs * perRev; k++) {
      const rev = Math.floor(k / perRev);
      const E = (2 * Math.PI * (k % perRev)) / perRev;
      const t = t0 + (rev * 2 * Math.PI + kepler(e, E)) * (period / (2 * Math.PI)) * scale;
      const p = at(a * (1 - e * Math.cos(E)), E, e);
      push(t, p.x, p.z);
    }
  });

  {
    const rp =
      R_EARTH_KM + (cfg.raising.length ? cfg.raising[cfg.raising.length - 1][0] : cfg.perigeeAlt);
    const ra = Math.hypot(moonArr.x, moonArr.z);
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);
    const n = 14;
    for (let k = 0; k < n; k++) {
      const E = (Math.PI * k) / n;
      const t = cfg.tli + (kepler(e, E) / Math.PI) * (cfg.arrival - cfg.tli);
      const p = at(a * (1 - e * Math.cos(E)), E, e);
      push(t, p.x, p.z);
    }
  }

  let theta = 0;
  cfg.lunar.forEach(([t0, rpAlt, raAlt], i) => {
    const t1 = i + 1 < cfg.lunar.length ? cfg.lunar[i + 1][0] : cfg.end - (cfg.landing ? 0.3 : 0);
    const rp = R_MOON_KM + rpAlt;
    const ra = R_MOON_KM + raAlt;
    const p = (2 * rp * ra) / (rp + ra);
    const e = (ra - rp) / (ra + rp);
    const count = Math.max(4, Math.round((t1 - t0) / 0.35));
    for (let k = 0; k < count; k++) {
      const r = p / (1 + e * Math.cos(theta));
      push(
        t0 + ((t1 - t0) * k) / count,
        moonArr.x + Math.cos(theta) * r,
        moonArr.z + Math.sin(theta) * r,
      );
      theta += Math.min(0.5, 3500 / Math.max(r, 1));
    }
  });
  if (cfg.landing) {
    for (const [t, alt] of [
      [cfg.end - 0.3, 60],
      [cfg.end - 0.15, 25],
      [cfg.end, 0],
    ] as Array<[number, number]>) {
      const r = R_MOON_KM + alt;
      push(t, moonArr.x + Math.cos(theta) * r, moonArr.z + Math.sin(theta) * r);
      theta += 0.3;
    }
  }

  rows.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < rows.length; i++)
    if (rows[i][0] <= rows[i - 1][0]) rows[i][0] = rows[i - 1][0] + 1e-4;

  const json = JSON.parse(readFileSync(cfg.file, 'utf8'));
  json.flight.cislunar_profile.waypoints_km = rows;
  json.flight.cislunar_profile.waypoints_source = cfg.source;
  writeFileSync(cfg.file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`${cfg.file}: ${rows.length} waypoints, MET 0..${rows[rows.length - 1][0]}`);
}

const only = process.argv.slice(2);
for (const [id, cfg] of Object.entries(MISSIONS))
  if (!only.length || only.includes(id)) author(cfg);
