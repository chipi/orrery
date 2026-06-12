// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createRouteLifecycle } from './route-lifecycle';

describe('createRouteLifecycle — on()', () => {
  it('attaches the listener immediately', () => {
    const target = new EventTarget();
    const spy = vi.fn();
    const lifecycle = createRouteLifecycle();
    lifecycle.on(target, 'click', spy);
    target.dispatchEvent(new Event('click'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on cleanup', () => {
    const target = new EventTarget();
    const spy = vi.fn();
    const lifecycle = createRouteLifecycle();
    lifecycle.on(target, 'click', spy);
    lifecycle.cleanup();
    target.dispatchEvent(new Event('click'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('preserves event options (passive / capture)', () => {
    const target = new EventTarget();
    const addSpy = vi.spyOn(target, 'addEventListener');
    const lifecycle = createRouteLifecycle();
    lifecycle.on(target, 'wheel', () => {}, { passive: false });
    expect(addSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
  });
});

describe('createRouteLifecycle — add()', () => {
  it('runs the registered teardown on cleanup', () => {
    const dispose = vi.fn();
    const lifecycle = createRouteLifecycle();
    lifecycle.add(dispose);
    lifecycle.cleanup();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('LIFO ordering — last registered teardown runs first', () => {
    const order: number[] = [];
    const lifecycle = createRouteLifecycle();
    lifecycle.add(() => order.push(1));
    lifecycle.add(() => order.push(2));
    lifecycle.add(() => order.push(3));
    lifecycle.cleanup();
    expect(order).toEqual([3, 2, 1]);
  });

  it('interleaved on() and add() teardowns share the LIFO chain', () => {
    const order: string[] = [];
    const target = new EventTarget();
    const lifecycle = createRouteLifecycle();
    lifecycle.add(() => order.push('dispose-1'));
    lifecycle.on(target, 'click', () => {});
    lifecycle.add(() => order.push('dispose-2'));
    lifecycle.cleanup();
    // dispose-2 → on-cleanup (silent push via stub) → dispose-1.
    // We can't assert "on cleanup ran" via order push (it doesn't push),
    // but the order of add() entries should be LIFO.
    expect(order).toEqual(['dispose-2', 'dispose-1']);
  });
});

describe('createRouteLifecycle — cleanup()', () => {
  it('is idempotent — second call is a no-op', () => {
    const dispose = vi.fn();
    const lifecycle = createRouteLifecycle();
    lifecycle.add(dispose);
    lifecycle.cleanup();
    lifecycle.cleanup();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('disposed becomes true after cleanup', () => {
    const lifecycle = createRouteLifecycle();
    expect(lifecycle.disposed).toBe(false);
    lifecycle.cleanup();
    expect(lifecycle.disposed).toBe(true);
  });

  it('one faulty teardown does not block the rest of the chain', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const after = vi.fn();
    const lifecycle = createRouteLifecycle();
    lifecycle.add(() => {
      throw new Error('boom');
    });
    lifecycle.add(after);
    lifecycle.cleanup();
    // after() was registered later → LIFO runs it first → it ran.
    expect(after).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('[route-lifecycle] teardown failed', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('does not retain teardowns after cleanup (no memory leak)', () => {
    const dispose = vi.fn();
    const lifecycle = createRouteLifecycle();
    lifecycle.add(dispose);
    lifecycle.cleanup();
    // Internal array length is checked by re-attempting cleanup; the
    // first cleanup() should have emptied the queue, so dispose
    // doesn't fire again.
    lifecycle.cleanup();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
