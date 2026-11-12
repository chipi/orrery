/**
 * Canvas-backed sprite builders shared by the /explore pin scenes: the radial glow texture,
 * the 12 px label sprite and the 44 px ring (UXD-020). The sizing, placement and ring-state
 * rules are in scene-pins.ts (pure, tested).
 *
 * WebGL / DOM builder — coverage-excluded (see vite.config.ts).
 */
import * as THREE from 'three';
import {
  RING_PX,
  RING_SPRITE_PX,
  RING_STROKE_PX,
  ringOpacity,
  ringTint,
} from './scene-pins';

export function radialTexture(stops: Array<[number, string]>, size = 128): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d')!;
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

export interface LabelSpriteOptions {
  color?: string;
  weight?: 'bold' | 'normal';
  /** A stronger dark halo behind the text (the light-year ring labels over the star field). */
  halo?: boolean;
}

/**
 * One label builder for every scene. 24 px type on a 40 px texture: the sprite is sized to
 * LABEL_SPRITE_PX CSS px so the text reads LABEL_TEXT_PX (12) px at every scale.
 */
export function labelSprite(
  text: string,
  { color = 'rgba(200,214,255,0.9)', weight = 'normal', halo = false }: LabelSpriteOptions = {},
): { sprite: THREE.Sprite; texture: THREE.CanvasTexture; aspect: number } {
  const upper = text.toUpperCase();
  const font = `${weight === 'bold' ? '500' : '400'} 24px "Space Mono", monospace`;
  const tracking = '2px';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  measure.letterSpacing = tracking;
  const pad = 12;
  const w = Math.ceil(measure.measureText(upper).width) + pad * 2;
  const h = 40;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.font = font;
  ctx.letterSpacing = tracking;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = halo ? 9 : 5;
  ctx.fillStyle = color;
  if (halo) ctx.fillText(upper, w / 2, h / 2);
  ctx.fillText(upper, w / 2, h / 2);
  const texture = new THREE.CanvasTexture(cvs);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  return { sprite, texture, aspect: w / h };
}

/**
 * The ring texture, white so the material colour tints it: a thin annulus whose 44 px
 * diameter sits inside a 48 px sprite, stroke 1.5 px at that final size.
 */
export function ringTexture(): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = (RING_STROKE_PX / RING_SPRITE_PX) * s;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, ((RING_PX / RING_SPRITE_PX) * s) / 2, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * A ring sprite: the anchor is gold and idles at 0.55, any other pin is the state blue and
 * appears on hover or selection. Positioned and scaled by the scene each frame.
 */
export function createRing(texture: THREE.Texture, anchor: boolean): THREE.Sprite {
  const ring = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color: ringTint(anchor),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: ringOpacity(anchor, false),
    }),
  );
  ring.renderOrder = 9;
  return ring;
}
