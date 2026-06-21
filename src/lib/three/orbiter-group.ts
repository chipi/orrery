/**
 * One-shot orbital-marker factory (#42).
 *
 * Both /moon and /mars's `rebuildOrbitalMarkers` walked through the
 * same recipe: build a parent group, drop in a tilted ring (per
 * altitude + inclination), spawn the satellite-model factory dot,
 * dim non-active orbiters, attach pickable-hit invisible sphere +
 * userData tags, add a selection halo. Optional label for /mars
 * (which carries spacecraft labels on the orbiter ring; /moon
 * doesn't).
 *
 * Returns the constructed marker record — caller scene-adds the
 * `group` and pushes the record into its own array. Animation logic
 * (orbit-phase advancement, halo styling, etc.) stays in the route
 * because it's tightly coupled to per-route camera state.
 */
import * as THREE from 'three';
import { buildSatelliteModel } from '$lib/earth-satellite-models';
import { createMarkerHalo } from './marker-halo';
import { createOrbiterRing } from './orbiter-ring';
import { dimMaterials } from './dim-materials';
import { attachPickableHit } from './pickable-hit';
import { buildLabel } from '$lib/three-label';

export type OrbiterMarker = {
  group: THREE.Group;
  ringMesh: THREE.Mesh;
  dotGroup: THREE.Group;
  siteId: string;
  ringRadius: number;
  inclinationRad: number;
  orbitSpeed: number;
  orbitPhase: number;
  halo?: THREE.Object3D;
};

export function buildOrbiterGroup({
  site,
  color,
  ringRadius,
  inclinationRad,
  dimmed,
  orbitPhase,
  activeRingOpacity,
  dimmedRingOpacity,
  modelScale = 2.0,
  haloRadius = 1.8,
  label,
}: {
  site: { id: string; name?: string | null };
  color: string;
  ringRadius: number;
  inclinationRad: number;
  dimmed: boolean;
  orbitPhase: number;
  activeRingOpacity?: number;
  dimmedRingOpacity?: number;
  modelScale?: number;
  haloRadius?: number;
  label?: { offset?: THREE.Vector3; size?: number };
}): OrbiterMarker {
  const group = new THREE.Group();
  const ringMesh = createOrbiterRing({
    ringRadius,
    inclinationRad,
    color,
    dimmed,
    activeOpacity: activeRingOpacity,
    dimmedOpacity: dimmedRingOpacity,
  });
  group.add(ringMesh);

  const dotGroup = buildSatelliteModel(site.id, color);
  dotGroup.scale.setScalar(modelScale);
  if (dimmed) dimMaterials(dotGroup);
  attachPickableHit({ dotGroup, siteId: site.id });
  group.add(dotGroup);

  if (label) {
    const builtLabel = buildLabel({
      text: site.name ?? site.id,
      color,
      offset: label.offset ?? new THREE.Vector3(0, 2.4, 0),
      size: label.size ?? 1.4,
    });
    dotGroup.add(builtLabel.group);
  }

  const halo = createMarkerHalo(color, haloRadius);
  dotGroup.add(halo);

  return {
    group,
    ringMesh,
    dotGroup,
    siteId: site.id,
    ringRadius,
    inclinationRad,
    orbitSpeed: dimmed ? 0.06 : 0.2,
    orbitPhase,
    halo,
  };
}

/**
 * Per-frame orbiter dot positioning (#42).
 *
 * Advances `orbitPhase` by `dt * orbitSpeed` (skipped under reduced
 * motion to comply with ADR-025), then computes the dot's local
 * position on the inclined ring. The ring is rotated around X by its
 * inclination — replicate that rotation here so the dot tracks the
 * ring exactly. Mutates `om.orbitPhase` and `om.dotGroup.position`.
 */
export function tickOrbiterDot(om: OrbiterMarker, dt: number, reducedMotion: boolean): void {
  if (!reducedMotion) om.orbitPhase += dt * om.orbitSpeed;
  const a = om.orbitPhase;
  const lx = Math.cos(a) * om.ringRadius;
  const lz = Math.sin(a) * om.ringRadius;
  // Dot rides the same XZ-plane circle the ring is built from, inclined by
  // the true inclination (NOT ringMesh.rotation.x, which now carries the
  // extra π/2 that lays the RingGeometry flat — see orbiter-ring.ts).
  const inc = om.inclinationRad;
  om.dotGroup.position.set(lx, -lz * Math.sin(inc), lz * Math.cos(inc));
}

/**
 * Show/hide an orbiter marker based on the two relevant layer chips:
 * ORBITERS toggles the spacecraft model, ORBITS toggles the ring line
 * independently (cleaner sky for users who just want to see current
 * positions). Halo visibility is route-specific (varies by zoom +
 * selection state) so it stays per-route.
 */
export function applyOrbiterLayerVisibility(
  om: OrbiterMarker,
  { showOrbiters, showOrbits }: { showOrbiters: boolean; showOrbits: boolean },
): void {
  om.dotGroup.visible = showOrbiters;
  om.ringMesh.visible = showOrbiters && showOrbits;
}
