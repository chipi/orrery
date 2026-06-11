import { describe, expect, it } from 'vitest';
import {
  type AssemblyRef,
  createAssemblyRef,
  syncAssemblyRef,
} from './station-assembly-state';

describe('createAssemblyRef', () => {
  it('returns a fresh ref with all flags off', () => {
    const ref = createAssemblyRef();
    expect(ref).toEqual({ active: false, playing: false, progress: 0 });
  });

  it('returns a new object on each call (no shared mutable state)', () => {
    const a = createAssemblyRef();
    const b = createAssemblyRef();
    expect(a).not.toBe(b);
    a.active = true;
    expect(b.active).toBe(false);
  });
});

describe('syncAssemblyRef', () => {
  it('mirrors a snapshot into the ref', () => {
    const ref = createAssemblyRef();
    syncAssemblyRef(ref, { open: true, playing: true, progress: 0.42 });
    expect(ref).toEqual({ active: true, playing: true, progress: 0.42 });
  });

  it('mutates the same ref instance (stable identity for animate closures)', () => {
    const ref = createAssemblyRef();
    const captured: AssemblyRef = ref;
    syncAssemblyRef(ref, { open: true, playing: false, progress: 0.1 });
    expect(captured).toBe(ref);
    expect(captured.active).toBe(true);
    expect(captured.progress).toBe(0.1);
  });

  it('overwrites prior values on each sync (no accumulation)', () => {
    const ref = createAssemblyRef();
    syncAssemblyRef(ref, { open: true, playing: true, progress: 0.8 });
    syncAssemblyRef(ref, { open: false, playing: false, progress: 0 });
    expect(ref).toEqual({ active: false, playing: false, progress: 0 });
  });

  it('translates the open→active field rename correctly', () => {
    const ref = createAssemblyRef();
    syncAssemblyRef(ref, { open: true, playing: false, progress: 0 });
    expect(ref.active).toBe(true);
    syncAssemblyRef(ref, { open: false, playing: false, progress: 0 });
    expect(ref.active).toBe(false);
  });
});
