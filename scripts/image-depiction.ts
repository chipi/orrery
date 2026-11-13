/**
 * Honest labels and photograph heroes for flown vehicles (ADR-046 / ADR-053, 2026-11-13).
 *
 * Rule B: a gallery slot whose picture is a concept, illustration or computer graphic says so in
 * BOTH its provenance title and its en-US alt text. The gate cannot see the picture, so it fails
 * when exactly one of the two says it; a slot whose word is a false positive (a photograph of a
 * museum model, say) is listed with a reason in `not_concept` in static/data/license-waivers.json.
 *
 * Rule A: the blessed hero slot of a flown vehicle (the `*-hero-overrides.json` slot, else 01, as
 * entity-thumbs.json records it) is a photograph. A hero whose title or alt says concept is a
 * finding unless the vehicle's `status` is PLANNED, or the slot has an `artistic_impressions`
 * waiver. Today's findings are frozen in static/data/hero-concept-baseline.json; the gate fails on
 * a finding not in the baseline and on a baseline entry that no longer is one.
 */

/** Words that say "this is not a photograph of the real thing". */
export const CONCEPT_RE =
  /artist|concept|illustrat|render|impression|computer[- ]graphic|computer[- ]generated|\bCGI?\d*\b|painting|painted|drawing|diagram|schematic|line[- ]art|\bvector\b/i;

export const says = (text: string | undefined): boolean => CONCEPT_RE.test(text ?? '');

/** Surfaces whose slots show a flown (or planned) vehicle. */
export const VEHICLE_SURFACES = new Set([
  'missions',
  'fleet-galleries',
  'iss-modules',
  'tiangong-modules',
  'earth-objects',
  'mars-sites',
  'moon-sites',
  'rockets',
  'museums',
  'observatories',
  'launch-ground',
]);

export interface ProvRow {
  path: string;
  title?: string;
}

export interface DepictionSlot {
  /** `/images/<surface>/<id>/NN`, no extension. */
  key: string;
  surface: string;
  title: string;
  alt: string;
}

/** `/images/x/y/01.webp`, `/images/x/y/01.1x1.jpg` or `/images/x/y/01` to `/images/x/y/01`. */
export function slotKey(path: string): string {
  return path.replace(/\.1x1\.jpg$/, '').replace(/\.(webp|jpg|png)$/, '');
}

/** One slot per `/images/<surface>/<id>/NN`, the `.webp` row's title winning over the crop's. */
export function collectSlots(
  entries: ProvRow[],
  alt: Record<string, string>,
  surfaces: ReadonlySet<string> = VEHICLE_SURFACES,
): DepictionSlot[] {
  const rows = new Map<string, DepictionSlot>();
  for (const e of entries) {
    const m = /^\/images\/([^/]+)\/(.+)\/(\d\d)\.(webp|1x1\.jpg)$/.exec(e.path);
    if (!m || !surfaces.has(m[1])) continue;
    const key = `/images/${m[1]}/${m[2]}/${m[3]}`;
    if (rows.has(key) && m[4] !== 'webp') continue;
    rows.set(key, {
      key,
      surface: m[1],
      title: e.title ?? '',
      alt: alt[`${key}.webp`] ?? alt[`${key}.1x1.jpg`] ?? '',
    });
  }
  return [...rows.values()];
}

export interface NotConceptEntry {
  scope: string;
  reason: string;
  reviewer: string;
  decided_at: string;
}

export interface LabelFinding {
  key: string;
  problem: 'alt-says-concept-title-does-not' | 'title-says-concept-alt-does-not';
}

/** Rule B. */
export function labelFindings(
  slots: DepictionSlot[],
  notConcept: ReadonlySet<string>,
): LabelFinding[] {
  const out: LabelFinding[] = [];
  for (const s of slots) {
    if (notConcept.has(s.key)) continue;
    const t = says(s.title);
    const a = says(s.alt);
    if (a && !t) out.push({ key: s.key, problem: 'alt-says-concept-title-does-not' });
    else if (t && !a) out.push({ key: s.key, problem: 'title-says-concept-alt-does-not' });
  }
  return out;
}

export interface HeroRef {
  /** `missions`, `fleet`, ..., or `site:moon` / `site:mars` for a Worlds site. */
  surface: string;
  id: string;
  /** `/images/<dir>/<folder>/NN` of the blessed slot. */
  key: string;
  status: string | undefined;
}

interface ThumbManifest {
  surfaces: Record<string, { dir: string; slots: Record<string, string> }>;
  sites: Record<string, { slots: Record<string, string> }>;
}

/**
 * The blessed hero of every vehicle entity: entity-thumbs.json surfaces that list vehicles, and the
 * Worlds sites of the Moon and Mars. `statuses[surface][id]` is the entity's `status`.
 */
export function blessedHeroes(
  thumbs: ThumbManifest,
  statuses: Record<string, Record<string, string>>,
): HeroRef[] {
  const out: HeroRef[] = [];
  for (const [surface, st] of Object.entries(statuses)) {
    if (surface.startsWith('site:')) continue;
    const s = thumbs.surfaces[surface];
    if (!s) continue;
    for (const [id, slot] of Object.entries(s.slots))
      out.push({ surface, id, key: `/images/${s.dir}/${id}/${slot}`, status: st[id] });
  }
  for (const body of ['moon', 'mars']) {
    const st = statuses[`site:${body}`] ?? {};
    for (const [id, frag] of Object.entries(thumbs.sites[body]?.slots ?? {})) {
      const [dir, folder, slot] = frag.split('/');
      out.push({
        surface: `site:${body}`,
        id,
        key: `/images/${dir}/${folder}/${slot}`,
        status: st[id],
      });
    }
  }
  return out;
}

/** Baseline identity of a hero finding. */
export const heroId = (h: HeroRef): string => `${h.surface}/${h.id} ${h.key}`;

export interface HeroFinding extends HeroRef {
  title: string;
  alt: string;
}

/** Rule A: heroes that are not photographs, before the baseline. */
export function heroFindings(
  heroes: HeroRef[],
  slots: DepictionSlot[],
  notConcept: ReadonlySet<string>,
  waived: ReadonlySet<string>,
): HeroFinding[] {
  const byKey = new Map(slots.map((s) => [s.key, s]));
  const out: HeroFinding[] = [];
  for (const h of heroes) {
    if (h.status === 'PLANNED' || waived.has(h.key) || notConcept.has(h.key)) continue;
    const s = byKey.get(h.key);
    if (!s) continue;
    if (says(s.title) || says(s.alt)) out.push({ ...h, title: s.title, alt: s.alt });
  }
  return out;
}

/** Heroes with no `status`: not exempt, listed so the data can be filled. */
export const heroesWithoutStatus = (heroes: HeroRef[]): HeroRef[] =>
  heroes.filter((h) => h.status === undefined);

export function diffBaseline(
  found: string[],
  baseline: string[],
): { added: string[]; cleared: string[] } {
  const f = new Set(found);
  const b = new Set(baseline);
  return {
    added: found.filter((x) => !b.has(x)),
    cleared: baseline.filter((x) => !f.has(x)),
  };
}

/** `/images/a/b/01.webp` or a stem to the stem; scopes of waivers and not_concept use stems. */
export const scopeSet = (entries: { scope: string }[] | undefined): Set<string> =>
  new Set((entries ?? []).map((e) => slotKey(e.scope)));
