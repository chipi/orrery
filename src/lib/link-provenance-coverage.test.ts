import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicaliseLinkUrl } from './link-provenance';

/**
 * /library promises "Every external link Orrery sends you to lives here"
 * (`library_intro_body_1`). The /science articles and the essays are the two reader-facing
 * link lists that outgrew the manifest; `scripts/build-link-provenance.ts` reads them, and
 * this test fails the day an author adds a link and does not regenerate it
 * (`npm run build-link-provenance`).
 *
 * The entity ids and routes below are the ones the script writes; keep them in step.
 */

const DATA = 'static/data';
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

interface Want {
  entity_id: string;
  category: 'science' | 'essay';
  url: string;
}

const wanted: Want[] = [];

for (const tab of readdirSync(join(DATA, 'science'), { withFileTypes: true })) {
  if (!tab.isDirectory()) continue;
  for (const f of readdirSync(join(DATA, 'science', tab.name))) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const doc = readJson(join(DATA, 'science', tab.name, f)) as {
      id: string;
      tab: string;
      links?: { u: string }[];
    };
    for (const l of doc.links ?? [])
      wanted.push({
        entity_id: `${doc.tab}/${doc.id}`,
        category: 'science',
        url: canonicaliseLinkUrl(l.u),
      });
  }
}

for (const f of readdirSync(join(DATA, 'essays'))) {
  if (!f.endsWith('.json') || f === 'index.json') continue;
  const doc = readJson(join(DATA, 'essays', f)) as {
    slug: string;
    status: string;
    sources?: { url: string }[];
  };
  if (doc.status !== 'published') continue;
  for (const s of doc.sources ?? [])
    wanted.push({ entity_id: doc.slug, category: 'essay', url: canonicaliseLinkUrl(s.url) });
}

const manifest = readJson(join(DATA, 'link-provenance.json')) as {
  entries: { entity_id: string; category: string; url: string }[];
};
const have = new Set(manifest.entries.map((e) => `${e.category}|${e.entity_id}|${e.url}`));

describe('link-provenance.json covers the /science and essay links', () => {
  it('finds the links it is checking (a moved folder must not pass silently)', () => {
    expect(wanted.filter((w) => w.category === 'science').length).toBeGreaterThan(400);
    expect(wanted.filter((w) => w.category === 'essay').length).toBeGreaterThan(60);
  });

  it('lists every /science article link', () => {
    const missing = wanted
      .filter((w) => w.category === 'science' && !have.has(`science|${w.entity_id}|${w.url}`))
      .map((w) => `${w.entity_id} ${w.url}`);
    expect(missing).toEqual([]);
  });

  it('lists every essay source link', () => {
    const missing = wanted
      .filter((w) => w.category === 'essay' && !have.has(`essay|${w.entity_id}|${w.url}`))
      .map((w) => `${w.entity_id} ${w.url}`);
    expect(missing).toEqual([]);
  });
});
