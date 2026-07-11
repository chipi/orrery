// Gyro → OrbitControls bridge (RFC-020 §6) for the /iss + /tiangong stations.
//
// three@0.128's jsm OrbitControls keeps rotateLeft/rotateUp private, so we orbit
// the camera around the target manually with spherical math and let
// controls.update() finalise. Call once per frame, BEFORE controls.update().

import * as THREE from 'three';
import { gyro } from './device-orientation';

const _offset = new THREE.Vector3();
const _sph = new THREE.Spherical();
const EPS = 0.05; // keep off the poles so azimuth stays stable

/**
 * Apply this frame's gyro delta to an OrbitControls camera by rotating it around
 * `target`. Returns true if the camera moved. Consumes the gyro delta either way,
 * so callers should invoke it every frame (or `gyro.consume()` themselves) to
 * keep the service's internal offset in sync and avoid a jump on re-engage.
 */
export function applyGyroOrbit(camera: THREE.Camera, target: THREE.Vector3): boolean {
  const { dAz, dEl } = gyro.consume();
  if (dAz === 0 && dEl === 0) return false;
  _offset.copy(camera.position).sub(target);
  _sph.setFromVector3(_offset);
  _sph.theta -= dAz;
  _sph.phi = Math.max(EPS, Math.min(Math.PI - EPS, _sph.phi - dEl));
  _offset.setFromSpherical(_sph);
  camera.position.copy(target).add(_offset);
  return true;
}
