import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { colophonSections, splitCutaways, type SectionSource } from './colophon-sections';

const manifest = (): SectionSource => ({
  anatomy_art: [
    { title: 'A', file: '/a.webp', kind: 'spacecraft' },
    { title: 'B', file: '/b.webp', kind: 'launcher' },
    { title: 'C', file: '/c.webp', kind: 'spacecraft' },
  ],
  exploded_art: [{ title: 'E', file: '/e.webp' }],
  posters: [{ title: 'P', file: '/p.jpg' }],
  diagrams_science: [{ title: 'D', file: '/d.svg' }],
  capsules: [],
  models3d: [{ title: 'M' }],
  canvas2d: [],
  writing: [{ title: 'W' }, { title: 'W2' }],
});

describe('splitCutaways', () => {
  it('splits the cutaways on `kind`, and a missing kind is a spacecraft', () => {
    const { spacecraft, launchers } = splitCutaways([
      { title: 'A', file: '/a', kind: 'launcher' },
      { title: 'B', file: '/b' },
      { title: 'C', file: '/c', kind: 'spacecraft' },
    ]);
    expect(spacecraft.map((e) => e.file)).toEqual(['/b', '/c']);
    expect(launchers.map((e) => e.file)).toEqual(['/a']);
  });
});

describe('colophonSections', () => {
  it('lists the sections the page draws, in page order, with their counts', () => {
    const rows = colophonSections(manifest(), 14, 0);
    expect(rows.map((r) => [r.id, r.count])).toEqual([
      ['cutaways', 2],
      ['launchers', 1],
      ['exploded', 1],
      ['posters', 1],
      ['diagrams', 1],
      ['models', 1],
      ['canvas', 0],
      ['ui', 14],
      ['writing', 2],
    ]);
  });

  it('takes the interface graphics count from the icon grid, not the manifest', () => {
    const m = { ...manifest(), ui: [{ title: 'x' }, { title: 'y' }] };
    expect(colophonSections(m, 14, 0).find((r) => r.id === 'ui')?.count).toBe(14);
  });

  it('draws the optional sections only when they have entries', () => {
    const m: SectionSource = {
      ...manifest(),
      landing_art: [{ title: 'L', file: '/l' }],
      blueprint_art: [],
      lab_illustrations: [{ title: 'Lab', file: '/lab' }],
    };
    const ids = colophonSections(m, 14, 3).map((r) => r.id);
    expect(ids).toContain('landing');
    expect(ids).toContain('lab-illustrations');
    expect(ids).not.toContain('blueprints');
    expect(ids).toContain('tours');
    expect(colophonSections(m, 14, 0).map((r) => r.id)).not.toContain('tours');
  });
});

describe('the committed manifest', () => {
  const j = JSON.parse(readFileSync('static/data/original-work.json', 'utf8'));
  const fleet = JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8')) as {
    id: string;
    category: string;
  }[];

  it('gives every cutaway a kind and splits 198 into 158 spacecraft and 40 launchers', () => {
    expect(j.anatomy_art).toHaveLength(198);
    for (const e of j.anatomy_art) expect(['spacecraft', 'launcher']).toContain(e.kind);
    const { spacecraft, launchers } = splitCutaways(j.anatomy_art);
    expect(spacecraft).toHaveLength(158);
    expect(launchers).toHaveLength(40);
  });

  it('marks as launchers exactly the fleet launchers (plus the two drawings with no fleet entry)', () => {
    const category = new Map(fleet.map((e) => [e.id, e.category]));
    const idOf = (file: string) => file.replace('/images/anatomy/', '').replace('.webp', '');
    const noEntry = j.anatomy_art
      .map((e: { file: string }) => idOf(e.file))
      .filter((id: string) => !category.has(id));
    // Drawings with no fleet entry: m-v and pslv are pencil launchers (the generator names them),
    // starship-hls is a lander. Anything new here must be looked at.
    expect(noEntry.sort()).toEqual(['m-v', 'pslv', 'starship-hls']);
    for (const e of j.anatomy_art as { file: string; kind: string }[]) {
      const id = idOf(e.file);
      const launcher = category.get(id) === 'launcher' || id === 'm-v' || id === 'pslv';
      expect(e.kind, id).toBe(launcher ? 'launcher' : 'spacecraft');
    }
  });

  it('keeps the exploded cutaways whole', () => {
    expect(j.exploded_art).toHaveLength(76);
  });
});
