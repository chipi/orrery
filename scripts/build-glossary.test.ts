import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { LOCALES, build, routeOf, slug } from './build-glossary.mjs';

// /glossary data (scripts/build-glossary.mjs): every glossary term in every locale, with a
// definition in that locale (no English fallback), a real "read more" page and real
// "used on" links. Adding a term to native-terms.json `term` without its definitions fails here.
describe('glossary page data', () => {
  const { files, problems } = build({ write: false });

  it('builds without problems (definitions, titles) in all 14 locales', () => {
    expect(problems).toEqual([]);
    expect(Object.keys(files).sort()).toEqual([...LOCALES].sort());
  });

  it('every link points at a page that exists', () => {
    const bad: string[] = [];
    for (const t of files['en-US'].terms)
      for (const l of [t.readMore, ...t.usedOn].filter(Boolean)) {
        const href = l!.href as string;
        const file = href.startsWith('/science/')
          ? `i18n-src/en-US${href}.json`
          : href.startsWith('/essays/') || href.startsWith('/programs/')
            ? `i18n-src/en-US${href}.json`
            : null;
        if (file && !existsSync(file)) bad.push(`${t.id}: ${href}`);
      }
    expect(bad).toEqual([]);
  });

  it('maps overlay paths to routes', () => {
    expect(routeOf('science/orbits/apsides.json')).toBe('/science/orbits/apsides');
    expect(routeOf('science/orbits/_intro.json')).toBe('/science/orbits');
    expect(routeOf('science/_landing.json')).toBeNull();
    expect(routeOf('missions/moon/apollo11.json')).toBe('/missions?id=apollo11');
    expect(routeOf('fleet/launcher/saturn-v.json')).toBe('/fleet?id=saturn-v');
    expect(routeOf('essays/delta-v.json')).toBe('/essays/delta-v');
    expect(slug('gravity assist')).toBe('gravity-assist');
  });
});
