/**
 * Showcase spacecraft models — detailed, true-size craft for the /fleet line-ups (and any view
 * that wants a craft on its own, not as a station stand-in).
 *
 * Contract every family file (`src/lib/three/showcase/<family>.ts`) follows:
 * - export `SHOWCASE: Record<fleetId, ShowcaseModel>`, keyed by the fleet entry id
 *   (`static/data/fleet/<category>/<id>.json`); the dev review page and the line-up discover
 *   every family file by glob, so no shared registry is edited.
 * - `build()` returns the craft in **metres**, upright as it stands on its launcher (nose /
 *   docking end up), base on y = 0, centred on x = 0, z = 0, front facing +z.
 * - the drawn overall height equals `heightM`, which must equal the fleet entry's
 *   `specs.length_m` (or `height_m`) — the line-up checks it.
 * - `MeshStandardMaterial` only, no textures (procedural detail: panel lines, radiators,
 *   insulation colours, windows, thrusters, docking hardware, antennas, solar arrays).
 * - `refs`: the sources the shape and dimensions were taken from (URL + what it gave).
 */
import type * as THREE from 'three';

export interface ShowcaseRef {
  l: string;
  u: string;
}

export interface ShowcaseModel {
  build: () => THREE.Group;
  /** Overall height of the drawn craft, metres (= fleet specs length/height). */
  heightM: number;
  /** Max diameter of the main body, metres (excluding wings and arrays). */
  diameterM: number;
  refs: ShowcaseRef[];
  /**
   * Winged craft: the line-up lays them on the runway (nose toward +x, belly down) instead of
   * standing them up, so a 37 m orbiter does not dwarf the capsules. `top` says which side of the
   * upright model is the top (cockpit, payload-bay doors): '+z' or '-z'.
   */
  pose?: { kind: 'runway'; top: '+z' | '-z' };
}
