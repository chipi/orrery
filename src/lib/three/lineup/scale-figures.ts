/**
 * Flat scale figures for the /fleet line-ups, in metres, drawn face-on in the same orthographic
 * scene as the models so they share the line-up's true scale: a person, the Statue of Liberty on
 * its pedestal, and a city bus.
 *
 * Outlines are hand-drawn polygons through published dimensions:
 * - person: 1.75 m standing adult.
 * - Statue of Liberty: 92.99 m ground to torch tip — ground to pedestal top 46.94 m, statue 46.05 m,
 *   waist 10.67 m
 *   (National Park Service, "Statue Statistics", https://www.nps.gov/stli/learn/historyculture/statue-statistics.htm).
 * - bus: 12 m × 3 m, the common rigid city-bus length and height.
 */
import * as THREE from 'three';

export type ScaleFigureId = 'person' | 'liberty' | 'bus';

export const SCALE_FIGURE_HEIGHT_M: Record<ScaleFigureId, number> = {
  person: 1.75,
  liberty: 93,
  bus: 3,
};

/** Outline points (x, y) in metres, base centred on x = 0, y = 0 at the ground. */
function personOutline(): THREE.Shape {
  const s = new THREE.Shape();
  // Legs, torso and shoulders as one polygon; the head is a separate circle hole-free path.
  const pts: [number, number][] = [
    [-0.16, 0],
    [-0.06, 0],
    [-0.04, 0.82],
    [0.04, 0.82],
    [0.06, 0],
    [0.16, 0],
    [0.13, 0.86],
    [0.21, 0.88],
    [0.25, 1.0],
    [0.23, 1.4],
    [0.17, 1.46],
    [0.07, 1.48],
    [0.06, 1.5],
    [-0.06, 1.5],
    [-0.07, 1.48],
    [-0.17, 1.46],
    [-0.23, 1.4],
    [-0.25, 1.0],
    [-0.21, 0.88],
    [-0.13, 0.86],
  ];
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  return s;
}

function personHead(): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(0, 1.63, 0.115, 0, Math.PI * 2, false);
  return s;
}

/** Statue of Liberty on its pedestal, 93 m: a stepped base, the robed figure, the raised torch. */
function libertyOutline(): THREE.Shape[] {
  const base = new THREE.Shape();
  // Fort Wood star base and pedestal, stepped to 47 m.
  const pedestal: [number, number][] = [
    [-28, 0],
    [28, 0],
    [28, 8],
    [16, 8],
    [16, 11],
    [12, 11],
    [12, 41],
    [10, 41],
    [10, 44],
    [8, 44],
    [8, 47],
    [-8, 47],
    [-8, 44],
    [-10, 44],
    [-10, 41],
    [-12, 41],
    [-12, 11],
    [-16, 11],
    [-16, 8],
    [-28, 8],
  ];
  base.moveTo(pedestal[0][0], pedestal[0][1]);
  for (const [x, y] of pedestal.slice(1)) base.lineTo(x, y);
  base.closePath();

  // The figure, 46 m from the pedestal top to the torch flame, right arm raised.
  const figure = new THREE.Shape();
  const f: [number, number][] = [
    [-6.5, 47],
    [6.5, 47],
    [5.8, 56],
    [5.2, 66],
    [5.6, 70],
    [5.0, 72.5],
    [6.2, 73.5],
    [7.6, 78],
    [8.2, 84],
    [8.8, 88.5],
    [9.9, 88.8],
    [10.4, 90.6],
    [9.6, 93],
    [8.6, 91.4],
    [7.5, 90.4],
    [7.6, 88.4],
    [6.6, 84],
    [5.5, 78.5],
    [3.9, 75.6],
    [3.6, 79],
    [2.2, 81.4],
    [0.4, 81.8],
    [-1.6, 80.8],
    [-2.4, 78.6],
    [-2.0, 76.2],
    [-4.4, 74.2],
    [-6.4, 72.4],
    [-7.6, 69.6],
    [-6.8, 67.8],
    [-5.0, 69.2],
    [-5.6, 62],
    [-6.2, 54],
  ];
  figure.moveTo(f[0][0], f[0][1]);
  for (const [x, y] of f.slice(1)) figure.lineTo(x, y);
  figure.closePath();
  return [base, figure];
}

/** City bus side view, 12 m × 3 m, wheels as cut-outs along the bottom. */
function busOutline(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-6, 0.35);
  s.lineTo(-4.7, 0.35);
  s.absarc(-3.8, 0.35, 0.5, Math.PI, 0, true);
  s.lineTo(3.2, 0.35);
  s.absarc(4.1, 0.35, 0.5, Math.PI, 0, true);
  s.lineTo(6, 0.35);
  s.lineTo(6, 2.7);
  s.quadraticCurveTo(6, 3, 5.6, 3);
  s.lineTo(-5.7, 3);
  s.quadraticCurveTo(-6, 3, -6, 2.7);
  s.closePath();
  return s;
}

/**
 * A flat figure mesh, base at y = 0, in metres. `color` should sit just above the backdrop so
 * the figure reads as a cut-out, not a model.
 */
export function buildScaleFigure(id: ScaleFigureId, color = 0x6f809b): THREE.Group {
  const shapes =
    id === 'person'
      ? [personOutline(), personHead()]
      : id === 'liberty'
        ? libertyOutline()
        : [busOutline()];
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: id === 'person' ? 0.9 : 0.45,
  });
  for (const s of shapes) g.add(new THREE.Mesh(new THREE.ShapeGeometry(s, 12), mat));
  if (id === 'bus') {
    // Windows as a lighter band so the bus reads as a bus at a glance.
    const win = new THREE.Shape();
    win.moveTo(-5.3, 1.7);
    win.lineTo(5.3, 1.7);
    win.lineTo(5.3, 2.6);
    win.lineTo(-5.3, 2.6);
    win.closePath();
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(win),
      new THREE.MeshBasicMaterial({ color: 0x1b2230, transparent: true, opacity: 0.55 }),
    );
    m.position.z = 0.01;
    g.add(m);
  }
  g.userData.scaleFigure = id;
  return g;
}
