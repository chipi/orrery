// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  clusterFrames,
  createSiteTagLayer,
  iconForSite,
  planetFill,
  tagStage,
  siteTagSpec,
  statusChipColor,
  tagAccent,
  tagMarkup,
  thinCards,
  type CardCandidate,
  type TagSpec,
} from './site-tags';
import type { SurfaceSite } from '$types/surface-site';

const box = (x0: number, y0: number, x1: number, y1: number) => ({ x0, y0, x1, y1 });

describe('iconForSite', () => {
  it('draws pads on Earth and probes on Venus whatever the category', () => {
    expect(iconForSite('earth', 'cape-canaveral-slc-40', 'lander')).toBe('pad');
    expect(iconForSite('venus', 'venera-13', '')).toBe('probe');
  });
  it('picks hardware-specific icons before the category', () => {
    expect(iconForSite('mars', 'opportunity', 'rover')).toBe('merRover');
    expect(iconForSite('mars', 'insight', 'lander')).toBe('insight');
    expect(iconForSite('mars', 'viking1-lander', 'lander')).toBe('viking');
    expect(iconForSite('moon', 'luna17', 'rover')).toBe('lunokhod');
    expect(iconForSite('mars', 'mars3', 'soviet-petal')).toBe('petal');
    expect(iconForSite('moon', 'apollo15', 'crewed')).toBe('lm');
    expect(iconForSite('mars', 'curiosity', 'rover')).toBe('rover');
    expect(iconForSite('moon', 'chandrayaan3', 'lander')).toBe('lander');
  });
});

describe('zoom stages', () => {
  // Desktop canvas 1440×840, the scene's 45° camera, planet radius 30.
  const fill = (camR: number) => planetFill(camR, 30, 45, 1440, 840);
  it('measures how much of the view the planet fills', () => {
    expect(fill(150)).toBeCloseTo(0.493, 2);
    expect(fill(30.0001)).toBeGreaterThan(100);
    // Portrait phone: the narrow side sets the scale.
    expect(planetFill(150, 30, 45, 390, 760)).toBeCloseTo(0.96, 1);
  });
  it('shows nothing far out, icons first, cards last', () => {
    expect(tagStage(fill(200))).toEqual({ icon: 0, size: 0.7, card: 0 });
    const def = tagStage(fill(150));
    expect(def.icon).toBeGreaterThan(0);
    expect(def.icon).toBeLessThan(1);
    expect(def.card).toBe(0);
    const near = tagStage(fill(95));
    expect(near.icon).toBe(1);
    expect(near.size).toBeGreaterThan(0.95);
    expect(near.card).toBe(0);
    expect(tagStage(fill(60))).toEqual({ icon: 1, size: 1, card: 1 });
  });
});

describe('tagAccent', () => {
  it('lifts a dark flag tone to a vivid accent of the same hue', () => {
    // NASA blue #0B3D91 → a light blue; USSR red #8B0000 → a light red.
    const blue = tagAccent('#0B3D91');
    const red = tagAccent('#8B0000');
    const ch = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
    expect(ch(blue, 2)).toBeGreaterThan(ch(blue, 0));
    expect(ch(blue, 2)).toBeGreaterThan(200);
    expect(ch(red, 0)).toBeGreaterThan(200);
    expect(ch(red, 0)).toBeGreaterThan(ch(red, 1));
  });
  it('keeps greys grey and passes non-hex through', () => {
    expect(tagAccent('#888888')).toBe('#adadad');
    expect(tagAccent('red')).toBe('red');
  });
});

describe('statusChipColor', () => {
  it('maps lifecycle to the chip colour', () => {
    expect(statusChipColor('ACTIVE')).toBe('#5be38a');
    expect(statusChipColor('PLANNED')).toBe('#ffd24a');
    expect(statusChipColor('LOST')).toBe(statusChipColor('CRASHED'));
    expect(statusChipColor('ENDED')).toBe(statusChipColor(undefined));
  });
});

describe('clusterFrames', () => {
  const pt = (key: string, x: number, y: number, priority = 0) => ({ key, x, y, priority });
  it('merges anchors whose frames would overlap, led by the highest priority', () => {
    const g = clusterFrames([pt('a', 100, 100), pt('b', 110, 104, 5), pt('c', 400, 100)], 32);
    expect(g).toHaveLength(2);
    const pair = g.find((x) => x.keys.length === 2)!;
    expect(pair.lead).toBe('b');
    expect(pair.x).toBeCloseTo(105);
    expect(pair.y).toBeCloseTo(102);
  });
  it('splits the same tags once they spread past a frame apart (zooming in)', () => {
    const at = (spread: number) =>
      clusterFrames(
        [pt('a', 100, 100), pt('b', 100 + spread, 100), pt('c', 100, 100 + spread)],
        32,
      );
    expect(at(10)).toHaveLength(1);
    expect(at(10)[0].keys).toHaveLength(3);
    expect(at(40)).toHaveLength(3);
  });
  it('merges groups whose centres drift into each other', () => {
    // b (35 px from a) starts its own group; c joins a and pulls a's centre to
    // 109, 26 px from b — the merge pass makes them one group.
    const g = clusterFrames([pt('a', 100, 0, 3), pt('b', 135, 0, 2), pt('c', 118, 0, 1)], 32);
    expect(g).toHaveLength(1);
    expect(g[0].keys.sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('thinCards', () => {
  const cand = (key: string, priority: number, x: number, w = 100): CardCandidate => ({
    key,
    priority,
    frame: box(x - 10, 0, x + 10, 20),
    cards: [box(x + 20, -30, x + 20 + w, 0), box(x - 20 - w, -30, x - 20, 0)],
  });
  it('gives the higher priority its preferred side and flips the next one', () => {
    const r = thinCards([cand('lo', 1, 150), cand('hi', 5, 100)]);
    expect(r.get('hi')).toBe(0);
    // lo's right card would sit on hi's; its left card would cover hi's frame
    // (higher priority) → no card.
    expect(r.has('lo')).toBe(false);
  });
  it('flips to the left when the right side leaves the view', () => {
    const r = thinCards([cand('a', 1, 950)], box(0, -100, 1000, 100));
    expect(r.get('a')).toBe(1);
  });
  it('lets a card cover a lower-priority frame but not a HUD panel', () => {
    const r = thinCards([cand('hi', 5, 100), cand('lo', 1, 160)]);
    expect(r.get('hi')).toBe(0);
    const hud = thinCards([cand('hi', 5, 100)], undefined, [
      box(110, -40, 400, 0),
      box(-200, -40, 90, 0),
    ]);
    expect(hud.has('hi')).toBe(false);
  });
});

const site = (over: Partial<SurfaceSite>): SurfaceSite =>
  ({
    id: 'curiosity',
    kind: 'lander',
    agency: 'NASA',
    nation: 'USA',
    year: 2012,
    status: 'ACTIVE',
    name: 'Curiosity',
    marker: 'rover',
    ...over,
  }) as SurfaceSite;

describe('siteTagSpec', () => {
  it('builds name, type, facts and status from the site', () => {
    const s = siteTagSpec(site({}), 'mars');
    expect(s).toMatchObject({
      key: 'site:curiosity',
      icon: 'rover',
      name: 'Curiosity',
      type: 'ROVER',
      facts: 'NASA · 2012',
      status: 'ACTIVE',
      statusLabel: 'ACTIVE',
      priority: 3,
    });
  });
  it('uses the Moon mission type without its status part, and pads on Earth', () => {
    expect(
      siteTagSpec(
        site({
          id: 'apollo15',
          mission_type: 'CREWED LANDER · FLOWN',
          marker: 'crewed',
          status: 'FLOWN',
        }),
        'moon',
      ).type,
    ).toBe('CREWED LANDER');
    const pad = siteTagSpec(
      site({ id: 'slc-40', site_role: 'launch-pad', status: 'ENDED' }),
      'earth',
    );
    expect(pad).toMatchObject({
      icon: 'pad',
      type: 'LAUNCH SITE',
      facts: 'NASA',
      statusLabel: 'RETIRED',
    });
  });
});

const spec = (key: string, priority = 1): TagSpec => ({
  key,
  icon: 'lander',
  color: '#6f9bff',
  name: `Site <${key}>`,
  type: 'LANDER',
  facts: 'NASA',
  priority,
});

describe('tagMarkup', () => {
  it('escapes text and marks a group with a badge and +N', () => {
    const one = tagMarkup(spec('a'));
    expect(one.card).toContain('Site &lt;a&gt;');
    expect(one.frame).not.toContain('<text');
    const grp = tagMarkup(spec('a'), 1, 4);
    expect(grp.frame).toContain('>4</text>');
    expect(grp.card).toContain('+3');
  });
});

describe('createSiteTagLayer', () => {
  it('shows one element per group, moves it, and hides what left the view', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const layer = createSiteTagLayer(host);
    layer.setSpecs([spec('a', 1), spec('b', 2), spec('c')]);
    layer.sync([
      { key: 'a', x: 100, y: 100, opacity: 1 },
      { key: 'b', x: 105, y: 100, opacity: 1 },
      { key: 'c', x: 600, y: 300, opacity: 0.5 },
    ]);
    const shown = () =>
      [...host.querySelectorAll<HTMLElement>('.site-tag')].filter(
        (e) => e.style.display !== 'none',
      );
    expect(shown().map((e) => [e.dataset.tag, e.dataset.count])).toEqual([
      ['b', '2'],
      ['c', undefined],
    ]);
    expect(parseFloat(shown()[1].style.opacity)).toBe(0.5);
    // Spread apart: the group splits into its two members.
    layer.sync([
      { key: 'a', x: 100, y: 100, opacity: 1 },
      { key: 'b', x: 300, y: 100, opacity: 1 },
    ]);
    expect(
      shown()
        .map((e) => e.dataset.tag)
        .sort(),
    ).toEqual(['a', 'b']);
    expect(shown().find((e) => e.dataset.tag === 'b')!.style.transform).toBe(
      'translate3d(300.0px,100.0px,0)',
    );
    // Icons-only stage: every tag bare; far-out stage: nothing shown.
    layer.sync([{ key: 'a', x: 100, y: 100, opacity: 1 }], [], { icon: 1, size: 0.8, card: 0 });
    expect(shown()[0].classList.contains('site-tag--bare')).toBe(true);
    expect(host.querySelector<HTMLElement>('.site-tags')!.style.getPropertyValue('--tag-s')).toBe(
      '0.800',
    );
    layer.sync([{ key: 'a', x: 100, y: 100, opacity: 1 }], [], { icon: 0, size: 0.7, card: 0 });
    expect(shown()).toHaveLength(0);
    // Under a HUD panel: hidden whole.
    layer.sync([{ key: 'a', x: 100, y: 100, opacity: 1 }], [box(50, 50, 150, 150)]);
    expect(shown()).toHaveLength(0);
    layer.dispose();
    expect(host.querySelector('.site-tags')).toBeNull();
  });
});
