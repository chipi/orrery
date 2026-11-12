import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ANCHOR_RING_IDLE_OPACITY,
  applyRing,
  LABEL_SPRITE_PX,
  RING_ANCHOR_GOLD,
  RING_BLUE,
  RING_PX,
  RING_SPRITE_PX,
  cameraFov,
  labelOffset,
  labelRect,
  lerpHex,
  liftOnScreen,
  lyRampColor,
  newLabelSlot,
  placeLabels,
  ringOpacity,
  ringTint,
  screenPxToWorld,
  snapshotPins,
  viewDepth,
  worldPerPx,
  type LabelSlot,
} from './scene-pins';

const FOV = 55;

function slot(l: number, r: number, b: number, t: number, rank: number, force = false): LabelSlot {
  const s = newLabelSlot(new THREE.Sprite(), 3, rank);
  s.rect = { l, r, b, t };
  s.visible = true;
  s.force = force;
  return s;
}

describe('screenPxToWorld', () => {
  it('20 px is 20 / viewport of the frustum height, at three viewport heights', () => {
    for (const h of [667, 768, 900]) {
      const dist = 120;
      const frustum = 2 * dist * Math.tan((FOV * Math.PI) / 360);
      expect(screenPxToWorld(20, dist, FOV, h)).toBeCloseTo((frustum * 20) / h, 9);
    }
  });
  it('scales with distance, so a size in px is the same on screen at any distance', () => {
    const near = screenPxToWorld(LABEL_SPRITE_PX, 10, FOV, 768);
    const far = screenPxToWorld(LABEL_SPRITE_PX, 1000, FOV, 768);
    expect(far / near).toBeCloseTo(100, 9);
    // world size / (world per px at that distance) is the px size: constant across distance
    expect(near / worldPerPx(10, FOV, 768)).toBeCloseTo(LABEL_SPRITE_PX, 9);
    expect(far / worldPerPx(1000, FOV, 768)).toBeCloseTo(LABEL_SPRITE_PX, 9);
  });
  it('a ring is RING_SPRITE_PX on screen at any distance', () => {
    for (const dist of [3, 80, 4000]) {
      const world = screenPxToWorld(RING_SPRITE_PX, dist, FOV, 900);
      expect(world / worldPerPx(dist, FOV, 900)).toBeCloseTo(48, 9);
    }
    expect(RING_PX).toBe(44);
  });
  it('a zero viewport does not divide by zero', () => {
    expect(Number.isFinite(worldPerPx(10, FOV, 0))).toBe(true);
  });
});

describe('labelOffset', () => {
  it('depends only on the steady glow: a hover that grows the glow is not an input', () => {
    const steady = labelOffset(4, 1, 0.5);
    expect(labelOffset(4, 1, 0.5)).toBe(steady);
    // the old per-scene formula fed the 1.5x hover size in; the offset moves with its input
    expect(labelOffset(4 * 1.5, 1, 0.5)).not.toBe(steady);
  });
  it('clears the ring when there is no glow (an arm label point)', () => {
    expect(labelOffset(0, 1, 2)).toBeCloseTo(2 * 1.15 + 0.7, 9);
  });
  it('follows a big glow when it is wider than the ring', () => {
    expect(labelOffset(10, 1, 2)).toBeCloseTo(10 * 0.9 + 0.7, 9);
    expect(labelOffset(10, 1, 2, 0.62)).toBeCloseTo(10 * 0.62 + 0.7, 9);
  });
});

describe('ring state', () => {
  it('hover and selection are full, the anchor idles at 0.55, others are hidden', () => {
    expect(ringOpacity(false, true)).toBe(1);
    expect(ringOpacity(true, true)).toBe(1);
    expect(ringOpacity(true, false)).toBe(ANCHOR_RING_IDLE_OPACITY);
    expect(ringOpacity(false, false)).toBe(0);
  });
  it('the anchor is gold, every other ring is the state blue', () => {
    expect(ringTint(true)).toBe(RING_ANCHOR_GOLD);
    expect(ringTint(false)).toBe(RING_BLUE);
    expect(RING_BLUE).toBe(0x889fe7);
  });
});

describe('applyRing', () => {
  it('sizes the sprite to 48 px on screen, so the 44 px ring is constant across distance', () => {
    const ring = new THREE.Sprite(new THREE.SpriteMaterial());
    for (const dist of [5, 500]) {
      applyRing(ring, false, true, worldPerPx(dist, FOV, 768));
      expect(ring.scale.x / worldPerPx(dist, FOV, 768)).toBeCloseTo(RING_SPRITE_PX, 9);
    }
  });
  it('follows the state: hidden, hovered, idle anchor', () => {
    const ring = new THREE.Sprite(new THREE.SpriteMaterial());
    const mat = ring.material as THREE.SpriteMaterial;
    applyRing(ring, false, false, 1);
    expect(mat.opacity).toBe(0);
    expect(ring.visible).toBe(true); // stays pickable at opacity 0
    applyRing(ring, false, true, 1);
    expect(mat.opacity).toBe(1);
    applyRing(ring, true, false, 1);
    expect(mat.opacity).toBe(ANCHOR_RING_IDLE_OPACITY);
  });
});

describe('light-year ring ramp', () => {
  it('runs from the state blue to white in four steps', () => {
    expect(lyRampColor(0, 4)).toBe(RING_BLUE);
    expect(lyRampColor(3, 4)).toBe(0xffffff);
    expect(lyRampColor(1, 4)).toBe(lerpHex(RING_BLUE, 0xffffff, 1 / 3));
  });
  it('a single ring is the blue', () => {
    expect(lyRampColor(0, 1)).toBe(RING_BLUE);
  });
  it('is monotone towards white and never teal-leaning (green never beats blue)', () => {
    let prev = -1;
    for (let i = 0; i < 4; i++) {
      const c = lyRampColor(i, 4);
      const [r, g, b] = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
      expect(r + g + b).toBeGreaterThan(prev);
      expect(b).toBeGreaterThanOrEqual(g);
      prev = r + g + b;
    }
  });
});

describe('placeLabels', () => {
  it('keeps the higher-priority label of two that overlap and hides the other', () => {
    const a = slot(0, 0.4, 0, 0.1, 1);
    const b = slot(0.2, 0.6, 0.05, 0.15, 2);
    placeLabels([b, a]);
    expect(a.visible).toBe(true);
    expect(a.sprite.visible).toBe(true);
    expect(b.visible).toBe(false);
    expect(b.sprite.visible).toBe(false);
  });
  it('labels that only touch are both shown', () => {
    const a = slot(0, 0.4, 0, 0.1, 1);
    const b = slot(0.4, 0.8, 0, 0.1, 2);
    const c = slot(0, 0.4, 0.1, 0.2, 3);
    placeLabels([a, b, c]);
    expect([a.visible, b.visible, c.visible]).toEqual([true, true, true]);
  });
  it('a hovered or selected label always shows and wins over a higher-ranked one', () => {
    const anchor = slot(0, 0.4, 0, 0.1, -100);
    const hovered = slot(0.1, 0.5, 0, 0.1, 50, true);
    placeLabels([anchor, hovered]);
    expect(hovered.visible).toBe(true);
    expect(anchor.visible).toBe(false);
  });
  it('two forced labels both stay, even on top of each other', () => {
    const a = slot(0, 0.4, 0, 0.1, 1, true);
    const b = slot(0, 0.4, 0, 0.1, 2, true);
    placeLabels([a, b]);
    expect(a.visible && b.visible).toBe(true);
  });
  it('a hidden label does not hide a third: only placed labels block', () => {
    const a = slot(0, 0.4, 0, 0.1, 1);
    const b = slot(0.3, 0.7, 0, 0.1, 2);
    const c = slot(0.6, 1.0, 0, 0.1, 3);
    placeLabels([c, b, a]);
    expect([a.visible, b.visible, c.visible]).toEqual([true, false, true]);
  });
  it('ring labels (rank 1000) go last: a star label beats the 5 LY label', () => {
    const star = slot(0, 0.4, 0, 0.1, 6);
    const ring = slot(0.1, 0.3, 0, 0.1, 1000);
    placeLabels([ring, star]);
    expect(star.visible).toBe(true);
    expect(ring.visible).toBe(false);
  });
  it('a label that is not a candidate stays hidden and blocks nothing', () => {
    const off = slot(0, 0.4, 0, 0.1, 1);
    off.visible = false;
    const b = slot(0, 0.4, 0, 0.1, 2);
    placeLabels([off, b]);
    expect(off.sprite.visible).toBe(false);
    expect(b.visible).toBe(true);
  });
  it('a label hidden by a collision returns when the other one goes away', () => {
    const a = slot(0, 0.4, 0, 0.1, 1);
    const b = slot(0.2, 0.6, 0, 0.1, 2);
    placeLabels([a, b]);
    expect(b.visible).toBe(false);
    a.visible = false;
    b.visible = true;
    placeLabels([a, b]);
    expect(b.visible).toBe(true);
  });
});

describe('labelRect and snapshotPins', () => {
  const cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 10000);
  cam.position.set(0, 0, 100);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();

  it('a label in the middle of the screen gets a centred rectangle of its on-screen size', () => {
    const s = new THREE.Sprite();
    const lh = screenPxToWorld(LABEL_SPRITE_PX, 100, FOV, 900);
    s.scale.set(lh * 5, lh, 1);
    const out = { l: 0, r: 0, b: 0, t: 0 };
    expect(labelRect(s, cam, out, new THREE.Vector3())).toBe(true);
    expect(out.l).toBeCloseTo(-out.r, 9);
    expect(out.b).toBeCloseTo(-out.t, 9);
    // height in NDC * 450 px = sprite height in px
    expect(((out.t - out.b) / 2) * 900).toBeCloseTo(LABEL_SPRITE_PX, 6);
  });
  it('a label off the screen is not placed', () => {
    const s = new THREE.Sprite();
    s.position.set(1e6, 0, 0);
    s.scale.set(1, 1, 1);
    expect(labelRect(s, cam, { l: 0, r: 0, b: 0, t: 0 }, new THREE.Vector3())).toBe(false);
  });
  it('a label near the right edge is anchored on its right side so it stays on screen', () => {
    const s = new THREE.Sprite();
    const lh = screenPxToWorld(LABEL_SPRITE_PX, 100, FOV, 900);
    s.scale.set(lh * 8, lh, 1);
    const half = 100 * Math.tan((FOV * Math.PI) / 360) * cam.aspect;
    s.position.set(half * 0.98, 0, 0);
    const out = { l: 0, r: 0, b: 0, t: 0 };
    expect(labelRect(s, cam, out, new THREE.Vector3())).toBe(true);
    expect(s.center.x).toBe(1);
    expect(out.r).toBeLessThanOrEqual(1);
  });
  it('the snapshot reports 12 px text and a 44 px ring at two distances', () => {
    for (const dist of [100, 400]) {
      cam.position.set(0, 0, dist);
      cam.updateMatrixWorld();
      const label = new THREE.Sprite();
      const ring = new THREE.Sprite(new THREE.SpriteMaterial());
      label.scale.set(
        screenPxToWorld(LABEL_SPRITE_PX, dist, FOV, 900) * 4,
        screenPxToWorld(LABEL_SPRITE_PX, dist, FOV, 900),
        1,
      );
      ring.scale.setScalar(screenPxToWorld(RING_SPRITE_PX, dist, FOV, 900));
      const snap = snapshotPins(
        'test',
        [{ id: 'a', slot: newLabelSlot(label, 4), ring }],
        cam,
        1600,
        900,
      );
      expect(snap.labels[0].textPx).toBeCloseTo(12, 6);
      expect(snap.rings[0].d).toBeCloseTo(44, 6);
      expect(snap.rings[0].cx).toBeCloseTo(800, 6);
    }
  });
  it('cameraFov reads a perspective camera', () => {
    expect(cameraFov(cam)).toBe(FOV);
    expect(cameraFov(new THREE.OrthographicCamera())).toBe(55);
  });
});

describe('view-space depth (M1): sizes hold off the view axis', () => {
  const H = 900;
  const cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 10000);
  cam.position.set(0, 0, 100);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  // 40 degrees off the view axis, 80 units from the camera.
  const OFF = 40;
  const pin = new THREE.Vector3(
    80 * Math.sin((OFF * Math.PI) / 180),
    0,
    100 - 80 * Math.cos((OFF * Math.PI) / 180),
  );

  /** On-screen px of a world length at `p`, read off two projected points (no worldPerPx). */
  function projectedHeightPx(p: THREE.Vector3, worldLen: number): number {
    const a = p.clone().project(cam);
    const b = p
      .clone()
      .add(new THREE.Vector3(0, worldLen, 0))
      .project(cam);
    return (Math.abs(b.y - a.y) * H) / 2;
  }

  it('viewDepth is the z distance, not the distance', () => {
    expect(viewDepth(cam, new THREE.Vector3(0, 0, 0))).toBeCloseTo(100, 9);
    expect(viewDepth(cam, pin)).toBeCloseTo(80 * Math.cos((OFF * Math.PI) / 180), 9);
    expect(pin.distanceTo(cam.position)).toBeCloseTo(80, 9);
  });
  it('a 20 px sprite sized from the view depth projects to 20 px; sized from the distance it does not', () => {
    const fromDepth = screenPxToWorld(LABEL_SPRITE_PX, viewDepth(cam, pin), FOV, H);
    expect(projectedHeightPx(pin, fromDepth)).toBeCloseTo(20, 6);
    const fromDistance = screenPxToWorld(LABEL_SPRITE_PX, pin.distanceTo(cam.position), FOV, H);
    // the pre-fix formula: 20 / cos(40) = 26.1 px
    expect(projectedHeightPx(pin, fromDistance)).toBeGreaterThan(25);
  });
  it('the label rectangle has the projected size of the sprite, 40 degrees off axis', () => {
    const s = new THREE.Sprite();
    s.position.copy(pin);
    const lh = screenPxToWorld(LABEL_SPRITE_PX, viewDepth(cam, pin), FOV, H);
    s.scale.set(lh * 5, lh, 1);
    const out = { l: 0, r: 0, b: 0, t: 0 };
    expect(labelRect(s, cam, out, new THREE.Vector3())).toBe(true);
    const rectPx = ((out.t - out.b) / 2) * H;
    expect(rectPx).toBeCloseTo(projectedHeightPx(pin, lh), 6);
    expect(rectPx).toBeCloseTo(20, 6);
    // width: five times the height in px, through the aspect (viewport 16:9)
    expect(((out.r - out.l) / 2) * H * cam.aspect).toBeCloseTo(100, 6);
  });
  it('the snapshot measures 12 px text and a 44 px ring off axis, and reports a wrong size as wrong', () => {
    const lh = screenPxToWorld(LABEL_SPRITE_PX, viewDepth(cam, pin), FOV, H);
    const mk = (labelH: number, ringW: number) => {
      const label = new THREE.Sprite();
      label.position.copy(pin);
      label.scale.set(labelH * 4, labelH, 1);
      const ring = new THREE.Sprite(new THREE.SpriteMaterial());
      ring.position.copy(pin);
      ring.scale.setScalar(ringW);
      return snapshotPins('t', [{ id: 'a', slot: newLabelSlot(label, 4), ring }], cam, 1600, H);
    };
    const ok = mk(lh, screenPxToWorld(RING_SPRITE_PX, viewDepth(cam, pin), FOV, H));
    expect(ok.labels[0].textPx).toBeCloseTo(12, 6);
    expect(ok.rings[0].d).toBeCloseTo(44, 6);
    const old = screenPxToWorld(LABEL_SPRITE_PX, pin.distanceTo(cam.position), FOV, H);
    expect(mk(old, 1).labels[0].textPx).toBeGreaterThan(15);
  });
});

describe('liftOnScreen (m5)', () => {
  it('lifts by the same on-screen amount when the camera looks straight down', () => {
    const top = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 10000);
    top.position.set(0, 100, 0);
    top.up.set(0, 0, -1);
    top.lookAt(0, 0, 0);
    top.updateMatrixWorld();
    const base = new THREE.Vector3();
    const lifted = liftOnScreen(new THREE.Vector3(), base, top, 10);
    const expectedPx = (10 / (100 * Math.tan((FOV * Math.PI) / 360))) * 450;
    const a = base.clone().project(top);
    const b = lifted.clone().project(top);
    expect(((b.y - a.y) / 2) * 900).toBeCloseTo(expectedPx, 6);
    // a world-Y lift is along the view axis here and moves nothing on screen
    const worldY = base
      .clone()
      .add(new THREE.Vector3(0, 10, 0))
      .project(top);
    expect(worldY.y - a.y).toBeCloseTo(0, 9);
  });
});

describe('placeLabels order (m2)', () => {
  it('equal ranks resolve by creation order, whatever order the array is in', () => {
    const mk = () => {
      const a = slot(0, 0.4, 0, 0.1, 5);
      const b = slot(0.2, 0.6, 0, 0.1, 5);
      return { a, b };
    };
    const one = mk();
    placeLabels([one.b, one.a]);
    const two = mk();
    placeLabels([two.a, two.b]);
    // `a` was created first: it wins both times
    expect([one.a.visible, one.b.visible]).toEqual([true, false]);
    expect([two.a.visible, two.b.visible]).toEqual([true, false]);
    expect(one.a.order).toBeLessThan(one.b.order);
  });
});

describe('labelRect and snapshotPins: remaining branches', () => {
  const cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 10000);
  cam.position.set(0, 0, 100);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();

  it('a label near the left edge is anchored on its left side', () => {
    const s = new THREE.Sprite();
    const lh = screenPxToWorld(LABEL_SPRITE_PX, 100, FOV, 900);
    s.scale.set(lh * 8, lh, 1);
    const half = 100 * Math.tan((FOV * Math.PI) / 360) * cam.aspect;
    s.position.set(-half * 0.98, 0, 0);
    const out = { l: 0, r: 0, b: 0, t: 0 };
    expect(labelRect(s, cam, out, new THREE.Vector3())).toBe(true);
    expect(s.center.x).toBe(0);
    expect(out.l).toBeGreaterThanOrEqual(-1);
  });
  it('an orthographic camera has no label rectangle', () => {
    const ortho = new THREE.OrthographicCamera();
    const s = new THREE.Sprite();
    expect(labelRect(s, ortho, { l: 0, r: 0, b: 0, t: 0 }, new THREE.Vector3())).toBe(false);
  });
  it('a label-only pin and a ring-only pin each report only what they have, and an edge-anchored label reports its drawn left edge', () => {
    const label = new THREE.Sprite();
    label.scale.set(40, 10, 1);
    label.center.set(1, 0.5);
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({ opacity: 0.4 }));
    ring.scale.setScalar(10);
    ring.visible = false;
    const snap = snapshotPins(
      't',
      [
        { id: 'l', slot: newLabelSlot(label, 4) },
        { id: 'r', ring },
      ],
      cam,
      1600,
      900,
    );
    expect(snap.labels.map((l) => l.id)).toEqual(['l']);
    expect(snap.rings.map((r) => r.id)).toEqual(['r']);
    const l = snap.labels[0];
    expect(l.x).toBeCloseTo(l.cx - l.w, 9);
    expect(l.y).toBeCloseTo(l.cy - l.h / 2, 9);
    expect(snap.rings[0].visible).toBe(false);
    expect(snap.rings[0].opacity).toBeCloseTo(0.4, 9);
  });
});
