import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// Run static/sw-install-report.js against a fake service-worker global and a fake
// install event, the way the browser does when sw.js importScripts it (#588).
function loadIntoFakeSw() {
  const listeners: Record<string, (e: unknown) => void> = {};
  const postMessage = vi.fn();
  const fakeSelf = {
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
    clients: { matchAll: vi.fn(async () => [{ postMessage }, { postMessage }]) },
  };
  const src = readFileSync(
    new URL('../../../static/sw-install-report.js', import.meta.url),
    'utf8',
  );
  new Function('self', src)(fakeSelf);
  const install = (promise: Promise<unknown>) => {
    const original = vi.fn();
    const event = { waitUntil: original };
    listeners.install(event);
    // Workbox's own listener runs next and calls waitUntil on the same event.
    event.waitUntil(promise);
    return original;
  };
  return { install, postMessage, matchAll: fakeSelf.clients.matchAll };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('sw-install-report.js (#588)', () => {
  it('posts the rejection reason to every window client, and still hands the promise to the browser', async () => {
    const { install, postMessage, matchAll } = loadIntoFakeSw();
    const err = Object.assign(
      new Error('bad-precaching-response :: [{"url":"/x.js","status":404}]'),
      {
        name: 'WorkboxError',
      },
    );
    const failing = Promise.reject(err);
    failing.catch(() => {}); // the browser handles the real rejection
    const original = install(failing);
    await settle();
    expect(original).toHaveBeenCalledWith(failing);
    expect(matchAll).toHaveBeenCalledWith({ includeUncontrolled: true, type: 'window' });
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'orrery-sw-install-error',
      name: 'WorkboxError',
      message: 'bad-precaching-response :: [{"url":"/x.js","status":404}]',
    });
  });

  it('posts nothing when the install succeeds', async () => {
    const { install, postMessage } = loadIntoFakeSw();
    install(Promise.resolve());
    await settle();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('truncates long messages and copes with a non-Error rejection', async () => {
    const { install, postMessage } = loadIntoFakeSw();
    const failing = Promise.reject('x'.repeat(1000));
    failing.catch(() => {});
    install(failing);
    await settle();
    const sent = postMessage.mock.calls[0][0];
    expect(sent.name).toBe('Error');
    expect(sent.message).toHaveLength(300);
  });
});
