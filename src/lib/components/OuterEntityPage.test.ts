import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/explore/galaxies/lmc') } }));
vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/paths', () => ({ base: '' }));

import OuterEntityPage from './OuterEntityPage.svelte';
import { openInOrreryPath, relatedSections } from '$lib/explore/outer-page';

const data = {
  text: {
    fact: 'The Large Magellanic Cloud, a satellite of the Milky Way.',
    bio: 'It holds the Tarantula Nebula.',
    links: [{ l: 'Wikipedia', u: 'https://en.wikipedia.org/wiki/Large_Magellanic_Cloud' }],
  },
  path: '/explore/galaxies/lmc',
  title: 'Large Magellanic Cloud',
  kind: 'Irregular galaxy',
  rows: [
    { label: 'Membership', value: 'Satellite of the Milky Way' },
    {
      label: 'Distance',
      value: '163,000 ly',
      src: { label: 'McConnachie 2012', url: 'https://vizier.cds.unistra.fr/x' },
    },
  ],
  sources: [],
  sections: relatedSections([
    {
      kind: 'part-of',
      links: [
        { href: '/explore/galaxies/milky-way', name: 'Milky Way' },
        { href: '/explore/structures/local-group', name: 'Local Group' },
      ],
    },
  ]),
  openPath: openInOrreryPath('local-group', 'lmc'),
};
const html = (d = data) => render(OuterEntityPage, { props: { data: d } });

describe('OuterEntityPage (ADR-096 item 18)', () => {
  it('shows the fact as the lede, the bio, the rows with their catalogue link and one h1', () => {
    const { body } = html();
    expect(body.match(/<h1/g)).toHaveLength(1);
    expect(body).toContain('Large Magellanic Cloud</h1>');
    expect(body).toContain('The Large Magellanic Cloud, a satellite of the Milky Way.');
    expect(body).toContain('It holds the Tarantula Nebula.');
    expect(body).toContain('163,000 ly');
    expect(body).toContain('href="https://vizier.cds.unistra.fr/x"');
    expect(body).toContain('Irregular galaxy');
  });

  it('lists the Related links as real anchors under their heading', () => {
    const { body } = html();
    expect(body).toContain('Part of</h2>');
    expect(body).toContain('href="/explore/galaxies/milky-way"');
    expect(body).toContain('href="/explore/structures/local-group"');
    expect(body).not.toContain('Members</h2>');
  });

  it('opens the scene on its scale with the member picked, and links learn-more out', () => {
    const { body } = html();
    expect(body).toContain('href="/explore?context=local-group&amp;pick=lmc"');
    expect(body).toContain('href="https://en.wikipedia.org/wiki/Large_Magellanic_Cloud"');
  });

  it('puts an article and a breadcrumbList in the head, and a title and description', () => {
    const { head } = html();
    expect(head).toContain('"@type":"Article"');
    expect(head).toContain('"@type":"BreadcrumbList"');
    expect(head).toContain('<title>Large Magellanic Cloud');
    expect(head).toContain('name="description"');
  });

  it('draws no rows block and no Related section when there are none', () => {
    const { body } = html({ ...data, rows: [], sections: [] });
    expect(body).not.toContain('class="facts"');
    expect(body).not.toContain('class="related"');
  });
});

describe('relatedSections and openInOrreryPath', () => {
  it('heads each group in the reader’s language and keeps its links', () => {
    const s = relatedSections([
      { kind: 'members', links: [{ href: '/explore/galaxies/lmc', name: 'LMC' }] },
      { kind: 'same-scale', links: [{ href: '/explore/structures/m81-group', name: 'M81' }] },
    ]);
    expect(s.map((x) => x.heading)).toEqual(['Members', 'Also at this scale']);
    expect(s[0].links).toHaveLength(1);
  });

  it('is the ?context=&pick= link the scene reads (UXD-019)', () => {
    expect(openInOrreryPath('cosmic-web', 'laniakea')).toBe(
      '/explore?context=cosmic-web&pick=laniakea',
    );
  });
});
