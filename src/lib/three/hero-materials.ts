import * as THREE from 'three';

/**
 * "Hero-level" PBR material + environment toolkit (Tier B render upgrade).
 *
 * The procedural model set historically used flat MeshPhongMaterial + a rim
 * shader — no true metalness, no reflections, no surface texture. This module
 * provides the pieces for a physically-based look: an image-based-lighting
 * environment (a neutral studio, generated procedurally so we ship NO HDRI
 * asset), PBR material factories (metal / gold-foil MLI / solar-cell / white
 * MLI), and the procedural CanvasTextures that give surfaces real detail.
 *
 * Usage: call `installHeroEnvironment(renderer, scene)` once per render scene
 * (sets scene.environment + ACES tone mapping), then build meshes with the
 * `hero*` material factories. Reflections + energy-conserving shading come for
 * free from the environment.
 */

// ── Environment (image-based lighting) ─────────────────────────────────────

let cachedEnv: THREE.Texture | null = null;

/**
 * A dramatic "deep space" IBL scene: a dark navy surround, one bright warm SUN
 * disc (the key — gives metals a crisp specular glint), a dim cool fill on the
 * opposite side (earthshine / reflected light), and a faint top light. PMREM'd
 * into an environment map. This reads far more like a NASA hero render than a
 * neutral studio: high-contrast metal highlights against near-black shadow.
 */
function buildSpaceEnvScene(): THREE.Scene {
  const s = new THREE.Scene();
  const emit = (color: number, intensity: number): THREE.MeshBasicMaterial =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) });
  // Dark surround (space) — a big inward-facing sphere, faint blue.
  const surround = new THREE.Mesh(
    new THREE.SphereGeometry(60, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x05070f, side: THREE.BackSide }),
  );
  s.add(surround);
  // SUN — small, very bright, warm. The dominant specular key.
  const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), emit(0xfff2d8, 16));
  sun.position.set(30, 18, 22);
  s.add(sun);
  // Cool fill / earthshine on the opposite side.
  const fill = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12), emit(0x3a6fbf, 0.5));
  fill.position.set(-34, -10, -18);
  s.add(fill);
  // Soft top light so upper surfaces aren't pure black.
  const top = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), emit(0x9fb0d0, 0.35));
  top.position.set(0, 45, 0);
  top.rotation.x = Math.PI / 2;
  s.add(top);
  return s;
}

/**
 * Generate + cache the PMREM environment from the deep-space scene. No external
 * HDRI file. Reused across scenes/cards — build it once per renderer.
 */
export function heroEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  if (cachedEnv) return cachedEnv;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = buildSpaceEnvScene();
  cachedEnv = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  return cachedEnv;
}

/**
 * Wire a scene for PBR: set its IBL environment + switch the renderer to ACES
 * filmic tone mapping and sRGB output (idempotent on the renderer). Call once
 * per scene that renders hero materials.
 */
export function installHeroEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.75;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.environment = heroEnvironment(renderer);
  scene.environmentIntensity = 1.9;
}

// ── Procedural textures (no asset files) ───────────────────────────────────

let solarTex: THREE.Texture | null = null;
let foilRough: THREE.Texture | null = null;

/** Deep-blue solar array with a fine cell grid + busbar lines. */
export function solarCellTexture(): THREE.Texture {
  if (solarTex) return solarTex;
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#16233f';
  ctx.fillRect(0, 0, s, s);
  const n = 12;
  const cell = s / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // brighter cells + more per-cell variation so the grid reads clearly
      const v = 0.78 + ((i * 7 + j * 13) % 6) * 0.06;
      ctx.fillStyle = `rgb(${Math.round(44 * v)},${Math.round(84 * v)},${Math.round(168 * v)})`;
      ctx.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
      // corner contact dots on each cell — a real solar-cell tell
      ctx.fillStyle = 'rgba(180,195,225,0.5)';
      ctx.fillRect(i * cell + 3, j * cell + 3, 2, 2);
    }
  }
  // dark inter-cell channels (busbars)
  ctx.strokeStyle = 'rgba(6,10,22,1)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, s);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(s, i * cell);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  solarTex = t;
  return t;
}

/** Crinkled roughness map for gold MLI foil — mottled highs/lows so the foil
 *  catches the environment unevenly instead of reading as smooth plastic. */
function foilRoughnessTexture(): THREE.Texture {
  if (foilRough) return foilRough;
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    // value-noise-ish: mix a couple of hashed frequencies. Keep the range
    // HIGH + TIGHT (semi-matte foil, ~0.5..0.72 roughness) so the gold reads
    // as crinkled thermal blanket, not a chrome mirror with a blown streak.
    const x = i % s;
    const y = (i / s) | 0;
    const h = (Math.sin(x * 0.3) + Math.sin(y * 0.37) + Math.sin((x + y) * 0.11)) / 3;
    const r = 150 + h * 30; // → roughness ~0.47..0.71
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = r;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  foilRough = t;
  return t;
}

// ── PBR material factories ─────────────────────────────────────────────────

/** Brushed / polished metal (aluminium, steel) — tight glint. */
export function heroMetal(color = 0xb8bcc2, roughness = 0.26): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 1.0, roughness });
}

/** Gold MLI thermal foil — metallic but semi-matte (crinkled roughness map)
 *  so it reads as a thermal blanket, not a chrome mirror. */
export function heroGold(color = 0xd9b45a): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.85,
    roughness: 0.62,
    roughnessMap: foilRoughnessTexture(),
  });
  return m;
}

/** Solar array panel — low metalness, the cell-grid texture, faint emissive. */
export function heroSolar(repeat = 3): THREE.MeshStandardMaterial {
  const map = solarCellTexture().clone();
  map.repeat.set(repeat, 1);
  map.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map,
    metalness: 0.35,
    roughness: 0.55,
    emissive: 0x0a1836,
    emissiveIntensity: 0.35,
  });
}

/** White MLI / painted surface. */
export function heroWhite(color = 0xf0f0ea): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.6 });
}

/** Dark carbon / RTG / engine material. */
export function heroDark(color = 0x2b2f36): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.5 });
}
