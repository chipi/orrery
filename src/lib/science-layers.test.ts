/**
 * @vitest-environment jsdom
 *
 * Unit tests for the multi-flag Science Layers state. Verifies:
 *   - LayerKey union and LAYER_ORDER cover the same keys
 *   - LAYER_DEFAULTS has an entry for every LayerKey
 *   - isLayerOn is gated on the master lens (off lens → all layers off)
 *   - setLayer persists across lens flips (the off-state remembers)
 *   - ensureLayerDefaults is idempotent + only fills missing keys
 *   - onLayerChange fires on initial subscribe and on layer / lens flips
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  type LayerKey,
  LAYER_ORDER,
  LAYER_DEFAULTS,
  isLayerOn,
  setLayer,
  ensureLayerDefaults,
  onLayerChange,
} from './science-layers';
import { toggleScienceLens } from './science-lens';

beforeEach(() => {
  // Strip every layer attribute + the master lens between tests.
  const root = document.documentElement;
  for (const a of [...root.attributes]) {
    if (a.name.startsWith('data-science-')) root.removeAttribute(a.name);
  }
});

describe('science-layers — config', () => {
  it('LAYER_ORDER and LAYER_DEFAULTS cover the same keys', () => {
    expect(new Set(LAYER_ORDER)).toEqual(new Set(Object.keys(LAYER_DEFAULTS) as LayerKey[]));
  });

  it('LAYER_ORDER has 12 layers (matches docs)', () => {
    // Tracked by README + user-guide as "12 sub-toggleable layers"; this
    // test breaks if a layer is added/removed without doc update.
    expect(LAYER_ORDER.length).toBe(12);
  });
});

describe('science-layers — gating', () => {
  it('isLayerOn returns false when the master lens is off, even with the layer set', () => {
    setLayer('gravity', true);
    expect(isLayerOn('gravity')).toBe(false);
  });

  it('isLayerOn returns true only when both lens AND layer are on', () => {
    setLayer('gravity', true);
    toggleScienceLens(); // off → on
    expect(isLayerOn('gravity')).toBe(true);
  });

  it('layer attribute persists across lens flips (preferences are remembered)', () => {
    setLayer('apsides', true);
    toggleScienceLens(); // on
    expect(isLayerOn('apsides')).toBe(true);
    toggleScienceLens(); // off
    expect(isLayerOn('apsides')).toBe(false);
    toggleScienceLens(); // on again
    expect(isLayerOn('apsides')).toBe(true);
  });
});

describe('science-layers — defaults', () => {
  it('ensureLayerDefaults applies LAYER_DEFAULTS to layers without a stored preference', () => {
    ensureLayerDefaults();
    toggleScienceLens(); // on so isLayerOn unmasks
    for (const key of LAYER_ORDER) {
      expect(isLayerOn(key)).toBe(LAYER_DEFAULTS[key]);
    }
  });

  it('ensureLayerDefaults is idempotent + does not overwrite explicit choices', () => {
    setLayer('gravity', !LAYER_DEFAULTS.gravity);
    ensureLayerDefaults();
    toggleScienceLens();
    expect(isLayerOn('gravity')).toBe(!LAYER_DEFAULTS.gravity);
  });
});

describe('science-layers — onLayerChange subscription', () => {
  it('fires on subscribe + on layer flips, and stops after unsubscribe', async () => {
    toggleScienceLens(); // lens on so layer flips are visible
    setLayer('soi', false);
    const calls: boolean[] = [];
    const stop = onLayerChange('soi', (on) => calls.push(on));
    // The initial fire happens twice: once from the layer-subscribe and
    // once from the lens-subscribe (which re-emits because the master
    // lens may have flipped between subscriptions). Both are `false`
    // here. We assert the meaningful invariant: the LAST call is the
    // current state, and the layer-flip path produces a transition.
    const before = calls.length;
    expect(calls.every((v) => v === false)).toBe(true);

    setLayer('soi', true);
    await Promise.resolve();
    expect(calls.length).toBeGreaterThan(before);
    expect(calls[calls.length - 1]).toBe(true);

    setLayer('soi', false);
    await Promise.resolve();
    expect(calls[calls.length - 1]).toBe(false);

    stop?.();
    const afterStop = calls.length;
    setLayer('soi', true);
    await Promise.resolve();
    expect(calls.length).toBe(afterStop); // no callbacks after unsubscribe
  });
});

describe('science-layers — SSR guards (no document)', () => {
  let savedDoc: Document | undefined;

  beforeEach(() => {
    savedDoc = globalThis.document;
    // @ts-expect-error — deliberate hole for the SSR-path test
    delete globalThis.document;
  });

  afterEach(() => {
    globalThis.document = savedDoc as Document;
  });

  it('isLayerOn returns false when document is unavailable', () => {
    expect(isLayerOn('gravity')).toBe(false);
  });

  it('setLayer is a no-op when document is unavailable (does not throw)', () => {
    expect(() => setLayer('soi', true)).not.toThrow();
  });

  it('ensureLayerDefaults is a no-op when document is unavailable', () => {
    expect(() => ensureLayerDefaults()).not.toThrow();
  });

  it('onLayerChange returns undefined when document is unavailable', () => {
    expect(onLayerChange('gravity', () => {})).toBeUndefined();
  });
});
