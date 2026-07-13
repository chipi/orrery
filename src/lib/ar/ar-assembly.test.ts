import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { collectParts, startArStationAssembly } from './ar-assembly';

/** Build a minimal proxy: a parent body owning a child body + a sibling deploy. */
function makeProxy(): { root: THREE.Object3D; bodyA: THREE.Mesh; childB: THREE.Mesh } {
  const root = new THREE.Group();
  root.name = 'iss';

  const bodyA = new THREE.Mesh(new THREE.BoxGeometry());
  bodyA.userData.stationPickable = true;
  bodyA.userData.moduleId = 'a';
  bodyA.position.set(1, 0, 0);
  root.add(bodyA);

  // Child of an animated body — must be skipped (parent owns the subtree).
  const childB = new THREE.Mesh(new THREE.BoxGeometry());
  childB.userData.stationPickable = true;
  childB.userData.moduleId = 'a-child';
  bodyA.add(childB);

  // Independent panel that deploys.
  const panel = new THREE.Mesh(new THREE.BoxGeometry());
  panel.userData.animModuleId = 'panel';
  panel.userData.deployAxis = 'y';
  panel.position.set(2, 0, 0);
  root.add(panel);

  return { root, bodyA, childB };
}

describe('collectParts', () => {
  it('collects animatable parts and skips subtrees an ancestor already owns', () => {
    const { root, childB } = makeProxy();
    const parts = collectParts(root);
    const ids = parts.map((p) => p.id).sort();
    expect(ids).toEqual(['a', 'panel']);
    // The child of an animated body is never collected independently.
    expect(parts.some((p) => p.mesh === childB)).toBe(false);
  });

  it('classifies kind from the userData tags', () => {
    const { root } = makeProxy();
    const byId = new Map(collectParts(root).map((p) => [p.id, p.kind]));
    expect(byId.get('a')).toBe('body'); // stationPickable → body
    expect(byId.get('panel')).toBe('deploy'); // deployAxis → deploy
  });
});

describe('startArStationAssembly', () => {
  const epochs = new Map<string, number>([
    ['a', Date.parse('2000-01-01')],
    ['panel', Date.parse('2010-01-01')],
  ]);

  it('starts from an empty stage — nothing has launched yet', () => {
    const { root, bodyA } = makeProxy();
    startArStationAssembly(root, epochs);
    // At progress 0 the piecewise clock predates every launch → all hidden.
    expect(bodyA.visible).toBe(false);
  });

  it('assembles to home and reports done after the full duration + hold', () => {
    const { root, bodyA } = makeProxy();
    const homeA = bodyA.position.clone();
    const asm = startArStationAssembly(root, epochs);

    // Advance well past duration (9s) + hold (1.5s).
    asm.update(20_000);
    expect(asm.done).toBe(true);
    expect(bodyA.visible).toBe(true);
    expect(bodyA.position.x).toBeCloseTo(homeA.x, 5);
    expect(bodyA.position.y).toBeCloseTo(homeA.y, 5);
  });

  it('update() is a no-op once done', () => {
    const { root, bodyA } = makeProxy();
    const asm = startArStationAssembly(root, epochs);
    asm.update(20_000);
    const snapshot = bodyA.position.clone();
    asm.update(5_000);
    expect(bodyA.position.equals(snapshot)).toBe(true);
  });

  it('dispose() restores home transforms immediately', () => {
    const { root, bodyA } = makeProxy();
    const homeA = bodyA.position.clone();
    const asm = startArStationAssembly(root, epochs);
    // Mid-flight (partway through the fly-in) then dispose.
    asm.update(3_000);
    asm.dispose();
    expect(asm.done).toBe(true);
    expect(bodyA.visible).toBe(true);
    expect(bodyA.position.x).toBeCloseTo(homeA.x, 5);
  });

  it('leaves parts without a resolvable epoch simply visible', () => {
    const { root, bodyA } = makeProxy();
    // No epoch for 'panel' → it should stay visible rather than vanish.
    const partial = new Map<string, number>([['a', Date.parse('2000-01-01')]]);
    const asm = startArStationAssembly(root, partial);
    const panel = root.children.find((c) => c.userData.animModuleId === 'panel')!;
    expect(panel.visible).toBe(true);
    asm.dispose();
    expect(bodyA.visible).toBe(true);
  });
});
