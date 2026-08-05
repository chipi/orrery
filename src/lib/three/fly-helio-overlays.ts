import * as THREE from 'three';
import type { Vec2 } from '$lib/orbital/mission-arc';
import { SCALE_3D } from '$lib/fly-scene-constants';

/**
 * `/fly` heliocentric mission-overlay builders (RFC-036 WS-B/B2 · #441).
 *
 * The pure, self-contained factory functions extracted verbatim from the
 * ~760-line inline helio block in `src/routes/fly/+page.svelte`'s `onMount`
 * (B0 map region (b), lines 3219–3980). These build the mission-overlay layer
 * that sits ON TOP of the static helio scene (`buildHelioScene` owns the sun /
 * planets / orbit rings): the trajectory tubes, the spacecraft glyph, the engine
 * plume, and the LAUNCH/ARRIVAL/RETURN label sprites.
 *
 * B2a scope = the genuinely-pure builders only (no reactive closure, no scene
 * membership, no per-frame mutation). Each is a plain function over THREE + a few
 * imported constants, so the whole set is unit-testable in jsdom
 * (fly-helio-overlays.test.ts). The reactive-coupled overlay meshes (SoI rings,
 * gravity/velocity/centripetal arrows, apsides markers, moon mesh, anchor markers)
 * move in B2b via a live-accessor factory. Byte-identical to the inline code:
 * same geometry, same shaders, same canvas drawing, same magic numbers.
 */

/**
 * Manual trajectory-tube geometry. Cross-section `i` sits at `pts[i]`; each vertex
 * carries `aT = i/(N-1)` so the tube shader's bright/dim split lands at exactly the
 * spacecraft sprite's world position. NOT `THREE.TubeGeometry` — that arc-length-
 * resamples the curve, which disagrees with `lerpPoint` at uniform true-anomaly for
 * Kepler ellipses (the v0.6.2 sprite-vs-tube-tip gap). Returns empty geometry for
 * `<2` points. (Extracted verbatim; see the #228 rationale block in the page.)
 */
export function buildTubeGeometry(pts: Vec2[], radius: number): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  if (pts.length < 2) return geom;
  const radialSegs = 8;
  const ringCount = pts.length;
  const vertsPerRing = radialSegs + 1; // duplicate at theta=0/2π for UV seam
  const totalVerts = ringCount * vertsPerRing;
  const positions = new Float32Array(totalVerts * 3);
  const aTArr = new Float32Array(totalVerts);
  for (let i = 0; i < ringCount; i++) {
    const p = pts[i];
    // Tangent computation uses the XZ projection (the arc's dominant plane for
    // cross-section orientation). Y component is included in the point's world
    // position so multi-waypoint splines that climb out of the ecliptic (Cassini →
    // Jupiter → Saturn, Voyager → Neptune) render with the right vertical shape; the
    // cross-section ring still sits flat to XZ.
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(ringCount - 1, i + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const tLen = Math.hypot(tx, tz) || 1;
    // Side vector = tangent rotated 90° in XZ.
    const sNx = -tz / tLen;
    const sNz = tx / tLen;
    const py = (p.y ?? 0) * SCALE_3D;
    const t = i / (ringCount - 1);
    for (let r = 0; r <= radialSegs; r++) {
      const theta = (r / radialSegs) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const idx = i * vertsPerRing + r;
      positions[idx * 3 + 0] = p.x * SCALE_3D + radius * sinT * sNx;
      positions[idx * 3 + 1] = py + radius * cosT;
      positions[idx * 3 + 2] = p.z * SCALE_3D + radius * sinT * sNz;
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
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  geom.setIndex(indices);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aT', new THREE.BufferAttribute(aTArr, 1));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Gradient tube ShaderMaterial. `vT < uProgress` → bright (visited), else a
 * 28%-mixed dim version of the same hue (preview). Fragment interpolation of `vT`
 * puts the bright/dim boundary at exactly the sprite's world position. Opaque-pass
 * (alpha=1) so depth-test hides segments behind planet bodies during flyby (#85).
 */
export function buildTubeMaterial(
  colorHex: number,
  brightOpacity: number,
  dimOpacity: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uBrightOpacity: { value: brightOpacity },
      uDimOpacity: { value: dimOpacity },
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
            // Past-vs-future split — past segments render at full
            // uColor, future segments at a 30%-mixed dim version of
            // the same hue so the trajectory clearly reads "what's
            // behind us is bright, what's ahead is faded preview."
            // Opaque-pass with alpha=1 (and a no-op uBrightOpacity/
            // uDimOpacity kept for back-compat with the prior shader
            // contract) so depth-test still hides line segments
            // behind planet bodies during flyby (#85).
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

/** Handle for the camera-facing spacecraft glyph sprite. */
export interface SpacecraftSprite {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
}

/**
 * Build the small camera-facing spacecraft sprite glyph: a red rounded body + two
 * gold solar-panel wings + a white antenna stub inside a soft red glow halo, drawn
 * once into a 64px canvas → CanvasTexture → Sprite. Face-camera billboard (no
 * orbital rotation math), `depthTest:false` so it always renders over the arc tube.
 * The caller sets position/visibility per frame and adds it to the scene.
 */
export function buildSpacecraftSprite(): SpacecraftSprite {
  const SC_GLYPH_PX = 64;
  const SC_COLOR_BODY = '#ff3a4c';
  const SC_COLOR_PANEL = '#ffc850';
  const scTexCanvas = document.createElement('canvas');
  scTexCanvas.width = SC_GLYPH_PX;
  scTexCanvas.height = SC_GLYPH_PX;
  {
    const tctx = scTexCanvas.getContext('2d')!;
    tctx.clearRect(0, 0, SC_GLYPH_PX, SC_GLYPH_PX);
    const cx = SC_GLYPH_PX / 2;
    const cy = SC_GLYPH_PX / 2;

    // Soft glow halo for visibility against bright trajectory tubes.
    const glow = tctx.createRadialGradient(cx, cy, 4, cx, cy, SC_GLYPH_PX / 2);
    glow.addColorStop(0, 'rgba(255,90,90,0.42)');
    glow.addColorStop(1, 'rgba(255,90,90,0)');
    tctx.fillStyle = glow;
    tctx.fillRect(0, 0, SC_GLYPH_PX, SC_GLYPH_PX);

    // Geometry — proportions match the SVG mock (viewBox 40×32).
    // body: 12×14 centered on (cx,cy)
    // panels: 10×10 squares flanking the body, gap 2u
    // antenna: vertical stub above the body
    const bodyW = SC_GLYPH_PX * 0.3;
    const bodyH = SC_GLYPH_PX * 0.35;
    const panelW = SC_GLYPH_PX * 0.25;
    const panelH = SC_GLYPH_PX * 0.25;
    const gap = SC_GLYPH_PX * 0.05;
    const bodyX = cx - bodyW / 2;
    const bodyY = cy - bodyH / 2;
    const lPanelX = bodyX - gap - panelW;
    const rPanelX = bodyX + bodyW + gap;
    const panelY = cy - panelH / 2;

    // Solar panels — filled gold, outlined white, with a center spar
    // line that reads as the panel join.
    function drawPanel(px: number) {
      tctx.fillStyle = SC_COLOR_PANEL;
      tctx.globalAlpha = 0.85;
      tctx.fillRect(px, panelY, panelW, panelH);
      tctx.globalAlpha = 1;
      tctx.strokeStyle = 'rgba(255,255,255,0.85)';
      tctx.lineWidth = 1;
      tctx.strokeRect(px + 0.5, panelY + 0.5, panelW - 1, panelH - 1);
      tctx.beginPath();
      tctx.moveTo(px + panelW / 2, panelY + 1);
      tctx.lineTo(px + panelW / 2, panelY + panelH - 1);
      tctx.strokeStyle = 'rgba(255,255,255,0.55)';
      tctx.stroke();
    }
    drawPanel(lPanelX);
    drawPanel(rPanelX);

    // Antenna stub above the body — thin line + tiny disc tip.
    const antTopY = bodyY - SC_GLYPH_PX * 0.1;
    tctx.beginPath();
    tctx.moveTo(cx, bodyY);
    tctx.lineTo(cx, antTopY);
    tctx.strokeStyle = 'rgba(255,255,255,0.9)';
    tctx.lineWidth = 1.4;
    tctx.stroke();
    tctx.beginPath();
    tctx.arc(cx, antTopY, SC_GLYPH_PX * 0.025, 0, Math.PI * 2);
    tctx.fillStyle = '#fff';
    tctx.fill();

    // Central body — red rounded rectangle with a thin white outline.
    // The red core preserves the "I am the spacecraft" visibility the
    // old circle provided.
    const r = 3;
    tctx.beginPath();
    tctx.moveTo(bodyX + r, bodyY);
    tctx.lineTo(bodyX + bodyW - r, bodyY);
    tctx.quadraticCurveTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + r);
    tctx.lineTo(bodyX + bodyW, bodyY + bodyH - r);
    tctx.quadraticCurveTo(bodyX + bodyW, bodyY + bodyH, bodyX + bodyW - r, bodyY + bodyH);
    tctx.lineTo(bodyX + r, bodyY + bodyH);
    tctx.quadraticCurveTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - r);
    tctx.lineTo(bodyX, bodyY + r);
    tctx.quadraticCurveTo(bodyX, bodyY, bodyX + r, bodyY);
    tctx.closePath();
    tctx.fillStyle = SC_COLOR_BODY;
    tctx.shadowColor = 'rgba(255,58,76,0.8)';
    tctx.shadowBlur = 4;
    tctx.fill();
    tctx.shadowBlur = 0;
    tctx.strokeStyle = 'rgba(255,255,255,0.85)';
    tctx.lineWidth = 1;
    tctx.stroke();

    // Small white pip at body center to read as the bus's "active"
    // indicator at very small sizes (camera far away).
    tctx.beginPath();
    tctx.arc(cx, cy, SC_GLYPH_PX * 0.035, 0, Math.PI * 2);
    tctx.fillStyle = 'rgba(255,255,255,0.95)';
    tctx.fill();
  }
  const scTex = new THREE.CanvasTexture(scTexCanvas);
  scTex.minFilter = THREE.LinearFilter;
  scTex.magFilter = THREE.LinearFilter;
  const scSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: scTex,
      transparent: true,
      depthWrite: false,
      depthTest: false, // always render on top of arc tube
    }),
  );
  scSprite.scale.set(2.5, 2.5, 1);
  scSprite.renderOrder = 999;
  return { sprite: scSprite, texture: scTex, canvas: scTexCanvas };
}

/** Handle for the directed engine-plume cone. */
export interface EnginePlume {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

/**
 * Build the directed engine-plume cone shown during burn events. Geometry tip
 * along -Z so `Object3D.lookAt` orients the tip at any world target; the shader
 * paints a base→tip orange→yellow-white gradient with squared falloff (narrow
 * tapering exhaust), additive-blended. Starts hidden; the caller drives
 * orientation/scale/opacity per burn event and adds it to the scene.
 */
export function buildEnginePlume(): EnginePlume {
  const plumeGeo = new THREE.ConeGeometry(0.35, 2.4, 16, 1, true);
  plumeGeo.rotateX(Math.PI / 2);
  plumeGeo.translate(0, 0, -1.2);
  const plumeMat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uColorBase: { value: new THREE.Color(0xffaa44) },
      uColorTip: { value: new THREE.Color(0xfff0aa) },
    },
    vertexShader: `
        varying float vAlongAxis;
        void main() {
          vAlongAxis = (-position.z) / 2.4;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
    fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColorBase;
        uniform vec3 uColorTip;
        varying float vAlongAxis;
        void main() {
          vec3 color = mix(uColorBase, uColorTip, vAlongAxis);
          float alpha = uOpacity * (1.0 - vAlongAxis * vAlongAxis);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
  plumeMesh.visible = false;
  plumeMesh.renderOrder = 998;
  return { mesh: plumeMesh, material: plumeMat };
}

/** Handle for one LAUNCH/ARRIVAL/RETURN billboard label sprite. */
export interface LabelSprite {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
}

/**
 * Redraw a two-line label texture (line1 = identity/role, line2 = date stamp) into
 * an existing sprite canvas. The caller flags `material.map.needsUpdate` after. No
 * texture allocation — the canvas is owned by the sprite from {@link buildLabelSprite}.
 */
export function drawLabelTexture(
  canvas: HTMLCanvasElement,
  line1: string,
  line2: string,
  colorHex: string,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = colorHex;
  ctx.font = "bold 28px 'Space Mono', monospace";
  ctx.fillText(line1, canvas.width / 2, canvas.height * 0.32);
  ctx.font = "20px 'Space Mono', monospace";
  ctx.fillStyle = '#e6ecff';
  ctx.fillText(line2, canvas.width / 2, canvas.height * 0.7);
}

/**
 * Build a billboard label sprite (320×96 canvas → Texture → Sprite, scaled to
 * 34×10 scene units, `depthWrite:false`). The caller draws into `.canvas` via
 * {@link drawLabelTexture} and adds `.sprite` to the scene.
 */
export function buildLabelSprite(): LabelSprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 96;
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(34, 10, 1);
  return { sprite, canvas };
}
