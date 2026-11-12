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
 * - The Motherland Calls, Volgograd: 85 m from the base of its pedestal to the sword tip; the
 *   statue alone 52 m, the sword 28 m (https://en.wikipedia.org/wiki/The_Motherland_Calls).
 * - Ushiku Daibutsu: 120 m — a 10 m base, a 10 m lotus platform and the 100 m standing Buddha
 *   (https://en.wikipedia.org/wiki/Ushiku_Daibutsu).
 * - Leshan Giant Buddha: 71 m seated, shoulders 28 m wide, head 14.7 m
 *   (https://en.wikipedia.org/wiki/Leshan_Giant_Buddha).
 * - Itsukushima Shrine great torii: 15 m (50 ft) (https://en.wikipedia.org/wiki/Itsukushima_Shrine);
 *   its span is drawn from photographs.
 * - Tsar Bell, Moscow Kremlin: 6.14 m tall, 6.6 m across, with its broken-off piece beside it
 *   (https://en.wikipedia.org/wiki/Tsar_Bell).
 * - Leaning Tower of Pisa: 56.67 m on the high side, base 15.48 m across, leaning 3.97°, eight
 *   storeys (https://en.wikipedia.org/wiki/Leaning_Tower_of_Pisa).
 * - Brandenburg Gate: 26 m with the Quadriga, 62.5 m wide, twelve Doric columns forming five
 *   passages (https://en.wikipedia.org/wiki/Brandenburg_Gate).
 * - Columbus Monument, Barcelona: 60 m — a 7.2 m statue on a 40 m Corinthian column
 *   (https://en.wikipedia.org/wiki/Columbus_Monument,_Barcelona).
 * - Michelangelo's David: 5.17 m (https://en.wikipedia.org/wiki/David_(Michelangelo)).
 * - Osborne bull: the roadside billboards stand 14 m (https://en.wikipedia.org/wiki/Osborne_bull).
 */
import * as THREE from 'three';

export type ScaleFigureId =
  | 'person'
  | 'liberty'
  | 'bus'
  | 'eiffel'
  | 'conquerors'
  | 'pagoda'
  | 'motherland'
  | 'ushiku'
  | 'leshan'
  | 'torii'
  | 'tsarbell'
  | 'pisa'
  | 'brandenburg'
  | 'columbus'
  | 'david'
  | 'osborne';

export const SCALE_FIGURE_HEIGHT_M: Record<ScaleFigureId, number> = {
  person: 1.75,
  liberty: 92.99,
  bus: 3,
  eiffel: 330,
  conquerors: 107,
  pagoda: 64.1,
  motherland: 85,
  ushiku: 120,
  leshan: 71,
  torii: 15,
  tsarbell: 6.14,
  pisa: 56.67,
  brandenburg: 26,
  columbus: 60,
  david: 5.17,
  osborne: 14,
};

/** Each landmark's own colour (verdigris Liberty, vermilion torii …), drawn flat with an outline. */
const LANDMARK_COLOR: Record<ScaleFigureId, number[]> = {
  person: [0x6f809b],
  bus: [0x6f809b],
  liberty: [0x8c8a82, 0x6fae9a], // a3-keep: landmark paint colour, palette review at the end
  eiffel: [0x6e5640, 0x7d6248, 0x8a6d50, 0x8a6d50],
  conquerors: [0x7d858f, 0xb3bcc6, 0xd5dce4],
  pagoda: [0xb98e5c],
  motherland: [0x6d6b66, 0xa7a59e, 0xc9ccd0],
  ushiku: [0x6f6a5f, 0xb08a57, 0x9a8a62],
  leshan: [0x5a4b3e, 0xa9764f],
  torii: [0xd2452b, 0xd2452b, 0xc23e27, 0xc23e27, 0x1e1e22, 0xd2452b, 0xc23e27],
  tsarbell: [0x8a8578, 0x5f7f68, 0x5f7f68],
  // Eight marble storeys, then the arcade openings in shadow.
  pisa: [0xe6dfcf, 0xe6dfcf, 0xe6dfcf, 0xe6dfcf, 0xe6dfcf, 0xe6dfcf, 0xe6dfcf, 0xe6dfcf, 0x8f8676],
  brandenburg: [0xcdb48c, 0xcdb48c, 0xcdb48c, 0x4f8a72], // a3-keep: landmark paint colour, palette review at the end
  columbus: [0x9c9384, 0xb6ad9c, 0x5d6a52],
  david: [0xeeeae0],
  osborne: [0x121214],
};

/** Leaning Tower of Pisa: eight arcaded storeys, the narrower bell chamber, leaning 3.97°. */
function pisaOutline(): THREE.Shape[] {
  const r = 7.74;
  const shapes: THREE.Shape[] = [];
  const tilt = (3.97 * Math.PI) / 180;
  const lean = (pts: [number, number][]): THREE.Shape =>
    poly(
      pts.map(([x, y]) => [
        x * Math.cos(tilt) + y * Math.sin(tilt),
        y * Math.cos(tilt) - x * Math.sin(tilt),
      ]),
    );
  const storey = (y0: number, y1: number, rr: number) =>
    shapes.push(
      lean([
        [-rr, y0],
        [rr, y0],
        [rr, y1 - 0.5],
        [rr + 0.35, y1 - 0.5],
        [rr + 0.35, y1],
        [-rr - 0.35, y1],
        [-rr - 0.35, y1 - 0.5],
        [-rr, y1 - 0.5],
      ]),
    );
  storey(0, 11, r);
  for (let i = 0; i < 6; i++) storey(11 + i * 6.6, 17.6 + i * 6.6, r - 0.3);
  storey(50.6, 56.67, r - 2.4);
  // Arcade openings as darker slots on every middle storey.
  for (let i = 0; i < 6; i++)
    for (let c = -2; c <= 2; c++) {
      const x = c * 2.8;
      const y0 = 12.4 + i * 6.6;
      shapes.push(
        lean([
          [x - 0.7, y0],
          [x + 0.7, y0],
          [x + 0.7, y0 + 3.4],
          [x, y0 + 4.1],
          [x - 0.7, y0 + 3.4],
        ]),
      );
    }
  return shapes;
}

/** Brandenburg Gate: the stepped base, six columns in front (five passages), attic, Quadriga. */
function brandenburgOutline(): THREE.Shape[] {
  const half = 31.25;
  const colonnade = new THREE.Shape();
  colonnade.moveTo(-half * 0.62, 0);
  colonnade.lineTo(half * 0.62, 0);
  colonnade.lineTo(half * 0.62, 15);
  colonnade.lineTo(-half * 0.62, 15);
  colonnade.closePath();
  // Five passages between six columns, as holes.
  const span = (half * 1.24) / 5;
  for (let i = 0; i < 5; i++) {
    const x0 = -half * 0.62 + i * span + 0.9;
    const w = span - 1.8;
    const h = new THREE.Path();
    h.moveTo(x0, 0.4);
    h.lineTo(x0 + w, 0.4);
    h.lineTo(x0 + w, i === 2 ? 12.5 : 11.5);
    h.lineTo(x0, i === 2 ? 12.5 : 11.5);
    h.closePath();
    colonnade.holes.push(h);
  }
  const wings = [
    poly([
      [-half, 0],
      [-half * 0.62, 0],
      [-half * 0.62, 11],
      [-half, 11],
    ]),
    poly([
      [half * 0.62, 0],
      [half, 0],
      [half, 11],
      [half * 0.62, 11],
    ]),
  ];
  const attic = poly([
    [-half * 0.66, 15],
    [half * 0.66, 15],
    [half * 0.62, 17],
    [half * 0.3, 17],
    [half * 0.24, 19.5],
    [-half * 0.24, 19.5],
    [-half * 0.3, 17],
    [-half * 0.62, 17],
  ]);
  // The Quadriga: Victoria in her chariot behind four horses.
  const quadriga = poly([
    [-4.5, 19.5],
    [4.5, 19.5],
    [4.6, 21.6],
    [3.6, 22.8],
    [2.4, 22.2],
    [1.2, 23.2],
    [0.6, 25.2],
    [0.2, 26],
    [-0.4, 25.4],
    [-0.8, 23.6],
    [-2.6, 22.6],
    [-3.8, 23.2],
    [-4.8, 21.8],
  ]);
  return [colonnade, ...wings, attic, quadriga];
}

/** Columbus Monument, Barcelona: the base, the 40 m column, the statue pointing out to sea. */
function columbusOutline(): THREE.Shape[] {
  const base = poly([
    [-11, 0],
    [11, 0],
    [9, 4],
    [6, 4],
    [5.5, 12.8],
    [-5.5, 12.8],
    [-6, 4],
    [-9, 4],
  ]);
  const column = poly([
    [-1.6, 12.8],
    [1.6, 12.8],
    [1.2, 49],
    [2.4, 50.4],
    [2.4, 51.4],
    [1.6, 52.8],
    [-1.6, 52.8],
    [-2.4, 51.4],
    [-2.4, 50.4],
    [-1.2, 49],
  ]);
  const statue = poly([
    [-1.2, 52.8],
    [1.2, 52.8],
    [1.0, 56.5],
    [4.6, 57.6],
    [4.7, 58.1],
    [0.9, 57.6],
    [0.6, 59.3],
    [0, 60],
    [-0.6, 59.3],
    [-0.9, 57.4],
    [-1.3, 55],
  ]);
  return [base, column, statue];
}

/** Michelangelo's David: standing in contrapposto, the sling over the left shoulder. */
function davidOutline(): THREE.Shape[] {
  return [
    poly([
      [-0.55, 0],
      [0.55, 0],
      [0.5, 0.25],
      [0.42, 0.25],
      [0.35, 1.6],
      [0.28, 2.3],
      [0.5, 2.5],
      [0.58, 3.2],
      [0.62, 3.6],
      [0.5, 3.9],
      [0.32, 4.1],
      [0.26, 4.3],
      [0.3, 4.75],
      [0.18, 5.08],
      [0, 5.17],
      [-0.18, 5.08],
      [-0.3, 4.72],
      [-0.25, 4.32],
      [-0.42, 4.15],
      [-0.75, 4.2],
      [-0.82, 4.05],
      [-0.55, 3.88],
      [-0.5, 3.2],
      [-0.42, 2.5],
      [-0.3, 2.3],
      [-0.42, 1.55],
      [-0.4, 0.25],
      [-0.5, 0.25],
    ]),
  ];
}

/** The Osborne bull: the black roadside silhouette, side view, facing right. */
function osborneOutline(): THREE.Shape[] {
  const body = poly([
    [-6.9, 0],
    [-6.1, 0],
    [-5.6, 3.6],
    [-4.9, 3.9],
    [-4.6, 0],
    [-3.8, 0],
    [-3.6, 4.8],
    [0.5, 4.5],
    [2.6, 4.9],
    [2.9, 0],
    [3.7, 0],
    [3.9, 4.2],
    [4.5, 4.4],
    [4.7, 0],
    [5.5, 0],
    [5.8, 5.4],
    [6.6, 7.0],
    [7.6, 6.9],
    [8.7, 7.5],
    [8.9, 8.4],
    [8.2, 9.7],
    [8.7, 11.3],
    [9.5, 13.1],
    [9.1, 14.0],
    [8.2, 12.1],
    [7.7, 10.7],
    [7.1, 11.1],
    [6.6, 10.5],
    [5.6, 11.4],
    [3.8, 12.0],
    [0, 10.9],
    [-4.5, 10.4],
    [-6.3, 10.0],
    [-7.0, 9.0],
    [-7.2, 7.0],
    [-7.0, 4.6],
  ]);
  const tail = poly([
    [-6.85, 9.4],
    [-6.55, 9.1],
    [-7.45, 3.4],
    [-7.75, 3.4],
  ]);
  const tuft = poly([
    [-7.95, 3.6],
    [-7.25, 3.6],
    [-7.35, 2.5],
    [-7.65, 2.3],
    [-7.95, 2.6],
  ]);
  return [body, tail, tuft];
}

/** The Motherland Calls: the hill-top plinth, the striding figure, sword raised to 85 m. */
function motherlandOutline(): THREE.Shape[] {
  const plinth = poly([
    [-22, 0],
    [22, 0],
    [16, 6],
    [-16, 6],
  ]);
  const figure = poly([
    [-9, 6],
    [-2, 6],
    [-1, 20],
    [1, 20],
    [3, 6],
    [10, 6],
    // robe flowing back to the left, torso, left arm thrown back
    [6, 22],
    [4, 40],
    [5, 47],
    [8, 50],
    [16, 52],
    [24, 55],
    [24.5, 57],
    [16, 55],
    [6, 54],
    [3.6, 56],
    [3.4, 58],
    [1.8, 58],
    [0.6, 56],
    [-4, 53],
    [-14, 48],
    [-15, 46],
    [-6, 47],
    [-4, 36],
    [-12, 30],
    [-18, 26],
    [-10, 22],
  ]);
  // Right arm and sword raised forward and up to the peak.
  const sword = poly([
    [-4.6, 52],
    [-3.2, 53.4],
    [-12.6, 84.6],
    [-13.2, 85],
    [-13.6, 84.2],
    [-6.6, 55],
  ]);
  return [plinth, figure, sword];
}

/** Ushiku Daibutsu: base, lotus platform, the standing Buddha (right hand raised). */
function ushikuOutline(): THREE.Shape[] {
  const base = poly([
    [-22, 0],
    [22, 0],
    [22, 10],
    [-22, 10],
  ]);
  const lotus = new THREE.Shape();
  lotus.moveTo(-14, 10);
  lotus.lineTo(14, 10);
  lotus.quadraticCurveTo(20, 15, 17, 20);
  lotus.lineTo(-17, 20);
  lotus.quadraticCurveTo(-20, 15, -14, 10);
  const body = new THREE.Shape();
  body.moveTo(-11, 20);
  body.lineTo(11, 20);
  body.quadraticCurveTo(13, 60, 11.5, 90);
  body.lineTo(13, 92);
  body.lineTo(14, 96);
  body.lineTo(10, 98);
  body.quadraticCurveTo(7, 101, 5, 100);
  body.lineTo(4, 103);
  // head with the ushnisha
  body.quadraticCurveTo(7, 105, 6, 113);
  body.quadraticCurveTo(4, 117, 1.5, 117.5);
  body.quadraticCurveTo(1, 120, 0, 120);
  body.quadraticCurveTo(-1, 120, -1.5, 117.5);
  body.quadraticCurveTo(-4, 117, -6, 113);
  body.quadraticCurveTo(-7, 105, -4, 103);
  body.lineTo(-5, 100);
  body.quadraticCurveTo(-8, 100, -11, 97);
  body.lineTo(-15, 88);
  body.lineTo(-13, 84);
  body.quadraticCurveTo(-13, 60, -11, 20);
  // raised right forearm and open palm
  const hand = poly([
    [-15, 88],
    [-17, 92],
    [-17.5, 99],
    [-16, 99.5],
    [-15, 94],
    [-13, 91],
  ]);
  return [base, lotus, body, hand];
}

/** Leshan Giant Buddha: the cliff niche, the seated figure with hands on the knees. */
function leshanOutline(): THREE.Shape[] {
  const cliff = poly([
    [-26, 0],
    [26, 0],
    [27, 60],
    [22, 74],
    [-22, 74],
    [-27, 60],
  ]);
  const figure = new THREE.Shape();
  // knees and shins
  figure.moveTo(-17, 0);
  figure.lineTo(-17, 22);
  figure.quadraticCurveTo(-16, 26, -13, 26);
  figure.lineTo(-14, 42);
  // shoulders 28 m wide
  figure.quadraticCurveTo(-14, 52, -9, 54);
  figure.lineTo(-5, 55);
  // head 14.7 m with the curls
  figure.quadraticCurveTo(-7.5, 62, -6, 68);
  figure.quadraticCurveTo(-3, 71, 0, 71);
  figure.quadraticCurveTo(3, 71, 6, 68);
  figure.quadraticCurveTo(7.5, 62, 5, 55);
  figure.lineTo(9, 54);
  figure.quadraticCurveTo(14, 52, 14, 42);
  figure.lineTo(13, 26);
  figure.quadraticCurveTo(16, 26, 17, 22);
  figure.lineTo(17, 0);
  figure.closePath();
  return [cliff, figure];
}

/** The Itsukushima great torii: two main pillars, the curved kasagi on top, the nuki below. */
function toriiOutline(): THREE.Shape[] {
  const pillars = [
    poly([
      [-6.2, 0],
      [-4.8, 0],
      [-5.1, 13],
      [-5.9, 13],
    ]),
    poly([
      [4.8, 0],
      [6.2, 0],
      [5.9, 13],
      [5.1, 13],
    ]),
    // the shorter support legs either side
    poly([
      [-9.4, 0],
      [-8.6, 0],
      [-8.7, 7],
      [-9.3, 7],
    ]),
    poly([
      [8.6, 0],
      [9.4, 0],
      [9.3, 7],
      [8.7, 7],
    ]),
  ];
  const kasagi = new THREE.Shape();
  kasagi.moveTo(-10.5, 13.4);
  kasagi.quadraticCurveTo(0, 13.0, 10.5, 13.4);
  kasagi.lineTo(12, 15);
  kasagi.quadraticCurveTo(0, 14.2, -12, 15);
  kasagi.closePath();
  const nuki = poly([
    [-8.4, 10.2],
    [8.4, 10.2],
    [8.4, 11.1],
    [-8.4, 11.1],
  ]);
  const struts = poly([
    [-9.6, 6.2],
    [9.6, 6.2],
    [9.6, 6.8],
    [-9.6, 6.8],
  ]);
  return [...pillars, kasagi, nuki, struts];
}

/** The Tsar Bell on its stone base, its broken-off piece leaning against the base. */
function tsarbellOutline(): THREE.Shape[] {
  const base = poly([
    [-3.6, 0],
    [3.6, 0],
    [3.3, 0.6],
    [-3.3, 0.6],
  ]);
  const bell = new THREE.Shape();
  bell.moveTo(-3.3, 0.6);
  bell.lineTo(3.3, 0.6);
  bell.quadraticCurveTo(3.1, 1.2, 2.6, 2.0);
  bell.quadraticCurveTo(2.0, 3.2, 2.0, 4.3);
  bell.quadraticCurveTo(2.0, 5.1, 1.2, 5.3);
  bell.lineTo(0.5, 5.3);
  bell.lineTo(0.6, 6.14);
  bell.lineTo(-0.6, 6.14);
  bell.lineTo(-0.5, 5.3);
  bell.lineTo(-1.2, 5.3);
  bell.quadraticCurveTo(-2.0, 5.1, -2.0, 4.3);
  bell.quadraticCurveTo(-2.0, 3.2, -2.6, 2.0);
  bell.quadraticCurveTo(-3.1, 1.2, -3.3, 0.6);
  const notch = new THREE.Path();
  // The missing fragment: a bite out of the rim at the lower right, the piece standing beside it.
  notch.moveTo(1.9, 0.62);
  notch.lineTo(3.05, 0.62);
  notch.lineTo(2.75, 1.4);
  notch.lineTo(2.2, 1.55);
  notch.closePath();
  bell.holes.push(notch);
  const fragment = poly([
    [3.8, 0],
    [5.6, 0],
    [5.0, 1.9],
    [4.2, 1.6],
  ]);
  return [base, bell, fragment];
}

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
const OUTLINES: Record<ScaleFigureId, () => THREE.Shape[]> = {
  person: () => [personOutline(), personHead()],
  liberty: libertyOutline,
  bus: () => [busOutline()],
  eiffel: eiffelOutline,
  conquerors: conquerorsOutline,
  pagoda: pagodaOutline,
  motherland: motherlandOutline,
  ushiku: ushikuOutline,
  leshan: leshanOutline,
  torii: toriiOutline,
  tsarbell: tsarbellOutline,
  pisa: pisaOutline,
  brandenburg: brandenburgOutline,
  columbus: columbusOutline,
  david: davidOutline,
  osborne: osborneOutline,
};

export function buildScaleFigure(id: ScaleFigureId): THREE.Group {
  const shapes = OUTLINES[id]();
  const colors = LANDMARK_COLOR[id];
  const g = new THREE.Group();
  const line = new THREE.LineBasicMaterial({ color: 0x141a26, transparent: true, opacity: 0.8 });
  shapes.forEach((s, i) => {
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(s, 12),
      new THREE.MeshBasicMaterial({ color: colors[Math.min(i, colors.length - 1)] }),
    );
    mesh.position.z = i * 0.01;
    g.add(mesh);
    const pts = s.getPoints(24).map((p) => new THREE.Vector3(p.x, p.y, 0));
    const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), line);
    loop.position.z = i * 0.01 + 0.005;
    g.add(loop);
  });
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
