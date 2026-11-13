import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';
import { readFileSync } from 'node:fs';

vi.mock('$app/environment', () => ({ browser: false }));

// UniversePanelBody is tested on its own; here it is a recorder of what the six outer-scale panels
// hand it: the title, the name, the lead paragraphs and the facts (with the distance's source).
const seen = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));
vi.mock('./UniversePanelBody.svelte', () => ({
  default: (_payload: unknown, props: Record<string, unknown>) => {
    seen.props = props;
  },
}));

import LocalGroupPanel from './LocalGroupPanel.svelte';
import MilkyWayPanel from './MilkyWayPanel.svelte';
import LocalSheetPanel from './LocalSheetPanel.svelte';
import VirgoPanel from './VirgoPanel.svelte';
import LaniakeaPanel from './LaniakeaPanel.svelte';
import CosmicWebPanel from './CosmicWebPanel.svelte';

type Member = { id: string; name: string };
const pick = (file: string, id: string) =>
  (JSON.parse(readFileSync(`static/data/universe/${file}.json`, 'utf8')).members as Member[]).find(
    (m) => m.id === id,
  )!;

const overlay = { fact: 'FACT SENTENCE.', bio: 'BIO PARAGRAPH.' };
const props = (component: unknown, p: Record<string, unknown>) => {
  seen.props = null;
  void render(component as never, { props: { open: true, onClose: () => {}, ...p } as never }).body;
  return seen.props as unknown as {
    title: string;
    name?: string;
    lead: string[];
    facts: { label: string; source?: { url: string } }[];
  };
};

const STRUCTURES: [unknown, string, string][] = [
  [LocalSheetPanel, 'local-sheet', 'maffei-group'],
  [VirgoPanel, 'virgo-cluster', 'virgo-cluster'],
  [LaniakeaPanel, 'laniakea', 'great-attractor'],
  [CosmicWebPanel, 'cosmic-web', 'sloan-great-wall'],
];

describe('the outer-scale panels show the entity text (galaxy brief §3.3)', () => {
  it('Local Group: the fact and bio replace the kind blurb; no overlay keeps the blurb', () => {
    const member = pick('local-group', 'sculptor-dwarf');
    expect(props(LocalGroupPanel, { member, overlay }).lead).toEqual([
      'FACT SENTENCE.',
      'BIO PARAGRAPH.',
    ]);
    const blurb = props(LocalGroupPanel, { member, overlay: null }).lead;
    expect(blurb).toHaveLength(1);
    expect(blurb[0]).not.toContain('FACT');
  });

  it('Milky Way: a Magellanic Cloud shows the galaxy text, any other pin keeps its blurb', () => {
    const lmc = { id: 'lmc', name: 'LMC', kind: 'satellite-galaxy', science_section: 'x' };
    expect(props(MilkyWayPanel, { object: lmc, learnHref: '/', overlay }).lead).toEqual([
      'FACT SENTENCE.',
      'BIO PARAGRAPH.',
    ]);
    const sun = { id: 'sun', name: 'Sun', kind: 'star', science_section: 'x' };
    expect(props(MilkyWayPanel, { object: sun, learnHref: '/', overlay }).lead).toHaveLength(1);
  });

  for (const [component, file, id] of STRUCTURES) {
    it(`${file}: ${id} shows the text, and a text needs both its fact and its bio`, () => {
      const member = pick(file, id);
      expect(props(component, { member, overlay }).lead).toEqual([
        'FACT SENTENCE.',
        'BIO PARAGRAPH.',
      ]);
      expect(props(component, { member, overlay: { fact: 'ONLY FACT.' } }).lead).toHaveLength(1);
      expect(props(component, { member, overlay: { fact: 'ONLY FACT.' } }).lead[0]).not.toBe(
        'ONLY FACT.',
      );
    });

    it(`${file}: title and name are the one handed in (the INDEX row's), else the data's`, () => {
      const member = pick(file, id);
      const named = props(component, { member, name: 'NOM LOCAL' });
      expect([named.title, named.name]).toEqual(['NOM LOCAL', 'NOM LOCAL']);
      const own = props(component, { member });
      expect([own.title, own.name]).toEqual([member.name, member.name]);
    });
  }

  it('a sourced distance links its paper, an unsourced one has no link (the review decides)', () => {
    const distance = (id: string) =>
      props(LocalSheetPanel, { member: pick('local-sheet', id) }).facts.find((f) =>
        f.label.match(/dist/i),
      );
    expect(distance('maffei-group')?.source?.url).toBe('https://arxiv.org/abs/1901.05981');
    expect(distance('m81-group')).toBeDefined();
    expect(distance('m81-group')?.source).toBeUndefined();
  });
});
