import { describe, expect, it } from 'vitest';
import { TRANSLATED_LOCALES } from '../lib/locales.mjs';
import { compare, readBaseline } from './ui-label-audit.mjs';

// Ratchet over messages/<loc>.json (scripts/i18n-tools/ui-label-baseline.json): a new
// defect or a new label with two translations fails, and so does a baseline entry
// that was fixed — prune it with `node scripts/i18n-tools/ui-label-audit.mjs all --prune`.
const baseline = readBaseline();

describe.each(TRANSLATED_LOCALES)('UI strings — %s', (loc) => {
  const r = compare(loc, baseline);
  it('has no new defects (problems() with the UI-label checks)', () => {
    expect(r.newDefects).toEqual([]);
  });
  it('has no fixed defects still listed in the baseline', () => {
    expect(r.staleDefects).toEqual([]);
  });
  it('translates each short English label one way, unless the baseline says why not', () => {
    expect(r.newVariants).toEqual([]);
  });
  it('has no resolved label variants still listed in the baseline', () => {
    expect(r.staleVariants).toEqual([]);
  });
});

describe('ui-senses.json', () => {
  it('names only keys that exist in messages/en-US.json', async () => {
    const fs = await import('node:fs');
    const senses = JSON.parse(fs.readFileSync('scripts/i18n-tools/ui-senses.json', 'utf8'));
    const en = JSON.parse(fs.readFileSync('messages/en-US.json', 'utf8'));
    expect(Object.keys(senses).filter((k) => !k.startsWith('_') && !(k in en))).toEqual([]);
  });
});
