// Nested-context / scale-shell model for /explore v2 (RFC-032 C-A / §3).
//
// The universe is too large for one float coordinate space, so it is a stack of
// Contexts — each with its own units + origin + scene scale. You *zoom within* a
// context; crossing a boundary *re-bases* the camera into the neighbour's space.
// This module is the pure spine (no THREE): the Context shape, the physically-
// correct re-basing math (the RFC §8 "precision at the boundary" risk), and the
// boundary-crossing state machine. The WebGL scene wiring lives elsewhere.
//
// Slice 0 registers two contexts: SolarSystem (context-0, units AU, the untouched
// v1 scene) and Neighborhood (units pc, the real HYG star field). Later slices
// add Milky Way, Local Group, … outward as parents.

export type ContextUnits = 'AU' | 'pc';

/** 1 parsec = 206265 AU. The one physical constant tying the S0 contexts together. */
export const AU_PER_PARSEC = 206265;

export interface Context {
  id: string;
  /** Outward neighbour (larger scale), or null at the outermost context. */
  parent: string | null;
  /** Inward neighbour (smaller scale), or null at the innermost context. */
  child: string | null;
  units: ContextUnits;
  /** How catalogue distances map to THREE world units in this context. */
  sceneUnitsPerParsec: number;
  /** Camera distance from origin (scene units) above which we cross OUT to parent. */
  outerBoundaryScene: number;
  /** Camera distance from origin (scene units) below which we cross IN to child. */
  innerBoundaryScene: number;
}

// ── Slice 0 contexts ────────────────────────────────────────────────────────
// The hysteresis band (Neighborhood.innerBoundary re-based sits below where an
// outward cross from SolarSystem lands) prevents flicker at the seam: once you
// cross out you must zoom meaningfully back in before dropping back to v1.

/** context-0: the v1 solar system. 1 scene unit = 1 AU (matches the existing scene). */
export const SOLAR_SYSTEM_CONTEXT: Context = {
  id: 'solar-system',
  parent: 'neighborhood',
  child: null,
  units: 'AU',
  sceneUnitsPerParsec: AU_PER_PARSEC,
  outerBoundaryScene: 6000, // AU — past the decorative sky shell (~3000 AU)
  innerBoundaryScene: 0,
};

/** The Stellar Neighborhood: the real HYG field. 1 scene unit = 1 pc. */
export const NEIGHBORHOOD_CONTEXT: Context = {
  id: 'neighborhood',
  parent: 'milky-way', // Slice 5 — zoom out past the field into the galaxy
  child: 'solar-system',
  units: 'pc',
  sceneUnitsPerParsec: 1,
  outerBoundaryScene: Number.POSITIVE_INFINITY,
  innerBoundaryScene: 0.02, // pc (~4125 AU) — below the ~0.0291 pc landing point
};

/**
 * The Milky Way (Slice 5). A face-on SCHEMATIC — not to scale (PRD-030
 * principle 2) — so, like a BodyScene, it's entered by a warp framing with
 * nominal units rather than a physical re-base. `sceneUnitsPerParsec` is nominal;
 * the page drives the Neighborhood↔MilkyWay crossing directly.
 */
export const MILKY_WAY_CONTEXT: Context = {
  id: 'milky-way',
  parent: 'local-group', // Slice 8 — zoom out past the galaxy into the Local Group
  child: 'neighborhood',
  units: 'pc',
  sceneUnitsPerParsec: 1,
  outerBoundaryScene: Number.POSITIVE_INFINITY,
  innerBoundaryScene: 0,
};

/**
 * The Local Group (Slice 8). Like the Milky Way, a SCHEMATIC — not to scale
 * (PRD-030 principle 2) — entered by a warp framing with nominal units; the page
 * drives the MilkyWay↔LocalGroup crossing directly. Outermost context for now.
 */
export const LOCAL_GROUP_CONTEXT: Context = {
  id: 'local-group',
  parent: 'local-sheet', // WS-1 — zoom out past the Local Group into the Local Sheet
  child: 'milky-way',
  units: 'pc',
  sceneUnitsPerParsec: 1,
  outerBoundaryScene: Number.POSITIVE_INFINITY,
  innerBoundaryScene: 0,
};

// #454 (WS-1) — the Local Sheet / Local Volume: the galaxy groups within ~10 Mpc.
// Schematic like the Local Group + Milky Way shells.
export const LOCAL_SHEET_CONTEXT: Context = {
  id: 'local-sheet',
  parent: 'virgo', // WS-5b — zoom out past the Local Sheet into the Virgo Supercluster
  child: 'local-group',
  units: 'pc',
  sceneUnitsPerParsec: 1,
  outerBoundaryScene: Number.POSITIVE_INFINITY,
  innerBoundaryScene: 0,
};

// #455 (WS-5b) — the Virgo Supercluster / Local Supercluster: the ~33 Mpc
// supercluster the Local Group belongs to. Schematic like the shells within it;
// outermost for now (the Laniakea / cosmic-web tiers extend the chain past it).
export const VIRGO_CONTEXT: Context = {
  id: 'virgo',
  parent: 'laniakea', // WS-5c — zoom out past the Virgo Supercluster into Laniakea
  child: 'local-sheet',
  units: 'pc',
  sceneUnitsPerParsec: 1,
  outerBoundaryScene: Number.POSITIVE_INFINITY,
  innerBoundaryScene: 0,
};

// #456 (WS-5c) — the Laniakea Supercluster: the ~160 Mpc basin of attraction the
// Virgo Supercluster is one lobe of. Outermost for now (the cosmic-web tier
// extends the chain past it).
export const LANIAKEA_CONTEXT: Context = {
  id: 'laniakea',
  parent: 'cosmic-web', // WS-5d — zoom out past Laniakea into the cosmic web
  child: 'virgo',
  units: 'pc',
  sceneUnitsPerParsec: 1,
  outerBoundaryScene: Number.POSITIVE_INFINITY,
  innerBoundaryScene: 0,
};

// #457 (WS-5d) — the Cosmic Web: the largest scale in the /explore ladder, the
// foam of superclusters, walls, and voids of the nearby observable universe.
// The outermost context — the ladder ends here.
export const COSMIC_WEB_CONTEXT: Context = {
  id: 'cosmic-web',
  parent: null,
  child: 'laniakea',
  units: 'pc',
  sceneUnitsPerParsec: 1,
  outerBoundaryScene: Number.POSITIVE_INFINITY,
  innerBoundaryScene: 0,
};

/** The context id for a host star's exoplanet BodyScene (Slice 2). */
export function bodyContextId(hostId: string): string {
  return `body-scene:${hostId}`;
}

/**
 * A BodyScene sub-context for an exoplanet host (Slice 2). Entered and left by a
 * cinematic Navigator warp (`setActive` + framing), not a physical re-base, so
 * the scale is nominal; the outer boundary lets a zoom-out past the framed system
 * cross back to the Neighborhood. `framingRadius` is the BodyScene's outermost
 * orbit in its own display units.
 */
export function makeBodyContext(hostId: string, framingRadius = 40): Context {
  return {
    id: bodyContextId(hostId),
    parent: 'neighborhood',
    child: null,
    units: 'AU',
    sceneUnitsPerParsec: AU_PER_PARSEC,
    outerBoundaryScene: framingRadius * 4,
    innerBoundaryScene: 0,
  };
}

/**
 * Re-base a camera distance from one context's scene units into another's,
 * preserving the true physical distance. This is the boundary handoff: convert
 * to parsecs in the source frame, then back out in the target frame.
 */
export function rebaseDistance(dist: number, from: Context, to: Context): number {
  const parsecs = dist / from.sceneUnitsPerParsec;
  return parsecs * to.sceneUnitsPerParsec;
}

export type CrossDirection = 'out' | 'in';

export interface Transition {
  direction: CrossDirection;
  to: Context;
}

/**
 * Holds the registered contexts + the active one, and decides boundary crossings
 * from the camera's distance to the origin. Pure state — the scene subscribes and
 * performs the visual handoff (collapse the Sun to a dot, fade the star field in).
 */
export class ContextGraph {
  private readonly contexts = new Map<string, Context>();
  private activeId: string;

  constructor(contexts: Context[], activeId: string) {
    for (const c of contexts) this.contexts.set(c.id, c);
    if (!this.contexts.has(activeId)) {
      throw new Error(`ContextGraph: unknown active context "${activeId}"`);
    }
    this.activeId = activeId;
  }

  get active(): Context {
    return this.contexts.get(this.activeId)!;
  }

  get(id: string): Context | undefined {
    return this.contexts.get(id);
  }

  /** Register (or replace) a context — used to add a host's BodyScene on entry. */
  register(ctx: Context): void {
    this.contexts.set(ctx.id, ctx);
  }

  /** Remove a context by id. No-op if it is absent or currently active. */
  remove(id: string): void {
    if (id !== this.activeId) this.contexts.delete(id);
  }

  /**
   * Force the active context (used when the scene applies a cinematic entry
   * framing at a boundary rather than the raw physical re-base). Throws on an
   * unknown id.
   */
  setActive(id: string): void {
    if (!this.contexts.has(id)) throw new Error(`ContextGraph: unknown context "${id}"`);
    this.activeId = id;
  }

  /**
   * Decide whether the given camera distance (scene units of the active context)
   * crosses a boundary. Returns the pending transition, or null to stay put.
   */
  evaluate(camDistScene: number): Transition | null {
    const a = this.active;
    if (a.parent && camDistScene > a.outerBoundaryScene) {
      const to = this.contexts.get(a.parent);
      if (to) return { direction: 'out', to };
    }
    if (a.child && camDistScene < a.innerBoundaryScene) {
      const to = this.contexts.get(a.child);
      if (to) return { direction: 'in', to };
    }
    return null;
  }

  /**
   * Commit a transition: make the neighbour active and return the re-based camera
   * distance in the new context's scene units.
   */
  cross(transition: Transition, camDistScene: number): number {
    const from = this.active;
    const rebased = rebaseDistance(camDistScene, from, transition.to);
    this.activeId = transition.to.id;
    return rebased;
  }
}
