/**
 * Hull-decal helpers for the station proxy models.
 *
 * Builds small CanvasTexture-backed plane meshes that we can stick on
 * the side of cylindrical modules so each one carries a clear visual
 * cue of its agency / national markings — Chinese flag + 中国空间站
 * banner for Tianhe, the 问天 / 梦天 characters on the labs, etc.
 *
 * Each builder returns a textured plane (or a small Group of planes)
 * that the proxy-model author can `mesh.add(...)` to position on the
 * module's hull. The texture is generated on the fly from a 2D canvas
 * so we don't ship any extra image assets.
 */
import * as THREE from 'three';

const HULL_WHITE = '#f3f5f8';

/**
 * Render text + an optional small flag onto a transparent canvas
 * and return it as a Three.js CanvasTexture. Caller owns the
 * material lifecycle.
 */
function makeBannerTexture(opts: {
  text: string;
  width?: number;
  height?: number;
  textColor?: string;
  flag?: 'cn' | 'us' | 'ru' | 'jp' | 'esa' | 'ca';
}): THREE.CanvasTexture {
  const w = opts.width ?? 512;
  const h = opts.height ?? 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // White hull-strip background so the decal reads as paint on metal
  // rather than a floating sign.
  ctx.fillStyle = HULL_WHITE;
  ctx.fillRect(0, 0, w, h);

  // Optional flag swatch on the left side.
  if (opts.flag) {
    const flagW = h * 1.5;
    const flagH = h * 0.65;
    const flagX = h * 0.25;
    const flagY = (h - flagH) / 2;
    drawFlag(ctx, opts.flag, flagX, flagY, flagW, flagH);
  }

  // Main text, vertically centred, after the flag if present.
  const textX = opts.flag ? h * 0.25 + h * 1.5 + 24 : w / 2;
  const textAlign: CanvasTextAlign = opts.flag ? 'left' : 'center';
  ctx.fillStyle = opts.textColor ?? '#0a1530';
  ctx.font = `700 ${Math.floor(h * 0.55)}px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.text, textX, h / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function drawFlag(
  ctx: CanvasRenderingContext2D,
  kind: 'cn' | 'us' | 'ru' | 'jp' | 'esa' | 'ca',
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  switch (kind) {
    case 'cn': {
      // Red field + five yellow stars in canton.
      ctx.fillStyle = '#de2910';
      ctx.fillRect(x, y, w, h);
      const cantonW = w * 0.5;
      const cantonH = h * 0.66;
      // Big star top-left.
      drawStar(ctx, x + cantonW * 0.3, y + cantonH * 0.42, cantonH * 0.18, '#ffde00');
      // Four small stars arranged around it.
      const small = cantonH * 0.075;
      drawStar(ctx, x + cantonW * 0.55, y + cantonH * 0.18, small, '#ffde00');
      drawStar(ctx, x + cantonW * 0.7, y + cantonH * 0.35, small, '#ffde00');
      drawStar(ctx, x + cantonW * 0.7, y + cantonH * 0.6, small, '#ffde00');
      drawStar(ctx, x + cantonW * 0.55, y + cantonH * 0.75, small, '#ffde00');
      break;
    }
    case 'us': {
      // 13 alternating red + white stripes, blue canton with star block.
      const stripeH = h / 13;
      for (let i = 0; i < 13; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
        ctx.fillRect(x, y + i * stripeH, w, stripeH);
      }
      ctx.fillStyle = '#3c3b6e';
      ctx.fillRect(x, y, w * 0.4, stripeH * 7);
      break;
    }
    case 'ru': {
      const bandH = h / 3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, bandH);
      ctx.fillStyle = '#0039a6';
      ctx.fillRect(x, y + bandH, w, bandH);
      ctx.fillStyle = '#d52b1e';
      ctx.fillRect(x, y + 2 * bandH, w, bandH);
      break;
    }
    case 'jp': {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#bc002d';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, h * 0.32, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'esa': {
      // ESA blue with stylised "esa" text in white.
      ctx.fillStyle = '#003f9d';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.floor(h * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('esa', x + w / 2, y + h / 2);
      break;
    }
    case 'ca': {
      // Two red side-bars + central maple-leaf-ish.
      const sideW = w * 0.25;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x, y, sideW, h);
      ctx.fillRect(x + w - sideW, y, sideW, h);
      ctx.fillStyle = '#ff0000';
      drawMapleLeaf(ctx, x + w / 2, y + h / 2, h * 0.32);
      break;
    }
  }

  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(outerAngle) * radius, cy + Math.sin(outerAngle) * radius);
    ctx.lineTo(
      cx + Math.cos(innerAngle) * radius * 0.45,
      cy + Math.sin(innerAngle) * radius * 0.45,
    );
  }
  ctx.closePath();
  ctx.fill();
}

function drawMapleLeaf(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  // Stylised — just a chunky red triangle pair so the canton reads as
  // "Canadian flag" at small sizes without an SVG dependency.
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + radius * 0.7, cy + radius * 0.4);
  ctx.lineTo(cx, cy + radius * 0.15);
  ctx.lineTo(cx - radius * 0.7, cy + radius * 0.4);
  ctx.closePath();
  ctx.fill();
}

/**
 * Build a flat plane mesh carrying the given banner texture, sized so
 * the texture renders right-way up at the requested world width/height.
 */
export function buildHullDecal(opts: {
  text: string;
  width: number;
  height: number;
  flag?: 'cn' | 'us' | 'ru' | 'jp' | 'esa' | 'ca';
  textureWidth?: number;
  textureHeight?: number;
}): THREE.Mesh {
  const tex = makeBannerTexture({
    text: opts.text,
    width: opts.textureWidth,
    height: opts.textureHeight,
    flag: opts.flag,
  });
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(opts.width, opts.height), mat);
  return plane;
}
