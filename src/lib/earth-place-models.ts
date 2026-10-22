import * as THREE from 'three';

/**
 * 3D marker models for museums (PRD-027) and observatories (PRD-028) on
 * /earth, in the same style as the launchpad and lander markers
 * (earth-launchpad-models.ts, moon-lander-models.ts): recognisable
 * silhouettes from Three.js primitives with stone / steel / dark
 * materials and one accent band in the layer colour. Same scale
 * convention: tallest element ~1.0–1.5 world units above the surface.
 */

const STONE = 0xd8d2c4;
const WHITE = 0xeef0f2;
const STEEL = 0x8a8e95;
const DARK = 0x1a1a1a;

function stoneMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: STONE, metalness: 0.05, roughness: 0.9 });
}
function whiteMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: WHITE,
    metalness: 0.3,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
}
function steelMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.7, roughness: 0.4 });
}
function darkMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: DARK, metalness: 0.4, roughness: 0.6 });
}
function accentMat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.4,
    roughness: 0.45,
    emissive: color,
    emissiveIntensity: 0.25,
  });
}

/** Museum: a classical hall — steps, a row of columns, entablature and
 *  pediment — with an accent band along the frieze. */
export function buildMuseumModel(color: string): THREE.Group {
  const g = new THREE.Group();
  const steps = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), stoneMat());
  steps.position.y = 0.05;
  g.add(steps);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.5), stoneMat());
  hall.position.set(0, 0.38, -0.08);
  g.add(hall);
  for (const x of [-0.42, -0.21, 0, 0.21, 0.42]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 10), stoneMat());
    col.position.set(x, 0.38, 0.24);
    g.add(col);
  }
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.72), stoneMat());
  frieze.position.y = 0.7;
  g.add(frieze);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.03, 0.74), accentMat(color));
  band.position.y = 0.66;
  g.add(band);
  // Pediment: a low triangular prism along the façade.
  const pediment = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.72, 3, 1), stoneMat());
  pediment.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  pediment.scale.set(1, 1, 0.42);
  pediment.position.y = 0.88;
  g.add(pediment);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.02), darkMat());
  door.position.set(0, 0.25, 0.18);
  g.add(door);
  return g;
}

/** One radio dish on a pedestal, tilted to the sky, with feed legs and a
 *  receiver at the focus. `scale` 1 is a single large dish. */
function buildDish(color: string, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.08, 8), darkMat());
  base.position.y = 0.04;
  g.add(base);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.55, 8), steelMat());
  pedestal.position.y = 0.35;
  g.add(pedestal);
  const head = new THREE.Group();
  head.position.y = 0.66;
  head.rotation.x = -0.65;
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 28, 10, 0, Math.PI * 2, Math.PI * 0.64, Math.PI * 0.36),
    whiteMat(),
  );
  bowl.position.y = 0.62;
  head.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.018, 6, 32), accentMat(color));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.18;
  head.add(rim);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.62, 4), steelMat());
    leg.position.set(Math.cos(a) * 0.24, 0.42, Math.sin(a) * 0.24);
    leg.lookAt(new THREE.Vector3(0, 0.8, 0));
    leg.rotateX(Math.PI / 2);
    head.add(leg);
  }
  const receiver = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), darkMat());
  receiver.position.y = 0.72;
  head.add(receiver);
  g.add(head);
  g.scale.setScalar(scale);
  return g;
}

/** Optical observatory: a drum building with a white dome, the open slit
 *  dark, and an accent band at the base of the dome. */
function buildDomeObservatory(color: string): THREE.Group {
  const g = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.45, 24), stoneMat());
  drum.position.y = 0.225;
  g.add(drum);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.02, 6, 32), accentMat(color));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.46;
  g.add(band);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    whiteMat(),
  );
  dome.position.y = 0.46;
  g.add(dome);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.44), darkMat());
  slit.position.set(0, 0.72, 0.1);
  slit.rotation.x = -0.6;
  g.add(slit);
  return g;
}

/** Radio array: three dishes in a row (VLA, ALMA, MeerKAT, GMRT…). */
function buildArray(color: string): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z] of [
    [-0.5, 0.15],
    [0, -0.2],
    [0.5, 0.15],
  ] as const) {
    const d = buildDish(color, 0.55);
    d.position.set(x, 0, z);
    g.add(d);
  }
  return g;
}

/** Observatories laid out as arrays of many dishes or antennas. */
const ARRAYS = new Set([
  'vla',
  'alma',
  'meerkat',
  'gmrt',
  'lofar',
  'ska-low',
  'ska-mid',
  'allen-telescope-array',
]);

export function buildObservatoryModel(
  id: string,
  kind: 'radio' | 'optical' | 'deep-space' | 'seti',
  color: string,
): THREE.Group {
  if (kind === 'optical') return buildDomeObservatory(color);
  if (ARRAYS.has(id)) return buildArray(color);
  return buildDish(color);
}
