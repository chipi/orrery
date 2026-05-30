// Retry-with-exponential-backoff helper (RFC-019 §9).
// Wraps a TTS provider call with up to N attempts on transient errors:
// network errors, 5xx responses, and 429 rate-limited responses. The
// 429 path honours the `Retry-After` header when present.
//
// Non-retryable: 4xx (other than 429), auth errors, malformed inputs,
// schema rejects — these surface immediately so the operator fixes the
// input rather than burning attempts.

export interface TransientError extends Error {
  status?: number;
  retryAfterSec?: number;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Optional sleep for unit tests; defaults to `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
}

export function isTransient(err: unknown): err is TransientError {
  if (!(err instanceof Error)) return false;
  const status = (err as TransientError).status;
  // Network errors usually have no `status`; assume retryable.
  if (status === undefined) {
    return /ECONN|ETIMEDOUT|ENETUNREACH|fetch failed|socket hang up/i.test(err.message);
  }
  return status === 429 || (status >= 500 && status < 600);
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 1000;
  const max = opts.maxDelayMs ?? 15000;
  const sleep = opts.sleep ?? defaultSleep;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      const t = err as TransientError;
      // Honour Retry-After when present, else exponential w/ jitter.
      const backoffMs = t.retryAfterSec
        ? Math.min(t.retryAfterSec * 1000, max)
        : Math.min(base * 2 ** i + Math.random() * 250, max);
      await sleep(backoffMs);
    }
  }
  throw lastErr;
}
