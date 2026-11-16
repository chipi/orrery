import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PanoramaMetadata } from '$types/surface-site';

// "Stand here" must open on the photograph, not on the generated fill that pads a partial
// panorama (UXD-007, W6). The panorama opens at `entry_yaw_deg` (0 when absent); a partial
// panorama names where its photograph sits in `photo_span_deg`, so the opening view can be
// checked against it without a browser.
const doc = JSON.parse(readFileSync('static/data/surface-hotspots.json', 'utf8')) as {
  entries: Record<
    string,
    { hotspot_tier3_panorama?: string; panorama_metadata?: PanoramaMetadata }
  >;
};
const panos = Object.entries(doc.entries)
  .filter(([, e]) => e.hotspot_tier3_panorama)
  .map(([id, e]) => ({ id, meta: e.panorama_metadata ?? {} }));

const norm = (d: number) => ((d % 360) + 360) % 360;
const width = ([from, to]: [number, number]) => norm(to - from);
/** Degrees from `yaw` to the nearer edge of the span, or a negative number when outside it. */
function insideBy(yaw: number, span: [number, number]): number {
  const off = norm(yaw - span[0]);
  const w = width(span);
  return off > w ? -1 : Math.min(off, w - off);
}
/** The view is 70 degrees wide; a narrow photograph can only be centred, not fit. */
const marginFor = (span: [number, number]) => Math.min(35, 0.4 * width(span));

describe('panorama opening view (W6)', () => {
  it('finds the 30 panoramas', () => {
    expect(panos).toHaveLength(30);
  });

  it('declares a span that is an arc of the circle, not all of it', () => {
    for (const { id, meta } of panos) {
      if (!meta.photo_span_deg) continue;
      const [from, to] = meta.photo_span_deg;
      expect(from >= 0 && from < 360 && to >= 0 && to < 360, `${id} degrees`).toBe(true);
      expect(width(meta.photo_span_deg), `${id} span width`).toBeGreaterThan(0);
    }
  });

  it('declares the span wherever the data already declares an unphotographed wedge, and they agree', () => {
    for (const { id, meta } of panos) {
      const gap = (meta.synthetic_regions ?? []).find(
        (r) => r.kind === 'unphotographed' && r.azimuth_min_deg != null,
      );
      if (!gap) continue;
      expect(meta.photo_span_deg, `${id} has a wedge but no photo_span_deg`).toBeDefined();
      // The wedge runs from azimuth_min_deg up to azimuth_max_deg; the photograph is the rest.
      expect(meta.photo_span_deg, id).toEqual([gap.azimuth_max_deg, gap.azimuth_min_deg]);
    }
  });

  it('opens every partial panorama inside its photograph, clear of the edge', () => {
    for (const { id, meta } of panos) {
      const span = meta.photo_span_deg as [number, number] | undefined;
      if (!span) continue;
      const yaw = meta.entry_yaw_deg ?? 0;
      expect(
        insideBy(yaw, span),
        `${id} opens at yaw ${yaw}, photograph ${span[0]}..${span[1]}`,
      ).toBeGreaterThanOrEqual(marginFor(span));
    }
  });

  it('lists the partial panoramas the audit found', () => {
    const partial = panos.filter((p) => p.meta.photo_span_deg).map((p) => p.id);
    expect(partial.sort()).toEqual(
      [
        'apollo16',
        'apollo17',
        'baikonur-1-5',
        'baikonur-31-6',
        'change5',
        'change6',
        'chandrayaan3',
        'insight',
        'jiuquan-slc-43',
        'luna17',
        'luna9',
        'slim',
        'sriharikota-slp',
        'vandenberg-slc-4e',
        'viking1-lander',
        'viking2-lander',
        'wenchang-lc-101',
        'zhurong',
      ].sort(),
    );
  });
});
