/**
 * Select = focus, solar system (UXD-019): the one description of "a body the user can select".
 * Every way to pick a body (canvas, INDEX row, "Who lives here", belt member, `?id=`, a panel
 * link) reduces to a `BodyRef`; the page's `selectBody` takes it to the panel, the ring, the
 * camera and, when its chip is off, to the chip. Pure and framework-free, like its neighbour
 * `scale-shell-controller` whose `?id=` ladder it wraps.
 */
import { resolveSolarBodyTarget, type BodyMembership } from './scale-shell-controller';

export type BodyKind = 'sun' | 'planet' | 'moon' | 'small-body' | 'belt';

export interface BodyRef {
  kind: BodyKind;
  id: string;
  /** A moon's parent planet id. */
  parent?: string;
}

/** The `layers` keys that hide solar-system bodies (PATHS hides trajectories, not bodies). */
export type BodyChip = 'planets' | 'dwarfs' | 'comets' | 'interstellar';

export type SmallBodyType = 'dwarf' | 'comet' | 'interstellar' | 'asteroid' | 'kbo';

/** What the scene draws: planet ids, small-body ids, `parent:satellite` keys. */
export interface SceneMembers {
  planets: ReadonlySet<string>;
  smallBodies: ReadonlySet<string>;
  moons: ReadonlySet<string>;
}

/**
 * Pluto is in planets.json and small-bodies.json; the scene draws one body, a planet-style
 * mesh, and one panel opens for it everywhere: the small-body panel (UXD-019).
 */
export const PLANET_DRAWN_SMALL_BODIES: ReadonlySet<string> = new Set(['pluto']);

/** The `?id=` ladder, as a ref. Unknown or empty ids give null (never a throw). */
export function resolveBodyRef(
  id: string | null | undefined,
  membership: BodyMembership,
): BodyRef | null {
  const target = resolveSolarBodyTarget(id, membership);
  if (!target) return null;
  switch (target.kind) {
    case 'sun':
      return { kind: 'sun', id: 'sun' };
    case 'planet':
      return { kind: 'planet', id: target.id };
    case 'smallBody':
      return { kind: 'small-body', id: target.id };
    case 'belt':
      return { kind: 'belt', id: target.belt };
    case 'satellite':
      return { kind: 'moon', id: target.satelliteId, parent: target.parentId };
  }
}

/** The planet-group id a ref is drawn as: its own for a planet, Pluto for the small body Pluto. */
export function scenePlanetIdOf(ref: BodyRef): string | null {
  if (ref.kind === 'planet') return ref.id;
  if (ref.kind === 'small-body' && PLANET_DRAWN_SMALL_BODIES.has(ref.id)) return ref.id;
  return null;
}

/** The chip a small-body type rides: asteroids and Arrokoth are dwarfs (UXD-019). */
export function chipForSmallBodyType(type: SmallBodyType): BodyChip {
  if (type === 'comet') return 'comets';
  if (type === 'interstellar') return 'interstellar';
  return 'dwarfs';
}

/** The chip that shows a ref; null for the Sun and the belts, which no chip hides. */
export function chipOf(
  ref: BodyRef,
  typeOf: (smallBodyId: string) => SmallBodyType | undefined,
): BodyChip | null {
  if (ref.kind === 'planet' || ref.kind === 'moon') return 'planets';
  if (ref.kind !== 'small-body') return null;
  if (PLANET_DRAWN_SMALL_BODIES.has(ref.id)) return 'planets';
  const type = typeOf(ref.id);
  return type ? chipForSmallBodyType(type) : null;
}

/** True when the ref's chip is off, so its body is not drawn. */
export function isBodyHidden(
  ref: BodyRef,
  layers: Readonly<Record<BodyChip, boolean>>,
  typeOf: (smallBodyId: string) => SmallBodyType | undefined,
): boolean {
  const chip = chipOf(ref, typeOf);
  return chip !== null && !layers[chip];
}

/** True when the scene has an object for the ref: only then is there anything to link or focus. */
export function isBodyInScene(ref: BodyRef, scene: SceneMembers): boolean {
  switch (ref.kind) {
    case 'sun':
      return true;
    case 'planet':
      return scene.planets.has(ref.id);
    case 'small-body':
      return scene.smallBodies.has(ref.id) || scene.planets.has(ref.id);
    case 'moon':
      return !!ref.parent && scene.moons.has(`${ref.parent}:${ref.id}`);
    case 'belt':
      return ref.id === 'asteroid' || ref.id === 'kuiper';
  }
}

/** Camera frame of a focus: the landing distance and the zoom range that holds while focused. */
export interface FocusFrame {
  r: number;
  minR: number;
  maxR: number;
}

/** Heliocentric zoom range the belts and the Sun keep (the scene's own default). */
export const HELIO_FRAME = { minR: 60, maxR: 2400 } as const;

/** A belt frames from the Sun: 2.4 x the asteroid belt's outer radius, 2.3 x the Kuiper belt's. */
export const BELT_FOCUS_R: Record<'asteroid' | 'kuiper', number> = { asteroid: 570, kuiper: 1430 };

/**
 * Landing frame around a body of `radius` scene units. A planet or moon lands at 8 radii and
 * zooms between 1.5 and 50; a small body, a dot by comparison, at 14 radii between 4 and 600
 * units (a comet's 1.2 radius gives 17 units, a dwarf's 1.8 gives 25).
 */
export function focusFrameFor(kind: 'planet' | 'moon' | 'small-body', radius: number): FocusFrame {
  if (kind === 'small-body') return { r: radius * 14, minR: 4, maxR: 600 };
  return { r: radius * 8, minR: radius * 1.5, maxR: radius * 50 };
}

/** The belt's landing frame (the Sun is the target). */
export function beltFocusFrame(belt: 'asteroid' | 'kuiper'): FocusFrame {
  return { r: BELT_FOCUS_R[belt], ...HELIO_FRAME };
}
