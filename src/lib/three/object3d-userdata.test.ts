import { describe, it, expect } from 'vitest';
import { Object3D } from 'three';
import { createUserDataTag } from './object3d-userdata';

describe('createUserDataTag — write + read round-trip', () => {
  it('reads back the payload after set', () => {
    const tag = createUserDataTag<{ moduleId: string }>('stationModule');
    const obj = new Object3D();
    tag.set(obj, { moduleId: 'cupola' });
    const out = tag.read(obj);
    expect(out).toEqual({ moduleId: 'cupola' });
  });

  it('preserves payload identity (no cloning) — caller can mutate later', () => {
    const tag = createUserDataTag<{ moduleId: string; visited: boolean }>('stationModule');
    const obj = new Object3D();
    const payload = { moduleId: 'cupola', visited: false };
    tag.set(obj, payload);
    payload.visited = true;
    expect(tag.read(obj)?.visited).toBe(true);
  });

  it('overwrites a prior payload stamped by the same tag', () => {
    const tag = createUserDataTag<{ moduleId: string }>('stationModule');
    const obj = new Object3D();
    tag.set(obj, { moduleId: 'cupola' });
    tag.set(obj, { moduleId: 'destiny' });
    expect(tag.read(obj)?.moduleId).toBe('destiny');
  });
});

describe('createUserDataTag — discriminator', () => {
  it('returns null when the object has no tagged userData', () => {
    const tag = createUserDataTag<{ moduleId: string }>('stationModule');
    const obj = new Object3D();
    expect(tag.read(obj)).toBeNull();
  });

  it('does not collide with a different tag on the same object', () => {
    const stationTag = createUserDataTag<{ moduleId: string }>('stationModule');
    const planetTag = createUserDataTag<{ planet: string }>('planetMarker');
    const obj = new Object3D();
    stationTag.set(obj, { moduleId: 'cupola' });
    planetTag.set(obj, { planet: 'mars' });
    expect(stationTag.read(obj)?.moduleId).toBe('cupola');
    expect(planetTag.read(obj)?.planet).toBe('mars');
  });

  it('returns null when reading through a tag that did not stamp the object', () => {
    const stationTag = createUserDataTag<{ moduleId: string }>('stationModule');
    const planetTag = createUserDataTag<{ planet: string }>('planetMarker');
    const obj = new Object3D();
    stationTag.set(obj, { moduleId: 'cupola' });
    expect(planetTag.read(obj)).toBeNull();
  });

  it('rejects userData that happens to use the tag id as a key but lacks the discriminator', () => {
    // Defends against accidental collisions with legacy userData
    // writes that pre-date the wrapper.
    const tag = createUserDataTag<{ moduleId: string }>('stationModule');
    const obj = new Object3D();
    (obj.userData as Record<string, unknown>).stationModule = { moduleId: 'cupola' };
    // No discriminator stamped → read returns null even though the key
    // is "right". Keeps legacy + tagged data from cross-contaminating.
    expect(tag.read(obj)).toBeNull();
  });
});

describe('createUserDataTag — null-safety', () => {
  it('read(null) returns null without throwing', () => {
    const tag = createUserDataTag<{ moduleId: string }>('stationModule');
    expect(tag.read(null)).toBeNull();
  });

  it('read(undefined) returns null without throwing', () => {
    const tag = createUserDataTag<{ moduleId: string }>('stationModule');
    expect(tag.read(undefined)).toBeNull();
  });
});

describe('createUserDataTag — TypeScript narrowing', () => {
  it('narrowed payload accepts typed access without casts', () => {
    interface ModulePayload {
      moduleId: string;
      function: string;
    }
    const tag = createUserDataTag<ModulePayload>('stationModule');
    const obj = new Object3D();
    tag.set(obj, { moduleId: 'cupola', function: 'observation' });
    const data = tag.read(obj);
    if (data) {
      // Compile check — these are typed string, not any. The runtime
      // assertion below pins the same.
      const id: string = data.moduleId;
      const fn: string = data.function;
      expect(id).toBe('cupola');
      expect(fn).toBe('observation');
    } else {
      throw new Error('expected payload narrowing');
    }
  });

  it('exposes the tag id for debugging', () => {
    const tag = createUserDataTag<{ moduleId: string }>('stationModule');
    expect(tag.id).toBe('stationModule');
  });
});
