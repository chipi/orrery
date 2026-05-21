import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EsaSource, parseEsaHtml, esaArticleToRawEntry } from './esa.js';

const FIXTURE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'esa-press.html'),
  'utf8',
);

describe('parseEsaHtml', () => {
  it('extracts press-release articles from the snapshot fixture', () => {
    const arts = parseEsaHtml(FIXTURE);
    expect(arts.length).toBeGreaterThanOrEqual(2);
  });
});

describe('esaArticleToRawEntry', () => {
  it('maps an "Ariane launches X" press release to RawLaunchEntry', () => {
    const e = esaArticleToRawEntry(
      {
        title: 'Ariane 6 launches Galileo G2 satellites',
        isoDate: '2026-07-22T16:24:00Z',
        description: 'Ariane 62 lifted off from Kourou',
      },
      '2026-05-19T00:00:00Z',
    );
    expect(e).not.toBeNull();
    expect(e?.rocket_family).toBe('Ariane 6');
    expect(e?.mission_name).toBe('Galileo G2 satellites');
    expect(e?.agency_name).toBe('European Space Agency');
    expect(e?.source_name).toBe('esa-direct');
  });

  it('returns null when title does not match the launch pattern', () => {
    const e = esaArticleToRawEntry(
      {
        title: 'ESA opens applications for astronaut training',
        isoDate: '2026-04-01T00:00:00Z',
        description: '',
      },
      '2026-05-19T00:00:00Z',
    );
    expect(e).toBeNull();
  });
});

describe('EsaSource', () => {
  it('declares the correct interface metadata', () => {
    const src = new EsaSource(async () => '');
    expect(src.name).toBe('esa-direct');
    expect(src.priority).toBe(12);
    expect(src.defaultRole).toBe('primary');
  });

  it('returns CC-BY-3.0-IGO citation', () => {
    const src = new EsaSource(async () => '');
    expect(src.attribution()).toMatchObject({
      citation_id: 'esa-press',
      license: 'CC-BY-3.0-IGO',
    });
  });

  it('parses the snapshot fixture end-to-end', async () => {
    const src = new EsaSource(async () => FIXTURE);
    const entries = await src.fetchWindow({
      mode: 'historic',
      fromIso: '2020-01-01T00:00:00Z',
      toIso: '2030-01-01T00:00:00Z',
    });
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0].agency_name).toBe('European Space Agency');
  });
});
