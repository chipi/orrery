import { describe, expect, it } from 'vitest';
import { createStoryAutopromoteTracker } from './story-autopromote';

describe('createStoryAutopromoteTracker', () => {
  it('returns true exactly once on the tierContext null→active edge', () => {
    const t = createStoryAutopromoteTracker();
    // First call with tierContext off → no promotion.
    expect(
      t.check({
        tierContextActive: false,
        selectedId: 'apollo11',
        hasStory: true,
        currentTab: 'overview',
      }),
    ).toBe(false);
    // First flip on → promote.
    expect(
      t.check({
        tierContextActive: true,
        selectedId: 'apollo11',
        hasStory: true,
        currentTab: 'overview',
      }),
    ).toBe(true);
    // Stays on, same site → no re-promote.
    expect(
      t.check({
        tierContextActive: true,
        selectedId: 'apollo11',
        hasStory: true,
        currentTab: 'overview',
      }),
    ).toBe(false);
  });

  it('does not promote when no story exists', () => {
    const t = createStoryAutopromoteTracker();
    expect(
      t.check({
        tierContextActive: true,
        selectedId: 'luna16',
        hasStory: false,
        currentTab: 'overview',
      }),
    ).toBe(false);
  });

  it('does not promote when no site selected', () => {
    const t = createStoryAutopromoteTracker();
    expect(
      t.check({
        tierContextActive: true,
        selectedId: null,
        hasStory: true,
        currentTab: 'overview',
      }),
    ).toBe(false);
  });

  it('does not promote when user is on a non-overview tab', () => {
    const t = createStoryAutopromoteTracker();
    expect(
      t.check({
        tierContextActive: true,
        selectedId: 'apollo11',
        hasStory: true,
        currentTab: 'gallery',
      }),
    ).toBe(false);
  });

  it('does not re-promote on the same site after a cycle off/on', () => {
    const t = createStoryAutopromoteTracker();
    t.check({
      tierContextActive: true,
      selectedId: 'apollo11',
      hasStory: true,
      currentTab: 'overview',
    });
    t.check({
      tierContextActive: false,
      selectedId: 'apollo11',
      hasStory: true,
      currentTab: 'overview',
    });
    expect(
      t.check({
        tierContextActive: true,
        selectedId: 'apollo11',
        hasStory: true,
        currentTab: 'overview',
      }),
    ).toBe(false);
  });

  it('suppressFor pins a site as already-promoted without switching', () => {
    const t = createStoryAutopromoteTracker();
    // Deep-link path: suppress before any tier activation.
    t.suppressFor('apollo11');
    // tierContext now flips on for the suppressed site → no promote.
    expect(
      t.check({
        tierContextActive: true,
        selectedId: 'apollo11',
        hasStory: true,
        currentTab: 'overview',
      }),
    ).toBe(false);
  });

  it('suppressFor only pins the named site — others still promote', () => {
    const t = createStoryAutopromoteTracker();
    t.suppressFor('apollo11');
    // A different (non-deep-linked) site still auto-promotes normally.
    expect(
      t.check({
        tierContextActive: true,
        selectedId: 'curiosity',
        hasStory: true,
        currentTab: 'overview',
      }),
    ).toBe(true);
  });

  it('promotes again when a different site flips on', () => {
    const t = createStoryAutopromoteTracker();
    t.check({
      tierContextActive: true,
      selectedId: 'apollo11',
      hasStory: true,
      currentTab: 'overview',
    });
    // Switch to a different site — tierContext briefly off then on.
    t.check({
      tierContextActive: false,
      selectedId: 'curiosity',
      hasStory: true,
      currentTab: 'overview',
    });
    expect(
      t.check({
        tierContextActive: true,
        selectedId: 'curiosity',
        hasStory: true,
        currentTab: 'overview',
      }),
    ).toBe(true);
  });
});
