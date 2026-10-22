import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { canonicalId } from './retired-ids';

describe('canonicalId', () => {
  it('sends a merged id to the surviving entry', () => {
    expect(canonicalId('gagarins-start')).toBe('baikonur-1-5');
  });
  it('leaves other ids alone', () => {
    expect(canonicalId('baikonur-1-5')).toBe('baikonur-1-5');
    expect(canonicalId('lc-39a')).toBe('lc-39a');
  });
  it('the surviving entry exists and the retired one is gone', () => {
    expect(existsSync('static/data/fleet/launch-site/baikonur-1-5.json')).toBe(true);
    expect(existsSync('static/data/fleet/launch-site/gagarins-start.json')).toBe(false);
  });
});
