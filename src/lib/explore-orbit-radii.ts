/**
 * The planets' orbit radii in /explore scene units (PLANETS[].orbitR reads them from here). Apart
 * from `explore-scene.ts` so the orbit ruler on the Worlds can place a regime band without loading
 * that file's planet catalogue.
 */
export const PLANET_ORBIT_R = {
  mercury: 52,
  venus: 83,
  earth: 113,
  mars: 155,
  jupiter: 248,
  saturn: 320,
  uranus: 378,
  neptune: 430,
  pluto: 580,
} as const;
