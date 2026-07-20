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
