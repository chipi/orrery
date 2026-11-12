// The eight planets of the REFERENCES overlay (UXD-021): true relative size, biggest to smallest.
// One list for the canvas (the bodies) and the DOM legend (names, diameters), so the two always
// show the same planets in the same order.

export interface PlanetSize {
  id: string;
  /** IAU mean radius, km. */
  r: number;
  /** Planet identity colour: the canvas body and the legend swatch. */
  col: string;
}

export const PLANET_SIZES: readonly PlanetSize[] = [
  { id: 'jupiter', r: 69911, col: '#c88b3a' },
  { id: 'saturn', r: 58232, col: '#e4d191' },
  { id: 'uranus', r: 25362, col: '#7de8e8' }, // a3-keep: planet identity colour (Uranus), palette review at the end
  { id: 'neptune', r: 24622, col: '#4466bb' },
  { id: 'earth', r: 6371, col: '#4b9cd3' },
  { id: 'venus', r: 6052, col: '#e8cda0' },
  { id: 'mars', r: 3390, col: '#c1440e' },
  { id: 'mercury', r: 2440, col: '#c8c8c8' },
];

/** Mean diameter in km, as the legend prints it. */
export const planetDiameterKm = (p: PlanetSize): number => 2 * p.r;
