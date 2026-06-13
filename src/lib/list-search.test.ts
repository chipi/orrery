import { describe, expect, it } from 'vitest';
import { matchesQuery } from './list-search';

describe('matchesQuery', () => {
  describe('empty / no-op queries', () => {
    it('empty string returns true (no search active)', () => {
      expect(matchesQuery(['Apollo 11', 'NASA'], '')).toBe(true);
    });

    it('whitespace-only string returns true (no search active)', () => {
      expect(matchesQuery(['Apollo 11', 'NASA'], '   ')).toBe(true);
      expect(matchesQuery(['Apollo 11'], '\t\n')).toBe(true);
    });

    it('empty haystack with empty query still returns true', () => {
      expect(matchesQuery([], '')).toBe(true);
    });
  });

  describe('substring matching', () => {
    it('matches a substring at the start of a field', () => {
      expect(matchesQuery(['Apollo 11', 'NASA'], 'apo')).toBe(true);
    });

    it('matches a substring in the middle of a field', () => {
      expect(matchesQuery(['Apollo 11', 'NASA'], 'ollo')).toBe(true);
    });

    it('matches a substring at the end of a field', () => {
      expect(matchesQuery(['Apollo 11', 'NASA'], '11')).toBe(true);
    });

    it('no match when the query is not a substring of any field', () => {
      expect(matchesQuery(['Apollo 11', 'NASA'], 'gemini')).toBe(false);
    });

    it('empty haystack with non-empty query returns false', () => {
      expect(matchesQuery([], 'apollo')).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('upper-case query matches lower-case field', () => {
      expect(matchesQuery(['apollo 11'], 'APOLLO')).toBe(true);
    });

    it('lower-case query matches upper-case field', () => {
      expect(matchesQuery(['APOLLO 11'], 'apollo')).toBe(true);
    });

    it('mixed-case query matches mixed-case field', () => {
      expect(matchesQuery(['Cassini-Huygens'], 'huyGENS')).toBe(true);
    });
  });

  describe('multi-field haystack', () => {
    it('matches when the substring lives in the second field', () => {
      expect(matchesQuery(['Apollo 11', 'NASA'], 'nasa')).toBe(true);
    });

    it('matches when the substring lives in a later field', () => {
      expect(matchesQuery(['Voyager 2', 'NASA', 'FLYBY', 'Grand Tour'], 'grand')).toBe(true);
    });

    it('first match wins (short-circuit)', () => {
      // Behavioural — the function doesn't expose which field matched,
      // but it returns true on any hit. Locks the OR semantics.
      expect(matchesQuery(['Apollo', 'Apollo', 'Apollo'], 'apollo')).toBe(true);
    });
  });

  describe('null / undefined-tolerant haystack', () => {
    it('skips null fields without matching them', () => {
      expect(matchesQuery([null, 'NASA'], 'nasa')).toBe(true);
      expect(matchesQuery([null, 'NASA'], 'null')).toBe(false);
    });

    it('skips undefined fields without matching them', () => {
      expect(matchesQuery([undefined, 'Apollo'], 'apollo')).toBe(true);
      expect(matchesQuery([undefined, 'Apollo'], 'undefined')).toBe(false);
    });

    it('all-null haystack with non-empty query returns false', () => {
      expect(matchesQuery([null, null, undefined], 'anything')).toBe(false);
    });
  });

  describe('query whitespace trim', () => {
    it('trims leading + trailing whitespace before matching', () => {
      expect(matchesQuery(['Apollo 11'], '  apollo  ')).toBe(true);
    });

    it('preserves internal whitespace as part of the needle', () => {
      // "Apollo 11" contains "apollo 11" — internal space matters.
      expect(matchesQuery(['Apollo 11'], 'apollo 11')).toBe(true);
      // "Apollo11" does NOT contain "apollo 11" (no space in haystack).
      expect(matchesQuery(['Apollo11'], 'apollo 11')).toBe(false);
    });
  });
});
