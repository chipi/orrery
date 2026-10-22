/**
 * Place pins on the /earth globe: museums (PRD-027, gold) and ground
 * observatories (PRD-028). One pin + label per place, parented to the
 * planet mesh so they turn with the Earth like the launchpad markers.
 * Each layer picks by its own `userData` key (museumId, observatoryId),
 * kept apart from the surface-site `siteId` picking.
 */
import * as THREE from 'three';
import { latLonToUnitSphere } from '$lib/moon-projection';
import { placeOnSphereTangent } from '$lib/three/place-on-sphere';
import { buildLabel } from '$lib/three-label';

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
  /** Pin + halo; scaled with zoom like the launchpad markers. */
  body: THREE.Group;
  labelGroup: THREE.Group;
  halo: THREE.Mesh;
}

/** Label offsets for pins closer than ~1° of arc, so city clusters
 *  (Washington, Chicago, Florida) don't stack their labels. */
function labelOffsets(museums: PlacePinInput[]): Map<string, THREE.Vector3> {
  const out = new Map<string, THREE.Vector3>();
  const placed: Array<{ lat: number; lon: number; n: number }> = [];
  const steps = [
    new THREE.Vector3(0, 2.6, 0),
    new THREE.Vector3(1.6, 3.4, 0),
    new THREE.Vector3(-1.6, 3.4, 0),
    new THREE.Vector3(0, 4.4, 0),
  ];
  for (const mu of museums) {
    const near = placed.filter(
      (p) => Math.abs(p.lat - mu.lat) < 1 && Math.abs(p.lon - mu.lon) < 1,
    ).length;
    out.set(mu.id, steps[near % steps.length]);
    placed.push({ lat: mu.lat, lon: mu.lon, n: near });
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
  });
}

export function buildPlacePins(
  museums: PlacePinInput[],
  parent: THREE.Object3D,
  planetRadius: number,
  opts: { color: string; pickKey: string },
): { pins: MuseumPin[]; dispose: () => void } {
  const pins: MuseumPin[] = [];
  const offsets = labelOffsets(museums);
  const color = new THREE.Color(opts.color);
  const headGeo = new THREE.SphereGeometry(0.3, 16, 12);
  const stalkGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
  const mat = new THREE.MeshBasicMaterial({ color });
  for (const mu of museums) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    const stalk = new THREE.Mesh(stalkGeo, mat);
    stalk.position.y = 0.4;
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 0.9;
    body.add(stalk, head);
    group.add(body);
    placeOnSphereTangent(group, latLonToUnitSphere(mu.lat, mu.lon), planetRadius);

    const label = buildLabel({
      text: mu.name,
      color: opts.color,
      offset: offsets.get(mu.id),
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
      o.userData = { [opts.pickKey]: mu.id };
    });

    parent.add(group);
    pins.push({ id: mu.id, group, body, labelGroup: label.group, halo });
  }
  return {
    pins,
    dispose: () => {
      for (const p of pins) {
        parent.remove(p.group);
        p.group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            if (o.geometry !== headGeo && o.geometry !== stalkGeo) o.geometry.dispose();
            const mm = o.material as THREE.Material;
            if (mm !== mat) mm.dispose();
          }
        });
      }
      headGeo.dispose();
      stalkGeo.dispose();
      mat.dispose();
    },
  };
}
