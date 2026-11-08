import { describe, expect, it } from 'vitest';
import en from '../../messages/en-US.json';
import { SCIENCE_TABS } from './data/science';
import { scienceTabLabel, scienceTabTitle } from './science-tab-label';

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

describe('scienceTabTitle', () => {
  it('no tab title is set in capitals', () => {
    for (const tab of SCIENCE_TABS) expect(scienceTabTitle(tab)).not.toMatch(/^[A-Z &]{4,}$/);
  });

  it('uses the normal-case message where the label is in capitals', () => {
    expect(scienceTabLabel('life-in-space')).toBe('LIFE IN SPACE');
    expect(scienceTabTitle('life-in-space')).toBe('Life in Space');
  });

  it('an unknown tab falls back to the label', () => {
    expect(scienceTabTitle('dark-matter')).toBe('Dark Matter');
  });
});
