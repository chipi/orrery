import { describe, it, expect } from 'vitest';
import { coalesceLatest } from './async-coalesce';

// A controllable async task: each call records its arg and returns a promise we
// resolve by hand, so tests drive the exact interleaving.
function deferredTask() {
  const started: number[] = [];
  let resolvers: Array<() => void> = [];
  const run = coalesceLatest<number>((arg) => {
    started.push(arg);
    return new Promise<void>((resolve) => resolvers.push(resolve));
  });
  const settleOne = () => {
    const r = resolvers.shift();
    if (r) r();
  };
  return { started, run, settleOne };
}

describe('coalesceLatest', () => {
  it('runs a lone call immediately', async () => {
    const { started, run, settleOne } = deferredTask();
    const p = run(1);
    expect(started).toEqual([1]);
    settleOne();
    await p;
  });

  it('never runs two calls concurrently — only one is in flight at a time', async () => {
    const { started, run, settleOne } = deferredTask();
    run(1); // starts
    run(2); // in flight → queued, NOT started
    run(3); // replaces the queued one
    expect(started).toEqual([1]);
    settleOne(); // 1 done → latest pending (3) runs; 2 was dropped
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual([1, 3]);
  });

  it('coalesces to the LAST requested arg (last-call-wins)', async () => {
    const { started, run, settleOne } = deferredTask();
    run(10);
    run(20);
    run(30);
    run(40);
    settleOne();
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual([10, 40]); // 20 and 30 skipped
    settleOne();
    await Promise.resolve();
    expect(started).toEqual([10, 40]); // nothing pending after 40
  });

  it('accepts new work again after the queue drains', async () => {
    const { started, run, settleOne } = deferredTask();
    run(1);
    settleOne();
    await Promise.resolve();
    await Promise.resolve();
    run(2); // fresh call, nothing in flight → starts immediately
    expect(started).toEqual([1, 2]);
    settleOne();
  });

  it('does not deadlock if the task rejects — later calls still run', async () => {
    const started: number[] = [];
    let rejectFirst: (() => void) | null = null;
    const run = coalesceLatest<number>((arg) => {
      started.push(arg);
      if (arg === 1) return new Promise<void>((_, reject) => (rejectFirst = () => reject(new Error('x'))));
      return Promise.resolve();
    });
    const p = run(1).catch(() => {});
    run(2); // queued behind the failing call
    rejectFirst!();
    await p;
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual([1, 2]); // reset in `finally`, 2 ran
  });
});
