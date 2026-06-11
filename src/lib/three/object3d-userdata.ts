/**
 * `Object3DUserData<T>` — typed-userData wrapper for Three.js
 * `Object3D.userData` reads (#329 B.5).
 *
 * Three.js types `Object3D.userData` as `Record<string, any>`. Every
 * call site that wants to read e.g. `obj.userData.moduleId` either
 * casts (`(obj.userData as { moduleId: string }).moduleId`) or
 * narrows through an `as unknown as` chain. The audit found 27
 * `as unknown as` clusters that this wrapper collapses.
 *
 * The wrapper is intentionally a runtime-light pair: a `tag` writer
 * that stamps a discriminator field on `userData` and a `read`
 * helper that returns `T | null` based on a runtime check of that
 * field. No proxy, no Object.assign cloning — `userData` stays the
 * same object Three.js owns.
 *
 * Usage:
 *
 *   const STATION_MODULE = createUserDataTag<{ moduleId: string }>('stationModule');
 *
 *   // Write side — when building a mesh:
 *   STATION_MODULE.set(mesh, { moduleId: 'cupola' });
 *
 *   // Read side — when handling a pick hit:
 *   const data = STATION_MODULE.read(intersect.object);
 *   if (data) {
 *     selectModule(data.moduleId);  // <- data.moduleId is typed string
 *   }
 *
 * Crucially, `read` is a narrowing function — TypeScript knows the
 * return is `T` (not `any`) inside the `if (data)` branch. No casts
 * needed at call sites.
 */

import type { Object3D } from 'three';

const TAG_KEY = '__orreryUserDataTag';

/**
 * The userData wrapper bundles a write + a read keyed by the same
 * unique tag id. Multiple wrappers on the same mesh (e.g. one for
 * station-module + one for pick-debug) co-exist without colliding
 * because the discriminator is the tag id, not the payload shape.
 */
export interface UserDataTag<T> {
  /**
   * Stamp the payload onto the object's userData. Subsequent
   * `read(obj)` calls return T; reads through other tags return null.
   * Overwrites any prior tag stamped via this wrapper.
   */
  set(obj: Object3D, payload: T): void;
  /**
   * Narrow `obj.userData` to T if the discriminator matches; otherwise
   * return null. Use this in pick handlers and traversal callbacks.
   */
  read(obj: Object3D | null | undefined): T | null;
  /** Tag id (exposed for debugging only — not for direct userData reads). */
  readonly id: string;
}

interface TaggedUserData<T> {
  [TAG_KEY]: string;
  payload: T;
}

/**
 * Create a typed userData wrapper. The `tag` argument is a unique
 * discriminator string — keep them descriptive and unique within the
 * codebase ('stationModule', 'planetMarker', 'tourSitePin').
 */
export function createUserDataTag<T>(tag: string): UserDataTag<T> {
  return {
    id: tag,
    set(obj, payload) {
      // The cast targets the internal storage shape; consumers see
      // userData as `Record<string, any>` and we keep it that way for
      // Three.js compat.
      const slot = obj.userData as Record<string, unknown>;
      const next: TaggedUserData<T> = { [TAG_KEY]: tag, payload };
      slot[tag] = next;
    },
    read(obj) {
      if (obj == null) return null;
      const slot = obj.userData as Record<string, unknown>;
      const entry = slot[tag];
      if (
        entry &&
        typeof entry === 'object' &&
        TAG_KEY in entry &&
        (entry as { [TAG_KEY]: unknown })[TAG_KEY] === tag
      ) {
        return (entry as TaggedUserData<T>).payload;
      }
      return null;
    },
  };
}
