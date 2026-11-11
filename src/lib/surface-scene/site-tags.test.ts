// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  centroidLatLon,
  fanLayout,
  clusterFrames,
  createSiteTagLayer,
  iconForSite,
  focusFade,
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

describe('a group fans out on click (prod 0.9.7 feedback 3, Kourou)', () => {
  const view = { w: 1440, h: 840 };
  const opts = { frame: 27, cardW: 190, cardDx: 56, view };
  type R = { x0: number; y0: number; x1: number; y1: number };
  const hit = (a: R, b: R) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const group = (n: number, x = 700, y = 420) =>
    Array.from({ length: n }, (_, i) => ({
      key: 'k' + i,
      x: x + (i % 3) * 2,
      y: y + Math.floor(i / 3) * 2,
    }));

  it('keeps every leader on the true position of its member', () => {
    const pts = group(5);
    const out = fanLayout(pts, opts);
    expect(out.map((o) => o.key).sort()).toEqual(pts.map((p) => p.key).sort());
    for (const o of out) {
      const p = pts.find((q) => q.key === o.key)!;
      expect(o.from).toEqual({ x: p.x, y: p.y });
    }
  });
  it('never lets two frames touch, from 2 to 14 members, at any zoom stage size', () => {
    for (let n = 2; n <= 14; n++)
      for (const frame of [15, 27, 44]) {
        const out = fanLayout(group(n), { ...opts, frame });
        const r = (x: number, y: number) => ({
          x0: x - frame / 2,
          y0: y - frame / 2,
          x1: x + frame / 2,
          y1: y + frame / 2,
        });
        for (let a = 0; a < out.length; a++)
          for (let b = a + 1; b < out.length; b++)
            expect(hit(r(out[a].x, out[a].y), r(out[b].x, out[b].y))).toBe(false);
      }
  });
  it('rows are far enough apart that cards in one column do not touch', () => {
    const out = fanLayout(group(12), opts);
    for (const side of [0, 1] as const) {
      const ys = out
        .filter((o) => o.side === side)
        .map((o) => o.y)
        .sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(40);
    }
  });
  it('uses two columns on a desktop and cards extend outward from each', () => {
    const out = fanLayout(group(6), opts);
    expect(new Set(out.map((o) => o.side))).toEqual(new Set([0, 1]));
    for (const o of out) expect(o.side === 0 ? o.x > 700 : o.x < 700).toBe(true);
  });
  it('falls back to one column on a phone and stays in view', () => {
    const phone = { w: 390, h: 844 };
    const out = fanLayout(group(6, 300, 400), { frame: 23, cardW: 150, cardDx: 48, view: phone });
    expect(new Set(out.map((o) => o.side)).size).toBe(1);
    for (const o of out) {
      expect(o.y).toBeGreaterThan(0);
      expect(o.y).toBeLessThan(phone.h);
      const reach = o.side === 0 ? o.x + 48 + 150 : o.x - 48 - 150;
      expect(o.side === 0 ? reach : -reach).toBeLessThanOrEqual(o.side === 0 ? phone.w : 0);
    }
  });
  it('keeps every card inside the view with the safe margin, on both phone sides', () => {
    const phone = { w: 390, h: 844 };
    for (const px of [20, 195, 370])
      for (const n of [2, 5, 9]) {
        const out = fanLayout(group(n, px, 400), {
          frame: 23,
          cardW: 190,
          cardDx: 34,
          view: phone,
          pad: 12,
        });
        for (const o of out) {
          const x0 = o.side === 0 ? o.x - 11.5 : o.x - 34 - 190;
          const x1 = o.side === 0 ? o.x + 34 + 190 : o.x + 11.5;
          expect(x0).toBeGreaterThanOrEqual(12 - 1e-6);
          expect(x1).toBeLessThanOrEqual(390 - 12 + 1e-6);
        }
      }
  });
  it('shifts a fan at the screen edge back into view', () => {
    const out = fanLayout(group(4, 20, 20), opts);
    for (const o of out) {
      expect(o.x - 13.5).toBeGreaterThanOrEqual(0);
      expect(o.y - 13.5).toBeGreaterThanOrEqual(0);
    }
  });
  it('centres on the mean direction', () => {
    const c = centroidLatLon([
      { lat: 5.232, lon: -52.776 },
      { lat: 5.239, lon: -52.769 },
      { lat: 5.2365, lon: -52.7753 },
    ]);
    expect(c.lat).toBeCloseTo(5.236, 2);
    expect(c.lon).toBeCloseTo(-52.7734, 2);
  });
});

describe('fan in the tag layer', () => {
  const setup = () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const layer = createSiteTagLayer(host);
    layer.setSpecs([spec('a', 1), spec('b', 2), spec('c', 1)]);
    const shown = () =>
      [...host.querySelectorAll<HTMLElement>('.site-tag')].filter(
        (e) => e.style.display !== 'none',
      );
    return { host, layer, shown };
  };
  const near = [
    { key: 'a', x: 100, y: 100, opacity: 1 },
    { key: 'b', x: 103, y: 101, opacity: 1 },
    { key: 'c', x: 101, y: 103, opacity: 1 },
  ];
  it('shows one tag per member with their own cards and leader lines, and collapses', () => {
    const { host, layer, shown } = setup();
    layer.sync(near, [], { icon: 1, size: 0.55, card: 0 });
    expect(shown()).toHaveLength(1);
    layer.setFan(['a', 'b', 'c']);
    layer.sync(near, [], { icon: 1, size: 0.55, card: 0 });
    expect(layer.fanned()).toBe(true);
    expect(
      shown()
        .map((e) => e.dataset.tag)
        .sort(),
    ).toEqual(['a', 'b', 'c']);
    for (const e of shown()) expect(e.classList.contains('site-tag--bare')).toBe(false);
    expect(host.querySelectorAll('.site-tag-fan line')).toHaveLength(3);
    layer.setFan(null);
    layer.sync(near, [], { icon: 1, size: 0.55, card: 0 });
    expect(shown()).toHaveLength(1);
    expect(host.querySelectorAll('.site-tag-fan line')).toHaveLength(0);
  });
  it('fanned tags are clickable at their fan position, not at the group point', () => {
    const { layer } = setup();
    layer.setFan(['a', 'b', 'c']);
    layer.sync(near, [], { icon: 1, size: 1, card: 1 });
    expect(layer.hitTest(100, 100)?.keys.length ?? 1).toBe(1);
    const hits = new Set<string>();
    for (let x = 0; x < 600; x += 6)
      for (let y = 0; y < 300; y += 6) {
        const h = layer.hitTest(x, y);
        if (h) hits.add(h.lead);
      }
    expect([...hits].sort()).toEqual(['a', 'b', 'c']);
  });
  it('a fan of one live member collapses on its own', () => {
    const { layer } = setup();
    layer.setFan(['a', 'b']);
    layer.sync([near[0]], [], { icon: 1, size: 1, card: 1 });
    expect(layer.fanned()).toBe(false);
  });
  it('while a fan is open the other tags are faint, card-less and not tappable', () => {
    const { layer, shown } = setup();
    layer.setSpecs([spec('a', 1), spec('b', 2), spec('c', 1), spec('d', 1)]);
    const far = { key: 'd', x: 400, y: 200, opacity: 1 };
    layer.setFan(['a', 'b', 'c']);
    layer.sync([...near, far], [], { icon: 1, size: 1, card: 1 });
    const d = shown().find((e) => e.dataset.tag === 'd')!;
    expect(d.classList.contains('site-tag--bare')).toBe(true);
    expect(Number(d.style.opacity)).toBeLessThan(0.3);
    expect(layer.hitTest(400, 200)).toBeNull();
    layer.setFan(null);
    layer.sync([...near, far], [], { icon: 1, size: 1, card: 1 });
    expect(shown().find((e) => e.dataset.tag === 'd')!.style.opacity).toBe('');
  });
});

describe('a tag with its card faded out is its icon alone (selected site, zoomed in)', () => {
  const setup = () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const layer = createSiteTagLayer(host);
    layer.setSpecs([spec('a', 1), spec('b', 2)]);
    const find = (k: string) =>
      [...host.querySelectorAll<HTMLElement>('.site-tag')].find((e) => e.dataset.tag === k)!;
    return { layer, find };
  };
  const full = { icon: 1, size: 1, card: 1 };
  it('card 0 hides card and leader even at the full-card stage, and even when hovered', () => {
    const { layer, find } = setup();
    const frames = [
      { key: 'a', x: 100, y: 100, opacity: 1, card: 0 },
      { key: 'b', x: 400, y: 100, opacity: 1 },
    ];
    layer.setHover('a');
    layer.sync(frames, [], full);
    expect(find('a').classList.contains('site-tag--bare')).toBe(true);
    expect(find('a').style.display).not.toBe('none');
  });
  it('a partial card fade is written on the tag alone and cleared when it ends', () => {
    const { layer, find } = setup();
    layer.sync([{ key: 'a', x: 100, y: 100, opacity: 1, card: 0.5 }], [], full);
    expect(find('a').style.getPropertyValue('--tag-card')).toBe('0.500');
    layer.sync([{ key: 'a', x: 100, y: 100, opacity: 1 }], [], full);
    expect(find('a').style.getPropertyValue('--tag-card')).toBe('');
  });
});
