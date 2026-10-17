import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogPusher, teeConsole } from './log-push';

const calls: Array<{ url: string; body: string; type: string }> = [];
const okFetch = (async (url: string, init: RequestInit) => {
  calls.push({
    url,
    body: String(init.body),
    type: String((init.headers as Record<string, string>)['content-type']),
  });
  // A 204 must have a null body: `new Response('', { status: 204 })` throws, which
  // silently turned this "ok" fetch into the failure path.
  return new Response(null, { status: 204 });
}) as unknown as typeof fetch;

afterEach(() => {
  calls.length = 0;
  vi.restoreAllMocks();
});

describe('createLogPusher', () => {
  it('ships NDJSON with the LOG-STANDARD stream fields and a plain trace_id', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const p = createLogPusher({
      url: 'https://vlogs.example/insert/jsonline',
      service: 'orrery-mcp',
      environment: 'dev',
      instance: 'omarchy',
      fetchImpl: okFetch,
    });
    p.push(
      'info',
      '[orrery-mcp] POST /mcp -> 200 in 3.1ms trace_id=0123456789abcdef0123456789abcdef',
    );
    p.push('error', 'boom');
    await p.stop();
    expect(calls).toHaveLength(1);
    expect(calls[0].type).toBe('application/stream+json');
    const lines = calls[0].body
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    expect(lines[0]).toMatchObject({
      app: 'orrery',
      service: 'orrery-mcp',
      environment: 'dev',
      instance: 'omarchy',
      level: 'info',
      trace_id: '0123456789abcdef0123456789abcdef',
    });
    expect(lines[0]._time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(lines[1]).toMatchObject({ level: 'error', _msg: 'boom' });
    expect(lines[1].trace_id).toBeUndefined();
    // A successful push reports nothing.
    expect(stderr.mock.calls.filter((c) => String(c[0]).includes('log push failed'))).toEqual([]);
  });

  it('batches at maxBatch', async () => {
    const p = createLogPusher({
      url: 'u',
      service: 's',
      environment: 'dev',
      maxBatch: 2,
      fetchImpl: okFetch,
    });
    p.push('info', 'a');
    p.push('info', 'b'); // flushes
    p.push('info', 'c');
    await p.stop();
    expect(calls.map((c) => c.body.trim().split('\n').length)).toEqual([2, 1]);
  });

  it('a failing push never throws, and reports once', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const bad = (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    const p = createLogPusher({
      url: 'u',
      service: 's',
      environment: 'dev',
      maxBatch: 1,
      fetchImpl: bad,
    });
    p.push('info', 'a');
    p.push('info', 'b');
    await expect(p.stop()).resolves.toBeUndefined();
    expect(
      stderr.mock.calls.filter((c) => String(c[0]).includes('dev log push failed')),
    ).toHaveLength(1);
  });
});

describe('teeConsole', () => {
  it('keeps printing and pushes each console line with its level; undo restores', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const p = createLogPusher({ url: 'u', service: 's', environment: 'dev', fetchImpl: okFetch });
    const undo = teeConsole(p);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    console.log('hello', { a: 1 });
    console.error(circular); // must not throw
    undo();
    await p.stop();
    expect(log).toHaveBeenCalledWith('hello', { a: 1 });
    expect(err).toHaveBeenCalled();
    const lines = calls[0].body
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    expect(lines.map((l) => [l.level, l._msg])).toEqual([
      ['info', 'hello {"a":1}'],
      ['error', '[object Object]'],
    ]);
  });
});
