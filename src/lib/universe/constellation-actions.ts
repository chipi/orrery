// The "Show constellation lines" action of the IN THE SKY tab, shared by the star panel and the
// deep-sky panel so the two cannot drift.
import { isScienceLensOn, toggleScienceLens } from '$lib/science-lens';
import { setLayer } from '$lib/science-layers';

/** The Constellations layer draws only with the science lens on, so the action turns both on. */
export function showConstellationLines(): void {
  if (!isScienceLensOn()) toggleScienceLens();
  setLayer('constellations', true);
}
