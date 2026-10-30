import { describe, expect, it } from 'vitest';
import { compare, scanSource } from './hardcoded-english.mjs';

// Every user-facing string in Svelte markup goes through messages/ (14 locales). A new
// hard-coded English string fails here: move it to a message, or — if it is not prose
// (a key cap, an acronym, a source name) — add it to hardcoded-english-allowlist.json with
// the reason. Run `node scripts/i18n-tools/hardcoded-english.mjs` to see the list.
describe('hard-coded English in Svelte markup', () => {
  const { unexpected, stale } = compare();
  it('has no strings outside messages/ and the allowlist', () => {
    expect(unexpected).toEqual([]);
  });
  it('has no allowlist entries that no longer occur', () => {
    expect(stale).toEqual([]);
  });
});

describe('scanSource', () => {
  const kinds = (src: string) => scanSource('x.svelte', src).map((h) => `${h.kind}|${h.text}`);
  it('finds text, attributes, label props and literals in expressions', () => {
    expect(
      kinds(
        `<p>Loading fleet…</p><img alt="hero image" /><Chip label="Orbit regimes" />` +
          `<span>{on ? 'CAPTURE BURN' : x}</span><b>HOTSPOTS</b>`,
      ),
    ).toEqual([
      'text|Loading fleet…',
      '@alt|hero image',
      '@label|Orbit regimes',
      'expr-literal|CAPTURE BURN',
      'text|HOTSPOTS',
    ]);
  });
  it('leaves messages, units, acronyms, class names and comparisons alone', () => {
    expect(
      kinds(
        `<p>{m.x()}</p><span>12 km · ISS</span><div class={a ? 'is-open' : 'closed-x'}></div>` +
          `{#if mode === 'Ballistic'}<i></i>{/if}`,
      ),
    ).toEqual([]);
  });
  it('skips developer-only blocks', () => {
    expect(
      kinds(
        `{#if debugOn}<p>COAST CAMERA</p>{/if}{#snippet flyDebugContent()}<p>Trajectory not yet loaded.</p>{/snippet}` +
          `<DebugPanelRegistrar label="FLY" />`,
      ),
    ).toEqual([]);
  });
});
