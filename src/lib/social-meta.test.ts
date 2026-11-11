import { describe, it, expect } from 'vitest';
import { addSocialMeta, ogTitle, DEFAULT_OG_IMAGE } from './social-meta';
import { SITE_ORIGIN } from './seo';

const page = (head: string) => `<html><head>${head}</head><body></body></html>`;
const ALT = 'Orrery poster';

describe('ogTitle', () => {
  it('drops the trailing brand', () => {
    expect(ogTitle('Mars Map · Orrery')).toBe('Mars Map');
    expect(ogTitle('Privacy — Orrery')).toBe('Privacy');
    expect(ogTitle('Orrery · A solar system explorer')).toBe('Orrery · A solar system explorer');
  });
});

describe('addSocialMeta', () => {
  it('derives og + twitter tags from title, description and canonical', () => {
    const out = addSocialMeta(
      page(
        `<title>Mars Map · Orrery</title><meta name="description" content="Every lander."/><link rel="canonical" href="${SITE_ORIGIN}/de/mars"/>`,
      ),
      ALT,
    );
    expect(out).toContain('<meta property="og:title" content="Mars Map"/>');
    expect(out).toContain('<meta property="og:description" content="Every lander."/>');
    expect(out).toContain(`<meta property="og:url" content="${SITE_ORIGIN}/de/mars"/>`);
    expect(out).toContain('<meta property="og:type" content="website"/>');
    expect(out).toContain(`<meta property="og:image" content="${DEFAULT_OG_IMAGE}"/>`);
    expect(out).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    expect(out).toContain(`<meta name="twitter:image:alt" content="${ALT}"/>`);
    expect(out.indexOf('og:title')).toBeLessThan(out.indexOf('</head>'));
  });

  it('marks essays, programs and science sections as articles, in any locale', () => {
    for (const path of [
      '/essays/delta-v',
      '/ja/programs/apollo',
      '/sr-Cyrl/science/orbits/vis-viva',
    ])
      expect(
        addSocialMeta(
          page(`<title>X</title><link rel="canonical" href="${SITE_ORIGIN}${path}"/>`),
          ALT,
        ),
      ).toContain('content="article"');
    for (const path of ['/essays', '/science/orbits', '/'])
      expect(
        addSocialMeta(
          page(`<title>X</title><link rel="canonical" href="${SITE_ORIGIN}${path}"/>`),
          ALT,
        ),
      ).toContain('og:type" content="website"');
  });

  it('escapes quotes from the title text', () => {
    expect(addSocialMeta(page('<title>The "Grand Tour"</title>'), ALT)).toContain(
      'content="The &quot;Grand Tour&quot;"',
    );
  });

  it('keeps a page-provided og:image and does not add the default', () => {
    const out = addSocialMeta(
      page('<title>X</title><meta property="og:image" content="https://x/hero.jpg"/>'),
      ALT,
    );
    expect(out).not.toContain(DEFAULT_OG_IMAGE);
    expect(out).toContain('<meta name="twitter:image" content="https://x/hero.jpg"/>');
  });

  it('leaves pages with their own og:title, no title, or no head untouched', () => {
    const stub = page('<title>X</title><meta property="og:title" content="X"/>');
    expect(addSocialMeta(stub, ALT)).toBe(stub);
    const untitled = page('<meta charset="utf-8"/>');
    expect(addSocialMeta(untitled, ALT)).toBe(untitled);
    expect(addSocialMeta('<p>chunk</p>', ALT)).toBe('<p>chunk</p>');
  });

  it('omits og:url and descriptions it does not have (staging mirror, no description)', () => {
    const out = addSocialMeta(page('<title>X</title>'), ALT);
    expect(out).not.toContain('og:url');
    expect(out).not.toContain('og:description');
  });
});
