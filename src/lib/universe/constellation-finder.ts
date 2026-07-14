// Constellation "finder" projection for /explore v2 (Slice 1 Part 3). Turns a
// constellation's baked 3D line segments into a 2D sky chart as seen from the Sun
// — the familiar flat pattern — with the selected star's position marked. Pure so
// it's unit-tested; ConstellationFinder.svelte draws the result to a canvas.
//
// Method: each point becomes a direction from the Sun (unit vector); we project
// those directions orthographically onto the tangent plane at the constellation's
// mean direction, then normalize to a padded unit box preserving aspect.

export type Vec2 = readonly [number, number];
type Vec3 = readonly [number, number, number];

export interface FinderProjection {
  /** Line segments as pairs of normalized 2D points (0..1). */
  segments: Array<[Vec2, Vec2]>;
  /** The highlighted star's normalized 2D point, or null. */
  star: Vec2 | null;
}

function normalize([x, y, z]: Vec3): Vec3 {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Project a constellation's flat vertex list (every 6 numbers = one segment) into
 * a normalized 2D sky chart. `star` (if given) is projected onto the same plane.
 */
export function projectConstellation(
  vertices: number[],
  star?: Vec3 | null,
  pad = 0.08,
): FinderProjection {
  const dirs: Vec3[] = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    dirs.push(normalize([vertices[i], vertices[i + 1], vertices[i + 2]]));
  }
  if (dirs.length === 0) return { segments: [], star: null };

  // Mean viewing direction → tangent-plane basis (u, v).
  const sum = dirs.reduce<Vec3>((a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]], [0, 0, 0]);
  const w = normalize(sum);
  const up: Vec3 = Math.abs(w[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  const u = normalize(cross(up, w));
  const v = cross(w, u);

  const project = (p: Vec3): Vec2 => {
    const d = normalize(p);
    return [dot(d, u), dot(d, v)];
  };

  const flat2d: Vec2[] = dirs.map((d) => [dot(d, u), dot(d, v)]);
  const starRaw = star ? project(star) : null;

  const all = starRaw ? [...flat2d, starRaw] : flat2d;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of all) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const spanW = maxX - minX;
  const spanH = maxY - minY;
  const s = (1 - 2 * pad) / Math.max(spanW, spanH, 1e-6);
  const offX = (1 - spanW * s) / 2;
  const offY = (1 - spanH * s) / 2;
  const map = ([x, y]: Vec2): Vec2 => [offX + (x - minX) * s, offY + (y - minY) * s];

  const segments: Array<[Vec2, Vec2]> = [];
  for (let i = 0; i + 1 < flat2d.length; i += 2) {
    segments.push([map(flat2d[i]), map(flat2d[i + 1])]);
  }
  return { segments, star: starRaw ? map(starRaw) : null };
}
