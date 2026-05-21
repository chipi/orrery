/**
 * Stable Orrery-internal launch id construction (PRD-020 / RFC-023 §4.2).
 *
 * id = `{YYYY-MM-DD}-{rocket-family-slug}-{mission-slug}` — designed so
 * the same launch arriving from different sources (GCAT, NASA, LL2)
 * collapses to a single entry under deterministic merge rules.
 *
 * Collision case (two genuinely-distinct same-day same-vehicle same-mission
 * launches): the orchestrator appends `-2`, `-3`, … via a separate
 * collision-counter pass — kept out of this pure helper.
 */

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function buildStableId(opts: {
  iso: string;
  rocketFamily: string;
  missionName: string;
}): string {
  const datePart = opts.iso.slice(0, 10);
  const familyPart = slugify(opts.rocketFamily) || 'unknown-vehicle';
  const missionPart = slugify(opts.missionName) || 'unknown-mission';
  return `${datePart}-${familyPart}-${missionPart}`;
}
