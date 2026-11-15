/**
 * Launch conditions rig (G3 review prototype, dev-only): a seeded sky, sun, atmosphere
 * limb, cloud deck, night lights, pad tower and pad smoke laid over the existing ascent
 * scene, all procedural (shader noise and canvas-drawn sprites; no image asset beyond the
 * night map the scene already ships). The director picks the conditions
 * (ascent-director.ts `pickConditions`); this paints them.
 *
 * It decorates a scene built by createAscentScene without changing that file: it finds
 * the scene's own sun, ambient light, sky dome, sun disc, atmosphere rim and tower,
 * retunes or hides them, and adds its own. Call `update` after each `setState` (the scene
 * resets the background every frame).
 */

import * as THREE from 'three';
import type { LaunchConditions, LightId } from '$lib/orbital/ascent-director';
import type { AscentState } from '$lib/physics/ascent/ascent-physics';
import type { AscentScene } from './ascent-scene';
import { SeparationBurst } from './separation-burst';

const R_EARTH_KM = 6371;

interface Palette {
  horizon: number;
  zenith: number;
  /** Background colour on the ground (behind the sky dome while it is opaque). */
  ground: number;
  sun: number;
  sunIntensity: number;
  ambient: number;
  ambientIntensity: number;
  cloudLit: number;
  cloudShade: number;
  /** How much the sun glows in the sky (0 = none). */
  glow: number;
  /** Pad satellite photo brightness (it is emissive in the scene) and its tint. */
  groundEmissive: number;
  groundTint: number;
  /** The plume lights the pad and stack (0 = a little, 1 = fully). */
  flameLight: number;
  /** Atmosphere limb colour and strength. */
  limb: number;
  limbAmt: number;
  /** City lights on the dark side (0 = none). */
  cityLights: number;
  /** A fill from the camera side so a stage far from the plume stays lit, not a flat blue-grey. */
  keyColor: number;
  keyIntensity: number;
}

const PALETTES: Record<LightId, Palette> = {
  midday: {
    horizon: 0x86b8ea,
    zenith: 0x2a62b8,
    ground: 0x25559a,
    sun: 0xfff4de,
    sunIntensity: 1.3,
    ambient: 0xeaf0ff,
    ambientIntensity: 0.34,
    cloudLit: 0xffffff,
    cloudShade: 0x8d9db4,
    glow: 0.55,
    groundEmissive: 0.9,
    groundTint: 0xffffff,
    flameLight: 0.12,
    limb: 0x5aa0ff,
    limbAmt: 1.2,
    cityLights: 0,
    keyColor: 0xffffff,
    keyIntensity: 0,
  },
  golden: {
    horizon: 0xf2a85e,
    zenith: 0x3a5f9e,
    ground: 0x4d4f78,
    sun: 0xffb25c,
    sunIntensity: 1.25,
    ambient: 0xffd8b0,
    ambientIntensity: 0.24,
    cloudLit: 0xffd2a0,
    cloudShade: 0x6a5a80,
    glow: 1.0,
    groundEmissive: 0.65,
    groundTint: 0xffd9b0,
    flameLight: 0.5,
    limb: 0xff9a55,
    limbAmt: 1.1,
    cityLights: 0.15,
    keyColor: 0xffd9b0,
    keyIntensity: 0.25,
  },
  dusk: {
    horizon: 0xd8764f,
    zenith: 0x1c2858,
    ground: 0x2a2748,
    sun: 0xff8048,
    sunIntensity: 1.0,
    ambient: 0x8a90c8,
    ambientIntensity: 0.34,
    cloudLit: 0xff9a68,
    cloudShade: 0x3a4068,
    glow: 1.25,
    groundEmissive: 0.5,
    groundTint: 0xff9a70,
    flameLight: 1,
    limb: 0xff6a3a,
    limbAmt: 1.0,
    cityLights: 0.6,
    keyColor: 0xffc9a0,
    keyIntensity: 0.7,
  },
  night: {
    horizon: 0x16213d,
    zenith: 0x040612,
    ground: 0x070a18,
    sun: 0xa8bcff,
    sunIntensity: 0.6,
    ambient: 0x5a6cae,
    ambientIntensity: 0.55,
    cloudLit: 0x8da0d8,
    cloudShade: 0x1c2442,
    glow: 0.25,
    groundEmissive: 0.38,
    groundTint: 0x8ea4e0,
    flameLight: 1,
    limb: 0x3f64c8,
    limbAmt: 0.7,
    cityLights: 1,
    keyColor: 0xe4e9ff,
    keyIntensity: 0.8,
  },
};

export interface ConditionsRig {
  /** Apply to the camera and scene after setState(): sky colours, cloud and smoke motion. */
  update(s: AscentState, camera: THREE.Camera): void;
  dispose(): void;
}

function sunVector(c: LaunchConditions): THREE.Vector3 {
  const el = (c.sunElevDeg * Math.PI) / 180;
  const az = (c.sunAzDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
}

/** A soft round sprite drawn to a canvas: `hard` 0 = a puff with a long falloff, 1 = a tight core. */
function radialTexture(hard: number, size = 128): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15 + hard * 0.35, `rgba(255,255,255,${0.75 - hard * 0.2})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A glow with no visible edge: a steep, multi-stop falloff. */
function softGlowTexture(size = 128): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [s, a] of [
    [0, 1],
    [0.12, 0.6],
    [0.3, 0.25],
    [0.55, 0.07],
    [0.8, 0.015],
    [1, 0],
  ] as [number, number][])
    g.addColorStop(s, `rgba(255,255,255,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A lumpy cloud-puff texture: several overlapping soft discs, so smoke reads as billows. */
function puffTexture(): THREE.CanvasTexture {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  let seed = 12345;
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 12; i++) {
    const x = size * (0.28 + rnd() * 0.44);
    const y = size * (0.28 + rnd() * 0.44);
    const r = size * (0.14 + rnd() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.6)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const NOISE_GLSL = /* glsl */ `
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p, int oct) {
    float a = 0.5; float s = 0.0;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      s += a * vnoise(p);
      p = p * 2.07 + vec3(11.3, 7.1, 3.7);
      a *= 0.5;
    }
    return s;
  }
`;

/** A lattice service tower (example 5): four posts, rings, diagonals, a lightning mast. */
function buildPadTower(vehLen: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rz = 0,
  ): void => {
    const m = new THREE.Mesh(box, mat);
    m.position.set(x * vehLen, y * vehLen, z * vehLen);
    m.scale.set(sx * vehLen, sy * vehLen, sz * vehLen);
    m.rotation.z = rz;
    g.add(m);
  };
  const H = 1.18;
  const W = 0.1;
  const post = 0.009;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) add((sx * W) / 2, H / 2, (sz * W) / 2, post, H, post);
  const bays = 12;
  for (let i = 0; i <= bays; i++) {
    const y = (H * i) / bays;
    add(0, y, W / 2, W, post * 0.8, post * 0.8);
    add(0, y, -W / 2, W, post * 0.8, post * 0.8);
    add(W / 2, y, 0, post * 0.8, post * 0.8, W);
    add(-W / 2, y, 0, post * 0.8, post * 0.8, W);
    if (i < bays) {
      const bay = H / bays;
      const len = Math.hypot(W, bay);
      const ang = Math.atan2(bay, W) * (i % 2 ? 1 : -1);
      add(0, y + bay / 2, W / 2, len, post * 0.6, post * 0.6, ang);
      add(0, y + bay / 2, -W / 2, len, post * 0.6, post * 0.6, -ang);
    }
  }
  add(0, H + 0.16, 0, post * 1.6, 0.32, post * 1.6); // lightning mast
  add(-0.14, 0.7, 0, 0.3, post * 2, post * 2); // swing arm toward the stack
  add(0, 0.012, 0, 0.5, 0.024, 0.5); // pad slab
  return g;
}

export function attachLaunchConditions(
  asc: AscentScene,
  c: LaunchConditions,
  vehLen: number,
  nightUrl?: string,
  lite = false,
): ConditionsRig {
  const pal = PALETTES[c.light];
  const scene = asc.scene;
  const sunDir = sunVector(c);
  const owned: THREE.Object3D[] = [];
  const disposables: { dispose(): void }[] = [];

  // ── Retune the scene's own lights and neutralise its sky, sun, rim and tower ─
  const found: { earth: THREE.Mesh | null } = { earth: null };
  const groundMats: THREE.MeshStandardMaterial[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.DirectionalLight) {
      o.color.setHex(pal.sun);
      o.intensity = pal.sunIntensity * Math.PI;
      o.position.copy(sunDir).multiplyScalar(1000);
    } else if (o instanceof THREE.AmbientLight) {
      o.color.setHex(pal.ambient);
      o.intensity = pal.ambientIntensity * Math.PI;
    } else if (o instanceof THREE.Mesh) {
      const mat = o.material as THREE.Material;
      if (o.renderOrder === -10 && mat instanceof THREE.ShaderMaterial) o.visible = false;
      const geo = o.geometry as THREE.BufferGeometry & {
        parameters?: { radius?: number; height?: number };
      };
      const radius = geo.parameters?.radius;
      if (radius === R_EARTH_KM + 55) o.visible = false; // the scene's flat rim shell
      if (radius === R_EARTH_KM) found.earth = o;
      if (
        geo instanceof THREE.BoxGeometry &&
        Math.abs((geo.parameters?.height ?? 0) - vehLen * 1.05) < 1e-6
      )
        o.visible = false; // the scene's black strongback; a lattice replaces it
      if (mat instanceof THREE.MeshStandardMaterial && mat.emissiveMap) groundMats.push(mat);
    } else if (o instanceof THREE.Group && Math.abs(o.position.length() - 60_000) < 1) {
      o.visible = false; // the scene's sun disc, replaced below
    }
  });
  for (const m of groundMats) {
    m.emissiveIntensity = pal.groundEmissive;
    m.emissive.setHex(pal.groundTint);
  }

  // ── Sky dome: colours by light, a glow toward the sun ──────────────────
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uAlt: { value: 0 },
      uHorizon: { value: new THREE.Color(pal.horizon) },
      uZenith: { value: new THREE.Color(pal.zenith) },
      uSunDir: { value: sunDir },
      uSunCol: { value: new THREE.Color(pal.sun) },
      uGlow: { value: pal.glow },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAlt; uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSunDir;
      uniform vec3 uSunCol; uniform float uGlow;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        vec3 dflat = normalize(vec3(d.x, 0.0001, d.z));
        vec3 sflat = normalize(vec3(uSunDir.x, 0.0001, uSunDir.z));
        float toward = pow(max(dot(dflat, sflat), 0.0), 4.0) * (1.0 - smoothstep(0.0, 0.45, h));
        col = mix(col, uSunCol * 1.1, clamp(toward * 0.55 * uGlow, 0.0, 0.85));
        col += uSunCol * (pow(s, 6.0) * 0.25 + pow(s, 64.0) * 0.6) * uGlow;
        float fade = clamp(1.0 - uAlt / 60.0, 0.0, 1.0);
        gl_FragColor = vec4(col, fade);
      }
    `,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(29_000, 32, 32), skyMat);
  skyDome.renderOrder = -9;
  scene.add(skyDome);
  owned.push(skyDome);
  disposables.push(skyMat, skyDome.geometry);

  // ── Sun (or moon): a core and a halo, additive, visible from altitude ───
  const haloTex = radialTexture(0);
  const coreTex = radialTexture(1);
  const mkSun = (tex: THREE.Texture, scale: number, opacity: number): void => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        color: pal.sun,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sp.position.copy(sunDir).multiplyScalar(50_000);
    sp.scale.setScalar(scale);
    scene.add(sp);
    owned.push(sp);
    disposables.push(sp.material);
  };
  mkSun(haloTex, 12_000, 0.24 * Math.min(1.3, pal.glow));
  mkSun(coreTex, 4_200, 0.9);
  disposables.push(haloTex, coreTex);

  // ── Atmosphere limb: a thin glow that fades into space, coloured by the light ─
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      uCentre: { value: new THREE.Vector3(0, -R_EARTH_KM, 0) },
      uSunDir: { value: sunDir },
      uCol: { value: new THREE.Color(pal.limb) },
      uAmt: { value: pal.limbAmt },
      uCamAlt: { value: 0 },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCentre; uniform vec3 uSunDir; uniform vec3 uCol; uniform float uAmt; uniform float uCamAlt;
      varying vec3 vW;
      void main() {
        vec3 ro = cameraPosition - uCentre;
        vec3 rd = normalize(vW - cameraPosition);
        float tca = max(-dot(ro, rd), 0.0);
        vec3 pc = ro + rd * tca;
        float h = length(pc) - 6371.0;
        float g = exp(-max(h, 0.0) / 20.0);
        float sunSide = 0.22 + 0.78 * smoothstep(-0.35, 0.8, dot(normalize(pc), normalize(uSunDir)));
        float vis = smoothstep(15.0, 70.0, uCamAlt);
        gl_FragColor = vec4(uCol * g * sunSide * uAmt * vis, 1.0);
      }
    `,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH_KM + 170, 128, 64), atmoMat);
  atmo.position.set(0, -R_EARTH_KM, 0);
  atmo.renderOrder = 1;
  scene.add(atmo);
  owned.push(atmo);
  disposables.push(atmoMat, atmo.geometry);

  // ── Night lights on the dark side: the scene's own night map, additive ──
  let lightsMat: THREE.ShaderMaterial | null = null;
  if (nightUrl && found.earth && pal.cityLights > 0) {
    const tex = new THREE.TextureLoader().load(nightUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    lightsMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: tex },
        uSunDir: { value: sunDir },
        uCentre: { value: new THREE.Vector3(0, -R_EARTH_KM, 0) },
        uAmt: { value: pal.cityLights },
        uCamAlt: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vW;
        void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uSunDir; uniform vec3 uCentre; uniform float uAmt; uniform float uCamAlt;
        varying vec2 vUv; varying vec3 vW;
        void main() {
          float ndl = dot(normalize(vW - uCentre), normalize(uSunDir));
          float dark = 1.0 - smoothstep(-0.12, 0.1, ndl);
          vec3 city = texture2D(uMap, vUv).rgb;
          float vis = smoothstep(6.0, 40.0, uCamAlt);
          gl_FragColor = vec4(city * vec3(1.15, 0.9, 0.6) * dark * uAmt * vis * 1.6, 1.0);
        }
      `,
    });
    const lights = new THREE.Mesh(
      new THREE.SphereGeometry(R_EARTH_KM + 0.4, lite ? 64 : 128, lite ? 64 : 128),
      lightsMat,
    );
    lights.position.copy(found.earth.position);
    lights.quaternion.copy(found.earth.quaternion);
    lights.renderOrder = 1;
    scene.add(lights);
    owned.push(lights);
    disposables.push(lightsMat, lights.geometry, tex);
  }

  // ── Cloud deck: cumulus clusters and stratus sheets, soft edged ────────
  const thr = 0.82 - 0.62 * c.coverage;
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: sunDir },
      uCentre: { value: new THREE.Vector3(0, -R_EARTH_KM, 0) },
      uLit: { value: new THREE.Color(pal.cloudLit) },
      uShade: { value: new THREE.Color(pal.cloudShade) },
      uWarm: { value: new THREE.Color(pal.sun) },
      uThr: { value: thr },
      uDeckAlt: { value: c.deckAltKm },
      uCamAlt: { value: 0 },
      uSeed: { value: c.cloudSeed * 7.31 },
      uType: { value: c.cloudType },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir; uniform vec3 uCentre; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uWarm;
      uniform float uThr; uniform float uDeckAlt; uniform float uCamAlt; uniform float uSeed; uniform float uType;
      varying vec3 vW;
      ${NOISE_GLSL}
      // 0..1 cloud density: a regional mix of stretched stratus sheets and puffy cumulus clusters
      float density(vec3 q, int oct) {
        float regime = fbm(q * 0.011, 3);
        float cu = smoothstep(0.36, 0.64, regime + (uType - 0.5) * 0.5);
        vec3 qs = q * vec3(0.022, 0.04, 0.085);
        float st = fbm(qs + fbm(qs * 2.0, 2) * 0.8, oct);
        float cl = fbm(q * 0.03, 3);
        float bil = 1.0 - abs(2.0 * fbm(q * 0.14 + cl * 2.5, oct) - 1.0);
        float cumulus = clamp(cl * 0.75 + bil * 0.5 - 0.12, 0.0, 1.0);
        return mix(st, cumulus, cu);
      }
      void main() {
        vec3 q = vW + vec3(uSeed * 13.0, uSeed * 5.0, uSeed * 9.0);
        float n = density(q, ${lite ? 3 : 5});
        float cov = smoothstep(uThr, uThr + 0.3, n);
        float above = step(uDeckAlt, uCamAlt);
        // seen from below, a fragment with no cloud draws nothing: skip the shading
        if (above < 0.5 && cov < 0.004) discard;
        vec3 nrm = normalize(vW - uCentre);
        float ndl = dot(nrm, normalize(uSunDir));
        float day = smoothstep(-0.12, 0.3, ndl);
        // self-shadow: density a step toward the sun gives billows a lit and a shaded flank;
        // only the top of the deck is lit, so from below it is not computed
        float relief = 0.55;
        if (above > 0.5) {
          vec3 st = normalize(uSunDir - nrm * dot(nrm, uSunDir));
          float nS = density(q + st * 0.5, ${lite ? 2 : 3});
          relief = clamp(0.55 + (n - nS) * 3.0, 0.0, 1.0);
        }
        vec3 top = mix(uShade, uLit, relief * day + (1.0 - day) * 0.1);
        top = mix(top, uShade, smoothstep(uThr + 0.25, uThr + 0.55, n) * 0.25);
        top = mix(top, uWarm, (1.0 - smoothstep(0.0, 0.35, abs(ndl + 0.04))) * 0.35 * day);
        vec3 under = mix(uShade * 0.55, uLit * 0.55, day * 0.6 + 0.1);
        vec3 cloudCol = mix(under, top, above);
        float dist = length(vW - cameraPosition);
        float graze = smoothstep(0.03, 0.22, abs(dot(normalize(cameraPosition - vW), nrm)));
        float fadeNear = smoothstep(0.15, 2.0, dist) * graze;
        float cloudA = cov * fadeNear * mix(0.92, 1.0, above);
        // a pale veil between the clouds from altitude: lifts the deep ocean blue
        float veilA = 0.24 * above * smoothstep(5.0, 45.0, uCamAlt) * graze;
        vec3 veilCol = mix(uShade, uLit, day * 0.7) * 0.9;
        float a = cloudA + veilA * (1.0 - cloudA);
        vec3 col = (cloudCol * cloudA + veilCol * veilA * (1.0 - cloudA)) / max(a, 0.001);
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }
    `,
  });
  const cloudDeck = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM + c.deckAltKm, lite ? 128 : 256, lite ? 64 : 128),
    cloudMat,
  );
  cloudDeck.position.set(0, -R_EARTH_KM, 0);
  cloudDeck.renderOrder = 2;
  scene.add(cloudDeck);
  owned.push(cloudDeck);
  disposables.push(cloudMat, cloudDeck.geometry);

  // ── Pad: a lattice tower, a grainy ground overlay that breaks up the stretched photo ─
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x8a8e98,
    roughness: 0.8,
    metalness: 0.2,
  });
  const tower = buildPadTower(vehLen, towerMat);
  tower.position.set(vehLen * 0.34, 0, 0);
  scene.add(tower);
  owned.push(tower);
  disposables.push(towerMat);

  const lvl = pal.groundEmissive;
  const grainMat = new THREE.ShaderMaterial({
    uniforms: {
      uCamAlt: { value: 0 },
      uDark: { value: new THREE.Color(0x14210f).multiplyScalar(0.4 + lvl) },
      uLight: {
        value: new THREE.Color(0x6b7a4c)
          .multiplyScalar(lvl)
          .lerp(new THREE.Color(pal.groundTint), 0.15),
      },
    },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform float uCamAlt; uniform vec3 uDark; uniform vec3 uLight;
      varying vec3 vW;
      ${NOISE_GLSL}
      void main() {
        vec3 p = vec3(vW.x, 0.0, vW.z);
        float d = fbm(p * 3.0, 4) * 0.55 + fbm(p * 22.0, 3) * 0.45;
        float r = length(vW.xz);
        float a = 0.55 * (1.0 - smoothstep(6.0, 18.0, uCamAlt)) * (1.0 - smoothstep(14.0, 30.0, r));
        gl_FragColor = vec4(mix(uDark, uLight, smoothstep(0.3, 0.7, d)), a);
      }
    `,
  });
  const grain = new THREE.Mesh(new THREE.PlaneGeometry(64, 64).rotateX(-Math.PI / 2), grainMat);
  grain.position.y = 0.004;
  grain.renderOrder = 1;
  scene.add(grain);
  owned.push(grain);
  disposables.push(grainMat, grain.geometry);

  // ── Plume glow: a halo at the pad and a pool of light on the ground, lighting the smoke ──
  const glowTex = softGlowTexture();
  disposables.push(glowTex);
  const glowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffa050,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(glowSprite);
  owned.push(glowSprite);
  disposables.push(glowSprite.material);
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xff9a40,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat);
  pool.position.y = 0.01;
  pool.scale.setScalar(vehLen * 4.2);
  scene.add(pool);
  owned.push(pool);
  disposables.push(poolMat, pool.geometry);

  // ── Pad smoke: sprites rolling out sideways, every position a pure function of the mission time ──
  const N = c.padSmoke ? (lite ? 70 : 200) : 0;
  const puffTex = puffTexture();
  disposables.push(puffTex);
  const puffs: { sp: THREE.Sprite; ang: number; spd: number; lift: number; size: number }[] = [];
  const hash = (i: number, k: number): number => {
    const x = Math.sin(i * 127.1 + k * 311.7 + c.cloudSeed * 0.13) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < N; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }),
    );
    sp.visible = false;
    scene.add(sp);
    owned.push(sp);
    disposables.push(sp.material);
    // the flame trenches throw most of it out along the pad's sides (+/- z), some everywhere
    const side = hash(i, 5) < 0.5 ? 1 : -1;
    // along x, so a camera on the z side sees it roll out to its left and right
    const ang =
      hash(i, 6) < 0.75
        ? (side > 0 ? 0 : Math.PI) + (hash(i, 1) - 0.5) * 0.9
        : hash(i, 1) * Math.PI * 2;
    puffs.push({
      sp,
      ang,
      spd: 0.45 + hash(i, 2),
      lift: hash(i, 3),
      size: 0.9 + hash(i, 4) * 0.8,
    });
  }
  const smokeBase = new THREE.Color(pal.cloudShade).lerp(new THREE.Color(pal.cloudLit), 0.35);
  const flameWarm = new THREE.Color(0xffa040);
  const tmp = new THREE.Color();

  // ── Warm light from the plume on the stack, the tower and the smoke ─────
  const flameA = new THREE.PointLight(0xffa860, 0, vehLen * 12, 1.4);
  const flameB = new THREE.PointLight(0xffa860, 0, vehLen * 12, 1.4);
  scene.add(flameA, flameB);
  owned.push(flameA, flameB);

  const key = new THREE.DirectionalLight(pal.keyColor, pal.keyIntensity * Math.PI);
  scene.add(key);
  owned.push(key);
  const camDir = new THREE.Vector3();

  // The scene's separation burst throws round debris flecks; with the camera this close they
  // read as grey dots floating round the vehicle, so they are drawn small and faint here.
  const flecks: THREE.PointsMaterial[] = [];
  scene.traverse((o) => {
    if (o instanceof SeparationBurst)
      o.children.forEach((ch) => {
        if (ch instanceof THREE.Points) flecks.push(ch.material as THREE.PointsMaterial);
      });
  });

  const skyGround = new THREE.Color(pal.ground);
  const SPACE = new THREE.Color(0x03040a);

  return {
    update(s, camera) {
      for (const m of flecks) {
        m.size *= 0.3;
        m.opacity *= 0.35;
      }
      camera.getWorldDirection(camDir);
      key.position
        .copy(camDir)
        .multiplyScalar(-1000)
        .add(new THREE.Vector3(0, 600, 0));
      const camAlt = camera.position.y;
      skyMat.uniforms.uAlt.value = s.altKm;
      cloudMat.uniforms.uCamAlt.value = camAlt;
      atmoMat.uniforms.uCamAlt.value = camAlt;
      grainMat.uniforms.uCamAlt.value = camAlt;
      if (lightsMat) lightsMat.uniforms.uCamAlt.value = camAlt;
      // The scene writes its own sky colour each frame; override with this launch's.
      const skyT = Math.min(1, Math.pow(s.altKm / 70, 0.65));
      (scene.background as THREE.Color).copy(skyGround).lerp(SPACE, skyT);

      const t = s.t;
      const lit = s.thrustN > 0 ? 1 : 0;
      const nearPad = 1 - smoothstep01((s.altKm - 0.2) / 2.2);
      const boost = 0.55 + pal.flameLight * 0.6;
      glowSprite.visible = lit * nearPad > 0.01;
      // The plume's own glow (not a sunset): centred on the engines, so it lights the base and
      // the smoke instead of a dome over the pad. Before ignition (thrust 0) it is off.
      glowSprite.position.set(s.downrangeKm, s.altKm - vehLen * 0.1, 0);
      glowSprite.scale.setScalar(vehLen * 2.2);
      (glowSprite.material as THREE.SpriteMaterial).opacity = 0.8 * lit * nearPad * boost;
      pool.visible = glowSprite.visible;
      poolMat.opacity = 0.9 * lit * nearPad * boost;

      puffs.forEach((p, i) => {
        const age = t - (-3 + i * 0.12);
        if (age < 0 || age > 34) {
          p.sp.visible = false;
          return;
        }
        const dist = vehLen * (0.12 + 1.7 * (1 - Math.exp(-age / 6))) * (0.45 + p.spd * 0.6);
        p.sp.visible = true;
        const size = vehLen * p.size * (0.4 + 0.03 * Math.min(age, 12));
        p.sp.position.set(
          Math.cos(p.ang) * dist,
          size * 0.35 +
            vehLen * (0.03 + 0.03 * Math.sqrt(age) + 0.1 * p.lift * (1 - Math.exp(-age / 4))),
          Math.sin(p.ang) * dist * 0.55,
        );
        p.sp.scale.setScalar(size);
        const m = p.sp.material as THREE.SpriteMaterial;
        // fade with age, and where a puff would swallow the camera
        const nearCam = smoothstep01(
          (p.sp.position.distanceTo(camera.position) - vehLen * 0.5) / vehLen,
        );
        m.opacity = 0.85 * nearCam * smoothstep01(age / 0.7) * (1 - smoothstep01((age - 9) / 14));
        // lit from below by the plume while the engines burn near the pad
        const glow =
          Math.exp(-dist / (vehLen * 0.9)) * lit * nearPad * (1 - smoothstep01(age / 14));
        tmp.copy(smokeBase).lerp(flameWarm, Math.min(1, glow * boost * 1.4));
        m.color.copy(tmp).multiplyScalar(0.5 + 0.6 * pal.groundEmissive + glow * 0.5);
      });

      // mid-stack and well out to the sides: a low light makes a hot spot on the ground photo
      const k = pal.flameLight * lit * 20 * (1 - Math.min(1, s.altKm / 90));
      flameA.intensity = k;
      flameB.intensity = k;
      flameA.position.set(s.downrangeKm, s.altKm + vehLen * 0.7, vehLen * 1.15);
      flameB.position.set(s.downrangeKm, s.altKm + vehLen * 0.7, -vehLen * 1.15);
    },
    dispose() {
      for (const o of owned) scene.remove(o);
      for (const d of disposables) d.dispose();
    },
  };
}

function smoothstep01(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}
