import * as THREE from 'three';

/** Hang Saturn's rings on the context-planet Saturn: a flyby of Saturn on a mission bound elsewhere
 *  (Voyager 1 and 2, Pioneer 11) draws the context mesh, not the destination mesh, which has its own
 *  ring group. */
export function addContextPlanetRings(meshes: Map<string, THREE.Mesh>, saturnSize: number): void {
  const saturn = meshes.get('saturn');
  if (saturn) saturn.add(buildSaturnRings(saturnSize));
}

/** Build a Saturn-style multi-band ring system around a body of the
 *  given radius. Re-uses the canonical C / B / A / Cassini / Encke / F
 *  band ratios shipped for /explore (commit ce7e97a20) but rescaled to
 *  /fly's much smaller body diameters. Returns a group the caller can
 *  add/remove as a unit when the destination switches between Saturn
 *  and another body. */
export function buildSaturnRings(size: number): THREE.Group {
  const r0 = size * 1.4;
  const rOuter = size * 2.6;
  const span = rOuter - r0;
  const group = new THREE.Group();
  const bands: Array<{ inner: number; outer: number; color: number; opacity: number }> = [
    { inner: 0.0, outer: 0.18, color: 0x8a7858, opacity: 0.35 },
    { inner: 0.18, outer: 0.55, color: 0xf1d7a3, opacity: 0.62 },
    { inner: 0.55, outer: 0.6, color: 0x4a3f2c, opacity: 0.18 },
    { inner: 0.6, outer: 0.92, color: 0xddc497, opacity: 0.5 },
    { inner: 0.92, outer: 0.94, color: 0x4a3f2c, opacity: 0.15 },
    { inner: 0.94, outer: 1.0, color: 0xe4d191, opacity: 0.28 },
  ];
  for (const b of bands) {
    const geo = new THREE.RingGeometry(r0 + b.inner * span, r0 + b.outer * span, 96);
    const mat = new THREE.MeshBasicMaterial({
      color: b.color,
      transparent: true,
      opacity: b.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(geo, mat));
  }
  group.rotation.x = Math.PI / 2.2;
  return group;
}
