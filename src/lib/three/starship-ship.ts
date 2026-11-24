/**
 * Starship's upper stage (the Ship) on its own, for the /fly coast and Earth return (0.9.11 F3,
 * Flight 5), drawn to the Block 1 ship in photos (the /fleet Starship gallery): a 50 m x 9 m
 * stainless body (about 5.5:1) with an ogive nose over the top ~30 %, the windward half covered
 * in black heat-shield tiles (the belly the ship re-enters on), two small forward flaps high on
 * the nose and two large aft flaps over the bottom fifth, both on the tile edge, and six Raptors
 * (three sea-level bells in the middle, three wide vacuum bells around them) under a short skirt.
 *
 * Height 1, base at y = 0, nose up. The tiled (windward) half faces -X: the descent scene's
 * belly-first attitude (rotation.z = +π/2) lays the ship across the frame with -X facing down,
 * and upright the camera (on +Z) sees the half-black, half-steel side the photos show.
 */
import * as THREE from 'three';
import { heroDark } from './hero-materials';

/** Body radius: 9 m over 50.3 m. */
export const SHIP_R = 9 / 50.3 / 2;
/** Where the nose ogive starts (fraction of the height). */
const NOSE_BASE = 0.7;
const SKIRT = 0.03;

/** The ogive's radius at fraction s (0 at its base, 1 at the tip): a tangent-ogive-like curve
 *  with a small blunt tip. */
function noseRadius(s: number): number {
  return Math.max(0.006, SHIP_R * Math.pow(Math.cos((s * Math.PI) / 2), 0.7));
}

function nosePoints(rScale = 1): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const s = i / 24;
    pts.push(new THREE.Vector2(noseRadius(s) * rScale, NOSE_BASE + s * (1 - NOSE_BASE)));
  }
  return pts;
}

/** A thin swept flap (trapezoid) in the x-y plane, root along the body at x = 0. */
function flap(rootY0: number, rootY1: number, span: number, tipY0: number, tipY1: number) {
  const s = new THREE.Shape();
  s.moveTo(0, rootY0);
  s.lineTo(span, tipY0);
  s.lineTo(span, tipY1);
  s.lineTo(0, rootY1);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false });
}

/** A faint hexagonal tile grid (the heat shield's ~30 cm hex tiles read as a fine mesh at /fly's
 *  scale); null where there is no 2D canvas (unit tests). */
function hexTileTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#16181c';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#2a2e35';
  ctx.lineWidth = 1.2;
  const s = 8; // hex radius, px
  const h = s * Math.sqrt(3);
  for (let row = -1; row < 128 / h + 1; row++)
    for (let col = -1; col < 128 / (1.5 * s) + 1; col++) {
      const cx = col * 1.5 * s;
      const cy = row * h + (col % 2 ? h / 2 : 0);
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (Math.PI / 3) * k;
        ctx[k ? 'lineTo' : 'moveTo'](cx + s * Math.cos(a), cy + s * Math.sin(a));
      }
      ctx.stroke();
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 36);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildStarshipShip(): THREE.Group {
  const g = new THREE.Group();
  // Bare 304L stainless reads bright and satin in the photos; a full-metal material goes black
  // without an environment map, so this one is part-metal.
  const steel = new THREE.MeshStandardMaterial({
    color: 0xc9cdd2,
    metalness: 0.55,
    roughness: 0.35,
  });
  // The heat-shield tiles are matte black ceramic.
  const tile = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: hexTileTexture(),
    metalness: 0.05,
    roughness: 0.85,
  });
  if (!tile.map) tile.color.set(0x16181c);
  const flapMat = new THREE.MeshStandardMaterial({
    color: 0x16181c,
    metalness: 0.05,
    roughness: 0.85,
  });
  const dark = heroDark(0x2a2d33);

  // Stainless body and nose (full circle). Ring seams are left out: at /fly's scale a thin
  // torus aliases into dotted lines.
  const bodyLen = NOSE_BASE - SKIRT;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(SHIP_R, SHIP_R, bodyLen, 64), steel);
  body.position.y = SKIRT + bodyLen / 2;
  g.add(body);
  g.add(new THREE.Mesh(new THREE.LatheGeometry(nosePoints(), 64), steel));

  // Heat-shield tiles: the windward half (-X) of body and nose, a hair proud of the steel.
  // CylinderGeometry / LatheGeometry put theta = 0 on +Z and -π/2 on -X, so the half centred on
  // -X runs from -π to 0.
  const tiledBody = new THREE.Mesh(
    new THREE.CylinderGeometry(
      SHIP_R * 1.004,
      SHIP_R * 1.004,
      bodyLen,
      48,
      1,
      true,
      -Math.PI,
      Math.PI,
    ),
    tile,
  );
  tiledBody.position.y = SKIRT + bodyLen / 2;
  g.add(tiledBody);
  g.add(new THREE.Mesh(new THREE.LatheGeometry(nosePoints(1.004), 48, -Math.PI, Math.PI), tile));

  // Flaps on the tile edge (±Z): forward flaps high on the nose, aft flaps over the bottom fifth.
  // Each is built spanning +X, then turned about y so its span points along ±Z. A flap hinges on
  // its root edge (along y), so it sits in a pivot group the scene swings about y
  // (userData.flaps), to steer through the belly-first fall.
  const flaps: { pivot: THREE.Group; base: number; side: number; fwd: boolean }[] = [];
  for (const side of [-1, 1]) {
    const fwdY0 = NOSE_BASE + 0.05;
    const fwdRootR = noseRadius(0.05 / (1 - NOSE_BASE) + 0.1);
    for (const fwd of [true, false]) {
      const geo = fwd
        ? flap(fwdY0, fwdY0 + 0.1, 0.055, fwdY0 + 0.035, fwdY0 + 0.085)
        : flap(0.05, 0.25, 0.075, 0.07, 0.2);
      const pivot = new THREE.Group();
      pivot.name = fwd ? 'flapFwd' : 'flapAft';
      const base = -side * (Math.PI / 2);
      pivot.rotation.y = base;
      pivot.position.set(0.003 * side, 0, side * (fwd ? fwdRootR * 0.92 : SHIP_R * 0.98));
      pivot.add(new THREE.Mesh(geo, flapMat));
      g.add(pivot);
      flaps.push({ pivot, base, side, fwd });
    }
  }
  g.userData.flaps = flaps;

  // Hot-gas RCS pods: two groups of two on the sides, near the nose and near the aft, each a
  // small dark housing with a plume cone the scene lights (userData.rcs), firing radially out.
  const rcs: THREE.Object3D[] = [];
  const rcsMat = new THREE.MeshBasicMaterial({
    color: 0xffe2b0,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const y of [0.9, 0.33])
    for (const th of [Math.PI / 3, -Math.PI / 3]) {
      const dir = new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.014), dark);
      const r = y > NOSE_BASE ? noseRadius((y - NOSE_BASE) / (1 - NOSE_BASE)) : SHIP_R;
      pod.position.copy(dir).multiplyScalar(r).setY(y);
      pod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(pod);
      const len = 0.09;
      const geo = new THREE.ConeGeometry(0.014, len, 12, 1, true);
      geo.translate(0, len / 2, 0);
      const plume = new THREE.Mesh(geo, rcsMat);
      plume.position.copy(pod.position).addScaledVector(dir, 0.008);
      plume.quaternion.copy(pod.quaternion);
      plume.visible = false;
      g.add(plume);
      rcs.push(plume);
    }
  g.userData.rcs = rcs;

  // Aft skirt and the six Raptors under it.
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(SHIP_R, SHIP_R * 0.97, SKIRT, 48), dark);
  skirt.position.y = SKIRT / 2;
  g.add(skirt);
  const bell = (r: number, len: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r, len, 24, 1, true), dark);
    m.position.set(x, -len / 2 + 0.008, z);
    g.add(m);
  };
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    bell(0.012, 0.03, Math.cos(a) * 0.022, Math.sin(a) * 0.022); // sea-level, middle
    const b = a + Math.PI / 3;
    bell(0.026, 0.05, Math.cos(b) * 0.058, Math.sin(b) * 0.058); // vacuum, outer ring
  }
  return g;
}
