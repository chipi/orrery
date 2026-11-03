/**
 * Cartoon cast for the /fleet line-ups — people, animals and a London bus, flat-coloured with a dark
 * outline, drawn face-on (people) or side-on (animals, bus) in METRES so they share the line-up's
 * true scale. Base on y = 0, centred on x = 0.
 *
 * Sizes:
 * - man 1.75 m (the legend's person), woman 1.65 m, child 1.10 m: typical adult / 6-year-old heights.
 * - dog 0.55 m to the head, cat 0.30 m sitting: a medium dog, a house cat.
 * - giraffe 5.5 m: "Fully grown giraffes stand 4.3–5.7 m tall, with males taller than females"
 *   (https://en.wikipedia.org/wiki/Giraffe) — a bull.
 * - elephant 3.2 m at the shoulder: "fully grown mature males are about 3.20 m tall at the
 *   shoulder" (https://en.wikipedia.org/wiki/African_bush_elephant).
 * - London Routemaster bus: 8.38 m long, 4.38 m tall (https://en.wikipedia.org/wiki/AEC_Routemaster).
 * - Terracotta warrior, Xi'an: "life-sized, typically ranging from 1.75 m to about 2 m"
 *   (https://en.wikipedia.org/wiki/Terracotta_Army) — drawn at 1.9 m, an officer.
 * - giant panda: "60 to 90 cm tall at the shoulder" (https://en.wikipedia.org/wiki/Giant_panda) —
 *   0.75 m at the shoulder.
 * - brown bear: "a shoulder height of 1.5 m" (https://en.wikipedia.org/wiki/Brown_bear).
 * - Volkswagen Beetle (Type 1): 4.08 m long, 1.50 m tall (https://en.wikipedia.org/wiki/Volkswagen_Beetle).
 */
import * as THREE from 'three';

export type CartoonId =
  | 'man'
  | 'woman'
  | 'child'
  | 'dog'
  | 'cat'
  | 'giraffe'
  | 'elephant'
  | 'routemaster'
  | 'warrior'
  | 'panda'
  | 'bear'
  | 'beetle';

export const CARTOON_HEIGHT_M: Record<CartoonId, number> = {
  man: 1.75,
  woman: 1.65,
  child: 1.1,
  dog: 0.55,
  cat: 0.3,
  giraffe: 5.5,
  elephant: 3.2,
  routemaster: 4.38,
  warrior: 1.9,
  panda: 0.75,
  bear: 1.5,
  beetle: 1.5,
};

const OUTLINE = 0x141a26;

interface Layer {
  shape: THREE.Shape;
  color: number;
  /** Draw the dark outline round this layer (the silhouette-defining parts). */
  line?: boolean;
}

const poly = (pts: [number, number][]): THREE.Shape => {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  return s;
};
const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0): THREE.Shape => {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, rot);
  return s;
};
const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);
/** A limb or neck: a quad from (x0,y0) to (x1,y1), w0 wide at the start and w1 at the end. */
const limb = (x0: number, y0: number, x1: number, y1: number, w0: number, w1 = w0): THREE.Shape => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return poly([
    [x0 + (nx * w0) / 2, y0 + (ny * w0) / 2],
    [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2],
    [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2],
    [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2],
  ]);
};
/** Rounded rectangle, x0..x1 by y0..y1, corner radius r. */
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number): THREE.Shape => {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
};

// Skin tones, hair and clothes vary from figure to figure (people from everywhere).
const SKIN = [0xf1c7a1, 0xc68a5e, 0x8d5a3b, 0xe0ac7e, 0x5c3a28];
const HAIR = [0x2b1d14, 0x5a3825, 0x15110e, 0xb07a3e, 0x3a2a20];
const SHIRT = [0xe07a4f, 0x4f9fd9, 0x6cbf84, 0xe2b64a, 0xc65d8a];
const TROUSERS = [0x3b5b8c, 0x4a4f5a, 0x6b4f3a, 0x2f6a5f];

/** A man, front view, waving one arm. */
function man(v: number): Layer[] {
  const skin = SKIN[v % SKIN.length];
  const L: Layer[] = [];
  const legs = TROUSERS[v % TROUSERS.length];
  L.push({ shape: limb(-0.1, 0.07, -0.1, 0.9, 0.15, 0.17), color: legs, line: true });
  L.push({ shape: limb(0.1, 0.07, 0.1, 0.9, 0.15, 0.17), color: legs, line: true });
  L.push({ shape: rrect(-0.22, 0, -0.03, 0.08, 0.04), color: 0x2a2a2e, line: true });
  L.push({ shape: rrect(0.03, 0, 0.22, 0.08, 0.04), color: 0x2a2a2e, line: true });
  // Arms first, under the shirt: one down, one waving up.
  L.push({
    shape: limb(-0.21, 1.38, -0.28, 0.92, 0.09),
    color: SHIRT[v % SHIRT.length],
    line: true,
  });
  L.push({ shape: circle(-0.285, 0.88, 0.05), color: skin, line: true });
  L.push({ shape: limb(0.2, 1.38, 0.42, 1.72, 0.09), color: SHIRT[v % SHIRT.length], line: true });
  L.push({ shape: circle(0.44, 1.76, 0.05), color: skin, line: true });
  const torso = new THREE.Shape();
  torso.moveTo(-0.19, 0.86);
  torso.lineTo(0.19, 0.86);
  torso.lineTo(0.23, 1.33);
  torso.quadraticCurveTo(0.22, 1.43, 0.12, 1.45);
  torso.lineTo(-0.12, 1.45);
  torso.quadraticCurveTo(-0.22, 1.43, -0.23, 1.33);
  torso.closePath();
  L.push({ shape: torso, color: SHIRT[v % SHIRT.length], line: true });
  L.push({ shape: limb(0, 1.42, 0, 1.53, 0.09), color: skin });
  L.push({ shape: circle(0, 1.625, 0.125), color: skin, line: true });
  const hair = new THREE.Shape();
  hair.absarc(0, 1.635, 0.13, Math.PI * 0.05, Math.PI * 0.95, false);
  hair.closePath();
  L.push({ shape: hair, color: HAIR[v % HAIR.length] });
  L.push({ shape: circle(-0.045, 1.62, 0.014), color: OUTLINE });
  L.push({ shape: circle(0.045, 1.62, 0.014), color: OUTLINE });
  return L;
}

/** A woman, front view, A-line dress, hair to the shoulders. */
function woman(v: number): Layer[] {
  const skin = SKIN[(v + 2) % SKIN.length];
  const dress = SHIRT[(v + 3) % SHIRT.length];
  const L: Layer[] = [];
  L.push({
    shape: rrect(-0.15, 1.18, 0.15, 1.6, 0.12),
    color: HAIR[(v + 1) % HAIR.length],
    line: true,
  });
  L.push({ shape: limb(-0.08, 0.06, -0.08, 0.5, 0.08), color: skin, line: true });
  L.push({ shape: limb(0.08, 0.06, 0.08, 0.5, 0.08), color: skin, line: true });
  L.push({ shape: rrect(-0.18, 0, -0.02, 0.07, 0.035), color: 0x7a2f3a, line: true });
  L.push({ shape: rrect(0.02, 0, 0.18, 0.07, 0.035), color: 0x7a2f3a, line: true });
  L.push({ shape: limb(-0.17, 1.28, -0.24, 0.86, 0.075), color: skin, line: true });
  L.push({ shape: limb(0.17, 1.28, 0.24, 0.86, 0.075), color: skin, line: true });
  const d = new THREE.Shape();
  d.moveTo(-0.3, 0.44);
  d.quadraticCurveTo(0, 0.4, 0.3, 0.44);
  d.lineTo(0.16, 1.05);
  d.lineTo(0.19, 1.3);
  d.quadraticCurveTo(0.18, 1.36, 0.1, 1.37);
  d.lineTo(-0.1, 1.37);
  d.quadraticCurveTo(-0.18, 1.36, -0.19, 1.3);
  d.lineTo(-0.16, 1.05);
  d.closePath();
  L.push({ shape: d, color: dress, line: true });
  L.push({ shape: limb(0, 1.35, 0, 1.44, 0.08), color: skin });
  L.push({ shape: circle(0, 1.535, 0.115), color: skin, line: true });
  const fringe = new THREE.Shape();
  fringe.absarc(0, 1.55, 0.12, Math.PI * 0.08, Math.PI * 0.92, false);
  fringe.closePath();
  L.push({ shape: fringe, color: HAIR[(v + 1) % HAIR.length] });
  L.push({ shape: circle(-0.04, 1.53, 0.013), color: OUTLINE });
  L.push({ shape: circle(0.04, 1.53, 0.013), color: OUTLINE });
  return L;
}

/** A child holding a red balloon. */
function child(v: number): Layer[] {
  const skin = SKIN[(v + 4) % SKIN.length];
  const L: Layer[] = [];
  L.push({ shape: limb(-0.06, 0.05, -0.06, 0.48, 0.08), color: skin, line: true });
  L.push({ shape: limb(0.06, 0.05, 0.06, 0.48, 0.08), color: skin, line: true });
  L.push({ shape: rrect(-0.13, 0, -0.01, 0.06, 0.03), color: 0xd94b4b, line: true });
  L.push({ shape: rrect(0.01, 0, 0.13, 0.06, 0.03), color: 0xd94b4b, line: true });
  L.push({
    shape: rrect(-0.13, 0.36, 0.13, 0.52, 0.03),
    color: TROUSERS[(v + 1) % TROUSERS.length],
    line: true,
  });
  L.push({ shape: limb(-0.12, 0.84, -0.17, 0.58, 0.065), color: skin, line: true });
  L.push({ shape: limb(0.12, 0.84, 0.2, 0.62, 0.065), color: skin, line: true });
  L.push({
    shape: rrect(-0.14, 0.5, 0.14, 0.86, 0.05),
    color: SHIRT[(v + 2) % SHIRT.length],
    line: true,
  });
  L.push({ shape: circle(0, 0.975, 0.115), color: skin, line: true });
  const hair = new THREE.Shape();
  hair.absarc(0, 0.99, 0.12, Math.PI * 0.02, Math.PI * 0.98, false);
  hair.closePath();
  L.push({ shape: hair, color: HAIR[(v + 3) % HAIR.length] });
  L.push({ shape: circle(-0.04, 0.97, 0.013), color: OUTLINE });
  L.push({ shape: circle(0.04, 0.97, 0.013), color: OUTLINE });
  // Balloon on a string from the raised hand.
  L.push({ shape: limb(0.2, 0.62, 0.3, 1.42, 0.008), color: 0xe6ecf5 });
  L.push({ shape: ellipse(0.31, 1.56, 0.12, 0.15), color: 0xe5484d, line: true });
  L.push({ shape: ellipse(0.27, 1.62, 0.03, 0.045, -0.4), color: 0xf6a3a5 });
  return L;
}

/** A dog, side view, tail up. */
function dog(): Layer[] {
  const fur = 0xc9925a;
  const dark = 0x7a4f2c;
  return [
    { shape: limb(-0.42, 0.36, -0.55, 0.52, 0.05, 0.035), color: fur, line: true },
    { shape: limb(-0.25, 0.3, -0.25, 0, 0.07), color: fur, line: true },
    { shape: limb(-0.17, 0.3, -0.17, 0, 0.07), color: dark, line: true },
    { shape: limb(0.17, 0.3, 0.17, 0, 0.07), color: dark, line: true },
    { shape: limb(0.25, 0.3, 0.25, 0, 0.07), color: fur, line: true },
    { shape: ellipse(0, 0.33, 0.33, 0.12), color: fur, line: true },
    { shape: limb(0.24, 0.36, 0.33, 0.46, 0.12), color: fur },
    { shape: circle(0.35, 0.46, 0.085), color: fur, line: true },
    { shape: ellipse(0.44, 0.43, 0.07, 0.045), color: fur, line: true },
    { shape: circle(0.5, 0.44, 0.02), color: OUTLINE },
    { shape: ellipse(0.31, 0.47, 0.035, 0.08, 0.3), color: dark, line: true },
    { shape: circle(0.38, 0.49, 0.012), color: OUTLINE },
  ];
}

/** A house cat sitting, side view, tail curled. */
function cat(): Layer[] {
  const fur = 0x5d6470;
  const body = new THREE.Shape();
  body.moveTo(-0.1, 0);
  body.quadraticCurveTo(-0.13, 0.12, -0.05, 0.2);
  body.lineTo(0.05, 0.22);
  body.quadraticCurveTo(0.1, 0.12, 0.08, 0);
  body.closePath();
  return [
    { shape: limb(-0.1, 0.02, -0.2, 0.1, 0.03, 0.02), color: fur, line: true },
    { shape: body, color: fur, line: true },
    { shape: circle(0.04, 0.24, 0.055), color: fur, line: true },
    {
      shape: poly([
        [0.0, 0.27],
        [0.015, 0.31],
        [0.035, 0.28],
      ]),
      color: fur,
      line: true,
    },
    {
      shape: poly([
        [0.05, 0.28],
        [0.07, 0.31],
        [0.085, 0.27],
      ]),
      color: fur,
      line: true,
    },
    { shape: circle(0.065, 0.245, 0.008), color: 0xd8e36a },
  ];
}

/** A giraffe bull, side view, facing right. */
function giraffe(): Layer[] {
  const coat = 0xe6b04c;
  const spot = 0x9c5e2a;
  const L: Layer[] = [];
  for (const [x, top] of [
    [-0.75, 2.5],
    [-0.55, 2.5],
    [0.55, 2.65],
    [0.75, 2.65],
  ] as const)
    L.push({ shape: limb(x, top, x, 0.05, 0.13, 0.1), color: coat, line: true });
  for (const x of [-0.75, -0.55, 0.55, 0.75])
    L.push({ shape: rrect(x - 0.07, 0, x + 0.07, 0.1, 0.03), color: 0x3a2a20 });
  L.push({ shape: limb(-1.0, 2.75, -1.18, 2.0, 0.05, 0.03), color: coat, line: true });
  L.push({ shape: ellipse(0, 2.78, 1.05, 0.48, 0.12), color: coat, line: true });
  L.push({ shape: limb(0.65, 3.0, 1.35, 5.05, 0.6, 0.26), color: coat, line: true });
  L.push({ shape: ellipse(1.55, 5.18, 0.36, 0.15, -0.35), color: coat, line: true });
  L.push({ shape: limb(1.4, 5.26, 1.36, 5.5, 0.05), color: spot, line: true });
  L.push({ shape: limb(1.5, 5.26, 1.48, 5.48, 0.05), color: spot, line: true });
  L.push({ shape: ellipse(1.28, 5.2, 0.1, 0.05, 0.6), color: coat, line: true });
  L.push({ shape: circle(1.6, 5.22, 0.03), color: OUTLINE });
  for (const [x, y, r] of [
    [-0.6, 2.85, 0.16],
    [-0.2, 2.95, 0.18],
    [0.25, 2.8, 0.16],
    [-0.35, 2.55, 0.14],
    [0.1, 2.5, 0.13],
    [0.6, 2.95, 0.12],
    [0.85, 3.5, 0.11],
    [1.0, 4.0, 0.1],
    [1.15, 4.5, 0.08],
  ] as const)
    L.push({ shape: ellipse(x, y, r, r * 0.8, 0.4), color: spot });
  return L;
}

/** An African elephant bull, side view, facing right. */
function elephant(): Layer[] {
  const hide = 0x8b8f9a;
  const dark = 0x6f737e;
  const L: Layer[] = [];
  for (const x of [-1.05, -0.65, 0.55, 0.95])
    L.push({
      shape: limb(x, 1.6, x, 0.02, 0.42, 0.4),
      color: x === -0.65 || x === 0.95 ? dark : hide,
      line: true,
    });
  L.push({ shape: limb(-1.62, 2.35, -1.85, 1.4, 0.07, 0.04), color: hide, line: true });
  const body = new THREE.Shape();
  body.moveTo(-1.6, 1.2);
  body.quadraticCurveTo(-1.85, 2.7, -0.6, 3.05);
  body.quadraticCurveTo(0.6, 3.25, 1.35, 2.9);
  body.quadraticCurveTo(1.6, 2.0, 1.1, 1.15);
  body.quadraticCurveTo(-0.2, 0.95, -1.6, 1.2);
  L.push({ shape: body, color: hide, line: true });
  const trunk = new THREE.Shape();
  trunk.moveTo(2.15, 2.35);
  trunk.quadraticCurveTo(2.55, 1.4, 2.35, 0.55);
  trunk.lineTo(2.18, 0.55);
  trunk.quadraticCurveTo(2.3, 1.4, 1.9, 2.1);
  trunk.closePath();
  L.push({ shape: trunk, color: hide, line: true });
  L.push({ shape: circle(1.75, 2.45, 0.58), color: hide, line: true });
  L.push({ shape: ellipse(1.45, 2.35, 0.48, 0.7, 0.15), color: dark, line: true });
  L.push({ shape: limb(2.05, 1.85, 2.35, 1.55, 0.09, 0.05), color: 0xf2ead8, line: true });
  L.push({ shape: circle(2.0, 2.6, 0.045), color: OUTLINE });
  return L;
}

/** A London Routemaster, side view, rear platform on the left. */
function routemaster(): Layer[] {
  const red = 0xc8202a;
  const glass = 0xbcd6e8;
  const L: Layer[] = [];
  L.push({ shape: rrect(-4.19, 0.35, 4.19, 4.38, 0.35), color: red, line: true });
  L.push({ shape: rrect(-4.15, 2.2, 4.15, 2.32, 0.02), color: 0xf3efe6 });
  for (let i = 0; i < 6; i++) {
    const x0 = -3.55 + i * 1.22;
    L.push({ shape: rrect(x0, 2.75, x0 + 1.02, 3.85, 0.12), color: glass, line: true });
    if (i > 0) L.push({ shape: rrect(x0, 1.15, x0 + 1.02, 2.05, 0.12), color: glass, line: true });
  }
  L.push({ shape: rrect(-4.05, 0.45, -3.1, 2.05, 0.06), color: 0x2b2f38, line: true });
  L.push({ shape: rrect(3.25, 3.95, 4.05, 4.25, 0.05), color: 0x15181f });
  for (const x of [-2.6, 2.9]) {
    L.push({ shape: circle(x, 0.5, 0.5), color: 0x1d2028, line: true });
    L.push({ shape: circle(x, 0.5, 0.22), color: 0x9aa1ad });
  }
  return L;
}

/** A Terracotta Army officer, front view: armoured tunic, robe, topknot. */
function warrior(): Layer[] {
  const clay = 0xb57a50;
  const dark = 0x8e5a38;
  const L: Layer[] = [];
  L.push({ shape: limb(-0.1, 0.06, -0.1, 0.62, 0.15), color: clay, line: true });
  L.push({ shape: limb(0.1, 0.06, 0.1, 0.62, 0.15), color: clay, line: true });
  L.push({ shape: rrect(-0.22, 0, -0.02, 0.08, 0.04), color: dark, line: true });
  L.push({ shape: rrect(0.02, 0, 0.22, 0.08, 0.04), color: dark, line: true });
  L.push({ shape: limb(-0.23, 1.5, -0.3, 0.98, 0.11), color: clay, line: true });
  L.push({ shape: limb(0.23, 1.5, 0.3, 0.98, 0.11), color: clay, line: true });
  // Robe flaring over the knees, then the armoured tunic with its plates.
  const robe = poly([
    [-0.28, 0.58],
    [0.28, 0.58],
    [0.22, 1.0],
    [-0.22, 1.0],
  ]);
  L.push({ shape: robe, color: clay, line: true });
  L.push({ shape: rrect(-0.24, 0.92, 0.24, 1.56, 0.06), color: dark, line: true });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      L.push({
        shape: rrect(-0.2 + c * 0.1, 0.98 + r * 0.13, -0.12 + c * 0.1, 1.08 + r * 0.13, 0.015),
        color: clay,
      });
  L.push({ shape: limb(0, 1.54, 0, 1.64, 0.1), color: clay });
  L.push({ shape: circle(0, 1.73, 0.125), color: clay, line: true });
  L.push({ shape: ellipse(0.06, 1.86, 0.06, 0.045), color: dark, line: true });
  L.push({ shape: circle(-0.045, 1.73, 0.014), color: OUTLINE });
  L.push({ shape: circle(0.045, 1.73, 0.014), color: OUTLINE });
  return L;
}

/** A giant panda on all fours, side view, facing right. */
function panda(): Layer[] {
  const white = 0xf2efe8;
  const black = 0x1d1d20;
  return [
    { shape: limb(-0.42, 0.42, -0.42, 0.02, 0.18), color: black, line: true },
    { shape: limb(-0.28, 0.42, -0.28, 0.02, 0.18), color: black, line: true },
    { shape: ellipse(-0.05, 0.5, 0.52, 0.26), color: white, line: true },
    { shape: limb(0.3, 0.42, 0.3, 0.02, 0.18), color: black, line: true },
    { shape: limb(0.45, 0.42, 0.45, 0.02, 0.18), color: black, line: true },
    { shape: ellipse(0.22, 0.58, 0.2, 0.18), color: black },
    { shape: circle(0.55, 0.68, 0.19), color: white, line: true },
    { shape: circle(0.47, 0.84, 0.07), color: black, line: true },
    { shape: circle(0.66, 0.83, 0.065), color: black, line: true },
    { shape: ellipse(0.63, 0.69, 0.055, 0.04, -0.3), color: black },
    { shape: circle(0.635, 0.695, 0.012), color: white },
    { shape: circle(0.74, 0.64, 0.025), color: black },
  ];
}

/** A brown bear on all fours, side view, facing right, its shoulder hump at 1.5 m. */
function bear(): Layer[] {
  const fur = 0x6b4a2e;
  const dark = 0x4f3520;
  const body = new THREE.Shape();
  body.moveTo(-0.95, 0.55);
  body.quadraticCurveTo(-1.1, 1.25, -0.5, 1.3);
  body.quadraticCurveTo(0.2, 1.55, 0.55, 1.5);
  body.quadraticCurveTo(0.95, 1.35, 0.9, 0.7);
  body.quadraticCurveTo(0, 0.55, -0.95, 0.55);
  return [
    { shape: limb(-0.7, 0.8, -0.7, 0.03, 0.26), color: dark, line: true },
    { shape: limb(0.55, 0.8, 0.55, 0.03, 0.26), color: dark, line: true },
    { shape: body, color: fur, line: true },
    { shape: limb(-0.5, 0.8, -0.5, 0.03, 0.26), color: fur, line: true },
    { shape: limb(0.72, 0.8, 0.72, 0.03, 0.26), color: fur, line: true },
    { shape: ellipse(1.08, 1.12, 0.28, 0.22, -0.3), color: fur, line: true },
    { shape: ellipse(1.32, 1.02, 0.12, 0.08, -0.3), color: 0x8a6544, line: true },
    { shape: circle(1.43, 1.0, 0.03), color: OUTLINE },
    { shape: circle(0.98, 1.33, 0.06), color: fur, line: true },
    { shape: circle(1.14, 1.15, 0.022), color: OUTLINE },
  ];
}

/** A Volkswagen Beetle, side view, facing right. */
function beetle(): Layer[] {
  const paint = 0x8fc3d8;
  const body = new THREE.Shape();
  body.moveTo(-2.04, 0.35);
  body.lineTo(2.04, 0.35);
  body.quadraticCurveTo(2.1, 0.75, 1.6, 0.9);
  body.quadraticCurveTo(1.0, 0.95, 0.75, 1.05);
  body.quadraticCurveTo(0.2, 1.5, -0.45, 1.5);
  body.quadraticCurveTo(-1.6, 1.45, -1.9, 0.95);
  body.quadraticCurveTo(-2.1, 0.7, -2.04, 0.35);
  return [
    { shape: body, color: paint, line: true },
    { shape: ellipse(-1.2, 0.62, 0.62, 0.42), color: 0x7ab1c8, line: true },
    { shape: ellipse(1.2, 0.62, 0.6, 0.4), color: 0x7ab1c8, line: true },
    {
      shape: poly([
        [-0.85, 1.0],
        [0.55, 1.0],
        [0.2, 1.38],
        [-0.45, 1.42],
        [-0.8, 1.3],
      ]),
      color: 0xbcd6e8,
      line: true,
    },
    { shape: rrect(-0.15, 1.0, -0.08, 1.4, 0.01), color: paint },
    { shape: ellipse(1.75, 0.82, 0.08, 0.06), color: 0xf3efd6, line: true },
    { shape: rrect(-2.12, 0.42, 2.12, 0.5, 0.03), color: 0xd9dde3 },
    { shape: circle(-1.2, 0.33, 0.33), color: 0x1d2028, line: true },
    { shape: circle(-1.2, 0.33, 0.15), color: 0xc7ccd4 },
    { shape: circle(1.2, 0.33, 0.33), color: 0x1d2028, line: true },
    { shape: circle(1.2, 0.33, 0.15), color: 0xc7ccd4 },
  ];
}

const BUILDERS: Record<CartoonId, (v: number) => Layer[]> = {
  man,
  woman,
  child,
  dog,
  cat,
  giraffe,
  elephant,
  routemaster,
  warrior,
  panda,
  bear,
  beetle,
};

/**
 * One cartoon figure. `variant` picks skin tone, hair and clothes for the people (so a row of them
 * is a crowd, not clones); `mirror` flips animals and the bus to face left.
 */
export function buildCartoon(id: CartoonId, variant = 0, mirror = false): THREE.Group {
  const g = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: OUTLINE, transparent: true, opacity: 0.85 });
  BUILDERS[id](variant).forEach((layer, i) => {
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(layer.shape, 16),
      new THREE.MeshBasicMaterial({ color: layer.color }),
    );
    mesh.position.z = i * 0.002;
    g.add(mesh);
    if (layer.line) {
      const pts = layer.shape.getPoints(24).map((p) => new THREE.Vector3(p.x, p.y, 0));
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
      line.position.z = i * 0.002 + 0.001;
      g.add(line);
    }
  });
  if (mirror) g.scale.x = -1;
  g.userData.cartoon = id;
  return g;
}
