import { describe, it, expect } from 'vitest';
import {
  setPageDebugContent,
  setRenderingDebugRegistration,
  type PageDebugRegistration,
  type RenderingDebugRegistration,
  type RenderingRegistrationSlot,
} from './debug-panel-context';

/**
 * #466 regression — the DebugPanel context setters must be pure mutators
 * of a caller-captured context and MUST NOT call `getContext` themselves.
 *
 * These tests run with no Svelte component context active — the exact
 * condition of an `$effect` teardown on unmount, where `component_context`
 * is null. Before the fix the setters re-derived the context via
 * `getContext`, which throws `lifecycle_outside_component` in that state
 * (the crash filed on /iss, shared by every 3D route incl. /tiangong).
 * A pure setter is safe to call here; the assertion is "does not throw".
 */
describe('debug-panel-context setters (#466)', () => {
  function makeCtx() {
    const registration: PageDebugRegistration = { label: '', content: null };
    const rendering: RenderingRegistrationSlot = { value: null };
    return { registration, rendering };
  }

  it('setPageDebugContent mutates the captured ctx without getContext', () => {
    const ctx = makeCtx();
    expect(() => setPageDebugContent(ctx, { label: 'FLY', content: null })).not.toThrow();
    expect(ctx.registration.label).toBe('FLY');
  });

  it('setPageDebugContent teardown (empty reg) is safe with no component context', () => {
    const ctx = makeCtx();
    setPageDebugContent(ctx, { label: 'MARS', content: null });
    expect(() => setPageDebugContent(ctx, { label: '', content: null })).not.toThrow();
    expect(ctx.registration.label).toBe('');
  });

  it('setRenderingDebugRegistration sets and clears the boxed slot', () => {
    const ctx = makeCtx();
    const reg = {
      renderer: {},
      quality: {},
      qualitySource: 'fallback',
    } as unknown as RenderingDebugRegistration;
    expect(() => setRenderingDebugRegistration(ctx, reg)).not.toThrow();
    expect(ctx.rendering.value).toBe(reg);
    // Teardown path — the crash site: clear with no component context.
    expect(() => setRenderingDebugRegistration(ctx, null)).not.toThrow();
    expect(ctx.rendering.value).toBeNull();
  });

  it('both setters no-op on a null ctx (route outside the layout)', () => {
    expect(() => setPageDebugContent(null, { label: 'X', content: null })).not.toThrow();
    expect(() => setRenderingDebugRegistration(null, null)).not.toThrow();
  });
});
