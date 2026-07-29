/**
 * Shared "rocket detail kit" for launcher-models.ts — the geometry + material +
 * livery helpers that bring every launcher up to the capsule-model fidelity bar
 * (RFC-034 §8, hero-PBR pass 2026-07-29). Ring frames, engine clusters wired to
 * the verified engine spec (launcher-engines.ts), a systems raceway, swept fins,
 * and per-agency livery CanvasTextures (flag + wordmark + roll/band pattern).
 *
 * WebGL-only (uses document CanvasTexture like hero-materials.ts) — coverage
 * excluded, runs in the ascent scene, not in jsdom tests.
 */
import * as THREE from 'three';
import { heroMetal, heroDark, heroWhite } from './hero-materials';
import type { EngineArrangement } from '$lib/orbital/launcher-engines';

// ── Materials per agency "character" ───────────────────────────────────────
// SpaceX = bare shiny stainless; NASA/most = white MLI + brushed metal frames;
// Roscosmos = grey-green; etc. Extended as the fleet rollout proceeds.
export interface LauncherPalette {
  body: THREE.MeshStandardMaterial; // stage skin (may carry a livery map)
  frame: THREE.MeshStandardMaterial; // ring frames / raceway / interstage metal
  dark: THREE.MeshStandardMaterial; // interstage / shadowed structure
  eng: THREE.MeshStandardMaterial; // engine bells
}

export function agencyPalette(agency: string): LauncherPalette {
  const a = agency.toLowerCase();
  if (a.includes('spacex')) {
    return {
      // Bare 304L stainless — brushed, so it catches the key light as bright
      // silver instead of a black mirror (roughness kept mid, not near-zero).
      body: heroMetal(0xeef1f5, 0.38),
      frame: heroMetal(0xcdd2d8, 0.34),
      dark: heroDark(0x2a2d33),
      eng: heroMetal(0x3a3f47, 0.5),
    };
  }
  return {
    body: heroWhite(0xeef1f5),
    frame: heroMetal(0xc7ccd2, 0.32),
    dark: heroDark(0x1e2127),
    eng: heroMetal(0x40454d, 0.5),
  };
}

// ── Procedural surface detail ──────────────────────────────────────────────

let stringer: THREE.Texture | null = null;
/** Fine vertical rib pattern on roughness — reads as ribbed tank skin. */
export function stringerRoughness(repeat = 80): THREE.Texture {
  if (!stringer) {
    const w = 1024,
      h = 8;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d')!;
    const img = x.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const px = i % w;
      const v = 140 + Math.sin(px * 0.8) * 40;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    stringer = new THREE.CanvasTexture(c);
  }
  const t = stringer.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, 1);
  return t;
}

/** Ring / stringer frames along a stage — n thin bands from yBot→yTop. */
export function ringFrames(
  r: number,
  yBot: number,
  yTop: number,
  n: number,
  mat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const y = yBot + (yTop - yBot) * (n === 1 ? 0.5 : i / (n - 1));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.006, r * 0.01, 6, 48), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  return g;
}

/** Vertical stringers (corrugated interstage look). */
export function vStringers(
  r: number,
  yBot: number,
  yTop: number,
  n: number,
  mat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const H = yTop - yBot;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(r * 0.03, H, r * 0.05), mat);
    rib.position.set(Math.cos(a) * r * 1.01, (yBot + yTop) / 2, Math.sin(a) * r * 1.01);
    rib.rotation.y = -a;
    g.add(rib);
  }
  return g;
}

/** Thin external systems tunnel / cable raceway running up one side. */
export function raceway(r: number, yBot: number, yTop: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.04, yTop - yBot, 6, 10), mat);
  m.position.set(r * 1.0, (yBot + yTop) / 2, r * 0.12);
  return m;
}

/** A swept trapezoidal fin (not a slab) with a leading-edge rake. */
export function sweptFin(
  r: number,
  y: number,
  height: number,
  span: number,
  angle: number,
  mat: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(span, -height * 0.15);
  shape.lineTo(span * 0.9, -height * 0.62);
  shape.lineTo(0, -height);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: r * 0.05, bevelEnabled: false });
  geo.translate(0, 0, -r * 0.025);
  const fin = new THREE.Mesh(geo, mat);
  fin.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
  fin.rotation.y = -angle + Math.PI / 2;
  return fin;
}

// ── Engine bells + clusters (wired to the verified engine spec) ─────────────

/** A detailed downward-firing engine bell: nozzle + extension skirt + throat +
 *  turbopump + a curved feed duct — reads as real engine plumbing up close. */
export function detailBell(
  bellR: number,
  bellLen: number,
  metal: THREE.Material,
  eng: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(bellR, bellR * 0.42, bellLen, 20, 1, true),
    eng,
  );
  bell.position.y = -bellLen / 2;
  g.add(bell);
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(bellR * 1.06, bellR, bellLen * 0.26, 20, 1, true),
    heroDark(0x15171b),
  );
  skirt.position.y = -bellLen * 0.9;
  g.add(skirt);
  const throat = new THREE.Mesh(
    new THREE.CylinderGeometry(bellR * 0.42, bellR * 0.34, bellLen * 0.3, 14),
    metal,
  );
  throat.position.y = bellLen * 0.12;
  g.add(throat);
  const pump = new THREE.Mesh(new THREE.SphereGeometry(bellR * 0.36, 10, 8), metal);
  pump.position.set(bellR * 0.34, bellLen * 0.28, 0);
  g.add(pump);
  const duct = new THREE.Mesh(
    new THREE.TorusGeometry(bellR * 0.5, bellR * 0.08, 6, 12, Math.PI * 0.7),
    metal,
  );
  duct.position.y = bellLen * 0.05;
  duct.rotation.set(Math.PI / 2, 0, 0.6);
  g.add(duct);
  return g;
}

/** `n` nozzle positions evenly spaced on a ring of radius `r` (bell-radius units). */
function ring(n: number, r: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
}

/**
 * Nozzle positions (in bell-radius units) for a given arrangement + exact
 * `count`. `count` is authoritative from the verified engine spec, so ring
 * layouts render exactly that many nozzles.
 */
function clusterOffsets(arrangement: EngineArrangement, count: number): [number, number][] {
  switch (arrangement) {
    case 'single':
      return [[0, 0]];
    case 'pair':
      return [
        [-1.15, 0],
        [1.15, 0],
      ];
    case 'triple':
      return [
        [0, 1.35],
        [-1.2, -0.7],
        [1.2, -0.7],
      ];
    case 'quad':
      return [
        [-1.05, -1.05],
        [1.05, -1.05],
        [-1.05, 1.05],
        [1.05, 1.05],
      ];
    case 'cross-5':
      return [[0, 0], ...ring(count - 1, 2.0)];
    case 'ring-6':
      return ring(count, 2.2);
    case 'octagon-8':
      return ring(count, 2.5);
    case 'octaweb-9':
      return [[0, 0], ...ring(count - 1, 2.3)];
    case 'superheavy-33':
      // 3 centre + 10 mid + 20 outer = the Raptor 2 Block-1 layout.
      return [...ring(3, 0.9), ...ring(10, 2.4), ...ring(20, 4.2)];
    case 'starship-6':
      // 3 sea-level Raptor (inner) + 3 RVac (outer).
      return [...ring(3, 1.0), ...ring(3, 2.3)];
    default:
      // 'per-booster' (handled by the builder) or unknown → single nozzle.
      return count > 1 ? ring(count, 2.3) : [[0, 0]];
  }
}

/**
 * An engine cluster rendered to match the verified spec: `arrangement` +
 * `mainNozzles` decide the exact nozzle count + layout. Bells are sized so the
 * cluster fits under a stage of radius `stageR`.
 */
export function engineCluster(
  arrangement: EngineArrangement,
  mainNozzles: number,
  stageR: number,
  bellLen: number,
  y: number,
  metal: THREE.Material,
  eng: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  g.position.y = y;
  const offsets = clusterOffsets(arrangement, mainNozzles);
  // Bell radius scaled to the spread so bells don't overlap or leave the base.
  const spread = Math.max(1, ...offsets.map(([x, z]) => Math.hypot(x, z)));
  const bellR = Math.min(stageR * 0.34, (stageR * 0.92) / (spread + 1));
  // Engine heat shield / thrust structure base.
  if (offsets.length > 1) {
    const hs = new THREE.Mesh(
      new THREE.CylinderGeometry(stageR * 0.98, stageR * 0.9, bellLen * 0.1, 32),
      heroDark(0x24262b),
    );
    g.add(hs);
  }
  for (const [ox, oz] of offsets) {
    const e = detailBell(bellR, bellLen, metal, eng);
    e.position.set(ox * bellR, 0, oz * bellR);
    g.add(e);
  }
  return g;
}

/** A gold-foil / thermal band wrapping a stage at height y. */
export function band(r: number, y: number, h: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, h, 48), mat);
  m.position.y = y;
  return m;
}

// ── Agency livery (flags + wordmarks + bands + roll pattern) ────────────────

type FlagKind = 'usa' | 'prc' | 'esa' | 'rus' | 'ind' | 'jpn';

/** Draw a national/agency flag into ctx at (fx,fy,fw,fh). Compact, glyph-scale. */
function drawFlag(
  x: CanvasRenderingContext2D,
  kind: FlagKind,
  fx: number,
  fy: number,
  fw: number,
): void {
  const fh = fw * 0.64;
  if (kind === 'usa') {
    for (let s = 0; s < 7; s++) {
      x.fillStyle = s % 2 ? '#eef1f5' : '#b22234';
      x.fillRect(fx, fy + (s * fh) / 7, fw, fh / 7);
    }
    x.fillStyle = '#3c3b6e';
    x.fillRect(fx, fy, fw * 0.42, (fh * 4) / 7);
    x.fillStyle = '#fff';
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 5; c++)
        x.fillRect(
          fx + fw * 0.05 + c * fw * 0.08,
          fy + fh * 0.05 + r * fh * 0.13,
          fw * 0.016,
          fw * 0.016,
        );
  } else if (kind === 'prc') {
    x.fillStyle = '#de2910';
    x.fillRect(fx, fy, fw, fh);
    x.fillStyle = '#ffde00';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = `${Math.round(fw * 0.34)}px serif`;
    x.fillText('★', fx + fw * 0.24, fy + fh * 0.34);
    x.font = `${Math.round(fw * 0.12)}px serif`;
    for (const [dx, dy] of [
      [0.46, 0.12],
      [0.54, 0.24],
      [0.54, 0.44],
      [0.46, 0.56],
    ])
      x.fillText('★', fx + fw * dx, fy + fh * dy);
  } else if (kind === 'rus') {
    for (let i = 0; i < 3; i++) {
      x.fillStyle = ['#ffffff', '#0039a6', '#d52b1e'][i];
      x.fillRect(fx, fy + (i * fh) / 3, fw, fh / 3);
    }
  } else if (kind === 'ind') {
    for (let i = 0; i < 3; i++) {
      x.fillStyle = ['#ff9933', '#ffffff', '#138808'][i];
      x.fillRect(fx, fy + (i * fh) / 3, fw, fh / 3);
    }
    x.strokeStyle = '#0a3d91';
    x.lineWidth = fw * 0.02;
    x.beginPath();
    x.arc(fx + fw / 2, fy + fh / 2, fh * 0.12, 0, Math.PI * 2);
    x.stroke();
  } else if (kind === 'jpn') {
    x.fillStyle = '#ffffff';
    x.fillRect(fx, fy, fw, fh);
    x.fillStyle = '#bc002d';
    x.beginPath();
    x.arc(fx + fw / 2, fy + fh / 2, fh * 0.3, 0, Math.PI * 2);
    x.fill();
  } else if (kind === 'esa') {
    x.fillStyle = '#003399';
    x.fillRect(fx, fy, fw, fh);
    x.fillStyle = '#ffcc00';
    x.font = `${Math.round(fw * 0.12)}px serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.fillText('★', fx + fw / 2 + Math.cos(a) * fw * 0.3, fy + fh / 2 + Math.sin(a) * fh * 0.34);
    }
  }
}

export interface LiveryOptions {
  base?: string; // body base color (default off-white)
  bands?: { y: number; color: string; h?: number }[]; // horizontal bands at UV-v
  wordmark?: { text: string; color: string; size?: number; y?: number };
  /** Upright characters stacked top→bottom (e.g. 中国航天 for CNSA). */
  stack?: { chars: string[]; color: string; size?: number; y?: number };
  flag?: FlagKind;
  rollPattern?: boolean; // NASA-style black roll quadrants near the top
}

/**
 * A launcher body livery CanvasTexture — flag + agency wordmark + bands +
 * optional roll pattern, laid out on the camera-facing quarter (UV u≈0.25).
 * Reused per agency by the builders (RFC-034 §8 livery pass).
 */
export function livery(opts: LiveryOptions): THREE.CanvasTexture {
  const w = 2048,
    h = 2048;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = opts.base ?? '#eef1f5';
  x.fillRect(0, 0, w, h);
  const cx = 0.25 * w; // camera-facing column
  if (opts.rollPattern) {
    x.fillStyle = '#14161b';
    for (let i = 0; i < 4; i++) x.fillRect(i * 2 * (w / 8), h * 0.015, w / 8, h * 0.12);
  }
  for (const b of opts.bands ?? []) {
    x.fillStyle = b.color;
    x.fillRect(0, h * b.y, w, h * (b.h ?? 0.02));
  }
  if (opts.wordmark) {
    x.save();
    x.translate(cx, h * (opts.wordmark.y ?? 0.62));
    x.rotate(-Math.PI / 2);
    x.fillStyle = opts.wordmark.color;
    x.font = `900 ${Math.round(h * (opts.wordmark.size ?? 0.08))}px Helvetica, Arial, sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(opts.wordmark.text, 0, 0);
    x.restore();
  }
  if (opts.stack) {
    x.fillStyle = opts.stack.color;
    const size = Math.round(h * (opts.stack.size ?? 0.06));
    x.font = `bold ${size}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const y0 = h * (opts.stack.y ?? 0.34);
    opts.stack.chars.forEach((ch, i) => x.fillText(ch, cx, y0 + i * size * 1.15));
  }
  if (opts.flag) drawFlag(x, opts.flag, cx - w * 0.075, h * 0.26, w * 0.15);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}
