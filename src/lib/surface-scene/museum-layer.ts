/**
 * Museum pins on the /earth globe (PRD-027): one gold pin + label per
 * museum, parented to the planet mesh so they turn with the Earth like
 * the launchpad markers. Picked by `userData.museumId`, kept apart from
 * the surface-site `siteId` picking so a museum never reads as a site.
 */
import * as THREE from 'three';
import { latLonToUnitSphere } from '$lib/moon-projection';
import { placeOnSphereTangent } from '$lib/three/place-on-sphere';
import { buildLabel } from '$lib/three-label';
import type { Museum } from '$types/museum';

export const MUSEUM_PIN_COLOR = '#ffc850';

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
function labelOffsets(museums: Museum[]): Map<string, THREE.Vector3> {
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
  museums: Museum[],
  parent: THREE.Object3D,
  planetRadius: number,
): { pins: MuseumPin[]; dispose: () => void } {
  const pins: MuseumPin[] = [];
  const offsets = labelOffsets(museums);
  const color = new THREE.Color(MUSEUM_PIN_COLOR);
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
      color: MUSEUM_PIN_COLOR,
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
      o.userData = { museumId: mu.id };
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
