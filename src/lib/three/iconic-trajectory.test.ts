// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
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
