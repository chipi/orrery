import * as THREE from 'three';

/**
 * `/fly` cislunar mission-overlay builders (RFC-036 WS-B/B3 · #441).
 *
 * The pure, self-contained factory functions extracted verbatim from the inline
 * cislunar block in `src/routes/fly/+page.svelte`'s `onMount` (B0 map region (c),
 * lines ~2799–3017). These build the mission-overlay layer that sits ON TOP of the
 * static cislunar scene (`buildCislunarScene` owns the Earth/Moon meshes + SoI
 * rings): the star field, the per-phase trajectory-line shader, the spacecraft
 * glyph, and the ∆v annotation sprites.
 *
 * B3 scope = the genuinely-pure builders only (no reactive closure, no shared
 * scene-graph state, no per-frame mutation) — the cislunar counterpart of
 * fly-helio-overlays (B2a). Each is a plain function over THREE, unit-testable in
 * jsdom (fly-cislunar-overlays.test.ts). The reactive-coupled pieces
 * (`ensureCislunarPhaseLine` over the phase-line Map + moon-frame group,
 * `rebuildCislunarAnnotations` over the live trajectory/mission, the layer
 * listeners, and the per-frame updaters) stay in the page and move with the frame
 * loop in B4. Byte-identical to the inline code: same geometry, shader, canvas
 * drawing, magic numbers.
 */

/** Per-phase trajectory-line colours (parking, TLI coast, lunar orbit, …). */
export const CISLUNAR_PHASE_COLORS: Record<string, number> = {
  parking: 0x4b9cd3,
  tli_coast: 0xffd166,
  lunar_orbit: 0xc77dff,
  lunar_flyby: 0xff9933,
  descent: 0xef476f,
  ascent: 0xef476f,
  tei_coast: 0x06d6a0,
  reentry: 0xef476f,
  spiral_earth: 0x4b9cd3,
  spiral_lunar: 0xc77dff,
};

/** Phase types whose points are stored Moon-relative and ride the moon-frame
 *  group (orbit / spiral / flyby / descent / ascent), vs. Earth-frame phases. */
export const LUNAR_LOCAL_PHASE_TYPES = new Set<string>([
  'lunar_orbit',
  'spiral_lunar',
  'lunar_flyby',
  'descent',
  'ascent',
]);

/**
 * Build the sparse cislunar star field (1500 points on a 200–300u shell,
 * non-attenuating so they stay pin-sharp at any zoom). Pushed further out than the
 * helio field. The caller adds the returned Points to the cislunar scene.
 */
export function buildCislunarStarField(): THREE.Points {
  const CIS_STAR_COUNT = 1500;
  const arr = new Float32Array(CIS_STAR_COUNT * 3);
  for (let i = 0; i < CIS_STAR_COUNT; i++) {
    const rs = 200 + Math.random() * 100;
    const ts = Math.random() * Math.PI * 2;
    const ps = Math.acos(2 * Math.random() - 1);
    arr[i * 3] = rs * Math.sin(ps) * Math.cos(ts);
    arr[i * 3 + 1] = rs * Math.sin(ps) * Math.sin(ts);
    arr[i * 3 + 2] = rs * Math.cos(ps);
  }
  const gs = new THREE.BufferGeometry();
  gs.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return new THREE.Points(
    gs,
    new THREE.PointsMaterial({
      color: 0xdde4ff,
      size: 0.7,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.6,
    }),
  );
}

/**
 * v0.6.3 #228b: cislunar trajectory lines get the same shader-gradient treatment
 * as the helio tubes — per-vertex `aT`, `uProgress` driven per-frame from met_days,
 * fragment paints bright (visited) ahead of the boundary, dim (preview) behind, the
 * boundary landing at the spacecraft sprite by construction. (Same shape as helio
 * `buildTubeMaterial` but with the cislunar hardcoded 0.95/0.22 opacities.)
 */
export function buildCislunarLineMaterial(colorHex: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uBrightOpacity: { value: 0.95 },
      uDimOpacity: { value: 0.22 },
    },
    vertexShader: `
          attribute float aT;
          varying float vT;
          void main() {
            vT = aT;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
    fragmentShader: `
          uniform float uProgress;
          uniform vec3 uColor;
          uniform float uBrightOpacity;
          uniform float uDimOpacity;
          varying float vT;
          void main() {
            // Past-vs-future split — see helio buildTubeMaterial for
            // the rationale. Past at full uColor, future at 30%-mixed
            // dim. Same alpha-discard gate keeps depth-test correct.
            bool past = vT < uProgress;
            vec3 dimColor = uColor * 0.28;
            vec3 finalColor = past ? uColor : dimColor;
            float a = past ? uBrightOpacity : uDimOpacity;
            if (a < 0.05) discard;
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
    transparent: false,
    depthWrite: true,
  });
}

/** Handle for the cislunar spacecraft glyph sprite. */
export interface CislunarSpacecraftSprite {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
}

/**
 * Build the cislunar spacecraft marker: a red filled disc + soft halo drawn into a
 * 64px canvas → CanvasTexture → Sprite (constant on-screen size regardless of
 * cislunar camera zoom; `depthTest:false` so it never hides behind its own trail).
 * The caller sets the per-frame scale (proportional to camR) and adds it to the
 * scene.
 */
export function buildCislunarSpacecraftSprite(): CislunarSpacecraftSprite {
  const CIS_GLYPH_PX = 64;
  const cisScCanvas = document.createElement('canvas');
  cisScCanvas.width = CIS_GLYPH_PX;
  cisScCanvas.height = CIS_GLYPH_PX;
  {
    const tctx = cisScCanvas.getContext('2d')!;
    tctx.clearRect(0, 0, CIS_GLYPH_PX, CIS_GLYPH_PX);
    const cx = CIS_GLYPH_PX / 2;
    const cy = CIS_GLYPH_PX / 2;
    const glow = tctx.createRadialGradient(cx, cy, 4, cx, cy, CIS_GLYPH_PX / 2);
    glow.addColorStop(0, 'rgba(255,58,76,0.4)');
    glow.addColorStop(1, 'rgba(255,58,76,0)');
    tctx.fillStyle = glow;
    tctx.fillRect(0, 0, CIS_GLYPH_PX, CIS_GLYPH_PX);
    tctx.beginPath();
    tctx.arc(cx, cy, CIS_GLYPH_PX * 0.22, 0, Math.PI * 2);
    tctx.fillStyle = 'rgba(20,8,12,0.9)';
    tctx.fill();
    tctx.beginPath();
    tctx.arc(cx, cy, CIS_GLYPH_PX * 0.18, 0, Math.PI * 2);
    tctx.fillStyle = '#ff3a4c';
    tctx.shadowColor = 'rgba(255,58,76,0.8)';
    tctx.shadowBlur = 4;
    tctx.fill();
    const innerGlow = tctx.createRadialGradient(
      cx - CIS_GLYPH_PX * 0.05,
      cy - CIS_GLYPH_PX * 0.05,
      0,
      cx,
      cy,
      CIS_GLYPH_PX * 0.18,
    );
    innerGlow.addColorStop(0, 'rgba(255,200,200,0.7)');
    innerGlow.addColorStop(1, 'rgba(255,200,200,0)');
    tctx.shadowBlur = 0;
    tctx.fillStyle = innerGlow;
    tctx.beginPath();
    tctx.arc(cx, cy, CIS_GLYPH_PX * 0.18, 0, Math.PI * 2);
    tctx.fill();
  }
  const cisScTex = new THREE.CanvasTexture(cisScCanvas);
  cisScTex.minFilter = THREE.LinearFilter;
  cisScTex.magFilter = THREE.LinearFilter;
  const cislunarSpacecraft = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: cisScTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }),
  );
  cislunarSpacecraft.scale.set(1, 1, 1);
  cislunarSpacecraft.renderOrder = 999;
  return { sprite: cislunarSpacecraft, texture: cisScTex, canvas: cisScCanvas };
}

/**
 * Build one phase-boundary ∆v annotation sprite (ADR-058 Stage 3): a two-line label
 * (line1 = burn name in the accent colour, line2 = ∆v/altitude) drawn into a 256×96
 * canvas → Sprite scaled to 8×3 units. The caller positions it + toggles visibility
 * with the Science Lens.
 */
export function buildAnnotationSprite(
  line1: string,
  line2: string,
  accentHex: string,
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx2 = canvas.getContext('2d');
  if (ctx2) {
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    ctx2.shadowColor = 'rgba(0,0,0,0.9)';
    ctx2.shadowBlur = 6;
    ctx2.fillStyle = accentHex;
    ctx2.font = "bold 22px 'Space Mono', monospace";
    ctx2.textAlign = 'center';
    ctx2.fillText(line1, canvas.width / 2, 36);
    ctx2.fillStyle = '#e6ecff';
    ctx2.font = "18px 'Space Mono', monospace";
    ctx2.fillText(line2, canvas.width / 2, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: false }),
  );
  sprite.scale.set(8, 3, 1);
  return sprite;
}
