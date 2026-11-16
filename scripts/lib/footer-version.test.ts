import { describe, expect, it } from 'vitest';
import { formatDisplayVersion as appLabel } from '../../src/lib/version';
import { compareFooterVersion, formatDisplayVersion } from './footer-version.mjs';

describe('footer-version (validate-prod gate)', () => {
  it('formats the label exactly like the app footer', () => {
    for (const raw of [
      '0.9.8',
      '0.9.0',
      '0.8.0-wip',
      '0.8.0-2026-07-30-1',
      '1.0.0',
      '0.7.3-rc.1',
    ]) {
      expect(formatDisplayVersion(raw)).toBe(appLabel(raw));
    }
  });

  it('passes when the footer shows package.json version', () => {
    expect(compareFooterVersion('v0.9.9', '0.9.9').ok).toBe(true);
    expect(compareFooterVersion(' v0.10 \n', '0.10.0').ok).toBe(true);
  });

  it('fails when the footer shows the previous release (the 0.9.8 incident)', () => {
    const r = compareFooterVersion('v0.9.7', '0.9.8');
    expect(r.ok).toBe(false);
    expect(r.expected).toBe('v0.9.8');
    expect(r.actual).toBe('v0.9.7');
  });

  it('fails on an empty or missing footer', () => {
    expect(compareFooterVersion('', '0.9.8').ok).toBe(false);
    expect(compareFooterVersion(null, '0.9.8').ok).toBe(false);
    expect(compareFooterVersion(undefined, '0.9.8').ok).toBe(false);
  });
});
