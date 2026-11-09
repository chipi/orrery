// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  centroidLatLon,
  clusterFrames,
  createSiteTagLayer,
  iconForSite,
  focusFade,
  planetFill,
  splitCamR,
  surfaceChord,
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
  // Zoom relative to the default framing (camR 150 on every route).
  const zoom = (camR: number) => fill(camR) / fill(150);
  it('opens bare, then icons, then cards', () => {
    expect(tagStage(zoom(200))).toEqual({ icon: 0, size: 0.55, card: 0 });
    expect(tagStage(zoom(150)).icon).toBe(0);
    expect(tagStage(zoom(130)).icon).toBe(0);
    const mid = tagStage(zoom(122));
    expect(mid.icon).toBeGreaterThan(0);
    expect(mid.icon).toBeLessThan(1);
    expect(tagStage(zoom(116)).icon).toBeGreaterThan(0.9);
    const near = tagStage(zoom(92));
    expect(near.size).toBeGreaterThan(0.95);
    expect(near.card).toBe(0);
    expect(tagStage(zoom(60))).toEqual({ icon: 1, size: 1, card: 1 });
  });
  it('a phone opens bare too: zoom is relative, not absolute fill', () => {
    const first = planetFill(150, 30, 45, 390, 760);
    expect(tagStage(planetFill(150, 30, 45, 390, 760) / first).icon).toBe(0);
  });
  it('fades tags away from the point under the camera', () => {
    expect(focusFade(10)).toBe(1);
    expect(focusFade(38)).toBe(1);
    expect(focusFade(44)).toBeCloseTo(0.5);
    expect(focusFade(65)).toBe(0);
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
    layer.sync([{ key: 'a', x: 100, y: 100, opacity: 1 }], [], { icon: 0, size: 0.55, card: 0 });
    expect(shown()).toHaveLength(0);
    // Under a HUD panel: hidden whole.
    layer.sync([{ key: 'a', x: 100, y: 100, opacity: 1 }], [box(50, 50, 150, 150)]);
    expect(shown()).toHaveLength(0);
    layer.dispose();
    expect(host.querySelector('.site-tags')).toBeNull();
  });
});

describe('first-zoom icon size (prod 0.9.7 feedback 2)', () => {
  it('starts at about half size and grows with the planet, never past full', () => {
    const first = tagStage(1.2);
    expect(first.size).toBeLessThanOrEqual(0.6);
    expect(tagStage(1.5).size).toBeGreaterThan(first.size);
    expect(tagStage(2).size).toBe(1);
  });
});

describe('hover shows the label at the icons-only stage (prod 0.9.7 feedback 1)', () => {
  const setup = () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const layer = createSiteTagLayer(host);
    layer.setSpecs([spec('a', 1), spec('b', 2)]);
    const els = () => [...host.querySelectorAll<HTMLElement>('.site-tag')];
    const find = (k: string) => els().find((e) => e.dataset.tag === k)!;
    return { host, layer, find };
  };
  const icons = { icon: 1, size: 0.55, card: 0 };
  const frames = [
    { key: 'a', x: 100, y: 100, opacity: 1 },
    { key: 'b', x: 300, y: 100, opacity: 1 },
  ];
  it('the hovered tag gets its card, the others stay bare', () => {
    const { layer, find } = setup();
    layer.sync(frames, [], icons);
    expect(find('a').classList.contains('site-tag--bare')).toBe(true);
    layer.setHover('a');
    layer.sync(frames, [], icons);
    expect(find('a').classList.contains('site-tag--bare')).toBe(false);
    expect(find('a').classList.contains('site-tag--hover')).toBe(true);
    expect(find('b').classList.contains('site-tag--bare')).toBe(true);
    layer.setHover(null);
    layer.sync(frames, [], icons);
    expect(find('a').classList.contains('site-tag--bare')).toBe(true);
    expect(find('a').classList.contains('site-tag--hover')).toBe(false);
  });
  it('a hovered group shows its lead and draws above the rest', () => {
    const { layer, find } = setup();
    const near = [
      { key: 'a', x: 100, y: 100, opacity: 1 },
      { key: 'b', x: 104, y: 100, opacity: 1 },
    ];
    layer.setHover('b');
    layer.sync(near, [], icons);
    const g = find('b');
    expect(g.dataset.count).toBe('2');
    expect(g.style.zIndex).toBe('1010');
  });
});

describe('hitTest: a 44 px touch target whatever the drawn size', () => {
  it('hits within 22 px of an icon drawn at 24 px, misses beyond', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const layer = createSiteTagLayer(host, { scale: 0.62 });
    layer.setSpecs([spec('a', 1), spec('b', 2)]);
    layer.sync(
      [
        { key: 'a', x: 100, y: 100, opacity: 1 },
        { key: 'b', x: 300, y: 100, opacity: 1 },
      ],
      [],
      { icon: 1, size: 0.55, card: 0 },
    );
    expect(layer.frameSize()).toBe(27);
    expect(layer.hitTest(120, 82)?.lead).toBe('a');
    expect(layer.hitTest(100, 80)?.lead).toBe('a');
    expect(layer.hitTest(100, 70)).toBeNull();
    expect(layer.hitTest(200, 100)).toBeNull();
  });
  it('the nearest anchor wins where hit areas overlap', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const layer = createSiteTagLayer(host);
    layer.setSpecs([spec('a', 1), spec('b', 2)]);
    layer.sync(
      [
        { key: 'a', x: 100, y: 100, opacity: 1 },
        { key: 'b', x: 150, y: 100, opacity: 1 },
      ],
      [],
    );
    expect(layer.hitTest(110, 100)?.lead).toBe('a');
    expect(layer.hitTest(140, 100)?.lead).toBe('b');
  });
  it('ignores tags that are still fading in', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const layer = createSiteTagLayer(host);
    layer.setSpecs([spec('a', 1)]);
    layer.sync([{ key: 'a', x: 100, y: 100, opacity: 1 }], [], { icon: 0.2, size: 0.55, card: 0 });
    expect(layer.hitTest(100, 100)).toBeNull();
  });
});

describe('a group splits when you zoom into it (prod 0.9.7 feedback 3, Kourou)', () => {
  const kourou = [
    { lat: 5.232, lon: -52.776 }, // ELA-2
    { lat: 5.239, lon: -52.769 }, // ELA-3
    { lat: 5.2365, lon: -52.7753 }, // ZLV, 0.5 km from ELA-2
  ];
  const fov = 45;
  const ch = 840;
  const projectedPx = (chord: number, camR: number) =>
    (chord * (ch / 2)) / (Math.tan((fov * Math.PI) / 360) * (camR - 30));

  it('measures the Kourou pads (ZLV is half a km from ELA-2)', () => {
    const km = (a: number, b: number) => (surfaceChord(kourou[a], kourou[b], 30) / 30) * 6371;
    expect(km(0, 2)).toBeGreaterThan(0.4);
    expect(km(0, 2)).toBeLessThan(0.7);
    expect(km(0, 1)).toBeGreaterThan(1);
  });
  it('touching frames do not group: an icon 27 px away is its own tag', () => {
    const items = [
      { key: 'a', x: 0, y: 0, priority: 0 },
      { key: 'b', x: 27.2, y: 0, priority: 0 },
    ];
    expect(clusterFrames(items, 27.2)).toHaveLength(2);
  });
  it('the target distance gives every member a frame of its own', () => {
    const framePx = 27.2; // Earth, full size
    const target = splitCamR(kourou, 30, fov, ch, framePx, 30.08);
    expect(target).toBeGreaterThanOrEqual(30.08);
    // At the target (or the floor, where the pair is only just clear) the group has split.
    const rad = Math.PI / 180;
    const items = kourou.map((p, i) => ({
      key: String(i),
      x: projectedPx((p.lon - kourou[0].lon) * Math.cos(5.2 * rad) * rad * 30, target),
      y: projectedPx((p.lat - kourou[0].lat) * rad * 30, target),
      priority: 0,
    }));
    expect(clusterFrames(items, framePx - 1).length).toBe(3);
  });
  it('a wider group asks for a farther camera, never below the floor', () => {
    const wide = [
      { lat: 5.2626, lon: -52.7907 },
      { lat: 5.3019, lon: -52.8346 },
    ];
    const far = splitCamR(wide, 30, fov, ch, 27.2, 30.08);
    const near = splitCamR(kourou, 30, fov, ch, 27.2, 30.08);
    expect(far).toBeGreaterThan(near);
    expect(far).toBeLessThan(33);
    expect(splitCamR([kourou[0], kourou[0]], 30, fov, ch, 27.2, 30.08)).toBe(30.08);
  });
  it('a pair half a km apart (ZLV, ELA-2) counts: the group goes to the floor, not to the wider pair', () => {
    const group = [
      { lat: 5.2626, lon: -52.7907 },
      { lat: 5.3019, lon: -52.8346 },
      { lat: 5.2626, lon: -52.7907 + 0.0007 },
    ];
    expect(splitCamR(group, 30, fov, ch, 27.2, 30.08)).toBe(30.08);
  });
  it('centres on the mean direction', () => {
    const c = centroidLatLon(kourou);
    expect(c.lat).toBeCloseTo(5.236, 2);
    expect(c.lon).toBeCloseTo(-52.7734, 2);
  });
});
