// The eight planets of the REFERENCES overlay (UXD-021): true relative size, biggest to smallest.
// One list for the canvas (the bodies) and the DOM legend (names, diameters), so the two always
// show the same planets in the same order. The sizes come from `PLANET_STATS`, the table the
// planet panel and the Tactical Scan read, so a planet's diameter is one number everywhere.

import { PLANET_STATS } from '$lib/physics/util/planet-stats';

export interface PlanetSize {
  id: string;
  /** Mean radius, km: half the planet-stats mean diameter. */
  r: number;
  /** Planet identity colour: the canvas body and the legend swatch. */
  col: string;
}

const planet = (id: string, col: string): PlanetSize => ({
  id,
  r: PLANET_STATS[id].diameterKm / 2,
  col,
});

export const PLANET_SIZES: readonly PlanetSize[] = [
  planet('jupiter', '#c88b3a'),
  planet('saturn', '#e4d191'),
  planet('uranus', '#7de8e8'), // a3-keep: planet identity colour (Uranus), palette review at the end
  planet('neptune', '#4466bb'),
  planet('earth', '#4b9cd3'),
  planet('venus', '#e8cda0'),
  planet('mars', '#c1440e'),
  planet('mercury', '#c8c8c8'),
];

/** Mean diameter in km, as the legend prints it. */
export const planetDiameterKm = (p: PlanetSize): number => 2 * p.r;
