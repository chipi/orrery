import { describe, it, expect } from 'vitest';
import {
  SITE_ORIGIN,
  canonicalRoute,
  localizedPath,
  canonicalUrl,
  hreflangAlternates,
  isMirrorBuild,
  metaDescription,
  ogLocale,
  pageTitle,
  ogLocaleAlternates,
} from './seo';
import { SUPPORTED_LOCALES } from './locale';

describe('canonicalRoute', () => {
  it('leaves an un-prefixed en-US route unchanged', () => {
    expect(canonicalRoute('/missions')).toBe('/missions');
    expect(canonicalRoute('/')).toBe('/');
  });

  it('strips a non-default locale prefix', () => {
    expect(canonicalRoute('/de/missions')).toBe('/missions');
    expect(canonicalRoute('/ja/science/physics/kepler')).toBe('/science/physics/kepler');
  });

  it('reduces a localized landing (trailing slash) to root', () => {
    expect(canonicalRoute('/de/')).toBe('/');
    expect(canonicalRoute('/sr-Cyrl/')).toBe('/');
  });

  it('strips the SvelteKit base prefix (GH Pages)', () => {
    expect(canonicalRoute('/orrery/de/missions', '/orrery')).toBe('/missions');
    expect(canonicalRoute('/orrery/missions', '/orrery')).toBe('/missions');
    expect(canonicalRoute('/orrery/de/', '/orrery')).toBe('/');
  });

  it('does not mistake a real route segment for a locale', () => {
    // 'missions' is not a locale — must be preserved.
    expect(canonicalRoute('/missions/launches')).toBe('/missions/launches');
  });
});

describe('localizedPath', () => {
  it('returns the bare route for the default locale', () => {
    expect(localizedPath('/missions', 'en-US')).toBe('/missions');
    expect(localizedPath('/', 'en-US')).toBe('/');
  });

  it('prefixes non-default locales, keeping the root trailing slash', () => {
    expect(localizedPath('/missions', 'de')).toBe('/de/missions');
    expect(localizedPath('/', 'de')).toBe('/de/');
  });
});

describe('metaDescription', () => {
  it('keeps text that fits, collapsing whitespace', () => {
    expect(metaDescription('  Short   and sweet. ')).toBe('Short and sweet.');
  });

  it('cuts at the last sentence end that fits', () => {
    const s = `${'word '.repeat(22)}first sentence ends here. ${'more '.repeat(30)}second.`;
    expect(metaDescription(s)).toBe(`${'word '.repeat(22)}first sentence ends here.`);
  });

  it('prefers a word cut over a lone short first sentence', () => {
    const s =
      'Keine Methode misst alle kosmischen Entfernungen. Astronomen bauen eine Leiter: Jede Technik reicht etwas weiter und wird von der Sprosse darunter geeicht – vom Radar im Sonnensystem bis zum Rand des beobachtbaren Universums.';
    const out = metaDescription(s);
    expect(out.length).toBeGreaterThan(100);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('…')).toBe(true);
  });

  it('does not treat a decimal point as a sentence end', () => {
    const s = `The orbit is 1.5 million km from Earth, ${'and more words '.repeat(12)}end.`;
    const out = metaDescription(s);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out).toContain('1.5 million');
  });

  it('cuts CJK text at 。 and long unspaced text anywhere with an ellipsis', () => {
    const ja = `${'あ'.repeat(70)}。${'い'.repeat(120)}。`;
    expect(metaDescription(ja)).toBe(`${'あ'.repeat(70)}。`);
    const zh = '字'.repeat(200);
    expect(metaDescription(zh)).toBe(`${'字'.repeat(159)}…`);
  });
});

describe('pageTitle', () => {
  it('joins main, section and brand when it fits', () => {
    expect(pageTitle('Lagrange points', 'Science')).toBe('Lagrange points · Science · Orrery');
    expect(pageTitle('Apollo')).toBe('Apollo · Orrery');
  });

  it('keeps only the topic of a long "Topic — subtitle" title', () => {
    expect(
      pageTitle(
        'End-of-life disposal — graveyard orbits, controlled deorbit, the 25-year rule',
        'Science',
      ),
    ).toBe('End-of-life disposal · Science · Orrery');
    expect(pageTitle('寿命末期处置——墓地轨道、受控离轨、25年规则', '科学'.repeat(30))).toBe(
      '寿命末期处置 · Orrery',
    );
  });

  it('also treats a colon as the topic separator', () => {
    expect(
      pageTitle(
        'Проектирование марсианского жилища: заранее развёрнутое, снабжаемое за счёт ISRU',
        'Наука',
      ),
    ).toBe('Проектирование марсианского жилища · Наука · Orrery');
  });

  it('drops the section when the topic alone still does not fit with it', () => {
    const topic = 'A'.repeat(45);
    expect(pageTitle(`${topic} — more`, 'Wissenschaft')).toBe(`${topic} · Orrery`);
  });
});

describe('isMirrorBuild', () => {
  it('is true only for a build under a base path (GH Pages staging)', () => {
    expect(isMirrorBuild('/orrery')).toBe(true);
    expect(isMirrorBuild('')).toBe(false);
  });
});

describe('canonicalUrl', () => {
  it('builds an absolute prod URL', () => {
    expect(canonicalUrl('/missions', 'en-US')).toBe(`${SITE_ORIGIN}/missions`);
    expect(canonicalUrl('/missions', 'fr')).toBe(`${SITE_ORIGIN}/fr/missions`);
    expect(canonicalUrl('/', 'de')).toBe(`${SITE_ORIGIN}/de/`);
  });
});

describe('hreflangAlternates', () => {
  it('emits one entry per locale plus x-default', () => {
    const alts = hreflangAlternates('/missions');
    expect(alts).toHaveLength(SUPPORTED_LOCALES.length + 1);
    expect(alts.at(-1)).toEqual({
      hreflang: 'x-default',
      href: `${SITE_ORIGIN}/missions`,
    });
    expect(alts.find((a) => a.hreflang === 'de')?.href).toBe(`${SITE_ORIGIN}/de/missions`);
    expect(alts.find((a) => a.hreflang === 'en-US')?.href).toBe(`${SITE_ORIGIN}/missions`);
  });

  it('x-default resolves to the en-US URL for every route', () => {
    const alts = hreflangAlternates('/');
    const xd = alts.find((a) => a.hreflang === 'x-default');
    const en = alts.find((a) => a.hreflang === 'en-US');
    expect(xd?.href).toBe(en?.href);
    expect(xd?.href).toBe(`${SITE_ORIGIN}/`);
  });
});

describe('ogLocale (#519)', () => {
  it('maps region-form codes with an underscore', () => {
    expect(ogLocale('en-US')).toBe('en_US');
    expect(ogLocale('pt-BR')).toBe('pt_BR');
    expect(ogLocale('zh-CN')).toBe('zh_CN');
  });

  it('gives bare-language codes an explicit territory', () => {
    expect(ogLocale('de')).toBe('de_DE');
    expect(ogLocale('ja')).toBe('ja_JP');
    expect(ogLocale('ru')).toBe('ru_RU');
  });

  it('maps sr-Cyrl to sr_RS deliberately', () => {
    expect(ogLocale('sr-Cyrl')).toBe('sr_RS');
  });

  it('covers every supported locale (no accidental identity fallback)', () => {
    for (const { code } of SUPPORTED_LOCALES) {
      const og = ogLocale(code);
      expect(og).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
  });
});

describe('ogLocaleAlternates (#519)', () => {
  it('returns every OTHER locale, excluding the active one', () => {
    const alts = ogLocaleAlternates('de');
    expect(alts).not.toContain('de_DE');
    expect(alts).toContain('en_US');
    expect(alts.length).toBe(SUPPORTED_LOCALES.length - 1);
  });
});
