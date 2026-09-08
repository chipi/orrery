/**
 * Learn-more link integrity (L2/L3): a formula's internal `citationKey` must
 * point at a real /science article file, and its external `learnMore` must be a
 * well-formed https(-ish) URL with a known source. This is the regression guard
 * that keeps the card's "Learn more" row from ever shipping a dead link — the
 * URLs' live-200 status was verified once at curation time (curl sweep); this
 * test guards the STRUCTURE (slug exists, source in the union) on every run.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { REGISTRY } from './index';

const SCIENCE = join(process.cwd(), 'static', 'data', 'science');
const SOURCES = new Set(['hyperphysics', 'nasa-glenn', 'wikipedia']);

describe('formula learn-more links · integrity', () => {
  it('every citationKey resolves to a real /science article', () => {
    const dead: string[] = [];
    for (const f of REGISTRY.values()) {
      if (!f.citationKey) continue;
      if (!existsSync(join(SCIENCE, `${f.citationKey}.json`)))
        dead.push(`${f.id} → ${f.citationKey}`);
    }
    expect(dead, `dead internal citations:\n${dead.join('\n')}`).toEqual([]);
  });

  it('every learnMore has a known source and an http(s) URL', () => {
    const bad: string[] = [];
    for (const f of REGISTRY.values()) {
      if (!f.learnMore) continue;
      if (!SOURCES.has(f.learnMore.source)) bad.push(`${f.id}: source '${f.learnMore.source}'`);
      if (!/^https?:\/\/\S+$/.test(f.learnMore.url)) bad.push(`${f.id}: url '${f.learnMore.url}'`);
    }
    expect(bad, `malformed learn-more:\n${bad.join('\n')}`).toEqual([]);
  });

  it('every formula carries an external learn-more; internal-citation count holds the ratchet', () => {
    const withLearnMore = [...REGISTRY.values()].filter((f) => f.learnMore).length;
    const withCitation = [...REGISTRY.values()].filter((f) => f.citationKey).length;
    // Every card must offer at least the external "Learn more" link.
    expect(withLearnMore).toBe(REGISTRY.size);
    // Internal /science coverage is a frozen floor — new formulas add to it, never below.
    expect(withCitation).toBeGreaterThanOrEqual(52);
  });
});
