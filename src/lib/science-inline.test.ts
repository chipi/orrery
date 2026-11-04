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

  it('takes a target starting with / as a site path (no doubled /science/)', () => {
    expect(parseInline('[Isp](/science/propulsion/specific-impulse)')).toEqual([
      { kind: 'link', text: 'Isp', href: '/de/science/propulsion/specific-impulse' },
    ]);
  });

  it('links glossary terms at their offset in the plain text, after an author link too', () => {
    // plain text: "A burn at perigee, see Hohmann; perigee again."
    const para = 'A burn at perigee, see [Hohmann](transfers/hohmann-transfer); perigee again.';
    expect(
      parseInline(para, [
        ['burn', 2, 'burn'],
        ['perigee', 10, 'perigee'],
      ]),
    ).toEqual([
      { kind: 'text', value: 'A ' },
      { kind: 'term', text: 'burn', href: '/de/science/glossary#burn' },
      { kind: 'text', value: ' at ' },
      { kind: 'term', text: 'perigee', href: '/de/science/glossary#perigee' },
      { kind: 'text', value: ', see ' },
      { kind: 'link', text: 'Hohmann', href: '/de/science/transfers/hohmann-transfer' },
      { kind: 'text', value: '; perigee again.' },
    ]);
    expect(parseInline(para, [['perigee', 32, 'perigee']])[3]).toEqual({
      kind: 'term',
      text: 'perigee',
      href: '/de/science/glossary#perigee',
    });
  });

  it('never links inside an author link, and drops a term whose text moved', () => {
    const para = 'See [Hohmann transfer](transfers/hohmann-transfer).';
    expect(parseInline(para, [['hohmann-transfer', 4, 'Hohmann transfer']])).toEqual(
      parseInline(para),
    );
    expect(parseInline('a burn here', [['burn', 3, 'burn']])).toEqual([
      { kind: 'text', value: 'a burn here' },
    ]);
  });

  it('leaves brackets that are not a link alone', () => {
    expect(parseInline('a [note] (aside)')).toEqual([{ kind: 'text', value: 'a [note] (aside)' }]);
  });
});
