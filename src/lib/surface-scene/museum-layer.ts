/**
 * Place pins on the /earth globe: museums (PRD-027, gold) and ground
 * observatories (PRD-028, light blue). Each pin is a small 3D model in the
 * launchpad / lander marker style (src/lib/earth-place-models.ts), parented
 * to the planet mesh so it turns with the Earth; each layer picks by its own
 * `userData` key (museumId, observatoryId), kept apart from the surface-site
 * `siteId`.
 */
import * as THREE from 'three';
import { latLonToUnitSphere } from '$lib/moon-projection';
import { placeOnSphereTangent } from '$lib/three/place-on-sphere';
import { buildLabel } from '$lib/three-label';
import { buildMuseumModel } from '$lib/earth-place-models';

export const MUSEUM_PIN_COLOR = '#ffc850';
export const OBSERVATORY_PIN_COLOR = '#7fe0ff';

/** What a place layer needs from each item. */
export interface PlacePinInput {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface MuseumPin {
  id: string;
  group: THREE.Group;
  /** Model + halo; scaled with zoom like the launchpad markers. */
  body: THREE.Group;
  labelGroup: THREE.Group;
  halo: THREE.Mesh;
}

/** Label offsets for pins closer than ~1° of arc, so city clusters
 *  (Washington, Chicago, Florida) don't stack their labels. */
function labelOffsets(places: PlacePinInput[]): Map<string, THREE.Vector3> {
  const out = new Map<string, THREE.Vector3>();
  const placed: Array<{ lat: number; lon: number }> = [];
  const steps = [
    new THREE.Vector3(0, 2.8, 0),
    new THREE.Vector3(1.6, 3.6, 0),
    new THREE.Vector3(-1.6, 3.6, 0),
    new THREE.Vector3(0, 4.6, 0),
  ];
  for (const p of places) {
    const near = placed.filter(
      (q) => Math.abs(q.lat - p.lat) < 1 && Math.abs(q.lon - p.lon) < 1,
    ).length;
    out.set(p.id, steps[near % steps.length]);
    placed.push({ lat: p.lat, lon: p.lon });
  }
  return out;
}

export function buildMuseumPins(
  museums: PlacePinInput[],
  parent: THREE.Object3D,
  planetRadius: number,
): { pins: MuseumPin[]; dispose: () => void } {
  return buildPlacePins(museums, parent, planetRadius, {
    color: MUSEUM_PIN_COLOR,
    pickKey: 'museumId',
    modelFor: () => buildMuseumModel(MUSEUM_PIN_COLOR),
  });
}

export function buildPlacePins(
  places: PlacePinInput[],
  parent: THREE.Object3D,
  planetRadius: number,
  opts: { color: string; pickKey: string; modelFor: (item: PlacePinInput) => THREE.Group },
): { pins: MuseumPin[]; dispose: () => void } {
  const pins: MuseumPin[] = [];
  const offsets = labelOffsets(places);
  const color = new THREE.Color(opts.color);
  for (const place of places) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    body.add(opts.modelFor(place));
    group.add(body);
    placeOnSphereTangent(group, latLonToUnitSphere(place.lat, place.lon), planetRadius);

    const label = buildLabel({
      text: place.name,
      color: opts.color,
      offset: offsets.get(place.id),
      size: 1.3,
    });
    group.add(label.group);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 32),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.05;
    halo.visible = false;
    body.add(halo);

    // Generous invisible click target, like the site markers.
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.y = 1;
    group.add(hit);
    group.traverse((o) => {
      o.userData = { [opts.pickKey]: place.id };
    });

    parent.add(group);
    pins.push({ id: place.id, group, body, labelGroup: label.group, halo });
  }
  return {
    pins,
    dispose: () => {
      for (const p of pins) {
        parent.remove(p.group);
        p.group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
      }
    },
  };
}
