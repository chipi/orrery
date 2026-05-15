// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildMoonLanderModel, KNOWN_MOON_LANDER_IDS } from './moon-lander-models';

describe('buildMoonLanderModel', () => {
  it('returns a Group with ≥1 mesh for every known moon-lander id', () => {
    for (const id of KNOWN_MOON_LANDER_IDS) {
      const g = buildMoonLanderModel(id, 'LANDER', '#cccccc');
      expect(g).toBeInstanceOf(THREE.Group);
      let meshCount = 0;
      g.traverse((obj) => {
        if (obj instanceof THREE.Mesh) meshCount++;
      });
      expect(meshCount, `${id} should have ≥1 mesh`).toBeGreaterThan(0);
    }
  });

  it('falls back to the generic-lander silhouette for unknown ids', () => {
    const g = buildMoonLanderModel('future-unknown-lander', 'LANDER · FLOWN', '#ff8800');
    expect(g).toBeInstanceOf(THREE.Group);
    let meshCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount++;
    });
    expect(meshCount).toBeGreaterThan(0);
  });

  it('routes unknown rover ids to the generic-rover fallback (≥6 wheel meshes)', () => {
    const g = buildMoonLanderModel('future-unknown-rover', 'LANDER · ROVER · FLOWN', '#88aaff');
    let meshCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount++;
    });
    // Generic rover: chassis(1) + 6 wheels + mast(1) = 8
    expect(meshCount).toBe(8);
  });

  it('routes unknown sample-return ids to the spike-trail fallback', () => {
    const g = buildMoonLanderModel('future-unknown-srm', 'SAMPLE RETURN · FLOWN', '#cc4444');
    let meshCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount++;
    });
    // Generic sample-return: base(1) + spike(1) = 2
    expect(meshCount).toBe(2);
  });

  it('exposes dedicated builders for each named lunar surface mission in v0.6 data', () => {
    expect(KNOWN_MOON_LANDER_IDS).toEqual(
      expect.arrayContaining([
        'apollo11',
        'apollo12',
        'apollo14',
        'apollo15',
        'apollo16',
        'apollo17',
        'artemis3',
        'luna9',
        'luna16',
        'luna17',
        'luna20',
        'luna21',
        'luna24',
        'change3',
        'change4',
        'change5',
        'change6',
        'chandrayaan3',
        'slim',
      ]),
    );
  });

  it('Apollo J-mission LM (apollo15) includes the LRV (4 wheels) parked beside the descent stage', () => {
    const g = buildMoonLanderModel('apollo15', undefined, '#bb1f24');
    let meshCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount++;
    });
    // Descent stage: body + 4 legs + 4 pads + nozzle = 10
    // Flag: pole + flag = 2
    // LRV: chassis + 4 wheels + 2 seats + mast + dish = 9
    // Accent ring = 1
    // Total = 22
    expect(meshCount).toBe(22);
  });

  it('non-J-mission Apollo (apollo11) does NOT include the LRV', () => {
    const g11 = buildMoonLanderModel('apollo11', undefined, '#bb1f24');
    const g15 = buildMoonLanderModel('apollo15', undefined, '#bb1f24');
    let mc11 = 0;
    let mc15 = 0;
    g11.traverse((o) => o instanceof THREE.Mesh && mc11++);
    g15.traverse((o) => o instanceof THREE.Mesh && mc15++);
    expect(mc11).toBeLessThan(mc15);
  });

  it('Chang’e sample-return missions share a silhouette (change5 ≡ change6)', () => {
    const counts: number[] = [];
    for (const id of ['change5', 'change6']) {
      const g = buildMoonLanderModel(id, undefined, '#ffcc00');
      let c = 0;
      g.traverse((o) => o instanceof THREE.Mesh && c++);
      counts.push(c);
    }
    expect(counts[0]).toBe(counts[1]);
  });

  it('Lunokhod builder is shared between Luna 17 and Luna 21', () => {
    const g17 = buildMoonLanderModel('luna17', undefined, '#cc0000');
    const g21 = buildMoonLanderModel('luna21', undefined, '#cc0000');
    let mc17 = 0;
    let mc21 = 0;
    g17.traverse((o) => o instanceof THREE.Mesh && mc17++);
    g21.traverse((o) => o instanceof THREE.Mesh && mc21++);
    expect(mc17).toBe(mc21);
  });
});
