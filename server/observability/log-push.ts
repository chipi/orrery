/**
 * Dev-tier log shipping (ADR-082 amendment 2026-10-17). In prod, Alloy ships the
 * containers' stdout to VictoriaLogs; a laptop has no Alloy, so a local server run
 * pushes its own lines straight to the tailnet VictoriaLogs jsonline endpoint with
 * the same stream fields, `environment=dev`. Only enabled when a push URL is
 * configured (the dev default; never prod/staging, never tests).
 *
 * Best-effort by design: lines are batched, a failed push drops that batch (one
 * stderr note, then silent), and nothing here can throw into the server.
 */
import { hostname } from 'node:os';

export interface LogPushOptions {
  url: string;
  service: string;
  environment: string;
  app?: string;
  instance?: string;
  /** Flush at least this often. */
  flushMs?: number;
  /** Flush as soon as this many lines are buffered. */
  maxBatch?: number;
  fetchImpl?: typeof fetch;
}

export type LogLevel = 'info' | 'warning' | 'error';

export interface LogPusher {
  push(level: LogLevel, msg: string): void;
  flush(): Promise<void>;
  stop(): Promise<void>;
}

const TRACE_ID = /\btrace_id=([0-9a-f]{32})\b/;

export function createLogPusher(opts: LogPushOptions): LogPusher {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = {
    app: opts.app ?? 'orrery',
    service: opts.service,
    environment: opts.environment,
    instance: opts.instance ?? hostname().split('.')[0],
  };
  const maxBatch = opts.maxBatch ?? 100;
  let buffer: string[] = [];
  let failedOnce = false;
  let inflight: Promise<void> = Promise.resolve();

  const flush = (): Promise<void> => {
    if (buffer.length === 0) return inflight;
    const body = buffer.join('\n') + '\n';
    buffer = [];
    inflight = inflight.then(() =>
      fetchImpl(opts.url, {
        method: 'POST',
        headers: { 'content-type': 'application/stream+json' },
        body,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
        })
        .catch((e: unknown) => {
          if (!failedOnce) {
            failedOnce = true;
            process.stderr.write(
              `[${base.service}] dev log push failed (${e instanceof Error ? e.message : String(e)}); dropping, later failures not reported\n`,
            );
          }
        }),
    );
    return inflight;
  };

  const timer = setInterval(() => void flush(), opts.flushMs ?? 2000);
  timer.unref();

  return {
    push(level, msg) {
      const line: Record<string, string> = {
        ...base,
        _time: new Date().toISOString(),
        _msg: msg,
        level,
      };
      const tid = TRACE_ID.exec(msg)?.[1];
      if (tid) line.trace_id = tid;
      buffer.push(JSON.stringify(line));
      if (buffer.length >= maxBatch) void flush();
    },
    flush,
    async stop() {
      clearInterval(timer);
      await flush();
    },
  };
}

/**
 * Tee console.log/warn/error into the pusher (the original output still prints).
 * Returns an undo function.
 */
export function teeConsole(pusher: LogPusher): () => void {
  const orig = { log: console.log, warn: console.warn, error: console.error };
  const one = (a: unknown): string => {
    if (typeof a === 'string') return a;
    if (a instanceof Error) return a.stack ?? a.message;
    try {
      return JSON.stringify(a) ?? String(a);
    } catch {
      return String(a); // circular or exotic: never throw out of a log call
    }
  };
  const fmt = (args: unknown[]) => args.map(one).join(' ');
  console.log = (...a: unknown[]) => {
    orig.log(...a);
    pusher.push('info', fmt(a));
  };
  console.warn = (...a: unknown[]) => {
    orig.warn(...a);
    pusher.push('warning', fmt(a));
  };
  console.error = (...a: unknown[]) => {
    orig.error(...a);
    pusher.push('error', fmt(a));
  };
  return () => Object.assign(console, orig);
}
