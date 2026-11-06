import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  blackOutRects,
  padToEquirectangular,
  pullPushFill,
  whiteBorderToBlack,
} from './panorama-padder';

/** 20×10: white margin all round, a grey interior with a white blob inside. */
async function fixture(): Promise<Buffer> {
  const w = 20;
  const h = 10;
  const px = Buffer.alloc(w * h * 3, 255);
  for (let y = 2; y < 8; y++)
    for (let x = 2; x < 18; x++) px.fill(120, (y * w + x) * 3, (y * w + x) * 3 + 3);
  for (let y = 4; y < 6; y++)
    for (let x = 9; x < 11; x++) px.fill(255, (y * w + x) * 3, (y * w + x) * 3 + 3);
  return sharp(px, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();
}

describe('whiteBorderToBlack', () => {
  it('blackens the white margin but keeps white enclosed by the mosaic', async () => {
    const out = await sharp(await whiteBorderToBlack(await fixture()))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => out.data[(y * out.info.width + x) * 3];
    expect(at(0, 0)).toBeLessThan(20); // margin
    expect(at(19, 9)).toBeLessThan(20);
    expect(at(10, 5)).toBeGreaterThan(230); // enclosed highlight (sun flare)
    expect(Math.abs(at(5, 5) - 120)).toBeLessThan(15); // mosaic untouched
  });
});

describe('pullPushFill', () => {
  it('fills a gap between two colours with a blend, leaving known pixels alone', async () => {
    // 64×8: red on the left quarter, blue on the right quarter, unknown between.
    const w = 64;
    const h = 8;
    const px = Buffer.alloc(w * h * 3);
    const unknown = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (x < 16) px.set([200, 0, 0], i * 3);
        else if (x >= 48) px.set([0, 0, 200], i * 3);
        else unknown[i] = 1;
      }
    await pullPushFill(px, unknown, w, h, 2);
    const at = (x: number) => [...px.subarray((3 * w + x) * 3, (3 * w + x) * 3 + 3)];
    expect(at(0)).toEqual([200, 0, 0]);
    expect(at(63)).toEqual([0, 0, 200]);
    // Next to red reads red-ish, next to blue blue-ish, the middle in between.
    expect(at(18)[0]).toBeGreaterThan(at(18)[2]);
    expect(at(45)[2]).toBeGreaterThan(at(45)[0]);
    expect(at(32)[0]).toBeGreaterThan(30);
    expect(at(32)[2]).toBeGreaterThan(30);
  });
});

describe('padToEquirectangular inpaintGaps', () => {
  it('fills a transparent mosaic margin from the image, not with one flat colour', async () => {
    // 40×10 source, green, with its lower-right corner transparent.
    const w = 40;
    const h = 10;
    const px = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        px.set(x >= 30 && y >= 5 ? [0, 0, 0, 0] : [40, 180, 60, 255], (y * w + x) * 4);
    const source = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toBuffer();
    const opts = {
      source,
      srcAzimuthDeg: 360,
      srcElevationTopDeg: 30,
      srcElevationBottomDeg: 30,
      outWidth: 160,
      outHeight: 80,
      recolourBlackThreshold: 60,
      jpegQuality: 100,
    };
    const flat = await sharp(await padToEquirectangular(opts))
      .raw()
      .toBuffer();
    const filled = await sharp(await padToEquirectangular({ ...opts, inpaintGaps: true }))
      .raw()
      .toBuffer();
    // A pixel inside the transparent corner, just right of the green: the flat
    // fill paints it regolith (red-brown), the inpaint pulls in the green.
    const i = (45 * 160 + 122) * 3;
    expect(flat[i] > flat[i + 1]).toBe(true);
    expect(filled[i + 1]).toBeGreaterThan(filled[i]);
  });
});

describe('blackOutRects', () => {
  it('blacks out the given fractions of the image and nothing else', async () => {
    const src = await sharp({
      create: { width: 100, height: 50, channels: 3, background: '#c8c8c8' },
    })
      .png()
      .toBuffer();
    const out = await sharp(await blackOutRects(src, [[0.8, 0, 1, 0.2]]))
      .removeAlpha()
      .raw()
      .toBuffer();
    const at = (x: number, y: number) => [
      ...out.subarray((y * 100 + x) * 3, (y * 100 + x) * 3 + 3),
    ];
    expect(at(90, 5)).toEqual([0, 0, 0]);
    expect(at(10, 5)).toEqual([200, 200, 200]);
    expect(at(90, 30)).toEqual([200, 200, 200]);
  });
});
