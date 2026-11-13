import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THUMB_NEUTRAL_RING, ringColor, thumbOf } from '$lib/entity-thumb';
import { INTERSTELLAR_CRAFT, PATHS_LEGEND, iconicTagline } from './paths-legend';

describe('PATHS legend', () => {
  it('has 18 rows with unique mission ids and colours', () => {
    expect(PATHS_LEGEND).toHaveLength(18);
    expect(new Set(PATHS_LEGEND.map((r) => r.mission_id)).size).toBe(18);
    expect(new Set(PATHS_LEGEND.map((r) => r.color)).size).toBe(18);
  });

  it('is ordered oldest -> newest by launch year', () => {
    const years = PATHS_LEGEND.map((r) => r.launch_year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it('every row has a tagline; unknown ids get none', () => {
    for (const r of PATHS_LEGEND) expect(iconicTagline(r.mission_id), r.mission_id).not.toBe('');
    expect(iconicTagline('not-a-mission')).toBe('');
  });

  // C7: the legend title, its (i) popover and the hover card read these keys in every locale
  // (the generic message-parity tests only compare key sets, not that a row's key exists).
  it('every tagline, the title and the (i) text exist in all 14 locales', () => {
    const dir = resolve(__dirname, '../../../messages');
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(14);
    const keys = [
      ...PATHS_LEGEND.map((r) => `explore_iconic_tagline_${r.mission_id.replace(/-/g, '_')}`),
      'explore_iconic_tagline_placeholder',
      'explore_why_plane',
      'explore_why_plane_body',
    ];
    for (const f of files) {
      const msgs = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as Record<string, string>;
      for (const k of keys) expect(msgs[k]?.trim(), `${f} ${k}`).toBeTruthy();
      // the (i) is the popover trigger now: the title no longer carries the glyph
      expect(msgs.explore_why_plane, f).not.toContain('ⓘ');
    }
  });

  // L45-T3b (UXD-025): the round photo leads each row, ringed in the path colour.
  it('every row has a mission thumb on disk, ringed in its path colour (Voyager 2 neutral)', () => {
    for (const r of PATHS_LEGEND) {
      const src = thumbOf('missions', r.mission_id);
      expect(src, r.mission_id).not.toBeNull();
      expect(existsSync(resolve(__dirname, '../../../static', src!.slice(1))), src!).toBe(true);
      expect(ringColor(r.color), r.mission_id).toBe(
        r.mission_id === 'voyager-2' ? THUMB_NEUTRAL_RING : r.color,
      );
    }
  });

  it('every interstellar craft is a legend row', () => {
    const ids = new Set(PATHS_LEGEND.map((r) => r.mission_id));
    for (const c of INTERSTELLAR_CRAFT) expect(ids.has(c), c).toBe(true);
  });
});
