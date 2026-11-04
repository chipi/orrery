import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/locale', () => ({ localHref: (p: string) => `/de${p}` }));

const { parseInline } = await import('./science-inline');

describe('parseInline', () => {
  it('returns plain text unchanged', () => {
    expect(parseInline('no links here')).toEqual([{ kind: 'text', value: 'no links here' }]);
  });

  it('links /science sections and app routes, keeping the query, through localHref', () => {
    expect(parseInline('See [LRO](app:/fleet?id=lro) and [regolith](planets/regolith).')).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'link', text: 'LRO', href: '/de/fleet?id=lro' },
      { kind: 'text', value: ' and ' },
      { kind: 'link', text: 'regolith', href: '/de/science/planets/regolith' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('leaves brackets that are not a link alone', () => {
    expect(parseInline('a [note] (aside)')).toEqual([{ kind: 'text', value: 'a [note] (aside)' }]);
  });
});
