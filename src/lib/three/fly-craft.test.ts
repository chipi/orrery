import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FLY_CRAFT_MISSIONS, flyCraft, flyCraftSource, preloadFlyCraft } from './fly-craft';
import { buildPayload } from './ascent-scene';

describe('fly-craft', () => {
  it('loads the showcase CSM for Apollo 9 and the ascent rides it at the rocket width', async () => {
    expect(flyCraft('apollo9')).toBeNull();
    expect(await preloadFlyCraft('apollo9')).toBe(true);
    const csm = flyCraft('apollo9');
    expect(csm?.userData.bodyDiameterM).toBeCloseTo(3.9, 0);
    const payload = buildPayload('apollo9', 100, 2);
    expect(payload.userData.isCapsule).toBe(true);
    const w = new THREE.Box3().setFromObject(payload).getSize(new THREE.Vector3());
    // Taller than wide (the full CSM, not the bare CM), body width ≈ 0.92 × the stage.
    expect(w.y).toBeGreaterThan(2 * 2 * 0.92);
  });

  it('missions without a showcase craft resolve false', async () => {
    expect(await preloadFlyCraft('curiosity')).toBe(false);
    expect(flyCraft('curiosity')).toBeNull();
  });
});

describe('fly-craft: IM-1, MRO and Mariner 2 fly their own models', () => {
  it('maps each to its dedicated builder and loads a craft of the published size', async () => {
    expect(flyCraftSource('im-1')).toEqual(['landers', 'buildNovaC']);
    expect(flyCraftSource('mro')).toEqual(['mars-orbiters', 'mro']);
    expect(flyCraftSource('mariner2')).toEqual(['mars-orbiters', 'mariner-2']);
    for (const id of ['im-1', 'mro', 'mariner2']) expect(await preloadFlyCraft(id), id).toBe(true);
    const h = (id: string) =>
      new THREE.Box3().setFromObject(flyCraft(id)!).getSize(new THREE.Vector3());
    expect(h('im-1').y).toBeCloseTo(4.3, 0);
    expect(h('mariner2').y).toBeCloseTo(3.66, 0);
    expect(h('mro').x).toBeGreaterThan(10);
  });
});

describe('fly-craft map', () => {
  it('every mapped mission resolves to a built craft', async () => {
    for (const id of FLY_CRAFT_MISSIONS) {
      expect(await preloadFlyCraft(id), id).toBe(true);
      const g = flyCraft(id);
      const size = new THREE.Box3().setFromObject(g!).getSize(new THREE.Vector3());
      expect(Math.max(size.x, size.y, size.z), id).toBeGreaterThan(0.3);
    }
    // Builds every mapped craft at full detail: ~1 s alone, past the 5 s default under coverage
    // with the whole suite running.
  }, 30_000);
});

describe('fly-craft: a mission flies its own craft wherever one exists', () => {
  it('only a mission with no 3D craft anywhere falls back to the generic glyph', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { SUPPORTED_MISSION_IDS } = await import('./interplanetary-spacecraft-models');
    const { CRUISE_MISSION_IDS } = await import('./lander-cruise-models');
    const families = import.meta.glob<{ SHOWCASE?: Record<string, unknown> }>([
      './showcase/*.ts',
      '!./showcase/*.test.ts',
    ]);
    const showcase = new Set<string>();
    for (const load of Object.values(families))
      for (const k of Object.keys((await load()).SHOWCASE ?? {})) showcase.add(k);
    const walk = (d: string): string[] =>
      fs
        .readdirSync(d, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory()
            ? walk(path.join(d, e.name))
            : e.name.endsWith('.json') && e.name !== 'index.json'
              ? [path.join(d, e.name)]
              : [],
        );
    const generic: string[] = [];
    const missed: string[] = [];
    for (const f of walk('static/data/missions')) {
      const m = JSON.parse(fs.readFileSync(f, 'utf8')) as {
        id?: string;
        fleet_refs?: { id: string; role?: string }[];
      };
      if (!m.id) continue;
      const own =
        flyCraftSource(m.id) ||
        SUPPORTED_MISSION_IDS.includes(m.id) ||
        CRUISE_MISSION_IDS.includes(m.id);
      if (own) continue;
      generic.push(m.id);
      const model = (m.fleet_refs ?? []).find((r) => r.role !== 'launcher' && showcase.has(r.id));
      if (model) missed.push(`${m.id} -> ${model.id}`);
    }
    // A fleet craft with a showcase model must be mapped (fly-craft.ts FLY_CRAFT).
    expect(missed).toEqual([]);
    // No 3D craft exists for these (Starship Flight 5 is drawn by the launch scenes).
    expect(generic.sort()).toEqual(['escapade', 'starship-flight-5']);
  }, 60_000);
});
