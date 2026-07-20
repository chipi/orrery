/**
 * Glow-line — a bold, readable line/ring for trajectories + orbits.
 *
 * `THREE.Line` / `LineBasicMaterial` draw a 1-px `LINE` primitive (WebGL caps
 * it at one device pixel), so trajectories and orbit rings read thin and washy
 * at scene scale. buildGlowTube extrudes a real `TubeGeometry` mesh along the
 * path (unlit `MeshBasicMaterial`, colour stays pure) with an optional softer
 * outer halo, so the mission arc + orbits read boldly — the line analog of
 * BoldArrow.
 *
 * For STATIC paths (closed orbit rings, a fixed transfer arc). Dynamic,
 * frame-by-frame growing paths (ground tracks, coast previews) stay on a
 * Line/LineDashedMaterial and just get a brighter colour + higher opacity.
 */
import * as THREE from 'three';

export interface GlowTubeOptions {
  color: THREE.ColorRepresentation;
  /** Tube radius in scene units — the visual line weight. */
  radius: number;
  /** Core opacity (default 1). */
  opacity?: number;
  /** Close the curve into a loop (orbit rings). */
  closed?: boolean;
  /** Add a translucent outer halo at ~2.6× radius for a glow. Default true. */
  halo?: boolean;
  /** Radial + tubular segment counts (perf vs smoothness). */
  radialSegments?: number;
}

/**
 * Build a tube BufferGeometry along already-scaled `points`, with a per-vertex
 * `aT` attribute (0→1 along the length) so a gradient/progress shader (the
 * past-bright / future-dim trajectory material) can drive a bright-behind /
 * dim-ahead split. The cross-section ring is oriented flat to the XZ plane, so
 * out-of-plane climbs still render with the right vertical shape. Mirrors the
 * heliocentric trajectory tube — used for the cislunar mission arc too.
 */
export function buildTubeFromPoints(points: THREE.Vector3[], radius: number): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  if (points.length < 2) return geom;
  const radialSegs = 8;
  const ringCount = points.length;
  const vertsPerRing = radialSegs + 1;
  const positions = new Float32Array(ringCount * vertsPerRing * 3);
  const aTArr = new Float32Array(ringCount * vertsPerRing);
  for (let i = 0; i < ringCount; i++) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(ringCount - 1, i + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const tLen = Math.hypot(tx, tz) || 1;
    const sNx = -tz / tLen;
    const sNz = tx / tLen;
    const t = i / (ringCount - 1);
    for (let r = 0; r <= radialSegs; r++) {
      const theta = (r / radialSegs) * Math.PI * 2;
      const idx = i * vertsPerRing + r;
      positions[idx * 3 + 0] = p.x + radius * Math.sin(theta) * sNx;
      positions[idx * 3 + 1] = p.y + radius * Math.cos(theta);
      positions[idx * 3 + 2] = p.z + radius * Math.sin(theta) * sNz;
      aTArr[idx] = t;
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < ringCount - 1; i++) {
    for (let r = 0; r < radialSegs; r++) {
      const a = i * vertsPerRing + r;
      const b = (i + 1) * vertsPerRing + r;
      const c = (i + 1) * vertsPerRing + r + 1;
      const d = i * vertsPerRing + r + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  geom.setIndex(indices);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aT', new THREE.BufferAttribute(aTArr, 1));
  geom.computeVertexNormals();
  return geom;
}

/** Build a bold glowing tube along `points`. Returns a Group (core + halo). */
export function buildGlowTube(points: THREE.Vector3[], opts: GlowTubeOptions): THREE.Group {
  const group = new THREE.Group();
  const closed = opts.closed ?? false;
  const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.0);
  const tubular = Math.max(32, points.length * 2);
  const radial = opts.radialSegments ?? 8;

  const core = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubular, opts.radius, radial, closed),
    new THREE.MeshBasicMaterial({
      color: opts.color,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
    }),
  );
  group.add(core);

  if (opts.halo ?? true) {
    const halo = new THREE.Mesh(
      new THREE.TubeGeometry(curve, tubular, opts.radius * 2.6, radial, closed),
      new THREE.MeshBasicMaterial({
        color: opts.color,
        transparent: true,
        opacity: (opts.opacity ?? 1) * 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    group.add(halo);
  }
  return group;
}
