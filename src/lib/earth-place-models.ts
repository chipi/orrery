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
    emissiveIntensity: 0.15,
  });
}

/** Museum: a flown return capsule on a display plinth — what people go to
 *  these museums to see. Scorched conical crew module with its dark heat
 *  shield, two windows and a nose fitting, on a dark stand ringed in the
 *  layer colour. */
export function buildMuseumModel(color: string): THREE.Group {
  const g = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 24), darkMat());
  plinth.position.y = 0.06;
  g.add(plinth);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.02, 8, 48), accentMat(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.12;
  g.add(ring);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.31, 0.07, 32), darkMat());
  shield.position.y = 0.155;
  g.add(shield);
  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.34, 0.5, 32, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x9c7c58,
      metalness: 0.35,
      roughness: 0.75,
      side: THREE.DoubleSide,
    }),
  );
  hull.position.y = 0.44;
  g.add(hull);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.01, 6, 48), accentMat(color));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.22;
  g.add(band);
  for (const a of [-0.45, 0.45]) {
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), darkMat());
    const r = 0.235;
    win.position.set(Math.sin(a) * r, 0.47, Math.cos(a) * r);
    win.lookAt(new THREE.Vector3(Math.sin(a) * 2, 0.47 + 0.9, Math.cos(a) * 2));
    g.add(win);
  }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24), steelMat());
  top.position.y = 0.7;
  g.add(top);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 16), steelMat());
  nose.position.y = 0.77;
  g.add(nose);
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
  // The open slit: one dark strip over the crown of the dome, read from above
  // as a single line (a box through the dome showed as two bars).
  const slit = new THREE.Mesh(
    new THREE.SphereGeometry(0.425, 28, 14, -0.06, 0.12, 0, Math.PI / 2),
    darkMat(),
  );
  slit.rotation.y = Math.PI / 2;
  slit.position.y = 0.46;
  g.add(slit);
  g.scale.setScalar(0.8);
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
