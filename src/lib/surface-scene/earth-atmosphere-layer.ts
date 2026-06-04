/**
 * Earth-specific atmosphere subsystems — Karman-line shell + ring at
 * 100 km, plus stratospheric ozone polar caps at ~30 km. Used by
 * /earth (currently via EarthOrbitalScene; #290 Slice 4 wires the
 * same helpers into SurfaceScene so /earth is unified with /moon
 * and /mars).
 *
 * Both subsystems are science-lens-gated (ADR-055):
 *   - 'atmosphere' lens → Karman-line shell + equatorial ring
 *   - 'ozone' lens → south + north polar caps
 *
 * Each mount function returns the created Three.js objects plus a
 * dispose callback. Caller is responsible for adding the objects to
 * its scene + calling dispose() on teardown.
 */
import * as THREE from 'three';
import { altToSurfaceScene } from '$lib/scale';
import { onLayerChange } from '$lib/science-layers';

export interface KarmanLineShellOpts {
  color: number;
  /** Altitude in km — 100 for Earth's Kármán line. */
  altitudeKm: number;
  /** Volumetric shell opacity (0..1) */
  meshOpacity: number;
  /** Equatorial ring opacity (0..1) — for legibility */
  ringOpacity: number;
  /** SurfaceScene planetRadius (always 30) — required to shift the
   *  log-compressed altitude math out of the planet sphere. The legacy
   *  `altToOrbitRadius` baseline placed shells at 9.4 (inside the
   *  30-unit Earth) → fully occluded. (#303 follow-up.) */
  planetRadius: number;
}

export interface KarmanLineShellHandle {
  shell: THREE.Mesh;
  ring: THREE.Mesh;
  dispose: () => void;
}

/**
 * Build the Karman-line atmosphere shell + equatorial ring.
 * Both meshes start hidden; the layer-change listener flips
 * visibility based on the `atmosphere` science lens.
 */
export function buildKarmanLineShell(opts: KarmanLineShellOpts): KarmanLineShellHandle {
  const karmanRadius = altToSurfaceScene(opts.planetRadius, opts.altitudeKm);

  const shellGeo = new THREE.SphereGeometry(karmanRadius, 48, 48);
  const shellMat = new THREE.MeshBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: opts.meshOpacity,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.userData.layerKey = 'atmosphere';
  shell.visible = false;

  const ringGeo = new THREE.RingGeometry(karmanRadius * 0.999, karmanRadius * 1.002, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: opts.ringOpacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.userData.layerKey = 'atmosphere';
  ring.visible = false;

  const stopWatch = onLayerChange('atmosphere', (on) => {
    shell.visible = on;
    ring.visible = on;
  });

  return {
    shell,
    ring,
    dispose: () => {
      stopWatch?.();
      shellGeo.dispose();
      shellMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
    },
  };
}

export interface OzoneOverlayOpts {
  /** Altitude in km — 30 km stratospheric ozone layer. */
  altitudeKm: number;
  south: { color: number; opacity: number; phiCoverageRatio: number };
  north: { color: number; opacity: number; phiCoverageRatio: number };
  /** See KarmanLineShellOpts.planetRadius. */
  planetRadius: number;
}

export interface OzoneOverlayHandle {
  south: THREE.Mesh;
  north: THREE.Mesh;
  dispose: () => void;
}

/**
 * Build the south + north stratospheric-ozone polar caps. Each cap
 * is a spherical-segment SphereGeometry with a phi-range that puts
 * it just over the corresponding pole. South cap is larger (Antarctic
 * ozone-hole spring depletion); north is smaller (Arctic winter
 * depletion). Both layer-gated by the 'ozone' science lens.
 */
export function buildOzoneOverlay(opts: OzoneOverlayOpts): OzoneOverlayHandle {
  const ozoneRadius = altToSurfaceScene(opts.planetRadius, opts.altitudeKm);

  // South cap — phi starts at (π - coverageRatio*π) so the cap wraps
  // the south pole. Antarctic hole defaults to ~0.34π = ~61° opening
  // from the pole, matching the canonical EarthOrbitalScene values.
  const southPhiStart = Math.PI * (1 - opts.south.phiCoverageRatio);
  const southPhiLength = Math.PI * opts.south.phiCoverageRatio;
  const southGeo = new THREE.SphereGeometry(
    ozoneRadius,
    48,
    24,
    0,
    Math.PI * 2,
    southPhiStart,
    southPhiLength,
  );
  const southMat = new THREE.MeshBasicMaterial({
    color: opts.south.color,
    transparent: true,
    opacity: opts.south.opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const south = new THREE.Mesh(southGeo, southMat);
  south.userData.layerKey = 'ozone';
  south.visible = false;

  // North cap — phi starts at 0 (north pole), length = coverageRatio * π.
  const northPhiLength = Math.PI * opts.north.phiCoverageRatio;
  const northGeo = new THREE.SphereGeometry(ozoneRadius, 48, 24, 0, Math.PI * 2, 0, northPhiLength);
  const northMat = new THREE.MeshBasicMaterial({
    color: opts.north.color,
    transparent: true,
    opacity: opts.north.opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const north = new THREE.Mesh(northGeo, northMat);
  north.userData.layerKey = 'ozone';
  north.visible = false;

  const stopWatch = onLayerChange('ozone', (on) => {
    south.visible = on;
    north.visible = on;
  });

  return {
    south,
    north,
    dispose: () => {
      stopWatch?.();
      southGeo.dispose();
      southMat.dispose();
      northGeo.dispose();
      northMat.dispose();
    },
  };
}
