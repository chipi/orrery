import { describe, expect, it } from 'vitest';
import { redactEmail } from './redact';

describe('redactEmail (#597)', () => {
  it('keeps the domain and drops the local part', () => {
    const r = redactEmail('ada.lovelace@example.org');
    expect(r).toMatch(/^[0-9a-f]{8}@example\.org$/);
    expect(r).not.toContain('ada');
  });

  it('is stable across case and surrounding space, so repeats still match', () => {
    expect(redactEmail(' Ada@Example.org ')).toBe(redactEmail('ada@example.org'));
  });

  it('differs for different addresses on one domain', () => {
    expect(redactEmail('a@example.org')).not.toBe(redactEmail('b@example.org'));
  });

  it('handles a value with no @', () => {
    expect(redactEmail('not-an-email')).toMatch(/^[0-9a-f]{8}@\?$/);
  });
});
