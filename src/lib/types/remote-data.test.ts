import { describe, it, expect } from 'vitest';
import {
  type RemoteData,
  loading,
  error,
  success,
  isLoading,
  isError,
  isSuccess,
  map,
  fold,
} from './remote-data';

describe('RemoteData — constructors', () => {
  it('loading() returns the canonical loading variant', () => {
    const rd = loading<Error, number>();
    expect(rd).toEqual({ type: 'loading' });
  });

  it('loading() returns a shared singleton (zero allocation per call)', () => {
    // Constructors fire on every fetch start; sharing the loading
    // sentinel keeps the hot path allocation-free.
    expect(loading<Error, number>()).toBe(loading<string, string[]>());
  });

  it('error(e) carries the supplied error value', () => {
    const e = new Error('fetch failed');
    const rd = error<Error, number>(e);
    expect(rd).toEqual({ type: 'error', error: e });
    // Identity-preserved, not cloned — preserves stack traces.
    if (rd.type === 'error') expect(rd.error).toBe(e);
  });

  it('success(data) carries the supplied payload', () => {
    const data = [1, 2, 3];
    const rd = success<Error, number[]>(data);
    expect(rd).toEqual({ type: 'success', data });
    if (rd.type === 'success') expect(rd.data).toBe(data);
  });
});

describe('RemoteData — type guards', () => {
  it('isLoading discriminates only the loading variant', () => {
    expect(isLoading(loading())).toBe(true);
    expect(isLoading(error(new Error('x')))).toBe(false);
    expect(isLoading(success(42))).toBe(false);
  });

  it('isError discriminates only the error variant', () => {
    expect(isError(loading())).toBe(false);
    expect(isError(error(new Error('x')))).toBe(true);
    expect(isError(success(42))).toBe(false);
  });

  it('isSuccess discriminates only the success variant', () => {
    expect(isSuccess(loading())).toBe(false);
    expect(isSuccess(error(new Error('x')))).toBe(false);
    expect(isSuccess(success(42))).toBe(true);
  });

  it('isError narrows so .error access compiles without a cast', () => {
    const rd: RemoteData<Error, number> = error(new Error('boom'));
    if (isError(rd)) {
      // Compile check: rd.error must be typed Error in this branch,
      // not `unknown`. The expect-call below verifies the runtime path
      // matches; tsc verifies the static path.
      expect(rd.error.message).toBe('boom');
    } else {
      throw new Error('isError narrowing failed');
    }
  });

  it('isSuccess narrows so .data access compiles without a cast', () => {
    const rd: RemoteData<Error, number[]> = success([1, 2, 3]);
    if (isSuccess(rd)) {
      expect(rd.data.length).toBe(3);
    } else {
      throw new Error('isSuccess narrowing failed');
    }
  });
});

describe('RemoteData — map', () => {
  it('transforms the success-branch data', () => {
    const rd: RemoteData<Error, number[]> = success([1, 2, 3]);
    const next = map(rd, (xs) => xs.length);
    expect(next).toEqual({ type: 'success', data: 3 });
  });

  it('passes loading through unchanged', () => {
    const rd: RemoteData<Error, number> = loading();
    const next = map(rd, (n) => n * 2);
    expect(next).toEqual({ type: 'loading' });
    // Identity preserved so the loading sentinel stays shared.
    expect(next).toBe(rd);
  });

  it('passes error through unchanged', () => {
    const e = new Error('fail');
    const rd: RemoteData<Error, number> = error(e);
    const next = map(rd, (n) => n * 2);
    expect(next).toEqual({ type: 'error', error: e });
    expect(next).toBe(rd);
  });

  it('changes the success type parameter', () => {
    // Compile-time: U inferred from fn's return; T's type is gone.
    const rd: RemoteData<Error, number> = success(42);
    const next: RemoteData<Error, string> = map(rd, (n) => `count: ${n}`);
    if (isSuccess(next)) expect(next.data).toBe('count: 42');
  });
});

describe('RemoteData — fold', () => {
  it('dispatches to the loading case', () => {
    const rd: RemoteData<Error, number[]> = loading();
    const out = fold(rd, {
      loading: () => 'spinner',
      error: () => 'banner',
      success: () => 'list',
    });
    expect(out).toBe('spinner');
  });

  it('dispatches to the error case with the error value', () => {
    const rd: RemoteData<Error, number[]> = error(new Error('fetch failed'));
    const out = fold(rd, {
      loading: () => 'spinner',
      error: (e) => `banner: ${e.message}`,
      success: () => 'list',
    });
    expect(out).toBe('banner: fetch failed');
  });

  it('dispatches to the success case with the data value', () => {
    const rd: RemoteData<Error, number[]> = success([1, 2, 3]);
    const out = fold(rd, {
      loading: () => 'spinner',
      error: () => 'banner',
      success: (xs) => `list: ${xs.length}`,
    });
    expect(out).toBe('list: 3');
  });

  it('return type is the case-handler return type, not RemoteData', () => {
    // Type-level check: fold lets you produce a plain value (number,
    // JSX, aria-label) without staying inside the RemoteData type.
    const rd: RemoteData<string, number> = success(7);
    const ariaLabel: string = fold(rd, {
      loading: () => 'Loading',
      error: (msg) => `Error: ${msg}`,
      success: (n) => `Loaded ${n} items`,
    });
    expect(ariaLabel).toBe('Loaded 7 items');
  });
});

describe('RemoteData — impossible-state guard', () => {
  it('the discriminated union admits exactly three shapes', () => {
    // Compile-time test: switch exhaustiveness. If a new variant is
    // added without updating fold, the assertNever below will fail to
    // typecheck. Easier to read than a type-level expect-type.
    const variants: RemoteData<Error, number>[] = [loading(), error(new Error('x')), success(42)];
    for (const v of variants) {
      switch (v.type) {
        case 'loading':
        case 'error':
        case 'success':
          break;
        default: {
          const exhaustive: never = v;
          throw new Error(`unreachable: ${String(exhaustive)}`);
        }
      }
    }
    expect(variants.length).toBe(3);
  });
});
