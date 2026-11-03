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
 * - Eiffel Tower: 330 m to the antenna tip, 300 m architectural, top platform 276 m, base 125 m
 *   square (https://en.wikipedia.org/wiki/Eiffel_Tower); the first and second platform heights
 *   (57 m, 116 m) and the arch are drawn from the elevation, not from a stated figure.
 * - Monument to the Conquerors of Space, Moscow: 107 m titanium obelisk, a rocket rising on its
 *   exhaust plume, museum in the base (https://en.wikipedia.org/wiki/Monument_to_the_Conquerors_of_Space);
 *   the curve and the base width follow photographs.
 * - Giant Wild Goose Pagoda, Xi'an: 64.1 m with its base; base 4.2 m high and 48.8 m wide, the
 *   lowest storey 25 m a side, seven storeys tapering
 *   (https://en.wikipedia.org/wiki/Giant_Wild_Goose_Pagoda).
 */
import * as THREE from 'three';

export type ScaleFigureId = 'person' | 'liberty' | 'bus' | 'eiffel' | 'conquerors' | 'pagoda';

export const SCALE_FIGURE_HEIGHT_M: Record<ScaleFigureId, number> = {
  person: 1.75,
  liberty: 92.99,
  bus: 3,
  eiffel: 330,
  conquerors: 107,
  pagoda: 64.1,
};

const poly = (pts: [number, number][]): THREE.Shape => {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  return s;
};

/** Eiffel Tower elevation: four flared legs joined by the arch, two platforms, the spire, antenna. */
function eiffelOutline(): THREE.Shape[] {
  const half = 62.5;
  // Lower section to the first platform (57 m): the outline runs up the inside of the legs
  // along the great arch, so the arch is part of the silhouette, not a cut-out.
  const lower = new THREE.Shape();
  lower.moveTo(-half, 0);
  lower.lineTo(-38, 0);
  lower.quadraticCurveTo(-30, 36, 0, 39);
  lower.quadraticCurveTo(30, 36, 38, 0);
  lower.lineTo(half, 0);
  lower.lineTo(36, 54);
  lower.lineTo(37, 57);
  lower.lineTo(-37, 57);
  lower.lineTo(-36, 54);
  lower.closePath();
  const middle = poly([
    [-31, 57],
    [31, 57],
    [20, 113],
    [21, 116],
    [-21, 116],
    [-20, 113],
  ]);
  const upper = poly([
    [-15, 116],
    [15, 116],
    [6.5, 200],
    [3.6, 266],
    [5, 270],
    [5, 276],
    [3, 280],
    [1.6, 300],
    [-1.6, 300],
    [-3, 280],
    [-5, 276],
    [-5, 270],
    [-3.6, 266],
    [-6.5, 200],
  ]);
  const antenna = poly([
    [-0.7, 300],
    [0.7, 300],
    [0.25, 330],
    [-0.25, 330],
  ]);
  return [lower, middle, upper, antenna];
}

/** Monument to the Conquerors of Space: a sloped base, the curving titanium plume, the rocket. */
function conquerorsOutline(): THREE.Shape[] {
  const base = poly([
    [-34, 0],
    [34, 0],
    [26, 9],
    [-26, 9],
  ]);
  // The plume rises from the base in a slow curve to the right, narrowing to the rocket's tail.
  const plume = new THREE.Shape();
  plume.moveTo(-18, 9);
  plume.quadraticCurveTo(-4, 40, 9, 82);
  plume.lineTo(11.5, 88);
  plume.lineTo(13.2, 88);
  plume.quadraticCurveTo(10, 50, 2, 9);
  plume.closePath();
  // The rocket rides the top of the plume, nose up and to the right.
  const rocket = poly([
    [10.2, 86],
    [14.6, 86.6],
    [16.4, 94],
    [17.6, 100],
    [17.4, 104],
    [16.2, 107],
    [15.0, 104],
    [13.0, 99],
    [11.2, 92],
  ]);
  return [base, plume, rocket];
}

/** Giant Wild Goose Pagoda: the base platform, seven storeys stepping in, the finial. */
function pagodaOutline(): THREE.Shape[] {
  const shapes = [
    poly([
      [-24.4, 0],
      [24.4, 0],
      [24.4, 4.2],
      [-24.4, 4.2],
    ]),
  ];
  const storeys = 7;
  const top = 60.4;
  let y = 4.2;
  for (let i = 0; i < storeys; i++) {
    const h = (top - 4.2) / storeys;
    const w0 = 12.5 - i * 1.25;
    const w1 = w0 - 0.5;
    // Body of the storey, then a thin eave that juts out a little.
    shapes.push(
      poly([
        [-w0, y],
        [w0, y],
        [w1, y + h - 0.9],
        [-w1, y + h - 0.9],
      ]),
      poly([
        [-(w1 + 0.9), y + h - 0.9],
        [w1 + 0.9, y + h - 0.9],
        [w1 + 0.4, y + h],
        [-(w1 + 0.4), y + h],
      ]),
    );
    y += h;
  }
  shapes.push(
    poly([
      [-1.4, top],
      [1.4, top],
      [0.35, 64.1],
      [-0.35, 64.1],
    ]),
  );
  return shapes;
}

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
  const shapes: THREE.Shape[] =
    id === 'person'
      ? [personOutline(), personHead()]
      : id === 'liberty'
        ? libertyOutline()
        : id === 'eiffel'
          ? eiffelOutline()
          : id === 'conquerors'
            ? conquerorsOutline()
            : id === 'pagoda'
              ? pagodaOutline()
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
