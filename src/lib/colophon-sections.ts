/**
 * /colophon's sections, once: the contents list, the section headings and the totals line
 * ("N original works in K sections") all read these rows, so a heading, its contents row and
 * the total cannot disagree. `static/data/original-work.json`'s `totals` object is not used: it
 * leaves out the tour episodes and the icon grid, and counts `ui` from a list the page does not
 * draw (`ICON_SHOWCASE` is what the Interface graphics section shows).
 */
export type CutawayEntry = { title: string; file: string; kind?: 'spacecraft' | 'launcher' };

type Counted = readonly unknown[] | undefined;

export type SectionSource = {
  anatomy_art: readonly CutawayEntry[];
  exploded_art: Counted;
  landing_art?: Counted;
  blueprint_art?: Counted;
  posters: Counted;
  mission_trajectories?: Counted;
  site_illustrations?: Counted;
  lab_illustrations?: Counted;
  diagrams_science: Counted;
  capsules: Counted;
  models3d: Counted;
  canvas2d: Counted;
  writing: Counted;
};

export type SectionId =
  | 'cutaways'
  | 'launchers'
  | 'exploded'
  | 'landing'
  | 'blueprints'
  | 'posters'
  | 'mission-trajectories'
  | 'site-illustrations'
  | 'lab-illustrations'
  | 'diagrams'
  | 'capsules'
  | 'models'
  | 'canvas'
  | 'ui'
  | 'writing'
  | 'tours';

export type SectionRow = { id: SectionId; count: number };

/** Spacecraft cutaways (watercolour) and launcher sketches (pencil). A missing `kind` is a spacecraft. */
export function splitCutaways<T extends CutawayEntry>(
  list: readonly T[],
): { spacecraft: T[]; launchers: T[] } {
  const launchers = list.filter((e) => e.kind === 'launcher');
  return { spacecraft: list.filter((e) => e.kind !== 'launcher'), launchers };
}

/**
 * The sections in page order. Always drawn: cutaways, launcher sketches, exploded, posters,
 * diagrams, capsules, models, canvas, interface graphics, writing. Drawn only when they have
 * entries: launcher sketches, landing, blueprints, mission trajectories, site illustrations, lab, tour episodes.
 */
export function colophonSections(
  m: SectionSource,
  uiCount: number,
  episodeCount: number,
): SectionRow[] {
  const { spacecraft, launchers } = splitCutaways(m.anatomy_art);
  const n = (l: Counted) => l?.length ?? 0;
  const always = (id: SectionId, count: number): SectionRow => ({ id, count });
  const optional = (id: SectionId, count: number): SectionRow[] =>
    count > 0 ? [{ id, count }] : [];
  return [
    always('cutaways', spacecraft.length),
    ...optional('launchers', launchers.length),
    always('exploded', n(m.exploded_art)),
    ...optional('landing', n(m.landing_art)),
    ...optional('blueprints', n(m.blueprint_art)),
    always('posters', n(m.posters)),
    ...optional('mission-trajectories', n(m.mission_trajectories)),
    ...optional('site-illustrations', n(m.site_illustrations)),
    ...optional('lab-illustrations', n(m.lab_illustrations)),
    always('diagrams', n(m.diagrams_science)),
    always('capsules', n(m.capsules)),
    always('models', n(m.models3d)),
    always('canvas', n(m.canvas2d)),
    always('ui', uiCount),
    always('writing', n(m.writing)),
    ...optional('tours', episodeCount),
  ];
}
