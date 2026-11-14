// @vitest-environment jsdom
import * as THREE from 'three';
import { spriteRectPx } from '$lib/universe/scene-pins';
import { describe, expect, it, vi } from 'vitest';
import {
  PICK_KINDS,
  buildIconicTrajectory,
  type IconicTrajectoryData,
  type IconicTrajectoryHandle,
} from './iconic-trajectory';

// The IM5 pick contract (UXD-019): every milestone sprite a click opens a mission from carries
// `userData.kind` (one of PICK_KINDS) and `userData.missionId`. The host's isSelectable reads
// exactly these; the C7 re-skin of the sprites must keep them.

const data: IconicTrajectoryData = {
  id: 'voyager-2',
  name: 'Voyager 2',
  mission_id: 'voyager-2',
  category: 'interstellar-bound',
  color: '#4ecdc4',
  current_position_au: [30, 10, 0],
  current_distance_au: 140,
  current_distance_label: '140 AU',
  waypoints: [
    { date: '1977-08-20', label: 'Launch (Titan IIIE)', x: 1, y: 0, z: 0 },
    { date: '1979-07-09', label: 'Jupiter flyby', x: 5, y: 0, z: 1 },
    { date: '1986-01-24', label: 'Uranus flyby', x: 19, y: 1, z: 3 },
    { date: '1989-08-25', label: 'Neptune flyby', x: 30, y: 2, z: 4 },
    { date: '2026-11-12', label: 'Today', x: 100, y: 20, z: 30 },
  ],
};

function build(): IconicTrajectoryHandle {
  return buildIconicTrajectory({ data, auToPx: (au) => au * 10, width: 800, height: 600 });
}

describe('iconic trajectory pick targets', () => {
  it('lists every encounter marker, the launch marker and every label, and not the Today marker', () => {
    const h = build();
    const kinds = h.pickTargets.map((o) => o.userData.kind as string);
    expect(kinds.filter((k) => k === PICK_KINDS.launch)).toHaveLength(1);
    expect(kinds.filter((k) => k === PICK_KINDS.marker)).toHaveLength(3);
    expect(kinds.filter((k) => k === PICK_KINDS.label)).toHaveLength(4);
    expect(h.pickTargets).not.toContain(h.clickTarget);
    h.dispose();
  });

  it('every pick target names the mission it opens', () => {
    const h = build();
    for (const o of h.pickTargets) {
      expect(o.userData.missionId, String(o.userData.kind)).toBe('voyager-2');
      expect(Object.values(PICK_KINDS)).toContain(o.userData.kind);
    }
    h.dispose();
  });

  it('the Today marker keeps its own kind and mission id', () => {
    const h = build();
    expect(h.clickTarget.userData.kind).toBe('iconic-trajectory-today');
    expect(h.clickTarget.userData.missionId).toBe('voyager-2');
    h.dispose();
  });

  it('the kinds are the strings the host reads', () => {
    expect(PICK_KINDS).toEqual({
      marker: 'iconic-trajectory-marker',
      launch: 'iconic-trajectory-launch',
      label: 'iconic-trajectory-label',
    });
  });

  it('the label sprites hang under the label group, hidden until the mission is highlighted', () => {
    const h = build();
    const label = h.pickTargets.find((o) => o.userData.kind === PICK_KINDS.label)!;
    expect(label.parent?.visible).toBe(false);
    h.setHighlight(true);
    expect(label.parent?.visible).toBe(true);
    h.dispose();
  });
});

// C7 (UXD-026): the box skin. No canvas in jsdom, so widths are the monospace estimate; the
// sizing and placement maths is the real one.

const VIEW_W = 1000;
const VIEW_H = 700;

function cameraAt(dist: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(55, VIEW_W / VIEW_H, 0.1, 100000);
  cam.position.set(0, dist * 0.8, dist * 0.6);
  cam.lookAt(150, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

function shown(h: IconicTrajectoryHandle, cam: THREE.PerspectiveCamera) {
  h.setVisible(true);
  h.relayoutLabels(cam, VIEW_H);
  return h.snapshotBoxes(cam, VIEW_W, VIEW_H);
}

describe('iconic milestone boxes', () => {
  it('draw nothing until the mission is highlighted', () => {
    const h = build();
    expect(h.snapshotBoxes(cameraAt(400), VIEW_W, VIEW_H)).toEqual([]);
    h.dispose();
  });

  it('header is n/N · date with Today excluded, and the box has no mission name', () => {
    const h = build();
    h.setHighlight(true);
    const boxes = shown(h, cameraAt(400));
    const milestones = boxes.filter((b) => b.kind === 'milestone');
    expect(milestones.map((b) => b.header)).toEqual([
      '1/4 · 1977-08-20',
      '2/4 · 1979-07-09',
      '3/4 · 1986-01-24',
      '4/4 · 1989-08-25',
    ]);
    expect(milestones.map((b) => [b.n, b.total])).toEqual([1, 2, 3, 4].map((n) => [n, 4]));
    for (const b of milestones) {
      expect(b.header.toLowerCase()).not.toContain('voyager');
      expect(b.lines.join(' ').toLowerCase()).not.toContain('voyager');
    }
    expect(milestones.map((b) => b.lines.join(' '))).toEqual([
      'Launch (Titan IIIE)',
      'Jupiter flyby',
      'Uranus flyby',
      'Neptune flyby',
    ]);
    h.dispose();
  });

  it('the one mission box names the craft once, at Today, with its distance line', () => {
    const h = build();
    h.setHighlight(true);
    const mission = shown(h, cameraAt(400)).filter((b) => b.kind === 'mission');
    expect(mission).toHaveLength(1);
    expect(mission[0].header).toBe('VOYAGER 2');
    expect(mission[0].lines.join(' ')).toBe('140 AU');
    h.dispose();
  });

  it('keeps the pick contract: the box sprites are the label pick targets, mission box excluded', () => {
    const h = build();
    h.setHighlight(true);
    shown(h, cameraAt(400));
    const labels = h.pickTargets.filter((o) => o.userData.kind === PICK_KINDS.label);
    expect(labels).toHaveLength(4);
    expect(labels.map((o) => o.userData.label)).toEqual([
      'Launch (Titan IIIE)',
      'Jupiter flyby',
      'Uranus flyby',
      'Neptune flyby',
    ]);
    h.dispose();
  });

  it('text is 12 px at every zoom (the IM2 regression: world-sized sprites were not)', () => {
    const h = build();
    h.setHighlight(true);
    for (const dist of [60, 400, 4000]) {
      const cam = cameraAt(dist);
      for (const b of shown(h, cam).filter((x) => x.shown)) {
        expect(b.textPx, `dist ${dist}`).toBeCloseTo(12, 1);
      }
    }
    h.dispose();
  });

  it('hides the lower-priority box of two that overlap and brings it back when there is room', () => {
    const h = build();
    h.setHighlight(true);
    const far = shown(h, cameraAt(40000));
    const farShown = far.filter((b) => b.shown);
    expect(farShown.length).toBeLessThan(far.length);
    // the mission box is placed first, so it is the one that stays
    expect(far.find((b) => b.kind === 'mission')?.shown).toBe(true);
    for (let i = 0; i < farShown.length; i++) {
      for (let j = i + 1; j < farShown.length; j++) {
        const a = farShown[i];
        const b = farShown[j];
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.header} / ${b.header}`).toBe(true);
      }
    }
    const near = shown(h, cameraAt(150)).filter((b) => b.shown);
    expect(near.length).toBeGreaterThan(farShown.length);
    h.dispose();
  });

  it('the hovered milestone is always shown, even where the pass would hide it', () => {
    const h = build();
    h.setHighlight(true);
    const cam = cameraAt(40000);
    const hidden = shown(h, cam).find((b) => !b.shown && b.kind === 'milestone' && b.n >= 2)!;
    expect(hidden).toBeTruthy();
    const marker = h.pickTargets.filter((o) => o.userData.kind === PICK_KINDS.marker)[hidden.n - 2];
    h.setHoveredMilestone(marker);
    const after = shown(h, cam).find((b) => b.header === hidden.header)!;
    expect(after.shown).toBe(true);
    h.setHoveredMilestone(null);
    expect(shown(h, cam).find((b) => b.header === hidden.header)!.shown).toBe(false);
    h.dispose();
  });

  it('dispose frees the box textures and materials', () => {
    const h = build();
    h.setHighlight(true);
    shown(h, cameraAt(400));
    const sprites = h.group.children
      .find((c) => c.userData.kind === 'iconic-trajectory-labels')!
      .children.filter((c): c is THREE.Sprite => c instanceof THREE.Sprite);
    expect(sprites.length).toBe(5);
    const textures = sprites.map((s) => s.material.map!);
    const tex = textures.map((t) => vi.spyOn(t, 'dispose'));
    const mats = sprites.map((s) => vi.spyOn(s.material, 'dispose'));
    h.dispose();
    for (const spy of [...tex, ...mats]) expect(spy).toHaveBeenCalled();
  });

  it('clears the hovered milestone when the paths go off', () => {
    const h = build();
    h.setHighlight(true);
    const cam = cameraAt(40000);
    const hidden = shown(h, cam).find((b) => !b.shown && b.kind === 'milestone' && b.n >= 2)!;
    const marker = h.pickTargets.filter((o) => o.userData.kind === PICK_KINDS.marker)[hidden.n - 2];
    h.setHoveredMilestone(marker);
    expect(shown(h, cam).find((b) => b.header === hidden.header)!.shown).toBe(true);
    h.setVisible(false);
    h.setVisible(true);
    expect(shown(h, cam).find((b) => b.header === hidden.header)!.shown).toBe(false);
    h.dispose();
  });

  it('upper-cases the mission box header in the page language', () => {
    document.documentElement.lang = 'tr';
    const h = buildIconicTrajectory({
      data: { ...data, name: 'ilk' },
      auToPx: (au) => au * 10,
      width: 800,
      height: 600,
    });
    h.setHighlight(true);
    expect(shown(h, cameraAt(400)).find((b) => b.kind === 'mission')!.header).toBe('İLK');
    document.documentElement.lang = '';
    h.dispose();
  });
});

describe('iconic mission box and the heading pill', () => {
  // the last leg runs along +Y, so the pill stands straight above Today on screen, where the
  // mission box would be lifted
  const heading: IconicTrajectoryData = {
    ...data,
    heading: { star: 'Gliese 445', constellation: 'Cam' },
    waypoints: [
      ...data.waypoints.slice(0, -1),
      { date: '2020-01-01', label: 'Leg', x: 0, y: 5, z: 0 },
      { date: '2026-11-12', label: 'Today', x: 0, y: 10, z: 0 },
    ],
  };
  const rect = (r: { x: number; y: number; w: number; h: number }) => ({
    l: r.x,
    r: r.x + r.w,
    t: r.y,
    b: r.y + r.h,
  });

  it('never overlap: the box moves below Today where the pill would meet it', () => {
    const h = buildIconicTrajectory({
      data: heading,
      auToPx: (au) => au * 10,
      width: 800,
      height: 600,
    });
    h.setHighlight(true);
    for (const dist of [900, 1100, 1200, 1263, 1330, 1450, 1800]) {
      // straight down the z axis: the pill stands 62 / wpp px above Today, wpp = 2 d tan(27.5 deg) / 700
      const cam = new THREE.PerspectiveCamera(55, VIEW_W / VIEW_H, 0.1, 100000);
      cam.position.set(0, 100, dist);
      cam.lookAt(0, 100, 0);
      cam.updateMatrixWorld(true);
      const boxes = shown(h, cam);
      const mission = boxes.find((b) => b.kind === 'mission')!;
      const pill = h.directionLabel!;
      const pr = spriteRectPx(pill, cam, VIEW_W, VIEW_H);
      expect(mission.shown && pill.visible, `both drawn at ${dist}`).toBe(true);
      const a = rect(mission);
      const b = rect(pr);
      const apart = a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
      expect(apart, `dist ${dist}`).toBe(true);
    }
    h.dispose();
  });

  it('the pill stays drawn while its mission is highlighted, on screen or not', () => {
    const h = buildIconicTrajectory({
      data: heading,
      auToPx: (au) => au * 10,
      width: 800,
      height: 600,
    });
    h.setVisible(true);
    h.setHighlight(true);
    // looking away from Today and the pill: both are off the canvas
    const cam = new THREE.PerspectiveCamera(55, VIEW_W / VIEW_H, 0.1, 100000);
    cam.position.set(0, 100, 1200);
    cam.lookAt(5000, 100, 0);
    cam.updateMatrixWorld(true);
    h.relayoutLabels(cam, VIEW_H);
    expect(h.directionLabel!.visible).toBe(true);
    h.setHighlight(false);
    expect(h.directionLabel!.visible).toBe(false);
    h.dispose();
  });
});
