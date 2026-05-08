import * as THREE from 'three';
import { buildArrowTipLabel } from './orbit-overlays';

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
 * Each arrow now carries a tip-sprite label naming the axis (ZENITH,
 * NADIR, PROGRADE, etc.) so users can read the orientation directly
 * in the 3D scene without needing to consult the legend. The colours
 * still encode the pair (teal / red / blue) for at-a-glance grouping.
 *
 * The group's visibility is toggled externally — the page hooks the
 * lens-layer state and calls `group.visible = layerOn`.
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

  const axes: { dir: THREE.Vector3; color: number; label: string; labelColor: string }[] = [
    { dir: new THREE.Vector3(0, 1, 0), color: TEAL, label: 'ZENITH', labelColor: '#92e8df' },
    { dir: new THREE.Vector3(0, -1, 0), color: TEAL, label: 'NADIR', labelColor: '#92e8df' },
    { dir: new THREE.Vector3(1, 0, 0), color: RED, label: 'PROGRADE', labelColor: '#ffb1b1' },
    { dir: new THREE.Vector3(-1, 0, 0), color: RED, label: 'RETROGRADE', labelColor: '#ffb1b1' },
    { dir: new THREE.Vector3(0, 0, 1), color: BLUE, label: 'STARBOARD', labelColor: '#aac6ff' },
    { dir: new THREE.Vector3(0, 0, -1), color: BLUE, label: 'PORT', labelColor: '#aac6ff' },
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
    helper.name = `axis_${ax.label.toLowerCase()}`;
    group.add(helper);

    // Tip label — sized 1.0 in scene units so the canvas sits right
    // at the arrow tip without dwarfing it. Sprite always faces camera
    // so the text reads at any orbit angle.
    const sprite = buildArrowTipLabel(ax.label, ax.labelColor, 1.4);
    sprite.position.copy(ax.dir).multiplyScalar(length * 1.18);
    sprite.userData.axisLabel = ax.label;
    group.add(sprite);
  }

  // Hide by default — the page flips this on when the lens layer flips on.
  group.visible = false;
  return group;
}
