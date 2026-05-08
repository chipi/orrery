import * as THREE from 'three';

/**
 * Microgravity-axis overlay (Tier-1 F.3) for /iss + /tiangong.
 *
 * Returns a THREE.Group containing six colour-keyed arrow helpers
 * pointing along the station's local-frame axes:
 *
 *   +Y zenith     (teal)    away from Earth
 *   -Y nadir      (teal)    toward Earth
 *   +X prograde   (red)     direction of orbital motion
 *   -X retrograde (red)     opposite of motion
 *   +Z starboard  (blue)    right-hand rule of motion + zenith
 *   -Z port       (blue)    left-hand rule of motion + zenith
 *
 * The colours match the legend chips in MicrogravityAxesLegend.svelte
 * so users can read the 3D scene without in-scene text labels (which
 * are expensive to render legibly across viewport sizes).
 *
 * The group's visibility is toggled externally — the page hooks the
 * Science Lens state and calls `group.visible = lensOn`.
 */
export function buildMicrogravityAxes(length = 4): THREE.Group {
  const group = new THREE.Group();
  group.name = 'microgravity_axes';

  const ARROW_HEAD_LENGTH = length * 0.18;
  const ARROW_HEAD_WIDTH = length * 0.1;

  const TEAL = 0x4ecdc4; // zenith / nadir
  const RED = 0xff6b6b; // prograde / retrograde
  const BLUE = 0x6aa9ff; // port / starboard

  const origin = new THREE.Vector3(0, 0, 0);

  const axes: { dir: THREE.Vector3; color: number; name: string }[] = [
    { dir: new THREE.Vector3(0, 1, 0), color: TEAL, name: 'zenith' },
    { dir: new THREE.Vector3(0, -1, 0), color: TEAL, name: 'nadir' },
    { dir: new THREE.Vector3(1, 0, 0), color: RED, name: 'prograde' },
    { dir: new THREE.Vector3(-1, 0, 0), color: RED, name: 'retrograde' },
    { dir: new THREE.Vector3(0, 0, 1), color: BLUE, name: 'starboard' },
    { dir: new THREE.Vector3(0, 0, -1), color: BLUE, name: 'port' },
  ];

  for (const ax of axes) {
    const helper = new THREE.ArrowHelper(
      ax.dir.clone().normalize(),
      origin,
      length,
      ax.color,
      ARROW_HEAD_LENGTH,
      ARROW_HEAD_WIDTH,
    );
    helper.name = `axis_${ax.name}`;
    group.add(helper);
  }

  // Hide by default — the page flips this on when the Science Lens is on.
  group.visible = false;
  return group;
}
