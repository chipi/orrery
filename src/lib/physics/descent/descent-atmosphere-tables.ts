/**
 * Measured atmosphere profiles for the bodies whose probes measured them on the way down.
 *
 * A single isothermal exponential (`ATM_SCALE_HEIGHT_M`) is far too dense high up on Venus,
 * Titan, Jupiter and Earth — the probes decelerated ~100 km too early — and on Jupiter it reaches
 * 23 bar at −82 km instead of ~−130 km. These tables replace it for those three bodies.
 * Rows are [altitude m, density kg·m⁻³, pressure Pa], altitude ascending; interpolation is
 * log-linear in altitude, and beyond either end the last segment's slope is extended.
 *
 * Sources:
 * - Venus: Pioneer Venus Sounder probe (Seiff et al. 1980, JGR 85, 7903), lower table to
 *   64.8 km and middle table to 116 km; 120 km from the Day probe. NMSU planetary
 *   datasets, https://atmos.nmsu.edu/planetary_datasets/venustemppres.txt (bar × 1e5 = Pa).
 *   Not the VIRA table, which is built on these measurements.
 * - Titan: Huygens HASI, ESA PSA HP-SSA-HASI-2-3-4-MISSION-V1.0 — DATA/PROFILES/
 *   HASI_L4_ATMO_PROFILE_DESCEN.TAB (to 146.8 km), HASI_L4_ATMO_PROFILE_ENTRY.TAB joined
 *   with DATA/ACC/HASI_L4_ACCE_DENSITY.TAB above (157.3 km up); nearest rows to round
 *   altitudes.
 * - Jupiter (0 = the 1-bar level): Galileo probe ASI, PDS gp-j-asi-3-entry-v1.0 —
 *   DATA/ASI/UPPERATM.TAB (entry, accelerometer-derived; pressure column in millibars) to
 *   23.4 km, and DATA/ASI/LOWERATM.TAB (the dry-adiabat fit to the descent measurements)
 *   from 0 to −130.7 km (22.05 bar).
 */
import type { DescentBody } from './descent-physics';

export type AtmRow = readonly [altM: number, rhoKgM3: number, pPa: number];

const VENUS: readonly AtmRow[] = [
  [0, 65.28, 9_216_000],
  [10_000, 37.98, 4_720_000],
  [20_000, 20.25, 2_214_000],
  [30_000, 9.935, 928_300],
  [40_000, 4.223, 333_400],
  [47_000, 2.075, 147_100],
  [50_000, 1.515, 100_400],
  [55_000, 0.8671, 49_590],
  [60_000, 0.4291, 21_990],
  [62_000, 0.3183, 15_510],
  [64_000, 0.2282, 10_780],
  [70_000, 0.07381, 3_440],
  [80_000, 0.01188, 444.9],
  [90_000, 0.0009999, 31.68],
  [100_000, 6.718e-5, 2.252],
  [110_000, 5.52e-6, 0.2075],
  [120_000, 4.001e-7, 0.0147],
];

const TITAN: readonly AtmRow[] = [
  [3, 5.3446, 146_645],
  [2_992, 4.7662, 126_435],
  [10_009, 3.524, 87_464],
  [20_009, 2.1798, 49_716],
  [29_995, 1.2663, 27_221],
  [40_000, 0.69269, 14_533],
  [44_006, 0.53732, 11_289],
  [59_980, 0.18566, 4_217],
  [79_973, 0.047781, 1_781],
  [100_003, 0.022699, 951],
  [125_082, 0.010444, 472],
  [146_797, 0.0056589, 275],
  [157_318, 0.00403286, 206.577],
  [180_124, 0.00231923, 121.608],
  [199_845, 0.00146541, 78.6209],
  [249_517, 0.000494902, 27.5846],
  [299_610, 0.000182623, 10.057],
  [399_339, 2.73233e-5, 1.38998],
  [500_721, 3.69358e-6, 0.170833],
  [699_910, 9.66843e-8, 0.00511626],
  [999_856, 9.7737e-10, 5.74641e-5],
  [1_270_476, 3.935e-11, 1.98005e-6],
];

const JUPITER: readonly AtmRow[] = [
  [-130_740, 1.4555, 2_205_000],
  [-120_050, 1.2925, 1_861_900],
  [-100_200, 1.0192, 1_327_600],
  [-74_822, 0.72353, 814_380],
  [-50_147, 0.49099, 467_490],
  [-24_919, 0.30566, 235_850],
  [-9_938, 0.21884, 144_850],
  [0, 0.17399, 100_000],
  [23_445, 0.07919, 34_950],
  [30_084, 0.06079, 24_150],
  [39_841, 0.03359, 13_710],
  [49_887, 0.01881, 7_745],
  [60_001, 0.009915, 4_374],
  [69_866, 0.005475, 2_655],
  [80_112, 0.003148, 1_632],
  [90_399, 0.001855, 1_058],
  [99_519, 0.001283, 731.9],
  [125_210, 4.47e-4, 246.6],
  [151_190, 1.433e-4, 86.67],
  [175_880, 5.852e-5, 33.4],
  [201_600, 2.078e-5, 11.78],
  [251_070, 2.733e-6, 1.583],
  [298_270, 3.781e-7, 0.2317],
  [350_970, 5.574e-8, 0.04312],
  [401_040, 1.001e-8, 0.01439],
  [448_110, 3.613e-9, 0.007422],
  [600_780, 6.349e-10, 0.001737],
  [799_140, 1.108e-10, 4.011e-4],
  [1_028_100, 2.59e-11, 9.697e-5],
];

/** Earth: the US Standard Atmosphere 1976 (NOAA-S/T 76-1562), 0–150 km in 5 km steps, as tabulated
 *  by Public Domain Aeronautical Software, https://www.pdas.com/bigtables.html (Table 1, geometric
 *  altitude). The single 8.5 km exponential it replaces was ~3.5× too dense at 60 km and ~16× at
 *  100 km, so every entry decelerated too high and the lunar-return first pulse read 1–1.7 g over
 *  the flown peak (docs/wip/2026-11-25-earth-atmosphere-finding.md). */
const EARTH: readonly AtmRow[] = [
  [0, 1.225, 1.0132e5],
  [5_000, 7.3643e-1, 5.4048e4],
  [10_000, 4.1351e-1, 2.65e4],
  [15_000, 1.9476e-1, 1.2112e4],
  [20_000, 8.891e-2, 5.5293e3],
  [25_000, 4.0084e-2, 2.5492e3],
  [30_000, 1.841e-2, 1.197e3],
  [35_000, 8.4634e-3, 5.7459e2],
  [40_000, 3.9957e-3, 2.8714e2],
  [45_000, 1.9663e-3, 1.491e2],
  [50_000, 1.0269e-3, 7.9779e1],
  [55_000, 5.681e-4, 4.2525e1],
  [60_000, 3.0968e-4, 2.1959e1],
  [65_000, 1.6321e-4, 1.093e1],
  [70_000, 8.2829e-5, 5.2209],
  [75_000, 3.9921e-5, 2.3881],
  [80_000, 1.8458e-5, 1.0525],
  [85_000, 8.2195e-6, 4.4568e-1],
  [90_000, 3.44e-6, 1.8435e-1],
  [95_000, 1.3873e-6, 7.5775e-2],
  [100_000, 5.6044e-7, 3.2012e-2],
  [105_000, 2.3325e-7, 1.4423e-2],
  [110_000, 9.6734e-8, 7.1493e-3],
  [115_000, 4.2794e-8, 4.0037e-3],
  [120_000, 2.2199e-8, 2.5366e-3],
  [125_000, 1.2918e-8, 1.736e-3],
  [130_000, 8.1494e-9, 1.2503e-3],
  [135_000, 5.4647e-9, 9.3569e-4],
  [140_000, 3.8313e-9, 7.2029e-4],
  [145_000, 2.7805e-9, 5.669e-4],
  [150_000, 2.0752e-9, 4.5422e-4],
];

export const ATM_PROFILE: Partial<Record<DescentBody, readonly AtmRow[]>> = {
  venus: VENUS,
  earth: EARTH,
  titan: TITAN,
  jupiter: JUPITER,
};

/** Log-linear interpolation of column `col` (1 = density, 2 = pressure) at `altM`. */
export function interpAtm(rows: readonly AtmRow[], altM: number, col: 1 | 2): number {
  let i = 0;
  if (altM <= rows[0][0]) i = 0;
  else if (altM >= rows[rows.length - 1][0]) i = rows.length - 2;
  else while (rows[i + 1][0] < altM) i += 1;
  const [a0, a1] = [rows[i], rows[i + 1]];
  const f = (altM - a0[0]) / (a1[0] - a0[0]);
  return Math.exp(Math.log(a0[col]) + f * (Math.log(a1[col]) - Math.log(a0[col])));
}
