/**
 * Whether a moon in the /fly heliocentric scene is drawn. The science-lens "moons" layer shows
 * them all; the flyby cinema shows the flown-by body's own (`parent`), so Earth's Moon does not
 * crowd an asteroid passed near Earth (Lucy at Dinkinesh, 18 M km out); a highlighted target moon
 * always shows.
 */
export function moonShown(
  moonParent: string,
  visible: boolean,
  onlyParent: string | null,
  isTarget: boolean,
): boolean {
  return (visible && (!onlyParent || moonParent === onlyParent)) || isTarget;
}
