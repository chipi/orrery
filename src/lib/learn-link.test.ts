import { describe, expect, it } from 'vitest';
import { canonicaliseLinkUrl } from '$lib/link-provenance';

// ADR-051 Milestone L-B — URL canonicalisation contract.
// Mirrors scripts/build-link-provenance.ts so author-time `<a href>`
// strings resolve to the same key the manifest builder writes.

describe('canonicaliseLinkUrl', () => {
  it('strips utm_* tracker params', () => {
    expect(
      canonicaliseLinkUrl('https://example.com/x?utm_source=newsletter&utm_medium=email'),
    ).toBe('https://example.com/x');
  });

  it('strips fbclid', () => {
    expect(canonicaliseLinkUrl('https://example.com/x?fbclid=abc')).toBe('https://example.com/x');
  });

  it('preserves non-tracker query params', () => {
    expect(canonicaliseLinkUrl('https://example.com/x?id=42&utm_source=foo')).toBe(
      'https://example.com/x?id=42',
    );
  });

  it('strips AMP suffix', () => {
    expect(canonicaliseLinkUrl('https://example.com/article/amp')).toBe(
      'https://example.com/article',
    );
    expect(canonicaliseLinkUrl('https://example.com/article/amp/')).toBe(
      'https://example.com/article',
    );
  });

  it('strips m. mobile prefix on encyclopedic and agency hosts', () => {
    expect(canonicaliseLinkUrl('https://m.wikipedia.org/wiki/Mars')).toBe(
      'https://wikipedia.org/wiki/Mars',
    );
    expect(canonicaliseLinkUrl('https://m.nasa.gov/foo')).toBe('https://nasa.gov/foo');
  });

  it('preserves m. prefix on unrelated hosts', () => {
    expect(canonicaliseLinkUrl('https://m.media-amazon.com/x')).toBe(
      'https://m.media-amazon.com/x',
    );
  });

  it('strips URL fragment', () => {
    expect(canonicaliseLinkUrl('https://example.com/x#section')).toBe('https://example.com/x');
  });

  it('returns the input unchanged on parse failure', () => {
    expect(canonicaliseLinkUrl('not-a-url')).toBe('not-a-url');
  });

  it('is idempotent', () => {
    const url = 'https://en.wikipedia.org/wiki/Mars?utm_source=foo';
    const once = canonicaliseLinkUrl(url);
    const twice = canonicaliseLinkUrl(once);
    expect(twice).toBe(once);
  });
});
