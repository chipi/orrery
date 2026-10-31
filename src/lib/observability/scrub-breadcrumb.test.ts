import { describe, expect, it } from 'vitest';
import { scrubBreadcrumb } from './scrub-breadcrumb';

describe('scrubBreadcrumb', () => {
  it('drops typed input', () => {
    expect(scrubBreadcrumb({ category: 'ui.input', message: 'hunter2' })).toBeNull();
  });

  it('strips query and hash from fetch / xhr / http urls', () => {
    for (const category of ['fetch', 'xhr', 'http']) {
      const out = scrubBreadcrumb({
        category,
        data: {
          url: 'https://lab-api.example/auth/google/callback?code=abc&state=xyz#frag',
          method: 'GET',
        },
      });
      expect(out?.data).toEqual({
        url: 'https://lab-api.example/auth/google/callback',
        method: 'GET',
      });
    }
  });

  it('strips query from both ends of a navigation', () => {
    const out = scrubBreadcrumb({
      category: 'navigation',
      data: { from: '/missions?q=apollo', to: '/fleet?id=saturn-v#specs' },
    });
    expect(out?.data).toEqual({ from: '/missions', to: '/fleet' });
  });

  it('masks email addresses in console crumbs, leaves other text', () => {
    const out = scrubBreadcrumb({
      category: 'console',
      message: '[lab-api] refresh for someone@example.com failed',
    });
    expect(out?.message).toBe('[lab-api] refresh for [email] failed');
  });

  it('leaves a crumb without urls or emails as it was', () => {
    const crumb = { category: 'ui.click', message: 'button.panel-close' };
    expect(scrubBreadcrumb(crumb)).toEqual(crumb);
  });
});
