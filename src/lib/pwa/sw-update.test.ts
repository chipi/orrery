import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkForUpdate } from './sw-update';

// Prod GlitchTip (#537, #552, #555 → #588): "TypeError: Failed to update a ServiceWorker …"
// and "InvalidStateError: Failed to update a ServiceWorker …" arrived as unhandled
// rejections from the hourly / on-focus `registration.update()` check — a best-effort
// background check whose rejection (offline, flaky network, registration gone) was
// discarded with `void`.

describe('checkForUpdate', () => {
  const onUnhandled = vi.fn();
  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
    onUnhandled.mockReset();
  });

  it('reports a successful check', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    await expect(checkForUpdate({ update })).resolves.toBe(true);
    expect(update).toHaveBeenCalledOnce();
  });

  it('absorbs a failed check (offline TypeError) instead of leaking an unhandled rejection', async () => {
    process.on('unhandledRejection', onUnhandled);
    const update = vi
      .fn()
      .mockRejectedValue(
        new TypeError(
          "Failed to update a ServiceWorker for scope ('https://www.orrerylearn.com/'): An unknown error occurred when fetching the script.",
        ),
      );
    await expect(checkForUpdate({ update })).resolves.toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(onUnhandled).not.toHaveBeenCalled();
  });

  it('absorbs InvalidStateError (registration uninstalled)', async () => {
    const err = Object.assign(new Error('Failed to update a ServiceWorker'), {
      name: 'InvalidStateError',
    });
    await expect(checkForUpdate({ update: vi.fn().mockRejectedValue(err) })).resolves.toBe(false);
  });

  it('absorbs a synchronous throw from update()', async () => {
    const update = vi.fn(() => {
      throw new Error('boom');
    });
    await expect(checkForUpdate({ update })).resolves.toBe(false);
  });
});
