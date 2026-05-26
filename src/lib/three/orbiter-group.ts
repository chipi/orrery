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
  orbitSpeed: number;
  orbitPhase: number;
  halo?: THREE.Mesh;
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
    orbitSpeed: dimmed ? 0.06 : 0.2,
    orbitPhase,
    halo,
  };
}
