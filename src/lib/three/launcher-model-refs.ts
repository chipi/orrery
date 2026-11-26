/**
 * Sources the procedural launcher models (launcher-models.ts) were measured from, beyond their
 * fleet entries' links. Credited on /credits by scripts/build-model-references.ts.
 */
export const LAUNCHER_MODEL_REFS: Record<string, { l: string; u: string }[]> = {
  'space-shuttle-stack': [
    {
      l: 'HAER TX-116, Space Transportation System, full stack elevations (Library of Congress measured drawing: 56.40 m stack, the tank, the SRBs 6.36 m off its axis, the orbiter’s place on it)',
      u: 'https://www.loc.gov/pictures/item/tx1106.sheet.00003a/',
    },
    {
      l: 'HAER TX-116-K, Solid Rocket Boosters, details and joints (Library of Congress measured drawing: 45.72 m, the case, aft skirt and nozzle diameters, the segment joints)',
      u: 'https://www.loc.gov/pictures/item/tx1117.sheet.00003a/',
    },
  ],
};
