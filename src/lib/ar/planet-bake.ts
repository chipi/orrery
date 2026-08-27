// Bake the real planet textures (static/textures/2k_*.jpg) into camera-facing
// sprite maps for the AR sky (advisor Path B / #488). Each body is rendered ONCE
// at startup as an actual 3D sphere — lit by a DirectionalLight aimed along the
// body's real Sun direction, so the phase (Mercury/Venus crescents, the Moon) and
// limb darkening are physically correct — into a small WebGLRenderTarget whose
// texture becomes the sprite map. Saturn adds a ring mesh; because it's real 3D
// geometry the sphere/ring occlusion is handled by the depth buffer for free.
//
// This retires the hand-tuned procedural PLANET_STYLE grammar: authentic albedo,
// bands and phases straight from the shipped equirectangular maps. Renders are
// bounded (one per body at start) with zero per-frame cost; targets dispose in
// stop(). The procedural canvas markers remain the pre-bake fallback.

import * as THREE from 'three';

export interface PlanetBakeSpec {
  /** Body key (matches the marker map). */
  key: string;
  /** Loaded equirectangular surface texture. */
  texture: THREE.Texture;
  /** Phase angle: 0 = fully lit (opposition), π = new (between us and the Sun). */
  phaseAngleRad: number;
  /** Bright-limb position angle (rad, from "up"/zenith toward the Sun) — orients
   *  the crescent as seen when looking at the body in the observer's sky. */
  limbAngleRad: number;
  /** The Sun (+ any self-luminous body): render flat-bright, unlit, no phase. */
  unlit?: boolean;
  /** Ring system (Saturn). */
  rings?: boolean;
  /** Ortho half-extent the body is framed in (sphere radius = 1). Ringed bodies
   *  need a wider frame so the rings aren't clipped; the caller compensates the
   *  sprite scale by the same factor so the DISC keeps its apparent size. */
  frustumHalf?: number;
}

/** Default ortho half-extent — the sphere (r=1) fills most of the frame. */
export const DEFAULT_FRUSTUM_HALF = 1.32;

export interface BakedPlanets {
  get(key: string): THREE.Texture | undefined;
  dispose(): void;
}

/** A soft banded ring texture (with a Cassini-style gap) for the Saturn ring mesh. */
function makeRingTexture(): THREE.CanvasTexture {
  const w = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 8;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0.0, 'rgba(214,196,150,0)');
  g.addColorStop(0.12, 'rgba(214,196,150,0.85)');
  g.addColorStop(0.4, 'rgba(244,232,196,0.95)');
  g.addColorStop(0.55, 'rgba(120,104,72,0.2)'); // Cassini gap
  g.addColorStop(0.7, 'rgba(228,212,168,0.9)');
  g.addColorStop(1.0, 'rgba(200,182,138,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** RingGeometry with radial UVs so a 1-D ring texture maps across the annulus. */
function ringGeometry(inner: number, outer: number): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(inner, outer, 128, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = v.length();
    const t = (r - inner) / (outer - inner); // 0 inner → 1 outer
    uv.setXY(i, t, 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Render each spec's body into its own render target and return a lookup of the
 * resulting textures. Restores the renderer's target + clear state afterwards.
 */
export function bakePlanetTextures(
  renderer: THREE.WebGLRenderer,
  specs: PlanetBakeSpec[],
  size = 256,
): BakedPlanets {
  const targets = new Map<string, THREE.WebGLRenderTarget>();
  const disposables: { dispose(): void }[] = [];
  const ringTex = makeRingTexture();
  disposables.push(ringTex);

  const prevTarget = renderer.getRenderTarget();
  const prevClear = new THREE.Color();
  renderer.getClearColor(prevClear);
  const prevAlpha = renderer.getClearAlpha();

  for (const spec of specs) {
    const rt = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: true,
      depthBuffer: true,
    });
    rt.texture.colorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const half = spec.frustumHalf ?? DEFAULT_FRUSTUM_HALF;
    const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 10);
    cam.position.set(0, 0, 4);
    cam.lookAt(0, 0, 0);

    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 64, 64);
    const mat = spec.unlit
      ? new THREE.MeshBasicMaterial({ map: spec.texture })
      : new THREE.MeshLambertMaterial({ map: spec.texture });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = Math.PI * 0.85; // face a canonical hemisphere
    group.add(mesh);
    disposables.push(geo, mat);

    if (spec.rings) {
      const rGeo = ringGeometry(1.32, 2.3);
      const rMat = new THREE.MeshBasicMaterial({
        map: ringTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = Math.PI / 2; // lay flat; the group tilt opens it toward us
      group.add(ring);
      disposables.push(rGeo, rMat);
    }

    // Tilt: Saturn gets a wide ring-opening 3/4 view. Phased bodies stay upright
    // so the baked terminator's on-screen angle matches the real bright-limb angle.
    group.rotation.x = spec.rings ? 0.46 : 0;
    group.rotation.z = spec.rings ? -0.2 : 0;
    scene.add(group);

    if (!spec.unlit) {
      // Directional light at the phase angle from the view axis (+Z): the visible
      // lit fraction is (1+cos α)/2, so α=0 → full, α=π → new. The transverse
      // component points toward the real bright limb (limbAngleRad from +Y/up),
      // so Mercury/Venus/Moon crescents lean the correct way.
      const a = spec.phaseAngleRad;
      const chi = spec.limbAngleRad;
      const light = new THREE.DirectionalLight(0xfff4e6, 3.0);
      light.position.set(Math.sin(a) * Math.sin(chi), Math.sin(a) * Math.cos(chi), Math.cos(a));
      scene.add(light);
      // A faint cool fill so the unlit limb still reads as a disc over dark sky.
      scene.add(new THREE.AmbientLight(0x2a3d5c, 0.85));
    }

    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, cam);

    targets.set(spec.key, rt);
  }

  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  for (const d of disposables) d.dispose();

  return {
    get: (k) => targets.get(k)?.texture,
    dispose() {
      for (const rt of targets.values()) rt.dispose();
      targets.clear();
    },
  };
}
