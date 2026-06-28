/**
 * Earth-orbital satellite-rendering subsystem — per-EarthObject
 * 3D model + label + halo + orbit ring + invisible hit sphere.
 * Pulled out of EarthOrbitalScene's onMount so #290 Slice 4 can
 * mount the same rendering inside SurfaceScene gated on
 * `config.earthOrbitalLayers.satellites`.
 *
 * Each satellite group lives at a position derived from:
 *   - phase angle (i * 2.4 mod 2π) — distributes around the ring
 *   - inclination (from EarthObject.inclination, degrees → radians)
 *   - ascending-node angle (hashed from the id for visual spread)
 *   - orbit radius (altToOrbitRadius of the altitude or earth_distance_km)
 *
 * Moon-orbiters position relative to the moon-ghost mesh, not Earth.
 * Constellation members (count > 1) skip the per-spacecraft orbit
 * ring since their cluster representation already implies the ring.
 */
import * as THREE from 'three';
import { altToSurfaceScene } from '$lib/scale';
import { categoriseEarthSatellite } from '$lib/earth-satellite-category';
import { buildSatelliteModel } from '$lib/earth-satellite-models';
import { buildLabel } from '$lib/three-label';
import type { EarthObject } from '$types/earth-object';

const ORIGIN = new THREE.Vector3(0, 0, 0);

export interface SatObj {
  group: THREE.Group;
  id: string;
  orbitR: number;
  phase: number;
  inclRad: number;
  nodeRad: number;
  ringMesh?: THREE.Mesh;
  halo: THREE.Mesh;
  category: ReturnType<typeof categoriseEarthSatellite>;
}

export interface SatelliteLayerOpts {
  /** Three.js scene to add the satellite + ring meshes to. */
  scene: THREE.Scene;
  /** EarthObjects to render. */
  objects: EarthObject[];
  /** Scene-space distance from Earth centre to the moon-ghost centre
   *  (for moon-orbiter positioning — the moon ghost sits at +X moonR). */
  moonR: number;
  /** Visible radius of the moon-ghost sphere (config radiusUnits, ~2.0).
   *  Moon-orbiter orbits are sized as a readable band just outside it. */
  moonGhostRadius: number;
  /** SurfaceScene planetRadius (always 30) — required to shift the
   *  log-compressed orbit math out of the planet sphere. The legacy
   *  `altToOrbitRadius` baseline placed ISS at radius 10.9 — inside
   *  the 30-unit Earth → fully occluded. (#303 follow-up.) */
  planetRadius: number;
}

/**
 * Selection-halo factory — small flat ring rendered around a marker.
 * Visibility flips via the caller's $effect tied to `selected`.
 */
export function makeSatelliteHalo(color: string, radius = 1.6): THREE.Mesh {
  const haloGeo = new THREE.RingGeometry(radius * 0.92, radius, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.visible = false;
  return halo;
}

/**
 * Stable hash → [0, 2π) so each orbit's ascending-node longitude is
 * deterministic but visually spread out (otherwise every 51.6° orbit
 * shares a single tilt and they all overlap).
 */
export function hashIdToNodeAngle(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ((h % 360) / 360) * Math.PI * 2;
}

/**
 * Build satellite groups for every EarthObject. Returns the array of
 * SatObj records (caller stores for animate-loop iteration + click
 * disambiguation) plus a dispose() that walks every group + ring and
 * frees the geometry / material handles.
 *
 * Safe to call multiple times — caller should dispose() the previous
 * handle first when re-rendering on data change.
 */
export function buildSatelliteLayer(opts: SatelliteLayerOpts): {
  sats: SatObj[];
  dispose: () => void;
} {
  const sats: SatObj[] = [];

  for (let i = 0; i < opts.objects.length; i++) {
    const o = opts.objects[i];
    const category = categoriseEarthSatellite(o.id);
    const group = buildSatelliteModel(o.id, o.color);

    // Phase angle — distributes objects around the regime ring.
    const phase = (i * 2.4) % (Math.PI * 2);

    let orbitR: number;
    const inclRad = ((o.inclination ?? 0) * Math.PI) / 180;
    const nodeRad = hashIdToNodeAngle(o.id);
    // Local orbit position on a phase/inclination/node-spread circle.
    // Earth orbiters ride an Earth-centred ring; moon orbiters ride a
    // small ring around the moon ghost at +X moonR.
    let center = ORIGIN;
    if (category === 'moon-orbiter') {
      // Compress the real low-lunar altitudes (LRO 50 km … SMART-1 470 km,
      // all far below the Moon's radius) into a readable band just outside
      // the moon-ghost sphere so the 8 orbiters fan out instead of stacking
      // on one point. Higher altitude → slightly wider ring.
      const altKm = Math.min(o.altitude_km ?? 100, 500);
      orbitR = opts.moonGhostRadius + 0.8 + (altKm / 500) * 1.4;
      center = new THREE.Vector3(opts.moonR, 0, 0);
    } else {
      const alt = o.altitude_km ?? o.earth_distance_km;
      orbitR = altToSurfaceScene(opts.planetRadius, alt);
    }
    const lx = Math.cos(phase) * orbitR;
    const ly = Math.sin(phase) * orbitR * Math.sin(inclRad);
    const lz = Math.sin(phase) * orbitR * Math.cos(inclRad);
    const cn = Math.cos(nodeRad);
    const sn = Math.sin(nodeRad);
    group.position.set(
      center.x + (lx * cn + lz * sn),
      center.y + ly,
      center.z + (-lx * sn + lz * cn),
    );
    group.userData = { id: o.id };

    // Invisible hit sphere — gives clicks a 3u effective radius
    // (vs the visible model's ~0.5u) so the user can grab moving
    // spacecraft without millimetre-perfect pointer accuracy.
    // Moon orbiters sit on a tight ~3-unit ring, so a 3u hit sphere would
    // swallow its neighbours; shrink it there to keep clicks disambiguable.
    const hitR = category === 'moon-orbiter' ? 1.1 : 3.0;
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(hitR, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitSphere.userData = { id: o.id };
    group.add(hitSphere);

    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        obj.userData = { id: o.id };
      }
    });

    // Label with leader-line — tag floats above the spacecraft.
    const label = buildLabel({
      text: o.short ?? o.name ?? o.id,
      color: o.color,
      offset: new THREE.Vector3(0, 1.8, 0),
      size: 1.2,
    });
    group.add(label.group);

    opts.scene.add(group);

    // Per-spacecraft orbit ring — skip constellations (count > 1) since
    // their cluster already implies the surface. Moon orbiters now get a
    // ring too, centred on the moon ghost rather than Earth.
    let ringMesh: THREE.Mesh | undefined;
    if (o.count === 1) {
      const ringGeo = new THREE.RingGeometry(orbitR - 0.03, orbitR + 0.03, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: o.color,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
      });
      ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.order = 'YXZ';
      // RingGeometry lies in the XY plane; the dot orbits an XZ-based
      // circle inclined by inclRad (ly = +sin·sin(inc)). Lay the ring flat
      // and incline it to MATCH that plane — π/2 − inclRad (inc=0 →
      // equatorial/horizontal, inc=90° → polar). Without the π/2 the ring
      // sat vertical and the dot floated off it (e.g. Hubble).
      ringMesh.rotation.x = Math.PI / 2 - inclRad;
      ringMesh.rotation.y = nodeRad;
      if (category === 'moon-orbiter') ringMesh.position.set(opts.moonR, 0, 0);
      opts.scene.add(ringMesh);
    }

    const halo = makeSatelliteHalo(o.color, 1.6);
    group.add(halo);

    sats.push({ group, id: o.id, orbitR, phase, inclRad, nodeRad, ringMesh, halo, category });
  }

  return {
    sats,
    dispose: () => {
      for (const s of sats) {
        s.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material?.dispose();
          }
        });
        opts.scene.remove(s.group);
        if (s.ringMesh) {
          s.ringMesh.geometry.dispose();
          (s.ringMesh.material as THREE.Material).dispose();
          opts.scene.remove(s.ringMesh);
        }
      }
      sats.length = 0;
    },
  };
}
