/**
 * Launch conditions rig (G3 review prototype, dev-only): a seeded sky, sun, cloud deck
 * and pad smoke laid over the existing ascent scene, all procedural (shader noise and
 * canvas-drawn sprites; no image asset). The director picks the conditions
 * (ascent-director.ts `pickConditions`); this paints them.
 *
 * It decorates a scene built by createAscentScene without changing that file: it finds
 * the scene's own sun, ambient light, sky dome and sun disc, retunes or hides them, and
 * adds its own. Call `update` after each `setState` (the scene resets the background
 * every frame).
 */

import * as THREE from 'three';
import type { LaunchConditions, LightId } from '$lib/orbital/ascent-director';
import type { AscentState } from '$lib/physics/ascent/ascent-physics';
import type { AscentScene } from './ascent-scene';

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
  /** Pad satellite photo brightness (it is emissive in the scene). */
  groundEmissive: number;
  /** The plume lights the pad and stack (0 = no, 1 = fully). */
  flameLight: number;
  rim: number;
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
    flameLight: 0,
    rim: 0x8ec5ff,
  },
  golden: {
    horizon: 0xf2a85e,
    zenith: 0x3a5f9e,
    ground: 0x4d4f78,
    sun: 0xffb25c,
    sunIntensity: 1.25,
    ambient: 0xffd8b0,
    ambientIntensity: 0.22,
    cloudLit: 0xffd2a0,
    cloudShade: 0x6a5a80,
    glow: 1.0,
    groundEmissive: 0.65,
    flameLight: 0.35,
    rim: 0xffb070,
  },
  dusk: {
    horizon: 0xd8764f,
    zenith: 0x1c2858,
    ground: 0x2a2748,
    sun: 0xff8048,
    sunIntensity: 1.0,
    ambient: 0x6a78b0,
    ambientIntensity: 0.2,
    cloudLit: 0xff9a68,
    cloudShade: 0x2a3050,
    glow: 1.25,
    groundEmissive: 0.22,
    flameLight: 1,
    rim: 0xff8a5a,
  },
  night: {
    horizon: 0x16213d,
    zenith: 0x040612,
    ground: 0x070a18,
    sun: 0xa8bcff,
    sunIntensity: 0.55,
    ambient: 0x3a4a86,
    ambientIntensity: 0.16,
    cloudLit: 0x6f82b8,
    cloudShade: 0x151c34,
    glow: 0.25,
    groundEmissive: 0.07,
    flameLight: 1,
    rim: 0x4a63b0,
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
  for (let i = 0; i < 9; i++) {
    const x = size * (0.3 + rnd() * 0.4);
    const y = size * (0.3 + rnd() * 0.4);
    const r = size * (0.16 + rnd() * 0.14);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
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

export function attachLaunchConditions(
  asc: AscentScene,
  c: LaunchConditions,
  vehLen: number,
): ConditionsRig {
  const pal = PALETTES[c.light];
  const scene = asc.scene;
  const sunDir = sunVector(c);
  const owned: THREE.Object3D[] = [];
  const disposables: { dispose(): void }[] = [];

  // ── Retune the scene's own lights and neutralise its sky and sun ───────
  const found: { rim: THREE.Mesh | null } = { rim: null };
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
      const params = (o.geometry as THREE.SphereGeometry).parameters as
        { radius?: number } | undefined;
      if (params?.radius === R_EARTH_KM + 55) found.rim = o;
      if (mat instanceof THREE.MeshStandardMaterial && mat.emissiveMap) groundMats.push(mat);
    } else if (o instanceof THREE.Group && Math.abs(o.position.length() - 60_000) < 1) {
      o.visible = false; // the scene's sun disc, replaced below
    }
  });
  if (found.rim) {
    const rimMat = found.rim.material as THREE.MeshBasicMaterial;
    rimMat.color.setHex(pal.rim);
    if (c.light !== 'midday') rimMat.opacity = 0.06;
  }
  for (const m of groundMats) m.emissiveIntensity = pal.groundEmissive;

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

  // ── Sun (or moon): a core and a wide halo, additive, visible from altitude ──
  const haloTex = radialTexture(0);
  const coreTex = radialTexture(1);
  const mkSun = (tex: THREE.Texture, scale: number, opacity: number): THREE.Sprite => {
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
    return sp;
  };
  mkSun(haloTex, 14_000, 0.28 * Math.min(1.3, pal.glow));
  mkSun(coreTex, 5_500, 0.95);
  disposables.push(haloTex, coreTex);

  // ── Cloud deck: one shell of procedural noise ───────────────────────────
  const thr = 0.78 - 0.58 * c.coverage;
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
      uniform float uThr; uniform float uDeckAlt; uniform float uCamAlt; uniform float uSeed;
      varying vec3 vW;
      ${NOISE_GLSL}
      void main() {
        vec3 p = vW * 0.07 + vec3(uSeed, uSeed * 0.37, uSeed * 0.71);
        vec3 w = vec3(fbm(p * 0.55, 3), fbm(p * 0.55 + 17.0, 3), fbm(p * 0.55 + 31.0, 3));
        float n = fbm(p + (w - 0.5) * 1.6, 5);
        float cov = smoothstep(uThr, uThr + 0.2, n);
        if (cov < 0.01) discard;
        vec3 nrm = normalize(vW - uCentre);
        float ndl = dot(nrm, normalize(uSunDir));
        float day = smoothstep(-0.12, 0.3, ndl);
        // self-shadow: density a step toward the sun, so billows have a lit and a shaded flank
        vec3 st = normalize(uSunDir - nrm * dot(nrm, uSunDir));
        float nS = fbm(p + st * 0.35 + (w - 0.5) * 1.6, 3);
        float relief = clamp(0.55 + (n - nS) * 3.2, 0.0, 1.0);
        float above = step(uDeckAlt, uCamAlt);
        vec3 top = mix(uShade, uLit, relief * day + (1.0 - day) * 0.08);
        top = mix(top, uWarm, (1.0 - smoothstep(0.0, 0.35, abs(ndl + 0.04))) * 0.35 * day);
        vec3 under = mix(uShade * 0.55, uLit * 0.55, day * 0.6 + 0.1);
        vec3 col = mix(under, top, above);
        float dist = length(vW - cameraPosition);
        float graze = smoothstep(0.03, 0.22, abs(dot(normalize(cameraPosition - vW), nrm)));
        float a = cov * smoothstep(0.15, 2.0, dist) * graze;
        a *= mix(0.92, 1.0, above);
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }
    `,
  });
  const cloudDeck = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM + c.deckAltKm, 256, 128),
    cloudMat,
  );
  cloudDeck.position.set(0, -R_EARTH_KM, 0);
  cloudDeck.renderOrder = 2;
  scene.add(cloudDeck);
  owned.push(cloudDeck);
  disposables.push(cloudMat, cloudDeck.geometry);

  // ── Pad smoke: sprites, every position a pure function of the mission time ──
  const N = c.padSmoke ? 110 : 0;
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
    puffs.push({
      sp,
      ang: hash(i, 1) * Math.PI * 2,
      spd: 0.5 + hash(i, 2),
      lift: hash(i, 3),
      size: 0.8 + hash(i, 4) * 0.7,
    });
  }
  const smokeBase = new THREE.Color(pal.cloudLit).lerp(new THREE.Color(pal.cloudShade), 0.25);
  const flameWarm = new THREE.Color(0xffa04a);
  const tmp = new THREE.Color();

  // ── A warm light from the plume for low-light launches ──────────────────
  const flameA = new THREE.PointLight(0xffa860, 0, vehLen * 9, 1.6);
  const flameB = new THREE.PointLight(0xffa860, 0, vehLen * 9, 1.6);
  scene.add(flameA, flameB);
  owned.push(flameA, flameB);

  const skyGround = new THREE.Color(pal.ground);
  const SPACE = new THREE.Color(0x03040a);

  return {
    update(s, camera) {
      skyMat.uniforms.uAlt.value = s.altKm;
      cloudMat.uniforms.uCamAlt.value = camera.position.y;
      // The scene writes its own sky colour each frame; override with this launch's.
      const skyT = Math.min(1, Math.pow(s.altKm / 70, 0.65));
      (scene.background as THREE.Color).copy(skyGround).lerp(SPACE, skyT);

      const t = s.t;
      puffs.forEach((p, i) => {
        const age = t - (-3 + i * 0.24);
        if (age < 0 || age > 30) {
          p.sp.visible = false;
          return;
        }
        const spread = vehLen * (0.08 + 0.85 * (1 - Math.exp(-age / 5))) * (0.5 + p.spd * 0.55);
        p.sp.visible = true;
        p.sp.position.set(
          Math.cos(p.ang) * spread * 1.2,
          vehLen * (0.05 + 0.08 * Math.sqrt(age) + 0.2 * p.lift * (1 - Math.exp(-age / 3))),
          Math.sin(p.ang) * spread,
        );
        p.sp.scale.setScalar(vehLen * p.size * (0.42 + 0.1 * age));
        const m = p.sp.material as THREE.SpriteMaterial;
        m.opacity = 0.85 * smoothstep01(age / 0.7) * (1 - smoothstep01((age - 12) / 18));
        tmp.copy(flameWarm).lerp(smokeBase, smoothstep01(age / 4));
        m.color.copy(tmp).multiplyScalar(0.55 + 0.45 * pal.groundEmissive + pal.flameLight * 0.2);
      });

      const lit = s.thrustN > 0 ? 1 : 0;
      const k = pal.flameLight * lit * 14 * (1 - Math.min(1, s.altKm / 25));
      flameA.intensity = k;
      flameB.intensity = k;
      flameA.position.set(s.downrangeKm, s.altKm + vehLen * 0.05, vehLen * 0.8);
      flameB.position.set(s.downrangeKm, s.altKm + vehLen * 0.05, -vehLen * 0.8);
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
