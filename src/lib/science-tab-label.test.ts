import { describe, expect, it } from 'vitest';
import en from '../../messages/en-US.json';
import { SCIENCE_TABS } from './data/science';
import { scienceTabLabel } from './science-tab-label';

describe('scienceTabLabel', () => {
  it('every /science tab has its own message, not the slug fallback', () => {
    const msgs = en as Record<string, string>;
    for (const tab of SCIENCE_TABS)
      expect(scienceTabLabel(tab)).toBe(msgs[`science_tab_${tab.replace(/-/g, '_')}`]);
  });

  it('an unknown tab falls back to its title-cased slug', () => {
    expect(scienceTabLabel('dark-matter')).toBe('Dark Matter');
  });
});
