import { describe, expect, it } from 'vitest';
import { createBitmapSlot } from './bitmap-slot';

class FakeBitmap {
  closed = false;
  constructor(readonly id: string) {}
  close() {
    this.closed = true;
  }
}
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe('createBitmapSlot (#564: /plan drew a closed ImageBitmap)', () => {
  it('keeps the current bitmap drawable while its replacement is being built', async () => {
    const slot = createBitmapSlot<FakeBitmap>();
    await slot.replace(async () => new FakeBitmap('a'));
    const d = deferred<FakeBitmap>();
    const pending = slot.replace(() => d.promise);
    // A redraw here must not see a closed bitmap.
    expect(slot.current?.id).toBe('a');
    expect(slot.current?.closed).toBe(false);
    d.resolve(new FakeBitmap('b'));
    await pending;
    expect(slot.current?.id).toBe('b');
  });

  it('closes the replaced bitmap only after the swap', async () => {
    const slot = createBitmapSlot<FakeBitmap>();
    await slot.replace(async () => new FakeBitmap('a'));
    const a = slot.current!;
    await slot.replace(async () => new FakeBitmap('b'));
    expect(a.closed).toBe(true);
    expect(slot.current?.closed).toBe(false);
  });

  it('a superseded build is closed, never shown', async () => {
    const slot = createBitmapSlot<FakeBitmap>();
    const slow = deferred<FakeBitmap>();
    const first = slot.replace(() => slow.promise);
    await slot.replace(async () => new FakeBitmap('newer'));
    const stale = new FakeBitmap('older');
    slow.resolve(stale);
    expect(await first).toBe(false);
    expect(stale.closed).toBe(true);
    expect(slot.current?.id).toBe('newer');
  });

  it('dispose clears the reference before closing; a build finishing after dispose is closed', async () => {
    const slot = createBitmapSlot<FakeBitmap>();
    await slot.replace(async () => new FakeBitmap('a'));
    const d = deferred<FakeBitmap>();
    const pending = slot.replace(() => d.promise);
    slot.dispose();
    expect(slot.current).toBeNull();
    const late = new FakeBitmap('late');
    d.resolve(late);
    expect(await pending).toBe(false);
    expect(late.closed).toBe(true);
  });
});
