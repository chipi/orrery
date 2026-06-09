import type * as THREE from 'three';
import type { Vec2 } from '$lib/mission-arc';
import type { CislunarTrajectory, CislunarProfile } from '$lib/cislunar-geometry';
import type { DestinationId } from '$lib/lambert-grid.constants';

/**
 * Typed contracts for the /fly per-frame + per-mission updater
 * closures. Extracted from src/routes/fly/+page.svelte during W9
 * wave B (#279).
 *
 * Why: before wave B, the component held nine independent nullable
 * function refs ('let foo: (...) => ... | undefined;') populated
 * deep inside onMount. Callers had to guard each one with '?.()' and
 * a reader had no compile-time guarantee about which calls related
 * to which scene. After wave B, the component holds a single
 * 'flyUpdaters: FlyUpdaters | undefined' object whose typed members
 * make the contract explicit: helio.* drives the heliocentric scene,
 * cislunar.* drives the cislunar scene.
 *
 * The closures themselves still live inside onMount (they close over
 * builder refs + reactive state); this module is types-only at v0.7.
 * Splitting the implementation into factory functions is a follow-up
 * once the typed contract has stabilised.
 */

/** Per-frame + per-mission updaters that mutate the heliocentric
 *  scene built by buildHelioScene (lib/three/fly-helio-scene). */
export interface HelioUpdater {
  /** Build a Three.js TubeGeometry over the planar arc 'pts' with
   *  the given tube radius. Used by the $effect that rebuilds the
   *  outbound + return tubes when a new mission's outPts / retPts
   *  arrays land. Custom builder (not THREE.TubeGeometry) because the
   *  cross-section must sit exactly at pts[i] for the shader uniforms
   *  to line up with the spacecraft sprite — see the #228 comment
   *  block in the component for the full rationale. */
  rebuildTubeGeometry(pts: Vec2[], radius: number): THREE.BufferGeometry;
  /** Recompute the apsides (perihelion + aphelion) marker positions
   *  from the active outbound arc. Called on mission load + arc
   *  rebuild. */
  apsidesRecompute(): void;
  /** Reset the OrbitControls target + camera position back to the
   *  per-destination default framing (see cameraDistanceFor). */
  resetCamera(): void;
  /** Mutate the destination body's mesh geometry + material colour
   *  + orbit ring to match the active mission's target. Re-export of
   *  HelioSceneHandles.setDestination so wave-B callers can address
   *  the helio updater as one typed object. */
  applyDestination(id: DestinationId): void;
  /** Refresh the LAUNCH / ARRIVAL / RETURN sprite labels (two-line
   *  texture: role label + date stamp). Called on mission load + mode
   *  flip. RETURN triple is optional — provided only for round-trip
   *  missions; one-way missions leave the ret sprite untouched and
   *  hidden. */
  refreshLabelSprites(
    depName: string,
    depLabel: string,
    depColor: string,
    arrName: string,
    arrLabel: string,
    arrColor: string,
    retName?: string,
    retLabel?: string,
    retColor?: string,
  ): void;
}

/** Per-frame + per-mission updaters that mutate the cislunar scene
 *  built by buildCislunarScene (lib/three/fly-cislunar-scene). */
export interface CislunarUpdater {
  /** Rebuild the trajectory polyline geometry from a fresh cislunar
   *  trajectory. Pass null on non-Moon missions to clear the previous
   *  geometry. */
  rebuildLines(traj: CislunarTrajectory | null): void;
  /** Rebuild the per-phase annotation labels (TLI, LOI, descent, etc.)
   *  from the active trajectory + the source CislunarProfile (for
   *  event MET lookups). */
  rebuildAnnotations(traj: CislunarTrajectory | null, profile: CislunarProfile | undefined): void;
  /** Move the spacecraft sprite to the trajectory position at the
   *  given MET. Called every animation frame on Moon missions. */
  updateSpacecraft(traj: CislunarTrajectory | null, met_days: number): void;
  /** Update the shader uProgress uniform on the trajectory line so
   *  the bright/dim split tracks the spacecraft. Called every
   *  animation frame on Moon missions. */
  updateLineProgress(traj: CislunarTrajectory | null, met_days: number): void;
}

/** The aggregate handle the component holds. Replaces nine
 *  independent nullable closure refs from pre-wave-B onMount. */
export interface FlyUpdaters {
  helio: HelioUpdater;
  cislunar: CislunarUpdater;
}
